// =============================================
// PLANIFICATEUR PÉRIODISÉ - Base → Build → Peak → Taper
// Intègre VLamax + Confiance + A/B/C/D + Zones chiffrées
// Utilise WorkoutLibrary pour la génération des séances
// =============================================

import { ObjectifType, Athlete, AthleteRefs } from "@/types/athlete";
import { 
  SessionType, 
  SessionTemplate, 
  PlannedSession, 
  SessionDistribution, 
  PlanWeek, 
  MacroCycle,
  GoalPeriodizationConfig,
  PhaseConfig,
  PhaseName,
  TrainingSport
} from "@/types/planificateur";
import { LibraryWorkout } from "@/types/workoutLibrary";
import { analysePhysiologiqueComplete, RepartitionSeances } from "./physiologicalModel";
import { ZonesConfig, computeAbsoluteRange, ZoneDefinition, AthleteRefsForZones } from "./zonesConfig";
import { WorkoutLibrary, pickWorkoutFromLibrary, zoneTargetTextForWorkout } from "./workoutLibrary";

// =============================================
// SPORT PATTERNS PAR OBJECTIF
// =============================================

const SportPatternByGoal: Record<string, TrainingSport[]> = {
  IM: ["cyclisme", "course", "natation", "cyclisme", "course", "cyclisme"],
  "703": ["cyclisme", "course", "natation", "cyclisme", "course", "cyclisme"],
  Marathon: ["course", "course", "cyclisme", "course", "natation", "course"],
  Semi: ["course", "course", "cyclisme", "course", "natation"],
  Trail: ["course", "course", "cyclisme", "course", "muscu", "course"],
  TrailShort: ["course", "course", "cyclisme", "course", "muscu", "course"],
  TrailMountain: ["course", "course", "cyclisme", "course", "muscu", "course"],
  TrailUltra: ["course", "course", "cyclisme", "course", "muscu", "course"]
};

// =============================================
// CONFIGURATION TRAIL 20-80km (caps + séances spécifiques)
// =============================================

interface TrailGoalConfig {
  label: string;
  sessionsPerWeek: number;
  longRunCapMin: number;
  baseDist: Record<PhaseName, SessionDistribution>;
  mustHaveWorkoutIds: string[];
}

const TrailConfig: Record<string, TrailGoalConfig> = {
  TrailShort: {
    label: "Trail (20–40 km)",
    sessionsPerWeek: 6,
    longRunCapMin: 150, // 2h30 max
    baseDist: {
      Base: { A: 0.50, B: 0.20, C: 0.20, D: 0.10 },
      Build: { A: 0.44, B: 0.22, C: 0.20, D: 0.14 },
      Peak: { A: 0.38, B: 0.22, C: 0.22, D: 0.18 },
      Taper: { A: 0.30, B: 0.12, C: 0.18, D: 0.40 }
    },
    mustHaveWorkoutIds: ["B_TR_HILL_REPS_SHORT", "B_TR_HILL_TEMPO", "C_TR_SKILLS_TECH", "B_TR_FARTLEK_TRAIL"]
  },
  TrailMountain: {
    label: "Trail (40–80 km)",
    sessionsPerWeek: 6,
    longRunCapMin: 210, // 3h30 max
    baseDist: {
      Base: { A: 0.55, B: 0.16, C: 0.21, D: 0.08 },
      Build: { A: 0.50, B: 0.16, C: 0.22, D: 0.12 },
      Peak: { A: 0.42, B: 0.14, C: 0.26, D: 0.18 },
      Taper: { A: 0.30, B: 0.10, C: 0.15, D: 0.45 }
    },
    mustHaveWorkoutIds: ["B_TR_HILL_TEMPO", "B_TR_DESCENT_TOLERANCE", "C_TR_STRENGTH_GENERAL", "C_TR_POLES_SESSION", "A_TR_RACE_SIMU"]
  },
  Trail: {
    label: "Trail (40–80 km)",
    sessionsPerWeek: 6,
    longRunCapMin: 210,
    baseDist: {
      Base: { A: 0.55, B: 0.16, C: 0.21, D: 0.08 },
      Build: { A: 0.50, B: 0.16, C: 0.22, D: 0.12 },
      Peak: { A: 0.42, B: 0.14, C: 0.26, D: 0.18 },
      Taper: { A: 0.30, B: 0.10, C: 0.15, D: 0.45 }
    },
    mustHaveWorkoutIds: ["B_TR_HILL_TEMPO", "C_TR_STRENGTH_GENERAL"]
  },
  TrailUltra: {
    label: "Ultra Trail (80km+)",
    sessionsPerWeek: 6,
    longRunCapMin: 300, // 5h cap for ultra
    baseDist: {
      Base: { A: 0.58, B: 0.12, C: 0.20, D: 0.10 },
      Build: { A: 0.52, B: 0.14, C: 0.22, D: 0.12 },
      Peak: { A: 0.45, B: 0.12, C: 0.25, D: 0.18 },
      Taper: { A: 0.28, B: 0.08, C: 0.14, D: 0.50 }
    },
    mustHaveWorkoutIds: ["A_TR_BACK_TO_BACK_1", "A_TR_BACK_TO_BACK_2", "C_TR_STRENGTH_GENERAL"]
  }
};

