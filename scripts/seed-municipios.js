const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres" });

function calculateHeatIndex(volume, velocity, sentimentScore) {
  const vScore = Math.min(volume / 8000, 1) * 30;
  const aScore = Math.min(velocity / 300, 1) * 50;
  const sScore = ((sentimentScore + 5) / 10) * 20;
  return parseFloat((vScore + aScore + sScore).toFixed(2));
}

const DEPARTAMENTOS = {
  "Amazonas": [
    { ciudad: "Leticia", lat: -4.2153, lng: -69.9406 },
    { ciudad: "Puerto Nariño", lat: -3.7833, lng: -70.3500 },
    { ciudad: "La Chorrera", lat: -0.6167, lng: -73.2500 },
  ],
  "Antioquia": [
    { ciudad: "Medellín", lat: 6.2476, lng: -75.5658 },
    { ciudad: "Bello", lat: 6.3370, lng: -75.5564 },
    { ciudad: "Itagüí", lat: 6.1645, lng: -75.5990 },
    { ciudad: "Envigado", lat: 6.1695, lng: -75.5836 },
    { ciudad: "Sabaneta", lat: 6.1514, lng: -75.6161 },
    { ciudad: "Rionegro", lat: 6.1645, lng: -75.3747 },
    { ciudad: "Apartadó", lat: 7.8820, lng: -76.6270 },
    { ciudad: "Turbo", lat: 8.0958, lng: -76.7270 },
    { ciudad: "Caucasia", lat: 7.9878, lng: -75.1936 },
    { ciudad: "Santa Fe de Antioquia", lat: 6.5558, lng: -75.8297 },
    { ciudad: "Jericó", lat: 5.7844, lng: -75.7850 },
    { ciudad: "Jardín", lat: 5.5269, lng: -75.8167 },
    { ciudad: "Guatapé", lat: 6.2308, lng: -75.1600 },
    { ciudad: "Marinilla", lat: 6.1822, lng: -75.3386 },
  ],
  "Arauca": [
    { ciudad: "Arauca", lat: 7.0886, lng: -70.7614 },
    { ciudad: "Saravena", lat: 6.9119, lng: -71.8756 },
    { ciudad: "Tame", lat: 6.4644, lng: -71.7336 },
  ],
  "Atlántico": [
    { ciudad: "Barranquilla", lat: 10.9685, lng: -74.7813 },
    { ciudad: "Soledad", lat: 10.9185, lng: -74.7644 },
    { ciudad: "Malambo", lat: 10.8586, lng: -74.7772 },
    { ciudad: "Sabanalarga", lat: 10.6333, lng: -74.9167 },
    { ciudad: "Baranoa", lat: 10.7917, lng: -74.9311 },
    { ciudad: "Santo Tomás", lat: 10.7833, lng: -74.8833 },
  ],
  "Bogotá D.C.": [
    { ciudad: "Bogotá", lat: 4.7110, lng: -74.0721 },
    { ciudad: "Soacha", lat: 4.5794, lng: -74.2169 },
    { ciudad: "Mosquera", lat: 4.7058, lng: -74.2303 },
    { ciudad: "Madrid", lat: 4.7333, lng: -74.2667 },
    { ciudad: "Funza", lat: 4.7167, lng: -74.2167 },
    { ciudad: "Facatativá", lat: 4.8139, lng: -74.3550 },
    { ciudad: "Zipaquirá", lat: 5.0231, lng: -74.0019 },
    { ciudad: "Chía", lat: 4.8608, lng: -74.0586 },
    { ciudad: "Cajicá", lat: 4.9186, lng: -74.0292 },
  ],
  "Bolívar": [
    { ciudad: "Cartagena", lat: 10.3910, lng: -75.5144 },
    { ciudad: "Magangué", lat: 9.2422, lng: -74.7539 },
    { ciudad: "Turbaco", lat: 10.3167, lng: -75.4333 },
    { ciudad: "Arjona", lat: 10.3333, lng: -75.3833 },
    { ciudad: "El Carmen de Bolívar", lat: 9.5333, lng: -75.1500 },
    { ciudad: "Mompox", lat: 9.2419, lng: -74.4336 },
  ],
  "Boyacá": [
    { ciudad: "Tunja", lat: 5.5353, lng: -73.3678 },
    { ciudad: "Duitama", lat: 5.8272, lng: -73.0336 },
    { ciudad: "Sogamoso", lat: 5.7147, lng: -72.9336 },
    { ciudad: "Chiquinquirá", lat: 5.6167, lng: -73.8167 },
    { ciudad: "Villa de Leyva", lat: 5.6333, lng: -73.5167 },
    { ciudad: "Paipa", lat: 5.8167, lng: -73.1167 },
  ],
  "Caldas": [
    { ciudad: "Manizales", lat: 5.0689, lng: -75.5174 },
    { ciudad: "Dosquebradas", lat: 4.8386, lng: -75.6769 },
    { ciudad: "Chinchiná", lat: 4.9667, lng: -75.6000 },
    { ciudad: "La Dorada", lat: 5.4486, lng: -74.6636 },
    { ciudad: "Aguadas", lat: 5.4167, lng: -75.4500 },
  ],
  "Caquetá": [
    { ciudad: "Florencia", lat: 1.6144, lng: -75.6061 },
    { ciudad: "San Vicente del Caguán", lat: 2.1000, lng: -74.7667 },
    { ciudad: "Cartagena del Chairá", lat: 1.0167, lng: -75.1667 },
  ],
  "Casanare": [
    { ciudad: "Yopal", lat: 5.3447, lng: -72.3922 },
    { ciudad: "Aguazul", lat: 5.1333, lng: -72.9667 },
    { ciudad: "Tauramena", lat: 4.9167, lng: -72.7167 },
    { ciudad: "Villanueva", lat: 4.9167, lng: -72.9500 },
  ],
  "Cauca": [
    { ciudad: "Popayán", lat: 2.4419, lng: -76.6064 },
    { ciudad: "Santander de Quilichao", lat: 3.0167, lng: -76.4833 },
    { ciudad: "Puerto Tejada", lat: 3.0833, lng: -76.5000 },
    { ciudad: "Patía", lat: 2.3167, lng: -76.9833 },
    { ciudad: "Corinto", lat: 3.1167, lng: -76.2167 },
  ],
  "Cesar": [
    { ciudad: "Valledupar", lat: 10.4733, lng: -73.2503 },
    { ciudad: "Aguachica", lat: 8.3086, lng: -73.6161 },
    { ciudad: "Bosconia", lat: 9.3333, lng: -73.5333 },
    { ciudad: "La Jagua de Ibirico", lat: 8.8833, lng: -73.2500 },
  ],
  "Chocó": [
    { ciudad: "Quibdó", lat: 5.6947, lng: -76.6611 },
    { ciudad: "Istmina", lat: 5.1833, lng: -76.6833 },
    { ciudad: "Tadó", lat: 5.2500, lng: -76.5167 },
    { ciudad: "Bahía Solano", lat: 6.2167, lng: -77.3833 },
  ],
  "Córdoba": [
    { ciudad: "Montería", lat: 8.7478, lng: -75.8814 },
    { ciudad: "Cereté", lat: 8.8833, lng: -75.7833 },
    { ciudad: "Sahagún", lat: 8.9333, lng: -75.4500 },
    { ciudad: "Lorica", lat: 9.2333, lng: -75.8167 },
    { ciudad: "Tierralta", lat: 8.1667, lng: -76.0667 },
    { ciudad: "Planeta Rica", lat: 8.4000, lng: -75.6167 },
  ],
  "Cundinamarca": [
    { ciudad: "Bogotá", lat: 4.7110, lng: -74.0721 },
    { ciudad: "Soacha", lat: 4.5794, lng: -74.2169 },
    { ciudad: "Girardot", lat: 4.3019, lng: -74.8022 },
    { ciudad: "Zipaquirá", lat: 5.0231, lng: -74.0019 },
    { ciudad: "Facatativá", lat: 4.8139, lng: -74.3550 },
    { ciudad: "Chía", lat: 4.8608, lng: -74.0586 },
    { ciudad: "Fusagasugá", lat: 4.3386, lng: -74.3636 },
    { ciudad: "Mosquera", lat: 4.7058, lng: -74.2303 },
    { ciudad: "Madrid", lat: 4.7333, lng: -74.2667 },
    { ciudad: "Funza", lat: 4.7167, lng: -74.2167 },
    { ciudad: "Cajicá", lat: 4.9186, lng: -74.0292 },
    { ciudad: "Tocancipá", lat: 4.9667, lng: -73.9167 },
    { ciudad: "Sibaté", lat: 4.4986, lng: -74.2636 },
    { ciudad: "La Mesa", lat: 4.5833, lng: -74.4667 },
    { ciudad: "Villeta", lat: 5.0167, lng: -74.4667 },
  ],
  "Guainía": [
    { ciudad: "Inírida", lat: 3.8667, lng: -67.9167 },
  ],
  "Guaviare": [
    { ciudad: "San José del Guaviare", lat: 2.5667, lng: -72.6500 },
    { ciudad: "Miraflores", lat: 1.2000, lng: -72.7833 },
  ],
  "Huila": [
    { ciudad: "Neiva", lat: 2.9275, lng: -75.2819 },
    { ciudad: "Pitalito", lat: 1.8536, lng: -76.0503 },
    { ciudad: "Garzón", lat: 2.1833, lng: -75.6167 },
    { ciudad: "La Plata", lat: 2.3667, lng: -75.8833 },
    { ciudad: "Campoalegre", lat: 2.6167, lng: -75.2167 },
  ],
  "La Guajira": [
    { ciudad: "Riohacha", lat: 11.5444, lng: -72.9072 },
    { ciudad: "Maicao", lat: 11.3833, lng: -72.2333 },
    { ciudad: "Uribia", lat: 12.1667, lng: -72.1667 },
    { ciudad: "Fonseca", lat: 11.0167, lng: -72.8667 },
  ],
  "Magdalena": [
    { ciudad: "Santa Marta", lat: 11.2408, lng: -74.1990 },
    { ciudad: "Ciénaga", lat: 11.0333, lng: -74.2500 },
    { ciudad: "Fundación", lat: 10.5333, lng: -74.1667 },
    { ciudad: "El Banco", lat: 9.0333, lng: -73.9500 },
    { ciudad: "Plato", lat: 9.6500, lng: -74.6833 },
  ],
  "Meta": [
    { ciudad: "Villavicencio", lat: 4.1420, lng: -73.6266 },
    { ciudad: "Granada", lat: 3.5333, lng: -73.7333 },
    { ciudad: "Acacías", lat: 3.9167, lng: -73.7833 },
    { ciudad: "Puerto López", lat: 4.0833, lng: -72.9667 },
    { ciudad: "San Martín", lat: 3.5500, lng: -73.6667 },
    { ciudad: "Restrepo", lat: 4.0833, lng: -73.5667 },
  ],
  "Nariño": [
    { ciudad: "Pasto", lat: 1.2136, lng: -77.2811 },
    { ciudad: "Ipiales", lat: 0.8297, lng: -77.6419 },
    { ciudad: "Tumaco", lat: 1.8000, lng: -78.7667 },
    { ciudad: "Túquerres", lat: 1.0833, lng: -77.6167 },
    { ciudad: "Samaniego", lat: 1.1667, lng: -77.3500 },
  ],
  "Norte de Santander": [
    { ciudad: "Cúcuta", lat: 7.8939, lng: -72.5078 },
    { ciudad: "Ocaña", lat: 8.2386, lng: -73.3519 },
    { ciudad: "Pamplona", lat: 7.3667, lng: -72.6500 },
    { ciudad: "Villa del Rosario", lat: 7.8667, lng: -72.4500 },
    { ciudad: "Tibú", lat: 8.6500, lng: -72.7333 },
    { ciudad: "Los Patios", lat: 7.8167, lng: -72.5167 },
  ],
  "Putumayo": [
    { ciudad: "Mocoa", lat: 1.1500, lng: -76.6500 },
    { ciudad: "Puerto Asís", lat: 0.5167, lng: -76.5000 },
    { ciudad: "Sibundoy", lat: 1.1333, lng: -76.8833 },
  ],
  "Quindío": [
    { ciudad: "Armenia", lat: 4.5350, lng: -75.6769 },
    { ciudad: "Calarcá", lat: 4.5167, lng: -75.6333 },
    { ciudad: "La Tebaida", lat: 4.4500, lng: -75.7667 },
    { ciudad: "Montenegro", lat: 4.5667, lng: -75.7500 },
    { ciudad: "Circasia", lat: 4.5833, lng: -75.6167 },
  ],
  "Risaralda": [
    { ciudad: "Pereira", lat: 4.8133, lng: -75.6961 },
    { ciudad: "Dosquebradas", lat: 4.8386, lng: -75.6769 },
    { ciudad: "Santa Rosa de Cabal", lat: 4.8667, lng: -75.6167 },
    { ciudad: "La Virginia", lat: 4.9000, lng: -75.8667 },
  ],
  "San Andrés y Providencia": [
    { ciudad: "San Andrés", lat: 12.5847, lng: -81.7006 },
  ],
  "Santander": [
    { ciudad: "Bucaramanga", lat: 7.1254, lng: -73.1198 },
    { ciudad: "Floridablanca", lat: 7.0636, lng: -73.0861 },
    { ciudad: "Girón", lat: 7.0667, lng: -73.1667 },
    { ciudad: "Piedecuesta", lat: 6.9333, lng: -73.0500 },
    { ciudad: "Barrancabermeja", lat: 7.0636, lng: -73.8547 },
    { ciudad: "Vélez", lat: 6.0333, lng: -73.2333 },
    { ciudad: "San Gil", lat: 6.5586, lng: -73.1336 },
    { ciudad: "Málaga", lat: 6.5667, lng: -72.9333 },
  ],
  "Sucre": [
    { ciudad: "Sincelejo", lat: 9.3047, lng: -75.3978 },
    { ciudad: "Corozal", lat: 9.3167, lng: -75.2833 },
    { ciudad: "Sampués", lat: 9.2333, lng: -75.3833 },
    { ciudad: "Magangué", lat: 9.2422, lng: -74.7539 },
  ],
  "Tolima": [
    { ciudad: "Ibagué", lat: 4.4389, lng: -75.2322 },
    { ciudad: "Espinal", lat: 4.1500, lng: -74.8833 },
    { ciudad: "Melgar", lat: 4.2000, lng: -74.6500 },
    { ciudad: "Honda", lat: 5.2000, lng: -74.7333 },
    { ciudad: "Líbano", lat: 5.1667, lng: -75.0833 },
    { ciudad: "Guamo", lat: 4.0667, lng: -74.9667 },
    { ciudad: "Purificación", lat: 3.7333, lng: -74.9333 },
  ],
  "Valle del Cauca": [
    { ciudad: "Cali", lat: 3.4516, lng: -76.5320 },
    { ciudad: "Palmira", lat: 3.5394, lng: -76.3036 },
    { ciudad: "Buenaventura", lat: 3.8833, lng: -77.0167 },
    { ciudad: "Tuluá", lat: 4.0847, lng: -76.1953 },
    { ciudad: "Yumbo", lat: 3.5833, lng: -76.5000 },
    { ciudad: "Cartago", lat: 4.7464, lng: -75.9114 },
    { ciudad: "Jamundí", lat: 3.2833, lng: -76.5500 },
    { ciudad: "Buga", lat: 3.9000, lng: -76.3000 },
    { ciudad: "Roldanillo", lat: 4.3833, lng: -76.1333 },
    { ciudad: "Zarzal", lat: 4.2000, lng: -76.0167 },
  ],
  "Vaupés": [
    { ciudad: "Mitú", lat: 1.2500, lng: -70.2333 },
  ],
  "Vichada": [
    { ciudad: "Puerto Carreño", lat: 6.1850, lng: -67.4861 },
  ],
};

