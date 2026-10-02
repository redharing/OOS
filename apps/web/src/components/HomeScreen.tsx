"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { nearestStation, summarize, type Station, type StationStatus } from "@/lib/stations";
import type { StationsResult } from "@/lib/stations-source";
import { AlertIcon, HeartIcon, LocateIcon, PinIcon, WaveIcon } from "./icons";
import BottomNav from "./BottomNav";
import styles from "./HomeScreen.module.css";

const StationMap = dynamic(() => import("./StationMap"), { ssr: false });

const REFRESH_MS = 5 * 60 * 1000;

const STATUS_LABEL: Record<StationStatus, string> = {
  overflow: "ล้นตลิ่ง",
  watch: "เฝ้าระวัง",
  normal: "ปกติ",
  offline: "ไม่มีข้อมูล",
};

const TREND_LABEL = { up: "น้ำกำลังขึ้น", down: "น้ำกำลังลด", flat: "น้ำคงที่" } as const;

type Load = { state: "loading" } | { state: "error" } | { state: "ready"; data: StationsResult };
type Locate = { state: "idle" | "asking" | "denied" } | { state: "ok"; lat: number; lng: number };

function timeOf(thaiLocal: string | null) {
  return thaiLocal ? thaiLocal.slice(11, 16) : "–";
}

function fmtLevel(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)} ม.`;
}

export default function HomeScreen() {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [locate, setLocate] = useState<Locate>({ state: "idle" });
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/stations");
      if (!res.ok) throw new Error(String(res.status));
      setLoad({ state: "ready", data: await res.json() });
    } catch {
      setLoad((prev) => (prev.state === "ready" ? prev : { state: "error" }));
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const timer = setInterval(refresh, REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refresh]);

  const askLocation = () => {
    if (!("geolocation" in navigator)) return setLocate({ state: "denied" });
    setLocate({ state: "asking" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSelectedId(null);
        setLocate({ state: "ok", lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setLocate({ state: "denied" }),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const data = load.state === "ready" ? load.data : null;
  const stations = useMemo(() => data?.stations ?? [], [data]);
  const counts = useMemo(() => summarize(stations), [stations]);
  const user = useMemo(() => (locate.state === "ok" ? { lat: locate.lat, lng: locate.lng } : null), [locate]);

  const focus = useMemo((): { station: Station; km: number | null } | null => {
    const picked = stations.find((s) => s.id === selectedId);
    if (picked) return { station: picked, km: null };
    if (user) return nearestStation(stations, user.lat, user.lng);
    return null;
  }, [stations, selectedId, user]);

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.logo}>OOS</div>
        <button type="button" className={styles.place} onClick={askLocation} aria-label="ใช้ตำแหน่งของฉัน">
          <PinIcon size={18} />
          <span>{user ? "ตำแหน่งของคุณ" : "กรุงเทพมหานคร"}</span>
        </button>
      </header>

      <div className={styles.mapWrap}>
        {data && <StationMap stations={stations} user={user} onSelect={setSelectedId} />}
        <div className={styles.legend} aria-label="สัญลักษณ์">
          {(["overflow", "watch", "normal"] as const).map((s) => (
            <span key={s} className={styles.legendItem}>
              <span className={styles.dot} data-status={s} />
              {STATUS_LABEL[s]}
            </span>
          ))}
        </div>
        <button type="button" className={styles.locate} onClick={askLocation} aria-label="ไปที่ตำแหน่งของฉัน">
          <LocateIcon size={20} />
        </button>
      </div>

      <section className={styles.card} aria-live="polite">
        {load.state === "loading" && <p className={styles.muted}>กำลังโหลดระดับน้ำ…</p>}
        {load.state === "error" && (
          <>
            <p className={styles.headline}>ดึงข้อมูลระดับน้ำไม่สำเร็จ</p>
            <button type="button" className={styles.linkButton} onClick={refresh}>ลองใหม่</button>
          </>
        )}
        {data && focus && <StationCard station={focus.station} km={focus.km} />}
        {data && !focus && (
          <>
            <div className={styles.row}>
              <span className={styles.pill} data-status={counts.overflow > 0 ? "overflow" : counts.watch > 0 ? "watch" : "normal"}>
                คลองทั่วกรุงเทพฯ
              </span>
              <button type="button" className={styles.linkButton} onClick={askLocation}>
                {locate.state === "asking" ? "กำลังหาตำแหน่ง…" : "ดูคลองใกล้ฉัน"}
              </button>
            </div>
            <p className={styles.headline}>
              ล้นตลิ่ง {counts.overflow} จุด · เฝ้าระวัง {counts.watch} จุด
            </p>
            <p className={styles.muted}>
              ปกติ {counts.normal} จุด · ไม่มีข้อมูล {counts.offline} จุด
              {locate.state === "denied" && " · เปิดสิทธิ์ตำแหน่งเพื่อดูคลองใกล้คุณ"}
            </p>
          </>
        )}
        {data && (
          <p className={styles.source}>
            {data.attribution} · อัปเดต {timeOf(data.latest)}
            {(data.servedStale || data.upstreamStale) && " · ข้อมูลอาจไม่เป็นปัจจุบัน"} · ไม่ใช่ประกาศเตือนภัยทางการ
          </p>
        )}
      </section>

      <div className={styles.actions}>
        <Link href="/sos" className={styles.sos}>
          <AlertIcon size={26} />
          ขอความช่วยเหลือ
        </Link>
        <div className={styles.actionGrid}>
          <Link href="/report" className={styles.secondary}>
            <WaveIcon size={22} />
            รายงานน้ำ
          </Link>
          <Link href="/help" className={styles.primary}>
            <HeartIcon size={22} />
            ฉันอยากช่วย
          </Link>
        </div>
      </div>

      <BottomNav current="/" />
    </div>
  );
}

function StationCard({ station, km }: { station: Station; km: number | null }) {
  const gap = station.level != null && station.bank != null ? station.bank - station.level : null;
  return (
    <>
      <div className={styles.row}>
        <span className={styles.pill} data-status={station.status}>{STATUS_LABEL[station.status]}</span>
        <span className={styles.muted}>{km != null ? `คลองใกล้คุณ · ${km.toFixed(1)} กม.` : "จุดที่เลือก"}</span>
      </div>
      <p className={styles.headline}>{station.name}</p>
      <p className={styles.muted}>
        {station.level != null ? `ระดับน้ำ ${fmtLevel(station.level)} รทก.` : "ไม่มีข้อมูลระดับน้ำ"}
        {gap != null && (gap > 0 ? ` · ต่ำกว่าตลิ่ง ${gap.toFixed(2)} ม.` : ` · สูงกว่าตลิ่ง ${(-gap).toFixed(2)} ม.`)}
        {station.trend && ` · ${TREND_LABEL[station.trend]}`}
      </p>
    </>
  );
}
