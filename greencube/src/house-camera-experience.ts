const SCENE_CONTAINER_SELECTOR = '._64c0f3';
const SCENE_PROGRESS_SELECTOR = '._388974';
const INTRO_CTA_SELECTOR = '._34fe16';
const INTRO_CTA_CONTENT_SELECTOR = '._2bb0cd';

const ZOOM_STARTED_AT = 0.001;
const HOUSE_SETTLED_AT = 0.997;
const HOUSE_LEFT_AT = 0.965;
const CAMERA_SETTLE_DELAY_MS = 700;
const SCENE_LOAD_STALL_TIMEOUT_MS = 120_000;
const SCENE_FAILURE_CONFIRM_DELAY_MS = 3_000;
const SCENE_VISIBLE_CONFIRM_DELAY_MS = 8_000;
const ORBIT_PERIOD_SECONDS = 47;
const DESKTOP_ORBIT_AMPLITUDE = 0.68;
const MOBILE_ORBIT_AMPLITUDE = 0.56;
const ORBIT_RESUME_DELAY_MS = 900;
const ORBIT_RESUME_BLEND_MS = 1800;

type CameraPhase = 'idle' | 'clouds' | 'zooming' | 'settling' | 'orbiting';
type CameraOwner = 'auto' | 'user';

type CameraChannelWindow = Window & {
  __GREENTECH_CAMERA_ORBIT_ACTIVE__?: boolean;
  __GREENTECH_CAMERA_ORBIT_X__?: number;
  __GREENTECH_EARLY_START_REQUESTED__?: boolean;
  __GREENTECH_STAGE_READY__?: boolean;
  __GREENTECH_STAGE_VISIBLE__?: boolean;
};

type StageProgressEvent = CustomEvent<{progress?: number}>;

type InlineScrollStyles = {
  htmlOverflow: string;
  htmlOverscrollBehavior: string;
  htmlTouchAction: string;
  bodyOverflow: string;
  bodyOverscrollBehavior: string;
  bodyTouchAction: string;
};

const readTranslateY = (transform: string) => {
  const match = transform.match(/translateY\((-?[\d.]+)px\)/);
  if (match) return Math.abs(Number(match[1]) || 0);

  const matrix = transform.match(/matrix\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,\s*(-?[\d.]+)\)/);
  return matrix ? Math.abs(Number(matrix[1]) || 0) : 0;
};

const isScrollKey = (event: KeyboardEvent) =>
  ['ArrowDown', 'ArrowUp', 'End', 'Home', 'PageDown', 'PageUp', ' '].includes(event.key);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const smoothstep = (value: number) => {
  const amount = clamp(value, 0, 1);
  return amount * amount * (3 - 2 * amount);
};

/**
 * Coordinates the existing scene controller without creating another camera,
 * renderer or render loop. The zoom progress still belongs to the original
 * runtime; this adapter only protects it from input and feeds the automatic
 * horizontal target through the runtime's dedicated camera channel once the
 * house has settled. Real pointer events are never synthesized.
 */
