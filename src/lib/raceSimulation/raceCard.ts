/**
 * CARTE DE COURSE — moteur unique de la simulation (26/11/2026).
 *
 * Une course → des segments (natation, transitions, vélo, course) avec, pour chacun :
 * la cible (watts ou allure), le temps prévu et sa fourchette, les glucides conseillés,
 * la FC repère et la provenance des données. La page Simulation, son export et la
 * comparaison prévu / réel lisent tous ce résultat : un seul chiffre par segment.
 *
 * Modèles (audit du 26/11/2026, sources dans les commentaires) :
 * - Vélo : raceBikePower (source unique partagée avec plans et rapports).
 * - Course seule : vitesse = vitesse critique × (durée / 40 min)^(−k), k selon l'ambition
 *   (durabilité). Calé sur Smyth et Muniz-Pumares 2020 (25 000 marathoniens : 93 % de la CS
 *   pour 2 h 30, ≈ 85 % pour 4 h, 79 % pour 6 h) ; la CS se tient ≈ 30–40 min (Jones 2019).
 * - Course après le vélo : fraction de l'allure seuil par ambition (calibration TFCL des
 *   triathlons, runSplitEstimator), plus prudente que la course seule.
 * - Natation : CSS + 2 à 5 % selon la distance (Swim Smooth ; Ironman en eau libre ≈ CSS + 5 %).
 * - Glucides : repères de Jeukendrup 2014 selon la durée (60 g/h pour 2–3 h, jusqu'à 90 g/h
 *   au-delà avec glucose + fructose), moins en course à pied (tolérance digestive).
 * Aucune valeur inventée : une donnée absente est listée dans `missing` avec le bloc de la fiche.
 */
import { raceBikePower, raceBikeSpeedKmh, type RaceBikePowerResult } from "./raceBikePower";
import { estimateRunSplitMin, V_SEUIL_FRACTION_BY_AMBITION, normalizeToRunSplitAmbition } from "@/lib/v2/runSplitEstimator";
import { anchoredBikeGrid, anchoredRunGrid, type AnchoredGrid, type AnchoredGridSnapshot } from "@/lib/zones/anchoredZoneGrid";
import type { SheetBlockId } from "@/lib/snapshotSheet";
import { planRaceFuel, type FuelPlan } from "./raceFuel";

export type RaceKind = "IM" | "703" | "Olympic" | "Sprint" | "Marathon" | "Semi" | "10K";
export type RaceSupport = { kind: RaceKind } | { kind: null; reason: "not_needed" | "trail" | "unknown" };
export type SegmentSport = "swim" | "t1" | "bike" | "t2" | "run";
export type Confidence = "measured" | "estimated" | "missing";

export const RACE_LABEL: Record<RaceKind, string> = {
  IM: "Ironman", "703": "Ironman 70.3", Olympic: "Triathlon olympique", Sprint: "Triathlon sprint",
  Marathon: "Marathon", Semi: "Semi-marathon", "10K": "10 km",
};
const DIST: Record<RaceKind, { swim?: number; bike?: number; run: number }> = {
  IM: { swim: 3.8, bike: 180, run: 42.195 }, "703": { swim: 1.9, bike: 90, run: 21.0975 },
  Olympic: { swim: 1.5, bike: 40, run: 10 }, Sprint: { swim: 0.75, bike: 20, run: 5 },
  Marathon: { run: 42.195 }, Semi: { run: 21.0975 }, "10K": { run: 10 },
};
/** Transitions : repères types (min), affichés comme tels. */
const TRANSITIONS: Partial<Record<RaceKind, [number, number]>> = { IM: [6, 4], "703": [4, 3], Olympic: [2, 1.5], Sprint: [1.5, 1] };
/** Natation : allure de course = CSS × facteur (eau libre, distance). */
const SWIM_FACTOR: Partial<Record<RaceKind, number>> = { Sprint: 1.02, Olympic: 1.03, "703": 1.04, IM: 1.05 };
/** Durabilité (exposant de fatigue) selon l'ambition ; vitesse = CS × (T / 40)^(−k). */
const RUN_FATIGUE_K: Record<string, number> = { world_class: 0.03, elite: 0.04, competitor: 0.06, age_group: 0.085, finisher: 0.1 };
const CS_REFERENCE_MIN = 40;
/** Au-delà de 94 % de la CS sur la 1re moitié, le risque de ralentir de plus de 25 % augmente (Smyth 2020). */
export const CS_FIRST_HALF_LIMIT = 0.94;

