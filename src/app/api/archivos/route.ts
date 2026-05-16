import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, descripcion, fecha_corte } = body;

    if (!nombre || !fecha_corte) {
      return NextResponse.json({ error: "Nombre y fecha de corte son obligatorios" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const ciudadanosRes = await client.query("SELECT * FROM ciudadanos ORDER BY created_at DESC");
      const lideresRes = await client.query("SELECT id, email, nombre, role, activo, created_at FROM admins ORDER BY id");
      const sectoresRes = await client.query("SELECT * FROM sectores ORDER BY id");
      const comunasRes = await client.query("SELECT * FROM comunas ORDER BY id");
      const barriosRes = await client.query("SELECT * FROM barrios ORDER BY id");
      const problematicasRes = await client.query("SELECT * FROM problematicas_sociales ORDER BY id");
      const puestosRes = await client.query("SELECT * FROM puestos_votacion ORDER BY id");
      const configRes = await client.query("SELECT * FROM config");

      const snapshot = {
        ciudadanos: ciudadanosRes.rows,
        lideres: lideresRes.rows,
        sectores: sectoresRes.rows,
        comunas: comunasRes.rows,
        barrios: barriosRes.rows,
        problematicas: problematicasRes.rows,
        puestos_votacion: puestosRes.rows,
        config: configRes.rows,
      };

      const result = await client.query(
        `INSERT INTO archivos_electorales (nombre, descripcion, fecha_corte, total_ciudadanos, total_lideres, total_sectores, snapshot, creado_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          nombre,
          descripcion || null,
          fecha_corte,
          ciudadanosRes.rows.length,
          lideresRes.rows.length,
          sectoresRes.rows.length,
          JSON.stringify(snapshot),
          token.userId,
        ]
      );

      // Limpiar datos actuales despuÃ©s de archivar
      await client.query("DELETE FROM ciudadanos");
      await client.query("DELETE FROM sectores");

      await client.query('COMMIT');

      const archivo = result.rows[0];

      return NextResponse.json({
        success: true,
        archivo: {
          id: archivo.id,
          nombre: archivo.nombre,
          fecha_corte: archivo.fecha_corte,
          fecha_creacion: archivo.fecha_creacion,
          total_ciudadanos: archivo.total_ciudadanos,
          total_lideres: archivo.total_lideres,
          total_sectores: archivo.total_sectores,
        },
        limpieza: {
          ciudadanos_eliminados: ciudadanosRes.rows.length,
          sectores_eliminados: sectoresRes.rows.length,
        },
      }, { status: 201 });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("[archivos] Error creando archivo:", err);
    return NextResponse.json({ error: "Error al crear archivo electoral" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { rows } = await pool.query(
      `SELECT a.*, ad.nombre as creado_por_nombre
       FROM archivos_electorales a
       LEFT JOIN admins ad ON a.creado_por = ad.id
       ORDER BY a.fecha_creacion DESC`
    );

    return NextResponse.json({ archivos: rows });
  } catch (err: any) {
    console.error("[archivos] Error listando archivos:", err);
    return NextResponse.json({ error: "Error al listar archivos" }, { status: 500 });
  }
}
