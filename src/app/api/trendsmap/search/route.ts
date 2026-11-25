import { NextRequest, NextResponse } from "next/server";
import { requireAnyModule } from "@/lib/auth";
import { searchEntries } from "@/lib/trendsmap.search";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAnyModule(request, ["inteligencia", "mapa", "dashboard"]);
    if (auth.error) return auth.error;
    const tenant = auth.user.tenant;

    const body = await request.json();
    const { q, hashtags, lat, lng, radiusKm, days, limit } = body || {};

    const results = await searchEntries({
      q: q || undefined,
      hashtags: Array.isArray(hashtags) ? hashtags : undefined,
      lat: typeof lat === "number" ? lat : undefined,
      lng: typeof lng === "number" ? lng : undefined,
      radiusKm: typeof radiusKm === "number" ? radiusKm : undefined,
      days: typeof days === "number" ? days : undefined,
      limit: typeof limit === "number" ? limit : undefined,
    }, tenant);

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("[trendsmap/search] Error:", error);
    return NextResponse.json({ error: "Error interno al buscar" }, { status: 500 });
  }
}
