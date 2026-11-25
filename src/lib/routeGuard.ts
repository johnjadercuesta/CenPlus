/**
 * Route Guard - Control de acceso por módulo.
 *
 * La fuente de verdad es `src/lib/modules.ts`. Este archivo mantiene una API
 * compatible para componentes existentes.
 */

import {
  AccessUser,
  checkRouteAccess as checkModuleAccess,
  getDefaultRoute,
  getEffectiveModuleIds,
  getModuleForPath,
} from "@/lib/modules";

export function checkRouteAccess(
  pathname: string,
  userOrRole: string | AccessUser | undefined,
  diaDLevel?: string
): boolean {
  const user: AccessUser | undefined =
    typeof userOrRole === "string"
      ? { role: userOrRole, dia_d_level: diaDLevel }
      : userOrRole;

  return checkModuleAccess(pathname, user);
}

export function isAdminRoute(pathname: string): boolean {
  const mod = getModuleForPath(pathname);
  return mod ? mod.roles.includes("administrador") && mod.roles.length === 1 : false;
}

export function isPublicRoute(pathname: string, user?: AccessUser): boolean {
  const mod = getModuleForPath(pathname);
  if (!mod) return false;
  if (!user) return true;
  return getEffectiveModuleIds(user).includes(mod.id);
}

export { getDefaultRoute };
