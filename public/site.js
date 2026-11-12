// Posh Services: the bits every page shares. Colour themes, the account box (email sign-in), saved journeys
// (history and favourites, kept on this device and synced when signed in), the feedback box and the
// add-to-home-screen nudge. The planner (app.js) talks to all of this through window.PS.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const track = (n, d) => { try { window.psTrack && window.psTrack(n, d); } catch { /* ignore */ } };
  const store = {
    get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* full or blocked */ } },
  };
  const hashAtLoad = location.hash; // read now: the planner rewrites the address once it loads
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const device = isIOS && !/iPhone|iPod/.test(ua) ? 'tablet' : /Mobi|Android|iPhone/.test(ua) ? 'phone' : 'computer';

  function toast(msg, ms = 2800) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
    t.innerHTML = msg; t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => (t.hidden = true), ms);
  }
  const guff = (text) => `<span class="gb-say"><img src="/guffbot.webp" alt="" width="28" height="28"><span>${esc(text)}</span></span>`;

  const ICON = {
    palette: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3a9 9 0 0 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.3A4.7 4.7 0 0 0 22 9.7C22 5.9 17.5 3 12 3Zm-5.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"/></svg>',
    person: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.4 0-8 2.2-8 5v2h16v-2c0-2.8-3.6-5-8-5Z"/></svg>',
  };

  // ── Colour themes ────────────────────────────────────────────
  const THEMES = [
    ['linen', 'Linen', 'The original: bottle green and brass'],
    ['motorway', 'Motorway', 'Blue signs, crisp white'],
    ['night', 'Night drive', 'Dark, easy on the eyes'],
    ['seventies', 'Seventies', 'Orange, brown and a bit of swagger'],
  ];
  const currentTheme = () => document.documentElement.getAttribute('data-theme') || 'linen';
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('ps-theme', t); } catch { /* ignore */ }
    const m = document.querySelector('meta[name="theme-color"]');
    if (m && window.PS_THEMES) m.setAttribute('content', window.PS_THEMES[t]);
    document.dispatchEvent(new CustomEvent('ps-theme', { detail: t }));
    track('theme', { x: t });
  }

  // ── Saved journeys ───────────────────────────────────────────
  const keyOf = t => `${(+t.from.lat).toFixed(3)},${(+t.from.lng).toFixed(3)}>${(+t.to.lat).toFixed(3)},${(+t.to.lng).toFixed(3)}`;
  const journeys = {
    favs: store.get('ps-favs', []),
    history: store.get('ps-history', []),
    listeners: [],
    save(push = true) {
      store.set('ps-favs', this.favs); store.set('ps-history', this.history);
      this.listeners.forEach(fn => fn());
      if (push) account.push();
    },
    onChange(fn) { this.listeners.push(fn); },
    isFav(t) { const k = keyOf(t); return this.favs.some(f => keyOf(f) === k); },
    toggleFav(t) {
      const k = keyOf(t);
      const was = this.isFav(t);
      this.favs = was ? this.favs.filter(f => keyOf(f) !== k) : [{ ...t, ts: Date.now() }, ...this.favs].slice(0, 60);
      this.save();
      track(was ? 'fav_remove' : 'fav_add');
      return !was;
    },
    addHistory(t) {
      const k = keyOf(t);
      this.history = [{ ...t, ts: Date.now() }, ...this.history.filter(h => keyOf(h) !== k)].slice(0, 20);
      this.save();
    },
    remove(kind, k) {
      this[kind] = this[kind].filter(x => keyOf(x) !== k);
      this.save();
    },
    clearHistory() { this.history = []; this.save(); },
    // combine what's on this device with what's in the account: newest wins, nothing lost
    merge(server) {
      const join = (a, b, max) => {
        const m = new Map();
        for (const x of [...a, ...b]) { const k = keyOf(x); if (!m.has(k) || (m.get(k).ts || 0) < (x.ts || 0)) m.set(k, x); }
        return [...m.values()].sort((x, y) => (y.ts || 0) - (x.ts || 0)).slice(0, max);
      };
      this.favs = join(this.favs, server.favs || [], 60);
      this.history = join(this.history, server.history || [], 20);
    },
    keyOf,
  };

  // ── Account ──────────────────────────────────────────────────
  const account = {
    user: null, enabled: true, ready: null, timer: null,
    async load() {
      try {
        const r = await fetch('/api/me', { credentials: 'same-origin' });
        const d = await r.json();
        this.enabled = d.enabled !== false;
        this.user = d.user;
        if (d.user) {
          const before = JSON.stringify([journeys.favs, journeys.history]);
          journeys.merge(d.data || {});
          const changed = JSON.stringify([journeys.favs, journeys.history]) !== JSON.stringify([d.data?.favs || [], d.data?.history || []]);
          journeys.save(false);
          if (changed || before !== JSON.stringify([journeys.favs, journeys.history])) this.push();
        }
      } catch { /* offline: carry on with this device's copy */ }
      paintAccountButton();
    },
    push() {
      if (!this.user) return;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        fetch('/api/me', { method: 'PUT', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ favs: journeys.favs, history: journeys.history }) }).catch(() => {});
      }, 700);
    },
  };

  // ── Masthead tools ───────────────────────────────────────────
  function buildTools() {
    const mast = $('.masthead');
    if (!mast) return;
    const tools = document.createElement('div');
    tools.className = 'mast-tools';
    tools.innerHTML = `
      <div class="theme-wrap">
        <button type="button" class="tool-btn" id="theme-btn" aria-haspopup="true" aria-expanded="false" aria-controls="theme-menu" title="Colour theme">${ICON.palette}<span class="tool-label">Theme</span></button>
        <div class="theme-menu" id="theme-menu" role="menu" hidden>
          ${THEMES.map(([id, name, desc]) => `<button type="button" role="menuitemradio" data-theme-pick="${id}" aria-checked="false"><i class="swatch sw-${id}" aria-hidden="true"></i><span><b>${name}</b><small>${desc}</small></span></button>`).join('')}
        </div>
      </div>
      <button type="button" class="tool-btn" id="account-btn" title="Your account">${ICON.person}<span class="tool-label" id="account-label">Sign in</span></button>`;
    mast.append(tools);

    const btn = $('#theme-btn'), menu = $('#theme-menu');
    const paint = () => menu.querySelectorAll('[data-theme-pick]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.themePick === currentTheme())));
    const open = v => { menu.hidden = !v; btn.setAttribute('aria-expanded', String(v)); if (v) { paint(); menu.querySelector('[aria-checked="true"]')?.focus(); } };
    btn.addEventListener('click', () => open(menu.hidden));
    menu.addEventListener('click', e => { const b = e.target.closest('[data-theme-pick]'); if (b) { setTheme(b.dataset.themePick); paint(); open(false); btn.focus(); } });
    document.addEventListener('click', e => { if (!menu.hidden && !e.target.closest('.theme-wrap')) open(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { open(false); btn.focus(); } });
    $('#account-btn').addEventListener('click', openAccount);
  }

  function paintAccountButton() {
    const l = $('#account-label');
    if (!l) return;
    l.textContent = account.user ? 'Account' : 'Sign in';
    $('#account-btn').classList.toggle('is-in', !!account.user);
  }

  // ── Dialogs ──────────────────────────────────────────────────
  function dialog(id, html) {
    let d = document.getElementById(id);
    if (!d) { d = document.createElement('dialog'); d.id = id; d.className = 'ps-dialog'; document.body.append(d); d.addEventListener('click', e => { if (e.target === d) d.close(); }); }
    d.innerHTML = `<button type="button" class="dlg-x" aria-label="Close" data-close>&times;</button>${html}`;
    d.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => d.close()));
    if (!d.open) d.showModal();
    return d;
  }

  function openAccount() {
    track('account_open');
    if (account.user) {
      const n = journeys.favs.length;
      const d = dialog('account-dlg', `
        <div class="dlg-head"><img src="/guffbot.webp" alt="" width="56" height="56"><div><h2>Your account</h2><p>Signed in as <b>${esc(account.user.email)}</b></p></div></div>
        <p>${n ? `You've got ${n} favourite ${n === 1 ? 'journey' : 'journeys'}, kept on every device you sign in on.` : 'Tap "Save to favourites" on any journey and it\'ll be kept on every device you sign in on.'}</p>
        <div class="dlg-actions"><button type="button" class="btn btn-quiet" id="signout">Sign out</button></div>
        <details class="danger-zone"><summary>Delete my account</summary>
          <p>This deletes your email address and saved journeys from Posh Services. Your journeys stay on this device.</p>
          <button type="button" class="btn btn-danger" id="delete-acct">Delete my account</button>
        </details>`);
      $('#signout', d).addEventListener('click', async () => {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
        account.user = null; paintAccountButton(); d.close(); track('signout');
        toast('Signed out. Your journeys are still saved on this device.');
      });
      $('#delete-acct', d).addEventListener('click', async e => {
        const b = e.currentTarget;
        if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Tap again to delete for good'; return; }
        const r = await fetch('/api/me/delete', { method: 'POST', credentials: 'same-origin' }).catch(() => null);
        if (r && r.ok) { account.user = null; paintAccountButton(); d.close(); track('account_delete'); toast('Account deleted. Sorry to see you go.'); }
        else toast('That didn\'t work. Please try again.');
      });
      return;
    }
    if (!account.enabled) {
      dialog('account-dlg', `<div class="dlg-head"><img src="/guffbot.webp" alt="" width="56" height="56"><div><h2>Accounts are nearly here</h2></div></div>
        <p>Signing in isn't switched on quite yet. Your recent and favourite journeys are already saved on this device.</p>`);
      return;
    }
    const d = dialog('account-dlg', `
      <div class="dlg-head"><img src="/guffbot.webp" alt="" width="56" height="56"><div><h2>Keep your journeys everywhere</h2><p>Sign in to see your favourite journeys on your phone, your laptop, your aunt's iPad.</p></div></div>
      <form id="signin-form" class="dlg-form">
        <label for="signin-email">Your email address</label>
        <input id="signin-email" type="email" autocomplete="email" inputmode="email" required placeholder="you@example.com">
        <button type="submit" class="btn btn-go">Email me a sign-in link</button>
        <p class="dlg-small">No passwords. We email you a link that signs you in. Your email is only used for that: no newsletters, no sharing, and you can delete your account any time. Your journeys are already saved on this device without an account.</p>
        <p class="dlg-msg" role="status"></p>
      </form>`);
    $('#signin-form', d).addEventListener('submit', async e => {
      e.preventDefault();
      const email = $('#signin-email', d).value.trim();
      const b = $('button[type=submit]', d), msg = $('.dlg-msg', d);
      b.disabled = true; b.textContent = 'Sending…'; msg.textContent = '';
      try {
        const back = location.pathname + location.search;
        const r = await fetch('/api/auth/start', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ email, back }) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Something went wrong. Please try again.');
        track('signin_start');
        $('.dlg-form', d).innerHTML = `<div class="sent"><h3>Check your email</h3><p>We've sent a sign-in link to <b>${esc(email)}</b>. It works for 20 minutes. If it's not there in a minute or two, have a look in spam.</p>${guff('I\'d wait by the letterbox, but it\'s email.')}${j.devLink ? `<p><a id="dev-link" href="${esc(j.devLink)}">Local test link</a></p>` : ''}</div>`;
      } catch (err) {
        msg.textContent = err.message; b.disabled = false; b.textContent = 'Email me a sign-in link';
      }
    });
    setTimeout(() => $('#signin-email', d)?.focus(), 50);
  }

  function openFeedback(opts = {}) {
    track('feedback_open', { x: opts.kind || null });
    const kinds = [['wrong', 'Something\'s wrong', 'A closed shop, a missing Waitrose, a wrong side'], ['idea', 'An idea', 'Something you\'d like it to do'], ['thanks', 'Say thanks', 'Always welcome']];
    const d = dialog('feedback-dlg', `
      <div class="dlg-head"><img src="/guffbot.webp" alt="" width="56" height="56"><div><h2>Tell me something</h2><p>Spotted a mistake, got an idea, or just want to say hello? Carl reads every one.</p></div></div>
      <form id="fb-form" class="dlg-form" novalidate>
        <fieldset class="fb-kinds"><legend class="sr-only">What kind of feedback?</legend>
          ${kinds.map(([k, t, s]) => `<label class="fb-kind"><input type="radio" name="kind" value="${k}" ${opts.kind === k ? 'checked' : ''}><span><b>${t}</b><small>${s}</small></span></label>`).join('')}
        </fieldset>
        <label for="fb-msg" id="fb-msg-label">What's up?</label>
        <textarea id="fb-msg" rows="4" maxlength="3000" placeholder="${opts.service ? 'What\'s wrong with this services page?' : 'Tell me more'}"></textarea>
        <label for="fb-email">Your email <span class="hint">if you'd like a reply (optional)</span></label>
        <input id="fb-email" type="email" autocomplete="email" inputmode="email" value="${esc(account.user?.email || '')}">
        <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
        <button type="submit" class="btn btn-go">Send</button>
        <p class="dlg-small">I keep track of fixes and ideas on GitHub, so your message may be posted there publicly. Your email address never is.</p>
        <p class="dlg-msg" role="status"></p>
      </form>`);
    const form = $('#fb-form', d);
    const sync = () => {
      const k = form.kind.value;
      $('#fb-msg-label', d).textContent = k === 'thanks' ? 'Anything to add? (optional)' : k === 'idea' ? 'What\'s the idea?' : 'What\'s wrong?';
    };
    form.addEventListener('change', sync); sync();
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const msg = $('.dlg-msg', d), b = $('button[type=submit]', d);
      const kind = form.kind.value;
      if (!kind) { msg.textContent = 'Please choose one of the three at the top.'; return; }
      b.disabled = true; b.textContent = 'Sending…'; msg.textContent = '';
      try {
        const body = { kind, message: $('#fb-msg', d).value, email: $('#fb-email', d).value, website: form.website.value, page: location.pathname + location.search, service: opts.service || null, device };
        const r = await fetch('/api/feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'That didn\'t send. Please try again.');
        track('feedback', { x: kind });
        form.innerHTML = `<div class="sent"><h3>${kind === 'thanks' ? 'Thank you!' : 'Got it, thank you'}</h3>${guff(window.GuffBot ? window.GuffBot.react(kind === 'thanks' ? 'thanks' : 'feedback') : 'Thank you!')}<button type="button" class="btn btn-quiet" data-close>Close</button></div>`;
        form.querySelector('[data-close]').addEventListener('click', () => d.close());
      } catch (err) {
        msg.textContent = err.message; b.disabled = false; b.textContent = 'Send';
      }
    });
  }

  // ── Add to home screen ───────────────────────────────────────
  let installEvent = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); installEvent = e;
    document.dispatchEvent(new CustomEvent('ps-installable'));
    document.querySelectorAll('.home-card [data-install]').forEach(b => { b.textContent = 'Add it'; });
  });
  async function install() {
    if (installEvent) {
      installEvent.prompt();
      const r = await installEvent.userChoice.catch(() => null);
      track('a2hs', { x: r?.outcome || 'prompt' });
      installEvent = null;
      return true;
    }
    track('a2hs', { x: 'howto' });
    if (location.pathname !== '/add-to-home') location.href = '/add-to-home';
    return false;
  }
  // a small card after a plan, on phones only, until it's dismissed or done
  function homeCard() {
    if (standalone() || device === 'computer' || store.get('ps-a2hs-done', false)) return '';
    return `<div class="home-card" id="home-card"><img src="/apple-touch-icon.png?v=2" alt="" width="40" height="40"><p><b>Add Posh Services to your home screen</b><br>It'll open like an app, ready for next time.</p>
      <span class="home-card-btns"><button type="button" class="btn btn-small" data-install>${installEvent ? 'Add it' : 'Show me how'}</button><button type="button" class="linkish" data-home-dismiss>No thanks</button></span></div>`;
  }

  // ── Wiring ───────────────────────────────────────────────────
  document.addEventListener('click', e => {
    const f = e.target.closest('[data-feedback]');
    if (f) { e.preventDefault(); openFeedback({ kind: f.dataset.feedback || null, service: f.dataset.service || null }); return; }
    const i = e.target.closest('[data-install]');
    if (i) { e.preventDefault(); install(); return; }
    const x = e.target.closest('[data-home-dismiss]');
    if (x) { store.set('ps-a2hs-done', true); x.closest('.home-card')?.remove(); track('a2hs', { x: 'dismiss' }); }
    const s = e.target.closest('[data-signin]');
    if (s) { e.preventDefault(); openAccount(); }
  });

  document.addEventListener('DOMContentLoaded', () => {
    buildTools();
    if (standalone()) document.querySelectorAll('.a2hs-link').forEach(a => a.remove());
    account.ready = account.load().then(() => {
      if (hashAtLoad === '#signedin') {
        if (location.hash) history.replaceState(null, '', location.pathname + location.search);
        if (account.user) { toast(guff(window.GuffBot ? window.GuffBot.react('signedin') : 'You\'re signed in.'), 4500); track('signin'); }
      } else if (hashAtLoad === '#signin') {
        if (location.hash) history.replaceState(null, '', location.pathname + location.search);
        openAccount();
      }
    });
  });

  window.PS = { track, toast, guff, store, journeys, account, openAccount, openFeedback, homeCard, install, standalone, device, esc };
})();
