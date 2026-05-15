"use client";

import { useEffect } from "react";

export default function ThemeHandler() {
  useEffect(() => {
    async function loadTheme() {
      try {
        const res = await fetch("/api/tenant/config");
        if (!res.ok) return;
        
        const config = await res.json();
        
        if (config.primary_color) {
          document.documentElement.style.setProperty('--brand-accent', config.primary_color);
          // Generar una versión más clara para hover automáticamente
          document.documentElement.style.setProperty('--primary-glow', `${config.primary_color}33`);
        }
        
        if (config.secondary_color) {
          document.documentElement.style.setProperty('--secondary', config.secondary_color);
        }

        // Si hay un logo personalizado, lo guardamos para que otros componentes lo usen
        if (config.logo_url) {
          window.sessionStorage.setItem('tenant_logo', config.logo_url);
        }
      } catch (error) {
        console.error("Error cargando el tema:", error);
      }
    }

    loadTheme();
  }, []);

  return null; // Este componente no renderiza nada visualmente
}