export function raceKindFromObjective(raw: string | null | undefined): RaceSupport {
  const s = String(raw ?? "").trim().toLowerCase().replace(/[\s._-]/g, "");
  if (!s) return { kind: null, reason: "unknown" };
  if (s.includes("trail") || s.includes("ultra") || s.includes("skyrace")) return { kind: null, reason: "trail" };
  if (s === "starttorun" || s === "5k" || s === "5km") return { kind: null, reason: "not_needed" };
  if (s.includes("703") || s.includes("halfiron") || s === "ims") return { kind: "703" };
  if (s === "im" || s.includes("ironman") || s === "full" || s === "fullim") return { kind: "IM" };
  if (s.includes("olymp") || s === "od") return { kind: "Olympic" };
  if (s.includes("sprint")) return { kind: "Sprint" };
  if (s.includes("semi") || s.includes("halfmarathon") || s === "21k" || s === "hm") return { kind: "Semi" };
  if (s.includes("marathon")) return { kind: "Marathon" };
  if (s === "10k" || s === "10km") return { kind: "10K" };
  return { kind: null, reason: "unknown" };
}
export const isTriathlon = (k: RaceKind) => k === "IM" || k === "703" || k === "Olympic" || k === "Sprint";

export interface RaceCardAthlete {
  ambition: string | null;
  weightKg: number | null;
  ftpW: number | null;
  cssSecPer100: number | null;
  vo2max: number | null;
  tteBikeMin: number | null;
  /** VLamax effectives (mesurée = labo ou mode Staff) : dépense en glucides. */
  vlamaxBike?: { value: number; measured: boolean } | null;
  vlamaxRun?: { value: number; measured: boolean } | null;
  /** Glucides tolérés à l'entraînement (g/h, fiche athlète). */
  carbToleranceGH?: number | null;
  /** Bilan (FTP, allure seuil, VMA, CP/CS confirmées, provenance, FC, chronos). */
  snapshot: (AnchoredGridSnapshot & {
    time_10k_sec?: number | null; time_10k_date?: string | null; time_half_sec?: number | null; time_half_date?: string | null;
    time_marathon_sec?: number | null; time_marathon_date?: string | null; vlamax_run?: number | null;
  }) | null;
  fcMax: number | null;
}

export interface RaceCardInput {
  kind: RaceKind;
  /** Long Course Weekend : natation, vélo et course sur 3 jours séparés (IM et 70.3). */
  lcw?: boolean;
  /** Course annoncée chaude (> 25 °C) : dépense en glucides + 10 %. */
  heat?: boolean;
  athlete: RaceCardAthlete;
  today?: string;
}

export interface Target { text: string; value: number; range: [number, number]; unit: "W" | "s/km" | "s/100m" }
export interface RaceSegment {
  sport: SegmentSport;
  label: string;
  /** Jour de course (Long Course Weekend), sinon absent. */
  day?: 1 | 2 | 3;
  distanceKm: number | null;
  target: Target | null;
  timeMin: number | null;
  timeRange: [number, number] | null;
  carbs: { text: string; why: string; gh: [number, number]; burnGH: number | null } | null;
  hr: string | null;
  confidence: Confidence;
  source: string;
  note?: string;
}
export interface MissingField { label: string; block: SheetBlockId | "athlete"; why: string }
export interface RaceCard {
  kind: RaceKind;
  label: string;
  lcw: boolean;
  segments: RaceSegment[];
  totalMin: number | null;
  totalRange: [number, number] | null;
  /** Total partiel : un segment n'a pas pu être calculé. */
  partial: boolean;
  rules: string[];
  missing: MissingField[];
  ambitionAssumed: boolean;
  bike: RaceBikePowerResult | null;
  fuel: { method: FuelPlan["method"]; glycogenG: number | null; needG: number | null; supplyG: number | null; warning: string | null; notes: string[] };
  run: { csKmh: number; measured: boolean; source: string; standalone: boolean; fractionOfCs: number; recorded: { timeSec: number; date: string | null } | null } | null;
}

const positive = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
export const fmtPace = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
export const fmtDuration = (min: number) => {
  const total = Math.round(min);
  const h = Math.floor(total / 60), m = total % 60;
  return h ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
};
const zoneHr = (grid: AnchoredGrid | null, value: number) => {
  const z = grid?.zones.find(z => value >= z.min && (z.max == null || value <= z.max));
  return z?.hr ? `${z.hr[0]}–${z.hr[1]} bpm (${z.id})` : null;
};

