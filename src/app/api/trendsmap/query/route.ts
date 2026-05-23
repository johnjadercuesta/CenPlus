import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";
import { getEntriesByRadius } from "@/lib/trendsmap";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const tenant = token.tenant || getTenantFromRequest(request);

    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || "0");
    const radiusKm = Math.min(parseInt(searchParams.get("radius") || "50"), 200);
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: "Coordenadas requeridas" }, { status: 400 });
    }

    const entries = await getEntriesByRadius(lat, lng, radiusKm, limit, tenant);
    console.log("[API] Query returned:", entries.length, "entries");

    return NextResponse.json({
      success: true,
      count: entries.length,
      entries: entries.map(e => ({
        id: e.id,
        text: e.text,
        hashtags: e.hashtags,
        departamento: e.departamento,
        municipio: e.municipio,
        latitude: e.latitude,
        longitude: e.longitude,
        distance_km: Math.round(parseFloat(e.distance_km) * 10) / 10,
        created_at: e.created_at,
      })),
    });
  } catch (error: any) {
    console.error("[API] Error in query:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
