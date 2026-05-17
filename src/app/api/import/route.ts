import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest, tokenMatchesTenant } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!tokenMatchesTenant(token, request)) return NextResponse.json({ error: "Acceso no autorizado para esta organización" }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const mode = formData.get("mode") as string || "append";

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó archivo" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: "El archivo está vacío o no tiene datos" }, { status: 400 });
    }

    const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());

    const idUnicoIdx = headers.findIndex((h) => h.toLowerCase().includes("cédula") || h.toLowerCase() === "id_unico" || h.toLowerCase() === "id unico");
    const nombreIdx = headers.findIndex((h) => h.toLowerCase().includes("nombre"));
    const telefonoIdx = headers.findIndex((h) => h.toLowerCase().includes("teléfono") || h.toLowerCase() === "telefono");
    const sexoIdx = headers.findIndex((h) => h.toLowerCase() === "sexo");
    const edadIdx = headers.findIndex((h) => h.toLowerCase() === "edad");
    const nivelIdx = headers.findIndex((h) => h.toLowerCase().includes("nivel") || h.toLowerCase().includes("estudios"));
    const ocupacionIdx = headers.findIndex((h) => h.toLowerCase().includes("ocupación") || h.toLowerCase() === "ocupacion");
    const regimenIdx = headers.findIndex((h) => h.toLowerCase().includes("régimen") || h.toLowerCase().includes("regimen") || h.toLowerCase().includes("salud"));
    const puestoIdx = headers.findIndex((h) => h.toLowerCase().includes("puesto"));
    const problematicaIdx = headers.findIndex((h) => h.toLowerCase().includes("problemática") || h.toLowerCase().includes("problematica"));
    const comunaIdx = headers.findIndex((h) => h.toLowerCase().includes("comuna"));
    const barrioIdx = headers.findIndex((h) => h.toLowerCase() === "barrio");
    const corregimientoIdx = headers.findIndex((h) => h.toLowerCase() === "corregimiento");
    const veredaIdx = headers.findIndex((h) => h.toLowerCase() === "vereda");
    const esLiderIdx = headers.findIndex((h) => h.toLowerCase().includes("líder") || h.toLowerCase().includes("es lider") || h.toLowerCase() === "es_lider");
    const latIdx = headers.findIndex((h) => h.toLowerCase().includes("latitud") || h.toLowerCase() === "lat");
    const lngIdx = headers.findIndex((h) => h.toLowerCase().includes("longitud") || h.toLowerCase() === "lng" || h.toLowerCase() === "lon");

    if (idUnicoIdx === -1 || nombreIdx === -1) {
      return NextResponse.json({ error: "El CSV debe tener al menos las columnas Cédula y Nombre" }, { status: 400 });
    }

    const liderId = token.role === "administrador" ? token.userId : token.userId;
    let importados = 0;
    let duplicados = 0;
    let errores = 0;

    const tenant = getTenantFromRequest(request);
    const run = (sql: string, params: any[] = []) => (tenant ? queryWithTenant(tenant, sql, params) : pool.query(sql, params));

    if (mode === "replace") {
      await run("DELETE FROM ciudadanos");
    }

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < 2) continue;

      const idUnico = values[idUnicoIdx]?.replace(/"/g, "").trim();
      const nombre = values[nombreIdx]?.replace(/"/g, "").trim();

      if (!idUnico || !nombre) {
        errores++;
        continue;
      }

      try {
        const existing = await run("SELECT id FROM ciudadanos WHERE id_unico = $1", [idUnico]);
        if (existing.rows.length > 0) {
          duplicados++;
          continue;
        }

        const sexo = sexoIdx >= 0 ? values[sexoIdx]?.replace(/"/g, "").trim() : null;
        const edad = edadIdx >= 0 ? parseInt(values[edadIdx]) || null : null;
        const nivel = nivelIdx >= 0 ? values[nivelIdx]?.replace(/"/g, "").trim() : null;
        const ocupacion = ocupacionIdx >= 0 ? values[ocupacionIdx]?.replace(/"/g, "").trim() : null;
        const regimen = regimenIdx >= 0 ? values[regimenIdx]?.replace(/"/g, "").trim() : null;
        const puesto = puestoIdx >= 0 ? values[puestoIdx]?.replace(/"/g, "").trim() : null;
        const problematica = problematicaIdx >= 0 ? values[problematicaIdx]?.replace(/"/g, "").trim() : null;
        const comuna = comunaIdx >= 0 ? parseInt(values[comunaIdx]) || null : null;
        const barrio = barrioIdx >= 0 ? values[barrioIdx]?.replace(/"/g, "").trim() : "";
        const corregimiento = corregimientoIdx >= 0 ? values[corregimientoIdx]?.replace(/"/g, "").trim() : "";
        const vereda = veredaIdx >= 0 ? values[veredaIdx]?.replace(/"/g, "").trim() : null;
        const esLiderVal = esLiderIdx >= 0 ? values[esLiderIdx]?.replace(/"/g, "").trim() : "No";
        const esLider = esLiderVal === "Sí" || esLiderVal === "Sí" || esLiderVal === "true" || esLiderVal === "1" ? 1 : 0;
        const telefono = telefonoIdx >= 0 ? values[telefonoIdx]?.replace(/"/g, "").trim() : null;
        const lat = latIdx >= 0 ? parseFloat(values[latIdx]) || null : null;
        const lng = lngIdx >= 0 ? parseFloat(values[lngIdx]) || null : null;

        await run(
          `INSERT INTO ciudadanos (
            id_unico, nombre_completo, telefono, sexo, edad,
            nivel_estudios, ocupacion, regimen_salud, puesto_votacion,
            problematica_principal, id_comuna, barrio,
            corregimiento, vereda, es_lider, lider_id,
            latitud, longitud, zona
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
          [
            idUnico, nombre, telefono, sexo, edad,
            nivel, ocupacion, regimen, puesto,
            problematica, comuna, barrio,
            corregimiento, vereda, esLider, liderId,
            lat, lng, "urbana"
          ]
        );
        importados++;
      } catch (err) {
        errores++;
      }
    }

    return NextResponse.json({
      success: true,
      importados,
      duplicados,
      errores,
      total_lineas: lines.length - 1,
    });
  } catch (err: any) {
    console.error("[import] Error:", err);
    return NextResponse.json({ error: "Error al importar datos" }, { status: 500 });
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
