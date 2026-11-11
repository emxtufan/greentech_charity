(function () {
  const parentWindow = window.parent;
  // Land straight on the 1/7 frame: road and characters already placed, no
  // logo intro to sit through.
  const ENTRY_Z = 400;
  const RETURN_TARGET_Z = 430;
  const RETURN_SETTLED_Z = 440;
  const FINAL_SYNTHESIS_SCROLL_SCALE = 3.25;
  const FINAL_GLOBE_TO_FOOTER_DELAY = 1000;
  const ENTRY_MODE = new URLSearchParams(window.location.search).get('entry');
  const DIRECT_FOOTER = ENTRY_MODE === 'footer';
  const STANDALONE_ENTRY = ENTRY_MODE === 'standalone' && parentWindow === window;
  const PUBLIC_ENTRY_URL = '/';

  if (STANDALONE_ENTRY) {
    window.__GREENTECH_STANDALONE_ENTRY__ = true;
    // Mask the implementation URL before the heavy visual runtime starts.
    // The document <base> keeps every relative brandbook asset anchored to its
    // original folder even after the visible address becomes `/`.
    window.history.replaceState(
      Object.assign({}, window.history.state || {}, {greentechBrandbookEntry: true}),
      '',
      PUBLIC_ENTRY_URL,
    );
  }
  let touchStartX = 0;
  let touchStartY = 0;
  let touchExitSent = false;
  let activeRequested = STANDALONE_ENTRY;
  let interactionActive = STANDALONE_ENTRY;
  let detailReady = false;
  let preparing = false;
  let outroTouchHandled = false;
  let outroStepLocked = false;
  let outroWheelNeedsRelease = false;
  let outroWheelReleaseTimer = 0;
  let standaloneRevealQueued = false;
  let connectedPaintQueued = false;
  let activeRequestId = 0;
  let activationAnnounced = false;
  let watchedCanvas = null;
  let outroOpenGuardUntil = 0;
  let finalFooterTimer = 0;

  function scheduleEntryPreparation(callback) {
    if (document.prerendering) return window.setTimeout(callback, 16);
    return window.requestAnimationFrame(callback);
  }

  function armOutroWheelRelease() {
    outroWheelNeedsRelease = true;
    window.clearTimeout(outroWheelReleaseTimer);
    outroWheelReleaseTimer = window.setTimeout(function () {
      outroWheelNeedsRelease = false;
    }, 220);
  }

  function post(type, payload) {
    if (parentWindow !== window) {
      parentWindow.postMessage(
        Object.assign({source: 'greentech-brandbook', type}, payload || {}),
        window.location.origin,
      );
    }
  }

  function getParts() {
    const runtime = window._glMain;
    return {
      runtime,
      scene: runtime?._sceneMng,
      stage: runtime?._world?._stage0,
      world: runtime?._world,
    };
  }

  // Step 7 originally needs roughly 300 scroll units before the synthesis copy
  // fades and the globe transition starts. Keep the original animation intact,
  // but compress only that forward-scroll interval on wheel and touch devices.
  function tuneFinalSynthesisScroll() {
    const runtime = window._glMain;
    const finalScene = runtime?._world?._stage6?._fin;
    const scroll = runtime?._scroll;

    if (!finalScene || !scroll || typeof finalScene.setWheel !== 'function' || typeof finalScene.fixFrame !== 'function') {
      window.requestAnimationFrame(tuneFinalSynthesisScroll);
      return;
    }
    if (finalScene.__greentechFastSynthesis) return;

    const originalSetWheel = finalScene.setWheel;
    const originalFixFrame = finalScene.fixFrame;

    finalScene.setWheel = function (delta) {
      const amount = Number(delta) || 0;
      const adjusted = this.isFix === 1 && amount > 0
        ? amount * FINAL_SYNTHESIS_SCROLL_SCALE
        : amount;
      return originalSetWheel.call(this, adjusted);
    };

    finalScene.fixFrame = function () {
      const previousMode = this.isFix;
      const originalThrow = scroll._throwDis;
      let result;
      if (this.isFix === 1 && originalThrow > 0) {
        scroll._throwDis = originalThrow * FINAL_SYNTHESIS_SCROLL_SCALE;
      }
      try {
        result = originalFixFrame.call(this);
      } finally {
        scroll._throwDis = originalThrow;
      }

      if (previousMode === 1 && this.isFix === 2) {
        window.clearTimeout(finalFooterTimer);
        finalFooterTimer = window.setTimeout(function () {
          if (finalScene.isFix !== 2 || isOutroActive()) return;

          // The original flow waits for another 70 scroll units here. Finish
          // that exact branch automatically so the globe flows into the footer.
          gsap.killTweensOf(finalScene._waitTimer);
          finalScene._fixScroll = 0;
          finalScene.isFix = 3;
          scroll.setScrollTrg(null);
          runtime.removeEnterFrame(finalScene);
          finalScene._parent.nextStage();
        }, FINAL_GLOBE_TO_FOOTER_DELAY);
      }

      return result;
    };

    finalScene.__greentechFastSynthesis = true;
  }

  function setPaused(paused) {
    const runtime = window._glMain;
    if (runtime) runtime.isFrameLock = paused;
  }

  function getRingMetrics() {
    const {stage, world} = getParts();
    const mesh = stage?._logo?._logoO;
    const camera = world?._cam;
    if (!mesh || !camera || !window.THREE) return null;

    world._scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    mesh.updateWorldMatrix(true, false);

    const center = mesh.localToWorld(new THREE.Vector3(0, 0, 0)).project(camera);
    const edge = mesh.localToWorld(new THREE.Vector3(49.04, 0, 0)).project(camera);
    return {
      x: (center.x + 1) * 0.5,
      y: (1 - center.y) * 0.5,
      radius: Math.abs(edge.x - center.x) * world._width * 0.5,
    };
  }

  function postEntryAnchor(type, payload) {
    const ring = getRingMetrics();
    if (ring) post(type || 'entry-anchor', Object.assign({ring}, payload || {}));
    else if (type) post(type, payload);
  }

  function enforceEntryFloor() {
    const {scene, stage} = getParts();
    if (detailReady && scene?._trgStage === 0 && stage) {
      if (stage._scrollZ.value < ENTRY_Z) stage._scrollZ.value = ENTRY_Z;
      if (stage._z < ENTRY_Z) stage._z = ENTRY_Z;
    }
    window.requestAnimationFrame(enforceEntryFloor);
  }

  function placeLogoAtEntry(logo) {
    // enterFrame eases the group toward (-oX, -oY) * (_z / 400); park it on the
    // value that matches ENTRY_Z so nothing slides on the first frame.
    const zoom = Math.min(Math.max(ENTRY_Z / 400, 0), 1);
    logo._group.position.set(-logo._oX * zoom, -logo._oY * zoom, ENTRY_Z);
  }

  // Pin the logo in its far state so ENTRY_Z lands on the 1/7 composition with
  // nothing left to play in.
  function settleLogoAtEntry() {
    const {stage} = getParts();
    const logo = stage?._logo;
    if (!logo) return;

    logo.isNear = true;
    logo.isNearRoad = true;
    logo.isNearBtn = false;
    logo.isInfoNear = false;
    logo.enterFrame();

    // enterFrame normally eases the legacy wordmark and secondary logo out.
    // A standalone entry is already parked at the final stage-0 position, so
    // exposing that tween creates a short flash before the intended artwork.
    if (STANDALONE_ENTRY) {
      [logo._logoJ, logo._logoI, logo._logoT, logo._logoTSP, logo._copy].forEach(function (mesh) {
        if (!mesh || !mesh.material) return;
        gsap.killTweensOf(mesh.material);
        gsap.set(mesh.material, {opacity: 0});
      });

      if (logo._copy2?.material?.uniforms?.alpha) {
        gsap.killTweensOf(logo._copy2.material.uniforms.alpha);
        logo._copy2.material.uniforms.alpha.value = 0;
      }

      if (logo._oShader?.uniforms?.mixNum) {
        gsap.killTweensOf(logo._oShader.uniforms.mixNum);
        logo._oShader.uniforms.mixNum.value = 1;
      }

      const road = logo._road;
      [road?._frontShader?.uniforms?.alpha, road?._backShader?.uniforms?.alpha].forEach(function (alpha) {
        if (!alpha) return;
        gsap.killTweensOf(alpha);
        alpha.value = 1;
      });
      [road?._m1, road?._m2, road?._topM, road?._handM].forEach(function (material) {
        if (!material) return;
        gsap.killTweensOf(material);
        material.opacity = 1;
      });
    }
  }

  function renderEntryFrame(compile) {
    const {world} = getParts();
    if (!world?._scene || !world?._cam || !world?._render) return false;
    const renderer = world._render;
    const canvas = renderer.domElement;
    const context = typeof renderer.getContext === 'function' ? renderer.getContext() : null;
    if (!canvas || canvas.width <= 0 || canvas.height <= 0 || context?.isContextLost?.()) {
      return false;
    }

    if (watchedCanvas !== canvas) {
      watchedCanvas = canvas;
      canvas.addEventListener('webglcontextlost', function (event) {
        event.preventDefault();
        post('webgl-context-lost', {
          requestId: activeRequestId,
          reason: 'webgl-context-lost',
        });
      });
    }

    try {
      const previousFrame = Number(renderer.info?.render?.frame ?? -1);
      world._scene.updateMatrixWorld(true);
      world._cam.updateMatrixWorld(true);
      if (compile && typeof renderer.compile === 'function') {
        renderer.compile(world._scene, world._cam);
      }
      renderer.render(world._scene, world._cam);
      context?.flush?.();
      const currentFrame = Number(renderer.info?.render?.frame ?? previousFrame + 1);
      return currentFrame > previousFrame && !context?.isContextLost?.();
    } catch (error) {
      console.error('[GREENTECH Charity] Primul cadru Brandbook nu a putut fi randat.', error);
      return false;
    }
  }

  function announceConnectedEntryPaint() {
    if (STANDALONE_ENTRY || !detailReady || connectedPaintQueued) return;
    connectedPaintQueued = true;

    // Pornim rendererul in timp ce iframe-ul este inca ascuns. Parintele va
    // face schimbul de scene abia dupa doua cadre valide la pozitia finala.
    setPaused(false);
    settleLogoAtEntry();
    let attempts = 0;
    let successfulFrames = 0;

    const paint = function () {
      attempts += 1;
      settleLogoAtEntry();
      successfulFrames = renderEntryFrame(attempts === 1) ? successfulFrames + 1 : 0;

      if (successfulFrames >= 2) {
        connectedPaintQueued = false;
        postEntryAnchor('entry-painted', {requestId: activeRequestId});

        // Texturile etapelor urmatoare pornesc numai dupa ce primul cadru a
        // fost predat parintelui, ca upload-ul lor sa nu blocheze deschiderea.
        if (!activationAnnounced) {
          activationAnnounced = true;
          scheduleEntryPreparation(function () {
            window.dispatchEvent(new CustomEvent('greentech:brandbook-activated'));
          });
        }
        return;
      }

      if (attempts < 8) {
        scheduleEntryPreparation(paint);
        return;
      }

      connectedPaintQueued = false;
      post('entry-failed', {
        requestId: activeRequestId,
        reason: 'first-frame-not-rendered',
      });
    };

    paint();
  }

  function revealStandaloneEntry() {
    if (!STANDALONE_ENTRY || standaloneRevealQueued) return;
    standaloneRevealQueued = true;

    const canvas = document.querySelector('#glworld canvas');
    if (canvas) {
      // glLoading.contentsStart() still runs even though its visual cover is
      // disabled by the cream theme. Cancel the hidden loader's blur tween.
      gsap.killTweensOf(canvas);
      gsap.set(canvas, {filter: 'none'});
    }

    // Compile and commit the fully positioned road and characters while the
    // cream gate is still covering both canvas and copy.
    renderEntryFrame(true);

    scheduleEntryPreparation(function () {
      // Repeat after the first GPU upload, then expose canvas and text together
      // on the next paint. The two frames are synchronization, not a timer.
      settleLogoAtEntry();
      renderEntryFrame(false);
      scheduleEntryPreparation(function () {
        renderEntryFrame(false);
        document.documentElement.classList.remove('bb-entry-pending');
        document.documentElement.classList.add('bb-entry-ready');
        document.documentElement.dataset.bbRuntimeReady = 'true';
        window.__GREENTECH_BRANDBOOK_READY__ = true;
        window.dispatchEvent(new CustomEvent('greentech:brandbook-ready'));
      });
    });
  }

  function finalizeEntry() {
    const {runtime, scene, stage} = getParts();
    if (!runtime || !scene || !stage) return;

    gsap.killTweensOf(stage._scrollZ);
    stage._scrollZ.value = ENTRY_Z;
    stage._z = ENTRY_Z;
    stage.isFirstScroll = true;
    stage.isScrollFix = true;
    stage.isShowFix = true;
    runtime._scroll.setScrollTrg(stage);
    placeLogoAtEntry(stage._logo);
    settleLogoAtEntry();
    detailReady = true;
    renderEntryFrame(true);
    setPaused(!activeRequested);
    revealStandaloneEntry();
    postEntryAnchor('stage0-detail-ready');
  }

  function prepareEntry() {
    if (preparing || detailReady) return;
    const {runtime, scene, stage} = getParts();
    if (
      !runtime ||
      !scene ||
      !stage ||
      !stage._root?.visible ||
      runtime._scroll?._target !== stage
    ) {
      scheduleEntryPreparation(prepareEntry);
      return;
    }

    preparing = true;
    scene._trgStage = 0;
    scene._oldStage = 0;
    gsap.killTweensOf(stage._scrollZ);
    stage.isFirstScroll = true;
    stage.isScrollFix = false;
    stage._scrollZ.value = ENTRY_Z;
    stage._z = ENTRY_Z;

    placeLogoAtEntry(stage._logo);
    settleLogoAtEntry();

    // Matricele si primul cadru sunt validate explicit in finalize/render;
    // intarzierea fixa nu mai este necesara si penaliza inutil conexiunile lente.
    finalizeEntry();
  }

  function isAtEntry() {
    const {scene, stage} = getParts();
    if (!detailReady || !interactionActive || !scene || !stage || scene._trgStage !== 0) {
      return false;
    }

    const target = Number(stage._scrollZ?.value ?? Number.POSITIVE_INFINITY);
    const settled = Number(stage._z ?? Number.POSITIVE_INFINITY);
    return target <= RETURN_TARGET_Z && settled <= RETURN_SETTLED_Z;
  }

  function requestReturn(event) {
    if (!isAtEntry()) return false;
    event?.preventDefault();
    event?.stopImmediatePropagation();
    interactionActive = false;
    if (STANDALONE_ENTRY) {
      // The house document was intentionally replaced to release its WebGL
      // memory. Recreate it only when the visitor scrolls back from step 1.
      window.location.replace(PUBLIC_ENTRY_URL);
      return true;
    }
    post('return-to-house');
    return true;
  }

  function getOutro() {
    return document.getElementById('brandbook-outro');
  }

  function isOutroActive() {
    return getOutro()?.classList.contains('is-visible') ?? false;
  }

  function isOutroModalOpen() {
    return document.getElementById('bb-footer-modal')?.open === true;
  }

  function focusActiveOutroSection() {
    if (!isOutroActive()) return;
    const section = getOutro()?.querySelector('[data-outro-section].is-active');
    if (!section) return;
    section.tabIndex = -1;
    section.focus({preventScroll: true});
  }

  function setOutroIndex(nextIndex, direction) {
    const outro = getOutro();
    if (!outro) return false;

    const sections = Array.from(outro.querySelectorAll('[data-outro-section]'));
    if (!sections.length) return false;

    const safeIndex = Math.max(0, Math.min(sections.length - 1, nextIndex));
    outro.dataset.outroIndex = String(safeIndex);
    outro.dataset.outroDirection = direction < 0 ? 'backward' : 'forward';

    sections.forEach(function (section, index) {
      const active = index === safeIndex;
      section.classList.toggle('is-active', active);
      section.classList.toggle('is-before', index < safeIndex);
      section.classList.toggle('is-after', index > safeIndex);
      section.setAttribute('aria-hidden', String(!active));
      section.inert = !active;
    });

    const current = outro.querySelector('[data-outro-current]');
    if (current) current.textContent = String(safeIndex + 1).padStart(2, '0');

    const hint = outro.querySelector('[data-outro-hint]');
    if (hint) {
      const navigationCopy = window.GREENTECH_CHARITY_CONTENT?.navigation || {};
      hint.textContent = safeIndex === sections.length - 1
        ? navigationCopy.outroScrollUp || ''
        : navigationCopy.outroScrollDown || '';
    }

    outro.querySelectorAll('[data-outro-go]').forEach(function (button) {
      const active = Number(button.dataset.outroGo) === safeIndex;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });

    window.dispatchEvent(new CustomEvent('brandbook-outro-change', {
      detail: {index: safeIndex, direction},
    }));
    return true;
  }

  // This is intentionally a separate scroll lane. The 3D journey must never
  // restart at the house after its final cover; upcoming editorial sections
  // simply opt in with data-outro-section and are traversed in either direction.
  function moveOutro(direction) {
    const outro = getOutro();
    if (!outro) return false;

    const sections = Array.from(outro.querySelectorAll('[data-outro-section]'));
    const oldIndex = Number(outro.dataset.outroIndex || 0);
    const nextIndex = Math.max(0, Math.min(sections.length - 1, oldIndex + direction));
    if (nextIndex === oldIndex) return false;
    return setOutroIndex(nextIndex, direction);
  }

  // At the first footer panel, a backward gesture slides it away and restores
  // the already formed 7/7 globe. Nothing is restarted and nothing reaches
  // the house scene.
  function returnToFinalStage() {
    // `/footer/` is an isolated preview route. Backward scroll stays inside
    // the footer instead of reconnecting the hidden 3D journey.
    if (DIRECT_FOOTER) return true;

    const outro = getOutro();
    const runtime = window._glMain;
    const stage = runtime?._world?._stage6;
    if (!outro) return false;

    outro.classList.remove('is-visible');
    outro.setAttribute('aria-hidden', 'true');
    outroWheelNeedsRelease = false;
    outroOpenGuardUntil = 0;
    window.clearTimeout(outroWheelReleaseTimer);

    if (!runtime || !stage) return true;

    // Keep every visual object exactly as it is. Only reconnect the existing
    // final scroll controller so a later backward gesture can reach step 7/7.
    stage._fin._fixScroll = 0;
    stage._fin.isFix = 2;
    runtime.removeEnterFrame(stage._fin);
    runtime.addEnterFrame(stage._fin, 'fixFrame');
    runtime._scroll.setScrollTrg(stage._fin);
    return true;
  }

  function consumeOutroScroll(event, direction) {
    if (!isOutroActive()) return false;
    event?.preventDefault();
    event?.stopImmediatePropagation();

    if (!outroStepLocked) {
      outroStepLocked = true;
      if (direction < 0) {
        if (!moveOutro(direction)) returnToFinalStage();
      } else {
        moveOutro(direction);
      }
      window.setTimeout(function () {
        outroStepLocked = false;
      }, 780);
    }
    return true;
  }

  // One physical wheel/trackpad gesture may emit many inertia events. Require
  // that gesture to finish before another card can be selected, otherwise the
  // same scroll that reveals card 01 can immediately skip to card 02.
  function consumeOutroWheel(event) {
    if (!isOutroActive() || Math.abs(event.deltaY) <= 2) return false;

    if (performance.now() < outroOpenGuardUntil || outroWheelNeedsRelease) {
      event.preventDefault();
      event.stopImmediatePropagation();
      armOutroWheelRelease();
      return true;
    }

    const consumed = consumeOutroScroll(event, event.deltaY > 0 ? 1 : -1);
    if (consumed) armOutroWheelRelease();
    return consumed;
  }

  document.addEventListener('wheel', function (event) {
    if (isOutroModalOpen()) return;
    if (consumeOutroWheel(event)) return;
    if (event.deltaY < -2) requestReturn(event);
  }, {capture: true, passive: false});

  document.addEventListener('touchstart', function (event) {
    if (isOutroModalOpen()) return;
    const touch = event.touches[0];
    if (!touch) return;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchExitSent = false;
    outroTouchHandled = false;
  }, {capture: true, passive: true});

  document.addEventListener('touchmove', function (event) {
    if (isOutroModalOpen()) return;
    const touch = event.touches[0];
    if (!touch || touchExitSent || outroTouchHandled) return;

    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    if (Math.abs(dy) > 26 && Math.abs(dy) > Math.abs(dx) * 1.12 && consumeOutroScroll(event, dy < 0 ? 1 : -1)) {
      outroTouchHandled = true;
      return;
    }
    if (dy > 26 && Math.abs(dy) > Math.abs(dx) * 1.12 && requestReturn(event)) {
      touchExitSent = true;
    }
  }, {capture: true, passive: false});

  document.addEventListener('keydown', function (event) {
    if (isOutroModalOpen()) return;
    const tagName = event.target?.tagName;
    const interactiveTarget = tagName === 'A' || tagName === 'BUTTON' || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
    if (interactiveTarget && (event.key === ' ' || event.key === 'Spacebar' || event.key === 'Enter')) return;

    if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ' || event.key === 'Spacebar') {
      if (consumeOutroScroll(event, 1)) {
        window.requestAnimationFrame(focusActiveOutroSection);
        return;
      }
    }
    if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      if (consumeOutroScroll(event, -1)) {
        window.requestAnimationFrame(focusActiveOutroSection);
        return;
      }
    }
    if (event.key === 'ArrowUp' || event.key === 'PageUp') requestReturn(event);
  }, {capture: true});

  window.addEventListener('message', function (event) {
    if (
      event.origin !== window.location.origin ||
      event.source !== parentWindow ||
      event.data?.source !== 'greentech-parent'
    ) {
      return;
    }

    switch (event.data.type) {
      case 'activate-entry':
        activeRequested = true;
        interactionActive = false;
        setPaused(false);
        if (detailReady) postEntryAnchor();
        break;
      case 'entry-active':
        activeRequestId = Number(event.data.requestId) || 0;
        activeRequested = true;
        interactionActive = true;
        setPaused(false);
        announceConnectedEntryPaint();
        break;
      case 'entry-leaving':
        interactionActive = false;
        setPaused(false);
        break;
      case 'park-at-entry':
        activeRequested = false;
        interactionActive = false;
        finalizeEntry();
        setPaused(true);
        break;
    }
  });

  window.addEventListener('resize', function () {
    if (!detailReady) return;
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        postEntryAnchor();
      });
    });
  });

  window.addEventListener('DOMContentLoaded', function () {
    document.getElementById('brandbook-back-button')?.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (!requestReturn(event)) post('return-to-house');
    });

    const outro = getOutro();
    outro?.querySelectorAll('[data-outro-go]').forEach(function (button) {
      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        const oldIndex = Number(outro.dataset.outroIndex || 0);
        const nextIndex = Number(button.dataset.outroGo || 0);
        if (nextIndex !== oldIndex) setOutroIndex(nextIndex, nextIndex < oldIndex ? -1 : 1);
      });
    });

    if (outro) {
      setOutroIndex(Number(outro.dataset.outroIndex || 0), 1);
      new MutationObserver(function (mutations) {
        if (mutations.some(function (mutation) { return mutation.attributeName === 'class'; }) && outro.classList.contains('is-visible')) {
          // Preserve card 01 long enough to be read and discard the inertia of
          // the gesture that opened the footer. Touch also waits for a new swipe.
          outroOpenGuardUntil = performance.now() + 900;
          outroTouchHandled = true;
          armOutroWheelRelease();
          setOutroIndex(Number(outro.dataset.outroIndex || 0), 1);
        }
      }).observe(outro, {attributes: true, attributeFilter: ['class']});

      if (DIRECT_FOOTER) {
        outro.dataset.outroIndex = '0';
        outro.classList.add('is-visible');
        outro.setAttribute('aria-hidden', 'false');
      }
    }

    if (DIRECT_FOOTER) return;

    // On constrained/mobile devices this document replaces the house page
    // instead of living in an iframe. Keep its sole renderer running and make
    // the prepared 1/7 entry interactive without waiting for parent messages.
    if (STANDALONE_ENTRY) setPaused(false);

    prepareEntry();
    enforceEntryFloor();
    tuneFinalSynthesisScroll();
  });
})();
