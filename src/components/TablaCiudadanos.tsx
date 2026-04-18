"use client";

import { useEffect, useState, useCallback } from "react";
import type { Ciudadano } from "@/types/ciudadano";
import { getToken, authHeaders, authHeadersWithJson } from "@/lib/api";

interface CiudadanosResponse {
  data: (Ciudadano & { registrado_por?: string })[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
}

const NIVELES = ["Ninguno", "Primaria", "Secundaria", "Técnico", "Universitario", "Posgrado"];
const SEXOS = ["Masculino", "Femenino", "Otro"];

export default function TablaCiudadanos({ archivoId }: { archivoId?: string }) {
  const [data, setData] = useState<(Ciudadano & { registrado_por?: string })[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Ciudadano>>({});
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sectores, setSectores] = useState<{ id: number; nombre: string }[]>([]);

  // Fetch sectores for barrio filter dropdown
  useEffect(() => {
    fetch("/api/sectores", { headers: authHeaders() })
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setSectores(res.data.map((s: { id: number; nombre: string }) => ({ id: s.id, nombre: s.nombre })));
      })
      .catch(() => {});
  }, []);

  // Filter states
  const [search, setSearch] = useState("");
  const [filterNivel, setFilterNivel] = useState("");
  const [filterSexo, setFilterSexo] = useState("");
  const [filterBarrio, setFilterBarrio] = useState("");
  const [filterCorregimiento, setFilterCorregimiento] = useState("");
  const [filterOcupacion, setFilterOcupacion] = useState("");
  const [filterEsLider, setFilterEsLider] = useState("");

  const activeFilterCount = [filterNivel, filterSexo, filterBarrio, filterCorregimiento, filterOcupacion, filterEsLider].filter(Boolean).length;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(search && { search }),
        ...(filterNivel && { nivel: filterNivel }),
        ...(filterSexo && { sexo: filterSexo }),
        ...(filterBarrio && { barrio: filterBarrio }),
        ...(filterCorregimiento && { corregimiento: filterCorregimiento }),
        ...(filterOcupacion && { ocupacion: filterOcupacion }),
        ...(filterEsLider && { es_lider: filterEsLider }),
        ...(archivoId && archivoId !== "actual" && { archivo_id: archivoId }),
      });
      const res = await fetch(`/api/ciudadanos?${params}`, {
        headers: authHeaders(),
      });
      const json: CiudadanosResponse = await res.json();
      setData(json.data || []);
      setCount(json.count || 0);
      setTotalPages(json.total_pages || 0);
    } catch {
      setMessage({ type: "error", text: "Error al cargar datos" });
    } finally {
      setLoading(false);
    }
  }, [page, search, filterNivel, filterSexo, filterBarrio, filterCorregimiento, filterOcupacion, filterEsLider, archivoId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const clearAllFilters = () => {
    setSearch("");
    setFilterNivel("");
    setFilterSexo("");
    setFilterBarrio("");
    setFilterCorregimiento("");
    setFilterOcupacion("");
    setFilterEsLider("");
    setPage(1);
  };

  const startEdit = (c: Ciudadano) => {
    setEditingId(c.id!);
    setEditForm({
      nombre_completo: c.nombre_completo,
      telefono: c.telefono,
      sexo: c.sexo,
      edad: c.edad,
      nivel_estudios: c.nivel_estudios,
      ocupacion: c.ocupacion,
      barrio: c.barrio,
      corregimiento: c.corregimiento,
      vereda: c.vereda,
      es_lider: c.es_lider,
      nombre_lider: c.nombre_lider,
    });
  };

  const saveEdit = async (id: number) => {
    try {
      const res = await fetch(`/api/ciudadanos/${id}`, {
        method: "PUT",
        headers: authHeadersWithJson(),
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Registro actualizado" });
        setEditingId(null);
        fetchData();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error });
      }
    } catch {
      setMessage({ type: "error", text: "Error al actualizar" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar este registro?")) return;
    try {
      const res = await fetch(`/api/ciudadanos/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Registro eliminado" });
        fetchData();
      }
    } catch {
      setMessage({ type: "error", text: "Error al eliminar" });
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cenplus_export_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage({ type: "error", text: "Error al exportar" });
    }
  };

  return (
    <div>
      {/* Feedback message */}
      {message && (
        <div className="card" style={{
          padding: "12px 16px",
          marginBottom: 16,
          borderLeft: `4px solid ${message.type === "success" ? "#16a34a" : "#dc2626"}`,
          background: message.type === "success" ? "#f0fdf4" : "#fef2f2",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: message.type === "success" ? "#16a34a" : "#dc2626" }}>
              {message.text}
            </span>
            <button onClick={() => setMessage(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#94a3b8" }}>✕</button>
          </div>
        </div>
      )}

      {/* Search bar + filter toggle + export */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, flex: 1, minWidth: 240 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por cédula o nombre..."
                className="input"
                style={{ paddingLeft: 38 }}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">Buscar</button>
          </form>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-sm ${showFilters ? "btn-primary" : "btn-ghost"}`}
            style={{ position: "relative" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filtros
            {activeFilterCount > 0 && (
              <span style={{
                position: "absolute", top: -6, right: -6,
                width: 20, height: 20, borderRadius: "50%",
                background: "#ef4444", color: "white",
                fontSize: 11, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {activeFilterCount}
              </span>
            )}
          </button>

          <button onClick={handleExport} className="btn btn-ghost btn-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar CSV
          </button>
        </div>

        {/* Collapsible filter panel */}
        {showFilters && (
          <div style={{
            borderTop: "1px solid #e2e8f0",
            padding: "16px 20px",
            background: "#f8fafc",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 12,
            animation: "fadeIn 0.2s ease",
          }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Sexo</label>
              <select value={filterSexo} onChange={(e) => { setFilterSexo(e.target.value); setPage(1); }} className="input" style={{ fontSize: 13 }}>
                <option value="">Todos</option>
                {SEXOS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Nivel de Estudios</label>
              <select value={filterNivel} onChange={(e) => { setFilterNivel(e.target.value); setPage(1); }} className="input" style={{ fontSize: 13 }}>
                <option value="">Todos</option>
                {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Barrio (Sector)</label>
              <select value={filterBarrio} onChange={(e) => { setFilterBarrio(e.target.value); setPage(1); }} className="input" style={{ fontSize: 13 }}>
                <option value="">Todos</option>
                {sectores.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Corregimiento</label>
              <input
                type="text"
                value={filterCorregimiento}
                onChange={(e) => { setFilterCorregimiento(e.target.value); setPage(1); }}
                placeholder="Filtrar corregimiento..."
                className="input"
                style={{ fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Ocupación</label>
              <input
                type="text"
                value={filterOcupacion}
                onChange={(e) => { setFilterOcupacion(e.target.value); setPage(1); }}
                placeholder="Filtrar ocupación..."
                className="input"
                style={{ fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>¿Es Líder?</label>
              <select value={filterEsLider} onChange={(e) => { setFilterEsLider(e.target.value); setPage(1); }} className="input" style={{ fontSize: 13 }}>
                <option value="">Todos</option>
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button onClick={clearAllFilters} className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "center", color: "#dc2626" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Limpiar filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results count + active filter badges */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>
          Total: <strong style={{ color: "#0f172a" }}>{count}</strong> registros
        </span>
        {activeFilterCount > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {filterSexo && <FilterBadge label={`Sexo: ${filterSexo}`} onRemove={() => setFilterSexo("")} />}
            {filterNivel && <FilterBadge label={`Estudios: ${filterNivel}`} onRemove={() => setFilterNivel("")} />}
            {filterBarrio && <FilterBadge label={`Barrio: ${filterBarrio}`} onRemove={() => setFilterBarrio("")} />}
            {filterCorregimiento && <FilterBadge label={`Corr.: ${filterCorregimiento}`} onRemove={() => setFilterCorregimiento("")} />}
            {filterOcupacion && <FilterBadge label={`Ocupación: ${filterOcupacion}`} onRemove={() => setFilterOcupacion("")} />}
            {filterEsLider && <FilterBadge label={filterEsLider === "true" ? "Solo líderes" : "No líderes"} onRemove={() => setFilterEsLider("")} />}
          </div>
        )}
      </div>

      {/* Data table */}
      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
          <div style={{ width: 32, height: 32, border: "3px solid #e2e8f0", borderTop: "3px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          Cargando registros...
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : data.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
          <p style={{ color: "#64748b", fontSize: 14, fontWeight: 500, margin: 0 }}>No se encontraron registros</p>
          <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>Intente ajustar los filtros de búsqueda</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cédula</th>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Sexo</th>
                  <th>Edad</th>
                  <th>Estudios</th>
                  <th>Ocupación</th>
                  <th>Barrio</th>
                  <th>Corregimiento</th>
                  <th>Vereda</th>
                  <th>¿Líder?</th>
                  <th>Líder a Cargo</th>
                  <th>Registrado por</th>
                  <th>Coords</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontFamily: "monospace", fontSize: 12, whiteSpace: "nowrap" }}>{c.id_unico}</td>
                    <td style={{ whiteSpace: "nowrap", fontWeight: 500 }}>
                      {editingId === c.id ? (
                        <input
                          value={editForm.nombre_completo || ""}
                          onChange={(e) => setEditForm({ ...editForm, nombre_completo: e.target.value })}
                          className="input"
                          style={{ fontSize: 12, padding: "4px 8px", minWidth: 160 }}
                        />
                      ) : (
                        c.nombre_completo
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{c.telefono || "—"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {c.sexo ? (
                        <span className="badge" style={{
                          background: c.sexo === "Masculino" ? "#dbeafe" : c.sexo === "Femenino" ? "#fce7f3" : "#f3e8ff",
                          color: c.sexo === "Masculino" ? "#1d4ed8" : c.sexo === "Femenino" ? "#be185d" : "#7c3aed",
                        }}>{c.sexo}</span>
                      ) : "—"}
                    </td>
                    <td style={{ whiteSpace: "nowrap", textAlign: "center" }}>{c.edad || "—"}</td>
                    <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{c.nivel_estudios || "—"}</td>
                    <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{c.ocupacion || "—"}</td>
                    <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{c.barrio}</td>
                    <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{c.corregimiento}</td>
                    <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{c.vereda || "—"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {c.es_lider ? (
                        <span className="badge" style={{ background: "#fef3c7", color: "#d97706" }}>Sí</span>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: 12 }}>No</span>
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{c.nombre_lider || "—"}</td>
                    <td style={{ whiteSpace: "nowrap", fontSize: 12, color: "#3b82f6" }}>{c.registrado_por || "—"}</td>
                    <td style={{ whiteSpace: "nowrap", fontFamily: "monospace", fontSize: 11 }}>
                      {c.latitud ? (
                        <span style={{ color: "#16a34a" }}>{c.latitud.toFixed(4)}, {c.longitud!.toFixed(4)}</span>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>N/A</span>
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {editingId === c.id ? (
                          <>
                            <button onClick={() => saveEdit(c.id!)} className="btn btn-success btn-sm" style={{ padding: "4px 10px", fontSize: 11 }}>Guardar</button>
                            <button onClick={() => setEditingId(null)} className="btn btn-ghost btn-sm" style={{ padding: "4px 10px", fontSize: 11 }}>Cancelar</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(c)} className="btn btn-ghost btn-sm" style={{ padding: "4px 10px", fontSize: 11 }}>Editar</button>
                            <button onClick={() => handleDelete(c.id!)} className="btn btn-sm" style={{ padding: "4px 10px", fontSize: 11, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                              Eliminar
                            </button>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, paddingTop: 16 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-ghost btn-sm"
            style={{ opacity: page === 1 ? 0.4 : 1 }}
          >
            ← Anterior
          </button>
          <div style={{ display: "flex", gap: 4 }}>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pg: number;
              if (totalPages <= 7) {
                pg = i + 1;
              } else if (page <= 4) {
                pg = i + 1;
              } else if (page >= totalPages - 3) {
                pg = totalPages - 6 + i;
              } else {
                pg = page - 3 + i;
              }
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: "none",
                    fontSize: 13, fontWeight: page === pg ? 700 : 500, cursor: "pointer",
                    background: page === pg ? "#1e3a5f" : "transparent",
                    color: page === pg ? "white" : "#64748b",
                    transition: "all 0.15s ease",
                  }}
                >
                  {pg}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn btn-ghost btn-sm"
            style={{ opacity: page === totalPages ? 0.4 : 1 }}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}

// Small filter badge component
function FilterBadge({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe",
    }}>
      {label}
      <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#1d4ed8", fontSize: 13, lineHeight: 1 }}>×</button>
    </span>
  );
}
