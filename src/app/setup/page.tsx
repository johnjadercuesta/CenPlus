"use client";

import { useState, useEffect } from "react";

interface Tenant {
  name: string;
  email: string;
  identificacion: string;
  adminName: string;
  created: string;
  ciudadanos: number;
  testUsers: { email: string; identificacion: string; nombre: string; role: string }[];
  error?: string;
}

type Tab = "setup" | "create" | "list";

// Limpiar el dominio base por si el usuario incluyó https:// o barras
const rawDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "";
const BASE_DOMAIN = rawDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");

// Los dominios .up.railway.app no soportan subdominios SSL (wildcard)
const IS_RAILWAY_DOMAIN = BASE_DOMAIN.endsWith(".up.railway.app");

function tenantUrl(tenantName: string, path = "/login"): string {
  // Solo usar subdominio si hay un dominio base Y no es el de Railway
  if (BASE_DOMAIN && !IS_RAILWAY_DOMAIN) {
    return `https://${tenantName}.${BASE_DOMAIN}${path}`;
  }
  // Fallback: usar parámetro de URL
  return `${path}?tenant=${tenantName}`;
}

function tenantDisplayUrl(tenantName: string): string {
  if (BASE_DOMAIN && !IS_RAILWAY_DOMAIN) {
    return `${tenantName}.${BASE_DOMAIN}`;
  }
  return `(vía parámetro: ?tenant=${tenantName})`;
}

