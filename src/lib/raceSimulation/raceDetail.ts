/**
 * DÉTAIL DE COURSE (26/11/2026) : ce que l'athlète fait sur le terrain, segment par segment.
 *
 * Vélo — les watts de la carte sont la puissance normalisée (NP) visée : la charge TSS se calcule sur la NP.
 *   Puissance par terrain = % de la cible, avec un plafond en % de la FTP selon la distance
 *   (repères de coaching ; indice de variabilité NP / moyenne ≤ 1,05 en Ironman et 70.3, Allen et Coggan).
 * Course — allure par pente à effort égal : coût énergétique de Minetti et al. 2002 (J/kg/m selon la pente) ;
 *   descente limitée à la cible − 10 s/km (préserver les quadriceps). Passages : départ plus lent puis allure.
 * Hydratation — `computeHydrationProtocol` (Baker 2017, Sawka 2007, Hew-Butler 2015) : sueur testée de la fiche,
 *   sinon estimée (poids, sport), chaleur incluse.
 * Ravitaillement — plan toutes les 15 à 20 min avec les produits de l'athlète (sinon produits types) :
 *   la boisson apporte au plus la moitié des glucides, le reste en barres (1re partie du vélo long) puis gels ;
 *   sodium complété par capsules si besoin. Pas de calcul de cible ici : les g/h viennent de raceFuel.
 */
import { computeHydrationProtocol } from "@/lib/hydrationProtocol";
import { DEFAULT_PRODUCTS, type RaceProducts, type ProductKind } from "./raceNutritionProfile";

export type DetailKind = "IM" | "703" | "Olympic" | "Sprint" | "Marathon" | "Semi" | "10K";
const round5 = (x: number) => Math.round(x / 5) * 5;
const fmtPace = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
/** Chrono : « 32:10 » sous l'heure, « 1:02:30 » au-delà. */
export const fmtClock = (min: number) => {
  const sec = Math.round(min * 60), h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
};

/** Heure de prise : « 39 min », « 1 h 39 ». */
const fmtHm = (min: number) => { const m = Math.round(min), h = Math.floor(m / 60); return h ? `${h} h ${String(m % 60).padStart(2, "0")}` : `${m} min`; };

// ── Vélo ──
export interface TerrainRow { terrain: string; target: string; how: string }
export interface BikeDetail { npW: number; avgW: [number, number]; viMax: number; capW: number; speedKmh: number | null; wPerKg: number | null; terrain: TerrainRow[]; passages: { km: number; clock: string }[] }

/** Plafonds en % de la FTP : effort long (> 5 min) et effort court (relance, côte < 2 min). */
const BIKE_CAPS: Record<"IM" | "703" | "Olympic" | "Sprint", { long: number; short: number; vi: number }> = {
  IM: { long: 0.85, short: 1.0, vi: 1.05 }, "703": { long: 0.92, short: 1.05, vi: 1.05 },
  Olympic: { long: 1.0, short: 1.15, vi: 1.06 }, Sprint: { long: 1.05, short: 1.2, vi: 1.08 },
};

