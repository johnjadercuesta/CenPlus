import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const data = db
      .prepare("SELECT latitud, longitud, es_lider FROM ciudadanos WHERE latitud IS NOT NULL AND longitud IS NOT NULL")
      .all() as { latitud: number; longitud: number; es_lider: number }[];

    const mapped = data.map((c) => ({
      latitud: c.latitud,
      longitud: c.longitud,
      es_lider: c.es_lider === 1,
    }));

    const response = NextResponse.json({ data: mapped, count: mapped.length });
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
