/**
 * F4 — Carbohydrate Loading Protocol (J-2 / J-1 / Race Morning)
 *
 * Références :
 *   - Burke et al. 2011 — J Sports Sci — CHO availability
 *   - Bussau et al. 2002 — Eur J Appl Physiol — 1-day carb loading (10 g/kg)
 *   - Sherman et al. 1981 / Hawley 1997 — modified loading
 *   - Stellingwerff & Cox 2014 — Appl Physiol Nutr Metab — periodized fueling
 *   - Burke 2017 — Annu Rev Nutr — race-day strategy
 *
 * Doses :
 *   - Effort < 90 min : pas de loading, simple maintien (5-7 g/kg/j)
 *   - 90-180 min : modéré (7-8 g/kg J-1)
 *   - > 180 min : loading complet (10-12 g/kg J-1, J-2 modéré)
 *   - Pre-race meal : 1-4 g/kg, 1-4h avant départ (Burke 2011)
 *
 * Contraintes :
 *   - Low fiber (<10g) J-1 → réduit volume colique
 *   - Low fat & protein modérée → priorité CHO
 *   - Hydratation : 35-40 mL/kg + sodium 1-2 g/L
 */

export type LoadingProtocolType = "none" | "maintenance" | "moderate" | "full" | "ultra";

export interface CarbLoadingInput {
  weightKg: number | null;
  durationMin: number;       // Durée prévue de l'effort
  startTime?: string;        // HH:MM, pour le pre-race meal
  isHotRace?: boolean;       // ↑ besoins hydratation
}

export interface DailyMacroPlan {
  day: "J-2" | "J-1" | "RaceDay";
  label: string;
  carbsGKg: number;
  carbsGTotal: number;
  fluidsML: number;
  sodiumMgPerLiter: number;
  notes: string[];
}

export interface PreRaceMeal {
  timing: string;           // ex. "T-3h" ou "06:30"
  carbsGKg: number;
  carbsGTotal: number;
  composition: string[];    // ex. ["Porridge avoine + miel", "Banane", "Café"]
  notes: string[];
}

export interface CarbLoadingResult {
  isApplicable: boolean;
  reason?: string;
  protocolType: LoadingProtocolType;
  protocolLabel: string;
  days: DailyMacroPlan[];
  preRaceMeal: PreRaceMeal | null;
  dosCheckList: string[];
  dontsCheckList: string[];
  totalLoadingCarbs: number;  // Cumul J-2 + J-1 + race morning
  references: string[];
}

// =============================================
// LOGIQUE
// =============================================

function getProtocolType(durationMin: number): { type: LoadingProtocolType; label: string } {
  if (durationMin < 60)  return { type: "none",        label: "Aucun loading nécessaire" };
  if (durationMin < 90)  return { type: "maintenance", label: "Maintien standard" };
  if (durationMin < 180) return { type: "moderate",    label: "Loading modéré (J-1)" };
  if (durationMin < 360) return { type: "full",        label: "Loading complet (J-2 + J-1)" };
  return                       { type: "ultra",       label: "Loading ultra-endurance (J-3 à J-1)" };
}

function getCarbsGKgByDay(type: LoadingProtocolType): { jMinus2: number; jMinus1: number; raceDay: number } {
  switch (type) {
    case "none":         return { jMinus2: 5,  jMinus1: 5,  raceDay: 4 };
    case "maintenance":  return { jMinus2: 6,  jMinus1: 7,  raceDay: 5 };
    case "moderate":     return { jMinus2: 7,  jMinus1: 8,  raceDay: 6 };
    case "full":         return { jMinus2: 8,  jMinus1: 10, raceDay: 7 };
    case "ultra":        return { jMinus2: 9,  jMinus1: 12, raceDay: 8 };
  }
}

function getPreRaceMealOffset(durationMin: number): number {
  // Plus l'effort est long, plus on peut décaler le repas tôt (digestion + GI)
  if (durationMin < 90)  return -120; // T-2h
  if (durationMin < 240) return -180; // T-3h
  return -210;                         // T-3h30 pour ultra (gros volume)
}

