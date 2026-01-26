(function () {
  if (typeof window === 'undefined') {
    return;
  }

  var CalcCore = window.SighthoundCalcCore;
  var StateSync = window.SighthoundStateSync;
  var Params = window.SighthoundParams;

  if (!CalcCore || !StateSync || !Params) {
    return;
  }

  var state = StateSync.initState();

  var form = document.getElementById('guided-form');
  if (!form) {
    return;
  }

  var stepEls = Array.prototype.slice.call(form.querySelectorAll('section[data-step]'));
  var totalSteps = stepEls.length;
  var currentStepIndex = 0;
  var hasShownResults = false;

  var stepIndicatorEl = document.getElementById('guidedStepIndicator');
  var progressBarEl = document.getElementById('guidedProgress');

  var scenarioSmart = document.getElementById('scenarioSmart');
  var scenarioExistingIp = document.getElementById('scenarioExistingIp');
  var scenarioNew = document.getElementById('scenarioNew');

  var camerasInput = document.getElementById('guidedCameras');
  var smartCostInput = document.getElementById('guidedSmartCost');
  var ipCostInput = document.getElementById('guidedIpCost');

  var softwareLpr = document.getElementById('guidedSoftwareLpr');
  var softwareMmcg = document.getElementById('guidedSoftwareMmcg');

  var billingMonthlyBtn = document.getElementById('guidedBillingMonthly');
  var billingYearlyBtn = document.getElementById('guidedBillingYearly');

  var expandBreakdownCheckbox = document.getElementById('guidedExpandBreakdown');

  var prevBtn = document.getElementById('guidedPrev');
  var nextBtn = document.getElementById('guidedNext');
  var seeResultsBtn = document.getElementById('guidedSeeResults');

  var resultsStatusEl = document.getElementById('guidedResultsStatus');
  var resultsPlaceholderEl = document.getElementById('guidedResultsPlaceholder');
  var resultsBodyEl = document.getElementById('guidedResultsBody');
  var wizardCardEl = document.getElementById('guidedWizardCard');
  var resultsCardEl = document.getElementById('guidedResultsCard');

  var scenarioSummaryEl = document.getElementById('guidedScenarioSummary');
  var todayTotalEl = document.getElementById('guidedTodayTotal');
  var sighthoundTotalEl = document.getElementById('guidedSighthoundTotal');

  var savingsCardEl = document.getElementById('guidedSavingsCard');
  var savingsLabelEl = document.getElementById('guidedSavingsLabel');
  var savingsValueEl = document.getElementById('guidedSavingsValue');
  var percentValueEl = document.getElementById('guidedPercentValue');
  var savingsCopyEl = document.getElementById('guidedSavingsCopy');

  var nodesValueEl = document.getElementById('guidedNodesValue');
  var costPerBeforeEl = document.getElementById('guidedCostPerCameraBefore');
  var costPerAfterEl = document.getElementById('guidedCostPerCameraAfter');

  var softwareMonthlyEl = document.getElementById('guidedSoftwareMonthly');
  var softwareYearlyEl = document.getElementById('guidedSoftwareYearly');
  var softwareMonthlyCardEl = document.getElementById('guidedSoftwareMonthlyCard');
  var softwareYearlyCardEl = document.getElementById('guidedSoftwareYearlyCard');
  var smartCostGroupEl = document.getElementById('guidedSmartCostGroup');

  var breakdownToggleEl = document.getElementById('guidedBreakdownToggle');
  var breakdownPanelEl = document.getElementById('guidedBreakdown');
  var todayBreakdownEl = document.getElementById('guidedTodayBreakdown');
  var nodesBreakdownEl = document.getElementById('guidedNodesBreakdown');
  var camerasBreakdownEl = document.getElementById('guidedCamerasBreakdown');
  var softwareBreakdownEl = document.getElementById('guidedSoftwareBreakdown');

  var downloadPdfBtn = document.getElementById('guidedDownloadPdf');
  var editInputsBtn = document.getElementById('guidedEditInputs');
  var startOverBtn = document.getElementById('guidedStartOver');
  var quickEditStep1Btn = document.getElementById('guidedQuickEditStep1');
  var quickEditStep2Btn = document.getElementById('guidedQuickEditStep2');
  var quickEditStep3Btn = document.getElementById('guidedQuickEditStep3');

  function clampStepIndex(index) {
    if (index < 0) return 0;
    if (index >= totalSteps) return totalSteps - 1;
    return index;
  }

  function hideResults() {
    if (resultsBodyEl) resultsBodyEl.classList.add('hidden');
    if (resultsPlaceholderEl) resultsPlaceholderEl.classList.remove('hidden');
    if (resultsCardEl) resultsCardEl.classList.add('hidden');
    if (wizardCardEl) wizardCardEl.classList.remove('hidden');
  }

  function markResultsStale() {
    if (!hasShownResults) return;
    hasShownResults = false;
    hideResults();
    if (resultsStatusEl) {
      resultsStatusEl.textContent = 'Answer the next questions to generate your estimate.';
    }
  }

  function updateStepUi() {
    stepEls.forEach(function (stepEl, idx) {
      if (idx === currentStepIndex) {
        stepEl.classList.remove('hidden');
      } else {
        stepEl.classList.add('hidden');
      }
    });

    if (stepIndicatorEl) {
      stepIndicatorEl.textContent = String(currentStepIndex + 1);
    }

    if (progressBarEl) {
      var pct = ((currentStepIndex + 1) / totalSteps) * 100;
      progressBarEl.style.width = pct + '%';
    }

    if (prevBtn) {
      prevBtn.disabled = currentStepIndex === 0;
    }

    if (nextBtn && seeResultsBtn) {
      var atLast = currentStepIndex === totalSteps - 1;
      nextBtn.classList.toggle('hidden', atLast);
      seeResultsBtn.classList.toggle('hidden', !atLast);
    }
  }

  function goToStep(index) {
    currentStepIndex = clampStepIndex(index);
    updateStepUi();

    // When entering the cameras & hardware step (Step 2), ensure the smart camera
    // cost group visibility matches the currently selected scenario. This guards
    // against cases where the user changes Scenario A/B/C and then navigates back.
    if (smartCostGroupEl && currentStepIndex === 1) {
      var params = state.getParams();
      var scenarioKey = inferScenarioFromParams(params); // 'smart' | 'existingIp' | 'new'
      if (scenarioKey === 'smart') {
        smartCostGroupEl.classList.remove('hidden');
      } else {
        smartCostGroupEl.classList.add('hidden');
      }
    }
  }

  function inferScenarioFromParams(p) {
    if (!p) return 'new';
    if (p.hasSmartCameras) return 'smart';
    if (p.hasExistingCameras) return 'existingIp';
    return 'new';
  }

  function applyScenarioToParamsFromForm(partial) {
    var scenario = 'new';
    if (scenarioSmart && scenarioSmart.checked) {
      scenario = 'smart';
    } else if (scenarioExistingIp && scenarioExistingIp.checked) {
      scenario = 'existingIp';
    } else if (scenarioNew && scenarioNew.checked) {
      scenario = 'new';
    }

    if (scenario === 'smart') {
      partial.hasSmartCameras = 1;
      partial.hasExistingCameras = 0;
    } else if (scenario === 'existingIp') {
      partial.hasSmartCameras = 0;
      partial.hasExistingCameras = 1;
    } else {
      partial.hasSmartCameras = 0;
      partial.hasExistingCameras = 0;
    }
  }

  function readNumber(inputEl) {
    if (!inputEl) return undefined;
    var raw = inputEl.value;
    if (raw === '' || raw === null || raw === undefined) return undefined;
    var n = Number(raw);
    if (!Number.isFinite(n)) return undefined;
    return n;
  }

  function hydrateFromParams(params) {
    var p = params || {};

    var scenario = inferScenarioFromParams(p);
    if (scenarioSmart) scenarioSmart.checked = scenario === 'smart';
    if (scenarioExistingIp) scenarioExistingIp.checked = scenario === 'existingIp';
    if (scenarioNew) scenarioNew.checked = scenario === 'new';

    if (camerasInput) {
      camerasInput.value = p.cameras > 0 ? String(p.cameras) : '';
    }
    if (smartCostInput) {
      smartCostInput.value = typeof p.smartCost === 'number' && p.smartCost > 0
        ? String(p.smartCost)
        : '';
    }
    if (ipCostInput) {
      ipCostInput.value = typeof p.ipCost === 'number' && p.ipCost > 0
        ? String(p.ipCost)
        : '';
      // Scenario B (existing IP cameras) reuses camera hardware; IP cost is not part of
      // new hardware totals and is treated as informational only.
      var scenarioForIp = inferScenarioFromParams(p);
      var lockIpCost = scenarioForIp === 'existingIp';
      ipCostInput.disabled = !!lockIpCost;
      if (lockIpCost) {
        ipCostInput.classList.add('bg-slate-100', 'text-slate-500', 'cursor-not-allowed');
      } else {
        ipCostInput.classList.remove('bg-slate-100', 'text-slate-500', 'cursor-not-allowed');
      }
    }

    if (softwareLpr && softwareMmcg) {
      softwareLpr.checked = false;
      softwareMmcg.checked = false;
      if (p.software === 'lpr') {
        softwareLpr.checked = true;
      } else if (p.software === 'mmcg') {
        softwareMmcg.checked = true;
      } else if (p.software === 'both') {
        softwareLpr.checked = true;
        softwareMmcg.checked = true;
      }
    }

    var billing = (p.billing === 'yearly') ? 'yearly' : 'monthly';
    if (billingMonthlyBtn && billingYearlyBtn) {
      var monthlyActive = billing === 'monthly';
      billingMonthlyBtn.classList.toggle('bg-white', monthlyActive);
      billingMonthlyBtn.classList.toggle('border', monthlyActive);
      billingMonthlyBtn.classList.toggle('border-slate-200', monthlyActive);
      billingMonthlyBtn.classList.toggle('text-slate-800', monthlyActive);

      billingYearlyBtn.classList.toggle('bg-white', !monthlyActive);
      billingYearlyBtn.classList.toggle('border', !monthlyActive);
      billingYearlyBtn.classList.toggle('border-slate-200', !monthlyActive);
      billingYearlyBtn.classList.toggle('text-slate-800', !monthlyActive);
    }

    if (expandBreakdownCheckbox) {
      expandBreakdownCheckbox.checked = !!p.expandBreakdown;
    }

    // Breakdown expanded state
    if (breakdownPanelEl && breakdownToggleEl) {
      var expanded = !!p.expandBreakdown;
      breakdownPanelEl.classList.toggle('hidden', !expanded);
      breakdownToggleEl.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      breakdownToggleEl.querySelector('span:last-child').textContent = expanded ? '▲' : '▼';
      breakdownToggleEl.querySelector('span:first-child').textContent = expanded
        ? 'Hide breakdown'
        : 'Show breakdown';
    }
  }

  function deriveSoftwareSelectionFromInputs() {
    var lpr = softwareLpr && softwareLpr.checked;
    var mmcg = softwareMmcg && softwareMmcg.checked;

    if (lpr && mmcg) return 'both';
    if (lpr) return 'lpr';
    if (mmcg) return 'mmcg';
    return 'none';
  }

  function handleInputChange() {
    // Any answer change makes the previous estimate stale and hides results
    markResultsStale();

    var partial = {};
    applyScenarioToParamsFromForm(partial);

    var camerasValue = readNumber(camerasInput);
    if (camerasValue !== undefined) {
      partial.cameras = camerasValue;
    }

    var smartCostValue = readNumber(smartCostInput);
    if (smartCostValue !== undefined) {
      partial.smartCost = smartCostValue;
    }

    var ipCostValue = readNumber(ipCostInput);
    if (ipCostValue !== undefined) {
      partial.ipCost = ipCostValue;
    }

    var softwareSelection = deriveSoftwareSelectionFromInputs();
    partial.software = softwareSelection;

    if (expandBreakdownCheckbox) {
      partial.expandBreakdown = expandBreakdownCheckbox.checked ? 1 : 0;
    }

    state.update(partial);
  }

  function setBilling(billing) {
    // Changing billing is part of editing answers; hide existing results.
    markResultsStale();
    var normalized = billing === 'yearly' ? 'yearly' : 'monthly';
    state.update({ billing: normalized });
  }

  function render(params) {
    var p = params || state.getParams();
    hydrateFromParams(p);

    var cameras = p.cameras || 0;
    var hasValidCameras = cameras >= 1;

    // Guided mode: do not show live results while the user is still answering steps.
    if (!hasShownResults) {
      if (wizardCardEl) wizardCardEl.classList.remove('hidden');
      if (resultsCardEl) resultsCardEl.classList.add('hidden');
      if (resultsStatusEl) {
        resultsStatusEl.textContent = 'Answer the next questions to generate your estimate.';
      }
      if (resultsPlaceholderEl) resultsPlaceholderEl.classList.remove('hidden');
      if (resultsBodyEl) resultsBodyEl.classList.add('hidden');
      return;
    }

    // Once results have been shown, require at least one camera to render them.
    if (!hasValidCameras) {
      if (wizardCardEl) wizardCardEl.classList.remove('hidden');
      if (resultsCardEl) resultsCardEl.classList.add('hidden');
      if (resultsStatusEl) {
        resultsStatusEl.textContent = 'Enter at least one camera to generate your estimate.';
      }
      if (resultsPlaceholderEl) resultsPlaceholderEl.classList.remove('hidden');
      if (resultsBodyEl) resultsBodyEl.classList.add('hidden');
      return;
    }

    // At this point we have a valid estimate: replace the wizard card with the results card.
    if (wizardCardEl) wizardCardEl.classList.add('hidden');
    if (resultsCardEl) resultsCardEl.classList.remove('hidden');

    var result = CalcCore.computeScenarioResults(p);
    var hardware = result.hardware;
    var software = result.software;
    var breakdown = result.breakdown;

    // Show or hide the smart camera cost input group based on scenario.
    var scenario = result.scenario; // 'a', 'b', 'c'
    if (smartCostGroupEl) {
      if (scenario === 'a') {
        smartCostGroupEl.classList.remove('hidden');
      } else {
        smartCostGroupEl.classList.add('hidden');
      }
    }

    if (resultsStatusEl) {
      resultsStatusEl.textContent = 'Estimate updated. Adjust inputs and click Show estimate to recalculate.';
    }
    if (resultsPlaceholderEl) resultsPlaceholderEl.classList.add('hidden');
    if (resultsBodyEl) resultsBodyEl.classList.remove('hidden');

    // scenario already computed above
    var scenario = result.scenario; // 'a', 'b', 'c'
    var scenarioText;
    if (scenario === 'a') {
      scenarioText = 'Scenario A: smart cameras today versus Sighthound Compute Nodes + standard IP cameras.';
    } else if (scenario === 'b') {
      scenarioText = 'Scenario B: existing standard IP cameras reused; only nodes are new hardware.';
    } else {
      scenarioText = 'Scenario C: new deployment sized with Compute Nodes and standard IP cameras.';
    }
    if (scenarioSummaryEl) {
      scenarioSummaryEl.textContent = scenarioText;
    }

    // Hardware totals: mirror Live behavior so we do not show a misleading smart-camera
    // baseline when there is no well-defined "today" architecture.
    if (todayTotalEl && sighthoundTotalEl) {
      // Also keep the small headings aligned with calc-core labels so Guided and Live
      // speak the same language.
      var todayLabelEl = document.getElementById('guidedTodayLabel');
      var sighthoundLabelEl = document.getElementById('guidedSighthoundLabel');
      if (hardware.labels) {
        if (todayLabelEl && hardware.labels.todayLabel) {
          todayLabelEl.textContent = hardware.labels.todayLabel;
        }
        if (sighthoundLabelEl && hardware.labels.sighthoundLabel) {
          sighthoundLabelEl.textContent = hardware.labels.sighthoundLabel;
        }
      }

      if (scenario === 'a') {
        // Full smart vs Sighthound comparison.
        todayTotalEl.textContent = CalcCore.formatCurrency(hardware.todayTotal);
        sighthoundTotalEl.textContent = CalcCore.formatCurrency(hardware.sighthoundTotal);
      } else if (scenario === 'b') {
        // Existing IP cameras are already installed; only nodes are new hardware.
        todayTotalEl.textContent = 'Already installed';
        sighthoundTotalEl.textContent = CalcCore.formatCurrency(hardware.sighthoundTotal);
      } else {
        // New deployment: no current cameras.
        todayTotalEl.textContent = 'No current cameras (new deployment)';
        sighthoundTotalEl.textContent = CalcCore.formatCurrency(hardware.sighthoundTotal);
      }
    }

    if (nodesValueEl) {
      nodesValueEl.textContent = String(result.nodesNeeded);
    }

    // Cost per camera: before/after only makes sense for Scenario A. For B/C we
    // only surface the Sighthound "after" cost, consistent with Live and PDF.
    if (costPerBeforeEl && costPerAfterEl) {
      if (scenario === 'a') {
        costPerBeforeEl.textContent = CalcCore.formatCurrency(hardware.costPerCameraBefore);
        costPerAfterEl.textContent = CalcCore.formatCurrency(hardware.costPerCameraAfter);
      } else {
        costPerBeforeEl.textContent = '–';
        costPerAfterEl.textContent = CalcCore.formatCurrency(hardware.costPerCameraAfter);
      }
    }

    if (softwareMonthlyEl) {
      softwareMonthlyEl.textContent = CalcCore.formatCurrency(software.monthlyTotal);
    }
    if (softwareYearlyEl) {
      softwareYearlyEl.textContent = CalcCore.formatCurrency(software.yearlyTotal);
    }

    // Reflect billing toggle in which software total is emphasized/shown.
    var billing = (p.billing === 'yearly') ? 'yearly' : 'monthly';
    if (softwareMonthlyCardEl && softwareYearlyCardEl) {
      if (billing === 'monthly') {
        softwareMonthlyCardEl.classList.remove('hidden');
        softwareYearlyCardEl.classList.add('hidden');
      } else {
        softwareMonthlyCardEl.classList.add('hidden');
        softwareYearlyCardEl.classList.remove('hidden');
      }
    }

    if (scenario === 'a') {
      if (savingsCardEl) savingsCardEl.classList.remove('hidden');
      var isPositive = hardware.savings >= 0;
      var label = hardware.labels && hardware.labels.primaryLabel
        ? hardware.labels.primaryLabel
        : (isPositive ? 'Savings vs today' : 'Extra cost vs today');
      if (savingsLabelEl) savingsLabelEl.textContent = label;
      if (savingsValueEl) {
        savingsValueEl.textContent = CalcCore.formatCurrency(Math.abs(hardware.savings));
      }
      if (percentValueEl) {
        percentValueEl.textContent = CalcCore.formatPercent(hardware.percentReduction);
      }
      if (savingsCopyEl) {
        savingsCopyEl.textContent = isPositive
          ? 'Based on these inputs, Sighthound Compute Node + standard IP cameras has a lower upfront hardware cost than a smart-camera architecture.'
          : 'Based on these inputs, Sighthound Compute Node + standard IP cameras has a higher upfront hardware cost than a smart-camera architecture.';
      }
    } else if (savingsCardEl) {
      savingsCardEl.classList.add('hidden');
    }

    if (todayBreakdownEl && breakdown.todayLine) {
      todayBreakdownEl.textContent = breakdown.todayLine;
    }
    if (nodesBreakdownEl && breakdown.nodesLine) {
      nodesBreakdownEl.textContent = breakdown.nodesLine;
    }
    if (camerasBreakdownEl && breakdown.camerasLine) {
      camerasBreakdownEl.textContent = breakdown.camerasLine;
    }
    if (softwareBreakdownEl && breakdown.softwareLine) {
      softwareBreakdownEl.textContent = breakdown.softwareLine;
    }
  }

  // Event wiring
  if (scenarioSmart) scenarioSmart.addEventListener('change', handleInputChange);
  if (scenarioExistingIp) scenarioExistingIp.addEventListener('change', handleInputChange);
  if (scenarioNew) scenarioNew.addEventListener('change', handleInputChange);

  if (camerasInput) {
    camerasInput.addEventListener('input', handleInputChange);
    camerasInput.addEventListener('change', handleInputChange);
  }
  if (smartCostInput) {
    smartCostInput.addEventListener('input', handleInputChange);
    smartCostInput.addEventListener('change', handleInputChange);
  }
  if (ipCostInput) {
    ipCostInput.addEventListener('input', handleInputChange);
    ipCostInput.addEventListener('change', handleInputChange);
  }
  if (softwareLpr) {
    softwareLpr.addEventListener('change', handleInputChange);
  }
  if (softwareMmcg) {
    softwareMmcg.addEventListener('change', handleInputChange);
  }
  if (expandBreakdownCheckbox) {
    expandBreakdownCheckbox.addEventListener('change', handleInputChange);
  }

  if (billingMonthlyBtn) {
    billingMonthlyBtn.addEventListener('click', function () {
      setBilling('monthly');
    });
  }
  if (billingYearlyBtn) {
    billingYearlyBtn.addEventListener('click', function () {
      setBilling('yearly');
    });
  }

  if (breakdownToggleEl && breakdownPanelEl) {
    breakdownToggleEl.addEventListener('click', function () {
      var params = state.getParams();
      var next = params.expandBreakdown ? 0 : 1;
      state.update({ expandBreakdown: next });
      // Keep local UI in sync; does not recompute results unless they have already been shown.
      render(state.getParams());
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      goToStep(currentStepIndex - 1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      goToStep(currentStepIndex + 1);
    });
  }

  function showEstimate() {
    // Validation: require a scenario selection.
    var scenarioResolved =
      (scenarioSmart && scenarioSmart.checked) ||
      (scenarioExistingIp && scenarioExistingIp.checked) ||
      (scenarioNew && scenarioNew.checked);
    if (!scenarioResolved) {
      if (resultsStatusEl) {
        resultsStatusEl.textContent = 'Choose a deployment profile in Step 1 to continue.';
      }
      goToStep(0);
      if (scenarioSmart && typeof scenarioSmart.focus === 'function') {
        try { scenarioSmart.focus({ preventScroll: true }); } catch (_e) { scenarioSmart.focus(); }
      }
      return;
    }

    // Basic validation: require at least one camera.
    var paramsBefore = state.getParams();
    var cams = paramsBefore.cameras || 0;
    if (!cams || cams < 1) {
      if (resultsStatusEl) {
        resultsStatusEl.textContent = 'Enter at least one camera to generate your estimate.';
      }
      // Jump to the cameras step to help the user correct input.
      goToStep(1);
      if (camerasInput && typeof camerasInput.focus === 'function') {
        try { camerasInput.focus({ preventScroll: true }); } catch (_e) { camerasInput.focus(); }
      }
      return;
    }

    // Persist any pending inputs into canonical state.
    handleInputChange();
    hasShownResults = true;

    var params = state.getParams();
    render(params);
    goToStep(totalSteps - 1);

    if (resultsBodyEl) {
      resultsBodyEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  if (seeResultsBtn) {
    seeResultsBtn.addEventListener('click', function () {
      showEstimate();
    });
  }

  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      showEstimate();
    });
  }

  if (downloadPdfBtn && window.SighthoundPdf && typeof window.SighthoundPdf.prepareAndPrintPdf === 'function') {
    downloadPdfBtn.addEventListener('click', function () {
      window.SighthoundPdf.prepareAndPrintPdf(state);
    });
  }

  if (editInputsBtn) {
    editInputsBtn.addEventListener('click', function () {
      // Editing answers returns to the wizard and hides results until recalculated.
      markResultsStale();
      goToStep(0);
      if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  function quickEditToStep(stepIndex) {
    markResultsStale();
    goToStep(stepIndex);
    if (form) {
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  if (quickEditStep1Btn) {
    quickEditStep1Btn.addEventListener('click', function () {
      quickEditToStep(0);
    });
  }
  if (quickEditStep2Btn) {
    quickEditStep2Btn.addEventListener('click', function () {
      quickEditToStep(1);
    });
  }
  if (quickEditStep3Btn) {
    quickEditStep3Btn.addEventListener('click', function () {
      quickEditToStep(2);
    });
  }

  if (startOverBtn) {
    startOverBtn.addEventListener('click', function () {
      var base = Params.DEFAULTS || {};
      hasShownResults = false;
      hideResults();
      if (resultsStatusEl) {
        resultsStatusEl.textContent = 'Start by selecting a scenario and camera count.';
      }
      state.update({
        cameras: base.cameras || 0,
        hasExistingCameras: base.hasExistingCameras || 0,
        hasSmartCameras: base.hasSmartCameras || 0,
        smartCost: base.smartCost || 3000,
        ipCost: base.ipCost || 250,
        software: base.software || 'both',
        billing: base.billing || 'monthly',
        expandBreakdown: base.expandBreakdown || 0,
        showAssumptions: base.showAssumptions || 0,
      });
      var p = state.getParams();
      hydrateFromParams(p);
      goToStep(0);
      updateStepUi();
      if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  var initialParams = state.getParams();
  hydrateFromParams(initialParams);
  updateStepUi();
  // Initial view: wizard only; hide results until the user explicitly asks to see them.
  hideResults();

  // Dev-only: guard against URL/params drift using canonical round-trip.
  if (Params && typeof Params.assertCanonicalRoundTrip === 'function') {
    try {
      Params.assertCanonicalRoundTrip(initialParams);
    } catch (_err) {
      // Best-effort only.
    }
    state.subscribe(function (params) {
      try {
        Params.assertCanonicalRoundTrip(params);
      } catch (_err) {
        // Never throw from diagnostics.
      }
    });
  }

  // Initial view: wizard only; results appear after the user clicks "Show estimate".
})();
