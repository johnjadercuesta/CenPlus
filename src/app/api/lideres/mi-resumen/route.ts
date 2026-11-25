import { NextRequest, NextResponse } from "next/server";
import { requireModule } from "@/lib/auth";
import { queryWithTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireModule(request, "mi-panel");
    if (auth.error) return auth.error;
    const user = auth.user;

    const tenant = user.tenant;
    const liderId = user.userId;

    // 1. Meta y datos del líder
    const { rows: liderRows } = await queryWithTenant(
      tenant,
      "SELECT id, nombre, email, role, activo FROM admins WHERE id = $1",
      [liderId]
    );

    // 2. Conteo de ciudadanos registrados por este líder
    const { rows: countRows } = await queryWithTenant(
      tenant,
      `SELECT 
        COUNT(*)::int AS total_registrados,
        COUNT(CASE WHEN zona = 'urbana' THEN 1 END)::int AS urbanos,
        COUNT(CASE WHEN zona = 'rural' THEN 1 END)::int AS rurales
       FROM ciudadanos 
       WHERE lider_id = $1`,
      [liderId]
    );

    // 3. Obtener meta del sector o meta personalizada
    let meta = 50; // Meta por defecto para líderes de base
    try {
      const { rows: metaRows } = await queryWithTenant(
        tenant,
        "SELECT valor FROM config WHERE clave = 'meta_lider_default'",
        []
      );
      if (metaRows.length > 0) {
        meta = parseInt(metaRows[0].valor) || 50;
      }
    } catch {
      // Usar valor por defecto
    }

    // 4. Últimos ciudadanos registrados para acceso rápido móvil
    const { rows: ultimosRegistros } = await queryWithTenant(
      tenant,
      `SELECT id, id_unico, nombre_completo, telefono, barrio, vereda, corregimiento, zona, created_at
       FROM ciudadanos 
       WHERE lider_id = $1 
       ORDER BY created_at DESC 
       LIMIT 100`,
      [liderId]
    );

    // 5. Apoyos electorales aportados por este líder a la fórmula
    const { rows: apoyosAportados } = await queryWithTenant(
      tenant,
      `SELECT c.nombre AS candidato_nombre, c.corporacion, c.numero_tarjeton, COUNT(a.id)::int AS total
       FROM apoyos_electorales a
       JOIN corporaciones_candidatos c ON c.id = a.candidato_id
       WHERE a.lider_id = $1
       GROUP BY c.id, c.nombre, c.corporacion, c.numero_tarjeton
       ORDER BY total DESC`,
      [liderId]
    );

    const stats = countRows[0] || { total_registrados: 0, urbanos: 0, rurales: 0 };
    const porcentaje = Math.min(100, Math.round((stats.total_registrados / meta) * 100));

    return NextResponse.json({
      lider: liderRows[0] || { id: liderId, nombre: user.nombre },
      meta,
      progreso: {
        total: stats.total_registrados,
        porcentaje,
        urbanos: stats.urbanos,
        rurales: stats.rurales,
        restantes: Math.max(0, meta - stats.total_registrados)
      },
      registros: ultimosRegistros,
      apoyos: apoyosAportados
    });
  } catch (err: any) {
    console.error("[lideres/mi-resumen GET] Error:", err.message);
    return NextResponse.json({ error: "Error interno: " + err.message }, { status: 500 });
  }
}
