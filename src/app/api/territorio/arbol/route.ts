import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, tokenMatchesTenant } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!tokenMatchesTenant(token, request)) {
      return NextResponse.json({ error: "Acceso no autorizado para esta organización" }, { status: 403 });
    }

    const tenant = getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const zona = searchParams.get("zona");

    let query = "SELECT id, nombre, tipo, zona, padre_id, codigo_divipola FROM division_territorial WHERE activo = 1";
    const params: any[] = [];
    if (zona) {
      query += " AND zona = $1";
      params.push(zona);
    }
    query += " ORDER BY tipo, nombre ASC";

    const { rows } = await queryWithTenant(tenant, query, params);

    // Construcción del árbol jerárquico recursivo
    const mapa = new Map<number, any>();
    const raices: any[] = [];

    rows.forEach((item: any) => {
      mapa.set(item.id, { ...item, hijos: [] });
    });

    rows.forEach((item: any) => {
      if (item.padre_id && mapa.has(item.padre_id)) {
        mapa.get(item.padre_id).hijos.push(mapa.get(item.id));
      } else {
        raices.push(mapa.get(item.id));
      }
    });

    return NextResponse.json({ data: raices });
  } catch (err: any) {
    console.error("[territorio/arbol GET] Error:", err.message);
    return NextResponse.json({ error: "Error interno: " + err.message }, { status: 500 });
  }
}
