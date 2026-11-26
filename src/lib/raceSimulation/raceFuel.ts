/**
 * GLUCIDES DE COURSE INDIVIDUALISÉS (26/11/2026)
 *
 * Trois étages, du plus général au plus personnel :
 * 1. Plafond selon la durée (Jeukendrup 2014 : jusqu'à 30 g/h pour 1–2 h, 60 g/h pour 2–3 h,
 *    90 g/h au-delà avec glucose + fructose ; jusqu'à 120 g/h chez un intestin entraîné).
 * 2. Dépense de l'athlète à SA cible de course : modèle de Mader (VO2max, VLamax, poids,
 *    rendement vélo 23 %, coût de la course ≈ 200 ml O2/kg/km), le même que la courbe
 *    « Ce qui alimente ton effort » des rapports. On ne conseille pas d'avaler plus que ce
 *    qu'on brûle : l'intensité basse réduit les besoins (Jeukendrup 2014).
 * 3. Tolérance testée à l'entraînement (fiche athlète) : limite pratique ; en course à pied,
 *    75 % de cette tolérance (inconfort digestif plus fréquent qu'à vélo).
 * Puis un bilan de glycogène sur toute la course (réserve ≈ 7 g/kg, dont 70 % mobilisables) :
 * si la réserve plus l'apport ne couvrent pas la dépense, l'apport monte jusqu'aux plafonds,
 * et l'écart restant est signalé.
 */
import { calculateCarbOxidation } from "@/lib/v2/maderMetabolicModel";

const KJ_PER_L_O2 = 20.9;
const BIKE_EFFICIENCY = 0.23;
/** Coût en oxygène de la course à pied (ml/kg par mètre), ≈ 200 ml/kg/km. */
const RUN_O2_PER_M = 0.2;
const GLYCOGEN_G_PER_KG = 7;
const GLYCOGEN_USABLE = 0.7;
const HEAT_FACTOR = 1.1;
const round5 = (x: number) => Math.round(x / 5) * 5;
const positive = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

export interface FuelProfile {
  weightKg: number | null;
  vo2max: number | null;
  vlamaxBike: { value: number; measured: boolean } | null;
  vlamaxRun: { value: number; measured: boolean } | null;
  /** Tolérance testée à l'entraînement (g/h). */
  toleranceGH: number | null;
  heat?: boolean;
}

/** % VO2max demandé par une cible : watts (vélo) ou allure en s/km (course). */
export function targetIntensityPct(sport: "bike" | "run", target: number, weightKg: number, vo2max: number): number {
  const vo2LMin = sport === "bike"
    ? (target / BIKE_EFFICIENCY) * 60 / 1000 / KJ_PER_L_O2
    : (RUN_O2_PER_M * (1000 / target) * 60) * weightKg / 1000;
  return (vo2LMin / (vo2max * weightKg / 1000)) * 100;
}

/** Glucides brûlés (g/h) à la cible, ou null si VO2max, VLamax ou poids manquent. */
export function carbBurnGH(sport: "bike" | "run", target: number, p: FuelProfile): number | null {
  const vla = sport === "bike" ? p.vlamaxBike : p.vlamaxRun ?? p.vlamaxBike;
  if (!positive(p.weightKg) || !positive(p.vo2max) || !vla || !positive(vla.value)) return null;
  const pct = Math.min(100, targetIntensityPct(sport, target, p.weightKg, p.vo2max));
  return calculateCarbOxidation(pct, p.vo2max, vla.value, p.weightKg) * 60 * (p.heat ? HEAT_FACTOR : 1);
}

export interface FuelSegmentIn { sport: "swim" | "bike" | "run"; minutes: number; target: number | null }
export interface FuelSegmentOut {
  burnGH: number | null;
  intake: [number, number];
  text: string;
  /** Pourquoi cette valeur (dépense, tolérance, plafond…). */
  why: string;
  /** Ce qui fixe le haut de l'apport conseillé. */
  limitedBy: "burn" | "tolerance" | "duration" | "run" | "floor" | "guideline";
  /** Marge appliquée à la dépense (VLamax mesurée 10 %, estimée 30 %). */
  margin: number | null;
}
export interface FuelPlan {
  method: "individual" | "guideline";
  segments: Partial<Record<"bike" | "run", FuelSegmentOut>>;
  glycogenG: number | null;
  needG: number | null;
  supplyG: number | null;
  warning: string | null;
  notes: string[];
}

/** Plafond « jusqu'à » selon la durée totale de l'épreuve (Jeukendrup 2014). */
export function durationCeiling(raceMin: number, toleranceGH: number | null): number | null {
  if (raceMin < 60) return null;
  if (raceMin < 120) return 30;
  if (raceMin < 150) return 60;
  return positive(toleranceGH) && toleranceGH > 90 ? Math.min(120, toleranceGH) : 90;
}

/**
 * Apport conseillé par segment. `raceMin` = durée totale de l'épreuve (le jour même) ;
 * `budget` = faire le bilan de glycogène sur l'ensemble des segments (épreuve enchaînée).
 */
