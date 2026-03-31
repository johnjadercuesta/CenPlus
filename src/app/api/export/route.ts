import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const data = db.prepare("SELECT * FROM ciudadanos ORDER BY created_at DESC").all() as Record<string, unknown>[];

    if (data.length === 0) {
      return NextResponse.json({ error: "No hay datos para exportar" }, { status: 404 });
    }

    const headers = [
      "ID", "Cédula", "Nombre Completo", "Teléfono", "Sexo", "Edad",
      "Nivel de Estudios", "Ocupación", "Barrio", "Corregimiento",
      "Vereda", "Es Líder", "Latitud", "Longitud", "Fecha Registro",
    ];

    const csvRows = [
      headers.join(","),
      ...data.map((row) =>
        [
          row.id,
          `"${row.id_unico}"`,
          `"${row.nombre_completo}"`,
          `"${row.telefono || ""}"`,
          row.sexo || "",
          row.edad || "",
          row.nivel_estudios || "",
          `"${row.ocupacion || ""}"`,
          `"${row.barrio}"`,
          `"${row.corregimiento}"`,
          `"${row.vereda || ""}"`,
          row.es_lider ? "Sí" : "No",
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
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="cenplus_export_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al generar exportación" }, { status: 500 });
  }
}
