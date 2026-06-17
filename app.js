// ─────────────────────────────────────────────────────────────────────────────
// Posh Services — App Logic
// Requires: Google Maps JS API (Directions, Places, Geometry)
// ─────────────────────────────────────────────────────────────────────────────

const THRESHOLD_M  = 6000;   // services within this distance of route are "on route"
const EXCLUDE_SECS = 15 * 60; // ignore services in first/last 15 min of journey
const STOP_GAP_MIN = 0.7;     // suggested stops must be at least 70% of interval apart

let map, directionsService, autocompleteStart, autocompleteDest;

// ── Init ──────────────────────────────────────────────────────────────────────
function initApp() {
  map = new google.maps.Map(document.getElementById('map'));
  directionsService = new google.maps.DirectionsService();

  autocompleteStart = new google.maps.places.Autocomplete(
    document.getElementById('start'),
    { componentRestrictions: { country: 'gb' }, types: ['geocode', 'establishment'] }
  );
  autocompleteDest = new google.maps.places.Autocomplete(
    document.getElementById('destination'),
    { componentRestrictions: { country: 'gb' }, types: ['geocode', 'establishment'] }
  );

  document.getElementById('search-btn').disabled = false;
  document.getElementById('search-btn').addEventListener('click', searchRoute);
  document.getElementById('start').addEventListener('keydown', handleEnter);
  document.getElementById('destination').addEventListener('keydown', handleEnter);
}

function handleEnter(e) {
  if (e.key === 'Enter') searchRoute();
}

// ── Route search ──────────────────────────────────────────────────────────────
function searchRoute() {
  const startVal = document.getElementById('start').value.trim();
  const destVal  = document.getElementById('destination').value.trim();

  if (!startVal || !destVal) {
    showStatus('Please enter both a start and destination.', false);
    return;
  }

  const filters = {
    ms:        document.getElementById('filter-ms').checked,
    waitrose:  document.getElementById('filter-waitrose').checked,
    pret:      document.getElementById('filter-pret').checked,
    dogFriendly: document.getElementById('filter-dog').checked,
  };
  const intervalSecs = parseInt(document.getElementById('interval').value, 10) * 60;

  showStatus('<span class="spinner"></span> Finding your route…', true);
  hideResults();

  directionsService.route(
    {
      origin:      startVal,
      destination: destVal,
      travelMode:  google.maps.TravelMode.DRIVING,
    },
    (result, status) => {
      if (status !== 'OK') {
        showStatus('Could not find route. Check your start and destination.', false);
        return;
      }
      hideStatus();
      processRoute(result, filters, intervalSecs);
    }
  );
}

// ── Route processing ──────────────────────────────────────────────────────────
function processRoute(directionsResult, filters, intervalSecs) {
  const leg      = directionsResult.routes[0].legs[0];
  const totalSec = leg.duration.value;
  const totalM   = leg.distance.value;

  const onRoute  = findServicesOnRoute(directionsResult, filters);
  const suggested = suggestStops(onRoute, intervalSecs, totalSec);

  renderResults(directionsResult, onRoute, suggested, filters, intervalSecs);
}

// ── Find services on route ────────────────────────────────────────────────────
function findServicesOnRoute(directionsResult, filters) {
  const route    = directionsResult.routes[0];
  const leg      = route.legs[0];
  const totalSec = leg.duration.value;

  // Decode the overview polyline into lat/lng points
  const points = google.maps.geometry.encoding.decodePath(
    route.overview_polyline
  );

  // Build cumulative distance array (metres) along the polyline
  const cumDist = [0];
  for (let i = 1; i < points.length; i++) {
    cumDist.push(
      cumDist[i - 1] +
      google.maps.geometry.spherical.computeDistanceBetween(points[i - 1], points[i])
    );
  }
  const totalPolyDist = cumDist[cumDist.length - 1];

  // For each service station, find nearest polyline point
  const results = [];
  for (const svc of SERVICES) {
    const svcLatLng = new google.maps.LatLng(svc.lat, svc.lng);

    let minDist = Infinity;
    let minIdx  = 0;
    for (let i = 0; i < points.length; i++) {
      const d = google.maps.geometry.spherical.computeDistanceBetween(svcLatLng, points[i]);
      if (d < minDist) { minDist = d; minIdx = i; }
    }

    if (minDist > THRESHOLD_M) continue;  // not close enough to route

    // Estimate fraction of route at this point
    const fracDist = cumDist[minIdx] / totalPolyDist;
    const estSecs  = Math.round(fracDist * totalSec);

    // Exclude first and last 15 minutes
    if (estSecs < EXCLUDE_SECS) continue;
    if (estSecs > totalSec - EXCLUDE_SECS) continue;

    // Apply brand/dog filters (if any brand filter is active, service must match at least one)
    const anyBrandFilter = filters.ms || filters.waitrose || filters.pret;
    if (anyBrandFilter) {
      const matches =
        (filters.ms        && svc.ms)       ||
        (filters.waitrose  && svc.waitrose)  ||
        (filters.pret      && svc.pret);
      if (!matches) continue;
    }
    if (filters.dogFriendly && !svc.dogFriendly) continue;

    results.push({ ...svc, estSecs, minDist: Math.round(minDist) });
  }

  // Sort by time along route
  results.sort((a, b) => a.estSecs - b.estSecs);
  return results;
}

