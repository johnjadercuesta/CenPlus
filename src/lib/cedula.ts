/**
 * Extracción de datos de la cédula de ciudadanía colombiana.
 *
 * Estrategia principal: leer el código de barras PDF417 del reverso de la
 * cédula (lectura exacta, sin OCR). Si no se detecta el código, se usa OCR
 * sobre el frente como respaldo.
 */

export interface CedulaData {
  cedula: string;
  nombre: string;
  sexo: string;
  fechaNacimiento: Date | null;
  edad: number | null;
  bloodType?: string;
  departamento?: string;
  municipio?: string;
  source: "pdf417" | "ocr";
}

export interface Pdf417Payload {
  bytes: Uint8Array;
  text: string;
}

const PDF417_MARKER = "PubDSK_";

function latin1(bytes: Uint8Array, start = 0, end = bytes.length): string {
  let out = "";
  for (let i = start; i < end; i++) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}

function containsAscii(bytes: Uint8Array, value: string): boolean {
  if (value.length === 0 || bytes.length < value.length) return false;
  outer: for (let i = 0; i <= bytes.length - value.length; i++) {
    for (let j = 0; j < value.length; j++) {
      if (bytes[i + j] !== value.charCodeAt(j)) continue outer;
    }
    return true;
  }
  return false;
}

function collapseNulls(bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(bytes.length);
  let length = 0;
  let previousWasNull = false;

  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte === 0 && previousWasNull) continue;
    out[length++] = byte;
    previousWasNull = byte === 0;
  }

  return out.subarray(0, length);
}

function splitByNull(bytes: Uint8Array): Uint8Array[] {
  const parts: Uint8Array[] = [];
  let start = 0;

  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0) {
      parts.push(bytes.subarray(start, i));
      start = i + 1;
    }
  }

  parts.push(bytes.subarray(start));
  return parts;
}

function cleanField(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f-\u009f\ufffd]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanName(value: string): string {
  return value
    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function normalizeCedula(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length < 6 || digits.length > 11) return "";
  return digits.replace(/^0+(?=\d)/, "");
}

function buildDate(year: string, month: string, day: string): Date | null {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  if (!y || !m || !d) return null;
  if (y < 1900 || y > new Date().getFullYear()) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;

  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }
  return date;
}

export function calculateAge(date: Date | null): number | null {
  if (!date) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }
  return age >= 0 && age <= 149 ? age : null;
}

function genderLabel(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (normalized.startsWith("F") || normalized === "FEMENINO") return "Femenino";
  if (normalized.startsWith("M") || normalized === "MASCULINO") return "Masculino";
  return "";
}

/**
 * Parsea el contenido binario del PDF417 de una cédula colombiana tradicional.
 * El layout de bytes está documentado en las librerías comunitarias
 * colombian-cedula-reader / pdf417-cedula-reader.
 */
export function parseCedulaPdf417(payload: Pdf417Payload | null): CedulaData | null {
  if (!payload) return null;

  const fromBytes = parseCedulaPdf417Bytes(payload.bytes);
  if (fromBytes) return fromBytes;

  return parseCedulaPdf417Text(payload.text);
}

