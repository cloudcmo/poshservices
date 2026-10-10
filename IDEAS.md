# Posh Services: future ideas

A running list of ideas and feedback, so we can pick them up when we're ready. Newest thinking at the top of each section. Effort is a rough guide: **S** an hour or two, **M** half a day, **L** a day or more.

Status: 💡 idea · 🔜 next up · 🚧 in progress · ✅ done

---

## Recommended next

| Idea | Why | Effort | Status |
| --- | --- | --- | --- |
| "More" brand filters (Leon and friends) | Cheap win, data already there | S | 💡 |
| Suggest a fix / suggest a place button | Keeps the data honest as people use it | M | 💡 |
| Research pass on non-food facilities | Unlocks the most useful practical filters | M | 💡 |

---

## Filters and facilities

### "More" brand filters (feedback, Oct 2026)
Keep the four main chips (Farm shop, Waitrose, M&S, Pret) and add a small **More** link that reveals the next tier of better food. Same "any of these" logic, so nothing changes for people who never open it.

What the dataset already supports (number of services with it):
- **Leon** (10): the obvious one, healthy fast food
- **Coco di Mama** (5): decent Italian coffee and pasta
- **Cornish Bakery** (4): proper bakery
- **PizzaExpress** (3), **Nando's** (3), **Wagamama** (1): sit-down meals, useful for a longer stop
- **Chaiiwala** (6): good chai and Indian street food, divides opinion on "posh"

Thought: rather than a long row of brand chips, group them as **Healthy and quick** (Leon, Cornish Bakery, Coco di Mama) and **Proper sit-down meal** (PizzaExpress, Nando's, Wagamama). Two extra chips instead of six. Effort **S**.

### Practical facilities people would filter on
These matter to real journeys but aren't captured as structured data yet. The research notes mention some of them (hotels in about 50 sites, picnic areas about 40, play areas about 20, Tesla chargers about 6), but not reliably or by side. Needs a research pass like the original one. Candidates, in rough order of usefulness:
- **Changing Places toilet** (full accessible toilet with hoist and bench): genuinely important for some families, and there's an official register to check against
- **Ultra-rapid / Tesla chargers**: more useful than the current yes/no "EV charging"
- **Children's play area**
- **Picnic area**
- **Showers** (long-distance drivers)
- **Hotel on site** (for breaking a very long trip)

Thought: these would live under the same **More** link, in a second "Must have" group, so the main form stays four chips plus two. Effort **M** (mostly research).

### Suggest a brand / suggest a fix button
A small "Suggest something" link on each services page and at the foot of the planner. Opens a short form: which services, what's wrong or missing, optional email. Stored in Cloudflare (D1 or KV, free tier) for you to review, then applied with `npm run data`. Could also accept "suggest a brand to add to the filters". Effort **M**.

---

## Off the motorway

### ✅ Nearest pubs, cafés and fuel near the exit (Oct 2026)
Built: "Off the motorway nearby" under each stop. Two nearest independent pubs or cafés and the nearest petrol station within 5 minutes of the nearest junction. Free OpenStreetMap data, not rated.

### Ratings for off-motorway places
Free data says what's there, not what's good. Options when ready:
- **Google ratings**: best signal, needs a Google key and billing (free allowance, then a small charge per lookup). Parked: not wanted for now.
- **Curated favourites**: you and friends add places you rate, shown with a star. Fits the "posh" idea best. Builds on the suggest button above.

### Fuel prices
UK fuel price data has been opening up (the government's Fuel Finder scheme). If a free feed is available, show today's price at the nearest station versus the services price. Needs checking before building. Effort **M**.

### Turn the "Off the motorway" idea into its own mode
Your friend's point: some people never stop at services at all. If the nearby feature gets used, consider a "Where to stop: Services / Off the motorway / Either" choice. Held back for now to keep the interface simple.

---

## Data quality

- **Per-side coordinates** for split sites: most sides currently share one point. Better coordinates make the Google Maps hand-off land on the right carriageway. Effort **M**.
- **Dog walking detail**: only a handful of sites explicitly mention a dog area. A focused research pass would make the dog filter much stronger. Effort **M**.
- **Which side brands are on**: some split sites list brands without saying which side. The app flags this, but filling it in would help. Effort **M**.
- **Annual refresh**: services change operators and brands often. A yearly re-check of all 103, same method as the original research. Effort **L**.

---

## Sharing and reach

- **Nice link previews**: a picture card when a plan or services page is shared in WhatsApp or iMessage. Effort **S**.
- **Popular routes pages**, e.g. "London to Cornwall: where to stop". Good for search and for sharing. Effort **M**.
- **Add to home screen** (installable web app) so it feels like an app on a phone. Effort **S**.

---

## Infrastructure

- **Routing server**: currently the free public OSRM demo server, cached for a week. Fine for friends and family. If traffic grows, switch to a hosted or self-hosted routing server with the `OSRM_URL` setting. Effort **S** to switch, cost depends on choice.
- **Place lookups (Overpass)**: also a free public service, cached for 30 days per stop. Same "switch if it grows" note.
