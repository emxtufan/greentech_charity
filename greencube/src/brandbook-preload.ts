export const STANDALONE_BRANDBOOK_URL = '/brandbook-section/?entry=standalone';

const BRANDBOOK_BASE_URL = '/brandbook-section/';
const BRANDBOOK_RUNTIME_URL = '/brandbook-section/assets/js/glmain.min.js';
const SPECULATION_RULES_ID = 'gc-brandbook-prerender';
const DOCUMENT_PREFETCH_ID = 'gc-brandbook-document-prefetch';
const MAX_CRITICAL_FETCH_ATTEMPTS = 2;
const CRITICAL_FETCH_TIMEOUT_MS = 15_000;
const ENTRY_IMAGE_TIMEOUT_MS = 15_000;

// These are the images needed by the first real 1/7 frame. They are retained
// after Image.decode() so non-prerendering browsers can reuse the decoded
// entry artwork without keeping every later stage alive in the house page.
const ENTRY_IMAGE_PATHS = [
  'assets/image/bg.webp',
  'assets/image/bgNoise.webp',
  'assets/image/bgMask.webp',
  'assets/image/stage_mask.webp',
  'assets/image/stage_mask_blue.webp',
  'assets/image/stage_mask_black.webp',
  'assets/image/stage0/s0_o.webp',
  'assets/image/stage0/s0_t_ro.png',
  'assets/image/stage0/s0_t_sp_ro.png',
  'assets/image/stage0/s0_copy_ro.png',
  'assets/image/stage0/s0_copy2_ro.png',
  'assets/image/stage0/s0_copy2_g.webp',
  'assets/image/road0_2.webp',
  'assets/image/road1_1.webp',
  'assets/image/chara/chara1_1.webp',
  'assets/image/chara/chara5_3.webp',
  'assets/image/chara/chara5_3_top.webp',
  'assets/image/chara/chara5_3_hand.webp',
  'assets/image/particle/particle1.webp',
  'assets/image/mess/001.webp',
  'assets/image/mess/002.webp',
  'assets/image/mess/003.webp',
] as const;

const ENTRY_IMAGE_URLS = new Set(
  ENTRY_IMAGE_PATHS.map((path) => new URL(path, new URL(BRANDBOOK_BASE_URL, window.location.href)).href),
);

const EXCLUDED_RUNTIME_ASSETS = new Set([
  'assets/image/stage0/s0_o_s.webp',
  'assets/image/stage0/transparent.png',
]);

type FetchPriority = 'high' | 'low' | 'auto';
type PriorityRequestInit = RequestInit & {priority?: FetchPriority};
type ScriptConstructorWithSupports = typeof HTMLScriptElement & {
  supports?: (type: string) => boolean;
};
type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
};

type NetworkProfile = {
  slow: boolean;
  priority: FetchPriority;
  concurrency: number;
};

type WarmupDetail = {
  phase: 'idle' | 'running' | 'entry-ready' | 'ready' | 'failed';
  completed?: number;
  total?: number;
};

let warmupPromise: Promise<void> | undefined;
let manifestPromise: Promise<string[]> | undefined;
const retainedEntryImages: HTMLImageElement[] = [];

const updateWarmupState = (detail: WarmupDetail) => {
  document.documentElement.dataset.gcBrandbookWarmup = detail.phase;
  window.dispatchEvent(new CustomEvent('greentech:brandbook-warmup', {detail}));
};

const supportsManagedPrerender = () => {
  const constructor = HTMLScriptElement as ScriptConstructorWithSupports;
  return constructor.supports?.('speculationrules') === true;
};

const getNetworkProfile = (): NetworkProfile => {
  const connection = (navigator as NavigatorWithConnection).connection;
  const effectiveType = connection?.effectiveType?.toLowerCase();
  const downlink = Number(connection?.downlink);
  const rtt = Number(connection?.rtt);
  const slow = Boolean(
    connection?.saveData ||
    effectiveType === 'slow-2g' ||
    effectiveType === '2g' ||
    effectiveType === '3g' ||
    (Number.isFinite(downlink) && downlink > 0 && downlink <= 1.5) ||
    (Number.isFinite(rtt) && rtt >= 300),
  );

  return {
    slow,
    priority: slow ? 'low' : 'high',
    concurrency: slow ? 1 : 5,
  };
};

