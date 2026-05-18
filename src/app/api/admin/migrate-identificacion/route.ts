import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }

    const results: string[] = [];

    // 1. Add identificacion to public.user_tenants
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.user_tenants (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          tenant VARCHAR(63) NOT NULL,
          identificacion VARCHAR(50),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      results.push("public.user_tenants: tabla creada/verificada");
    } catch (e: any) {
      results.push("public.user_tenants: " + (e.message || "error"));
    }

    try {
      await pool.query(`
        ALTER TABLE public.user_tenants 
        ADD COLUMN IF NOT EXISTS identificacion VARCHAR(50)
      `);
      await pool.query(`
        UPDATE public.user_tenants 
        SET identificacion = email 
        WHERE identificacion IS NULL
      `);
      results.push("public.user_tenants: columna identificacion lista");
    } catch (e: any) {
      results.push("public.user_tenants update: " + (e.message || "error"));
    }

    // 2. Get all tenant schemas
    const { rows: schemas } = await pool.query(`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'public') 
        AND schema_name NOT LIKE 'pg_%'
    `);

    results.push(`Encontrados ${schemas.length} esquemas de tenants`);

    for (const schema of schemas) {
      const schemaName = schema.schema_name;
      try {
        await pool.query(`
          ALTER TABLE "${schemaName}".admins 
          ADD COLUMN IF NOT EXISTS identificacion VARCHAR(50)
        `);
        await pool.query(`
          UPDATE "${schemaName}".admins 
          SET identificacion = email 
          WHERE identificacion IS NULL
        `);
        results.push(`${schemaName}.admins: columna identificacion añadida`);
      } catch (e: any) {
        results.push(`${schemaName}.admins: ${e.message || "error"}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Migracion completada",
      results,
    });
  } catch (err: any) {
    console.error("[migrate-identificacion] Error:", err);
    return NextResponse.json(
      { error: "Error en migracion: " + (err?.message || "Desconocido") },
      { status: 500 }
    );
  }
}
