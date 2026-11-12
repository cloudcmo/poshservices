// Anonymous usage counts for Posh Services (see src/stats.js for what is kept).
// No cookies, and nothing about you is stored in your browser for this.
// Open any page once with ?nocount=1 on the end to stop counting your own visits on that device (?nocount=0 to undo).
(() => {
  let off = false;
  try {
    const q = new URLSearchParams(location.search).get('nocount');
    if (q === '1') localStorage.setItem('ps-nocount', '1');
    if (q === '0') localStorage.removeItem('ps-nocount');
    off = localStorage.getItem('ps-nocount') === '1';
  } catch (e) { /* storage blocked: count as normal */ }

  const ua = navigator.userAgent;
  const device = /iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'tablet'
    : /Mobi|Android|iPhone/i.test(ua) ? 'phone' : 'computer';
  const path = location.pathname.replace(/\/+$/, '') || '/';
  const page = path === '/' ? 'planner' : path === '/services' ? 'list' : path.startsWith('/services/') ? 'service' : 'other';
  const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

  function send(n, data = {}) {
    if (off) return;
    const body = JSON.stringify(Object.assign({ n, pg: page, d: device, a: standalone ? 1 : 0 }, data));
    try {
      if (navigator.sendBeacon && navigator.sendBeacon('/api/e', new Blob([body], { type: 'text/plain' }))) return;
      fetch('/api/e', { method: 'POST', body, keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(() => {});
    } catch (e) { /* never let counting break the page */ }
  }

  let ref = null;
  try {
    if (document.referrer) {
      const h = new URL(document.referrer).hostname.replace(/^www\./, '');
      if (h && h !== location.hostname) ref = h;
    }
  } catch (e) { /* ignore */ }
  const shared = page === 'planner' && /[?&]from=/.test(location.search) && /[?&]to=/.test(location.search);
  send('view', { p: page === 'service' ? path.split('/')[2] : null, r: ref, x: shared ? 'shared' : null });

  window.psTrack = send;
})();
