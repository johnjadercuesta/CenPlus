import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { queryWithTenant } from "@/lib/tenant";
import bcrypt from "bcryptjs";
import { logRecordCreate, logPermissionChange } from "@/lib/audit";
import {
  Role,
  isRole,
  resolveDiaDLevelForRole,
} from "@/lib/modules";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireModule(request, "usuarios");
    if (auth.error) return auth.error;
    const user = auth.user;

    const { rows: data } = await queryWithTenant(
      user.tenant,
      `SELECT id, email, identificacion, nombre, role, dia_d_level, activo, created_at
         FROM admins
        ORDER BY created_at DESC`
    );

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("[lideres GET] Error:", err.message);
    return NextResponse.json({ error: "Error interno del servidor: " + (err?.message || "Desconocido") }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireModule(request, "usuarios");
    if (auth.error) return auth.error;
    const user = auth.user;

    const { email, identificacion, password, nombre, role, dia_d_level } = await request.json();

    if (!email || !identificacion || !password || !nombre) {
      return NextResponse.json({ error: "Email, identificacion, contrasena y nombre son obligatorios" }, { status: 400 });
    }

    const targetRole: Role = isRole(role) ? role : "lider";
    const targetLevel = resolveDiaDLevelForRole(targetRole, dia_d_level);

    const { rows: existingRows } = await queryWithTenant(
      user.tenant,
      "SELECT id FROM admins WHERE email = $1 OR identificacion = $2",
      [email, identificacion]
    );
    if (existingRows.length > 0) {
      return NextResponse.json({ error: "Este email o identificacion ya esta registrado" }, { status: 409 });
    }

    const hash = bcrypt.hashSync(password, 10);

    const { rows } = await queryWithTenant(
      user.tenant,
      `INSERT INTO admins (email, identificacion, password, nombre, role, dia_d_level)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, identificacion, nombre, role, dia_d_level, activo, created_at`,
      [email, identificacion, hash, nombre, targetRole, targetLevel]
    );

    const client = await pool.connect();
    try {
      await client.query(`
        INSERT INTO public.user_tenants (email, tenant, identificacion) VALUES ($1, $2, $3)
        ON CONFLICT (email) DO UPDATE SET tenant = $2, identificacion = $3
      `, [email, user.tenant, identificacion]);
    } finally {
      client.release();
    }

    await logRecordCreate({
      tenant: user.tenant,
      userId: user.userId,
      userEmail: user.email,
      userName: user.nombre,
      userRole: user.role,
      module: "usuarios",
      resourceType: "admin",
      resourceId: String(rows[0].id),
      newValue: { email, nombre, role: targetRole, dia_d_level: targetLevel },
    });

    if (targetRole !== "lider" || targetLevel !== "none") {
      await logPermissionChange({
        tenant: user.tenant,
        userId: user.userId,
        userEmail: user.email,
        userName: user.nombre,
        resourceType: "admin",
        resourceId: String(rows[0].id),
        newValue: { role: targetRole, dia_d_level: targetLevel },
      });
    }

    return NextResponse.json({ data: rows[0], message: "Usuario creado exitosamente" }, { status: 201 });
  } catch (err: any) {
    console.error("[lideres POST] Error:", err.message);
    return NextResponse.json({ error: "Error interno del servidor: " + (err?.message || "Desconocido") }, { status: 500 });
  }
}
