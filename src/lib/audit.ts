import { pool } from "./db";

export async function recordLog(params: {
  tenant: string;
  email: string;
  nombre?: string;
  modulo: string;
  accion: string;
}) {
  try {
    await pool.query(
      `INSERT INTO public.system_logs (tenant, usuario_email, usuario_nombre, modulo, accion)
       VALUES ($1, $2, $3, $4, $5)`,
      [params.tenant, params.email, params.nombre || params.email, params.modulo, params.accion]
    );
  } catch (error) {
    console.error("Error al registrar log:", error);
  }
}