export function bikeDetail(kind: "IM" | "703" | "Olympic" | "Sprint", o: { centerW: number; rangeW: [number, number]; ftpW: number; weightKg: number | null; distanceKm: number; timeMin: number; startClockMin: number }): BikeDetail {
  const caps = BIKE_CAPS[kind];
  const np = Math.round(o.centerW);
  const w = (pct: number, capPct: number) => Math.round(Math.min(np * pct, o.ftpW * capPct));
  const range = (lo: number, hi: number, cap: number) => { const a = w(lo, cap), b = w(hi, cap); return a === b ? `≤ ${b} W` : `${a}–${b} W`; };
  const longCap = Math.round(o.ftpW * caps.long), shortCap = Math.round(o.ftpW * caps.short);
  const terrain: TerrainRow[] = [
    { terrain: "Plat", target: `${o.rangeW[0]}–${o.rangeW[1]} W`, how: "Position aéro, puissance régulière : c'est là que se gagne le temps." },
    { terrain: "Vent de face, faux plat montant (1–3 %)", target: range(1.02, 1.07, caps.long), how: "Un peu plus de watts, pas plus : la vitesse baisse, c'est normal." },
    { terrain: "Côte longue (plus de 5 min)", target: range(1.05, 1.1, caps.long), how: `Petit braquet, assis. Jamais au-dessus de ${longCap} W sur la durée.` },
    { terrain: "Côte courte, relance (moins de 2 min)", target: range(1.1, 1.2, caps.short), how: `Pic toléré jusqu'à ${shortCap} W, puis retour à la cible dès le sommet.` },
    { terrain: "Vent de dos, faux plat descendant", target: range(0.9, 0.97, caps.long), how: "Garde la pression sur les pédales, sans chercher la vitesse." },
    { terrain: "Descente", target: `pédale si ≥ ${Math.round(np * 0.6)} W`, how: "Au-delà de 45 km/h environ : roue libre en position aéro, récupère et bois." },
  ];
  const speed = o.timeMin > 0 ? o.distanceKm / (o.timeMin / 60) : null;
  const step = o.distanceKm >= 150 ? 45 : o.distanceKm >= 80 ? 30 : o.distanceKm >= 35 ? 10 : 5;
  const passages: BikeDetail["passages"] = [];
  for (let km = step; km < o.distanceKm - 1; km += step) passages.push({ km, clock: fmtClock(o.startClockMin + o.timeMin * km / o.distanceKm) });
  passages.push({ km: o.distanceKm, clock: fmtClock(o.startClockMin + o.timeMin) });
  return { npW: np, avgW: [Math.round(np / caps.vi), np], viMax: caps.vi, capW: longCap, speedKmh: speed, wPerKg: o.weightKg ? np / o.weightKg : null, terrain, passages };
}

// ── Course ──
/** Coût énergétique de la course selon la pente (Minetti et al. 2002), J/kg/m ; pente en fraction. */
export const minettiCost = (i: number) => 155.4 * i ** 5 - 30.4 * i ** 4 - 43.3 * i ** 3 + 46.3 * i ** 2 + 19.5 * i + 3.6;
export interface RunSplit { label: string; pace: string; clock: string; fromKm: number; toKm: number }
export interface RunDetail { terrain: TerrainRow[]; splits: RunSplit[]; passages: { km: number; runTime: string; clock: string }[] }

export function runDetail(kind: DetailKind, o: { paceSec: number; distanceKm: number; timeMin: number; startClockMin: number; afterBike: boolean; ambition: string }): RunDetail {
  const p = o.paceSec;
  const atGrade = (g: number) => p * minettiCost(g) / minettiCost(0);
  const terrain: TerrainRow[] = [
    { terrain: "Plat", target: `${fmtPace(p * 0.985)}–${fmtPace(p * 1.015)}/km`, how: "Allure régulière, foulée relâchée." },
    { terrain: "Faux plat montant (2 %)", target: `≈ ${fmtPace(atGrade(0.02))}/km`, how: "Même effort (même FC, même souffle) : l'allure ralentit, c'est voulu." },
    { terrain: "Côte (5 %)", target: `≈ ${fmtPace(atGrade(0.05))}/km`, how: "Petits pas, bras actifs ; ne rattrape pas le temps perdu au sommet." },
    { terrain: "Descente", target: `pas plus vite que ${fmtPace(p - 10)}/km`, how: "Laisse rouler sans freiner ni forcer : les quadriceps servent jusqu'au bout." },
    { terrain: "Ravitaillement", target: o.afterBike && (o.ambition === "age_group" || o.ambition === "finisher") ? "marche 10–15 s" : "ralentis 5 s", how: "Prends le temps de boire et manger vraiment : c'est plus rapide qu'une panne." },
  ];
  // Départ plus lent puis allure ajustée pour tenir le temps prévu.
  const d = o.distanceKm;
  const startKm = d >= 40 ? 3 : d >= 20 ? 2 : 1;
  const startPace = p * (o.afterBike ? 1.03 : 1.02);
  const restPace = (o.timeMin * 60 - startKm * startPace) / (d - startKm);
  const lastKm = d >= 40 ? 10 : d >= 20 ? 5 : d >= 10 ? 2 : 1;
  const tAt = (km: number) => km <= startKm ? km * startPace : startKm * startPace + (km - startKm) * restPace;
  const clock = (km: number) => fmtClock(o.startClockMin + tAt(km) / 60);
  const fmtKm = (km: number) => km.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  const splits: RunSplit[] = [
    { label: `Km 0 à ${startKm}`, pace: `${fmtPace(startPace)}/km`, clock: clock(startKm), fromKm: 0, toKm: startKm },
    { label: `Km ${startKm} à ${fmtKm(d - lastKm)}`, pace: `${fmtPace(restPace)}/km`, clock: clock(d - lastKm), fromKm: startKm, toKm: d - lastKm },
    { label: `${lastKm} derniers km`, pace: `${fmtPace(restPace)}/km ou plus vite`, clock: clock(d), fromKm: d - lastKm, toKm: d },
  ];
  const marks = d >= 40 ? [5, 10, 15, 21.1, 25, 30, 35] : d >= 20 ? [5, 10, 15] : d >= 9 ? [2, 5, 8] : [1, 2, 3, 4];
  const passages = [...marks.filter(m => m < d - 0.5), d].map(km => ({ km, runTime: fmtClock(tAt(km) / 60), clock: clock(km) }));
  return { terrain, splits, passages };
}

