import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getTokenFromRequest } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }

    const db = getDb();
    const id = params.id;
    const body = await request.json();

    // 1. Obtener el nombre actual del sector antes de actualizar
    const oldSector = db.prepare("SELECT nombre FROM sectores WHERE id = ?").get(id) as { nombre: string } | undefined;
    if (!oldSector) {
      return NextResponse.json({ error: "Sector no encontrado" }, { status: 404 });
    }
    const oldNombre = oldSector.nombre;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (body.nombre !== undefined) { 
      fields.push("nombre = ?"); 
      values.push(body.nombre); 
    }
    if (body.meta !== undefined) { fields.push("meta = ?"); values.push(parseInt(body.meta)); }
    if (body.radio !== undefined) { fields.push("radio = ?"); values.push(parseFloat(body.radio)); }
    if (body.activo !== undefined) { fields.push("activo = ?"); values.push(body.activo ? 1 : 0); }

    if (body.poligono !== undefined) {
      if (Array.isArray(body.poligono) && body.poligono.length >= 3) {
        fields.push("poligono = ?");
        values.push(JSON.stringify(body.poligono));
        // Update centroid
        const lat = body.poligono.reduce((sum: number, p: number[]) => sum + p[0], 0) / body.poligono.length;
        const lng = body.poligono.reduce((sum: number, p: number[]) => sum + p[1], 0) / body.poligono.length;
        fields.push("latitud = ?", "longitud = ?");
        values.push(lat, lng);
      }
    }

    if (body.latitud !== undefined && !body.poligono) { fields.push("latitud = ?"); values.push(parseFloat(body.latitud)); }
    if (body.longitud !== undefined && !body.poligono) { fields.push("longitud = ?"); values.push(parseFloat(body.longitud)); }

    if (fields.length === 0) {
      return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
    }

    // 2. Ejecutar actualización con transacción si el nombre ha cambiado
    const newNombre = body.nombre;
    const isChangingName = newNombre && newNombre !== oldNombre;

    const updateSectores = db.prepare(`UPDATE sectores SET ${fields.join(", ")} WHERE id = ?`);
    const updateCiudadanos = db.prepare(`UPDATE ciudadanos SET barrio = ? WHERE barrio = ? COLLATE NOCASE`);

    if (isChangingName) {
      const transaction = db.transaction((vals, newN, oldN) => {
        updateSectores.run(...vals, id);
        updateCiudadanos.run(newN, oldN);
      });
      transaction(values, newNombre, oldNombre);
    } else {
      updateSectores.run(...values, id);
    }

    const data = db.prepare("SELECT * FROM sectores WHERE id = ?").get(id) as Record<string, unknown>;
    if (data.poligono) data.poligono = JSON.parse(data.poligono as string);

    return NextResponse.json({ data, message: "Actualizado" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }

    const db = getDb();
    db.prepare("DELETE FROM sectores WHERE id = ?").run(params.id);
    return NextResponse.json({ message: "Eliminado" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
