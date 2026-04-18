// scripts/test-market-intelligence.js
// Validate Phase 1 Market Intelligence setup

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/cenplus";

const pool = new Pool({
  connectionString,
});

async function runTests() {
  const client = await pool.connect();
  let passed = 0;
  let failed = 0;

  try {
    console.log('\n=== PHASE 1 MARKET INTELLIGENCE VALIDATION ===\n');

    // TEST 1: Check if all 5 tables exist
    console.log('TEST 1: Verify all 5 tables exist...');
    try {
      const result = await client.query(`
        SELECT COUNT(*) as table_count FROM information_schema.tables 
        WHERE table_name IN ('market_intelligence', 'facebook_sentiment_tracks', 'trend_alerts', 'opinion_leaders_tracked', 'ads_library_extended')
        AND table_schema = 'public'
      `);
      
      if (result.rows[0].table_count === 5) {
        console.log('✓ PASS: All 5 tables exist\n');
        passed++;
      } else {
        console.log(`✗ FAIL: Expected 5 tables, found ${result.rows[0].table_count}\n`);
        failed++;
      }
    } catch (err) {
      console.log(`✗ FAIL: ${err.message}\n`);
      failed++;
    }

    // TEST 2: Check market_intelligence table structure
    console.log('TEST 2: Verify market_intelligence table columns...');
    try {
      const result = await client.query(`
        SELECT COUNT(*) as col_count FROM information_schema.columns 
        WHERE table_name = 'market_intelligence'
        AND column_name IN ('id', 'municipio', 'departamento', 'interes_pagado', 'clima_organico', 'nivel_alerta', 'gap_score', 'volume_organic', 'volume_paid', 'avg_sentiment')
      `);
      
      if (result.rows[0].col_count === 10) {
        console.log('✓ PASS: market_intelligence has all required columns\n');
        passed++;
      } else {
        console.log(`✗ FAIL: Expected 10 columns, found ${result.rows[0].col_count}\n`);
        failed++;
      }
    } catch (err) {
      console.log(`✗ FAIL: ${err.message}\n`);
      failed++;
    }

    // TEST 3: Check trend_alerts table structure
    console.log('TEST 3: Verify trend_alerts table columns...');
    try {
      const result = await client.query(`
        SELECT COUNT(*) as col_count FROM information_schema.columns 
        WHERE table_name = 'trend_alerts'
        AND column_name IN ('id', 'municipio', 'keyword', 'frequency_change', 'alert_type', 'severity', 'description', 'is_active')
      `);
      
      if (result.rows[0].col_count === 8) {
        console.log('✓ PASS: trend_alerts has all required columns\n');
        passed++;
      } else {
        console.log(`✗ FAIL: Expected 8 columns, found ${result.rows[0].col_count}\n`);
        failed++;
      }
    } catch (err) {
      console.log(`✗ FAIL: ${err.message}\n`);
      failed++;
    }

    // TEST 4: Check opinion_leaders_tracked table
    console.log('TEST 4: Verify opinion_leaders_tracked table columns...');
    try {
      const result = await client.query(`
        SELECT COUNT(*) as col_count FROM information_schema.columns 
        WHERE table_name = 'opinion_leaders_tracked'
        AND column_name IN ('id', 'municipio', 'name', 'engagement_score', 'posts_count', 'influence_category')
      `);
      
      if (result.rows[0].col_count === 6) {
        console.log('✓ PASS: opinion_leaders_tracked has all required columns\n');
        passed++;
      } else {
        console.log(`✗ FAIL: Expected 6 columns, found ${result.rows[0].col_count}\n`);
        failed++;
      }
    } catch (err) {
      console.log(`✗ FAIL: ${err.message}\n`);
      failed++;
    }

    // TEST 5: Check indices are created
    console.log('TEST 5: Verify performance indices created...');
    try {
      const result = await client.query(`
        SELECT COUNT(*) as index_count FROM pg_indexes 
        WHERE tablename IN ('market_intelligence', 'facebook_sentiment_tracks', 'trend_alerts', 'opinion_leaders_tracked', 'ads_library_extended')
        AND schemaname = 'public'
      `);
      
      if (result.rows[0].index_count >= 15) {
        console.log(`✓ PASS: ${result.rows[0].index_count} indices created\n`);
        passed++;
      } else {
        console.log(`✗ FAIL: Expected 15+ indices, found ${result.rows[0].index_count}\n`);
        failed++;
      }
    } catch (err) {
      console.log(`✗ FAIL: ${err.message}\n`);
      failed++;
    }

    // TEST 6: Test INSERT into market_intelligence
    console.log('TEST 6: Test INSERT into market_intelligence...');
    try {
      await client.query(`
        INSERT INTO market_intelligence (municipio, departamento, interes_pagado, clima_organico, nivel_alerta, gap_score)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (municipio) DO UPDATE SET
        interes_pagado = EXCLUDED.interes_pagado,
        updated_at = NOW()
      `, ['Test_Municipio', 'Test_Depto', 'Salud', 'positivo', 5, 0.8]);
      
      console.log('✓ PASS: INSERT works correctly\n');
      passed++;
    } catch (err) {
      console.log(`✗ FAIL: ${err.message}\n`);
      failed++;
    }

    // TEST 7: Test SELECT from market_intelligence
    console.log('TEST 7: Test SELECT from market_intelligence...');
    try {
      const result = await client.query(`SELECT * FROM market_intelligence WHERE municipio = $1`, ['Test_Municipio']);
      
      if (result.rows.length === 1) {
        console.log('✓ PASS: SELECT works correctly\n');
        passed++;
      } else {
        console.log(`✗ FAIL: Expected 1 row, found ${result.rows.length}\n`);
        failed++;
      }
    } catch (err) {
      console.log(`✗ FAIL: ${err.message}\n`);
      failed++;
    }

    // TEST 8: Test INSERT trigger/constraint on trend_alerts
    console.log('TEST 8: Test INSERT into trend_alerts...');
    try {
      await client.query(`
        INSERT INTO trend_alerts (municipio, keyword, frequency_change, alert_type, severity, description)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['Test_Municipio', 'test_keyword', 150.5, 'CRITICAL_TREND', 7, 'Test alert']);
      
      console.log('✓ PASS: INSERT into trend_alerts works\n');
      passed++;
    } catch (err) {
      console.log(`✗ FAIL: ${err.message}\n`);
      failed++;
    }

    // TEST 9: Cleanup
    console.log('TEST 9: Cleanup test data...');
    try {
      await client.query(`DELETE FROM market_intelligence WHERE municipio = $1`, ['Test_Municipio']);
      await client.query(`DELETE FROM trend_alerts WHERE municipio = $1`, ['Test_Municipio']);
      console.log('✓ PASS: Cleanup successful\n');
      passed++;
    } catch (err) {
      console.log(`✗ FAIL: ${err.message}\n`);
      failed++;
    }

    // Summary
    console.log('=== TEST SUMMARY ===');
    console.log(`Passed: ${passed}/9`);
    console.log(`Failed: ${failed}/9`);
    
    if (failed === 0) {
      console.log('\n✓ ALL TESTS PASSED - Phase 1 Database Setup is Complete!\n');
      process.exit(0);
    } else {
      console.log('\n✗ SOME TESTS FAILED - Please review the errors above\n');
      process.exit(1);
    }

  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runTests();
