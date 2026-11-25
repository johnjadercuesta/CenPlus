import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { queryWithTenant } from "@/lib/tenant";
import { logPermissionChange, logRecordCreate } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { normalizeDiaDLevel } from "@/lib/modules";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ["administrador", "estratega"]);
    if (auth.error) return auth.error;
    const actor = auth.user;

    const { email, identificacion, password, nombre, dia_d_level } = await request.json();

    if (!email || !identificacion || !password || !nombre) {
      return NextResponse.json(
        { error: "Email, identificación, contraseña y nombre son obligatorios" },
        { status: 400 }
      );
    }

    if (String(password).length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }

    const requestedLevel = normalizeDiaDLevel(dia_d_level);
    const level = requestedLevel === "none" ? "testigo" : requestedLevel;

    const { rows: existingRows } = await queryWithTenant(
      actor.tenant,
      "SELECT id FROM admins WHERE email = $1 OR identificacion = $2",
      [email, identificacion]
    );
    if (existingRows.length > 0) {
      return NextResponse.json(
        { error: "Este email o identificación ya está registrado" },
        { status: 409 }
      );
    }

    const hash = bcrypt.hashSync(password, 10);

    const { rows } = await queryWithTenant(
      actor.tenant,
      `INSERT INTO admins (email, identificacion, password, nombre, role, dia_d_level)
       VALUES ($1, $2, $3, $4, 'operador_dia_d', $5)
       RETURNING id, email, identificacion, nombre, role, dia_d_level, activo, created_at`,
      [email, identificacion, hash, nombre, level]
    );

    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO public.user_tenants (email, tenant, identificacion) VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET tenant = $2, identificacion = $3`,
        [email, actor.tenant, identificacion]
      );
    } finally {
      client.release();
    }

    await logRecordCreate({
      tenant: actor.tenant,
      userId: actor.userId,
      userEmail: actor.email,
      userName: actor.nombre,
      userRole: actor.role,
      module: "dia-d",
      resourceType: "admin",
      resourceId: String(rows[0].id),
      newValue: { email, nombre, role: "operador_dia_d", dia_d_level: level },
    });

    await logPermissionChange({
      tenant: actor.tenant,
      userId: actor.userId,
      userEmail: actor.email,
      userName: actor.nombre,
      userRole: actor.role,
      resourceType: "admin",
      resourceId: String(rows[0].id),
      newValue: { role: "operador_dia_d", dia_d_level: level },
    });

    return NextResponse.json(
      { data: rows[0], message: "Operador Día D creado exitosamente" },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[dia-d/users POST] Error:", err.message);
    return NextResponse.json({ error: "Error interno: " + err.message }, { status: 500 });
  }
}
