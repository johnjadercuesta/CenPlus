const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cenplus' });

(async () => {
  try {
    const res = await pool.query(`SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast') AND schema_name NOT LIKE 'pg_%'`);
    console.log('Schemas:', res.rows.map(r => r.schema_name).join(', '));
    
    if (res.rows.length === 0) {
      console.log('No schemas found - app needs setup via /setup');
      process.exit(0);
    }

    for (const s of res.rows) {
      try {
        const res2 = await pool.query(`SELECT id, nombre, email, role, activo FROM "${s.schema_name}".admins LIMIT 5`);
        console.log(s.schema_name + ': ' + res2.rows.length + ' users -> ' + JSON.stringify(res2.rows.map(u => ({nombre: u.nombre, role: u.role, activo: u.activo}))));
      } catch {
        console.log(s.schema_name + ': no admins table');
      }
    }
  } catch (err) {
    console.log('DB Error:', err.message);
  }
  pool.end();
})();
