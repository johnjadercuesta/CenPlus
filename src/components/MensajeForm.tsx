"use client";

import { useEffect, useState, useCallback } from "react";

type TabType = "nuevo" | "historial" | "programados";
type ModoType = "masivo" | "individual";

interface FilterState {
  lider_ids: number[];
  comuna_ids: number[];
  barrio_ids: number[];
  zona: string;
  sexo: string;
}

interface LiderOption {
  id: number;
  nombre: string;
  ciudadanos_count?: number;
}

interface ComunaOption {
  id: number;
  nombre: string;
}

interface BarrioOption {
  id: number;
  nombre: string;
  comuna_id: number;
}

interface PreviewCitizen {
  id: number;
  nombre_completo: string;
  telefono: string;
  nombre_lider: string;
}

interface HistoryItem {
  id: number;
  canal: string;
  modo: string;
  mensaje: string;
  destinatarios_count: number;
  exitosos_count: number;
  fallidos_count: number;
  estado: string;
  filtros: any;
  programado_para: string | null;
  enviado_en: string | null;
  created_at: string;
}

interface ScheduledItem {
  id: number;
  canal: string;
  modo: string;
  mensaje: string;
  destinatarios_count: number;
  programado_para: string;
  created_at: string;
}

interface Props {
  canal: "whatsapp" | "sms";
}

