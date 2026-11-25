/**
 * Registro central de módulos y permisos por rol.
 *
 * Un módulo representa una entrada de menú y su funcionalidad asociada.
 * Los roles definen qué módulos pueden ver. Los módulos marcados como
 * readOnly solo permiten consulta. Día D además se controla por nivel
 * (none | testigo | coordinador).
 */

export const ROLES = [
  "administrador",
  "estratega",
  "lider",
  "analista",
  "operador_dia_d",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  administrador: "Administrador",
  estratega: "Estratega",
  lider: "Líder",
  analista: "Analista",
  operador_dia_d: "Operador Día D",
};

export const DIA_D_LEVELS = ["none", "testigo", "coordinador"] as const;
export type DiaDLevel = (typeof DIA_D_LEVELS)[number];

export const DIA_D_LEVEL_LABELS: Record<DiaDLevel, string> = {
  none: "Sin acceso",
  testigo: "Testigo",
  coordinador: "Coordinador",
};

export interface AccessUser {
  role?: string | null;
  dia_d_level?: string | null;
}

export type ModuleId =
  | "dashboard"
  | "mi-panel"
  | "registros"
  | "mapa"
  | "escala"
  | "votaciones"
  | "inteligencia"
  | "dia-d"
  | "mensajeria"
  | "sectores"
  | "candidaturas"
  | "usuarios"
  | "archivos"
  | "auditoria"
  | "configuracion";

export interface ModuleDef {
  id: ModuleId;
  label: string;
  path: string;
  area: string;
  readOnly: boolean;
  roles: Role[];
  aliases?: string[];
  special?: "dia_d_level";
}

export const MODULE_AREAS = [
  "Resumen",
  "Campo",
  "Estrategia",
  "Día D",
  "Comunicaciones",
  "Administración",
] as const;

export const MODULES: ModuleDef[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    area: "Resumen",
    readOnly: true,
    roles: ["administrador", "estratega", "lider", "analista"],
  },
  {
    id: "mi-panel",
    label: "Mi Panel",
    path: "/dashboard/mi-panel",
    area: "Campo",
    readOnly: false,
    roles: ["administrador", "estratega", "lider"],
    aliases: ["/dashboard/formulario"],
  },
  {
    id: "registros",
    label: "Registros",
    path: "/dashboard/registros",
    area: "Campo",
    readOnly: false,
    roles: ["administrador", "estratega", "lider"],
  },
  {
    id: "mapa",
    label: "Mapa Territorial",
    path: "/dashboard/mapa",
    area: "Campo",
    readOnly: true,
    roles: ["administrador", "estratega", "lider", "analista"],
  },
  {
    id: "escala",
    label: "Ámbito Electoral",
    path: "/dashboard/escala",
    area: "Estrategia",
    readOnly: true,
    roles: ["administrador", "estratega", "analista"],
  },
  {
    id: "votaciones",
    label: "Votaciones",
    path: "/dashboard/votaciones",
    area: "Estrategia",
    readOnly: false,
    roles: ["administrador", "estratega"],
  },
  {
    id: "inteligencia",
    label: "Inteligencia Territorial",
    path: "/dashboard/inteligencia",
    area: "Estrategia",
    readOnly: true,
    roles: ["administrador", "estratega", "analista"],
  },
  {
    id: "dia-d",
    label: "Operación Día D",
    path: "/dashboard/dia-d",
    area: "Día D",
    readOnly: false,
    roles: ["administrador", "estratega", "operador_dia_d"],
    special: "dia_d_level",
  },
  {
    id: "mensajeria",
    label: "Mensajería",
    path: "/dashboard/mensajeria",
    area: "Comunicaciones",
    readOnly: false,
    roles: ["administrador", "estratega"],
    aliases: [
      "/dashboard/whatsapp",
      "/dashboard/sms",
      "/dashboard/mensajes",
    ],
  },
  {
    id: "sectores",
    label: "Sectores y Metas",
    path: "/dashboard/sectores",
    area: "Administración",
    readOnly: false,
    roles: ["administrador", "estratega"],
  },
  {
    id: "candidaturas",
    label: "Candidaturas",
    path: "/dashboard/candidatos",
    area: "Administración",
    readOnly: false,
    roles: ["administrador", "estratega"],
  },
  {
    id: "usuarios",
    label: "Usuarios",
    path: "/dashboard/lideres",
    area: "Administración",
    readOnly: false,
    roles: ["administrador"],
  },
  {
    id: "archivos",
    label: "Archivos Electorales",
    path: "/dashboard/archivos",
    area: "Administración",
    readOnly: false,
    roles: ["administrador", "estratega"],
  },
  {
    id: "auditoria",
    label: "Auditoría",
    path: "/dashboard/auditoria",
    area: "Administración",
    readOnly: true,
    roles: ["administrador", "estratega"],
  },
  {
    id: "configuracion",
    label: "Configuración",
    path: "/dashboard/configuracion",
    area: "Administración",
    readOnly: false,
    roles: ["administrador"],
  },
];

