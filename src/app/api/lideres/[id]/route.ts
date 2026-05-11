import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest, tokenMatchesTenant } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";
import bcrypt from "bcryptjs";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }
    if (!tokenMatchesTenant(token, request)) return NextResponse.json({ error: "Token no corresponde al tenant" }, { status: 403 });

    const id = params.id;
    const tenant = getTenantFromRequest(request);
    const run = (sql: string, params: any[] = []) => (tenant ? queryWithTenant(tenant, sql, params) : pool.query(sql, params));
    const body = await request.json();

    const fields: string[] = [];
    const values: any[] = [];
    let pCount = 1;

    if (body.nombre !== undefined) {
      fields.push(`nombre = $${pCount++}`);
      values.push(body.nombre);
    }
    if (body.email !== undefined) {
      const { rows: existingRows } = await run(
        "SELECT id FROM admins WHERE email = $1 AND id != $2",
        [body.email, id]
      );
      if (existingRows.length > 0) {
        return NextResponse.json({ error: "Email ya en uso" }, { status: 409 });
      }
      fields.push(`email = $${pCount++}`);
      values.push(body.email);
    }
    if (body.password) {
      fields.push(`password = $${pCount++}`);
      values.push(bcrypt.hashSync(body.password, 10));
    }
    if (body.role !== undefined) {
      const validRoles = ["administrador", "estratega", "lider"];
      const targetRole = validRoles.includes(body.role) ? body.role : "lider";
      fields.push(`role = $${pCount++}`);
      values.push(targetRole);
    }
    if (body.activo !== undefined) {
      fields.push(`activo = $${pCount++}`);
      values.push(body.activo ? 1 : 0);
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
    }

    values.push(id);
    const sql = `UPDATE admins SET ${fields.join(", ")} WHERE id = $${pCount} RETURNING id, email, nombre, role, activo, created_at`;
    const { rows: updateRows } = await run(sql, values);

    if (updateRows.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ data: updateRows[0], message: "Usuario actualizado exitosamente" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
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
    if (!tokenMatchesTenant(token, request)) return NextResponse.json({ error: "Token no corresponde al tenant" }, { status: 403 });

    const id = params.id;
    const tenant = getTenantFromRequest(request);
    const run = (sql: string, params: any[] = []) => (tenant ? queryWithTenant(tenant, sql, params) : pool.query(sql, params));

    if (parseInt(id) === token.userId) {
      return NextResponse.json({ error: "No puede eliminarse a sí mismo" }, { status: 400 });
    }

    const { rowCount } = await run("DELETE FROM admins WHERE id = $1", [id]);
    if (rowCount === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ message: "Usuario eliminado exitosamente" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
