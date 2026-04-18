const COL_DEPTS_URL = "https://raw.githubusercontent.com/gcorac/colombia-geojson/master/colombia.json";
const COL_MUNICIPIOS_URL = "https://raw.githubusercontent.com/gcorac/colombia-geojson/master/municipios.json";

interface GeoFeature {
  type: "Feature";
  properties: Record<string, any>;
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
}

interface GeoCache {
  departamentos: GeoFeature[] | null;
  municipios: GeoFeature[] | null;
  lastFetch: number;
}

const CACHE_TTL = 30 * 60 * 1000;
const cache: GeoCache = { departamentos: null, municipios: null, lastFetch: 0 };

async function fetchGeoJSON(url: string): Promise<GeoFeature[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const data = await res.json();
  return data.features || [];
}

async function getDepartamentos(): Promise<GeoFeature[]> {
  if (cache.departamentos && Date.now() - cache.lastFetch < CACHE_TTL) {
    return cache.departamentos;
  }
  cache.departamentos = await fetchGeoJSON(COL_DEPTS_URL);
  cache.lastFetch = Date.now();
  return cache.departamentos;
}

async function getMunicipios(): Promise<GeoFeature[]> {
  if (cache.municipios && Date.now() - cache.lastFetch < CACHE_TTL) {
    return cache.municipios;
  }
  cache.municipios = await fetchGeoJSON(COL_MUNICIPIOS_URL);
  cache.lastFetch = Date.now();
  return cache.municipios;
}

function pointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const [lng, lat] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

function pointInMultiPolygon(point: [number, number], coords: number[][][] | number[][][][]): boolean {
  if (coords.length === 0) return false;

  if (typeof coords[0][0][0] === "number") {
    // Polygon: array of rings
    const rings = coords as number[][][];
    // Check outer ring first
    if (rings.length > 0 && pointInPolygon(point, rings[0])) {
      // Check holes
      for (let i = 1; i < rings.length; i++) {
        if (pointInPolygon(point, rings[i])) return false;
      }
      return true;
    }
    return false;
  }

  // MultiPolygon
  const polygons = coords as number[][][][];
  for (const polygon of polygons) {
    if (pointInMultiPolygon(point, polygon as any)) return true;
  }
  return false;
}

export interface GeoLocation {
  pais: string;
  departamento: string | null;
  municipio: string | null;
  confidence: "high" | "medium" | "low";
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeoLocation> {
  const point: [number, number] = [lng, lat];
  let departamento: string | null = null;
  let municipio: string | null = null;

  try {
    const municipios = await getMunicipios();
    for (const feature of municipios) {
      const deptoName = feature.properties.NOMBRE_DPT || feature.properties.DPTO || "";
      const mpioName = feature.properties.NOMBRE_MPIO || feature.properties.MPIO || "";

      if (pointInMultiPolygon(point, feature.geometry.coordinates as any)) {
        departamento = deptoName;
        municipio = mpioName;
        return { pais: "Colombia", departamento, municipio, confidence: "high" };
      }
    }
  } catch (e) {
    console.warn("[geocode] Error fetching municipios:", e);
  }

  try {
    const deptos = await getDepartamentos();
    for (const feature of deptos) {
      const name = feature.properties.NOMBRE_DPT || feature.properties.DPTO || feature.properties.name || "";

      if (pointInMultiPolygon(point, feature.geometry.coordinates as any)) {
        departamento = name;
        return { pais: "Colombia", departamento, municipio: null, confidence: "medium" };
      }
    }
  } catch (e) {
    console.warn("[geocode] Error fetching departamentos:", e);
  }

  return { pais: "Colombia", departamento: null, municipio: null, confidence: "low" };
}