function isTrailGoalForPlanner(goal: ObjectifType): boolean {
  return goal in TrailConfig;
}

function getTrailConfig(goal: ObjectifType): TrailGoalConfig | null {
  return TrailConfig[goal] || null;
}

// =============================================
// D+ TARGETS (Trail 20-80km)
// =============================================

interface DPlusRules {
  easyPerHour: [number, number];
  longPerHour: [number, number];
  qualityPerHour: [number, number];
}

const DPlusRulesByGoal: Record<string, Record<PhaseName, DPlusRules>> = {
  TrailShort: {
    Base: { easyPerHour: [150, 300], longPerHour: [300, 600], qualityPerHour: [200, 450] },
    Build: { easyPerHour: [200, 350], longPerHour: [400, 700], qualityPerHour: [250, 500] },
    Peak: { easyPerHour: [150, 300], longPerHour: [450, 750], qualityPerHour: [250, 550] },
    Taper: { easyPerHour: [50, 150], longPerHour: [200, 400], qualityPerHour: [150, 300] }
  },
  TrailMountain: {
    Base: { easyPerHour: [200, 400], longPerHour: [450, 800], qualityPerHour: [250, 550] },
    Build: { easyPerHour: [250, 450], longPerHour: [550, 900], qualityPerHour: [300, 650] },
    Peak: { easyPerHour: [200, 400], longPerHour: [650, 1000], qualityPerHour: [300, 700] },
    Taper: { easyPerHour: [80, 200], longPerHour: [300, 550], qualityPerHour: [200, 400] }
  },
  Trail: {
    Base: { easyPerHour: [200, 400], longPerHour: [450, 800], qualityPerHour: [250, 550] },
    Build: { easyPerHour: [250, 450], longPerHour: [550, 900], qualityPerHour: [300, 650] },
    Peak: { easyPerHour: [200, 400], longPerHour: [650, 1000], qualityPerHour: [300, 700] },
    Taper: { easyPerHour: [80, 200], longPerHour: [300, 550], qualityPerHour: [200, 400] }
  },
  TrailUltra: {
    Base: { easyPerHour: [250, 450], longPerHour: [500, 900], qualityPerHour: [300, 600] },
    Build: { easyPerHour: [300, 500], longPerHour: [600, 1000], qualityPerHour: [350, 700] },
    Peak: { easyPerHour: [250, 450], longPerHour: [700, 1100], qualityPerHour: [350, 750] },
    Taper: { easyPerHour: [100, 250], longPerHour: [350, 600], qualityPerHour: [250, 450] }
  }
};

const DPlusCaps: Record<string, { longMax: number; qualityMax: number; easyMax: number }> = {
  TrailShort: { longMax: 1400, qualityMax: 900, easyMax: 600 },
  TrailMountain: { longMax: 2200, qualityMax: 1200, easyMax: 900 },
  Trail: { longMax: 2200, qualityMax: 1200, easyMax: 900 },
  TrailUltra: { longMax: 3000, qualityMax: 1500, easyMax: 1200 }
};

type SessionKind = "easy" | "long" | "quality";

