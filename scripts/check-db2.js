const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres' });

(async () => {
  try {
    const r = await pool.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema','pg_catalog','pg_toast','public') AND schema_name NOT LIKE 'pg_%'");
    console.log('Schemas:', r.rows.map(x => x.schema_name).join(', ') || 'none');
    
    if (r.rows.length === 0) {
      console.log('NO SCHEMAS FOUND - app needs /setup first');
      process.exit(0);
    }

    for (const s of r.rows) {
      try {
        const u = await pool.query(`SELECT id, nombre, email, role, activo FROM "${s.schema_name}".admins LIMIT 5`);
        console.log(s.schema_name + ': ' + u.rows.length + ' users ->');
        u.rows.forEach(x => console.log('  -', x.nombre, '(' + x.role + ') activo=' + x.activo));
      } catch (e) {
        console.log(s.schema_name + ': no admins table');
      }
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
  pool.end();
})();
