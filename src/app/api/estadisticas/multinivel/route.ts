import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, tokenMatchesTenant } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!tokenMatchesTenant(token, request)) {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
    }

    const tenant = getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const escala = searchParams.get("escala") || "municipal"; // 'nacional', 'departamental', 'municipal'
    const departamentoFiltro = searchParams.get("departamento") || "Antioquia";

    // Departamentos base de Colombia para la escala nacional
    const DEPARTAMENTOS_COLOMBIA = [
      "Antioquia", "Bogotá D.C.", "Valle del Cauca", "Atlántico", "Santander",
      "Cundinamarca", "Bolívar", "Nariño", "Córdoba", "Tolima",
      "Boyacá", "Caldas", "Huila", "Risaralda", "Magdalena",
      "Cauca", "Cesar", "Norte de Santander", "Meta", "Quindío",
      "Sucre", "Chocó", "Casanare", "La Guajira", "Caquetá",
      "Putumayo", "Arauca", "Guaviare", "Amazonas", "Vichada",
      "Vaupés", "Guainía", "San Andrés y Providencia"
    ];

    if (escala === "nacional") {
      // 1. ESCALA NACIONAL: Consolidado por Departamento
      const sql = `
        SELECT 
          COALESCE(d.nombre, 'Antioquia') AS territorio,
          COUNT(c.id)::int AS total_ciudadanos,
          COUNT(CASE WHEN c.zona = 'urbana' THEN 1 END)::int AS urbanos,
          COUNT(CASE WHEN c.zona = 'rural' THEN 1 END)::int AS rurales,
          COUNT(DISTINCT c.lider_id)::int AS lideres_activos
        FROM ciudadanos c
        LEFT JOIN division_territorial d ON d.id = c.territorio_id AND d.tipo = 'departamento'
        GROUP BY COALESCE(d.nombre, 'Antioquia')
        ORDER BY total_ciudadanos DESC
      `;
      const { rows } = await queryWithTenant(tenant, sql, []);

      // Mapear con la lista de departamentos de Colombia
      const mapaExistentes = new Map(rows.map((r: any) => [r.territorio, r]));
      const data = DEPARTAMENTOS_COLOMBIA.map(depto => {
        if (mapaExistentes.has(depto)) {
          return mapaExistentes.get(depto);
        }
        return {
          territorio: depto,
          total_ciudadanos: 0,
          urbanos: 0,
          rurales: 0,
          lideres_activos: 0
        };
      }).sort((a, b) => b.total_ciudadanos - a.total_ciudadanos);

      const totalNacional = rows.reduce((sum: number, r: any) => sum + r.total_ciudadanos, 0);

      return NextResponse.json({
        escala: "nacional",
        meta_global: 100000,
        total: totalNacional,
        departamento_lider: data[0]?.territorio || "Antioquia",
        cobertura_deptos: rows.filter((r: any) => r.total_ciudadanos > 0).length,
        data: data
      });
    }

    if (escala === "departamental") {
      // 2. ESCALA DEPARTAMENTAL: Consolidado por Municipio
      const sql = `
        SELECT 
          COALESCE(c.corregimiento, 'Municipio Principal') AS municipio,
          COUNT(c.id)::int AS total_ciudadanos,
          COUNT(CASE WHEN c.zona = 'urbana' THEN 1 END)::int AS urbanos,
          COUNT(CASE WHEN c.zona = 'rural' THEN 1 END)::int AS rurales,
          COUNT(DISTINCT c.lider_id)::int AS lideres_activos
        FROM ciudadanos c
        GROUP BY COALESCE(c.corregimiento, 'Municipio Principal')
        ORDER BY total_ciudadanos DESC
      `;
      const { rows } = await queryWithTenant(tenant, sql, []);

      const totalDeptal = rows.reduce((sum: number, r: any) => sum + r.total_ciudadanos, 0);

      return NextResponse.json({
        escala: "departamental",
        departamento: departamentoFiltro,
        meta_global: 25000,
        total: totalDeptal,
        municipio_lider: rows[0]?.municipio || "Principal",
        total_municipios: rows.length,
        data: rows
      });
    }

    // 3. ESCALA MUNICIPAL: Consolidado por Comuna / Corregimiento y Barrios / Veredas
    const sql = `
      SELECT 
        d.id,
        d.nombre,
        d.tipo,
        d.zona,
        d.padre_id,
        p.nombre AS padre_nombre,
        (SELECT COUNT(*)::int FROM ciudadanos c WHERE c.barrio = d.nombre OR c.vereda = d.nombre OR c.territorio_id = d.id) AS electores
      FROM division_territorial d
      LEFT JOIN division_territorial p ON p.id = d.padre_id
      WHERE d.activo = 1
      ORDER BY 
        CASE d.tipo 
          WHEN 'comuna' THEN 1 
          WHEN 'corregimiento' THEN 2 
          WHEN 'vereda' THEN 3 
          ELSE 4 
        END,
        electores DESC
    `;
    const { rows } = await queryWithTenant(tenant, sql, []);
    const totalMunicipal = rows.reduce((sum: number, r: any) => sum + r.electores, 0);

    return NextResponse.json({
      escala: "municipal",
      meta_global: 5000,
      total: totalMunicipal,
      comunas_corregimientos: rows.filter((r: any) => ['comuna', 'corregimiento'].includes(r.tipo)).length,
      barrios_veredas: rows.filter((r: any) => ['barrio', 'vereda'].includes(r.tipo)).length,
      data: rows
    });
  } catch (err: any) {
    console.error("[estadisticas/multinivel GET] Error:", err.message);
    return NextResponse.json({ error: "Error interno: " + err.message }, { status: 500 });
  }
}