export default function SetupPage() {
  const [tab, setTab] = useState<Tab>("setup");
  const [superKey, setSuperKey] = useState("");
  const [keyVerified, setKeyVerified] = useState(false);

  const [dbStatus, setDbStatus] = useState<{
    dbReady?: boolean; tenantsCount?: number; tenants?: string[];
    firstRun?: boolean; requiresKey?: boolean; message?: string;
  } | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupResult, setSetupResult] = useState<{
    success?: boolean; message?: string; results?: string[]; error?: string;
  } | null>(null);

  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", fullName: "" });
  const [createLoading, setCreateLoading] = useState(false);
  const [createResult, setCreateResult] = useState<any>(null);

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [listLoading, setListLoading] = useState(false);

  useEffect(() => {
    const k = localStorage.getItem("superKey");
    if (k) {
      setSuperKey(k);
      // Verificar automáticamente si la clave guardada es válida
      fetch("/api/admin/setup-db", { headers: { "x-super-key": k } })
        .then(res => res.json())
        .then(data => {
          setDbStatus(data);
          setKeyVerified(true);
        })
        .catch(() => {});
    }
  }, []);

  const headers = (extra: Record<string, string> = {}) => ({
    "x-super-key": superKey,
    ...extra,
  });

  const checkDbStatus = async () => {
    try {
      const res = await fetch("/api/admin/setup-db", { headers: headers() });
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
    localStorage.setItem("superKey", superKey);
  };

  const handleSetupDb = async () => {
    setSetupLoading(true);
    setSetupResult(null);
    try {
      const res = await fetch("/api/admin/setup-db", { method: "POST", headers: headers() });
      const data = await res.json();
      setSetupResult(data);
      await checkDbStatus();
    } catch {
      setSetupResult({ error: "Error de conexión al servidor" });
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
        headers: headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          name: createForm.name,
          email: createForm.email,
          password: createForm.password,
          fullName: createForm.fullName || createForm.name,
        }),
      });
      const data = await res.json();
      setCreateResult(data);
      if (data.success) { await checkDbStatus(); }
    } catch {
      setCreateResult({ error: "Error de conexión al servidor" });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleListTenants = async () => {
    setListLoading(true);
    try {
      const res = await fetch("/api/admin/list-tenants", { headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar organizaciones");
      setTenants(data.tenants || []);
    } catch (err: any) {
      setTenants([]);
      alert("⚠️ No se pudo cargar la lista: " + err.message);
    } finally {
      setListLoading(false);
    }
  };

  const handleImpersonate = async (tenantName: string) => {
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({ tenant: tenantName })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        // Si hay subdominio, tenemos que pasar el token en la URL o cookie compartida
        // Como las cookies entre dominios son complejas, para impersonar en subdominio
        // lo más fácil es redirigir a una ruta temporal que setee la cookie, o mejor:
        // si estamos en el mismo dominio base, Next.js seteará la cookie '.dominio.com'.
        // Pero para simplificar, redirigimos al dashboard.
        window.location.href = tenantUrl(tenantName, "/dashboard");
      } else {
        alert("Error: " + (data.error || "No se pudo iniciar sesión."));
      }
    } catch (err) {
      alert("Error de conexión");
    }
  };

  useEffect(() => {
    if (tab === "list" && keyVerified) handleListTenants();
  }, [tab]);

  const inp: React.CSSProperties = {
    width: "100%", padding: "12px 16px",
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 10, color: "white", fontSize: 14,
    outline: "none", boxSizing: "border-box",
  };

  const card: React.CSSProperties = {
    width: "100%", maxWidth: 580,
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
          <h1 style={{ color: "white", fontSize: 28, fontWeight: 800, margin: "0 0 6px" }}>
            Panel de Super Admin
          </h1>
          <p style={{ color: "#64748b", fontSize: 15, margin: 0 }}>
            Gestión Multi-Organización · CenPlus
          </p>
        </div>

        <div style={card}>
          <form onSubmit={handleVerifyKey}>
            <label style={{ display: "block", color: "#cbd5e1", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              🔑 Clave de Super Administrador
            </label>
            <input
              type="password"
              value={superKey}
              onChange={e => setSuperKey(e.target.value)}
              placeholder="Deja vacío si es la primera instalación"
              style={{ ...inp, marginBottom: 16 }}
            />

            <div style={{ padding: "12px 16px", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 10, marginBottom: 20 }}>
              <p style={{ color: "#93c5fd", fontSize: 12, margin: 0, lineHeight: 1.8 }}>
                💡 <strong>Primera instalación:</strong> Deja el campo <em>vacío</em> y haz clic en Ingresar.<br />
                🔒 <strong>Instalaciones posteriores:</strong> Requiere la <code>SUPER_ADMIN_KEY</code> de Railway → Variables.
              </p>
            </div>

            <button type="submit" style={{
              width: "100%", padding: "14px",
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              border: "none", borderRadius: 12, color: "white",
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 10px 30px rgba(59,130,246,0.35)",
            }}>
              Ingresar al Panel →
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
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{
          width: 70, height: 70, margin: "0 auto 16px",
          background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
          borderRadius: 18, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 30, fontWeight: 900, color: "white",
          boxShadow: "0 16px 32px rgba(59,130,246,0.4)",
        }}>C+</div>
        <h1 style={{ color: "white", fontSize: 26, fontWeight: 800, margin: "0 0 4px" }}>
          CenPlus — Super Admin
        </h1>
        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
          {BASE_DOMAIN
            ? `Dominio: *.${BASE_DOMAIN} · ${dbStatus?.tenantsCount ?? "?"} organización(es)`
            : `${dbStatus?.tenantsCount ?? "?"} organización(es) activa(s)`}
        </p>
      </div>

      {/* Domain banner */}
      {BASE_DOMAIN ? (
        <div style={{
          padding: "8px 20px", borderRadius: 20,
          background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)",
          color: "#4ade80", fontSize: 13, fontWeight: 600, marginBottom: 16,
        }}>
          🌐 Subdominio activo: <strong>*.{BASE_DOMAIN}</strong>
        </div>
      ) : (
        <div style={{
          padding: "8px 20px", borderRadius: 20,
          background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.3)",
          color: "#fbbf24", fontSize: 13, fontWeight: 600, marginBottom: 16,
          maxWidth: 560, textAlign: "center",
        }}>
          ⚠️ Sin dominio configurado — configura <code>NEXT_PUBLIC_BASE_DOMAIN</code> en Railway para subdominios
        </div>
      )}

      {/* DB Status */}
      {dbStatus && (
        <div style={{
          padding: "8px 20px", borderRadius: 20, marginBottom: 24,
          background: dbStatus.dbReady ? "rgba(59,130,246,0.12)" : "rgba(239,68,68,0.12)",
          border: `1px solid ${dbStatus.dbReady ? "rgba(59,130,246,0.3)" : "rgba(239,68,68,0.3)"}`,
          color: dbStatus.dbReady ? "#60a5fa" : "#f87171",
          fontSize: 13, fontWeight: 600,
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
          { key: "create", label: "➕ Crear Organización" },
          { key: "list", label: "📋 Ver Organizaciones" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as Tab)} style={{
            padding: "10px 22px", borderRadius: 10, border: "none",
            cursor: "pointer", fontWeight: 600, fontSize: 13,
            background: tab === t.key ? "linear-gradient(135deg, #3b82f6, #8b5cf6)" : "transparent",
            color: tab === t.key ? "white" : "#94a3b8",
            boxShadow: tab === t.key ? "0 4px 15px rgba(59,130,246,0.3)" : "none",
            transition: "all 0.2s",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={card}>

        {/* ═══ TAB: SETUP DB ═══ */}
        {tab === "setup" && (
          <>
            <h2 style={{ color: "white", fontSize: 19, fontWeight: 700, marginTop: 0, marginBottom: 6 }}>
              Inicializar Base de Datos
            </h2>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24, lineHeight: 1.7 }}>
              Ejecuta esto <strong style={{ color: "#94a3b8" }}>una sola vez</strong> para preparar las tablas globales
              necesarias. Si ya lo hiciste, no hay problema en ejecutarlo de nuevo (no borra datos).
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
                    👉 Ve a <strong>"➕ Crear Organización"</strong> para crear tu primera organización.
                  </p>
                )}
              </div>
            )}

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
                marginBottom: 20,
              }}
            >
              {setupLoading ? "⏳ Inicializando..." : "🛠️ Inicializar Base de Datos"}
            </button>

            {/* Subdomain setup guide */}
            <div style={{ padding: "16px 20px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 12 }}>
              <p style={{ color: "#c4b5fd", fontSize: 13, fontWeight: 700, margin: "0 0 10px" }}>
                🌐 Configurar Subdominios (cliente1.tudominio.com)
              </p>
              <ol style={{ color: "#a78bfa", fontSize: 12, lineHeight: 2, margin: 0, paddingLeft: 18 }}>
                <li>En tu proveedor DNS agrega un <strong>registro CNAME wildcard</strong>:<br />
                  <code style={{ background: "rgba(0,0,0,0.3)", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>
                    * → {typeof window !== "undefined" ? window.location.hostname : "cenplus-production.up.railway.app"}
                  </code>
                </li>
                <li>En <strong>Railway → Settings → Custom Domains</strong> agrega:<br />
                  <code style={{ background: "rgba(0,0,0,0.3)", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>
                    *.tudominio.com
                  </code>
                </li>
                <li>En <strong>Railway → Variables</strong> agrega:<br />
                  <code style={{ background: "rgba(0,0,0,0.3)", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>
                    NEXT_PUBLIC_BASE_DOMAIN = tudominio.com
                  </code>
                </li>
                <li>Redeploy Railway y ¡listo! Cada tenant tendrá su propio subdominio.</li>
              </ol>
            </div>
          </>
        )}

        {/* ═══ TAB: CREATE TENANT ═══ */}
        {tab === "create" && (
          <>
            <h2 style={{ color: "white", fontSize: 19, fontWeight: 700, marginTop: 0, marginBottom: 6 }}>
              Crear Nueva Organización
            </h2>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>
              Cada organización tiene su propia base de datos aislada
              {BASE_DOMAIN ? ` y accederá por ${"{id}"}.${BASE_DOMAIN}` : ""}.
            </p>

            {createResult && (
              <div style={{
                padding: "16px 20px", borderRadius: 12, marginBottom: 20,
                background: createResult.success ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${createResult.success ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
              }}>
                {createResult.success ? (
                  <>
                    <div style={{ color: "#4ade80", fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
                      ✅ Organización "{createResult.tenant}" creada exitosamente
                    </div>

                    {/* URL del tenant */}
                    <div style={{
                      padding: "10px 14px", background: "rgba(0,0,0,0.3)",
                      borderRadius: 8, marginBottom: 12, fontFamily: "monospace",
                    }}>
                      <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>🌐 URL de acceso:</div>
                      {BASE_DOMAIN ? (
                        <a
                          href={tenantUrl(createResult.tenant)}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#60a5fa", fontSize: 14, fontWeight: 700 }}
                        >
                          https://{createResult.tenant}.{BASE_DOMAIN}/login
                        </a>
                      ) : (
                        <a
                          href={tenantUrl(createResult.tenant)}
                          style={{ color: "#60a5fa", fontSize: 14, fontWeight: 700 }}
                        >
                          {window.location.origin}/login?tenant={createResult.tenant}
                        </a>
                      )}
                    </div>

                    <div style={{ color: "#86efac", fontSize: 13, lineHeight: 1.9 }}>
                      <strong>🔑 Identificación (para login):</strong> {createResult.credentials?.identificacion || createResult.credentials?.email}<br />
                      <strong>📧 Email:</strong> {createResult.credentials?.email}<br />
                      <strong>🔒 Contraseña:</strong> la que ingresaste<br />
                      {createResult.credentials?.testUsers && (
                        <>
                          <strong>👥 Usuarios de prueba (pass: admin123):</strong><br />
                          {createResult.credentials.testUsers.map((u: any) => (
                            <span key={u.email}>&nbsp;&nbsp;• {u.identificacion || u.email} ({u.email})<br /></span>
                          ))}
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ color: "#f87171", fontWeight: 600 }}>❌ {createResult.error}</div>
                )}
              </div>
            )}

            <form onSubmit={handleCreateTenant}>
              {[
                {
                  key: "name", label: "ID de la Organización", type: "text",
                  placeholder: "municipio1",
                  hint: BASE_DOMAIN
                    ? `Accederá como: municipio1.${BASE_DOMAIN}`
                    : "Solo letras minúsculas, números y guión_bajo.",
                },
                { key: "fullName", label: "Nombre de la Organización (opcional)", type: "text", placeholder: "Alcaldía de Municipio X", hint: "" },
                { key: "email", label: "Email del Administrador", type: "email", placeholder: "admin@tuorganizacion.com", hint: "" },
                { key: "password", label: "Contraseña del Admin", type: "password", placeholder: "Mínimo 8 caracteres", hint: "" },
              ].map(field => (
                <div key={field.key} style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", color: "#cbd5e1", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    {field.label}
                    {field.key === "name" && createForm.name && BASE_DOMAIN && (
                      <span style={{ color: "#a78bfa", fontWeight: 400, marginLeft: 8 }}>
                        → {createForm.name}.{BASE_DOMAIN}
                      </span>
                    )}
                  </label>
                  <input
                    type={field.type}
                    value={(createForm as any)[field.key]}
                    onChange={e => setCreateForm(f => ({
                      ...f,
                      [field.key]: field.key === "name"
                        ? e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
                        : e.target.value,
                    }))}
                    placeholder={field.placeholder}
                    required={field.key !== "fullName"}
                    style={inp}
                  />
                  {field.hint && <p style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>{field.hint}</p>}
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
                {createLoading ? "⏳ Creando..." : "🚀 Crear Organización"}
              </button>
            </form>
          </>
        )}

        {/* ═══ TAB: LIST TENANTS ═══ */}
        {tab === "list" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ color: "white", fontSize: 19, fontWeight: 700, margin: 0 }}>Organizaciones Activas</h2>
                <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>
                  {tenants.length} organización(es)
                  {BASE_DOMAIN ? ` · *.${BASE_DOMAIN}` : ""}
                </p>
              </div>
              <button
                onClick={handleListTenants}
                disabled={listLoading}
                style={{
                  padding: "8px 18px",
                  background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.4)",
                  borderRadius: 8, color: "#60a5fa", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                {listLoading ? "⏳" : "🔄 Refrescar"}
              </button>
            </div>

            {tenants.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#475569", fontSize: 14 }}>
                {listLoading ? "Cargando..." : (
                  <>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
                    No hay organizaciones aún.<br />
                    <button onClick={() => setTab("create")}
                      style={{ background: "none", border: "none", color: "#60a5fa", marginTop: 8, cursor: "pointer", fontSize: 14 }}>
                      Crear primera organización →
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {tenants.map(t => (
                  <div key={t.name} style={{
                    padding: "20px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 14,
                  }}>
                    {/* Header de la organización */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div>
                        <div style={{ color: "white", fontWeight: 700, fontSize: 18 }}>🏢 {t.name}</div>
                        <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>
                          {t.ciudadanos} ciudadano(s) · Creada: {t.created ? new Date(t.created).toLocaleDateString("es-CO") : "N/A"}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                        <button
                          onClick={() => handleImpersonate(t.name)}
                          style={{
                            padding: "8px 16px",
                            background: "linear-gradient(135deg, rgba(16,185,129,0.3), rgba(52,211,153,0.3))",
                            border: "1px solid rgba(16,185,129,0.4)",
                            borderRadius: 8, color: "#34d399",
                            cursor: "pointer", fontSize: 13, fontWeight: 600,
                          }}
                        >
                          Entrar a Administrar →
                        </button>
                        <a
                          href={tenantUrl(t.name)}
                          target={BASE_DOMAIN ? "_blank" : "_self"}
                          rel="noreferrer"
                          style={{
                            padding: "8px 16px", display: "flex", alignItems: "center",
                            background: "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(139,92,246,0.3))",
                            border: "1px solid rgba(59,130,246,0.4)",
                            borderRadius: 8, color: "#60a5fa",
                            textDecoration: "none", fontSize: 13, fontWeight: 600,
                          }}
                        >
                          Login Normal →
                        </a>
                      </div>
                    </div>

                    {/* URL de acceso */}
                    <div style={{
                      padding: "12px 16px", background: "rgba(0,0,0,0.3)",
                      borderRadius: 10, marginBottom: 12,
                    }}>
                      <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4, fontWeight: 600 }}>🌐 URL DE ACCESO:</div>
                      {BASE_DOMAIN ? (
                        <a
                          href={`https://${t.name}.${BASE_DOMAIN}/login`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#60a5fa", fontSize: 14, fontWeight: 700, textDecoration: "none" }}
                        >
                          https://{t.name}.{BASE_DOMAIN}/login
                        </a>
                      ) : (
                        <a
                          href={tenantUrl(t.name)}
                          style={{ color: "#60a5fa", fontSize: 14, fontWeight: 700 }}
                        >
                          {typeof window !== "undefined" ? window.location.origin : ""}/login?tenant={t.name}
                        </a>
                      )}
                    </div>

                    {/* Admin */}
                    <div style={{
                      padding: "12px 16px", background: "rgba(59,130,246,0.1)",
                      border: "1px solid rgba(59,130,246,0.2)",
                      borderRadius: 10, marginBottom: 12,
                    }}>
                      <div style={{ color: "#93c5fd", fontSize: 11, fontWeight: 600, marginBottom: 6 }}>👤 ADMINISTRADOR:</div>
                      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                        <div>
                          <span style={{ color: "#64748b", fontSize: 12 }}>Identificación (para login):</span><br />
                          <span style={{ color: "#fbbf24", fontSize: 14, fontWeight: 700 }}>{t.identificacion}</span>
                        </div>
                        <div>
                          <span style={{ color: "#64748b", fontSize: 12 }}>Email:</span><br />
                          <span style={{ color: "#e2e8f0", fontSize: 14 }}>{t.email}</span>
                        </div>
                        <div>
                          <span style={{ color: "#64748b", fontSize: 12 }}>Nombre:</span><br />
                          <span style={{ color: "#e2e8f0", fontSize: 14 }}>{t.adminName}</span>
                        </div>
                        <div>
                          <span style={{ color: "#64748b", fontSize: 12 }}>Contraseña:</span><br />
                          <span style={{ color: "#fbbf24", fontSize: 14, fontWeight: 700 }}>La que configuraste al crear</span>
                        </div>
                      </div>
                    </div>

                    {/* Usuarios de prueba */}
                    {t.testUsers && t.testUsers.length > 0 && (
                      <div style={{
                        padding: "12px 16px", background: "rgba(139,92,246,0.1)",
                        border: "1px solid rgba(139,92,246,0.2)",
                        borderRadius: 10,
                      }}>
                        <div style={{ color: "#c4b5fd", fontSize: 11, fontWeight: 600, marginBottom: 8 }}>👥 USUARIOS DE PRUEBA (contraseña: admin123):</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {t.testUsers.map((u, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <span style={{
                                padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                                background: u.role === "estratega" ? "rgba(59,130,246,0.2)" : "rgba(16,185,129,0.2)",
                                color: u.role === "estratega" ? "#60a5fa" : "#34d399",
                              }}>
                                {u.role === "estratega" ? "Estratega" : "Líder"}
                              </span>
                              <span style={{ color: "#fbbf24", fontSize: 13, fontWeight: 600 }}>{u.identificacion}</span>
                              <span style={{ color: "#64748b", fontSize: 12 }}>({u.nombre} · {u.email})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {t.error && (
                      <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(239,68,68,0.1)", borderRadius: 8 }}>
                        <span style={{ color: "#f87171", fontSize: 12 }}>⚠️ {t.error}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ color: "white", fontWeight: 700, fontSize: 16 }}>🏢 {t.name}</div>
                        <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>
                          {t.email} · {t.ciudadanos} ciudadano(s)
                        </div>
                        {BASE_DOMAIN && (
                          <div style={{ marginTop: 6 }}>
                            <a
                              href={`https://${t.name}.${BASE_DOMAIN}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "#a78bfa", fontSize: 12, textDecoration: "none" }}
                            >
                              🌐 {t.name}.{BASE_DOMAIN}
                            </a>
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                        <button
                          onClick={() => handleImpersonate(t.name)}
                          style={{
                            padding: "8px 16px",
                            background: "linear-gradient(135deg, rgba(16,185,129,0.3), rgba(52,211,153,0.3))",
                            border: "1px solid rgba(16,185,129,0.4)",
                            borderRadius: 8, color: "#34d399",
                            cursor: "pointer", fontSize: 13, fontWeight: 600,
                          }}
                        >
                          Entrar a Administrar →
                        </button>
                        <a
                          href={tenantUrl(t.name)}
                          target={BASE_DOMAIN ? "_blank" : "_self"}
                          rel="noreferrer"
                          style={{
                            padding: "8px 16px", display: "flex", alignItems: "center",
                            background: "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(139,92,246,0.3))",
                            border: "1px solid rgba(59,130,246,0.4)",
                            borderRadius: 8, color: "#60a5fa",
                            textDecoration: "none", fontSize: 13, fontWeight: 600,
                          }}
                        >
                          Login Normal →
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ marginTop: 24, display: "flex", gap: 20 }}>
        <a href="/login" style={{ color: "#475569", textDecoration: "none", fontSize: 13 }}>← Ir al Login</a>
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
