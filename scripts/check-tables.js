const { Pool } = require('pg');
const p = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres' });
(async () => {
  try {
    const r = await p.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'mensajes_%'");
    console.log('Messaging tables:', r.rows.map(x => x.table_name).join(', ') || 'NONE - need migration');
    
    const r2 = await p.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('mensajes_enviados','mensajes_individuales')");
    console.log('Expected tables found:', r2.rows.length === 2 ? 'YES' : 'NO - only ' + r2.rows.map(x => x.table_name).join(', '));
  } catch (e) {
    console.log('Error:', e.message);
  }
  p.end();
})();
