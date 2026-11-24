import type { CoachingCompassInput } from "@/lib/coachingCompass/types";
import { isLongObjective } from "@/lib/coachingCompass/factorStates";
import { objectiveDemands } from "@/lib/coachingCompass/objectiveDemands";
import { parseStoredCriticalMetrics } from "@/lib/criticalMetrics";
import { parseStoredDurability } from "@/lib/durability/longSessionDurability";
import { CRITICAL_POLICY } from "@/lib/criticalEfforts";
import type { TestingWeekNolioSession } from "./testingWeekNolioSessions";
import {
  buildBikeDayNolioSession, buildCriticalBikeDayNolioSession, buildTrackDayNolioSession,
} from "./dayTestNolioSessions";
import { durabilityPlanSession, pairedDecoupling } from "./durabilityDay";

/**
 * Checklist des tests d'un athlète : quels tests, faits quand, encore valables ou non.
 * Règle du coach : une valeur dont la validité est dépassée n'est JAMAIS retirée ni masquée ;
 * on avertit seulement qu'il faudrait retester. Affichage seul : ne touche ni le moteur ni les plans.
 *
 * Validités : 42 jours pour la CP et la CS (politique de l'app, CRITICAL_POLICY) ; 90 jours pour les
 * autres tests (valeur de coaching, non issue d'études).
 */
export const TEST_VALIDITY_DAYS = { critical: CRITICAL_POLICY.maxAgeDays, other: 90 } as const;

export type DayKey = "bike-day" | "track-day" | "cp-day" | "cs-day" | "durability-bike" | "durability-run" | "lab";
export type TestStatus = "ok" | "stale" | "missing";
export type TestKey =
  | "vo2max" | "sprint-bike" | "map5-bike" | "ftp-bike" | "cp-bike"
  | "sprint-run" | "vma-run" | "threshold-run" | "cs-run" | "durability-bike" | "durability-run";

export interface TestItem {
  key: TestKey; label: string; sport: "bike" | "run" | "both"; feeds: string;
  validityDays: number; status: TestStatus;
  lastDate: string | null; ageDays: number | null;
  /** Valeur conservée, même quand le test est à refaire. */
  valueText: string | null;
  message: string; note?: string;
  /** Résumé du protocole ; le protocole détaillé et l'envoi vers Nolio passent par `day`. */
  protocol: string[];
  day: DayKey;
}

const DAY_MS = 86400000;
const dateOnly = (iso: string) => iso.slice(0, 10);
const french = (iso: string) => dateOnly(iso).split("-").reverse().join("/");
const todayIso = () => new Date().toISOString().slice(0, 10);
const num = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
const fmt = (n: number) => n.toLocaleString("fr-BE", { maximumFractionDigits: n < 10 ? 2 : 1 });
const pace = (sec: number) => Math.floor(sec / 60) + ":" + String(Math.round(sec % 60)).padStart(2, "0") + " min/km";

function age(date: string | null, today: string): number | null {
  if (!date) return null;
  const d = Math.round((Date.parse(today + "T00:00:00Z") - Date.parse(dateOnly(date) + "T00:00:00Z")) / DAY_MS);
  return Number.isFinite(d) ? Math.max(0, d) : null;
}

/** Statut selon la date : valeur présente et récente = ok ; présente mais ancienne ou sans date = à retester ; absente = à faire. */
function describe(valueText: string | null, date: string | null, validityDays: number, today: string): Pick<TestItem, "status" | "lastDate" | "ageDays" | "valueText" | "message"> {
  if (!valueText) return { status: "missing", lastDate: null, ageDays: null, valueText: null, message: "Jamais fait : aucune valeur enregistrée." };
  const a = age(date, today);
  if (a == null) return { status: "stale", lastDate: null, ageDays: null, valueText, message: "Valeur présente, date de test inconnue : à confirmer par un nouveau test. La valeur reste utilisée." };
  const lastDate = dateOnly(date as string);
  const since = `le ${french(lastDate)} (il y a ${a} jour${a > 1 ? "s" : ""})`;
  return a > validityDays
    ? { status: "stale", lastDate, ageDays: a, valueText, message: `Dernier test ${since} ; validité ${validityDays} jours dépassée. La valeur reste utilisée : il faudrait retester.` }
    : { status: "ok", lastDate, ageDays: a, valueText, message: `Fait ${since}. Valable ${validityDays} jours.` };
}

