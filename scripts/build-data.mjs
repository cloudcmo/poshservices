// Merges the researched service-area files in data/research/ into
// src/services.json, the single dataset the app uses.
// Run with: npm run data
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const dir = new URL('../data/research/', import.meta.url);
const files = readdirSync(dir).filter(f => f.endsWith('.json')).sort();
const raw = files.flatMap(f => JSON.parse(readFileSync(new URL(f, dir), 'utf8')));

// Brand spellings normalised; null drops a brand from display
const ALIAS = {
  'Chopstix Noodle Bar': 'Chopstix',
  'Asda Express': 'ASDA Express',
  'Costa Express': null,              // coffee machine on a forecourt, not a café
  'Farm shop': null,                  // captured by the farmShop flag
  'The Little Castle (Marston\'s pub)': 'Pub',
};

const DIR_LABEL = { N: 'northbound', S: 'southbound', E: 'eastbound', W: 'westbound', both: 'both directions' };

const slug = s => s.toLowerCase()
  .replace(/\(.*?\)/g, '')
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const cleanBrands = list => [...new Set((list || [])
  .map(b => (b in ALIAS ? ALIAS[b] : b))
  .filter(Boolean))];

const NAME_FIX = {
  'Folkestone (formerly Stop 24)': 'Folkestone',
  'Heart of Scotland (Harthill)': 'Harthill',
  'Markham Vale (Chesterfield)': 'Markham Vale',
  'Lancaster (Forton)': 'Lancaster',
};
const ALSO_KNOWN = {
  'Folkestone': 'Formerly Stop 24',
  'Harthill': 'Heart of Scotland',
  'Markham Vale': 'Chesterfield',
  'Lancaster': 'Forton',
};

const out = [];
const seen = new Set();
const problems = [];

for (const s of raw) {
  const name = NAME_FIX[s.name] || s.name;
  const id = slug(name);
  if (seen.has(id)) { problems.push(`duplicate ${id}`); continue; }
  seen.add(id);

  if (!(s.lat > 49.8 && s.lat < 59 && s.lng > -6.5 && s.lng < 2)) problems.push(`bad coords ${name}`);

  const sides = (s.sides || []).map(sd => ({
    dir: sd.dir,
    label: DIR_LABEL[sd.dir] || sd.dir,
    lat: sd.lat ?? null,
    lng: sd.lng ?? null,
    brands: cleanBrands(sd.brands),
  }));
  if (!sides.length) problems.push(`no sides ${name}`);
  for (const sd of sides) if (!DIR_LABEL[sd.dir]) problems.push(`odd dir ${name} ${sd.dir}`);

  const shared = cleanBrands(s.brandsUnsided);
  const farmShop = !!s.farmShop;

  out.push({
    id,
    name,
    aka: ALSO_KNOWN[name] || null,
    road: s.road,
    roads: s.road.split(/[\/,]/).map(r => r.trim()).filter(Boolean),
    junction: s.junction || null,
    operator: s.operator || null,
    postcode: s.postcode || null,
    layout: s.layout,                   // split | single
    linked: s.layout === 'split' ? !!s.linked : null,
    oneWay: s.layout === 'single' && sides.length === 1 && sides[0].dir !== 'both' ? sides[0].dir : null,
    lat: +s.lat.toFixed(5),
    lng: +s.lng.toFixed(5),
    coordConfidence: s.coordConfidence,
    sides,
    shared,
    farmShop,
    independent: !!s.independent,
    outdoor: { rating: s.outdoor?.rating ?? 0, text: s.outdoor?.description || '' },
    dogArea: !!s.dogArea,
    ev: s.ev ?? null,
    notes: s.notes || '',
  });
}

out.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(new URL('../src/services.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(`${out.length} service areas written to src/services.json`);
if (problems.length) { console.log('Problems:\n' + problems.join('\n')); process.exitCode = 1; }
