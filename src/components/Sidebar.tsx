"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface UserData {
  nombre: string;
  email: string;
}

export default function Sidebar({ user: propUser }: { user?: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ id?: number; userId?: number; nombre?: string; role?: string; email?: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    if (propUser) {
      setUser({
        userId: propUser.userId,
        nombre: propUser.nombre,
        email: propUser.email,
        role: propUser.role
      });
    } else {
      const token = localStorage.getItem("token");
      if (token) {
        fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => r.json())
          .then((data) => {
            if (data.authenticated) {
              setUser({ userId: data.userId, nombre: data.nombre, email: data.email, role: data.role });
            }
          })
          .catch(() => {});
      }
    }

    const token = localStorage.getItem("token");
    if (token) {
      // Cargar logo desde la config del tenant
      fetch(`/api/tenant/config?t=${Date.now()}`)
        .then(r => r.json())
        .then(data => {
          if (data.logo_url) setLogo(data.logo_url);
        })
        .catch(() => {});
    }
  }, [propUser]);

  const handleLogout = async () => {
    localStorage.removeItem("token");
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const isActive = (path: string) => pathname === path;
  const isAdmin = user?.role === "administrador";
  const isSuperAdmin = user?.userId === 0;

  const initials = user?.nombre
    ? user.nombre
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "??";

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      adminOnly: false,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      label: "Formulario",
      href: "/dashboard/formulario",
      adminOnly: false,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
    {
      label: "Registros",
      href: "/dashboard/registros",
      adminOnly: false,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <line x1="20" y1="8" x2="20" y2="14" />
          <line x1="23" y1="11" x2="17" y2="11" />
        </svg>
      ),
    },
    {
      label: "Mapa Territorial",
      href: "/dashboard/mapa",
      adminOnly: false,
      icon: <span style={{ fontSize: "18px" }}>👥</span>,
    },
    {
      label: "WhatsApp",
      href: "/dashboard/whatsapp",
      adminOnly: false,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="9" y1="11" x2="15" y2="11" />
        </svg>
      ),
    },
    {
      label: "SMS",
      href: "/dashboard/sms",
      adminOnly: false,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      ),
    },
    {
      label: "Votaciones",
      href: "/dashboard/votaciones",
      adminOnly: false,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
    },
  ];

  const intelligenceItems = [
    {
      label: "Inteligencia Territorial",
      href: "/dashboard/inteligencia",
      adminOnly: false,
      icon: <span style={{ fontSize: "18px" }}>🧠</span>,
    },
  ];

  const adminItems = [
    {
      label: "Auditoría",
      href: "/dashboard/auditoria",
      adminOnly: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
    {
      label: "Sectores y Metas",
      href: "/dashboard/sectores",
      adminOnly: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      ),
    },
    {
      label: "Usuarios",
      href: "/dashboard/lideres",
      adminOnly: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: "Configuración",
      href: "/dashboard/configuracion",
      adminOnly: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
    {
      label: "Archivos Electorales",
      href: "/dashboard/archivos",
      adminOnly: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          <line x1="12" y1="11" x2="12" y2="17" />
          <line x1="9" y1="14" x2="15" y2="14" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <button
        className="mobile-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{ position: "fixed", top: 12, left: 12, zIndex: 200 }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {mobileOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 99,
          }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            {logo ? (
              <img src={logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 8 }} />
            ) : (
              "C+"
            )}
          </div>
          <div>
            <h1>CenPlus</h1>
            <span>Inteligencia Territorial</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section">
            <div className="sidebar-section-label">Principal</div>
            {navItems
              .filter((item) => !item.adminOnly || isAdmin)
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${isActive(item.href) ? "active" : ""}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
          </div>

          {user?.role !== "lider" && (
            <div className="sidebar-section">
              <div className="sidebar-section-label">Inteligencia y Monitoreo</div>
              {intelligenceItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${isActive(item.href) ? "active" : ""}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </div>
          )}

          {isAdmin && (
            <div className="sidebar-section">
              <div className="sidebar-section-label">Administración</div>
              {adminItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${isActive(item.href) ? "active" : ""}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          {user && (
            <>
              {isSuperAdmin && (
                <div style={{ padding: "0 20px", marginBottom: "20px" }}>
                  <button
                    onClick={() => {
                      localStorage.removeItem("token");
                      window.location.href = "/setup";
                    }}
                    style={{
                      width: "100%", padding: "10px", borderRadius: "8px",
                      background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                      border: "none", color: "white", fontWeight: 700,
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      boxShadow: "0 4px 15px rgba(59,130,246,0.3)"
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 14 4 9l5-5" />
                      <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
                    </svg>
                    Volver al Panel Global
                  </button>
                </div>
              )}
              <div className="sidebar-user">
                <div className="sidebar-avatar">{initials}</div>
                <div className="sidebar-user-info">
                  <div className="sidebar-user-name">{user.nombre}</div>
                  <div className="sidebar-user-role">{user.role}</div>
                </div>
              </div>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "8px",
              background: "rgba(239, 68, 68, 0.1)",
              color: "#f87171",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cerrar Sesión
          </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
