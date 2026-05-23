import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";
import { getHotspots } from "@/lib/trendsmap";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const tenant = token.tenant || getTenantFromRequest(request);

    const { searchParams } = new URL(request.url);
    const hours = Math.min(parseInt(searchParams.get("hours") || "24"), 168);
    const minEntries = Math.min(parseInt(searchParams.get("min") || "2"), 50);

    const hotspots = await getHotspots(hours, minEntries, tenant);

    return NextResponse.json({
      success: true,
      hours,
      count: hotspots.length,
      hotspots: hotspots.map(h => ({
        departamento: h.departamento,
        municipio: h.municipio,
        entryCount: parseInt(h.entry_count),
        recentTexts: h.recent_texts || [],
        topHashtags: [...new Set((h.top_hashtags || []).flat())].slice(0, 10),
        centerLat: parseFloat(h.center_lat),
        centerLng: parseFloat(h.center_lng),
        latest: h.latest,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
