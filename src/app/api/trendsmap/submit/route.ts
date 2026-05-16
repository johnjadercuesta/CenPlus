import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { insertEntry } from "@/lib/trendsmap";
import { reverseGeocode } from "@/lib/reverseGeocode";
import { extractPlaceAndMentions } from "@/lib/placeExtractor";

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const { text, hashtags, latitude, longitude } = body;

    if (!text || !latitude || !longitude) {
      return NextResponse.json({ error: "Texto, latitud y longitud son requeridos" }, { status: 400 });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: "Coordenadas invÃ¡lidas" }, { status: 400 });
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
    });

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
  const matches = text.match(/#[\wÃ¡Ã©Ã­Ã³ÃºÃÃ‰ÃÃ“ÃšÃ±Ã‘]+/g);
  return matches ? matches.map(h => h.toLowerCase()) : [];
}
