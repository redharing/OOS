# OOS web app

Next.js PWA for OOS. See the repository README for how to run it.

- `src/lib/stations.ts`: parse and classify canal water levels (unit-tested in `stations.test.ts`)
- `src/lib/stations-source.ts`: server-side fetch with a 5-minute cache, serving the last good data if the source is down
- `src/app/api/stations/route.ts`: `GET /api/stations` for the app
- `src/components/HomeScreen.tsx`: home screen (map, status card, actions)
- `scripts/copy-maplibre-worker.mjs`: copies MapLibre's web worker into `public/` before dev and build
