/**
 * HubSpot Email PDF Form Integration
 * Handles the "Email PDF copy" CTA that reveals a HubSpot form and injects
 * the latest estimator URL into a hidden field before submission.
 */
(function () {
  'use strict';

  // Debug flag – flip to true for console logging
  var DEBUG = false;

  function log() {
    if (DEBUG && typeof console !== 'undefined' && console.log) {
      console.log.apply(console, ['[HS-Email]'].concat(Array.prototype.slice.call(arguments)));
    }
  }

  // Store the latest estimator URL (fallback to current href)
  window.__latestEstimatorUrl = window.location.href;

  // Listen for postMessage updates from iframe or self
  window.addEventListener('message', function (e) {
    try {
      var d = e.data;
      if (!d || typeof d !== 'object') return;
      if (d.type !== 'HARDWARE_ESTIMATE_URL') return;
      if (typeof d.url !== 'string' || !d.url) return;
      // Optionally check origin (accept all for flexibility, but type must match)
      window.__latestEstimatorUrl = d.url;
      log('Updated __latestEstimatorUrl from postMessage:', d.url);
    } catch (_err) {
      // Ignore malformed messages
    }
  });

  // Keep __latestEstimatorUrl in sync with current page URL as a fallback
  // (useful when not embedded in an iframe)
  setInterval(function () {
    if (window.location && window.location.href) {
      window.__latestEstimatorUrl = window.location.href;
    }
  }, 500);

  // Guard: only render form once
  var hsFormRendered = false;
  var injectionIntervalId = null;
  var injectionAttempts = 0;
  var MAX_INJECTION_ATTEMPTS = 40; // 40 * 250ms = 10 seconds

  /**
   * Find the hidden hardware_estimate_url input within a container.
   * HubSpot may namespace the field as "0-1/hardware_estimate_url" or similar.
   */
  function findHiddenInput(container) {
    if (!container) return null;
    // Try exact name first
    var input = container.querySelector('input[name="hardware_estimate_url"]');
    if (input) return input;
    // Try name ending with /hardware_estimate_url (namespaced)
    input = container.querySelector('input[name$="/hardware_estimate_url"]');
    if (input) return input;
    // Try name containing hardware_estimate_url
    input = container.querySelector('input[name*="hardware_estimate_url"]');
    if (input) return input;
    return null;
  }

  /**
   * Inject the latest URL into the hidden field.
   * Returns true if successful (value is set and matches).
   */
  function injectUrl(container) {
    var url = window.__latestEstimatorUrl;
    if (!url) {
      log('No URL to inject');
      return false;
    }
    var input = findHiddenInput(container);
    if (!input) {
      log('Hidden input not found yet');
      return false;
    }
    input.value = url;
    // Dispatch events to ensure HubSpot picks up the value
    try {
      var inputEvent = new Event('input', { bubbles: true });
      var changeEvent = new Event('change', { bubbles: true });
      input.dispatchEvent(inputEvent);
      input.dispatchEvent(changeEvent);
    } catch (_err) {
      // Older browsers may not support Event constructor
      log('Event dispatch failed (older browser?)');
    }
    log('Injected URL into hidden field:', url, 'Input name:', input.name);
    return input.value === url;
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
    injectionIntervalId = setInterval(function () {
      injectionAttempts++;
      var success = injectUrl(container);
      if (success || injectionAttempts >= MAX_INJECTION_ATTEMPTS) {
        clearInterval(injectionIntervalId);
        injectionIntervalId = null;
        if (success) {
          log('Injection loop completed successfully after', injectionAttempts, 'attempts');
        } else {
          log('Injection loop timed out after', injectionAttempts, 'attempts');
        }
      }
    }, 250);
  }

  /**
   * Capture-phase submit listener to inject URL immediately before form submission.
   */
  document.addEventListener('submit', function (e) {
    if (!e.target) return;
    var input = findHiddenInput(e.target);
    if (input) {
      log('Submit intercepted, injecting URL');
      injectUrl(e.target);
    }
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
