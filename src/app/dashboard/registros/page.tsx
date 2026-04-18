"use client";

import { useState } from "react";
import TablaCiudadanos from "@/components/TablaCiudadanos";
import ArchivoSelector from "@/components/ArchivoSelector";

export default function RegistrosPage() {
  const [archivoId, setArchivoId] = useState(() => localStorage.getItem("archivoSeleccionado") || "actual");

  return (
    <div>
      <div className="main-header">
        <div>
          <h1 className="main-header-title">Registros</h1>
          <p className="main-header-subtitle">Busque, edite, elimine o exporte los registros</p>
        </div>
        <div style={{ minWidth: 220 }}>
          <ArchivoSelector value={archivoId} onChange={setArchivoId} compact />
        </div>
      </div>
      <div className="main-content">
        <TablaCiudadanos archivoId={archivoId} />
      </div>
    </div>
  );
}
