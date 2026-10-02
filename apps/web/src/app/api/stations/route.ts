import { getStations } from "@/lib/stations-source";

export async function GET() {
  try {
    const data = await getStations();
    return Response.json(data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err) {
    console.error("stations: upstream failed", err);
    return Response.json({ error: "ดึงข้อมูลระดับน้ำไม่สำเร็จ กรุณาลองใหม่" }, { status: 502 });
  }
}
