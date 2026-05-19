import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest, tokenMatchesTenant } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";
import bcrypt from "bcryptjs";
import { logRecordCreate, logRecordUpdate, logRecordDelete, logPermissionChange } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }
    if (!tokenMatchesTenant(token, request)) return NextResponse.json({ error: "Acceso no autorizado para esta organizacion" }, { status: 403 });

    let tenant = getTenantFromRequest(request);
    if (!tenant && token.tenant) {
      tenant = token.tenant;
    }

    if (!tenant) {
      return NextResponse.json({ error: "No se pudo detectar la organizacion" }, { status: 400 });
    }

    const { rows: data } = await queryWithTenant(tenant,
      "SELECT id, email, identificacion, nombre, role, activo, created_at FROM admins ORDER BY created_at DESC"
    );

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("[lideres GET] Error:", err.message);
    return NextResponse.json({ error: "Error interno del servidor: " + (err?.message || "Desconocido") }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }
    if (!tokenMatchesTenant(token, request)) return NextResponse.json({ error: "Acceso no autorizado para esta organizacion" }, { status: 403 });

    const { email, identificacion, password, nombre, role } = await request.json();

    if (!email || !identificacion || !password || !nombre) {
      return NextResponse.json({ error: "Email, identificacion, contrasena y nombre son obligatorios" }, { status: 400 });
    }

    let tenant = getTenantFromRequest(request);
    if (!tenant && token.tenant) {
      tenant = token.tenant;
    }

    if (!tenant) {
      return NextResponse.json({ error: "No se pudo detectar la organizacion" }, { status: 400 });
    }

    const { rows: existingRows } = await queryWithTenant(tenant, "SELECT id FROM admins WHERE email = $1 OR identificacion = $2", [email, identificacion]);
    if (existingRows.length > 0) {
      return NextResponse.json({ error: "Este email o identificacion ya esta registrado" }, { status: 409 });
    }

    const hash = bcrypt.hashSync(password, 10);
    const validRoles = ["administrador", "estratega", "lider", "analista"];
    const targetRole = validRoles.includes(role) ? role : "lider";

    const { rows } = await queryWithTenant(tenant,
      "INSERT INTO admins (email, identificacion, password, nombre, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, identificacion, nombre, role, activo, created_at",
      [email, identificacion, hash, nombre, targetRole]
    );

    await logRecordCreate({
      tenant,
      userId: token.userId,
      userEmail: token.email,
      userName: token.nombre,
      userRole: token.role,
      module: "usuarios",
      resourceType: "admin",
      resourceId: String(rows[0].id),
      newValue: { email, nombre, role: targetRole },
    });

    if (targetRole !== "lider") {
      await logPermissionChange({
        tenant,
        userId: token.userId,
        userEmail: token.email,
        userName: token.nombre,
        resourceType: "admin",
        resourceId: String(rows[0].id),
        newValue: { role: targetRole },
      });
    }

    return NextResponse.json({ data: rows[0], message: "Usuario creado exitosamente" }, { status: 201 });
  } catch (err: any) {
    console.error("[lideres POST] Error:", err.message);
    return NextResponse.json({ error: "Error interno del servidor: " + (err?.message || "Desconocido") }, { status: 500 });
  }
}