function getPreRaceMealCarbsGKg(durationMin: number): number {
  // Burke 2011 : 1-4 g/kg, 1-4h avant
  if (durationMin < 90)  return 1.5;
  if (durationMin < 180) return 2.5;
  if (durationMin < 360) return 3.0;
  return 3.5;
}

function getPreRaceComposition(carbsTotal: number): string[] {
  // Décliné en aliments standards low-fiber / low-fat
  const items: string[] = [];
  let remaining = carbsTotal;
  // Base céréale (60-80g CHO selon portion)
  if (remaining > 100) {
    items.push("Porridge d'avoine fine + miel/sirop d'érable (≈ 70 g CHO)");
    remaining -= 70;
  } else if (remaining > 60) {
    items.push("Bol de riz blanc / pâtes blanches (≈ 60 g CHO)");
    remaining -= 60;
  } else {
    items.push("Tartines blanches + confiture (≈ 50 g CHO)");
    remaining -= 50;
  }
  // Fruit
  if (remaining > 25) {
    items.push("1 banane mûre (≈ 25 g CHO)");
    remaining -= 25;
  }
  // Boisson glucidique
  if (remaining > 30) {
    items.push("Boisson glucidique 500 mL (≈ 30 g CHO)");
    remaining -= 30;
  } else if (remaining > 0) {
    items.push("Jus de fruit 200 mL (≈ 20 g CHO)");
  }
  items.push("Café léger (option, voir protocole caféine)");
  return items;
}

