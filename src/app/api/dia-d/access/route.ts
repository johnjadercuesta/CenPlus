import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { queryWithTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, ["administrador", "estratega"]);
    if (auth.error) return auth.error;
    const user = auth.user;

    const { rows } = await queryWithTenant(
      user.tenant,
      `SELECT id, email, identificacion, nombre, role, dia_d_level, activo, created_at
         FROM admins
        ORDER BY
          CASE role
            WHEN 'administrador' THEN 1
            WHEN 'estratega' THEN 2
            WHEN 'operador_dia_d' THEN 3
            ELSE 4
          END,
          nombre ASC`
    );

    return NextResponse.json({ data: rows, currentUserId: user.userId });
  } catch (err: any) {
    console.error("[dia-d/access GET] Error:", err.message);
    return NextResponse.json({ error: "Error interno: " + err.message }, { status: 500 });
  }
}
