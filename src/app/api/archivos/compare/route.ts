import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const tenant = token.tenant || getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json({ error: "No se pudo detectar la organizacion" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const id1 = searchParams.get("id1");
    const id2 = searchParams.get("id2");

    if (!id1 || !id2) {
      return NextResponse.json({ error: "Se requieren dos IDs para comparar" }, { status: 400 });
    }

    const res1 = await queryWithTenant(tenant, "SELECT * FROM archivos_electorales WHERE id = $1", [id1]);
    const res2 = await queryWithTenant(tenant, "SELECT * FROM archivos_electorales WHERE id = $1", [id2]);

    if (res1.rows.length === 0 || res2.rows.length === 0) {
      return NextResponse.json({ error: "Uno o ambos archivos no existen" }, { status: 404 });
    }

    const a1 = res1.rows[0];
    const a2 = res2.rows[0];

    const s1 = a1.snapshot;
    const s2 = a2.snapshot;

    const c1 = s1.ciudadanos || [];
    const c2 = s2.ciudadanos || [];

    const cedulas1 = new Set(c1.map((c: any) => c.id_unico));
    const cedulas2 = new Set(c2.map((c: any) => c.id_unico));

    const enAmbos = [...cedulas1].filter((c) => cedulas2.has(c)).length;
    const soloEn1 = cedulas1.size - enAmbos;
    const soloEn2 = cedulas2.size - enAmbos;

    const countByBarrio = (ciudadanos: any[]) => {
      const map: Record<string, number> = {};
      ciudadanos.forEach((c: any) => {
        const b = c.barrio || "Sin barrio";
        map[b] = (map[b] || 0) + 1;
      });
      return Object.entries(map)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));
    };

    const countByProblematica = (ciudadanos: any[]) => {
      const map: Record<string, number> = {};
      ciudadanos.forEach((c: any) => {
        const p = c.problematica_principal || "Sin definir";
        map[p] = (map[p] || 0) + 1;
      });
      return Object.entries(map)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));
    };

    return NextResponse.json({
      archivo1: {
        id: a1.id,
        nombre: a1.nombre,
        fecha_corte: a1.fecha_corte,
        total_ciudadanos: a1.total_ciudadanos,
        total_lideres: a1.total_lideres,
        total_sectores: a1.total_sectores,
      },
      archivo2: {
        id: a2.id,
        nombre: a2.nombre,
        fecha_corte: a2.fecha_corte,
        total_ciudadanos: a2.total_ciudadanos,
        total_lideres: a2.total_lideres,
        total_sectores: a2.total_sectores,
      },
      comparacion: {
        ciudadanos_en_ambos: enAmbos,
        solo_en_archivo1: soloEn1,
        solo_en_archivo2: soloEn2,
        diferencia_ciudadanos: a2.total_ciudadanos - a1.total_ciudadanos,
        diferencia_lideres: a2.total_lideres - a1.total_lideres,
        diferencia_sectores: a2.total_sectores - a1.total_sectores,
      },
      top_barrios_1: countByBarrio(c1),
      top_barrios_2: countByBarrio(c2),
      top_problematicas_1: countByProblematica(c1),
      top_problematicas_2: countByProblematica(c2),
    });
  } catch (err: any) {
    console.error("[archivos/compare] Error:", err);
    return NextResponse.json({ error: "Error al comparar archivos" }, { status: 500 });
  }
}
