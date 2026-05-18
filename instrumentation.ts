import { ensureIdentificacionColumn } from "@/lib/db-init";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[INSTRUMENTATION] Server starting, running migrations in background...");
    ensureIdentificacionColumn().catch((err) => {
      console.error("[INSTRUMENTATION] Migration failed:", err);
    });
    console.log("[INSTRUMENTATION] Server ready");
  }
}
