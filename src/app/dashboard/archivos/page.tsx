"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Archivo = {
  id: number;
  nombre: string;
  descripcion: string;
  fecha_corte: string;
  fecha_creacion: string;
  total_ciudadanos: number;
  total_lideres: number;
  total_sectores: number;
  creado_por_nombre: string;
};

type Ciudadano = {
  id: number;
  id_unico: string;
  nombre_completo: string;
  telefono: string;
  sexo: string;
  edad: number;
  nivel_estudios: string;
  ocupacion: string;
  regimen_salud: string;
  puesto_votacion: string;
  problematica_principal: string;
  zona: string;
  id_comuna: number;
  id_barrio: number;
  barrio: string;
  corregimiento: string;
  vereda: string;
  es_lider: number;
  nombre_lider: string;
  latitud: number;
  longitud: number;
  created_at: string;
};

type Comparacion = {
  archivo1: Archivo;
  archivo2: Archivo;
  comparacion: {
    ciudadanos_en_ambos: number;
    solo_en_archivo1: number;
    solo_en_archivo2: number;
    diferencia_ciudadanos: number;
    diferencia_lideres: number;
    diferencia_sectores: number;
  };
  top_barrios_1: { name: string; count: number }[];
  top_barrios_2: { name: string; count: number }[];
  top_problematicas_1: { name: string; count: number }[];
  top_problematicas_2: { name: string; count: number }[];
};

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function ArchivosPage() {
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState<Archivo | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [compareIds, setCompareIds] = useState({ id1: "", id2: "" });
  const [compareResult, setCompareResult] = useState<Comparacion | null>(null);
  const [detailCiudadanos, setDetailCiudadanos] = useState<Ciudadano[]>([]);
  const [detailPage, setDetailPage] = useState(1);
  const [detailTotal, setDetailTotal] = useState(0);
  const [detailTotalPages, setDetailTotalPages] = useState(1);
  const [detailLoading, setDetailLoading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState("append");
  const [importResult, setImportResult] = useState<any>(null);
  const [showImport, setShowImport] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<number | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const [detailTab, setDetailTab] = useState<"ciudadanos" | "sectores" | "lideres">("ciudadanos");
  const [detailSectores, setDetailSectores] = useState<any[]>([]);
  const [detailLideres, setDetailLideres] = useState<any[]>([]);

  const [formNombre, setFormNombre] = useState("");
  const [formDescripcion, setFormDescripcion] = useState("");
  const [formFecha, setFormFecha] = useState("");

  const [searchFilter, setSearchFilter] = useState("");
  const [barrioFilter, setBarrioFilter] = useState("");
  const [sexoFilter, setSexoFilter] = useState("");

  const loadArchivos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/archivos", { headers: getAuthHeaders() });
      const data = await res.json();
      setArchivos(data.archivos || []);
    } catch (err) {
      console.error("Error cargando archivos:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadArchivos();
  }, [loadArchivos]);

  const handleCreate = async () => {
    if (!formNombre || !formFecha) return;

    const res = await fetch("/api/archivos", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ nombre: formNombre, descripcion: formDescripcion, fecha_corte: formFecha }),
    });

    const data = await res.json();
    if (data.success) {
      setFormNombre("");
      setFormDescripcion("");
      setFormFecha("");
      setShowModal(false);
      loadArchivos();
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/archivos/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (res.ok) {
      setSelectedForDelete(null);
      loadArchivos();
    }
  };

  const handleRestore = async (id: number) => {
    if (!confirm("Â¿Restaurar este archivo? Esto reemplazarÃ¡ TODOS los datos actuales con los del archivo.")) return;
    setRestoringId(id);
    try {
      const res = await fetch(`/api/archivos/${id}/restaurar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        loadArchivos();
      } else {
        alert("Error: " + (data.error || "No se pudo restaurar"));
      }
    } catch (err) {
      console.error("Error restaurando:", err);
      alert("Error de conexiÃ³n al restaurar");
    }
    setRestoringId(null);
  };

  const loadDetailData = useCallback(async (archivoId: number, tab: "ciudadanos" | "sectores" | "lideres", page: number = 1) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/archivos/${archivoId}/detalle?tab=${tab}&page=${page}&limit=20${searchFilter ? "&search=" + encodeURIComponent(searchFilter) : ""}${barrioFilter ? "&barrio=" + encodeURIComponent(barrioFilter) : ""}${sexoFilter ? "&sexo=" + encodeURIComponent(sexoFilter) : ""}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (tab === "ciudadanos") {
        setDetailCiudadanos(data.data || []);
        setDetailTotal(data.count || 0);
        setDetailTotalPages(data.total_pages || 1);
        setDetailPage(page);
      } else if (tab === "sectores") {
        setDetailSectores(data.data || []);
      } else {
        setDetailLideres(data.data || []);
      }
    } catch (err) {
      console.error("Error cargando datos:", err);
    }
    setDetailLoading(false);
  }, [searchFilter, barrioFilter, sexoFilter]);

  const openDetail = (archivo: Archivo) => {
    setShowDetail(archivo);
    setDetailTab("ciudadanos");
    setSearchFilter("");
    setBarrioFilter("");
    setSexoFilter("");
    loadDetailData(archivo.id, "ciudadanos", 1);
  };

  const handleDetailTabChange = (tab: "ciudadanos" | "sectores" | "lideres") => {
    setDetailTab(tab);
    if (showDetail) {
      loadDetailData(showDetail.id, tab, 1);
    }
  };

  const handleExport = async (archivoId: number) => {
    const res = await fetch(`/api/archivos/${archivoId}/export`, {
      method: "POST",
      headers: getAuthHeaders(),
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `archivo_${archivoId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const handleCompare = async () => {
    if (!compareIds.id1 || !compareIds.id2) return;
    const res = await fetch(`/api/archivos/compare?id1=${compareIds.id1}&id2=${compareIds.id2}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    setCompareResult(data);
  };

  const handleImport = async () => {
    if (!importFile) return;

    const formData = new FormData();
    formData.append("file", importFile);
    formData.append("mode", importMode);

    const res = await fetch("/api/import", {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
    });

    const data = await res.json();
    setImportResult(data);
  };

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", background: "#020617", padding: 20 }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: "#f8fafc" }}>
            Archivos Electorales
          </h1>
          <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0" }}>
            Gestiona y consulta el histÃ³rico de Ã©pocas electorales
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowCompare(true)}
            style={{ padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "#f59e0b", color: "white", border: "none", cursor: "pointer" }}
          >
            Comparar
          </button>
          <button
            onClick={() => setShowImport(true)}
            style={{ padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "#8b5cf6", color: "white", border: "none", cursor: "pointer" }}
          >
            Importar CSV
          </button>
          <button
            onClick={() => setShowModal(true)}
            style={{ padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "#6366f1", color: "white", border: "none", cursor: "pointer" }}
          >
            Nuevo Archivo
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        <div style={{ background: "#1e293b", borderRadius: 10, padding: 16, borderLeft: "4px solid #6366f1" }}>
          <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Total Archivos</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#f8fafc", marginTop: 4 }}>{archivos.length}</div>
        </div>
        <div style={{ background: "#1e293b", borderRadius: 10, padding: 16, borderLeft: "4px solid #10b981" }}>
          <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Total Ciudadanos Archivados</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#f8fafc", marginTop: 4 }}>{archivos.reduce((a, b) => a + b.total_ciudadanos, 0)}</div>
        </div>
        <div style={{ background: "#1e293b", borderRadius: 10, padding: 16, borderLeft: "4px solid #f59e0b" }}>
          <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Ãšltimo Archivo</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc", marginTop: 4 }}>
            {archivos.length > 0 ? new Date(archivos[0].fecha_creacion).toLocaleDateString("es-CO") : "N/A"}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>Cargando...</div>
      ) : archivos.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, background: "#1e293b", borderRadius: 12 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>ðŸ“</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#94a3b8", marginBottom: 4 }}>No hay archivos electorales</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Crea tu primer archivo para archivar una Ã©poca electoral</div>
        </div>
      ) : (
        <div style={{ background: "#1e293b", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155" }}>
                {["Nombre", "Fecha Corte", "Creado", "Ciudadanos", "LÃ­deres", "Sectores", "Acciones"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {archivos.map((a) => (
                <tr key={a.id} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#f8fafc" }}>{a.nombre}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#cbd5e1" }}>{new Date(a.fecha_corte).toLocaleDateString("es-CO")}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#cbd5e1" }}>{new Date(a.fecha_creacion).toLocaleDateString("es-CO")}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 800, color: "#10b981" }}>{a.total_ciudadanos}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 800, color: "#f59e0b" }}>{a.total_lideres}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 800, color: "#8b5cf6" }}>{a.total_sectores}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button onClick={() => openDetail(a)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: "#6366f1", color: "white", border: "none", cursor: "pointer" }}>Ver</button>
                      <button onClick={() => handleRestore(a.id)} disabled={restoringId === a.id} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: restoringId === a.id ? "#94a3b8" : "#f59e0b", color: "white", border: "none", cursor: restoringId === a.id ? "not-allowed" : "pointer" }}>
                        {restoringId === a.id ? "Restaurando..." : "Restaurar"}
                      </button>
                      <button onClick={() => handleExport(a.id)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: "#10b981", color: "white", border: "none", cursor: "pointer" }}>Exportar</button>
                      <button onClick={() => setSelectedForDelete(a.id)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: "#ef4444", color: "white", border: "none", cursor: "pointer" }}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 24, width: "100%", maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#f8fafc", marginBottom: 16 }}>Nuevo Archivo Electoral</h2>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 4, display: "block" }}>Nombre *</label>
              <input value={formNombre} onChange={(e) => setFormNombre(e.target.value)} placeholder="Ej: Elecciones Congreso 2026" style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "10px 12px", color: "#f8fafc", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 4, display: "block" }}>DescripciÃ³n</label>
              <textarea value={formDescripcion} onChange={(e) => setFormDescripcion(e.target.value)} placeholder="DescripciÃ³n opcional del archivo..." rows={3} style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "10px 12px", color: "#f8fafc", fontSize: 13, outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 4, display: "block" }}>Fecha de Corte *</label>
              <input type="date" value={formFecha} onChange={(e) => setFormFecha(e.target.value)} style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "10px 12px", color: "#f8fafc", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "#334155", color: "#cbd5e1", border: "none", cursor: "pointer" }}>Cancelar</button>
              <button onClick={handleCreate} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "#6366f1", color: "white", border: "none", cursor: "pointer" }}>Crear Archivo</button>
            </div>
          </div>
        </div>
      )}

      {showDetail && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowDetail(null)}>
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 24, width: "95%", maxWidth: 1100, maxHeight: "90vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#f8fafc", margin: 0 }}>{showDetail.nombre}</h2>
                <p style={{ fontSize: 11, color: "#64748b", margin: "4px 0 0" }}>
                  Corte: {new Date(showDetail.fecha_corte).toLocaleDateString("es-CO")} Â· {detailTotal} ciudadanos
                </p>
              </div>
              <button onClick={() => setShowDetail(null)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>&times;</button>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {(["ciudadanos", "sectores", "lideres"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleDetailTabChange(tab)}
                  style={{
                    padding: "6px 16px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: detailTab === tab ? "#6366f1" : "#0f172a",
                    color: detailTab === tab ? "white" : "#94a3b8",
                    border: "1px solid " + (detailTab === tab ? "#6366f1" : "#334155"),
                    cursor: "pointer", textTransform: "capitalize",
                  }}
                >
                  {tab === "ciudadanos" ? `Ciudadanos (${showDetail.total_ciudadanos})` : tab === "sectores" ? `Sectores (${showDetail.total_sectores})` : `LÃ­deres (${showDetail.total_lideres})`}
                </button>
              ))}
            </div>

            {detailTab === "ciudadanos" && (
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <input value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} placeholder="Buscar por cÃ©dula o nombre..." style={{ flex: 1, minWidth: 150, background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "6px 10px", color: "#f8fafc", fontSize: 11, outline: "none" }} />
                <input value={barrioFilter} onChange={(e) => setBarrioFilter(e.target.value)} placeholder="Barrio..." style={{ width: 120, background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "6px 10px", color: "#f8fafc", fontSize: 11, outline: "none" }} />
                <select value={sexoFilter} onChange={(e) => setSexoFilter(e.target.value)} style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "6px 10px", color: "#cbd5e1", fontSize: 11 }}>
                  <option value="">Sexo</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
                <button onClick={() => loadDetailData(showDetail.id, "ciudadanos", 1)} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "#6366f1", color: "white", border: "none", cursor: "pointer" }}>Filtrar</button>
              </div>
            )}

            {detailLoading ? (
              <div style={{ textAlign: "center", padding: 40, color: "#475569" }}>Cargando...</div>
            ) : (
              <>
                {detailTab === "ciudadanos" && (
                  <>
                    <div style={{ background: "#0f172a", borderRadius: 8, overflow: "auto", maxHeight: 400 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, minWidth: 900 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #334155" }}>
                            {["CÃ©dula", "Nombre", "TelÃ©fono", "Sexo", "Edad", "Estudios", "OcupaciÃ³n", "Barrio", "Corregimiento", "Vereda", "Zona", "ProblemÃ¡tica", "LÃ­der", "Coords"].map((h) => (
                              <th key={h} style={{ padding: "8px 8px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {detailCiudadanos.map((c) => (
                            <tr key={c.id} style={{ borderBottom: "1px solid #1e293b" }}>
                              <td style={{ padding: "6px 8px", color: "#cbd5e1", fontFamily: "monospace", fontSize: 9 }}>{c.id_unico}</td>
                              <td style={{ padding: "6px 8px", color: "#f8fafc", fontWeight: 600, whiteSpace: "nowrap" }}>{c.nombre_completo}</td>
                              <td style={{ padding: "6px 8px", color: "#cbd5e1", fontSize: 9 }}>{c.telefono || "â€”"}</td>
                              <td style={{ padding: "6px 8px", color: "#cbd5e1", fontSize: 9 }}>{c.sexo || "â€”"}</td>
                              <td style={{ padding: "6px 8px", color: "#cbd5e1", fontSize: 9 }}>{c.edad || "â€”"}</td>
                              <td style={{ padding: "6px 8px", color: "#cbd5e1", fontSize: 9 }}>{c.nivel_estudios || "â€”"}</td>
                              <td style={{ padding: "6px 8px", color: "#cbd5e1", fontSize: 9 }}>{c.ocupacion || "â€”"}</td>
                              <td style={{ padding: "6px 8px", color: "#cbd5e1", fontSize: 9 }}>{c.barrio || "â€”"}</td>
                              <td style={{ padding: "6px 8px", color: "#cbd5e1", fontSize: 9 }}>{c.corregimiento || "â€”"}</td>
                              <td style={{ padding: "6px 8px", color: "#cbd5e1", fontSize: 9 }}>{c.vereda || "â€”"}</td>
                              <td style={{ padding: "6px 8px", color: "#cbd5e1", fontSize: 9 }}>{c.zona || "â€”"}</td>
                              <td style={{ padding: "6px 8px", color: "#cbd5e1", fontSize: 9 }}>{c.problematica_principal || "â€”"}</td>
                              <td style={{ padding: "6px 8px", color: "#cbd5e1", fontSize: 9 }}>{c.es_lider ? "SÃ­" : "No"}</td>
                              <td style={{ padding: "6px 8px", color: "#cbd5e1", fontFamily: "monospace", fontSize: 8 }}>{c.latitud ? `${c.latitud.toFixed(4)}, ${c.longitud?.toFixed(4)}` : "N/A"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {detailTotalPages > 1 && (
                      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12 }}>
                        <button disabled={detailPage <= 1} onClick={() => loadDetailData(showDetail.id, "ciudadanos", detailPage - 1)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, background: "#334155", color: detailPage <= 1 ? "#475569" : "#cbd5e1", border: "none", cursor: detailPage <= 1 ? "not-allowed" : "pointer" }}>Anterior</button>
                        <span style={{ padding: "4px 10px", fontSize: 11, color: "#cbd5e1" }}>{detailPage} / {detailTotalPages}</span>
                        <button disabled={detailPage >= detailTotalPages} onClick={() => loadDetailData(showDetail.id, "ciudadanos", detailPage + 1)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, background: "#334155", color: detailPage >= detailTotalPages ? "#475569" : "#cbd5e1", border: "none", cursor: detailPage >= detailTotalPages ? "not-allowed" : "pointer" }}>Siguiente</button>
                      </div>
                    )}
                  </>
                )}

                {detailTab === "sectores" && (
                  <div style={{ background: "#0f172a", borderRadius: 8, overflow: "auto", maxHeight: 400 }}>
                    {detailSectores.length === 0 ? (
                      <div style={{ textAlign: "center", padding: 40, color: "#475569" }}>No hay sectores en este archivo</div>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #334155" }}>
                            {["Nombre", "Zona", "Meta", "Votos HistÃ³ricos", "DescripciÃ³n"].map((h) => (
                              <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {detailSectores.map((s, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                              <td style={{ padding: "8px 12px", color: "#f8fafc", fontWeight: 600 }}>{s.nombre}</td>
                              <td style={{ padding: "8px 12px", color: "#cbd5e1" }}>{s.zona || "urbana"}</td>
                              <td style={{ padding: "8px 12px", color: "#10b981", fontWeight: 700 }}>{s.meta}</td>
                              <td style={{ padding: "8px 12px", color: "#f59e0b", fontWeight: 700 }}>{s.votos_historicos || 0}</td>
                              <td style={{ padding: "8px 12px", color: "#cbd5e1" }}>{s.descripcion || "â€”"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {detailTab === "lideres" && (
                  <div style={{ background: "#0f172a", borderRadius: 8, overflow: "auto", maxHeight: 400 }}>
                    {detailLideres.length === 0 ? (
                      <div style={{ textAlign: "center", padding: 40, color: "#475569" }}>No hay lÃ­deres en este archivo</div>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #334155" }}>
                            {["Nombre", "Email", "Rol", "Activo", "Creado"].map((h) => (
                              <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {detailLideres.map((l, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                              <td style={{ padding: "8px 12px", color: "#f8fafc", fontWeight: 600 }}>{l.nombre}</td>
                              <td style={{ padding: "8px 12px", color: "#cbd5e1" }}>{l.email}</td>
                              <td style={{ padding: "8px 12px", color: "#cbd5e1" }}>{l.role}</td>
                              <td style={{ padding: "8px 12px", color: l.activo ? "#10b981" : "#ef4444", fontWeight: 700 }}>{l.activo ? "SÃ­" : "No"}</td>
                              <td style={{ padding: "8px 12px", color: "#cbd5e1" }}>{new Date(l.created_at).toLocaleDateString("es-CO")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {showCompare && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => { setShowCompare(false); setCompareResult(null); }}>
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 24, width: "95%", maxWidth: 700, maxHeight: "90vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#f8fafc", margin: 0 }}>Comparar Archivos</h2>
              <button onClick={() => { setShowCompare(false); setCompareResult(null); }} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>&times;</button>
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <select value={compareIds.id1} onChange={(e) => setCompareIds({ ...compareIds, id1: e.target.value })} style={{ flex: 1, background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "10px 12px", color: "#f8fafc", fontSize: 13, outline: "none" }}>
                <option value="">Seleccionar archivo 1</option>
                {archivos.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
              <select value={compareIds.id2} onChange={(e) => setCompareIds({ ...compareIds, id2: e.target.value })} style={{ flex: 1, background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "10px 12px", color: "#f8fafc", fontSize: 13, outline: "none" }}>
                <option value="">Seleccionar archivo 2</option>
                {archivos.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
              <button onClick={handleCompare} style={{ padding: "10px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "#6366f1", color: "white", border: "none", cursor: "pointer" }}>Comparar</button>
            </div>

            {compareResult && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                  <div style={{ background: "#0f172a", borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>{compareResult.archivo1.nombre}</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "#6366f1" }}>{compareResult.archivo1.total_ciudadanos}</div>
                  </div>
                  <div style={{ background: "#0f172a", borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>En Ambos</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "#f59e0b" }}>{compareResult.comparacion.ciudadanos_en_ambos}</div>
                  </div>
                  <div style={{ background: "#0f172a", borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>{compareResult.archivo2.nombre}</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "#10b981" }}>{compareResult.archivo2.total_ciudadanos}</div>
                  </div>
                </div>

                <div style={{ background: "#0f172a", borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "#f8fafc", margin: "0 0 8px" }}>Diferencias</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                    <div style={{ color: "#cbd5e1" }}>Solo en archivo 1: <span style={{ fontWeight: 800, color: "#6366f1" }}>{compareResult.comparacion.solo_en_archivo1}</span></div>
                    <div style={{ color: "#cbd5e1" }}>Solo en archivo 2: <span style={{ fontWeight: 800, color: "#10b981" }}>{compareResult.comparacion.solo_en_archivo2}</span></div>
                    <div style={{ color: "#cbd5e1" }}>Diferencia ciudadanos: <span style={{ fontWeight: 800, color: compareResult.comparacion.diferencia_ciudadanos >= 0 ? "#10b981" : "#ef4444" }}>{compareResult.comparacion.diferencia_ciudadanos >= 0 ? "+" : ""}{compareResult.comparacion.diferencia_ciudadanos}</span></div>
                    <div style={{ color: "#cbd5e1" }}>Diferencia lÃ­deres: <span style={{ fontWeight: 800, color: compareResult.comparacion.diferencia_lideres >= 0 ? "#10b981" : "#ef4444" }}>{compareResult.comparacion.diferencia_lideres >= 0 ? "+" : ""}{compareResult.comparacion.diferencia_lideres}</span></div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ background: "#0f172a", borderRadius: 8, padding: 12 }}>
                    <h4 style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", margin: "0 0 8px" }}>Top Barrios - {compareResult.archivo1.nombre}</h4>
                    {compareResult.top_barrios_1.map((b, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#cbd5e1", padding: "3px 0" }}>
                        <span>{b.name}</span>
                        <span style={{ fontWeight: 700 }}>{b.count}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "#0f172a", borderRadius: 8, padding: 12 }}>
                    <h4 style={{ fontSize: 11, fontWeight: 700, color: "#10b981", margin: "0 0 8px" }}>Top Barrios - {compareResult.archivo2.nombre}</h4>
                    {compareResult.top_barrios_2.map((b, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#cbd5e1", padding: "3px 0" }}>
                        <span>{b.name}</span>
                        <span style={{ fontWeight: 700 }}>{b.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showImport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => { setShowImport(false); setImportResult(null); }}>
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 24, width: "100%", maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#f8fafc", marginBottom: 16 }}>Importar CSV</h2>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 4, display: "block" }}>Archivo CSV *</label>
              <input type="file" accept=".csv" onChange={(e) => setImportFile(e.target.files?.[0] || null)} style={{ width: "100%", fontSize: 12, color: "#cbd5e1" }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 4, display: "block" }}>Modo de importaciÃ³n</label>
              <select value={importMode} onChange={(e) => setImportMode(e.target.value)} style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "10px 12px", color: "#f8fafc", fontSize: 13, outline: "none" }}>
                <option value="append">Agregar a los existentes</option>
                <option value="replace">Reemplazar todo</option>
              </select>
            </div>
            {importResult && (
              <div style={{ background: "#0f172a", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12 }}>
                <div style={{ color: "#10b981", fontWeight: 700, marginBottom: 4 }}>Importados: {importResult.importados}</div>
                <div style={{ color: "#f59e0b", fontWeight: 700, marginBottom: 4 }}>Duplicados: {importResult.duplicados}</div>
                <div style={{ color: "#ef4444", fontWeight: 700 }}>Errores: {importResult.errores}</div>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowImport(false); setImportResult(null); }} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "#334155", color: "#cbd5e1", border: "none", cursor: "pointer" }}>Cerrar</button>
              <button onClick={handleImport} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "#8b5cf6", color: "white", border: "none", cursor: "pointer" }}>Importar</button>
            </div>
          </div>
        </div>
      )}

      {selectedForDelete !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setSelectedForDelete(null)}>
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 24, width: "100%", maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#f8fafc", margin: "0 0 8px" }}>Eliminar Archivo</h3>
            <p style={{ fontSize: 12, color: "#cbd5e1", margin: "0 0 20px" }}>Â¿EstÃ¡s seguro? Esta acciÃ³n no se puede deshacer.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setSelectedForDelete(null)} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "#334155", color: "#cbd5e1", border: "none", cursor: "pointer" }}>Cancelar</button>
              <button onClick={() => handleDelete(selectedForDelete)} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "#ef4444", color: "white", border: "none", cursor: "pointer" }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
