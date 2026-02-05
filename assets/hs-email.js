/**
 * HubSpot Email PDF Form Integration (Developer Embed)
 * Uses HubSpot developer embed script with capture-phase submit injection.
 * Form type doesn't support v2/v3 API, so we use DOM injection.
 */
(function () {
  'use strict';

  var DEBUG = true;

  function log() {
    if (DEBUG && typeof console !== 'undefined' && console.log) {
      console.log.apply(console, ['[HS-Email]'].concat(Array.prototype.slice.call(arguments)));
    }
  }

  // Store the latest estimator URL
  window.__latestEstimatorUrl = window.location.href;

  // Keep URL in sync
  setInterval(function () {
    if (window.location && window.location.href) {
      window.__latestEstimatorUrl = window.location.href;
    }
  }, 500);

  // Listen for postMessage updates
  window.addEventListener('message', function (e) {
    try {
      var d = e.data;
      if (d && d.type === 'HARDWARE_ESTIMATE_URL' && typeof d.url === 'string') {
        window.__latestEstimatorUrl = d.url;
        log('URL updated from postMessage:', d.url);
      }
    } catch (_) {}
  });

  // Guards
  var hsScriptLoaded = false;
  var hsFormInjected = false;
  var submitListenerAttached = false;

  /**
   * Find the hidden field in a container.
   */
  function findField(container) {
    if (!container) return null;
    return container.querySelector('input[name$="/hardware_estimate_url"]');
  }

  /**
   * Set the field value with maximum persistence.
   */
  function setFieldValue(container) {
    var f = findField(container);
    var v = window.__latestEstimatorUrl || '';
    if (!f) {
      log('setFieldValue: field not found');
      return false;
    }
    if (!v) {
      log('setFieldValue: no URL');
      return false;
    }
    // Set in multiple ways for persistence
    f.value = v;
    f.defaultValue = v;
    f.setAttribute('value', v);
    // Dispatch events
    f.dispatchEvent(new Event('input', { bubbles: true }));
    f.dispatchEvent(new Event('change', { bubbles: true }));
    log('setFieldValue: SUCCESS -', f.name, '=', v);
    return true;
  }

  /**
   * Retry field injection with setTimeout. Max 10 attempts.
   */
  function retrySetField(container, attempt) {
    attempt = attempt || 0;
    if (attempt >= 10) {
      log('retrySetField: gave up after 10 attempts');
      updateDebugFields('TIMEOUT: field not found');
      return;
    }
    if (setFieldValue(container)) {
      updateDebugFields('Field set OK');
      return;
    }
    log('retrySetField: attempt', attempt + 1, 'scheduling retry');
    updateDebugFields('Retry ' + (attempt + 1) + '/10...');
    setTimeout(function () {
      retrySetField(container, attempt + 1);
    }, 200);
  }

  /**
   * Update debug UI.
   */
  function updateDebugFields(status) {
    var wrap = document.getElementById('hsEmailWrap');
    var f = wrap ? findField(wrap) : null;

    var elUrl = document.getElementById('hsDebugUrl');
    var elVisible = document.getElementById('hsDebugVisible');
    var elIframes = document.getElementById('hsDebugIframes');
    var elFieldFound = document.getElementById('hsDebugFieldFound');
    var elFieldValue = document.getElementById('hsDebugFieldValue');
    var elStatus = document.getElementById('hsDebugStatus');

    if (elUrl) elUrl.textContent = window.__latestEstimatorUrl || '(none)';
    if (elVisible) elVisible.textContent = wrap && !wrap.classList.contains('hidden') ? 'YES' : 'NO';
    if (elIframes) elIframes.textContent = wrap ? wrap.querySelectorAll('iframe').length : 0;
    if (elFieldFound) elFieldFound.textContent = f ? 'YES [' + f.name + ']' : 'NO';
    if (elFieldValue) elFieldValue.textContent = f ? (f.value || '(empty)') : '(N/A)';
    if (elStatus && status) elStatus.textContent = status;
  }

  /**
   * Attach capture-phase submit listener to inject value right before submit.
   */
  function attachSubmitListener() {
    if (submitListenerAttached) return;
    submitListenerAttached = true;

    document.addEventListener('submit', function (e) {
      var wrap = document.getElementById('hsEmailWrap');
      if (!wrap) return;
      if (!wrap.contains(e.target)) return;

      log('SUBMIT captured - injecting URL');
      var f = findField(wrap);
      if (f) {
        var v = window.__latestEstimatorUrl || '';
        log('SUBMIT: field before:', f.name, '=', f.value);
        f.value = v;
        f.defaultValue = v;
        f.setAttribute('value', v);
        log('SUBMIT: field after:', f.name, '=', f.value);
        updateDebugFields('SUBMIT: Injected!');
      } else {
        log('SUBMIT: field not found!');
        updateDebugFields('SUBMIT: No field!');
      }
    }, true); // capture phase

    log('Submit listener attached (capture phase)');
  }

  /**
   * Load HubSpot developer embed script.
   */
  function loadHsScript(callback) {
    if (hsScriptLoaded) {
      callback();
      return;
    }
    var script = document.createElement('script');
    script.src = 'https://js.hsforms.net/forms/embed/developer/3983149.js';
    script.defer = true;
    script.onload = function () {
      hsScriptLoaded = true;
      log('HubSpot developer script loaded');
      callback();
    };
    script.onerror = function () {
      log('HubSpot script failed to load');
      updateDebugFields('ERROR: script load failed');
    };
    document.head.appendChild(script);
  }

  /**
   * Inject HubSpot form HTML into container.
   */
  function injectFormHtml(container) {
    if (hsFormInjected) {
      log('Form already injected');
      return;
    }
    hsFormInjected = true;

    // Create the hs-form-html div that the developer script looks for
    var formDiv = document.createElement('div');
    formDiv.className = 'hs-form-html';
    formDiv.setAttribute('data-region', 'na1');
    formDiv.setAttribute('data-form-id', 'a2c21e81-1915-4b3d-a858-9aadfe08b542');
    formDiv.setAttribute('data-portal-id', '3983149');
    container.appendChild(formDiv);

    log('Form HTML injected, waiting for HubSpot to render...');
    updateDebugFields('Form injected, rendering...');

    // Attach submit listener
    attachSubmitListener();

    // Start retry loop to set field once form renders
    setTimeout(function () {
      retrySetField(container, 0);
    }, 500);
  }

  /**
   * Show the HubSpot email form section (idempotent).
   */
  function showEmailForm() {
    var wrap = document.getElementById('hsEmailWrap');
    if (!wrap) {
      log('hsEmailWrap not found');
      return;
    }

    // Show wrap
    wrap.classList.remove('hidden');

    // Show debug section
    var debugSection = document.getElementById('hsDebugSection');
    if (debugSection) {
      debugSection.classList.remove('hidden');
    }

    updateDebugFields('Loading HubSpot...');

    // Scroll into view
    wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Load script then inject form
    loadHsScript(function () {
      injectFormHtml(wrap);
    });
  }

  // Expose globally
  window.showHsEmailForm = showEmailForm;

  log('hs-email.js initialized (developer embed)');
})();