function inferSessionKind(session: { type?: SessionType; name?: string; durationMin?: number }): SessionKind {
  const name = (session.name || "").toLowerCase();
  const isLong = (session.durationMin && session.durationMin >= 120) || 
                 name.includes("long") || 
                 name.includes("sortie longue") || 
                 name.includes("race simu") ||
                 name.includes("back-to-back");
  if (isLong) return "long";
  
  const isQuality = session.type === "B" || 
                    name.includes("côte") || 
                    name.includes("hill") || 
                    name.includes("tempo") || 
                    name.includes("fartlek") || 
                    name.includes("seuil");
  if (isQuality) return "quality";
  
  return "easy";
}

function computeDPlusTarget(
  goal: ObjectifType, 
  phaseName: PhaseName, 
  durationMin: number, 
  kind: SessionKind
): number | null {
  const rules = DPlusRulesByGoal[goal];
  if (!rules) return null;
  
  const phaseRules = rules[phaseName] || rules.Base;
  const hours = Math.max(0.5, durationMin / 60);
  
  const perHour = kind === "long" ? phaseRules.longPerHour : 
                  kind === "quality" ? phaseRules.qualityPerHour : 
                  phaseRules.easyPerHour;
  
  const minM = perHour[0] * hours;
  const maxM = perHour[1] * hours;
  let target = (minM + maxM) / 2;
  
  // Cap selon objectif et type
  const caps = DPlusCaps[goal];
  if (caps) {
    const capMax = kind === "long" ? caps.longMax : 
                   kind === "quality" ? caps.qualityMax : 
                   caps.easyMax;
    target = Math.min(target, capMax);
  }
  
  return Math.round(target / 50) * 50; // Arrondi à 50m
}

export function formatDPlusDisplay(dPlus: number | { min: number; max: number } | null | undefined): string {
  if (dPlus == null) return "—";
  if (typeof dPlus === "number") return `${dPlus} m D+`;
  if (typeof dPlus === "object" && dPlus.min != null && dPlus.max != null) {
    return `${dPlus.min}–${dPlus.max} m D+`;
  }
  return "—";
}

// =============================================
// TEMPLATES DE SÉANCES A/B/C/D (fallback)
// =============================================

export const SessionTemplates: Record<SessionType, SessionTemplate[]> = {
  A: [
    { sport: "cyclisme", name: "Endurance Z2", metric: "puissance", zoneKey: "Z2", durationMin: [75, 180], notes: "Endurance fondamentale, cadence libre, nutrition à tester si long." },
    { sport: "course", name: "Footing Z2", metric: "allure", zoneKey: "Z2", durationMin: [40, 90], notes: "Économie de course, relâchement, technique." },
    { sport: "natation", name: "Aérobie Z2", metric: "allure", zoneKey: "Z2", durationMin: [30, 60], notes: "Nage continue ou séries longues, focus technique." }
  ],
  B: [
    { sport: "cyclisme", name: "VO2 Z5", metric: "puissance", zoneKey: "Z5", durationMin: [50, 80], notes: "Ex: 5x3 min Z5 r=3 min." },
    { sport: "course", name: "VMA Z6", metric: "allure", zoneKey: "Z6", durationMin: [45, 70], notes: "Ex: 10-15x400m à %VMA, r=1 min." },
    { sport: "natation", name: "Vitesse Z6", metric: "allure", zoneKey: "Z6", durationMin: [35, 55], notes: "Ex: 16x25m vite r=20-30s." }
  ],
  C: [
    { sport: "natation", name: "Technique", metric: "allure", zoneKey: "Z1", durationMin: [30, 50], notes: "Drills, éducatifs, respiration, alignement." },
    { sport: "course", name: "Côtes/tech", metric: "cardiaque", zoneKey: "Z3", durationMin: [35, 55], notes: "Côtes courtes + technique, relâchement." },
    { sport: "cyclisme", name: "Cadence/skills", metric: "puissance", zoneKey: "Z2", durationMin: [45, 75], notes: "Pédalage, vélocité, position, aero." }
  ],
  D: [
    { sport: "cyclisme", name: "Récup Z1", metric: "puissance", zoneKey: "Z1", durationMin: [30, 60], notes: "Très facile. Objectif: fraîcheur." },
    { sport: "course", name: "Jog Z1", metric: "cardiaque", zoneKey: "Z1", durationMin: [20, 45], notes: "Très facile, relâché." },
    { sport: "natation", name: "Récup tech", metric: "allure", zoneKey: "Z1", durationMin: [20, 40], notes: "Nage facile + éducatifs légers." }
  ],
  REST: []
};

