// ─────────────────────────────────────────────────────────────────────────────
// Posh Services — UK Motorway Service Station Dataset
// Data sourced from motorwayservices.uk (June 2026)
// ms: M&S Simply Food  |  waitrose: Waitrose & Partners  |  pret: Pret A Manger
// ─────────────────────────────────────────────────────────────────────────────
const SERVICES = [
  // ── M1 ───────────────────────────────────────────────────────────────────
  { id: 'london-gateway',      name: 'London Gateway',      road: 'M1',    operator: 'Welcome Break', lat: 51.6383, lng: -0.2586, ms: false, waitrose: true,  pret: false, dogFriendly: false, notes: '' },
  { id: 'toddington',          name: 'Toddington',          road: 'M1',    operator: 'Moto',          lat: 51.9274, lng: -0.5338, ms: true,  waitrose: false, pret: true,  dogFriendly: false, notes: 'Pret northbound only' },
  { id: 'newport-pagnell',     name: 'Newport Pagnell',     road: 'M1',    operator: 'Welcome Break', lat: 52.0867, lng: -0.7119, ms: false, waitrose: true,  pret: false, dogFriendly: false, notes: '' },
  { id: 'northampton',         name: 'Northampton',         road: 'M1',    operator: 'Moto',          lat: 52.2042, lng: -0.8922, ms: false, waitrose: false, pret: false, dogFriendly: false, notes: '' },
  { id: 'watford-gap',         name: 'Watford Gap',         road: 'M1',    operator: 'Roadchef',      lat: 52.2653, lng: -1.1225, ms: false, waitrose: false, pret: false, dogFriendly: false, notes: '' },
  { id: 'leicester-forest',    name: 'Leicester Forest East', road: 'M1',  operator: 'Welcome Break', lat: 52.5869, lng: -1.2306, ms: false, waitrose: true,  pret: false, dogFriendly: false, notes: '' },
  { id: 'donington',           name: 'Donington Park',      road: 'M1',    operator: 'Extra',         lat: 52.8197, lng: -1.3825, ms: true,  waitrose: false, pret: true,  dogFriendly: false, notes: '' },
  { id: 'trowell',             name: 'Trowell',             road: 'M1',    operator: 'Moto',          lat: 52.9551, lng: -1.2817, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: '' },
  { id: 'tibshelf',            name: 'Tibshelf',            road: 'M1',    operator: 'Moto',          lat: 53.1094, lng: -1.3761, ms: false, waitrose: false, pret: false, dogFriendly: false, notes: '' },
  { id: 'woodall',             name: 'Woodall',             road: 'M1',    operator: 'Welcome Break', lat: 53.3353, lng: -1.3361, ms: false, waitrose: true,  pret: false, dogFriendly: false, notes: '' },
  { id: 'rotherham',           name: 'Rotherham',           road: 'M1',    operator: 'Moto',          lat: 53.4381, lng: -1.3083, ms: false, waitrose: true,  pret: true,  dogFriendly: false, notes: '' },
  { id: 'woolley-edge',        name: 'Woolley Edge',        road: 'M1',    operator: 'Moto',          lat: 53.5797, lng: -1.5494, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: 'M&S southbound only' },
  { id: 'leeds-skelton-lake',  name: 'Leeds Skelton Lake',  road: 'M1',    operator: 'Extra',         lat: 53.7572, lng: -1.4811, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: '' },
  // ── M2 ───────────────────────────────────────────────────────────────────
  { id: 'medway',              name: 'Medway',              road: 'M2',    operator: 'Moto',          lat: 51.3556, lng: 0.6311,  ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: '' },
  // ── M3 ───────────────────────────────────────────────────────────────────
  { id: 'fleet',               name: 'Fleet',               road: 'M3',    operator: 'Extra',         lat: 51.2822, lng: -0.8564, ms: false, waitrose: true,  pret: true,  dogFriendly: false, notes: '' },
  { id: 'winchester',          name: 'Winchester',          road: 'M3',    operator: 'Roadchef',      lat: 51.0767, lng: -1.2917, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: '' },
  // ── M4 ───────────────────────────────────────────────────────────────────
  { id: 'heston',              name: 'Heston',              road: 'M4',    operator: 'Moto',          lat: 51.4886, lng: -0.3764, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: 'M&S westbound only' },
  { id: 'reading',             name: 'Reading',             road: 'M4',    operator: 'Moto',          lat: 51.4359, lng: -1.0722, ms: true,  waitrose: false, pret: true,  dogFriendly: false, notes: '' },
  { id: 'chieveley',           name: 'Chieveley',           road: 'M4',    operator: 'Extra',         lat: 51.4736, lng: -1.3022, ms: false, waitrose: true,  pret: true,  dogFriendly: false, notes: '' },
  { id: 'membury',             name: 'Membury',             road: 'M4',    operator: 'Extra',         lat: 51.5073, lng: -1.5547, ms: false, waitrose: true,  pret: false, dogFriendly: false, notes: '' },
  { id: 'leigh-delamere',      name: 'Leigh Delamere',      road: 'M4',    operator: 'Moto',          lat: 51.4924, lng: -2.1556, ms: true,  waitrose: false, pret: true,  dogFriendly: false, notes: '' },
  { id: 'cardiff-gate',        name: 'Cardiff Gate',        road: 'M4',    operator: 'Welcome Break', lat: 51.5694, lng: -3.1292, ms: false, waitrose: true,  pret: false, dogFriendly: false, notes: '' },
  // ── M5 ───────────────────────────────────────────────────────────────────
  { id: 'frankley',            name: 'Frankley',            road: 'M5',    operator: 'Moto',          lat: 52.4011, lng: -2.0122, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: '' },
  { id: 'strensham',           name: 'Strensham',           road: 'M5',    operator: 'Roadchef',      lat: 52.1028, lng: -2.0947, ms: false, waitrose: false, pret: true,  dogFriendly: false, notes: '' },
  { id: 'gloucester',          name: 'Gloucester',          road: 'M5',    operator: 'Moto',          lat: 51.8472, lng: -2.2331, ms: false, waitrose: false, pret: false, dogFriendly: true,  notes: 'Dog-friendly outdoor area' },
  { id: 'michaelwood',         name: 'Michaelwood',         road: 'M5',    operator: 'Extra',         lat: 51.6411, lng: -2.3853, ms: false, waitrose: true,  pret: false, dogFriendly: false, notes: '' },
  { id: 'gordano',             name: 'Gordano',             road: 'M5',    operator: 'Welcome Break', lat: 51.4764, lng: -2.7653, ms: false, waitrose: true,  pret: false, dogFriendly: false, notes: '' },
  { id: 'taunton-deane',       name: 'Taunton Deane',       road: 'M5',    operator: 'Welcome Break', lat: 51.0069, lng: -3.1153, ms: false, waitrose: false, pret: false, dogFriendly: false, notes: '' },
  { id: 'cullompton',          name: 'Cullompton',          road: 'M5',    operator: 'Extra',         lat: 50.8408, lng: -3.3958, ms: false, waitrose: false, pret: false, dogFriendly: false, notes: '' },
  { id: 'exeter',              name: 'Exeter',              road: 'M5',    operator: 'Moto',          lat: 50.7097, lng: -3.4581, ms: true,  waitrose: false, pret: true,  dogFriendly: false, notes: '' },
  // ── M6 ───────────────────────────────────────────────────────────────────
  { id: 'rugby',               name: 'Rugby',               road: 'M6',    operator: 'Welcome Break', lat: 52.3650, lng: -1.3572, ms: true,  waitrose: false, pret: true,  dogFriendly: false, notes: '' },
  { id: 'corley',              name: 'Corley',              road: 'M6',    operator: 'Welcome Break', lat: 52.4564, lng: -1.5647, ms: false, waitrose: true,  pret: false, dogFriendly: false, notes: '' },
  { id: 'hilton-park',         name: 'Hilton Park',         road: 'M6',    operator: 'Welcome Break', lat: 52.6156, lng: -2.0356, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: '' },
  { id: 'stafford',            name: 'Stafford',            road: 'M6',    operator: 'Welcome Break', lat: 52.8217, lng: -2.0453, ms: true,  waitrose: false, pret: true,  dogFriendly: true,  notes: 'Dog-friendly; M&S northbound only' },
  { id: 'keele',               name: 'Keele',               road: 'M6',    operator: 'Welcome Break', lat: 53.0164, lng: -2.2442, ms: false, waitrose: true,  pret: false, dogFriendly: false, notes: '' },
  { id: 'knutsford',           name: 'Knutsford',           road: 'M6',    operator: 'Extra',         lat: 53.3183, lng: -2.3789, ms: true,  waitrose: false, pret: true,  dogFriendly: false, notes: '' },
  { id: 'charnock-richard',    name: 'Charnock Richard',    road: 'M6',    operator: 'Welcome Break', lat: 53.6089, lng: -2.6661, ms: false, waitrose: true,  pret: false, dogFriendly: false, notes: '' },
  { id: 'lancaster',           name: 'Lancaster',           road: 'M6',    operator: 'Moto',          lat: 54.0614, lng: -2.7133, ms: true,  waitrose: false, pret: true,  dogFriendly: false, notes: '' },
  { id: 'tebay',               name: 'Tebay',               road: 'M6',    operator: 'Westmorland',   lat: 54.4439, lng: -2.5778, ms: false, waitrose: false, pret: false, dogFriendly: true,  notes: 'Famous farm shop; outstanding dog-friendly facilities' },
  { id: 'southwaite',          name: 'Southwaite',          road: 'M6',    operator: 'Welcome Break', lat: 54.7658, lng: -2.7633, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: '' },
  // ── M11 ──────────────────────────────────────────────────────────────────
  { id: 'birchanger-green',    name: 'Birchanger Green',    road: 'M11',   operator: 'Welcome Break', lat: 51.8739, lng: 0.1714,  ms: false, waitrose: true,  pret: true,  dogFriendly: false, notes: '' },
  // ── M18 ──────────────────────────────────────────────────────────────────
  { id: 'doncaster-north',     name: 'Doncaster North',     road: 'M18',   operator: 'Moto',          lat: 53.5678, lng: -1.0883, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: '' },
  // ── M20 ──────────────────────────────────────────────────────────────────
  { id: 'maidstone',           name: 'Maidstone',           road: 'M20',   operator: 'Roadchef',      lat: 51.2639, lng: 0.6119,  ms: false, waitrose: false, pret: false, dogFriendly: false, notes: '' },
  // ── M23 ──────────────────────────────────────────────────────────────────
  { id: 'pease-pottage',       name: 'Pease Pottage',       road: 'M23',   operator: 'Moto',          lat: 51.1083, lng: -0.1889, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: '' },
  // ── M25 ──────────────────────────────────────────────────────────────────
  { id: 'clacket-lane',        name: 'Clacket Lane',        road: 'M25',   operator: 'Moto',          lat: 51.2897, lng: 0.0269,  ms: false, waitrose: false, pret: false, dogFriendly: false, notes: '' },
  { id: 'cobham',              name: 'Cobham',              road: 'M25',   operator: 'Moto',          lat: 51.3414, lng: -0.3747, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: '' },
  { id: 'south-mimms',         name: 'South Mimms',         road: 'M25',   operator: 'Welcome Break', lat: 51.7017, lng: -0.2042, ms: false, waitrose: true,  pret: true,  dogFriendly: false, notes: '' },
  { id: 'thurrock',            name: 'Thurrock',            road: 'M25',   operator: 'Moto',          lat: 51.4833, lng: 0.3286,  ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: '' },
  // ── M27 ──────────────────────────────────────────────────────────────────
  { id: 'rownhams',            name: 'Rownhams',            road: 'M27',   operator: 'Moto',          lat: 50.9372, lng: -1.4333, ms: false, waitrose: false, pret: true,  dogFriendly: false, notes: 'Pret westbound only' },
  // ── M40 ──────────────────────────────────────────────────────────────────
  { id: 'beaconsfield',        name: 'Beaconsfield',        road: 'M40',   operator: 'Extra',         lat: 51.5689, lng: -0.6011, ms: true,  waitrose: false, pret: false, dogFriendly: true,  notes: 'Dog-friendly outdoor space' },
  { id: 'oxford',              name: 'Oxford',              road: 'M40',   operator: 'Welcome Break', lat: 51.7886, lng: -1.2242, ms: false, waitrose: true,  pret: true,  dogFriendly: false, notes: '' },
  { id: 'cherwell-valley',     name: 'Cherwell Valley',     road: 'M40',   operator: 'Moto',          lat: 51.9167, lng: -1.2653, ms: true,  waitrose: false, pret: true,  dogFriendly: false, notes: '' },
  { id: 'warwick',             name: 'Warwick',             road: 'M40',   operator: 'Welcome Break', lat: 52.2714, lng: -1.5708, ms: false, waitrose: true,  pret: true,  dogFriendly: false, notes: '' },
  // ── M42 ──────────────────────────────────────────────────────────────────
  { id: 'hopwood-park',        name: 'Hopwood Park',        road: 'M42',   operator: 'Welcome Break', lat: 52.3503, lng: -1.9222, ms: false, waitrose: true,  pret: false, dogFriendly: false, notes: '' },
  { id: 'tamworth',            name: 'Tamworth',            road: 'M42',   operator: 'Moto',          lat: 52.6253, lng: -1.6422, ms: true,  waitrose: false, pret: true,  dogFriendly: false, notes: '' },
  // ── M54 ──────────────────────────────────────────────────────────────────
  { id: 'telford',             name: 'Telford',             road: 'M54',   operator: 'Welcome Break', lat: 52.6822, lng: -2.4878, ms: false, waitrose: true,  pret: false, dogFriendly: false, notes: '' },
  // ── M56 ──────────────────────────────────────────────────────────────────
  { id: 'chester',             name: 'Chester',             road: 'M56',   operator: 'Roadchef',      lat: 53.2656, lng: -2.9014, ms: false, waitrose: false, pret: true,  dogFriendly: false, notes: '' },
  // ── M62 ──────────────────────────────────────────────────────────────────
  { id: 'burtonwood',          name: 'Burtonwood',          road: 'M62',   operator: 'Extra',         lat: 53.4214, lng: -2.6525, ms: false, waitrose: false, pret: false, dogFriendly: false, notes: '' },
  { id: 'birch',               name: 'Birch',               road: 'M62',   operator: 'Moto',          lat: 53.5614, lng: -2.1283, ms: true,  waitrose: false, pret: true,  dogFriendly: false, notes: 'Pret eastbound only' },
  { id: 'hartshead-moor',      name: 'Hartshead Moor',      road: 'M62',   operator: 'Welcome Break', lat: 53.7031, lng: -1.6894, ms: false, waitrose: true,  pret: false, dogFriendly: false, notes: 'Waitrose westbound only' },
  { id: 'ferrybridge',         name: 'Ferrybridge',         road: 'M62',   operator: 'Moto',          lat: 53.6906, lng: -1.3064, ms: true,  waitrose: false, pret: true,  dogFriendly: true,  notes: 'Dog-friendly outdoor space' },
  // ── A1(M) ─────────────────────────────────────────────────────────────────
  { id: 'baldock',             name: 'Baldock',             road: 'A1(M)', operator: 'Extra',         lat: 51.9819, lng: -0.1853, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: '' },
  { id: 'sawtry',              name: 'Sawtry',              road: 'A1(M)', operator: 'Moto',          lat: 52.4431, lng: -0.2675, ms: true,  waitrose: false, pret: true,  dogFriendly: false, notes: '' },
  { id: 'peterborough',        name: 'Peterborough',        road: 'A1(M)', operator: 'Extra',         lat: 52.5639, lng: -0.3622, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: '' },
  { id: 'blyth',               name: 'Blyth',               road: 'A1(M)', operator: 'Welcome Break', lat: 53.3789, lng: -1.0278, ms: true,  waitrose: false, pret: false, dogFriendly: false, notes: '' },
  { id: 'wetherby',            name: 'Wetherby',            road: 'A1(M)', operator: 'Welcome Break', lat: 53.9053, lng: -1.3861, ms: true,  waitrose: false, pret: true,  dogFriendly: false, notes: '' },
];
