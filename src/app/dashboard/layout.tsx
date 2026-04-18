"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { checkRouteAccess } from "@/lib/routeGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | undefined>(undefined);
  const [accessDenied, setAccessDenied] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

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

        if (!res.ok) {
          localStorage.removeItem("token");
          router.push("/login");
        } else {
          const data = await res.json();
          setUserRole(data.role);

          // Validar acceso a la ruta actual
          const hasAccess = checkRouteAccess(pathname, data.role);
          if (!hasAccess) {
            setAccessDenied(true);
            // Redirigir a dashboard después de 2 segundos
            setTimeout(() => {
              router.push("/dashboard");
            }, 2000);
          } else {
            setAuthenticated(true);
          }
        }
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
    </>
  );
}
