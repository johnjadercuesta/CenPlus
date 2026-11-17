const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres" });

async function initDiaDTables() {
  const client = await pool.connect();
  try {
    const { rows: schemas } = await client.query(`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'public')
        AND schema_name NOT LIKE 'pg_%'
    `);

    for (const schema of schemas) {
      const s = schema.schema_name;
      console.log(`Creando tablas de Día D para schema: ${s}`);

      await client.query(`
        CREATE TABLE IF NOT EXISTS "${s}".mesas_votacion (
          id SERIAL PRIMARY KEY,
          nombre_puesto VARCHAR(255) NOT NULL,
          numero_mesa INT NOT NULL,
          censo_mesa INT DEFAULT 350,
          testigo_id INT REFERENCES "${s}".admins(id) ON DELETE SET NULL,
          estado VARCHAR(20) DEFAULT 'pendiente',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(nombre_puesto, numero_mesa)
        );

        CREATE TABLE IF NOT EXISTS "${s}".reportes_e14 (
          id SERIAL PRIMARY KEY,
          mesa_id INT REFERENCES "${s}".mesas_votacion(id) ON DELETE CASCADE,
          candidato_id INT REFERENCES "${s}".corporaciones_candidatos(id) ON DELETE CASCADE,
          votos INT NOT NULL DEFAULT 0,
          foto_e14_url TEXT,
          observaciones TEXT,
          reportado_por INT REFERENCES "${s}".admins(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(mesa_id, candidato_id)
        );
      `);

      // Sembrar mesas de votación iniciales si está vacía
      const { rows: countMesas } = await client.query(`SELECT COUNT(*)::int as count FROM "${s}".mesas_votacion`);
      if (countMesas[0].count === 0) {
        const { rows: puestos } = await client.query(`SELECT nombre FROM "${s}".puestos_votacion LIMIT 5`);
        const puestosNombres = puestos.length > 0 
          ? puestos.map(p => p.nombre) 
          : ["Colegio Central", "Institución Educativa Sur", "Escuela Rural El Tres"];

        for (const puesto of puestosNombres) {
          for (let m = 1; m <= 4; m++) {
            await client.query(`
              INSERT INTO "${s}".mesas_votacion (nombre_puesto, numero_mesa, censo_mesa)
              VALUES ($1, $2, 350)
              ON CONFLICT DO NOTHING
            `, [puesto, m]);
          }
        }
        console.log(`Mesas sembradas para ${s}`);
      }
    }

    console.log("Tablas de Día D listas en todos los esquemas.");
  } catch (err) {
    console.error("Error inicializando tablas Día D:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

initDiaDTables();
