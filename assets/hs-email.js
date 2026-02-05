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

  // Store the latest estimator URL (one-time fallback; postMessage is source of truth)
  window.__latestEstimatorUrl = window.location.href;

  // Listen for postMessage updates (primary source of URL)
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
    // Use type="hidden" + namespaced selector for safety
    return container.querySelector('input[type="hidden"][name$="/hardware_estimate_url"]');
  }

  /**
   * Hard-set field value + dispatch events to update HubSpot's internal model.
   */
  function hardSetField(f, v) {
    if (!f) return false;
    f.value = v;
    f.defaultValue = v;
    f.setAttribute('value', v);
    try { f.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
    try { f.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
    return true;
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
    var ok = hardSetField(f, v);
    log('setFieldValue:', ok ? 'SUCCESS' : 'FAIL', f.name, '=', v);
    return ok;
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
   * Attach pre-submit guards: click, keydown Enter, submit (all capture phase).
   * Inject URL earlier than submit to give HubSpot time to update internal model.
   */
  function attachPreSubmitGuards() {
    if (submitListenerAttached) return;
    submitListenerAttached = true;

    function injectNow(reason) {
      var wrap = document.getElementById('hsEmailWrap');
      if (!wrap) return;
      var f = findField(wrap);
      var v = window.__latestEstimatorUrl || '';
      if (!f || !v) {
        log(reason + ': cannot inject - field:', !!f, 'url:', !!v);
        return;
      }

      log(reason + ': injecting URL into', f.name);
      log(reason + ': before =', f.value);
      hardSetField(f, v);
      log(reason + ': after  =', f.value);
      updateDebugFields(reason + ': injected');
    }

    // 1) Click on submit button (capture) - fires before HubSpot processes
    document.addEventListener('click', function (e) {
      var wrap = document.getElementById('hsEmailWrap');
      if (!wrap) return;
      if (!wrap.contains(e.target)) return;

      // HubSpot submit can be <input type="submit"> or <button type="submit">
      var t = e.target;
      var isSubmit =
        (t.tagName === 'INPUT' && (t.type || '').toLowerCase() === 'submit') ||
        (t.tagName === 'BUTTON' && ((t.type || 'submit').toLowerCase() === 'submit'));

      if (isSubmit) injectNow('CLICK');
    }, true);

    // 2) Enter key submits (capture)
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var wrap = document.getElementById('hsEmailWrap');
      if (!wrap) return;
      if (!wrap.contains(e.target)) return;
      injectNow('ENTER');
    }, true);

    // 3) Submit (capture) as last safety net
    document.addEventListener('submit', function (e) {
      var wrap = document.getElementById('hsEmailWrap');
      if (!wrap) return;
      if (!wrap.contains(e.target)) return;
      injectNow('SUBMIT');
    }, true);

    log('Pre-submit guards attached (click/enter/submit capture)');
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

    // Attach pre-submit guards (click/enter/submit capture)
    attachPreSubmitGuards();

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
