// Applies the chosen colour theme before the page draws, so there's no flash of the wrong colours.
(function () {
  var THEMES = { linen: '#1f4a3a', motorway: '#1d4f91', night: '#12171a', seventies: '#a8461b' };
  var t = 'linen';
  try { t = localStorage.getItem('ps-theme') || 'linen'; } catch (e) { /* storage blocked */ }
  if (!THEMES[t]) t = 'linen';
  document.documentElement.setAttribute('data-theme', t);
  var m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', THEMES[t]);
  window.PS_THEMES = THEMES;
})();
