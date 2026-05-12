import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sanitizeTenantValue } from '@/lib/tenant';
import bcrypt from 'bcryptjs';

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

      // Crear tablas en el schema
      await client.query(`
        SET search_path TO "${sanitizedName}", public;

        -- Tabla de admins/líderes
        CREATE TABLE IF NOT EXISTS admins (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          nombre VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'administrador',
          password_hash VARCHAR(255) NOT NULL,
          telefono VARCHAR(20),
          activo INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Tabla de ciudadanos
        CREATE TABLE IF NOT EXISTS ciudadanos (
          id_unico VARCHAR(50) PRIMARY KEY,
          nombre_completo VARCHAR(255),
          telefono VARCHAR(20),
          sexo CHAR(1),
          edad INT,
          nivel_estudios VARCHAR(100),
          ocupacion VARCHAR(255),
          regimen_salud VARCHAR(100),
          puesto_votacion VARCHAR(255),
          zona VARCHAR(50),
          id_comuna INT,
          id_barrio INT,
          es_lider INT DEFAULT 0,
          lider_id INT,
          latitud FLOAT,
          longitud FLOAT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Tabla de comunas
        CREATE TABLE IF NOT EXISTS comunas (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(255) NOT NULL,
          numero INT,
          activo INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT NOW()
        );

        -- Tabla de barrios
        CREATE TABLE IF NOT EXISTS barrios (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(255) NOT NULL,
          id_comuna INT REFERENCES comunas(id),
          activo INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT NOW()
        );

        -- Tabla de puestos de votación
        CREATE TABLE IF NOT EXISTS puestos_votacion (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(255) NOT NULL,
          id_comuna INT REFERENCES comunas(id),
          direccion TEXT,
          latitud FLOAT,
          longitud FLOAT,
          activo INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT NOW()
        );

        -- Tabla de problemáticas sociales
        CREATE TABLE IF NOT EXISTS problematicas_sociales (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(255) NOT NULL,
          descripcion TEXT,
          activo INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT NOW()
        );

        -- Índices para performance
        CREATE INDEX IF NOT EXISTS idx_ciudadanos_lider ON ciudadanos(lider_id);
        CREATE INDEX IF NOT EXISTS idx_ciudadanos_zona ON ciudadanos(zona);
        CREATE INDEX IF NOT EXISTS idx_ciudadanos_comuna ON ciudadanos(id_comuna);
        CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
      `);

      // Hash del password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Crear admin inicial
      await client.query(
        `
        SET search_path TO "${sanitizedName}", public;
        INSERT INTO admins (email, nombre, role, password_hash, telefono, activo)
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [email, fullName || 'Admin User', 'administrador', hashedPassword, '', 1]
      );

      // Crear 2 admins adicionales de test (opcional)
      const testPassHash = await bcrypt.hash('admin123', 10);
      await client.query(
        `
        SET search_path TO "${sanitizedName}", public;
        INSERT INTO admins (email, nombre, role, password_hash, telefono, activo)
        VALUES 
          ($1, $2, $3, $4, $5, $6),
          ($7, $8, $9, $10, $11, $12)
        `,
        [
          'estratega@cenplus.com', 'Estratega Test', 'estratega', testPassHash, '', 1,
          'lider@cenplus.com', 'Líder Test', 'lider', testPassHash, '', 1
        ]
      );

      // Crear tabla global de mapeo usuario→tenant (si no existe)
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.user_tenants (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          tenant VARCHAR(63) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_user_tenants_email ON public.user_tenants(email);
      `);

      // Registrar los usuarios en la tabla global
      await client.query(
        `INSERT INTO public.user_tenants (email, tenant) VALUES ($1, $2)
         ON CONFLICT (email) DO UPDATE SET tenant = $2`,
        [email, sanitizedName]
      );
      
      await client.query(
        `INSERT INTO public.user_tenants (email, tenant) VALUES ($1, $2), ($3, $4)
         ON CONFLICT (email) DO UPDATE SET tenant = EXCLUDED.tenant`,
        ['estratega@cenplus.com', sanitizedName, 'lider@cenplus.com', sanitizedName]
      );

      client.release();

      return NextResponse.json({
        success: true,
        tenant: sanitizedName,
        message: `Tenant '${sanitizedName}' creado exitosamente`,
        credentials: {
          email: email,
          role: 'administrador',
          password: '[masked]',
          testUsers: [
            { email: 'estratega@cenplus.com', password: 'admin123' },
            { email: 'lider@cenplus.com', password: 'admin123' }
          ]
        },
        nextSteps: [
          `1. Accede con: POST /api/auth/login`,
          `2. Body: { "email": "${email}", "password": "[tu password]", "tenant": "${sanitizedName}" }`,
          `3. Recibirás JWT token`
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
