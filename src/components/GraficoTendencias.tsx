'use client';
import React, { useEffect, useRef } from 'react';

interface Trend {
  keyword: string;
  platform: string;
  frequency_score: number;
  sentiment: number;
  growth_rate: number;
  location?: {
    city: string;
  };
}

interface GraficoTendenciasProps {
  data: Trend[];
}

export default function GraficoTendencias({ data = [] }: GraficoTendenciasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const barWidth = chartWidth / data.length - 8;
    const maxScore = Math.max(...data.map(d => d.frequency_score), 1);

    // Fondo
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Título
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Frecuencia por Tendencia', canvas.width / 2, 20);

    // Ejes
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    
    // Eje Y
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.stroke();

    // Eje X
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    // Líneas degrid
    ctx.strokeStyle = '#1e293b';
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();
      
      // Etiquetas Y
      const value = Math.round(maxScore - (maxScore / 5) * i);
      ctx.fillStyle = '#64748b';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(value.toString(), padding - 5, y + 4);
    }

    // Barras
    data.forEach((trend, i) => {
      const x = padding + i * (chartWidth / data.length) + 4;
      const barHeight = (trend.frequency_score / maxScore) * chartHeight;
      const y = canvas.height - padding - barHeight;

      // Color según sentimiento
      if (trend.sentiment > 0.1) {
        ctx.fillStyle = '#22c55e';
      } else if (trend.sentiment < -0.1) {
        ctx.fillStyle = '#ef4444';
      } else {
        ctx.fillStyle = '#3b82f6';
      }

      // Barra
      ctx.fillRect(x, y, barWidth - 4, barHeight);

      // Etiqueta
      ctx.fillStyle = '#94a3b8';
      ctx.font = '8px system-ui';
      ctx.textAlign = 'center';
      const label = trend.keyword.length > 12 ? trend.keyword.slice(0, 12) + '...' : trend.keyword;
      ctx.fillText(label, x + (barWidth - 4) / 2, canvas.height - padding + 15);
    });

    // Leyenda
    const legendY = canvas.height - 15;
    ctx.font = '9px system-ui';
    
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(padding + 10, legendY, 8, 8);
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText('Positivo', padding + 22, legendY + 7);

    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(padding + 80, legendY, 8, 8);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Neutral', padding + 92, legendY + 7);

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(padding + 150, legendY, 8, 8);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Negativo', padding + 162, legendY + 7);

  }, [data]);

  if (!data.length) {
    return (
      <div className="h-[300px] flex items-center justify-center text-slate-500">
        No hay datos disponibles
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={300}
      className="w-full h-[300px]"
    />
  );
}