/**
 * Route Guard - Control de acceso por rol
 * Define qué rutas requieren rol de administrador o estratega.
 * Nota: las rutas de ADMIN_ROUTES y PUBLIC_ROUTES NO deben solaparse.
 */

export const ADMIN_ROUTES = [
  "/dashboard/tendencias",
  "/dashboard/trendsmap",
  "/dashboard/social-listening",
  "/dashboard/inteligencia",
  "/dashboard/sectores",
  "/dashboard/lideres",
  "/dashboard/configuracion",
  "/dashboard/monitor-x",
  "/dashboard/mensajes",
  "/dashboard/whatsapp",
  "/dashboard/sms",
  "/dashboard/auditoria",
  "/dashboard/votaciones",
];

export const PUBLIC_ROUTES = [
  "/dashboard",
  "/dashboard/formulario",
  "/dashboard/registros",
  "/dashboard/mapa",
];

export function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(route => pathname.startsWith(route));
}

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}

export function checkRouteAccess(pathname: string, userRole: string | undefined): boolean {
  // Sin rol, denegar
  if (!userRole) return false;

  // Admin y estratega tienen acceso a todo
  if (userRole === "administrador" || userRole === "estratega") return true;

  // Usuarios normales (lider, analista) solo rutas públicas
  if (isPublicRoute(pathname)) return true;

  return false;
}
