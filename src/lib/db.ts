import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";

const DB_PATH = path.join(process.cwd(), "cenplus.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
    seedDefaults(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      email      TEXT NOT NULL UNIQUE,
      password   TEXT NOT NULL,
      nombre     TEXT NOT NULL DEFAULT '',
      role       TEXT NOT NULL CHECK (role IN ('administrador', 'lider')) DEFAULT 'lider',
      activo     INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ciudadanos (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      id_unico        TEXT NOT NULL UNIQUE,
      nombre_completo TEXT NOT NULL,
      telefono        TEXT,
      sexo            TEXT CHECK (sexo IN ('Masculino', 'Femenino', 'Otro')),
      edad            INTEGER CHECK (edad > 0 AND edad < 150),
      nivel_estudios  TEXT CHECK (nivel_estudios IN (
                        'Ninguno', 'Primaria', 'Secundaria',
                        'Técnico', 'Universitario', 'Posgrado')),
      ocupacion       TEXT,
      barrio          TEXT NOT NULL,
      corregimiento   TEXT NOT NULL,
      vereda          TEXT,
      es_lider        INTEGER DEFAULT 0,
      nombre_lider    TEXT,
      lider_id        INTEGER,
      latitud         REAL,
      longitud        REAL,
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (lider_id) REFERENCES admins(id)
    );

    CREATE INDEX IF NOT EXISTS idx_ced ON ciudadanos(id_unico);
    CREATE INDEX IF NOT EXISTS idx_barrio ON ciudadanos(barrio);
    CREATE INDEX IF NOT EXISTS idx_corr ON ciudadanos(corregimiento);
    CREATE INDEX IF NOT EXISTS idx_lider ON ciudadanos(es_lider);
    CREATE INDEX IF NOT EXISTS idx_coords ON ciudadanos(latitud, longitud);
    CREATE INDEX IF NOT EXISTS idx_lider_id ON ciudadanos(lider_id);

    CREATE TABLE IF NOT EXISTS sectores (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre     TEXT NOT NULL,
      meta       INTEGER NOT NULL DEFAULT 100,
      latitud    REAL NOT NULL,
      longitud   REAL NOT NULL,
      radio      REAL NOT NULL DEFAULT 2000,
      poligono   TEXT,
      color      TEXT NOT NULL DEFAULT '#3b82f6',
      activo     INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS config (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );
  `);

  // Migración: agregar columnas si no existen (DB ya existía)
  const colNames = db.prepare("PRAGMA table_info('ciudadanos')").all() as { name: string }[];
  const names = colNames.map((c) => c.name);

  if (!names.includes("nombre_lider")) {
    db.exec("ALTER TABLE ciudadanos ADD COLUMN nombre_lider TEXT");
  }
  if (!names.includes("lider_id")) {
    db.exec("ALTER TABLE ciudadanos ADD COLUMN lider_id INTEGER REFERENCES admins(id)");
  }

  const adminCols = db.prepare("PRAGMA table_info('admins')").all() as { name: string }[];
  const adminNames = adminCols.map((c) => c.name);
  if (!adminNames.includes("nombre")) {
    db.exec("ALTER TABLE admins ADD COLUMN nombre TEXT NOT NULL DEFAULT ''");
  }
  if (!adminNames.includes("role")) {
    db.exec("ALTER TABLE admins ADD COLUMN role TEXT NOT NULL DEFAULT 'lider'");
  }
  if (!adminNames.includes("activo")) {
    db.exec("ALTER TABLE admins ADD COLUMN activo INTEGER NOT NULL DEFAULT 1");
  }

  const sectorCols = db.prepare("PRAGMA table_info('sectores')").all() as { name: string }[];
  const sectorNames = sectorCols.map((c) => c.name);
  if (!sectorNames.includes("poligono")) {
    db.exec("ALTER TABLE sectores ADD COLUMN poligono TEXT");
  }
}

function seedDefaults(db: Database.Database) {
  const existing = db.prepare("SELECT id FROM admins WHERE email = ?").get("admin@cenplus.com");
  if (!existing) {
    const hash = bcrypt.hashSync("admin123", 10);
    db.prepare(
      "INSERT INTO admins (email, password, nombre, role) VALUES (?, ?, ?, ?)"
    ).run("admin@cenplus.com", hash, "Administrador Principal", "administrador");
  }

  const existingLider = db.prepare("SELECT id FROM admins WHERE email = ?").get("lider@cenplus.com");
  if (!existingLider) {
    const hash = bcrypt.hashSync("lider123", 10);
    db.prepare(
      "INSERT INTO admins (email, password, nombre, role) VALUES (?, ?, ?, ?)"
    ).run("lider@cenplus.com", hash, "Líder de Prueba", "lider");
  }

  const existingConfig = db.prepare("SELECT clave FROM config WHERE clave = ?").get("meta_global");
  if (!existingConfig) {
    db.prepare("INSERT INTO config (clave, valor) VALUES (?, ?)").run("meta_global", "1000");
  }
}
