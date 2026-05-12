"use client";

import { useState, useEffect } from "react";

interface Tenant {
  name: string;
  email: string;
  created: string;
  ciudadanos: number;
}

type Tab = "setup" | "create" | "list";

export default function SetupPage() {
  const [tab, setTab] = useState<Tab>("setup");
  const [superKey, setSuperKey] = useState("");
  const [keyVerified, setKeyVerified] = useState(false);

  // DB Setup state
  const [dbStatus, setDbStatus] = useState<{ dbReady?: boolean; tenantsCount?: number; tenants?: string[] } | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupResult, setSetupResult] = useState<{ success?: boolean; message?: string; results?: string[]; error?: string } | null>(null);

  // Create tenant state
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", fullName: "" });
  const [createLoading, setCreateLoading] = useState(false);
  const [createResult, setCreateResult] = useState<any>(null);

  // List tenants state
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const checkDbStatus = async () => {
    try {
      const res = await fetch("/api/admin/setup-db", {
        headers: { "x-super-key": superKey },
      });
      const data = await res.json();
      setDbStatus(data);
    } catch {
      setDbStatus(null);
    }
  };

  const handleVerifyKey = async (e: React.FormEvent) => {
    e.preventDefault();
    await checkDbStatus();
    setKeyVerified(true);
  };

  const handleSetupDb = async () => {
    setSetupLoading(true);
    setSetupResult(null);
    try {
      const res = await fetch("/api/admin/setup-db", {
        method: "POST",
        headers: { "x-super-key": superKey },
      });
      const data = await res.json();
      setSetupResult(data);
      await checkDbStatus();
    } catch (err) {
      setSetupResult({ error: "Error de conexión" });
    } finally {
      setSetupLoading(false);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateResult(null);
    try {
      const res = await fetch("/api/admin/create-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-super-key": superKey },
        body: JSON.stringify({
          name: createForm.name,
          email: createForm.email,
          password: createForm.password,
          fullName: createForm.fullName || createForm.name,
        }),
      });
      const data = await res.json();
      setCreateResult(data);
      if (data.success) await checkDbStatus();
    } catch {
      setCreateResult({ error: "Error de conexión" });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleListTenants = async () => {
    setListLoading(true);
    try {
      const res = await fetch("/api/admin/list-tenants", {
        headers: { "x-super-key": superKey },
      });
      const data = await res.json();
      setTenants(data.tenants || []);
    } catch {
      setTenants([]);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "list" && keyVerified) handleListTenants();
  }, [tab]);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 16px",
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 10, color: "white", fontSize: 14,
    outline: "none", boxSizing: "border-box",
  };

  const cardStyle: React.CSSProperties = {
    width: "100%", maxWidth: 560,
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 20, padding: 36,
    boxShadow: "0 40px 80px rgba(0,0,0,0.4)",
  };

  // ─── KEY GATE ───
  if (!keyVerified) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f2744 100%)",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "40px 20px",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 80, height: 80, margin: "0 auto 20px",
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            borderRadius: 20, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 36, fontWeight: 900, color: "white",
            boxShadow: "0 20px 40px rgba(59,130,246,0.4)",
          }}>C+</div>
          <h1 style={{ color: "white", fontSize: 28, fontWeight: 800, margin: "0 0 8px" }}>
            Panel de Administración
          </h1>
          <p style={{ color: "#64748b", fontSize: 15 }}>Acceso restringido · Ingresa tu clave de Super Admin</p>
        </div>

        <div style={cardStyle}>
          <form onSubmit={handleVerifyKey}>
            <label style={{ display: "block", color: "#cbd5e1", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              🔑 SUPER_ADMIN_KEY
            </label>
            <input
              type="password"
              value={superKey}
              onChange={e => setSuperKey(e.target.value)}
              placeholder="Ingresa la clave de super administrador"
              required
              style={{ ...inputStyle, marginBottom: 16 }}
            />
            <div style={{
              padding: "12px 16px", background: "rgba(234,179,8,0.1)",
              border: "1px solid rgba(234,179,8,0.25)", borderRadius: 10, marginBottom: 20,
            }}>
              <p style={{ color: "#fcd34d", fontSize: 12, margin: 0, lineHeight: 1.7 }}>
                💡 <strong>¿Dónde encuentro la clave?</strong><br />
                Railway → tu proyecto → pestaña <em>Variables</em> → busca o crea <code>SUPER_ADMIN_KEY</code>.<br />
                Si no existe, créala con cualquier valor seguro y redeploy.
              </p>
            </div>
            <button type="submit" style={{
              width: "100%", padding: "14px",
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              border: "none", borderRadius: 12, color: "white",
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 10px 30px rgba(59,130,246,0.35)",
            }}>
              Ingresar →
            </button>
          </form>
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <a href="/login" style={{ color: "#475569", fontSize: 13, textDecoration: "none" }}>
              ← Volver al Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ─── MAIN PANEL ───
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f2744 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "40px 20px",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{
          width: 70, height: 70, margin: "0 auto 16px",
          background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
          borderRadius: 18, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 30, fontWeight: 900, color: "white",
          boxShadow: "0 16px 32px rgba(59,130,246,0.4)",
        }}>C+</div>
        <h1 style={{ color: "white", fontSize: 28, fontWeight: 800, margin: "0 0 4px" }}>
          CenPlus — Super Admin
        </h1>
        <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>
          Gestión de Tenants · {dbStatus?.tenantsCount ?? "?"} organización(es) activa(s)
        </p>
      </div>

      {/* DB Status Badge */}
      {dbStatus && (
        <div style={{
          padding: "8px 20px", borderRadius: 20,
          background: dbStatus.dbReady ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
          border: `1px solid ${dbStatus.dbReady ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
          color: dbStatus.dbReady ? "#4ade80" : "#f87171",
          fontSize: 13, fontWeight: 600, marginBottom: 24,
        }}>
          {dbStatus.dbReady ? "✅ Base de datos lista" : "⚠️ DB no inicializada — ve a 'Inicializar DB'"}
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 6, marginBottom: 24,
        background: "rgba(255,255,255,0.05)",
        padding: 6, borderRadius: 14, flexWrap: "wrap", justifyContent: "center",
      }}>
        {[
          { key: "setup", label: "🛠️ Inicializar DB" },
          { key: "create", label: "➕ Crear Tenant" },
          { key: "list", label: "📋 Ver Tenants" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as Tab)} style={{
            padding: "10px 22px", borderRadius: 10, border: "none",
            cursor: "pointer", fontWeight: 600, fontSize: 13,
            background: tab === t.key
              ? "linear-gradient(135deg, #3b82f6, #8b5cf6)"
              : "transparent",
            color: tab === t.key ? "white" : "#94a3b8",
            boxShadow: tab === t.key ? "0 4px 15px rgba(59,130,246,0.3)" : "none",
            transition: "all 0.2s",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={cardStyle}>

        {/* ═══ TAB: SETUP DB ═══ */}
        {tab === "setup" && (
          <>
            <h2 style={{ color: "white", fontSize: 19, fontWeight: 700, marginTop: 0, marginBottom: 6 }}>
              Inicializar Base de Datos
            </h2>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24, lineHeight: 1.7 }}>
              Ejecuta esto <strong style={{ color: "#94a3b8" }}>una sola vez</strong> para preparar las tablas globales necesarias para el sistema multi-tenant en Railway.
            </p>

            {setupResult && (
              <div style={{
                padding: "16px 20px", borderRadius: 12, marginBottom: 20,
                background: setupResult.success ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${setupResult.success ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
              }}>
                <div style={{ color: setupResult.success ? "#4ade80" : "#f87171", fontWeight: 700, marginBottom: 10 }}>
                  {setupResult.success ? "✅ " : "❌ "}{setupResult.message || setupResult.error}
                </div>
                {setupResult.results && (
                  <ul style={{ margin: 0, padding: "0 0 0 16px", color: "#86efac", fontSize: 13, lineHeight: 1.8 }}>
                    {setupResult.results.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                )}
                {setupResult.success && (
                  <p style={{ color: "#60a5fa", fontSize: 13, margin: "12px 0 0" }}>
                    👉 Ahora ve a la pestaña "Crear Tenant" para crear tu primera organización.
                  </p>
                )}
              </div>
            )}

            <div style={{
              padding: "16px 20px", background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.25)", borderRadius: 12, marginBottom: 24,
            }}>
              <p style={{ color: "#93c5fd", fontSize: 13, margin: 0, lineHeight: 1.7 }}>
                <strong>¿Qué hace esto?</strong><br />
                Crea la tabla <code>public.user_tenants</code> que permite al sistema encontrar automáticamente el tenant de cada usuario al hacer login, sin necesidad de subdominios.
              </p>
            </div>

            <button
              onClick={handleSetupDb}
              disabled={setupLoading}
              style={{
                width: "100%", padding: "14px",
                background: setupLoading ? "#374151" : "linear-gradient(135deg, #10b981, #3b82f6)",
                border: "none", borderRadius: 12, color: "white",
                fontSize: 15, fontWeight: 700,
                cursor: setupLoading ? "not-allowed" : "pointer",
                boxShadow: "0 10px 30px rgba(16,185,129,0.3)",
              }}
            >
              {setupLoading ? "⏳ Inicializando..." : "🛠️ Inicializar Base de Datos"}
            </button>
          </>
        )}

        {/* ═══ TAB: CREATE TENANT ═══ */}
        {tab === "create" && (
          <>
            <h2 style={{ color: "white", fontSize: 19, fontWeight: 700, marginTop: 0, marginBottom: 6 }}>
              Crear Nuevo Tenant
            </h2>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>
              Cada tenant es una organización aislada con su propio esquema de base de datos.
            </p>

            {createResult && (
              <div style={{
                padding: "16px 20px", borderRadius: 12, marginBottom: 20,
                background: createResult.success ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${createResult.success ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
              }}>
                {createResult.success ? (
                  <>
                    <div style={{ color: "#4ade80", fontWeight: 700, fontSize: 15, marginBottom: 10 }}>
                      ✅ Tenant "{createResult.tenant}" creado exitosamente
                    </div>
                    <div style={{ color: "#86efac", fontSize: 13, lineHeight: 1.9 }}>
                      <strong>📧 Admin email:</strong> {createResult.credentials?.email}<br />
                      <strong>🔐 Contraseña:</strong> la que ingresaste<br />
                      <strong>👥 Usuarios de prueba:</strong><br />
                      {createResult.credentials?.testUsers?.map((u: any) => (
                        <span key={u.email}>&nbsp;&nbsp;• {u.email} / {u.password}<br /></span>
                      ))}
                      <br />
                      <a href={`/login?tenant=${createResult.tenant}`}
                        style={{ color: "#60a5fa", fontWeight: 700 }}>
                        → Hacer login con este tenant
                      </a>
                    </div>
                  </>
                ) : (
                  <div style={{ color: "#f87171", fontWeight: 600 }}>❌ {createResult.error}</div>
                )}
              </div>
            )}

            <form onSubmit={handleCreateTenant}>
              {[
                { key: "name", label: "ID del Tenant", placeholder: "municipio1 (letras, números, _)", type: "text", hint: "Identificador único. Solo letras minúsculas, números y guión_bajo." },
                { key: "fullName", label: "Nombre de la Organización (opcional)", placeholder: "Alcaldía de Municipio X", type: "text", hint: "" },
                { key: "email", label: "Email del Administrador Principal", placeholder: "admin@tuorganizacion.com", type: "email", hint: "" },
                { key: "password", label: "Contraseña del Admin", placeholder: "Mínimo 8 caracteres", type: "password", hint: "" },
              ].map(field => (
                <div key={field.key} style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", color: "#cbd5e1", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={(createForm as any)[field.key]}
                    onChange={e => setCreateForm(f => ({
                      ...f,
                      [field.key]: field.key === "name"
                        ? e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                        : e.target.value
                    }))}
                    placeholder={field.placeholder}
                    required={field.key !== "fullName"}
                    style={inputStyle}
                  />
                  {field.hint && (
                    <p style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>{field.hint}</p>
                  )}
                </div>
              ))}

              <button
                type="submit"
                disabled={createLoading}
                style={{
                  width: "100%", padding: "14px", marginTop: 8,
                  background: createLoading ? "#374151" : "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                  border: "none", borderRadius: 12, color: "white",
                  fontSize: 15, fontWeight: 700,
                  cursor: createLoading ? "not-allowed" : "pointer",
                  boxShadow: "0 10px 30px rgba(59,130,246,0.35)",
                }}
              >
                {createLoading ? "⏳ Creando..." : "🚀 Crear Tenant"}
              </button>
            </form>
          </>
        )}

        {/* ═══ TAB: LIST TENANTS ═══ */}
        {tab === "list" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ color: "white", fontSize: 19, fontWeight: 700, margin: 0 }}>
                  Tenants Activos
                </h2>
                <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>
                  {tenants.length} organización(es) registrada(s)
                </p>
              </div>
              <button
                onClick={handleListTenants}
                disabled={listLoading}
                style={{
                  padding: "8px 18px",
                  background: "rgba(59,130,246,0.2)",
                  border: "1px solid rgba(59,130,246,0.4)",
                  borderRadius: 8, color: "#60a5fa",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                {listLoading ? "⏳" : "🔄 Refrescar"}
              </button>
            </div>

            {tenants.length === 0 ? (
              <div style={{
                textAlign: "center", padding: "40px 20px",
                color: "#475569", fontSize: 14,
              }}>
                {listLoading ? "Cargando..." : (
                  <>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
                    No hay tenants aún.<br />
                    <a href="#" onClick={() => setTab("create")}
                      style={{ color: "#60a5fa", marginTop: 8, display: "inline-block" }}>
                      Crear primer tenant →
                    </a>
                  </>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {tenants.map(t => (
                  <div key={t.name} style={{
                    padding: "16px 20px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 14,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div>
                      <div style={{ color: "white", fontWeight: 700, fontSize: 16 }}>
                        🏢 {t.name}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>
                        Admin: {t.email} · Ciudadanos: {t.ciudadanos}
                      </div>
                    </div>
                    <a
                      href={`/login?tenant=${t.name}`}
                      style={{
                        padding: "8px 16px",
                        background: "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(139,92,246,0.3))",
                        border: "1px solid rgba(59,130,246,0.4)",
                        borderRadius: 8, color: "#60a5fa",
                        textDecoration: "none", fontSize: 13, fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Login →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ marginTop: 24, display: "flex", gap: 20 }}>
        <a href="/login" style={{ color: "#475569", textDecoration: "none", fontSize: 13 }}>
          ← Ir al Login
        </a>
        <button
          onClick={() => { setKeyVerified(false); setSuperKey(""); }}
          style={{ background: "none", border: "none", color: "#475569", fontSize: 13, cursor: "pointer" }}
        >
          🔒 Cerrar sesión admin
        </button>
      </div>
    </div>
  );
}