const P = {
  sprintBike: ["Échauffement 15 min, puis 3 sprints maximaux de 10 s départ arrêté (3 min de récupération).", "Un effort maximal de 30 s après 8 min de récupération. Noter puissance pic et moyenne.", "Capteur de puissance, efforts sans cible. Séance à part de la puissance critique."],
  map5: ["5 min maximal dans le Bike Day · Puissance critique (12, 5 et 3 min, 30 min de récupération entre chaque).", "Noter la puissance moyenne. C'est aussi un des trois points de la puissance critique."],
  ftp: ["Déduite de la puissance critique (FTP = CP × 0,965) : pas de test séparé nécessaire.", "Test 20 min en contrôle seulement, un autre jour, reposé (FTP = 0,95 × P moyenne)."],
  cpBike: ["12 min, 5 min et 3 min maximaux, 30 min de récupération entre chaque (Bike Day · Puissance critique).", "Les trois points sont dans la même séance."],
  sprintRun: ["Échauffement 15 min, accélérations en ligne droite, puis 2 sprints de 30 m départ arrêté et un effort maximal de 15 s.", "Noter les temps et la distance exacte."],
  vma: ["Test 6 min (ou 1500 m) à allure maximale stable sur piste, reposé.", "Noter la distance ou le temps et chaque tour."],
  threshold: ["Track Day : 1 500 m maximal, 30 min de récupération, puis 3 000 m maximal sur piste.", "Les deux temps donnent la vitesse critique ; l'allure seuil du bilan en découle (CS / 1,01)."],
  cs: ["Track Day : 1 500 m, 3 000 m puis 1 000 m maximaux, 30 min de récupération entre chaque.", "Trois points dans la même séance, confirmés dans le Day."],
  durability: ["Durability Day : deux blocs de 10 min à la même cible, au début et à la fin d'une sortie longue (vélo ≥ 2 h 30, course ≥ 1 h 30).", "Ou, sans Durability Day : meilleur effort de 20 min au début et dans le dernier tiers, sur au moins 2 sorties longues."],
  vo2: ["Test maximal en laboratoire, ou valeur estimée à partir de la VMA ou du test 5 min.", "Pas de protocole de terrain dédié dans l'app."],
};

export interface TestChecklist {
  items: TestItem[];
  summary: { total: number; ok: number; stale: number; missing: number };
}

