const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres";
const pool = new Pool({ connectionString });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("Iniciando migración jerárquica territorial...");

    const { rows: schemas } = await client.query(`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'public')
        AND schema_name NOT LIKE 'pg_%'
    `);

    for (const schema of schemas) {
      const s = schema.schema_name;
      console.log(`Procesando schema: ${s}`);

      await client.query(`
        CREATE TABLE IF NOT EXISTS "${s}".division_territorial (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(255) NOT NULL,
          tipo VARCHAR(30) NOT NULL,
          zona VARCHAR(20) NOT NULL DEFAULT 'urbana',
          padre_id INT REFERENCES "${s}".division_territorial(id) ON DELETE CASCADE,
          codigo_divipola VARCHAR(20),
          latitud DOUBLE PRECISION,
          longitud DOUBLE PRECISION,
          poligono TEXT,
          activo INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_div_territorial_padre_${s} ON "${s}".division_territorial(padre_id);
        CREATE INDEX IF NOT EXISTS idx_div_territorial_tipo_${s} ON "${s}".division_territorial(tipo);
        CREATE INDEX IF NOT EXISTS idx_div_territorial_zona_${s} ON "${s}".division_territorial(zona);

        -- Agregar columnas solo si existen las tablas
        DO $$ BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = '${s}' AND table_name = 'ciudadanos') THEN
            ALTER TABLE "${s}".ciudadanos ADD COLUMN IF NOT EXISTS territorio_id INT REFERENCES "${s}".division_territorial(id) ON DELETE SET NULL;
            ALTER TABLE "${s}".ciudadanos ADD COLUMN IF NOT EXISTS corregimiento VARCHAR(255);
            ALTER TABLE "${s}".ciudadanos ADD COLUMN IF NOT EXISTS vereda VARCHAR(255);
          END IF;

          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = '${s}' AND table_name = 'sectores') THEN
            ALTER TABLE "${s}".sectores ADD COLUMN IF NOT EXISTS territorio_id INT REFERENCES "${s}".division_territorial(id) ON DELETE SET NULL;
          END IF;
        END $$;

        CREATE TABLE IF NOT EXISTS "${s}".corporaciones_candidatos (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(255) NOT NULL,
          corporacion VARCHAR(50) NOT NULL,
          numero_tarjeton VARCHAR(10),
          partido VARCHAR(150),
          foto_url TEXT,
          activo INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "${s}".apoyos_electorales (
          id SERIAL PRIMARY KEY,
          ciudadano_id VARCHAR(50) NOT NULL,
          candidato_id INT NOT NULL REFERENCES "${s}".corporaciones_candidatos(id) ON DELETE CASCADE,
          lider_id INT,
          nivel_compromiso VARCHAR(20) DEFAULT 'seguro',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(ciudadano_id, candidato_id)
        );
      `);

      // Migrar datos de comunas y barrios solo si existen las tablas
      const { rows: tableCheck } = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = '${s}' AND table_name IN ('comunas', 'barrios')
      `);
      const hasComunas = tableCheck.some(t => t.table_name === 'comunas');
      const hasBarrios = tableCheck.some(t => t.table_name === 'barrios');

      const { rows: countRows } = await client.query(`SELECT COUNT(*)::int as count FROM "${s}".division_territorial`);
      if (countRows[0].count === 0 && hasComunas && hasBarrios) {
        const { rows: comRows } = await client.query(`SELECT * FROM "${s}".comunas ORDER BY id`);
        for (const com of comRows) {
          const isRural = com.tipo === 'rural';
          const tipo = isRural ? 'corregimiento' : 'comuna';
          const zona = isRural ? 'rural' : 'urbana';

          const { rows: insertedCom } = await client.query(
            `INSERT INTO "${s}".division_territorial (nombre, tipo, zona) VALUES ($1, $2, $3) RETURNING id`,
            [com.nombre, tipo, zona]
          );
          const parentId = insertedCom[0].id;

          const { rows: barRows } = await client.query(
            `SELECT * FROM "${s}".barrios WHERE comuna_id = $1 ORDER BY id`,
            [com.id]
          );
          for (const bar of barRows) {
            const barTipo = isRural ? 'vereda' : 'barrio';
            await client.query(
              `INSERT INTO "${s}".division_territorial (nombre, tipo, zona, padre_id, poligono) VALUES ($1, $2, $3, $4, $5)`,
              [bar.nombre, barTipo, zona, parentId, bar.poligono || null]
            );
          }
        }
        console.log(`Datos migrados a division_territorial para schema ${s}`);
      }

      // Demostración de soporte para veredas con barrios internos en Currulao (rural)
      const { rows: currulaoRows } = await client.query(`
        SELECT id FROM "${s}".division_territorial WHERE nombre ILIKE '%Currulao%' LIMIT 1
      `);
      if (currulaoRows.length > 0) {
        const currulaoId = currulaoRows[0].id;
        // Comprobar si existe la vereda El Tres
        const { rows: veredaRows } = await client.query(`
          SELECT id FROM "${s}".division_territorial WHERE nombre ILIKE '%Vereda El Tres%' AND padre_id = $1 LIMIT 1
        `, [currulaoId]);
        
        let veredaId;
        if (veredaRows.length === 0) {
          const { rows: vNew } = await client.query(`
            INSERT INTO "${s}".division_territorial (nombre, tipo, zona, padre_id) 
            VALUES ('Vereda El Tres', 'vereda', 'rural', $1) 
            RETURNING id
          `, [currulaoId]);
          veredaId = vNew[0].id;
        } else {
          veredaId = veredaRows[0].id;
        }

        // Insertar barrios/sectores dentro de la vereda El Tres
        const subBarrios = ['Barrio El Centro (Vereda El Tres)', 'Barrio La Playa (Vereda El Tres)'];
        for (const sb of subBarrios) {
          const { rows: sbExists } = await client.query(`
            SELECT id FROM "${s}".division_territorial WHERE nombre = $1 AND padre_id = $2
          `, [sb, veredaId]);
          if (sbExists.length === 0) {
            await client.query(`
              INSERT INTO "${s}".division_territorial (nombre, tipo, zona, padre_id) 
              VALUES ($1, 'barrio', 'rural', $2)
            `, [sb, veredaId]);
            console.log(`Sub-barrio '${sb}' insertado dentro de la vereda ${veredaId}`);
          }
        }
      }
    }

    console.log("Migración completada exitosamente.");
  } catch (err) {
    console.error("Error en migración:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
