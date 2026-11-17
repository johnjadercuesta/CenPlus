"use client";

import { useRef, type ReactNode } from "react";

export function downloadChartAsPNG(el: HTMLElement | null, filename: string) {
  if (!el) return;
  const svg = el.querySelector("svg");
  if (!svg) return;
  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx!.drawImage(img, 0, 0);
    const link = document.createElement("a");
    link.download = filename.replace(/[^a-zA-Z0-9_\-]/g, "_") + ".png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
  img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
}

export function ChartWrapper({ children, filename }: { children: ReactNode; filename: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div>
      <div ref={ref}>{children}</div>
      <button onClick={() => downloadChartAsPNG(ref.current, filename)} className="text-xs text-blue-600 hover:text-blue-800 underline mt-1" title="Descargar como PNG">Descargar PNG</button>
    </div>
  );
}
