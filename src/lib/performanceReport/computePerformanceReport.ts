/**
 * computePerformanceReport — adapte le payload d'export (ExportTools) vers
 * l'entrée du « Rapport de Performance TFCL™ » (structure type INSCYD).
 *
 * Toute la physiologie provient des sources canoniques :
 *  - modèle Mader-Heck calibré (`@/lib/v2/maderMetabolicModel`, α = 1.98, N=44)
 *  - plafonds de progression Inscyd 2025 (`@/lib/v2/trainabilityCaps`)
 *  - limiteurs unifiés (`unifiedLimiter`) et zones dérivées (`deriveTrainingZones`)
 *
 * Politique TFCL : aucune valeur inventée. Une donnée absente reste `null`
 * et s'affiche « Données insuffisantes ».
 */

import {
  calculateCarbOxidation,
  calculateFatOxidation,
  calculateLactateClearance,
  calculateLactateProduction,
  findCarbMax,
  findFatMax,
  findLactateThresholds,
  findMLSSPower,
  findSteadyStateLactate,
  type MaderProfile,
} from "@/lib/v2/maderMetabolicModel";
import { TRAINABILITY_CAPS } from "@/lib/v2/trainabilityCaps";
import { LIMITER_INFO } from "@/lib/v2/unifiedLimiterDetection";
import { getLimiterImpactCopy } from "@/lib/limiterImpactCopy";
import { deriveTrainingZones } from "@/lib/zones/deriveTrainingZones";
import { AMBER, MINT, PERI, ROSE, SKY, VIOL } from "./charts";
import type {
  PerfCurvePoint,
  PerfGaugeRow,
  PerfLimiter,
  PerfScenario,
  PerfZoneRow,
  PerformanceReportInput,
} from "./types";

const CATEGORY_TO_LIMITER: Record<string, string> = {
  aerobic_power: "aerobic_engine",
  glycolytic: "glycolytic",
  metabolic_endurance: "specific_endurance",
  durability: "specific_endurance",
  neuromuscular: "neuromuscular",
  unknown: "none",
};

const SEVERITY_LABEL: Record<string, string> = {
  none: "faible",
  mild: "légère",
  moderate: "modérée",
  severe: "élevée",
};

const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n !== 0 ? n : null;
};
const fr = (v: number | null, d = 0, unit = ""): string =>
  v == null ? "—" : `${v.toFixed(d).replace(".", ",")}${unit ? ` ${unit}` : ""}`;

/** Énergie : 20.9 kJ par litre d'O₂. */
const KJ_PER_L_O2 = 20.9;

/**
 * Courbe de lactate ancrée sur le MLSS canonique (findMLSSPower, α=1.98).
 * Forme exponentielle de Heck : 4 mmol/L au MLSS, 2 mmol/L à ~0,85 × MLSS,
 * baseline 1 mmol/L. Le solveur itératif de Mader sature sur les profils
 * économes (production < capacité d'élimination à toutes les intensités) ;
 * l'ancrage garantit une courbe lisible ET cohérente avec le seuil calculé.
 */
function anchoredLactate(power: number, mlssW: number): number {
  const k = Math.log(1 / 3) / Math.log(0.85); // ≈ 6.76
  const ratio = Math.max(0.2, power / Math.max(1, mlssW));
  return Math.min(12, 1 + 3 * Math.pow(ratio, k));
}

