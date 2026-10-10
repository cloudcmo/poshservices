# Posh Services

Find the good motorway services on your journey: farm shops, Waitrose, M&S, Pret, and somewhere green to walk the dog, timed for when you'll want a break.

Runs as a single Cloudflare Worker. No API keys needed.

## How it works

- **Places**: [postcodes.io](https://postcodes.io) (free, UK postcodes and place names)
- **Routing**: [OSRM](https://project-osrm.org/) public server, OpenStreetMap data. Responses are cached at Cloudflare for a week. To use a different OSRM server, set an `OSRM_URL` variable on the Worker.
- **Map**: MapLibre with [OpenFreeMap](https://openfreemap.org) tiles (free, no key)
- **Services data**: `src/services.json`, 103 service areas, built from the research files in `data/research/` by `npm run data`

The Worker works out which services your route actually passes (on the road you are driving, not a parallel one), which side of a split site you would use, and when you would get there. The page then picks stops at your chosen interval, preferring the poshest within each window.

## Files

| Path | What it is |
| --- | --- |
| `src/worker.js` | API (`/api/suggest`, `/api/plan`, `/api/services`) and page routing |
| `src/match.js` | Route matching, side of the road, posh score |
| `src/pages.js` | `/services` list and `/services/<id>` pages |
| `src/services.json` | The dataset (generated, don't hand edit) |
| `data/research/*.json` | Source research per region. Edit these, then `npm run data` |
| `public/` | The planner page, script and styles |
| `scripts/test-match.mjs` | Offline checks of the matching logic (`npm test`) |
| `public/nearby-data.json` | "Off the motorway nearby" pubs, cafés and fuel per services (generated) |
| `scripts/fetch-nearby.mjs` | Refreshes that file from OpenStreetMap (`npm run nearby`, 10 to 20 minutes) |

## Updating a service area

1. Edit the entry in the right `data/research/part-N.json` file
2. `npm run data`
3. `npm test`
4. Deploy

## Commands

```
npm install        # once
npm run dev        # run locally at http://localhost:8787
npm test           # check the matching logic
npm run nearby     # refresh the off-motorway pubs, cafés and fuel (a couple of times a year)
npm run deploy     # publish to Cloudflare
```

Future ideas and feedback are tracked in `IDEAS.md`.

The previous Netlify version is kept on the `legacy-netlify` branch.
