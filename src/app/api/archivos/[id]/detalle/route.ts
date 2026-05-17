import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "ciudadanos";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const barrio = searchParams.get("barrio") || "";
    const sexo = searchParams.get("sexo") || "";

    const archivoRes = await pool.query(
      "SELECT snapshot FROM archivos_electorales WHERE id = $1",
      [params.id]
    );

    if (archivoRes.rows.length === 0) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    const rawSnapshot = archivoRes.rows[0].snapshot;
    const snapshot = typeof rawSnapshot === 'string' ? JSON.parse(rawSnapshot) : rawSnapshot;

    console.log("[archivos/detalle] Snapshot keys:", Object.keys(snapshot));
    console.log("[archivos/detalle] Ciudadanos count:", (snapshot.ciudadanos || []).length);
    console.log("[archivos/detalle] Sectores count:", (snapshot.sectores || []).length);
    console.log("[archivos/detalle] Lideres count:", (snapshot.lideres || []).length);

    if (tab === "ciudadanos") {
      let ciudadanos = snapshot.ciudadanos || [];

      if (search) {
        const s = search.toLowerCase();
        ciudadanos = ciudadanos.filter(
          (c: any) =>
            c.id_unico?.toLowerCase().includes(s) ||
            c.nombre_completo?.toLowerCase().includes(s)
        );
      }
      if (barrio) {
        ciudadanos = ciudadanos.filter((c: any) => c.barrio?.toLowerCase().includes(barrio.toLowerCase()));
      }
      if (sexo) {
        ciudadanos = ciudadanos.filter((c: any) => c.sexo === sexo);
      }

      const total = ciudadanos.length;
      const start = (page - 1) * limit;
      const paginated = ciudadanos.slice(start, start + limit);

      return NextResponse.json({
        data: paginated,
        count: total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      });
    }

    if (tab === "sectores") {
      const sectores = snapshot.sectores || [];
      return NextResponse.json({
        data: sectores,
        count: sectores.length,
      });
    }

    if (tab === "lideres") {
      const lideres = snapshot.lideres || [];
      return NextResponse.json({
        data: lideres,
        count: lideres.length,
      });
    }

    return NextResponse.json({ error: "Tab no válido" }, { status: 400 });
  } catch (err: any) {
    console.error("[archivos/detalle] Error:", err);
    return NextResponse.json({ error: "Error al consultar archivo" }, { status: 500 });
  }
}