// =============================================
// CONFIGURATION PÉRIODISATION PAR OBJECTIF
// =============================================

export const GoalPeriodization: Record<string, GoalPeriodizationConfig> = {
  IM: { defaultWeeks: 20, taperWeeks: 3, peakWeeks: 3, buildWeeks: 8, baseWeeks: 6 },
  "703": { defaultWeeks: 14, taperWeeks: 2, peakWeeks: 2, buildWeeks: 6, baseWeeks: 4 },
  Marathon: { defaultWeeks: 16, taperWeeks: 2, peakWeeks: 3, buildWeeks: 7, baseWeeks: 4 },
  Semi: { defaultWeeks: 12, taperWeeks: 2, peakWeeks: 2, buildWeeks: 5, baseWeeks: 3 },
  Trail: { defaultWeeks: 14, taperWeeks: 2, peakWeeks: 2, buildWeeks: 6, baseWeeks: 4 },
  TrailShort: { defaultWeeks: 12, taperWeeks: 2, peakWeeks: 2, buildWeeks: 5, baseWeeks: 3 },
  TrailMountain: { defaultWeeks: 16, taperWeeks: 2, peakWeeks: 3, buildWeeks: 7, baseWeeks: 4 },
  TrailUltra: { defaultWeeks: 20, taperWeeks: 3, peakWeeks: 3, buildWeeks: 8, baseWeeks: 6 }
};

// =============================================
// CALCUL DES PHASES
// =============================================

export function computePhases(goal: ObjectifType, totalWeeks: number): PhaseConfig[] {
  const cfg = GoalPeriodization[goal] || GoalPeriodization.IM;

  let taper = cfg.taperWeeks;
  let peak = cfg.peakWeeks;
  let build = cfg.buildWeeks;
  let base = cfg.baseWeeks;

  const sum = taper + peak + build + base;
  const diff = totalWeeks - sum;

  if (diff !== 0) {
    build = Math.max(2, build + diff);
    if (build < 2) {
      base = Math.max(2, base + (build - 2));
      build = 2;
    }
  }

  const total = base + build + peak + taper;
  if (total !== totalWeeks) {
    base += (totalWeeks - total);
  }

  return [
    { name: "Base", weeks: Math.max(1, base) },
    { name: "Build", weeks: Math.max(1, build) },
    { name: "Peak", weeks: Math.max(1, peak) },
    { name: "Taper", weeks: Math.max(1, taper) }
  ];
}

// =============================================
// DISTRIBUTION A/B/C/D PAR PHASE
// =============================================

function phaseDistribution(goal: ObjectifType, phaseName: PhaseName): SessionDistribution {
  // Utiliser la config Trail spécifique si disponible
  const trailCfg = getTrailConfig(goal);
  if (trailCfg) {
    const dist = trailCfg.baseDist[phaseName] || trailCfg.baseDist.Base;
    const s = dist.A + dist.B + dist.C + dist.D;
    return { A: dist.A / s, B: dist.B / s, C: dist.C / s, D: dist.D / s };
  }

  const common: Record<PhaseName, SessionDistribution> = {
    Base: { A: 0.55, B: 0.10, C: 0.20, D: 0.15 },
    Build: { A: 0.45, B: 0.25, C: 0.15, D: 0.15 },
    Peak: { A: 0.35, B: 0.30, C: 0.15, D: 0.20 },
    Taper: { A: 0.30, B: 0.20, C: 0.10, D: 0.40 }
  };

  const adj = { ...common[phaseName] };

  // Ajustements selon objectifs
  if (goal === "IM") {
    adj.A += 0.05; adj.B -= 0.05;
  }
  if (goal === "Marathon") {
    adj.A += 0.03; adj.C -= 0.03;
  }
  if (goal === "703") {
    adj.B += 0.05; adj.A -= 0.05;
  }
  if (goal === "Semi") {
    adj.B += 0.06; adj.A -= 0.06;
  }

  // Normalisation
  const s = adj.A + adj.B + adj.C + adj.D;
  adj.A /= s; adj.B /= s; adj.C /= s; adj.D /= s;
  
  return adj;
}

