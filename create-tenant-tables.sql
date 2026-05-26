SET search_path TO testorg;

CREATE TABLE IF NOT EXISTS sectores (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  meta INT DEFAULT 0,
  votos_historicos INT DEFAULT 0,
  latitud FLOAT,
  longitud FLOAT,
  radio FLOAT DEFAULT 2000,
  poligono TEXT,
  color VARCHAR(7) DEFAULT '#3b82f6',
  activo INT DEFAULT 1,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  zona VARCHAR(50),
  comuna_id INT,
  barrio_id INT
);

CREATE TABLE IF NOT EXISTS archivos_electorales (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(50),
  estado VARCHAR(50) DEFAULT 'pendiente',
  total_ciudadanos INT DEFAULT 0,
  procesados INT DEFAULT 0,
  errores INT DEFAULT 0,
  creado_por INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
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
  latitude FLOAT,
  longitude FLOAT,
  departamento VARCHAR(255),
  municipio VARCHAR(255),
  pais VARCHAR(255) DEFAULT 'Colombia',
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  barrio VARCHAR(255),
  comuna VARCHAR(255),
  mentioned_profiles TEXT[],
  mentioned_sites TEXT[],
  heat_index FLOAT,
  sentiment_score FLOAT,
  engagement_score FLOAT,
  reach_score FLOAT,
  source VARCHAR(50),
  metadata JSONB,
  category VARCHAR(100),
  growth_rate FLOAT DEFAULT 0
);