/** Course seule : durée (min) et fraction de la CS, par itération durée ↔ vitesse. */
export function standaloneRun(distanceKm: number, csKmh: number, ambition: string): { timeMin: number; fraction: number } {
  const k = RUN_FATIGUE_K[ambition] ?? RUN_FATIGUE_K.age_group;
  let t = (distanceKm / csKmh) * 60;
  let f = 1;
  for (let i = 0; i < 30; i++) {
    f = Math.min(1.05, Math.pow(Math.max(t, 10) / CS_REFERENCE_MIN, -k));
    t = (distanceKm / (csKmh * f)) * 60;
  }
  return { timeMin: t, fraction: f };
}


export function buildRaceCard(input: RaceCardInput): RaceCard {
  const { kind, athlete } = input;
  const lcw = !!input.lcw && (kind === "IM" || kind === "703");
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const d = DIST[kind];
  const missing: MissingField[] = [];
  const ambitionAssumed = !athlete.ambition;
  const ambition = normalizeAmbitionKey(athlete.ambition);
  if (ambitionAssumed) missing.push({ label: "Ambition de l'athlète", block: "athlete", why: "calcul fait en age-group en attendant" });
  const snap = athlete.snapshot;
  const segments: RaceSegment[] = [];
  const tri = isTriathlon(kind);

  // ── Natation ──
  let swimMin: number | null = null;
  if (tri && d.swim) {
    if (positive(athlete.cssSecPer100)) {
      const pace = athlete.cssSecPer100 * (SWIM_FACTOR[kind] ?? 1.04);
      swimMin = (pace * d.swim * 10) / 60;
      segments.push({ sport: "swim", label: `Natation ${d.swim.toLocaleString("fr-FR")} km`, day: lcw ? 1 : undefined, distanceKm: d.swim,
        target: { text: `${fmtPace(pace)}/100 m`, value: pace, range: [pace * 0.98, pace * 1.03], unit: "s/100m" },
        timeMin: swimMin, timeRange: [swimMin * 0.98, swimMin * 1.03], carbs: null, hr: null, confidence: "measured",
        source: `CSS ${fmtPace(athlete.cssSecPer100)}/100 m + ${Math.round(((SWIM_FACTOR[kind] ?? 1.04) - 1) * 100)} % (eau libre)` });
    } else {
      missing.push({ label: "CSS natation", block: "swim", why: "temps de natation" });
      segments.push({ sport: "swim", label: `Natation ${d.swim.toLocaleString("fr-FR")} km`, day: lcw ? 1 : undefined, distanceKm: d.swim, target: null, timeMin: null, timeRange: null, carbs: null, hr: null, confidence: "missing", source: "CSS manquante (Pool Day)" });
    }
  }
  const trans = tri && !lcw ? TRANSITIONS[kind] : undefined;
  if (trans) segments.push({ sport: "t1", label: "T1", distanceKm: null, target: null, timeMin: trans[0], timeRange: [trans[0] * 0.8, trans[0] * 1.3], carbs: null, hr: null, confidence: "estimated", source: "repère type" });

  // ── Vélo ──
  let bike: RaceBikePowerResult | null = null;
  let bikeMin: number | null = null;
  const bikeGrid = snap ? anchoredBikeGrid({ ...snap, ftp: athlete.ftpW ?? snap.ftp, weight_kg: athlete.weightKg ?? snap.weight_kg }, { ambition, fcMax: athlete.fcMax, today }) : null;
  if (tri && d.bike) {
    // FTP du bilan, sinon CP confirmée × 0,965 (même règle que la grille de zones).
    const ftp = positive(athlete.ftpW) ? athlete.ftpW : bikeGrid?.source === "critical_confirmed" ? bikeGrid.critical * 0.965 : null;
    if (!ftp) missing.push({ label: "FTP ou puissance critique", block: "bike", why: "puissance et temps vélo" });
    if (!positive(athlete.weightKg)) missing.push({ label: "Poids", block: "ctx", why: "vitesse donc temps vélo (durée type utilisée sinon)" });
    bike = ftp ? raceBikePower({ objective: kind, ambition, ftpW: ftp, weightKg: athlete.weightKg, tteMin: athlete.tteBikeMin }) : null;
    if (bike) {
      const timeAt = (w: number) => positive(athlete.weightKg) ? (d.bike! / raceBikeSpeedKmh(w, athlete.weightKg, bike!.ambition)) * 60 : bike!.bikeHours * 60 * Math.pow(bike!.centerW / w, 1 / 3);
      bikeMin = timeAt(bike.centerW);
      const tLo = timeAt(bike.rangeW[1]), tHi = timeAt(bike.rangeW[0]);
      segments.push({ sport: "bike", label: `Vélo ${d.bike} km`, day: lcw ? 2 : undefined, distanceKm: d.bike,
        target: { text: `${bike.rangeW[0]}–${bike.rangeW[1]} W`, value: bike.centerW, range: bike.rangeW, unit: "W" },
        timeMin: bikeMin, timeRange: [Math.min(tLo, tHi), Math.max(tLo, tHi)], carbs: null, hr: zoneHr(bikeGrid, bike.centerW),
        confidence: bikeGrid?.measured ? "measured" : "estimated", source: bike.explanation,
        note: lcw ? "Jour 2 : pas de course à pied derrière, mais deux jours d'effort à enchaîner." : undefined });
    } else {
      segments.push({ sport: "bike", label: `Vélo ${d.bike} km`, day: lcw ? 2 : undefined, distanceKm: d.bike, target: null, timeMin: null, timeRange: null, carbs: null, hr: null, confidence: "missing", source: "FTP manquante (Bike Day)" });
    }
  }
  if (trans) segments.push({ sport: "t2", label: "T2", distanceKm: null, target: null, timeMin: trans[1], timeRange: [trans[1] * 0.8, trans[1] * 1.3], carbs: null, hr: null, confidence: "estimated", source: "repère type" });

  // ── Course ──
  const runGrid = snap ? anchoredRunGrid({ ...snap }, { ambition, fcMax: athlete.fcMax, today }) : null;
  let run: RaceCard["run"] = null;
  let runMin: number | null = null;
  if (!runGrid) {
    missing.push({ label: "Allure seuil, vitesse critique ou VMA", block: "run", why: "allure et temps de course" });
    segments.push({ sport: "run", label: `Course ${d.run.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`, day: lcw ? 3 : undefined, distanceKm: d.run, target: null, timeMin: null, timeRange: null, carbs: null, hr: null, confidence: "missing", source: "Allure seuil manquante (Track Day ou test 20 min)" });
  } else {
    const csKmh = runGrid.critical;
    const standalone = !tri || lcw;
    let timeMin: number, fraction: number;
    if (standalone) {
      ({ timeMin, fraction } = standaloneRun(d.run, csKmh, ambition));
    } else {
      // Course après le vélo : fraction de l'allure seuil (CS / 1,01) par ambition et distance.
      const fr = V_SEUIL_FRACTION_BY_AMBITION[normalizeToRunSplitAmbition(ambition)];
      const vSeuil = kind === "IM" ? fr.full : kind === "703" ? fr.half : kind === "Olympic" ? Math.min(0.99, fr.half + 0.05) : Math.min(0.99, fr.half + 0.09);
      const thresholdPace = 3600 / (csKmh / 1.01);
      timeMin = estimateRunSplitMin({ distanceKm: d.run, thresholdPaceSecPerKm: thresholdPace, vSeuilFraction: vSeuil, vlamaxRun: snap?.vlamax_run ?? null }) ?? (d.run / (csKmh * vSeuil / 1.01)) * 60;
      fraction = (d.run / (timeMin / 60)) / csKmh;
    }
    runMin = timeMin;
    const pace = (timeMin * 60) / d.run;
    const recordKey = kind === "Marathon" ? "marathon" : kind === "Semi" ? "half" : kind === "10K" ? "10k" : null;
    const recSec = recordKey ? (snap as Record<string, unknown> | null)?.[`time_${recordKey}_sec`] : null;
    const recDate = recordKey ? (snap as Record<string, unknown> | null)?.[`time_${recordKey}_date`] : null;
    run = { csKmh, measured: runGrid.measured, source: runGrid.source, standalone, fractionOfCs: fraction,
      recorded: positive(recSec) && standalone ? { timeSec: recSec, date: typeof recDate === "string" ? recDate : null } : null };
    const sourceText = `${runGrid.source === "critical_confirmed" ? "vitesse critique confirmée" : runGrid.source === "vma_estimate" ? "seuil estimé depuis la VMA" : "allure seuil du bilan"} (${fmtPace(3600 / csKmh)}/km) · ${standalone ? `${Math.round(fraction * 100)} % de la vitesse critique sur cette durée` : "allure après le vélo, plus prudente qu'une course seule"}`;
    segments.push({ sport: "run", label: `Course ${d.run.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`, day: lcw ? 3 : undefined, distanceKm: d.run,
      target: { text: `${fmtPace(pace * 0.985)}–${fmtPace(pace * 1.015)}/km`, value: pace, range: [pace * 0.985, pace * 1.015], unit: "s/km" },
      timeMin, timeRange: [timeMin * 0.985, timeMin * (lcw ? 1.04 : 1.03)], carbs: null, hr: zoneHr(runGrid, 3600 / pace),
      confidence: runGrid.measured ? "measured" : "estimated", source: sourceText,
      note: lcw ? "Jour 3, après deux jours d'effort : vise le bas de la fourchette." : undefined });
    if (runGrid.source === "vma_estimate") missing.push({ label: "Allure seuil (test 20 min ou Track Day)", block: "run", why: "seuil mesuré plutôt qu'estimé depuis la VMA" });
  }

  // ── Glucides par segment (dépense individuelle, tolérance, durée ; bilan de glycogène) ──
  const profile = { weightKg: athlete.weightKg, vo2max: athlete.vo2max, vlamaxBike: athlete.vlamaxBike ?? null, vlamaxRun: athlete.vlamaxRun ?? null, toleranceGH: athlete.carbToleranceGH ?? null, heat: !!input.heat };
  const fuelIn = (s: RaceSegment) => ({ sport: s.sport as "swim" | "bike" | "run", minutes: s.timeMin ?? 0, target: s.target?.value ?? null });
  const sportSegs = segments.filter(s => (s.sport === "swim" || s.sport === "bike" || s.sport === "run") && s.timeMin != null);
  const plans = lcw
    ? sportSegs.map(s => ({ segs: [s], plan: planRaceFuel([fuelIn(s)], s.timeMin!, profile) }))
    : [{ segs: sportSegs, plan: planRaceFuel(sportSegs.map(fuelIn), segments.reduce((a, x) => a + (x.timeMin ?? 0), 0), profile) }];
  for (const { segs, plan } of plans) for (const seg of segs) {
    const f = seg.sport === "bike" || seg.sport === "run" ? plan.segments[seg.sport] : undefined;
    if (f) seg.carbs = { text: f.text, why: f.why, gh: f.intake, burnGH: f.burnGH };
  }
  const main = plans.find(p => p.plan.needG != null)?.plan ?? plans[0]?.plan ?? null;
  const fuel = { method: plans.some(p => p.plan.method === "individual") ? "individual" as const : "guideline" as const,
    glycogenG: lcw ? null : main?.glycogenG ?? null, needG: lcw ? null : main?.needG ?? null, supplyG: lcw ? null : main?.supplyG ?? null,
    warning: plans.map(p => p.plan.warning).find(Boolean) ?? null, notes: [...new Set(plans.flatMap(p => p.plan.notes))] };
  if (fuel.method === "guideline" && sportSegs.some(s => s.sport !== "swim" && (s.timeMin ?? 0) >= 60)) {
    if (!positive(athlete.vo2max)) missing.push({ label: "VO₂max", block: "labo", why: "glucides brûlés à la cible (repère général sinon)" });
  }
  if (!positive(athlete.carbToleranceGH) && sportSegs.some(s => (s.timeMin ?? 0) >= 90)) missing.push({ label: "Glucides tolérés à l'entraînement", block: "ctx", why: "plafond personnel des glucides (90 g/h vélo, 60 g/h course sinon)" });

  const partial = segments.some(s => s.timeMin == null);
  const totalMin = segments.length && !lcw ? segments.reduce((s, x) => s + (x.timeMin ?? 0), 0) : null;
  const totalRange: [number, number] | null = totalMin != null ? [segments.reduce((s, x) => s + (x.timeRange?.[0] ?? 0), 0), segments.reduce((s, x) => s + (x.timeRange?.[1] ?? 0), 0)] : null;

  return { kind, label: RACE_LABEL[kind], lcw, segments, fuel, totalMin: totalMin && totalMin > 0 ? totalMin : null, totalRange, partial, rules: raceRules(kind, lcw, bike, segments.find(s => s.sport === "run") ?? null), missing, ambitionAssumed, bike, run };
}

