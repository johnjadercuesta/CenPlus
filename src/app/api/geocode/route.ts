import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const barrio = searchParams.get("barrio") || "";
    const corregimiento = searchParams.get("corregimiento") || "";
    const vereda = searchParams.get("vereda") || "";

    if (!barrio && !corregimiento && !vereda) {
      return NextResponse.json(
        { error: "Se requiere al menos barrio, corregimiento o vereda" },
        { status: 400 }
      );
    }

    const parts = [vereda, barrio, corregimiento, "Colombia"]
      .filter(Boolean)
      .join(", ");

    const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
    nominatimUrl.searchParams.set("q", parts);
    nominatimUrl.searchParams.set("format", "jsonv2");
    nominatimUrl.searchParams.set("countrycodes", "co");
    nominatimUrl.searchParams.set("addressdetails", "1");
    nominatimUrl.searchParams.set("limit", "1");

    const response = await fetch(nominatimUrl.toString(), {
      headers: { "User-Agent": "CenPlus/1.0 (cenplus@proyecto.co)" },
    });

    if (!response.ok) {
      return NextResponse.json(
        { latitud: null, longitud: null, error: "Error en geocodificación" },
        { status: 200 }
      );
    }

    const results = await response.json();

    if (results.length === 0) {
      return NextResponse.json({
        latitud: null,
        longitud: null,
        display_name: null,
        message: "No se encontraron coordenadas",
      });
    }

    return NextResponse.json({
      latitud: parseFloat(results[0].lat),
      longitud: parseFloat(results[0].lon),
      display_name: results[0].display_name,
    });
  } catch (err) {
    return NextResponse.json(
      { latitud: null, longitud: null, error: "Error al geocodificar" },
      { status: 200 }
    );
  }
}