export const MODULE_BY_ID: Record<ModuleId, ModuleDef> = MODULES.reduce(
  (acc, m) => {
    acc[m.id] = m;
    return acc;
  },
  {} as Record<ModuleId, ModuleDef>
);

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function normalizeDiaDLevel(value: unknown): DiaDLevel {
  return value === "testigo" || value === "coordinador" ? value : "none";
}

export function diaDLevelRank(level: DiaDLevel): number {
  if (level === "coordinador") return 2;
  if (level === "testigo") return 1;
  return 0;
}

/**
 * Nivel por defecto al asignar un rol:
 * - administrador/estratega: coordinador
 * - operador_dia_d: testigo
 * - otros: conserva el nivel solicitado (o none)
 */
export function resolveDiaDLevelForRole(
  role: Role,
  requested: unknown
): DiaDLevel {
  const level = normalizeDiaDLevel(requested);
  if (level !== "none") return level;
  if (role === "administrador" || role === "estratega") return "coordinador";
  if (role === "operador_dia_d") return "testigo";
  return "none";
}

export function getEffectiveModuleIds(
  user: AccessUser | null | undefined
): ModuleId[] {
  if (!user || !isRole(user.role)) return [];

  const role = user.role;
  const level = normalizeDiaDLevel(user.dia_d_level);

  let ids = MODULES.filter((m) => m.roles.includes(role)).map((m) => m.id);

  if (level !== "none") {
    if (!ids.includes("dia-d")) ids.push("dia-d");
  } else {
    ids = ids.filter((id) => id !== "dia-d");
  }

  if (role === "operador_dia_d") {
    ids = ids.filter((id) => id === "dia-d");
  }

  return Array.from(new Set(ids));
}

export function getModulesForUser(
  user: AccessUser | null | undefined
): ModuleDef[] {
  const ids = getEffectiveModuleIds(user);
  return MODULES.filter((m) => ids.includes(m.id));
}

export function canAccessModule(
  user: AccessUser | null | undefined,
  moduleId: ModuleId
): boolean {
  return getEffectiveModuleIds(user).includes(moduleId);
}

export function canAccessAnyModule(
  user: AccessUser | null | undefined,
  moduleIds: ModuleId[]
): boolean {
  const ids = getEffectiveModuleIds(user);
  return moduleIds.some((id) => ids.includes(id));
}

export function canAccessDiaD(
  user: AccessUser | null | undefined,
  minLevel: "testigo" | "coordinador" = "testigo"
): boolean {
  if (!canAccessModule(user, "dia-d")) return false;
  const level = normalizeDiaDLevel(user?.dia_d_level);
  return diaDLevelRank(level) >= diaDLevelRank(minLevel);
}

export function getReadOnlyModuleIds(
  user: AccessUser | null | undefined
): ModuleId[] {
  return getModulesForUser(user)
    .filter((m) => m.readOnly)
    .map((m) => m.id);
}

export function isReadOnlyModule(moduleId: ModuleId): boolean {
  return MODULE_BY_ID[moduleId]?.readOnly === true;
}

function normalizePath(pathname: string): string {
  const withoutQuery = pathname.split("?")[0].split("#")[0];
  if (!withoutQuery) return "/";
  return withoutQuery.length > 1
    ? withoutQuery.replace(/\/+$/, "")
    : withoutQuery;
}

export function getModuleForPath(pathname: string): ModuleDef | null {
  const clean = normalizePath(pathname);

  for (const m of MODULES) {
    if (m.path === clean) return m;
    if (m.path !== "/dashboard" && clean.startsWith(m.path + "/")) return m;
    if (
      m.aliases?.some(
        (alias) => alias === clean || clean.startsWith(alias + "/")
      )
    ) {
      return m;
    }
  }

  return null;
}

export function checkRouteAccess(
  pathname: string,
  user: AccessUser | null | undefined
): boolean {
  if (!user || !isRole(user.role)) return false;
  const mod = getModuleForPath(pathname);
  if (!mod) return false;
  return canAccessModule(user, mod.id);
}

export function getDefaultRoute(
  user: AccessUser | null | undefined
): string {
  const ids = getEffectiveModuleIds(user);
  if (ids.includes("dashboard")) return "/dashboard";
  const first = MODULES.find((m) => ids.includes(m.id));
  return first ? first.path : "/login";
}

export function getDefaultModuleId(
  user: AccessUser | null | undefined
): ModuleId | null {
  const ids = getEffectiveModuleIds(user);
  if (ids.includes("dashboard")) return "dashboard";
  return ids[0] ?? null;
}
