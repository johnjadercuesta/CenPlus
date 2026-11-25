import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { insertEntry } from "@/lib/trendsmap";
import { reverseGeocode } from "@/lib/reverseGeocode";
import { extractPlaceAndMentions } from "@/lib/placeExtractor";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ["administrador", "estratega"]);
    if (auth.error) return auth.error;
    const tenant = auth.user.tenant;

    const body = await request.json();
    const { text, hashtags, latitude, longitude } = body;

    if (!text || !latitude || !longitude) {
      return NextResponse.json({ error: "Texto, latitud y longitud son requeridos" }, { status: 400 });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: "Coordenadas inválidas" }, { status: 400 });
    }

    const geo = await reverseGeocode(latitude, longitude);
    const parsedHashtags = hashtags || extractHashtags(text);

    const place = await extractPlaceAndMentions(text, latitude, longitude);

    const entry = await insertEntry({
      text: text.substring(0, 500),
      hashtags: parsedHashtags.slice(0, 20),
      latitude,
      longitude,
      pais: place.pais || geo.pais,
      departamento: place.departamento || geo.departamento || undefined,
      municipio: place.municipio || geo.municipio || undefined,
      barrio: place.barrio || null,
      comuna: place.comuna || null,
      mentioned_profiles: place.mentioned_profiles || [],
      mentioned_sites: place.mentioned_sites || [],
    }, tenant);

    return NextResponse.json({
      success: true,
      entry: {
        id: entry.id,
        text: entry.text,
        hashtags: entry.hashtags,
        departamento: entry.departamento,
        municipio: entry.municipio,
        created_at: entry.created_at,
      },
      geo,
    });
  } catch (error: any) {
    console.error("[trendsmap/submit] Error:", error);
    return NextResponse.json({ error: "Error interno al guardar entrada" }, { status: 500 });
  }
}

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\wáéíóúÁÉÍÓÚñÑ]+/g);
  return matches ? matches.map(h => h.toLowerCase()) : [];
}
