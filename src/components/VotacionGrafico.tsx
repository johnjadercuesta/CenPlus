"use client";

import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { ChartWrapper } from "./chart-utils";

const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"];

interface Props {
  tipo?: "seleccion_unica" | "opcion_multiple" | "escala" | "si_no" | "texto_libre";
  data: Record<string, any>;
  total: number;
  chartType: "bar" | "pie" | "doughnut";
  grupos?: Record<string, any>;
  dimensionLabel?: string;
}

export default function VotacionGrafico({ tipo, data, total, chartType, grupos, dimensionLabel }: Props) {
  if (tipo === "texto_libre") return null;

  if (tipo === "escala") {
    const distData = data.distribucion || {};
    const chartData = Object.entries(distData).map(([k, v]) => ({ name: k, value: v as number }));
    return (
      <div className="space-y-4">
        <ChartWrapper filename="escala">
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
            <div className="text-center">
              <div className="text-xs font-bold text-slate-400 uppercase">Promedio</div>
              <div className="text-4xl font-black text-blue-600">{data.promedio}</div>
              <div className="text-xs text-slate-400">de 10</div>
            </div>
            <div className="flex-1 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ChartWrapper>
        {grupos && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(grupos).map(([grupo, g]: [string, any]) => (
              <div key={grupo} className="bg-white border rounded-lg p-3 text-center">
                <div className="text-xs font-bold text-slate-400">{grupo}</div>
                <div className="text-xl font-black text-amber-500">{g.promedio || 0}</div>
                <div className="text-[10px] text-slate-400">{g.total_respuestas || 0} resp.</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (grupos) {
    return <GraficoAgrupado data={data} total={total} chartType={chartType} grupos={grupos} dimensionLabel={dimensionLabel} />;
  }

  const options = Object.keys(data).filter(k => typeof data[k] === "number");
  const chartData = options.map(k => ({ name: k, value: data[k] }));

  if (chartType === "pie" || chartType === "doughnut") {
    return (
      <ChartWrapper filename="grafico">
        <div className="flex justify-center" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={chartType === "doughnut" ? 50 : 0}
                outerRadius={100}
                label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
              >
                {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </ChartWrapper>
    );
  }

  return (
    <ChartWrapper filename="grafico">
      <div style={{ height: Math.max(200, options.length * 42) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 30, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value: any) => [`${value} (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`, "Respuestas"]} />
            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 11, formatter: (v: any) => `${v}` }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  );
}

function GraficoAgrupado({ data, total, chartType, grupos, dimensionLabel }: Props & { grupos: Record<string, any>; dimensionLabel?: string }) {
  const options = Object.keys(data).filter(k => typeof data[k] === "number");
  const groupNames = Object.keys(grupos);

  if (chartType === "pie" || chartType === "doughnut") {
    const totalPorGrupo = groupNames.map(g => ({ name: g, value: grupos[g].total_respuestas || 0 }));
    return (
      <ChartWrapper filename="grupos">
        <div className="flex justify-center" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={totalPorGrupo}
                dataKey="value"
                nameKey="name"
                cx="50%" cy="50%"
                innerRadius={chartType === "doughnut" ? 50 : 0}
                outerRadius={100}
                label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
              >
                {totalPorGrupo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </ChartWrapper>
    );
  }

  const chartData = options.map(opt => {
    const row: any = { name: opt };
    groupNames.forEach(g => {
      row[g] = grupos[g][opt] || 0;
    });
    return row;
  });

  return (
    <ChartWrapper filename="grupos">
      <div style={{ height: Math.max(200, options.length * 50) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {groupNames.map((g, i) => (
              <Bar key={g} dataKey={g} fill={COLORS[i % COLORS.length]} radius={[0, 4, 4, 0]} stackId={undefined} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  );
}