function offsetTime(startTime: string | undefined, offsetMin: number): string {
  if (!startTime) return offsetMin < 0 ? `T${offsetMin / 60}h` : `T+${offsetMin}min`;
  const [h, m] = startTime.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return `T${offsetMin / 60}h`;
  const total = h * 60 + m + offsetMin;
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = Math.floor(wrapped / 60).toString().padStart(2, "0");
  const mm = (wrapped % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

// =============================================
// FONCTION PRINCIPALE
// =============================================

export function computeCarbLoading(input: CarbLoadingInput): CarbLoadingResult {
  const { weightKg, durationMin, startTime, isHotRace = false } = input;

  const baseRefs = [
    "Burke et al. 2011 — J Sports Sci — CHO availability",
    "Bussau et al. 2002 — 1-day carb loading 10 g/kg",
    "Sherman 1981 / Hawley 1997 — Modified loading",
    "Stellingwerff & Cox 2014 — Periodized fueling",
    "Burke 2017 — Race-day strategy",
  ];

  if (!weightKg || weightKg < 30) {
    return {
      isApplicable: false,
      reason: "Poids athlète manquant — protocole non calculable",
      protocolType: "none",
      protocolLabel: "—",
      days: [],
      preRaceMeal: null,
      dosCheckList: [],
      dontsCheckList: [],
      totalLoadingCarbs: 0,
      references: baseRefs,
    };
  }

  const { type, label } = getProtocolType(durationMin);

  // Bypass total si effort trop court
  if (type === "none") {
    return {
      isApplicable: false,
      reason: "Effort < 60 min — pas de loading nécessaire, alimentation normale.",
      protocolType: "none",
      protocolLabel: label,
      days: [],
      preRaceMeal: null,
      dosCheckList: ["Repas pré-effort léger (1-2 g/kg CHO, 1-2h avant)"],
      dontsCheckList: ["Pas de loading"],
      totalLoadingCarbs: 0,
      references: baseRefs,
    };
  }

  const dose = getCarbsGKgByDay(type);

  // Hydratation : 35 mL/kg base, +20% si chaleur
  const baseFluidsML = Math.round(35 * weightKg * (isHotRace ? 1.2 : 1.0));
  const sodiumMgPerL = isHotRace ? 1500 : 1000;

  const days: DailyMacroPlan[] = [
    {
      day: "J-2",
      label: "J-2 — Préparation",
      carbsGKg: dose.jMinus2,
      carbsGTotal: Math.round(dose.jMinus2 * weightKg),
      fluidsML: baseFluidsML,
      sodiumMgPerLiter: sodiumMgPerL,
      notes: [
        "Réduire l'entraînement (taper)",
        "Maintenir fibres normales",
        "Hydratation régulière toute la journée",
      ],
    },
    {
      day: "J-1",
      label: "J-1 — Loading principal",
      carbsGKg: dose.jMinus1,
      carbsGTotal: Math.round(dose.jMinus1 * weightKg),
      fluidsML: Math.round(baseFluidsML * 1.1),
      sodiumMgPerLiter: sodiumMgPerL,
      notes: [
        "🍞 Glucides à index glycémique modéré-haut",
        "🚫 Réduire fibres (<10 g/jour) — éviter légumes crus",
        "🚫 Limiter graisses et protéines (priorité CHO)",
        "💧 Surveiller couleur urine (paille clair)",
        type === "ultra" ? "Fractionner en 5-6 prises sur la journée" : "Fractionner en 4-5 repas",
      ],
    },
    {
      day: "RaceDay",
      label: "Jour J — Maintien glycogénique",
      carbsGKg: dose.raceDay,
      carbsGTotal: Math.round(dose.raceDay * weightKg),
      fluidsML: Math.round(baseFluidsML * 0.6), // Le reste en course
      sodiumMgPerLiter: sodiumMgPerL,
      notes: [
        "Petit-déjeuner = pre-race meal (voir bloc dédié)",
        "Snacks légers tolérés jusqu'à T-60 min (gel, banane)",
        "Hydratation : 5-7 mL/kg dans les 2h pré-départ",
      ],
    },
  ];

  // Pre-race meal
  const offsetMin = getPreRaceMealOffset(durationMin);
  const preMealCarbsGKg = getPreRaceMealCarbsGKg(durationMin);
  const preMealCarbsTotal = Math.round(preMealCarbsGKg * weightKg);
  const preRaceMeal: PreRaceMeal = {
    timing: offsetTime(startTime, offsetMin),
    carbsGKg: preMealCarbsGKg,
    carbsGTotal: preMealCarbsTotal,
    composition: getPreRaceComposition(preMealCarbsTotal),
    notes: [
      `${Math.abs(offsetMin / 60)}h avant le départ — ne rien tester de nouveau`,
      "Faible en fibres et graisses (digestion accélérée)",
      "Gorgée d'eau régulière jusqu'à T-30 min",
    ],
  };

  const totalLoadingCarbs =
    days[0].carbsGTotal + days[1].carbsGTotal + days[2].carbsGTotal + preMealCarbsTotal;

  // DO / DON'T cheat sheet
  const dosCheckList: string[] = [
    "Riz blanc, pâtes blanches, pain blanc, semoule",
    "Pommes de terre vapeur (sans peau)",
    "Banane mûre, compote, miel, sirop",
    "Boissons glucidiques (maltodextrine)",
    "Sodium : 1-2 g/L sur les boissons",
    "Tester ce protocole 2-3 fois en simulation",
  ];

  const dontsCheckList: string[] = [
    "Légumineuses, choux, oignons, légumes crus",
    "Pain complet, céréales riches en son",
    "Fritures, charcuterie grasse, sauces lourdes",
    "Alcool (déshydratation + glycogenèse ↓)",
    "Aliments épicés ou inhabituels",
    "Café à jeun J-1 si non habituel",
  ];

  if (type === "ultra") {
    dosCheckList.unshift("J-3 : commencer à augmenter (8-9 g/kg)");
  }

  return {
    isApplicable: true,
    protocolType: type,
    protocolLabel: label,
    days,
    preRaceMeal,
    dosCheckList,
    dontsCheckList,
    totalLoadingCarbs,
    references: baseRefs,
  };
}

export const CARB_LOADING_DISCLAIMER =
  "Protocole pédagogique — toujours tester en simulation 2-3 semaines avant la course. Ne convient pas aux régimes médicaux spécifiques (diabète, FODMAP).";
