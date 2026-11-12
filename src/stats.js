// Anonymous usage counts for Posh Services, and the private stats site that shows them.
//
// Collecting (POST /api/e on the main site, sent by public/track.js):
//   - no cookies and nothing stored in the visitor's browser for this
//   - no IP address is stored: each visit becomes a short code made from a random salt that changes every day,
//     so people can be counted per day but not followed from one day to the next
//   - journeys are stored as place names only, with postcodes cut to the first half (EX20 2RB becomes EX20)
//   - only a fixed list of event names is accepted, and every field is cut short
//
// Stats site (servicesstats.carlosfandango.net): log in with STATS_USER (default "carl") and the STATS_PIN secret.
// Five wrong tries from one connection lock it for 15 minutes; 30 wrong tries in an hour lock it for everyone for an hour.

const TZ = 'Europe/London';
const EVENTS = new Set([
  'view', 'plan', 'plan_fail', 'pick', 'share', 'gmaps', 'add_stop', 'remove_stop', 'reset_picks',
  'nearby', 'filters', 'swap', 'details', 'fav_add', 'fav_remove', 'history_open', 'account_open', 'signin_start',
  'signin', 'signout', 'account_delete', 'feedback_open', 'feedback', 'theme', 'a2hs',
]);
const BOT = /bot|crawl|spider|slurp|preview|monitor|headless|lighthouse|pingdom|uptime|curl|wget|python|java\/|go-http/i;
const SESSION_DAYS = 30;

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
function londonParts(ms) {
  const p = {};
  new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(ms)).forEach((x) => { p[x.type] = x.value; });
  return { day: `${p.year}-${p.month}-${p.day}`, hour: +p.hour };
}
const clip = (v, n = 60) => (v == null || v === '' ? null : String(v).slice(0, n));
const trimPostcodes = (s) => (s == null ? s : String(s).replace(/\b([A-Z]{1,2}\d[A-Z\d]?)\s*\d[A-Z]{2}\b/gi, '$1'));

// today's salt: created on first use each day; older salts are deleted so old codes can never be recreated
async function saltFor(db, day) {
  let row = await db.prepare('SELECT salt FROM salts WHERE day = ?').bind(day).first();
  if (row) return row.salt;
  await db.prepare('INSERT OR IGNORE INTO salts (day, salt) VALUES (?, ?)').bind(day, randHex(16)).run();
  await db.prepare('DELETE FROM salts WHERE day < ?').bind(day).run();
  row = await db.prepare('SELECT salt FROM salts WHERE day = ?').bind(day).first();
  return row.salt;
}

export async function collect(request, env, ctx) {
  const ok = new Response(null, { status: 204 });
  if (request.method !== 'POST' || !env.DB) return ok;
  // only from the page itself
  const origin = request.headers.get('Origin');
  const url = new URL(request.url);
  try { if (origin && new URL(origin).host !== url.host) return ok; } catch (e) { return ok; }
  const ua = request.headers.get('User-Agent') || '';
  if (!ua || BOT.test(ua)) return ok;
  let b;
  try {
    const text = await request.text();
    if (text.length > 2000) return ok;
    b = JSON.parse(text);
  } catch (e) { return ok; }
  if (!b || !EVENTS.has(b.n)) return ok;
  ctx.waitUntil((async () => {
    const now = Date.now();
    const { day, hour } = londonParts(now);
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const salt = await saltFor(env.DB, day);
    const vid = (await sha256hex(salt + '|' + ip + '|' + ua)).slice(0, 16);
    const num = Number.isFinite(b.m) ? Math.max(0, Math.min(5000, Math.round(b.m))) : null;
    await env.DB.prepare('INSERT INTO events (ts, day, hour, vid, name, page, place, extra, device, ref, standalone, num) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(now, day, hour, vid, b.n, clip(b.pg, 12), clip(trimPostcodes(b.p), 120), clip(trimPostcodes(b.x), 60), clip(b.d, 10), clip(b.r, 80), b.a ? 1 : 0, num)
      .run();
    // now and then, tidy up: events older than 400 days, finished sessions, old failed logins
    if (Math.random() < 0.02) {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM events WHERE ts < ?').bind(now - 400 * 86400e3),
        env.DB.prepare('DELETE FROM sessions WHERE expires < ?').bind(now),
        env.DB.prepare('DELETE FROM login_fails WHERE ts < ?').bind(now - 86400e3),
      ]);
    }
  })().catch(() => {}));
  return ok;
}

