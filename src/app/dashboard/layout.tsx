"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { checkRouteAccess } from "@/lib/routeGuard";

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
const WARNING_TIMEOUT_MS = 10 * 60 * 1000;
const CHECK_INTERVAL_MS = 2000;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | undefined>(undefined);
  const [accessDenied, setAccessDenied] = useState(false);
  const [orgDisabled, setOrgDisabled] = useState(false);
  const [orgDisabledMessage, setOrgDisabledMessage] = useState("");
  const [showWarning, setShowWarning] = useState(false);
  const [countdownSec, setCountdownSec] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  const lastActivityRef = useRef(Date.now());
  const warningStartRef = useRef<number | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const showWarningRef = useRef(false);

  const forceLogout = useCallback(() => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("token");
    router.push("/login");
  }, [router]);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningStartRef.current = null;
    showWarningRef.current = false;
    setShowWarning(false);
    setCountdownSec(0);
  }, []);

  useEffect(() => {
    if (!authenticated) return;

    resetActivity();

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    const handler = () => { resetActivity(); };
    events.forEach((e) => window.addEventListener(e, handler));

    checkIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;

      if (!showWarningRef.current) {
        if (elapsed >= INACTIVITY_TIMEOUT_MS) {
          showWarningRef.current = true;
          warningStartRef.current = now;
          setShowWarning(true);
          setCountdownSec(Math.floor(WARNING_TIMEOUT_MS / 1000));
        }
      } else {
        const warningElapsed = now - (warningStartRef.current ?? now);
        const remaining = Math.max(0, WARNING_TIMEOUT_MS - warningElapsed);
        setCountdownSec(Math.ceil(remaining / 1000));
        if (remaining <= 0) {
          forceLogout();
        }
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [authenticated, resetActivity, forceLogout]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (data.disabled) {
          setOrgDisabled(true);
          setOrgDisabledMessage(data.message || "Organización deshabilitada. Contacte al administrador.");
          setLoading(false);
          return;
        }

        if (!res.ok) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }

        setUserRole(data.role);

        const hasAccess = checkRouteAccess(pathname, data.role);
        if (!hasAccess) {
          setAccessDenied(true);
          setTimeout(() => router.push("/dashboard"), 2000);
          return;
        }

        setAuthenticated(true);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, pathname]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTopColor: "#1e3a5f", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#64748b", fontSize: 14 }}>Verificando acceso...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (orgDisabled) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a" }}>
        <div style={{ textAlign: "center", background: "#1e293b", padding: 48, borderRadius: 12, border: "1px solid #334155", maxWidth: 420, margin: "0 16px" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🚫</div>
          <h2 style={{ color: "#f8fafc", marginBottom: 12, fontSize: 22, fontWeight: 700 }}>Organización Deshabilitada</h2>
          <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: 14, lineHeight: 1.5 }}>{orgDisabledMessage}</p>
          <button
            onClick={() => {
              localStorage.removeItem("token");
              router.push("/login");
            }}
            style={{
              padding: "10px 32px",
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Ir a Login
          </button>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center", background: "white", padding: 40, borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h2 style={{ color: "#1e3a5f", marginBottom: 8, fontSize: 20, fontWeight: 600 }}>Acceso Denegado</h2>
          <p style={{ color: "#64748b", marginBottom: 16, fontSize: 14 }}>No tienes permiso para acceder a este módulo.</p>
          <p style={{ color: "#94a3b8", fontSize: 12 }}>Redirigiendo al dashboard en 2 segundos...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) return null;

  return (
    <>
      <Sidebar />
      <div className="main-wrapper">
        {children}
      </div>

      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="text-4xl mb-3">⏰</div>
              <h3 className="text-lg font-bold text-white mb-2">Sesión por expirar</h3>
              <p className="text-sm text-slate-400 mb-4">
                Has estado inactivo por 15 minutos. Tu sesión se cerrará automáticamente por seguridad en:
              </p>
              <div className="text-3xl font-bold text-yellow-400 mb-4 font-mono">
                {Math.floor(countdownSec / 60)}:{(countdownSec % 60).toString().padStart(2, "0")}
              </div>
              <button
                onClick={() => {
                  resetActivity();
                  lastActivityRef.current = Date.now();
                }}
                className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold text-white transition-all"
              >
                Continuar sesión
              </button>
              <p className="text-[10px] text-slate-500 mt-3">
                Si no respondes, la sesión se cerrará al llegar a 0:00.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
