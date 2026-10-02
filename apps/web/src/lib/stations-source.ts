import "server-only";
import { normalize, POPNIX_OVERVIEW_URL, type StationsPayload } from "./stations";

// POPNIX updates every 5–20 minutes and allows 30 requests/min per IP,
// so every client reads through this cache instead of calling POPNIX directly.
const TTL_MS = 5 * 60 * 1000;

let cached: { payload: StationsPayload; at: number } | null = null;
let inflight: Promise<StationsPayload> | null = null;

// Override to point at a mirror or a local fixture during development.
const SOURCE_URL = process.env.STATIONS_SOURCE_URL ?? POPNIX_OVERVIEW_URL;

async function fetchUpstream(): Promise<StationsPayload> {
  const res = await fetch(SOURCE_URL, {
    headers: { "User-Agent": "OOS Our Oasis (+https://github.com/redharing/OOS)" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`POPNIX responded ${res.status}`);
  return normalize(await res.json(), new Date());
}

export type StationsResult = StationsPayload & { servedStale: boolean };

export async function getStations(): Promise<StationsResult> {
  if (cached && Date.now() - cached.at < TTL_MS) {
    return { ...cached.payload, servedStale: false };
  }
  inflight ??= fetchUpstream().finally(() => {
    inflight = null;
  });
  try {
    const payload = await inflight;
    cached = { payload, at: Date.now() };
    return { ...payload, servedStale: false };
  } catch (err) {
    // Keep the map useful during an upstream outage: serve the last good data, flagged.
    if (cached) return { ...cached.payload, servedStale: true };
    throw err;
  }
}