// Appliquer biais physiologique
function applyPhysioBias(
  dist: SessionDistribution, 
  repartition: RepartitionSeances, 
  confiance: number
): SessionDistribution {
  const d = { ...dist };

  if (confiance < 60) {
    d.B = Math.max(0.08, d.B - 0.07);
    d.D = Math.min(0.45, d.D + 0.07);
  } else {
    const bStatus = repartition.B.status;
    
    if (bStatus === "limitée") {
      d.B = Math.max(0.08, d.B - 0.10);
      d.A = Math.min(0.65, d.A + 0.07);
      d.D = Math.min(0.35, d.D + 0.03);
    }
    if (bStatus === "prioritaire") {
      d.B = Math.min(0.35, d.B + 0.08);
      d.A = Math.max(0.30, d.A - 0.05);
      d.D = Math.max(0.10, d.D - 0.03);
    }
  }

  // Renormalisation
  const s = d.A + d.B + d.C + d.D;
  d.A /= s; d.B /= s; d.C /= s; d.D /= s;
  
  return d;
}

// =============================================
// MULTIPLICATEUR DE PHASE (VOLUME)
// =============================================

function phaseMultiplier(phaseName: PhaseName): number {
  switch (phaseName) {
    case "Base": return 1.00;
    case "Build": return 1.15;
    case "Peak": return 1.25;
    case "Taper": return 0.75;
    default: return 1.0;
  }
}

// =============================================
// CIBLES DE ZONES
// =============================================

function getZoneDef(metricKey: string, sportKey: string, zoneKey: string): ZoneDefinition | null {
  const metric = ZonesConfig[metricKey];
  if (!metric) return null;
  const table = metric.sports[sportKey];
  if (!table) return null;
  return table.find(z => z.key === zoneKey) || null;
}

function zoneTargetText(refs: AthleteRefsForZones | undefined, template: SessionTemplate): string {
  const sportKey = 
    template.metric === "cardiaque" ? "tout sport" :
    (template.metric === "puissance" ? (template.sport === "cyclisme" ? "cyclisme" : "course") :
    (template.metric === "allure" ? (template.sport === "course" ? "course" : "natation") : "course"));

  const z = getZoneDef(template.metric, sportKey, template.zoneKey);
  if (!z) return `${template.zoneKey}`;

  if (!refs) {
    return `${template.zoneKey} (${z.min}-${z.max}%)`;
  }

  const abs = computeAbsoluteRange(template.metric, sportKey, z, refs);
  if (abs && abs.ok) return `${template.zoneKey} (${z.min}-${z.max}%) → ${abs.display}`;
  
  return `${template.zoneKey} (${z.min}-${z.max}%)`;
}

// =============================================
// GÉNÉRATION DE SEMAINE (avec WorkoutLibrary)
// =============================================

const WeekDays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  return arr.slice().sort(() => Math.random() - 0.5);
}

// Format notes complètes depuis WorkoutLibrary
function formatWorkoutNotes(athlete: Athlete, workout: LibraryWorkout): string {
  const goalKey = getGoalVariantKey(athlete.objectif);
  const variant = workout.variants[goalKey] 
    ? `Variante ${goalKey}: ${workout.variants[goalKey]}` 
    : "";

  const blocks = workout.structure.map(s => {
    const zonesTxt = s.zones
      .map(zk => zoneTargetTextForWorkout(athlete.refs, workout.metricKey, workout.sportKey, zk))
      .join(" | ");
    return `${s.part}: ${s.text}${zonesTxt ? ` [${zonesTxt}]` : ""}`;
  }).join(" • ");

  return [
    `${workout.necessite} | Quand: ${workout.when}`,
    variant,
    blocks
  ].filter(Boolean).join("\n");
}

function getGoalVariantKey(goal: ObjectifType): "ironman" | "half" | "marathon" | "semi" | "trail_short" | "trail_mountain" | "trail_ultra" {
  switch (goal) {
    case "IM": return "ironman";
    case "703": return "half";
    case "Marathon": return "marathon";
    case "Semi": return "semi";
    case "Trail":
    case "TrailMountain": return "trail_mountain";
    case "TrailShort": return "trail_short";
    case "TrailUltra": return "trail_ultra";
    default: return "ironman";
  }
}

