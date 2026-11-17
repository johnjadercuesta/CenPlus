const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres" });

async function seedCandidatos() {
  const client = await pool.connect();
  try {
    const s = 'tenant1';
    console.log(`Sembrando candidatos de prueba para ${s}...`);

    const candidatosSeed = [
      { nombre: "Candidato a Presidencia", corporacion: "presidencia", numero_tarjeton: "1", partido: "Gran Coalición Nacional" },
      { nombre: "Senador de la República", corporacion: "senado", numero_tarjeton: "10", partido: "Partido Alianza" },
      { nombre: "Representante a la Cámara", corporacion: "camara", numero_tarjeton: "101", partido: "Partido Alianza" },
      { nombre: "Candidato a Gobernación", corporacion: "gobernacion", numero_tarjeton: "2", partido: "Movimiento Departamental" },
      { nombre: "Candidato a Alcaldía", corporacion: "alcaldia", numero_tarjeton: "1", partido: "Unión por el Municipio" },
      { nombre: "Concejal Carlos Sánchez", corporacion: "concejo", numero_tarjeton: "5", partido: "Unión por el Municipio" },
      { nombre: "Concejal Martha Gómez", corporacion: "concejo", numero_tarjeton: "12", partido: "Partido Independiente" }
    ];

    for (const c of candidatosSeed) {
      await client.query(`
        INSERT INTO "${s}".corporaciones_candidatos (nombre, corporacion, numero_tarjeton, partido)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, [c.nombre, c.corporacion, c.numero_tarjeton, c.partido]);
    }

    console.log("Candidatos sembrados exitosamente.");
  } catch (err) {
    console.error("Error sembrando candidatos:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

seedCandidatos();