const REGION_TOPICS = {
  "Amazonas": ["Deforestación Amazonía", "Ecoturismo Leticia", "Comunidades Indígenas"],
  "Antioquia": ["Metro de Medellín", "Café Especial Antioquia", "Innovación EAFIT", "Turismo Guatapé", "Agroindustria Urabá"],
  "Arauca": ["Petróleo Arauca", "Ganadería Llanera", "Frontera Venezuela"],
  "Atlántico": ["Carnaval Barranquilla", "Puerto Industrial", "Zona Franca"],
  "Bogotá D.C.": ["Transmilenio", "Ciclovía Bogotá", "Startups Colombia", "Alcaldía Bogotá", "Seguridad Capital"],
  "Bolívar": ["Turismo Cartagena", "Canal del Dique", "Patrimonio Mompox"],
  "Boyacá": ["Batalla de Boyacá", "Turismo Villa de Leyva", "Agricultura Boyacá"],
  "Caldas": ["Eje Cafetero", "Café Origen", "Termales Manizales"],
  "Caquetá": ["Deforestación Caquetá", "Ganadería Sostenible", "Reserva Natural"],
  "Casanare": ["Petrolera Casanare", "Toros Llaneros", "Agroindustria"],
  "Cauca": ["Resguardos Indígenas", "Café Cauca", "Minería Ilegal"],
  "Cesar": ["Festival Vallenato", "Carbón Cerrejón", "Cultura Vallenata"],
  "Chocó": ["Biodiversidad Chocó", "Minería Chocó", "Ecoturismo Pacífico"],
  "Córdoba": ["Ganadería Córdoba", "Ciénaga de Lorica", "Agricultura Sinú"],
  "Cundinamarca": ["Parque Nacional Chingaza", "Salto del Tequendama", "Agro Cundinamarca"],
  "Guainía": ["Río Guainía", "Comunidades Curripaco"],
  "Guaviare": ["Pinturas Rupestres", "Selva Amazónica", "Ecoturismo"],
  "Huila": ["Desierto Tatacoa", "Café Huila", "Represa Betania"],
  "La Guajira": ["Cabo de la Vela", "Comunidades Wayúu", "Energía Eólica"],
  "Magdalena": ["Sierra Nevada", "Turismo Santa Marta", "Ciénaga Grande"],
  "Meta": ["Villavicencio Puerto", "Agro Meta", "Turismo Llanero"],
  "Nariño": ["Volcán Galeras", "Café Nariño", "Frontera Ecuador"],
  "Norte de Santander": ["Frontera Cúcuta", "Comercio Binacional", "Carbón Norte"],
  "Putumayo": ["Coca Putumayo", "Parque Caguán", "Bioeconomía"],
  "Quindío": ["Parque del Café", "Turismo Eje Cafetero", "Armenia"],
  "Risaralda": ["Pereira Innovación", "Eje Cafetero", "Agroindustria"],
  "San Andrés y Providencia": ["Mar de 7 Colores", "Turismo San Andrés", "Arrecife Coral"],
  "Santander": ["Cañón del Chicamocha", "Piedecuesta", "Turismo Aventura"],
  "Sucre": ["Ganadería Sucre", "Porro Sucreño", "Agricultura"],
  "Tolima": ["Festival Folclórico", "Arroz Tolima", "Termas Ibagué"],
  "Valle del Cauca": ["Cali Feria", "Puerto Buenaventura", "Industria Valle"],
  "Vaupés": ["Río Vaupés", "Comunidades Indígenas"],
  "Vichada": ["Parque El Tuparro", "Sabana Vichada"],
};

