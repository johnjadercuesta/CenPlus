export interface Ciudadano {
  id?: number;
  id_unico: string;
  nombre_completo: string;
  telefono: string;
  sexo: "Masculino" | "Femenino" | "Otro";
  edad: number;
  nivel_estudios: "Ninguno" | "Primaria" | "Secundaria" | "Técnico" | "Universitario" | "Posgrado";
  ocupacion: string;
  barrio: string;
  corregimiento: string;
  vereda: string;
  es_lider: boolean;
  nombre_lider: string;
  lider_id: number | null;
  latitud: number | null;
  longitud: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface Lider {
  id: number;
  email: string;
  nombre: string;
  role: "administrador" | "lider";
  activo: number;
  created_at: string;
}

export interface CiudadanoFormData {
  id_unico: string;
  nombre_completo: string;
  telefono: string;
  sexo: string;
  edad: string;
  nivel_estudios: string;
  ocupacion: string;
  barrio: string;
  corregimiento: string;
  vereda: string;
  es_lider: string;
  nombre_lider: string;
}

export interface GeocodeResult {
  latitud: number | null;
  longitud: number | null;
  display_name?: string;
}

// --- Sector types (used by MapaCalor, GestionSectores, Dashboard) ---

export interface Sector {
  id: number;
  nombre: string;
  meta: number;
  latitud: number;
  longitud: number;
  radio: number;
  poligono: number[][] | null;
  activo: number;
  registros?: number;
  porcentaje?: number;
  estado?: string;
}

export interface SectorStat extends Sector {
  registros: number;
  porcentaje: number;
  estado: string;
}

// --- Dashboard stats ---

export interface Stats {
  total: number;
  lideres: number;
  conCoords: number;
  hoy: number;
  semana: number;
  meta: number;
  porcentajeMeta: number;
  avgEdad: number;
  porEstudios: { nivel_estudios: string; c: number }[];
  porSexo: { sexo: string; c: number }[];
  topBarrios: { barrio: string; c: number }[];
  topCorregimientos: { corregimiento: string; c: number }[];
  topOcupaciones: { ocupacion: string; c: number }[];
  porLider: { nombre: string; c: number }[];
  ultimos7dias: { fecha: string; c: number }[];
}

// --- MapaCalor props ---

export interface MapaCalorProps {
  ciudadanos: { latitud: number | null; longitud: number | null; es_lider: boolean }[];
  meta?: number;
}

// --- Constants ---

export const SEXO_OPTIONS = ["Masculino", "Femenino", "Otro"] as const;
export const NIVEL_ESTUDIOS_OPTIONS = [
  "Ninguno",
  "Primaria",
  "Secundaria",
  "Técnico",
  "Universitario",
  "Posgrado",
] as const;
export const ROLE_OPTIONS = ["administrador", "lider"] as const;
