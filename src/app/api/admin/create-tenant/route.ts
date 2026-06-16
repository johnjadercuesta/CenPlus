import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { sanitizeTenantValue } from '@/lib/tenant';
import bcrypt from 'bcryptjs';

const SUPER_KEY = process.env.SUPER_ADMIN_KEY || '';

/**
 * Strict Authorization:
 * ONLY allows access if SUPER_ADMIN_KEY is set in environment AND matches the header.
 */
function isAuthorized(request: NextRequest): boolean {
  if (!SUPER_KEY) return false; // Block if key is missing in env
  const key = request.headers.get('x-super-key') || '';
  return key === SUPER_KEY;
}

/**
 * POST /api/admin/create-tenant
 * 
 * Crear un nuevo tenant (schema + admin user)
 * 
 * Body:
 * {
 *   "name": "municipio1",
 *   "email": "admin@municipio1.com",
 *   "password": "SecurePassword123!",
 *   "fullName": "Admin User" (opcional)
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "tenant": "municipio1",
 *   "message": "Tenant creado exitosamente",
 *   "credentials": {
 *     "email": "admin@municipio1.com",
 *     "role": "administrador",
 *     "password": "[masked]"
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  // Check authorization (STRICT)
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Acceso Denegado. Se requiere SUPER_ADMIN_KEY válida.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { name, email, password, fullName } = body;

    // Validaciones
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: name, email, password' },
        { status: 400 }
      );
    }

    // Sanitizar nombre del tenant
    const sanitizedName = sanitizeTenantValue(name);
    if (!sanitizedName) {
      return NextResponse.json(
        { error: 'Nombre de tenant inválido. Usa solo letras, números y guiones.' },
        { status: 400 }
      );
    }

    // Validar email
    if (!email.includes('@')) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      );
    }

    // Validar password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Verificar que el schema no exista
      const checkSchema = await client.query(
        `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
        [sanitizedName]
      );

      if (checkSchema.rows.length > 0) {
        return NextResponse.json(
          { error: `El tenant '${sanitizedName}' ya existe` },
          { status: 409 }
        );
      }

      // Crear schema
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${sanitizedName}"`);

      // Cambiar search_path
      await client.query(`SET search_path TO "${sanitizedName}", public`);

      // Crear tabla de admins
      await client.query(`
        CREATE TABLE IF NOT EXISTS admins (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          identificacion VARCHAR(50) UNIQUE,
          nombre VARCHAR(255) NOT NULL DEFAULT '',
          role VARCHAR(50) NOT NULL DEFAULT 'lider',
          password VARCHAR(255) NOT NULL,
          telefono VARCHAR(20),
          activo INT NOT NULL DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT admins_role_check CHECK (role IN ('administrador', 'estratega', 'lider'))
        )
      `);

      // Crear tabla de ciudadanos (igual a public)
      await client.query(`
        CREATE TABLE IF NOT EXISTS ciudadanos (
          id SERIAL,
          id_unico VARCHAR(50) NOT NULL,
          nombre_completo VARCHAR(255) NOT NULL,
          telefono VARCHAR(50),
          sexo VARCHAR(20),
          edad INT,
          nivel_estudios VARCHAR(100),
          ocupacion VARCHAR(255),
          regimen_salud VARCHAR(100),
          puesto_votacion VARCHAR(255),
          problematica_principal VARCHAR(255),
          id_comuna INT,
          id_barrio INT,
          barrio VARCHAR(255) NOT NULL,
          corregimiento VARCHAR(255) NOT NULL,
          vereda VARCHAR(255),
          es_lider INT DEFAULT 0,
          nombre_lider VARCHAR(255),
          lider_id INT,
          latitud DOUBLE PRECISION,
          longitud DOUBLE PRECISION,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          zona VARCHAR(50) DEFAULT 'urbana',
          PRIMARY KEY (id),
          CONSTRAINT ciudadanos_id_unico_key UNIQUE (id_unico),
          CONSTRAINT ciudadanos_edad_check CHECK (edad > 0 AND edad < 150),
          CONSTRAINT ciudadanos_nivel_estudios_check CHECK (nivel_estudios IN ('Ninguno', 'Primaria', 'Secundaria', 'Técnico', 'Universitario', 'Posgrado')),
          CONSTRAINT ciudadanos_regimen_salud_check CHECK (regimen_salud IN ('Subsidiado', 'Contributivo', 'Ninguno', 'Otro')),
          CONSTRAINT ciudadanos_sexo_check CHECK (sexo IN ('Masculino', 'Femenino', 'Otro')),
          CONSTRAINT ciudadanos_zona_check CHECK (zona IN ('urbana', 'rural'))
        )
      `);

      // Crear tabla de comunas
      await client.query(`
        CREATE TABLE IF NOT EXISTS comunas (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(255) NOT NULL UNIQUE,
          tipo VARCHAR(50) DEFAULT 'urbana',
          CONSTRAINT comunas_tipo_check CHECK (tipo IN ('urbana', 'rural'))
        )
      `);

      // Crear tabla de barrios
      await client.query(`
        CREATE TABLE IF NOT EXISTS barrios (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(255) NOT NULL,
          comuna_id INT NOT NULL REFERENCES comunas(id) ON DELETE CASCADE,
          tipo VARCHAR(50) DEFAULT 'barrio',
          poligono TEXT,
          CONSTRAINT barrios_tipo_check CHECK (tipo IN ('barrio', 'vereda')),
          CONSTRAINT barrios_nombre_comuna_id_key UNIQUE (nombre, comuna_id)
        )
      `);

      // Crear tabla de puestos de votación
      await client.query(`
        CREATE TABLE IF NOT EXISTS puestos_votacion (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(255) NOT NULL UNIQUE,
          comuna_id INT,
          votos_historicos INT DEFAULT 0
        )
      `);

      // Crear tabla de problemáticas sociales
      await client.query(`
        CREATE TABLE IF NOT EXISTS problematicas_sociales (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(255) NOT NULL UNIQUE
        )
      `);

      // Crear tabla de sectores
      await client.query(`
        CREATE TABLE IF NOT EXISTS sectores (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(255) NOT NULL,
          votos_historicos INT DEFAULT 0,
          meta INT NOT NULL DEFAULT 100,
          latitud DOUBLE PRECISION NOT NULL,
          longitud DOUBLE PRECISION NOT NULL,
          radio DOUBLE PRECISION NOT NULL DEFAULT 2000,
          poligono TEXT,
          color VARCHAR(50) NOT NULL DEFAULT '#3b82f6',
          activo INT NOT NULL DEFAULT 1,
          descripcion TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          zona VARCHAR(50) DEFAULT 'urbana',
          comuna_id INT REFERENCES comunas(id) ON DELETE SET NULL,
          barrio_id INT REFERENCES barrios(id) ON DELETE SET NULL,
          CONSTRAINT sectores_zona_check CHECK (zona IN ('urbana', 'rural'))
        )
      `);

      // Crear tabla de archivos electorales
      await client.query(`
        CREATE TABLE IF NOT EXISTS archivos_electorales (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(255) NOT NULL,
          descripcion TEXT,
          fecha_corte DATE NOT NULL,
          fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          total_ciudadanos INT DEFAULT 0,
          total_lideres INT DEFAULT 0,
          total_sectores INT DEFAULT 0,
          snapshot JSONB NOT NULL,
          creado_por INT REFERENCES admins(id)
        )
      `);

      // Crear tabla de config
      await client.query(`
        CREATE TABLE IF NOT EXISTS config (
          clave VARCHAR(100) PRIMARY KEY,
          valor TEXT NOT NULL
        )
      `);

      // Crear tabla de trendsmap_entries
      await client.query(`
        CREATE TABLE IF NOT EXISTS trendsmap_entries (
          id SERIAL PRIMARY KEY,
          text TEXT NOT NULL,
          hashtags TEXT[] DEFAULT '{}',
          latitude DOUBLE PRECISION NOT NULL,
          longitude DOUBLE PRECISION NOT NULL,
          pais VARCHAR(100) DEFAULT 'Colombia',
          departamento VARCHAR(100),
          municipio VARCHAR(100),
          verificado BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          expires_at TIMESTAMP WITH TIME ZONE,
          barrio VARCHAR(200),
          comuna VARCHAR(100),
          mentioned_profiles TEXT[] DEFAULT '{}',
          mentioned_sites TEXT[] DEFAULT '{}'
        )
      `);

      // FK para ciudadanos (despues de crear admins)
      await client.query(`
        ALTER TABLE ciudadanos ADD CONSTRAINT ciudadanos_lider_id_fkey
        FOREIGN KEY (lider_id) REFERENCES admins(id)
      `);



      // Índices ciudadanos
      await client.query(`CREATE INDEX IF NOT EXISTS idx_barrio ON ciudadanos(barrio)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_ced ON ciudadanos(id_unico)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_ciudadanos_lider ON ciudadanos(lider_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_ciudadanos_zona ON ciudadanos(zona)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_ciudadanos_comuna ON ciudadanos(id_comuna)`);

      // Índices admins
      await client.query(`CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email)`);

      // Índices archivos
      await client.query(`CREATE INDEX IF NOT EXISTS idx_archivos_creado_por ON archivos_electorales(creado_por)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_archivos_fecha ON archivos_electorales(fecha_corte DESC)`);

      // Índices trendsmap
      await client.query(`CREATE INDEX IF NOT EXISTS idx_trendsmap_created ON trendsmap_entries(created_at DESC)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_trendsmap_depto ON trendsmap_entries(departamento)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_trendsmap_expires ON trendsmap_entries(expires_at)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_trendsmap_hashtags ON trendsmap_entries USING GIN(hashtags)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_trendsmap_lat_lng ON trendsmap_entries(latitude, longitude)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_trendsmap_mentioned_profiles ON trendsmap_entries USING GIN(mentioned_profiles)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_trendsmap_mentioned_sites ON trendsmap_entries USING GIN(mentioned_sites)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_trendsmap_municipio ON trendsmap_entries(municipio)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_trendsmap_text_tsv ON trendsmap_entries USING GIN(to_tsvector('spanish', COALESCE(text, '')))`);
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS trendsmap_unique_entry
        ON trendsmap_entries(text, latitude, longitude)
      `);

      // Crear admin principal
      const adminPassHash = await bcrypt.hash(password, 10);
      await client.query(
        `INSERT INTO admins (email, identificacion, nombre, role, password, telefono, activo)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [email, email, fullName || 'Admin User', 'administrador', adminPassHash, '', 1]
      );

      // Crear 2 admins adicionales de test (opcional)
      const testPassHash = await bcrypt.hash('admin123', 10);
      await client.query(
        `INSERT INTO admins (email, identificacion, nombre, role, password, telefono, activo)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['estratega@cenplus.com', 'estratega@cenplus.com', 'Estratega Test', 'estratega', testPassHash, '', 1]
      );
      await client.query(
        `INSERT INTO admins (email, identificacion, nombre, role, password, telefono, activo)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['lider@cenplus.com', 'lider@cenplus.com', 'Líder Test', 'lider', testPassHash, '', 1]
      );

      // Crear tabla global de mapeo usuario→tenant (si no existe)
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.user_tenants (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          tenant VARCHAR(63) NOT NULL,
          identificacion VARCHAR(50),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_user_tenants_email ON public.user_tenants(email)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_user_tenants_identificacion ON public.user_tenants(identificacion)
      `);

      // Registrar los usuarios en la tabla global
      // Registrar admin principal
      await client.query(
        `INSERT INTO public.user_tenants (email, tenant, identificacion) VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET tenant = $2, identificacion = $3`,
        [email, sanitizedName, email]
      );

      // Registrar configuración inicial del tenant (colores, logo, activo)
      await client.query(
        `INSERT INTO public.tenants_config (tenant, primary_color, secondary_color, activo, session_version, font_family)
         VALUES ($1, $2, $3, true, 0, $4)
         ON CONFLICT (tenant) DO NOTHING`,
        [sanitizedName, '#3b82f6', '#6366f1', 'Inter']
      );
      
      // Registrar usuario estratega
      await client.query(
        `INSERT INTO public.user_tenants (email, tenant, identificacion) VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET tenant = $2, identificacion = $3`,
        ['estratega@cenplus.com', sanitizedName, 'estratega@cenplus.com']
      );
      
      // Registrar usuario líder
      await client.query(
        `INSERT INTO public.user_tenants (email, tenant, identificacion) VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET tenant = $2, identificacion = $3`,
        ['lider@cenplus.com', sanitizedName, 'lider@cenplus.com']
      );

      client.release();

      return NextResponse.json({
        success: true,
        tenant: sanitizedName,
        message: `Tenant '${sanitizedName}' creado exitosamente`,
        credentials: {
          email: email,
          identificacion: email,
          role: 'administrador',
          password: '[masked]',
          testUsers: [
            { email: 'estratega@cenplus.com', identificacion: 'estratega@cenplus.com', password: 'admin123' },
            { email: 'lider@cenplus.com', identificacion: 'lider@cenplus.com', password: 'admin123' }
          ]
        },
        nextSteps: [
          `1. Accede con: POST /api/auth/login`,
          `2. Body: { "identificacion": "${email}", "password": "[tu password]", "tenant": "${sanitizedName}" }`,
          `3. Recibiras JWT token`
        ]
      }, { status: 201 });

    } catch (dbError) {
      client.release();
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: `Error en base de datos: ${(dbError as any).message}` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Create tenant error:', error);
    return NextResponse.json(
      { error: `Error: ${(error as any).message}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/create-tenant
 * Info sobre el endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/admin/create-tenant',
    method: 'POST',
    description: 'Crear un nuevo tenant con schema y admin user',
    requiredFields: ['name', 'email', 'password'],
    optionalFields: ['fullName'],
    example: {
      url: 'POST /api/admin/create-tenant',
      body: {
        name: 'municipio1',
        email: 'admin@municipio1.com',
        password: 'SecurePassword123!',
        fullName: 'Admin User'
      },
      response: {
        success: true,
        tenant: 'municipio1',
        message: 'Tenant creado exitosamente',
        credentials: {
          email: 'admin@municipio1.com',
          role: 'administrador',
          testUsers: [
            { email: 'estratega@cenplus.com', password: 'admin123' },
            { email: 'lider@cenplus.com', password: 'admin123' }
          ]
        }
      }
    }
  });
}
