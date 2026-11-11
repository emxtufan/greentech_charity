(function () {
  'use strict';

  function installStableShaderRequests() {
    const prototype = window.XMLHttpRequest && window.XMLHttpRequest.prototype;
    if (!prototype || prototype.__greentechStableShaderRequests) return;

    const legacyOpen = prototype.open;
    prototype.open = function () {
      const args = Array.prototype.slice.call(arguments);
      if (
        typeof args[1] === 'string' &&
        /(?:^|\/)assets\/shader\/[^?]+\.js(?:\?|$)/.test(args[1])
      ) {
        args[1] = args[1].split('?')[0];
      }
      return legacyOpen.apply(this, args);
    };
    prototype.__greentechStableShaderRequests = true;
  }

  function installStageZeroAssetCleanup() {
    const partsPrototype = window.glPartsMng && window.glPartsMng.prototype;
    if (!partsPrototype || typeof partsPrototype.init !== 'function') return;

    const stageZeroPrimary = 'assets/image/stage0/s0_o.webp';
    const stageZeroSecondary = 'assets/image/stage0/s0_o_s.webp';
    const transparentPlaceholder = 'assets/image/stage0/transparent.png';
    const priorityDeferredTexturePaths = new Set([
      'assets/image/ring1.webp'
    ]);
    const connectedEntry = new URLSearchParams(window.location.search).get('entry') === 'connected';
    const entryTexturePaths = new Set([
      'assets/image/bg.webp',
      'assets/image/bgNoise.webp',
      'assets/image/bgMask.webp',
      'assets/image/stage_mask.webp',
      'assets/image/stage_mask_blue.webp',
      'assets/image/stage_mask_black.webp',
      stageZeroPrimary,
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
      'assets/image/mess/003.webp'
    ]);
    const legacyInit = partsPrototype.init;
    const legacyLoadTextureEnd = partsPrototype.loadTextureEnd;
    const legacyFirstLoadCompleteCheck = partsPrototype.fLoadCompCheck;

    function isSlowNetwork() {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (!connection) return false;
      const effectiveType = String(connection.effectiveType || '').toLowerCase();
      const downlink = Number(connection.downlink);
      const rtt = Number(connection.rtt);
      return Boolean(
        connection.saveData ||
        effectiveType === 'slow-2g' ||
        effectiveType === '2g' ||
        effectiveType === '3g' ||
        (Number.isFinite(downlink) && downlink > 0 && downlink <= 1.5) ||
        (Number.isFinite(rtt) && rtt >= 300)
      );
    }

    function createDeferredTexture() {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const texture = new THREE.Texture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
      return texture;
    }

    function startDeferredTextureLoading(manager) {
      if (manager.__greentechDeferredStarted) return;
      const paths = (manager.__greentechDeferredTextures || []).slice().sort(function (left, right) {
        return Number(priorityDeferredTexturePaths.has(right)) - Number(priorityDeferredTexturePaths.has(left));
      });
      if (!paths.length) return;

      manager.__greentechDeferredStarted = true;
      let cursor = 0;
      let completed = 0;
      const concurrency = isSlowNetwork() ? 1 : 4;

      const loadNext = function () {
        if (cursor >= paths.length) return;
        const path = paths[cursor++];
        const texture = manager._texMap[path];
        const image = new Image();
        image.decoding = 'async';
        image.fetchPriority = priorityDeferredTexturePaths.has(path) ? 'high' : 'low';

        let queueAdvanced = false;
        let textureApplied = false;
        const advanceQueue = function () {
          if (queueAdvanced) return;
          queueAdvanced = true;
          window.clearTimeout(timeout);
          completed += 1;
          window.dispatchEvent(new CustomEvent('greentech:brandbook-deferred-progress', {
            detail: {completed: completed, total: paths.length, path: path}
          }));
          loadNext();
        };
        const applyTexture = function () {
          if (textureApplied || !texture) return;
          textureApplied = true;
          texture.image = image;
          // WebGL2 pastreaza storage-ul initial de 1x1. Dispose forteaza
          // Three.js sa-l realoce la dimensiunea imaginii descarcate.
          texture.dispose();
          texture.needsUpdate = true;
          window.dispatchEvent(new CustomEvent('greentech:brandbook-texture-ready', {
            detail: {path: path}
          }));
        };
        // Timeout-ul elibereaza coada, dar nu abandoneaza imaginea. Daca un
        // fisier mare termina ulterior pe 3G, textura este aplicata atunci.
        const timeout = window.setTimeout(advanceQueue, 60000);

        image.addEventListener('load', function () {
          if (typeof image.decode === 'function') {
            image.decode().then(function () {
              applyTexture();
              advanceQueue();
            }, function () {
              applyTexture();
              advanceQueue();
            });
          } else {
            applyTexture();
            advanceQueue();
          }
        }, {once: true});
        image.addEventListener('error', advanceQueue, {once: true});
        image.src = path;
      };

      for (let index = 0; index < Math.min(concurrency, paths.length); index += 1) {
        loadNext();
      }
    }

    partsPrototype.init = function () {
      legacyInit.apply(this, arguments);
      if (!Array.isArray(this._trgTex) || !Array.isArray(this._firstItem)) return;

      const allTextures = this._trgTex.filter(function (path) {
        return path !== stageZeroSecondary && path !== transparentPlaceholder;
      });
      this.__greentechDeferredTextures = allTextures.filter(function (path) {
        return !entryTexturePaths.has(path);
      });
      this._trgTex = allTextures.filter(function (path) {
        return entryTexturePaths.has(path);
      });

      // Constructorii etapelor 2-7 sunt creati de runtime impreuna cu etapa 1.
      // Le oferim de la inceput obiecte Texture stabile de 1px; materialele
      // pastreaza aceste referinte, iar imaginea reala este atasata ulterior.
      this.__greentechDeferredTextures.forEach(function (path) {
        this._texMap[path] = createDeferredTexture();
      }, this);

      const textureItem = this._firstItem.find(function (item) {
        return item && item._type === 'texture';
      });
      if (textureItem) textureItem._list = this._trgTex;

      this._totalNum = this._firstItem.reduce(function (total, item) {
        return total + (Array.isArray(item && item._list) ? item._list.length : 0);
      }, 0);

      // The two legacy letter planes need an alpha-only map, not a downloaded
      // file. One transparent pixel keeps their material behaviour identical.
      const transparentPixel = new THREE.DataTexture(
        new Uint8Array([0, 0, 0, 0]),
        1,
        1,
        THREE.RGBAFormat
      );
      transparentPixel.minFilter = THREE.LinearFilter;
      transparentPixel.magFilter = THREE.LinearFilter;
      transparentPixel.needsUpdate = true;
      this._texMap[transparentPlaceholder] = transparentPixel;

      const manager = this;
      window.addEventListener(
        connectedEntry ? 'greentech:brandbook-activated' : 'greentech:brandbook-ready',
        function () {
          startDeferredTextureLoading(manager);
        },
        {once: true}
      );
    };

    partsPrototype.loadTextureEnd = function (texture, item, index) {
      const path = item && item._list && item._list[index];
      if (path === stageZeroPrimary) {
        // Both shader inputs intentionally point to the primary artwork, so
        // the first frame cannot flash the old secondary ring texture.
        this._texMap[stageZeroSecondary] = texture;
      }
      return legacyLoadTextureEnd.apply(this, arguments);
    };

    partsPrototype.fLoadCompCheck = function () {
      const result = legacyFirstLoadCompleteCheck.apply(this, arguments);
      if (!this.__greentechEntryLoadComplete && this._imgLoadedNum >= this._imgNum) {
        this.__greentechEntryLoadComplete = true;
        if (connectedEntry) return result;
        const manager = this;
        // Fallback pentru rutele fara gate standalone. In ruta principala,
        // evenimentul brandbook-ready porneste incarcarile chiar dupa primul cadru.
        window.setTimeout(function () {
          if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(function () {
              startDeferredTextureLoading(manager);
            }, {timeout: 2000});
          } else {
            startDeferredTextureLoading(manager);
          }
        }, 1800);
      }
      return result;
    };
  }

  function installImmediateStandaloneRoad() {
    const standalone =
      window.parent === window && (
        window.__GREENTECH_STANDALONE_ENTRY__ === true ||
        new URLSearchParams(window.location.search).get('entry') === 'standalone'
      );
    const roadPrototype = window.gl0Road && window.gl0Road.prototype;
    if (!standalone || !roadPrototype || roadPrototype.__greentechImmediateEntry) return;

    const revealRoad = function (road) {
      [
        road && road._frontShader && road._frontShader.uniforms && road._frontShader.uniforms.alpha,
        road && road._backShader && road._backShader.uniforms && road._backShader.uniforms.alpha
      ].forEach(function (alpha) {
        if (!alpha) return;
        gsap.killTweensOf(alpha);
        alpha.value = 1;
      });

      [road && road._m1, road && road._m2, road && road._topM, road && road._handM]
        .forEach(function (material) {
          if (!material) return;
          gsap.killTweensOf(material);
          material.opacity = 1;
        });
    };

    ['start', 'startRE', 'show'].forEach(function (methodName) {
      const legacyMethod = roadPrototype[methodName];
      if (typeof legacyMethod !== 'function') return;

      roadPrototype[methodName] = function () {
        const result = legacyMethod.apply(this, arguments);
        revealRoad(this);
        return result;
      };
    });

    roadPrototype.__greentechImmediateEntry = true;
  }

  installStableShaderRequests();
  installStageZeroAssetCleanup();
  installImmediateStandaloneRoad();

  const ready = window.GreentechCharityContentReady || Promise.resolve();
  const legacyOnLoad = window.onload;

  window.onload = function (event) {
    ready.then(function () {
      if (typeof legacyOnLoad === 'function') legacyOnLoad.call(window, event);
    }).catch(function (error) {
      console.error('[GREENTECH Charity] Experienta nu a putut fi initializata.', error);
      if (typeof legacyOnLoad === 'function') legacyOnLoad.call(window, event);
    });
  };
})();
