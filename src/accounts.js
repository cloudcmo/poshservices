// Accounts (email sign-in links), saved journeys, and the feedback button.
//
// Signing in: you give an email address, we email a link that works once for 20 minutes. Opening it shows a
// "Sign in" button (so email scanners that open links can't use it up), which sets a session cookie for a year.
// Only the email address and your saved journeys are kept. Delete your account any time from the account box.
//
// Feedback: kept in the USERS database (shown on the stats site) and, when GITHUB_TOKEN is set, opened as an
// issue on GITHUB_REPO (default cloudcmo/poshservices). Email addresses never go to GitHub.

const SESSION_DAYS = 365;
const LINK_MINUTES = 20;
const COOKIE = 'ps_session';
const SITE = 'https://poshservices.carlosfandango.net';
const FROM = 'Posh Services <signin@updates.carlosfandango.net>';
const EMAIL_RE = /^[^\s@<>()]{1,64}@[^\s@<>()]{1,190}\.[a-z]{2,24}$/i;

const enc = new TextEncoder();
async function sha256hex(s) {
  const b = await crypto.subtle.digest('SHA-256', enc.encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
function randHex(n) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return [...a].map((x) => x.toString(16).padStart(2, '0')).join('');
}
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function cookie(request, name) {
  const m = (request.headers.get('Cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? m[1] : null;
}
const secureFlag = (url) => (url.protocol === 'https:' ? '; Secure' : '');
const ipKey = async (request, what) => (await sha256hex(what + '|' + (request.headers.get('CF-Connecting-IP') || ''))).slice(0, 20);

// JSON calls must come from our own pages
function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}
async function readJson(request, max = 20000) {
  const ct = request.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  const text = await request.text();
  if (text.length > max) return null;
  try { return JSON.parse(text); } catch { return null; }
}

async function tooMany(db, key, limit, windowMs) {
  const now = Date.now();
  const r = await db.prepare('SELECT COUNT(*) AS n FROM auth_attempts WHERE key = ? AND ts > ?').bind(key, now - windowMs).first();
  if (r.n >= limit) return true;
  await db.prepare('INSERT INTO auth_attempts (key, ts) VALUES (?, ?)').bind(key, now).run();
  if (Math.random() < 0.05) await db.prepare('DELETE FROM auth_attempts WHERE ts < ?').bind(now - 86400e3).run();
  return false;
}

export async function currentUser(request, env) {
  if (!env.USERS) return null;
  const t = cookie(request, COOKIE);
  if (!t || !/^[0-9a-f]{64}$/.test(t)) return null;
  const row = await env.USERS.prepare(
    'SELECT u.id, u.email, u.data, u.last_seen, s.expires FROM user_sessions s JOIN users u ON u.id = s.user_id WHERE s.hash = ?'
  ).bind(await sha256hex(t)).first();
  if (!row || row.expires < Date.now()) return null;
  return row;
}

// ── Saved journeys: keep only what we expect, cut to size ─────
const num = (v, lo, hi) => (Number.isFinite(+v) && +v >= lo && +v <= hi ? Math.round(+v * 1e5) / 1e5 : null);
const str = (v, n) => (v == null ? '' : String(v).slice(0, n));
function cleanPlace(p) {
  if (!p || typeof p !== 'object') return null;
  const lat = num(p.lat, -90, 90), lng = num(p.lng, -180, 180);
  if (lat == null || lng == null) return null;
  return { label: str(p.label, 80) || 'Somewhere', lat, lng };
}
function cleanTrip(t) {
  if (!t || typeof t !== 'object') return null;
  const from = cleanPlace(t.from), to = cleanPlace(t.to);
  if (!from || !to) return null;
  const out = { from, to, ts: num(t.ts, 0, 9e15) || Date.now() };
  if (t.q) out.q = str(t.q, 600);
  if (t.name) out.name = str(t.name, 60);
  if (t.miles != null) out.miles = num(t.miles, 0, 5000);
  return out;
}
function cleanData(d) {
  const favs = (Array.isArray(d?.favs) ? d.favs : []).map(cleanTrip).filter(Boolean).slice(0, 60);
  const history = (Array.isArray(d?.history) ? d.history : []).map(cleanTrip).filter(Boolean).slice(0, 30);
  return { favs, history };
}

// ── Pages for the email link ──────────────────────────────────
function smallPage(title, body, status = 200, headers = {}) {
  return new Response(`<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(title)} | Posh Services</title><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<script src="/theme.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css"></head><body class="page"><header class="masthead"><a class="wordmark" href="/" aria-label="Posh Services home"><span class="wm-posh">Posh</span> <span class="wm-services">Services</span></a></header>
<main class="narrow-page">${body}</main></body></html>`, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', ...headers } });
}

function emailHtml(link) {
  return `<!doctype html><html><body style="margin:0;background:#f6f0e4;font-family:Arial,Helvetica,sans-serif;color:#1d2a23">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f0e4;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fffdf8;border:1px solid #dacfba;border-radius:10px;padding:26px">
<tr><td>
<p style="margin:0 0 18px"><span style="display:inline-block;background:#1f4a3a;color:#fff;border-radius:6px;padding:5px 12px;font-family:Georgia,serif;font-style:italic;font-size:22px">Posh <b style="font-family:Arial,sans-serif;font-style:normal;font-size:15px">Services</b></span></p>
<p style="font-size:17px;margin:0 0 18px">Here's your link to sign in to Posh Services.</p>
<p style="margin:0 0 22px"><a href="${link}" style="display:inline-block;background:#1f4a3a;color:#fff;text-decoration:none;font-weight:bold;padding:13px 22px;border-radius:8px">Sign in to Posh Services</a></p>
<p style="font-size:14px;color:#5f6b63;margin:0 0 10px">It works once and runs out in ${LINK_MINUTES} minutes. If you didn't ask for it, you can ignore this email and nothing will happen.</p>
<p style="font-size:14px;color:#5f6b63;margin:0">GuffBot says: drive safe, and stop for a flapjack.</p>
</td></tr></table></td></tr></table></body></html>`;
}

// ── Routes ────────────────────────────────────────────────────
export async function accounts(request, env, ctx, path) {
  const url = new URL(request.url);
  const db = env.USERS;
  const secure = secureFlag(url);

  if (path === '/api/auth/start' && request.method === 'POST') {
    if (!sameOrigin(request)) return json({ error: 'Not allowed.' }, 403);
    if (!db || !env.RESEND_API_KEY) return json({ error: 'Signing in isn\'t switched on yet. Your journeys are still saved on this device.' }, 503);
    const b = await readJson(request);
    const email = String(b?.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return json({ error: 'That doesn\'t look like an email address.' }, 400);
    if (await tooMany(db, 'ip:' + await ipKey(request, 'auth'), 10, 3600e3)) return json({ error: 'Too many tries. Please wait a while and try again.' }, 429);
    if (await tooMany(db, 'em:' + (await sha256hex(email)).slice(0, 20), 3, 15 * 60e3)) return json({ error: 'We\'ve just sent a link to that address. Check your inbox (and spam), or try again in 15 minutes.' }, 429);
    let back = String(b?.back || '/');
    if (!back.startsWith('/') || back.startsWith('//') || back.length > 600) back = '/';
    const token = randHex(32);
    await db.prepare('INSERT INTO auth_tokens (hash, email, expires, back) VALUES (?, ?, ?, ?)').bind(await sha256hex(token), email, Date.now() + LINK_MINUTES * 60e3, back).run();
    const link = `${url.protocol === 'https:' ? SITE : url.origin}/auth?t=${token}`;
    // local testing only (EMAIL_DEV in .dev.vars): hand the link back instead of emailing it
    if (env.EMAIL_DEV) return json({ ok: true, devLink: `/auth?t=${token}` });
    let res;
    try {
      res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: env.EMAIL_FROM || FROM, to: [email], subject: 'Your Posh Services sign-in link',
        html: emailHtml(link),
        text: `Here's your link to sign in to Posh Services:\n\n${link}\n\nIt works once and runs out in ${LINK_MINUTES} minutes. If you didn't ask for it, ignore this email.`,
      }),
      });
    } catch (e) {
      console.error('resend', e.message);
      return json({ error: 'We couldn\'t send the email just now. Please try again in a minute.' }, 502);
    }
    if (!res.ok) {
      console.error('resend', res.status, (await res.text()).slice(0, 300));
      return json({ error: 'We couldn\'t send the email just now. Please try again in a minute.' }, 502);
    }
    return json({ ok: true });
  }

  if (path === '/auth') {
    if (request.method === 'GET') {
      const t = url.searchParams.get('t') || '';
      if (!/^[0-9a-f]{64}$/.test(t)) return smallPage('Sign in', '<h1>That link isn\'t complete</h1><p>Try opening it again from the email, or <a href="/">ask for a new one</a>.</p>', 400);
      return smallPage('Sign in', `<img class="gb-face" src="/guffbot.webp" alt="" width="72" height="72"><h1>Sign in to Posh Services</h1><p>One tap and your favourite journeys will be kept on every device you sign in on.</p>
<form method="post" action="/auth"><input type="hidden" name="t" value="${esc(t)}"><button class="btn btn-go" type="submit">Sign in</button></form>`);
    }
    if (request.method === 'POST') {
      if (!db) return smallPage('Sign in', '<h1>Signing in isn\'t switched on yet</h1>', 503);
      const f = await request.formData();
      const t = String(f.get('t') || '');
      const hash = /^[0-9a-f]{64}$/.test(t) ? await sha256hex(t) : '';
      const row = hash ? await db.prepare('SELECT email, expires, back FROM auth_tokens WHERE hash = ?').bind(hash).first() : null;
      if (hash) await db.prepare('DELETE FROM auth_tokens WHERE hash = ? OR expires < ?').bind(hash, Date.now()).run();
      if (!row || row.expires < Date.now()) {
        return smallPage('Sign in', '<h1>That link has run out</h1><p>Sign-in links work once, for 20 minutes. <a href="/#signin">Ask for a new one</a> and it\'ll be with you in a moment.</p>', 400);
      }
      const now = Date.now();
      await db.prepare('INSERT OR IGNORE INTO users (email, created, last_seen, data) VALUES (?, ?, ?, ?)').bind(row.email, now, now, '{}').run();
      const user = await db.prepare('SELECT id FROM users WHERE email = ?').bind(row.email).first();
      const session = randHex(32);
      await db.prepare('INSERT INTO user_sessions (hash, user_id, expires) VALUES (?, ?, ?)').bind(await sha256hex(session), user.id, now + SESSION_DAYS * 86400e3).run();
      const back = row.back && row.back.startsWith('/') && !row.back.startsWith('//') ? row.back : '/';
      return new Response(null, {
        status: 303,
        headers: { Location: back + (back.includes('#') ? '' : '#signedin'), 'Set-Cookie': `${COOKIE}=${session}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; SameSite=Lax${secure}` },
      });
    }
  }

  if (path === '/api/me') {
    const user = await currentUser(request, env);
    if (request.method === 'GET') {
      if (!user) return json({ user: null, enabled: !!(db && env.RESEND_API_KEY) });
      if (Date.now() - user.last_seen > 86400e3) ctx.waitUntil(db.prepare('UPDATE users SET last_seen = ? WHERE id = ?').bind(Date.now(), user.id).run());
      let data = {};
      try { data = JSON.parse(user.data || '{}'); } catch { /* start fresh */ }
      return json({ user: { email: user.email }, data: cleanData(data), enabled: true });
    }
    if (request.method === 'PUT') {
      if (!sameOrigin(request)) return json({ error: 'Not allowed.' }, 403);
      if (!user) return json({ error: 'Not signed in.' }, 401);
      const b = await readJson(request, 120000);
      if (!b) return json({ error: 'Bad request.' }, 400);
      const data = cleanData(b);
      await db.prepare('UPDATE users SET data = ?, last_seen = ? WHERE id = ?').bind(JSON.stringify(data), Date.now(), user.id).run();
      return json({ ok: true });
    }
  }

  if (path === '/api/auth/logout' && request.method === 'POST') {
    if (!sameOrigin(request)) return json({ error: 'Not allowed.' }, 403);
    const t = cookie(request, COOKIE);
    if (db && t && /^[0-9a-f]{64}$/.test(t)) await db.prepare('DELETE FROM user_sessions WHERE hash = ?').bind(await sha256hex(t)).run();
    return json({ ok: true }, 200, { 'Set-Cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}` });
  }

  if (path === '/api/me/delete' && request.method === 'POST') {
    if (!sameOrigin(request)) return json({ error: 'Not allowed.' }, 403);
    const user = await currentUser(request, env);
    if (!user) return json({ error: 'Not signed in.' }, 401);
    await db.batch([
      db.prepare('DELETE FROM user_sessions WHERE user_id = ?').bind(user.id),
      db.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
    ]);
    return json({ ok: true }, 200, { 'Set-Cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}` });
  }

  if (path === '/api/feedback' && request.method === 'POST') return feedback(request, env, ctx);

  return null;
}

// ── Feedback ──────────────────────────────────────────────────
const KINDS = { wrong: ['Something\'s wrong', 'incorrect info'], idea: ['Idea', 'idea'], thanks: ['Thank you', 'thanks'] };

async function feedback(request, env, ctx) {
  if (!sameOrigin(request)) return json({ error: 'Not allowed.' }, 403);
  const db = env.USERS;
  if (!db) return json({ error: 'Feedback isn\'t switched on yet.' }, 503);
  const b = await readJson(request, 8000);
  if (!b || !KINDS[b.kind]) return json({ error: 'Please choose what kind of feedback this is.' }, 400);
  if (b.website) return json({ ok: true }); // a box only robots fill in
  const message = String(b.message || '').trim().slice(0, 3000);
  if (b.kind !== 'thanks' && message.length < 3) return json({ error: 'Please write a few words so I know what to look at.' }, 400);
  let email = String(b.email || '').trim().toLowerCase().slice(0, 200);
  if (email && !EMAIL_RE.test(email)) return json({ error: 'That email address doesn\'t look right. Leave it blank if you\'d rather.' }, 400);
  const ipkey = await ipKey(request, 'fb');
  if (await tooMany(db, 'fb:' + ipkey, 8, 3600e3)) return json({ error: 'That\'s a lot of feedback! Please wait a little while before sending more.' }, 429);

  let page = String(b.page || '').slice(0, 300);
  if (!page.startsWith('/')) page = '/';
  const service = String(b.service || '').replace(/[^a-z0-9-]/g, '').slice(0, 60) || null;
  const device = ['phone', 'tablet', 'computer'].includes(b.device) ? b.device : null;
  const user = await currentUser(request, env);
  if (!email && user) email = user.email;

  const r = await db.prepare('INSERT INTO feedback (ts, kind, message, page, service, email, device, ipkey) VALUES (?,?,?,?,?,?,?,?)')
    .bind(Date.now(), b.kind, message || null, page, service, email || null, device, ipkey).run();
  const id = r.meta?.last_row_id;

  // a thank-you with no words is just counted; anything with words goes to GitHub too
  if (env.GITHUB_TOKEN && message) {
    ctx.waitUntil(openIssue(env, { id, kind: b.kind, message, page, service, device, canReply: !!email }).catch((e) => console.error('github', e.message)));
  }
  return json({ ok: true });
}

async function openIssue(env, f) {
  const [label, tag] = KINDS[f.kind];
  // stop accidental @mentions pinging strangers on GitHub
  const safe = (s) => String(s).replace(/@/g, '@​');
  const first = f.message.split('\n')[0].replace(/\s+/g, ' ').trim();
  const title = `${label}: ${first.length > 70 ? first.slice(0, 67) + '...' : first}`;
  const body = [
    `**Type:** ${label}`,
    `**Page:** ${SITE}${f.page}`,
    f.service ? `**Services:** ${SITE}/services/${f.service}` : null,
    f.device ? `**Device:** ${f.device}` : null,
    '',
    safe(f.message).split('\n').map((l) => `> ${l}`).join('\n'),
    '',
    `_Sent with the feedback button on Posh Services (feedback #${f.id}). ${f.canReply ? 'They left an email address for a reply: see the stats site.' : 'No email address left.'}_`,
  ].filter((x) => x !== null).join('\n');
  const repo = env.GITHUB_REPO || 'cloudcmo/poshservices';
  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'poshservices-feedback', 'content-type': 'application/json',
    },
    body: JSON.stringify({ title: safe(title), body, labels: ['feedback', tag] }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  const issue = await res.json();
  await env.USERS.prepare('UPDATE feedback SET issue_url = ? WHERE id = ?').bind(issue.html_url, f.id).run();
}
