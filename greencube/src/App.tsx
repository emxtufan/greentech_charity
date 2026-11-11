import {useCallback, useEffect, useRef, useState} from 'react';
import {mainContentReady} from './main-content';
import {
  STANDALONE_BRANDBOOK_URL,
  startBrandbookWarmup,
  waitForBrandbookWarmup,
} from './brandbook-preload';
import {
  BUILDING_CARD_IDS,
  BuildingCardRegistry,
} from './components/BuildingCardRegistry';
import {installHouseCameraExperience} from './house-camera-experience';

declare global {
  interface Window {
    __GREENTECH_STAGE_READY__?: boolean;
  }
}

type GreencubeScrollProgress = {
  target: number;
  settled: number;
  progress: number;
  animating: boolean;
  orbitTarget?: number;
  orbit?: number;
  entryTarget?: number;
  entry?: number;
};

type PortalAnchor = {
  x: number;
  y: number;
  radius: number;
};

type BrandbookMessage = {
  source?: string;
  type?: string;
  ring?: PortalAnchor;
  requestId?: number;
  reason?: string;
};

type SectionPhase = 'house' | 'entering' | 'active' | 'leaving';

type WrapperCopy = {
  navigation: {
    contact: string;
    explore: string;
    tabAriaTemplate: string;
  };
  brandbook: {
    ariaLabel: string;
    frameTitle: string;
    loadingLabel: string;
  };
};

const EMPTY_WRAPPER_COPY: WrapperCopy = {
  navigation: {
    contact: '',
    explore: '',
    tabAriaTemplate: '',
  },
  brandbook: {
    ariaLabel: '',
    frameTitle: '',
    loadingLabel: '',
  },
};

const readString = (value: unknown) => (typeof value === 'string' ? value : '');

const normaliseWrapperCopy = (value: unknown): WrapperCopy => {
  if (!value || typeof value !== 'object') return EMPTY_WRAPPER_COPY;

  const source = value as {
    navigation?: Record<string, unknown>;
    brandbook?: Record<string, unknown>;
  };

  return {
    navigation: {
      contact: readString(source.navigation?.contact),
      explore: readString(source.navigation?.explore),
      tabAriaTemplate: readString(source.navigation?.tabAriaTemplate),
    },
    brandbook: {
      ariaLabel: readString(source.brandbook?.ariaLabel),
      frameTitle: readString(source.brandbook?.frameTitle),
      loadingLabel: readString(source.brandbook?.loadingLabel),
    },
  };
};

const formatCopy = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');

// The scroll cascade (zoom -> orbit -> entry) is the only clock: the mask and
// the 3D camera both read the same `entry` value, so they cannot drift apart.
const ENTRY_EPSILON = 0.002;
const ENTRY_SETTLED = 0.985;
const PORTAL_OPEN_FROM = 0.3;
const PORTAL_OPEN_TO = 0.6;
const FRAME_BLEND_FROM = 0.35;
const FRAME_BLEND_TO = 0.95;
const PORTAL_COVER_FROM = 0.9;
// Tranzitia catre brandbook ramane oprita pana stabilim noul handoff 2D.
// Astfel pagina principala pastreaza un singur context WebGL pe toate device-urile.
const ENABLE_BRANDBOOK_TRANSITION = false;
// Desktopurile pot pregati cadrul 1/7 intr-un iframe conectat dupa ce scena
// casei este stabila. Pe profilurile mobile/low-memory ramane un singur WebGL.
const ENABLE_PREPARED_BRANDBOOK_FRAME = true;
const PREPARED_ENTRY_TIMEOUT_MS = 15_000;
const PREPARED_ENTRY_MAX_RETRIES = 1;

