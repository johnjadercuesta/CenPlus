import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireModule } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticación y módulo de configuración
    const auth = await requireModule(request, "configuracion");
    if (auth.error) return auth.error;
    const tenant = auth.user.tenant;

    const { primary_color, secondary_color, logo_url, font_family, config } = await request.json();

    // 2. Validar colores (formato hex)
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (primary_color && !hexRegex.test(primary_color)) {
      return NextResponse.json({ error: "Formato de color inválido." }, { status: 400 });
    }

    // 3. Validar tipo de fuente (lista blanca)
    const ALLOWED_FONTS = [
      'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat',
      'Poppins', 'Nunito', 'Work Sans', 'DM Sans', 'Plus Jakarta Sans'
    ];
    const finalFont = font_family || 'Inter';
    if (!ALLOWED_FONTS.includes(finalFont)) {
      return NextResponse.json({ error: `Tipo de fuente no válido. Opciones: ${ALLOWED_FONTS.join(', ')}` }, { status: 400 });
    }

    // 4. Actualizar o Insertar configuración
    await pool.query(
      `INSERT INTO public.tenants_config (tenant, primary_color, secondary_color, logo_url, font_family, config, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (tenant) DO UPDATE SET 
         primary_color = EXCLUDED.primary_color,
         secondary_color = EXCLUDED.secondary_color,
         logo_url = EXCLUDED.logo_url,
         font_family = EXCLUDED.font_family,
         config = EXCLUDED.config,
         updated_at = NOW()`,
      [tenant, primary_color || '#162749', secondary_color || '#6366f1', logo_url || null, finalFont, config || '{}']
    );

    return NextResponse.json({ success: true, message: "Configuración de marca actualizada." });
  } catch (error: any) {
    if (error.message.includes('relation "public.tenants_config" does not exist')) {
      try {
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
        // No hace falta reintentar el INSERT aquí, el usuario puede darle a Guardar de nuevo 
        // o podemos re-ejecutarlo. Por simplicidad, pedimos reintentar o lo hacemos:
        return NextResponse.json({ error: "La base de datos se estaba preparando. Por favor, dale a 'Guardar' una vez más." }, { status: 409 });
      } catch (e) {
        return NextResponse.json({ error: (e as any).message }, { status: 500 });
      }
    }
    return NextResponse.json({ error: (error as any).message }, { status: 500 });
  }
}
