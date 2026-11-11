type ContentRecord = Record<string, unknown>;

type MainContentController = {
  apply: (root?: ParentNode, content?: ContentRecord) => void;
  syncMetadata: (source: Document) => void;
};

declare global {
  interface Window {
    GREENTECH_CHARITY_CONTENT?: ContentRecord;
    GREENTECH_CHARITY_CONTENT_VERSION?: string;
    GreentechMainContent?: MainContentController;
    GreentechMainContentReady?: Promise<ContentRecord>;
  }
}

const CONTENT_VERSION = String(window.GREENTECH_CHARITY_CONTENT_VERSION || '');
const CONTENT_URL = `/brandbook-section/content.json${CONTENT_VERSION ? `?v=${encodeURIComponent(CONTENT_VERSION)}` : ''}`;
const CONTENT_SESSION_KEY = 'greentech-charity:content:v1';
const ALLOWED_RICH_TEXT_ELEMENTS = new Set(['BR', 'EM', 'SPAN', 'STRONG']);

const readPath = (source: unknown, path: string) =>
  String(path || '').split('.').reduce<unknown>((value, key) => {
    if (!value || typeof value !== 'object') return undefined;
    return (value as ContentRecord)[key];
  }, source);

const selectBoundElements = (root: ParentNode, selector: string) => {
  const elements = Array.from(root.querySelectorAll<HTMLElement>(selector));
  if (root instanceof HTMLElement && root.matches(selector)) elements.unshift(root);
  return elements;
};

const sanitiseRichHtml = (value: unknown) => {
  const template = document.createElement('template');
  template.innerHTML = String(value ?? '');

  template.content.querySelectorAll('*').forEach((element) => {
    if (!ALLOWED_RICH_TEXT_ELEMENTS.has(element.tagName)) {
      element.replaceWith(document.createTextNode(element.textContent || ''));
      return;
    }
    Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name));
  });

  return template.innerHTML;
};

const applyDirectText = (element: HTMLElement, value: unknown) => {
  const existing = Array.from(element.childNodes).find(
    (node) => node.nodeType === Node.TEXT_NODE && node.nodeValue?.trim(),
  );
  if (existing) {
    existing.nodeValue = String(value ?? '');
    return;
  }
  element.insertBefore(document.createTextNode(String(value ?? '')), element.firstChild);
};

const applyPoiTitles = (element: HTMLElement, value: unknown) => {
  if (!Array.isArray(value)) return;

  try {
    const points = JSON.parse(decodeURIComponent(element.dataset.poi || '[]')) as Array<ContentRecord>;
    points.forEach((point, index) => {
      point.title = typeof value[index] === 'string' ? value[index] : '';
    });
    // StageController decodes this payload with decodeURI, so preserve URI
    // separators while encoding the JSON delimiters.
    element.dataset.poi = encodeURI(JSON.stringify(points));
  } catch (error) {
    console.error('[GREENTECH Charity] Datele punctelor 3D nu au putut fi pregatite.', error);
  }
};

export const applyMainContent = (
  root: ParentNode = document,
  content: ContentRecord = window.GREENTECH_CHARITY_CONTENT || {},
) => {
  selectBoundElements(root, '[data-gc-content]').forEach((element) => {
    const value = readPath(content, element.dataset.gcContent || '');
    if (value != null) element.textContent = String(value);
  });

  selectBoundElements(root, '[data-gc-content-html]').forEach((element) => {
    const value = readPath(content, element.dataset.gcContentHtml || '');
    if (value != null) element.innerHTML = sanitiseRichHtml(value);
  });

  selectBoundElements(root, '[data-gc-content-direct]').forEach((element) => {
    const value = readPath(content, element.dataset.gcContentDirect || '');
    if (value != null) applyDirectText(element, value);
  });

  selectBoundElements(root, '[data-gc-content-meta]').forEach((element) => {
    const value = readPath(content, element.dataset.gcContentMeta || '');
    if (value != null) element.setAttribute('content', String(value));
  });

  selectBoundElements(root, '[data-gc-content-aria]').forEach((element) => {
    const value = readPath(content, element.dataset.gcContentAria || '');
    if (value != null) element.setAttribute('aria-label', String(value));
  });

  selectBoundElements(root, '[data-gc-content-alt]').forEach((element) => {
    const value = readPath(content, element.dataset.gcContentAlt || '');
    if (value != null) element.setAttribute('alt', String(value));
  });

  selectBoundElements(root, '[data-gc-content-email-href]').forEach((element) => {
    const value = readPath(content, element.dataset.gcContentEmailHref || '');
    if (value != null) element.setAttribute('href', `mailto:${String(value)}`);
  });

  selectBoundElements(root, '[data-gc-content-poi-titles]').forEach((element) => {
    const value = readPath(content, element.dataset.gcContentPoiTitles || '');
    applyPoiTitles(element, value);
  });
};

