import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { queryWithTenant } from "@/lib/tenant";
import bcrypt from "bcryptjs";
import { logRecordUpdate, logRecordDelete, logPermissionChange } from "@/lib/audit";
import {
  Role,
  isRole,
  normalizeDiaDLevel,
  resolveDiaDLevelForRole,
} from "@/lib/modules";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireModule(request, "usuarios");
    if (auth.error) return auth.error;
    const actor = auth.user;

    const id = Number(params.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();

    const { rows: adminRows } = await queryWithTenant(
      actor.tenant,
      "SELECT email, identificacion, role, dia_d_level, activo FROM admins WHERE id = $1",
      [id]
    );
    const current = adminRows[0];
    if (!current) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (id === actor.userId) {
      if (body.activo !== undefined && !body.activo) {
        return NextResponse.json({ error: "No puede desactivarse a si mismo" }, { status: 400 });
      }
      if (body.role !== undefined && body.role !== current.role) {
        return NextResponse.json({ error: "No puede cambiar su propio rol" }, { status: 400 });
      }
    }

    const fields: string[] = [];
    const values: any[] = [];
    let pCount = 1;
    let invalidateSession = false;

    const oldValue: Record<string, any> = {};
    const newValue: Record<string, any> = {};

    if (body.nombre !== undefined) {
      fields.push(`nombre = $${pCount++}`);
      values.push(body.nombre);
      newValue.nombre = body.nombre;
    }

    if (body.email !== undefined) {
      const { rows: existingRows } = await queryWithTenant(
        actor.tenant,
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
      invalidateSession = true;
    }

    let targetRole: Role = current.role as Role;
    if (body.role !== undefined) {
      targetRole = isRole(body.role) ? body.role : "lider";
      if (targetRole !== current.role) invalidateSession = true;
      fields.push(`role = $${pCount++}`);
      values.push(targetRole);
      oldValue.role = current.role;
      newValue.role = targetRole;
    }

    let targetLevel =
      body.dia_d_level !== undefined
        ? normalizeDiaDLevel(body.dia_d_level)
        : normalizeDiaDLevel(current.dia_d_level);

    if (body.role !== undefined && body.dia_d_level === undefined) {
      targetLevel = resolveDiaDLevelForRole(targetRole, current.dia_d_level);
    }

    if (body.dia_d_level !== undefined || targetLevel !== current.dia_d_level) {
      if (targetLevel !== current.dia_d_level) invalidateSession = true;
      fields.push(`dia_d_level = $${pCount++}`);
      values.push(targetLevel);
      oldValue.dia_d_level = current.dia_d_level;
      newValue.dia_d_level = targetLevel;
    }

    if (body.activo !== undefined) {
      const activo = body.activo ? 1 : 0;
      if (activo !== Number(current.activo)) invalidateSession = true;
      fields.push(`activo = $${pCount++}`);
      values.push(activo);
      oldValue.activo = current.activo;
      newValue.activo = body.activo;
    }

    if (body.identificacion !== undefined) {
      fields.push(`identificacion = $${pCount++}`);
      values.push(body.identificacion);
      newValue.identificacion = body.identificacion;
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
    }

    if (invalidateSession) {
      fields.push(`session_version = COALESCE(session_version, 0) + 1`);
    }

    values.push(id);
    const sql = `UPDATE admins SET ${fields.join(", ")} WHERE id = $${pCount} RETURNING id, email, nombre, role, dia_d_level, activo, created_at`;
    const { rows: updateRows } = await queryWithTenant(actor.tenant, sql, values);

    if (updateRows.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    await logRecordUpdate({
      tenant: actor.tenant,
      userId: actor.userId,
      userEmail: actor.email,
      userName: actor.nombre,
      userRole: actor.role,
      module: "usuarios",
      resourceType: "admin",
      resourceId: String(id),
      oldValue: Object.keys(oldValue).length > 0 ? oldValue : undefined,
      newValue: Object.keys(newValue).length > 0 ? newValue : undefined,
    });

    if (newValue.email || newValue.identificacion) {
      const newEmail = newValue.email || current.email;
      const newIdent = newValue.identificacion || current.identificacion;
      await pool.query(`
        INSERT INTO public.user_tenants (email, tenant, identificacion) VALUES ($1, $2, $3)
        ON CONFLICT (email) DO UPDATE SET tenant = $2, identificacion = $3`
        , [newEmail, actor.tenant, newIdent]);
    }

    if (newValue.role || newValue.dia_d_level) {
      await logPermissionChange({
        tenant: actor.tenant,
        userId: actor.userId,
        userEmail: actor.email,
        userName: actor.nombre,
        resourceType: "admin",
        resourceId: String(id),
        oldValue:
          oldValue.role || oldValue.dia_d_level
            ? { role: oldValue.role, dia_d_level: oldValue.dia_d_level }
            : undefined,
        newValue: { role: newValue.role, dia_d_level: newValue.dia_d_level },
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
    const auth = await requireModule(request, "usuarios");
    if (auth.error) return auth.error;
    const actor = auth.user;

    const id = Number(params.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    if (id === actor.userId) {
      return NextResponse.json({ error: "No puede eliminarse a si mismo" }, { status: 400 });
    }

    const { rows: userRows } = await queryWithTenant(
      actor.tenant,
      "SELECT email, nombre, role FROM admins WHERE id = $1",
      [id]
    );
    const user = userRows[0];
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const { rowCount } = await queryWithTenant(
      actor.tenant,
      "DELETE FROM admins WHERE id = $1",
      [id]
    );
    if (rowCount === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    await pool.query(`DELETE FROM public.user_tenants WHERE email = $1`, [user.email]);

    await logRecordDelete({
      tenant: actor.tenant,
      userId: actor.userId,
      userEmail: actor.email,
      userName: actor.nombre,
      userRole: actor.role,
      module: "usuarios",
      resourceType: "admin",
      resourceId: String(id),
    });

    return NextResponse.json({ message: "Usuario eliminado exitosamente" });
  } catch (err: any) {
    console.error("[lideres DELETE] Error:", err.message);
    return NextResponse.json({ error: "Error interno del servidor: " + (err?.message || "Desconocido") }, { status: 500 });
  }
}