export function parseCedulaPdf417Bytes(raw: Uint8Array): CedulaData | null {
  if (!raw || raw.length < 20 || !containsAscii(raw, PDF417_MARKER)) return null;

  const fields = splitByNull(collapseNulls(raw));
  if (fields.length < 5) return null;

  // Campo 0: 2 bytes de control + código AFIS (8 dígitos).
  const afis = cleanField(latin1(fields[0])).slice(2);
  const fingerCard = cleanField(latin1(fields[2])).slice(0, 8);

  let docNumber = "";
  let lastName1 = "";

  if (fields[2].length > 8) {
    const field2 = cleanField(latin1(fields[2]));
    docNumber = onlyDigits(field2.slice(10, 18));
    lastName1 = cleanName(field2.slice(18));
  } else {
    // Algunas cédulas incluyen un campo vacío adicional: se descarta.
    fields.splice(0, 1);
    if (fields.length < 6) return null;
    const field2 = cleanField(latin1(fields[2]));
    docNumber = onlyDigits(field2.slice(0, 10));
    lastName1 = cleanName(field2.slice(10));
  }

  const lastName2 = cleanName(cleanField(latin1(fields[3])));
  const firstName1 = cleanName(cleanField(latin1(fields[4])));
  const rawMiddleName = cleanField(latin1(fields[5] ?? new Uint8Array(0)));
  let middleName = cleanName(rawMiddleName);

  // Si no hay segundo nombre, el campo 5 contiene la información de
  // nacimiento (termina en "+" o "-"). Se inserta un campo vacío para
  // alinear los índices, igual que en el decodificador de referencia.
  if (rawMiddleName.endsWith("-") || rawMiddleName.endsWith("+")) {
    middleName = "";
    fields.splice(5, 0, new Uint8Array(0));
  }

  const info = cleanField(latin1(fields[6] ?? new Uint8Array(0)));
  const gender = info.slice(1, 2);
  const birthDate = buildDate(info.slice(2, 6), info.slice(6, 8), info.slice(8, 10));
  const municipalityCode = info.slice(10, 12);
  const departmentCode = info.slice(12, 15);
  const bloodType = info.slice(16, 18);

  const cedula = normalizeCedula(docNumber);
  const nombre = [firstName1, middleName, lastName1, lastName2]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!cedula && !nombre) return null;

  return {
    cedula,
    nombre: nombre || cleanName(`${firstName1} ${lastName1} ${lastName2}`),
    sexo: genderLabel(gender),
    fechaNacimiento: birthDate,
    edad: calculateAge(birthDate),
    bloodType: bloodType || undefined,
    departamento: departmentCode || undefined,
    municipio: municipalityCode || undefined,
    source: "pdf417",
  };
}

/**
 * Respaldo cuando el lector entrega texto y se perdieron los separadores
 * binarios. Es menos preciso, pero recupera cédula, sexo y fecha.
 */
