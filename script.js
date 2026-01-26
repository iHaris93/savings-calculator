(function () {
  if (typeof window === 'undefined') {
    return;
  }

  const CalcCore = window.SighthoundCalcCore;
  const StateSync = window.SighthoundStateSync;
  const Params = window.SighthoundParams;

  if (!CalcCore || !StateSync || !Params) {
    return;
  }

  const state = StateSync.initState();

  // Inputs
  const totalCamerasInput = document.getElementById('totalCameras');
  const smartCameraCostInput = document.getElementById('smartCameraCost');
  const dumbCameraCostInput = document.getElementById('dumbCameraCost');
  const existingCamerasToggle = document.getElementById('existingCamerasToggle'); // "Yes" option
  const existingCamerasToggleNo = document.getElementById('existingCamerasToggleNo'); // "No" option
  const smartCamerasToggle = document.getElementById('smartCamerasToggle'); // "Yes" option
  const smartCamerasToggleNo = document.getElementById('smartCamerasToggleNo'); // "No" option
  const cameraTypeExclusivityNote = document.getElementById('cameraTypeExclusivityNote');
  const resetCalculatorButton = document.getElementById('resetCalculatorButton');
  const softwareLprCheckbox = document.getElementById('softwareLpr');
  const softwareMmcgCheckbox = document.getElementById('softwareMmcg');
  const softwareBillingFrequencySelect = document.getElementById('softwareBillingFrequency');

  // Sections
  const sectionCurrentApproach = document.getElementById('sectionCurrentApproach');
  const sectionSighthound = document.getElementById('sectionSighthound');
  const standardIpCameraCostGroup = document.getElementById('standardIpCameraCostGroup');
  const scenarioBNote = document.getElementById('scenarioBNote');

  // Results containers
  const resultsPlaceholder = document.getElementById('resultsPlaceholder');
  const resultsPanel = document.getElementById('resultsPanel');

  // Cost comparison
  const todayLabelText = document.getElementById('todayLabelText');
  const sighthoundLabelText = document.getElementById('sighthoundLabelText');
  const currentTotalValue = document.getElementById('currentTotalValue');
  const sighthoundTotalValue = document.getElementById('sighthoundTotalValue');

  // Breakdown
  const breakdownToggle = document.getElementById('breakdownToggle');
  const breakdownPanel = document.getElementById('breakdownPanel');
  const breakdownHelper = document.getElementById('breakdownHelper');
  const todayBreakdownLine = document.getElementById('todayBreakdownLine');
  const sighthoundBreakdownNodes = document.getElementById('sighthoundBreakdownNodes');
  const sighthoundBreakdownCameras = document.getElementById('sighthoundBreakdownCameras');
  const softwareBreakdownHeading = document.getElementById('softwareBreakdownHeading');
  const softwareBreakdownLine = document.getElementById('softwareBreakdownLine');

  // Primary savings card
  const primaryCard = document.getElementById('primaryCard');
  const primaryLabelText = document.getElementById('primaryLabelText');
  const primaryValue = document.getElementById('primaryValue');
  const primaryArrow = document.getElementById('primaryArrow');
  const primaryArrowIcon = document.getElementById('primaryArrowIcon');
  const recommendationText = document.getElementById('recommendationText');

  // Deployment details
  const nodesNeededValue = document.getElementById('nodesNeededValue');
  const percentReductionGroup = document.getElementById('percentReductionGroup');
  const percentReductionValue = document.getElementById('percentReductionValue');
  const percentArrowIcon = document.getElementById('percentArrowIcon');
  const costPerCameraLabel = document.getElementById('costPerCameraLabel');
  const costPerCameraBeforeRow = document.getElementById('costPerCameraBeforeRow');
  const costPerCameraAfterRow = document.getElementById('costPerCameraAfterRow');
  const costPerCameraBeforeValue = document.getElementById('costPerCameraBeforeValue');
  const costPerCameraAfterValue = document.getElementById('costPerCameraAfterValue');
  const deploymentDetailsIntro = document.getElementById('deploymentDetailsIntro');

  // Software overview
  const softwareOverview = document.getElementById('softwareOverview');
  const softwareOverviewHeading = document.getElementById('softwareOverviewHeading');
  const softwareRecurringSummary = document.getElementById('softwareRecurringSummary');
  const softwareBillingNote = document.getElementById('softwareBillingNote');

  // Misc
  const downloadPdfButton = document.getElementById('downloadPdfButton');
  const helperToggleButtons = document.querySelectorAll('[data-helper-target]');

  const DEFAULTS = Params.DEFAULTS || {};

  function assertUrlParityGuard(state) {
    if (!state || !Params || typeof Params.assertCanonicalRoundTrip !== 'function') {
      return;
    }
    try {
      Params.assertCanonicalRoundTrip(state.getParams());
    } catch (_err) {
      // Guard is best-effort only.
    }
    state.subscribe((params) => {
      try {
        Params.assertCanonicalRoundTrip(params);
      } catch (_err) {
        // Never throw from diagnostics.
      }
    });
  }

  function setSectionEnabled(sectionEl, enabled) {
    if (!sectionEl) return;
    if (enabled) {
      sectionEl.classList.remove('opacity-60', 'pointer-events-none');
    } else {
      sectionEl.classList.add('opacity-60', 'pointer-events-none');
    }
  }

  function show(el) {
    if (!el) return;
    el.classList.remove('hidden');
  }

  function hide(el) {
    if (!el) return;
    el.classList.add('hidden');
  }

  function render(params) {
    const p = params || state.getParams();

    // Hydrate inputs from state
    if (totalCamerasInput) {
      totalCamerasInput.value = p.cameras > 0 ? String(p.cameras) : '';
    }
    if (smartCameraCostInput) {
      smartCameraCostInput.value = typeof p.smartCost === 'number' ? p.smartCost : DEFAULTS.smartCost;
    }
    if (dumbCameraCostInput) {
      dumbCameraCostInput.value = typeof p.ipCost === 'number' ? p.ipCost : DEFAULTS.ipCost;
    }
    if (existingCamerasToggle) {
      existingCamerasToggle.checked = !!p.hasExistingCameras;
    }
    if (existingCamerasToggleNo) {
      existingCamerasToggleNo.checked = !p.hasExistingCameras;
    }
    if (smartCamerasToggle) {
      smartCamerasToggle.checked = !!p.hasSmartCameras;
    }
    if (smartCamerasToggleNo) {
      smartCamerasToggleNo.checked = !p.hasSmartCameras;
    }

    if (softwareLprCheckbox && softwareMmcgCheckbox) {
      const selection = (p.software || 'none').toLowerCase();
      softwareLprCheckbox.checked = selection === 'lpr' || selection === 'both';
      softwareMmcgCheckbox.checked = selection === 'mmcg' || selection === 'both';
    }

    if (softwareBillingFrequencySelect) {
      softwareBillingFrequencySelect.value = p.billing === 'yearly' ? 'yearly' : 'monthly';
    }

    // Breakdown expanded state from URL state
    if (breakdownPanel && breakdownToggle) {
      const expanded = !!p.expandBreakdown;
      if (expanded) {
        show(breakdownPanel);
        breakdownToggle.textContent = 'Hide breakdown';
        breakdownToggle.setAttribute('aria-expanded', 'true');
      } else {
        hide(breakdownPanel);
        breakdownToggle.textContent = 'Show breakdown';
        breakdownToggle.setAttribute('aria-expanded', 'false');
      }
    }

    const hasValidCameras = p.cameras >= 1;

    setSectionEnabled(sectionCurrentApproach, hasValidCameras);
    setSectionEnabled(sectionSighthound, hasValidCameras);

    if (!hasValidCameras) {
      show(resultsPlaceholder);
      hide(resultsPanel);
      if (recommendationText) {
        recommendationText.textContent = 'Enter a camera count between 1 and 10,000 and valid hardware costs to see the estimate.';
      }
      if (softwareOverview && softwareRecurringSummary) {
        show(softwareOverview);
        softwareRecurringSummary.textContent = 'Software cost will appear here once cameras are entered.';
      }
      if (softwareBreakdownLine) {
        softwareBreakdownLine.textContent = 'Your software costs are calculated per camera per month and shown separately from hardware.';
      }
      if (nodesNeededValue) nodesNeededValue.textContent = '0';
      if (percentReductionValue) percentReductionValue.textContent = '0.0%';
      if (currentTotalValue) currentTotalValue.textContent = '$0.00';
      if (sighthoundTotalValue) sighthoundTotalValue.textContent = '$0.00';
      if (costPerCameraBeforeValue) costPerCameraBeforeValue.textContent = '$0.00';
      if (costPerCameraAfterValue) costPerCameraAfterValue.textContent = '$0.00';
      if (primaryCard) hide(primaryCard);
      return;
    }

    const result = CalcCore.computeScenarioResults(p);
    const scenario = result.scenario; // 'a' | 'b' | 'c'

    // In Live view, the smart camera cost input and "Current approach" section are
    // only relevant for Scenario A (smart cameras today). Hide that section for B/C
    // so we don't imply a smart-camera baseline where it isn't used.
    if (sectionCurrentApproach) {
      if (scenario === 'a' && hasValidCameras) {
        sectionCurrentApproach.classList.remove('hidden');
      } else {
        sectionCurrentApproach.classList.add('hidden');
      }
    }
    const hardware = result.hardware;
    const software = result.software;
    const breakdown = result.breakdown;
    const isSavingsPositiveOrZero = hardware.savings >= 0;

    hide(resultsPlaceholder);
    show(resultsPanel);

    // Scenario-specific labels
    if (deploymentDetailsIntro && hardware.labels && hardware.labels.deploymentIntro) {
      deploymentDetailsIntro.textContent = hardware.labels.deploymentIntro;
    }

    if (todayLabelText && hardware.labels) {
      todayLabelText.textContent = hardware.labels.todayLabel;
    }
    if (sighthoundLabelText && hardware.labels) {
      sighthoundLabelText.textContent = hardware.labels.sighthoundLabel;
    }

    // Camera cost input helper: always allow editing IP camera cost even when
    // reusing existing cameras. Scenario B messaging is handled via scenarioBNote.
    if (standardIpCameraCostGroup) {
      show(standardIpCameraCostGroup);
      standardIpCameraCostGroup.classList.remove('opacity-60', 'pointer-events-none');
    }
    if (scenarioBNote) {
      if (scenario === 'b') show(scenarioBNote); else hide(scenarioBNote);
    }

    // Primary savings card
    if (primaryCard) {
      if (scenario === 'a') {
        show(primaryCard);
        if (primaryLabelText && hardware.labels) {
          primaryLabelText.textContent = hardware.labels.primaryLabel || (isSavingsPositiveOrZero ? 'Savings vs today' : 'Extra cost vs today');
        }
        if (primaryValue) {
          primaryValue.textContent = CalcCore.formatCurrency(Math.abs(hardware.savings));
        }
        if (recommendationText) {
          if (isSavingsPositiveOrZero) {
            recommendationText.textContent = 'Based on these inputs, Sighthound Compute Node + standard IP cameras has a lower upfront hardware cost than smart AI cameras.';
          } else {
            recommendationText.textContent = 'Based on these inputs, Sighthound Compute Node + standard IP cameras has a higher upfront hardware cost than smart AI cameras.';
          }
        }
        if (primaryArrow && primaryArrowIcon) {
          primaryArrow.className =
            'inline-flex h-8 w-8 items-center justify-center rounded-full ' +
            (isSavingsPositiveOrZero ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600');
          primaryArrowIcon.className =
            'h-4 w-4 transition-transform duration-150' +
            (isSavingsPositiveOrZero ? '' : ' rotate-180');
        }
      } else {
        hide(primaryCard);
      }
    }

    // Cost comparison numbers
    if (scenario === 'a') {
      if (currentTotalValue) currentTotalValue.textContent = CalcCore.formatCurrency(hardware.todayTotal);
      if (sighthoundTotalValue) sighthoundTotalValue.textContent = CalcCore.formatCurrency(hardware.sighthoundTotal);
    } else if (scenario === 'b') {
      if (currentTotalValue) currentTotalValue.textContent = 'Already installed';
      if (sighthoundTotalValue) sighthoundTotalValue.textContent = CalcCore.formatCurrency(hardware.sighthoundTotal);
    } else {
      if (currentTotalValue) currentTotalValue.textContent = 'No current cameras (new deployment)';
      if (sighthoundTotalValue) sighthoundTotalValue.textContent = CalcCore.formatCurrency(hardware.sighthoundTotal);
    }

    // Breakdown lines
    if (todayBreakdownLine && breakdown.todayLine) {
      todayBreakdownLine.textContent = breakdown.todayLine;
    }
    if (sighthoundBreakdownNodes && breakdown.nodesLine) {
      sighthoundBreakdownNodes.textContent = breakdown.nodesLine;
    }
    if (sighthoundBreakdownCameras && breakdown.camerasLine) {
      sighthoundBreakdownCameras.textContent = breakdown.camerasLine;
    }

    // Nodes and percent reduction
    if (nodesNeededValue) {
      nodesNeededValue.textContent = String(result.nodesNeeded);
    }

    if (percentReductionGroup) {
      if (scenario === 'a') {
        show(percentReductionGroup);
        if (percentReductionValue) {
          percentReductionValue.textContent = CalcCore.formatPercent(hardware.percentReduction);
          percentReductionValue.className =
            'font-medium tabular-nums ' +
            (isSavingsPositiveOrZero ? 'text-emerald-600' : 'text-rose-600');
        }
        if (percentArrowIcon) {
          const arrowSvg = percentArrowIcon.querySelector('svg');
          percentArrowIcon.className =
            'inline-flex h-5 w-5 items-center justify-center rounded-full ' +
            (isSavingsPositiveOrZero ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600');
          if (arrowSvg) {
            arrowSvg.className =
              'h-3 w-3 transition-transform duration-150' +
              (isSavingsPositiveOrZero ? '' : ' rotate-180');
          }
        }
      } else {
        hide(percentReductionGroup);
      }
    }

    // Cost per camera
    if (costPerCameraLabel && hardware.labels) {
      costPerCameraLabel.textContent = hardware.labels.costPerCameraLabel;
    }

    if (scenario === 'a') {
      show(costPerCameraBeforeRow);
      show(costPerCameraAfterRow);
    } else {
      hide(costPerCameraBeforeRow);
      show(costPerCameraAfterRow);
    }

    if (costPerCameraBeforeValue) {
      costPerCameraBeforeValue.textContent = CalcCore.formatCurrency(hardware.costPerCameraBefore);
    }
    if (costPerCameraAfterValue) {
      costPerCameraAfterValue.textContent = CalcCore.formatCurrency(hardware.costPerCameraAfter);
    }

    // Software overview
    if (softwareOverview) {
      show(softwareOverview);
      const billing = p.billing === 'yearly' ? 'yearly' : 'monthly';
      const cameras = result.cameras;
      let effectiveTotal = 0;
      let frequencyLabel = 'per month';
      let frequencyUiLabel = 'monthly';

      if (billing === 'yearly') {
        effectiveTotal = software.yearlyTotal;
        frequencyLabel = 'per year';
        frequencyUiLabel = 'annual (estimated)';
      } else {
        effectiveTotal = software.monthlyTotal;
        frequencyLabel = 'per month';
        frequencyUiLabel = 'monthly';
      }

      if (softwareOverviewHeading) {
        softwareOverviewHeading.textContent = `Your software costs (recurring  ${frequencyUiLabel})`;
      }

      if (softwareRecurringSummary) {
        if (effectiveTotal > 0 && cameras > 0) {
          softwareRecurringSummary.textContent =
            'Your software costs: ' +
            CalcCore.formatCurrency(effectiveTotal) +
            ` ${frequencyLabel} for ${cameras.toLocaleString('en-US')} cameras.`;
        } else {
          softwareRecurringSummary.textContent = 'Software cost will appear here once cameras are entered.';
        }
      }

      if (softwareBillingNote) {
        // Keep existing copy intact
        softwareBillingNote.textContent = 'Software is billed per camera (per stream). Hardware and software costs are kept separate in all totals.';
      }
    }

    if (softwareBreakdownHeading) {
      softwareBreakdownHeading.textContent = 'Your software costs (recurring)';
    }
    if (softwareBreakdownLine && breakdown.softwareLine) {
      softwareBreakdownLine.textContent = breakdown.softwareLine;
    }
  }

  // Helper toggles
  if (helperToggleButtons && helperToggleButtons.length) {
    helperToggleButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-helper-target');
        if (!targetId) return;
        const target = document.getElementById(targetId);
        if (!target) return;
        if (target.classList.contains('hidden')) {
          show(target);
        } else {
          hide(target);
        }
      });
    });
  }

  // Breakdown toggle -> URL-backed expandBreakdown
  if (breakdownToggle && breakdownPanel) {
    breakdownToggle.addEventListener('click', () => {
      const params = state.getParams();
      const next = params.expandBreakdown ? 0 : 1;
      state.update({ expandBreakdown: next });
    });
  }

  // Reset button
  if (resetCalculatorButton) {
    resetCalculatorButton.addEventListener('click', () => {
      const base = Params.DEFAULTS || {};
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
      if (cameraTypeExclusivityNote) hide(cameraTypeExclusivityNote);
    });
  }

  // Download PDF using shared print template
  if (downloadPdfButton && window.SighthoundPdf && typeof window.SighthoundPdf.prepareAndPrintPdf === 'function') {
    downloadPdfButton.addEventListener('click', () => {
      window.SighthoundPdf.prepareAndPrintPdf(state);
    });
  }

  // Camera type toggles (mutually exclusive)
  // Camera type toggles (mutually exclusive between "Yes" answers). Each
  // question now has explicit Yes/No options; answering "Yes" on one will
  // automatically set "No" on the other when they conflict.
  if (existingCamerasToggle) {
    existingCamerasToggle.addEventListener('change', () => {
      if (!existingCamerasToggle.checked) return;
      const params = state.getParams();
      const partial = { hasExistingCameras: 1 };
      let autoCorrected = false;
      if (params.hasSmartCameras) {
        partial.hasSmartCameras = 0;
        autoCorrected = true;
      }
      if (cameraTypeExclusivityNote) {
        if (autoCorrected) show(cameraTypeExclusivityNote); else hide(cameraTypeExclusivityNote);
      }
      state.update(partial);
    });
  }
  if (existingCamerasToggleNo) {
    existingCamerasToggleNo.addEventListener('change', () => {
      if (!existingCamerasToggleNo.checked) return;
      state.update({ hasExistingCameras: 0 });
      if (cameraTypeExclusivityNote) hide(cameraTypeExclusivityNote);
    });
  }

  if (smartCamerasToggle) {
    smartCamerasToggle.addEventListener('change', () => {
      if (!smartCamerasToggle.checked) return;
      const params = state.getParams();
      const partial = { hasSmartCameras: 1 };
      let autoCorrected = false;
      if (params.hasExistingCameras) {
        partial.hasExistingCameras = 0;
        autoCorrected = true;
      }
      if (cameraTypeExclusivityNote) {
        if (autoCorrected) show(cameraTypeExclusivityNote); else hide(cameraTypeExclusivityNote);
      }
      state.update(partial);
    });
  }
  if (smartCamerasToggleNo) {
    smartCamerasToggleNo.addEventListener('change', () => {
      if (!smartCamerasToggleNo.checked) return;
      state.update({ hasSmartCameras: 0 });
      if (cameraTypeExclusivityNote) hide(cameraTypeExclusivityNote);
    });
  }

  // Input handlers -> state.update()
  if (totalCamerasInput) {
    const handler = () => {
      state.update({ cameras: totalCamerasInput.value });
    };
    totalCamerasInput.addEventListener('input', handler);
    totalCamerasInput.addEventListener('change', handler);
  }

  if (smartCameraCostInput) {
    const handler = () => {
      state.update({ smartCost: smartCameraCostInput.value });
    };
    smartCameraCostInput.addEventListener('input', handler);
    smartCameraCostInput.addEventListener('change', handler);
  }

  if (dumbCameraCostInput) {
    const handler = () => {
      state.update({ ipCost: dumbCameraCostInput.value });
    };
    dumbCameraCostInput.addEventListener('input', handler);
    dumbCameraCostInput.addEventListener('change', handler);
  }

  function deriveSoftwareSelectionFromCheckboxes() {
    const lpr = softwareLprCheckbox && softwareLprCheckbox.checked;
    const mmcg = softwareMmcgCheckbox && softwareMmcgCheckbox.checked;
    if (lpr && mmcg) return 'both';
    if (lpr) return 'lpr';
    if (mmcg) return 'mmcg';
    return 'none';
  }

  function handleSoftwareCheckboxChange() {
    const selection = deriveSoftwareSelectionFromCheckboxes();
    state.update({ software: selection });
  }

  if (softwareLprCheckbox) {
    softwareLprCheckbox.addEventListener('change', handleSoftwareCheckboxChange);
  }
  if (softwareMmcgCheckbox) {
    softwareMmcgCheckbox.addEventListener('change', handleSoftwareCheckboxChange);
  }

  if (softwareBillingFrequencySelect) {
    softwareBillingFrequencySelect.addEventListener('change', () => {
      state.update({ billing: softwareBillingFrequencySelect.value });
    });
  }

  // Subscribe to state changes and render
  state.subscribe(render);
  render(state.getParams());

  // Dev-only: guard against URL/params drift using canonical round-trip.
  assertUrlParityGuard(state);
})();
