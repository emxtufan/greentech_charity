(function () {
  'use strict';

  let pendingTrigger = null;

  function holdEarlyModalClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    const trigger = target?.closest('[data-bb-footer-modal-open], [data-bb-modal-open]');
    if (!trigger) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    pendingTrigger = trigger;
  }

  document.addEventListener('click', holdEarlyModalClick, true);

  function initialise() {
    const footerSurface = document.querySelector('[data-bb-footer-interactions]');
    const standaloneSurface = document.querySelector('[data-bb-standalone-interactions]');
    const modal = footerSurface?.querySelector('#bb-footer-modal') ||
      standaloneSurface?.querySelector('#bb-outro-modal');
    if (!modal || modal.dataset.bbInteractionsReady === 'true') return;
    modal.dataset.bbInteractionsReady = 'true';

    const content = window.GREENTECH_CHARITY_CONTENT || {};
    const modalCopy = content.modals || {};
    const sharedCopy = modalCopy.shared || {};
    const runtimeCopy = content.runtime || {};
    const MODAL_SCHEMAS = {
      donation: {
        type: 'form',
        formKind: 'donation',
        fields: [
          {kind: 'input', name: 'name', inputType: 'text', attributes: {required: true, minlength: 2, autocomplete: 'name'}},
          {kind: 'input', name: 'email', inputType: 'email', attributes: {required: true, autocomplete: 'email'}},
          {kind: 'input', name: 'phone', inputType: 'tel', attributes: {pattern: '[0-9+() .-]{7,}', autocomplete: 'tel'}},
          {kind: 'select', name: 'frequency', attributes: {required: true, 'data-bb-donation-kind': true}, options: [
            {value: '', copyKey: 'choose'},
            {value: 'unica', copyKey: 'once'},
            {value: 'lunara', copyKey: 'monthly'},
            {value: 'materiale', copyKey: 'materials'}
          ]},
          {kind: 'input', name: 'amount', inputType: 'number', attributes: {required: true, min: 10, step: 10, inputmode: 'decimal', 'data-bb-donation-amount': true}},
          {kind: 'select', name: 'project', attributes: {required: true}, options: [
            {value: '', copyKey: 'choose'},
            {value: 'prioritar', copyKey: 'priority'},
            {value: 'casa', copyKey: 'house'},
            {value: 'energie', copyKey: 'energy'},
            {value: 'spatiu-verde', copyKey: 'greenSpace'}
          ]},
          {kind: 'textarea', name: 'message', attributes: {rows: 3, maxlength: 800}}
        ]
      },
      volunteer: {
        type: 'form',
        formKind: 'volunteer',
        fields: [
          {kind: 'input', name: 'name', inputType: 'text', attributes: {required: true, minlength: 2, autocomplete: 'name'}},
          {kind: 'input', name: 'email', inputType: 'email', attributes: {required: true, autocomplete: 'email'}},
          {kind: 'input', name: 'phone', inputType: 'tel', attributes: {required: true, pattern: '[0-9+() .-]{7,}', autocomplete: 'tel'}},
          {kind: 'input', name: 'city', inputType: 'text', attributes: {required: true, minlength: 2, autocomplete: 'address-level2'}},
          {kind: 'select', name: 'skills', attributes: {required: true}, options: [
            {value: '', copyKey: 'choose'},
            {value: 'constructii', copyKey: 'construction'},
            {value: 'arhitectura', copyKey: 'architecture'},
            {value: 'logistica', copyKey: 'logistics'},
            {value: 'comunicare', copyKey: 'communication'},
            {value: 'sprijin-familie', copyKey: 'familySupport'},
            {value: 'alta', copyKey: 'other'}
          ]},
          {kind: 'select', name: 'availability', attributes: {required: true}, options: [
            {value: '', copyKey: 'choose'},
            {value: 'ocazional', copyKey: 'occasionally'},
            {value: 'weekend', copyKey: 'weekend'},
            {value: 'saptamanal', copyKey: 'weekly'},
            {value: 'proiect', copyKey: 'project'}
          ]},
          {kind: 'textarea', name: 'message', attributes: {required: true, rows: 4, minlength: 20, maxlength: 1200}}
        ]
      },
      partner: {
        type: 'form',
        formKind: 'partner',
        fields: [
          {kind: 'input', name: 'organization', inputType: 'text', attributes: {required: true, minlength: 2, autocomplete: 'organization'}},
          {kind: 'input', name: 'registration', inputType: 'text', attributes: {maxlength: 40}},
          {kind: 'input', name: 'name', inputType: 'text', attributes: {required: true, minlength: 2, autocomplete: 'name'}},
          {kind: 'input', name: 'role', inputType: 'text', attributes: {required: true, minlength: 2, autocomplete: 'organization-title'}},
          {kind: 'input', name: 'email', inputType: 'email', attributes: {required: true, autocomplete: 'email'}},
          {kind: 'input', name: 'phone', inputType: 'tel', attributes: {required: true, pattern: '[0-9+() .-]{7,}', autocomplete: 'tel'}},
          {kind: 'select', name: 'support', full: true, attributes: {required: true}, options: [
            {value: '', copyKey: 'choose'},
            {value: 'financiar', copyKey: 'financial'},
            {value: 'materiale', copyKey: 'materials'},
            {value: 'servicii', copyKey: 'services'},
            {value: 'voluntariat-corporate', copyKey: 'corporateVolunteering'},
            {value: 'comunicare', copyKey: 'communication'},
            {value: 'mixt', copyKey: 'mixed'}
          ]},
          {kind: 'textarea', name: 'message', attributes: {required: true, rows: 4, minlength: 30, maxlength: 1500}}
        ]
      },
      'footer-contact': {
        type: 'form',
        formKind: 'contact',
        fields: [
          {kind: 'input', name: 'name', inputType: 'text', attributes: {required: true, minlength: 2, autocomplete: 'name'}},
          {kind: 'input', name: 'email', inputType: 'email', attributes: {required: true, autocomplete: 'email'}},
          {kind: 'input', name: 'phone', inputType: 'tel', attributes: {pattern: '[0-9+() .-]{7,}', autocomplete: 'tel'}},
          {kind: 'select', name: 'subject', attributes: {required: true}, options: [
            {value: '', copyKey: 'choose'},
            {value: 'proiecte', copyKey: 'projects'},
            {value: 'donatie', copyKey: 'donations'},
            {value: 'voluntariat', copyKey: 'volunteering'},
            {value: 'parteneriat', copyKey: 'partnerships'},
            {value: 'presa', copyKey: 'press'},
            {value: 'altul', copyKey: 'other'}
          ]},
          {kind: 'textarea', name: 'message', attributes: {required: true, rows: 5, minlength: 20, maxlength: 1500}}
        ]
      },
      newsletter: {
        type: 'form',
        formKind: 'newsletter',
        fields: [
          {kind: 'input', name: 'first_name', copyKey: 'firstName', inputType: 'text', attributes: {minlength: 2, autocomplete: 'given-name'}},
          {kind: 'input', name: 'email', inputType: 'email', attributes: {required: true, autocomplete: 'email'}},
          {kind: 'select', name: 'interest', full: true, attributes: {required: true}, options: [
            {value: '', copyKey: 'choose'},
            {value: 'toate', copyKey: 'all'},
            {value: 'santier', copyKey: 'site'},
            {value: 'impact', copyKey: 'impact'},
            {value: 'voluntariat', copyKey: 'volunteering'},
            {value: 'parteneriate', copyKey: 'partnerships'}
          ]}
        ]
      },
      about: {type: 'about'},
      social: {type: 'social', buttonOrder: ['native', 'linkedin', 'facebook', 'whatsapp', 'copy']}
    };
    const isFooterSurface = modal.id === 'bb-footer-modal';
    const interactionRoot = isFooterSurface ? footerSurface : standaloneSurface;
    const openAttribute = isFooterSurface ? 'data-bb-footer-modal-open' : 'data-bb-modal-open';
    const closeAttribute = isFooterSurface ? 'data-bb-footer-modal-close' : 'data-bb-modal-close';
    const bodyStateClass = isFooterSurface ? 'bb-footer-modal-open' : 'bb-modal-open';
    const modalDescriptionId = isFooterSurface ? 'bb-footer-modal-description' : 'bb-modal-description';
    const modalTitle = modal.querySelector('[data-bb-modal-title]');
    const modalEyebrow = modal.querySelector('[data-bb-modal-eyebrow]');
    const modalContent = modal.querySelector('[data-bb-modal-content]');
    const defaultModalTitle = content.footer?.modalDefaultTitle || modalTitle.textContent;
    const defaultModalEyebrow = content.footer?.modalDefaultEyebrow || modalEyebrow.textContent;
    let opener = null;
    let closing = false;
    let fieldSequence = 0;
    let submissionEpoch = 0;
    let activeRequestController = null;

    function escapeHtml(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function fieldIdentity(name) {
      fieldSequence += 1;
      const id = 'bb-field-' + name + '-' + fieldSequence;
      return {id: id, errorId: id + '-error'};
    }

    function attributesHtml(attributes) {
      const allowed = new Set([
        'required', 'minlength', 'maxlength', 'autocomplete', 'pattern',
        'min', 'max', 'step', 'inputmode', 'rows', 'placeholder',
        'data-bb-donation-kind', 'data-bb-donation-amount'
      ]);
      return Object.keys(attributes || {}).filter(function (name) {
        return allowed.has(name);
      }).map(function (name) {
        const value = attributes[name];
        if (value === false || value == null) return '';
        if (value === true) return ' ' + name;
        return ' ' + name + '="' + escapeHtml(value) + '"';
      }).join('');
    }

    function inputField(name, label, type, attributes, full) {
      const identity = fieldIdentity(name);
      return '<label class="bb-form__field' + (full ? ' bb-form__field--full' : '') + '">' +
        '<span>' + escapeHtml(label) + '</span>' +
        '<input id="' + identity.id + '" type="' + escapeHtml(type) + '" name="' + escapeHtml(name) + '" aria-describedby="' + identity.errorId + '"' + (attributes || '') + '>' +
        '<small id="' + identity.errorId + '" class="bb-form__error"></small>' +
      '</label>';
    }

    function selectField(name, label, options, attributes, full) {
      const identity = fieldIdentity(name);
      return '<label class="bb-form__field' + (full ? ' bb-form__field--full' : '') + '">' +
        '<span>' + escapeHtml(label) + '</span>' +
        '<select id="' + identity.id + '" name="' + escapeHtml(name) + '" aria-describedby="' + identity.errorId + '"' + (attributes || '') + '>' + options + '</select>' +
        '<small id="' + identity.errorId + '" class="bb-form__error"></small>' +
      '</label>';
    }

    function textareaField(name, label, attributes) {
      const identity = fieldIdentity(name);
      return '<label class="bb-form__field bb-form__field--full">' +
        '<span>' + escapeHtml(label) + '</span>' +
        '<textarea id="' + identity.id + '" name="' + escapeHtml(name) + '" aria-describedby="' + identity.errorId + '"' + (attributes || '') + '></textarea>' +
        '<small id="' + identity.errorId + '" class="bb-form__error"></small>' +
      '</label>';
    }

    function consentField(kind) {
      const identity = fieldIdentity('consent');
      const copy = kind === 'newsletter' ? sharedCopy.consentNewsletter : sharedCopy.consentDefault;
      return '<div class="bb-form__consent bb-form__field--full">' +
        '<input id="' + identity.id + '" type="checkbox" name="consent" aria-describedby="' + identity.errorId + '" required>' +
        '<label for="' + identity.id + '">' + escapeHtml(copy) + '</label>' +
        '<small id="' + identity.errorId + '" class="bb-form__error"></small>' +
      '</div>';
    }

    function formShell(kind, intro, fields, notice) {
      return '<p id="' + modalDescriptionId + '" class="bb-modal__lead">' + escapeHtml(intro) + '</p>' +
        (notice || '') +
        '<form class="bb-form" data-bb-form="' + escapeHtml(kind) + '" novalidate>' +
          '<input type="hidden" name="form_type" value="' + escapeHtml(kind) + '">' +
          '<input type="hidden" name="started_at" value="' + Date.now() + '">' +
          '<label class="bb-form__trap" aria-hidden="true">' + escapeHtml(sharedCopy.honeypot) + '<input type="text" name="website" tabindex="-1" autocomplete="off"></label>' +
          '<div class="bb-form__grid">' + fields + consentField(kind) + '</div>' +
          '<div class="bb-form__submit-row">' +
            '<button class="bb-form__submit" type="submit"><span>' + escapeHtml(sharedCopy.submit) + '</span><i aria-hidden="true">&nearr;</i></button>' +
            '<p class="bb-form__status" role="status" aria-live="polite"></p>' +
          '</div>' +
        '</form>';
    }

    function optionsHtml(options, labels) {
      return (Array.isArray(options) ? options : []).map(function (option) {
        return '<option value="' + escapeHtml(option.value) + '">' + escapeHtml(labels?.[option.copyKey]) + '</option>';
      }).join('');
    }

    function fieldHtml(field, copy) {
      const fieldCopy = copy || {};
      const attributeValues = Object.assign({}, field.attributes || {});
      if (fieldCopy.placeholder) attributeValues.placeholder = fieldCopy.placeholder;
      const attributes = attributesHtml(attributeValues);
      if (field.kind === 'select') {
        return selectField(field.name, fieldCopy.label, optionsHtml(field.options, fieldCopy.options), attributes, field.full === true);
      }
      if (field.kind === 'textarea') {
        return textareaField(field.name, fieldCopy.label, attributes);
      }
      return inputField(field.name, fieldCopy.label, field.inputType || 'text', attributes, field.full === true);
    }

    function noticeHtml(notice) {
      if (!notice) return '';
      return '<div class="bb-modal__notice"><strong>' + escapeHtml(notice.title) + '</strong><span>' + escapeHtml(notice.text) + '</span></div>';
    }

    function renderForm(definition, schema) {
      const fields = schema.fields.map(function (field) {
        return fieldHtml(field, definition.fields?.[field.copyKey || field.name]);
      }).join('');
      return formShell(schema.formKind, definition.intro, fields, noticeHtml(definition.notice));
    }

    function renderAbout(definition) {
      const principles = (Array.isArray(definition.principles) ? definition.principles : []).map(function (item) {
        return '<article><span>' + escapeHtml(item.number) + '</span><h3>' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(item.text) + '</p></article>';
      }).join('');
      const process = (Array.isArray(definition.process) ? definition.process : []).map(function (item) {
        return '<p><span>' + escapeHtml(item.title) + '</span> ' + escapeHtml(item.text) + '</p>';
      }).join('');
      return '<p id="' + modalDescriptionId + '" class="bb-modal__lead">' + escapeHtml(definition.intro) + '</p>' +
        '<div class="bb-about__principles">' + principles + '</div>' +
        '<div class="bb-about__process">' + process + '</div>' +
        '<div class="bb-modal__actions"><a href="/proiecte/" target="_top">' + escapeHtml(definition.action) + ' <span aria-hidden="true">&nearr;</span></a></div>';
    }

    function renderSocial(definition, schema) {
      const buttons = schema.buttonOrder.map(function (type) {
        const item = definition.buttons?.[type] || {};
        return '<button type="button" data-bb-share="' + escapeHtml(type) + '"><span>' + escapeHtml(item.title) + '</span><small>' + escapeHtml(item.description) + '</small><i aria-hidden="true">&nearr;</i></button>';
      }).join('');
      return '<p id="' + modalDescriptionId + '" class="bb-modal__lead">' + escapeHtml(definition.intro) + '</p>' +
        '<div class="bb-share">' + buttons + '</div>' +
        '<p class="bb-share__status" role="status" aria-live="polite"></p>';
    }

    function renderDefinition(definition, schema) {
      if (schema.type === 'form') return renderForm(definition, schema);
      if (schema.type === 'about') return renderAbout(definition);
      if (schema.type === 'social') return renderSocial(definition, schema);
      return '';
    }

    const MODALS = {};
    Object.keys(MODAL_SCHEMAS).forEach(function (name) {
      const definition = modalCopy[name];
      const schema = MODAL_SCHEMAS[name];
      if (!definition) return;
      MODALS[name] = {
        eyebrow: definition.eyebrow,
        title: definition.title,
        render: function () { return renderDefinition(definition, schema); }
      };
    });

    function isModalOpen() {
      return modal.open;
    }

    function applyProjectContext(trigger) {
      const slug = trigger?.dataset?.bbProject;
      const intent = trigger?.dataset?.bbIntent;
      const form = modalContent.querySelector('[data-bb-form]');
      if (!form) return;

      if (form.dataset.bbForm === 'contact' && form.elements.subject) {
        form.elements.subject.value = intent || (slug ? 'proiecte' : '');
      }

      if (!slug) return;

      const contextCopy = runtimeCopy.projectContext || {};
      const label = trigger?.dataset?.bbProjectLabel || content.projects?.items?.[slug]?.title || slug;
      const context = document.createElement('p');
      const hidden = document.createElement('input');

      context.className = 'bb-modal__context';
      context.textContent = String(contextCopy.prefix || '') + label;
      modalContent.querySelector('.bb-modal__lead')?.insertAdjacentElement('afterend', context);

      hidden.type = 'hidden';
      hidden.name = 'project_context';
      hidden.value = slug;
      form.appendChild(hidden);

      if (form.dataset.bbForm === 'donation') {
        const projectDirections = {
          'camin-eficient': 'casa',
          'energie-cu-sens': 'energie',
          'spatii-vii': 'spatiu-verde',
          'reteaua-care-construieste': 'prioritar',
          'casa-01-prahova': 'casa',
          'renovare-02-ilfov': 'casa',
          'energie-03-dambovita': 'energie',
          'gradina-04-brasov': 'spatiu-verde'
        };
        const projectSelect = form.elements.project;
        if (projectSelect && projectDirections[slug]) projectSelect.value = projectDirections[slug];
      }

    }

    function openModal(name, trigger) {
      const definition = MODALS[name];
      if (isModalOpen()) return;

      opener = trigger || document.activeElement;
      modal.dataset.modal = name;
      if (definition) {
        modalEyebrow.textContent = definition.eyebrow;
        modalTitle.textContent = definition.title;
        modalContent.innerHTML = definition.render();
      } else {
        modalEyebrow.textContent = defaultModalEyebrow;
        modalTitle.textContent = defaultModalTitle;
        modalContent.innerHTML = '<p id="' + modalDescriptionId + '" class="bb-modal__lead">' + escapeHtml(runtimeCopy.contentUnavailable) + '</p>';
      }
      modalContent.scrollTop = 0;
      if (definition) applyProjectContext(trigger);
      document.body.classList.add(bodyStateClass);
      modal.showModal();

      window.requestAnimationFrame(function () {
        modal.classList.add('is-open');
        modal.querySelector('.bb-modal__close')?.focus({preventScroll: true});
      });
    }

    function closeModal() {
      if (!isModalOpen() || closing) return;
      closing = true;
      submissionEpoch += 1;
      activeRequestController?.abort();
      activeRequestController = null;
      modal.classList.remove('is-open');
      modal.classList.add('is-closing');

      window.setTimeout(function () {
        modal.close();
        modal.classList.remove('is-closing');
        modalContent.innerHTML = '';
        document.body.classList.remove(bodyStateClass);
        closing = false;
        opener?.focus?.({preventScroll: true});
        opener = null;
      }, 320);
    }

    function getErrorContainer(field) {
      return field.closest('.bb-form__field, .bb-form__consent, .bb-form__options-group');
    }

    function validationMessage(field) {
      const copy = runtimeCopy.validation || {};
      if (field.validity.valueMissing) {
        return field.type === 'checkbox' ? copy.consentRequired : copy.required;
      }
      if (field.validity.typeMismatch) return copy.email;
      if (field.validity.tooShort) return copy.tooShort;
      if (field.validity.rangeUnderflow) return String(copy.minimumPrefix || '') + field.min + String(copy.minimumSuffix || '');
      if (field.validity.patternMismatch) return copy.pattern;
      return copy.invalid;
    }

    function clearFieldError(field) {
      const container = getErrorContainer(field);
      if (!container) return;
      container.classList.remove('has-error');
      const error = container.querySelector('.bb-form__error');
      if (error) error.textContent = '';
      field.removeAttribute('aria-invalid');
    }

    function showFieldError(field) {
      const container = getErrorContainer(field);
      if (!container) return;
      container.classList.add('has-error');
      const error = container.querySelector('.bb-form__error');
      if (error) error.textContent = validationMessage(field);
      field.setAttribute('aria-invalid', 'true');
    }

    function validateForm(form) {
      const fields = Array.from(form.querySelectorAll('input:not([type="hidden"]), select, textarea'));
      let firstInvalid = null;

      fields.forEach(function (field) {
        if (typeof field.value === 'string' && field.type !== 'checkbox' && field.type !== 'radio') {
          field.value = field.value.trim();
        }
        clearFieldError(field);
        if (!field.checkValidity()) {
          showFieldError(field);
          if (!firstInvalid) firstInvalid = field;
        }
      });

      if (firstInvalid) {
        const status = form.querySelector('.bb-form__status');
        status.textContent = runtimeCopy.validation?.formInvalid || '';
        status.classList.add('is-error');
        firstInvalid.focus({preventScroll: true});
        firstInvalid.scrollIntoView({behavior: 'smooth', block: 'center'});
        return false;
      }
      return true;
    }

    function serializeForm(form) {
      const values = {};
      new FormData(form).forEach(function (value, key) {
        if (key === 'website') return;
        if (Object.prototype.hasOwnProperty.call(values, key)) {
          values[key] = Array.isArray(values[key]) ? values[key].concat(value) : [values[key], value];
        } else {
          values[key] = value;
        }
      });
      values.page = window.top === window ? window.location.href : document.referrer || window.location.href;
      values.submitted_at = new Date().toISOString();
      return values;
    }

    async function deliverForm(kind, payload) {
      const config = window.GREENTECH_CHARITY_CONFIG || {};
      const endpoint = String(config.formEndpoint || '').trim();
      if (!endpoint) {
        const error = new Error('missing-endpoint');
        error.code = 'MISSING_ENDPOINT';
        throw error;
      }

      const controller = new AbortController();
      activeRequestController?.abort();
      activeRequestController = controller;
      // SMTP este confirmat de server inainte de raspuns; conexiunile mobile
      // lente au nevoie de o fereastra mai generoasa decat vechiul timeout.
      const timeout = window.setTimeout(function () { controller.abort(); }, 30000);
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
          credentials: 'same-origin',
          signal: controller.signal,
          body: JSON.stringify({type: kind, data: payload})
        });
        if (!response.ok) throw new Error('request-failed-' + response.status);
        return await response.json().catch(function () { return {}; });
      } finally {
        window.clearTimeout(timeout);
        if (activeRequestController === controller) activeRequestController = null;
      }
    }

    function showSuccess(kind, result) {
      const copy = runtimeCopy.success || {};
      const reference = result?.id || result?.reference || '';
      modalContent.innerHTML =
        '<div id="' + modalDescriptionId + '" class="bb-success" tabindex="-1">' +
          '<span class="bb-success__icon" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="m10 25 9 9 19-21"/></svg></span>' +
          '<p class="bb-success__kicker">' + escapeHtml(copy.kicker) + '</p>' +
          '<h3>' + escapeHtml(copy.titles?.[kind] || copy.fallbackTitle) + '</h3>' +
          '<p>' + escapeHtml(copy.message) + '</p>' +
          (reference ? '<small>' + escapeHtml(copy.referencePrefix) + String(reference).replace(/[<>&"]/g, '') + '</small>' : '') +
          '<div class="bb-modal__actions">' +
            '<button type="button" ' + closeAttribute + '>' + escapeHtml(copy.close) + '</button>' +
            '<a href="/proiecte/" target="_top">' + escapeHtml(copy.projects) + ' <span aria-hidden="true">&nearr;</span></a>' +
          '</div>' +
        '</div>';
      modalContent.querySelector('.bb-success')?.focus({preventScroll: true});
    }

    async function submitForm(form) {
      if (!validateForm(form) || form.elements.website?.value) return;

      const submit = form.querySelector('[type="submit"]');
      const status = form.querySelector('.bb-form__status');
      const kind = form.dataset.bbForm;
      const currentEpoch = ++submissionEpoch;
      submit.disabled = true;
      submit.setAttribute('aria-busy', 'true');
      status.classList.remove('is-error');
      status.textContent = runtimeCopy.submission?.sending || '';

      try {
        const result = await deliverForm(kind, serializeForm(form));
        if (currentEpoch !== submissionEpoch || !modal.open || !form.isConnected) return;
        showSuccess(kind, result);
      } catch (error) {
        if (currentEpoch !== submissionEpoch || !modal.open || !form.isConnected) return;
        status.classList.add('is-error');
        status.textContent = error?.code === 'MISSING_ENDPOINT'
          ? runtimeCopy.submission?.missingEndpoint || ''
          : runtimeCopy.submission?.failure || '';
        submit.disabled = false;
        submit.removeAttribute('aria-busy');
      }
    }

    function shareUrl() {
      return window.location.origin + '/proiecte/';
    }

    async function copyShareLink(status) {
      const value = shareUrl();
      let copied = false;
      try {
        await navigator.clipboard.writeText(value);
        copied = true;
      } catch {
        const temporary = document.createElement('textarea');
        temporary.value = value;
        temporary.setAttribute('readonly', '');
        temporary.style.position = 'fixed';
        temporary.style.opacity = '0';
        document.body.appendChild(temporary);
        temporary.select();
        copied = document.execCommand('copy');
        temporary.remove();
      }
      status.textContent = copied ? runtimeCopy.sharing?.copied || '' : runtimeCopy.sharing?.copyDenied || '';
    }

    async function handleShare(type) {
      const url = shareUrl();
      const copy = runtimeCopy.sharing || {};
      const status = modalContent.querySelector('.bb-share__status');

      if (type === 'native' && navigator.share) {
        try {
          await navigator.share({title: copy.title, text: copy.text, url: url});
          status.textContent = copy.nativeSuccess || '';
        } catch (error) {
          if (error?.name !== 'AbortError') await copyShareLink(status);
        }
        return;
      }
      if (type === 'copy' || type === 'native') {
        await copyShareLink(status);
        return;
      }

      const destinations = {
        linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url),
        facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url),
        whatsapp: 'https://wa.me/?text=' + encodeURIComponent(String(copy.text || '') + ' ' + url)
      };
      const destination = destinations[type];
      if (destination) {
        const popup = window.open(destination, '_blank', 'noopener,noreferrer,width=720,height=680');
        status.textContent = popup ? copy.popupOpened || '' : copy.popupBlocked || '';
      }
    }

    function syncDonationAmount(form) {
      if (!form || form.dataset.bbForm !== 'donation') return;
      const kind = form.querySelector('[data-bb-donation-kind]');
      const amount = form.querySelector('[data-bb-donation-amount]');
      if (!kind || !amount) return;

      const materialsOnly = kind.value === 'materiale';
      amount.required = !materialsOnly;
      const label = amount.closest('.bb-form__field')?.querySelector(':scope > span');
      if (label) {
        label.textContent = materialsOnly
          ? runtimeCopy.donationAmount?.optional || ''
          : runtimeCopy.donationAmount?.required || '';
      }
      if (materialsOnly && !amount.value) clearFieldError(amount);
    }

    interactionRoot.addEventListener('click', function (event) {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      const trigger = target.closest('[' + openAttribute + ']');
      if (trigger) {
        event.preventDefault();
        openModal(trigger.getAttribute(openAttribute), trigger);
        return;
      }

      if (target.closest('[' + closeAttribute + ']')) {
        event.preventDefault();
        closeModal();
        return;
      }

      const share = target.closest('[data-bb-share]');
      if (share) {
        event.preventDefault();
        handleShare(share.dataset.bbShare);
      }
    });

    modal.addEventListener('cancel', function (event) {
      event.preventDefault();
      closeModal();
    });

    modal.addEventListener('wheel', function (event) {
      event.stopPropagation();
    }, {passive: true});

    modal.addEventListener('touchmove', function (event) {
      event.stopPropagation();
    }, {passive: true});

    modal.addEventListener('submit', function (event) {
      const form = event.target.closest('[data-bb-form]');
      if (!form) return;
      event.preventDefault();
      submitForm(form);
    });

    modal.addEventListener('input', function (event) {
      const field = event.target.closest('input, select, textarea');
      if (!field) return;
      syncDonationAmount(field.form);
      clearFieldError(field);
      const status = field.form?.querySelector('.bb-form__status');
      if (status) {
        status.textContent = '';
        status.classList.remove('is-error');
      }
    });

    const publicApi = {
      open: function (name) { openModal(name, document.activeElement); },
      close: closeModal,
      isOpen: isModalOpen
    };

    if (isFooterSurface) window.GreentechCharityBrandbookFooter = publicApi;
    else window.GreentechCharityStandaloneForms = publicApi;
  }

  function finishInitialisation() {
    document.removeEventListener('click', holdEarlyModalClick, true);
    initialise();
    const trigger = pendingTrigger;
    pendingTrigger = null;
    if (trigger?.isConnected) window.setTimeout(function () { trigger.click(); }, 0);
  }

  const ready = window.GreentechCharityContentReady;
  if (ready && typeof ready.then === 'function') ready.then(finishInitialisation, finishInitialisation);
  else finishInitialisation();
})();
