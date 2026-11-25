import { NextRequest, NextResponse } from "next/server";
import { requireDiaDLevel } from "@/lib/auth";
import { queryWithTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireDiaDLevel(request, "coordinador");
    if (auth.error) return auth.error;
    const user = auth.user;

    const { rows } = await queryWithTenant(
      user.tenant,
      `SELECT id, nombre, email, role, dia_d_level
         FROM admins
        WHERE activo = 1
          AND dia_d_level IN ('testigo', 'coordinador')
        ORDER BY nombre ASC`
    );

    return NextResponse.json({ data: rows });
  } catch (err: any) {
    console.error("[dia-d/testigos GET] Error:", err.message);
    return NextResponse.json({ error: "Error interno: " + err.message }, { status: 500 });
  }
}