export const installHouseCameraExperience = () => {
  const cameraChannel = window as CameraChannelWindow;
  let phase: CameraPhase = 'idle';
  let journeyStarted = false;
  let journeyRequested = false;
  let stageReady = cameraChannel.__GREENTECH_STAGE_READY__ === true;
  let stageVisible = cameraChannel.__GREENTECH_STAGE_VISIBLE__ === true;
  let scrollLocked = false;
  let settleStartedAt = 0;
  let orbitStartedAt = 0;
  let orbitPhaseAtStart = 0;
  let orbitResumeStartedAt = 0;
  let orbitResumeFromX = 0;
  let orbitDirection = 1;
  let lastOrbitInputAt = 0;
  let lastCameraInputX = 0;
  let cameraOwner: CameraOwner = 'auto';
  let pointerIsDown = false;
  let resumeOrbitAt = 0;
  let initialZoomComplete = false;
  let frame = 0;
  let lockedScrollX = 0;
  let lockedScrollY = 0;
  let savedStyles: InlineScrollStyles | null = null;
  let sceneContainer: HTMLElement | null = null;
  let sceneProgressLayer: HTMLElement | null = null;
  let introCta: HTMLButtonElement | null = null;
  let introCtaContent: HTMLElement | null = null;
  let loadingStatus: HTMLSpanElement | null = null;
  let loadingPercent: HTMLElement | null = null;
  let loadingBar: HTMLElement | null = null;
  let sceneLoadProgress = 0;
  let sceneLoadFailed = false;
  let workerFailureSuspected = false;
  let sceneLoadTimeout = 0;
  let sceneFailureTimeout = 0;
  let sceneTravel = 0;
  let sceneRect: DOMRect | null = null;

  const getIntroCta = () => {
    introCta = document.querySelector<HTMLButtonElement>(INTRO_CTA_SELECTOR);
    introCtaContent = introCta?.querySelector<HTMLElement>(INTRO_CTA_CONTENT_SELECTOR) ?? null;
    return introCta;
  };

  const ensureLoadingStatus = () => {
    const button = introCta ?? getIntroCta();
    if (!button) return null;
    if (loadingStatus?.isConnected) return loadingStatus;

    loadingStatus = document.createElement('span');
    loadingStatus.className = 'gc-scene-loading-status';
    loadingStatus.setAttribute('aria-live', 'polite');
    loadingStatus.innerHTML =
      '<span class="gc-scene-loading-copy">Incarcam scena <strong class="gc-scene-loading-percent">0%</strong></span>' +
      '<span class="gc-scene-loading-track" aria-hidden="true"><span class="gc-scene-loading-bar"></span></span>';
    (introCtaContent ?? button).appendChild(loadingStatus);
    loadingPercent = loadingStatus.querySelector<HTMLElement>('.gc-scene-loading-percent');
    loadingBar = loadingStatus.querySelector<HTMLElement>('.gc-scene-loading-bar');
    return loadingStatus;
  };

  const clearLoadWatchdog = () => {
    window.clearTimeout(sceneLoadTimeout);
    sceneLoadTimeout = 0;
  };

  const clearFailureConfirmation = () => {
    window.clearTimeout(sceneFailureTimeout);
    sceneFailureTimeout = 0;
  };

  const scheduleFailureConfirmation = (delay = SCENE_FAILURE_CONFIRM_DELAY_MS) => {
    if (stageVisible || sceneFailureTimeout) return;
    sceneFailureTimeout = window.setTimeout(() => {
      sceneFailureTimeout = 0;
      showLoadFailure();
    }, delay);
  };

  const armLoadWatchdog = () => {
    clearLoadWatchdog();
    if (!journeyRequested || stageVisible) return;
    sceneLoadTimeout = window.setTimeout(() => {
      sceneLoadTimeout = 0;
      if (!journeyRequested || stageVisible || sceneLoadFailed) return;
      const status = ensureLoadingStatus();
      const copy = status?.querySelector<HTMLElement>('.gc-scene-loading-copy');
      if (copy) {
        copy.innerHTML =
          `Incarcarea continua <strong class="gc-scene-loading-percent">${Math.round(sceneLoadProgress * 100)}%</strong>`;
        loadingPercent = copy.querySelector<HTMLElement>('.gc-scene-loading-percent');
      }
      // Un timeout de retea nu mai este considerat verdict de eroare. Workerul
      // poate descarca sau compila in continuare pe un telefon lent.
    }, SCENE_LOAD_STALL_TIMEOUT_MS);
  };

  const updateLoadingProgress = (progress: number) => {
    const nextProgress = clamp(progress > 1 ? progress / 100 : progress, 0, 1);
    sceneLoadProgress = Math.max(sceneLoadProgress, nextProgress);
    const percent = Math.round(sceneLoadProgress * 100);
    if (loadingPercent) loadingPercent.textContent = `${percent}%`;
    loadingBar?.style.setProperty('--gc-scene-load', `${percent}%`);
  };

  const showLoadingState = () => {
    const button = introCta ?? getIntroCta();
    if (!button || sceneLoadFailed) return;
    const status = ensureLoadingStatus();
    if (!status) return;

    button.classList.add('gc-scene-loading');
    button.classList.remove('gc-scene-load-failed');
    button.setAttribute('aria-busy', 'true');
    button.setAttribute('aria-label', `Incarcam scena, ${Math.round(sceneLoadProgress * 100)}%`);
    if (introCtaContent) introCtaContent.setAttribute('aria-hidden', 'true');
    updateLoadingProgress(sceneLoadProgress);
  };

  const clearLoadingState = () => {
    const button = introCta ?? getIntroCta();
    button?.classList.remove('gc-scene-loading', 'gc-scene-load-failed');
    button?.removeAttribute('aria-busy');
    button?.removeAttribute('aria-label');
    introCtaContent?.removeAttribute('aria-hidden');
    loadingStatus?.remove();
    loadingStatus = null;
    loadingPercent = null;
    loadingBar = null;
    clearLoadWatchdog();
  };

  const showLoadFailure = () => {
    if (stageVisible) return;
    sceneLoadFailed = true;
    clearLoadWatchdog();

    // Nu inlocuim preventiv CTA-ul daca vizitatorul nu a cerut inca scena.
    // Un semnal tranzitoriu poate fi urmat de progress/ready si va fi anulat.
    if (!journeyRequested) return;

    const button = introCta ?? getIntroCta();
    const status = ensureLoadingStatus();
    if (!button || !status) return;
    button.classList.remove('gc-scene-loading');
    button.classList.add('gc-scene-load-failed');
    button.removeAttribute('aria-busy');
    button.setAttribute('aria-label', 'Scena nu a pornit. Reincearca incarcarea.');
    if (introCtaContent) introCtaContent.setAttribute('aria-hidden', 'true');
    status.innerHTML =
      '<span class="gc-scene-loading-copy">Scena nu a pornit <strong>Reincearca</strong></span>';
    loadingPercent = null;
    loadingBar = null;
  };

  const refreshSceneMetrics = () => {
    sceneContainer = document.querySelector<HTMLElement>(SCENE_CONTAINER_SELECTOR);
    sceneProgressLayer = document.querySelector<HTMLElement>(SCENE_PROGRESS_SELECTOR);
    if (!sceneContainer || !sceneProgressLayer) return;

    sceneRect = sceneContainer.getBoundingClientRect();
    sceneTravel = sceneRect.height + sceneProgressLayer.getBoundingClientRect().height;
  };

  const readHouseProgress = () => {
    if (!sceneProgressLayer || sceneTravel <= 0) refreshSceneMetrics();
    if (!sceneProgressLayer || sceneTravel <= 0) return 0;
    return Math.min(1, readTranslateY(sceneProgressLayer.style.transform) / sceneTravel);
  };

  const setPhase = (nextPhase: CameraPhase) => {
    phase = nextPhase;
    document.documentElement.dataset.gcCameraPhase = nextPhase;
    if (nextPhase !== 'orbiting') cameraChannel.__GREENTECH_CAMERA_ORBIT_ACTIVE__ = false;
  };

  const setCameraOwner = (nextOwner: CameraOwner) => {
    cameraOwner = nextOwner;
    document.documentElement.dataset.gcCameraOwner = nextOwner;
  };

  const isSceneInteraction = (target: EventTarget | null) =>
    Boolean(sceneContainer && target instanceof Node && sceneContainer.contains(target));

  const pointerToSceneX = (clientX: number) => {
    if (!sceneRect || sceneRect.width <= 0) refreshSceneMetrics();
    if (!sceneRect || sceneRect.width <= 0) return lastCameraInputX;
    return clamp(((clientX - sceneRect.left) / sceneRect.width) * 2 - 1, -1, 1);
  };

  const setOrbitChannel = (active: boolean, x = lastCameraInputX) => {
    cameraChannel.__GREENTECH_CAMERA_ORBIT_ACTIVE__ = active;
    cameraChannel.__GREENTECH_CAMERA_ORBIT_X__ = x;
  };

  const blockInput = (event: Event) => {
    if (!scrollLocked) return;
    if (event.cancelable) event.preventDefault();
    event.stopImmediatePropagation();
  };

  const blockKeyboardScroll = (event: KeyboardEvent) => {
    if (scrollLocked && isScrollKey(event)) blockInput(event);
  };

  const takeManualCameraControl = (clientX: number, now: number, held: boolean) => {
    lastCameraInputX = pointerToSceneX(clientX);
    // Capture listeners run before the original scene listener, so manual input
    // becomes the sole camera owner before the runtime consumes this event.
    setOrbitChannel(false);
    if (phase !== 'orbiting') return;

    pointerIsDown = held;
    resumeOrbitAt = held ? Number.POSITIVE_INFINITY : now + ORBIT_RESUME_DELAY_MS;
    if (cameraOwner !== 'user') setCameraOwner('user');
  };

  const onPointerDown = (event: PointerEvent) => {
    if (scrollLocked && event.pointerType === 'touch') {
      blockInput(event);
      return;
    }
    if (!event.isTrusted || !isSceneInteraction(event.target)) return;
    takeManualCameraControl(event.clientX, performance.now(), true);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (scrollLocked && event.pointerType === 'touch') {
      blockInput(event);
      return;
    }
    if (!event.isTrusted || !isSceneInteraction(event.target)) return;
    takeManualCameraControl(
      event.clientX,
      performance.now(),
      pointerIsDown || event.buttons !== 0 || event.pointerType === 'touch',
    );
  };

  const onPointerEnd = (event: PointerEvent) => {
    if (!event.isTrusted || cameraOwner !== 'user') return;
    pointerIsDown = false;
    resumeOrbitAt = performance.now() + ORBIT_RESUME_DELAY_MS;
  };

  const onTouchStart = (event: TouchEvent) => {
    if (scrollLocked) {
      blockInput(event);
      return;
    }
    const touch = event.touches[0];
    if (!event.isTrusted || !touch || !isSceneInteraction(event.target)) return;
    takeManualCameraControl(touch.clientX, performance.now(), true);
  };

  const onTouchMove = (event: TouchEvent) => {
    if (scrollLocked) {
      blockInput(event);
      return;
    }
    const touch = event.touches[0];
    if (!event.isTrusted || !touch || !isSceneInteraction(event.target)) return;
    takeManualCameraControl(touch.clientX, performance.now(), true);
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (!event.isTrusted || cameraOwner !== 'user') return;
    pointerIsDown = false;
    resumeOrbitAt = performance.now() + ORBIT_RESUME_DELAY_MS;
  };

  const keepScrollPosition = () => {
    if (!scrollLocked || (window.scrollX === lockedScrollX && window.scrollY === lockedScrollY)) {
      return;
    }
    window.scrollTo(lockedScrollX, lockedScrollY);
  };

  const lockScroll = () => {
    if (scrollLocked) return;

    const html = document.documentElement;
    const body = document.body;
    savedStyles = {
      htmlOverflow: html.style.overflow,
      htmlOverscrollBehavior: html.style.overscrollBehavior,
      htmlTouchAction: html.style.touchAction,
      bodyOverflow: body.style.overflow,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
      bodyTouchAction: body.style.touchAction,
    };
    lockedScrollX = window.scrollX;
    lockedScrollY = window.scrollY;
    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    html.style.touchAction = 'none';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    body.style.touchAction = 'none';
    html.classList.add('gc-camera-zoom-locked');
    scrollLocked = true;
  };

  const unlockScroll = () => {
    if (!scrollLocked) return;

    const html = document.documentElement;
    const body = document.body;
    scrollLocked = false;
    html.classList.remove('gc-camera-zoom-locked');
    if (savedStyles) {
      html.style.overflow = savedStyles.htmlOverflow;
      html.style.overscrollBehavior = savedStyles.htmlOverscrollBehavior;
      html.style.touchAction = savedStyles.htmlTouchAction;
      body.style.overflow = savedStyles.bodyOverflow;
      body.style.overscrollBehavior = savedStyles.bodyOverscrollBehavior;
      body.style.touchAction = savedStyles.bodyTouchAction;
    }
    savedStyles = null;
    window.scrollTo(lockedScrollX, lockedScrollY);
    window.requestAnimationFrame(refreshSceneMetrics);
  };

  const getOrbitAmplitude = () =>
    window.matchMedia('(pointer: coarse)').matches
      ? MOBILE_ORBIT_AMPLITUDE
      : DESKTOP_ORBIT_AMPLITUDE;

  const beginAutoOrbit = (now: number) => {
    const amplitude = getOrbitAmplitude();
    const relativeX = clamp(lastCameraInputX / amplitude, -1, 1);
    const basePhase = Math.asin(relativeX);

    orbitPhaseAtStart = orbitDirection >= 0 ? basePhase : Math.PI - basePhase;
    orbitStartedAt = now;
    orbitResumeStartedAt = now;
    orbitResumeFromX = lastCameraInputX;
    lastOrbitInputAt = 0;
    setCameraOwner('auto');
  };

  const sendOrbitInput = (now: number) => {
    if (!sceneContainer || !sceneRect) refreshSceneMetrics();
    if (!sceneContainer || !sceneRect) return;

    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const minimumInputInterval = coarsePointer ? 1000 / 30 : 0;
    if (now - lastOrbitInputAt < minimumInputInterval) return;
    lastOrbitInputAt = now;

    const elapsed = (now - orbitStartedAt) / 1000;
    const amplitude = coarsePointer ? MOBILE_ORBIT_AMPLITUDE : DESKTOP_ORBIT_AMPLITUDE;
    const orbitAngle = orbitPhaseAtStart + (elapsed / ORBIT_PERIOD_SECONDS) * Math.PI * 2;
    const automaticX = Math.sin(orbitAngle) * amplitude;
    const resumeBlend = smoothstep((now - orbitResumeStartedAt) / ORBIT_RESUME_BLEND_MS);
    const orbitX = orbitResumeFromX + (automaticX - orbitResumeFromX) * resumeBlend;
    orbitDirection = Math.cos(orbitAngle) >= 0 ? 1 : -1;
    lastCameraInputX = orbitX;
    setOrbitChannel(true, orbitX);
  };

  const update = (now: number) => {
    if (journeyStarted) {
      const progress = readHouseProgress();

      if (
        !initialZoomComplete &&
        (phase === 'clouds' || phase === 'idle') &&
        progress > ZOOM_STARTED_AT
      ) {
        setPhase('zooming');
        lockScroll();
      }

      if (phase === 'zooming' && progress >= HOUSE_SETTLED_AT) {
        settleStartedAt = now;
        setPhase('settling');
      }

      if (phase === 'settling') {
        if (progress < HOUSE_LEFT_AT) {
          settleStartedAt = 0;
          setPhase(initialZoomComplete ? 'idle' : 'zooming');
        } else if (now - settleStartedAt >= CAMERA_SETTLE_DELAY_MS) {
          unlockScroll();
          initialZoomComplete = true;
          beginAutoOrbit(now);
          setPhase('orbiting');
        }
      }

      if (phase === 'orbiting') {
        if (progress < HOUSE_LEFT_AT) {
          setOrbitChannel(false);
          setPhase('idle');
        } else if (cameraOwner === 'user') {
          if (!pointerIsDown && now >= resumeOrbitAt) beginAutoOrbit(now);
        } else {
          sendOrbitInput(now);
        }
      } else if (phase === 'idle' && progress >= HOUSE_SETTLED_AT) {
        settleStartedAt = now;
        setPhase('settling');
      }
    }

    frame = window.requestAnimationFrame(update);
  };

  const beginJourney = () => {
    if (journeyStarted) return;
    refreshSceneMetrics();
    journeyStarted = true;
    journeyRequested = false;
    initialZoomComplete = false;
    settleStartedAt = 0;
    orbitStartedAt = 0;
    orbitPhaseAtStart = 0;
    orbitResumeStartedAt = 0;
    orbitResumeFromX = lastCameraInputX;
    orbitDirection = 1;
    pointerIsDown = false;
    resumeOrbitAt = 0;
    setCameraOwner('auto');
    setPhase('clouds');
  };

  const startJourney = () => {
    if (journeyStarted) return;
    if (sceneLoadFailed) {
      if (!journeyRequested) {
        journeyRequested = true;
        document.documentElement.dataset.gcJourneyPending = 'true';
        showLoadFailure();
        return;
      }
      window.location.reload();
      return;
    }
    if (journeyRequested) return;
    showLoadingState();
    // Canal explicit catre runtime: daca activarea are loc foarte devreme,
    // intentia nu depinde exclusiv de listenerul legacy al butonului.
    window.dispatchEvent(new CustomEvent('greentech:scene-start-requested'));
    journeyRequested = true;
    document.documentElement.dataset.gcJourneyPending = 'true';
    armLoadWatchdog();
    if (stageReady && workerFailureSuspected) {
      scheduleFailureConfirmation(SCENE_VISIBLE_CONFIRM_DELAY_MS);
    }
    if (stageVisible) beginJourney();
  };

  const onStageReady = () => {
    stageReady = true;
    workerFailureSuspected = false;
    clearFailureConfirmation();
    if (sceneLoadFailed) {
      sceneLoadFailed = false;
      clearLoadingState();
    }
    updateLoadingProgress(0.98);
    if (journeyRequested) {
      showLoadingState();
      armLoadWatchdog();
      window.dispatchEvent(new CustomEvent('greentech:scene-start-requested'));
    }
  };

  const onStageVisible = () => {
    stageReady = true;
    stageVisible = true;
    sceneLoadFailed = false;
    workerFailureSuspected = false;
    clearFailureConfirmation();
    updateLoadingProgress(1);
    clearLoadingState();
    delete document.documentElement.dataset.gcJourneyPending;
    if (journeyRequested) beginJourney();
  };

  const onStageProgress = (event: Event) => {
    const progress = (event as StageProgressEvent).detail?.progress;
    if (!Number.isFinite(progress)) return;
    workerFailureSuspected = false;
    clearFailureConfirmation();
    if (sceneLoadFailed) {
      sceneLoadFailed = false;
      clearLoadingState();
    }
    // Ultimele procente reprezinta compilarea si primele cadre, nu doar
    // descarcarea resurselor. Astfel butonul nu ramane inselator la 100%.
    updateLoadingProgress((progress as number) * 0.95);
    armLoadWatchdog();
    if (journeyRequested) showLoadingState();
  };

  const onStageFailed = () => {
    if (stageVisible || sceneFailureTimeout) return;
    if (stageReady && !journeyRequested) {
      // Dupa `ready`, un error generic nu dovedeste ca modelul s-a pierdut.
      // Il verificam abia cand utilizatorul cere primul cadru vizibil.
      workerFailureSuspected = true;
      return;
    }
    // `error` si `messageerror` nu sunt verdicte suficiente singure. Acordam
    // workerului o fereastra scurta; orice progress/ready anuleaza eroarea.
    scheduleFailureConfirmation();
  };

  const onDocumentClick = (event: MouseEvent) => {
    const target = event.target;
    if (target instanceof Element && target.closest(INTRO_CTA_SELECTOR)) {
      if (!stageVisible) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      cameraChannel.__GREENTECH_EARLY_START_REQUESTED__ = false;
      startJourney();
    }
  };
  const onVisibilityChange = () => {
    if (!document.hidden && phase === 'orbiting' && cameraOwner === 'auto') {
      beginAutoOrbit(performance.now());
    }
  };
  setPhase('idle');
  setCameraOwner('auto');
  document.addEventListener('click', onDocumentClick, {capture: true});
  window.addEventListener('greencube:stage-ready', onStageReady);
  window.addEventListener('greencube:stage-visible', onStageVisible);
  window.addEventListener('greencube:stage-progress', onStageProgress);
  window.addEventListener('greencube:stage-failed', onStageFailed);

  // Butonul exista deja in HTML-ul initial. Pe o conexiune foarte lenta el
  // poate fi apasat inainte ca bundle-ul React si adaptorul camerei sa fie
  // evaluate. Scriptul inline din index.html pastreaza acea intentie aici.
  if (cameraChannel.__GREENTECH_EARLY_START_REQUESTED__) {
    cameraChannel.__GREENTECH_EARLY_START_REQUESTED__ = false;
    startJourney();
  }

  window.addEventListener('wheel', blockInput, {capture: true, passive: false});
  window.addEventListener('touchstart', onTouchStart, {capture: true, passive: false});
  window.addEventListener('touchmove', onTouchMove, {capture: true, passive: false});
  window.addEventListener('touchend', onTouchEnd, {capture: true, passive: true});
  window.addEventListener('touchcancel', onTouchEnd, {capture: true, passive: true});
  window.addEventListener('pointerdown', onPointerDown, {capture: true, passive: false});
  window.addEventListener('pointermove', onPointerMove, {capture: true, passive: false});
  window.addEventListener('pointerup', onPointerEnd, {capture: true, passive: true});
  window.addEventListener('pointercancel', onPointerEnd, {capture: true, passive: true});
  window.addEventListener('pointerleave', onPointerEnd, {capture: true, passive: true});
  window.addEventListener('keydown', blockKeyboardScroll, {capture: true});
  window.addEventListener('scroll', keepScrollPosition, {capture: true, passive: true});
  window.addEventListener('resize', refreshSceneMetrics, {passive: true});
  document.addEventListener('visibilitychange', onVisibilityChange);

  frame = window.requestAnimationFrame(update);

  return () => {
    window.cancelAnimationFrame(frame);
    unlockScroll();
    document.removeEventListener('click', onDocumentClick, {capture: true});
    window.removeEventListener('greencube:stage-ready', onStageReady);
    window.removeEventListener('greencube:stage-visible', onStageVisible);
    window.removeEventListener('greencube:stage-progress', onStageProgress);
    window.removeEventListener('greencube:stage-failed', onStageFailed);
    window.removeEventListener('wheel', blockInput, {capture: true});
    window.removeEventListener('touchstart', onTouchStart, {capture: true});
    window.removeEventListener('touchmove', onTouchMove, {capture: true});
    window.removeEventListener('touchend', onTouchEnd, {capture: true});
    window.removeEventListener('touchcancel', onTouchEnd, {capture: true});
    window.removeEventListener('pointerdown', onPointerDown, {capture: true});
    window.removeEventListener('pointermove', onPointerMove, {capture: true});
    window.removeEventListener('pointerup', onPointerEnd, {capture: true});
    window.removeEventListener('pointercancel', onPointerEnd, {capture: true});
    window.removeEventListener('pointerleave', onPointerEnd, {capture: true});
    window.removeEventListener('keydown', blockKeyboardScroll, {capture: true});
    window.removeEventListener('scroll', keepScrollPosition, {capture: true});
    window.removeEventListener('resize', refreshSceneMetrics);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    setOrbitChannel(false);
    delete cameraChannel.__GREENTECH_CAMERA_ORBIT_ACTIVE__;
    delete cameraChannel.__GREENTECH_CAMERA_ORBIT_X__;
    delete cameraChannel.__GREENTECH_EARLY_START_REQUESTED__;
    delete document.documentElement.dataset.gcCameraPhase;
    delete document.documentElement.dataset.gcCameraOwner;
    delete document.documentElement.dataset.gcJourneyPending;
    clearLoadingState();
    clearLoadWatchdog();
    clearFailureConfirmation();
  };
};
