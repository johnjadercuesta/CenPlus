// scripts/diagnose-trendsmap.js
// Script de diagnostico para el modulo Trendsmap
// Basado en las pruebas E2E y unitarias originales

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
    section('DIAGNOSTICO DE TRENDSPAM');

    // TEST 1: Verificar que la tabla trendsmap_entries existe
    try {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'trendsmap_entries'
        ) as exists
      `);

      if (result.rows[0].exists) {
        if (pass('Tabla trendsmap_entries existe')) passed++;
      } else {
        fail('Tabla trendsmap_entries NO existe');
        failed++;
        console.log(`\n${C.red}No se puede continuar sin la tabla trendsmap_entries.${C.reset}`);
        process.exit(1);
      }
    } catch (err) {
      fail(`Error al verificar tabla: ${err.message}`);
      failed++;
      process.exit(1);
    }

    // TEST 2: Verificar estructura de columnas
    section('ESTRUCTURA DE COLUMNAS');

    const requiredColumns = [
      'id', 'text', 'hashtags', 'latitude', 'longitude',
      'pais', 'departamento', 'municipio', 'expires_at', 'created_at'
    ];

    for (const col of requiredColumns) {
      try {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = 'trendsmap_entries' AND column_name = $1
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

    // TEST 3: Verificar conteo de registros
    section('ESTADO DE DATOS');

    try {
      const result = await client.query(`SELECT COUNT(*) as count FROM trendsmap_entries`);
      info(`Total de registros: ${result.rows[0].count}`);
      if (pass('Consulta de conteo exitosa')) passed++;
    } catch (err) {
      fail(`Error en conteo: ${err.message}`);
      failed++;
    }

    // TEST 4: Verificar registros expirados
    try {
      const result = await client.query(`
        SELECT COUNT(*) as expired_count
        FROM trendsmap_entries
        WHERE expires_at < NOW()
      `);
      const expiredCount = parseInt(result.rows[0].expired_count);
      info(`Registros expirados: ${expiredCount}`);

      if (expiredCount > 0) {
        warn(`${expiredCount} registros expirados pendientes de limpieza`);
        warnings++;
      } else {
        if (pass('No hay registros expirados')) passed++;
      }
    } catch (err) {
      fail(`Error verificando expirados: ${err.message}`);
      failed++;
    }

    // TEST 5: Verificar indices
    section('INDICES');

    try {
      const result = await client.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'trendsmap_entries' AND schemaname = 'public'
      `);

      info(`${result.rows.length} indices en trendsmap_entries`);
      result.rows.forEach(row => {
        console.log(`    - ${row.indexname}`);
      });

      if (result.rows.length >= 3) {
        if (pass('Indices suficientes para trendsmap_entries')) passed++;
      } else {
        warn('Menos de 3 indices - considerar agregar indices para rendimiento');
        warnings++;
      }
    } catch (err) {
      fail(`Error verificando indices: ${err.message}`);
      failed++;
    }

    // TEST 6: Prueba de INSERT (como el E2E original)
    section('PRUEBA DE ESCRITURA/LECTURA');

    const ttlDays = process.env.TRENDS_TTL_DAYS ? Number(process.env.TRENDS_TTL_DAYS) : 30;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 3600 * 1000);

    const sampleText = 'Prueba E2E trendsmap — mensaje de prueba #hola @usuario';
    const hashtags = ['hola'];
    const latitude = 4.624335;
    const longitude = -74.063644;
    const pais = 'Colombia';
    const departamento = 'Cundinamarca';
    const municipio = 'Bogotá D.C.';

    let insertedId = null;

    try {
      const insertSql = `
        INSERT INTO trendsmap_entries
          (text, hashtags, latitude, longitude, pais, departamento, municipio, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, created_at;
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

      insertedId = insertRes.rows[0].id;
      info(`Registro insertado con ID: ${insertedId}`);
      if (pass('INSERT en trendsmap_entries funciona')) passed++;
    } catch (err) {
      fail(`Error en INSERT: ${err.message}`);
      failed++;
    }

    // TEST 7: Prueba de busqueda por hashtag (como el test unitario)
    if (insertedId) {
      try {
        const searchSql = `
          SELECT * FROM trendsmap_entries
          WHERE hashtags @> $1
          ORDER BY created_at DESC
          LIMIT 10;
        `;

        const searchRes = await client.query(searchSql, [hashtags]);
        const found = searchRes.rows.find(r => r.id === insertedId);

        if (found) {
          info(`Busqueda por hashtag '#${hashtags[0]}': ${searchRes.rows.length} resultados`);
          if (pass('Busqueda por hashtag funciona')) passed++;
        } else {
          fail('Busqueda por hashtag no encontro el registro insertado');
          failed++;
        }
      } catch (err) {
        fail(`Error en busqueda por hashtag: ${err.message}`);
        failed++;
      }

      // TEST 8: Prueba de busqueda por texto (ILIKE)
      try {
        const searchSql = `
          SELECT * FROM trendsmap_entries
          WHERE text ILIKE $1
          ORDER BY created_at DESC
          LIMIT 10;
        `;

        const searchRes = await client.query(searchSql, ['%prueba%']);
        const found = searchRes.rows.find(r => r.id === insertedId);

        if (found) {
          info(`Busqueda por texto 'prueba': ${searchRes.rows.length} resultados`);
          if (pass('Busqueda por texto (ILIKE) funciona')) passed++;
        } else {
          fail('Busqueda por texto no encontro el registro insertado');
          failed++;
        }
      } catch (err) {
        fail(`Error en busqueda por texto: ${err.message}`);
        failed++;
      }

      // TEST 9: Verificar que expires_at se establecio correctamente
      try {
        const result = await client.query(`
          SELECT expires_at, created_at
          FROM trendsmap_entries
          WHERE id = $1
        `, [insertedId]);

        const row = result.rows[0];
        const expiresDate = new Date(row.expires_at);
        const createdDate = new Date(row.created_at);
        const diffDays = Math.round((expiresDate - createdDate) / (24 * 3600 * 1000));

        info(`TTL configurado: ${diffDays} dias (esperado: ${ttlDays})`);

        if (diffDays === ttlDays) {
          if (pass('TTL de expiracion configurado correctamente')) passed++;
        } else {
          warn(`TTL difiere: ${diffDays} dias vs ${ttlDays} esperados`);
          warnings++;
        }
      } catch (err) {
        fail(`Error verificando TTL: ${err.message}`);
        failed++;
      }

      // TEST 10: Limpieza - borrar fila de prueba
      try {
        await client.query(`DELETE FROM trendsmap_entries WHERE id = $1`, [insertedId]);
        if (pass('Limpieza completada (registro de prueba eliminado)')) passed++;
      } catch (err) {
        warn(`No se pudo limpiar registro de prueba: ${err.message}`);
        warnings++;
      }
    }

    section('RESUMEN');
    console.log(`  ${C.bold}Pasados:${C.reset} ${C.green}${passed}${C.reset}`);
    console.log(`  ${C.bold}Fallidos:${C.reset} ${C.red}${failed}${C.reset}`);
    console.log(`  ${C.bold}Advertencias:${C.reset} ${C.yellow}${warnings}${C.reset}`);
    console.log(`  ${C.bold}Total:${C.reset} ${passed + failed + warnings}`);

    if (failed === 0) {
      console.log(`\n${C.green}${C.bold}✓ DIAGNOSTICO TRENDSPAM COMPLETADO - Todo funciona correctamente${C.reset}\n`);
      process.exit(0);
    } else {
      console.log(`\n${C.red}${C.bold}✗ DIAGNOSTICO TRENDSPAM COMPLETADO - ${failed} error(es) detectado(s)${C.reset}\n`);
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
