import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const tenant = getTenantFromRequest(request);
    
    if (!tenant) {
      return NextResponse.json({ 
        primary_color: '#3b82f6', 
        secondary_color: '#6366f1',
        logo_url: null 
      });
    }

    const { rows } = await pool.query(
      "SELECT primary_color, secondary_color, logo_url, config FROM public.tenants_config WHERE tenant = $1",
      [tenant]
    );

    if (rows.length === 0) {
      return NextResponse.json({ 
        primary_color: '#3b82f6', 
        secondary_color: '#6366f1',
        logo_url: null 
      });
    }

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    // Si la tabla no existe, intentamos crearla (auto-migración)
    if (error.message.includes('relation "public.tenants_config" does not exist')) {
      try {
        console.log("🛠️ Detectada falta de tabla public.tenants_config. Creándola...");
        await pool.query(`
          CREATE TABLE IF NOT EXISTS public.tenants_config (
            tenant VARCHAR(63) PRIMARY KEY,
            primary_color VARCHAR(7) DEFAULT '#3b82f6',
            secondary_color VARCHAR(7) DEFAULT '#6366f1',
            logo_url TEXT,
            config JSONB DEFAULT '{}',
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `);
        return NextResponse.json({ 
          primary_color: '#3b82f6', 
          secondary_color: '#6366f1',
          logo_url: null 
        });
      } catch (innerError) {
        return NextResponse.json({ error: "Error creando tabla de config: " + (innerError as any).message }, { status: 500 });
      }
    }
    return NextResponse.json({ error: (error as any).message }, { status: 500 });
  }
}
