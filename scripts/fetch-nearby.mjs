// Refreshes public/nearby-data.json: for every service area, the nearest
// motorway junction, the two nearest independent pubs or cafés and the
// nearest petrol station within 5 minutes' drive of that exit.
//
// Uses free OpenStreetMap data (Overpass) and OSRM drive times. The public
// Overpass server is often busy, so this retries and can take 10-20 minutes.
// Run on your Mac with: npm run nearby
import { readFileSync, writeFileSync } from 'node:fs';

const SERVICES = JSON.parse(readFileSync(new URL('../src/services.json', import.meta.url)));
const OUT = new URL('../public/nearby-data.json', import.meta.url);
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
const OSRM = process.env.OSRM_URL || 'https://router.project-osrm.org';
const UA = 'PoshServices/1.0 (journey planner; data refresh)';
const MAX_SECS = 300, RADIUS = 4500, JUNCTION_MAX = 9000, BATCH = 14;
const SUPERMARKETS = /tesco|sainsbury|asda|morrison|costco|co-?op|waitrose/i;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const hav = (a, b) => {
  const R = 6371000, r = d => (d * Math.PI) / 180;
  const s = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

async function overpass(query) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const url = OVERPASS[attempt % OVERPASS.length];
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': UA },
        body: 'data=' + encodeURIComponent(query),
      });
      if (res.ok) {
        const d = await res.json();
        if (!(d.remark && /timed out|runtime error/i.test(d.remark))) return d.elements || [];
        console.log(`  ${url}: ${d.remark}`);
      } else console.log(`  ${url}: HTTP ${res.status}, retrying`);
    } catch (e) { console.log(`  ${url}: ${e.message}, retrying`); }
    await sleep(10000 * (attempt + 1));
  }
  throw new Error('Overpass kept failing. Try again later.');
}

const describe = t => {
  const n = [];
  if (t.amenity === 'pub' && (t.food === 'yes' || t.cuisine)) n.push('serves food');
  if (t.dog === 'yes') n.push('dogs welcome');
  if (t.beer_garden === 'yes' || t.outdoor_seating === 'yes') n.push('outdoor seating');
  if (t.real_ale === 'yes') n.push('real ale');
  return n;
};
// Search text for a "look it up" link (the page turns it into a Google Maps search)
const lookup = (p, name) => {
  const t = p.tags;
  const where = t['addr:postcode'] || t['addr:village'] || t['addr:town'] || t['addr:city'] || '';
  return where ? `${name}, ${where}` : `${name} ${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
};
const isPublic = p => !['private', 'customers', 'no', 'permit'].includes(p.tags.access) && !/canteen|staff|members/i.test(p.tags.name);
const isCarFuel = p => !/hgv|truck|lorry/i.test(`${p.tags.name} ${p.tags.brand || ''}`) && p.tags.motorcar !== 'no' && p.tags.access !== 'private';

console.log('1/3 Motorway junctions…');
const junctions = (await overpass('[out:json][timeout:180];node[highway=motorway_junction](49.8,-6.5,59,2);out body;'))
  .map(e => ({ lat: e.lat, lng: e.lon, ref: e.tags?.ref || null, name: e.tags?.name || null }))
  // Numbered exits only: service-area slip roads are sometimes tagged as junctions too
  .filter(j => j.ref && /\d/.test(j.ref));
console.log(`  ${junctions.length} junctions`);

const pick = {};
for (const s of SERVICES) {
  let best = null, bd = Infinity;
  for (const j of junctions) { const d = hav(s, j); if (d < bd) { bd = d; best = j; } }
  pick[s.id] = bd <= JUNCTION_MAX ? best : null;
}
const uniq = [...new Map(Object.values(pick).filter(Boolean).map(j => [`${j.lat},${j.lng}`, j])).values()];

console.log(`2/3 Pubs, cafés and fuel near ${uniq.length} exits…`);
const amen = new Map();
for (let b = 0; b < uniq.length; b += BATCH) {
  const part = uniq.slice(b, b + BATCH);
  const q = '[out:json][timeout:90];(' + part.map(j => `nwr[amenity~"^(pub|cafe|fuel)$"](around:${RADIUS},${j.lat},${j.lng});`).join('') + ');out center tags;';
  for (const el of await overpass(q)) {
    const p = { lat: el.lat ?? el.center?.lat, lng: el.lon ?? el.center?.lon, tags: el.tags || {} };
    if (p.lat != null && p.tags.name) amen.set(el.type + el.id, p);
  }
  console.log(`  ${Math.min(b + BATCH, uniq.length)}/${uniq.length}`);
  await sleep(3000);
}
const all = [...amen.values()];

console.log('3/3 Drive times…');
const out = {};
for (const s of SERVICES) {
  const j = pick[s.id];
  if (!j) { out[s.id] = { junction: null, places: [], fuel: null }; continue; }
  const near = all.map(p => ({ ...p, crow: hav(j, p) })).filter(p => p.crow <= RADIUS);
  const food = near.filter(p => (p.tags.amenity === 'pub' || p.tags.amenity === 'cafe') && !p.tags.brand && !p.tags['brand:wikidata'] && isPublic(p))
    .sort((a, b) => a.crow - b.crow).slice(0, 20);
  const fuel = near.filter(p => p.tags.amenity === 'fuel' && isCarFuel(p)).sort((a, b) => a.crow - b.crow).slice(0, 8);
  const targets = [...food, ...fuel];
  if (targets.length) {
    const coords = [j, ...targets].map(p => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(';');
    for (let i = 0; i < 4; i++) {
      try {
        const r = await fetch(`${OSRM}/table/v1/driving/${coords}?sources=0&annotations=duration`, { headers: { 'user-agent': UA } });
        if (r.ok) { (await r.json()).durations[0].slice(1).forEach((d, k) => { targets[k].secs = d; }); break; }
      } catch { /* retry */ }
      await sleep(3000 * (i + 1));
    }
    await sleep(1100);
  }
  const ok = l => l.filter(p => p.secs != null && p.secs <= MAX_SECS).sort((a, b) => a.secs - b.secs);
  // The same place can be mapped twice (a point and a building outline)
  const dedupe = l => l.filter((p, i, arr) => arr.findIndex(x => x.tags.name.toLowerCase() === p.tags.name.toLowerCase()) === i);
  const f = ok(fuel)[0];
  out[s.id] = {
    junction: { ref: j.ref, name: j.name },
    places: dedupe(ok(food)).slice(0, 2).map(p => ({
      name: p.tags.name, kind: p.tags.amenity === 'pub' ? 'Pub' : 'Café',
      mins: Math.max(1, Math.round(p.secs / 60)), notes: describe(p.tags), q: lookup(p, p.tags.name),
    })),
    fuel: f ? {
      name: f.tags.brand || f.tags.name, mins: Math.max(1, Math.round(f.secs / 60)),
      supermarket: SUPERMARKETS.test(`${f.tags.brand || ''} ${f.tags.name || ''} ${f.tags.operator || ''}`),
      q: lookup(f, f.tags.name || f.tags.brand),
    } : null,
  };
  process.stdout.write('.');
}
writeFileSync(OUT, JSON.stringify(out));
console.log(`\nWrote public/nearby-data.json for ${Object.keys(out).length} service areas.`);