type NavigatorCapabilities = Navigator & {
  deviceMemory?: number;
  userAgentData?: {
    mobile?: boolean;
  };
  connection?: {
    saveData?: boolean;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
};

const shouldUseStandaloneBrandbook = () => {
  const sceneOverride = new URLSearchParams(window.location.search).get('scene')?.toLowerCase();
  if (sceneOverride === 'low') return true;
  if (sceneOverride === 'high') return false;

  const capabilities = navigator as NavigatorCapabilities;
  const userAgent = capabilities.userAgent || '';
  const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
  const iPadDesktopMode = /Macintosh/i.test(userAgent) && capabilities.maxTouchPoints > 1;
  const mobileClientHint = capabilities.userAgentData?.mobile === true;
  const coarseCompactViewport =
    window.matchMedia('(pointer: coarse)').matches &&
    window.matchMedia('(max-width: 1100px)').matches;
  const deviceMemory = Number(capabilities.deviceMemory);
  const lowMemory = Number.isFinite(deviceMemory) && deviceMemory > 0 && deviceMemory <= 4;
  const logicalCores = Number(capabilities.hardwareConcurrency);
  const lowCoreCount = Number.isFinite(logicalCores) && logicalCores > 0 && logicalCores <= 4;
  const effectiveType = capabilities.connection?.effectiveType?.toLowerCase();
  const downlink = Number(capabilities.connection?.downlink);
  const rtt = Number(capabilities.connection?.rtt);
  const slowNetwork = Boolean(
    capabilities.connection?.saveData ||
    effectiveType === 'slow-2g' ||
    effectiveType === '2g' ||
    effectiveType === '3g' ||
    (Number.isFinite(downlink) && downlink > 0 && downlink <= 1.5) ||
    (Number.isFinite(rtt) && rtt >= 300)
  );

  return (
    mobileClientHint ||
    mobileUserAgent ||
    iPadDesktopMode ||
    coarseCompactViewport ||
    lowMemory ||
    lowCoreCount ||
    slowNetwork
  );
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const smoothstep = (start: number, end: number, value: number) => {
  const amount = clamp((value - start) / (end - start));
  return amount * amount * (3 - 2 * amount);
};

type ScenePoi = {
  href?: string;
  position?: string;
  [key: string]: unknown;
};

const HOUSE_POI_POSITION_OVERRIDES: Record<string, string> = {
  '/spatii-verzi/': '-1.232,\n4.40,\n7.114',
  '/un-camin-sanatos/': '7.555,\n5.50,\n8.161',
  '/casa-sustenabila/': '6.163,\n1.40,\n7.974',
};

const COMPACT_HOUSE_POI_POSITION_OVERRIDES: Record<string, string> = {
  '/spatii-verzi/': '-2.10,\n4.60,\n7.114',
  '/un-camin-sanatos/': '8.30,\n5.80,\n8.161',
  '/casa-sustenabila/': '1.50,\n0.50,\n7.974',
};

const TABLET_HOUSE_POI_POSITION_OVERRIDES: Record<string, string> = {
  '/spatii-verzi/': '-2.10,\n4.60,\n7.114',
  '/un-camin-sanatos/': '9.50,\n5.80,\n8.161',
  '/casa-sustenabila/': '-0.50,\n0.10,\n7.974',
};

const prepareHousePoiLayout = () => {
  const poiSource = document.querySelector<HTMLElement>('._64c0f3[data-poi]');
  if (!poiSource) return;

  try {
    const positionOverrides = window.matchMedia('(max-width: 599px)').matches
      ? COMPACT_HOUSE_POI_POSITION_OVERRIDES
      : window.matchMedia('(max-width: 1100px)').matches
        ? TABLET_HOUSE_POI_POSITION_OVERRIDES
        : HOUSE_POI_POSITION_OVERRIDES;
    const points = JSON.parse(decodeURIComponent(poiSource.dataset.poi || '[]')) as ScenePoi[];
    points.forEach((point) => {
      const position = point.href ? positionOverrides[point.href] : undefined;
      if (position) point.position = position;
    });
    poiSource.dataset.poi = encodeURI(JSON.stringify(points));
  } catch (error) {
    console.error('[GREENTECH Charity] Pozitiile etichetelor 3D nu au putut fi pregatite.', error);
  }
};

export default function App() {
  // Freeze the profile for this document. Resizes/orientation changes must not
  // mount or unmount a second WebGL context midway through the 3D journey.
  const [useStandaloneBrandbook] = useState(shouldUseStandaloneBrandbook);
  const [sceneReady, setSceneReady] = useState(() => Boolean(window.__GREENTECH_STAGE_READY__));
  const [sectionPhase, setSectionPhase] = useState<SectionPhase>('house');
  const [brandbookLaunchPending, setBrandbookLaunchPending] = useState(false);
  const [brandbookLoaderVisible, setBrandbookLoaderVisible] = useState(false);
  const [brandbookFrameAttempt, setBrandbookFrameAttempt] = useState(0);
  const [wrapperCopy, setWrapperCopy] = useState<WrapperCopy>(EMPTY_WRAPPER_COPY);
  const sectionPhaseRef = useRef<SectionPhase>('house');
  const brandbookReady = useRef(false);
  const brandbookFrameElement = useRef<HTMLIFrameElement>(null);
  const brandbookSectionElement = useRef<HTMLElement>(null);
  const entryProgress = useRef(0);
  const portalAnchor = useRef<PortalAnchor>({x: 0.5, y: 0.5, radius: 180});
  const childRingAnchor = useRef<PortalAnchor>({x: 0.5, y: 0.5, radius: 180});
  const standaloneNavigationStarted = useRef(false);
  const preparedOpenRequested = useRef(false);
  const preparedNavigationPending = useRef(false);
  const preparedActivationPending = useRef(false);
  const preparedRequestId = useRef(0);
  const preparedRetryCount = useRef(0);
  const preparedWatchdog = useRef<number | undefined>(undefined);

  const setPhase = useCallback((phase: SectionPhase) => {
    sectionPhaseRef.current = phase;
    setSectionPhase(phase);

    const transitioning = phase === 'entering' || phase === 'leaving';
    document.body.classList.toggle('greentech-section-transitioning', transitioning);
    document.body.classList.toggle('brandbook-section-active', phase === 'active');
  }, []);

  const postToBrandbook = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    brandbookFrameElement.current?.contentWindow?.postMessage(
      {source: 'greentech-parent', type, ...payload},
      window.location.origin,
    );
  }, []);

  const clearPreparedWatchdog = useCallback(() => {
    window.clearTimeout(preparedWatchdog.current);
    preparedWatchdog.current = undefined;
  }, []);

  const clearPreparedBusyState = useCallback(() => {
    document.querySelectorAll<HTMLElement>('[aria-busy="true"]').forEach((element) => {
      element.removeAttribute('aria-busy');
    });
  }, []);

  const recoverPreparedBrandbook = useCallback((requestId: number, reason: string) => {
    if (
      useStandaloneBrandbook ||
      !preparedActivationPending.current ||
      requestId !== preparedRequestId.current
    ) return;

    clearPreparedWatchdog();
    preparedActivationPending.current = false;
    brandbookReady.current = false;

    if (preparedRetryCount.current < PREPARED_ENTRY_MAX_RETRIES) {
      preparedRetryCount.current += 1;
      preparedOpenRequested.current = true;
      setBrandbookFrameAttempt((attempt) => attempt + 1);
      return;
    }

    console.error('[GREENTECH Charity] Sectiunea interactiva nu a putut fi pregatita.', reason);
    preparedOpenRequested.current = false;
    preparedNavigationPending.current = false;
    setBrandbookFrameAttempt((attempt) => attempt + 1);
    setBrandbookLaunchPending(false);
    setBrandbookLoaderVisible(false);
    setPhase('house');
    clearPreparedBusyState();
  }, [clearPreparedBusyState, clearPreparedWatchdog, setPhase, useStandaloneBrandbook]);

  const activatePreparedBrandbook = useCallback(() => {
    if (useStandaloneBrandbook) return false;

    setBrandbookLaunchPending(true);
    if (!brandbookReady.current) return false;

    preparedOpenRequested.current = false;
    if (preparedActivationPending.current) return true;

    // Cadrul ramane complet ascuns pana cand iframe-ul confirma ca scena
    // WebGL a fost randata dupa deblocare. Astfel nu expunem fundalul crem
    // dintre reluarea rendererului si primul paint real.
    preparedActivationPending.current = true;
    const requestId = ++preparedRequestId.current;
    postToBrandbook('entry-active', {requestId});
    clearPreparedWatchdog();
    preparedWatchdog.current = window.setTimeout(() => {
      recoverPreparedBrandbook(requestId, 'timeout');
    }, PREPARED_ENTRY_TIMEOUT_MS);
    return true;
  }, [clearPreparedWatchdog, postToBrandbook, recoverPreparedBrandbook, useStandaloneBrandbook]);

  const completePreparedBrandbook = useCallback((requestId: number) => {
    if (
      useStandaloneBrandbook ||
      !preparedActivationPending.current ||
      requestId !== preparedRequestId.current
    ) return;

    clearPreparedWatchdog();
    preparedActivationPending.current = false;
    preparedOpenRequested.current = false;
    preparedNavigationPending.current = false;
    entryProgress.current = 1;
    setBrandbookLaunchPending(false);
    setBrandbookLoaderVisible(false);
    preparedRetryCount.current = 0;

    // renderPortal() lasa valori inline pentru vechea tranzitie prin cerc.
    // Deschiderea directa trebuie sa le elimine atomic; altfel CSS-ul nou este
    // corect, dar pierde in cascada in fata acelui clip-path inline.
    if (brandbookSectionElement.current) {
      brandbookSectionElement.current.style.clipPath = '';
    }
    if (brandbookFrameElement.current) {
      brandbookFrameElement.current.style.transform = '';
    }
    setPhase('active');

    if (!window.history.state?.greentechBrandbookActive) {
      window.history.pushState(
        Object.assign({}, window.history.state || {}, {greentechBrandbookActive: true}),
        '',
        window.location.href,
      );
    }

    clearPreparedBusyState();
  }, [clearPreparedBusyState, clearPreparedWatchdog, setPhase, useStandaloneBrandbook]);

  const deactivatePreparedBrandbook = useCallback(() => {
    clearPreparedWatchdog();
    preparedOpenRequested.current = false;
    preparedNavigationPending.current = false;
    preparedActivationPending.current = false;
    preparedRetryCount.current = 0;
    entryProgress.current = 0;
    setBrandbookLaunchPending(false);
    setBrandbookLoaderVisible(false);
    setPhase('house');
    postToBrandbook('park-at-entry');
    clearPreparedBusyState();
  }, [clearPreparedBusyState, clearPreparedWatchdog, postToBrandbook, setPhase]);

  useEffect(() => {
    if (!brandbookLaunchPending) return;

    // Deschiderile rapide fac schimbul direct intre cele doua scene. Loaderul
    // este doar plasa de siguranta pentru un upload/paint GPU mai lent.
    const timer = window.setTimeout(() => setBrandbookLoaderVisible(true), 180);
    return () => window.clearTimeout(timer);
  }, [brandbookLaunchPending]);

  useEffect(() => installHouseCameraExperience(), []);

  useEffect(() => {
    let active = true;
    void mainContentReady.then((content) => {
      if (active) setWrapperCopy(normaliseWrapperCopy(content.wrapper));
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    // Etichetele sunt acum controale locale pentru registrul de carduri. Ele
    // pastreaza markup-ul si clasele originale, dar nu mai contin URL-uri catre
    // documente HTML separate.
    document.querySelectorAll<HTMLElement>('._2680ad[data-pathname]').forEach((tab) => {
      const cardId = tab.dataset.pathname || '';
      if (!BUILDING_CARD_IDS.has(cardId)) {
        if (cardId === '/404/') tab.remove();
        return;
      }

      const anchor = tab.querySelector<HTMLAnchorElement>('a');
      if (!anchor) return;
      anchor.href = '#';
      anchor.dataset.gcCardTarget = cardId;
    });

    const logo = document.querySelector<HTMLAnchorElement>('._68f6d6 > a._df3134');
    if (logo) {
      logo.href = '#';
      logo.dataset.gcCardClose = '';
    }
  }, []);

  useEffect(() => {
    if (
      !wrapperCopy.navigation.contact ||
      !wrapperCopy.navigation.explore ||
      !wrapperCopy.navigation.tabAriaTemplate
    ) {
      return;
    }

    const legacyContactRoute = '/contact/';
    const transparencySourceRoute = '/transparenta/';
    const exploreRoute = STANDALONE_BRANDBOOK_URL;
    const menu = document.querySelector<HTMLElement>('._68f6d6 ._68695a');
    if (!menu || menu.dataset.gcPersistentNavReady === 'true') return;
    menu.dataset.gcPersistentNavReady = 'true';

    const baseHeaderItems = Array.from(menu.children).filter(
      (item): item is HTMLElement =>
        item instanceof HTMLElement &&
        item.matches('._2680ad[data-in-header="true"]'),
    );

    const snapshots = baseHeaderItems.map((item) => ({
      item,
      className: item.className,
      style: item.getAttribute('style'),
      inHeader: item.dataset.inHeader,
      anchorClassName: item.querySelector('a')?.className ?? '',
    }));

    const createPersistentTab = (route: string, label: string, marker: string) => {
      const tab = document.createElement('div');
      tab.className = '_2680ad _0ca877 _f722b9';
      tab.dataset.inHeader = 'true';
      tab.dataset.pathname = route;
      tab.setAttribute(marker, 'true');
      const ariaLabel = formatCopy(wrapperCopy.navigation.tabAriaTemplate, {label});
      tab.innerHTML = `
      <a href="#" data-gc-card-target="${route}" class="_2bb0cd _7423af" aria-label="${ariaLabel}">
        <span class="_14690a" aria-hidden="true">
          <svg class="_6c8233" viewBox="0 0 101 101" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.5 50.5C2.50001 23.9903 23.9903 2.50001 50.5 2.50001C77.0097 2.50001 98.5 23.9903 98.5 50.5C98.5 77.0097 77.0097 98.5 50.5 98.5C23.9903 98.5 2.5 77.0097 2.5 50.5Z" vector-effect="non-scaling-stroke" />
            <path class="_19c712" d="M50.5 16.55V84.45" vector-effect="non-scaling-stroke" />
            <path d="M84.4502 50.5L16.5502 50.5" vector-effect="non-scaling-stroke" />
          </svg>
        </span>
        <span class="_5862ff"><span class="_fc3732">${label}</span></span>
      </a>
      <div class="_9bef0c"></div>
    `;
      return tab;
    };

    const legacyContactTab = createPersistentTab(
      legacyContactRoute,
      wrapperCopy.navigation.contact,
      'data-gc-legacy-contact-tab',
    );
    const transparencyTab = menu.querySelector<HTMLElement>(
      `._2680ad[data-pathname="${transparencySourceRoute}"]`,
    );
    const transparencySnapshot = transparencyTab
      ? {
          className: transparencyTab.className,
          style: transparencyTab.getAttribute('style'),
          inHeader: transparencyTab.dataset.inHeader,
          anchorClassName: transparencyTab.querySelector('a')?.className ?? '',
        }
      : null;

    // Transparenta ramane un panou editorial de tip eticheta, separat complet
    // de navigatia laterala persistenta.
    if (transparencyTab) {
      transparencyTab.classList.remove('_0ca877', '_f722b9', '_6ebb2e');
      transparencyTab.classList.add('_c047d6', '_53e7d7');
      transparencyTab.dataset.inHeader = 'false';
      const transparencyAnchor = transparencyTab.querySelector('a');
      transparencyAnchor?.classList.add('_864f6c');
      transparencyAnchor?.classList.toggle(
        '_5a376b',
        window.location.pathname === transparencySourceRoute,
      );
    }

    const exploreTab = createPersistentTab(
      exploreRoute,
      wrapperCopy.navigation.explore,
      'data-gc-explore-tab',
    );
    const exploreAnchor = exploreTab.querySelector<HTMLAnchorElement>('a');
    if (exploreAnchor) {
      exploreAnchor.href = exploreRoute;
      exploreAnchor.dataset.pass = 'true';
      delete exploreAnchor.dataset.gcCardTarget;
    }

    const impactTab = menu.querySelector<HTMLElement>(
      '._2680ad[data-pathname="/impact/"]',
    );
    impactTab?.classList.remove('_6ebb2e');
    impactTab?.classList.add('_f722b9');
    exploreTab.classList.remove('_f722b9', '_53e7d7');
    exploreTab.classList.add('_6ebb2e');

    menu.appendChild(legacyContactTab);

    const tabsBeforeExplore = [...baseHeaderItems, legacyContactTab];
    const persistentTabs = [...tabsBeforeExplore, exploreTab];
    // Cardurile sunt deschise de routerul intern, fara sa modifice URL-ul.
    // Pastram indexul activ sincronizat cu evenimentul emis de acel router;
    // altfel reveal-ul Exploreaza reutilizeaza starea initiala (de regula -1)
    // si retrage eticheta, desi continutul cardului ramane deschis.
    let activeIndex = persistentTabs.findIndex(
      (item) => item.dataset.pathname === window.location.pathname,
    );

    const onActiveCardChange = (event: Event) => {
      const activeCard = (
        event as CustomEvent<{activeCard?: string | null}>
      ).detail?.activeCard;

      activeIndex = persistentTabs.findIndex(
        (item) => item.dataset.pathname === activeCard,
      );
    };
    window.addEventListener('greentech:active-card-change', onActiveCardChange);

    const layoutPersistentTabs = (includeExplore: boolean) => {
      const visibleCount = includeExplore ? persistentTabs.length : tabsBeforeExplore.length;

      persistentTabs.forEach((item, index) => {
        item.classList.add('_0ca877');
        item.dataset.inHeader = 'true';
        // In starea initiala, Contact ocupa ultimul slot. Exploreaza sta exact
        // sub marginea stivei, in afara viewportului, fara rand sau coloana
        // rezervata. La reveal, cele trei taburi existente se deplaseaza
        // impreuna cu un slot, iar Exploreaza intra in locul eliberat.
        const offset = !includeExplore && item === exploreTab
          ? 1
          : visibleCount - index;
        item.style.setProperty('--offset', String(offset));
        item.style.setProperty('--index', String(index));
        item.classList.toggle('_5257f8', activeIndex >= index);
        item.classList.toggle('gc-tab-collapsed', activeIndex > index);
        item.querySelector('a')?.classList.toggle('_5a376b', activeIndex === index);
      });
    };

    menu.classList.add('gc-explore-stack');
    exploreTab.classList.add('gc-explore-pending');
    exploreTab.setAttribute('aria-hidden', 'true');
    exploreTab.inert = true;
    layoutPersistentTabs(false);

    let exploreRevealed = false;
    let revealFrame = 0;
    let settleFrame = 0;
    let revealCleanupTimer = 0;
    const finishStackAnimation = () => {
      menu.classList.remove('gc-stack-animating');
      window.clearTimeout(revealCleanupTimer);
    };
    const onExploreTransitionEnd = (event: TransitionEvent) => {
      if (event.target === exploreTab && event.propertyName === 'transform') {
        finishStackAnimation();
      }
    };
    exploreTab.addEventListener('transitionend', onExploreTransitionEnd);

    const revealExploreTab = () => {
      if (exploreRevealed) return;
      exploreRevealed = true;

      // Daca un card este deschis, inchide-l prin acelasi router care ii
      // controleaza continutul. Astfel eticheta si textul se retrag impreuna,
      // inainte ca Exploreaza sa intre in stiva.
      window.dispatchEvent(
        new CustomEvent('greentech:card-request', {detail: {card: '/'}}),
      );

      menu.classList.add('gc-stack-animating');
      menu.appendChild(exploreTab);

      // Doua cadre garanteaza ca browserul a compus pozitia fara Exploreaza
      // inainte sa animam noua geometrie; evitam flicker-ul la cache rece.
      revealFrame = window.requestAnimationFrame(() => {
        settleFrame = window.requestAnimationFrame(() => {
          layoutPersistentTabs(true);
          exploreTab.classList.remove('gc-explore-pending');
          exploreTab.classList.add('gc-explore-ready');
          exploreTab.removeAttribute('aria-hidden');
          exploreTab.inert = false;
          revealCleanupTimer = window.setTimeout(finishStackAnimation, 900);
        });
      });
    };

    const revealWhenHouseIsReady = () => {
      if (document.documentElement.dataset.gcCameraPhase === 'orbiting') {
        revealExploreTab();
      }
    };
    const cameraPhaseObserver = new MutationObserver(revealWhenHouseIsReady);
    cameraPhaseObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-gc-camera-phase'],
    });
    revealWhenHouseIsReady();

    const onPageShow = () => {
      clearPreparedWatchdog();
      preparedNavigationPending.current = false;
      preparedActivationPending.current = false;
      preparedRetryCount.current = 0;
      setBrandbookLaunchPending(false);
      setBrandbookLoaderVisible(false);
    };
    window.addEventListener('pageshow', onPageShow);

    const onExploreClick = (event: MouseEvent) => {
      const target = event.target;
      const clickedAnchor = target instanceof Element
        ? target.closest<HTMLAnchorElement>(
            '[data-gc-explore-tab] > a, a[data-gc-explore-link]',
          )
        : null;
      if (!clickedAnchor) return;

      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      // Cat timp runtime-ul original detine camera si executa zoom-ul, tabul
      // Exploreaza este ascuns. Protectia ramane si aici pentru clickul care
      // poate ajunge in acelasi frame in care incepe animatia.
      const cameraPhase = document.documentElement.dataset.gcCameraPhase;
      if (
        document.documentElement.classList.contains('gc-camera-zoom-locked') ||
        cameraPhase === 'clouds' ||
        cameraPhase === 'zooming' ||
        cameraPhase === 'settling'
      ) {
        return;
      }

      if (preparedNavigationPending.current) return;
      preparedNavigationPending.current = true;
      preparedRetryCount.current = 0;
      clickedAnchor.setAttribute('aria-busy', 'true');
      setBrandbookLaunchPending(true);

      if (useStandaloneBrandbook) {
        // Pe mobil si pe conexiuni lente intram imediat in documentul tinta.
        // Loaderul propriu al sectiunii poate afisa progresul, fara ca un pool
        // serial de preload-uri sa faca butonul sa para blocat pe pagina casei.
        window.location.assign(exploreRoute);
        return;
      }

      if (!useStandaloneBrandbook && ENABLE_PREPARED_BRANDBOOK_FRAME) {
        preparedOpenRequested.current = true;
        // Cadrul conectat este autoritatea: daca a randat deja 1/7, il afisam
        // in acelasi click, fara sa mai asteptam pool-ul HTTP din pagina casei.
        activatePreparedBrandbook();
        return;
      }

      void (async () => {
        try {
          await waitForBrandbookWarmup();
        } catch (error) {
          // Warmup-ul este o optimizare, nu o conditie de navigare. Daca un
          // request de pregatire expira, documentul tinta primeste sansa sa
          // incarce resursa direct, fara sa lase butonul blocat pe pending.
          console.warn('[GREENTECH Charity] Continuam fara warmup complet.', error);
        }
        window.location.assign(exploreRoute);
      })();
    };
    // The legacy navigation runtime can rebuild its tab nodes after React has
    // mounted. Delegation keeps the real Explore link wired even after that
    // rebuild, instead of leaving a cloned anchor with no listener.
    document.addEventListener('click', onExploreClick, true);

    return () => {
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('greentech:active-card-change', onActiveCardChange);
      document.removeEventListener('click', onExploreClick, true);
      cameraPhaseObserver.disconnect();
      window.cancelAnimationFrame(revealFrame);
      window.cancelAnimationFrame(settleFrame);
      window.clearTimeout(revealCleanupTimer);
      exploreTab.removeEventListener('transitionend', onExploreTransitionEnd);
      menu.classList.remove('gc-explore-stack', 'gc-stack-animating');
      legacyContactTab.remove();
      exploreTab.remove();
      snapshots.forEach(({item, className, style, inHeader, anchorClassName}) => {
        item.className = className;
        if (style === null) item.removeAttribute('style');
        else item.setAttribute('style', style);
        if (inHeader === undefined) delete item.dataset.inHeader;
        else item.dataset.inHeader = inHeader;
        const anchor = item.querySelector('a');
        if (anchor) anchor.className = anchorClassName;
      });
      if (transparencyTab && transparencySnapshot) {
        transparencyTab.className = transparencySnapshot.className;
        if (transparencySnapshot.style === null) transparencyTab.removeAttribute('style');
        else transparencyTab.setAttribute('style', transparencySnapshot.style);
        if (transparencySnapshot.inHeader === undefined) delete transparencyTab.dataset.inHeader;
        else transparencyTab.dataset.inHeader = transparencySnapshot.inHeader;
        const anchor = transparencyTab.querySelector('a');
        if (anchor) anchor.className = transparencySnapshot.anchorClassName;
      }
      delete menu.dataset.gcPersistentNavReady;
    };
  }, [activatePreparedBrandbook, clearPreparedWatchdog, useStandaloneBrandbook, wrapperCopy.navigation]);

  useEffect(() => {
    if (!ENABLE_PREPARED_BRANDBOOK_FRAME) return;
    if (useStandaloneBrandbook) return;

    let releaseTimer: number | undefined;
    const onStageReady = () => {
      window.clearTimeout(releaseTimer);
      // Lasa browserului un cadru de respiro pentru eliberarea bufferelor GLB
      // inainte sa porneasca a doua scena WebGL din iframe.
      releaseTimer = window.setTimeout(() => setSceneReady(true), 1200);
    };
    window.addEventListener('greencube:stage-ready', onStageReady);
    if (window.__GREENTECH_STAGE_READY__) onStageReady();
    return () => {
      window.clearTimeout(releaseTimer);
      window.removeEventListener('greencube:stage-ready', onStageReady);
    };
  }, [useStandaloneBrandbook]);

  useEffect(() => {
    void mainContentReady
      .then(() => {
        prepareHousePoiLayout();
        return new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      })
      .then(() => import('./greencube-runtime.js'))
      .then(() => {
        let requestedCard = '';
        try {
          requestedCard = window.sessionStorage.getItem('greentech:open-card') || '';
          window.sessionStorage.removeItem('greentech:open-card');
        } catch {
          return;
        }

        if (!BUILDING_CARD_IDS.has(requestedCard)) return;
        window.dispatchEvent(
          new CustomEvent('greentech:card-request', {detail: {card: requestedCard}}),
        );
      })
      .catch((error) => {
        console.error('[GREENTECH Charity] Scena principala nu a putut fi incarcata.', error);
        window.dispatchEvent(
          new CustomEvent('greencube:stage-failed', {detail: {reason: 'runtime'}}),
        );
      });
  }, []);

  useEffect(() => {
    // Scena principala are prioritate absoluta. In special pe 3G, pornirea
    // brandbook-ului in paralel concura cu modelul, texturile si workerul si
    // putea lasa zoom-ul fara casa. Dupa `stage-ready`, profilul de retea din
    // preload decide singur concurenta si daca prerender-ul este permis.
    if (useStandaloneBrandbook) return;

    let started = false;
    const startAfterStage = () => {
      if (started) return;
      started = true;
      void startBrandbookWarmup().catch((error) => {
        console.warn('[GREENTECH Charity] Warmup-ul secundar a esuat; navigarea directa ramane disponibila.', error);
      });
    };

    window.addEventListener('greencube:stage-ready', startAfterStage);
    if (window.__GREENTECH_STAGE_READY__) startAfterStage();
    return () => window.removeEventListener('greencube:stage-ready', startAfterStage);
  }, [useStandaloneBrandbook]);

  const renderPortal = useCallback(() => {
    const section = brandbookSectionElement.current;
    const frame = brandbookFrameElement.current;
    if (!section || !frame) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const parentRing = portalAnchor.current;
    const childRing = childRingAnchor.current;
    const amount = entryProgress.current;
    const active = sectionPhaseRef.current === 'active';

    const portalX = clamp(parentRing.x, -1, 2) * width;
    const portalY = clamp(parentRing.y, -1, 2) * height;
    const farthestX = Math.max(portalX, width - portalX);
    const farthestY = Math.max(portalY, height - portalY);
    const coverRadius = Math.hypot(farthestX, farthestY) + 4;

    // The mask is the ring hole: it tracks the projected circle so the section
    // is literally seen through it, then blends to full cover at the very end
    // so the viewport corners are guaranteed regardless of projection error.
    const open = smoothstep(PORTAL_OPEN_FROM, PORTAL_OPEN_TO, amount);
    const settle = active ? 1 : smoothstep(PORTAL_COVER_FROM, 1, amount);
    const holeRadius = Math.max(parentRing.radius, 0) * open;
    const radius = holeRadius + (coverRadius - holeRadius) * settle;

    section.style.clipPath = `circle(${radius}px at ${portalX}px ${portalY}px)`;

    // Line the child's own ring up with the hole, then release it to its
    // natural framing as the hole takes over the viewport.
    const childRadius = Math.max(childRing.radius, 1);
    // At the head of stage0 the child's ring is large on screen, so the early
    // alignment scale is much smaller than it was at the parked frame.
    const alignedScale = clamp(parentRing.radius / childRadius, 0.03, 8);
    const blend = active ? 1 : smoothstep(FRAME_BLEND_FROM, FRAME_BLEND_TO, amount);
    const frameScale = alignedScale + (1 - alignedScale) * blend;
    const frameX = (portalX - childRing.x * width * frameScale) * (1 - blend);
    const frameY = (portalY - childRing.y * height * frameScale) * (1 - blend);
    frame.style.transform = `translate3d(${frameX}px, ${frameY}px, 0) scale(${frameScale})`;
  }, []);

  const closeBrandbook = useCallback(() => {
    if (sectionPhaseRef.current !== 'active') return;

    setPhase('leaving');
    postToBrandbook('entry-leaving');
    // Hand the entry channel back to zero; the scene controller eases both the
    // camera and the mask out of it on the same curve it eased them in.
    window.dispatchEvent(
      new CustomEvent('greencube:section-transition', {
        detail: {progress: 0, requestAnchor: true},
      }),
    );
  }, [postToBrandbook, setPhase]);

  const openStandaloneBrandbook = useCallback(() => {
    if (!useStandaloneBrandbook || standaloneNavigationStarted.current) return;

    standaloneNavigationStarted.current = true;

    // The low-memory path owns the whole viewport, so Safari never has to keep
    // the house renderer and the brandbook renderer alive in the same page.
    // `replace` also prevents Safari from retaining the WebGL page in bfcache.
    try {
      (window.top ?? window).location.replace(STANDALONE_BRANDBOOK_URL);
    } catch {
      window.location.replace(STANDALONE_BRANDBOOK_URL);
    }
  }, [useStandaloneBrandbook]);

  useEffect(() => {
    if (!ENABLE_BRANDBOOK_TRANSITION) return;
    const onProgress = (event: Event) => {
      const detail = (event as CustomEvent<GreencubeScrollProgress>).detail;
      const entry = clamp(Number(detail.entry) || 0);
      const entryTarget = clamp(Number(detail.entryTarget) || 0);
      entryProgress.current = entry;

      const phase = sectionPhaseRef.current;

      if (phase === 'house') {
        if (
          useStandaloneBrandbook &&
          entry >= ENTRY_SETTLED &&
          entryTarget >= 0.999
        ) {
          openStandaloneBrandbook();
          return;
        }
        if (entry > ENTRY_EPSILON && brandbookReady.current) {
          setPhase('entering');
          postToBrandbook('activate-entry');
        }
      } else if (phase === 'entering') {
        if (entry >= ENTRY_SETTLED && entryTarget >= 0.999) {
          setPhase('active');
          postToBrandbook('entry-active');
        } else if (entry <= ENTRY_EPSILON && entryTarget <= ENTRY_EPSILON) {
          setPhase('house');
          postToBrandbook('park-at-entry');
        }
      } else if (phase === 'leaving' && entry <= ENTRY_EPSILON && entryTarget <= ENTRY_EPSILON) {
        setPhase('house');
        postToBrandbook('park-at-entry');
      }

      renderPortal();
    };

    window.addEventListener('greencube:scroll-progress', onProgress);
    return () => window.removeEventListener('greencube:scroll-progress', onProgress);
  }, [openStandaloneBrandbook, postToBrandbook, renderPortal, setPhase, useStandaloneBrandbook]);

  useEffect(() => {
    const onAnchor = (event: Event) => {
      const detail = (event as CustomEvent<PortalAnchor>).detail;
      if (!detail || !Number.isFinite(detail.x) || !Number.isFinite(detail.y)) return;
      portalAnchor.current = {
        x: detail.x,
        y: detail.y,
        radius:
          Number.isFinite(detail.radius) && detail.radius > 0
            ? detail.radius
            : portalAnchor.current.radius,
      };
      renderPortal();
    };

    window.addEventListener('greencube:transition-anchor', onAnchor);
    return () => window.removeEventListener('greencube:transition-anchor', onAnchor);
  }, [renderPortal]);

  useEffect(() => {
    const onMessage = (event: MessageEvent<BrandbookMessage>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== brandbookFrameElement.current?.contentWindow ||
        event.data?.source !== 'greentech-brandbook'
      ) {
        return;
      }

      if (event.data.type === 'stage0-detail-ready') {
        if (event.data.ring) childRingAnchor.current = event.data.ring;
        brandbookReady.current = true;
        renderPortal();
        if (preparedOpenRequested.current) activatePreparedBrandbook();
      } else if (event.data.type === 'entry-painted') {
        if (event.data.ring) childRingAnchor.current = event.data.ring;
        completePreparedBrandbook(Number(event.data.requestId));
      } else if (
        event.data.type === 'entry-failed' ||
        event.data.type === 'webgl-context-lost'
      ) {
        recoverPreparedBrandbook(
          Number(event.data.requestId),
          event.data.reason || event.data.type,
        );
      } else if (event.data.type === 'entry-anchor' && event.data.ring) {
        childRingAnchor.current = event.data.ring;
        renderPortal();
      } else if (event.data.type === 'return-to-house') {
        if (!useStandaloneBrandbook && ENABLE_PREPARED_BRANDBOOK_FRAME) {
          if (window.history.state?.greentechBrandbookActive) window.history.back();
          else deactivatePreparedBrandbook();
        } else {
          closeBrandbook();
        }
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [activatePreparedBrandbook, closeBrandbook, completePreparedBrandbook, deactivatePreparedBrandbook, recoverPreparedBrandbook, renderPortal, useStandaloneBrandbook]);

  useEffect(() => {
    if (useStandaloneBrandbook || !ENABLE_PREPARED_BRANDBOOK_FRAME) return;

    const onPopState = () => {
      if (
        sectionPhaseRef.current === 'active' &&
        !window.history.state?.greentechBrandbookActive
      ) {
        deactivatePreparedBrandbook();
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [deactivatePreparedBrandbook, useStandaloneBrandbook]);

  useEffect(() => {
    const onResize = () => renderPortal();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [renderPortal]);

  useEffect(() => {
    return () => {
      clearPreparedWatchdog();
      document.body.classList.remove('brandbook-section-active', 'greentech-section-transitioning');
    };
  }, [clearPreparedWatchdog]);

  const sectionPresent = sectionPhase !== 'house';
  const sectionInteractive = sectionPhase === 'active';

  return (
    <>
      <BuildingCardRegistry />
      <style>{`
        .greentech-brandbook-section {
          position: fixed;
          inset: 0;
          z-index: 1000;
          width: 100vw;
          height: 100vh;
          height: 100svh;
          overflow: hidden;
          isolation: isolate;
          visibility: visible;
          opacity: 0;
          pointer-events: none;
          background: #efede0;
          clip-path: none;
          will-change: opacity;
        }

        .greentech-brandbook-section.is-present {
          opacity: 1;
        }

        .greentech-brandbook-section.is-interactive {
          pointer-events: auto;
        }

        .greentech-brandbook-section.is-direct {
          clip-path: none;
        }

        .greentech-brandbook-frame {
          display: block;
          width: 100%;
          height: 100%;
          border: 0;
          background: #efede0;
          transform-origin: 0 0;
          will-change: transform;
        }

        .greentech-brandbook-launch-loader {
          position: fixed;
          inset: 0;
          z-index: 1100;
          display: grid;
          place-content: center;
          justify-items: center;
          gap: 1rem;
          visibility: hidden;
          opacity: 0;
          pointer-events: none;
          color: #1f3a27;
          background: rgba(239, 237, 224, .97);
          transition: opacity .18s linear, visibility 0s linear .18s;
        }

        .greentech-brandbook-launch-loader.is-visible {
          visibility: visible;
          opacity: 1;
          pointer-events: auto;
          transition: opacity .18s linear;
        }

        .greentech-brandbook-launch-loader__mark {
          width: 2.75rem;
          aspect-ratio: 1;
          border: 1px solid rgba(31, 58, 39, .22);
          border-top-color: #64a045;
          border-right-color: #64a045;
          border-radius: 50%;
          animation: greentech-brandbook-loader-spin .9s linear infinite;
        }

        .greentech-brandbook-launch-loader__label {
          font-family: Helvetica, 'Helvetica Neue', Arial, sans-serif;
          font-size: .68rem;
          font-weight: 600;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        @keyframes greentech-brandbook-loader-spin {
          to { transform: rotate(1turn); }
        }

        body.greentech-section-transitioning ._68f6d6,
        body.brandbook-section-active ._68f6d6 {
          opacity: 0;
          pointer-events: none;
          transition: opacity .35s linear;
        }

        .gc-explore-stack.gc-stack-animating > ._2680ad._0ca877 {
          transition:
            top .72s cubic-bezier(.22, 1, .36, 1),
            left .72s cubic-bezier(.22, 1, .36, 1),
            clip-path .35s var(--ease-out-cubic);
          will-change: top, left, clip-path;
        }

        .gc-explore-stack > [data-gc-explore-tab].gc-explore-pending {
          opacity: 0;
          clip-path: inset(100% 0 0 0);
          transform: translate3d(0, var(--column), 0);
          pointer-events: none;
        }

        .gc-explore-stack.gc-stack-animating > [data-gc-explore-tab] {
          transition:
            top .72s cubic-bezier(.22, 1, .36, 1),
            left .72s cubic-bezier(.22, 1, .36, 1),
            transform .72s cubic-bezier(.22, 1, .36, 1),
            opacity .32s linear,
            clip-path .72s cubic-bezier(.22, 1, .36, 1);
          will-change: top, left, transform, opacity, clip-path;
        }

        @media (orientation: landscape) {
          .gc-explore-stack > [data-gc-explore-tab].gc-explore-pending {
            transform: translate3d(0, 100%, 0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .gc-explore-stack.gc-stack-animating > ._2680ad._0ca877,
          .gc-explore-stack.gc-stack-animating > [data-gc-explore-tab] {
            transition-duration: .01ms;
          }

          .greentech-brandbook-launch-loader__mark {
            animation-duration: 1.8s;
          }
        }

        @media (min-width: 1921px) {
          :root,
          ._f6ab87 {
            --space: 20px !important;
            --column: 120px !important;
            --text-xs: 12px !important;
            --text-s: 16px !important;
            --text-m: 20px !important;
            --title-s: 60px !important;
            --title-m: 60px !important;
            --title-l: 120px !important;
            --title-xl: 200px !important;
            --radius: 30px !important;
          }
        }

        [data-gc-legacy-contact] .gc-legacy-contact__page {
          align-content: start;
        }

        [data-gc-legacy-contact] .gc-legacy-contact__intro {
          max-width: 34rem;
        }

        [data-gc-legacy-contact] .gc-legacy-contact__kicker {
          display: block;
          margin-bottom: 1.2rem;
          font-size: var(--text-xs);
          font-style: normal;
          font-weight: 700;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        [data-gc-legacy-contact] .gc-legacy-contact__list {
          display: grid;
          align-content: start;
          font-style: normal;
          border-bottom: 1px solid currentColor;
        }

        [data-gc-legacy-contact] .gc-legacy-contact__row {
          display: grid;
          grid-template-columns: minmax(7rem, .4fr) minmax(0, 1fr);
          gap: var(--space);
          align-items: start;
          padding-block: calc(var(--space) * 1.25);
          border-top: 1px solid currentColor;
        }

        [data-gc-legacy-contact] .gc-legacy-contact__row > span {
          padding-top: .35em;
          font-size: var(--text-xs);
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        [data-gc-legacy-contact] .gc-legacy-contact__row > a,
        [data-gc-legacy-contact] .gc-legacy-contact__row > strong {
          font-family: Garamond, serif;
          font-size: var(--title-s);
          font-style: normal;
          font-weight: 400;
          line-height: .95;
          overflow-wrap: anywhere;
          text-decoration: none;
        }

        [data-gc-legacy-contact] .gc-legacy-contact__row > a {
          transition: opacity .2s linear;
        }

        @media (pointer: fine) {
          [data-gc-legacy-contact] .gc-legacy-contact__row > a:hover {
            opacity: .58;
          }
        }

        @media (orientation: portrait) and (max-width: 1100px) {
          [data-gc-legacy-contact] .gc-legacy-contact__row {
            grid-template-columns: minmax(0, 1fr);
            gap: .35rem;
          }

          [data-gc-legacy-contact] .gc-legacy-contact__row > span {
            padding-top: 0;
          }
        }
      `}</style>

      <div
        className={`greentech-brandbook-launch-loader${brandbookLoaderVisible ? ' is-visible' : ''}`}
        role="status"
        aria-live="polite"
        aria-hidden={!brandbookLoaderVisible}
      >
        <span className="greentech-brandbook-launch-loader__mark" aria-hidden="true" />
        <span className="greentech-brandbook-launch-loader__label">
          {wrapperCopy.brandbook.loadingLabel || 'Pregatim povestea'}
        </span>
      </div>

      {ENABLE_PREPARED_BRANDBOOK_FRAME && !useStandaloneBrandbook && (
        <section
          ref={brandbookSectionElement}
          className={`greentech-brandbook-section${sectionPresent ? ' is-present' : ''}${sectionInteractive ? ' is-interactive is-direct' : ''}`}
          aria-label={wrapperCopy.brandbook.ariaLabel}
          aria-hidden={!sectionInteractive}
          inert={!sectionInteractive}
        >
          <iframe
            ref={brandbookFrameElement}
            className="greentech-brandbook-frame"
            src={sceneReady
              ? `/brandbook-section/?entry=connected&attempt=${brandbookFrameAttempt}`
              : undefined}
            title={wrapperCopy.brandbook.frameTitle}
            loading="eager"
            allow="fullscreen"
          />
        </section>
      )}
    </>
  );
}