export function buildTestChecklist(input: CoachingCompassInput, today: string = todayIso()): TestChecklist {
  const kind = objectiveDemands(input.objectif)?.kind;
  if (kind === "beginner") return { items: [], summary: { total: 0, ok: 0, stale: 0, missing: 0 } };
  const bike = input.sportFocus === "bike" || input.sportFocus === "triathlon" || (input.sportFocus == null && kind !== "road" && kind !== "trail");
  const run = input.sportFocus === "run" || input.sportFocus === "triathlon" || (input.sportFocus == null && (kind === "road" || kind === "trail"));
  const other = TEST_VALIDITY_DAYS.other, crit = TEST_VALIDITY_DAYS.critical;
  const bilan = input.snapshotDate;
  const critical = parseStoredCriticalMetrics(input.criticalMetrics);
  const durability = parseStoredDurability(input.criticalMetrics);
  const items: TestItem[] = [];
  const add = (item: Omit<TestItem, "status" | "lastDate" | "ageDays" | "valueText" | "message"> & { valueText: string | null; date: string | null; note?: string }) => {
    const { date, valueText, ...rest } = item;
    items.push({ ...rest, ...describe(valueText, date, rest.validityDays, today) });
  };

  add({ key: "vo2max", label: "VO₂max", sport: "both", feeds: "VO₂max (plafond aérobie)", validityDays: other, day: "lab", protocol: P.vo2,
    valueText: num(input.vo2max) ? fmt(input.vo2max) + " ml/kg/min" : null, date: bilan });
  if (bike) {
    const sprint = [input.pmax5s, input.p30sW, input.p60sW].some(num);
    add({ key: "sprint-bike", label: "Sprint vélo (5 s, 30 s, 60 s)", sport: "bike", feeds: "VLamax, puissance pic", validityDays: other, day: "bike-day", protocol: P.sprintBike,
      valueText: sprint ? [num(input.pmax5s) ? fmt(input.pmax5s) + " W (5 s)" : null, num(input.p30sW) ? fmt(input.p30sW) + " W (30 s)" : null].filter(Boolean).join(" · ") : null, date: bilan });
    add({ key: "map5-bike", label: "Puissance 5 min (PMA)", sport: "bike", feeds: "Plafond aérobie vélo", validityDays: other, day: "cp-day", protocol: P.map5,
      valueText: num(input.map5minW) ? fmt(input.map5minW) + " W" : null, date: bilan });
    add({ key: "ftp-bike", label: "FTP / seuil vélo", sport: "bike", feeds: "FTP/kg", validityDays: other, day: "cp-day", protocol: P.ftp,
      valueText: num(input.ftp) ? fmt(input.ftp) + " W" : null, date: bilan });
    const cp = critical.cycling;
    add({ key: "cp-bike", label: "Puissance critique (CP) et W′", sport: "bike", feeds: "Seuil critique, réserve anaérobie", validityDays: crit, day: "cp-day", protocol: P.cpBike,
      valueText: cp ? "CP " + fmt(Math.round(cp.critical)) + " W · W′ " + fmt(Math.round(cp.reserve / 100) / 10) + " kJ" : null, date: cp?.latestEffortDate || null,
      note: cp && cp.status !== "confirmed" ? "Estimation non validée par le coach." : undefined });
  }
  if (run) {
    const ref = input.vlamaxRunReference;
    const tested = !!ref && num(ref.value) && /test|labo|reference/i.test(ref.source ?? "");
    add({ key: "sprint-run", label: "Sprint course (15 s, 30 m)", sport: "run", feeds: "VLamax course", validityDays: other, day: "track-day", protocol: P.sprintRun,
      valueText: tested ? fmt(ref!.value as number) + " mmol/L/s" : null, date: bilan,
      note: !tested && ref && num(ref.value) ? "Valeur estimée, sans sprint testé." : undefined });
    add({ key: "vma-run", label: "VMA course (6 min ou 1500 m)", sport: "run", feeds: "VMA, plafond aérobie course", validityDays: other, day: "track-day", protocol: P.vma,
      valueText: num(input.vma) ? fmt(input.vma) + " km/h" : null, date: bilan });
    add({ key: "threshold-run", label: "Allure seuil course (Track Day 1 500 m + 3 000 m)", sport: "run", feeds: "Allure au seuil", validityDays: other, day: "track-day", protocol: P.threshold,
      valueText: num(input.paceThresholdSecPerKm) ? pace(input.paceThresholdSecPerKm) : null, date: bilan });
    const cs = critical.running;
    add({ key: "cs-run", label: "Vitesse critique (CS) et D′", sport: "run", feeds: "Seuil critique, réserve anaérobie", validityDays: crit, day: "track-day", protocol: P.cs,
      valueText: cs ? "CS " + fmt(Math.round(cs.critical * 36) / 10) + " km/h · D′ " + fmt(Math.round(cs.reserve)) + " m" : null, date: cs?.latestEffortDate || null,
      note: cs && cs.status !== "confirmed" ? "Estimation non validée par le coach." : undefined });
  }
  if (isLongObjective(input.objectif)) {
    for (const sport of [bike ? "bike" : null, run ? "run" : null] as const) {
      if (!sport) continue;
      const d = durability[sport];
      // Durability Day : deux blocs de 10 min à la même cible (enregistrés dans « Durabilité »).
      const pair = (input.durabilityPairs ?? []).find(p => p.sport === sport);
      const decoupling = pair ? pairedDecoupling(pair) : null;
      const usePair = !!pair && decoupling != null && (!d || pair.day > d.to);
      add({ key: sport === "bike" ? "durability-bike" : "durability-run", label: "Durabilité · " + (sport === "bike" ? "vélo" : "course"), sport, feeds: "Durabilité après effort prolongé",
        validityDays: other, day: sport === "bike" ? "durability-bike" : "durability-run", protocol: P.durability,
        valueText: usePair ? (Math.round(decoupling! * 10) / 10).toLocaleString("fr-BE") + " % de découplage (Durability Day)" : d ? d.meanChangePct.toLocaleString("fr-BE") + " % (effort de 20 min, fin de sortie)" : null,
        date: usePair ? pair!.day : d?.to ?? null });
    }
  }
  const count = (s: TestStatus) => items.filter(i => i.status === s).length;
  return { items, summary: { total: items.length, ok: count("ok"), stale: count("stale"), missing: count("missing") } };
}

