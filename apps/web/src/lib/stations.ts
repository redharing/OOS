import { z } from "zod";

// Canal water levels for Bangkok, from POPNIX Flood (https://flood.pop.in.th/api/).
// Upstream data: Drainage and Sewerage Department, BMA. Terms: free with credit,
// 30 requests/min per IP, not an official warning source, so the server caches it.

export const POPNIX_OVERVIEW_URL = "https://flood.pop.in.th/api_overview.php";
export const ATTRIBUTION =
  "ข้อมูล: สำนักการระบายน้ำ กรุงเทพมหานคร ผ่าน POPNIX Flood (flood.pop.in.th)";

const rawStation = z.object({
  id: z.number(),
  name: z.string(),
  river: z.string().nullish(),
  lat: z.number(),
  lng: z.number(),
  wl: z.number().nullish(), // water level, metres above mean sea level
  bank: z.number().nullish(), // bank height, metres MSL
  crit: z.number().nullish(), // alert level, metres MSL
  trend: z.enum(["up", "down", "flat"]).nullish(),
  measured_at: z.string().nullish(), // Thai local time "YYYY-MM-DD HH:MM:SS"
});

const rawOverview = z.object({
  stations: z.array(z.unknown()),
  latest: z.string().nullish(),
  stale: z.boolean().nullish(),
});

export type StationStatus = "overflow" | "watch" | "normal" | "offline";
export type Trend = "up" | "down" | "flat" | null;

export type Station = {
  id: number;
  name: string;
  river: string | null;
  lat: number;
  lng: number;
  level: number | null;
  bank: number | null;
  alert: number | null;
  trend: Trend;
  measuredAt: string | null;
  status: StationStatus;
};

export type StationsPayload = {
  stations: Station[];
  latest: string | null;
  upstreamStale: boolean;
  fetchedAt: string;
  attribution: string;
};

export function classify(level: number | null, bank: number | null, alert: number | null): StationStatus {
  if (level == null) return "offline";
  if (bank != null && level >= bank) return "overflow";
  if (alert != null && level >= alert) return "watch";
  return "normal";
}

export function normalize(json: unknown, fetchedAt: Date): StationsPayload {
  const overview = rawOverview.parse(json);
  const stations: Station[] = [];
  // Skip malformed rows instead of failing the whole map.
  for (const item of overview.stations) {
    const parsed = rawStation.safeParse(item);
    if (!parsed.success) continue;
    const s = parsed.data;
    const level = s.wl ?? null;
    const bank = s.bank ?? null;
    const alert = s.crit ?? null;
    stations.push({
      id: s.id,
      name: s.name,
      river: s.river ?? null,
      lat: s.lat,
      lng: s.lng,
      level,
      bank,
      alert,
      trend: s.trend ?? null,
      measuredAt: s.measured_at ?? null,
      status: classify(level, bank, alert),
    });
  }
  return {
    stations,
    latest: overview.latest ?? null,
    upstreamStale: overview.stale ?? false,
    fetchedAt: fetchedAt.toISOString(),
    attribution: ATTRIBUTION,
  };
}

export function summarize(stations: Station[]): Record<StationStatus, number> {
  const counts: Record<StationStatus, number> = { overflow: 0, watch: 0, normal: 0, offline: 0 };
  for (const s of stations) counts[s.status]++;
  return counts;
}

// Great-circle distance in km.
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function nearestStation(stations: Station[], lat: number, lng: number): { station: Station; km: number } | null {
  let best: { station: Station; km: number } | null = null;
  for (const station of stations) {
    if (station.status === "offline") continue;
    const km = distanceKm(lat, lng, station.lat, station.lng);
    if (!best || km < best.km) best = { station, km };
  }
  return best;
}
