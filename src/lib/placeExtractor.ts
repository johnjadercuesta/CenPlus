import { reverseGeocode } from "@/lib/reverseGeocode";

export type PlaceExtraction = {
  pais: string | null;
  departamento: string | null;
  municipio: string | null;
  barrio?: string | null;
  comuna?: string | null;
  mentioned_profiles: string[];
  mentioned_sites: string[];
  confidence: "high" | "medium" | "low";
};

export async function extractPlaceAndMentions(text: string, lat?: number, lng?: number): Promise<PlaceExtraction> {
  const profiles: string[] = [];
  const sites: string[] = [];

  if (text) {
    // @handles
    const handleRe = /@([A-Za-z0-9_]{1,64})/g;
    let m;
    while ((m = handleRe.exec(text))) {
      const h = m[1].toLowerCase();
      if (!profiles.includes(h)) profiles.push(h);
    }

    // URLs and domains
    const urlRe = /https?:\/\/[\S]+/g;
    const domainRe = /(?:www\.)?([A-Za-z0-9-]+\.[A-Za-z]{2,6})(?:[\/?\s]|$)/g;

    let um;
    while ((um = urlRe.exec(text))) {
      try {
        const u = new URL(um[0]);
        const host = u.hostname.toLowerCase();
        if (!sites.includes(host)) sites.push(host);
      } catch {}
    }

    let dm;
    while ((dm = domainRe.exec(text))) {
      const host = dm[1].toLowerCase();
      if (!sites.includes(host)) sites.push(host);
    }
  }

  // Barrio / comuna heuristics
  let barrio: string | null = null;
  let comuna: string | null = null;
  if (text) {
    const bRe = /barrio\s+([A-Za-zÁÉÍÓÚáéíóúÑñ0-9\-\s]{3,80})/i;
    const cRe = /comuna\s+([A-Za-z0-9\-\s]{1,8})/i;
    const sb = text.match(bRe);
    const sc = text.match(cRe);
    if (sb && sb[1]) barrio = sb[1].trim();
    if (sc && sc[1]) comuna = sc[1].trim();
  }

  let geo: any = { pais: null, departamento: null, municipio: null, confidence: "low" };
  if (typeof lat === "number" && typeof lng === "number") {
    try {
      geo = await reverseGeocode(lat, lng);
    } catch (e) {
      // ignore
    }
  }

  const confidence: "high" | "medium" | "low" = geo.confidence || (barrio || comuna ? "medium" : "low");

  return {
    pais: geo.pais || null,
    departamento: geo.departamento || null,
    municipio: geo.municipio || null,
    barrio: barrio || null,
    comuna: comuna || null,
    mentioned_profiles: profiles,
    mentioned_sites: sites,
    confidence,
  };
}