// ── Hydratation et ravitaillement ──
export interface FeedEvent { clock: string; segMin: number; items: string[] }
export interface SegmentFeed {
  fluidMlH: number; sodiumMgH: number; sweatMlH: number; sweatSource: "measured" | "estimated";
  carbsTargetGH: number | null; carbsPlannedGH: number | null; sodiumPlannedMgH: number;
  events: FeedEvent[]; tips: string[];
  counts: Partial<Record<ProductKind | "salt", number>>; drinkMl: number; waterMl: number;
}
export interface FeedProfile { weightKg: number | null; sweatRateMlH: number | null; salty: boolean | null; heat: boolean; products: RaceProducts }

const SALT_MG = 200;

export function segmentFeed(o: {
  sport: "bike" | "run"; kind: DetailKind; minutes: number; raceMin: number; startClockMin: number;
  carbsGH: [number, number] | null; profile: FeedProfile;
}): SegmentFeed {
  const { profile: pf, minutes } = o;
  const hyd = computeHydrationProtocol({ weightKg: pf.weightKg, durationMin: o.raceMin, sport: o.sport,
    measuredSweatRateMlH: pf.sweatRateMlH, sodiumPhenotype: pf.salty ? "salty" : "average", tempC: pf.heat ? 28 : 18 });
  // En courant, l'estomac accepte moins : 700 ml/h au plus.
  const fluid = round5(o.sport === "run" ? Math.min(700, hyd.fluidTargetMlH) : Math.min(800, hyd.fluidTargetMlH));
  const sodiumGoal = Math.round(hyd.sodiumMgPerH * fluid / Math.max(1, hyd.fluidTargetMlH));
  const { gel, bar, drink } = pf.products;
  const drinkConc = drink.carbsG / (drink.volumeMl ?? DEFAULT_PRODUCTS.drink.volumeMl!);
  const drinkNa = drink.sodiumMg / (drink.volumeMl ?? DEFAULT_PRODUCTS.drink.volumeMl!);
  const target = o.carbsGH ? round5((o.carbsGH[0] + o.carbsGH[1]) / 2) : null;
  // Boisson : au plus la moitié des glucides et pas plus que ce qu'on boit.
  const drinkMlH = target ? Math.min(fluid, round5((target * 0.5) / drinkConc)) : 0;
  const solidGH = target ? Math.max(0, target - drinkMlH * drinkConc) : 0;
  // Segments courts : prises plus rapprochées (toutes les 15 min) et dès la 10e minute à vélo.
  const slot = minutes < 120 ? 15 : 20;
  const events: FeedEvent[] = [];
  const counts: SegmentFeed["counts"] = {};
  let debt = 0, carbs = 0, sodium = 0, sodiumNeed = 0, drinkMl = 0, allMl = 0;
  const longBike = o.sport === "bike" && (o.kind === "IM" || o.kind === "703");
  const first = o.sport === "bike" ? (minutes < 90 ? 10 : 20) : 15;
  const end = minutes - (o.sport === "bike" ? 10 : 5);
  for (let t = first; t <= end; t += slot) {
    const last = t + slot > end;
    const items: string[] = [];
    const ml = round5(fluid * slot / 60);
    const iso = Math.min(ml, round5(drinkMlH * slot / 60));
    items.push(iso > 0 ? `Bois ${ml} ml (dont ${iso} ml de ${drink.name.toLowerCase()})` : `Bois ${ml} ml d'eau`);
    carbs += iso * drinkConc; sodium += iso * drinkNa; drinkMl += iso; allMl += ml;
    if (target) {
      debt += solidGH * slot / 60;
      // 1re partie d'un vélo long : du solide, par demi-barre si la barre est grosse.
      const barPart = bar.carbsG >= 30 ? 0.5 : 1;
      const barG = bar.carbsG * barPart;
      const solidWindow = longBike && t <= minutes * 0.6;
      if (solidWindow && debt >= barG * 0.75) {
        items.push(`${barPart === 1 ? "1" : "½"} ${bar.name.toLowerCase()} (${Math.round(barG)} g)`);
        debt -= barG; carbs += barG; sodium += bar.sodiumMg * barPart; counts.bar = (counts.bar ?? 0) + barPart;
      } else if (!solidWindow && debt >= gel.carbsG * (last ? 0.5 : 0.75)) {
        // Dernière prise du segment : on solde si au moins la moitié d'un gel reste à prendre.
        items.push(`1 ${gel.name.toLowerCase()} (${gel.carbsG} g)`);
        debt -= gel.carbsG; carbs += gel.carbsG; sodium += gel.sodiumMg; counts.gel = (counts.gel ?? 0) + 1;
      }
    }
    sodiumNeed += sodiumGoal * slot / 60;
    events.push({ clock: fmtHm(o.startClockMin + t), segMin: t, items });
  }
  // Sodium : ce que boisson et produits n'apportent pas, en capsules (≈ 200 mg).
  const deficitTotal = sodiumNeed - sodium;
  const caps = minutes >= 90 && deficitTotal / (minutes / 60) >= 150 ? Math.floor(deficitTotal / SALT_MG) : 0;
  if (caps > 0) {
    const every = Math.max(1, Math.round(events.length / caps));
    let placed = 0;
    for (let i = every - 1; i < events.length && placed < caps; i += every) { events[i].items.push(`1 capsule de sel (≈ ${SALT_MG} mg)`); placed++; }
    counts.salt = placed; sodium += placed * SALT_MG;
  }
  const hours = minutes / 60;
  const tips: string[] = [];
  if (o.sport === "bike") {
    tips.push("Les 15–20 premières minutes : seulement boire, le temps que le cœur redescende après la natation.");
    if (longBike) tips.push("Le solide (barres) dans la première moitié du vélo, quand l'intensité est basse ; ensuite gels et boisson.");
    tips.push("Dernières 10 minutes de vélo : rien de solide, prépare l'estomac pour la course.");
  } else {
    tips.push(o.kind === "Marathon" || o.kind === "Semi" || o.kind === "10K" ? "Un gel 10–15 min avant le départ si la course dure plus d'une heure." : "Premier gel après 15 minutes de course, quand la foulée est installée.");
    tips.push("Gel toujours avec quelques gorgées d'eau, jamais avec la boisson iso (trop concentré pour l'estomac).");
    if (o.kind === "IM" || o.kind === "703" || o.kind === "Marathon") tips.push("Dernier tiers : un gel caféiné ou du cola au ravito peut aider, s'il a été testé à l'entraînement.");
  }
  if (pf.heat) tips.push("Chaleur : verse de l'eau sur la tête et la nuque à chaque ravito, glace dans la trifonction si possible.");
  return { fluidMlH: fluid, sodiumMgH: sodiumGoal, sweatMlH: hyd.sweatRateMlH, sweatSource: hyd.sweatRateSource,
    carbsTargetGH: target, carbsPlannedGH: target ? Math.round(carbs / hours) : null, sodiumPlannedMgH: Math.round(sodium / hours),
    events, tips, counts, drinkMl, waterMl: allMl - drinkMl };
}
