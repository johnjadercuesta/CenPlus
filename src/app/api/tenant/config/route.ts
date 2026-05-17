import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getTokenFromRequest } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    let tenant = getTenantFromRequest(request);
    
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
        logo_url: null 
      });
    }

    const { rows } = await pool.query(
      "SELECT primary_color, secondary_color, logo_url, config FROM public.tenants_config WHERE tenant = $1",
      [tenant]
    );

    if (rows.length === 0) {
      return NextResponse.json({ 
        primary_color: '#162749', 
        secondary_color: '#6366f1',
        logo_url: null 
      });
    }

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    // Si la tabla no existe, intentamos crearla (auto-migraciÃ³n)
    if (error.message.includes('relation "public.tenants_config" does not exist')) {
      try {
        console.log("ðŸ› ï¸ Detectada falta de tabla public.tenants_config. CreÃ¡ndola...");
        await pool.query(`
          CREATE TABLE IF NOT EXISTS public.tenants_config (
            tenant VARCHAR(63) PRIMARY KEY,
            primary_color VARCHAR(7) DEFAULT '#162749',
            secondary_color VARCHAR(7) DEFAULT '#6366f1',
            logo_url TEXT,
            config JSONB DEFAULT '{}',
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `);
        return NextResponse.json({ 
          primary_color: '#162749', 
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