export default function MensajeForm({ canal }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("nuevo");
  const [modo, setModo] = useState<ModoType>("masivo");

  const [apiConfigurada, setApiConfigurada] = useState<boolean | null>(null);

  const [filtros, setFiltros] = useState<FilterState>({
    lider_ids: [],
    comuna_ids: [],
    barrio_ids: [],
    zona: "",
    sexo: "",
  });

  const [lideres, setLideres] = useState<LiderOption[]>([]);
  const [comunas, setComunas] = useState<ComunaOption[]>([]);
  const [barrios, setBarrios] = useState<BarrioOption[]>([]);

  const [mensaje, setMensaje] = useState("");
  const [plantilla, setPlantilla] = useState("alerta_comunitaria");
  const [programarFecha, setProgramarFecha] = useState("");

  const [preview, setPreview] = useState<PreviewCitizen[]>([]);
  const [previewCount, setPreviewCount] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedCitizen, setSelectedCitizen] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null);
  const [historyDetail, setHistoryDetail] = useState<any[]>([]);

  const [scheduled, setScheduled] = useState<ScheduledItem[]>([]);
  const [scheduledLoading, setScheduledLoading] = useState(false);

  const [allCitizens, setAllCitizens] = useState<PreviewCitizen[]>([]);
  const [citizenSearch, setCitizenSearch] = useState("");

  const authHeaders = useCallback((): Record<string, string> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  }, []);

  useEffect(() => {
    const h = authHeaders()
    fetch("/api/auth/me", { headers: h }).then(r => r.json()).then(data => {
      setApiConfigurada(!!data.authenticated);
    }).catch(() => setApiConfigurada(false));
  }, [authHeaders]);

  const barrioTipo = () => {
    if (filtros.zona === "rural") return "vereda";
    if (filtros.zona === "urbana") return "barrio";
    return "";
  };

  useEffect(() => {
    const h = authHeaders();
    fetch("/api/mensajes/lideres", { headers: h })
      .then(r => r.json())
      .then(lRes => {
        const lideresData = lRes.data || [];
        setLideres(lideresData);
        fetch("/api/ciudadanos?all=true&limit=1", { headers: h })
          .then(r => r.json())
          .then(cData => {
            if (cData.count > 0) {
              fetch("/api/ciudadanos?all=true", { headers: h })
                .then(r => r.json())
                .then(allData => {
                  const citizens = allData.data || [];
                  const countMap: Record<number, number> = {};
                  citizens.forEach((c: any) => {
                    if (c.lider_id) {
                      countMap[c.lider_id] = (countMap[c.lider_id] || 0) + 1;
                    }
                  });
                  setLideres(prev => prev.map(l => ({
                    ...l,
                    ciudadanos_count: countMap[l.id] || 0,
                  })));
                });
            }
          });
      });
  }, [authHeaders]);

  useEffect(() => {
    const h = authHeaders();
    const params = new URLSearchParams();
    if (filtros.zona) params.set("tipo", filtros.zona);
    fetch(`/api/territorio/comunas?${params}`, { headers: h })
      .then(r => r.json())
      .then(d => {
        setComunas(d.data || []);
        setFiltros(prev => ({ ...prev, comuna_ids: [], barrio_ids: [] }));
      });
    setPreview([]);
    setAllCitizens([]);
    setSelectedIds(new Set());
  }, [filtros.zona]);

  useEffect(() => {
    const h = authHeaders();
    const params = new URLSearchParams();
    const bt = barrioTipo();
    if (bt) params.set("tipo", bt);
    fetch(`/api/territorio/barrios?${params}`, { headers: h })
      .then(r => r.json())
      .then(d => {
        const all = d.data || [];
        if (filtros.comuna_ids.length > 0) {
          setBarrios(all.filter((b: BarrioOption) => filtros.comuna_ids.includes(b.comuna_id)));
        } else {
          setBarrios(all);
        }
      });
    setFiltros(prev => ({ ...prev, barrio_ids: [] }));
    setPreview([]);
    setAllCitizens([]);
    setSelectedIds(new Set());
  }, [filtros.zona, filtros.comuna_ids]);

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setSearching(true);
      const h = authHeaders();
      fetch(`/api/ciudadanos?search=${encodeURIComponent(searchTerm)}&limit=10`, { headers: h })
        .then(r => r.json())
        .then(data => setSearchResults(data.data || []))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, authHeaders]);

  const hasFilters = () => {
    return filtros.lider_ids.length > 0 || filtros.comuna_ids.length > 0 ||
      filtros.barrio_ids.length > 0 || filtros.zona || filtros.sexo;
  };

  const handlePreview = useCallback(async () => {
    setPreviewLoading(true);
    setSendResult(null);
    setSelectedIds(new Set());
    setCitizenSearch("");
    try {
      const body: any = { ...filtros };
      if (modo === "individual" && selectedCitizen) {
        body.ciudadano_id = selectedCitizen.id;
      }
      const res = await fetch("/api/mensajes/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setAllCitizens(data.preview || []);
        setPreview(data.preview || []);
        setPreviewCount(data.count);
        setSelectedIds(new Set((data.preview || []).map((c: any) => c.id)));
      } else {
        setPreview([]);
        setAllCitizens([]);
        setPreviewCount(0);
        alert(data.error || "Error al previsualizar");
      }
    } catch {
      alert("Error de conexion");
    } finally {
      setPreviewLoading(false);
    }
  }, [filtros, modo, selectedCitizen]);

  const handleSend = useCallback(async () => {
    if (!mensaje.trim()) { alert("Escribe un mensaje"); return; }
    if (modo === "masivo" && selectedIds.size === 0) {
      alert("Selecciona al menos un destinatario");
      return;
    }

    setSending(true);
    setSendResult(null);
    try {
      const body: any = {
        mensaje: mensaje.trim(),
        canal,
        plantilla_nombre: plantilla,
        ciudadano_ids: modo === "masivo" ? Array.from(selectedIds) : undefined,
      };

      if (modo === "individual" && selectedCitizen) {
        body.ciudadano_id = selectedCitizen.id;
      } else {
        Object.assign(body, filtros);
      }

      if (programarFecha) {
        body.programado_para = new Date(programarFecha).toISOString();
      }

      const res = await fetch("/api/mensajes/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult(data.data || data);
        setPreview([]);
        setAllCitizens([]);
        setMensaje("");
        setProgramarFecha("");
        if (modo === "masivo") {
          loadScheduled();
          loadHistory(1);
        }
      } else {
        alert(data.error || "Error al enviar");
      }
    } catch {
      alert("Error de conexion");
    } finally {
      setSending(false);
    }
  }, [mensaje, canal, plantilla, programarFecha, modo, selectedCitizen, filtros, selectedIds]);

  const loadHistory = useCallback(async (page: number) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/mensajes/history?page=${page}&limit=20`);
      const data = await res.json();
      if (res.ok) {
        setHistory(data.data || []);
        setHistoryTotal(data.total || 0);
        setHistoryPage(data.page || 1);
      }
    } catch {
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadScheduled = useCallback(async () => {
    setScheduledLoading(true);
    try {
      const res = await fetch("/api/mensajes/scheduled");
      const data = await res.json();
      if (res.ok) setScheduled(data.data || []);
    } catch {
    } finally {
      setScheduledLoading(false);
    }
  }, []);

  const cancelScheduled = useCallback(async (id: number) => {
    if (!confirm("Cancelar este envio programado?")) return;
    try {
      const res = await fetch(`/api/mensajes/scheduled/${id}`, { method: "DELETE" });
      if (res.ok) {
        loadScheduled();
      } else {
        const data = await res.json();
        alert(data.error || "Error al cancelar");
      }
    } catch {
      alert("Error de conexion");
    }
  }, [loadScheduled]);

  const loadHistoryDetail = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/mensajes/history/${id}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedHistory(data.envio);
        setHistoryDetail(data.destinatarios || []);
      }
    } catch {
    }
  }, []);

  const totalHistoryPages = Math.ceil(historyTotal / 20);

  const toggleFilterArray = (key: keyof FilterState, value: number) => {
    setFiltros(prev => {
      const arr = prev[key] as number[];
      const exists = arr.includes(value);
      return {
        ...prev,
        [key]: exists ? arr.filter(v => v !== value) : [...arr, value],
      };
    });
    setPreview([]);
    setAllCitizens([]);
    setSelectedIds(new Set());
  };

  const selectCitizen = (citizen: any) => {
    setSelectedCitizen(citizen);
    setSearchTerm(citizen.nombre_completo + " - " + citizen.id_unico);
    setSearchResults([]);
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "enviado": return "#22c55e";
      case "parcial": return "#f59e0b";
      case "fallido": return "#ef4444";
      case "pendiente": return "#3b82f6";
      case "cancelado": return "#6b7280";
      case "enviando": return "#8b5cf6";
      default: return "#6b7280";
    }
  };

  const resetForm = () => {
    setPreview([]);
    setAllCitizens([]);
    setPreviewCount(0);
    setSelectedIds(new Set());
    setSendResult(null);
    setMensaje("");
    setProgramarFecha("");
    setSelectedCitizen(null);
    setSearchTerm("");
    setCitizenSearch("");
  };

  const toggleSelectAll = () => {
    if (preview.length === 0) return;
    if (selectedIds.size === preview.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(preview.map(c => c.id)));
    }
  };

  const toggleCitizen = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredPreview = citizenSearch
    ? preview.filter(c =>
        c.nombre_completo.toLowerCase().includes(citizenSearch.toLowerCase()) ||
        (c.telefono && c.telefono.includes(citizenSearch))
      )
    : preview;

  const titulo = canal === "whatsapp" ? "WhatsApp" : "SMS";
  const subtitulo = canal === "whatsapp"
    ? "Envía mensajes por WhatsApp a los ciudadanos"
    : "Envía mensajes de texto SMS a los ciudadanos";

  return (
    <div>
      <div className="main-header">
        <div>
          <h1 className="main-header-title">{titulo}</h1>
          <p className="main-header-subtitle">{subtitulo}</p>
        </div>
      </div>

      <div className="main-content">
        <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "2px solid #e2e8f0" }}>
          {([
            { key: "nuevo" as TabType, label: "Nuevo envío" },
            { key: "historial" as TabType, label: "Historial" },
            { key: "programados" as TabType, label: "Programados" },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "10px 20px",
                border: "none",
                borderBottom: activeTab === tab.key ? "2px solid #3b82f6" : "2px solid transparent",
                background: "transparent",
                color: activeTab === tab.key ? "#3b82f6" : "#64748b",
                fontWeight: activeTab === tab.key ? 700 : 500,
                cursor: "pointer",
                fontSize: 14,
                marginBottom: -2,
              }}
            >
              {tab.label}
              {tab.key === "programados" && scheduled.length > 0 && (
                <span style={{ marginLeft: 8, background: "#3b82f6", color: "white", borderRadius: 10, padding: "1px 8px", fontSize: 12 }}>
                  {scheduled.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "nuevo" && (
          <div>
            {canal === "whatsapp" && apiConfigurada === false && (
              <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 14 }}>
                <strong>Meta Cloud API no configurada.</strong> Para enviar mensajes, configura las variables
                de entorno <code>WHATSAPP_TOKEN</code> y <code>WHATSAPP_PHONE_ID</code> en tu .env.local.
              </div>
            )}

            {canal === "sms" && (
              <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 14 }}>
                <strong>SMS no configurado.</strong> Para enviar mensajes de texto, configura un proveedor
                (Twilio, Inalambria Express, etc.) en las variables de entorno.
              </div>
            )}

            {!sendResult && (
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {(["masivo", "individual"] as ModoType[]).map(m => (
                  <button
                    key={m}
                    onClick={() => { setModo(m); resetForm(); }}
                    style={{
                      padding: "8px 20px",
                      border: modo === m ? "2px solid #3b82f6" : "1px solid #d1d5db",
                      borderRadius: 8,
                      background: modo === m ? "#eff6ff" : "white",
                      color: modo === m ? "#3b82f6" : "#374151",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    {m === "masivo" ? "📨 Envío masivo" : "✉️ Envío individual"}
                  </button>
                ))}
              </div>
            )}

            {sendResult && (
              <div style={{ background: sendResult.estado === "pendiente" ? "#eff6ff" : sendResult.fallidos === 0 ? "#f0fdf4" : "#fef2f2", border: `1px solid ${sendResult.estado === "pendiente" ? "#3b82f6" : sendResult.fallidos === 0 ? "#22c55e" : "#ef4444"}`, borderRadius: 8, padding: 20, marginBottom: 20 }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>
                  {sendResult.estado === "pendiente" ? "✅ Envío programado" : sendResult.fallidos === 0 ? "✅ Envío completado" : "⚠️ Envío con fallos"}
                </h3>
                {sendResult.estado === "pendiente" ? (
                  <p style={{ margin: 0, fontSize: 14, color: "#374151" }}>
                    Programado para: {new Date(sendResult.programado_para).toLocaleString("es-CO")}
                  </p>
                ) : (
                  <p style={{ margin: 0, fontSize: 14, color: "#374151" }}>
                    {sendResult.exitosos || 0} enviados, {sendResult.fallidos || 0} fallidos de {sendResult.total || 0} destinatarios
                  </p>
                )}
                <button onClick={resetForm} style={{ marginTop: 12, padding: "6px 16px", border: "1px solid #d1d5db", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 13 }}>
                  Nuevo envío
                </button>
              </div>
            )}

            {!sendResult && (
              <>
                {/* Individual mode */}
                {modo === "individual" && (
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontWeight: 600, fontSize: 13, marginBottom: 6, color: "#374151" }}>
                      Buscar ciudadano
                    </label>
                    <input
                      type="text"
                      placeholder="Nombre o cédula..."
                      value={searchTerm}
                      onChange={e => { setSearchTerm(e.target.value); setSelectedCitizen(null); }}
                      style={{ width: "100%", maxWidth: 400, padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }}
                    />
                    {searching && <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>Buscando...</p>}
                    {searchResults.length > 0 && !selectedCitizen && (
                      <div style={{ border: "1px solid #e2e8f0", borderRadius: 6, marginTop: 4, maxWidth: 400, maxHeight: 200, overflowY: "auto" }}>
                        {searchResults.map((c: any) => (
                          <div
                            key={c.id}
                            onClick={() => selectCitizen(c)}
                            style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                            onMouseLeave={e => (e.currentTarget.style.background = "white")}
                          >
                            <strong>{c.nombre_completo}</strong>
                            <span style={{ color: "#6b7280", marginLeft: 8 }}>{c.id_unico}</span>
                            {c.telefono && <span style={{ color: "#22c55e", marginLeft: 8 }}>📱 {c.telefono}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedCitizen && (
                      <div style={{ marginTop: 8, padding: 10, background: "#f0fdf4", borderRadius: 6, border: "1px solid #22c55e", display: "inline-block" }}>
                        <strong>{selectedCitizen.nombre_completo}</strong>
                        {selectedCitizen.telefono && <span style={{ marginLeft: 12 }}>📱 {selectedCitizen.telefono}</span>}
                        <button onClick={() => { setSelectedCitizen(null); setSearchTerm(""); }} style={{ marginLeft: 12, border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>
                          Quitar
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Massive mode: cascading filters */}
                {modo === "masivo" && (
                  <div style={{ marginBottom: 20 }}>
                    {/* Row 1: Zona */}
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
                      <label style={{ display: "block", fontWeight: 700, fontSize: 12, marginBottom: 6, color: "#374151", textTransform: "uppercase" }}>🌍 Zona</label>
                      <div style={{ display: "flex", gap: 4 }}>
                        {["", "urbana", "rural"].map(z => (
                          <button key={z} onClick={() => setFiltros(prev => ({ ...prev, zona: z }))}
                            style={{
                              padding: "4px 10px", borderRadius: 6, fontSize: 12,
                              border: filtros.zona === z ? "2px solid #3b82f6" : "1px solid #d1d5db",
                              background: filtros.zona === z ? "#eff6ff" : "white",
                              color: filtros.zona === z ? "#3b82f6" : "#374151",
                              fontWeight: 500, cursor: "pointer",
                            }}
                          >
                            {z ? (z.charAt(0).toUpperCase() + z.slice(1)) : "Todas"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Row 2: Comunas/Corregimientos + Barrios/Veredas */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12 }}>
                        <label style={{ display: "block", fontWeight: 700, fontSize: 12, marginBottom: 8, color: "#374151", textTransform: "uppercase" }}>
                          {filtros.zona === "rural" ? "🏔️ Corregimiento(s)" : "🏘️ Comuna(s)"}
                        </label>
                        <div style={{ maxHeight: 180, overflowY: "auto" }}>
                          {comunas.length === 0 ? (
                            <span style={{ fontSize: 12, color: "#9ca3af" }}>Sin {filtros.zona === "rural" ? "corregimientos" : "comunas"}</span>
                          ) : (
                            comunas.map(c => (
                              <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 4px", fontSize: 13, cursor: "pointer", borderRadius: 4 }}
                                onMouseEnter={e => (e.currentTarget.style.background = "#e2e8f0")}
                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                <input type="checkbox" checked={filtros.comuna_ids.includes(c.id)} onChange={() => toggleFilterArray("comuna_ids", c.id)} />
                                {c.nombre}
                              </label>
                            ))
                          )}
                        </div>
                        {filtros.comuna_ids.length === 0 && comunas.length > 0 && (
                          <p style={{ fontSize: 11, color: "#6b7280", margin: "6px 0 0", fontStyle: "italic" }}>
                            Selecciona {filtros.zona === "rural" ? "un corregimiento" : "una comuna"} para filtrar {filtros.zona === "rural" ? "veredas" : "barrios"}
                          </p>
                        )}
                      </div>

                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12 }}>
                        <label style={{ display: "block", fontWeight: 700, fontSize: 12, marginBottom: 8, color: "#374151", textTransform: "uppercase" }}>
                          {filtros.zona === "rural" ? "🌿 Vereda(s)" : "📍 Barrio(s)"}
                        </label>
                        <div style={{ maxHeight: 180, overflowY: "auto" }}>
                          {barrios.length === 0 ? (
                            <span style={{ fontSize: 12, color: "#9ca3af" }}>
                              {comunas.length === 0
                                ? `Sin ${filtros.zona === "rural" ? "veredas" : "barrios"} disponibles`
                                : `Selecciona ${filtros.zona === "rural" ? "un corregimiento" : "una comuna"} primero`}
                            </span>
                          ) : (
                            barrios.map(b => (
                              <label key={b.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 4px", fontSize: 13, cursor: "pointer", borderRadius: 4 }}
                                onMouseEnter={e => (e.currentTarget.style.background = "#e2e8f0")}
                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                <input type="checkbox" checked={filtros.barrio_ids.includes(b.id)} onChange={() => toggleFilterArray("barrio_ids", b.id)} />
                                {b.nombre}
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Líder + Sexo */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12 }}>
                        <label style={{ display: "block", fontWeight: 700, fontSize: 12, marginBottom: 8, color: "#374151", textTransform: "uppercase" }}>
                          👤 Líder(es)
                        </label>
                        <div style={{ maxHeight: 120, overflowY: "auto" }}>
                          {lideres.filter(l => l.nombre).map(l => (
                            <label key={l.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 4px", fontSize: 13, cursor: "pointer", borderRadius: 4 }}
                              onMouseEnter={e => (e.currentTarget.style.background = "#e2e8f0")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                              <input type="checkbox" checked={filtros.lider_ids.includes(l.id)} onChange={() => toggleFilterArray("lider_ids", l.id)} />
                              <span>{l.nombre}</span>
                              {l.ciudadanos_count !== undefined && (
                                <span style={{ marginLeft: "auto", fontSize: 11, color: "#6b7280", background: "#e2e8f0", padding: "0 6px", borderRadius: 8 }}>
                                  {l.ciudadanos_count}
                                </span>
                              )}
                            </label>
                          ))}
                          {lideres.length === 0 && <span style={{ fontSize: 12, color: "#9ca3af" }}>Sin líderes</span>}
                        </div>
                      </div>

                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px" }}>
                        <label style={{ display: "block", fontWeight: 700, fontSize: 12, marginBottom: 6, color: "#374151", textTransform: "uppercase" }}>⚤ Sexo</label>
                        <select value={filtros.sexo} onChange={e => { setFiltros(prev => ({ ...prev, sexo: e.target.value })); setPreview([]); }}
                          style={{ width: "100%", padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12 }}>
                          <option value="">Todos</option>
                          <option value="Masculino">Masculino</option>
                          <option value="Femenino">Femenino</option>
                        </select>
                      </div>
                    </div>

                    {/* Preview button */}
                    <button
                      onClick={handlePreview}
                      disabled={previewLoading}
                      style={{
                        padding: "8px 20px", border: "none", borderRadius: 6,
                        background: previewLoading ? "#94a3b8" : "#3b82f6",
                        color: "white", fontWeight: 600,
                        cursor: previewLoading ? "not-allowed" : "pointer", fontSize: 13,
                      }}
                    >
                      {previewLoading ? "Previsualizando..." : "🔍 Previsualizar destinatarios"}
                    </button>
                  </div>
                )}

                {/* Preview results with citizen selection */}
                {(preview.length > 0 || previewCount > 0) && (
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16, marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 15 }}>
                          {previewCount} destinatario{previewCount !== 1 ? "s" : ""} encontrado{previewCount !== 1 ? "s" : ""}
                        </h3>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280" }}>
                          {selectedIds.size} seleccionado{selectedIds.size !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {modo === "masivo" && (
                          <>
                            {previewCount <= 100 && (
                              <button onClick={toggleSelectAll} style={{ padding: "4px 10px", border: "1px solid #d1d5db", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 11 }}>
                                {selectedIds.size === preview.length ? "Deseleccionar todos" : "Seleccionar todos"}
                              </button>
                            )}
                            {previewCount > 20 && (
                              <input
                                type="text"
                                placeholder="Filtrar por nombre..."
                                value={citizenSearch}
                                onChange={e => setCitizenSearch(e.target.value)}
                                style={{ padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, width: 180 }}
                              />
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {preview.length > 0 && (
                      <div style={{ maxHeight: 300, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 6 }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                          <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                            <tr style={{ background: "#f1f5f9" }}>
                              {modo === "masivo" && <th style={{ width: 30, padding: "6px 4px" }}></th>}
                              <th style={{ textAlign: "left", padding: "6px 8px" }}>Nombre</th>
                              <th style={{ textAlign: "left", padding: "6px 8px" }}>Teléfono</th>
                              <th style={{ textAlign: "left", padding: "6px 8px" }}>Líder</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredPreview.map(c => (
                              <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9", background: selectedIds.has(c.id) ? "#f0fdf4" : "white", cursor: modo === "masivo" ? "pointer" : "default" }}
                                onClick={() => modo === "masivo" && toggleCitizen(c.id)}>
                                {modo === "masivo" && (
                                  <td style={{ padding: "6px 4px", textAlign: "center" }}>
                                    <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleCitizen(c.id)} />
                                  </td>
                                )}
                                <td style={{ padding: "6px 8px" }}>{c.nombre_completo}</td>
                                <td style={{ padding: "6px 8px", color: c.telefono ? "#22c55e" : "#ef4444" }}>
                                  {c.telefono || "Sin teléfono"}
                                </td>
                                <td style={{ padding: "6px 8px" }}>{c.nombre_lider || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {previewCount > 20 && preview.length === 20 && (
                      <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
                        Mostrando los primeros 20. Usa los filtros para reducir la selección.
                      </p>
                    )}
                  </div>
                )}

                {/* Message form */}
                <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16 }}>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontWeight: 600, fontSize: 13, marginBottom: 6, color: "#374151" }}>
                      Mensaje
                    </label>
                    <textarea
                      value={mensaje}
                      onChange={e => setMensaje(e.target.value)}
                      placeholder="Escribe el mensaje que deseas enviar..."
                      rows={4}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, resize: "vertical" }}
                      maxLength={4096}
                    />
                    <div style={{ textAlign: "right", fontSize: 11, color: mensaje.length > 3000 ? "#ef4444" : "#9ca3af", marginTop: 2 }}>
                      {mensaje.length} / 4096
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
                    {canal === "whatsapp" && (
                      <div>
                        <label style={{ display: "block", fontWeight: 600, fontSize: 13, marginBottom: 6, color: "#374151" }}>
                          Plantilla WhatsApp
                        </label>
                        <input
                          type="text"
                          value={plantilla}
                          onChange={e => setPlantilla(e.target.value)}
                          style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
                          placeholder="alerta_comunitaria"
                        />
                        <p style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 0" }}>
                          Nombre de la plantilla en Meta Business Platform
                        </p>
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontWeight: 600, fontSize: 13, marginBottom: 6, color: "#374151" }}>
                      Programar envío <span style={{ fontWeight: 400, color: "#9ca3af" }}>(opcional)</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={programarFecha}
                      onChange={e => setProgramarFecha(e.target.value)}
                      style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
                    />
                  </div>

                  <button
                    onClick={handleSend}
                    disabled={sending || !mensaje.trim() || (modo === "individual" && !selectedCitizen) || (modo === "masivo" && selectedIds.size === 0)}
                    style={{
                      padding: "10px 28px", border: "none", borderRadius: 6, fontSize: 14,
                      background: sending || !mensaje.trim() || (modo === "individual" && !selectedCitizen) || (modo === "masivo" && selectedIds.size === 0) ? "#94a3b8" : canal === "whatsapp" ? "#25D366" : "#3b82f6",
                      color: "white", fontWeight: 700,
                      cursor: sending || !mensaje.trim() || (modo === "individual" && !selectedCitizen) || (modo === "masivo" && selectedIds.size === 0) ? "not-allowed" : "pointer",
                    }}
                  >
                    {sending ? "Enviando..." : programarFecha ? "📅 Programar envío" : `📤 Enviar por ${titulo}`}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab: History */}
        {activeTab === "historial" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <button onClick={() => loadHistory(historyPage)} style={{ padding: "6px 14px", border: "1px solid #d1d5db", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 13 }}>
                Actualizar
              </button>
            </div>

            {historyLoading ? (
              <p style={{ color: "#6b7280", fontSize: 14 }}>Cargando...</p>
            ) : history.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: 14 }}>No hay envíos registrados</p>
            ) : (
              <>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                      <th style={{ textAlign: "left", padding: "8px 10px" }}>Fecha</th>
                      <th style={{ textAlign: "left", padding: "8px 10px" }}>Canal</th>
                      <th style={{ textAlign: "left", padding: "8px 10px" }}>Mensaje</th>
                      <th style={{ textAlign: "center", padding: "8px 10px" }}>Dest.</th>
                      <th style={{ textAlign: "center", padding: "8px 10px" }}>OK</th>
                      <th style={{ textAlign: "center", padding: "8px 10px" }}>Fallos</th>
                      <th style={{ textAlign: "center", padding: "8px 10px" }}>Estado</th>
                      <th style={{ textAlign: "center", padding: "8px 10px" }}>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(h => (
                      <tr key={h.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                          {new Date(h.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td style={{ padding: "8px 10px" }}>{h.canal}</td>
                        <td style={{ padding: "8px 10px", maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.mensaje}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>{h.destinatarios_count}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center", color: "#22c55e" }}>{h.exitosos_count}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center", color: h.fallidos_count > 0 ? "#ef4444" : "#22c55e" }}>{h.fallidos_count}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>
                          <span style={{ background: getEstadoColor(h.estado), color: "white", padding: "2px 10px", borderRadius: 10, fontSize: 11 }}>
                            {h.estado}
                          </span>
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>
                          <button onClick={() => loadHistoryDetail(h.id)} style={{ border: "none", background: "transparent", color: "#3b82f6", cursor: "pointer", fontSize: 13 }}>Ver</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {totalHistoryPages > 1 && (
                  <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16 }}>
                    {Array.from({ length: totalHistoryPages }, (_, i) => i + 1).map(p => (
                      <button key={p} onClick={() => loadHistory(p)}
                        style={{
                          padding: "4px 10px", borderRadius: 4, fontSize: 12, cursor: "pointer",
                          border: historyPage === p ? "2px solid #3b82f6" : "1px solid #d1d5db",
                          background: historyPage === p ? "#eff6ff" : "white",
                          color: historyPage === p ? "#3b82f6" : "#374151",
                          fontWeight: historyPage === p ? 700 : 400,
                        }}
                      >{p}</button>
                    ))}
                  </div>
                )}

                {selectedHistory && (
                  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
                    onClick={() => setSelectedHistory(null)}>
                    <div style={{ background: "white", borderRadius: 12, padding: 24, maxWidth: 700, width: "90%", maxHeight: "80vh", overflowY: "auto" }}
                      onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: 16 }}>Detalle del envío #{selectedHistory.id}</h3>
                        <button onClick={() => setSelectedHistory(null)} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 20, color: "#6b7280" }}>×</button>
                      </div>
                      <p style={{ fontSize: 14, margin: "0 0 8px" }}><strong>Mensaje:</strong> {selectedHistory.mensaje}</p>
                      <p style={{ fontSize: 14, margin: "0 0 8px" }}><strong>Canal:</strong> {selectedHistory.canal} | <strong>Modo:</strong> {selectedHistory.modo} | <strong>Estado:</strong> {selectedHistory.estado}</p>
                      <p style={{ fontSize: 14, margin: "0 0 16px" }}><strong>Enviado:</strong> {selectedHistory.enviado_en ? new Date(selectedHistory.enviado_en).toLocaleString("es-CO") : "—"}</p>
                      <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>Destinatarios ({historyDetail.length})</h4>
                      {historyDetail.length === 0 ? (
                        <p style={{ fontSize: 13, color: "#6b7280" }}>Cargando...</p>
                      ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <thead>
                            <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                              <th style={{ textAlign: "left", padding: "4px 8px" }}>Nombre</th>
                              <th style={{ textAlign: "left", padding: "4px 8px" }}>Teléfono</th>
                              <th style={{ textAlign: "center", padding: "4px 8px" }}>Estado</th>
                              <th style={{ textAlign: "left", padding: "4px 8px" }}>Error</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historyDetail.map((d: any) => (
                              <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "4px 8px" }}>{d.ciudadano_nombre}</td>
                                <td style={{ padding: "4px 8px" }}>{d.telefono}</td>
                                <td style={{ padding: "4px 8px", textAlign: "center" }}>
                                  <span style={{ color: d.estado === "sent" ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                                    {d.estado === "sent" ? "✅" : "❌"}
                                  </span>
                                </td>
                                <td style={{ padding: "4px 8px", color: "#ef4444", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {d.error_msg || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab: Scheduled */}
        {activeTab === "programados" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <button onClick={loadScheduled} style={{ padding: "6px 14px", border: "1px solid #d1d5db", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 13 }}>
                Actualizar
              </button>
            </div>

            {scheduledLoading ? (
              <p style={{ color: "#6b7280", fontSize: 14 }}>Cargando...</p>
            ) : scheduled.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: 14 }}>No hay envíos programados pendientes</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {scheduled.map(s => (
                  <div key={s.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 16, background: "#f8fafc" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <p style={{ margin: "0 0 4px", fontSize: 13, color: "#6b7280" }}>
                          📅 {new Date(s.programado_para).toLocaleString("es-CO")}
                        </p>
                        <p style={{ margin: "0 0 4px", fontSize: 14 }}>{s.mensaje}</p>
                        <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
                          {s.destinatarios_count} destinatario{s.destinatarios_count !== 1 ? "s" : ""} · {s.canal} · {s.modo}
                        </p>
                      </div>
                      <button onClick={() => cancelScheduled(s.id)}
                        style={{ padding: "6px 14px", border: "1px solid #ef4444", borderRadius: 6, background: "white", color: "#ef4444", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
