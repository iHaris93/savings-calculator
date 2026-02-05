/**
 * HubSpot Email PDF Form Integration
 * Handles the "Email PDF copy" CTA that reveals a HubSpot form and injects
 * the latest estimator URL into a hidden field before submission.
 */
(function () {
  'use strict';

  // Debug flag – flip to true for console logging
  var DEBUG = true;

  function log() {
    if (DEBUG && typeof console !== 'undefined' && console.log) {
      console.log.apply(console, ['[HS-Email]'].concat(Array.prototype.slice.call(arguments)));
    }
  }

  // Store the latest estimator URL (fallback to current href)
  window.__latestEstimatorUrl = window.location.href;

  // Guard: only render form once
  var hsFormRendered = false;
  var injectionIntervalId = null;
  var injectionAttempts = 0;
  var MAX_INJECTION_ATTEMPTS = 40; // 40 * 250ms = 10 seconds

  // Track if hooks are installed and observer reference
  var hooksInstalled = false;
  var mutationObserver = null;
  var lastKnownFieldNode = null;

  /**
   * Find the hidden hardware_estimate_url input within a container.
   * ALWAYS use the namespaced selector (name ends with /hardware_estimate_url).
   */
  function findHiddenInput(container) {
    if (!container) return null;
    // Primary: name ending with /hardware_estimate_url (HubSpot namespaced like "0-1/hardware_estimate_url")
    var input = container.querySelector('input[name$="/hardware_estimate_url"]');
    if (input) {
      log('Found field via [name$="/hardware_estimate_url"]:', input.name);
      return input;
    }
    // Fallback: name containing hardware_estimate_url
    input = container.querySelector('input[name*="hardware_estimate_url"]');
    if (input) {
      log('Found field via [name*="hardware_estimate_url"]:', input.name);
      return input;
    }
    return null;
  }

  /**
   * Set the field value NOW with maximum persistence.
   * Sets value, defaultValue, and attribute to resist clearing.
   */
  function setFieldNow() {
    var wrap = document.getElementById('hsEmailWrap');
    var f = wrap ? findHiddenInput(wrap) : null;
    var v = window.__latestEstimatorUrl;

    if (!f || !v) {
      log('setFieldNow: cannot set - field:', !!f, 'url:', !!v);
      return false;
    }

    // Check if field node changed (was replaced)
    if (lastKnownFieldNode && lastKnownFieldNode !== f) {
      log('setFieldNow: FIELD NODE REPLACED! Old:', lastKnownFieldNode.name, 'New:', f.name);
    }
    lastKnownFieldNode = f;

    // Set value in multiple ways for maximum persistence
    f.value = v;
    f.defaultValue = v;
    f.setAttribute('value', v);

    // Dispatch events to ensure HubSpot picks up the value
    try {
      var inputEvent = new Event('input', { bubbles: true });
      var changeEvent = new Event('change', { bubbles: true });
      f.dispatchEvent(inputEvent);
      f.dispatchEvent(changeEvent);
    } catch (_err) {
      log('setFieldNow: Event dispatch failed (older browser?)');
    }

    log('setFieldNow: Set field', f.name, '=', v, '| value:', f.value, '| defaultValue:', f.defaultValue);
    return f.value === v;
  }

  /**
   * Update all HubSpot debug fields with current state
   */
  function updateDebugFields(status) {
    var wrap = document.getElementById('hsEmailWrap');
    var isVisible = wrap ? !wrap.classList.contains('hidden') : false;
    var iframeCount = wrap ? wrap.querySelectorAll('iframe').length : 0;
    var hiddenInput = wrap ? findHiddenInput(wrap) : null;

    // Update individual debug spans
    var elUrl = document.getElementById('hsDebugUrl');
    var elVisible = document.getElementById('hsDebugVisible');
    var elIframes = document.getElementById('hsDebugIframes');
    var elFieldFound = document.getElementById('hsDebugFieldFound');
    var elFieldValue = document.getElementById('hsDebugFieldValue');
    var elStatus = document.getElementById('hsDebugStatus');

    if (elUrl) elUrl.textContent = window.__latestEstimatorUrl || '(none)';
    if (elVisible) elVisible.textContent = isVisible ? 'YES' : 'NO';
    if (elIframes) elIframes.textContent = String(iframeCount);
    if (elFieldFound) elFieldFound.textContent = hiddenInput ? ('YES [' + hiddenInput.name + ']') : 'NO';
    if (elFieldValue) elFieldValue.textContent = hiddenInput ? (hiddenInput.value || '(empty)') : '(N/A)';
    if (elStatus && status) elStatus.textContent = status;

    log('Debug update:', {
      latestEstimatorUrl: window.__latestEstimatorUrl,
      hsEmailWrapVisible: isVisible,
      iframeCount: iframeCount,
      hiddenFieldFound: hiddenInput ? hiddenInput.name : null,
      hiddenFieldValue: hiddenInput ? hiddenInput.value : null,
      status: status
    });
  }

  // Listen for postMessage updates from iframe or self
  window.addEventListener('message', function (e) {
    try {
      var d = e.data;
      if (!d || typeof d !== 'object') return;
      if (d.type !== 'HARDWARE_ESTIMATE_URL') return;
      if (typeof d.url !== 'string' || !d.url) return;
      window.__latestEstimatorUrl = d.url;
      log('Updated __latestEstimatorUrl from postMessage:', d.url);
      // Re-inject when URL updates
      setFieldNow();
    } catch (_err) {
      // Ignore malformed messages
    }
  });

  // Keep __latestEstimatorUrl in sync with current page URL as a fallback
  setInterval(function () {
    if (window.location && window.location.href) {
      window.__latestEstimatorUrl = window.location.href;
    }
  }, 500);

  /**
   * Last-moment handler for form interactions.
   * Called on pointerdown, mousedown, click, and submit (all capture phase).
   */
  function lastMomentHandler(e) {
    var wrap = document.getElementById('hsEmailWrap');
    var f = wrap ? findHiddenInput(wrap) : null;
    log('lastMomentHandler:', e.type, '| field value before:', f ? f.value : '(no field)');
    setFieldNow();
    log('lastMomentHandler:', e.type, '| field value after:', f ? f.value : '(no field)');
    updateDebugFields('HOOK:' + e.type + ' fired');
  }

  /**
   * Install "last-moment" hooks on the form and container.
   */
  function installFormHooks(wrap) {
    if (hooksInstalled) {
      log('Hooks already installed');
      return;
    }

    var form = wrap.querySelector('form');
    if (!form) {
      log('installFormHooks: No form found yet');
      return;
    }

    hooksInstalled = true;
    log('Installing last-moment hooks on form');

    // Capture-phase listeners on the form
    form.addEventListener('pointerdown', lastMomentHandler, true);
    form.addEventListener('mousedown', lastMomentHandler, true);
    form.addEventListener('click', lastMomentHandler, true);
    form.addEventListener('submit', lastMomentHandler, true);

    // Also on wrap container for broader coverage
    wrap.addEventListener('pointerdown', lastMomentHandler, true);
    wrap.addEventListener('mousedown', lastMomentHandler, true);
    wrap.addEventListener('click', lastMomentHandler, true);
    wrap.addEventListener('submit', lastMomentHandler, true);

    log('Hooks installed on form and wrap');
  }

  /**
   * Start MutationObserver to detect DOM changes and re-inject field value.
   */
  function startMutationObserver(wrap) {
    if (mutationObserver) {
      mutationObserver.disconnect();
    }

    mutationObserver = new MutationObserver(function (mutations) {
      // Check if any mutation involves inputs
      var inputMutated = false;
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'childList') {
          // Check added nodes for inputs
          for (var j = 0; j < m.addedNodes.length; j++) {
            var node = m.addedNodes[j];
            if (node.nodeType === 1) { // Element node
              if (node.tagName === 'INPUT' || node.querySelector && node.querySelector('input')) {
                inputMutated = true;
                break;
              }
            }
          }
        }
        if (inputMutated) break;
      }

      if (inputMutated) {
        log('MutationObserver: Input node added/changed, re-injecting');
      }
      // Always try to set field on any mutation (HubSpot may be manipulating DOM)
      setFieldNow();
      updateDebugFields('MUTATION detected');

      // Try to install hooks if not done yet
      if (!hooksInstalled) {
        installFormHooks(wrap);
      }
    });

    mutationObserver.observe(wrap, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value']
    });

    log('MutationObserver started on wrap');

    // Auto-disconnect after 15 seconds
    setTimeout(function () {
      if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
        log('MutationObserver disconnected after 15s timeout');
      }
    }, 15000);
  }

  /**
   * Start an injection loop that attempts to set the hidden field value
   * periodically until successful or timeout.
   */
  function startInjectionLoop(container) {
    if (injectionIntervalId) {
      clearInterval(injectionIntervalId);
    }
    injectionAttempts = 0;
    updateDebugFields('Starting injection loop...');

    injectionIntervalId = setInterval(function () {
      injectionAttempts++;
      var success = setFieldNow();

      // Once field is found, install hooks and start observer
      var f = findHiddenInput(container);
      if (f && !hooksInstalled) {
        installFormHooks(container);
        startMutationObserver(container);
      }

      updateDebugFields('Loop attempt ' + injectionAttempts + (success ? ' OK' : ' searching...'));

      if (success || injectionAttempts >= MAX_INJECTION_ATTEMPTS) {
        clearInterval(injectionIntervalId);
        injectionIntervalId = null;
        if (success) {
          log('Injection loop completed successfully after', injectionAttempts, 'attempts');
          updateDebugFields('SUCCESS after ' + injectionAttempts + ' attempts');
        } else {
          log('Injection loop timed out after', injectionAttempts, 'attempts');
          updateDebugFields('TIMEOUT after ' + injectionAttempts + ' attempts');
        }
      }
    }, 250);
  }

  /**
   * Global capture-phase submit listener as final fallback.
   */
  document.addEventListener('submit', function (e) {
    if (!e.target) return;
    var wrap = document.getElementById('hsEmailWrap');
    if (!wrap || !wrap.contains(e.target)) return;

    var f = findHiddenInput(wrap);
    log('GLOBAL submit intercepted | field value:', f ? f.value : '(no field)');
    setFieldNow();
    log('GLOBAL submit after setFieldNow | field value:', f ? f.value : '(no field)');
    updateDebugFields('SUBMIT: Final injection done');
  }, true); // capture phase

  /**
   * Render the HubSpot form inside the given container.
   */
  function renderHsForm(container) {
    if (hsFormRendered) {
      log('Form already rendered');
      return;
    }
    hsFormRendered = true;

    // Create the form container div
    var formDiv = document.createElement('div');
    formDiv.className = 'hs-form-html';
    formDiv.setAttribute('data-region', 'na1');
    formDiv.setAttribute('data-form-id', 'a2c21e81-1915-4b3d-a858-9aadfe08b542');
    formDiv.setAttribute('data-portal-id', '3983149');
    container.appendChild(formDiv);

    // Load the HubSpot embed script
    var script = document.createElement('script');
    script.src = 'https://js.hsforms.net/forms/embed/developer/3983149.js';
    script.defer = true;
    script.onload = function () {
      log('HubSpot script loaded');
      // Start injection loop after script loads (form may take time to render)
      setTimeout(function () {
        startInjectionLoop(container);
      }, 500);
    };
    container.appendChild(script);

    log('HubSpot form elements injected into container');
  }

  /**
   * Show the HubSpot email form section and render the form if needed.
   */
  function showEmailForm() {
    var wrap = document.getElementById('hsEmailWrap');
    if (!wrap) {
      log('hsEmailWrap container not found');
      return;
    }

    // Remove hidden class to show
    wrap.classList.remove('hidden');

    // Show debug section (in CTA area)
    var debugSection = document.getElementById('hsDebugSection');
    if (debugSection) {
      debugSection.classList.remove('hidden');
    }

    // Update debug fields immediately
    updateDebugFields('Form revealed, loading HubSpot...');

    // Scroll into view
    wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Render form if not yet done
    renderHsForm(wrap);

    // Always restart injection loop when shown (in case URL changed)
    startInjectionLoop(wrap);
  }

  // Expose for use by click handlers
  window.showHsEmailForm = showEmailForm;

  log('hs-email.js initialized');
})();
