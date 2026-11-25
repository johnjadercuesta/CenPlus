import { NextRequest, NextResponse } from "next/server";
import { requireModule, requireRole } from "@/lib/auth";
import { queryWithTenant } from "@/lib/tenant";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireModule(request, "archivos");
    if (auth.error) return auth.error;
    const tenant = auth.user.tenant;
    const run = (sql: string, params: any[] = []) => queryWithTenant(tenant, sql, params);

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
    const auth = await requireRole(request, ["administrador"]);
    if (auth.error) return auth.error;
    const tenant = auth.user.tenant;
    const run = (sql: string, params: any[] = []) => queryWithTenant(tenant, sql, params);

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