const PLATFORMS = ['X (Twitter)', 'TikTok', 'Instagram', 'YouTube', 'Facebook', 'LinkedIn', 'Google Trends'];

async function seedMunicipios() {
  console.log("🌍 Seeding municipios con tendencias...");
  let total = 0;

  for (const [depto, municipios] of Object.entries(DEPARTAMENTOS)) {
    const topics = REGION_TOPICS[depto] || ["Desarrollo Regional", "Economía Local"];

    for (const m of municipios) {
      const topic = topics[Math.floor(Math.random() * topics.length)];
      const topicVariation = `${topic} - ${m.ciudad}`;

      for (const p of PLATFORMS) {
        const volume = Math.floor(Math.random() * 8000) + 500;
        const velocity = Math.floor(Math.random() * 400) + 20;
        const sentimentScore = (Math.random() * 3) - 1;
        const heat = calculateHeatIndex(volume, velocity, sentimentScore);

        const metrics = {
          mentions: volume,
          growth_1h: velocity,
          reach: volume * 15,
          engagement_avg: (Math.random() * 10 + 2).toFixed(2)
        };

        await pool.query(`
          INSERT INTO global_trends (topic, platform, metrics, sentiment_score, heat_index, region, pais, departamento, ciudad, latitude, longitude)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (topic, platform) DO UPDATE SET 
            metrics = EXCLUDED.metrics,
            sentiment_score = EXCLUDED.sentiment_score,
            heat_index = EXCLUDED.heat_index,
            region = EXCLUDED.region,
            pais = EXCLUDED.pais,
            departamento = EXCLUDED.departamento,
            ciudad = EXCLUDED.ciudad,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            timestamp = NOW()
        `, [topicVariation, p, JSON.stringify(metrics), sentimentScore, heat, depto, "Colombia", depto, m.ciudad, m.lat, m.lng]);

        total++;
      }
    }
  }

  console.log(`✅ Seeded ${total} trend records across all Colombian municipalities`);
}

seedMunicipios().catch(console.error).finally(() => pool.end());
