// Global broadcaster (no dependencies)
// Exposed on window so any page (Guided or Live) can call it without
// coupling to HubSpot or other parent logic.
(function () {
  if (typeof window === 'undefined') return;
  window.broadcastHardwareEstimateUrl = function () {
    try {
      if (window.parent && window.parent !== window && window.location && window.location.href) {
        window.parent.postMessage(
          { type: 'HARDWARE_ESTIMATE_URL', url: window.location.href },
          '*'
        );
      }
    } catch (_) {
      // Best-effort only; never throw from cross-window messaging.
    }
  };
})();

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  }
  if (typeof root !== 'undefined') {
    root.SighthoundStateSync = factory();
  }
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  function supportsHistory() {
    return (
      typeof window !== 'undefined' &&
      window.history &&
      typeof window.history.replaceState === 'function' &&
      window.location
    );
  }

  function getParamsModule() {
    if (typeof window !== 'undefined' && window.SighthoundParams) {
      return window.SighthoundParams;
    }
    try {
      // Best-effort for Node environments; will only work if relative path resolution is correct.
      // eslint-disable-next-line global-require, import/no-unresolved
      return require('./params-schema');
    } catch (e) {
      return null;
    }
  }

  function createNoopState() {
    const noop = function () {};
    return {
      getParams: function () { return {}; },
      update: noop,
      subscribe: function () { return noop; },
    };
  }

  function initState() {
    if (typeof window === 'undefined') {
      return createNoopState();
    }

    const Params = getParamsModule();
    if (!Params) {
      return createNoopState();
    }

    const search = window.location ? window.location.search || '' : '';
    const raw = Params.readParamsFromUrl(search);
    let params = Params.normalizeParams(raw);

    // Immediately broadcast the current estimator URL once on init so that a
    // parent page embedding this calculator (e.g., via iframe) can capture an
    // initial value even before the user interacts.
    if (typeof window !== 'undefined' && window.broadcastHardwareEstimateUrl) {
      window.broadcastHardwareEstimateUrl();
    }

    const subscribers = new Set();
    let replaceTimer = null;

    function getParams() {
      return { ...params };
    }

    function notify() {
      const snapshot = getParams();
      subscribers.forEach((fn) => {
        try {
          fn(snapshot);
        } catch (_err) {
          // Swallow subscriber errors so they do not break state updates.
        }
      });
    }

    function scheduleUrlUpdate() {
      if (!supportsHistory()) return;
      if (replaceTimer !== null) {
        clearTimeout(replaceTimer);
      }
      replaceTimer = setTimeout(() => {
        replaceTimer = null;
        try {
          const searchString = Params.buildSearchFromParams(params);
          const loc = window.location;
          const newUrl =
            loc.pathname + (searchString ? '?' + searchString : '') + loc.hash;
          window.history.replaceState({}, '', newUrl);

          // After the canonical URL has been updated, broadcast it to the
          // parent page (e.g., a HubSpot/Squarespace container) so it can
          // capture the latest estimator URL including query params.
          if (typeof window !== 'undefined' && window.broadcastHardwareEstimateUrl) {
            window.broadcastHardwareEstimateUrl();
          }
        } catch (_err) {
          // URL state is a UX enhancement only; fail silently.
        }
      }, 150);
    }

    function shallowEqual(a, b) {
      if (a === b) return true;
      const aKeys = Object.keys(a || {});
      const bKeys = Object.keys(b || {});
      if (aKeys.length !== bKeys.length) return false;
      for (let i = 0; i < aKeys.length; i += 1) {
        const key = aKeys[i];
        if (a[key] !== b[key]) return false;
      }
      return true;
    }

    function update(partial) {
      const merged = Object.assign({}, params, partial || {});
      const next = Params.normalizeParams(merged);
      if (shallowEqual(params, next)) {
        return;
      }
      params = next;
      notify();
      scheduleUrlUpdate();
    }

    function subscribe(fn) {
      if (typeof fn !== 'function') {
        return function () {};
      }
      subscribers.add(fn);
      return function unsubscribe() {
        subscribers.delete(fn);
      };
    }

    // Canonicalize URL on first load based on normalized params.
    scheduleUrlUpdate();

    return {
      getParams,
      update,
      subscribe,
    };
  }

  return {
    initState,
  };
});
