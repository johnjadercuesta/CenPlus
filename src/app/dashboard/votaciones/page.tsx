"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authHeaders, getToken } from "@/lib/api";

interface Votacion {
  id: number;
  titulo: string;
  descripcion: string;
  estado: "borrador" | "activa" | "cerrada";
  tipo: "encuesta" | "votacion" | "investigacion";
  audiencia: "app_users" | "ciudadanos" | "publico";
  visibilidad_resultados: "app_users" | "ciudadanos" | "publico";
  limite_respuestas: "una_por_sesion" | "una_por_ciudadano" | "multiples";
  fecha_inicio: string | null;
  fecha_fin: string | null;
  total_preguntas: number;
  total_respuestas: number;
  created_at: string;
}

function getTenantFromToken(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.tenant || null;
  } catch {
    return null;
  }
}

export default function VotacionesListPage() {
  const [votaciones, setVotaciones] = useState<Votacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadVotaciones = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/votaciones", {
        headers: authHeaders(),
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok) {
        setVotaciones(data.data || []);
      } else {
        setError(data.error || "Error al cargar las encuestas");
      }
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVotaciones();
  }, []);

  const handleCambiarEstado = async (id: number, nuevoEstado: "activa" | "cerrada") => {
    try {
      setActionLoading(id);
      const res = await fetch(`/api/votaciones/${id}/activar`, {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      const data = await res.json();
      if (res.ok) {
        setVotaciones((prev) =>
          prev.map((v) => (v.id === id ? { ...v, estado: nuevoEstado } : v))
        );
      } else {
        alert(data.error || "Error al cambiar el estado");
      }
    } catch (err) {
      alert("Error de conexión");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm("¿Está seguro de que desea eliminar esta encuesta?")) return;
    try {
      setActionLoading(id);
      const res = await fetch(`/api/votaciones/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setVotaciones((prev) => prev.filter((v) => v.id !== id));
      } else {
        alert(data.error || "Error al eliminar");
      }
    } catch (err) {
      alert("Error de conexión");
    } finally {
      setActionLoading(null);
    }
  };

  const getPublicLink = (id: number) => {
    if (typeof window !== "undefined") {
      const base = `${window.location.origin}/v/${id}`;
      const tenant = getTenantFromToken();
      return tenant ? `${base}?tenant=${tenant}` : base;
    }
    return `/v/${id}`;
  };

  const handleCopyLink = (id: number) => {
    const link = getPublicLink(id);
    navigator.clipboard.writeText(link);
    alert("Enlace público copiado al portapapeles: " + link);
  };

  // KPIs
  const totalEncuestas = votaciones.length;
  const activas = votaciones.filter((v) => v.estado === "activa").length;
  const cerradas = votaciones.filter((v) => v.estado === "cerrada").length;
  const respuestasTotales = votaciones.reduce((acc, curr) => acc + (curr.total_respuestas || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="spinner border-t-blue-500 mb-3" style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p className="text-slate-500 font-medium">Cargando encuestas y votaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Votaciones y Encuestas</h1>
          <p className="text-slate-500 mt-1">Crea formularios de investigación de opinión pública y mide el pulso de los ciudadanos</p>
        </div>
        <Link href="/dashboard/votaciones/nueva" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-all duration-200">
          + Nueva Encuesta
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">Total Encuestas</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalEncuestas}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 text-xl font-bold">📊</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">Activas</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{activas}</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 text-xl font-bold">🟢</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">Cerradas</p>
            <h3 className="text-2xl font-bold text-slate-500 mt-1">{cerradas}</h3>
          </div>
          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500 text-xl font-bold">🔴</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">Respuestas Totales</p>
            <h3 className="text-2xl font-bold text-purple-600 mt-1">{respuestasTotales}</h3>
          </div>
          <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500 text-xl font-bold">📥</div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Table & Cards of Votaciones */}
      {votaciones.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm max-w-xl mx-auto mt-12">
          <div className="text-6xl mb-4">🗳️</div>
          <h3 className="text-xl font-bold text-slate-800">No hay encuestas creadas</h3>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">
            Crea tu primera encuesta o formulario de votación para comenzar a recopilar información y medir la opinión del público.
          </p>
          <Link href="/dashboard/votaciones/nueva" className="mt-6 inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition-all">
            Crear encuesta
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Encuesta / Título</th>
                  <th className="py-4 px-6">Tipo / Audiencia</th>
                  <th className="py-4 px-6">Configuración</th>
                  <th className="py-4 px-6">Estado</th>
                  <th className="py-4 px-6">Participación</th>
                  <th className="py-4 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {votaciones.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-800 text-sm">{v.titulo}</div>
                      <div className="text-slate-400 text-xs mt-1 truncate max-w-xs">{v.descripcion || "Sin descripción"}</div>
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">Creada: {new Date(v.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider ${
                        v.tipo === "votacion" ? "bg-amber-50 text-amber-700" :
                        v.tipo === "investigacion" ? "bg-violet-50 text-violet-700" :
                        "bg-blue-50 text-blue-700"
                      }`}>
                        {v.tipo}
                      </span>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <span>👥 Audiencia:</span>
                        <strong className="text-slate-700">
                          {v.audiencia === "app_users" ? "Usuarios App" :
                           v.audiencia === "ciudadanos" ? "Ciudadanos BD" :
                           "Público General"}
                        </strong>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-xs text-slate-500">
                        Resultado: <strong className="text-slate-700">{
                          v.visibilidad_resultados === "app_users" ? "Solo Admins" :
                          v.visibilidad_resultados === "ciudadanos" ? "Ciudadanos" :
                          "Público"
                        }</strong>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Límite: <strong className="text-slate-700">{
                          v.limite_respuestas === "una_por_sesion" ? "1 por Sesión" :
                          v.limite_respuestas === "una_por_ciudadano" ? "1 por Cédula" :
                          "Múltiple"
                        }</strong>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        v.estado === "borrador" ? "bg-slate-100 text-slate-600" :
                        v.estado === "activa" ? "bg-emerald-100 text-emerald-700" :
                        "bg-rose-100 text-rose-700"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          v.estado === "borrador" ? "bg-slate-400" :
                          v.estado === "activa" ? "bg-emerald-500" :
                          "bg-rose-500"
                        }`} />
                        {v.estado.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">{v.total_respuestas}</span>
                        <span className="text-slate-400 text-xs">({v.total_preguntas} preg)</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        {v.estado === "borrador" && (
                          <>
                            <Link href={`/dashboard/votaciones/${v.id}`} className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-bold transition-all">
                              Editar
                            </Link>
                            <button
                              onClick={() => handleCambiarEstado(v.id, "activa")}
                              disabled={actionLoading === v.id}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-all"
                            >
                              Activar
                            </button>
                            <button
                              onClick={() => handleEliminar(v.id)}
                              disabled={actionLoading === v.id}
                              className="px-2 py-1.5 text-rose-600 hover:bg-rose-50 rounded text-xs font-bold transition-all"
                            >
                              Eliminar
                            </button>
                          </>
                        )}

                        {v.estado === "activa" && (
                          <>
                            <Link href={`/dashboard/votaciones/${v.id}/resultados`} className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-bold transition-all">
                              Resultados
                            </Link>
                            <button
                              onClick={() => handleCambiarEstado(v.id, "cerrada")}
                              disabled={actionLoading === v.id}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold transition-all"
                            >
                              Cerrar
                            </button>
                            {v.audiencia !== "app_users" && (
                              <button
                                onClick={() => handleCopyLink(v.id)}
                                className="px-2 py-1.5 text-slate-600 hover:bg-slate-100 rounded text-xs font-bold transition-all"
                                title="Copiar enlace público para responder"
                              >
                                Enlace 🔗
                              </button>
                            )}
                          </>
                        )}

                        {v.estado === "cerrada" && (
                          <>
                            <Link href={`/dashboard/votaciones/${v.id}/resultados`} className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-bold transition-all">
                              Resultados
                            </Link>
                            <a
                              href={`/api/votaciones/${v.id}/exportar`}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition-all inline-block align-middle"
                            >
                              Exportar CSV
                            </a>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
