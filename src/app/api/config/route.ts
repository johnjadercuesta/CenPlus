import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, requireModule } from "@/lib/auth";
import { queryWithTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { rows } = await queryWithTenant(user.tenant, "SELECT clave, valor FROM config");
    const config: Record<string, string> = {};
    for (const r of rows) {
      config[r.clave] = r.valor;
    }

    return NextResponse.json({ config });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireModule(request, "configuracion");
    if (auth.error) return auth.error;
    const user = auth.user;

    const body = await request.json();

    for (const [clave, valor] of Object.entries(body)) {
      await queryWithTenant(
        user.tenant,
        "INSERT INTO config (clave, valor) VALUES ($1, $2) ON CONFLICT (clave) DO UPDATE SET valor = $2",
        [clave, String(valor)]
      );
    }

    return NextResponse.json({ message: "Configuracion actualizada correctamente" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
