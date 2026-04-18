/**
 * Route Guard - Control de acceso por rol
 * Define qué rutas requieren rol de administrador
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
  // Si no hay rol, denegar acceso
  if (!userRole) return false;

  // Admin tiene acceso a todo
  if (userRole === "administrador") return true;

  // Usuarios normales solo pueden acceder a rutas públicas
  if (isPublicRoute(pathname)) return true;

  // Todo lo demás está restringido
  return false;
}
