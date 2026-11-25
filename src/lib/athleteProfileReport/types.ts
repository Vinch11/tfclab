/**
 * Rapport Profil Athlète — types d'entrée du builder HTML.
 *
 * Le builder est PUR : il ne calcule aucune physiologie, il met en page des
 * données déjà résolues par les moteurs (diagnostic, limiteurs, zones, roadmap).
 */

export type MetricStatus = "ok" | "warn" | "bad" | "missing";

export interface ReportMetric {
  key: string;
  label: string;
  /** null / 0 ⇒ "Données insuffisantes" (politique TFCL : jamais de valeur inventée). */
  value: number | null;
  unit: string;
  decimals?: number;
  /** Bornes de l'échelle de la jauge. */
  scale?: [number, number];
  /** Zone cible affichée en vert sur la jauge. */
  target?: [number, number];
  status: MetricStatus;
  /** Une phrase : ce que ça veut dire concrètement. */
  meaning: string;
  /** Origine de la donnée (mesurée, estimée, records…). */
  source?: string | null;
  /** 0–1 */
  confidence?: number | null;
}

export interface ReportRadarAxis {
  source?: string;
  label: string;
  shortLabel: string;
  score: number; // 0-100
  value: number | null;
  target: number | null;
  unit: string;
}

export interface ReportLimiter {
  rank: number;
  title: string;
  emoji: string;
  severityLabel: string;
  /** 0-100 — poids relatif du limiteur. */
  impact: number;
  /** Ce que tu ressens sur le terrain. */
  fieldFeeling: string;
  /** Le mécanisme physiologique vulgarisé. */
  mechanism: string;
  /** Métriques qui ont conduit au diagnostic. */
  evidence: string[];
}

export interface ReportLever {
  title: string;
  emoji: string;
  description: string;
  adaptations: string[];
  workouts: string[];
  priority: number;
}

export interface ReportZoneRow {
  id: string;
  label: string;
  condition: string;
  pctRef: string;
  refLabel: string;
  absolute: string | null;
  heartRate: string | null;
  /** Ex. « 68–78 % » de la FC max. */
  hrPct: string | null;
}

export interface ReportZoneSet {
  sportLabel: string;
  source: "derived" | "standard";
  confidence: number;
  anchors: string[];
  /** Phrase simple pour l'édition athlète (base des zones), sans jargon ni alertes. */
  summary?: string;
  fallbackReason: string | null;
  zones: ReportZoneRow[];
  /** Intensité spécifique de l'épreuve, identique à celle du plan (`race_specific`). */
  markers?: { id: string; label: string; absolute: string | null }[];
  /** Repères physiologiques posés sur la grille (MLSS, CP/CS, FatMax, VMA…), avec leur zone et leur source. */
  landmarks?: ReportZoneLandmark[];
  /** Grille ancrée : seuil critique (W vélo, km/h course). */
  critical?: number;
  /** Les 5 zones Garmin à recopier dans la montre (mêmes chiffres que le tableau de bord). */
  garmin?: import('@/lib/zones/garminZones').GarminZone[];
}

export interface ReportZoneLandmark {
  label: string;
  value: string;
  /** Zone de la grille du plan qui contient le repère (ex. « Z5 »), ou null hors grille. */
  zone: string | null;
  source: string;
}

export interface ReportPhase {
  id: number;
  name: string;
  subtitle: string;
  startWeek: number;
  endWeek: number;
  color: string;
  focus: string;
  levers: string[];
  targets: string[];
}

export interface ReportRoadmap {
  title: string;
  totalWeeks: number;
  phases: ReportPhase[];
  limiterSummary: string;
  personalized: boolean;
  /** Date ISO de la semaine 1, quand le plan la connaît. */
  startDate?: string;
  /** Plans multi-objectifs : un cycle par course visée. */
  cycles?: { objective: string; raceName?: string; raceDate?: string; startWeek: number; endWeek: number }[];
}

export interface ReportTargetProgress {
  label: string;
  current: number | null;
  target: number | null;
  unit: string;
  decimals?: number;
  /** 0-100 */
  progress: number | null;
  reached: boolean;
}

export interface AthleteProfileReportInput {
  brief?: import('../reportKit/reportBrief').ReportBrief;
  calendar?: import('../reportKit/reportBrief').CalendarEntry[] | null;
  /** `gauge` : CSS comparée au repère de l'objectif (même cadran que « Ton profil en un regard »). */
  swimming?: { css: number | null; gauge?: import('../reportKit/profileGauges').ExtraGauge | null };
  reportReadingHTML?: string;
  compassSummaryHTML?: string;
  evidenceHTML?: string;
  /** Sports racontés, avec leurs observations de sorties longues déjà stockées. */
  sports?: Array<'bike' | 'run'>;
  durabilityDataBySport?: import('../durability/longSessionDurability').StoredDurability;
  /** Ancien contenu éditorial conservé pour compatibilité des entrées existantes. */
  durabilityBySport?: Partial<Record<'bike' | 'run', string>>;
  athleteName: string;
  visuals?: import('../reportKit/visualProfile').VisualProfile;
  nextRace?: string;
  objectifLabel: string;
  ambitionLabel: string;
  age: number | null;
  generatedAt: string;
  snapshotDate: string | null;
  dataCompleteness: number; // 0-100

  readiness: {
    score: number;
    label: string;
    confidence: number;
    message: string;
  };

  profileNarrative: string;
  metrics: ReportMetric[];
  radar: ReportRadarAxis[];
  sportReferences?: import('../coachingCompass/sportPresentation').SportReference[];
  sportTte?: Array<{ label: string; value: number; source: string; target?: number | null }>;
  sportComparisons?: Partial<Record<'bike' | 'run', import('../reportKit/pedagogy').PersonalComparison[]>>;
  economyAxis: ReportRadarAxis | null;
  targetProgress: ReportTargetProgress[];

  limiters: ReportLimiter[];
  levers: ReportLever[];
  decision: {
    block: string;
    durationWeeks: number;
    workouts: string[];
    physiologicalTargets: string[];
    prohibitions: string[];
    athleteMessage: string;
  } | null;

  zoneSets: ReportZoneSet[];
  roadmap: ReportRoadmap | null;
  nextSteps: string[];
  glossary: Array<{ term: string; definition: string }>;
  logoBase64?: string | null;
}
