import { ensureIdentificacionColumn } from "@/lib/db-init";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[INSTRUMENTATION] Server starting, running migrations...");
    await ensureIdentificacionColumn();
    console.log("[INSTRUMENTATION] Migrations complete");
  }
}
