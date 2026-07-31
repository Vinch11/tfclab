/**
 * PROTOCOLES DE DURABILITÉ SOUS-MAXIMALE (TFCL)
 * ---------------------------------------------
 * Alternative NON épuisante au TTE classique : effort continu Z2 de 60–75 min,
 * lecture du découplage aérobie (Pw:HR vélo, Pa:HR course).
 *
 * Sortie : verdict QUALITATIF de durabilité (non limitante / à surveiller /
 * limitante). N'écrit jamais dans tte_observed_min.
 */

import type { IntegratedTestProtocol } from "./testProtocolsLibrary";
import { computeDecouplingPct, interpretDecoupling } from "@/lib/durabilityDecoupling";

const COMMON_PREREQS = [
  "24-48h sans séance à haute intensité (jambes fraîches mais pas d'affûtage nécessaire)",
  "Zone 2 connue (FTP ou allure seuil de moins de 6 semaines)",
  "Petit-déjeuner normal, athlète non à jeun",
  "Hydratation régulière prévue pendant l'effort",
  "Aucun apport glucidique pendant le test (ou apport identique à chaque répétition du test)",
];

const COMMON_VALIDITY = [
  { id: "z2_strict", label: "Intensité strictement constante en Z2", critical: true, details: "Toute variation >5% invalide la lecture du découplage" },
  { id: "no_stop", label: "Aucun arrêt de plus de 30 secondes", critical: true, details: "Les arrêts cassent la dérive cardiaque" },
  { id: "temp", label: "Température < 24°C, pas de chaleur extrême", critical: false, details: "La chaleur amplifie artificiellement le découplage" },
  { id: "hydration", label: "Hydratation ≥ 500 ml/h", critical: false, details: "La déshydratation gonfle la dérive FC" },
  { id: "fed", label: "État nutritionnel normal (non à jeun)", critical: false, details: "Un test à jeun n'est pas comparable aux suivants" },
];

// ==========================================================
// VÉLO — Découplage Pw:HR
// ==========================================================

