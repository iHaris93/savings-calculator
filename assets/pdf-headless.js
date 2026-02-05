/**
 * pdf-headless.js
 * ---------------
 * Headless PDF rendering mode for server-side generation (Puppeteer, Playwright, etc.)
 *
 * When the URL contains `print=1`, this script:
 *   1. Parses calculator params from URL query string
 *   2. Renders the PDF template via renderPdfFromParams()
 *   3. Sets window.__PDF_READY__ = true (signal for headless browser)
 *   4. Optionally hides the interactive UI for cleaner PDF output
 *
 * Puppeteer wait condition:
 *   await page.waitForFunction('window.__PDF_READY__ === true');
 *   await page.pdf({ ... });
 *
 * Security note:
 *   For production, add signature verification (HMAC) before rendering.
 *   See docs for `&sig=...` parameter pattern.
 */
(function () {
  'use strict';

  // Only run if print=1 is in the URL
  var qs = new URLSearchParams(window.location.search);
  if (qs.get('print') !== '1') {
    return;
  }

  // Initialize flags (prevents stale values on hot reload / re-run)
  window.__PDF_READY__ = false;
  window.__PDF_ERROR__ = null;
  window.__PDF_ERROR_DETAIL__ = '';

  function init() {
    try {
      // 1. Parse params from URL
      var rawParams = {};
      qs.forEach(function (value, key) {
        if (key !== 'print') {
          rawParams[key] = value;
        }
      });

      // 2. Normalize params (if schema is available)
      var params = rawParams;
      if (window.SighthoundParams && typeof window.SighthoundParams.normalizeParams === 'function') {
        params = window.SighthoundParams.normalizeParams(rawParams);
      }

      // 3. Get the PDF root element
      var root = document.getElementById('pdfRoot');
      if (!root) {
        console.error('[pdf-headless] #pdfRoot not found');
        window.__PDF_ERROR__ = 'pdfRoot_not_found';
        window.__PDF_ERROR_DETAIL__ = 'Document did not contain #pdfRoot element';
        return;
      }

      // 4. Render the PDF template
      if (window.SighthoundPdf && typeof window.SighthoundPdf.renderPdfFromParams === 'function') {
        window.SighthoundPdf.renderPdfFromParams(params, root);
      } else {
        console.error('[pdf-headless] SighthoundPdf.renderPdfFromParams not available');
        window.__PDF_ERROR__ = 'renderer_not_available';
        window.__PDF_ERROR_DETAIL__ = 'SighthoundPdf.renderPdfFromParams function not found on window';
        return;
      }

      // 5. Force print-only mode: show #pdfRoot, hide everything else
      root.style.display = 'block';
      document.body.classList.add('print-mode');

      // Hide interactive UI (if not already handled by CSS)
      var noprint = document.querySelectorAll('.no-print');
      noprint.forEach(function (el) {
        el.style.display = 'none';
      });

      // 6. Signal ready for headless browser
      window.__PDF_READY__ = true;
      window.__PDF_PARAMS__ = params; // For debugging

      console.log('[pdf-headless] Render complete. window.__PDF_READY__ = true');
      console.log('[pdf-headless] Params:', params);

    } catch (err) {
      console.error('[pdf-headless] Error:', err);
      window.__PDF_ERROR__ = err.message || String(err);
      window.__PDF_ERROR_DETAIL__ = err && err.stack ? err.stack : '';
    }
  }

  // Run after DOM is ready and all scripts have loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Small delay to ensure other scripts (calc-core, pdf-render) are initialized
    setTimeout(init, 0);
  }
})();
