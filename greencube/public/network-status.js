(function () {
  'use strict';

  if (window.__GREENTECH_NETWORK_STATUS_INSTALLED__) return;
  window.__GREENTECH_NETWORK_STATUS_INSTALLED__ = true;

  var currentState = '';
  var notice;
  var message;

  function ensureNotice() {
    if (notice && notice.isConnected) return notice;

    var style = document.createElement('style');
    style.textContent = [
      '.gc-network-notice{position:fixed;z-index:2147483000;left:max(14px,env(safe-area-inset-left));bottom:max(14px,env(safe-area-inset-bottom));display:flex;align-items:center;gap:9px;box-sizing:border-box;width:max-content;max-width:calc(100vw - 28px);padding:9px 14px 9px 10px;border:1px solid rgba(247,244,232,.22);border-radius:999px;color:#f7f4e8;background:rgba(20,54,35,.96);box-shadow:0 10px 32px rgba(8,32,20,.18);font-family:Helvetica,"Helvetica Neue",Arial,sans-serif;font-size:13px;font-weight:500;line-height:1.25;letter-spacing:.005em;opacity:0;visibility:hidden;transform:translate3d(0,7px,0);transition:opacity .24s linear,transform .38s cubic-bezier(.22,1,.36,1),visibility 0s linear .38s;pointer-events:none;-webkit-font-smoothing:antialiased}',
      '.gc-network-notice.is-visible{opacity:1;visibility:visible;transform:none;transition-delay:0s;pointer-events:auto}',
      '.gc-network-notice__icon{display:block;flex:0 0 auto;width:25px;height:25px;object-fit:contain;filter:invert(1);opacity:.92}',
      '.gc-network-notice__message{margin:0;white-space:nowrap}',
      '@media(max-width:700px){.gc-network-notice{left:12px;bottom:auto;top:max(96px,calc(env(safe-area-inset-top) + 80px));max-width:calc(100vw - 24px);padding:8px 13px 8px 9px;font-size:12px}.gc-network-notice__icon{width:23px;height:23px}.gc-network-notice__message{white-space:normal}}',
      'body[data-bb-content-page="brandbook"] .gc-network-notice{top:max(14px,env(safe-area-inset-top));bottom:auto}',
      '@media(prefers-reduced-motion:reduce){.gc-network-notice{transition:opacity .15s linear,visibility 0s linear .15s;transform:none}.gc-network-notice.is-visible{transition-delay:0s}}'
    ].join('');
    document.head.appendChild(style);

    notice = document.createElement('aside');
    notice.className = 'gc-network-notice';
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    notice.setAttribute('aria-atomic', 'true');
    notice.innerHTML =
      '<img class="gc-network-notice__icon" src="/no-wifi.png" alt="" aria-hidden="true">' +
      '<p class="gc-network-notice__message"></p>';
    message = notice.querySelector('.gc-network-notice__message');
    document.body.appendChild(notice);
    return notice;
  }

  function showOffline() {
    if (currentState === 'offline') return;
    currentState = 'offline';
    var element = ensureNotice();
    element.dataset.state = 'offline';
    message.textContent = 'Fara conexiune la internet';
    element.classList.add('is-visible');
  }

  function hideNotice() {
    currentState = '';
    notice && notice.classList.remove('is-visible');
  }

  function evaluateConnection() {
    if (!navigator.onLine) {
      showOffline();
      return;
    }
    hideNotice();
  }

  window.addEventListener('offline', evaluateConnection);
  window.addEventListener('online', evaluateConnection);

  evaluateConnection();
})();
