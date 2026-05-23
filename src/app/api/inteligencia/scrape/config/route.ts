import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const tenant = token.tenant || getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json({ error: "No se pudo detectar la organizacion" }, { status: 400 });
    }

    const config = await request.json();

    await queryWithTenant(tenant, `
      INSERT INTO config (clave, valor) 
      VALUES ('inteligencia_api_config', $1)
      ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor
    `, [JSON.stringify(config)]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[inteligencia/scrape/config] Error:", err);
    return NextResponse.json(
      { error: "Error al guardar configuración" },
      { status: 500 }
    );
  }
}
