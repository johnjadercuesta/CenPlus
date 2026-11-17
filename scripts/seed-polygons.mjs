import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres',
});

const TENANT = 'testorg2';

async function main() {
  const client = await pool.connect();
  try {
    // Ensure column exists
    await client.query(`ALTER TABLE "${TENANT}".barrios ADD COLUMN IF NOT EXISTS poligono TEXT`);
    console.log('Ensured poligono column exists');

    // Get all barrios with citizen coordinates
    const { rows: barrios } = await client.query(`
      SELECT b.id, b.nombre, b.comuna_id, c.nombre as comuna_nombre
      FROM "${TENANT}".barrios b
      JOIN "${TENANT}".comunas c ON c.id = b.comuna_id
      ORDER BY b.id
    `);
    console.log(`Found ${barrios.length} barrios`);

    let updatedCount = 0;
    for (const barrio of barrios) {
      // Get citizen coordinates for this barrio
      const { rows: citizens } = await client.query(`
        SELECT latitud, longitud FROM "${TENANT}".ciudadanos
        WHERE id_barrio = $1 AND latitud IS NOT NULL AND longitud IS NOT NULL
      `, [barrio.id]);

      let polygon;
      if (citizens.length >= 2) {
        const lats = citizens.map(c => c.latitud);
        const lngs = citizens.map(c => c.longitud);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const padLat = (maxLat - minLat) * 0.3 + 0.002;
        const padLng = (maxLng - minLng) * 0.3 + 0.002;
        polygon = [
          [minLat - padLat, minLng - padLng],
          [minLat - padLat, maxLng + padLng],
          [maxLat + padLat, maxLng + padLng],
          [maxLat + padLat, minLng - padLng],
        ];
      } else if (citizens.length === 1) {
        const { latitud, longitud } = citizens[0];
        const offset = 0.003;
        polygon = [
          [latitud - offset, longitud - offset],
          [latitud - offset, longitud + offset],
          [latitud + offset, longitud + offset],
          [latitud + offset, longitud - offset],
        ];
      } else {
        // No citizens with coords: create a small polygon near the comuna center
        const comunaOffsets = {
          3: [4.61, -74.25],   // Norte
          4: [4.63, -74.20],   // Centro
          5: [4.58, -74.22],   // Sur
          6: [4.55, -74.28],   // Corregimiento Rural
          1: [4.60, -74.23],   // Estructura 1
        };
        const center = comunaOffsets[barrio.comuna_id] || [4.60, -74.23];
        const offset = 0.005;
        polygon = [
          [center[0] - offset, center[1] - offset],
          [center[0] - offset, center[1] + offset],
          [center[0] + offset, center[1] + offset],
          [center[0] + offset, center[1] - offset],
        ];
      }

      await client.query(
        `UPDATE "${TENANT}".barrios SET poligono = $1 WHERE id = $2`,
        [JSON.stringify(polygon), barrio.id]
      );
      updatedCount++;
      console.log(`  Barrio #${barrio.id} "${barrio.nombre}" (${barrio.comuna_nombre}): ${citizens.length} coords -> polygon saved`);
    }

    console.log(`\nUpdated ${updatedCount}/${barrios.length} barrios with polygons`);
    console.log('=== DONE ===');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