export function parseCedulaPdf417Text(text: string): CedulaData | null {
  if (!text || !text.includes(PDF417_MARKER)) return null;

  const normalized = text
    .replace(/[^\x20-\x7e\u00a0-\u00ff]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const markerIndex = normalized.indexOf(PDF417_MARKER);
  const afterMarker = normalized.slice(markerIndex + PDF417_MARKER.length).trim();

  const birthPattern = /([0-9])([MF])(\d{8})(\d{2})(\d{3})([0-9])((?:AB|A|B|O)[+-])/g;
  let birthMatch: RegExpExecArray | null = null;
  let candidate: RegExpExecArray | null;
  while ((candidate = birthPattern.exec(afterMarker)) !== null) {
    birthMatch = candidate;
  }

  const numbers = Array.from(afterMarker.matchAll(/\d{6,11}/g)).map((m) => m[0]);
  const docNumber = numbers.find((value) => value.length === 10) || numbers[0] || "";

  const birthDate = birthMatch
    ? buildDate(
        birthMatch[3].slice(0, 4),
        birthMatch[3].slice(4, 6),
        birthMatch[3].slice(6, 8)
      )
    : null;

  const nameBlob = afterMarker
    .replace(/\d+/g, " ")
    .replace(new RegExp(PDF417_MARKER.replace("_", "\\_"), "g"), " ")
    .replace(/\b(AB|A|B|O)[+-]\b/g, " ")
    .replace(/\b[MF]\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const nombre = cleanName(nameBlob);
  const cedula = normalizeCedula(docNumber);

  if (!cedula && !nombre) return null;

  return {
    cedula,
    nombre,
    sexo: birthMatch ? genderLabel(birthMatch[2]) : "",
    fechaNacimiento: birthDate,
    edad: calculateAge(birthDate),
    source: "pdf417",
  };
}

/* ------------------------------------------------------------------ */
/* OCR (frente de la cédula)                                          */
/* ------------------------------------------------------------------ */

const SCAN_LABEL_PATTERN =
  /\b(APELLIDOS?|NOMBRES?|SEXO|FECHA|NACIMIENTO|NACIDO|LUGAR|EXPEDICION|EXPEDICI[OÓ]N|ESTATURA|NUIP|NUMERO|N[UÚ]MERO|CEDULA|C[EÉ]DULA|IDENTIFICACION|IDENTIFICACI[OÓ]N|REPUBLICA|REP[UÚ]BLICA|FIRMA|HUELLA|REGISTRO|PRIMER|SEGUNDO)\b/i;

const MONTHS: Record<string, number> = {
  ENE: 0, ENERO: 0, FEB: 1, FEBRERO: 1, MAR: 2, MARZO: 2, ABR: 3, ABRIL: 3,
  MAY: 4, MAYO: 4, JUN: 5, JUNIO: 5, JUL: 6, JULIO: 6, AGO: 7, AGOSTO: 7,
  SEP: 8, SEPT: 8, SEPTIEMBRE: 8, OCT: 9, OCTUBRE: 9, NOV: 10, NOVIEMBRE: 10,
  DIC: 11, DICIEMBRE: 11,
};

function isNameLine(value: string): boolean {
  if (!value || /\d/.test(value)) return false;
  if (SCAN_LABEL_PATTERN.test(value)) return false;
  return /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{3,}/.test(cleanName(value));
}

function extractCedula(text: string): string {
  const lines = text.split(/\r?\n/);
  const contextual: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/\b(NUIP|N[UÚ]MERO|CEDULA|C[EÉ]DULA|IDENTIFICACION|IDENTIFICACI[OÓ]N)\b/i.test(line)) {
      continue;
    }

    const sameLine = onlyDigits(
      line.replace(/.*?(NUIP|N[UÚ]MERO|CEDULA|C[EÉ]DULA|IDENTIFICACION|IDENTIFICACI[OÓ]N)/i, "")
    );
    if (sameLine.length >= 6 && sameLine.length <= 11) contextual.push(sameLine);

    const nextLine = lines[i + 1] ? onlyDigits(lines[i + 1]) : "";
    if (nextLine.length >= 6 && nextLine.length <= 11) contextual.push(nextLine);
  }

  const separated = Array.from(text.matchAll(/\d[\d.\s-]{4,}\d/g))
    .map((match) => onlyDigits(match[0]))
    .filter((value) => value.length >= 6 && value.length <= 11);

  const candidates = [...contextual, ...separated];
  const preferred = candidates.find((value) => value.length >= 8 && value.length <= 10);
  return normalizeCedula(preferred || candidates[0] || "");
}

function takeValueAfterLabel(lines: string[], startIndex: number, label: RegExp): string {
  const parts: string[] = [];
  const remainder = lines[startIndex].replace(label, " ");
  const nextLabelIndex = remainder.search(SCAN_LABEL_PATTERN);
  const first = (nextLabelIndex >= 0 ? remainder.slice(0, nextLabelIndex) : remainder)
    .replace(/^[:\s-]+/, "");
  if (first && isNameLine(first)) parts.push(first);

  for (let i = startIndex + 1; i < lines.length && parts.length < 2; i++) {
    const line = lines[i];
    if (!line) continue;
    if (SCAN_LABEL_PATTERN.test(line)) break;
    if (!isNameLine(line)) break;
    parts.push(line);
  }

  return cleanName(parts.join(" "));
}

