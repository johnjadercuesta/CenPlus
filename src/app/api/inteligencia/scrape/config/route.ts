import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { queryWithTenant } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ["administrador", "estratega"]);
    if (auth.error) return auth.error;
    const tenant = auth.user.tenant;

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