export function planRaceFuel(segs: FuelSegmentIn[], raceMin: number, p: FuelProfile, budget = true): FuelPlan {
  const ceilDur = durationCeiling(raceMin, p.toleranceGH);
  const notes: string[] = [];
  const out: FuelPlan["segments"] = {};
  if (ceilDur == null) return { method: "guideline", segments: out, glycogenG: null, needG: null, supplyG: null, warning: null, notes: ["Moins d'une heure : pas besoin de manger, un rinçage de bouche avec une boisson sucrée suffit."] };
  // Plancher sur les longues épreuves : protéger le glycogène du foie et la glycémie, même si le
  // modèle estime une faible dépense (l'estimation de VLamax peut se tromper).
  const floor = raceMin >= 240 ? 45 : raceMin >= 150 ? 40 : raceMin >= 120 ? 30 : 0;
  const tol = positive(p.toleranceGH) ? p.toleranceGH : null;
  if (!tol) notes.push("Tolérance non testée : plafond général (90 g/h à vélo, 60 g/h en course).");
  const capFor = (sport: "bike" | "run"): { cap: number; why: FuelSegmentOut["limitedBy"] } => {
    const sportCap = sport === "bike" ? (tol ?? 90) : (tol ? round5(tol * 0.75) : 60);
    if (sportCap >= ceilDur) return { cap: ceilDur, why: "duration" };
    return { cap: sportCap, why: tol ? "tolerance" : sport === "run" ? "run" : "duration" };
  };
  const burns = new Map<FuelSegmentIn, number | null>();
  for (const s of segs) burns.set(s, s.sport === "swim" ? null : s.target != null ? carbBurnGH(s.sport, s.target, p) : null);
  const eat = segs.filter(s => s.sport !== "swim" && s.minutes >= 30) as (FuelSegmentIn & { sport: "bike" | "run" })[];
  const individual = eat.length > 0 && eat.every(s => burns.get(s) != null);

  for (const s of eat) {
    const { cap, why } = capFor(s.sport);
    const burn = burns.get(s) ?? null;
    let hi: number, limitedBy: FuelSegmentOut["limitedBy"], margin: number | null = null;
    if (burn != null) {
      // VLamax estimée : marge de 30 % sur la dépense pour ne pas sous-alimenter.
      const vla = s.sport === "bike" ? p.vlamaxBike : p.vlamaxRun ?? p.vlamaxBike;
      margin = vla?.measured ? 0.1 : 0.3;
      const wanted = round5(burn * (1 + margin));
      hi = Math.min(cap, Math.max(floor, wanted));
      limitedBy = wanted > cap ? why : wanted < floor ? "floor" : "burn";
    } else {
      hi = cap; limitedBy = "guideline";
    }
    const lo = Math.min(hi, Math.max(floor, hi - 15));
    out[s.sport] = { burnGH: burn, intake: [lo, hi], text: "", why: "", limitedBy, margin };
  }

  // Bilan de glycogène (épreuve enchaînée, dépense connue).
  let glycogenG: number | null = null, needG: number | null = null, supplyG: number | null = null, warning: string | null = null;
  if (budget && individual && positive(p.weightKg)) {
    glycogenG = p.weightKg * GLYCOGEN_G_PER_KG * GLYCOGEN_USABLE;
    const bikeBurn = segs.map(s => burns.get(s)).find((b, i) => segs[i].sport === "bike" && b != null) ?? null;
    // Natation : pas de mesure de dépense ; approximée par celle du vélo (même domaine d'intensité).
    needG = segs.reduce((sum, s) => sum + ((s.sport === "swim" ? bikeBurn : burns.get(s)) ?? 0) * s.minutes / 60, 0);
    const supply = () => glycogenG! + eat.reduce((sum, s) => sum + ((out[s.sport]!.intake[0] + out[s.sport]!.intake[1]) / 2) * s.minutes / 60, 0);
    supplyG = supply();
    if (supplyG < needG) {
      const hours = eat.reduce((h, s) => h + s.minutes / 60, 0);
      const add = (needG - supplyG) / hours;
      for (const s of eat) {
        const o = out[s.sport]!, { cap, why } = capFor(s.sport);
        const hi = Math.min(cap, round5(o.intake[1] + add + 2.4));
        if (hi > o.intake[1]) { o.intake = [Math.min(hi, Math.max(o.intake[0], round5(o.intake[0] + add))), hi]; o.limitedBy = hi === cap ? why : "burn"; }
      }
      supplyG = supply();
      if (supplyG < needG) warning = `Même au maximum toléré, l'apport (${Math.round(supplyG - glycogenG)} g) et la réserve (${Math.round(glycogenG)} g) couvrent mal la dépense estimée (${Math.round(needG)} g) : risque de panne en fin d'épreuve. Entraîner l'intestin à plus de glucides ou baisser un peu l'intensité.`;
    }
  }

  for (const s of eat) {
    const o = out[s.sport]!;
    const range = o.intake[0] === o.intake[1] ? `${o.intake[1]} g/h` : `${o.intake[0]}–${o.intake[1]} g/h`;
    const burnText = o.burnGH != null ? `dépense ≈ ${Math.round(o.burnGH)} g/h` : null;
    const why = o.limitedBy === "burn" ? `dépense ≈ ${Math.round(o.burnGH!)} g/h + ${Math.round((o.margin ?? 0) * 100)} % de marge${o.margin && o.margin > 0.2 ? " (VLamax estimée)" : ""}`
      : o.limitedBy === "floor" ? `${burnText} : minimum conseillé sur une épreuve aussi longue`
      : o.limitedBy === "tolerance" ? `${burnText ? burnText + ", " : ""}plafonné par la tolérance testée`
      : o.limitedBy === "run" ? `${burnText ? burnText + ", " : ""}plafond en course à pied (digestion)`
      : o.limitedBy === "duration" ? `${burnText ? burnText + ", " : ""}plafond pour cette durée`
      : "repère général (dépense non calculable)";
    o.text = range;
    o.why = why;
  }
  return { method: individual ? "individual" : "guideline", segments: out, glycogenG, needG, supplyG, warning, notes };
}
