(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  }
  if (typeof root !== 'undefined') {
    root.SighthoundCalcCore = factory();
  }
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  // Locked hardware constants
  const CAMERAS_PER_NODE = 4;
  const NODE_COST = 3500;

  // Software pricing (per camera, per month)
  const SOFTWARE_PRICING = {
    none: 0,
    lpr: 30,
    mmcg: 30,
    both: 55,
  };

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  function formatCurrency(value) {
    const n = Number.isFinite(value) ? value : 0;
    return currencyFormatter.format(n);
  }

  function formatPercent(value) {
    const n = Number.isFinite(value) ? value : 0;
    return n.toFixed(1) + '%';
  }

  function toNonNegativeInt(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.floor(n);
  }

  function toNonNegativeNumber(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return fallback;
    return n;
  }

  function calculateNodesNeeded(cameras) {
    const cams = toNonNegativeInt(cameras);
    if (cams === 0) return 0;
    return Math.ceil(cams / CAMERAS_PER_NODE);
  }

  function getSoftwareMonthlyPricePerCamera(selectionRaw) {
    const key = String(selectionRaw || '').toLowerCase();
    if (key === 'both') return SOFTWARE_PRICING.both;
    if (key === 'lpr' || key === 'mmcg') return SOFTWARE_PRICING.lpr;
    if (key === 'none') return SOFTWARE_PRICING.none;
    // Fallback to single-service pricing
    return SOFTWARE_PRICING.lpr;
  }

  function deriveScenario(params) {
    const hasSmart = !!(params && Number(params.hasSmartCameras));
    const hasExisting = !!(params && Number(params.hasExistingCameras));

    if (hasSmart) return 'a';
    if (hasExisting) return 'b';
    return 'c';
  }

  function computeHardware(params) {
    const cameras = toNonNegativeInt(params.cameras);
    const smartCost = toNonNegativeNumber(params.smartCost, 3000);
    const ipCost = toNonNegativeNumber(params.ipCost, 250);
    const scenario = deriveScenario(params);

    // Camera hardware preference for the Sighthound path.
    const cameraTypeRaw = params && typeof params.cameraType === 'string'
      ? params.cameraType.toLowerCase()
      : '';
    const cameraType = cameraTypeRaw === 'smart' ? 'smart' : 'standard';

    // Recommended node count strictly from camera capacity.
    const nodesNeeded = calculateNodesNeeded(cameras);

    // Optional explicit node configuration from params. When nodesMode is
    // "manual", hardware costs use this configured value; otherwise they use
    // the recommended count above.
    const nodesConfigured = toNonNegativeInt(params.nodes);
    const nodesModeRaw = params && typeof params.nodesMode === 'string'
      ? params.nodesMode.toLowerCase()
      : '';
    const nodesMode = nodesModeRaw === 'manual' ? 'manual' : 'auto';
    const nodesForCost = nodesMode === 'manual' ? nodesConfigured : nodesNeeded;

    const nodesHardwareTotal = nodesForCost * NODE_COST;

    // Match existing Live implementation math:
    // - "Today" total is always smart cameras today: cameras * smartCost
    // - Sighthound hardware is nodes + cameras, except when reusing cameras (scenario B).
    let todayTotal = cameras * smartCost;
    let sighthoundCameraHardwareTotal = 0;

    // Camera unit cost used on the Sighthound side, based on cameraType.
    const sighthoundCameraUnitCost = cameraType === 'smart' ? smartCost : ipCost;

    // For all scenarios, the Sighthound path uses the selected camera type
    // (standard IP or smart) plus optional Compute Nodes. Scenario A still
    // compares against an "existing smart cameras" baseline, while B and C
    // reuse their own labels but share the same Sighthound hardware math.
    sighthoundCameraHardwareTotal = cameras * sighthoundCameraUnitCost;

    const sighthoundTotal = nodesHardwareTotal + sighthoundCameraHardwareTotal;

    let savings = 0;
    let percentReduction = 0;
    let costPerCameraBefore = 0;

    if (cameras > 0) {
      savings = todayTotal - sighthoundTotal;
      percentReduction = todayTotal === 0 ? 0 : (savings / todayTotal) * 100;
      costPerCameraBefore = todayTotal / cameras;
    }

    const costPerCameraAfter = cameras > 0 ? sighthoundTotal / cameras : 0;

    // Scenario-specific labels used by the UI layer
    let todayLabel;
    let sighthoundLabel;
    let primaryLabel;
    let costPerCameraLabel;
    let deploymentIntro;

    if (scenario === 'a') {
      todayLabel = 'Existing smart cameras';
      sighthoundLabel = 'With Sighthound hardware';
      primaryLabel = savings >= 0 ? 'Savings vs today' : 'Extra cost vs today';
      costPerCameraLabel = 'Cost per camera (hardware only)';
      deploymentIntro =
        'A quick breakdown of Compute Nodes required, cost reduction, and cost per camera.';
    } else if (scenario === 'b') {
      todayLabel = 'Existing camera hardware';
      sighthoundLabel = 'Upfront node cost';
      primaryLabel = '';
      costPerCameraLabel = 'Effective per-camera enablement cost (hardware only)';
      deploymentIntro =
        'How many Compute Nodes you need and the effective hardware cost to enable analytics on existing cameras.';
    } else {
      todayLabel = 'Existing camera hardware';
      sighthoundLabel = 'New deployment hardware cost (nodes + cameras)';
      primaryLabel = '';
      costPerCameraLabel = 'Cost per camera (hardware only)';
      deploymentIntro =
        'How many Compute Nodes you need and the average hardware cost per camera for this deployment.';
    }

    const labels = {
      todayLabel,
      sighthoundLabel,
      primaryLabel,
      costPerCameraLabel,
      deploymentIntro,
    };

    return {
      scenario,
      cameras,
      // nodesNeeded is the recommended count based purely on camera capacity
      // and is used for capacity/"Nodes required" displays.
      nodesNeeded,
      // nodesConfigured and nodesMode describe the override state coming from
      // the UI/canonical params.
      nodesConfigured,
      nodesMode,
      // nodesForCost is the actual node quantity used when computing hardware
      // totals and breakdown lines.
      nodesForCost,
      todayTotal,
      sighthoundTotal,
      savings,
      percentReduction,
      costPerCameraBefore,
      costPerCameraAfter,
      labels,
    };
  }

  function computeSoftware(params, cameras) {
    const selectionRaw = params.software || 'none';
    const billing = (params.billing || 'monthly').toLowerCase() === 'yearly'
      ? 'yearly'
      : 'monthly';

    const monthlyPerCamera = getSoftwareMonthlyPricePerCamera(selectionRaw);
    const monthlyTotal = cameras > 0 ? cameras * monthlyPerCamera : 0;
    const yearlyTotal = monthlyTotal * 12;

    // Breakdown line mirrors existing behavior textually.
    let softwareLine;
    if (monthlyTotal > 0 && cameras > 0) {
      if (billing === 'yearly') {
        const perCameraYearly = yearlyTotal / cameras;
        softwareLine =
          'Your software costs: ' +
          cameras.toLocaleString('en-US') +
          ' x ' +
          formatCurrency(perCameraYearly) +
          ' per camera per year = ' +
          formatCurrency(yearlyTotal) +
          ' per year.';
      } else {
        const perCameraMonthly = monthlyTotal / cameras;
        softwareLine =
          'Your software costs: ' +
          cameras.toLocaleString('en-US') +
          ' x ' +
          formatCurrency(perCameraMonthly) +
          ' per camera per month = ' +
          formatCurrency(monthlyTotal) +
          ' per month.';
      }
    } else {
      softwareLine =
        'Your software costs are calculated per camera per month and shown separately from hardware.';
    }

    return {
      selection: String(selectionRaw || 'both').toLowerCase(),
      monthlyPerCamera,
      monthlyTotal,
      yearlyTotal,
      billing,
      softwareLine,
    };
  }

  function computeScenarioResults(params) {
    const normalized = params || {};
    const hardware = computeHardware(normalized);
    const software = computeSoftware(normalized, hardware.cameras);

    const todayLine = (function () {
      const cams = hardware.cameras;
      const smartCost = toNonNegativeNumber(normalized.smartCost, 3000);
      if (hardware.scenario === 'a') {
        const subtotal = cams * smartCost;
        return (
          'Cameras: ' +
          cams.toLocaleString('en-US') +
          ' x ' +
          formatCurrency(smartCost) +
          ' = ' +
          formatCurrency(subtotal)
        );
      }
      if (hardware.scenario === 'b') {
        return 'Existing cameras: already installed (no new camera hardware cost modeled here).';
      }
      // Scenario C: new deployment (no existing cameras baseline)
      return 'No existing cameras (new deployment).';
    })();

    const nodesLine = (function () {
      const nodesForCost =
        typeof hardware.nodesForCost === 'number'
          ? hardware.nodesForCost
          : hardware.nodesNeeded;
      const base =
        'Compute Nodes: ' +
        nodesForCost.toLocaleString('en-US') +
        ' x ' +
        formatCurrency(NODE_COST) +
        ' = ' +
        formatCurrency(nodesForCost * NODE_COST);

      // When a manual override is in effect and it differs from the
      // recommendation, include a short note so users can see both values in
      // the breakdown and PDF.
      if (
        hardware.nodesMode === 'manual' &&
        typeof hardware.nodesConfigured === 'number' &&
        typeof hardware.nodesNeeded === 'number' &&
        hardware.nodesConfigured !== hardware.nodesNeeded &&
        hardware.cameras > 0
      ) {
        return (
          base +
          ' (recommended: ' +
          hardware.nodesNeeded.toLocaleString('en-US') +
          ' based on camera count)'
        );
      }

      return base;
    })();

    const camerasLine = (function () {
      const cams = hardware.cameras;
      const ipCost = toNonNegativeNumber(normalized.ipCost, 250);
      const subtotal = cams * ipCost;
      return (
        'Standard IP cameras: ' +
        cams.toLocaleString('en-US') +
        ' x ' +
        formatCurrency(ipCost) +
        ' = ' +
        formatCurrency(subtotal)
      );
    })();

    const breakdown = {
      todayLine,
      nodesLine,
      camerasLine,
      softwareLine: software.softwareLine,
    };

    return {
      scenario: hardware.scenario,
      cameras: hardware.cameras,
      nodesNeeded: hardware.nodesNeeded,
      hardware: {
        todayTotal: hardware.todayTotal,
        sighthoundTotal: hardware.sighthoundTotal,
        savings: hardware.savings,
        percentReduction: hardware.percentReduction,
        costPerCameraBefore: hardware.costPerCameraBefore,
        costPerCameraAfter: hardware.costPerCameraAfter,
        labels: hardware.labels,
      },
      software: {
        selection: software.selection,
        monthlyPerCamera: software.monthlyPerCamera,
        monthlyTotal: software.monthlyTotal,
        yearlyTotal: software.yearlyTotal,
      },
      breakdown,
      formatters: {
        formatCurrency,
        formatPercent,
      },
    };
  }

  function computeTcoComparison(input) {
    const src = input || {};
    const monthsRaw = src.horizonMonths;
    const months = monthsRaw && monthsRaw > 0 ? Math.floor(monthsRaw) : 12;

    const currentHardwareUpfront = toNonNegativeNumber(
      src.currentHardwareUpfront,
      0,
      0
    );
    const sighthoundHardwareUpfront = toNonNegativeNumber(
      src.sighthoundHardwareUpfront,
      0,
      0
    );
    const currentMonthlyRecurring = toNonNegativeNumber(
      src.currentMonthlyRecurring,
      0,
      0
    );
    const sighthoundMonthlyRecurring = toNonNegativeNumber(
      src.sighthoundMonthlyRecurring,
      0,
      0
    );

    const currentTotal = currentHardwareUpfront + currentMonthlyRecurring * months;
    const sighthoundTotal =
      sighthoundHardwareUpfront + sighthoundMonthlyRecurring * months;
    const diff = currentTotal - sighthoundTotal;
    const monthlyDiff = months > 0 ? diff / months : 0;
    const hardwareDiff = currentHardwareUpfront - sighthoundHardwareUpfront;

    return {
      months,
      currentTotal,
      sighthoundTotal,
      diff,
      monthlyDiff,
      hardwareDiff,
    };
  }

  return {
    CAMERAS_PER_NODE,
    NODE_COST,
    getSoftwareMonthlyPricePerCamera,
    calculateNodesNeeded,
    deriveScenario,
    computeScenarioResults,
    computeTcoComparison,
    formatCurrency,
    formatPercent,
  };
});
