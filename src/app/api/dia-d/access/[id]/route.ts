import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { queryWithTenant } from "@/lib/tenant";
import { logPermissionChange } from "@/lib/audit";
import { normalizeDiaDLevel } from "@/lib/modules";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireRole(request, ["administrador", "estratega"]);
    if (auth.error) return auth.error;
    const actor = auth.user;

    const id = Number(params.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    if (body.dia_d_level === undefined) {
      return NextResponse.json({ error: "dia_d_level es obligatorio" }, { status: 400 });
    }
    const level = normalizeDiaDLevel(body.dia_d_level);
    if (body.dia_d_level !== level) {
      return NextResponse.json({ error: "Nivel Día D inválido" }, { status: 400 });
    }

    if (id === actor.userId && level === "none") {
      return NextResponse.json(
        { error: "No puede quitarse a si mismo el acceso a Día D" },
        { status: 400 }
      );
    }

    const { rows: targetRows } = await queryWithTenant(
      actor.tenant,
      "SELECT id, email, nombre, role, dia_d_level FROM admins WHERE id = $1",
      [id]
    );
    const target = targetRows[0];
    if (!target) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (target.role === "operador_dia_d" && level === "none") {
      return NextResponse.json(
        { error: "Un operador Día D requiere nivel testigo o coordinador. Cambie su rol primero." },
        { status: 400 }
      );
    }

    const { rows } = await queryWithTenant(
      actor.tenant,
      `UPDATE admins
          SET dia_d_level = $1,
              session_version = COALESCE(session_version, 0) + 1
        WHERE id = $2
        RETURNING id, email, nombre, role, dia_d_level, activo`,
      [level, id]
    );

    await logPermissionChange({
      tenant: actor.tenant,
      userId: actor.userId,
      userEmail: actor.email,
      userName: actor.nombre,
      userRole: actor.role,
      resourceType: "admin",
      resourceId: String(id),
      oldValue: { dia_d_level: target.dia_d_level },
      newValue: { dia_d_level: level },
    });

    return NextResponse.json({
      data: rows[0],
      message: `Acceso a Día D actualizado a ${level}`,
    });
  } catch (err: any) {
    console.error("[dia-d/access PUT] Error:", err.message);
    return NextResponse.json({ error: "Error interno: " + err.message }, { status: 500 });
  }
}
