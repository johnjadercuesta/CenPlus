import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest, tokenMatchesTenant } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";
import bcrypt from "bcryptjs";
import { logRecordUpdate, logRecordDelete, logPermissionChange } from "@/lib/audit";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }
    if (!tokenMatchesTenant(token, request)) return NextResponse.json({ error: "Acceso no autorizado para esta organizacion" }, { status: 403 });

    const id = params.id;
    let tenant = getTenantFromRequest(request);
    if (!tenant && token.tenant) {
      tenant = token.tenant;
    }

    if (!tenant) {
      return NextResponse.json({ error: "No se pudo detectar la organizacion" }, { status: 400 });
    }

    const body = await request.json();

    const fields: string[] = [];
    const values: any[] = [];
    let pCount = 1;

    const oldValue: Record<string, any> = {};
    const newValue: Record<string, any> = {};

    if (body.nombre !== undefined) {
      fields.push(`nombre = $${pCount++}`);
      values.push(body.nombre);
      newValue.nombre = body.nombre;
    }
    if (body.email !== undefined) {
      const { rows: existingRows } = await queryWithTenant(tenant,
        "SELECT id FROM admins WHERE email = $1 AND id != $2",
        [body.email, id]
      );
      if (existingRows.length > 0) {
        return NextResponse.json({ error: "Email ya en uso" }, { status: 409 });
      }
      fields.push(`email = $${pCount++}`);
      values.push(body.email);
      newValue.email = body.email;
    }
    if (body.password) {
      fields.push(`password = $${pCount++}`);
      values.push(bcrypt.hashSync(body.password, 10));
      newValue.password = "[changed]";
    }
    if (body.role !== undefined) {
      const validRoles = ["administrador", "estratega", "lider"];
      const targetRole = validRoles.includes(body.role) ? body.role : "lider";
      fields.push(`role = $${pCount++}`);
      values.push(targetRole);
      oldValue.role = token.role;
      newValue.role = targetRole;
    }
    if (body.activo !== undefined) {
      fields.push(`activo = $${pCount++}`);
      values.push(body.activo ? 1 : 0);
      newValue.activo = body.activo;
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
    }

    values.push(id);
    const sql = `UPDATE admins SET ${fields.join(", ")} WHERE id = $${pCount} RETURNING id, email, nombre, role, activo, created_at`;
    const { rows: updateRows } = await queryWithTenant(tenant, sql, values);

    if (updateRows.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    await logRecordUpdate({
      tenant,
      userId: token.userId,
      userEmail: token.email,
      userName: token.nombre,
      userRole: token.role,
      module: "usuarios",
      resourceType: "admin",
      resourceId: id,
      oldValue: Object.keys(oldValue).length > 0 ? oldValue : undefined,
      newValue: Object.keys(newValue).length > 0 ? newValue : undefined,
    });

    if (newValue.role) {
      await logPermissionChange({
        tenant,
        userId: token.userId,
        userEmail: token.email,
        userName: token.nombre,
        resourceType: "admin",
        resourceId: id,
        oldValue: oldValue.role ? { role: oldValue.role } : undefined,
        newValue: { role: newValue.role },
      });
    }

    return NextResponse.json({ data: updateRows[0], message: "Usuario actualizado exitosamente" });
  } catch (err: any) {
    console.error("[lideres PUT] Error:", err.message);
    return NextResponse.json({ error: "Error interno del servidor: " + (err?.message || "Desconocido") }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }
    if (!tokenMatchesTenant(token, request)) return NextResponse.json({ error: "Acceso no autorizado para esta organizacion" }, { status: 403 });

    const id = params.id;
    let tenant = getTenantFromRequest(request);
    if (!tenant && token.tenant) {
      tenant = token.tenant;
    }

    if (!tenant) {
      return NextResponse.json({ error: "No se pudo detectar la organizacion" }, { status: 400 });
    }

    if (parseInt(id) === token.userId) {
      return NextResponse.json({ error: "No puede eliminarse a si mismo" }, { status: 400 });
    }

    const { rows: userRows } = await queryWithTenant(tenant, "SELECT email, nombre, role FROM admins WHERE id = $1", [id]);
    const user = userRows[0];

    const { rowCount } = await queryWithTenant(tenant, "DELETE FROM admins WHERE id = $1", [id]);
    if (rowCount === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    await logRecordDelete({
      tenant,
      userId: token.userId,
      userEmail: token.email,
      userName: token.nombre,
      userRole: token.role,
      module: "usuarios",
      resourceType: "admin",
      resourceId: id,
    });

    return NextResponse.json({ message: "Usuario eliminado exitosamente" });
  } catch (err: any) {
    console.error("[lideres DELETE] Error:", err.message);
    return NextResponse.json({ error: "Error interno del servidor: " + (err?.message || "Desconocido") }, { status: 500 });
  }
}