// ---------- the stats site ----------
function page(title, body, status = 200, headers = {}) {
  return new Response(`<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>${title}</title><link rel="icon" href="/favicon.svg?v=2" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>${body}</body></html>`, {
    status,
    headers: Object.assign({ 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer' }, headers),
  });
}
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function cookie(request, name) {
  const m = (request.headers.get('Cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? m[1] : null;
}
function sameText(a, b) {
  // compare without stopping at the first different character
  const x = enc.encode(String(a)), y = enc.encode(String(b));
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] || 0) ^ (y[i] || 0);
  return d === 0;
}

const wordmark = '<span class="wm"><i>Posh</i> <b>Services</b></span> <span class="wm-stats">stats</span>';

export async function statsSite(request, env, services = []) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (path === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain' } });
  if (!env.DB) return page('Posh Services stats', '<main class="narrow"><h1>Stats</h1><p>The stats database isn\'t connected to this Worker yet.</p></main>', 503);
  if (!env.STATS_PIN) return page('Posh Services stats', '<main class="narrow"><h1>Stats</h1><p>The PIN hasn\'t been set yet. Run <code>npx wrangler secret put STATS_PIN</code>.</p></main>', 503);
  const db = env.DB, now = Date.now();
  const secure = url.protocol === 'https:' ? '; Secure' : '';

  if (path === '/logout') {
    const t = cookie(request, 'pss');
    if (t) await db.prepare('DELETE FROM sessions WHERE token = ?').bind(await sha256hex(t)).run();
    return new Response(null, { status: 303, headers: { Location: '/', 'Set-Cookie': `pss=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${secure}` } });
  }

  if (path === '/login' && request.method === 'POST') {
    const ipkey = (await sha256hex('login|' + (request.headers.get('CF-Connecting-IP') || ''))).slice(0, 16);
    const mine = await db.prepare('SELECT COUNT(*) AS n FROM login_fails WHERE ipkey = ? AND ts > ?').bind(ipkey, now - 15 * 60e3).first();
    const all = await db.prepare('SELECT COUNT(*) AS n FROM login_fails WHERE ts > ?').bind(now - 3600e3).first();
    if (mine.n >= 5 || all.n >= 30) return loginPage('Too many wrong tries. Wait 15 minutes and try again.', 429);
    const f = await request.formData();
    const user = String(f.get('user') || '').trim().toLowerCase();
    const pin = String(f.get('pin') || '').trim();
    if (!sameText(user, String(env.STATS_USER || 'carl').toLowerCase()) | !sameText(pin, env.STATS_PIN)) {
      await db.prepare('INSERT INTO login_fails (ipkey, ts) VALUES (?, ?)').bind(ipkey, now).run();
      return loginPage('That name and PIN don\'t match.', 401);
    }
    const token = randHex(32);
    await db.prepare('INSERT INTO sessions (token, expires) VALUES (?, ?)').bind(await sha256hex(token), now + SESSION_DAYS * 86400e3).run();
    return new Response(null, { status: 303, headers: { Location: '/', 'Set-Cookie': `pss=${token}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; SameSite=Strict${secure}` } });
  }

  const t = cookie(request, 'pss');
  const sess = t ? await db.prepare('SELECT expires FROM sessions WHERE token = ?').bind(await sha256hex(t)).first() : null;
  if (!sess || sess.expires < now) return loginPage('');

  if (path !== '/') return new Response(null, { status: 303, headers: { Location: '/' } });
  const days = [7, 30, 90, 365].includes(+url.searchParams.get('days')) ? +url.searchParams.get('days') : 30;
  const names = new Map(services.map((s) => [s.id, `${s.name} (${s.road})`]));
  return dashboard(db, days, names, env.USERS);
}

function loginPage(msg, status = 200) {
  return page('Posh Services stats', `<main class="narrow login"><h1>${wordmark}</h1>
<form method="post" action="/login">
<label>Name <input name="user" autocomplete="username" autocapitalize="none" required></label>
<label>PIN <input name="pin" type="password" inputmode="numeric" autocomplete="current-password" required></label>
${msg ? `<p class="err">${esc(msg)}</p>` : ''}<button type="submit">Log in</button></form></main>`, status);
}

// ---------- dashboard ----------
const FEATURE = {
  share: 'Shared a plan', gmaps: 'Opened the route in Google Maps', add_stop: 'Added a stop by hand', remove_stop: 'Removed a stop',
  reset_picks: 'Went back to the suggestions', nearby: 'Opened "Off the motorway nearby"', filters: 'Changed what they want or the interval',
  swap: 'Swapped start and destination', details: 'Clicked through to a services page',
  fav_add: 'Saved a favourite journey', fav_remove: 'Removed a favourite', history_open: 'Reopened a saved or recent journey',
  account_open: 'Opened the account box', signin_start: 'Asked for a sign-in link', signin: 'Signed in', signout: 'Signed out',
  account_delete: 'Deleted their account', feedback_open: 'Opened the feedback box', feedback: 'Sent feedback',
  theme: 'Changed the colour theme', a2hs: 'Home screen: tapped the prompt or the how-to',
};
const THEME = { linen: 'Linen', motorway: 'Motorway', night: 'Night drive', seventies: 'Seventies' };
const FBKIND = { wrong: 'Something\'s wrong', idea: 'Idea', thanks: 'Thank you' };
const PICK = { suggestion: 'Picked from the suggestions', typed: 'Typed it and pressed Find', location: 'Used my location', map: 'Clicked the map' };
const HOW = { form: 'Planned it themselves', map: 'Planned it from the map', shared: 'Opened a shared link', swap: 'Swapped direction', saved: 'Reopened a saved or recent journey' };
const PAGE = { planner: 'Journey planner', list: 'All services list', service: 'A services page', other: 'Other' };

async function dashboard(db, days, names, users) {
  const now = Date.now();
  const today = londonParts(now).day;
  const start = londonParts(now - (days - 1) * 86400e3).day;
  const d7 = londonParts(now - 6 * 86400e3).day;
  const q = (sql, ...p) => db.prepare(sql).bind(...p);
  const R = 'day >= ?';
  const [
    tday, week, range, daily, journeys, picks, hows, feats, pages, services, miles, hours, wdays, devices, refs, fails, recent, total,
  ] = (await db.batch([
    q(`SELECT COUNT(DISTINCT vid) AS v, SUM(name='plan') AS plans FROM events WHERE day = ?`, today),
    q(`SELECT COUNT(DISTINCT day||vid) AS v FROM events WHERE day >= ? AND name='view'`, d7),
    q(`SELECT COUNT(DISTINCT day||vid) AS vd, SUM(name='view') AS pv, SUM(name='plan') AS plans, COUNT(DISTINCT CASE WHEN name='plan' THEN day||vid END) AS planners, COUNT(DISTINCT day) AS nd FROM events WHERE ${R}`, start),
    q(`SELECT day, COUNT(DISTINCT vid) AS v, SUM(name='plan') AS plans FROM events WHERE ${R} GROUP BY day ORDER BY day`, start),
    q(`SELECT place, COUNT(*) AS n, COUNT(DISTINCT day||vid) AS v, ROUND(AVG(num)) AS mi FROM events WHERE ${R} AND name='plan' AND place IS NOT NULL GROUP BY place ORDER BY n DESC LIMIT 20`, start),
    q(`SELECT extra, COUNT(*) AS n FROM events WHERE ${R} AND name='pick' GROUP BY extra ORDER BY n DESC`, start),
    q(`SELECT extra, COUNT(*) AS n FROM events WHERE ${R} AND name='plan' GROUP BY extra ORDER BY n DESC`, start),
    q(`SELECT name, COUNT(*) AS n, COUNT(DISTINCT day||vid) AS v FROM events WHERE ${R} AND name NOT IN ('view','plan','plan_fail','pick') GROUP BY name ORDER BY v DESC`, start),
    q(`SELECT page, COUNT(*) AS n, COUNT(DISTINCT day||vid) AS v FROM events WHERE ${R} AND name='view' GROUP BY page ORDER BY n DESC`, start),
    q(`SELECT place, COUNT(*) AS n FROM events WHERE ${R} AND name='view' AND page='service' AND place IS NOT NULL GROUP BY place ORDER BY n DESC LIMIT 15`, start),
    q(`SELECT num FROM events WHERE ${R} AND name='plan' AND num IS NOT NULL`, start),
    q(`SELECT hour, COUNT(*) AS n FROM events WHERE ${R} AND name='plan' GROUP BY hour`, start),
    q(`SELECT CAST(strftime('%w', day) AS INTEGER) AS w, COUNT(*) AS n FROM events WHERE ${R} AND name='plan' GROUP BY w`, start),
    q(`SELECT device, COUNT(DISTINCT day||vid) AS v, SUM(standalone) AS hs FROM events WHERE ${R} AND name='view' GROUP BY device ORDER BY v DESC`, start),
    q(`SELECT ref, COUNT(*) AS n FROM events WHERE ${R} AND name='view' AND ref IS NOT NULL GROUP BY ref ORDER BY n DESC LIMIT 10`, start),
    q(`SELECT extra, COUNT(*) AS n FROM events WHERE ${R} AND name='plan_fail' GROUP BY extra ORDER BY n DESC LIMIT 8`, start),
    q(`SELECT ts, name, page, place, extra, device, num FROM events ORDER BY ts DESC, id DESC LIMIT 40`),
    q(`SELECT COUNT(*) AS n, MIN(day) AS first FROM events`),
  ])).map((r) => r.results);
  const themes = (await q(`SELECT extra, COUNT(*) AS n FROM events WHERE ${R} AND name='theme' GROUP BY extra ORDER BY n DESC`, start).all()).results;

  // accounts and feedback live in the site's own database
  let fbRows = [], fbCounts = [], acct = { n: 0, active: 0 };
  if (users) {
    try {
      const startMs = now - days * 86400e3;
      const [a, b, c] = await users.batch([
        users.prepare('SELECT COUNT(*) AS n, SUM(last_seen > ?) AS active FROM users').bind(now - 30 * 86400e3),
        users.prepare('SELECT ts, kind, message, page, service, email, device, issue_url FROM feedback ORDER BY ts DESC LIMIT 40'),
        users.prepare('SELECT kind, COUNT(*) AS n FROM feedback WHERE ts > ? GROUP BY kind').bind(startMs),
      ]);
      acct = a.results[0] || acct; fbRows = b.results; fbCounts = c.results;
    } catch (e) { /* tables not there yet */ }
  }

  const T = tday[0] || {}, RG = range[0] || {};
  const visitorDays = RG.vd || 0;
  const plans = RG.plans || 0;
  const avgDaily = visitorDays / days;
  const pct = (n, of) => (of ? Math.round((100 * n) / of) : 0);
  const fmtDay = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const time = (ms) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
  const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

  // every day in the range, including quiet ones
  const byDay = new Map(daily.map((r) => [r.day, r]));
  const allDays = [];
  for (let i = days - 1; i >= 0; i--) allDays.push(londonParts(now - i * 86400e3).day);
  const showEvery = days <= 30 ? 1 : days <= 90 ? 7 : 30;
  const dayChart = (key, what) => {
    const max = Math.max(1, ...daily.map((r) => r[key] || 0));
    return `<div class="cols" style="--n:${allDays.length}">` + allDays.map((d, i) => {
      const r = byDay.get(d) || {};
      const v = r[key] || 0;
      const lab = i % showEvery === 0 || i === allDays.length - 1 ? `<i class="${days === 7 || (allDays.length - 1 - i) % 5 === 0 ? 'm' : ''}">${esc(days <= 30 ? fmtDay(d).replace(/ \w+$/, '') : fmtDay(d).slice(4))}</i>` : '';
      return `<div class="col${d === today ? ' today' : ''}" title="${esc(fmtDay(d))}: ${plural(v, what[0], what[1])}"><b style="height:${(100 * v) / max}%">${v ? `<em>${v}</em>` : ''}</b>${lab}</div>`;
    }).join('') + '</div>';
  };

  const bars = (rows, label, value, opts = {}) => {
    if (!rows.length) return '<p class="none">Nothing yet.</p>';
    const max = Math.max(1, ...rows.map(value));
    return '<div class="bars">' + rows.map((r) => {
      const v = value(r);
      return `<div class="bar"><span class="bl">${label(r)}</span><span class="bt"><b style="width:${(100 * v) / max}%"></b></span><span class="bv">${opts.fmt ? opts.fmt(v, r) : v}</span></div>`;
    }).join('') + '</div>';
  };
  const hourArr = Array.from({ length: 24 }, (_, h) => (hours.find((r) => r.hour === h) || { n: 0 }).n);
  const hmax = Math.max(1, ...hourArr);
  const hourChart = '<div class="cols small" style="--n:24">' + hourArr.map((n, h) =>
    `<div class="col" title="${String(h).padStart(2, '0')}:00 to ${String(h + 1).padStart(2, '0')}:00: ${plural(n, 'journey')}"><b style="height:${(100 * n) / hmax}%"></b>${h % 3 === 0 ? `<i>${String(h).padStart(2, '0')}</i>` : ''}</div>`).join('') + '</div>';
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const wdRows = [1, 2, 3, 4, 5, 6, 0].map((w) => ({ w, n: (wdays.find((r) => r.w === w) || { n: 0 }).n }));
  const BANDS = [[0, 50, 'Under 50 miles'], [50, 100, '50 to 100 miles'], [100, 200, '100 to 200 miles'], [200, 300, '200 to 300 miles'], [300, 1e9, 'Over 300 miles']];
  const mileRows = BANDS.map(([a, b, l]) => ({ l, n: miles.filter((r) => r.num >= a && r.num < b).length }));
  const avgMiles = miles.length ? Math.round(miles.reduce((a, r) => a + r.num, 0) / miles.length) : null;

  const ranges = [7, 30, 90, 365].map((d) => `<a href="/?days=${d}" class="${d === days ? 'on' : ''}">${d === 365 ? '1 year' : d + ' days'}</a>`).join('');
  const featRows = feats.map((r) => ({ ...r, label: FEATURE[r.name] || r.name }));
  const pickTotal = picks.reduce((a, r) => a + r.n, 0);
  const howTotal = hows.reduce((a, r) => a + r.n, 0);
  const svcName = (id) => names.get(id) || id;

  const recentLine = (r) => {
    switch (r.name) {
      case 'view': return `Opened ${esc((PAGE[r.page] || 'a page').replace(/^A /, 'a ').replace(/^(Journey|All)/, (m) => 'the ' + m.toLowerCase()))}${r.page === 'service' && r.place ? `: <small>${esc(svcName(r.place))}</small>` : ''}${r.extra === 'shared' ? ' <small>from a shared link</small>' : ''}`;
      case 'plan': return `Planned <strong>${esc(r.place || 'a journey')}</strong>${r.num != null ? ` <small>${r.num} miles</small>` : ''}`;
      case 'plan_fail': return `A plan failed <small>${esc(r.extra || '')}</small>`;
      case 'pick': return `Chose a place: <small>${esc(PICK[r.extra] || r.extra || '')}</small>`;
      case 'filters': return `Changed the options <small>${esc(r.extra || '')}</small>`;
      case 'details': return `Clicked through to <small>${esc(svcName(r.place) || 'a services page')}</small>`;
      default: return `${esc(FEATURE[r.name] || r.name)}${r.place ? ` <small>${esc(svcName(r.place))}</small>` : ''}`;
    }
  };

  const body = `<header><div class="wrap"><h1>${wordmark}</h1><nav>${ranges}<a href="https://poshservices.carlosfandango.net/" class="out" target="_blank" rel="noopener">Open the site</a><a href="/logout" class="out">Log out</a></nav></div></header>
<main class="wrap">
${total[0] && total[0].n ? '' : '<p class="panel note">No visits counted yet. Counting starts once the updated site is live. Your own visits count too, unless you open the site once on each device with <code>?nocount=1</code> on the end of the address.</p>'}
<section class="cards">
  <div class="card"><b>${T.v || 0}</b><span>people today</span><small>${plural(T.plans || 0, 'journey')} planned</small></div>
  <div class="card"><b>${week[0] ? week[0].v : 0}</b><span>visits in the last 7 days</span><small>one per person per day</small></div>
  <div class="card"><b>${plans}</b><span>journeys planned</span><small>last ${days === 365 ? 'year' : days + ' days'}${avgMiles != null ? `, ${avgMiles} miles on average` : ''}</small></div>
  <div class="card"><b>${pct(RG.planners || 0, visitorDays)}%</b><span>of visits planned a journey</span><small>${avgDaily.toFixed(avgDaily < 10 ? 1 : 0)} people a day on average</small></div>
</section>

<div class="grid">
<section class="panel"><h2>People per day</h2>${dayChart('v', ['person', 'people'])}<p class="note">A person is counted once a day. The site can't tell if the same person came back another day, by design.</p></section>
<section class="panel"><h2>Journeys planned per day</h2>${dayChart('plans', ['journey', 'journeys'])}<p class="note">Includes re-plans after a swap, and shared links being opened.</p></section>
</div>

<section class="panel"><h2>Popular journeys</h2>${bars(journeys, (r) => esc(r.place), (r) => r.n, { fmt: (v, r) => `${v} <small>${plural(r.v, 'visit')}${r.mi != null ? `, ${r.mi} mi` : ''}</small>` })}
<p class="note">Place names as people chose them. Postcodes are cut to the first half.</p></section>

<div class="grid">
<section class="panel"><h2>How people chose places</h2>${bars(picks, (r) => esc(PICK[r.extra] || r.extra || 'unknown'), (r) => r.n, { fmt: (v) => `${v} <small>${pct(v, pickTotal)}%</small>` })}
<p class="note">Each start or destination counts once.</p></section>
<section class="panel"><h2>Where journeys came from</h2>${bars(hows, (r) => esc(HOW[r.extra] || r.extra || 'unknown'), (r) => r.n, { fmt: (v) => `${v} <small>${pct(v, howTotal)}%</small>` })}</section>
</div>

<section class="panel"><h2>Features used</h2>${featRows.length ? bars(featRows, (r) => esc(r.label), (r) => r.v, { fmt: (v, r) => `${pct(v, visitorDays)}% <small>${plural(v, 'visit')}, ${plural(r.n, 'time')}</small>` }) : '<p class="none">Nothing yet.</p>'}
<p class="note">Share of visits where each feature was used at least once.</p></section>

<div class="grid">
<section class="panel"><h2>Services pages looked at</h2>${bars(services, (r) => esc(svcName(r.place)), (r) => r.n)}</section>
<section class="panel"><h2>Pages opened</h2>${bars(pages, (r) => esc(PAGE[r.page] || r.page || 'unknown'), (r) => r.n, { fmt: (v, r) => `${v} <small>${plural(r.v, 'visit')}</small>` })}</section>
</div>

<div class="grid">
<section class="panel"><h2>Journey length</h2>${miles.length ? bars(mileRows, (r) => r.l, (r) => r.n) : '<p class="none">Nothing yet.</p>'}</section>
<section class="panel"><h2>Day of the week</h2>${bars(wdRows, (r) => WD[r.w], (r) => r.n)}<p class="note">Journeys planned, by day.</p></section>
</div>

<div class="grid">
<section class="panel"><h2>Time of day</h2>${hourChart}<p class="note">Journeys planned by hour, UK time.</p></section>
<section class="panel"><h2>Devices</h2>${bars(devices, (r) => esc(r.device || 'unknown'), (r) => r.v, { fmt: (v) => `${v} <small>${pct(v, visitorDays)}%</small>` })}
<p class="note">${plural(devices.reduce((a, r) => a + (r.hs || 0), 0), 'page view')} from the site saved to a home screen.</p></section>
</div>

<div class="grid">
<section class="panel"><h2>Where visitors came from</h2>${refs.length ? bars(refs, (r) => esc(r.ref), (r) => r.n) : '<p class="none">No links from other sites yet. Most visits are typed, bookmarked or from shared links in messages.</p>'}</section>
<section class="panel"><h2>Plans that failed</h2>${fails.length ? bars(fails, (r) => esc(r.extra || 'unknown'), (r) => r.n) : '<p class="none">No failed plans recorded.</p>'}</section>
</div>

<div class="grid">
<section class="panel"><h2>Accounts</h2>
<p class="kv"><span>People with an account</span><b>${acct.n || 0}</b></p>
<p class="kv"><span>Used it in the last 30 days</span><b>${acct.active || 0}</b></p>
<p class="note">Everyone else's favourites and recent journeys are kept on their own device only.</p></section>
<section class="panel"><h2>Colour themes picked</h2>${themes.length ? bars(themes, (r) => esc(THEME[r.extra] || r.extra || 'unknown'), (r) => r.n) : '<p class="none">Nobody has changed the theme yet.</p>'}</section>
</div>

<section class="panel"><h2>Feedback</h2>
${fbCounts.length ? `<p class="note" style="margin:0 0 10px">${fbCounts.map((r) => `${esc(FBKIND[r.kind] || r.kind)}: <b>${r.n}</b>`).join(' · ')} in this period</p>` : ''}
<div class="recent">${fbRows.length ? fbRows.map((r) => `<div><time>${esc(time(r.ts))}</time><span><b>${esc(FBKIND[r.kind] || r.kind)}</b>${r.message ? `: ${esc(r.message)}` : ' <small>(no message)</small>'}${r.service ? ` <small>on ${esc(svcName(r.service))}</small>` : ''}${r.email ? ` <small>reply to <a href="mailto:${esc(r.email)}">${esc(r.email)}</a></small>` : ''}${r.issue_url ? ` <small><a href="${esc(r.issue_url)}" target="_blank" rel="noopener">GitHub issue</a></small>` : ''}</span><small>${esc(r.device || '')}</small></div>`).join('') : '<p class="none">No feedback yet.</p>'}</div></section>

<section class="panel"><h2>Latest activity</h2><div class="recent">${recent.length ? recent.map((r) =>
    `<div><time>${esc(time(r.ts))}</time><span>${recentLine(r)}</span><small>${esc(r.device || '')}</small></div>`).join('') : '<p class="none">Nothing yet.</p>'}</div></section>

<p class="foot">Counting is anonymous: no cookies on Posh Services, no IP addresses kept, and the daily visitor code can't be traced back. Events older than about 13 months are deleted.
${total[0] && total[0].first ? ` Counting since ${esc(fmtDay(total[0].first))}.` : ''}</p>
</main>`;
  return page('Posh Services stats', body);
}

const CSS = `
:root{--green:#1f4a3a;--green2:#163629;--ink:#1d2a23;--muted:#5f6b63;--line:#dacfba;--bg:#f6f0e4;--card:#fffdf8;--soft:#ede5d5;--brass:#b8903a;--brass2:#e3c06a;--danger:#8e3a2c}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 'Atkinson Hyperlegible',system-ui,sans-serif}
header{background:var(--green);color:#fff;padding:12px 16px}h1{margin:0;font-weight:400}
.wm{display:inline-flex;align-items:baseline;gap:5px;background:var(--green);border-radius:6px;padding:3px 10px 4px;box-shadow:inset 0 0 0 1.5px #f6f0e4;color:#fff}
.wm i{font:italic 23px/1 'Instrument Serif',Georgia,serif}.wm b{font:700 15px/1 'Atkinson Hyperlegible',sans-serif}
.wm-stats{font:italic 23px/1 'Instrument Serif',Georgia,serif;color:var(--brass2);margin-left:4px}
.wrap{max-width:1100px;margin:0 auto}header .wrap{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}
nav{display:flex;flex-wrap:wrap;gap:6px}nav a{color:#fff;text-decoration:none;border:1px solid rgba(246,240,228,.4);border-radius:999px;padding:5px 12px;font-size:13px;font-weight:700}
nav a.on{background:#f6f0e4;color:var(--green)}nav a.out{border-color:transparent;opacity:.85}
main.wrap{padding:16px}.panel{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin-bottom:12px}
h2{font:italic 21px/1.2 'Instrument Serif',Georgia,serif;color:var(--green);margin:0 0 10px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:0 12px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:12px}
.card{background:var(--green);color:#fff;border-radius:10px;padding:14px;box-shadow:inset 0 0 0 2px var(--green),inset 0 0 0 3.5px #f6f0e4}
.card b{display:block;font:italic 40px/1.05 'Instrument Serif',Georgia,serif;color:var(--brass2)}.card span{display:block;font-weight:700}.card small{color:#cfdcd3}
.cols{display:grid;grid-template-columns:repeat(var(--n),1fr);gap:3px;height:170px;align-items:end;padding-bottom:22px;position:relative}
.cols.small{height:120px}.col{height:100%;display:flex;flex-direction:column;justify-content:flex-end;position:relative}
.col b{display:block;background:#8fae9f;border-radius:3px 3px 0 0;min-height:2px;position:relative}.col.today b{background:var(--brass)}
.col b em{position:absolute;top:-17px;left:50%;transform:translateX(-50%);font-style:normal;font-size:11px;color:var(--muted)}
.col i{position:absolute;bottom:-20px;left:0;font-style:normal;font-size:10px;color:var(--muted);white-space:nowrap}
.cols:not(.small) .col i:not(.m){display:none}
.bars{display:flex;flex-direction:column;gap:6px}.bar{display:grid;grid-template-columns:minmax(110px,44%) 1fr auto;gap:8px;align-items:center;font-size:14px}
.bl{overflow-wrap:anywhere}.bt{background:var(--soft);border-radius:4px;height:14px;overflow:hidden}.bt b{display:block;height:100%;background:var(--green);border-radius:4px}
.bv{font-weight:700;white-space:nowrap}.bv small,.recent small{color:var(--muted);font-weight:400}
.note{font-size:13px;color:var(--muted);margin:8px 0 0}.none{color:var(--muted);margin:0}
.recent>div{display:grid;grid-template-columns:110px 1fr auto;gap:8px;padding:5px 0;border-bottom:1px solid var(--soft);font-size:14px}
.recent time{color:var(--muted);font-size:13px}.foot{font-size:12px;color:var(--muted)}code{background:var(--soft);padding:1px 4px;border-radius:4px}
.narrow{max-width:380px;margin:12vh auto;padding:20px}.login h1{margin-bottom:16px}
.login form{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:12px}
.login label{display:flex;flex-direction:column;gap:4px;font-weight:700;font-size:14px}.login input{font:inherit;font-size:17px;padding:10px;border:1px solid var(--line);border-radius:8px;background:#fff}
.login input:focus-visible,.login button:focus-visible,nav a:focus-visible{outline:3px solid var(--brass);outline-offset:2px}
.login button{font:inherit;font-weight:700;font-size:16px;background:var(--green);color:#fff;border:0;border-radius:999px;padding:12px;cursor:pointer}
.login button:hover{background:var(--green2)}.err{color:var(--danger);margin:0;font-weight:700}
@media (max-width:600px){main.wrap{padding:12px}.cards{grid-template-columns:1fr 1fr;gap:8px}.card{padding:10px}.card b{font-size:30px}.card span{font-size:13px}.cols .col i:not(.m),.cols .col b em{display:none}.cols.small .col i{display:block}.bar{grid-template-columns:minmax(90px,42%) 1fr auto}.recent>div{grid-template-columns:1fr;gap:0}.cols{height:140px}.grid{grid-template-columns:1fr}}
`;
