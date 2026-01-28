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

  // Optional explicit node configuration (Auto/Manual + count)
  var nodesInput = document.getElementById('guidedNodes');
  var nodesAutoBtn = document.getElementById('guidedNodesAuto');
  var nodesManualBtn = document.getElementById('guidedNodesManual');
  var nodesHelperEl = document.getElementById('guidedNodesHelper');

  var softwareLpr = document.getElementById('guidedSoftwareLpr');
  var softwareMmcg = document.getElementById('guidedSoftwareMmcg');

  // Camera hardware preference radios
  var cameraTypeStandard = document.getElementById('guidedCameraTypeStandard');
  var cameraTypeSmart = document.getElementById('guidedCameraTypeSmart');

  var billingMonthlyBtn = document.getElementById('guidedBillingMonthly');
  var billingYearlyBtn = document.getElementById('guidedBillingYearly');

  // Optional Step 4-style inputs: current provider costs
  var currentSoftwareInput = document.getElementById('guidedCurrentSoftware');
  var currentHardwareInput = document.getElementById('guidedCurrentHardware');
  var currentBillingMonthlyBtn = document.getElementById('guidedCurrentBillingMonthly');
  var currentBillingYearlyBtn = document.getElementById('guidedCurrentBillingYearly');

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

  // Results elements for current provider TCO comparison
  var tcoSectionEl = document.getElementById('guidedTcoSection');
  var currentTcoValueEl = document.getElementById('guidedCurrentTcoValue');
  var sighthoundTcoValueEl = document.getElementById('guidedSighthoundTcoValue');
  var tcoSummaryEl = document.getElementById('guidedTcoSummary');

  // Breakdown elements
  var breakdownToggleEl = document.getElementById('guidedBreakdownToggle');
  var breakdownPanelEl = document.getElementById('guidedBreakdown');
  var todayBreakdownEl = document.getElementById('guidedTodayBreakdown');
  var nodesBreakdownEl = document.getElementById('guidedNodesBreakdown');
  var camerasBreakdownEl = document.getElementById('guidedCamerasBreakdown');
  var softwareBreakdownEl = document.getElementById('guidedSoftwareBreakdown');

  // Actions
  var downloadPdfBtn = document.getElementById('guidedDownloadPdf');
  var editInputsBtn = document.getElementById('guidedEditInputs');
  var startOverBtn = document.getElementById('guidedStartOver');
  var quickEditStep1Btn = document.getElementById('guidedQuickEditStep1');
  var quickEditStep2Btn = document.getElementById('guidedQuickEditStep2');
  var quickEditStep3Btn = document.getElementById('guidedQuickEditStep3');

  // Fixed horizon in months for current provider TCO comparison. If future designs
  // require a different window (e.g., 24 months), update this constant and any
  // associated copy in the UI and PDF.
  var TCO_HORIZON_MONTHS = 12;
  var currentBilling = 'monthly';

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

    // Step 2 UI (cameras, nodes, and camera hardware preference) is the same
    // regardless of Scenario A/B/C. We no longer hide or show pieces of this
    // step based on scenario when navigating.
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

    // Camera hardware preference
    var cameraType = (p.cameraType === 'smart') ? 'smart' : 'standard';
    if (cameraTypeStandard) {
      cameraTypeStandard.checked = cameraType === 'standard';
    }
    if (cameraTypeSmart) {
      cameraTypeSmart.checked = cameraType === 'smart';
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

    // Compute Nodes UI (auto vs manual + count)
    if (nodesInput || nodesAutoBtn || nodesManualBtn || nodesHelperEl) {
      var cameras = p.cameras || 0;
      var recommendedNodes = CalcCore.calculateNodesNeeded
        ? CalcCore.calculateNodesNeeded(cameras)
        : 0;
      var mode = (p.nodesMode === 'manual') ? 'manual' : 'auto';
      var configuredNodes = typeof p.nodes === 'number' ? p.nodes : 0;

      if (nodesAutoBtn) {
        nodesAutoBtn.classList.toggle('bg-white', mode === 'auto');
        nodesAutoBtn.classList.toggle('border', mode === 'auto');
        nodesAutoBtn.classList.toggle('border-slate-200', mode === 'auto');
        nodesAutoBtn.classList.toggle('text-slate-800', mode === 'auto');
      }
      if (nodesManualBtn) {
        nodesManualBtn.classList.toggle('bg-white', mode === 'manual');
        nodesManualBtn.classList.toggle('border', mode === 'manual');
        nodesManualBtn.classList.toggle('border-slate-200', mode === 'manual');
        nodesManualBtn.classList.toggle('text-slate-800', mode === 'manual');
      }

      if (nodesInput) {
        var isAuto = mode === 'auto';
        nodesInput.disabled = isAuto;
        if (isAuto) {
          nodesInput.value = recommendedNodes > 0 ? String(recommendedNodes) : '';
        } else {
          nodesInput.value = configuredNodes > 0 ? String(configuredNodes) : '0';
        }
      }

      if (nodesHelperEl) {
        var helperText;
        if (!cameras) {
          helperText =
            'Nodes are optional. Enter your camera count, then use Auto to let the calculator suggest a node count or switch to Manual to model nodes-only purchases.';
        } else if (mode === 'auto') {
          helperText =
            'Currently set to Auto. Based on ' +
            cameras.toLocaleString('en-US') +
            ' cameras and up to ' +
            (CalcCore.CAMERAS_PER_NODE || 1) +
            ' cameras per node, we recommend ' +
            recommendedNodes.toLocaleString('en-US') +
            ' Compute Node' + (recommendedNodes === 1 ? '' : 's') + '.';
        } else {
          helperText =
            'Manual override: using ' +
            (configuredNodes || 0).toLocaleString('en-US') +
            ' Compute Node' + ((configuredNodes || 0) === 1 ? '' : 's') + '. ';
          if (cameras && recommendedNodes !== configuredNodes) {
            helperText +=
              'For ' +
              cameras.toLocaleString('en-US') +
              ' cameras we would normally recommend about ' +
              recommendedNodes.toLocaleString('en-US') +
              ' node' + (recommendedNodes === 1 ? '' : 's') +
              ' based on capacity.';
          }
        }
        nodesHelperEl.textContent = helperText;
      }
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

    // If the user is in manual node mode, preserve their explicit node count in
    // canonical params so hardware totals and PDFs reflect the override.
    if (nodesInput) {
      var currentParams = state.getParams();
      if (currentParams.nodesMode === 'manual') {
        var nodesValue = readNumber(nodesInput);
        if (nodesValue !== undefined) {
          partial.nodes = nodesValue;
        }
      }
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

    // Camera hardware preference
    if (cameraTypeStandard && cameraTypeStandard.checked) {
      partial.cameraType = 'standard';
    } else if (cameraTypeSmart && cameraTypeSmart.checked) {
      partial.cameraType = 'smart';
    }

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

    var scenario = result.scenario; // 'a', 'b', 'c'

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
      var nodesDisplay =
        hardware && typeof hardware.nodesForCost === 'number'
          ? hardware.nodesForCost
          : result.nodesNeeded;
      nodesValueEl.textContent = String(nodesDisplay);
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

    // Optional TCO comparison against current provider based on Step 3 inputs.
    if (
      tcoSectionEl &&
      currentTcoValueEl &&
      sighthoundTcoValueEl &&
      typeof CalcCore.computeTcoComparison === 'function'
    ) {
      var rawSoftware = currentSoftwareInput && currentSoftwareInput.value !== ''
        ? Number(currentSoftwareInput.value)
        : 0;
      var rawHardware = currentHardwareInput && currentHardwareInput.value !== ''
        ? Number(currentHardwareInput.value)
        : 0;

      var hasCurrentCosts = (rawSoftware && rawSoftware > 0) || (rawHardware && rawHardware > 0);

      if (!hasCurrentCosts) {
        tcoSectionEl.classList.add('hidden');
        if (tcoSummaryEl) {
          tcoSummaryEl.textContent = 'Enter your current software and hardware costs in Step 3 to compare multi-month totals.';
        }
      } else {
        tcoSectionEl.classList.remove('hidden');

        var currentMonthly = 0;
        if (rawSoftware > 0) {
          currentMonthly = currentBilling === 'yearly'
            ? rawSoftware / 12
            : rawSoftware;
        }

        var comparison = CalcCore.computeTcoComparison({
          currentHardwareUpfront: rawHardware > 0 ? rawHardware : 0,
          currentMonthlyRecurring: currentMonthly,
          sighthoundHardwareUpfront: hardware.sighthoundTotal,
          sighthoundMonthlyRecurring: software.monthlyTotal,
          horizonMonths: TCO_HORIZON_MONTHS,
        });

        currentTcoValueEl.textContent = CalcCore.formatCurrency(comparison.currentTotal);
        sighthoundTcoValueEl.textContent = CalcCore.formatCurrency(comparison.sighthoundTotal);

        if (tcoSummaryEl) {
          var diff = comparison.diff;
          if (diff > 0) {
            tcoSummaryEl.textContent =
              'Based on your estimates, Sighthound cameras and nodes have a lower total cost of ownership of ' +
              CalcCore.formatCurrency(diff) +
              ' over ' +
              comparison.months +
              ' months compared to your current provider.';
          } else if (diff < 0) {
            var worse = CalcCore.formatCurrency(Math.abs(diff));
            tcoSummaryEl.textContent =
              'For Sighthound to be net savings on total cost of ownership, it must unlock at least ' +
              worse +
              ' in additional value over ' +
              comparison.months +
              ' months relative to your current provider.';
          } else {
            tcoSummaryEl.textContent =
              'Based on your estimates, Sighthound and your current provider have similar total cost over this period. Architecture and capability differences may still be material.';
          }
        }
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

  if (cameraTypeStandard) {
    cameraTypeStandard.addEventListener('change', handleInputChange);
  }
  if (cameraTypeSmart) {
    cameraTypeSmart.addEventListener('change', handleInputChange);
  }
  if (expandBreakdownCheckbox) {
    expandBreakdownCheckbox.addEventListener('change', handleInputChange);
  }

  // Nodes Auto/Manual toggle and explicit node count
  if (nodesAutoBtn) {
    nodesAutoBtn.addEventListener('click', function () {
      // Switching to Auto reverts hardware costs to use the recommended node
      // count from camera capacity but keeps any previously entered manual
      // value in case the user toggles back.
      markResultsStale();
      state.update({ nodesMode: 'auto' });
      // Re-hydrate Step 2 immediately so the input is disabled and shows the
      // recommended value without waiting for a full render cycle.
      hydrateFromParams(state.getParams());
    });
  }

  if (nodesManualBtn) {
    nodesManualBtn.addEventListener('click', function () {
      markResultsStale();
      var current = state.getParams();
      var cameras = current.cameras || 0;
      var recommended = CalcCore.calculateNodesNeeded
        ? CalcCore.calculateNodesNeeded(cameras)
        : 0;
      var nextNodes = typeof current.nodes === 'number' ? current.nodes : recommended;
      state.update({
        nodesMode: 'manual',
        nodes: nextNodes,
      });
      // Re-hydrate so the field is enabled and prefilled with either the
      // previous manual value or the recommended nodes.
      hydrateFromParams(state.getParams());
    });
  }

  if (nodesInput) {
    nodesInput.addEventListener('input', function () {
      markResultsStale();
      var value = readNumber(nodesInput);
      if (value === undefined) {
        state.update({ nodes: 0, nodesMode: 'manual' });
        return;
      }
      state.update({ nodes: value, nodesMode: 'manual' });
    });
    nodesInput.addEventListener('change', function () {
      var value = readNumber(nodesInput);
      if (value === undefined) {
        state.update({ nodes: 0, nodesMode: 'manual' });
        return;
      }
      state.update({ nodes: value, nodesMode: 'manual' });
    });
  }

  // Changes to current provider cost inputs do not touch canonical params, but
  // they should invalidate any previously shown estimate so users rerun the
  // analysis with updated values.
  if (currentSoftwareInput) {
    currentSoftwareInput.addEventListener('input', markResultsStale);
    currentSoftwareInput.addEventListener('change', markResultsStale);
  }
  if (currentHardwareInput) {
    currentHardwareInput.addEventListener('input', markResultsStale);
    currentHardwareInput.addEventListener('change', markResultsStale);
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

  // Current provider billing toggle is local-only (not stored in canonical params).
  if (currentBillingMonthlyBtn) {
    currentBillingMonthlyBtn.addEventListener('click', function () {
      currentBilling = 'monthly';
      currentBillingMonthlyBtn.classList.add('bg-white', 'border', 'border-slate-200', 'text-slate-800');
      currentBillingYearlyBtn && currentBillingYearlyBtn.classList.remove('bg-white', 'border', 'border-slate-200', 'text-slate-800');
      markResultsStale();
    });
  }
  if (currentBillingYearlyBtn) {
    currentBillingYearlyBtn.addEventListener('click', function () {
      currentBilling = 'yearly';
      currentBillingYearlyBtn.classList.add('bg-white', 'border', 'border-slate-200', 'text-slate-800');
      currentBillingMonthlyBtn && currentBillingMonthlyBtn.classList.remove('bg-white', 'border', 'border-slate-200', 'text-slate-800');
      markResultsStale();
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
        nodes: base.nodes || 0,
        nodesMode: base.nodesMode || 'auto',
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
