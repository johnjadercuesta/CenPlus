const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
let dbUrl = "postgresql://postgres:postgres@localhost:5432/postgres";

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const match = envContent.match(/DATABASE_URL="([^"]+)"/);
  if (match) {
    dbUrl = match[1];
  }
}

const pool = new Pool({
  connectionString: dbUrl
});

// Sample Colombian municipalities with coordinates
const municipalities = [
  { municipio: "Medellín", departamento: "Antioquia", lat: 6.2442, lng: -75.5812 },
  { municipio: "Bogotá", departamento: "Cundinamarca", lat: 4.7110, lng: -74.0721 },
  { municipio: "Cali", departamento: "Valle del Cauca", lat: 3.4372, lng: -76.5197 },
  { municipio: "Barranquilla", departamento: "Atlántico", lat: 10.9639, lng: -74.7964 },
  { municipio: "Bucaramanga", departamento: "Santander", lat: 7.1315, lng: -73.1225 },
  { municipio: "Cartagena", departamento: "Bolívar", lat: 10.3932, lng: -75.5148 },
  { municipio: "Santa Marta", departamento: "Magdalena", lat: 11.2404, lng: -74.2247 },
  { municipio: "Cúcuta", departamento: "Norte de Santander", lat: 7.8854, lng: -72.5069 },
  { municipio: "Armenia", departamento: "Quindío", lat: 4.5339, lng: -75.7033 },
  { municipio: "Ibagué", departamento: "Tolima", lat: 4.4518, lng: -75.2324 },
  { municipio: "Manizales", departamento: "Caldas", lat: 5.0692, lng: -75.5159 },
  { municipio: "Pereira", departamento: "Risaralda", lat: 4.8133, lng: -75.6969 },
  { municipio: "Pasto", departamento: "Nariño", lat: 1.2158, lng: -77.2974 },
  { municipio: "Popayán", departamento: "Cauca", lat: 2.4420, lng: -76.6141 },
  { municipio: "Villavicencio", departamento: "Meta", lat: 4.1431, lng: -73.6291 },
  { municipio: "Valledupar", departamento: "Cesar", lat: 10.3462, lng: -73.2527 },
  { municipio: "Riohacha", departamento: "Guajira", lat: 11.5277, lng: -72.3120 },
  { municipio: "Sincelejo", departamento: "Sucre", lat: 9.3052, lng: -75.3981 },
  { municipio: "Montería", departamento: "Córdoba", lat: 8.7532, lng: -75.8803 },
  { municipio: "Quibdó", departamento: "Chocó", lat: 5.6969, lng: -76.6558 },
];

const sentiments = ["positivo", "neutral", "negativo"];
const interests = [
  "economia",
  "politica",
  "salud",
  "educacion",
  "seguridad",
  "infraestructura",
  "medio_ambiente",
  "tecnologia",
  "cultura",
  "deporte"
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

async function seedMarketIntelligence() {
  try {
    console.log("🌱 Starting Market Intelligence seed...");
    
    // Truncate existing data
    await pool.query("TRUNCATE TABLE market_intelligence CASCADE");
    console.log("✓ Cleared existing data");

    // Insert market intelligence records
    const insertQuery = `
      INSERT INTO market_intelligence (
        municipio, departamento, volume_organic, volume_paid, gap_score, 
        clima_organico, interes_pagado, nivel_alerta,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    `;

    for (const mun of municipalities) {
      const volume_organic = randomInt(500, 5000);
      const volume_paid = randomInt(200, 3000);
      const total = volume_organic + volume_paid;
      const gap_score = volume_paid / total;
      const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
      const interest = interests[Math.floor(Math.random() * interests.length)];
      const alert_level = randomInt(1, 10);

      await pool.query(insertQuery, [
        mun.municipio,
        mun.departamento,
        volume_organic,
        volume_paid,
        gap_score,
        sentiment,
        interest,
        alert_level
      ]);

      console.log(`✓ Seeded: ${mun.municipio} (${sentiment}, alerta: ${alert_level}/10)`);
    }

    console.log("\n✅ Market Intelligence data seeded successfully!");
    console.log(`📊 Total records inserted: ${municipalities.length}`);
    
    // Verify data
    const result = await pool.query("SELECT COUNT(*) as count FROM market_intelligence");
    console.log(`📈 Verification: ${result.rows[0].count} records in database`);

  } catch (err) {
    console.error("❌ Error seeding data:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedMarketIntelligence();
