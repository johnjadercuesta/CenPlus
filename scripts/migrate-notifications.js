/**
 * Migration script to create notifications table
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

const pool = new Pool({
  connectionString: databaseUrl,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('[Migration] Reading SQL file...');
    const sqlFile = path.join(__dirname, 'create-notifications-table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('[Migration] Executing SQL...');
    await client.query(sql);

    console.log('[Migration] ✓ Notifications table created successfully');
    console.log('[Migration] ✓ Indexes created');
    console.log('[Migration] ✓ Trigger created');
  } catch (err) {
    console.error('[Migration] ✗ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
