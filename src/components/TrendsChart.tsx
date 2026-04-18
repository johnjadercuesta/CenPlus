'use client';
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TrendsChartProps {
  data: any[];
}

export default function TrendsChart({ data }: TrendsChartProps) {
  // Simular datos históricos para las tendencias actuales si no hay historico real
  const chartData = data.length > 0 ? [
    { time: '08:00', val: data[0].frequency_score * 0.4 },
    { time: '10:00', val: data[0].frequency_score * 0.6 },
    { time: '12:00', val: data[0].frequency_score * 0.5 },
    { time: '14:00', val: data[0].frequency_score * 0.9 },
    { time: '16:00', val: data[0].frequency_score * 0.8 },
    { time: '18:00', val: data[0].frequency_score },
  ] : [];

  return (
    <div className="h-[300px] w-full bg-slate-900/50 p-4 rounded-xl border border-slate-800">
      <h4 className="text-slate-400 text-xs font-semibold uppercase mb-4 tracking-wider">Crecimiento Temporal (Hashtag Principal)</h4>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="#64748b" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            stroke="#64748b" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
            itemStyle={{ color: '#3b82f6' }}
          />
          <Area 
            type="monotone" 
            dataKey="val" 
            stroke="#3b82f6" 
            fillOpacity={1} 
            fill="url(#colorVal)" 
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
