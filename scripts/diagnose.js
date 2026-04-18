// scripts/diagnose.js
// Script de diagnostico principal - valida conexion DB, tablas, indices y funcionalidad basica

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/cenplus_db";

const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 5000,
});

const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function pass(msg) { console.log(`  ${C.green}✓ PASS${C.reset}: ${msg}`); return true; }
function fail(msg) { console.log(`  ${C.red}✗ FAIL${C.reset}: ${msg}`); return false; }
function warn(msg) { console.log(`  ${C.yellow}⚠ WARN${C.reset}: ${msg}`); }
function info(msg) { console.log(`  ${C.cyan}ℹ INFO${C.reset}: ${msg}`); }
function section(title) { console.log(`\n${C.bold}${C.blue}=== ${title} ===${C.reset}`); }

async function runDiagnosis() {
  const client = await pool.connect();
  let passed = 0;
  let failed = 0;
  let warnings = 0;

  try {
    section('CONEXION A BASE DE DATOS');

    try {
      const result = await client.query('SELECT NOW() as now, version()');
      const version = result.rows[0].version.split(',')[0];
      info(`Conectado a: ${version}`);
      info(`Fecha del servidor: ${result.rows[0].now}`);
      if (pass('Conexion establecida correctamente')) passed++;
    } catch (err) {
      fail(`No se pudo conectar: ${err.message}`);
      failed++;
      console.log(`\n${C.red}No se puede continuar sin conexion a DB.${C.reset}`);
      process.exit(1);
    }

    try {
      const result = await client.query('SELECT current_database() as db');
      info(`Base de datos: ${result.rows[0].db}`);
      if (pass('Base de datos identificada')) passed++;
    } catch (err) {
      fail(err.message);
      failed++;
    }

    section('TABLAS EXISTENTES');

    try {
      const result = await client.query(`
        SELECT table_name,
               (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as col_count
        FROM information_schema.tables t
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      if (result.rows.length > 0) {
        info(`${result.rows.length} tablas encontradas:`);
        result.rows.forEach(row => {
          console.log(`    - ${row.table_name} (${row.col_count} columnas)`);
        });
        if (pass('Tablas listadas correctamente')) passed++;
      } else {
        warn('No se encontraron tablas en el esquema publico');
        warnings++;
      }
    } catch (err) {
      fail(err.message);
      failed++;
    }

    const criticalTables = [
      'trendsmap_entries',
      'market_intelligence',
      'facebook_sentiment_tracks',
      'trend_alerts',
      'opinion_leaders_tracked',
      'ads_library_extended',
      'global_trends',
      'notifications',
      'users',
    ];

    section('TABLAS CRITICAS');

    for (const table of criticalTables) {
      try {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = $1
          ) as exists
        `, [table]);

        if (result.rows[0].exists) {
          const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
          info(`${table}: ${countResult.rows[0].count} registros`);
          if (pass(`${table} existe`)) passed++;
        } else {
          warn(`${table} no existe`);
          warnings++;
        }
      } catch (err) {
        fail(`${table}: ${err.message}`);
        failed++;
      }
    }

    section('INDICES DE RENDIMIENTO');

    try {
      const result = await client.query(`
        SELECT tablename, indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `);

      info(`${result.rows.length} indices encontrados`);

      const indexByTable = {};
      result.rows.forEach(row => {
        if (!indexByTable[row.tablename]) indexByTable[row.tablename] = [];
        indexByTable[row.tablename].push(row.indexname);
      });

      for (const [table, indexes] of Object.entries(indexByTable)) {
        console.log(`    ${table}: ${indexes.length} indices`);
        indexes.forEach(idx => console.log(`      - ${idx}`));
      }

      if (result.rows.length >= 10) {
        if (pass('Indices suficientes')) passed++;
      } else {
        warn('Menos de 10 indices - considerar agregar mas para rendimiento');
        warnings++;
      }
    } catch (err) {
      fail(err.message);
      failed++;
    }

    section('FUNCIONALIDAD DE ESCRITURA/LECTURA');

    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS _diagnostic_test (
          id SERIAL PRIMARY KEY,
          test_value TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      if (pass('Tabla de prueba creada')) passed++;
    } catch (err) {
      fail(err.message);
      failed++;
    }

    try {
      const testVal = 'diagnostic_' + Date.now();
      await client.query(`INSERT INTO _diagnostic_test (test_value) VALUES ($1)`, [testVal]);
      if (pass('INSERT funciona')) passed++;
    } catch (err) {
      fail(err.message);
      failed++;
    }

    try {
      const result = await client.query(`SELECT * FROM _diagnostic_test ORDER BY created_at DESC LIMIT 1`);
      if (result.rows.length === 1) {
        if (pass('SELECT funciona')) passed++;
      } else {
        fail('SELECT no retorno resultados esperados');
        failed++;
      }
    } catch (err) {
      fail(err.message);
      failed++;
    }

    try {
      await client.query(`DROP TABLE _diagnostic_test`);
      if (pass('Limpieza completada (tabla de prueba eliminada)')) passed++;
    } catch (err) {
      warn(`No se pudo limpiar tabla de prueba: ${err.message}`);
      warnings++;
    }

    section('RESUMEN');
    console.log(`  ${C.bold}Pasados:${C.reset} ${C.green}${passed}${C.reset}`);
    console.log(`  ${C.bold}Fallidos:${C.reset} ${C.red}${failed}${C.reset}`);
    console.log(`  ${C.bold}Advertencias:${C.reset} ${C.yellow}${warnings}${C.reset}`);
    console.log(`  ${C.bold}Total:${C.reset} ${passed + failed + warnings}`);

    if (failed === 0) {
      console.log(`\n${C.green}${C.bold}✓ DIAGNOSTICO COMPLETADO - Todo funciona correctamente${C.reset}\n`);
      process.exit(0);
    } else {
      console.log(`\n${C.red}${C.bold}✗ DIAGNOSTICO COMPLETADO - ${failed} error(es) detectado(s)${C.reset}\n`);
      process.exit(1);
    }

  } catch (err) {
    console.error('Error de ejecucion:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runDiagnosis();