const installManagedPrerender = (slowNetwork: boolean) => {
  if (!document.getElementById(DOCUMENT_PREFETCH_ID)) {
    const prefetch = document.createElement('link');
    prefetch.id = DOCUMENT_PREFETCH_ID;
    prefetch.rel = 'prefetch';
    prefetch.href = STANDALONE_BRANDBOOK_URL;
    document.head.appendChild(prefetch);
  }

  // Prerender-ul ar porni un al doilea document WebGL in paralel cu scena
  // casei. Pe o conexiune lenta pastram doar prefetch-ul documentului, astfel
  // incat resursele critice sa nu concureze pentru aceeasi banda.
  if (
    slowNetwork ||
    !supportsManagedPrerender() ||
    document.getElementById(SPECULATION_RULES_ID)
  ) return;

  const rules = document.createElement('script');
  rules.id = SPECULATION_RULES_ID;
  rules.type = 'speculationrules';
  rules.textContent = JSON.stringify({
    prerender: [
      {
        urls: [STANDALONE_BRANDBOOK_URL],
        eagerness: 'immediate',
      },
    ],
  });
  document.head.appendChild(rules);
  document.documentElement.dataset.gcBrandbookPrerender = 'requested';
};

const toAbsoluteUrl = (value: string, base: string) => {
  try {
    const url = new URL(value, base);
    if (url.origin !== window.location.origin) return null;
    return url.href;
  } catch {
    return null;
  }
};

const fetchWithRetry = async <T>(
  url: string,
  priority: FetchPriority,
  attempts: number,
  label: string,
  read: (response: Response) => Promise<T>,
) => {
  const maximumAttempts = Math.max(1, Math.min(attempts, MAX_CRITICAL_FETCH_ATTEMPTS));
  let lastError: unknown;

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), CRITICAL_FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        cache: 'force-cache',
        credentials: 'same-origin',
        priority,
        signal: controller.signal,
      } as PriorityRequestInit);
      if (!response.ok) throw new Error(`${label} ${response.status}: ${url}`);
      return await read(response);
    } catch (error) {
      lastError = error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  const reason = lastError instanceof Error ? ` ${lastError.message}` : '';
  throw new Error(`${label} esuat dupa ${maximumAttempts} incercari: ${url}.${reason}`);
};

const fetchResource = async (
  url: string,
  priority: FetchPriority = 'low',
  attempts = 1,
) => {
  await fetchWithRetry(url, priority, attempts, 'Preload', (response) => response.arrayBuffer());
};

const fetchText = async (url: string, priority: FetchPriority = 'high') => {
  return fetchWithRetry(
    url,
    priority,
    MAX_CRITICAL_FETCH_ATTEMPTS,
    'Manifest',
    (response) => response.text(),
  );
};

const extractCssUrls = (css: string, stylesheetUrl: string) => {
  const urls: string[] = [];
  const pattern = /url\(\s*(['"]?)([^'"\)]+)\1\s*\)/gi;
  for (const match of css.matchAll(pattern)) {
    const value = match[2]?.trim();
    if (!value || value.startsWith('data:') || value.startsWith('#')) continue;
    const resolved = toAbsoluteUrl(value, stylesheetUrl);
    if (resolved) urls.push(resolved);
  }
  return urls;
};

const buildManifest = (priority: FetchPriority) => {
  if (manifestPromise) return manifestPromise;

  manifestPromise = (async () => {
    const targetUrl = new URL(STANDALONE_BRANDBOOK_URL, window.location.href).href;
    const baseUrl = new URL(BRANDBOOK_BASE_URL, window.location.href).href;
    const runtimeUrl = new URL(BRANDBOOK_RUNTIME_URL, window.location.href).href;
    const [html, runtime] = await Promise.all([
      fetchText(targetUrl, priority),
      fetchText(runtimeUrl, priority),
    ]);

    const urls = new Set<string>([targetUrl, runtimeUrl]);
    const parsed = new DOMParser().parseFromString(html, 'text/html');

    parsed.querySelectorAll<HTMLElement>('[src], link[href]').forEach((element) => {
      const value = element.getAttribute('src') || element.getAttribute('href');
      if (!value) return;
      const resolved = toAbsoluteUrl(value, baseUrl);
      if (resolved) urls.add(resolved);
    });

    urls.add(new URL('cream-theme.css?v=20260903-stage-load-5', baseUrl).href);

    // The legacy loader owns the authoritative asset list. Reading its paths
    // avoids a second hand-maintained manifest drifting away from glmain.
    const runtimeAssetPattern = /["'](assets\/(?:image|shader)\/[^"']+\.(?:avif|gif|jpe?g|png|svg|webp|js))["']/gi;
    for (const match of runtime.matchAll(runtimeAssetPattern)) {
      const path = match[1];
      if (!path || EXCLUDED_RUNTIME_ASSETS.has(path)) continue;
      urls.add(new URL(path, baseUrl).href);
    }

    const stylesheetUrls = [...urls].filter((url) => /\.css(?:\?|$)/i.test(url));
    const stylesheetResults = await Promise.allSettled(
      stylesheetUrls.map(async (stylesheetUrl) => ({
        stylesheetUrl,
        css: await fetchText(stylesheetUrl, priority),
      })),
    );
    stylesheetResults.forEach((result) => {
      if (result.status !== 'fulfilled') return;
      extractCssUrls(result.value.css, result.value.stylesheetUrl).forEach((url) => urls.add(url));
    });

    ENTRY_IMAGE_URLS.forEach((url) => urls.add(url));
    return [...urls];
  })();

  return manifestPromise;
};

const runPool = async <T>(items: T[], concurrency: number, task: (item: T) => Promise<void>) => {
  let cursor = 0;
  const workers = Array.from({length: Math.min(concurrency, items.length)}, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await task(items[index]);
    }
  });
  await Promise.all(workers);
};

const decodeEntryImage = (url: string, priority: FetchPriority = 'high') =>
  new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.alt = '';
    image.decoding = 'async';
    image.loading = 'eager';
    image.setAttribute('fetchpriority', priority);

    let settled = false;
    let decodeStarted = false;
    const timeout = window.setTimeout(() => {
      fail(new Error(`Imaginea entry nu s-a incarcat/decodat in timp util: ${url}`));
    }, ENTRY_IMAGE_TIMEOUT_MS);

    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      retainedEntryImages.push(image);
      resolve();
    };

    function fail(error: Error) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      reject(error);
    }

    const decodeLoadedImage = () => {
      if (settled || decodeStarted) return;
      decodeStarted = true;
      if (typeof image.decode !== 'function') {
        finish();
        return;
      }
      void image.decode().then(finish).catch((error: unknown) => {
        const reason = error instanceof Error ? ` ${error.message}` : '';
        fail(new Error(`Imaginea entry nu a putut fi decodata: ${url}.${reason}`));
      });
    };

    image.addEventListener('load', decodeLoadedImage, {once: true});
    image.addEventListener('error', () => {
      fail(new Error(`Imaginea entry nu a putut fi incarcata: ${url}`));
    }, {once: true});
    image.src = url;
    if (image.complete && image.naturalWidth > 0) {
      decodeLoadedImage();
    }
  });