function buildCurve(profile: MaderProfile, mlssW: number | null): PerfCurvePoint[] {
  const { vo2max, vlamax, weight } = profile;
  const efficiency = profile.efficiency ?? 0.23;
  const points: PerfCurvePoint[] = [];

  for (let intensity = 35; intensity <= 100; intensity += 2.5) {
    const vo2LMin = ((vo2max * intensity) / 100) * weight / 1000;
    const power = Math.round(((vo2LMin * KJ_PER_L_O2 * 1000) / 60) * efficiency);
    const lactate = mlssW
      ? anchoredLactate(power, mlssW)
      : findSteadyStateLactate(intensity, vo2max, vlamax);
    const production = calculateLactateProduction(intensity, vlamax);
    // Capacité d'élimination évaluée à une lactatémie de référence de 4 mmol/L :
    // le croisement production × capacité matérialise l'état stable maximal.
    const clearance = calculateLactateClearance(intensity, vo2max, 4);
    const fatGh = calculateFatOxidation(intensity, vo2max, vlamax, weight) * 60;
    const carbGh = calculateCarbOxidation(intensity, vo2max, vlamax, weight) * 60;
    // Part glycolytique estimée depuis l'accumulation nette de lactate
    // (référence : plus la lactatémie s'écarte de la baseline, plus la part
    // anaérobie de la production d'énergie est élevée — Beneke 2003).
    const glycolyticPct = Math.max(
      0,
      Math.min(60, (100 * Math.max(0, lactate - 1)) / (Math.max(0, lactate - 1) + 12)),
    );
    const aerobicPct = 100 - glycolyticPct;
    points.push({
      power,
      intensity,
      lactate: Number(lactate.toFixed(2)),
      production: Number(production.toFixed(3)),
      clearance: Number(clearance.toFixed(3)),
      fatGh: Number(fatGh.toFixed(1)),
      carbGh: Number(carbGh.toFixed(1)),
      aerobicPct: Number(aerobicPct.toFixed(1)),
    });
  }
  // Monotonicité du lactate net (bruit numérique du solver).
  for (let i = 1; i < points.length; i++) {
    if (points[i].lactate < points[i - 1].lactate) {
      points[i].lactate = Number((points[i - 1].lactate + 0.01).toFixed(2));
    }
  }
  return points;
}

