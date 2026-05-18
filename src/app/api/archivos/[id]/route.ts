import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest, tokenMatchesTenant } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!tokenMatchesTenant(token, request)) return NextResponse.json({ error: "Acceso no autorizado para esta organización" }, { status: 403 });

    const tenant = getTenantFromRequest(request);
    const run = (sql: string, params: any[] = []) => (tenant ? queryWithTenant(tenant, sql, params) : pool.query(sql, params));

    const { rows } = await run(
      `SELECT a.*, ad.nombre as creado_por_nombre
       FROM archivos_electorales a
       LEFT JOIN admins ad ON a.creado_por = ad.id
       WHERE a.id = $1`,
      [params.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ archivo: rows[0] });
  } catch (err: any) {
    console.error("[archivos] Error obteniendo archivo:", err);
    return NextResponse.json({ error: "Error al obtener archivo" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!tokenMatchesTenant(token, request)) return NextResponse.json({ error: "Acceso no autorizado para esta organización" }, { status: 403 });

    const tenant = getTenantFromRequest(request);
    const run = (sql: string, params: any[] = []) => (tenant ? queryWithTenant(tenant, sql, params) : pool.query(sql, params));

    const result = await run("DELETE FROM archivos_electorales WHERE id = $1 RETURNING id", [params.id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Archivo eliminado" });
  } catch (err: any) {
    console.error("[archivos] Error eliminando archivo:", err);
    return NextResponse.json({ error: "Error al eliminar archivo" }, { status: 500 });
  }
}
