// ─────────────────────────────────────────────────────────────────
// Posh Services — Application Logic
// ─────────────────────────────────────────────────────────────────

let directionsService;
let originAutocomplete;
let destinationAutocomplete;
let mapsReady = false;

// ── Google Maps Initialisation ────────────────────────────────────
window.initApp = function () {
  // We need a Map instance to enable certain libraries, but we keep it hidden.
  const mapEl = document.getElementById('map');
  new google.maps.Map(mapEl, { center: { lat: 52.5, lng: -1.5 }, zoom: 7 });

  directionsService = new google.maps.DirectionsService();

  // Autocomplete — restrict to GB, bias towards UK postcodes/addresses
  const originInput = document.getElementById('origin');
  const destInput   = document.getElementById('destination');

  const acOptions = {
    componentRestrictions: { country: 'gb' },
    fields: ['formatted_address', 'geometry', 'name']
  };

  originAutocomplete      = new google.maps.places.Autocomplete(originInput, acOptions);
  destinationAutocomplete = new google.maps.places.Autocomplete(destInput,   acOptions);

  mapsReady = true;
  document.getElementById('search-btn').disabled = false;
};

// ── Search Handler ────────────────────────────────────────────────
window.searchRoute = function () {
  if (!mapsReady) {
    showError('Maps are still loading — please wait a moment and try again.');
    return;
  }

  const origin = document.getElementById('origin').value.trim();
  const dest   = document.getElementById('destination').value.trim();

  if (!origin || !dest) {
    showError('Please enter both a starting point and a destination.');
    return;
  }

  const filters = {
    ms:          document.getElementById('filter-ms').checked,
    waitrose:    document.getElementById('filter-waitrose').checked,
    pret:        document.getElementById('filter-pret').checked,
    dogFriendly: document.getElementById('filter-dog').checked,
  };

  const intervalMinutes = parseInt(document.getElementById('interval').value, 10);

  // Show loading state
  const resultsEl = document.getElementById('results');
  resultsEl.classList.remove('hidden');
  resultsEl.innerHTML = '<div class="loading-msg">Finding your route…</div>';

  const btn = document.getElementById('search-btn');
  btn.disabled  = true;
  btn.textContent = 'Searching…';

  directionsService.route({
    origin:      origin,
    destination: dest,
    travelMode:  google.maps.TravelMode.DRIVING,
    region:      'GB',
  }, (result, status) => {
    btn.disabled  = false;
    btn.textContent = 'Find my stops';

    if (status !== google.maps.DirectionsStatus.OK) {
      resultsEl.innerHTML = `<div class="error-box">
        Couldn't find a route between those two places. Please check your addresses and try again.<br>
        <small style="opacity:0.7">(${status})</small>
      </div>`;
      return;
    }

    displayResults(result, filters, intervalMinutes);
  });
};

// ── Display Results ───────────────────────────────────────────────
function displayResults(directionsResult, filters, intervalMinutes) {
  const route = directionsResult.routes[0];
  const leg   = route.legs[0];
  const totalSecs   = leg.duration.value;
  const totalMeters = leg.distance.value;

  const originAddress = leg.start_address;
  const destAddress   = leg.end_address;

  // Find services along the route
  const allMatching = findServicesOnRoute(directionsResult, filters);

  // Decide which stops to show
  let stops;
  if (intervalMinutes > 0 && allMatching.length > 0) {
    stops = suggestStops(allMatching, intervalMinutes * 60, totalSecs);
  } else {
    stops = allMatching;
  }

  const resultsEl = document.getElementById('results');

  // ── No results ──
  if (allMatching.length === 0) {
    const noFilter = !filters.ms && !filters.waitrose && !filters.pret && !filters.dogFriendly;
    resultsEl.innerHTML = `
      <div class="no-results-box">
        <div class="emoji">🤔</div>
        <strong>No matching service stations found on this route.</strong>
        <p>${noFilter
          ? 'No service stations from our database appear along this route. This might be a short or unusual route.'
          : 'There may be services on this route, but none match your selected filters. Try unchecking some options.'
        }</p>
      </div>`;
    return;
  }

  // ── Build HTML ──
  const totalMiles = (totalMeters / 1609.34).toFixed(0);
  const summaryInterval = intervalMinutes > 0
    ? ` · stopping every ~${intervalMinutes} min`
    : '';
  const stopWord = stops.length === 1 ? 'stop' : 'stops';

  let html = `<p class="results-summary">
    ${totalMiles} miles &nbsp;·&nbsp; ${fmt(totalSecs)} total journey
    &nbsp;·&nbsp; <strong>${stops.length} ${stopWord} suggested</strong>${summaryInterval}
  </p>`;

  html += '<div class="timeline">';

  // Origin
  html += stopRow('start', 'START', `
    <div class="stop-name">${escHtml(originAddress)}</div>
    <div class="stop-timing">Departure — 0:00</div>
  `, true);

  // Service stops
  let prevSecs = 0;
  stops.forEach(service => {
    const timeSecs = service.estimatedTimeSecs;
    const gapSecs  = timeSecs - prevSecs;

    const badges = [];
    if (service.ms)          badges.push('<span class="badge badge-ms">M&amp;S</span>');
    if (service.waitrose)    badges.push('<span class="badge badge-waitrose">Waitrose</span>');
    if (service.pret)        badges.push('<span class="badge badge-pret">Pret</span>');
    if (service.dogFriendly) badges.push('<span class="badge badge-dog">🐕 Dog friendly</span>');

    const body = `
      <div class="stop-name">${escHtml(service.name)}</div>
      <div class="stop-sub">${escHtml(service.road)} &nbsp;·&nbsp; ${escHtml(service.operator)}</div>
      <div class="stop-timing">+${fmt(timeSecs)} from start</div>
      <div class="stop-gap">${fmt(gapSecs)} since last stop</div>
      <div class="badges">${badges.join('')}</div>
      ${service.notes ? `<div class="stop-notes">${escHtml(service.notes)}</div>` : ''}
    `;
    html += stopRow('service', '☕', body, false);
    prevSecs = timeSecs;
  });

  // Destination
  const gapToDest = totalSecs - prevSecs;
  html += stopRow('end', 'END', `
    <div class="stop-name">${escHtml(destAddress)}</div>
    <div class="stop-timing">+${fmt(totalSecs)} total</div>
    <div class="stop-gap">${fmt(gapToDest)} from last stop</div>
  `, true);

  html += '</div>'; // .timeline

  // Footer note when interval mode omits some services
  if (intervalMinutes > 0 && allMatching.length > stops.length) {
    html += `<p class="results-footer">
      ${allMatching.length} matching service${allMatching.length !== 1 ? 's' : ''} found on route.
      Showing ${stops.length} suggested for a ${intervalMinutes}-min cadence.
    </p>`;
  }

  resultsEl.innerHTML = html;
}