const performWarmup = async () => {
  updateWarmupState({phase: 'running'});
  const network = getNetworkProfile();
  installManagedPrerender(network.slow);

  const urls = await buildManifest(network.priority);
  let completed = 0;
  const failures: string[] = [];
  const concurrency = network.concurrency;

  // Navigarea trebuie sa astepte doar documentul, runtime-ul, stilurile,
  // fonturile, shader-ele si imaginile primului cadru. Texturile etapelor
  // 2-7 sunt incalzite separat, la prioritate joasa, fara sa blocheze 1/7.
  const entryUrls = urls.filter((url) => {
    if (ENTRY_IMAGE_URLS.has(url)) return true;
    const pathname = new URL(url).pathname;
    return /\.(?:css|js|json|woff2?|ttf|otf)$/i.test(pathname);
  });
  const deferredUrls = urls.filter((url) => !entryUrls.includes(url));

  const fetchAndRecord = async (
    url: string,
    priority: FetchPriority,
    required = false,
  ) => {
    try {
      await fetchResource(
        url,
        priority,
        required ? MAX_CRITICAL_FETCH_ATTEMPTS : 1,
      );
    } catch (error) {
      failures.push(url);
      if (required) throw error;
    } finally {
      completed += 1;
      if (completed === urls.length || completed % 16 === 0) {
        updateWarmupState({phase: 'running', completed, total: urls.length});
      }
    }
  };

  await runPool(entryUrls, concurrency, (url) =>
    fetchAndRecord(url, network.priority, true),
  );

  await runPool([...ENTRY_IMAGE_URLS], network.slow ? 1 : 2, (url) =>
    decodeEntryImage(url, network.priority),
  );
  updateWarmupState({phase: 'entry-ready', completed, total: urls.length});

  // Lasam promisiunea principala sa se rezolve acum. Urmatoarele etape raman
  // in acelasi HTTP cache, dar nu mai tin butonul Exploreaza in asteptare.
  const warmDeferred = () => {
    void runPool(deferredUrls, Math.min(concurrency, 2), (url) => fetchAndRecord(url, 'low'))
      .then(() => {
        if (failures.length > 0) {
          console.warn('[GREENTECH Charity] Unele resurse brandbook nu au putut fi pregatite.', failures);
        }
        updateWarmupState({phase: 'ready', completed, total: urls.length});
      });
  };

  // Nu concuram cu navigarea care urmeaza imediat dupa entry-ready. Daca
  // vizitatorul ramane pe prima scena, browserul incalzeste restul in idle;
  // dupa navigare, pagina brandbook devine proprietarul incarcarii progresive.
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(warmDeferred, {timeout: 2500});
  } else {
    globalThis.setTimeout(warmDeferred, 1800);
  }
};

export const startBrandbookWarmup = () => {
  if (!warmupPromise) {
    warmupPromise = performWarmup().catch((error) => {
      console.error('[GREENTECH Charity] Preincarcarea brandbook a esuat.', error);
      updateWarmupState({phase: 'failed'});
      throw error;
    });
  }
  return warmupPromise;
};

export const waitForBrandbookWarmup = () => startBrandbookWarmup();
