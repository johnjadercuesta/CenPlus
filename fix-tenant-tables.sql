SET search_path TO testorg;

DROP TABLE IF EXISTS archivos_electorales CASCADE;
DROP TABLE IF EXISTS sectores CASCADE;
DROP TABLE IF EXISTS config CASCADE;
DROP TABLE IF EXISTS trendsmap_entries CASCADE;

-- Copy exact public schema structure
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
  creado_por INT,
  CONSTRAINT fk_creado_por FOREIGN KEY (creado_por) REFERENCES admins(id)
);
CREATE INDEX IF NOT EXISTS idx_archivos_creado_por ON archivos_electorales(creado_por);
CREATE INDEX IF NOT EXISTS idx_archivos_fecha ON archivos_electorales(fecha_corte DESC);

CREATE TABLE IF NOT EXISTS sectores (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  meta INT DEFAULT 0,
  votos_historicos INT DEFAULT 0,
  latitud DOUBLE PRECISION,
  longitud DOUBLE PRECISION,
  radio DOUBLE PRECISION DEFAULT 2000,
  poligono TEXT,
  color VARCHAR(7) DEFAULT '#3b82f6',
  activo INT DEFAULT 1,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  zona VARCHAR(50),
  comuna_id INT,
  barrio_id INT
);

CREATE TABLE IF NOT EXISTS config (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trendsmap_entries (
  id SERIAL PRIMARY KEY,
  text TEXT,
  hashtags TEXT[],
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  departamento VARCHAR(255),
  municipio VARCHAR(255),
  pais VARCHAR(255) DEFAULT 'Colombia',
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  barrio VARCHAR(255),
  comuna VARCHAR(255),
  mentioned_profiles TEXT[],
  mentioned_sites TEXT[],
  heat_index DOUBLE PRECISION,
  sentiment_score DOUBLE PRECISION,
  engagement_score DOUBLE PRECISION,
  reach_score DOUBLE PRECISION,
  source VARCHAR(50),
  metadata JSONB,
  category VARCHAR(100),
  growth_rate DOUBLE PRECISION DEFAULT 0
);
