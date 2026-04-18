const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres" });

async function addConstraints() {
  try {
    console.log("Adding unique constraints for UPSERT support...");
    
    // global_trends: (topic, platform)
    await pool.query(`
      ALTER TABLE global_trends 
      ADD CONSTRAINT unique_topic_platform UNIQUE (topic, platform);
    `).catch(e => console.log("Constraint unique_topic_platform already exists or could not be created:", e.message));

    // influencer_rankings: (handle)
    await pool.query(`
      ALTER TABLE influencer_rankings 
      ADD CONSTRAINT unique_handle UNIQUE (handle);
    `).catch(e => console.log("Constraint unique_handle already exists or could not be created:", e.message));

    console.log("Constraints check/add completed.");
  } catch (err) {
    console.error("Constraint update failed:", err);
  } finally {
    pool.end();
  }
}

addConstraints();
