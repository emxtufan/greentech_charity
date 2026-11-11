(function () {
  'use strict';

  var DATA_URL = './proiecte.json';
  var state = {
    data: null,
    activeCase: null,
    activeCarouselIndex: 0,
    lastFocused: null,
    scrollFrame: 0
  };

  function one(selector, root) {
    return (root || document).querySelector(selector);
  }

  function all(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function setText(selector, value, root) {
    var node = one(selector, root);
    if (node) node.textContent = value || '';
    return node;
  }

  function setImage(imageNode, image) {
    if (!imageNode || !image) return;
    var imageFrame = imageNode.closest('figure, .case-card__media');
    imageFrame?.classList.remove('is-image-error');
    imageNode.src = image.src || '';
    imageNode.alt = image.alt || '';
    imageNode.addEventListener('load', function () {
      imageFrame?.classList.remove('is-image-error');
    }, {once: true});
    imageNode.addEventListener('error', function () {
      imageFrame?.classList.add('is-image-error');
    }, {once: true});
  }

  function formatIndex(value) {
    return String(value + 1).padStart(2, '0');
  }

  function createFact(item, className) {
    var wrapper = document.createElement('div');
    if (className) wrapper.className = className;
    var value = document.createElement('strong');
    var label = document.createElement('span');
    value.textContent = item.value || '';
    label.textContent = item.label || '';
    wrapper.append(value, label);
    return wrapper;
  }

  function renderHero(data) {
    var meta = one('[data-hero-meta]');
    meta.replaceChildren();
    (data.meta || []).forEach(function (item) {
      var span = document.createElement('span');
      span.textContent = item;
      meta.appendChild(span);
    });

    setText('[data-hero-title]', data.title);
    setText('[data-hero-lead]', data.lead);
    setText('[data-hero-caption]', data.image.caption);
    setImage(one('[data-hero-image]'), data.image);
  }

  function renderStory(data) {
    setText('[data-story-label]', data.label);
    setText('[data-story-title]', data.title);

    var intro = one('[data-story-intro]');
    intro.replaceChildren();
    (data.intro || []).forEach(function (paragraph) {
      var node = document.createElement('p');
      node.textContent = paragraph;
      intro.appendChild(node);
    });

    var feature = data.feature;
    setText('[data-feature-eyebrow]', feature.eyebrow);
    setText('[data-feature-title]', feature.title);
    setText('[data-feature-description]', feature.description);
    setText('[data-feature-credit]', feature.image.credit);
    setImage(one('[data-feature-image]'), feature.image);

    var facts = one('[data-feature-facts]');
    facts.replaceChildren();
    (feature.facts || []).forEach(function (fact) {
      var row = document.createElement('div');
      var label = document.createElement('dt');
      var value = document.createElement('dd');
      label.textContent = fact.label;
      value.textContent = fact.value;
      row.append(label, value);
      facts.appendChild(row);
    });
  }

  function renderImpact(data) {
    setText('[data-impact-label]', data.label);
    setText('[data-impact-title]', data.title);
    var container = one('[data-impact-facts]');
    container.replaceChildren();
    (data.facts || []).forEach(function (fact) {
      var node = createFact(fact, 'impact-fact reveal');
      container.appendChild(node);
    });
  }

  function renderField(data) {
    setText('[data-field-label]', data.label);
    setText('[data-field-title]', data.title);
    var gallery = one('[data-field-gallery]');
    gallery.replaceChildren();

    (data.gallery || []).forEach(function (item) {
      var card = document.createElement('figure');
      var media = document.createElement('div');
      var image = document.createElement('img');
      var credit = document.createElement('span');
      var caption = document.createElement('figcaption');
      var copy = document.createElement('span');

      card.className = 'field-card reveal';
      media.className = 'field-card__media';
      image.width = 1500;
      image.height = 1200;
      image.loading = 'lazy';
      copy.textContent = item.caption || '';
      credit.className = 'field-card__credit';
      credit.textContent = item.credit || '';
      setImage(image, item);
      media.appendChild(image);
      caption.append(copy, credit);
      card.append(media, caption);
      gallery.appendChild(card);
    });
  }

  function createCaseCard(project) {
    var card = document.createElement('button');
    var media = document.createElement('span');
    var image = document.createElement('img');
    var status = document.createElement('span');
    var content = document.createElement('span');
    var meta = document.createElement('span');
    var title = document.createElement('h3');

    card.type = 'button';
    card.className = 'case-card';
    card.dataset.caseSlug = project.slug;
    card.setAttribute('aria-label', 'Deschide proiectul ' + project.title);

    media.className = 'case-card__media';
    image.width = 1500;
    image.height = 1500;
    image.loading = 'lazy';
    setImage(image, project.image);

    status.className = 'case-card__status';
    status.textContent = project.status;
    media.append(image, status);

    content.className = 'case-card__content';
    meta.className = 'case-card__meta';
    meta.textContent = project.category + ' · ' + project.location;
    title.textContent = project.title;
    content.append(meta, title);
    card.append(media, content);
    card.addEventListener('click', function () {
      openCase(project.slug, true);
    });
    return card;
  }

  function renderCases(data) {
    setText('[data-cases-label]', data.label);
    setText('[data-cases-title]', data.title);
    setText('[data-cases-intro]', data.intro);
    var track = one('[data-cases-track]');
    track.replaceChildren();
    (data.items || []).forEach(function (project) {
      track.appendChild(createCaseCard(project));
    });
    updateCarouselState(0);
  }

  function renderClosing(data) {
    setText('[data-closing-label]', data.label);
    setText('[data-closing-title]', data.title);
    setText('[data-closing-primary]', data.primary);
  }

  function renderPage(data) {
    state.data = data;
    document.title = data.page?.title || document.title;
    var description = document.querySelector('meta[name="description"]');
    if (description && data.page?.description) description.content = data.page.description;

    renderHero(data.hero || {});
    renderStory(data.story || {});
    renderImpact(data.impact || {});
    renderField(data.field || {});
    renderCases(data.cases || {});
    renderClosing(data.closing || {});
    setupReveals();
    syncCaseFromUrl();
  }

  function getProjects() {
    return state.data?.cases?.items || [];
  }

  function findProject(slug) {
    return getProjects().find(function (project) {
      return project.slug === slug;
    });
  }

  function renderList(container, items) {
    container.replaceChildren();
    (items || []).forEach(function (value) {
      var item = document.createElement('li');
      item.textContent = value;
      container.appendChild(item);
    });
  }

  function renderCaseDialog(project) {
    var dialog = one('[data-case-dialog]');
    setText('[data-case-dialog-meta]', project.category + ' · ' + project.location + ' · ' + project.status, dialog);
    setText('[data-case-dialog-title]', project.title, dialog);
    setText('[data-case-dialog-summary]', project.summary, dialog);
    setText('[data-case-dialog-credit]', project.image.credit, dialog);
    setImage(one('[data-case-dialog-image]', dialog), project.image);

    var stats = one('[data-case-dialog-stats]', dialog);
    stats.replaceChildren();
    (project.stats || []).forEach(function (fact) {
      stats.appendChild(createFact(fact, 'case-dialog-stat'));
    });

    renderList(one('[data-case-dialog-needs]', dialog), project.needs);
    renderList(one('[data-case-dialog-steps]', dialog), project.steps);
    var action = one('[data-case-dialog-action]', dialog);
    action.dataset.bbProject = project.slug;
    action.dataset.bbProjectLabel = project.title;
  }

  function projectUrl(slug) {
    var url = new URL(window.location.href);
    url.searchParams.set('proiect', slug);
    url.hash = '';
    return url.pathname + url.search;
  }

  function baseUrl() {
    return window.location.pathname;
  }

  function openCase(slug, updateHistory) {
    var project = findProject(slug);
    var dialog = one('[data-case-dialog]');
    if (!project || !dialog) return;

    renderCaseDialog(project);
    state.activeCase = slug;
    state.lastFocused = document.activeElement;
    if (updateHistory) window.history.pushState({greentechCase: slug}, '', projectUrl(slug));

    if (!dialog.open) dialog.showModal();
    document.body.classList.add('has-case-dialog');
    one('[data-case-close]', dialog)?.focus({preventScroll: true});
    setText('[data-project-announcer]', 'Proiect deschis: ' + project.title);
  }

  function closeCase(updateHistory) {
    var dialog = one('[data-case-dialog]');
    if (!dialog?.open) return;

    dialog.close();
    document.body.classList.remove('has-case-dialog');
    state.activeCase = null;

    if (updateHistory) {
      if (window.history.state?.greentechCase) window.history.back();
      else window.history.replaceState(window.history.state, '', baseUrl());
    }

    if (state.lastFocused && document.contains(state.lastFocused)) {
      state.lastFocused.focus({preventScroll: true});
    }
  }

  function syncCaseFromUrl() {
    var slug = new URL(window.location.href).searchParams.get('proiect');
    var dialog = one('[data-case-dialog]');
    if (slug && findProject(slug)) {
      if (!dialog.open || state.activeCase !== slug) openCase(slug, false);
    } else if (dialog?.open) {
      closeCase(false);
    }
  }

  function getCarouselTarget(index) {
    var viewport = one('[data-carousel-viewport]');
    var cards = all('.case-card');
    var card = cards[index];
    if (!viewport || !card) return 0;
    var centered = card.offsetLeft - (viewport.clientWidth - card.offsetWidth) / 2;
    var maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    return Math.max(0, Math.min(centered, maxScroll));
  }

  function updateCarouselState(forcedIndex) {
    var viewport = one('[data-carousel-viewport]');
    var cards = all('.case-card');
    if (!viewport || !cards.length) return;
    var maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    var isAtStart = viewport.scrollLeft <= 2;
    var isAtEnd = maxScroll > 0 && viewport.scrollLeft >= maxScroll - 2;
    var viewportCenter = viewport.scrollLeft + viewport.clientWidth / 2;
    var closestIndex = cards.reduce(function (bestIndex, card, cardIndex) {
      var best = cards[bestIndex];
      var bestDistance = Math.abs(best.offsetLeft + best.offsetWidth / 2 - viewportCenter);
      var distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - viewportCenter);
      return distance < bestDistance ? cardIndex : bestIndex;
    }, 0);
    var index = typeof forcedIndex === 'number'
      ? forcedIndex
      : isAtStart
        ? 0
        : isAtEnd
          ? cards.length - 1
          : closestIndex;
    index = Math.max(0, Math.min(cards.length - 1, index));
    state.activeCarouselIndex = index;
    setText('[data-carousel-position]', formatIndex(index) + ' / ' + String(cards.length).padStart(2, '0'));
    one('[data-carousel-prev]').disabled = index <= 0;
    one('[data-carousel-next]').disabled = index >= cards.length - 1;
  }

  function moveCarousel(direction) {
    var viewport = one('[data-carousel-viewport]');
    if (!viewport) return;
    var nextIndex = Math.max(0, Math.min(getProjects().length - 1, state.activeCarouselIndex + direction));
    var targetLeft = getCarouselTarget(nextIndex);
    viewport.scrollTo({
      left: targetLeft,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    });
    updateCarouselState(nextIndex);
  }

  function setupCarousel() {
    var viewport = one('[data-carousel-viewport]');
    one('[data-carousel-prev]')?.addEventListener('click', function () { moveCarousel(-1); });
    one('[data-carousel-next]')?.addEventListener('click', function () { moveCarousel(1); });
    viewport?.addEventListener('scroll', function () {
      if (state.scrollFrame) return;
      state.scrollFrame = window.requestAnimationFrame(function () {
        state.scrollFrame = 0;
        updateCarouselState();
      });
    }, {passive: true});
    viewport?.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveCarousel(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveCarousel(1);
      }
    });
    window.addEventListener('resize', function () { updateCarouselState(); }, {passive: true});
  }

  function setupHeader() {
    var header = one('[data-site-header]');
    var back = one('[data-back-link]');
    if (!header) return;

    function updateHeader() {
      header.classList.toggle('is-scrolled', window.scrollY > 20);
    }

    back?.addEventListener('click', function (event) {
      if (window.history.length <= 1 || !document.referrer) return;
      try {
        if (new URL(document.referrer).origin !== window.location.origin) return;
        event.preventDefault();
        window.history.back();
      } catch {
        // Linkul catre pagina principala ramane fallback-ul sigur.
      }
    });
    window.addEventListener('scroll', updateHeader, {passive: true});
    updateHeader();
  }

  function setupDialog() {
    var dialog = one('[data-case-dialog]');
    if (!dialog) return;

    one('[data-case-close]', dialog)?.addEventListener('click', function () {
      closeCase(true);
    });
    dialog.addEventListener('cancel', function (event) {
      event.preventDefault();
      closeCase(true);
    });
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) closeCase(true);
    });
    dialog.addEventListener('click', function (event) {
      if (!event.target.closest('[data-bb-modal-open]')) return;
      closeCase(false);
      window.history.replaceState(window.history.state, '', baseUrl());
    });
    window.addEventListener('popstate', syncCaseFromUrl);
  }

  function setupReveals() {
    var nodes = all('.reveal:not([data-reveal-ready])');
    nodes.forEach(function (node) { node.dataset.revealReady = 'true'; });
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      nodes.forEach(function (node) { node.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, {rootMargin: '0px 0px -8% 0px', threshold: 0.08});
    nodes.forEach(function (node) { observer.observe(node); });
  }

  function showLoadError() {
    setText('[data-hero-title]', 'Proiectele noastre se pregatesc.');
    setText('[data-hero-lead]', 'Nu am putut incarca momentan continutul. Reincarca pagina sau scrie-ne la help@greentechcharity.ro.');
    all('.reveal').forEach(function (node) { node.classList.add('is-visible'); });
  }

  setupHeader();
  setupCarousel();
  setupDialog();

  fetch(DATA_URL, {headers: {'Accept': 'application/json'}})
    .then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    })
    .then(renderPage)
    .catch(function (error) {
      console.error('[GREENTECH proiecte] Continutul JSON nu a putut fi incarcat.', error);
      showLoadError();
    });
})();
