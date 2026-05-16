import React from "react";
import InteligenciaTerritorial from "@/components/InteligenciaTerritorial";

export default function InteligenciaPage() {
  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-2xl">ðŸ§ </span>
            Inteligencia Territorial
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Monitoreo en tiempo real de tendencias en redes sociales
          </p>
        </div>

        <InteligenciaTerritorial />
      </div>
    </div>
  );
}
