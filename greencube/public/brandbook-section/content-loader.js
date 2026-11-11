(function () {
  'use strict';

  const scriptUrl = document.currentScript?.src || window.location.href;
  const contentLocation = new URL('content.json', scriptUrl);
  const contentVersion = String(window.GREENTECH_CHARITY_CONTENT_VERSION || '');
  if (contentVersion) contentLocation.searchParams.set('v', contentVersion);
  const contentUrl = contentLocation.href;
  const contentSessionKey = 'greentech-charity:content:v1';
  const requestTimeoutMs = 30000;
  const maximumAttempts = 2;

  function readPath(source, path) {
    return String(path || '').split('.').reduce(function (value, key) {
      return value == null ? undefined : value[key];
    }, source);
  }

  function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function applyDirectText(element, value) {
    const textNode = Array.from(element.childNodes).find(function (node) {
      return node.nodeType === Node.TEXT_NODE && node.nodeValue.trim();
    });
    if (textNode) textNode.nodeValue = String(value);
    else {
      const inserted = document.createTextNode(String(value));
      if (element.dataset.bbContentDirectPosition === 'after-first' && element.firstChild) {
        element.firstChild.after(inserted);
      } else {
        element.insertBefore(inserted, element.firstChild);
      }
    }
  }

  function applyPrefixText(element, value) {
    const textNode = Array.from(element.childNodes).find(function (node) {
      return node.nodeType === Node.TEXT_NODE && node.nodeValue.trim();
    });
    if (textNode) textNode.nodeValue = String(value);
    else element.insertBefore(document.createTextNode(String(value)), element.firstChild);
  }

  function sanitiseRichHtml(value) {
    const allowed = new Set(['BR', 'STRONG', 'EM', 'SPAN']);
    const template = document.createElement('template');
    template.innerHTML = String(value);
    Array.from(template.content.querySelectorAll('*')).forEach(function (element) {
      if (!allowed.has(element.tagName)) {
        element.replaceWith(document.createTextNode(element.textContent || ''));
        return;
      }
      Array.from(element.attributes).forEach(function (attribute) {
        element.removeAttribute(attribute.name);
      });
    });
    return template.innerHTML;
  }

  function applyTrailingHtml(element, value) {
    const preserved = element.firstElementChild;
    let node = preserved ? preserved.nextSibling : element.firstChild;
    while (node) {
      const next = node.nextSibling;
      node.remove();
      node = next;
    }
    const template = document.createElement('template');
    template.innerHTML = sanitiseRichHtml(value);
    element.appendChild(template.content);
  }

  function applyContent(content) {
    if (!isRecord(content) || ![content.navigation, content.steps, content.footer, content.modals, content.runtime].every(isRecord)) {
      throw new Error('content-schema-invalid');
    }
    window.GREENTECH_CHARITY_CONTENT = content;

    const pageName = document.body?.dataset.bbContentPage;
    const pageCopy = pageName === 'brandbook' ? content.page : content[pageName]?.page;
    if (pageCopy) {
      if (pageCopy.title) document.title = pageCopy.title;
      const description = document.querySelector('meta[name="description"]');
      if (description && pageCopy.description) {
        description.setAttribute('content', pageCopy.description);
      }
    }

    document.querySelectorAll('[data-bb-content]').forEach(function (element) {
      const value = readPath(content, element.dataset.bbContent);
      if (value != null) element.textContent = String(value);
    });

    document.querySelectorAll('[data-bb-content-html]').forEach(function (element) {
      const value = readPath(content, element.dataset.bbContentHtml);
      if (value != null) element.innerHTML = sanitiseRichHtml(value);
    });

    document.querySelectorAll('[data-bb-content-direct]').forEach(function (element) {
      const value = readPath(content, element.dataset.bbContentDirect);
      if (value != null) applyDirectText(element, value);
    });

    document.querySelectorAll('[data-bb-content-prefix]').forEach(function (element) {
      const value = readPath(content, element.dataset.bbContentPrefix);
      if (value != null) applyPrefixText(element, value);
    });

    document.querySelectorAll('[data-bb-content-tail-html]').forEach(function (element) {
      const value = readPath(content, element.dataset.bbContentTailHtml);
      if (value != null) applyTrailingHtml(element, value);
    });

    document.querySelectorAll('[data-bb-content-meta]').forEach(function (element) {
      const value = readPath(content, element.dataset.bbContentMeta);
      if (value != null) element.setAttribute('content', String(value));
    });

    document.querySelectorAll('[data-bb-content-aria]').forEach(function (element) {
      const value = readPath(content, element.dataset.bbContentAria);
      if (value != null) element.setAttribute('aria-label', String(value));
    });

    document.querySelectorAll('[data-bb-content-alt]').forEach(function (element) {
      const value = readPath(content, element.dataset.bbContentAlt);
      if (value != null) element.setAttribute('alt', String(value));
    });

    document.documentElement.dataset.bbContentReady = 'true';
    window.dispatchEvent(new CustomEvent('greentech-content-ready', {detail: content}));
    return content;
  }

  function readInitialContent() {
    if (isRecord(window.GREENTECH_CHARITY_CONTENT)) return window.GREENTECH_CHARITY_CONTENT;

    try {
      if (window.parent !== window && isRecord(window.parent.GREENTECH_CHARITY_CONTENT)) {
        return window.parent.GREENTECH_CHARITY_CONTENT;
      }
    } catch (_) {
      // Un parinte cross-origin nu poate furniza snapshot-ul, continuam local.
    }

    try {
      const stored = window.sessionStorage.getItem(contentSessionKey);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      return isRecord(parsed) ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function storeContent(content) {
    try {
      window.sessionStorage.setItem(contentSessionKey, JSON.stringify(content));
    } catch (_) {
      // Snapshot-ul inline si HTTP cache-ul raman disponibile.
    }
  }

  function fetchAttempt() {
    const controller = new AbortController();
    const timeout = window.setTimeout(function () {
      controller.abort();
    }, requestTimeoutMs);

    return fetch(contentUrl, {
      cache: 'force-cache',
      credentials: 'same-origin',
      priority: 'high',
      signal: controller.signal
    }).then(function (response) {
      if (!response.ok) throw new Error('content-http-' + response.status);
      return response.json();
    }).finally(function () {
      window.clearTimeout(timeout);
    });
  }

  function fetchWithRetry() {
    let attempt = 0;
    function run() {
      attempt += 1;
      return fetchAttempt().catch(function (error) {
        if (attempt >= maximumAttempts) throw error;
        return new Promise(function (resolve) {
          window.setTimeout(resolve, 650 * attempt);
        }).then(run);
      });
    }
    return run();
  }

  const inlineContent = isRecord(window.GREENTECH_CHARITY_CONTENT)
    ? window.GREENTECH_CHARITY_CONTENT
    : null;
  const initialContent = inlineContent || readInitialContent();
  if (initialContent) {
    applyContent(initialContent);
    storeContent(initialContent);
  }

  const remoteContent = inlineContent
    ? Promise.resolve(inlineContent)
    : fetchWithRetry().then(function (content) {
        const applied = applyContent(content);
        storeContent(applied);
        return applied;
      });

  window.GreentechCharityContentReady = initialContent
    ? Promise.resolve(initialContent)
    : remoteContent.catch(function (error) {
        console.error('[GREENTECH Charity] content.json nu a putut fi incarcat dupa reincercare.', error);
        document.documentElement.dataset.bbContentReady = 'fallback';
        return window.GREENTECH_CHARITY_CONTENT || {};
      });

  if (initialContent && !inlineContent) {
    remoteContent.catch(function (error) {
      console.warn('[GREENTECH Charity] Revalidarea content.json va fi reluata la urmatoarea accesare.', error);
    });
  }
})();
