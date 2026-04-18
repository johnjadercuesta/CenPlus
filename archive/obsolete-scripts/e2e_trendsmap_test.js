const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  database: process.env.DB_NAME || 'cenplus_db',
});

(async () => {
  const client = await pool.connect();
  try {
    console.log('🔬 Iniciando prueba E2E de trendsmap...');

    const ttlDays = process.env.TRENDS_TTL_DAYS ? Number(process.env.TRENDS_TTL_DAYS) : 30;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 3600 * 1000);

    const sampleText = 'Prueba E2E trendsmap — mensaje de prueba #hola @usuario';
    const hashtags = ['hola'];
    const latitude = 4.624335;
    const longitude = -74.063644;
    const pais = 'Colombia';
    const departamento = 'Cundinamarca';
    const municipio = 'Bogotá D.C.';

    const insertSql = `
      INSERT INTO trendsmap_entries
        (text, hashtags, latitude, longitude, pais, departamento, municipio, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const insertRes = await client.query(insertSql, [
      sampleText,
      hashtags,
      latitude,
      longitude,
      pais,
      departamento,
      municipio,
      expiresAt,
    ]);

    const inserted = insertRes.rows[0];
    console.log('✅ Fila insertada:', inserted);

    // Buscar por hashtag o por texto (ILIKE)
    const searchSql = `
      SELECT * FROM trendsmap_entries
      WHERE (hashtags @> $1 OR text ILIKE $2)
      ORDER BY created_at DESC
      LIMIT 10;
    `;

    const searchRes = await client.query(searchSql, [hashtags, '%hola%']);
    console.log('🔎 Resultados de búsqueda (por #hola / texto):');
    console.log(searchRes.rows);

    // Limpieza: borrar la fila de prueba
    const deleteSql = `DELETE FROM trendsmap_entries WHERE id = $1;`;
    await client.query(deleteSql, [inserted.id]);
    console.log('🧹 Fila de prueba eliminada (cleanup).');

    process.exitCode = 0;
  } catch (err) {
    console.error('❌ Error en prueba E2E:', err.message || err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
