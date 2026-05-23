import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";

const sanitize = (t: string | null | undefined) => {
  if (!t) return null;
  const s = String(t).trim().toLowerCase();
  if (!/^[a-z0-9_]+$/.test(s) || s.length === 0 || s.length > 63) return null;
  return s;
};

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const tenant = sanitize(token.tenant || getTenantFromRequest(request));
    if (!tenant) {
      return NextResponse.json({ error: "No se pudo detectar la organizacion" }, { status: 400 });
    }

    const archivoRes = await queryWithTenant(tenant,
      "SELECT snapshot FROM archivos_electorales WHERE id = $1",
      [params.id]
    );

    if (archivoRes.rows.length === 0) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    const rawSnapshot = archivoRes.rows[0].snapshot;
    const snapshot = typeof rawSnapshot === 'string' ? JSON.parse(rawSnapshot) : rawSnapshot;
    const ciudadanos = snapshot.ciudadanos || [];
    const sectores = snapshot.sectores || [];

    console.log("[archivos/restaurar] Restaurando", ciudadanos.length, "ciudadanos y", sectores.length, "sectores");

    const client = await pool.connect();
    try {
      await client.query(`SET search_path TO "${tenant}", public`);
      await client.query('BEGIN');

      // Eliminar datos actuales
      await client.query("DELETE FROM ciudadanos");
      await client.query("DELETE FROM sectores");

      // Restaurar ciudadanos
      for (const c of ciudadanos) {
        await client.query(
          `INSERT INTO ciudadanos (
            id_unico, nombre_completo, telefono, sexo, edad, nivel_estudios, ocupacion,
            regimen_salud, puesto_votacion, problematica_principal, zona, id_comuna, id_barrio,
            barrio, corregimiento, vereda, es_lider, nombre_lider, lider_id, latitud, longitud,
            registrado_por, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
          [
            c.id_unico,
            c.nombre_completo,
            c.telefono,
            c.sexo,
            c.edad,
            c.nivel_estudios,
            c.ocupacion,
            c.regimen_salud,
            c.puesto_votacion,
            c.problematica_principal,
            c.zona || 'urbana',
            c.id_comuna || null,
            c.id_barrio || null,
            c.barrio,
            c.corregimiento,
            c.vereda,
            c.es_lider,
            c.nombre_lider,
            c.lider_id || null,
            c.latitud || null,
            c.longitud || null,
            c.registrado_por,
            c.created_at || new Date().toISOString(),
          ]
        );
      }

      // Restaurar sectores
      for (const s of sectores) {
        await client.query(
          `INSERT INTO sectores (
            nombre, meta, votos_historicos, descripcion, zona, comuna_id, barrio_id,
            poligono, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            s.nombre,
            s.meta,
            s.votos_historicos || 0,
            s.descripcion,
            s.zona || 'urbana',
            s.comuna_id || null,
            s.barrio_id || null,
            s.poligono ? JSON.stringify(s.poligono) : null,
            s.created_at || new Date().toISOString(),
          ]
        );
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: `Archivo restaurado: ${ciudadanos.length} ciudadanos y ${sectores.length} sectores recuperados.`,
        ciudadanos_restaurados: ciudadanos.length,
        sectores_restaurados: sectores.length,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("[archivos/restaurar] Error:", err);
    return NextResponse.json({ error: "Error al restaurar archivo" }, { status: 500 });
  }
}
