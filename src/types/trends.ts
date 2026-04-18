export const PLATFORMS = [
  { id: "x", name: "X (Twitter)", color: "#14171A", icon: "𝕏", metricType: "Velocity of Retweets" },
  { id: "tiktok", name: "TikTok", color: "#00f2fe", icon: "♪", metricType: "Sound & Filter adoption" },
  { id: "instagram", name: "Instagram", color: "#E1306C", icon: "📷", metricType: "Save & Share rate" },
  { id: "youtube", name: "YouTube", color: "#FF0000", icon: "▶", metricType: "View velocity per hour" },
  { id: "facebook", name: "Facebook", color: "#1877F2", icon: "f", metricType: "Reactions & Shares" },
  { id: "linkedin", name: "LinkedIn", color: "#0A66C2", icon: "in", metricType: "Comment depth" },
  { id: "gtrends", name: "Google Trends", color: "#F4B400", icon: "G", metricType: "Search Volume Growth" },
] as const;

export type PlatformId = (typeof PLATFORMS)[number]["id"];
export type PlatformName = (typeof PLATFORMS)[number]["name"];

export interface TrendRecord {
  id: string;
  topic: string;
  currentTopic?: string;
  platform: PlatformName;
  platformName?: string;
  platformId: PlatformId;
  platformIcon?: string;
  color: string;
  heatIndex: number;
  sentiment: number;
  sentimentLabel: "positivo" | "neutral" | "negativo";
  volume: number;
  velocity: number;
  mentions: number;
  shares: number;
  replies: number;
  growth1h: number;
  uniqueAuthors: number;
  hashtagCount: number;
  latitude: number;
  longitude: number;
  pais: string;
  departamento: string;
  ciudad: string;
  timestamp: string;
  history?: { time: string; heat: number }[];
  metricType?: string;
}

export interface CityTrend {
  ciudad: string;
  departamento: string;
  platform: string;
  trendCount: number;
  avgHeat: number;
  maxHeat: number;
  avgSentiment: number;
  totalVolume: number;
  avgVelocity: number;
  topTopic: string;
  centerLat: number;
  centerLng: number;
}

export interface TopicAnalysis {
  topic: string;
  category: string;
  sentiment: number;
  sentimentLabel: "positive" | "negative" | "neutral";
  frequency: number;
  summary: string;
  relatedWords: string[];
  hashtags: string[];
  heatIndex: number;
  volume: number;
}

export interface AgitatorData {
  id: number;
  name: string;
  handle: string;
  platformId: PlatformId;
  platformName: PlatformName;
  impact: number;
  ratio: number;
}

export interface MonitorAlert {
  id: string;
  type: string;
  platformId: string;
  platformName: string;
  topic: string;
  intensity: number;
  location: string;
  timestamp: string;
}

export interface Summary {
  totalTrends: number;
  totalMentions: number;
  totalShares: number;
  totalReplies: number;
  totalEngagement: number;
  avgHeat: number;
  avgSentiment: number;
  citiesTracked: number;
  topicsTracked: number;
  positivePct: number;
  neutralPct: number;
  negativePct: number;
  byPlatform: Record<string, { count: number; avgHeat: number; totalVolume: number }>;
}

export interface GeoTrendsResult {
  topics: TopicAnalysis[];
  overallSentiment: number;
  overallSentimentLabel: string;
  totalTweets: number;
  topHashtags: string[];
  topKeywords: string[];
  categoryBreakdown: Record<string, number>;
  municipio?: string | null;
  departamento?: string | null;
  message?: string;
  scrapedTweets?: Array<{ text: string; author: string; likes: number }>;
}

export interface LogEntry {
  id: number;
  msg: string;
  type: "system" | "signal" | "alert";
  time: string;
}

export interface HistoryPoint {
  time: string;
  heat: number;
  mentions: number;
  sentiment: number;
}

export const CATEGORY_COLORS: Record<string, string> = {
  Seguridad: "#ef4444",
  Salud: "#10b981",
  Servicios: "#f59e0b",
  Política: "#8b5cf6",
  Economía: "#06b6d4",
  Social: "#ec4899",
  Educación: "#3b82f6",
  "Medio Ambiente": "#22c55e",
  Deportes: "#f97316",
  Cultura: "#a855f7",
  Infraestructura: "#6366f1",
  Ambiente: "#22c55e",
  Urbanismo: "#84cc16",
  Tecnologia: "#0ea5e9",
  General: "#6b7280",
};

export function getHeatColor(heat: number): string {
  if (heat > 80) return "#ef4444";
  if (heat > 60) return "#f59e0b";
  if (heat > 40) return "#eab308";
  return "#10b981";
}

export function getHeatLabel(heat: number): string {
  if (heat > 80) return "Crítico";
  if (heat > 70) return "Alto";
  if (heat > 60) return "Elevado";
  if (heat > 50) return "Medio";
  if (heat > 40) return "Moderado";
  if (heat > 30) return "Bajo";
  return "Mínimo";
}

export function getSentimentInfo(sentiment: number): { label: string; color: string } {
  if (sentiment > 2) return { label: "Muy Positivo", color: "#10b981" };
  if (sentiment > 0.5) return { label: "Positivo", color: "#22c55e" };
  if (sentiment > -0.5) return { label: "Neutral", color: "#64748b" };
  if (sentiment > -2) return { label: "Negativo", color: "#f97316" };
  return { label: "Muy Negativo", color: "#ef4444" };
}
