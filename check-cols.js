const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres' });

async function run() {
  try {
    const { rows } = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants_config' ORDER BY ordinal_position"
    );
    console.log('Columns:', rows.map(c => c.column_name).join(', '));
    
    const { rows: rows2 } = await pool.query("SELECT tenant, font_family FROM public.tenants_config LIMIT 5");
    console.log('Sample data:', JSON.stringify(rows2, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
  await pool.end();
}

run();
