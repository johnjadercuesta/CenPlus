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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const barrio = searchParams.get("barrio") || "";
    const comuna = searchParams.get("comuna") || "";
    const sexo = searchParams.get("sexo") || "";
    const problematica = searchParams.get("problematica") || "";
    const es_lider = searchParams.get("es_lider") || "";

    const archivoRes = await pool.query(
      "SELECT snapshot FROM archivos_electorales WHERE id = $1",
      [params.id]
    );

    if (archivoRes.rows.length === 0) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    const rawSnapshot = archivoRes.rows[0].snapshot;
    const snapshot = typeof rawSnapshot === 'string' ? JSON.parse(rawSnapshot) : rawSnapshot;

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
    if (comuna) {
      ciudadanos = ciudadanos.filter((c: any) => c.id_comuna?.toString() === comuna);
    }
    if (sexo) {
      ciudadanos = ciudadanos.filter((c: any) => c.sexo === sexo);
    }
    if (problematica) {
      ciudadanos = ciudadanos.filter((c: any) => c.problematica_principal === problematica);
    }
    if (es_lider === "true") {
      ciudadanos = ciudadanos.filter((c: any) => c.es_lider === 1);
    } else if (es_lider === "false") {
      ciudadanos = ciudadanos.filter((c: any) => c.es_lider === 0);
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
  } catch (err: any) {
    console.error("[archivos/ciudadanos] Error:", err);
    return NextResponse.json({ error: "Error al consultar archivo" }, { status: 500 });
  }
}