// Cap durée sorties longues pour Trail
function capLongRunDuration(session: PlannedSession, goal: ObjectifType): PlannedSession {
  const trailCfg = getTrailConfig(goal);
  if (!trailCfg) return session;
  
  const cap = trailCfg.longRunCapMin;
  const name = (session.name || "").toLowerCase();
  const isLong = (session.durationMin && session.durationMin >= 120) || 
                 name.includes("long") || 
                 name.includes("sortie longue") ||
                 name.includes("back-to-back");
  
  if (isLong && session.durationMin && session.durationMin > cap) {
    return {
      ...session,
      durationMin: cap,
      notes: (session.notes || "") + `\n\n🛑 Cap Trail: durée plafonnée à ${cap} min (trail ≤80 km).`
    };
  }
  return session;
}

// Assure au moins 1 séance trail spécifique par semaine
function ensureTrailSpecificSession(
  sessions: PlannedSession[], 
  athlete: Athlete, 
  goal: ObjectifType
): PlannedSession[] {
  const trailCfg = getTrailConfig(goal);
  if (!trailCfg || !trailCfg.mustHaveWorkoutIds.length) return sessions;
  
  const mustIds = trailCfg.mustHaveWorkoutIds;
  
  // Déjà présent ?
  const hasSpecific = sessions.some(s => 
    s.notes?.includes("TR_") || 
    mustIds.some(id => s.name?.includes(id) || s.notes?.includes(id))
  );
  
  if (hasSpecific) return sessions;
  
  // Chercher une séance trail spécifique dans la bibliothèque
  const preferCat: SessionType = goal === "TrailShort" ? "B" : "C";
  let forced = pickWorkoutFromLibrary({ cat: preferCat, sport: "course", goal });
  if (!forced) {
    forced = pickWorkoutFromLibrary({ cat: "B", sport: "course", goal });
  }
  if (!forced) {
    forced = pickWorkoutFromLibrary({ cat: "C", sport: "muscu", goal });
  }
  if (!forced) return sessions;
  
  // Remplacer une séance moins spécifique (D ou A vélo)
  let idxReplace = sessions.findIndex(s => s.type === "D" && s.sport === "course");
  if (idxReplace < 0) idxReplace = sessions.findIndex(s => s.sport === "cyclisme" && (s.type === "A" || s.type === "D"));
  if (idxReplace < 0) idxReplace = sessions.findIndex(s => s.type === "A" && s.sport !== "course");
  if (idxReplace < 0) return sessions;
  
  const original = sessions[idxReplace];
  const mainPart = forced.structure.find(s => s.part.toLowerCase().includes("main")) || forced.structure[0];
  const primaryZone = mainPart?.zones?.[0] || "Z2";
  
  sessions[idxReplace] = {
    ...original,
    type: forced.cat as SessionType,
    sport: forced.sport === "muscu" ? "muscu" : (forced.sport || "course"),
    name: `${forced.id.split("_").slice(1).join(" ")} – ${forced.objectif}`,
    zone: primaryZone,
    notes: formatWorkoutNotes(athlete, forced) + `\n\n✅ Séance trail spécifique (${goal}).`
  };
  
  return sessions;
}

