import { pool } from "@/lib/db";

// Script para insertar datos de prueba en trendsmap_entries
async function seedTrendsmapData() {
  try {
    console.log("[seed] Iniciando seed de trendsmap_entries...");

    // Primero, verificar si la tabla existe
    const { rows: tableExists } = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'trendsmap_entries'
      );
    `);

    if (!tableExists[0].exists) {
      console.log("[seed] Tabla no existe, creando...");
      await pool.query(`
        CREATE TABLE trendsmap_entries (
          id SERIAL PRIMARY KEY,
          text TEXT NOT NULL,
          hashtags TEXT[] DEFAULT '{}',
          latitude DOUBLE PRECISION NOT NULL,
          longitude DOUBLE PRECISION NOT NULL,
          pais VARCHAR(100) DEFAULT 'Colombia',
          departamento VARCHAR(100),
          municipio VARCHAR(100),
          verificado BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX idx_trendsmap_lat_lng ON trendsmap_entries(latitude, longitude);
        CREATE INDEX idx_trendsmap_depto ON trendsmap_entries(departamento);
        CREATE INDEX idx_trendsmap_municipio ON trendsmap_entries(municipio);
        CREATE INDEX idx_trendsmap_created ON trendsmap_entries(created_at DESC);
        CREATE INDEX idx_trendsmap_hashtags ON trendsmap_entries USING GIN(hashtags);
      `);
      console.log("[seed] Tabla creada");
    }

    // Insertar datos de prueba
    const testEntries = [
      {
        text: "Problemas de movilidad en la avenida septima",
        hashtags: ["#Bogota", "#Movilidad", "#Transito"],
        lat: 4.7124,
        lng: -74.0055,
        depto: "Cundinamarca",
        municipio: "Bogotá",
      },
      {
        text: "Inauguración del nuevo centro comercial en el norte",
        hashtags: ["#Bogota", "#Comercio", "#Desarrollo"],
        lat: 4.8233,
        lng: -74.0206,
        depto: "Cundinamarca",
        municipio: "Bogotá",
      },
      {
        text: "Festival cultural en el barrio la candelaria",
        hashtags: ["#Bogota", "#Cultura", "#Eventos"],
        lat: 4.5971,
        lng: -74.0766,
        depto: "Cundinamarca",
        municipio: "Bogotá",
      },
      {
        text: "Mejora en servicios de agua potable en soacha",
        hashtags: ["#Soacha", "#Servicios", "#Agua"],
        lat: 4.5797,
        lng: -74.2008,
        depto: "Cundinamarca",
        municipio: "Soacha",
      },
      {
        text: "Reactivación del comercio en el centro de medellin",
        hashtags: ["#Medellin", "#Comercio", "#Economia"],
        lat: 6.2476,
        lng: -75.5658,
        depto: "Antioquia",
        municipio: "Medellín",
      },
      {
        text: "Nuevas ciclovias en la comuna 3",
        hashtags: ["#Medellin", "#Movilidad", "#Ciclovia"],
        lat: 6.2543,
        lng: -75.5534,
        depto: "Antioquia",
        municipio: "Medellín",
      },
      {
        text: "Carnaval de barranquilla 2026 - preparativos finales",
        hashtags: ["#Barranquilla", "#Carnaval", "#Fiesta"],
        lat: 10.9685,
        lng: -74.7813,
        depto: "Atlántico",
        municipio: "Barranquilla",
      },
      {
        text: "Problema de delincuencia en barrio El Bosque",
        hashtags: ["#Cali", "#Seguridad", "#Denuncia"],
        lat: 3.4516,
        lng: -76.532,
        depto: "Valle del Cauca",
        municipio: "Cali",
      },
    ];

    for (const entry of testEntries) {
      await pool.query(
        `INSERT INTO trendsmap_entries (text, hashtags, latitude, longitude, departamento, municipio, pais, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'Colombia', NOW() - INTERVAL '${Math.random() * 20} minutes')`,
        [entry.text, entry.hashtags, entry.lat, entry.lng, entry.depto, entry.municipio]
      );
    }

    console.log("[seed] ✓ Datos insertados exitosamente");
  } catch (err) {
    console.error("[seed] Error:", err);
  }
}

seedTrendsmapData();