export const BIKE_DURABILITY_SUBMAX: IntegratedTestProtocol = {
  id: "bike_durability_submax_z2",
  name: "Test Durabilité Sous-Maximale Vélo – Découplage Pw:HR 75 min",
  shortName: "Durabilité Vélo (sous-max)",
  sport: "bike",
  category: "TTE",
  difficulty: "easy",

  objective:
    "Déterminer si la durabilité est un facteur limitant SANS aller jusqu'à l'épuisement. On mesure le découplage puissance/fréquence cardiaque sur 75 min en Zone 2 stricte : une dérive marquée traduit une base aérobie qui ne tient pas la charge.",
  targetParameters: ["Découplage Pw:HR (%)", "Verdict durabilité (qualitatif)", "Efficience aérobie"],
  expectedPrecision: "medium",
  reliabilityScore: 0.75,

  prerequisites: COMMON_PREREQS,

  equipment: [
    { name: "Capteur de puissance (home-trainer ou route)", required: true },
    { name: "Cardio-fréquencemètre ceinture", required: true },
    { name: "Parcours plat / home-trainer en mode ERG déconseillé", required: true, alternatives: ["Home-trainer en mode puissance libre", "Route plate sans stop"] },
    { name: "Ventilateur (si intérieur)", required: false },
  ],

  validityConditions: COMMON_VALIDITY,

  warmup: [
    { minuteStart: 0, minuteEnd: 10, durationMin: 10, description: "Pédalage progressif Z1 → bas de Z2", intensity: "50-60% FTP", details: "Montée douce, cadence libre" },
    { minuteStart: 10, minuteEnd: 15, durationMin: 5, description: "Stabilisation à la puissance cible du test", intensity: "65-72% FTP", details: "Valider que la FC se stabilise avant de lancer le chrono" },
  ],
  warmupTotalMin: 15,

  protocol: [
    {
      stepNumber: 1,
      minuteStart: 0,
      minuteEnd: 37,
      durationMin: 37,
      description: "1re MOITIÉ : 37 min à puissance constante 65-72% FTP",
      notes: "Puissance lissée 30s stable à ±5 W. Noter Puissance moyenne et FC moyenne de ce segment.",
      criticalPoints: ["Cadence stable (±5 rpm)", "Ne pas suivre la FC : suivre la PUISSANCE", "Aucun sprint, aucune relance"],
    },
    {
      stepNumber: 2,
      minuteStart: 37,
      minuteEnd: 75,
      durationMin: 38,
      description: "2e MOITIÉ : 38 min à la MÊME puissance",
      notes: "La FC va monter naturellement — c'est exactement ce qu'on mesure. Noter Puissance moyenne et FC moyenne de ce segment.",
      criticalPoints: ["Ne PAS baisser la puissance quand la FC monte", "Rester assis", "Hydrater sans s'arrêter"],
    },
    {
      stepNumber: 3,
      description: "FIN : retour au calme 10 min Z1",
      notes: "Aucun effort maximal — l'athlète doit finir frais.",
    },
  ],
  protocolTotalMin: 75,

  pacingRules: [
    "Puissance cible = 65-72% FTP (Zone 2 haute), identique du début à la fin",
    "Home-trainer : NE PAS utiliser le mode ERG (il masque la dérive)",
    "Cadence auto-sélectionnée mais constante",
    "Si la puissance ne peut plus être tenue : arrêter et noter — le test devient invalide mais l'information est en soi un signal fort",
  ],

  validationCriteria: [
    { id: "power_stability", label: "Écart de puissance entre les deux moitiés < 2%", threshold: "2%", consequence: "Au-delà, le découplage n'est plus interprétable" },
    { id: "duration", label: "Durée ≥ 60 min", threshold: "60 min", consequence: "En dessous, le signal de dérive est trop faible" },
    { id: "rpe", label: "RPE final ≤ 6/10", threshold: "6/10", consequence: "RPE >6 = intensité trop haute, ce n'est plus de la Z2" },
  ],

  inputFields: [
    { key: "power_first", label: "Puissance moyenne 1re moitié", unit: "W", type: "number", min: 50, max: 500, step: 1, required: true, helpText: "Puissance moyenne sur les 37 premières minutes" },
    { key: "hr_first", label: "FC moyenne 1re moitié", unit: "bpm", type: "number", min: 80, max: 200, step: 1, required: true, helpText: "FC moyenne du même segment" },
    { key: "power_second", label: "Puissance moyenne 2e moitié", unit: "W", type: "number", min: 50, max: 500, step: 1, required: true, helpText: "Puissance moyenne sur les 38 dernières minutes" },
    { key: "hr_second", label: "FC moyenne 2e moitié", unit: "bpm", type: "number", min: 80, max: 200, step: 1, required: true, helpText: "FC moyenne du même segment" },
    { key: "duration_min", label: "Durée totale de l'effort", unit: "min", type: "number", min: 40, max: 150, step: 1, required: true, helpText: "Durée réelle hors échauffement" },
    { key: "rpe_final", label: "RPE final", unit: "/10", type: "number", min: 1, max: 10, step: 1, required: false, helpText: "Doit rester ≤6 pour une vraie Z2" },
  ],

  tfclImpact: [
    { parameter: "Durabilité (qualitatif)", confidenceBoost: 0.12, description: "Statut limitant / à surveiller / non limitant sans épuiser l'athlète", formula: "Découplage = (P1/FC1 − P2/FC2) / (P1/FC1) × 100" },
    { parameter: "Efficience aérobie", confidenceBoost: 0.05, description: "Suivi longitudinal du couplage Pw:HR entre deux blocs" },
  ],

  calculationSteps: [
    { step: 1, name: "Ratio 1re moitié", formula: "R1 = P1 / FC1", description: "Watts par battement, première moitié" },
    { step: 2, name: "Ratio 2e moitié", formula: "R2 = P2 / FC2", description: "Watts par battement, seconde moitié" },
    { step: 3, name: "Découplage", formula: "D = (R1 − R2) / R1 × 100", description: "Positif = perte d'efficience" },
    { step: 4, name: "Verdict", formula: "D<5% non limitant | 5-8% à surveiller | >8% limitant", description: "Lecture qualitative, jamais convertie en minutes de TTE" },
  ],

  compute: (inputs) => {
    const d = computeDecouplingPct({
      output1: inputs.power_first ?? null,
      hr1: inputs.hr_first ?? null,
      output2: inputs.power_second ?? null,
      hr2: inputs.hr_second ?? null,
    });

    if (d === null) {
      return { ok: false, error: "Puissance et FC des deux moitiés requises", confidence: 0, rawData: inputs };
    }

    const powerDrift =
      inputs.power_first > 0
        ? Math.abs((inputs.power_second - inputs.power_first) / inputs.power_first) * 100
        : 100;
    const protocolValid = powerDrift <= 2 && (inputs.rpe_final ? inputs.rpe_final <= 6 : true);
    const verdict = interpretDecoupling(d, inputs.duration_min ?? null, protocolValid);

    return {
      ok: true,
      result: {
        primaryValue: Math.round(d * 10) / 10,
        normalizedValue: Math.max(0, Math.min(100, 100 - d * 8)),
        unit: "%",
        label: `Découplage ${d.toFixed(1)}% — ${verdict.label}`,
      },
      confidence: verdict.confidence,
      rawData: {
        ...inputs,
        decoupling_pct: Math.round(d * 10) / 10,
        durability_verdict: verdict.verdict,
        power_drift_pct: Math.round(powerDrift * 10) / 10,
        category: "DURABILITY_SUBMAX",
      },
      calculationTrace: [
        { step: "R1 (W/bpm)", value: (inputs.power_first / inputs.hr_first).toFixed(3) },
        { step: "R2 (W/bpm)", value: (inputs.power_second / inputs.hr_second).toFixed(3) },
        { step: "Découplage", value: `${d.toFixed(1)}%` },
        { step: "Dérive de puissance", value: `${powerDrift.toFixed(1)}%` },
        { step: "Verdict", value: verdict.label },
      ],
    };
  },
};