export function generateWeekSessions(
  athlete: Athlete,
  goal: ObjectifType,
  phaseName: PhaseName,
  weekIndex: number,
  totalWeeks: number
): { distribution: SessionDistribution; sessions: PlannedSession[] } {
  // Analyse physiologique
  const tests = athlete.tests?.filter(t => t.type === "VLAMAX" && typeof t.vlamax === "number") || [];
  const vo2max = athlete.vo2max || 50;
  const physio = analysePhysiologiqueComplete(
    tests.map(t => ({ nom: t.nom, vlamax: t.vlamax!, fiabilite: t.fiabilite || 0.5 })),
    vo2max,
    goal
  );

  // Distribution avec biais physio
  let dist = phaseDistribution(goal, phaseName);
  dist = applyPhysioBias(dist, physio.repartition, physio.confiance);

  // Nombre de séances (Trail utilise config spécifique)
  const trailCfg = getTrailConfig(goal);
  const nSessions = trailCfg?.sessionsPerWeek || (goal === "Semi" ? 5 : 6);
  const nRest = 7 - nSessions;

  // Calcul du nombre de séances par type
  let nA = Math.round(dist.A * nSessions);
  let nB = Math.round(dist.B * nSessions);
  let nC = Math.round(dist.C * nSessions);
  let nD = nSessions - (nA + nB + nC);
  if (nD < 0) nD = 0;

  // Ajuste pour être sûr d'avoir nSessions
  while (nA + nB + nC + nD < nSessions) nD++;
  while (nA + nB + nC + nD > nSessions) {
    if (nD > 0) nD--;
    else if (nC > 0) nC--;
    else if (nA > 0) nA--;
    else break;
  }

  // Liste des types (shuffled)
  let types: SessionType[] = [];
  types = types.concat(Array(nA).fill("A") as SessionType[]);
  types = types.concat(Array(nB).fill("B") as SessionType[]);
  types = types.concat(Array(nC).fill("C") as SessionType[]);
  types = types.concat(Array(Math.max(0, nD)).fill("D") as SessionType[]);
  types = shuffle(types);

  // Pattern sport selon objectif
  const sportPattern = SportPatternByGoal[goal] || SportPatternByGoal.IM;
  const sportList = sportPattern.slice(0, nSessions);

  // Jours de repos
  const restDays: number[] = [];
  if (nRest >= 1) {
    restDays.push(phaseName === "Taper" ? 4 : 0); // Vendredi ou Lundi
  }
  while (restDays.length < nRest) {
    const r = Math.floor(Math.random() * 7);
    if (!restDays.includes(r)) restDays.push(r);
  }

  const trainingDays = WeekDays
    .map((d, idx) => ({ d, idx }))
    .filter(x => !restDays.includes(x.idx));

  const mult = phaseMultiplier(phaseName);
  const sessions: PlannedSession[] = [];

  for (let i = 0; i < nSessions && i < trainingDays.length; i++) {
    const cat = types[i];
    const sport = sportList[i % sportList.length];

    // Pioche dans WorkoutLibrary
    const workout = pickWorkoutFromLibrary({ cat, sport, goal });

    if (workout) {
      // Séance depuis bibliothèque
      const mainPart = workout.structure.find(s => s.part.toLowerCase().includes("main")) || workout.structure[0];
      const primaryZone = mainPart?.zones?.[0] || "Z2";
      const zoneText = zoneTargetTextForWorkout(athlete.refs, workout.metricKey, workout.sportKey, primaryZone);

      const baseDur = pick([workout.durationMin[0], (workout.durationMin[0] + workout.durationMin[1]) / 2, workout.durationMin[1]]);
      const duration = Math.round(baseDur * mult);

      // Calcul D+ pour Trail
      let dPlusTargetM = workout.dPlusTargetM;
      if (!dPlusTargetM && isTrailGoalForPlanner(goal) && (sport === "course" || workout.sport === "course")) {
        const kind = inferSessionKind({ type: cat, name: workout.objectif, durationMin: duration });
        const computed = computeDPlusTarget(goal, phaseName, duration, kind);
        if (computed) dPlusTargetM = computed;
      }

      let notes = formatWorkoutNotes(athlete, workout);
      if (dPlusTargetM) {
        notes += `\n\n🏔️ Cible D+ : ${formatDPlusDisplay(dPlusTargetM)}`;
      }

      sessions.push({
        dayIndex: trainingDays[i].idx,
        dayName: trainingDays[i].d,
        type: cat,
        sport: workout.sport,
        name: `${workout.id.split("_").slice(1).join(" ")} – ${workout.objectif}`,
        zone: primaryZone,
        zoneTarget: zoneText,
        durationMin: duration,
        notes,
        phase: phaseName,
        weekIndex: weekIndex + 1,
        totalWeeks,
        dPlusTargetM
      });
    } else {
      // Fallback: utilise SessionTemplates
      const candidates = (SessionTemplates[cat] || []).filter(t => t.sport === sport);
      const tpl = candidates.length ? pick(candidates) : pick(SessionTemplates[cat] || SessionTemplates.A);

      const durMin = tpl.durationMin[0] * mult;
      const durMax = tpl.durationMin[1] * mult;
      const duration = Math.round(pick([durMin, (durMin + durMax) / 2, durMax]));

      const sportKey = 
        tpl.metric === "cardiaque" ? "tout sport" :
        (tpl.metric === "puissance" ? "cyclisme" : (tpl.sport === "course" ? "course" : "natation"));

      const z = getZoneDef(tpl.metric, sportKey, tpl.zoneKey);
      let zoneText = tpl.zoneKey;
      if (z && athlete.refs) {
        const abs = computeAbsoluteRange(tpl.metric, sportKey, z, athlete.refs);
        if (abs?.ok) zoneText = `${tpl.zoneKey} → ${abs.display}`;
      }

      // Calcul D+ pour Trail (même sur templates fallback)
      let dPlusTargetM: number | { min: number; max: number } | undefined;
      if (isTrailGoalForPlanner(goal) && tpl.sport === "course") {
        const kind = inferSessionKind({ type: cat, name: tpl.name, durationMin: duration });
        const computed = computeDPlusTarget(goal, phaseName, duration, kind);
        if (computed) dPlusTargetM = computed;
      }

      let notes = tpl.notes;
      if (dPlusTargetM) {
        notes += `\n\n🏔️ Cible D+ : ${formatDPlusDisplay(dPlusTargetM)}`;
      }

      sessions.push({
        dayIndex: trainingDays[i].idx,
        dayName: trainingDays[i].d,
        type: cat,
        sport: tpl.sport,
        name: tpl.name,
        zone: tpl.zoneKey,
        zoneTarget: zoneText,
        durationMin: duration,
        notes,
        phase: phaseName,
        weekIndex: weekIndex + 1,
        totalWeeks,
        dPlusTargetM
      });
    }
  }

  // Ajouter les jours de repos
  const restSessions: PlannedSession[] = restDays.map(idx => ({
    dayIndex: idx,
    dayName: WeekDays[idx],
    type: "REST" as SessionType,
    sport: "-",
    name: "Repos / Off",
    zone: "-",
    zoneTarget: "-",
    durationMin: 0,
    notes: phaseName === "Taper" 
      ? "Repos + mobilité, garder fraîcheur."
      : "Repos complet ou mobilité légère.",
    phase: phaseName,
    weekIndex: weekIndex + 1,
    totalWeeks
  }));

  let allSessions = [...sessions, ...restSessions].sort((a, b) => a.dayIndex - b.dayIndex);
  
  // Trail: cap sorties longues + injection séance spécifique
  if (isTrailGoalForPlanner(goal)) {
    allSessions = allSessions.map(s => capLongRunDuration(s, goal));
    allSessions = ensureTrailSpecificSession(allSessions, athlete, goal);
  }

  return { distribution: dist, sessions: allSessions };
}

