(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  }
  if (typeof root !== 'undefined') {
    root.SighthoundParams = factory();
  }
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  const DEFAULTS = {
    cameras: 0,
    hasExistingCameras: 0,
    hasSmartCameras: 0,
    // Optional explicit node count. When 0 and nodesMode === 'auto', nodes are
    // derived from camera count via the fixed CAMERAS_PER_NODE rule.
    nodes: 0,
    // nodesMode controls whether hardware costs use the recommended node count
    // from camera capacity ("auto") or an explicit override from `nodes`
    // ("manual"). Guided and Live now default to manual nodes so users
    // explicitly choose when to add Compute Nodes.
    nodesMode: 'manual',
    // Camera hardware preference used for Sighthound math in the guided flow.
    // "standard" -> standard IP cameras at ipCost, "smart" -> Sighthound
    // Smart cameras at smartCost.
    cameraType: 'standard',
    smartCost: 3000,
    ipCost: 250,
    software: 'none',
    billing: 'monthly',
    expandBreakdown: 0,
    showAssumptions: 0,
  };

  const ORDER = [
    'cameras',
    'hasExistingCameras',
    'hasSmartCameras',
    'nodes',
    'nodesMode',
    'cameraType',
    'smartCost',
    'ipCost',
    'software',
    'billing',
    'expandBreakdown',
    'showAssumptions',
  ];

  function toInt(value, defaultValue, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return defaultValue;
    let v = Math.trunc(n);
    if (min !== undefined && v < min) v = min;
    if (max !== undefined && v > max) v = max;
    return v;
  }

  function toNumber(value, defaultValue, min) {
    const n = Number(value);
    if (!Number.isFinite(n)) return defaultValue;
    if (min !== undefined && n < min) return defaultValue;
    return n;
  }

  function toFlag(value, defaultValue) {
    if (value === undefined || value === null || value === '') return defaultValue;
    const s = String(value).toLowerCase();
    if (s === '1' || s === 'true' || s === 'yes') return 1;
    if (s === '0' || s === 'false' || s === 'no') return 0;
    return defaultValue;
  }

  function readParamsFromUrl(search) {
    const out = {};
    if (typeof search !== 'string') return out;
    const query = search.startsWith('?') ? search.slice(1) : search;
    if (!query) return out;

    let sp;
    try {
      sp = new URLSearchParams(query);
    } catch (e) {
      return out;
    }

    ORDER.forEach((key) => {
      const v = sp.get(key);
      if (v !== null) {
        out[key] = v;
      }
    });

    return out;
  }

  function normalizeParams(raw) {
    const src = raw || {};
    const normalized = { ...DEFAULTS };

    normalized.cameras = toInt(src.cameras, DEFAULTS.cameras, 0, 10000);

    // Optional explicit node count. When nodesMode is 'auto', this value is
    // ignored for cost calculations but preserved for URL round-tripping.
    normalized.nodes = toInt(src.nodes, DEFAULTS.nodes, 0, 10000);

    // nodesMode: "manual" only when explicitly requested; otherwise default to
    // "auto" so existing URLs remain compatible.
    var nodesModeRaw = (src.nodesMode || DEFAULTS.nodesMode).toString().toLowerCase();
    normalized.nodesMode = nodesModeRaw === 'manual' ? 'manual' : 'auto';

    // Camera hardware preference for Sighthound path.
    var cameraTypeRaw = (src.cameraType || DEFAULTS.cameraType).toString().toLowerCase();
    normalized.cameraType = cameraTypeRaw === 'smart' ? 'smart' : 'standard';

    normalized.hasExistingCameras = toFlag(
      src.hasExistingCameras,
      DEFAULTS.hasExistingCameras
    );
    normalized.hasSmartCameras = toFlag(
      src.hasSmartCameras,
      DEFAULTS.hasSmartCameras
    );

    // Enforce mutual exclusivity: smart cameras take precedence over existing standard IP.
    if (normalized.hasSmartCameras && normalized.hasExistingCameras) {
      normalized.hasExistingCameras = 0;
    }

    normalized.smartCost = toNumber(src.smartCost, DEFAULTS.smartCost, 0);
    normalized.ipCost = toNumber(src.ipCost, DEFAULTS.ipCost, 0);

    const softwareRaw = (src.software || DEFAULTS.software).toString().toLowerCase();
    if (softwareRaw === 'none' || softwareRaw === 'lpr' || softwareRaw === 'mmcg' || softwareRaw === 'both') {
      normalized.software = softwareRaw;
    } else {
      normalized.software = DEFAULTS.software;
    }

    const billingRaw = (src.billing || DEFAULTS.billing).toString().toLowerCase();
    normalized.billing = billingRaw === 'yearly' ? 'yearly' : 'monthly';

    normalized.expandBreakdown = toFlag(src.expandBreakdown, DEFAULTS.expandBreakdown);
    normalized.showAssumptions = toFlag(src.showAssumptions, DEFAULTS.showAssumptions);

    return normalized;
  }

  function buildSearchFromParams(params) {
    const p = normalizeParams(params);
    const sp = new URLSearchParams();

    ORDER.forEach((key) => {
      const value = p[key];
      const def = DEFAULTS[key];

      if (key === 'cameras') {
        if (value > 0) sp.set(key, String(value));
        return;
      }

      if (key === 'nodes') {
        // Only persist a node count when it is non-zero so URLs remain compact.
        // The nodesMode flag distinguishes auto vs manual behavior, including
        // the edge case of a manual 0-node configuration.
        if (value > 0) sp.set(key, String(value));
        return;
      }

      if (key === 'nodesMode') {
        // Only persist non-default modes.
        if (value && value !== DEFAULTS.nodesMode) {
          sp.set(key, String(value));
        }
        return;
      }

      if (
        key === 'hasExistingCameras' ||
        key === 'hasSmartCameras' ||
        key === 'expandBreakdown' ||
        key === 'showAssumptions'
      ) {
        if (value === 1) sp.set(key, '1');
        return;
      }

      const isDefault = String(value) === String(def);
      if (isDefault) return;

      sp.set(key, String(value));
    });

    return sp.toString();
  }

  function assertCanonicalRoundTrip(params) {
    // Dev-only guard to detect drift between canonical params and URL round-trip.
    try {
      const inputNormalized = normalizeParams(params || {});
      const canonicalInput = {};
      ORDER.forEach((key) => {
        canonicalInput[key] = inputNormalized[key];
      });

      const search = buildSearchFromParams(canonicalInput);
      const roundTrippedRaw = readParamsFromUrl(search ? '?' + search : '');
      const roundTrippedNormalized = normalizeParams(roundTrippedRaw);
      const canonicalRoundTripped = {};
      ORDER.forEach((key) => {
        canonicalRoundTripped[key] = roundTrippedNormalized[key];
      });

      const a = JSON.stringify(canonicalInput);
      const b = JSON.stringify(canonicalRoundTripped);

      if (a !== b && typeof console !== 'undefined' && console && typeof console.warn === 'function') {
        console.warn('[SighthoundParams] Canonical URL round-trip mismatch.', {
          from: canonicalInput,
          to: canonicalRoundTripped,
          search,
        });
      }
    } catch (_err) {
      // URL parity is a diagnostic guard only; never throw.
    }
  }

  return {
    DEFAULTS,
    readParamsFromUrl,
    normalizeParams,
    buildSearchFromParams,
    assertCanonicalRoundTrip,
  };
});