export const syncMainMetadata = (source: Document) => {
  const language = source.documentElement.getAttribute('lang');
  if (language === null) document.documentElement.removeAttribute('lang');
  else document.documentElement.setAttribute('lang', language);

  const selectors = [
    'title',
    'meta[name="description"]',
    'meta[name="robots"]',
    'meta[property^="og:"]',
    'meta[name^="twitter:"]',
    'link[rel="canonical"]',
    'script[type="application/ld+json"]',
  ];
  selectors.forEach((selector) => {
    const replacements = Array.from(source.querySelectorAll(selector), (element) =>
      element.cloneNode(true),
    );
    document.querySelectorAll(selector).forEach((element) => element.remove());
    replacements.forEach((element) => document.head.appendChild(element));
  });
};

const controller: MainContentController = {
  apply: applyMainContent,
  syncMetadata: syncMainMetadata,
};

window.GreentechMainContent = controller;

const isContentRecord = (value: unknown): value is ContentRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const readSessionContent = () => {
  try {
    const stored = window.sessionStorage.getItem(CONTENT_SESSION_KEY);
    if (!stored) return undefined;
    const parsed: unknown = JSON.parse(stored);
    return isContentRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const storeSessionContent = (content: ContentRecord) => {
  try {
    window.sessionStorage.setItem(CONTENT_SESSION_KEY, JSON.stringify(content));
  } catch {
    // Continutul ramane disponibil in memoria documentului si in HTTP cache.
  }
};

const inlineContent = isContentRecord(window.GREENTECH_CHARITY_CONTENT)
  ? window.GREENTECH_CHARITY_CONTENT
  : undefined;
const initialContent = inlineContent || readSessionContent();

if (initialContent) {
  window.GREENTECH_CHARITY_CONTENT = initialContent;
  applyMainContent(document, initialContent);
  document.documentElement.dataset.gcContentReady = 'snapshot';
  storeSessionContent(initialContent);
}

const remoteContent = inlineContent
  ? Promise.resolve(inlineContent)
  : fetch(CONTENT_URL, {cache: 'force-cache', credentials: 'same-origin'})
      .then((response) => {
        if (!response.ok) throw new Error(`content-http-${response.status}`);
        return response.json() as Promise<ContentRecord>;
      })
      .then((content) => {
        if (!isContentRecord(content)) throw new Error('content-schema-invalid');
        window.GREENTECH_CHARITY_CONTENT = content;
        applyMainContent(document, content);
        document.documentElement.dataset.gcContentReady = 'true';
        storeSessionContent(content);
        return content;
      });

export const mainContentReady: Promise<ContentRecord> = initialContent
  ? Promise.resolve(initialContent)
  : remoteContent.catch((error) => {
    console.error('[GREENTECH Charity] content.json nu a putut fi incarcat.', error);
    document.documentElement.dataset.gcContentReady = 'fallback';
    return {} as ContentRecord;
  });

if (initialContent && !inlineContent) {
  void remoteContent.catch((error) => {
    console.warn('[GREENTECH Charity] Revalidarea content.json va fi reluata la urmatoarea accesare.', error);
  });
}

window.GreentechMainContentReady = mainContentReady;

export {};