function normalizeAmbitionKey(a: string | null | undefined): string {
  const s = String(a ?? "").toLowerCase().replace(/[\s-]/g, "_");
  if (["world_class", "elite", "competitor", "age_group", "finisher"].includes(s)) return s;
  return "age_group";
}

function raceRules(kind: RaceKind, lcw: boolean, bike: RaceBikePowerResult | null, run: RaceSegment | null): string[] {
  const runLow = run?.target ? fmtPace(run.target.range[1]) : null;
  if (lcw) return [
    "Chaque jour est une course à part : départ contrôlé à chaque fois.",
    bike ? `Vélo (jour 2) : les 30 premières minutes sous ${bike.rangeW[0]} W.` : "Vélo (jour 2) : les 30 premières minutes très faciles.",
    "Jour 3 : vise le bas de la fourchette de course, les jambes ont deux jours dans les pattes.",
    "Récupération et glucides entre les jours : repas riche en glucides le soir.",
  ];
  if (kind === "IM" || kind === "703") return [
    bike ? `Vélo : les 30 premières minutes sous ${bike.rangeW[0]} W, puis reste dans ${bike.rangeW[0]}–${bike.rangeW[1]} W.` : "Vélo : les 30 premières minutes très faciles.",
    "Mange dès la 20e minute de vélo, puis toutes les 20 minutes, sans attendre la faim.",
    runLow ? `Course : les 3 premiers km plus lents que ${runLow}/km, même si les jambes semblent bonnes.` : "Course : les 3 premiers km plus lents que prévu.",
    "En montée ou face au vent, garde les watts, pas la vitesse.",
  ];
  if (kind === "Olympic" || kind === "Sprint") return [
    "Vélo : à la cible dès la sortie de T1, sans à-coups dans les relances.",
    "Course : 1er km 5 s/km plus lent que la cible, puis régulier.",
    "Le dernier quart de la course à pied se court au mental : accélère seulement là.",
  ];
  const half = kind === "Marathon" ? "30e km" : kind === "Semi" ? "15e km" : "7e km";
  return [
    "1er km 5 à 10 s/km plus lent que la cible.",
    `Allure régulière dans la fourchette jusqu'au ${half}, puis accélère si tout va bien.`,
    "Ne pars pas au-dessus de la cible haute : au-delà de 94 % de la vitesse critique sur la 1re moitié, le risque de craquer augmente nettement (Smyth 2020).",
  ];
}