// =============================================
// GÉNÉRATION DU MACROCYCLE
// =============================================

function isoDateAddDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function generateMacrocycle(
  athlete: Athlete,
  goal: ObjectifType,
  startDateISO: string,
  totalWeeks: number
): MacroCycle {
  const phases = computePhases(goal, totalWeeks);
  const planWeeks: PlanWeek[] = [];

  let weekCounter = 0;

  phases.forEach(ph => {
    for (let w = 0; w < ph.weeks; w++) {
      const weekStart = isoDateAddDays(startDateISO, weekCounter * 7);
      const weekEnd = isoDateAddDays(weekStart, 6);

      const weekData = generateWeekSessions(athlete, goal, ph.name, weekCounter, totalWeeks);

      planWeeks.push({
        weekIndex: weekCounter + 1,
        phase: ph.name,
        start: weekStart,
        end: weekEnd,
        distribution: weekData.distribution,
        sessions: weekData.sessions
      });

      weekCounter++;
    }
  });

  return {
    goal,
    totalWeeks,
    startDate: startDateISO,
    createdAt: new Date().toISOString(),
    weeks: planWeeks
  };
}

// =============================================
// COULEURS PAR PHASE
// =============================================

export function getPhaseColor(phase: PhaseName): { bg: string; text: string; border: string } {
  switch (phase) {
    case "Base":
      return { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" };
    case "Build":
      return { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" };
    case "Peak":
      return { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" };
    case "Taper":
      return { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30" };
    default:
      return { bg: "bg-muted/50", text: "text-muted-foreground", border: "border-muted" };
  }
}

export function getSessionTypeColor(type: SessionType): { bg: string; text: string } {
  switch (type) {
    case "A":
      return { bg: "bg-blue-500/20", text: "text-blue-400" };
    case "B":
      return { bg: "bg-red-500/20", text: "text-red-400" };
    case "C":
      return { bg: "bg-amber-500/20", text: "text-amber-400" };
    case "D":
      return { bg: "bg-green-500/20", text: "text-green-400" };
    case "REST":
      return { bg: "bg-muted/30", text: "text-muted-foreground" };
    default:
      return { bg: "bg-muted/30", text: "text-muted-foreground" };
  }
}
