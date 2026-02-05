/**
 * HubSpot Email PDF Form Integration (Lightweight)
 * Uses HubSpot v2 API with callbacks. No MutationObserver or aggressive loops.
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
  var hsFormCreated = false;

  /**
   * Inject URL into the hidden field (namespaced selector).
   */
  function setUrl(formEl) {
    if (!formEl) {
      log('setUrl: no formEl');
      return false;
    }
    var f = formEl.querySelector('input[name$="/hardware_estimate_url"]');
    var v = window.__latestEstimatorUrl || '';
    if (!f) {
      log('setUrl: field not found');
      // Log all input names for debugging
      var inputs = formEl.querySelectorAll('input');
      var names = [];
      for (var i = 0; i < inputs.length; i++) {
        names.push(inputs[i].name || '(no name)');
      }
      log('setUrl: available inputs:', names);
      return false;
    }
    if (!v) {
      log('setUrl: no URL to inject');
      return false;
    }
    f.value = v;
    f.dispatchEvent(new Event('input', { bubbles: true }));
    f.dispatchEvent(new Event('change', { bubbles: true }));
    log('setUrl: SUCCESS - field:', f.name, '= ', v);
    updateDebugFields('setUrl OK: ' + f.name);
    return true;
  }

  /**
   * Retry setUrl with setTimeout (not setInterval). Max 8 attempts.
   */
  function retrySetUrl(formEl, attempt) {
    attempt = attempt || 0;
    if (attempt >= 8) {
      log('retrySetUrl: gave up after 8 attempts');
      updateDebugFields('TIMEOUT: field not found after 8 retries');
      return;
    }
    if (setUrl(formEl)) {
      return; // Success
    }
    log('retrySetUrl: attempt', attempt + 1, 'failed, scheduling retry');
    updateDebugFields('Retry ' + (attempt + 1) + '/8...');
    setTimeout(function () {
      retrySetUrl(formEl, attempt + 1);
    }, 150);
  }

  /**
   * Update debug UI fields.
   */
  function updateDebugFields(status) {
    var wrap = document.getElementById('hsEmailWrap');
    var form = wrap ? wrap.querySelector('form') : null;
    var f = form ? form.querySelector('input[name$="/hardware_estimate_url"]') : null;

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
   * Load HubSpot v2 script (once globally).
   */
  function loadHsScript(callback) {
    if (hsScriptLoaded) {
      callback();
      return;
    }
    if (window.hbspt && window.hbspt.forms) {
      hsScriptLoaded = true;
      callback();
      return;
    }
    var script = document.createElement('script');
    script.src = 'https://js.hsforms.net/forms/embed/v2.js';
    script.charset = 'utf-8';
    script.onload = function () {
      hsScriptLoaded = true;
      log('HubSpot v2 script loaded');
      callback();
    };
    script.onerror = function () {
      log('HubSpot v2 script failed to load');
      updateDebugFields('ERROR: script load failed');
    };
    document.head.appendChild(script);
  }

  /**
   * Create HubSpot form with callbacks.
   */
  function createHsForm() {
    if (hsFormCreated) {
      log('Form already created');
      return;
    }
    hsFormCreated = true;

    // Ensure target div exists
    var wrap = document.getElementById('hsEmailWrap');
    var target = document.getElementById('hsEmailTarget');
    if (!target && wrap) {
      target = document.createElement('div');
      target.id = 'hsEmailTarget';
      wrap.appendChild(target);
    }

    log('Creating HubSpot form via hbspt.forms.create');
    updateDebugFields('Creating form...');

    // Helper to get raw form element from jQuery-wrapped or raw
    function getFormElement($form) {
      var formEl = $form && $form[0] ? $form[0] : $form;
      if (formEl && formEl.jquery) {
        formEl = formEl[0];
      }
      if (!formEl || !formEl.querySelector) {
        formEl = document.querySelector('#hsEmailTarget form');
      }
      return formEl;
    }

    window.hbspt.forms.create({
      region: 'na1',
      portalId: '3983149',
      formId: 'a2c21e81-1915-4b3d-a858-9aadfe08b542',
      target: '#hsEmailTarget',

      onFormReady: function ($form) {
        log('onFormReady callback fired');
        var formEl = getFormElement($form);
        log('onFormReady: formEl=', formEl);
        updateDebugFields('Form ready, setting initial URL...');
        // Set DOM value for visual consistency (optional)
        retrySetUrl(formEl, 0);
      },

      // KEY: This callback fires BEFORE HubSpot serializes/sends the payload.
      // We inject the URL directly into submissionValues, bypassing DOM entirely.
      onBeforeFormSubmit: function ($form, submissionValues) {
        log('onBeforeFormSubmit callback fired');
        log('onBeforeFormSubmit: submissionValues BEFORE:', JSON.stringify(submissionValues));

        var url = window.__latestEstimatorUrl || '';
        if (!url) {
          log('onBeforeFormSubmit: WARNING - no URL to inject');
          updateDebugFields('SUBMIT: No URL available!');
          return;
        }

        // Find the hardware_estimate_url field in submissionValues
        // submissionValues is an array of {name, value} objects
        var found = false;
        for (var i = 0; i < submissionValues.length; i++) {
          var field = submissionValues[i];
          // Match the namespaced field (ends with /hardware_estimate_url)
          if (field.name && field.name.indexOf('hardware_estimate_url') !== -1) {
            log('onBeforeFormSubmit: Found field', field.name, 'current value:', field.value);
            field.value = url;
            log('onBeforeFormSubmit: Set field', field.name, '=', url);
            found = true;
            break;
          }
        }

        // If field wasn't in submissionValues, add it (unlikely but safe)
        if (!found) {
          log('onBeforeFormSubmit: Field not in submissionValues, adding it');
          submissionValues.push({
            name: 'hardware_estimate_url',
            value: url
          });
        }

        log('onBeforeFormSubmit: submissionValues AFTER:', JSON.stringify(submissionValues));
        updateDebugFields('SUBMIT: URL injected into payload!');
      },

      onFormSubmit: function ($form) {
        log('onFormSubmit callback fired (after payload sent)');
        updateDebugFields('SUBMIT: Complete');
      }
    });
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

    // Load script and create form (only once)
    loadHsScript(function () {
      createHsForm();
    });
  }

  // Expose globally
  window.showHsEmailForm = showEmailForm;

  log('hs-email.js initialized (lightweight v2)');
})();
