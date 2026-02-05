(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  }
  if (typeof root !== 'undefined') {
    root.SighthoundPdf = factory();
  }
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var pdfTemplateLoaded = false;
  var pdfTemplateHtml = null;

  function loadPdfTemplate(callback) {
    if (pdfTemplateLoaded && pdfTemplateHtml) {
      callback(pdfTemplateHtml);
      return;
    }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'assets/pdf-template.html', true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        pdfTemplateHtml = xhr.responseText;
        pdfTemplateLoaded = true;
        callback(pdfTemplateHtml);
      }
    };
    xhr.send();
  }

  function ensurePdfRoot(callback) {
    var root = document.getElementById('pdfRoot');
    if (root) {
      callback(root);
      return;
    }
    // Load and inject template
    loadPdfTemplate(function (html) {
      var container = document.getElementById('pdfTemplateContainer');
      if (!container) {
        container = document.createElement('div');
        container.id = 'pdfTemplateContainer';
        document.body.appendChild(container);
      }
      container.innerHTML = html;
      var newRoot = document.getElementById('pdfRoot');
      callback(newRoot);
    });
  }

  function getCore() {
    if (typeof window !== 'undefined' && window.SighthoundCalcCore) {
      return window.SighthoundCalcCore;
    }
    try {
      // eslint-disable-next-line global-require, import/no-unresolved
      return require('./calc-core');
    } catch (e) {
      return null;
    }
  }

  function renderPdfFromParams(params, targetEl) {
    var CalcCore = getCore();
    if (!CalcCore || !targetEl) return;

    var result = CalcCore.computeScenarioResults(params || {});
    var hardware = result.hardware;
    var software = result.software;
    var breakdown = result.breakdown;

    var formatCurrency = CalcCore.formatCurrency;
    var formatPercent = CalcCore.formatPercent;

    function setText(id, value) {
      var el = targetEl.querySelector('#' + id);
      if (el) {
        el.textContent = value;
      }
    }

    // Header / meta
    setText('pdfTitle', 'Hardware savings estimate');

    // Scenario / inputs snapshot
    var scenarioLabel;
    if (result.scenario === 'a') {
      scenarioLabel = 'Scenario A: smart cameras today';
    } else if (result.scenario === 'b') {
      scenarioLabel = 'Scenario B: existing standard IP cameras';
    } else {
      scenarioLabel = 'Scenario C: new deployment';
    }
    setText('pdfScenario', scenarioLabel);

    setText('pdfCameras', (result.cameras || 0).toLocaleString('en-US'));

    var smartCost = params && typeof params.smartCost === 'number' ? params.smartCost : 3000;
    var ipCost = params && typeof params.ipCost === 'number' ? params.ipCost : 250;

    // Smart camera cost is only relevant for Scenario A; hide it for B/C so we
    // don't imply a smart-camera baseline where there isn't one.
    if (result.scenario === 'a') {
      setText('pdfSmartCost', formatCurrency(smartCost));
    } else {
      var smartCard = targetEl.querySelector('#pdfSmartCost') && targetEl.querySelector('#pdfSmartCost').closest('.pdf-card');
      if (smartCard) {
        smartCard.style.display = 'none';
      }
    }
    setText('pdfIpCost', formatCurrency(ipCost));

    // Software selection label
    var softwareLabel;
    var sel = (software && software.selection) || (params && params.software) || 'both';
    sel = String(sel || 'both').toLowerCase();
    if (sel === 'none') softwareLabel = 'None';
    else if (sel === 'lpr') softwareLabel = 'LPR only';
    else if (sel === 'mmcg') softwareLabel = 'MMCG only';
    else softwareLabel = 'LPR + MMCG (bundle)';
    setText('pdfSoftwareSelection', softwareLabel);

    var billing = (software && software.billing) || (params && params.billing) || 'monthly';
    billing = String(billing || 'monthly').toLowerCase() === 'yearly' ? 'Yearly' : 'Monthly';
    setText('pdfBilling', billing);

    // Hardware summary: match on-screen semantics for each scenario.
    if (result.scenario === 'a') {
      // Scenario A: full smart vs Sighthound comparison.
      setText(
        'pdfTodayLabel',
        hardware.labels && hardware.labels.todayLabel ? hardware.labels.todayLabel : 'Today'
      );
      setText(
        'pdfSighthoundLabel',
        hardware.labels && hardware.labels.sighthoundLabel
          ? hardware.labels.sighthoundLabel
          : 'With Sighthound'
      );

      setText('pdfTodayTotal', formatCurrency(hardware.todayTotal));
      setText('pdfSighthoundTotal', formatCurrency(hardware.sighthoundTotal));
    } else if (result.scenario === 'b') {
      // Scenario B: existing standard IP cameras reused; only nodes are new hardware.
      setText('pdfTodayLabel', 'Existing camera hardware');
      setText('pdfSighthoundLabel', 'Upfront node cost');

      setText('pdfTodayTotal', 'Already installed');
      setText('pdfSighthoundTotal', formatCurrency(hardware.sighthoundTotal));
    } else {
      // Scenario C: new deployment; no existing cameras.
      setText('pdfTodayLabel', 'No current cameras (new deployment)');
      setText('pdfSighthoundLabel', 'New deployment hardware cost (nodes + cameras)');

      setText('pdfTodayTotal', '—');
      setText('pdfSighthoundTotal', formatCurrency(hardware.sighthoundTotal));
    }

    // Savings card (Scenario A only)
    var savingsSection = targetEl.querySelector('#pdfSavingsSection');
    if (result.scenario === 'a') {
      if (savingsSection) {
        savingsSection.style.display = '';
      }
      var primaryLabel = hardware.labels && hardware.labels.primaryLabel
        ? hardware.labels.primaryLabel
        : (hardware.savings >= 0 ? 'Savings vs today' : 'Extra cost vs today');
      setText('pdfSavingsLabel', primaryLabel);
      setText('pdfSavingsValue', formatCurrency(Math.abs(hardware.savings)));
      setText('pdfPercentReduction', formatPercent(hardware.percentReduction));
    } else if (savingsSection) {
      savingsSection.style.display = 'none';
    }

    // Nodes and cost per camera
    setText('pdfNodes', String(result.nodesNeeded));

    if (result.scenario === 'a') {
      // Before/after both meaningful for Scenario A.
      setText('pdfCostPerCameraBefore', formatCurrency(hardware.costPerCameraBefore));
      setText('pdfCostPerCameraAfter', formatCurrency(hardware.costPerCameraAfter));
    } else {
      // For Scenarios B/C, only surface the "after" Sighthound cost; the smart-camera
      // baseline is an internal reference and not part of the user-facing comparison.
      setText('pdfCostPerCameraBefore', '—');
      setText('pdfCostPerCameraAfter', formatCurrency(hardware.costPerCameraAfter));
    }

    // Software totals
    setText('pdfSoftwareMonthly', formatCurrency(software.monthlyTotal));
    setText('pdfSoftwareYearly', formatCurrency(software.yearlyTotal));

    // Breakdown lines
    setText('pdfTodayBreakdown', breakdown.todayLine || '');
    setText('pdfNodesBreakdown', breakdown.nodesLine || '');
    setText('pdfCamerasBreakdown', breakdown.camerasLine || '');
    setText('pdfSoftwareBreakdown', breakdown.softwareLine || '');
  }

  function prepareAndPrintPdf(state) {
    if (!state || typeof state.getParams !== 'function') return;
    var params = state.getParams();

    // Ensure breakdown preference is on for canonical URL state
    if (!params.expandBreakdown) {
      state.update({ expandBreakdown: 1 });
      params = state.getParams();
    }

    ensurePdfRoot(function (root) {
      if (!root) return;
      renderPdfFromParams(params, root);
      window.print();
    });
  }

  return {
    renderPdfFromParams: renderPdfFromParams,
    prepareAndPrintPdf: prepareAndPrintPdf,
  };
});
