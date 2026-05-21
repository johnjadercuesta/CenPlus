const POSITIVE_SPANISH = [
  "bueno", "excelente", "genial", "fantástico", "maravilloso", "increíble",
  "feliz", "contento", "alegría", "hermoso", "bien", "mejor", "positivo",
  "progreso", "avance", "desarrollo", "crecimiento", "mejora", "éxito", "logro",
  "seguridad", "paz", "tranquilidad", "esperanza", "solidaridad", "unión",
  "gracias", "agradecido", "bendición", "salud", "educación", "oportunidad",
  "empleo", "trabajo", "prosperidad", "beneficio", "calidad", "eficiente",
  "innovación", "solución", "apoyo", "ayuda", "reconocimiento", "triunfo",
  "victoria", "avance", "celebramos", "orgullo", "compromiso", "responsabilidad",
  "transparente", "justicia", "libertad", "derecho", "participación", "incluyente",
  "sostenible", "verde", "ecológico", "limpio", "renovable", "reciclaje"
];

const NEGATIVE_SPANISH = [
  "malo", "terrible", "horrible", "pésimo", "deplorable", "desastroso",
  "triste", "deprimente", "dolor", "sufrimiento", "crisis", "problema",
  "peor", "negativo", "fracaso", "corrupción", "inseguridad", "violencia",
  "delincuencia", "crimen", "asesinato", "robo", "hurto", "extorsión",
  "secuestro", "amenaza", "peligro", "riesgo", "desempleo", "inflación",
  "pobreza", "hambre", "desigualdad", "injusticia", "abuso", "discriminación",
  "enfermedad", "pandemia", "contaminación", "destrucción", "desastre",
  "muerto", "herido", "víctima", "daño", "perdida", "emergencia", "alerta",
  "preocupación", "temor", "miedo", "incertidumbre", "caos", "desorden",
  "conflicto", "guerra", "ataque", "violación", "escándalo", "denuncia",
  "reclamo", "queja", "insatisfacción", "deficiente", "fracaso", "colapso"
];

export function analyzeSpanishSentiment(text: string): { score: number; label: string } {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  let score = 0;
  let positiveCount = 0;
  let negativeCount = 0;

  for (const word of words) {
    if (POSITIVE_SPANISH.includes(word)) {
      score += 1;
      positiveCount++;
    } else if (NEGATIVE_SPANISH.includes(word)) {
      score -= 1;
      negativeCount++;
    }
  }

  const total = words.length || 1;
  const normalized = score / Math.sqrt(total);

  let label = "neutral";
  if (normalized > 0.15) label = "positivo";
  else if (normalized > 0.05) label = "levemente_positivo";
  else if (normalized < -0.15) label = "negativo";
  else if (normalized < -0.05) label = "levemente_negativo";

  return { score: parseFloat(normalized.toFixed(4)), label };
}

export function extractKeywords(text: string, maxKeywords: number = 5): string[] {
  const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
  const stopwords = new Set([
    "que", "para", "como", "esto", "pero", "este", "hace", "sido", "esta",
    "muy", "con", "por", "los", "las", "del", "una", "sus", "más", "han",
    "entre", "sobre", "cada", "tiene", "ello", "ante", "sean", "dicho",
    "todo", "parte", "solo", "forma", "largo", "través", "contra", "nunca",
    "quien", "cual", "donde", "cuando", "tanto", "menos", "poco", "hacia",
    "dentro", "fuera", "según", "además", "también", "ello", "cual", "cuan"
  ]);

  const keywords: string[] = [];
  const seen = new Set<string>();

  for (const word of words) {
    if (!stopwords.has(word) && !seen.has(word)) {
      seen.add(word);
      keywords.push(word);
      if (keywords.length >= maxKeywords) break;
    }
  }

  return keywords;
}

export function calculateHeatIndex(
  sentimentScore: number,
  frequency: number,
  growthRate: number = 0
): number {
  const sentimentFactor = Math.abs(sentimentScore) * 20;
  const frequencyFactor = Math.min(frequency / 10, 50);
  const growthFactor = Math.min(growthRate, 30);
  return Math.min(sentimentFactor + frequencyFactor + growthFactor, 100);
}
