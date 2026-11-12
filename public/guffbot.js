// GuffBot, your co-pilot. A few friendly words about the journey you've planned: things worth looking out of
// the window for, and a remark or two. Fond, dry, never rude about anyone's trip. Every line is picked from the
// journey itself, so a shared link always shows the same words.
//
// Landmarks: [id, name, lat, lng, how close the route must pass (km), priority 1-3, kind, lines]
//   kind 'see'  : something to look at; {side} says which side of the car
//   kind 'far'  : seen from a distance; {side} says "off to the left"
//   kind 'here' : the road itself (a bridge, a tunnel); no side
//   kind 'ns'   : a border crossed north/south; lines = [northbound, southbound]
//   kind 'ew'   : a border crossed east/west; lines = [westbound, eastbound]
// Placeholders: {When} / {when} ("About 1h 10m in" / "about 1h 10m in"), {side}.
(() => {
  const L = [
    ['stonehenge', 'Stonehenge', 51.1789, -1.8262, 1.5, 3, 'see', [
      "{When}, Stonehenge is {side}. Passengers may gaze in wonder. Drivers may glance, briefly, in wonder.",
      "{When}, look {side} for Stonehenge. Five thousand years old and still no café. Your stops are better equipped.",
    ]],
    ['angel', 'Angel of the North', 54.9141, -1.5895, 2.2, 3, 'see', [
      "{When}, the Angel of the North is {side}, arms out, welcoming you like a very large rusty uncle.",
      "{When}, give a wave to the Angel of the North, {side}. Twenty metres tall. Never once put its arms down.",
    ]],
    ['willowman', 'Willow Man', 51.135, -2.965, 3.5, 2, 'see', [
      "Near Bridgwater, {when}, keep an eye out {side} for the Willow Man, striding across the Somerset Levels and never getting anywhere.",
    ]],
    ['glastonbury', 'Glastonbury Tor', 51.1444, -2.6986, 14, 2, 'far', [
      "On a clear day, {when}, Glastonbury Tor pokes up out of the Levels {side}. The hill with a tower on top. Mystical, apparently.",
    ]],
    ['wellington', 'Wellington Monument', 50.9572, -3.2290, 4.5, 2, 'far', [
      "{When}, the Wellington Monument stands up on the Blackdown Hills {side}. A very tall obelisk. Never once given anyone directions.",
    ]],
    ['brentknoll', 'Brent Knoll', 51.2495, -2.9558, 2.5, 1, 'see', [
      "That lump {side} near Sedgemoor, {when}, is Brent Knoll. Iron Age hill fort. Cracking view of the M5, which they didn't have back then.",
    ]],
    ['severn-old', 'Severn Bridge', 51.6094, -2.6436, 1.2, 3, 'ew', [
      "{When} you cross the old Severn Bridge into Wales. Croeso i Gymru! No tolls these days, so keep your change for a flapjack.",
      "{When} you cross the old Severn Bridge back into England. The estuary waves you off.",
    ]],
    ['severn-new', 'Prince of Wales Bridge', 51.5735, -2.7000, 1.6, 3, 'ew', [
      "{When} you cross the Severn on the Prince of Wales Bridge into Wales. Croeso i Gymru! Mind the crosswinds.",
      "{When} you cross the Severn on the Prince of Wales Bridge, back into England. Wave goodbye to the dragons.",
    ]],
    ['avonmouth', 'Avonmouth Bridge', 51.4925, -2.6905, 1.2, 1, 'here', [
      "{When} you're up on the Avonmouth Bridge: docks, cranes and rows of shiny new cars waiting for owners. Big views. Big wind.",
    ]],
    ['spaghetti', 'Spaghetti Junction', 52.5080, -1.8630, 1.2, 2, 'here', [
      "{When} you meet Spaghetti Junction. Concrete ribbons in every direction, one sat nav calmly saying 'keep left'. You'll be fine.",
    ]],
    ['thelwall', 'Thelwall Viaduct', 53.3925, -2.5150, 1.5, 1, 'here', [
      "{When} you're on the Thelwall Viaduct, high over the Manchester Ship Canal. Look down for a ship. There's rarely a ship.",
    ]],
    ['stotthall', 'Stott Hall Farm', 53.6422, -1.9630, 1.4, 3, 'here', [
      "{When}, look out for Stott Hall Farm, sitting between the two carriageways of the M62 like it got there first. It did.",
      "{When} you pass Stott Hall Farm, marooned in the middle of the M62, on the highest stretch of motorway in England. The sheep seem fine with it.",
    ]],
    ['emley', 'Emley Moor mast', 53.6122, -1.6647, 9, 1, 'far', [
      "That very tall concrete needle {side}, {when}, is Emley Moor mast: the tallest freestanding structure in Britain. It's done a lot of telly.",
    ]],
    ['drax', 'Drax power station', 53.7353, -0.9966, 9, 2, 'far', [
      "{When}, the cooling towers of Drax power station loom {side}, steaming away across the flatlands. Massive. Genuinely massive.",
    ]],
    ['ratcliffe', 'Ratcliffe-on-Soar', 52.8653, -1.2547, 3, 2, 'see', [
      "{When}, the giant cooling towers at Ratcliffe-on-Soar are {side}, right by the M1. Enjoy them while they last: they're due to be knocked down.",
    ]],
    ['hardwick', 'Hardwick Hall', 53.1678, -1.3108, 3.5, 2, 'far', [
      "{When}, glance up the hill {side} for Hardwick Hall. Bess of Hardwick put in so many windows they made up a rhyme about it: more glass than wall.",
    ]],
    ['tinsley', 'Tinsley Viaduct', 53.4140, -1.4000, 1.2, 1, 'here', [
      "{When} you're on the Tinsley Viaduct by Meadowhall: a double-decker motorway. Terribly modern. In 1968.",
    ]],
    ['shap', 'Shap summit', 54.4650, -2.6350, 3, 2, 'here', [
      "{When} you climb over Shap, the highest point of the M6. Fells all round. Sheep entirely unimpressed.",
    ]],
    ['lune', 'Lune Gorge', 54.3900, -2.5900, 3, 2, 'here', [
      "{When} the M6 threads through the Lune Gorge with the Howgill Fells alongside. One of the loveliest bits of motorway anywhere. Yes, motorway.",
    ]],
    ['gretna', 'the border at Gretna', 55.0003, -3.0570, 2.5, 3, 'ns', [
      "{When} you cross into Scotland. Fàilte gu Alba! The journey has officially become an adventure.",
      "{When} you cross the border back into England. Scotland waves you off with a square of tablet.",
    ]],
    ['berwick', 'the border near Berwick', 55.8114, -2.0356, 2.5, 3, 'ns', [
      "{When} you cross into Scotland, with the North Sea alongside. Fàilte gu Alba!",
      "{When} you cross back into England, North Sea alongside. Berwick has changed hands thirteen times, so be polite.",
    ]],
    ['kelpies', 'The Kelpies', 56.0192, -3.7550, 1.8, 3, 'see', [
      "{When}, the Kelpies are {side} by the M9: two thirty-metre steel horse heads. Even the horses look surprised.",
    ]],
    ['queensferry', 'Queensferry Crossing', 56.0040, -3.4140, 1.8, 3, 'here', [
      "{When} you cross the Forth on the Queensferry Crossing, with the red Forth Bridge off to the east. Three centuries of bridges in one glance.",
    ]],
    ['kites', 'the Chilterns', 51.6620, -0.9150, 3, 2, 'here', [
      "{When}, as the M40 drops through the chalk cutting in the Chilterns, look up: red kites, circling. Hundreds live round here. They're not after your sandwiches. Probably.",
    ]],
    ['dartford', 'Dartford Crossing', 51.4650, 0.2600, 1.4, 3, 'here', [
      "{When} you cross the Thames at Dartford: the big bridge going south, the tunnels going north. Either way, remember to pay the Dart Charge online by midnight the next day.",
    ]],
    ['heathrow', 'Heathrow', 51.4720, -0.5050, 2.5, 1, 'here', [
      "Round Heathrow, {when}, planes come in low over the motorway. Passengers may wave. Pilots will not wave back.",
    ]],
    ['malverns', 'the Malvern Hills', 52.1043, -2.3398, 13, 2, 'far', [
      "{When}, the Malvern Hills line up along the skyline {side}. Elgar used to walk them. You can just admire them at seventy.",
    ]],
    ['wrekin', 'The Wrekin', 52.6686, -2.5517, 3.5, 2, 'see', [
      "The big wooded hill {side}, {when}, is the Wrekin. Shropshire's finest lump, according to Shropshire.",
    ]],
    ['porttalbot', 'Port Talbot', 51.5700, -3.7650, 3, 1, 'see', [
      "{When} the M4 runs high past the Port Talbot steelworks {side}: chimneys, sea and sky. Strangely magnificent.",
    ]],
    ['blackpool', 'Blackpool Tower', 53.8159, -3.0552, 6, 2, 'far', [
      "{When}, first one to spot Blackpool Tower {side} wins. That's the rule. It has always been the rule.",
    ]],
    ['jamaica', 'Jamaica Inn', 50.5540, -4.5675, 1.5, 2, 'see', [
      "{When} you pass Jamaica Inn {side}, up on Bodmin Moor. Smugglers, Daphne du Maurier and, these days, lunch.",
    ]],
    ['dartmoor', 'Dartmoor', 50.6866, -4.0122, 7, 2, 'far', [
      "{When}, Dartmoor rolls away {side}. High Willhays and Yes Tor up there are the highest ground in southern England. Wave to the ponies.",
    ]],
    ['orwell', 'Orwell Bridge', 52.0350, 1.1700, 1.2, 1, 'here', [
      "{When} you sail over the Orwell Bridge, high above the river. Boats below and, if you squint, the cranes at Felixstowe.",
    ]],
    ['ely', 'Ely Cathedral', 52.3986, 0.2638, 6, 2, 'far', [
      "{When}, look across the Fens {side} for Ely Cathedral, the 'ship of the Fens', floating over the flat fields.",
    ]],
    ['lincoln', 'Lincoln Cathedral', 53.2344, -0.5361, 7, 2, 'far', [
      "Lincoln Cathedral sits up on its hill {side}, {when}. For a couple of centuries it was the tallest building in the world. It's taken the demotion well.",
    ]],
    ['humber', 'Humber Bridge', 53.7069, -0.4505, 1.2, 2, 'here', [
      "{When} you cross the Humber Bridge. When it opened it was the longest single-span suspension bridge in the world. Still very long. Still very much a bridge.",
    ]],
    ['menai', 'Britannia Bridge', 53.2157, -4.1866, 1.2, 2, 'here', [
      "{When} you cross the Menai Strait on the Britannia Bridge, with the mountains of Eryri behind you.",
    ]],
    ['conwy', 'Conwy', 53.2801, -3.8257, 1.5, 2, 'here', [
      "{When} you dive under the river at Conwy, right by the castle. Edward I built the castle. Someone else did the tunnel.",
    ]],
    ['watford', 'Watford Gap', 52.3050, -1.1210, 1.2, 1, 'here', [
      "{When} you pass Watford Gap, Britain's first motorway services, open since 1959. Traditionally where the North begins. Or the South. Depends who you ask.",
    ]],
    ['duxford', 'Duxford', 52.0950, 0.1310, 1.8, 1, 'see', [
      "{When}, that airfield {side} by the M11 is Duxford, full of old aeroplanes. Now and then a Spitfire goes over. A fine thing to see from a lay-by. Not from the outside lane.",
    ]],
    ['silbury', 'Silbury Hill', 51.4157, -1.8574, 1.2, 1, 'see', [
      "{When}, the big green mound {side} is Silbury Hill, the largest prehistoric man-made mound in Europe. Nobody knows why they built it. Admire it anyway.",
    ]],
    ['salisbury', 'Salisbury Cathedral', 51.0651, -1.7975, 5, 1, 'far', [
      "{When}, the spire of Salisbury Cathedral pokes up {side}: the tallest church spire in Britain.",
    ]],
    ['brynglas', 'Brynglas tunnels', 51.5995, -2.9917, 1, 1, 'here', [
      "{When} the M4 squeezes through the Brynglas tunnels at Newport. Everyone slows down. Nobody knows why. Join in.",
    ]],
    ['kingston', 'Kingston Bridge', 55.8560, -4.2700, 1, 1, 'here', [
      "{When} you cross the Clyde on the Kingston Bridge, slap through the middle of Glasgow.",
    ]],
    ['westbury', 'Westbury White Horse', 51.2636, -2.1465, 4, 1, 'far', [
      "Look {side} for the Westbury White Horse cut into the hillside, {when}. Not a real horse. Very good likeness.",
    ]],
  ];

  // ── Helpers ──────────────────────────────────────────────────
  // A small, stable number from a string, so the same journey always gets the same words
  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  const pick = (arr, seed) => arr[seed % arr.length];
  const fmtDur = s => {
    const m = Math.round(s / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60), r = m % 60;
    return r ? `${h}h ${r}m` : `${h}h`;
  };
  const short = label => {
    const s = String(label || '').split(',')[0].trim();
    return /^(my location|point on the map)$/i.test(s) ? null : s;
  };
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ''));

  // Flat x/y in km around a reference latitude: plenty accurate over a few kilometres
  function proj(lat0) {
    const kx = 111.32 * Math.cos(lat0 * Math.PI / 180), ky = 110.57;
    return (lng, lat) => [lng * kx, lat * ky];
  }

  // Closest approach of the route to a point: distance, how far along, and which way the road is heading there
  function nearest(line, lat, lng) {
    const P = proj(lat);
    const [px, py] = P(lng, lat);
    let best = { d: Infinity, along: 0, i: 0 };
    let run = 0;
    let prev = P(line[0][0], line[0][1]);
    for (let i = 1; i < line.length; i++) {
      const cur = P(line[i][0], line[i][1]);
      const dx = cur[0] - prev[0], dy = cur[1] - prev[1];
      const len2 = dx * dx + dy * dy;
      const seg = Math.sqrt(len2);
      let t = len2 ? ((px - prev[0]) * dx + (py - prev[1]) * dy) / len2 : 0;
      t = Math.max(0, Math.min(1, t));
      const qx = prev[0] + t * dx, qy = prev[1] + t * dy;
      const d = Math.hypot(px - qx, py - qy);
      if (d < best.d) best = { d, along: run + t * seg, i };
      run += seg;
      prev = cur;
    }
    // heading: smooth over a few points either side
    const a = P(...line[Math.max(0, best.i - 3)]), b = P(...line[Math.min(line.length - 1, best.i + 2)]);
    const hx = b[0] - a[0], hy = b[1] - a[1];
    const q = P(...line[best.i]);
    const cross = hx * (py - q[1]) - hy * (px - q[0]);
    return { d: best.d, along: best.along, total: run, hx, hy, left: cross > 0 };
  }

  function kmBetween(a, b) {
    const P = proj(a.lat);
    const [ax, ay] = P(a.lng, a.lat), [bx, by] = P(b.lng, b.lat);
    return Math.hypot(ax - bx, ay - by);
  }

  // ── What GuffBot says ────────────────────────────────────────
  const OPEN = {
    tiny: [
      "A short hop{to}. Barely time to find a decent radio station.",
      "Short and sweet{to}. A stop is optional, but nobody ever regretted a flapjack.",
      "A quick one{to}. Put the kettle on when you get there.",
    ],
    short: [
      "{miles} miles{to}, about {dur}. A proper little outing.",
      "{miles} miles{to}. Long enough for one good sing-along. Possibly two.",
      "About {dur}{to}. A tidy run. I approve.",
    ],
    mid: [
      "{miles} miles{to}, about {dur}. That's a full double album and most of a podcast.",
      "{miles} miles{to}. A decent drive. Snacks are not optional, they're compulsory.",
      "About {dur} on the road{to}. Time for a proper stop or two, and I've found the good ones.",
    ],
    long: [
      "{miles} miles{to}. An expedition. Pack sandwiches, a spare charger and a sense of adventure.",
      "{miles} miles, about {dur}{to}. Practically a voyage. I'd bring a flask.",
      "About {dur}{to}. A big day on the road, so let's make the stops count.",
    ],
    epic: [
      "{miles} miles{to}! That's not a journey, that's a saga. I've lined up your stops like chapters.",
      "{miles} miles, about {dur}. The length of Britain, near enough. Wave to everyone on the way.",
    ],
  };
  const NONE = [
    "No great monuments on this route, so it's down to you to spot the best cloud.",
    "Not many famous landmarks on this one. Count the Eddie Stobart lorries instead: they've all got names.",
    "No famous sights to report on this one. Just good honest road, and some excellent verges.",
  ];
  const INTRO = [
    "{Hello}, I'm GuffBot. I've been to every services in Britain. Some of them twice, by accident. Where are you off to?",
    "{Hello}. GuffBot here, your co-pilot. I can't drive and I can't read a map, but I know where the good flapjack is.",
    "{Hello}. I'm GuffBot. Pop your journey in and I'll find the services worth pulling in for.",
  ];
  const REACT = {
    saved: ["Saved. I'll guard it with my life. Or at least with my lightbulb.", "Saved to your journeys. I've made a note in my notebook. It's a very small notebook."],
    unsaved: ["Taken off your favourites. No hard feelings.", "Removed. It's gone to live on a farm."],
    feedback: ["Thank you. I've written it on my hand.", "Thank you! Carl reads every one, usually with a cup of tea."],
    thanks: ["Oh, that's kind. I'm blushing. Well, my light's gone on.", "Thank you! You've made a small robot very happy."],
    signedin: ["You're signed in. Your favourite journeys will follow you about now. In a nice way."],
  };

  function journey(d, stops = [], opts = {}) {
    const seed = hash(`${d.from.lat.toFixed(3)},${d.from.lng.toFixed(3)}>${d.to.lat.toFixed(3)},${d.to.lng.toFixed(3)}`);
    const miles = Math.round(d.distance / 1609.34);
    const to = short(d.to.label);
    const lines = [];

    // 1. a word on the journey as a whole
    const band = miles < 30 ? 'tiny' : miles < 90 ? 'short' : miles < 200 ? 'mid' : miles < 380 ? 'long' : 'epic';
    let open = fill(pick(OPEN[band], seed), { miles, dur: fmtDur(d.duration), to: to ? ` to ${to}` : '' });
    const month = new Date().getMonth();
    if (d.to.lng < -4.45 && d.to.lat < 50.75 && month >= 5 && month <= 8) {
      open = `Cornwall in the summer${to && to !== 'Cornwall' ? `, via ${to}` : ''}! Lovely. Half the country agrees, so the stops are worth planning.`;
    }
    lines.push(open);

    // 2. things to look out for, in the order you'll meet them
    const line = d.line || [];
    const seen = [];
    if (line.length > 1) {
      for (const [id, name, lat, lng, r, pri, kind, texts] of L) {
        const n = nearest(line, lat, lng);
        if (n.d > r) continue;
        // skip it if the journey starts or ends right there: you'll know about it
        if (kmBetween({ lat, lng }, d.from) < 3 || kmBetween({ lat, lng }, d.to) < 3) continue;
        seen.push({ id, name, lat, lng, pri, kind, texts, n });
      }
    }
    seen.sort((a, b) => b.pri - a.pri || a.n.along - b.n.along);
    const chosen = seen.slice(0, 3).sort((a, b) => a.n.along - b.n.along);
    for (const s of chosen) {
      const t = s.n.total ? (s.n.along / s.n.total) * d.duration : 0;
      const when = t < 8 * 60 ? 'just after you set off' : d.duration - t < 8 * 60 ? 'just before you arrive' : `about ${fmtDur(t)} in`;
      const lr = s.n.left ? 'left' : 'right';
      const side = s.kind === 'far' ? `off to the ${lr}` : s.n.d < 0.25 ? 'right by the road' : `on your ${lr}`;
      let text;
      if (s.kind === 'ns') text = s.texts[s.n.hy >= 0 ? 0 : 1];
      else if (s.kind === 'ew') text = s.texts[s.n.hx <= 0 ? 0 : 1];
      else text = pick(s.texts, seed >>> 3);
      lines.push(fill(text, { When: cap(when), when, side }));
    }
    if (!chosen.length && miles >= 30) lines.push(pick(NONE, seed >>> 5));

    // 3. a parting word about the stops
    const farm = stops.find(s => s.farmShop);
    const need = opts.need || [];
    if (farm) lines.push(`${farm.name} has a farm shop. I'd strongly advise a Scotch egg. Purely for morale.`);
    else if (need.includes('dog') && stops.length) lines.push(`The dog has been consulted and approves of the grass at ${stops[0].name}.`);
    else if (stops.length >= 3) lines.push(`${stops.length} stops. A civilised pace, like the old days, but with better coffee.`);
    else if (!stops.length && miles < 60) lines.push("You might not need a stop at all. But I won't tell anyone if you have one.");

    return { lines, landmarks: chosen.map(s => s.id) };
  }

  function intro() {
    const h = new Date().getHours();
    const hello = h < 5 ? 'Up early' : h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening';
    const seed = Math.floor(Date.now() / 3600e3);
    return fill(pick(INTRO, seed), { Hello: hello });
  }

  function react(kind) {
    const arr = REACT[kind] || REACT.feedback;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  window.GuffBot = { journey, intro, react, landmarks: L.map(l => ({ id: l[0], name: l[1], lat: l[2], lng: l[3] })) };
})();