// ==========================================================
// COURSE À PIED — Découplage Pa:HR
// ==========================================================

export const RUN_DURABILITY_SUBMAX: IntegratedTestProtocol = {
  id: "run_durability_submax_z2",
  name: "Test Durabilité Sous-Maximale CAP – Découplage Pa:HR 60 min",
  shortName: "Durabilité CAP (sous-max)",
  sport: "run",
  category: "TTE",
  difficulty: "easy",

  objective:
    "Déterminer si la durabilité est un facteur limitant en course à pied SANS test jusqu'à l'épuisement. On mesure le découplage allure/FC sur 60 min en endurance fondamentale stricte.",
  targetParameters: ["Découplage Pa:HR (%)", "Verdict durabilité (qualitatif)", "Efficience aérobie CAP"],
  expectedPrecision: "medium",
  reliabilityScore: 0.72,

  prerequisites: COMMON_PREREQS,

  equipment: [
    { name: "Montre GPS", required: true },
    { name: "Cardio-fréquencemètre ceinture (l'optique poignet dérive)", required: true },
    { name: "Parcours plat en boucle (<1% dénivelé) ou tapis 1%", required: true, alternatives: ["Piste 400 m", "Tapis à 1% d'inclinaison"] },
  ],

  validityConditions: COMMON_VALIDITY,

  warmup: [
    { minuteStart: 0, minuteEnd: 10, durationMin: 10, description: "Footing très souple Z1", intensity: "<65% FCmax", details: "Aucune ligne droite ni accélération" },
    { minuteStart: 10, minuteEnd: 15, durationMin: 5, description: "Stabilisation à l'allure cible du test", intensity: "Z2 / 70-78% allure seuil", details: "Vérifier que la FC se stabilise" },
  ],
  warmupTotalMin: 15,

  protocol: [
    {
      stepNumber: 1,
      minuteStart: 0,
      minuteEnd: 30,
      durationMin: 30,
      description: "1re MOITIÉ : 30 min à allure Z2 constante",
      notes: "Noter allure moyenne (sec/km) et FC moyenne du segment.",
      criticalPoints: ["Allure pilotée à la MONTRE, pas au ressenti", "Cadence stable", "Terrain plat obligatoire"],
    },
    {
      stepNumber: 2,
      minuteStart: 30,
      minuteEnd: 60,
      durationMin: 30,
      description: "2e MOITIÉ : 30 min à la MÊME allure",
      notes: "La FC monte : c'est la mesure. Noter allure moyenne et FC moyenne.",
      criticalPoints: ["Ne PAS ralentir quand la FC monte", "Boire sans s'arrêter", "Aucune relance en côte"],
    },
    {
      stepNumber: 3,
      description: "FIN : 10 min de retour au calme",
      notes: "L'athlète doit finir en capacité d'enchaîner le lendemain.",
    },
  ],
  protocolTotalMin: 60,

  pacingRules: [
    "Allure cible = endurance fondamentale (≈ 70-78% de l'allure seuil), identique tout du long",
    "Parcours plat impératif : le dénivelé fausse le ratio allure/FC",
    "Éviter le vent de face sur une seule moitié (boucles courtes recommandées)",
    "Si l'allure ne peut plus être tenue : arrêter et noter — signal fort en soi",
  ],

  validationCriteria: [
    { id: "pace_stability", label: "Écart d'allure entre les deux moitiés < 2%", threshold: "2%", consequence: "Au-delà, le découplage n'est plus interprétable" },
    { id: "duration", label: "Durée ≥ 50 min", threshold: "50 min", consequence: "En dessous, signal de dérive trop faible" },
    { id: "rpe", label: "RPE final ≤ 6/10", threshold: "6/10", consequence: "RPE >6 = ce n'est plus de l'endurance fondamentale" },
  ],

  inputFields: [
    { key: "pace_first", label: "Allure moyenne 1re moitié", unit: "sec/km", type: "number", min: 180, max: 600, step: 1, required: true, helpText: "Ex : 330 = 5:30/km" },
    { key: "hr_first", label: "FC moyenne 1re moitié", unit: "bpm", type: "number", min: 80, max: 200, step: 1, required: true },
    { key: "pace_second", label: "Allure moyenne 2e moitié", unit: "sec/km", type: "number", min: 180, max: 600, step: 1, required: true },
    { key: "hr_second", label: "FC moyenne 2e moitié", unit: "bpm", type: "number", min: 80, max: 200, step: 1, required: true },
    { key: "duration_min", label: "Durée totale de l'effort", unit: "min", type: "number", min: 40, max: 150, step: 1, required: true, helpText: "Durée réelle hors échauffement" },
    { key: "rpe_final", label: "RPE final", unit: "/10", type: "number", min: 1, max: 10, step: 1, required: false },
  ],

  tfclImpact: [
    { parameter: "Durabilité CAP (qualitatif)", confidenceBoost: 0.12, description: "Statut limitant / à surveiller / non limitant sans épuiser l'athlète", formula: "Découplage = (V1/FC1 − V2/FC2) / (V1/FC1) × 100" },
    { parameter: "Efficience aérobie CAP", confidenceBoost: 0.05, description: "Suivi longitudinal du couplage allure/FC" },
  ],

  calculationSteps: [
    { step: 1, name: "Vitesses", formula: "V = 1000 / allure_sec_par_km (m/s)", description: "Conversion allure → vitesse" },
    { step: 2, name: "Ratios", formula: "R1 = V1 / FC1 ; R2 = V2 / FC2", description: "Vitesse par battement" },
    { step: 3, name: "Découplage", formula: "D = (R1 − R2) / R1 × 100", description: "Positif = perte d'efficience" },
    { step: 4, name: "Verdict", formula: "D<5% non limitant | 5-8% à surveiller | >8% limitant", description: "Lecture qualitative, jamais convertie en minutes de TTE" },
  ],

  compute: (inputs) => {
    const v1 = inputs.pace_first > 0 ? 1000 / inputs.pace_first : null;
    const v2 = inputs.pace_second > 0 ? 1000 / inputs.pace_second : null;

    const d = computeDecouplingPct({
      output1: v1,
      hr1: inputs.hr_first ?? null,
      output2: v2,
      hr2: inputs.hr_second ?? null,
    });

    if (d === null || v1 === null || v2 === null) {
      return { ok: false, error: "Allure et FC des deux moitiés requises", confidence: 0, rawData: inputs };
    }

    const paceDrift = Math.abs((v2 - v1) / v1) * 100;
    const protocolValid = paceDrift <= 2 && (inputs.rpe_final ? inputs.rpe_final <= 6 : true);
    const verdict = interpretDecoupling(d, inputs.duration_min ?? null, protocolValid);

    return {
      ok: true,
      result: {
        primaryValue: Math.round(d * 10) / 10,
        normalizedValue: Math.max(0, Math.min(100, 100 - d * 8)),
        unit: "%",
        label: `Découplage ${d.toFixed(1)}% — ${verdict.label}`,
      },
      confidence: verdict.confidence,
      rawData: {
        ...inputs,
        decoupling_pct: Math.round(d * 10) / 10,
        durability_verdict: verdict.verdict,
        pace_drift_pct: Math.round(paceDrift * 10) / 10,
        category: "DURABILITY_SUBMAX",
      },
      calculationTrace: [
        { step: "V1 (m/s)", value: v1.toFixed(3) },
        { step: "V2 (m/s)", value: v2.toFixed(3) },
        { step: "Découplage", value: `${d.toFixed(1)}%` },
        { step: "Dérive d'allure", value: `${paceDrift.toFixed(1)}%` },
        { step: "Verdict", value: verdict.label },
      ],
    };
  },
};
