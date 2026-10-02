# OOS · Our Oasis

แพลตฟอร์มติดตามและจำลองภัยพิบัติในประเทศไทย ให้ผู้เดือดร้อนขอความช่วยเหลือได้ด้วยการแตะไม่กี่ครั้ง และจับคู่กับผู้ที่พร้อมช่วยเหลือ

A mobile-first platform for monitoring and simulating disasters in Thailand, with tap-only help requests matched to people who can help.

## Layout

| Path | What it is |
| --- | --- |
| `apps/web` | Next.js PWA: the mobile app and its API routes |

Planned (see the design canvas): PostgreSQL + PostGIS for requests and matching, Redis for caching and queues, and a Python service for flood simulation.

## Run the web app

```sh
cd apps/web
npm install
npm run dev     # http://localhost:3000
npm test        # unit tests
```

Environment variables (all optional):

| Name | Purpose |
| --- | --- |
| `STATIONS_SOURCE_URL` | Override the canal water-level source (default: POPNIX Flood overview API), e.g. a local fixture |
| `NEXT_PUBLIC_MAP_STYLE_URL` | MapLibre base map style (default: OpenFreeMap Positron, no key needed) |

## Data credits

Bangkok canal water levels: Drainage and Sewerage Department, Bangkok Metropolitan Administration, via [POPNIX Flood](https://flood.pop.in.th/api/). This is not an official warning source; the app says so wherever the data appears.
