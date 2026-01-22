(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  var StateSync = window.SighthoundStateSync;
  var Params = window.SighthoundParams;

  function getCurrentMode() {
    var body = document.body;
    if (!body) return 'guided';
    var attr = body.getAttribute('data-mode');
    if (attr === 'live' || attr === 'guided') return attr;
    return 'guided';
  }

  function buildSearchFromState() {
    try {
      if (!StateSync || !Params || typeof StateSync.initState !== 'function') {
        // Fallback: preserve existing search verbatim
        var search = window.location && window.location.search;
        return search && search.charAt(0) === '?' ? search.slice(1) : (search || '');
      }
      var state = StateSync.initState();
      var params = state.getParams ? state.getParams() : {};
      if (!Params.buildSearchFromParams) {
        return '';
      }
      return Params.buildSearchFromParams(params);
    } catch (_err) {
      return '';
    }
  }

  function applyActiveClasses(buttons, currentMode) {
    buttons.forEach(function (btn) {
      var target = btn.getAttribute('data-mode-target');
      if (!target) return;
      var isActive = target === currentMode;

      // Base classes should be in markup; we only toggle accents here.
      btn.classList.toggle('bg-slate-900', isActive);
      btn.classList.toggle('text-white', isActive);
      btn.classList.toggle('border-slate-900', isActive);

      btn.classList.toggle('bg-slate-100', !isActive);
      btn.classList.toggle('text-slate-700', !isActive);
      btn.classList.toggle('border-transparent', !isActive);
      btn.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  }

  function initModeSwitch() {
    var buttons = Array.prototype.slice.call(
      document.querySelectorAll('[data-mode-target]')
    );
    if (!buttons.length) return;

    var currentMode = getCurrentMode();
    applyActiveClasses(buttons, currentMode);

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-mode-target');
        if (!target || target === currentMode) return;

        var path = target === 'live' ? 'live.html' : 'index.html';
        var search = buildSearchFromState();
        var searchPart = search ? '?' + search : '';
        var hash = window.location && window.location.hash ? window.location.hash : '';

        window.location.href = path + searchPart + hash;
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModeSwitch);
  } else {
    initModeSwitch();
  }
})();
