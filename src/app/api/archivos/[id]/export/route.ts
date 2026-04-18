import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const archivoRes = await pool.query(
      "SELECT nombre, snapshot FROM archivos_electorales WHERE id = $1",
      [params.id]
    );

    if (archivoRes.rows.length === 0) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    const archivo = archivoRes.rows[0];
    const ciudadanos = archivo.snapshot.ciudadanos || [];

    if (ciudadanos.length === 0) {
      return NextResponse.json({ error: "No hay datos para exportar" }, { status: 404 });
    }

    const headers = [
      "ID", "Cédula", "Nombre Completo", "Teléfono", "Sexo", "Edad",
      "Nivel de Estudios", "Ocupación", "Régimen Salud", "Puesto Votación",
      "Problemática Principal", "Comuna", "Barrio", "Corregimiento",
      "Vereda", "Es Líder", "Latitud", "Longitud", "Fecha Registro",
    ];

    const csvRows = [
      headers.join(","),
      ...ciudadanos.map((row: any) =>
        [
          row.id,
          `"${row.id_unico}"`,
          `"${row.nombre_completo}"`,
          `"${row.telefono || ""}"`,
          row.sexo || "",
          row.edad || "",
          row.nivel_estudios || "",
          `"${row.ocupacion || ""}"`,
          `"${row.regimen_salud || ""}"`,
          `"${row.puesto_votacion || ""}"`,
          `"${row.problematica_principal || ""}"`,
          row.id_comuna || "",
          `"${row.barrio}"`,
          `"${row.corregimiento}"`,
          `"${row.vereda || ""}"`,
          row.es_lider === 1 ? "Sí" : "No",
          row.latitud || "",
          row.longitud || "",
          row.created_at
            ? new Date(row.created_at as string).toLocaleDateString("es-CO")
            : "",
        ].join(",")
      ),
    ];

    const csvContent = csvRows.join("\n");
    const bom = "\uFEFF";
    const safeName = archivo.nombre.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, "").replace(/\s+/g, "_");

    return new NextResponse(bom + csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="archivo_${safeName}_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (err: any) {
    console.error("[archivos/export] Error:", err);
    return NextResponse.json({ error: "Error al exportar archivo" }, { status: 500 });
  }
}