// ── Route Matching ────────────────────────────────────────────────
function findServicesOnRoute(directionsResult, filters) {
  const route  = directionsResult.routes[0];
  const leg    = route.legs[0];
  const totalSecs = leg.duration.value;

  // Decode overview polyline into lat/lng points
  // Note: overview_polyline is a string in the JS API (not an object)
  const routePoints = google.maps.geometry.encoding.decodePath(
    route.overview_polyline
  );

  // Build cumulative distances array (metres from start for each point)
  const cumDists = [0];
  for (let i = 1; i < routePoints.length; i++) {
    const seg = google.maps.geometry.spherical.computeDistanceBetween(
      routePoints[i - 1], routePoints[i]
    );
    cumDists.push(cumDists[i - 1] + seg);
  }
  const routeTotalDist = cumDists[cumDists.length - 1];

  const anyBrandFilter = filters.ms || filters.waitrose || filters.pret;
  const THRESHOLD = 6000; // metres — services are right off the motorway
  const MIN_TIME  = 15 * 60; // ignore services within first/last 15 min
  const MAX_TIME  = totalSecs - 15 * 60;

  const found = [];

  for (const svc of SERVICES) {
    // ── Brand filter (OR logic) ──
    if (anyBrandFilter) {
      const hasBrand =
        (filters.ms       && svc.ms)       ||
        (filters.waitrose && svc.waitrose)  ||
        (filters.pret     && svc.pret);
      if (!hasBrand) continue;
    }

    // ── Dog friendly (AND filter) ──
    if (filters.dogFriendly && !svc.dogFriendly) continue;

    const svcLatLng = new google.maps.LatLng(svc.lat, svc.lng);

    // Find nearest polyline point
    let minDist    = Infinity;
    let closestIdx = 0;

    for (let i = 0; i < routePoints.length; i++) {
      const d = google.maps.geometry.spherical.computeDistanceBetween(
        svcLatLng, routePoints[i]
      );
      if (d < minDist) { minDist = d; closestIdx = i; }
    }

    if (minDist > THRESHOLD) continue;

    // Estimate time at this point via linear interpolation
    const progress      = cumDists[closestIdx] / routeTotalDist;
    const estimatedSecs = Math.round(progress * totalSecs);

    if (estimatedSecs < MIN_TIME || estimatedSecs > MAX_TIME) continue;

    found.push({ ...svc, estimatedTimeSecs: estimatedSecs, distFromRoute: minDist });
  }

  // Sort by time from start (= order along route)
  found.sort((a, b) => a.estimatedTimeSecs - b.estimatedTimeSecs);
  return found;
}

// ── Stop Suggestion ───────────────────────────────────────────────
// Picks one stop per interval cadence. Prefers the service closest
// to the target time, but won't pick one earlier than 70% of the
// interval since the last stop.
function suggestStops(services, intervalSecs, totalSecs) {
  const result     = [];
  const minGap     = intervalSecs * 0.7;
  const stopCutoff = totalSecs - 30 * 60; // don't suggest a stop within 30 min of arrival
  let   lastTime   = 0;

  for (let pass = 0; pass < 20; pass++) {
    const target = lastTime + intervalSecs;
    if (target > stopCutoff) break;

    let best     = null;
    let bestDiff = Infinity;

    for (const svc of services) {
      if (result.includes(svc)) continue;
      if (svc.estimatedTimeSecs < lastTime + minGap) continue;

      const diff = Math.abs(svc.estimatedTimeSecs - target);
      if (diff < bestDiff) { bestDiff = diff; best = svc; }
    }

    if (!best) break;

    result.push(best);
    lastTime = best.estimatedTimeSecs;
  }

  return result;
}

// ── Helpers ───────────────────────────────────────────────────────

/** Format seconds as "Xh Ym" or "Y min" */
function fmt(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.round((secs % 3600) / 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Build a timeline row */
function stopRow(type, icon, bodyHTML, isTerminal) {
  return `
    <div class="stop-row">
      <div class="stop-icon ${type}">${icon}</div>
      <div class="stop-body${isTerminal ? ' terminal' : ''}">
        ${bodyHTML}
      </div>
    </div>`;
}

/** Simple HTML escaping */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showError(msg) {
  const el = document.getElementById('results');
  el.classList.remove('hidden');
  el.innerHTML = `<div class="error-box">${escHtml(msg)}</div>`;
}

// ── Keyboard shortcut ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Disable button until Maps loads
  document.getElementById('search-btn').disabled = true;

  ['origin', 'destination'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        // Small delay lets autocomplete selection settle
        setTimeout(window.searchRoute, 300);
      }
    });
  });
});
