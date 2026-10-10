// "Off the motorway nearby": the nearest junction to a stop, then the two
// nearest independent pubs or cafés and the nearest petrol station within
// a short drive of that exit. All from OpenStreetMap (free), with drive
// times from OSRM.
//
// Runs in the visitor's browser: the public Overpass server refuses requests
// from Cloudflare's shared servers, but answers browsers fine.

const OVERPASS = ['https://overpass-api.de/api/interpreter'];
const MAX_SECS = 5 * 60;          // "within 5 minutes of the exit"
const SEARCH_M = 4500;            // straight-line radius that can be reached in ~5 min

const SUPERMARKETS = /tesco|sainsbury|asda|morrison|costco|co-?op|waitrose/i;

function haversine(a, b) {
  const R = 6371000, r = d => (d * Math.PI) / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function overpass(query) {
  let lastErr;
  for (const url of OVERPASS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
      });
      if (res.ok) return (await res.json()).elements || [];
      lastErr = new Error(`overpass ${res.status}`);
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

const placeOf = el => ({
  lat: el.lat ?? el.center?.lat,
  lng: el.lon ?? el.center?.lon,
  tags: el.tags || {},
});

function describe(p) {
  const t = p.tags;
  const notes = [];
  if (t.amenity === 'pub' && (t.food === 'yes' || t.cuisine)) notes.push('serves food');
  if (t.dog === 'yes') notes.push('dogs welcome');
  if (t.beer_garden === 'yes' || t.outdoor_seating === 'yes') notes.push('outdoor seating');
  if (t.real_ale === 'yes') notes.push('real ale');
  return notes;
}

function lookupUrl(p) {
  const t = p.tags;
  const where = t['addr:postcode'] || t['addr:village'] || t['addr:town'] || t['addr:city'] || '';
  const q = where ? `${t.name}, ${where}` : `${t.name} ${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export async function nearby(lat, lng, osrmBase) {
  const here = { lat, lng };

  // 1. Nearest motorway junction to the stop
  const junctions = (await overpass(
    `[out:json][timeout:20];node[highway=motorway_junction](around:7000,${lat},${lng});out body;`
  )).map(el => ({ lat: el.lat, lng: el.lon, ref: el.tags?.ref || null, name: el.tags?.name || null }));
  if (!junctions.length) return { junction: null, places: [], fuel: null };
  junctions.sort((a, b) => haversine(here, a) - haversine(here, b));
  const j = junctions[0];

  // 2. Pubs, cafés and fuel around that junction
  const els = await overpass(
    `[out:json][timeout:25];nwr[amenity~"^(pub|cafe|fuel)$"](around:${SEARCH_M},${j.lat},${j.lng});out center tags;`
  );
  const all = els.map(placeOf).filter(p => p.lat != null && p.tags.name);
  // Independents only for food and drink: anything carrying a brand tag is a chain
  const food = all
    .filter(p => (p.tags.amenity === 'pub' || p.tags.amenity === 'cafe') && !p.tags.brand && !p.tags['brand:wikidata'])
    .map(p => ({ ...p, crow: haversine(j, p) }))
    .sort((a, b) => a.crow - b.crow)
    .slice(0, 20);
  const fuel = all
    .filter(p => p.tags.amenity === 'fuel')
    .map(p => ({ ...p, crow: haversine(j, p) }))
    .sort((a, b) => a.crow - b.crow)
    .slice(0, 8);

  // 3. Real drive times from the junction
  const targets = [...food, ...fuel];
  if (!targets.length) return { junction: j, places: [], fuel: null };
  const coords = [j, ...targets].map(p => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(';');
  const tRes = await fetch(`${osrmBase}/table/v1/driving/${coords}?sources=0&annotations=duration`);
  if (!tRes.ok) throw new Error(`osrm table ${tRes.status}`);
  const durs = (await tRes.json()).durations?.[0] || [];
  targets.forEach((p, i) => { p.secs = durs[i + 1]; });

  const near = list => list.filter(p => p.secs != null && p.secs <= MAX_SECS).sort((a, b) => a.secs - b.secs);

  const places = near(food).slice(0, 2).map(p => ({
    name: p.tags.name,
    kind: p.tags.amenity === 'pub' ? 'Pub' : 'Café',
    mins: Math.max(1, Math.round(p.secs / 60)),
    notes: describe(p),
    url: lookupUrl(p),
    lat: p.lat, lng: p.lng,
  }));

  const f = near(fuel)[0];
  const fuelOut = f ? {
    name: f.tags.brand || f.tags.name,
    mins: Math.max(1, Math.round(f.secs / 60)),
    supermarket: SUPERMARKETS.test(`${f.tags.brand || ''} ${f.tags.name || ''} ${f.tags.operator || ''}`),
    url: lookupUrl({ ...f, tags: { ...f.tags, name: f.tags.name || f.tags.brand } }),
  } : null;

  return { junction: { ref: j.ref, name: j.name }, places, fuel: fuelOut };
}
