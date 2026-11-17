"use client";

import { useEffect } from "react";

const GOOGLE_FONTS_BASE = "https://fonts.googleapis.com/css2";

function injectGoogleFont(fontFamily: string) {
  const fontName = fontFamily.replace(/ /g, "+");
  const href = `${GOOGLE_FONTS_BASE}?family=${fontName}:wght@300;400;500;600;700;800&display=swap`;

  // Evitar duplicados
  if (document.querySelector(`link[href="${href}"]`)) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function applyFont(fontFamily: string) {
  if (fontFamily === "Inter") {
    // Inter es el default de Next.js (cargado via layout.tsx)
    document.body.style.fontFamily = "";
  } else {
    injectGoogleFont(fontFamily);
    document.body.style.fontFamily = `'${fontFamily}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  }
}

export default function ThemeHandler() {
  useEffect(() => {
    async function loadTheme() {
      try {
        const res = await fetch("/api/tenant/config");
        if (!res.ok) return;
        
        const config = await res.json();
        const doc = document.documentElement;

        if (config.primary_color) {
          doc.style.setProperty('--brand-accent', config.primary_color);
          doc.style.setProperty('--brand', config.primary_color);
          doc.style.setProperty('--primary-glow', `${config.primary_color}33`);
        }

        if (config.secondary_color) {
          doc.style.setProperty('--secondary', config.secondary_color);
        }

        if (config.font_family) {
          applyFont(config.font_family);
        }

        if (config.logo_url) {
          window.sessionStorage.setItem('tenant_logo', config.logo_url);
        }

        // Apply extended style config from config JSONB
        const style = config.config || {};
        if (style.surface_bg) doc.style.setProperty('--surface', style.surface_bg);
        if (style.card_bg) doc.style.setProperty('--card', style.card_bg);
        if (style.border_color) doc.style.setProperty('--border', style.border_color);
        if (style.text_primary) doc.style.setProperty('--text-primary', style.text_primary);
        if (style.text_secondary) doc.style.setProperty('--text-secondary', style.text_secondary);
        if (style.border_radius !== undefined) {
          doc.style.setProperty('--radius', `${style.border_radius}px`);
        }
      } catch (error) {
        console.error("Error cargando el tema:", error);
      }
    }

    loadTheme();
  }, []);

  return null;
}