// ── Suggest optimal stops ─────────────────────────────────────────────────────
function suggestStops(services, intervalSecs, totalSecs) {
  if (!services.length || !intervalSecs) return [];

  const suggested = [];
  let   nextTarget = intervalSecs;            // time to aim for first stop
  const minGap     = intervalSecs * STOP_GAP_MIN;
  const cutoff     = totalSecs - 30 * 60;    // don't suggest within 30 min of end

  while (nextTarget < cutoff) {
    // Find the service closest in time to nextTarget
    let best = null, bestDiff = Infinity;
    for (const svc of services) {
      const diff = Math.abs(svc.estSecs - nextTarget);
      if (diff < bestDiff) { bestDiff = diff; best = svc; }
    }
    if (!best) break;

    // Avoid suggesting the same service twice or one too close to previous
    const already = suggested.find(s => s.id === best.id);
    if (!already) {
      const lastSugg = suggested[suggested.length - 1];
      const gap = lastSugg ? best.estSecs - lastSugg.estSecs : Infinity;
      if (!lastSugg || gap >= minGap) {
        suggested.push(best);
      }
    }
    nextTarget = (suggested[suggested.length - 1]?.estSecs || nextTarget) + intervalSecs;
  }

  return suggested;
}

// ── Render results ────────────────────────────────────────────────────────────
function renderResults(directionsResult, onRoute, suggested, filters, intervalSecs) {
  const leg      = directionsResult.routes[0].legs[0];
  const totalSec = leg.duration.value;
  const startAddr = leg.start_address;
  const endAddr   = leg.end_address;

  const container = document.getElementById('results-inner');
  container.innerHTML = '';

  const anyFilter = filters.ms || filters.waitrose || filters.pret || filters.dogFriendly;

  // Summary line
  const summaryEl = document.createElement('p');
  summaryEl.className = 'results-summary';
  const totalHuman = formatDuration(totalSec);
  summaryEl.textContent =
    onRoute.length
      ? `${totalHuman} journey — ${onRoute.length} suitable stop${onRoute.length !== 1 ? 's' : ''} found`
      : `${totalHuman} journey — no stops found matching your filters`;
  container.appendChild(summaryEl);

  if (!onRoute.length) {
    const noEl = document.createElement('div');
    noEl.className = 'no-results';
    noEl.innerHTML = `<strong>No stops found</strong>
      ${anyFilter ? 'Try adjusting your filters, or increase the route threshold.' : 'No service stations found along this route.'}`;
    container.appendChild(noEl);
    showResults();
    return;
  }

  const suggestedIds = new Set(suggested.map(s => s.id));

  // Build timeline: origin → stops → destination
  const timeline = document.createElement('div');
  timeline.className = 'timeline';

  // Helper: render a single stop node
  function renderStop(svc, isEndpoint, endpointLabel) {
    const item = document.createElement('div');
    item.className = 'timeline-item';

    const lineDiv = document.createElement('div');
    lineDiv.className = 'timeline-line';

    const dot = document.createElement('div');
    dot.className = 'tl-dot' +
      (isEndpoint ? ' dot-endpoint' : '') +
      (!isEndpoint && suggestedIds.has(svc?.id) ? ' dot-suggested' : '');
    lineDiv.appendChild(dot);

    const connector = document.createElement('div');
    connector.className = 'tl-connector';
    lineDiv.appendChild(connector);

    const body = document.createElement('div');
    body.className = 'timeline-body';

    const card = document.createElement('div');
    card.className = 'stop-card' +
      (isEndpoint ? ' endpoint' : '') +
      (!isEndpoint && suggestedIds.has(svc?.id) ? ' suggested' : '');

    if (isEndpoint) {
      const lbl = document.createElement('div');
      lbl.className = 'endpoint-label';
      lbl.textContent = endpointLabel;
      card.appendChild(lbl);
      const nm = document.createElement('div');
      nm.className = 'stop-name';
      nm.textContent = svc;  // svc is address string for endpoints
      card.appendChild(nm);
    } else {
      const header = document.createElement('div');
      header.className = 'stop-header';

      const left = document.createElement('div');
      const nm = document.createElement('div');
      nm.className = 'stop-name';
      nm.textContent = svc.name;
      left.appendChild(nm);
      const road = document.createElement('div');
      road.className = 'stop-road';
      road.textContent = svc.road + ' · ' + svc.operator;
      left.appendChild(road);

      const timeDiv = document.createElement('div');
      timeDiv.className = 'stop-time';
      timeDiv.textContent = '+' + formatDuration(svc.estSecs);

      header.appendChild(left);
      header.appendChild(timeDiv);
      card.appendChild(header);

      const badges = document.createElement('div');
      badges.className = 'stop-badges';
      if (svc.ms)       badges.appendChild(makeBadge('M&S Food',  'badge-ms'));
      if (svc.waitrose) badges.appendChild(makeBadge('Waitrose',  'badge-waitrose'));
      if (svc.pret)     badges.appendChild(makeBadge('Pret',      'badge-pret'));
      if (svc.dogFriendly) badges.appendChild(makeBadge('🐕 Dog friendly', 'badge-dog'));
      if (suggestedIds.has(svc.id)) badges.appendChild(makeBadge('★ Suggested stop', 'badge-suggested'));
      if (badges.children.length) card.appendChild(badges);

      if (svc.notes) {
        const notes = document.createElement('div');
        notes.style.cssText = 'font-size:0.75rem;color:#888;margin-top:7px;';
        notes.textContent = svc.notes;
        card.appendChild(notes);
      }
    }

    body.appendChild(card);
    item.appendChild(lineDiv);
    item.appendChild(body);
    return item;
  }

  // Leg label between stops
  function renderLeg(fromSecs, toSecs, fromLabel, toLabel) {
    const diffSecs = toSecs - fromSecs;
    if (diffSecs < 60) return null;
    const leg = document.createElement('div');
    leg.className = 'leg-label';

    const lineDiv = document.createElement('div');
    lineDiv.className = 'leg-label-line';
    const bar = document.createElement('div');
    bar.className = 'leg-label-bar';
    lineDiv.appendChild(bar);

    const info = document.createElement('div');
    info.className = 'leg-info';
    info.textContent = formatDuration(diffSecs);

    leg.appendChild(lineDiv);
    leg.appendChild(info);
    return leg;
  }

  // Shorten addresses for display
  function shortAddr(addr) {
    return addr.split(',').slice(0, 2).join(',').trim();
  }

  // Origin
  timeline.appendChild(renderStop(shortAddr(startAddr), true, 'Start'));

  // Stops
  let prevSecs = 0;
  for (const svc of onRoute) {
    const legEl = renderLeg(prevSecs, svc.estSecs);
    if (legEl) timeline.appendChild(legEl);
    timeline.appendChild(renderStop(svc, false));
    prevSecs = svc.estSecs;
  }

  // Destination
  const legToEnd = renderLeg(prevSecs, totalSec);
  if (legToEnd) timeline.appendChild(legToEnd);
  timeline.appendChild(renderStop(shortAddr(endAddr), true, 'Destination'));

  container.appendChild(timeline);

  // Suggested stops summary
  if (suggested.length) {
    const suggDiv = document.createElement('div');
    suggDiv.style.cssText = 'margin-top:20px;padding:14px 16px;background:var(--green-light);border-radius:10px;font-size:0.85rem;color:var(--green-dark);';
    const interval = intervalSecs / 60;
    suggDiv.innerHTML = `<strong>Suggested stops</strong> for ${interval}-minute intervals:<br>` +
      suggested.map(s => `<strong>${s.name}</strong> (+${formatDuration(s.estSecs)})`).join(' → ');
    container.appendChild(suggDiv);
  }

  showResults();
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function makeBadge(text, cls) {
  const b = document.createElement('span');
  b.className = 'badge ' + cls;
  b.textContent = text;
  return b;
}

function formatDuration(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.round((secs % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function showStatus(html, withSpinner) {
  const el = document.getElementById('status');
  el.innerHTML = html;
  el.classList.add('visible');
}
function hideStatus() {
  const el = document.getElementById('status');
  el.innerHTML = '';
  el.classList.remove('visible');
}
function showResults() {
  document.getElementById('results').classList.add('visible');
}
function hideResults() {
  document.getElementById('results').classList.remove('visible');
}
