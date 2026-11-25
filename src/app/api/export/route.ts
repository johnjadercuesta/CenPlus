import { NextRequest, NextResponse } from "next/server";
import { requireAnyModule } from "@/lib/auth";
import { queryWithTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAnyModule(request, [
      "registros",
      "dashboard",
      "mapa",
      "archivos",
      "inteligencia",
    ]);
    if (auth.error) return auth.error;
    const tenant = auth.user.tenant;
    const run = (sql: string, params: any[] = []) => queryWithTenant(tenant, sql, params);

    const { rows: data } = await run("SELECT * FROM ciudadanos ORDER BY created_at DESC");

    if (data.length === 0) {
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
    
    // El navegador manejará la descarga si retornamos los headers correctos
    return new NextResponse(bom + csvContent, {
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