// ── Curseurs « et si » ──
export interface BikeWhatIf { watts: number; timeMin: number; deltaMin: number; tss: number; tssRange: [number, number]; verdict: "below" | "ok" | "risky" | "high" }
/** Vélo : +/- W → temps (même physique) et charge TSS par rapport à la charge visée. */
export function bikeWhatIf(card: RaceCard, offsetW: number, weightKg: number | null): BikeWhatIf | null {
  const b = card.bike, seg = card.segments.find(s => s.sport === "bike");
  if (!b || !seg?.timeMin || !seg.distanceKm) return null;
  const watts = Math.max(50, b.centerW + offsetW);
  const timeMin = positive(weightKg) ? (seg.distanceKm / raceBikeSpeedKmh(watts, weightKg, b.ambition)) * 60 : seg.timeMin * Math.pow(b.centerW / watts, 1 / 3);
  const ftp = b.centerW / b.centerIF;
  const tss = Math.round((timeMin / 60) * Math.pow(watts / ftp, 2) * 100);
  const [lo, hi] = b.tssRange;
  const verdict = tss < lo * 0.95 ? "below" : tss <= hi ? "ok" : tss <= hi * 1.1 ? "risky" : "high";
  return { watts, timeMin, deltaMin: timeMin - seg.timeMin, tss, tssRange: b.tssRange, verdict };
}

export interface RunWhatIf { paceSec: number; timeMin: number; deltaMin: number; fractionOfCs: number; risky: boolean }
/** Course : +/- s/km → temps et % de la vitesse critique (seuil de risque Smyth 2020 en course seule). */
export function runWhatIf(card: RaceCard, offsetSecPerKm: number): RunWhatIf | null {
  const seg = card.segments.find(s => s.sport === "run");
  if (!seg?.target || !seg.timeMin || !seg.distanceKm || !card.run) return null;
  const paceSec = Math.max(150, seg.target.value + offsetSecPerKm);
  const timeMin = (paceSec * seg.distanceKm) / 60;
  const fractionOfCs = (3600 / paceSec) / card.run.csKmh;
  const limit = card.run.standalone ? Math.max(CS_FIRST_HALF_LIMIT, card.run.fractionOfCs + 0.02) : card.run.fractionOfCs + 0.03;
  return { paceSec, timeMin, deltaMin: timeMin - seg.timeMin, fractionOfCs, risky: fractionOfCs > limit };
}
