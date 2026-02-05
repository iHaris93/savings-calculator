/**
 * HubSpot Email PDF Form Integration
 * Uses custom form + direct HubSpot Forms API submission.
 * Bypasses HubSpot's cross-origin iframe completely.
 */
(function () {
  'use strict';

  var DEBUG = true;
  var PORTAL_ID = '3983149';
  var FORM_ID = 'a2c21e81-1915-4b3d-a858-9aadfe08b542';

  function log() {
    if (DEBUG && typeof console !== 'undefined' && console.log) {
      console.log.apply(console, ['[HS-Email]'].concat(Array.prototype.slice.call(arguments)));
    }
  }

  // Store the latest estimator URL
  window.__latestEstimatorUrl = window.location.href;

  /**
   * Refresh the URL from current location.
   */
  function refreshUrl() {
    if (window.location && window.location.href) {
      window.__latestEstimatorUrl = window.location.href;
      log('refreshUrl:', window.__latestEstimatorUrl);
    }
  }

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
  var formRendered = false;

  /**
   * Update debug UI.
   */
  function updateDebugFields(status) {
    var elUrl = document.getElementById('hsDebugUrl');
    var elVisible = document.getElementById('hsDebugVisible');
    var elIframes = document.getElementById('hsDebugIframes');
    var elFieldFound = document.getElementById('hsDebugFieldFound');
    var elFieldValue = document.getElementById('hsDebugFieldValue');
    var elStatus = document.getElementById('hsDebugStatus');

    var wrap = document.getElementById('hsEmailWrap');
    var urlInput = document.getElementById('hs-hardware-estimate-url');

    if (elUrl) elUrl.textContent = window.__latestEstimatorUrl || '(none)';
    if (elVisible) elVisible.textContent = wrap && !wrap.classList.contains('hidden') ? 'YES' : 'NO';
    if (elIframes) elIframes.textContent = '0 (direct API)';
    if (elFieldFound) elFieldFound.textContent = urlInput ? 'YES (custom form)' : 'NO';
    if (elFieldValue) elFieldValue.textContent = urlInput ? (urlInput.value || '(empty)') : '(N/A)';
    if (elStatus && status) elStatus.textContent = status;
  }

  /**
   * Submit form data directly to HubSpot Forms API.
   */
  function submitToHubSpot(formData, callback) {
    var url = 'https://api.hsforms.com/submissions/v3/integration/submit/' + PORTAL_ID + '/' + FORM_ID;
    
    log('Submitting to HubSpot API:', url);
    log('Form data:', JSON.stringify(formData));

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    })
    .then(function(response) {
      log('HubSpot response status:', response.status);
      return response.json().then(function(data) {
        return { status: response.status, data: data };
      });
    })
    .then(function(result) {
      if (result.status === 200) {
        log('HubSpot submission SUCCESS:', result.data);
        callback(null, result.data);
      } else {
        log('HubSpot submission ERROR:', result.data);
        callback(result.data, null);
      }
    })
    .catch(function(err) {
      log('HubSpot submission FAILED:', err);
      callback(err, null);
    });
  }

  /**
   * Render our custom form (no HubSpot iframe).
   */
  function renderCustomForm(container) {
    if (formRendered) {
      log('Form already rendered');
      return;
    }
    formRendered = true;

    // Create form HTML
    var formHtml = '\n' +
      '<form id="hs-custom-form" class="hs-custom-form">\n' +
      '  <div class="hs-field">\n' +
      '    <label for="hs-firstname">First Name <span class="hs-required">*</span></label>\n' +
      '    <input type="text" id="hs-firstname" name="firstname" required />\n' +
      '  </div>\n' +
      '  <div class="hs-field">\n' +
      '    <label for="hs-lastname">Last Name <span class="hs-required">*</span></label>\n' +
      '    <input type="text" id="hs-lastname" name="lastname" required />\n' +
      '  </div>\n' +
      '  <div class="hs-field">\n' +
      '    <label for="hs-email">Email <span class="hs-required">*</span></label>\n' +
      '    <input type="email" id="hs-email" name="email" required />\n' +
      '  </div>\n' +
      '  <input type="hidden" id="hs-hardware-estimate-url" name="hardware_estimate_url" value="" />\n' +
      '  <div class="hs-field hs-submit">\n' +
      '    <button type="submit" id="hs-submit-btn">Send me my estimate</button>\n' +
      '  </div>\n' +
      '  <div id="hs-form-message" class="hs-message" style="display:none;"></div>\n' +
      '</form>\n';

    container.innerHTML = formHtml;

    // Set the hidden URL field
    refreshUrl();
    var urlInput = document.getElementById('hs-hardware-estimate-url');
    if (urlInput) {
      urlInput.value = window.__latestEstimatorUrl || '';
      log('Set hidden URL field:', urlInput.value);
    }

    // Handle form submission
    var form = document.getElementById('hs-custom-form');
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      refreshUrl();
      
      var firstname = document.getElementById('hs-firstname').value.trim();
      var lastname = document.getElementById('hs-lastname').value.trim();
      var email = document.getElementById('hs-email').value.trim();
      var estimateUrl = window.__latestEstimatorUrl || '';

      if (!firstname || !lastname || !email) {
        showMessage('Please fill in all required fields.', 'error');
        return;
      }

      // Disable submit button
      var submitBtn = document.getElementById('hs-submit-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      updateDebugFields('Submitting...');

      // Build HubSpot API payload
      var formData = {
        fields: [
          { name: 'firstname', value: firstname },
          { name: 'lastname', value: lastname },
          { name: 'email', value: email },
          { name: 'hardware_estimate_url', value: estimateUrl }
        ],
        context: {
          pageUri: window.location.href,
          pageName: document.title
        }
      };

      log('Submitting with hardware_estimate_url:', estimateUrl);

      submitToHubSpot(formData, function(err, result) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send me my estimate';

        if (err) {
          log('Submission error:', err);
          var errMsg = err.message || (err.errors && err.errors[0] && err.errors[0].message) || 'Submission failed. Please try again.';
          showMessage(errMsg, 'error');
          updateDebugFields('ERROR: ' + errMsg);
        } else {
          log('Submission success');
          showMessage('Thank you! Your estimate has been sent to your email.', 'success');
          form.reset();
          // Re-set the URL field for next submission
          if (urlInput) urlInput.value = window.__latestEstimatorUrl || '';
          updateDebugFields('SUCCESS: Submitted!');
        }
      });
    });

    function showMessage(msg, type) {
      var msgEl = document.getElementById('hs-form-message');
      if (msgEl) {
        msgEl.textContent = msg;
        msgEl.className = 'hs-message hs-' + type;
        msgEl.style.display = 'block';
      }
    }

    log('Custom form rendered');
    updateDebugFields('Form ready (direct API)');
  }

  /**
   * Show the email form section.
   */
  function showEmailForm() {
    refreshUrl();
    
    var wrap = document.getElementById('hsEmailWrap');
    if (!wrap) {
      log('hsEmailWrap not found');
      return;
    }

    wrap.classList.remove('hidden');

    var debugSection = document.getElementById('hsDebugSection');
    if (debugSection) {
      debugSection.classList.remove('hidden');
    }

    updateDebugFields('Rendering form...');
    wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Render our custom form
    renderCustomForm(wrap);
  }

  window.showHsEmailForm = showEmailForm;

  log('hs-email.js initialized (direct API mode)');
})();
