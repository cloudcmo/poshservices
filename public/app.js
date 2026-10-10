// Posh Services planner
(() => {
  const $ = id => document.getElementById(id);
  const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';
  const BLUE = '#1b4f9c';
  const GOOD = ['Waitrose', 'M&S', 'Pret', 'Leon'];
  const DOG_TEXT = ['Car park only', 'A bit of grass', 'Good for a dog walk', 'Lovely walk'];

  const state = {
    from: null,          // { label, lat, lng }
    to: null,
    data: null,          // response from /api/plan
    picks: null,         // array of ids when the user has edited the plan
  };

  // ── Formatting ────────────────────────────────────────────────
  const fmtDur = s => {
    const m = Math.round(s / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60), r = m % 60;
    return r ? `${h}h ${r}m` : `${h}h`;
  };
  const miles = m => Math.round(m / 1609.34);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pips = score => {
    const full = Math.floor(score), half = score - full >= 0.5;
    let s = '';
    for (let i = 0; i < 5; i++) s += `<i class="pip${i < full ? ' on' : i === full && half ? ' half' : ''}"></i>`;
    return `<span class="pips" role="img" aria-label="Posh score ${score} out of 5">${s}</span>`;
  };

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => (t.hidden = true), 2600);
  }

  // ── Filters ───────────────────────────────────────────────────
  const checked = name => [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(i => i.value);

  function matches(s) {
    const want = checked('want'), need = checked('need');
    if (want.length) {
      const ok = want.some(w =>
        (w === 'farm' && s.farmShop) ||
        (w === 'waitrose' && s.brands.includes('Waitrose')) ||
        (w === 'ms' && s.brands.includes('M&S')) ||
        (w === 'pret' && s.brands.includes('Pret')));
      if (!ok) return false;
    }
    if (need.includes('dog') && s.dog < 2) return false;
    if (need.includes('ev') && s.ev !== true) return false;
    return true;
  }

  // ── Stop suggestions ──────────────────────────────────────────
  // One stop per interval. Within a window around each target time,
  // prefer the poshest; drift from the target costs a little.
  function suggestStops(list, everyMin, total) {
    if (!everyMin || !list.length) return [];
    const I = everyMin * 60;
    const lastUsable = total - 15 * 60;
    const stops = [];
    let last = 0;
    for (let guard = 0; guard < 20 && total - last > I * 1.15; guard++) {
      const target = last + I;
      let cands = list.filter(s => s.t >= last + 0.6 * I && s.t <= last + 1.15 * I && s.t <= lastUsable);
      if (!cands.length) cands = list.filter(s => s.t > last + 0.6 * I && s.t <= lastUsable).slice(0, 1);
      if (!cands.length) break;
      const best = cands.reduce((a, b) => (value(b, target, I) > value(a, target, I) ? b : a));
      stops.push(best);
      last = best.t;
    }
    return stops;
  }
  const value = (s, target, I) => s.posh + s.dog * 0.3 - (Math.abs(s.t - target) / I) * 3;

  function currentStops() {
    const all = state.data.services;
    if (state.picks) return state.picks.map(id => all.find(s => s.id === id)).filter(Boolean).sort((a, b) => a.t - b.t);
    return suggestStops(all.filter(matches), +$('every').value, state.data.duration);
  }

  // ── URL state (shareable links) ───────────────────────────────
  function writeUrl() {
    const p = new URLSearchParams();
    if (state.from) { p.set('from', state.from.label); p.set('fll', `${state.from.lat.toFixed(4)},${state.from.lng.toFixed(4)}`); }
    if (state.to) { p.set('to', state.to.label); p.set('tll', `${state.to.lat.toFixed(4)},${state.to.lng.toFixed(4)}`); }
    const want = checked('want'), need = checked('need');
    if (want.length) p.set('want', want.join(','));
    if (need.length) p.set('need', need.join(','));
    if ($('every').value !== '90') p.set('every', $('every').value);
    if (state.picks) p.set('stops', state.picks.join(','));
    history.replaceState(null, '', `${location.pathname}?${p.toString().replace(/%2C/g, ',')}`);
  }

  function readUrl() {
    const p = new URLSearchParams(location.search);
    const ll = v => {
      const m = (v || '').match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
      return m ? { lat: +m[1], lng: +m[2] } : null;
    };
    if (p.get('from')) { $('from').value = p.get('from'); const c = ll(p.get('fll')); if (c) state.from = { label: p.get('from'), ...c }; }
    if (p.get('to')) { $('to').value = p.get('to'); const c = ll(p.get('tll')); if (c) state.to = { label: p.get('to'), ...c }; }
    for (const v of (p.get('want') || '').split(',')) { const i = document.querySelector(`input[name="want"][value="${v}"]`); if (i) i.checked = true; }
    for (const v of (p.get('need') || '').split(',')) { const i = document.querySelector(`input[name="need"][value="${v}"]`); if (i) i.checked = true; }
    if (p.get('every') && [...$('every').options].some(o => o.value === p.get('every'))) $('every').value = p.get('every');
    if (p.get('stops')) state.picks = p.get('stops').split(',').filter(Boolean);
    return !!(p.get('from') && p.get('to'));
  }

  // ── Autocomplete ──────────────────────────────────────────────
  function combo(key) {
    const input = $(key), list = $(`${key}-list`);
    let items = [], active = -1, timer, seq = 0;

    const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; };
    const choose = it => {
      input.value = it.label;
      state[key] = { label: it.label, lat: it.lat, lng: it.lng };
      close();
    };
    const render = () => {
      list.innerHTML = items.map((it, i) =>
        `<li role="option" id="${key}-opt-${i}" aria-selected="${i === active}" data-i="${i}"><strong>${esc(it.label)}</strong>${it.sub ? `<span>${esc(it.sub)}</span>` : ''}</li>`).join('');
      list.hidden = !items.length;
      input.setAttribute('aria-expanded', String(!!items.length));
      if (active >= 0) input.setAttribute('aria-activedescendant', `${key}-opt-${active}`);
      else input.removeAttribute('aria-activedescendant');
    };

    input.addEventListener('input', () => {
      state[key] = null;
      clearTimeout(timer);
      const q = input.value.trim();
      if (q.length < 2) { items = []; render(); return; }
      timer = setTimeout(async () => {
        const my = ++seq;
        try {
          const r = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`);
          const data = await r.json();
          if (my !== seq) return;
          items = Array.isArray(data) ? data : [];
          active = -1; render();
        } catch { /* ignore */ }
      }, 180);
    });
    input.addEventListener('keydown', e => {
      if (list.hidden) return;
      if (e.key === 'ArrowDown') { active = Math.min(items.length - 1, active + 1); render(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { active = Math.max(0, active - 1); render(); e.preventDefault(); }
      else if (e.key === 'Enter' && active >= 0) { choose(items[active]); e.preventDefault(); }
      else if (e.key === 'Escape') close();
    });
    list.addEventListener('mousedown', e => {
      const li = e.target.closest('li');
      if (li) { choose(items[+li.dataset.i]); e.preventDefault(); }
    });
    input.addEventListener('blur', () => setTimeout(close, 120));
  }

  // ── Map ───────────────────────────────────────────────────────
  let map, mapReady, markers = [], overview = null;

  function initMap() {
    if (!window.maplibregl) { $('map').innerHTML = '<p class="map-fail">The map could not load. Your stops are still listed.</p>'; return; }
    map = new maplibregl.Map({
      container: 'map', style: MAP_STYLE,
      bounds: [[-5.8, 50.0], [1.8, 56.6]], fitBoundsOptions: { padding: 20 },
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapReady = new Promise(res => map.on('load', res));
    mapReady.then(showOverview);
  }

  async function showOverview() {
    try {
      overview = await (await fetch('/api/services')).json();
    } catch { return; }
    map.addSource('all', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: overview.map(s => ({ type: 'Feature', properties: { id: s.id, name: s.name, road: s.road, posh: s.posh }, geometry: { type: 'Point', coordinates: [s.lng, s.lat] } })) },
    });
    map.addLayer({
      id: 'all', type: 'circle', source: 'all',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'posh'], 0, 3.5, 5, 8],
        'circle-color': ['case', ['>=', ['get', 'posh'], 3], '#c9a227', BLUE],
        'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5,
        'circle-opacity': 0.9,
      },
    });
    map.on('click', 'all', e => {
      const f = e.features[0].properties;
      new maplibregl.Popup({ offset: 8 }).setLngLat(e.lngLat)
        .setHTML(`<div class="pop"><strong>${esc(f.name)}</strong><span>${esc(f.road)}</span>${pips(+f.posh)}<a href="/services/${f.id}">See what's there</a></div>`).addTo(map);
    });
    map.on('mouseenter', 'all', () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', 'all', () => (map.getCanvas().style.cursor = ''));
    if (state.data) map.setLayoutProperty('all', 'visibility', 'none');
  }

  async function drawRoute(stops) {
    if (!map) return;
    await mapReady;
    const d = state.data;
    if (map.getLayer('all')) map.setLayoutProperty('all', 'visibility', 'none');
    const line = { type: 'Feature', geometry: { type: 'LineString', coordinates: d.line } };
    if (map.getSource('route')) map.getSource('route').setData(line);
    else {
      map.addSource('route', { type: 'geojson', data: line });
      map.addLayer({ id: 'route-casing', type: 'line', source: 'route', paint: { 'line-color': '#fff', 'line-width': 8 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
      map.addLayer({ id: 'route', type: 'line', source: 'route', paint: { 'line-color': BLUE, 'line-width': 4.5 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
    }
    markers.forEach(m => m.remove());
    markers = [];

    const add = (lngLat, el, popupHtml) => {
      const mk = new maplibregl.Marker({ element: el }).setLngLat(lngLat);
      if (popupHtml) mk.setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(popupHtml));
      mk.addTo(map); markers.push(mk);
      return mk;
    };
    const ends = (txt, cls) => { const el = document.createElement('div'); el.className = `mk-end ${cls}`; el.textContent = txt; return el; };
    add([d.from.lng, d.from.lat], ends('A', 'mk-start'));
    add([d.to.lng, d.to.lat], ends('B', 'mk-finish'));

    const stopIds = stops.map(s => s.id);
    for (const s of d.services) {
      const idx = stopIds.indexOf(s.id);
      const el = document.createElement('button');
      el.type = 'button';
      el.className = idx >= 0 ? 'mk mk-on' : matches(s) ? 'mk mk-match' : 'mk mk-dim';
      el.textContent = idx >= 0 ? String(idx + 1) : '';
      el.setAttribute('aria-label', `${s.name} services`);
      const mk = add([s.lng, s.lat], el, popupFor(s, idx >= 0));
      mk.getPopup().on('open', () => {
        const b = document.querySelector('.maplibregl-popup [data-toggle]');
        if (b) b.addEventListener('click', () => { toggleStop(s.id); mk.getPopup().remove(); });
      });
    }

    const b = new maplibregl.LngLatBounds();
    d.line.forEach(c => b.extend(c));
    const wide = window.matchMedia('(min-width: 900px)').matches;
    map.fitBounds(b, { padding: wide ? 60 : 30, duration: 600 });
  }

  function popupFor(s, isStop) {
    return `<div class="pop"><strong>${esc(s.name)}</strong><span>${esc(s.road)}, ${fmtDur(s.t)} in</span>${pips(s.posh)}
      <button type="button" class="btn btn-small" data-toggle>${isStop ? 'Remove from plan' : 'Add to plan'}</button>
      <a href="/services/${s.id}" target="_blank" rel="noopener">See what's there</a></div>`;
  }

  // ── Rendering the plan ────────────────────────────────────────
  function tilesFor(s, max = 6) {
    const list = [...s.brands].sort((a, b) => (GOOD.includes(b) - GOOD.includes(a)));
    if (s.farmShop) list.unshift('Farm shop');
    const shown = list.slice(0, max);
    const more = list.length - shown.length;
    return shown.map(b => `<span class="tile${b === 'Farm shop' ? ' tile-farm' : GOOD.includes(b) ? ' tile-good' : ''}">${esc(b)}</span>`).join('') +
      (more > 0 ? `<span class="tile tile-more">+${more} more</span>` : '');
  }

  function render() {
    const d = state.data;
    const stops = currentStops();
    const all = d.services;
    const matching = all.filter(matches);

    $('summary').innerHTML = `<strong>${miles(d.distance)} miles, about ${fmtDur(d.duration)}</strong> from ${esc(d.from.label)} to ${esc(d.to.label)}. ` +
      (all.length ? `${all.length} services on the way, ${matching.length} match what you're after.` : 'No motorway services on this route.');

    const it = $('itinerary');
    let html = `<li class="leg-end"><span class="end-dot">A</span><div><strong>${esc(d.from.label)}</strong><span>Set off</span></div></li>`;
    let prev = 0;
    stops.forEach((s, i) => {
      html += `<li class="leg-drive"><span>${fmtDur(s.t - prev)} drive</span></li>`;
      const sideNote = s.layout === 'split'
        ? `You'll use the ${s.sideLabel} side${s.sideSure ? '' : ' (probably)'}.${s.sideBrandsConfirmed ? '' : ' Some of these may be on the other side.'}`
        : s.layout === 'single' && s.side !== 'both' ? `Only open to ${s.sideLabel} traffic.` : '';
      html += `<li class="leg-stop">
        <article class="sign">
          <div class="sign-top">
            <h3 class="sign-name"><span class="sign-num">${i + 1}</span>${esc(s.name)}</h3>
            <span class="sign-time">${fmtDur(s.t)}<small>after setting off</small></span>
          </div>
          <div class="tiles">${tilesFor(s)}</div>
          <div class="sign-foot">
            <span>${pips(s.posh)} <em>Posh ${s.posh}</em></span>
            <span class="dogline">${DOG_TEXT[s.dog]}</span>
          </div>
        </article>
        <div class="stop-meta">
          <p>${esc(s.road)}${s.junction ? `, ${esc(s.junction)}` : ''}. ${esc(sideNote)}</p>
          ${s.outdoor?.text ? `<p class="outdoor">${esc(s.outdoor.text)}</p>` : ''}
          <p class="stop-links"><a href="/services/${s.id}" target="_blank" rel="noopener">See what's there</a><button type="button" class="linkish" data-remove="${s.id}">Remove this stop</button></p>
        </div>
      </li>`;
      prev = s.t;
    });
    if (!stops.length) {
      html += `<li class="leg-empty">${!all.length
        ? 'This route doesn\'t pass any motorway services. It may be short or mostly off the motorways.'
        : !matching.length
          ? 'None of the services on this route match your choices. Untick something, or add stops from the list below.'
          : +$('every').value === 0
            ? 'Add stops from the list below or tap them on the map.'
            : 'This journey is short enough that you may not need a stop. You can still add one from the list below.'}</li>`;
    }
    html += `<li class="leg-drive"><span>${fmtDur(d.duration - prev)} drive</span></li>`;
    html += `<li class="leg-end"><span class="end-dot">B</span><div><strong>${esc(d.to.label)}</strong><span>Arrive after about ${fmtDur(d.duration)}</span></div></li>`;
    it.innerHTML = html;

    // Full list of services on the route
    const stopIds = new Set(stops.map(s => s.id));
    $('all-summary').textContent = `All ${all.length} services on this route`;
    $('all-wrap').hidden = !all.length;
    $('all-list').innerHTML = all.map(s => `
      <li class="${matches(s) ? '' : 'dim'}">
        <span class="al-time">${fmtDur(s.t)}</span>
        <span class="al-main"><a href="/services/${s.id}" target="_blank" rel="noopener">${esc(s.name)}</a><small>${esc(s.road)}${s.farmShop ? ', farm shop' : ''}${s.brands.filter(b => GOOD.includes(b)).length ? ', ' + esc(s.brands.filter(b => GOOD.includes(b)).join(', ')) : ''}</small></span>
        ${pips(s.posh)}
        <button type="button" class="btn btn-small ${stopIds.has(s.id) ? 'btn-on' : ''}" data-toggle-id="${s.id}" aria-pressed="${stopIds.has(s.id)}">${stopIds.has(s.id) ? 'In plan' : 'Add'}</button>
      </li>`).join('');

    $('picked-note').hidden = !state.picks;
    $('gmaps').href = googleUrl(stops);
    $('results').hidden = false;
    $('intro').hidden = true;
    writeUrl();
    drawRoute(stops);
  }

  function googleUrl(stops) {
    const d = state.data;
    const ll = p => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
    const p = new URLSearchParams({ api: '1', origin: ll(d.from), destination: ll(d.to), travelmode: 'driving' });
    if (stops.length) p.set('waypoints', stops.slice(0, 9).map(ll).join('|'));
    return `https://www.google.com/maps/dir/?${p}`;
  }

  function toggleStop(id) {
    const cur = currentStops().map(s => s.id);
    state.picks = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
    render();
  }

  // ── Planning ──────────────────────────────────────────────────
  async function runPlan({ keepPicks = false } = {}) {
    const fromText = $('from').value.trim(), toText = $('to').value.trim();
    if (!fromText || !toText) { $('status').textContent = 'Enter where you are starting from and where you are going.'; return; }
    if (!keepPicks) state.picks = null;
    const p = new URLSearchParams({ from: fromText, to: toText });
    if (state.from && state.from.label === fromText) p.set('fll', `${state.from.lat},${state.from.lng}`);
    if (state.to && state.to.label === toText) p.set('tll', `${state.to.lat},${state.to.lng}`);

    $('go').disabled = true;
    $('go').textContent = 'Finding your stops…';
    $('status').textContent = '';
    try {
      const r = await fetch(`/api/plan?${p}`);
      const data = await r.json();
      if (!r.ok || data.error) throw new Error(data.error || 'Something went wrong. Please try again.');
      state.data = data;
      state.from = data.from; state.to = data.to;
      $('from').value = data.from.label; $('to').value = data.to.label;
      render();
      if (!window.matchMedia('(min-width: 900px)').matches) $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      $('status').textContent = e.message;
    } finally {
      $('go').disabled = false;
      $('go').textContent = 'Find my stops';
    }
  }

  // ── Wiring ────────────────────────────────────────────────────
  function wire() {
    combo('from'); combo('to');

    $('plan-form').addEventListener('submit', e => { e.preventDefault(); runPlan(); });

    $('swap').addEventListener('click', () => {
      [state.from, state.to] = [state.to, state.from];
      [$('from').value, $('to').value] = [$('to').value, $('from').value];
      if (state.data) runPlan();
    });

    $('locate').addEventListener('click', () => {
      if (!navigator.geolocation) { toast('Your browser can\'t share its location.'); return; }
      $('from').value = 'Finding you…';
      navigator.geolocation.getCurrentPosition(pos => {
        state.from = { label: 'My location', lat: pos.coords.latitude, lng: pos.coords.longitude };
        $('from').value = 'My location';
      }, () => { $('from').value = ''; toast('Location not available. Type a town or postcode instead.'); }, { timeout: 10000 });
    });

    // Changing filters or interval re-plans instantly (no new route needed)
    document.querySelectorAll('input[name="want"], input[name="need"], #every').forEach(el =>
      el.addEventListener('change', () => { if (state.data) { state.picks = null; render(); } }));

    $('reset-picks').addEventListener('click', () => { state.picks = null; render(); });

    document.addEventListener('click', e => {
      const t = e.target.closest('[data-toggle-id]');
      if (t) { toggleStop(t.dataset.toggleId); return; }
      const r = e.target.closest('[data-remove]');
      if (r) toggleStop(r.dataset.remove);
    });

    $('share').addEventListener('click', async () => {
      // Pin the current stops into the link so it opens exactly as you see it
      state.picks = currentStops().map(s => s.id);
      render();
      const url = location.href;
      const title = `Stops from ${state.data.from.label} to ${state.data.to.label}`;
      if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
        try { await navigator.share({ title, url }); return; } catch { /* fall through */ }
      }
      try { await navigator.clipboard.writeText(url); toast('Link copied. Paste it anywhere to share this plan.'); }
      catch { prompt('Copy this link:', url); }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    wire();
    const hasTrip = readUrl();
    initMap();
    if (hasTrip) runPlan({ keepPicks: true });
  });
})();