function extractNames(text: string): string {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  const primerApellido = lines.findIndex((line) => /\bPRIMER\s+APELLIDO\b/i.test(line));
  const segundoApellido = lines.findIndex((line) => /\bSEGUNDO\s+APELLIDO\b/i.test(line));

  if (primerApellido >= 0 || segundoApellido >= 0) {
    const apellidos = [
      primerApellido >= 0
        ? takeValueAfterLabel(lines, primerApellido, /.*?\bPRIMER\s+APELLIDO\b/i)
        : "",
      segundoApellido >= 0
        ? takeValueAfterLabel(lines, segundoApellido, /.*?\bSEGUNDO\s+APELLIDO\b/i)
        : "",
    ]
      .filter(Boolean)
      .join(" ");
    const nombresIndex = lines.findIndex((line) => /\bNOMBRES?\b/i.test(line));
    const nombres =
      nombresIndex >= 0
        ? takeValueAfterLabel(lines, nombresIndex, /.*?\bNOMBRES?\b/i)
        : "";
    const full = cleanName(`${nombres} ${apellidos}`);
    if (full) return full;
  }

  const apellidosIndex = lines.findIndex((line) => /\bAPELLIDOS?\b/i.test(line));
  const nombresIndex = lines.findIndex((line) => /\bNOMBRES?\b/i.test(line));

  const apellidos =
    apellidosIndex >= 0
      ? takeValueAfterLabel(lines, apellidosIndex, /.*?\bAPELLIDOS?\b/i)
      : "";
  const nombres =
    nombresIndex >= 0
      ? takeValueAfterLabel(lines, nombresIndex, /.*?\bNOMBRES?\b/i)
      : "";

  if (apellidos && nombres && apellidos !== nombres) return `${nombres} ${apellidos}`.trim();
  if (apellidos || nombres) return apellidos || nombres;

  const fallback = lines.find((line) => isNameLine(line) && line.split(/\s+/).length >= 2);
  return fallback ? cleanName(fallback) : "";
}

function findDate(value: string): { date: Date; edad: number } | null {
  const datePattern =
    /(\d{1,2})\s*[-/.\s]\s*([A-Za-zÁÉÍÓÚáéíóú]{3,10}|\d{1,2})\s*[-/.\s]\s*(\d{1,3}(?:\.\d{3})?|\d{2,4})/g;
  let match: RegExpExecArray | null;

  while ((match = datePattern.exec(value)) !== null) {
    const day = parseInt(match[1], 10);
    const monthToken = match[2].toUpperCase();
    const month = /^\d+$/.test(monthToken)
      ? parseInt(monthToken, 10) - 1
      : MONTHS[monthToken.slice(0, 4)] ?? MONTHS[monthToken.slice(0, 3)];
    let year = parseInt(onlyDigits(match[3]), 10);

    if (Number.isNaN(month) || month < 0 || month > 11) continue;
    if (year < 100) year += year > 30 ? 1900 : 2000;
    if (day < 1 || day > 31) continue;
    if (year < 1900 || year > new Date().getFullYear()) continue;

    const date = new Date(year, month, day);
    if (date.getDate() !== day || date.getMonth() !== month) continue;

    const edad = calculateAge(date);
    if (edad === null) continue;
    return { date, edad };
  }

  return null;
}

function extractBirthDate(text: string): { date: Date | null; edad: number | null } {
  const lines = text.split(/\r?\n/);
  const contextIndex = lines.findIndex((line) => /\b(NACIMIENTO|NACIDO|NAC\.?)\b/i.test(line));

  if (contextIndex >= 0) {
    const windowText = lines.slice(contextIndex, contextIndex + 3).join(" ");
    const parsed = findDate(windowText);
    if (parsed) return { date: parsed.date, edad: parsed.edad };
  }

  const parsed = findDate(text);
  return { date: parsed ? parsed.date : null, edad: parsed ? parsed.edad : null };
}

function extractSexo(text: string): string {
  const normalized = text.toUpperCase();
  const match = normalized.match(/SEX[O0][^A-Z0-9]{0,4}([MF])\b/);
  if (match) return match[1] === "F" ? "Femenino" : "Masculino";
  if (/\bFEMENINO\b/.test(normalized)) return "Femenino";
  if (/\bMASCULINO\b/.test(normalized)) return "Masculino";
  return "";
}

export function parseCedulaText(text: string): CedulaData {
  const { date, edad } = extractBirthDate(text);
  return {
    cedula: extractCedula(text),
    nombre: extractNames(text),
    sexo: extractSexo(text),
    fechaNacimiento: date,
    edad,
    source: "ocr",
  };
}

export function hasCedulaData(data: CedulaData | null): boolean {
  return Boolean(data && (data.cedula || data.nombre));
}
