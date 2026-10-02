"use client";

import { useEffect, useRef } from "react";
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent } from "maplibre-gl";
import type { Station } from "@/lib/stations";

// Keyless vector base map; swap for self-hosted PMTiles via env when we host our own.
const STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/positron";
const BANGKOK: [number, number] = [100.55, 13.76];

// Used when the base map cannot load (offline, tile host down) so stations still show.
const FALLBACK_STYLE = {
  version: 8 as const,
  sources: {},
  layers: [{ id: "background", type: "background" as const, paint: { "background-color": "#e4ebe7" } }],
};

type Props = {
  stations: Station[];
  user: { lat: number; lng: number } | null;
  onSelect: (id: number) => void;
};

function toGeoJSON(stations: Station[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: stations.map((s) => ({
      type: "Feature",
      id: s.id,
      geometry: { type: "Point", coordinates: [s.lng, s.lat] },
      properties: { id: s.id, status: s.status },
    })),
  };
}

export default function StationMap({ stations, user, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const loaded = useRef(false);
  const latest = useRef({ stations, user, onSelect });
  useEffect(() => {
    latest.current = { stations, user, onSelect };
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibregl = await import("maplibre-gl");
      if (cancelled || !container.current) return;
      maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const css = getComputedStyle(document.documentElement);
      const color = (name: string) => css.getPropertyValue(name).trim();

      const m = new maplibregl.Map({
        container: container.current,
        style: STYLE_URL,
        center: BANGKOK,
        zoom: 10.3,
        attributionControl: false,
      });
      // Base-map credit only; the station data credit is shown in the status card.
      // Top-right keeps it clear of the legend and of the card overlapping the map's bottom edge.
      m.addControl(new maplibregl.AttributionControl({ compact: true }), "top-right");
      map.current = m;

      let usingFallback = false;
      m.on("error", () => {
        if (loaded.current || usingFallback) return;
        usingFallback = true;
        m.setStyle(FALLBACK_STYLE);
      });

      m.on("style.load", () => {
        if (m.getSource("stations")) return;
        m.addSource("stations", { type: "geojson", data: toGeoJSON(latest.current.stations) });
        m.addLayer({
          id: "stations",
          type: "circle",
          source: "stations",
          // Draw the worst stations on top.
          layout: {
            "circle-sort-key": ["match", ["get", "status"], "overflow", 3, "watch", 2, "normal", 1, 0],
          },
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 4, 14, 9],
            "circle-color": [
              "match",
              ["get", "status"],
              "overflow", color("--st-overflow"),
              "watch", color("--st-watch"),
              "offline", color("--st-offline"),
              color("--st-normal"),
            ],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          },
        });
        m.addSource("user", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addLayer({
          id: "user",
          type: "circle",
          source: "user",
          paint: {
            "circle-radius": 8,
            "circle-color": color("--water"),
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 3,
          },
        });
        m.on("click", "stations", (e: MapLayerMouseEvent) => {
          const id = e.features?.[0]?.properties?.id;
          if (typeof id === "number") latest.current.onSelect(id);
        });
        m.on("mouseenter", "stations", () => (m.getCanvas().style.cursor = "pointer"));
        m.on("mouseleave", "stations", () => (m.getCanvas().style.cursor = ""));
        loaded.current = true;
        syncUser(m, latest.current.user);
      });
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      loaded.current = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded.current || !map.current) return;
    (map.current.getSource("stations") as GeoJSONSource | undefined)?.setData(toGeoJSON(stations));
  }, [stations]);

  useEffect(() => {
    if (!loaded.current || !map.current || !user) return;
    syncUser(map.current, user);
    map.current.easeTo({ center: [user.lng, user.lat], zoom: 13 });
  }, [user]);

  return <div ref={container} style={{ position: "absolute", inset: 0 }} role="region" aria-label="แผนที่ระดับน้ำคลองในกรุงเทพฯ" />;
}

function syncUser(m: MapLibreMap, user: Props["user"]) {
  (m.getSource("user") as GeoJSONSource | undefined)?.setData({
    type: "FeatureCollection",
    features: user ? [{ type: "Feature", geometry: { type: "Point", coordinates: [user.lng, user.lat] }, properties: {} }] : [],
  });
}
