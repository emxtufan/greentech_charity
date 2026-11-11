(() => {
  'use strict';

  const VALID_STATUSES = ['noua', 'in_lucru', 'contactata', 'finalizata', 'spam'];

  const TYPE_META = {
    donation: { label: 'Donatie', plural: 'Donatii', mark: 'D' },
    volunteer: { label: 'Voluntariat', plural: 'Voluntariat', mark: 'V' },
    partner: { label: 'Parteneriat', plural: 'Parteneriate', mark: 'P' },
    contact: { label: 'Mesaj', plural: 'Mesaje', mark: 'M' },
    newsletter: { label: 'Newsletter', plural: 'Newsletter', mark: 'N' }
  };

  const STATUS_LABELS = {
    noua: 'Noua',
    in_lucru: 'In lucru',
    contactata: 'Contactata',
    finalizata: 'Finalizata',
    spam: 'Spam'
  };

  const FIELD_LABELS = {
    name: 'Nume',
    full_name: 'Nume',
    first_name: 'Prenume',
    last_name: 'Nume',
    email: 'Email',
    phone: 'Telefon',
    telephone: 'Telefon',
    organization: 'Organizatie',
    registration: 'CUI / CIF',
    company: 'Companie',
    role: 'Rol',
    city: 'Localitate',
    county: 'Judet',
    country: 'Tara',
    subject: 'Subiect',
    message: 'Mesaj',
    motivation: 'Motivatie',
    contribution: 'Contributie propusa',
    expertise: 'Expertiza',
    skills: 'Competente',
    availability: 'Disponibilitate',
    amount: 'Suma',
    currency: 'Moneda',
    frequency: 'Frecventa',
    project: 'Proiect',
    project_context: 'Initiativa asociata',
    support: 'Tip de sprijin',
    interest: 'Interes newsletter',
    interests: 'Interese',
    preferred_contact: 'Contact preferat',
    consent: 'Acord prelucrare date',
    consent_at: 'Acord inregistrat la',
    consent_version: 'Versiune acord',
    source_page: 'Pagina sursa',
    newsletter: 'Abonare newsletter'
  };

  const state = {
    config: null,
    admin: null,
    items: [],
    stats: {},
    selectedId: null,
    lastFocused: null,
    drawerCloseTimer: null,
    query: '',
    type: '',
    status: ''
  };

  const dom = {};

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    cacheDom();
    bindEvents();

    try {
      state.config = await loadConfig();
    } catch (error) {
      showLoginError('Configurarea nu a putut fi incarcata. Reincearca in cateva momente.');
      console.error('[admin] Config error:', error);
      return;
    }

    if (!state.config.configured) {
      dom.setupNotice.hidden = false;
      dom.loginSubmit.disabled = true;
      return;
    }

    try {
      const response = await requestAdmin();
      if (response.status === 401) {
        showAuth();
        return;
      }

      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload.message || payload.error || `Request failed (${response.status})`);

      state.admin = payload.admin && typeof payload.admin === 'object' ? payload.admin : null;
      showDashboard();
      applyRequestsPayload(payload);
    } catch (error) {
      showLoginError('Administrarea nu a putut fi incarcata. Reincearca in cateva momente.');
      console.error('[admin] Session check error:', error);
    }
  }

  function cacheDom() {
    const ids = [
      'auth-view', 'dashboard-view', 'login-form', 'login-username', 'login-password',
      'toggle-password', 'login-error', 'login-submit', 'setup-notice', 'refresh-button',
      'logout-button', 'stat-total', 'stat-new', 'stat-progress', 'stat-done',
      'results-count', 'filters-form', 'search-input', 'type-filter', 'status-filter',
      'requests-loading', 'requests-error', 'retry-button', 'empty-state', 'requests-list',
      'drawer-layer', 'drawer-backdrop', 'request-drawer', 'drawer-close', 'drawer-kicker',
      'drawer-title', 'drawer-type', 'drawer-date', 'drawer-details', 'request-form',
      'drawer-id', 'drawer-status', 'drawer-notes', 'save-message', 'save-button',
      'toast-region'
    ];

    ids.forEach((id) => {
      const key = id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      dom[key] = document.getElementById(id);
    });
  }

  function bindEvents() {
    dom.loginForm.addEventListener('submit', handleLogin);
    dom.togglePassword.addEventListener('click', togglePasswordVisibility);
    dom.logoutButton.addEventListener('click', () => logout(true));
    dom.refreshButton.addEventListener('click', loadRequests);
    dom.retryButton.addEventListener('click', loadRequests);
    dom.filtersForm.addEventListener('submit', (event) => event.preventDefault());
    dom.searchInput.addEventListener('input', () => {
      state.query = dom.searchInput.value.trim().toLocaleLowerCase('ro-RO');
      renderRequests();
    });
    dom.typeFilter.addEventListener('change', () => {
      state.type = dom.typeFilter.value;
      renderRequests();
    });
    dom.statusFilter.addEventListener('change', () => {
      state.status = dom.statusFilter.value;
      renderRequests();
    });
    dom.requestsList.addEventListener('click', handleRequestClick);
    dom.drawerBackdrop.addEventListener('click', closeDrawer);
    dom.drawerClose.addEventListener('click', closeDrawer);
    dom.requestForm.addEventListener('submit', saveRequest);
    document.addEventListener('keydown', handleGlobalKeydown);
  }

  async function loadConfig() {
    const response = await fetch('/api/admin?config=1', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) throw new Error(`Config request failed (${response.status})`);
    return response.json();
  }

  async function handleLogin(event) {
    event.preventDefault();
    hideLoginError();

    if (!dom.loginForm.checkValidity()) {
      dom.loginForm.reportValidity();
      return;
    }

    const username = dom.loginUsername.value.trim();
    const password = dom.loginPassword.value;
    setButtonBusy(dom.loginSubmit, true, 'Se autentifica...');

    try {
      const response = await requestAdmin({
        method: 'POST',
        body: JSON.stringify({ action: 'login', username, password })
      });
      const payload = await readJson(response);

      if (!response.ok || !payload.admin) {
        throw new Error(payload.message || payload.error || 'Date de autentificare incorecte.');
      }

      state.admin = payload.admin;
      dom.loginPassword.value = '';
      showDashboard();
      await loadRequests();
    } catch (error) {
      showLoginError(humanizeAuthError(error));
    } finally {
      setButtonBusy(dom.loginSubmit, false);
    }
  }

  function togglePasswordVisibility() {
    const show = dom.loginPassword.type === 'password';
    dom.loginPassword.type = show ? 'text' : 'password';
    dom.togglePassword.setAttribute('aria-pressed', String(show));
    dom.togglePassword.setAttribute('aria-label', show ? 'Ascunde parola' : 'Afiseaza parola');
    dom.loginPassword.focus();
  }

  function showAuth() {
    dom.dashboardView.hidden = true;
    dom.authView.hidden = false;
    dom.loginUsername.focus({ preventScroll: true });
  }

  function showDashboard() {
    hideLoginError();
    dom.authView.hidden = true;
    dom.dashboardView.hidden = false;
  }

  function showLoginError(message) {
    dom.loginError.textContent = message;
    dom.loginError.hidden = false;
  }

  function hideLoginError() {
    dom.loginError.hidden = true;
    dom.loginError.textContent = '';
  }

  async function logout(showMessage) {
    try {
      await requestAdmin({
        method: 'POST',
        body: JSON.stringify({ action: 'logout' })
      });
    } catch (error) {
      console.warn('[admin] Logout request failed:', error);
    }

    closeDrawer(false);
    state.admin = null;
    state.items = [];
    state.stats = {};
    showAuth();
    if (showMessage) showToast('Ai iesit in siguranta din administrare.');
  }

  async function requestAdmin(options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');
    if (options.body) headers.set('Content-Type', 'application/json');

    return fetch('/api/admin', {
      ...options,
      credentials: 'same-origin',
      cache: 'no-store',
      headers
    });
  }

  async function apiFetch(options = {}) {
    const response = await requestAdmin(options);
    if (response.status === 401) {
      closeDrawer(false);
      state.admin = null;
      state.items = [];
      state.stats = {};
      showAuth();
      showLoginError('Sesiunea a expirat. Autentifica-te din nou.');
      const error = new Error('Sesiunea a expirat.');
      error.name = 'AuthRequiredError';
      throw error;
    }

    return response;
  }

  async function loadRequests() {
    setRequestsState('loading');
    setButtonBusy(dom.refreshButton, true, 'Actualizare...');

    try {
      const response = await apiFetch();
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload.message || payload.error || `Request failed (${response.status})`);

      applyRequestsPayload(payload);
    } catch (error) {
      if (error.name !== 'AuthRequiredError') setRequestsState('error');
      console.error('[admin] Requests error:', error);
    } finally {
      setButtonBusy(dom.refreshButton, false);
    }
  }

  function applyRequestsPayload(payload) {
    state.admin = payload.admin && typeof payload.admin === 'object' ? payload.admin : state.admin;
    state.items = Array.isArray(payload.items) ? payload.items : [];
    state.stats = payload.stats && typeof payload.stats === 'object' ? payload.stats : {};
    renderStats();
    renderRequests();
  }

  function renderStats() {
    const derived = countStatuses(state.items);
    const statuses = state.stats.by_status || state.stats.statuses || {};
    const total = readStat(['total', 'count'], state.items.length);
    const fresh = readStat(['noua', 'new'], statuses.noua ?? derived.noua);
    const progress = readStat(['in_lucru', 'inProgress'], statuses.in_lucru ?? derived.in_lucru);
    const done = readStat(['finalizata', 'completed'], statuses.finalizata ?? derived.finalizata);

    dom.statTotal.textContent = formatCount(total);
    dom.statNew.textContent = formatCount(fresh);
    dom.statProgress.textContent = formatCount(progress);
    dom.statDone.textContent = formatCount(done);
  }

  function readStat(keys, fallback) {
    for (const key of keys) {
      const value = Number(state.stats[key]);
      if (Number.isFinite(value)) return value;
    }
    const fallbackNumber = Number(fallback);
    return Number.isFinite(fallbackNumber) ? fallbackNumber : 0;
  }

  function countStatuses(items) {
    return items.reduce((counts, item) => {
      const status = normalizeStatus(item.status);
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, { noua: 0, in_lucru: 0, contactata: 0, finalizata: 0, spam: 0 });
  }

  function renderRequests() {
    const items = getFilteredItems();
    dom.resultsCount.textContent = `${items.length} ${items.length === 1 ? 'rezultat' : 'rezultate'}`;
    dom.requestsList.replaceChildren();

    if (!items.length) {
      setRequestsState('empty');
      return;
    }

    const fragment = document.createDocumentFragment();
    items.forEach((item) => fragment.append(createRequestRow(item)));
    dom.requestsList.append(fragment);
    setRequestsState('list');
  }

  function getFilteredItems() {
    return state.items
      .filter((item) => !state.type || getType(item) === state.type)
      .filter((item) => !state.status || normalizeStatus(item.status) === state.status)
      .filter((item) => !state.query || searchableText(item).includes(state.query))
      .slice()
      .sort((a, b) => getTimestamp(b) - getTimestamp(a));
  }

  function createRequestRow(item) {
    const type = getType(item);
    const typeMeta = TYPE_META[type] || { label: 'Cerere', plural: 'Cereri', mark: 'C' };
    const identity = getIdentity(item);
    const status = normalizeStatus(item.status);
    const button = createElement('button', 'request-row');
    button.type = 'button';
    button.dataset.requestId = String(item.id ?? '');
    button.setAttribute('aria-label', `Deschide ${typeMeta.label.toLocaleLowerCase('ro-RO')} de la ${identity.name}`);

    const identityWrap = createElement('span', 'request-row__identity');
    const icon = createElement('span', 'request-row__icon', typeMeta.mark);
    icon.setAttribute('aria-hidden', 'true');
    const identityCopy = createElement('span');
    identityCopy.append(
      createElement('strong', 'request-row__name', identity.name),
      createElement('span', 'request-row__email', identity.email || identity.phone || 'Fara date de contact')
    );
    identityWrap.append(icon, identityCopy);

    const kind = createElement('span', 'request-row__kind');
    kind.append(
      createElement('strong', '', typeMeta.label),
      createElement('span', 'request-row__preview', getPreview(item))
    );

    const statusWrap = createElement('span', 'request-row__status');
    statusWrap.append(createStatusBadge(status));

    const date = createElement('time', 'request-row__date', formatDate(getDateValue(item), 'short'));
    if (getDateValue(item)) date.dateTime = String(getDateValue(item));

    const arrow = createElement('span', 'request-row__arrow', '→');
    arrow.setAttribute('aria-hidden', 'true');
    button.append(identityWrap, kind, statusWrap, date, arrow);
    return button;
  }

  function handleRequestClick(event) {
    const button = event.target.closest('[data-request-id]');
    if (!button) return;
    const item = state.items.find((candidate) => String(candidate.id) === button.dataset.requestId);
    if (item) openDrawer(item, button);
  }

  function openDrawer(item, trigger) {
    clearTimeout(state.drawerCloseTimer);
    state.selectedId = String(item.id);
    state.lastFocused = trigger || document.activeElement;
    populateDrawer(item);
    dom.drawerLayer.hidden = false;
    document.body.classList.add('drawer-open');
    requestAnimationFrame(() => {
      dom.drawerLayer.classList.add('is-open');
      dom.requestDrawer.focus({ preventScroll: true });
    });
  }

  function closeDrawer(restoreFocus = true) {
    if (dom.drawerLayer.hidden) return;
    dom.drawerLayer.classList.remove('is-open');
    document.body.classList.remove('drawer-open');
    state.selectedId = null;
    state.drawerCloseTimer = window.setTimeout(() => {
      dom.drawerLayer.hidden = true;
      if (restoreFocus && state.lastFocused instanceof HTMLElement) state.lastFocused.focus({ preventScroll: true });
      state.lastFocused = null;
    }, 370);
  }

  function populateDrawer(item) {
    const type = getType(item);
    const typeMeta = TYPE_META[type] || { label: 'Cerere' };
    const identity = getIdentity(item);
    const data = getCombinedData(item);

    dom.drawerKicker.textContent = typeMeta.label;
    dom.drawerTitle.textContent = identity.name;
    dom.drawerType.textContent = typeMeta.label;
    dom.drawerDate.textContent = formatDate(getDateValue(item), 'long');
    dom.drawerId.value = String(item.id ?? '');
    dom.drawerStatus.value = normalizeStatus(item.status);
    dom.drawerNotes.value = typeof item.notes === 'string' ? item.notes : '';
    dom.saveMessage.hidden = true;
    dom.saveMessage.textContent = '';
    dom.drawerDetails.replaceChildren();

    const detailEntries = buildDetailEntries(data);
    const fragment = document.createDocumentFragment();
    detailEntries.forEach(({ key, label, value, wide }) => {
      const wrapper = createElement('div', `drawer-detail${wide ? ' drawer-detail--wide' : ''}`);
      const term = createElement('dt', '', label);
      const definition = createElement('dd');
      appendDetailValue(definition, key, value);
      wrapper.append(term, definition);
      fragment.append(wrapper);
    });

    if (!detailEntries.length) {
      const wrapper = createElement('div', 'drawer-detail drawer-detail--wide');
      wrapper.append(createElement('dt', '', 'Informatii'), createElement('dd', '', 'Nu au fost trimise alte detalii.'));
      fragment.append(wrapper);
    }
    dom.drawerDetails.append(fragment);
  }

  function buildDetailEntries(data) {
    const ignored = new Set([
      'id', 'type', 'kind', 'form_type', 'status', 'notes', 'created_at', 'createdAt',
      'submitted_at', 'submittedAt', 'updated_at', 'updatedAt', 'payload', 'data', 'form_data'
    ]);
    const priority = [
      'name', 'full_name', 'first_name', 'last_name', 'email', 'phone', 'telephone',
      'organization', 'company', 'role', 'city', 'county', 'amount', 'currency', 'frequency',
      'availability', 'skills', 'expertise', 'subject', 'message', 'motivation', 'contribution',
      'project', 'interests', 'preferred_contact', 'consent', 'newsletter'
    ];

    const keys = [...new Set([...priority, ...Object.keys(data)])];
    return keys
      .filter((key) => !ignored.has(key) && hasDisplayValue(data[key]))
      .map((key) => ({
        key,
        label: FIELD_LABELS[key] || humanizeKey(key),
        value: data[key],
        wide: ['message', 'motivation', 'contribution', 'expertise', 'skills', 'interests'].includes(key) || String(data[key]).length > 90
      }));
  }

  function appendDetailValue(container, key, value) {
    const displayValue = formatValue(value);
    if (key === 'source_page' && /^https?:\/\//i.test(String(value))) {
      const anchor = createElement('a', '', 'Deschide pagina sursa');
      anchor.href = String(value);
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      container.append(anchor);
      return;
    }
    if ((key === 'email' || key.endsWith('_email')) && String(value).includes('@')) {
      const anchor = createElement('a', '', displayValue);
      anchor.href = `mailto:${String(value).trim()}`;
      container.append(anchor);
      return;
    }
    if (['phone', 'telephone'].includes(key)) {
      const anchor = createElement('a', '', displayValue);
      anchor.href = `tel:${String(value).replace(/[^+\d]/g, '')}`;
      container.append(anchor);
      return;
    }
    container.textContent = displayValue;
  }

  async function saveRequest(event) {
    event.preventDefault();
    const id = dom.drawerId.value;
    if (!id) return;

    const status = normalizeStatus(dom.drawerStatus.value);
    const notes = dom.drawerNotes.value.trim();
    setButtonBusy(dom.saveButton, true, 'Se salveaza...');
    dom.saveMessage.hidden = true;

    try {
      const response = await apiFetch({
        method: 'PATCH',
        body: JSON.stringify({ id, status, notes })
      });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload.message || payload.error || 'Modificarile nu au putut fi salvate.');

      const index = state.items.findIndex((item) => String(item.id) === id);
      if (index >= 0) {
        state.items[index] = payload.item && typeof payload.item === 'object'
          ? payload.item
          : { ...state.items[index], status, notes };
      }
      renderStats();
      renderRequests();
      dom.saveMessage.textContent = 'Modificarile au fost salvate.';
      dom.saveMessage.classList.remove('form-message--error');
      dom.saveMessage.hidden = false;
      showToast('Cererea a fost actualizata.');
    } catch (error) {
      dom.saveMessage.textContent = error.message || 'Modificarile nu au putut fi salvate.';
      dom.saveMessage.classList.add('form-message--error');
      dom.saveMessage.hidden = false;
    } finally {
      setButtonBusy(dom.saveButton, false);
    }
  }

  function handleGlobalKeydown(event) {
    if (dom.drawerLayer.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDrawer();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = [...dom.requestDrawer.querySelectorAll(
      'a[href], button:not([disabled]), select:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter((element) => !element.hidden && element.offsetParent !== null);

    if (!focusable.length) {
      event.preventDefault();
      dom.requestDrawer.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!focusable.includes(document.activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function setRequestsState(view) {
    dom.requestsLoading.hidden = view !== 'loading';
    dom.requestsError.hidden = view !== 'error';
    dom.emptyState.hidden = view !== 'empty';
    dom.requestsList.hidden = view !== 'list';
  }

  function setButtonBusy(button, busy, busyText) {
    if (!button) return;
    const label = button.querySelector('span');
    if (label && !button.dataset.defaultLabel) button.dataset.defaultLabel = label.textContent;
    button.disabled = busy;
    button.setAttribute('aria-busy', String(busy));
    if (label) label.textContent = busy ? busyText : button.dataset.defaultLabel;
  }

  function showToast(message, isError = false) {
    const toast = createElement('div', `toast${isError ? ' toast--error' : ''}`, message);
    dom.toastRegion.append(toast);
    window.setTimeout(() => toast.remove(), 4300);
  }

  function createStatusBadge(status) {
    return createElement('span', `status-badge status-badge--${status}`, STATUS_LABELS[status] || STATUS_LABELS.noua);
  }

  function createElement(tagName, className = '', text = '') {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined && text !== null && text !== '') element.textContent = String(text);
    return element;
  }

  function getCombinedData(item) {
    const nested = [item.payload, item.data, item.form_data].find((value) => value && typeof value === 'object' && !Array.isArray(value)) || {};
    return { ...nested, ...item };
  }

  function getIdentity(item) {
    const data = getCombinedData(item);
    const combinedName = [data.first_name, data.last_name].filter(Boolean).join(' ').trim();
    return {
      name: String(data.name || data.full_name || combinedName || data.organization || data.company || data.email || 'Cerere fara nume'),
      email: String(data.email || ''),
      phone: String(data.phone || data.telephone || '')
    };
  }

  function getType(item) {
    const data = getCombinedData(item);
    const type = String(data.type || data.kind || data.form_type || 'contact').toLocaleLowerCase('ro-RO');
    return TYPE_META[type] ? type : 'contact';
  }

  function getPreview(item) {
    const data = getCombinedData(item);
    const value = data.subject || data.message || data.motivation || data.organization || data.company || 'Vezi detaliile cererii';
    return String(value).replace(/\s+/g, ' ').trim();
  }

  function searchableText(item) {
    const data = getCombinedData(item);
    return Object.values(data)
      .flatMap((value) => Array.isArray(value) ? value : [value])
      .filter((value) => ['string', 'number', 'boolean'].includes(typeof value))
      .join(' ')
      .toLocaleLowerCase('ro-RO');
  }

  function normalizeStatus(value) {
    const status = String(value || 'noua').toLocaleLowerCase('ro-RO');
    return VALID_STATUSES.includes(status) ? status : 'noua';
  }

  function getDateValue(item) {
    const data = getCombinedData(item);
    return data.created_at || data.createdAt || data.submitted_at || data.submittedAt || data.updated_at || '';
  }

  function getTimestamp(item) {
    const timestamp = new Date(getDateValue(item)).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  function formatDate(value, style) {
    if (!value) return 'Data necunoscuta';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    const options = style === 'long'
      ? { dateStyle: 'long', timeStyle: 'short' }
      : { day: '2-digit', month: 'short', year: 'numeric' };
    return new Intl.DateTimeFormat('ro-RO', options).format(date);
  }

  function formatCount(value) {
    return new Intl.NumberFormat('ro-RO').format(Number(value) || 0);
  }

  function formatValue(value) {
    if (Array.isArray(value)) return value.map(formatValue).join(', ');
    if (typeof value === 'boolean') return value ? 'Da' : 'Nu';
    if (value && typeof value === 'object') {
      return Object.entries(value).map(([key, nested]) => `${humanizeKey(key)}: ${formatValue(nested)}`).join('\n');
    }
    return String(value ?? '');
  }

  function hasDisplayValue(value) {
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  }

  function humanizeKey(key) {
    return String(key)
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/^./, (letter) => letter.toLocaleUpperCase('ro-RO'));
  }

  async function readJson(response) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  function humanizeAuthError(error) {
    const message = String(error?.message || 'Autentificarea nu a reusit.');
    if (/invalid login|invalid credentials|unauthorized|date de autentificare/i.test(message)) {
      return 'Utilizatorul sau parola nu sunt corecte.';
    }
    if (/failed to fetch|network/i.test(message)) {
      return 'Nu ne-am putut conecta. Verifica internetul si incearca din nou.';
    }
    return message;
  }
})();
