// =============================================
// PLANIFICATEUR PÉRIODISÉ - Base → Build → Peak → Taper
// Intègre VLamax + Confiance + A/B/C/D + Zones chiffrées
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
import { analysePhysiologiqueComplete, RepartitionSeances } from "./physiologicalModel";
import { ZonesConfig, computeAbsoluteRange, ZoneDefinition, AthleteRefsForZones } from "./zonesConfig";

// =============================================
// TEMPLATES DE SÉANCES A/B/C/D
// =============================================

export const SessionTemplates: Record<SessionType, SessionTemplate[]> = {
  A: [
    { sport: "cyclisme", name: "Endurance Z2", metric: "puissance", zoneKey: "Z2", durationMin: [75, 180], notes: "Endurance fondamentale, cadence libre, nutrition à tester si long." },
    { sport: "course", name: "Footing Z2", metric: "allure", zoneKey: "Z2", durationMin: [40, 90], notes: "Économie de course, relâchement, technique." },
    { sport: "natation", name: "Aérobie Z2", metric: "allure", zoneKey: "Z2", durationMin: [30, 60], notes: "Nage continue ou séries longues, focus technique." }
  ],
  B: [
    { sport: "cyclisme", name: "VO2 Z5", metric: "puissance", zoneKey: "Z5", durationMin: [50, 80], notes: "Ex: 5x3' Z5 r=3'." },
    { sport: "course", name: "VMA Z6", metric: "allure", zoneKey: "Z6", durationMin: [45, 70], notes: "Ex: 10-15x400m à %VMA, r=1'." },
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
  Semi: { defaultWeeks: 12, taperWeeks: 2, peakWeeks: 2, buildWeeks: 5, baseWeeks: 3 }
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
// GÉNÉRATION DE SEMAINE
// =============================================

const WeekDays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
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

  // Nombre de séances (6 par défaut)
  const nSessions = goal === "Semi" ? 5 : 6;
  const nRest = 7 - nSessions;

  // Calcul du nombre de séances par type
  const nA = Math.round(dist.A * nSessions);
  const nB = Math.round(dist.B * nSessions);
  const nC = Math.round(dist.C * nSessions);
  let nD = nSessions - (nA + nB + nC);
  if (nD < 0) nD = 0;

  // Liste des types
  let types: SessionType[] = [];
  types = types.concat(Array(nA).fill("A") as SessionType[]);
  types = types.concat(Array(nB).fill("B") as SessionType[]);
  types = types.concat(Array(nC).fill("C") as SessionType[]);
  types = types.concat(Array(Math.max(0, nD)).fill("D") as SessionType[]);

  // Ajuster si nécessaire
  while (types.length < nSessions) types.push("D");
  while (types.length > nSessions) types.pop();

  // Shuffle
  types.sort(() => Math.random() - 0.5);

  // Pattern sport selon objectif
  const sportPattern: TrainingSport[] = 
    (goal === "IM" || goal === "703") 
      ? ["cyclisme", "course", "natation", "cyclisme", "course", "cyclisme"]
      : ["course", "course", "cyclisme", "course", "natation", "course"];

  const sessions: PlannedSession[] = [];
  let sportIdx = 0;
  const mult = phaseMultiplier(phaseName);

  for (let i = 0; i < nSessions; i++) {
    const type = types[i];
    const sport = sportPattern[sportIdx % sportPattern.length];
    sportIdx++;

    // Template cohérent
    const candidates = (SessionTemplates[type] || []).filter(t => t.sport === sport);
    const tpl = candidates.length ? pick(candidates) : pick(SessionTemplates[type] || SessionTemplates.A);

    const durMin = tpl.durationMin[0] * mult;
    const durMax = tpl.durationMin[1] * mult;
    const duration = Math.round(pick([durMin, (durMin + durMax) / 2, durMax]));

    sessions.push({
      dayIndex: 0,
      dayName: "",
      type,
      sport: tpl.sport,
      name: tpl.name,
      zone: tpl.zoneKey,
      zoneTarget: zoneTargetText(athlete.refs, tpl),
      durationMin: duration,
      notes: tpl.notes,
      phase: phaseName,
      weekIndex: weekIndex + 1,
      totalWeeks
    });
  }

  // Jours de repos
  const restDays: number[] = [];
  if (nRest >= 1) {
    restDays.push(phaseName === "Taper" ? 4 : 0); // Vendredi ou Lundi
  }
  while (restDays.length < nRest) {
    const r = Math.floor(Math.random() * 7);
    if (!restDays.includes(r)) restDays.push(r);
  }

  // Placement des séances
  const trainingDays = WeekDays.map((d, idx) => ({ idx, d })).filter(x => !restDays.includes(x.idx));
  for (let i = 0; i < sessions.length && i < trainingDays.length; i++) {
    sessions[i].dayIndex = trainingDays[i].idx;
    sessions[i].dayName = trainingDays[i].d;
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
    notes: "Repos complet ou mobilité légère.",
    phase: phaseName,
    weekIndex: weekIndex + 1,
    totalWeeks
  }));

  const allSessions = [...sessions, ...restSessions].sort((a, b) => a.dayIndex - b.dayIndex);

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