/** Days qui couvrent les tests de la checklist, durabilité comprise ; le laboratoire se programme à part. */
const DAY_BUILDERS: Record<"bike-day" | "track-day" | "cp-day" | "durability-bike" | "durability-run", { sport: "bike" | "run"; build: () => TestingWeekNolioSession; label: string }> = {
  "bike-day": { sport: "bike", build: buildBikeDayNolioSession, label: "Bike Day · Sprints" },
  "track-day": { sport: "run", build: buildTrackDayNolioSession, label: "Track Day" },
  "cp-day": { sport: "bike", build: buildCriticalBikeDayNolioSession, label: "Bike Day · Puissance critique" },
  "durability-bike": { sport: "bike", build: () => durabilityPlanSession("bike"), label: "Durability Day · vélo" },
  "durability-run": { sport: "run", build: () => durabilityPlanSession("run"), label: "Durability Day · course" },
};
// La vitesse critique est intégrée au Track Day (1 500, 3 000 et 1 000 m) ; la durabilité vient en dernier.
const ORDER = ["bike-day", "track-day", "cp-day", "durability-bike", "durability-run"] as const;

export interface PlannedDay { day: (typeof ORDER)[number]; label: string; dayNumber: number; covers: string[]; session: TestingWeekNolioSession }

/**
 * Tout tester en quelques jours : un Day par jour, au moins 48 h entre deux Days du même sport,
 * les Days vélo et course alternent. `all` : tous les Days ; sinon seulement ceux
 * qui couvrent un test à faire ou à retester.
 */
export function buildTestingPlan(checklist: TestChecklist, all = false): PlannedDay[] {
  const selected = ORDER.filter(d => checklist.items.some(i => i.day === d && (all || i.status !== "ok")));
  const lastBySport: Record<string, number> = {};
  let previous = -1;
  return selected.map(day => {
    const def = DAY_BUILDERS[day];
    const offset = Math.max(previous + 1, (lastBySport[def.sport] ?? -10) + 2);
    previous = offset; lastBySport[def.sport] = offset;
    const session = { ...def.build(), weekNumber: 1 + Math.floor(offset / 7), dayIndex: offset % 7 };
    return { day, label: def.label, dayNumber: offset + 1, covers: checklist.items.filter(i => i.day === day).map(i => i.label), session };
  });
}
