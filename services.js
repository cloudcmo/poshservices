// ─────────────────────────────────────────────────────────────────
// Posh Services — Service Station Dataset
// Sources: motorwayservices.uk (updated April–May 2026)
// Each entry is a motorway service area (MSA) or major A-road
// service. Coordinates are the approximate site centre.
// ─────────────────────────────────────────────────────────────────

const SERVICES = [

  // ── A1(M) ────────────────────────────────────────────────────
  { id: 'baldock',       name: 'Baldock',        road: 'A1(M)', operator: 'Moto',        lat: 52.0018, lng: -0.1862, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: '' },
  { id: 'sawtry',        name: 'Sawtry',         road: 'A1(M)', operator: 'Moto',        lat: 52.4230, lng: -0.2778, ms: true,  waitrose: false, pret: true,  dogFriendly: false, notes: '' },
  { id: 'peterborough',  name: 'Peterborough',   road: 'A1(M)', operator: 'Moto',        lat: 52.5911, lng: -0.2640, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: '' },
  { id: 'wetherby',      name: 'Wetherby',       road: 'A1(M)', operator: 'Moto',        lat: 53.9279, lng: -1.3942, ms: true,  waitrose: false, pret: true,  dogFriendly: false, notes: '' },
  { id: 'blyth',         name: 'Blyth',          road: 'A1(M)', operator: 'Moto',        lat: 53.3957, lng: -1.0373, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: '' },
  { id: 'scotch-corner', name: 'Scotch Corner',  road: 'A1(M)', operator: 'Moto',        lat: 54.4318, lng: -1.6613, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: '' },
  { id: 'south-mimms',   name: 'South Mimms',    road: 'M25/A1(M)', operator: 'Welcome Break', lat: 51.7085, lng: -0.1897, ms: false, waitrose: true,  pret: true,  dogFriendly: false, notes: '' },

  // ── M1 ───────────────────────────────────────────────────────
  { id: 'london-gateway',       name: 'London Gateway',       road: 'M1', operator: 'Welcome Break', lat: 51.7316, lng: -0.3684, ms: false, waitrose: true,  pret: false, dogFriendly: false, notes: '' },
  { id: 'toddington',           name: 'Toddington',           road: 'M1', operator: 'Moto',          lat: 51.9521, lng: -0.4741, ms: true,  waitrose: false, pret: true,  dogFriendly: false, notes: 'Pret northbound only' },
  { id: 'newport-pagnell',      name: 'Newport Pagnell',      road: 'M1', operator: 'Welcome Break', lat: 52.0854, lng: -0.7183, ms: false, waitrose: true,  pret: false, dogFriendly: false, notes: '' },
  { id: 'leicester-forest-east',name: 'Leicester Forest East',road: 'M1', operator: 'Welcome Break', lat: 52.6254, lng: -1.1985, ms: false, waitrose: true,  pret: false, dogFriendly: false, notes: '' },
  { id: 'donington',            name: 'Donington',            road: 'M1', operator: 'Moto',          lat: 52.8311, lng: -1.3441, ms: true,  waitrose: false, pret: true,  dogFriendly: false, notes: '' },
  { id: 'trowell',              name: 'Trowell',              road: 'M1', operator: 'Moto',          lat: 52.9405, lng: -1.2773, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: '' },
  { id: 'rotherham',            name: 'Rotherham',            road: 'M1', operator: 'Welcome Break', lat: 53.4534, lng: -1.3416, ms: false, waitrose: false, pret: true,  dogFriendly: false, notes: '' },
  { id: 'woodall',              name: 'Woodall',              road: 'M1', operator: 'Welcome Break', lat: 53.4825, lng: -1.3261, ms: false, waitrose: true,  pret: false, dogFriendly: false, notes: '' },
  { id: 'woolley-edge',         name: 'Woolley Edge',         road: 'M1', operator: 'Moto',          lat: 53.6168, lng: -1.5269, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: 'M&S southbound only' },
  { id: 'leeds-skelton-lake',   name: 'Leeds Skelton Lake',   road: 'M1', operator: 'Extra',         lat: 53.7545, lng: -1.4705, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: '' },

  // ── M2 ───────────────────────────────────────────────────────
  { id: 'medway', name: 'Medway', road: 'M2', operator: 'Moto', lat: 51.3737, lng: 0.5609, ms: true, waitrose: false, pret: false, dogFriendly: false, notes: '' },

  // ── M3 ───────────────────────────────────────────────────────
  { id: 'fleet',      name: 'Fleet',      road: 'M3', operator: 'Welcome Break', lat: 51.2713, lng: -0.8481, ms: false, waitrose: true,  pret: true,  dogFriendly: false, notes: '' },
  { id: 'winchester', name: 'Winchester', road: 'M3', operator: 'Moto',          lat: 51.0628, lng: -1.3310, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: '' },

  // ── M4 ───────────────────────────────────────────────────────
  { id: 'heston',         name: 'Heston',         road: 'M4', operator: 'Moto',          lat: 51.4784, lng: -0.3802, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: 'M&S westbound only' },
  { id: 'reading',        name: 'Reading',         road: 'M4', operator: 'Moto',          lat: 51.4359, lng: -1.0722, ms: true,  waitrose: false, pret: true,  dogFriendly: false, notes: '' },
  { id: 'chieveley',      name: 'Chieveley',       road: 'M4', operator: 'Moto',          lat: 51.4621, lng: -1.2684, ms: true,  waitrose: false, pret: true,  dogFriendly: false, notes: '' },
  { id: 'membury',        name: 'Membury',          road: 'M4', operator: 'Welcome Break', lat: 51.4900, lng: -1.5504, ms: false, waitrose: true,  pret: false, dogFriendly: false, notes: '' },
  { id: 'leigh-delamere', name: 'Leigh Delamere',  road: 'M4', operator: 'Moto',          lat: 51.4986, lng: -2.1152, ms: true,  waitrose: false, pret: true,  dogFriendly: false, notes: '' },
  { id: 'cardiff-gate',   name: 'Cardiff Gate',    road: 'M4', operator: 'Welcome Break', lat: 51.5490, lng: -3.1240, ms: false, waitrose: true,  pret: false, dogFriendly: false, notes: '' },

  // ── M5 ───────────────────────────────────────────────────────
  { id: 'frankley',    name: 'Frankley',    road: 'M5', operator: 'Moto',               lat: 52.3949, lng: -2.0462, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: '' },
  { id: 'strensham',   name: 'Strensham',   road: 'M5', operator: 'Roadchef',           lat: 52.1018, lng: -2.1054, ms: false, waitrose: false, pret: true,  dogFriendly: false, notes: '' },
  { id: 'gloucester',  name: 'Gloucester',  road: 'M5', operator: 'Gloucester Services', lat: 51.8233, lng: -2.2374, ms: false, waitrose: false, pret: false, dogFriendly: true,  notes: 'Independent farm shop. Scenic lake walk, excellent outdoor space for dogs.' },
  { id: 'michaelwood', name: 'Michaelwood', road: 'M5', operator: 'Welcome Break',      lat: 51.6285, lng: -2.3765, ms: false, waitrose: true,  pret: false, dogFriendly: false, notes: '' },
  { id: 'gordano',     name: 'Gordano',     road: 'M5', operator: 'Welcome Break',      lat: 51.4681, lng: -2.7226, ms: false, waitrose: true,  pret: false, dogFriendly: false, notes: '' },
  { id: 'bridgwater',  name: 'Bridgwater',  road: 'M5', operator: 'Moto',               lat: 51.1379, lng: -3.0011, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: '' },
  { id: 'exeter',      name: 'Exeter',      road: 'M5', operator: 'Moto',               lat: 50.7294, lng: -3.4693, ms: true,  waitrose: false, pret: true,  dogFriendly: false, notes: '' },

  // ── M6 ───────────────────────────────────────────────────────
  { id: 'rugby',            name: 'Rugby',            road: 'M6', operator: 'Moto',          lat: 52.4171, lng: -1.2924, ms: true,  waitrose: false, pret: true,  dogFriendly: false, notes: '' },
  { id: 'corley',           name: 'Corley',           road: 'M6', operator: 'Welcome Break', lat: 52.4799, lng: -1.5886, ms: false, waitrose: true,  pret: false, dogFriendly: false, notes: '' },
  { id: 'hilton-park',      name: 'Hilton Park',      road: 'M6', operator: 'Moto',          lat: 52.6360, lng: -2.0300, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: '' },
  { id: 'stafford',         name: 'Stafford',         road: 'M6', operator: 'Roadchef',      lat: 52.8825, lng: -2.1108, ms: true,  waitrose: false, pret: true,  dogFriendly: true,  notes: 'Duck pond, wooded walk, large grass area and dog water fountain.' },
  { id: 'keele',            name: 'Keele',            road: 'M6', operator: 'Welcome Break', lat: 52.9985, lng: -2.2710, ms: false, waitrose: true,  pret: false, dogFriendly: false, notes: '' },
  { id: 'knutsford',        name: 'Knutsford',        road: 'M6', operator: 'Moto',          lat: 53.3134, lng: -2.3735, ms: true,  waitrose: false, pret: true,  dogFriendly: false, notes: '' },
  { id: 'lymm',             name: 'Lymm',             road: 'M6', operator: 'Moto',          lat: 53.3800, lng: -2.4703, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: '' },
  { id: 'charnock-richard', name: 'Charnock Richard', road: 'M6', operator: 'Welcome Break', lat: 53.6299, lng: -2.6624, ms: false, waitrose: true,  pret: false, dogFriendly: false, notes: '' },
  { id: 'lancaster',        name: 'Lancaster',        road: 'M6', operator: 'Moto',          lat: 54.0512, lng: -2.7814, ms: true,  waitrose: false, pret: true,  dogFriendly: false, notes: '' },
  { id: 'burton-in-kendal', name: 'Burton-in-Kendal', road: 'M6', operator: 'Moto',          lat: 54.1955, lng: -2.7070, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: '' },
  { id: 'tebay',            name: 'Tebay',            road: 'M6', operator: 'Westmorland',   lat: 54.4305, lng: -2.5961, ms: false, waitrose: false, pret: false, dogFriendly: true,  notes: 'Independent farm shop. Views of Howgill Fells — one of the best dog stops in the country.' },
  { id: 'southwaite',       name: 'Southwaite',       road: 'M6', operator: 'Moto',          lat: 54.8370, lng: -2.8773, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: '' },

  // ── M8 ───────────────────────────────────────────────────────
  { id: 'heart-of-scotland', name: 'Heart of Scotland (Harthill)', road: 'M8', operator: 'Moto', lat: 55.8671, lng: -3.7413, ms: true, waitrose: false, pret: false, dogFriendly: false, notes: '' },

  // ── M11 ──────────────────────────────────────────────────────
  { id: 'birchanger-green', name: 'Birchanger Green', road: 'M11', operator: 'Welcome Break', lat: 51.8710, lng: 0.1980, ms: false, waitrose: true, pret: true, dogFriendly: false, notes: '' },

  // ── M18/M180 ─────────────────────────────────────────────────
  { id: 'doncaster-north', name: 'Doncaster North', road: 'M18', operator: 'Moto', lat: 53.5316, lng: -1.1255, ms: true, waitrose: false, pret: false, dogFriendly: false, notes: '' },

  // ── M23 ──────────────────────────────────────────────────────
  { id: 'pease-pottage', name: 'Pease Pottage', road: 'M23', operator: 'Moto', lat: 51.0894, lng: -0.1966, ms: true, waitrose: false, pret: false, dogFriendly: false, notes: '' },

  // ── M25 ──────────────────────────────────────────────────────
  { id: 'cobham',   name: 'Cobham',   road: 'M25', operator: 'Moto', lat: 51.3461, lng: -0.3929, ms: true, waitrose: false, pret: false, dogFriendly: false, notes: '' },
  { id: 'thurrock', name: 'Thurrock', road: 'M25', operator: 'Moto', lat: 51.4943, lng:  0.3399, ms: true, waitrose: false, pret: false, dogFriendly: false, notes: '' },

  // ── M27 ──────────────────────────────────────────────────────
  { id: 'rownhams', name: 'Rownhams', road: 'M27', operator: 'Roadchef', lat: 50.9556, lng: -1.4512, ms: false, waitrose: false, pret: true, dogFriendly: false, notes: 'Pret westbound only' },

  // ── M40 ──────────────────────────────────────────────────────
  { id: 'beaconsfield',   name: 'Beaconsfield',   road: 'M40', operator: 'Extra',         lat: 51.5836, lng: -0.6374, ms: true,  waitrose: false, pret: false, dogFriendly: true,  notes: 'Landscaped gardens and a lake trail — one of the nicest spots to walk a dog on the network.' },
  { id: 'cherwell-valley',name: 'Cherwell Valley', road: 'M40', operator: 'Moto',          lat: 51.9668, lng: -1.2611, ms: true,  waitrose: false, pret: true,  dogFriendly: false, notes: '' },
  { id: 'oxford',         name: 'Oxford',          road: 'M40', operator: 'Welcome Break', lat: 51.7603, lng: -1.2597, ms: false, waitrose: true,  pret: true,  dogFriendly: false, notes: '' },
  { id: 'warwick',        name: 'Warwick',          road: 'M40', operator: 'Welcome Break', lat: 52.2741, lng: -1.5498, ms: false, waitrose: false, pret: true,  dogFriendly: false, notes: '' },

  // ── M42 ──────────────────────────────────────────────────────
  { id: 'tamworth',     name: 'Tamworth',     road: 'M42', operator: 'Moto',          lat: 52.5790, lng: -1.6800, ms: true,  waitrose: false, pret: true,  dogFriendly: false, notes: '' },
  { id: 'hopwood-park', name: 'Hopwood Park', road: 'M42', operator: 'Welcome Break', lat: 52.3747, lng: -1.9624, ms: false, waitrose: true,  pret: false, dogFriendly: false, notes: '' },

  // ── M54 ──────────────────────────────────────────────────────
  { id: 'telford', name: 'Telford', road: 'M54', operator: 'Welcome Break', lat: 52.6779, lng: -2.4464, ms: false, waitrose: true, pret: false, dogFriendly: false, notes: '' },

  // ── M56 ──────────────────────────────────────────────────────
  { id: 'chester', name: 'Chester', road: 'M56', operator: 'Roadchef', lat: 53.2706, lng: -2.8649, ms: false, waitrose: false, pret: true, dogFriendly: false, notes: '' },

  // ── M62 ──────────────────────────────────────────────────────
  { id: 'birch',          name: 'Birch',          road: 'M62', operator: 'Moto',          lat: 53.5583, lng: -2.1769, ms: true,  waitrose: false, pret: true,  dogFriendly: false, notes: 'Pret eastbound only; M&S both sides' },
  { id: 'hartshead-moor', name: 'Hartshead Moor', road: 'M62', operator: 'Welcome Break', lat: 53.7198, lng: -1.7462, ms: false, waitrose: true,  pret: false, dogFriendly: false, notes: 'Waitrose westbound only' },
  { id: 'ferrybridge',    name: 'Ferrybridge',    road: 'M62', operator: 'Moto',          lat: 53.7079, lng: -1.2804, ms: true,  waitrose: false, pret: true,  dogFriendly: true,  notes: 'Dedicated dog walking area and EV charging.' },

  // ── M90 ──────────────────────────────────────────────────────
  { id: 'kinross',  name: 'Kinross',  road: 'M90', operator: 'Moto', lat: 56.1973, lng: -3.4372, ms: true, waitrose: false, pret: false, dogFriendly: false, notes: '' },
  { id: 'stirling', name: 'Stirling', road: 'M9',  operator: 'Moto', lat: 56.1284, lng: -3.9052, ms: true, waitrose: false, pret: false, dogFriendly: false, notes: '' },

  // ── A74(M) ───────────────────────────────────────────────────
  { id: 'gretna', name: 'Gretna', road: 'A74(M)', operator: 'Welcome Break', lat: 54.9956, lng: -3.0579, ms: false, waitrose: true, pret: false, dogFriendly: false, notes: '' },

];
