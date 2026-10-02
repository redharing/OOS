import { describe, expect, it } from "vitest";
import { classify, nearestStation, normalize, summarize } from "./stations";

const sample = {
  latest: "2026-10-01 22:35:00",
  stale: false,
  stations: [
    { id: 265, name: "ค.กระเฉด", river: "คลองกระเฉด", lat: 13.85826, lng: 100.62848, wl: -0.75, bank: 0.2, crit: -0.2, trend: "flat", measured_at: "2026-10-01 22:35:00" },
    { id: 138, name: "ค.กะจะ ถ.พระราม 9", river: "คลองกะจะ", lat: 13.74381, lng: 100.61168, wl: 0.3, bank: 2, crit: 0.1, trend: "up", measured_at: "2026-10-01 22:35:00" },
    { id: 7, name: "offline", lat: 13.7, lng: 100.5, wl: null, bank: 1, crit: 0.5, trend: null },
    { id: "bad", name: 1 },
  ],
};

describe("classify", () => {
  it("ranks overflow above alert", () => {
    expect(classify(1.2, 1.0, 0.5)).toBe("overflow");
    expect(classify(1.0, 1.0, 0.5)).toBe("overflow");
    expect(classify(0.6, 1.0, 0.5)).toBe("watch");
    expect(classify(0.1, 1.0, 0.5)).toBe("normal");
  });
  it("treats missing level as offline and missing thresholds as normal", () => {
    expect(classify(null, 1, 0.5)).toBe("offline");
    expect(classify(3, null, null)).toBe("normal");
  });
});

describe("normalize", () => {
  const payload = normalize(sample, new Date("2026-10-02T00:00:00Z"));

  it("keeps valid stations and drops malformed rows", () => {
    expect(payload.stations.map((s) => s.id)).toEqual([265, 138, 7]);
  });

  it("maps fields and status", () => {
    const [kachet, kaja, offline] = payload.stations;
    expect(kachet).toMatchObject({ level: -0.75, bank: 0.2, alert: -0.2, status: "normal", trend: "flat" });
    expect(kaja.status).toBe("watch");
    expect(offline).toMatchObject({ status: "offline", river: null, measuredAt: null });
    expect(payload.attribution).toContain("POPNIX");
  });

  it("summarizes and finds nearest online station", () => {
    expect(summarize(payload.stations)).toEqual({ overflow: 0, watch: 1, normal: 1, offline: 1 });
    // Near Rama 9; the offline station at 13.7,100.5 must be skipped.
    expect(nearestStation(payload.stations, 13.745, 100.61)?.station.id).toBe(138);
    expect(nearestStation(payload.stations, 13.7, 100.5)?.station.id).not.toBe(7);
  });
});
