const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '../.env.local');
let databaseUrl = process.env.DATABASE_URL;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) {
      databaseUrl = line.split('=')[1].trim().replace(/^"|"$/g, '');
      break;
    }
  }
}

if (!databaseUrl) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Main audit logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.audit_logs (
        id SERIAL PRIMARY KEY,
        tenant VARCHAR(63),
        user_id INTEGER,
        user_email VARCHAR(255),
        user_name VARCHAR(255),
        user_role VARCHAR(50),
        action VARCHAR(100) NOT NULL,
        module VARCHAR(100),
        resource_type VARCHAR(100),
        resource_id VARCHAR(255),
        old_value JSONB,
        new_value JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        device_info VARCHAR(255),
        browser VARCHAR(100),
        os VARCHAR(100),
        status VARCHAR(20) DEFAULT 'success',
        error_message TEXT,
        duration_ms INTEGER,
        severity VARCHAR(20) DEFAULT 'info',
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add missing columns if they don't exist (for existing tables)
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='user_id') THEN
          ALTER TABLE public.audit_logs ADD COLUMN user_id INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='resource_type') THEN
          ALTER TABLE public.audit_logs ADD COLUMN resource_type VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='resource_id') THEN
          ALTER TABLE public.audit_logs ADD COLUMN resource_id VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='old_value') THEN
          ALTER TABLE public.audit_logs ADD COLUMN old_value JSONB;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='new_value') THEN
          ALTER TABLE public.audit_logs ADD COLUMN new_value JSONB;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='ip_address') THEN
          ALTER TABLE public.audit_logs ADD COLUMN ip_address VARCHAR(45);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='user_agent') THEN
          ALTER TABLE public.audit_logs ADD COLUMN user_agent TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='device_info') THEN
          ALTER TABLE public.audit_logs ADD COLUMN device_info VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='browser') THEN
          ALTER TABLE public.audit_logs ADD COLUMN browser VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='os') THEN
          ALTER TABLE public.audit_logs ADD COLUMN os VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='status') THEN
          ALTER TABLE public.audit_logs ADD COLUMN status VARCHAR(20) DEFAULT 'success';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='error_message') THEN
          ALTER TABLE public.audit_logs ADD COLUMN error_message TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='duration_ms') THEN
          ALTER TABLE public.audit_logs ADD COLUMN duration_ms INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='severity') THEN
          ALTER TABLE public.audit_logs ADD COLUMN severity VARCHAR(20) DEFAULT 'info';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='metadata') THEN
          ALTER TABLE public.audit_logs ADD COLUMN metadata JSONB;
        END IF;
      END $$;
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_tenant ON public.audit_logs(tenant)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_logs(action)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_module ON public.audit_logs(module)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_severity ON public.audit_logs(severity)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_status ON public.audit_logs(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_ip ON public.audit_logs(ip_address)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_resource ON public.audit_logs(resource_type, resource_id)`);

    // Failed login attempts tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.failed_logins (
        id SERIAL PRIMARY KEY,
        tenant VARCHAR(63),
        identificacion VARCHAR(50),
        ip_address VARCHAR(45),
        user_agent TEXT,
        reason VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_failed_login_ip ON public.failed_logins(ip_address, created_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_failed_login_ident ON public.failed_logins(identificacion, created_at DESC)`);

    // Security alerts
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.security_alerts (
        id SERIAL PRIMARY KEY,
        tenant VARCHAR(63),
        alert_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        title VARCHAR(255),
        description TEXT,
        user_email VARCHAR(255),
        ip_address VARCHAR(45),
        metadata JSONB,
        is_resolved BOOLEAN DEFAULT FALSE,
        resolved_at TIMESTAMP,
        resolved_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_alert_severity ON public.security_alerts(severity, is_resolved)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_alert_created ON public.security_alerts(created_at DESC)`);

    // System events
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.system_events (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        source VARCHAR(100),
        message TEXT,
        severity VARCHAR(20) DEFAULT 'info',
        metadata JSONB,
        duration_ms INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_system_event_type ON public.system_events(event_type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_system_event_created ON public.system_events(created_at DESC)`);

    // Migrate old system_logs data to audit_logs
    try {
      await client.query(`
        INSERT INTO public.audit_logs (tenant, user_email, user_name, module, action, severity, created_at)
        SELECT tenant, usuario_email, usuario_nombre, modulo, accion, 'info', created_at
        FROM public.system_logs
        WHERE NOT EXISTS (
          SELECT 1 FROM public.audit_logs a 
          WHERE a.user_email = public.system_logs.usuario_email 
          AND a.action = public.system_logs.accion 
          AND a.created_at = public.system_logs.created_at
        )
      `);
      console.log('Migrated old logs to audit_logs');
    } catch (e) {
      console.log('No old logs to migrate or migration failed:', e.message);
    }

    await client.query('COMMIT');
    console.log('Audit system tables created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating audit tables:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