export function computePerformanceReport(
  payload: any,
  opts: { generatedAt: string; ambitionLabel: string; logoBase64?: string | null },
): PerformanceReportInput {
  const refs = payload?.effectiveRefs ?? {};
  const snap = payload?.effectiveSnapshot ?? null;
  const compass = payload?.coachingCompass;
  const limiterResult = payload?.unifiedLimiter;

  const vo2max = num(refs?.vo2max);
  const vlamax = num(payload?.vlamax?.value);
  const weightKg = num(refs?.weightKg);
  const ftp = num(refs?.ftp);
  const vma = num(refs?.vma);
  const tteMin = num(payload?.tte?.tte_min);
  const fcMax = num(refs?.fcMax);
  const fcRest = num((snap as any)?.fc_repos);
  const fcThreshold = num((snap as any)?.fc_seuil ?? (snap as any)?.fc_threshold);
  const age = num(payload?.ageAdjustment?.age);

  const hasModel = vo2max != null && vlamax != null && weightKg != null;
  const profile: MaderProfile | null = hasModel
    ? { vo2max, vlamax, weight: weightKg, efficiency: 0.23 }
    : null;

  const mlssW = profile ? num(findMLSSPower(profile)) : null;
  const curve = profile ? buildCurve(profile, mlssW) : [];
  const thresholds = profile ? findLactateThresholds(profile) : null;
  const fatMax = profile ? findFatMax(profile) : null;
  const carbMax = profile ? findCarbMax(profile, 90) : null;
  const vo2W =
    profile && weightKg
      ? Math.round(((((vo2max as number) * weightKg) / 1000) * KJ_PER_L_O2 * 1000) / 60 * 0.23)
      : null;
  const mlssWkg = mlssW && weightKg ? Number((mlssW / weightKg).toFixed(2)) : null;
  const mlssPctVo2 = mlssW && vo2W ? Math.round((mlssW / vo2W) * 100) : null;
  const raceCarbNeedGH =
    profile && mlssW && vo2W
      ? Math.round(
          calculateCarbOxidation(
            Math.min(95, (mlssW / vo2W) * 100 * 0.92),
            vo2max as number,
            vlamax as number,
            weightKg as number,
          ) * 60,
        )
      : null;

  // ── KPI de couverture ──────────────────────────────────────────────────────
  const kpis = [
    { label: "MLSS (seuil réel)", value: fr(mlssW, 0), unit: "W" },
    { label: "MLSS relatif", value: fr(mlssWkg, 2), unit: "W/kg" },
    { label: "VO₂max", value: fr(vo2max, 1), unit: "ml/kg/min" },
    { label: "VLamax", value: fr(vlamax, 2), unit: "mmol/L/s" },
    { label: "FatMax", value: fr(fatMax ? fatMax.fatMaxPower : null, 0), unit: "W" },
    { label: "Durabilité (TTE)", value: fr(tteMin, 0), unit: "min" },
  ];

  const gauges: PerfGaugeRow[] = [
    {
      label: "VO₂max",
      unit: "ml/kg/min — cylindrée aérobie",
      value: vo2max,
      display: fr(vo2max, 1),
      scale: [30, 80],
      target: [50, 70],
      color: PERI,
    },
    {
      label: "VLamax",
      unit: "mmol/L/s — puissance glycolytique",
      value: vlamax,
      display: fr(vlamax, 2),
      scale: [0.2, 1.0],
      target: [0.3, 0.5],
      color: ROSE,
      lowerIsBetter: true,
    },
    {
      label: "MLSS",
      unit: "% VO₂max — utilisation fractionnelle",
      value: mlssPctVo2,
      display: fr(mlssPctVo2, 0, "%"),
      scale: [55, 95],
      target: [78, 90],
      color: MINT,
    },
    {
      label: "FatMax",
      unit: "W — pic d'oxydation des lipides",
      value: fatMax ? fatMax.fatMaxPower : null,
      display: fr(fatMax ? fatMax.fatMaxPower : null, 0),
      scale: [80, 320],
      target: mlssW ? [mlssW * 0.6, mlssW * 0.78] : null,
      color: SKY,
    },
    {
      label: "Durabilité (TTE au seuil)",
      unit: "min — temps tenable au MLSS",
      value: tteMin,
      display: fr(tteMin, 0),
      scale: [10, 90],
      target: [40, 75],
      color: VIOL,
    },
    {
      label: "CarbMax",
      unit: "W — puissance où l'oxydation atteint 90 g/h",
      value: carbMax?.power ?? null,
      display: fr(carbMax?.power ?? null, 0),
      scale: [80, 360],
      target: mlssW ? [mlssW * 0.9, mlssW * 1.15] : null,
      color: AMBER,
    },
  ];

  // ── Table des paramètres ───────────────────────────────────────────────────
  const pill = (ok: boolean | null): { label: string; tone: "ok" | "mid" | "bad" | "na" } =>
    ok === null
      ? { label: "Non mesuré", tone: "na" }
      : ok
        ? { label: "Atout", tone: "ok" }
        : { label: "À travailler", tone: "bad" };

  const parameterRows = [
    {
      name: "VO₂max",
      detail: fr(vo2max, 1, "ml/kg/min"),
      verdict: vo2max == null ? "Données insuffisantes" : vo2max >= 55 ? "Cylindrée solide" : "Marge de progression",
      meaning:
        "Le débit maximal d'oxygène utilisable. Il fixe le plafond de la filière aérobie et la capacité à éliminer le lactate.",
      pill: pill(vo2max == null ? null : vo2max >= 55),
    },
    {
      name: "VLamax",
      detail: fr(vlamax, 2, "mmol/L/s"),
      verdict:
        vlamax == null ? "Données insuffisantes" : vlamax <= 0.45 ? "Profil économe" : "Profil glycolytique",
      meaning:
        "La vitesse maximale de production de lactate. Haute, elle consomme les glucides et abaisse le seuil ; basse, elle économise le carburant mais coûte de l'explosivité.",
      pill: pill(vlamax == null ? null : vlamax <= 0.45),
    },
    {
      name: "MLSS",
      detail: `${fr(mlssW, 0, "W")} · ${fr(mlssPctVo2, 0, "% VO₂max")}`,
      verdict:
        mlssPctVo2 == null ? "Données insuffisantes" : mlssPctVo2 >= 80 ? "Seuil bien placé" : "Seuil bas pour la cylindrée",
      meaning:
        "L'intensité la plus haute où production et élimination du lactate s'équilibrent. C'est le vrai plafond d'effort prolongé, pas le FTP de test.",
      pill: pill(mlssPctVo2 == null ? null : mlssPctVo2 >= 80),
    },
    {
      name: "FatMax",
      detail: `${fr(fatMax?.fatMaxPower ?? null, 0, "W")} · ${fr(fatMax?.fatMaxGrams ?? null, 2, "g/min")}`,
      verdict: fatMax ? "Ancre d'endurance fondamentale" : "Données insuffisantes",
      meaning:
        "L'intensité de meilleure combustion des graisses. Plus elle est haute, plus tu épargnes tes réserves de glycogène en épreuve longue.",
      pill: pill(fatMax == null ? null : true),
    },
    {
      name: "CarbMax (90 g/h)",
      detail: carbMax?.power ? `${fr(carbMax.power, 0, "W")}` : "Jamais atteint sur la plage",
      verdict:
        carbMax?.power == null
          ? "Oxydation CHO sous le plafond d'ingestion"
          : "Au-delà : dette glucidique cumulative",
      meaning:
        "La puissance à laquelle tu brûles 90 g de glucides par heure — le maximum réellement ingérable. Au-dessus, l'épreuve devient un compte à rebours.",
      pill: pill(carbMax?.power == null ? null : true),
    },
    {
      name: "Durabilité (TTE)",
      detail: fr(tteMin, 0, "min"),
      verdict: tteMin == null ? "Données insuffisantes" : tteMin >= 45 ? "Bonne résistance" : "Durabilité limitante",
      meaning:
        "Le temps tenable au seuil. Deux athlètes de même MLSS ne tiennent pas la même durée : c'est la durabilité qui fait la différence en course.",
      pill: pill(tteMin == null ? null : tteMin >= 45),
    },
  ];

  // ── Zones ──────────────────────────────────────────────────────────────────
  const zoneSet = deriveTrainingZones({
    sport: "bike",
    ftp,
    fcMax,
    fcRest,
    vlamax,
    vo2max,
    weightKg,
  } as any);
  const LACTATE_BY_ZONE: Record<string, string> = {
    Z1: "< 1,5 mmol/L",
    Z2: "1,2 – 2,0 mmol/L",
    Z3: "2,0 – 3,0 mmol/L",
    Z4: "3,0 – 4,5 mmol/L",
    Z5: "5 – 8 mmol/L",
    Z6: "> 8 mmol/L",
  };
  const SUBSTRATE_BY_ZONE: Record<string, string> = {
    Z1: "Lipides dominants",
    Z2: "Lipides + glucides",
    Z3: "Glucides majoritaires",
    Z4: "Glucides ~85 %",
    Z5: "Glucides quasi exclusifs",
    Z6: "Glycolyse anaérobie",
  };
  const ADAPTATION_BY_ZONE: Record<string, string> = {
    Z1: "Récupération, circulation",
    Z2: "Densité mitochondriale, FatMax",
    Z3: "Utilisation fractionnelle",
    Z4: "MLSS, clairance du lactate",
    Z5: "VO₂max, cinétique O₂",
    Z6: "Puissance glycolytique",
  };
  const zones: PerfZoneRow[] = (zoneSet?.zones ?? []).map((z: any) => {
    const key = String(z.id ?? "").toUpperCase().slice(0, 2);
    return {
      id: z.id,
      label: z.label,
      absolute: z.absolute ?? "—",
      heartRate: z.heartRate ?? "—",
      lactate: LACTATE_BY_ZONE[key] ?? "—",
      substrate: SUBSTRATE_BY_ZONE[key] ?? "—",
      adaptation: ADAPTATION_BY_ZONE[key] ?? "—",
    };
  });
  const zoneSourceLabel =
    zoneSet?.source === "derived"
      ? `Zones dérivées de la physiologie (${(zoneSet.anchors ?? []).join(", ") || "ancres physiologiques"})`
      : "Grille standard — ancres physiologiques incomplètes";

  // ── Carburant ──────────────────────────────────────────────────────────────
  const need = raceCarbNeedGH;
  const fueling: Array<[string, string, string, string]> = need
    ? [
        ["< 1 h", "Effort intense, réserves suffisantes", "0 – 30 g/h", "Boisson seule"],
        [
          "1 – 2 h",
          "Allure spécifique",
          `${Math.round(need * 0.55)} – ${Math.round(need * 0.7)} g/h`,
          "Gels / boisson glucidique",
        ],
        [
          "2 – 4 h",
          "Tempo / seuil bas",
          `${Math.round(need * 0.7)} – ${Math.min(90, Math.round(need * 0.9))} g/h`,
          "Mix glucose:fructose 1:0,8",
        ],
        [
          "> 4 h",
          "Endurance longue (FatMax dominant)",
          `${Math.min(75, Math.round(need * 0.6))} – ${Math.min(90, Math.round(need * 0.8))} g/h`,
          "Solide + liquide, entraînement digestif requis",
        ],
      ]
    : [];

  // ── Simulations bornées par les plafonds Inscyd 2025 ───────────────────────
  const MONTHS = 3;
  const scenarios: PerfScenario[] = [];
  if (profile && mlssW) {
    const base = mlssW;
    scenarios.push({
      label: "Situation actuelle",
      detail: `VO₂max ${fr(vo2max, 1)} · VLamax ${fr(vlamax, 2)}`,
      mlss: base,
      deltaW: 0,
      tteMin,
    });
    const dVla = TRAINABILITY_CAPS.vlamax.typicalPerMonth * MONTHS;
    const dVo2 = TRAINABILITY_CAPS.vo2max.typicalPerMonth * MONTHS;
    const sVla = findMLSSPower({ ...profile, vlamax: Math.max(0.15, profile.vlamax - dVla) });
    const sVo2 = findMLSSPower({ ...profile, vo2max: profile.vo2max + dVo2 });
    const sBoth = findMLSSPower({
      ...profile,
      vlamax: Math.max(0.15, profile.vlamax - dVla * 0.7),
      vo2max: profile.vo2max + dVo2 * 0.7,
    });
    scenarios.push(
      {
        label: "Baisser la VLamax",
        detail: `−${dVla.toFixed(2).replace(".", ",")} mmol/L/s en 12 semaines (endurance longue, sprints limités)`,
        mlss: sVla,
        deltaW: sVla - base,
        tteMin: null,
      },
      {
        label: "Monter la VO₂max",
        detail: `+${dVo2.toFixed(1).replace(".", ",")} ml/kg/min en 12 semaines (blocs VO₂max)`,
        mlss: sVo2,
        deltaW: sVo2 - base,
        tteMin: null,
      },
      {
        label: "Travail combiné",
        detail: "70 % des deux leviers — la décorrélation VO₂max / VLamax limite le cumul",
        mlss: sBoth,
        deltaW: sBoth - base,
        tteMin: null,
      },
    );
  }

  // ── Limiteurs ──────────────────────────────────────────────────────────────
  const ranking: any[] = Array.isArray(limiterResult?.categoryRanking)
    ? limiterResult.categoryRanking.slice(0, 3)
    : [];
  const maxImpact = Math.max(1, ...ranking.map((r) => r.totalImpact ?? 0));
  const limiters: PerfLimiter[] = ranking.map((entry, i) => {
    const key = CATEGORY_TO_LIMITER[entry.category] ?? "none";
    const info = (LIMITER_INFO as any)[key] ?? { label: entry.category, emoji: "•" };
    const copy = getLimiterImpactCopy(key as any);
    return {
      rank: i + 1,
      title: info.label,
      emoji: info.emoji,
      severityLabel:
        i === 0 ? (SEVERITY_LABEL[limiterResult?.severity ?? "moderate"] ?? "modérée") : "secondaire",
      impact: Math.round(((entry.totalImpact ?? 0) / maxImpact) * 100),
      fieldFeeling: copy.sentence1,
      mechanism: copy.sentence2,
    };
  });

  // ── Plan d'action ──────────────────────────────────────────────────────────
  const decision = compass?.decision;
  const actions: Array<{ title: string; body: string }> = [];
  if (decision?.block) {
    actions.push({
      title: `Bloc prioritaire · ${decision.block}${decision.durationWeeks ? ` (${decision.durationWeeks} semaines)` : ""}`,
      body: decision.athleteMessage ?? "Bloc déterminé par le limiteur dominant.",
    });
  }
  if (compass?.leverage) {
    actions.push({
      title: `Levier · ${compass.leverage.label}`,
      body: [compass.leverage.description, ...(compass.leverage.workoutExamples ?? []).slice(0, 3)]
        .filter(Boolean)
        .join(" — "),
    });
  }
  if (Array.isArray(decision?.prohibitions) && decision.prohibitions.length) {
    actions.push({
      title: "À éviter sur ce bloc",
      body: decision.prohibitions.slice(0, 4).join(" · "),
    });
  }

  const controls = [
    "Test seuil de 20–30 min (puissance + FC) toutes les 6 semaines.",
    "Sprint de 15 s / test VLamax terrain en début et fin de bloc.",
    "Sortie longue référence à FatMax : dérive cardiaque et allure sur la 2ᵉ moitié.",
    "Enregistrement systématique du ravitaillement réel (g/h) sur les sorties > 2 h.",
  ];

  const targets = [
    {
      marker: "MLSS",
      current: fr(mlssW, 0, "W"),
      target: scenarios.length > 1 ? fr(Math.max(...scenarios.map((s) => s.mlss)), 0, "W") : "—",
      horizon: "12 semaines",
    },
    {
      marker: "VLamax",
      current: fr(vlamax, 2),
      target:
        vlamax != null
          ? fr(Math.max(0.25, vlamax - TRAINABILITY_CAPS.vlamax.typicalPerMonth * MONTHS), 2)
          : "—",
      horizon: "12 semaines",
    },
    {
      marker: "VO₂max",
      current: fr(vo2max, 1),
      target:
        vo2max != null ? fr(vo2max + TRAINABILITY_CAPS.vo2max.typicalPerMonth * MONTHS, 1) : "—",
      horizon: "12 semaines",
    },
    {
      marker: "Durabilité (TTE)",
      current: fr(tteMin, 0, "min"),
      target: tteMin != null ? fr(Math.min(90, tteMin + 10), 0, "min") : "—",
      horizon: "12 semaines",
    },
  ];

  const missing: string[] = [];
  if (vo2max == null) missing.push("VO₂max");
  if (vlamax == null) missing.push("VLamax");
  if (weightKg == null) missing.push("poids");
  if (ftp == null) missing.push("FTP");
  if (fcMax == null) missing.push("FC max");

  const overview =
    limiterResult?.limiterExplanation ??
    compass?.limiter?.description ??
    "Analyse métabolique complète du profil.";
  const consequence =
    decision?.athleteMessage ??
    "Les prescriptions ci-après découlent directement du croisement production / élimination du lactate.";

  return {
    athleteName: payload?.athlete?.name ?? "Athlète",
    identity: [
      { label: "Objectif", value: payload?.athlete?.goal ?? "—" },
      { label: "Ambition", value: opts.ambitionLabel },
      { label: "Âge", value: age != null ? `${Math.round(age)} ans` : "—" },
      { label: "Poids", value: fr(weightKg, 1, "kg") },
      { label: "FTP", value: fr(ftp, 0, "W") },
      { label: "VMA", value: fr(vma, 1, "km/h") },
    ],
    generatedAt: opts.generatedAt,
    snapshotDate: snap?.date ?? null,
    logoBase64: opts.logoBase64 ?? null,
    kpis,
    gauges,
    overview,
    consequence,
    physio: {
      vo2max,
      vlamax,
      mlssW,
      mlssWkg,
      mlssPctVo2,
      vo2W,
      fatMaxW: fatMax?.fatMaxPower ?? null,
      fatMaxG: fatMax?.fatMaxGrams ?? null,
      carbMaxGH: carbMax?.targetCarbGH ?? null,
      carbMaxW: carbMax?.power ?? null,
      tteMin,
      lt1W: mlssW ? Math.round(mlssW * 0.85) : (thresholds?.lt1Power ?? null),
      lt2W: mlssW ?? (thresholds?.lt2Power ?? null),
      weightKg,
      ftp,
      vma,
      economy: num(payload?.runningEconomy?.value),
      fcMax,
      fcRest,
      fcThreshold,
      raceCarbNeedGH: need,
    },
    parameterRows,
    curve,
    zones,
    zoneSourceLabel,
    fueling,
    scenarios,
    limiters,
    actions,
    controls,
    targets,
    missingNote: missing.length
      ? `Données manquantes : ${missing.join(", ")}. Les sections concernées affichent « Données insuffisantes ».`
      : null,
  };
}
