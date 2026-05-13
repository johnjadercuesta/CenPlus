"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenant, setTenant] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTenant, setShowTenant] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // 1. Detectar tenant por subdominio (ej: cliente1.cenplus.com)
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN;
    const hostname = window.location.hostname;

    if (baseDomain && hostname.endsWith(baseDomain) && hostname !== baseDomain) {
      const t = hostname.replace(`.${baseDomain}`, "").split(":")[0]; // Quitar puerto si existe
      if (t && t !== "www") {
        setTenant(t);
        setShowTenant(true); // Mostrar para que el usuario sepa en qué organización está
        return;
      }
    }

    // 2. Pre-fill tenant from URL param: /login?tenant=xxx (fallback)
    const t = searchParams.get("tenant");
    if (t) {
      setTenant(t);
      setShowTenant(true);
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const body: Record<string, string> = { email, password };
      if (tenant.trim()) {
        body.tenant = tenant.trim().toLowerCase();
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión");
      } else {
        localStorage.setItem("token", data.token);
        if (data.tenant || body.tenant) {
          localStorage.setItem("tenant", data.tenant || body.tenant);
        }
        router.push("/dashboard");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e3a5f 100%)",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      {/* Left panel - branding */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 48,
        color: "white",
      }}>
        <div style={{ maxWidth: 400 }}>
          <div style={{
            width: 72, height: 72,
            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
            borderRadius: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, fontWeight: 800,
            marginBottom: 24,
            boxShadow: "0 20px 40px rgba(59,130,246,0.35)",
          }}>
            C+
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8, letterSpacing: -1 }}>
            CenPlus
          </h1>
          <p style={{ fontSize: 18, color: "#94a3b8", marginBottom: 32, lineHeight: 1.6 }}>
            Plataforma de Gestión Comunitaria e Inteligencia Territorial
          </p>
          <div style={{ display: "flex", gap: 24, color: "#cbd5e1", fontSize: 13 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#60a5fa" }}>PWA</div>
              <div>Multiplataforma</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#a78bfa" }}>GPS</div>
              <div>Geolocalización</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#34d399" }}>Multi</div>
              <div>Multi-Tenant</div>
            </div>
          </div>

          {/* Setup link */}
          <div style={{ marginTop: 40, padding: "16px 20px", background: "rgba(255,255,255,0.05)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}>
            <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 8px", fontWeight: 600 }}>
              ¿Eres administrador del sistema?
            </p>
            <a href="/setup" style={{
              color: "#60a5fa", fontSize: 13, textDecoration: "none",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              ⚙️ Ir al Panel de Administración →
            </a>
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div style={{
        width: 480,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 48,
      }}>
        <div style={{
          width: "100%",
          maxWidth: 400,
          background: "white",
          borderRadius: 20,
          padding: 40,
          boxShadow: "0 40px 80px rgba(0, 0, 0, 0.35)",
        }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, color: "#0f172a", margin: "0 0 4px" }}>
            Iniciar Sesión
          </h2>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 28 }}>
            Ingresa tus credenciales para acceder
          </p>

          {error && (
            <div style={{
              padding: "12px 16px",
              background: "#fef2f2",
              color: "#dc2626",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 20,
              border: "1px solid #fecaca",
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@tuorganizacion.com"
                style={{
                  width: "100%", padding: "12px 16px",
                  border: "1.5px solid #e2e8f0", borderRadius: 10,
                  fontSize: 14, outline: "none", boxSizing: "border-box",
                  background: "#f8fafc", color: "#1e293b",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = "#3b82f6"}
                onBlur={e => e.target.style.borderColor = "#e2e8f0"}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: "100%", padding: "12px 16px",
                  border: "1.5px solid #e2e8f0", borderRadius: 10,
                  fontSize: 14, outline: "none", boxSizing: "border-box",
                  background: "#f8fafc", color: "#1e293b",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = "#3b82f6"}
                onBlur={e => e.target.style.borderColor = "#e2e8f0"}
              />
            </div>

            {/* Tenant selector - toggle */}
            <div style={{ marginBottom: 24 }}>
              <button
                type="button"
                onClick={() => setShowTenant(!showTenant)}
                style={{
                  background: "none", border: "none", padding: 0,
                  color: "#6366f1", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                  marginBottom: showTenant ? 10 : 0,
                }}
              >
                {showTenant ? "▼" : "▶"} Especificar organización (tenant)
              </button>

              {showTenant && (
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                    Nombre de organización
                  </label>
                  <input
                    type="text"
                    value={tenant}
                    onChange={(e) => setTenant(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="ejemplo: municipio1"
                    style={{
                      width: "100%", padding: "11px 16px",
                      border: "1.5px solid #c7d2fe", borderRadius: 10,
                      fontSize: 14, outline: "none", boxSizing: "border-box",
                      background: "#eef2ff", color: "#312e81",
                    }}
                  />
                  <p style={{ color: "#6366f1", fontSize: 11, marginTop: 4 }}>
                    Déjalo vacío si no conoces tu organización (se detectará automáticamente).
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "14px",
                background: loading ? "#94a3b8" : "linear-gradient(135deg, #3b82f6, #6366f1)",
                border: "none", borderRadius: 12,
                color: "white", fontSize: 15, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : "0 10px 25px rgba(59,130,246,0.3)",
                transition: "all 0.2s",
              }}
            >
              {loading ? "⏳ Ingresando..." : "Iniciar Sesión →"}
            </button>
          </form>

          <div style={{
            marginTop: 24, padding: "14px 16px",
            background: "#f8fafc", borderRadius: 10,
            border: "1px solid #e2e8f0",
          }}>
            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 6, fontWeight: 700 }}>
              💡 Credenciales por defecto (por organización):
            </p>
            <p style={{ fontSize: 12, color: "#475569", margin: "4px 0" }}>
              Admin: <code style={{ background: "#e2e8f0", padding: "1px 5px", borderRadius: 3 }}>admin@cenplus.com</code> / <code style={{ background: "#e2e8f0", padding: "1px 5px", borderRadius: 3 }}>admin123</code>
            </p>
            <p style={{ fontSize: 12, color: "#475569", margin: "4px 0 0" }}>
              Líder: <code style={{ background: "#e2e8f0", padding: "1px 5px", borderRadius: 3 }}>lider@cenplus.com</code> / <code style={{ background: "#e2e8f0", padding: "1px 5px", borderRadius: 3 }}>lider123</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0f172a" }} />}>
      <LoginForm />
    </Suspense>
  );
}
