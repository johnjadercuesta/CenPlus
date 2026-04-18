// src/lib/geoData.ts

export interface Barrio {
  id: number;
  nombre: string;
}

export interface Comuna {
  id: number;
  nombre: string;
  barrios: Barrio[];
}

export const COMUNAS: Comuna[] = [
  {
    id: 1,
    nombre: "Comuna 1 - Popular",
    barrios: [
      { id: 101, nombre: "Santo Domingo" },
      { id: 102, nombre: "Popular" },
      { id: 103, nombre: "Granizal" },
    ],
  },
  {
    id: 2,
    nombre: "Comuna 2 - Santa Cruz",
    barrios: [
      { id: 201, nombre: "Santa Cruz" },
      { id: 202, nombre: "La Isla" },
      { id: 203, nombre: "Playón de los Comuneros" },
    ],
  },
  {
    id: 3,
    nombre: "Comuna 3 - Manrique",
    barrios: [
      { id: 301, nombre: "Manrique Central" },
      { id: 302, nombre: "El Raizal" },
      { id: 303, nombre: "Versalles" },
    ],
  },
  {
    id: 4,
    nombre: "Comuna 4 - Aranjuez",
    barrios: [
      { id: 401, nombre: "Aranjuez" },
      { id: 402, nombre: "Berlín" },
      { id: 403, nombre: "San Cayetano" },
    ],
  },
  // Se pueden agregar más según la división oficial
];

export const CORREGIMIENTOS = [
  "San Sebastián de Palmitas",
  "San Cristóbal",
  "Altavista",
  "San Antonio de Prado",
  "Santa Elena",
];

export const PUESTOS_VOTACION = [
  "Institución Educativa Técnica",
  "Parroquia San Judas",
  "Polideportivo Municipal",
  "Cárcel de Mujeres",
  "Casa de la Cultura",
];
