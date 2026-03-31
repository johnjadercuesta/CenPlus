"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión");
      } else {
        localStorage.setItem("token", data.token);
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
            width: 72,
            height: 72,
            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            fontWeight: 800,
            marginBottom: 24,
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
              <div style={{ fontSize: 28, fontWeight: 800, color: "#34d399" }}>Real-time</div>
              <div>En tiempo real</div>
            </div>
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
          maxWidth: 380,
          background: "white",
          borderRadius: 16,
          padding: 40,
          boxShadow: "0 25px 50px rgba(0, 0, 0, 0.25)",
        }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, color: "#0f172a" }}>
            Iniciar Sesión
          </h2>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 28 }}>
            Ingrese sus credenciales para acceder
          </p>

          {error && (
            <div style={{
              padding: "12px 16px",
              background: "#fef2f2",
              color: "#dc2626",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 20,
              border: "1px solid #fecaca",
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@cenplus.com"
                className="input"
                style={{ padding: "12px 16px" }}
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="input"
                style={{ padding: "12px 16px" }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: "100%",
                padding: "14px",
                fontSize: 15,
                justifyContent: "center",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Ingresando..." : "Iniciar Sesión"}
            </button>
          </form>

          <div style={{ marginTop: 24, padding: "12px 16px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 4, fontWeight: 600 }}>Credenciales de prueba:</p>
            <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>
              Admin: <code style={{ background: "#e2e8f0", padding: "1px 4px", borderRadius: 3 }}>admin@cenplus.com</code> / <code style={{ background: "#e2e8f0", padding: "1px 4px", borderRadius: 3 }}>admin123</code>
            </p>
            <p style={{ fontSize: 12, color: "#475569", margin: "4px 0 0 0" }}>
              Líder: <code style={{ background: "#e2e8f0", padding: "1px 4px", borderRadius: 3 }}>lider@cenplus.com</code> / <code style={{ background: "#e2e8f0", padding: "1px 4px", borderRadius: 3 }}>lider123</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
