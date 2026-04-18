// scripts/diagnose-market-intelligence.js
// Script de diagnostico para el modulo Market Intelligence
// Basado en las 9 pruebas originales de test-market-intelligence.js

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
    section('DIAGNOSTICO DE MARKET INTELLIGENCE');

    // TEST 1: Verificar las 5 tablas de Market Intelligence
    section('TABLAS DE MARKET INTELLIGENCE');

    const miTables = [
      'market_intelligence',
      'facebook_sentiment_tracks',
      'trend_alerts',
      'opinion_leaders_tracked',
      'ads_library_extended'
    ];

    let existingTables = 0;

    for (const table of miTables) {
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
          existingTables++;
          if (pass(`${table} existe`)) passed++;
        } else {
          fail(`${table} NO existe`);
          failed++;
        }
      } catch (err) {
        fail(`${table}: ${err.message}`);
        failed++;
      }
    }

    if (existingTables === 5) {
      info('Las 5 tablas de Market Intelligence estan presentes');
    } else {
      warn(`Solo ${existingTables}/5 tablas encontradas`);
      warnings++;
    }

    // TEST 2: Verificar estructura de market_intelligence
    section('ESTRUCTURA: market_intelligence');

    const miColumns = [
      'id', 'municipio', 'departamento', 'interes_pagado',
      'clima_organico', 'nivel_alerta', 'gap_score',
      'volume_organic', 'volume_paid', 'avg_sentiment'
    ];

    for (const col of miColumns) {
      try {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = 'market_intelligence' AND column_name = $1
          ) as exists
        `, [col]);

        if (result.rows[0].exists) {
          if (pass(`Columna '${col}' presente`)) passed++;
        } else {
          fail(`Columna '${col}' FALTA`);
          failed++;
        }
      } catch (err) {
        fail(`Error verificando columna '${col}': ${err.message}`);
        failed++;
      }
    }

    // TEST 3: Verificar estructura de trend_alerts
    section('ESTRUCTURA: trend_alerts');

    const taColumns = [
      'id', 'municipio', 'keyword', 'frequency_change',
      'alert_type', 'severity', 'description', 'is_active'
    ];

    for (const col of taColumns) {
      try {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = 'trend_alerts' AND column_name = $1
          ) as exists
        `, [col]);

        if (result.rows[0].exists) {
          if (pass(`Columna '${col}' presente`)) passed++;
        } else {
          fail(`Columna '${col}' FALTA`);
          failed++;
        }
      } catch (err) {
        fail(`Error verificando columna '${col}': ${err.message}`);
        failed++;
      }
    }

    // TEST 4: Verificar estructura de opinion_leaders_tracked
    section('ESTRUCTURA: opinion_leaders_tracked');

    const olColumns = [
      'id', 'municipio', 'name', 'engagement_score',
      'posts_count', 'influence_category'
    ];

    for (const col of olColumns) {
      try {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = 'opinion_leaders_tracked' AND column_name = $1
          ) as exists
        `, [col]);

        if (result.rows[0].exists) {
          if (pass(`Columna '${col}' presente`)) passed++;
        } else {
          fail(`Columna '${col}' FALTA`);
          failed++;
        }
      } catch (err) {
        fail(`Error verificando columna '${col}': ${err.message}`);
        failed++;
      }
    }

    // TEST 5: Verificar indices de rendimiento
    section('INDICES DE RENDIMIENTO');

    try {
      const result = await client.query(`
        SELECT tablename, indexname
        FROM pg_indexes
        WHERE tablename IN ('market_intelligence', 'facebook_sentiment_tracks', 'trend_alerts', 'opinion_leaders_tracked', 'ads_library_extended')
        AND schemaname = 'public'
        ORDER BY tablename, indexname
      `);

      info(`${result.rows.length} indices encontrados en tablas de Market Intelligence`);

      const indexByTable = {};
      result.rows.forEach(row => {
        if (!indexByTable[row.tablename]) indexByTable[row.tablename] = [];
        indexByTable[row.tablename].push(row.indexname);
      });

      for (const [table, indexes] of Object.entries(indexByTable)) {
        console.log(`    ${table}: ${indexes.length} indices`);
        indexes.forEach(idx => console.log(`      - ${idx}`));
      }

      if (result.rows.length >= 15) {
        if (pass('Indices suficientes (15+)')) passed++;
      } else {
        warn(`Solo ${result.rows.length}/15 indices encontrados - considerar agregar mas`);
        warnings++;
      }
    } catch (err) {
      fail(`Error verificando indices: ${err.message}`);
      failed++;
    }

    // TEST 6: Prueba de INSERT en market_intelligence
    section('PRUEBA DE ESCRITURA/LECTURA');

    try {
      await client.query(`
        INSERT INTO market_intelligence (municipio, departamento, interes_pagado, clima_organico, nivel_alerta, gap_score)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (municipio) DO UPDATE SET
        interes_pagado = EXCLUDED.interes_pagado,
        updated_at = NOW()
      `, ['Test_Municipio_Diag', 'Test_Depto_Diag', 'Salud', 'positivo', 5, 0.8]);

      if (pass('INSERT en market_intelligence funciona')) passed++;
    } catch (err) {
      fail(`Error en INSERT: ${err.message}`);
      failed++;
    }

    // TEST 7: Prueba de SELECT en market_intelligence
    try {
      const result = await client.query(`
        SELECT * FROM market_intelligence WHERE municipio = $1
      `, ['Test_Municipio_Diag']);

      if (result.rows.length === 1) {
        const row = result.rows[0];
        info(`Registro encontrado: municipio=${row.municipio}, interes_pagado=${row.interes_pagado}`);
        if (pass('SELECT en market_intelligence funciona')) passed++;
      } else {
        fail(`SELECT retorno ${result.rows.length} registros (esperado: 1)`);
        failed++;
      }
    } catch (err) {
      fail(`Error en SELECT: ${err.message}`);
      failed++;
    }

    // TEST 8: Prueba de INSERT en trend_alerts
    try {
      await client.query(`
        INSERT INTO trend_alerts (municipio, keyword, frequency_change, alert_type, severity, description)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['Test_Municipio_Diag', 'test_keyword_diag', 150.5, 'CRITICAL_TREND', 7, 'Alerta de diagnostico']);

      if (pass('INSERT en trend_alerts funciona')) passed++;
    } catch (err) {
      fail(`Error en INSERT trend_alerts: ${err.message}`);
      failed++;
    }

    // TEST 9: Limpieza de datos de prueba
    section('LIMPIEZA');

    try {
      await client.query(`DELETE FROM trend_alerts WHERE municipio = $1`, ['Test_Municipio_Diag']);
      if (pass('Limpieza de trend_alerts completada')) passed++;
    } catch (err) {
      warn(`No se pudo limpiar trend_alerts: ${err.message}`);
      warnings++;
    }

    try {
      await client.query(`DELETE FROM market_intelligence WHERE municipio = $1`, ['Test_Municipio_Diag']);
      if (pass('Limpieza de market_intelligence completada')) passed++;
    } catch (err) {
      warn(`No se pudo limpiar market_intelligence: ${err.message}`);
      warnings++;
    }

    section('RESUMEN');
    console.log(`  ${C.bold}Pasados:${C.reset} ${C.green}${passed}${C.reset}`);
    console.log(`  ${C.bold}Fallidos:${C.reset} ${C.red}${failed}${C.reset}`);
    console.log(`  ${C.bold}Advertencias:${C.reset} ${C.yellow}${warnings}${C.reset}`);
    console.log(`  ${C.bold}Total:${C.reset} ${passed + failed + warnings}`);

    if (failed === 0) {
      console.log(`\n${C.green}${C.bold}✓ DIAGNOSTICO MARKET INTELLIGENCE COMPLETADO - Todo funciona correctamente${C.reset}\n`);
      process.exit(0);
    } else {
      console.log(`\n${C.red}${C.bold}✗ DIAGNOSTICO MARKET INTELLIGENCE COMPLETADO - ${failed} error(es) detectado(s)${C.reset}\n`);
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
