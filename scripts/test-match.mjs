// Offline checks of the route matching with synthetic routes built from
// real service coordinates. Run with: npm test
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { matchServices, haversine } from '../src/match.js';

const S = JSON.parse(readFileSync(new URL('../src/services.json', import.meta.url)));
const byId = id => { const s = S.find(x => x.id === id); assert(s, `missing ${id}`); return s; };

// Build a dense route through points (each [lng,lat]), shifted east a little
// so services sit just off the line, at 110 km/h.
function routeThrough(points, { ref = 'M5', shift = 0.0015 } = {}) {
  const coords = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [a, b] = [points[i], points[i + 1]];
    const n = Math.max(2, Math.ceil(haversine(a, b) / 200));
    for (let k = 0; k < n; k++) coords.push([a[0] + ((b[0] - a[0]) * k) / n + shift, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  const last = points.at(-1); coords.push([last[0] + shift, last[1]]);
  let dist = 0; const segDur = [], segDist = [];
  for (let i = 1; i < coords.length; i++) { const d = haversine(coords[i - 1], coords[i]); dist += d; segDist.push(d); segDur.push(d / 30.5); }
  return { coords, segDur, segDist, distance: dist, duration: dist / 30.5, steps: [{ distance: dist, ref }] };
}

const pt = id => [byId(id).lng, byId(id).lat];
const start = [-4.10, 50.40];  // Plymouth
const end = [-2.10, 52.95];     // north of Birmingham
const m5 = ['exeter', 'cullompton', 'taunton-deane', 'bridgwater', 'sedgemoor', 'gordano', 'michaelwood', 'gloucester', 'strensham', 'frankley'];

// Northbound
let r = routeThrough([start, ...m5.map(pt), end]);
let found = matchServices(r, S);
console.log('M5 northbound:', found.map(f => `${f.name}(${f.side}, ${Math.round(f.t / 60)}m, posh ${f.posh})`).join(', '));
for (const id of m5) assert(found.some(f => f.id === id), `northbound should find ${id}`);
assert.equal(found.find(f => f.id === 'gloucester').side, 'N');
assert.equal(found.find(f => f.id === 'exeter').side, 'both');
for (let i = 1; i < found.length; i++) assert(found[i].t >= found[i - 1].t, 'sorted by time');

// Southbound: same sites, south side for split ones
r = routeThrough([end, ...m5.map(pt).reverse(), start]);
found = matchServices(r, S);
assert.equal(found.find(f => f.id === 'gloucester').side, 'S');
assert.equal(found.find(f => f.id === 'sedgemoor').side, 'S');
console.log('M5 southbound sides OK');

// Wrong road nearby: a route labelled A38 running 900m away should not pick up M5 services
r = routeThrough([start, ...m5.map(pt), end], { ref: 'A38', shift: 0.013 });
found = matchServices(r, S);
assert.equal(found.length, 0, 'parallel road must not match: ' + found.map(f => f.name));
console.log('Parallel road rejected OK');

// One-way sites: Hamilton is northbound only, Bothwell southbound only (M74)
const glasgow = [-4.45, 55.95], south = [-3.40, 55.10];
r = routeThrough([south, pt('abington'), pt('hamilton'), pt('bothwell'), glasgow], { ref: 'M74' });
found = matchServices(r, S).map(f => f.id);
assert(found.includes('hamilton') && !found.includes('bothwell'), 'northbound M74: ' + found);
r = routeThrough([glasgow, pt('bothwell'), pt('hamilton'), pt('abington'), south], { ref: 'M74' });
found = matchServices(r, S).map(f => f.id);
assert(found.includes('bothwell') && !found.includes('hamilton'), 'southbound M74: ' + found);
console.log('One-way sites OK');

// Data sanity
for (const s of S) {
  assert(s.sides.length >= 1, `${s.id} has sides`);
  assert(s.roads.length >= 1, `${s.id} has roads`);
}
const ids = new Set(S.map(s => s.id));
assert.equal(ids.size, S.length, 'unique ids');
console.log(`All checks passed (${S.length} service areas)`);
