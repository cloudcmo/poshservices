// Route matching: given a driving route, work out which service areas you
// actually pass, which side of the road you'd use, and when you'd get there.

const R = 6371000;
const toRad = d => (d * Math.PI) / 180;

export function haversine(a, b) {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Local flat projection (metres), good enough over a few km
function project(p, lat0) {
  return [toRad(p[0]) * R * Math.cos(toRad(lat0)), toRad(p[1]) * R];
}

// Distance from point to segment ab, plus fraction t along it
function pointToSegment(p, a, b) {
  const lat0 = p[1];
  const P = project(p, lat0), A = project(a, lat0), B = project(b, lat0);
  const dx = B[0] - A[0], dy = B[1] - A[1];
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((P[0] - A[0]) * dx + (P[1] - A[1]) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const x = A[0] + t * dx, y = A[1] + t * dy;
  return { d: Math.hypot(P[0] - x, P[1] - y), t };
}

export const normRef = r => String(r || '').toUpperCase().replace(/[\s()]/g, '');

// ── Posh score ──────────────────────────────────────────────────────
// 0 to 5. Food quality and somewhere pleasant to stretch your legs.
const NICE_EXTRAS = ['Leon', 'Cornish Bakery', 'Coco di Mama', 'Wagamama', 'Wenzel\'s', 'Tanners', 'Warrens Bakery'];
export function poshScore({ brands, farmShop, independent, outdoor, dogArea }) {
  let s = 0;
  if (farmShop) s += 2.5;
  if (independent) s += 0.5;
  if (brands.includes('Waitrose')) s += 1.25;
  if (brands.includes('M&S')) s += 1;
  if (brands.includes('Pret')) s += 0.75;
  s += Math.min(0.5, brands.filter(b => NICE_EXTRAS.includes(b)).length * 0.25);
  s += (outdoor?.rating || 0) * 0.5;
  if (dogArea) s += 0.25;
  return Math.min(5, Math.round(s * 2) / 2);
}

export function dogScore({ outdoor, dogArea }) {
  const r = outdoor?.rating || 0;
  return Math.min(3, r + (dogArea && r < 3 ? 1 : 0));
}

const DIR_VEC = { N: [0, 1], S: [0, -1], E: [1, 0], W: [-1, 0] };

// Which side would you use, given your direction of travel (unit vector)?
function pickSide(svc, travel) {
  const both = svc.sides.find(s => s.dir === 'both');
  if (both) return { side: both, sure: true };
  const scored = svc.sides
    .filter(s => DIR_VEC[s.dir])
    .map(s => ({ side: s, dot: DIR_VEC[s.dir][0] * travel[0] + DIR_VEC[s.dir][1] * travel[1] }))
    .sort((a, b) => b.dot - a.dot);
  if (!scored.length) return null;
  // One-direction site: only usable if heading roughly that way
  if (svc.oneWay && scored[0].dot < 0.15) return null;
  return { side: scored[0].side, sure: scored[0].dot > 0.35 };
}

/**
 * route: { coords: [[lng,lat],...], segDur: [s,...] | null, segDist: [m,...] | null,
 *          duration, distance, steps: [{ distance, ref }] }
 * Returns matched services sorted by time from start.
 */
export function matchServices(route, services, opts = {}) {
  const { coords } = route;
  const n = coords.length;
  const MAX_OFF = opts.maxOff ?? 1200;       // metres from the route line
  const NEAR = opts.near ?? 250;             // accept regardless of road ref
  const EDGE = opts.edgeSecs ?? 10 * 60;     // ignore stops in first/last 10 min

  // Cumulative distance and time at each vertex
  const cumD = new Float64Array(n);
  const cumT = new Float64Array(n);
  const useAnn = route.segDur && route.segDur.length === n - 1;
  for (let i = 1; i < n; i++) {
    const d = useAnn && route.segDist ? route.segDist[i - 1] : haversine(coords[i - 1], coords[i]);
    cumD[i] = cumD[i - 1] + d;
    cumT[i] = useAnn ? cumT[i - 1] + route.segDur[i - 1] : 0;
  }
  const totalD = cumD[n - 1] || 1;
  if (!useAnn) for (let i = 0; i < n; i++) cumT[i] = (cumD[i] / totalD) * route.duration;
  const totalT = cumT[n - 1];

  // Step ref lookup by distance along route
  const stepBounds = [];
  let acc = 0;
  for (const st of route.steps || []) {
    stepBounds.push({ from: acc, to: acc + st.distance, refs: String(st.ref || '').split(';').map(normRef).filter(Boolean) });
    acc += st.distance;
  }
  const refsNear = (dist, radius = 2500) => {
    const set = new Set();
    for (const s of stepBounds) if (s.to >= dist - radius && s.from <= dist + radius) s.refs.forEach(r => set.add(r));
    return set;
  };

  // Coarse grid prefilter: bounding box of the route (+3km)
  let minX = 180, maxX = -180, minY = 90, maxY = -90;
  for (const c of coords) { minX = Math.min(minX, c[0]); maxX = Math.max(maxX, c[0]); minY = Math.min(minY, c[1]); maxY = Math.max(maxY, c[1]); }
  const pad = 0.05;

  const found = [];
  for (const svc of services) {
    // Points to test: per-side coords where known, else the site centre
    const pts = svc.sides.filter(s => s.lat != null).map(s => [s.lng, s.lat]);
    pts.push([svc.lng, svc.lat]);
    if (!pts.some(p => p[0] > minX - pad && p[0] < maxX + pad && p[1] > minY - pad && p[1] < maxY + pad)) continue;

    let best = { d: Infinity, i: 0, t: 0 };
    for (const p of pts) {
      for (let i = 0; i < n - 1; i++) {
        // cheap reject
        const y1 = coords[i][1] - p[1], y2 = coords[i + 1][1] - p[1];
        if ((y1 > 0.03 && y2 > 0.03) || (y1 < -0.03 && y2 < -0.03)) continue;
        const r = pointToSegment(p, coords[i], coords[i + 1]);
        if (r.d < best.d) best = { d: r.d, i, t: r.t };
      }
    }
    if (best.d > MAX_OFF) continue;

    const distAlong = cumD[best.i] + best.t * (cumD[best.i + 1] - cumD[best.i]);
    const time = cumT[best.i] + best.t * (cumT[best.i + 1] - cumT[best.i]);
    if (time < EDGE || time > totalT - EDGE) continue;

    // Must be on a road you're actually driving (avoids parallel roads)
    if (best.d > NEAR && stepBounds.length) {
      const near = refsNear(distAlong);
      if (!svc.roads.some(r => near.has(normRef(r)))) continue;
    }

    // Direction of travel around this point (about 1km either side)
    let a = best.i, b = best.i + 1;
    while (a > 0 && cumD[best.i] - cumD[a] < 1000) a--;
    while (b < n - 1 && cumD[b] - cumD[best.i + 1] < 1000) b++;
    const lat0 = coords[best.i][1];
    const A = project(coords[a], lat0), B = project(coords[b], lat0);
    const len = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
    const travel = [(B[0] - A[0]) / len, (B[1] - A[1]) / len];

    const pick = pickSide(svc, travel);
    if (!pick) continue;

    const brands = [...new Set([...pick.side.brands, ...svc.shared])];
    const sideCoords = pick.side.lat != null ? [pick.side.lng, pick.side.lat] : [svc.lng, svc.lat];
    found.push({
      id: svc.id,
      name: svc.name,
      road: svc.road,
      junction: svc.junction,
      operator: svc.operator,
      layout: svc.layout,
      linked: svc.linked,
      side: pick.side.dir,
      sideLabel: pick.side.label,
      sideSure: pick.sure,
      sideBrandsConfirmed: svc.layout !== 'split' || svc.shared.length === 0,
      lat: sideCoords[1],
      lng: sideCoords[0],
      t: Math.round(time),
      km: Math.round(distAlong / 100) / 10,
      off: Math.round(best.d),
      brands,
      farmShop: svc.farmShop,
      independent: svc.independent,
      outdoor: svc.outdoor,
      dogArea: svc.dogArea,
      dog: dogScore(svc),
      ev: svc.ev,
      posh: poshScore({ brands, farmShop: svc.farmShop, independent: svc.independent, outdoor: svc.outdoor, dogArea: svc.dogArea }),
    });
  }
  found.sort((x, y) => x.t - y.t);
  return found;
}

// Even thinning of the line drawn on the map (keeps the response light)
export function simplify(coords, maxPoints = 600) {
  if (coords.length <= maxPoints) return coords;
  const step = coords.length / maxPoints;
  const out = [];
  for (let i = 0; i < coords.length; i += step) out.push(coords[Math.floor(i)]);
  out.push(coords[coords.length - 1]);
  return out.map(c => [+c[0].toFixed(5), +c[1].toFixed(5)]);
}
