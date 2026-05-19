import { ensureIdentificacionColumn } from "@/lib/db-init";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[INSTRUMENTATION] Server starting, running migrations...");
    try {
      const result = await ensureIdentificacionColumn();
      console.log("[INSTRUMENTATION] Migration result:", result);
    } catch (err: any) {
      console.error("[INSTRUMENTATION] Migration failed:", err?.message);
    }
    console.log("[INSTRUMENTATION] Server ready");
  }
}
