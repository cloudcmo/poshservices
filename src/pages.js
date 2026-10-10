// Server-rendered pages: the full list of services and one page per services.

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const CHECKED = 'October 2026';

function head(title, desc, extra = '') {
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
${extra}
</head>`;
}

const mapLibs = `<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css">
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>`;

function masthead() {
  return `<header class="masthead">
  <a class="wordmark" href="/" aria-label="Posh Services home"><span class="wm-posh">Posh</span> <span class="wm-services">Services</span></a>
  <nav class="topnav"><a href="/">Plan a journey</a><a href="/services">All services</a></nav>
</header>`;
}

export function pips(score, label = 'Posh score') {
  const full = Math.floor(score), half = score - full >= 0.5;
  let s = '';
  for (let i = 0; i < 5; i++) s += `<i class="pip${i < full ? ' on' : i === full && half ? ' half' : ''}"></i>`;
  return `<span class="pips" role="img" aria-label="${label} ${score} out of 5">${s}</span>`;
}

const DOG_TEXT = ['Car park only', 'A bit of grass', 'Good for a dog walk', 'Lovely walk'];

function brandTiles(list, empty = '<span class="none">No chain brands listed</span>') {
  if (!list.length) return empty;
  return list.map(b => `<span class="tile${['M&S', 'Waitrose', 'Pret'].includes(b) ? ' tile-good' : ''}">${esc(b)}</span>`).join('');
}

export function servicePage(s, sum) {
  const title = `${s.name} services, ${s.road}`;
  const brandsAll = [...new Set([...s.sides.flatMap(sd => sd.brands), ...s.shared])];
  const desc = `${s.name} services on the ${s.road}${s.junction ? ` (${s.junction})` : ''}: ${s.farmShop ? 'farm shop, ' : ''}${brandsAll.slice(0, 6).join(', ')}. Outdoor space and dog walking notes.`;

  const layoutText = s.layout === 'split'
    ? `Separate sites for each direction${s.linked ? ', linked so you can cross between them' : ', not linked to each other'}.`
    : s.oneWay
      ? `Only open to ${s.sides[0].label} traffic.`
      : 'One site serving both directions.';

  const sides = s.sides.map(sd => `
    <div class="side">
      <h3>${sd.dir === 'both' ? 'On site' : esc(cap(sd.label))}</h3>
      <div class="tiles">${brandTiles(sd.brands, s.independent ? '<span class="none">Independent food hall, see notes below</span>' : undefined)}</div>
    </div>`).join('');

  const shared = s.shared.length ? `
    <div class="side">
      <h3>${s.layout === 'split' ? 'Listed, side not confirmed' : 'Also on site'}</h3>
      <div class="tiles">${brandTiles(s.shared)}</div>
    </div>` : '';

  const gmaps = `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`;

  return `${head(`${title} | Posh Services`, desc, mapLibs)}
<body class="page">
${masthead()}
<main class="detail">
  <section class="sign sign-lg">
    <div class="sign-top">
      <h1 class="sign-name">${esc(s.name)}</h1>
      <span class="sign-road">${esc(s.road)}${s.junction ? ` <small>${esc(s.junction)}</small>` : ''}</span>
    </div>
    ${s.aka ? `<p class="sign-aka">${esc(s.aka)}</p>` : ''}
    <div class="tiles">${s.farmShop ? '<span class="tile tile-farm">Farm shop</span>' : ''}${brandTiles(['Waitrose', 'M&S', 'Pret'].filter(b => brandsAll.includes(b)), '')}</div>
    <div class="sign-foot">
      <span>${pips(sum.posh)} <em>Posh ${sum.posh}</em></span>
      <span class="dogline">${dogIcon()} ${DOG_TEXT[sum.dog]}</span>
    </div>
  </section>

  <div class="detail-grid">
    <div>
      <h2>Getting out of the car</h2>
      <p class="lede">${esc(s.outdoor.text || 'No outdoor space described.')}</p>
      ${s.dogArea ? '<p>There is a dedicated dog walking area.</p>' : ''}
      <h2>What's there</h2>
      <p>${esc(layoutText)}</p>
      <div class="sides">${sides}${shared}</div>
      <dl class="facts">
        <dt>Operator</dt><dd>${esc(s.operator || 'Unknown')}</dd>
        ${s.postcode ? `<dt>Postcode</dt><dd>${esc(s.postcode)}</dd>` : ''}
        <dt>EV charging</dt><dd>${s.ev === true ? 'Yes' : s.ev === false ? 'No' : 'Not known'}</dd>
      </dl>
      ${s.notes ? `<p class="notes">${esc(s.notes)}</p>` : ''}
      <p class="checked">Facilities change. This page was last checked in ${CHECKED}.</p>
      <p class="actions"><a class="btn" href="/?from=${encodeURIComponent(s.name + ' services')}&fll=${s.lat},${s.lng}">Plan a journey from here</a> <a class="btn btn-quiet" href="${gmaps}" target="_blank" rel="noopener">Open in Google Maps</a></p>
    </div>
    <div id="mini-map" class="mini-map" aria-label="Map of ${esc(s.name)} services"></div>
  </div>
</main>
<script>
  const m = new maplibregl.Map({ container: 'mini-map', style: 'https://tiles.openfreemap.org/styles/liberty', center: [${s.lng}, ${s.lat}], zoom: 14, cooperativeGestures: true });
  m.addControl(new maplibregl.NavigationControl({ showCompass: false }));
  const el = document.createElement('div'); el.className = 'mk mk-on'; el.textContent = 'S';
  new maplibregl.Marker({ element: el }).setLngLat([${s.lng}, ${s.lat}]).addTo(m);
</script>
</body></html>`;
}

export function listPage(all, summary) {
  const byId = Object.fromEntries(summary.map(s => [s.id, s]));
  const rows = all.map(s => {
    const sum = byId[s.id];
    const brands = [...new Set([...s.sides.flatMap(sd => sd.brands), ...s.shared])];
    const key = ['Waitrose', 'M&S', 'Pret'].filter(b => brands.includes(b));
    if (s.farmShop) key.unshift('Farm shop');
    return `<li class="row" data-name="${esc(s.name.toLowerCase())} ${esc(s.road.toLowerCase())}" data-posh="${sum.posh}" data-dog="${sum.dog}">
      <a href="/services/${s.id}">
        <span class="row-name">${esc(s.name)}</span>
        <span class="row-road">${esc(s.road)}</span>
        <span class="row-key">${key.map(esc).join(', ') || '&nbsp;'}</span>
        <span class="row-score">${pips(sum.posh)}</span>
      </a>
    </li>`;
  }).join('');

  return `${head('All motorway services in Great Britain | Posh Services', 'Every motorway service area in Great Britain, rated for food and somewhere nice to stretch your legs or walk the dog.')}
<body class="page">
${masthead()}
<main class="listing">
  <h1>All ${all.length} services</h1>
  <p class="lede">Every motorway service area in Great Britain, plus a few on the big A roads. Rated for decent food and somewhere pleasant to stretch your legs.</p>
  <div class="list-tools">
    <label class="field"><span>Find</span><input id="q" type="search" placeholder="Name or road, e.g. M5" autocomplete="off"></label>
    <label class="field"><span>Sort by</span>
      <select id="sort"><option value="name">Name</option><option value="posh">Posh score</option><option value="dog">Dog walking</option></select>
    </label>
  </div>
  <ul id="rows" class="rows">${rows}</ul>
  <p class="checked">Facilities change. Last checked in ${CHECKED}.</p>
</main>
<script>
  const q = document.getElementById('q'), sort = document.getElementById('sort'), list = document.getElementById('rows');
  const items = [...list.children];
  function apply() {
    const t = q.value.trim().toLowerCase();
    const k = sort.value;
    const sorted = [...items].sort((a, b) => k === 'name' ? a.dataset.name.localeCompare(b.dataset.name) : (+b.dataset[k] - +a.dataset[k]) || a.dataset.name.localeCompare(b.dataset.name));
    list.replaceChildren(...sorted);
    for (const li of sorted) li.hidden = t && !li.dataset.name.includes(t);
  }
  q.addEventListener('input', apply); sort.addEventListener('change', apply);
</script>
</body></html>`;
}

export function notFoundPage() {
  return `${head('Not found | Posh Services', 'Page not found')}
<body class="page">${masthead()}<main class="listing"><h1>No services by that name</h1><p><a href="/services">See all services</a></p></main></body></html>`;
}

function dogIcon() {
  return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4.5 11a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm4-4a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm7 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm4 4a2 2 0 1 1 0-4 2 2 0 0 1 0 4ZM12 10c2.6 0 6 4.6 6 7.3 0 1.6-1.2 2.7-2.8 2.7-1.2 0-2-.6-3.2-.6s-2 .6-3.2.6C7.2 20 6 18.9 6 17.3 6 14.6 9.4 10 12 10Z"/></svg>';
}

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
