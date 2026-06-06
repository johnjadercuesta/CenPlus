import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getTokenFromRequest } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    let tenant = getTenantFromRequest(request);
    
    // Fallback a query params para rutas públicas sin headers
    if (!tenant) {
      const { searchParams } = new URL(request.url);
      tenant = searchParams.get("tenant") || searchParams.get("t");
    }

    // Si no hay tenant en la URL/headers, intentar sacarlo del token del usuario actual
    if (!tenant || tenant === 'public') {
      const payload = getTokenFromRequest(request);
      if (payload && payload.tenant) {
        tenant = payload.tenant;
      }
    }
    
    if (!tenant || tenant === 'public') {
      return NextResponse.json({ 
        primary_color: '#162749', 
        secondary_color: '#6366f1',
        logo_url: null,
        font_family: 'Inter'
      });
    }

    const { rows } = await pool.query(
      "SELECT primary_color, secondary_color, logo_url, font_family, config FROM public.tenants_config WHERE tenant = $1",
      [tenant]
    );

    if (rows.length === 0) {
      return NextResponse.json({ 
        primary_color: '#162749', 
        secondary_color: '#6366f1',
        logo_url: null,
        font_family: 'Inter'
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
            font_family VARCHAR(255) DEFAULT 'Inter',
            config JSONB DEFAULT '{}',
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `);
        return NextResponse.json({ 
          primary_color: '#162749', 
          secondary_color: '#6366f1',
          logo_url: null,
          font_family: 'Inter'
        });
      } catch (innerError) {
        return NextResponse.json({ error: "Error creando tabla de config: " + (innerError as any).message }, { status: 500 });
      }
    }
    return NextResponse.json({ error: (error as any).message }, { status: 500 });
  }
}
