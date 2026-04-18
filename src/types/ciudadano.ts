export interface Ciudadano {
  id?: number;
  id_unico: string;
  nombre_completo: string;
  telefono: string;
  sexo: "Masculino" | "Femenino" | "Otro";
  edad: number;
  nivel_estudios: "Ninguno" | "Primaria" | "Secundaria" | "Técnico" | "Universitario" | "Posgrado";
  ocupacion: string;
  regimen_salud: "Subsidiado" | "Contributivo" | "Ninguno" | "Otro";
  puesto_votacion: string;
  problematica_principal: string;
  zona: "urbana" | "rural";
  id_comuna: number | null;
  id_barrio: number | null;
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
  role: "administrador" | "estratega" | "lider" | "analista";
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
  regimen_salud: string;
  puesto_votacion: string;
  zona: string;
  id_comuna: string;
  id_barrio: string;
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

// --- Sector types ---

export interface Sector {
  id: number;
  nombre: string;
  votos_historicos?: number;
  meta: number;
  zona: "urbana" | "rural";
  latitud: number;
  longitud: number;
  radio: number;
  poligono: number[][] | null;
  activo: number;
  descripcion?: string;
  registros?: number;
  porcentaje?: number;
  estado?: string;
}

export interface SectorStat extends Sector {
  registros: number;
  porcentaje: number;
  estado: string;
  votosHistoricos?: number;
  brecha?: number;
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
  topRegimenSalud: { regimen_salud: string; c: number }[];
  topProblematicas: { problematica: string; c: number }[];
  porLider: { nombre: string; c: number }[];
  ultimos7dias: { fecha: string; c: number }[];
}

export interface MapaCalorProps {
  ciudadanos: { latitud: number | null; longitud: number | null; es_lider: boolean; problematica_principal?: string }[];
  meta?: number;
}

// --- Territorial Reference Types ---

export interface Comuna {
  id: number;
  nombre: string;
  tipo: "urbana" | "rural";
}

export interface Barrio {
  id: number;
  nombre: string;
  comuna_id: number;
  tipo: "barrio" | "vereda";
}

export interface PuestoVotacion {
  id: number;
  nombre: string;
  comuna_id: number | null;
  votos_historicos: number;
}

export interface ProblematicaSocial {
  id: number;
  nombre: string;
}

export const SEXO_OPTIONS = ["Masculino", "Femenino", "Otro"] as const;
export const NIVEL_ESTUDIOS_OPTIONS = [
  "Ninguno",
  "Primaria",
  "Secundaria",
  "Técnico",
  "Universitario",
  "Posgrado",
] as const;
export const REGIMEN_SALUD_OPTIONS = ["Subsidiado", "Contributivo", "Ninguno", "Otro"] as const;
export const ROLE_OPTIONS = ["administrador", "estratega", "lider", "analista"] as const;

