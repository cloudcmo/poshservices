import SERVICES from './services.json';
import { matchServices, simplify, poshScore, dogScore } from './match.js';
import { servicePage, listPage, notFoundPage } from './pages.js';

const OSRM_DEFAULT = 'https://router.project-osrm.org';
const PC = 'https://api.postcodes.io';
const UA = 'PoshServices/1.0 (journey planner; contact via poshservices site)';

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra },
  });

const html = (body, status = 200) =>
  new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' } });

// Fetch JSON with the Workers cache in front of it
async function cachedJson(url, ctx, ttl = 86400) {
  const cache = caches.default;
  const key = new Request(url);
  const hit = await cache.match(key);
  if (hit) return hit.json();
  let res;
  try {
    res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
  } catch (e) {
    throw new UpstreamError(String(e));
  }
  if (!res.ok && res.status !== 404) throw new UpstreamError(`upstream ${res.status} for ${url}`);
  const body = await res.text();
  if (res.ok) {
    ctx.waitUntil(cache.put(key, new Response(body, { headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${ttl}` } })));
  }
  return JSON.parse(body);
}

const FULL_PC = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const OUT_PC = /^[A-Z]{1,2}\d[A-Z\d]?$/i;
const LATLNG = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;
const PLACE_RANK = { City: 0, Town: 1, Village: 2, 'Suburban Area': 3, Hamlet: 4, 'Other Settlement': 5 };

const placeLabel = p => [p.name_1, p.county_unitary || p.district_borough || p.region].filter(Boolean).join(', ');

async function suggest(q, ctx) {
  q = q.trim();
  if (q.length < 2) return [];
  const out = [];
  if (/^[A-Z]{1,2}\d/i.test(q)) {
    const r = await cachedJson(`${PC}/postcodes?q=${encodeURIComponent(q)}&limit=6`, ctx);
    for (const p of r.result || []) {
      out.push({ label: p.postcode, sub: [p.admin_district, p.region || p.country].filter(Boolean).join(', '), lat: p.latitude, lng: p.longitude });
    }
    if (!out.length && OUT_PC.test(q)) {
      const o = await cachedJson(`${PC}/outcodes/${encodeURIComponent(q)}`, ctx);
      if (o.result) out.push({ label: o.result.outcode, sub: (o.result.admin_district || []).slice(0, 2).join(', '), lat: o.result.latitude, lng: o.result.longitude });
    }
  }
  if (out.length < 3) {
    const r = await cachedJson(`${PC}/places?q=${encodeURIComponent(q.split(',')[0])}&limit=15`, ctx);
    const places = (r.result || [])
      .filter(p => p.local_type in PLACE_RANK)
      .sort((a, b) => {
        const exact = (x) => (x.name_1.toLowerCase() === q.toLowerCase() ? 0 : 1);
        return exact(a) - exact(b) || PLACE_RANK[a.local_type] - PLACE_RANK[b.local_type];
      });
    const seen = new Set();
    for (const p of places) {
      const label = placeLabel(p);
      if (seen.has(label)) continue;
      seen.add(label);
      out.push({ label: p.name_1, sub: [p.county_unitary || p.district_borough, p.region].filter(Boolean).join(', '), lat: p.latitude, lng: p.longitude });
      if (out.length >= 7) break;
    }
  }
  return out;
}

async function geocode(text, ll, ctx) {
  if (ll && LATLNG.test(ll)) {
    const [, lat, lng] = ll.match(LATLNG);
    return { label: text || ll, lat: +lat, lng: +lng };
  }
  if (!text) throw new UserError('Enter where you are starting from and where you are going.');
  if (LATLNG.test(text)) {
    const [, lat, lng] = text.match(LATLNG);
    return { label: 'Your location', lat: +lat, lng: +lng };
  }
  const t = text.trim();
  if (FULL_PC.test(t)) {
    const r = await cachedJson(`${PC}/postcodes/${encodeURIComponent(t)}`, ctx);
    if (r.result) return { label: r.result.postcode, lat: r.result.latitude, lng: r.result.longitude };
  }
  if (OUT_PC.test(t)) {
    const r = await cachedJson(`${PC}/outcodes/${encodeURIComponent(t)}`, ctx);
    if (r.result) return { label: r.result.outcode, lat: r.result.latitude, lng: r.result.longitude };
  }
  const s = await suggest(t, ctx);
  if (s.length) return { label: s[0].label, lat: s[0].lat, lng: s[0].lng };
  throw new UserError(`Couldn't find "${t}". Try a town name or a postcode.`);
}

class UserError extends Error {}
class UpstreamError extends Error {}

async function route(from, to, env, ctx) {
  const base = env.OSRM_URL || OSRM_DEFAULT;
  const c = p => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`;
  const url = `${base}/route/v1/driving/${c(from)};${c(to)}?overview=full&geometries=geojson&annotations=duration,distance&steps=true`;
  let r;
  try {
    r = await cachedJson(url, ctx, 7 * 86400);
  } catch (e) {
    throw new UserError('The route planner is busy right now. Please try again in a minute.');
  }
  if (r.code !== 'Ok' || !r.routes?.length) throw new UserError("Couldn't find a driving route between those places.");
  const rt = r.routes[0];
  const leg = rt.legs[0];
  return {
    coords: rt.geometry.coordinates,
    segDur: leg.annotation?.duration || null,
    segDist: leg.annotation?.distance || null,
    duration: rt.duration,
    distance: rt.distance,
    steps: (leg.steps || []).map(s => ({ distance: s.distance, ref: s.ref || '' })),
  };
}

async function plan(url, env, ctx) {
  const p = url.searchParams;
  const [from, to] = await Promise.all([
    geocode(p.get('from'), p.get('fll'), ctx),
    geocode(p.get('to'), p.get('tll'), ctx),
  ]);
  const r = await route(from, to, env, ctx);
  const services = matchServices(r, SERVICES);
  return {
    from, to,
    distance: Math.round(r.distance),
    duration: Math.round(r.duration),
    line: simplify(r.coords),
    services,
  };
}

// Summary data for the client-side "all services" map and lists
const SUMMARY = SERVICES.map(s => {
  const brands = [...new Set([...s.sides.flatMap(sd => sd.brands), ...s.shared])];
  return {
    id: s.id, name: s.name, road: s.road, lat: s.lat, lng: s.lng,
    posh: poshScore({ brands, farmShop: s.farmShop, independent: s.independent, outdoor: s.outdoor, dogArea: s.dogArea }),
    dog: dogScore(s),
  };
});

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    try {
      if (path === '/api/suggest') {
        return json(await suggest(url.searchParams.get('q') || '', ctx), 200, { 'cache-control': 'public, max-age=86400' });
      }
      if (path === '/api/plan') {
        return json(await plan(url, env, ctx), 200, { 'cache-control': 'public, max-age=3600' });
      }
      if (path === '/api/services') {
        return json(SUMMARY, 200, { 'cache-control': 'public, max-age=3600' });
      }
      if (path === '/services') {
        return html(listPage(SERVICES, SUMMARY));
      }
      const m = path.match(/^\/services\/([a-z0-9-]+)$/);
      if (m) {
        const svc = SERVICES.find(s => s.id === m[1]);
        if (!svc) return html(notFoundPage(), 404);
        const sum = SUMMARY.find(s => s.id === svc.id);
        return html(servicePage(svc, sum));
      }
    } catch (e) {
      if (e instanceof UserError) return json({ error: e.message }, 400);
      if (e instanceof UpstreamError) {
        console.error(e.message);
        return json({ error: 'One of the map services we rely on is not responding. Please try again in a minute.' }, 503);
      }
      console.error(e);
      return json({ error: 'Something went wrong working that out. Please try again.' }, 500);
    }

    return env.ASSETS.fetch(request);
  },
};
