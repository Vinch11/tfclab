import { fieldIntensity } from "./fieldHold";
import type { CoachingCompassInput } from "@/lib/coachingCompass/types";
import { objectiveDemands } from "@/lib/coachingCompass/objectiveDemands";
import { coachingAction } from "@/lib/lab/coachReview";
import { rankedFieldGaps } from "@/lib/coachingCompass/rankedFieldGaps";
import { buildCriticalSpeedNolioSessions } from "./criticalSpeedAssessment";
import {
  dayToNolioSteps,
  type TestingWeekNolioSession,
} from "./testingWeekNolioSessions";
import type { NormDay } from "./buildTestingWeekProtocolHTML";

export type FieldModule =
  | "cp-bike"
  | "cs-run"
  | "hold-bike"
  | "hold-run"
  | "trail-repeat"
  | "easy-run";
const definitions = {
  "hold-bike": [
    "bike",
    "Tenue à puissance constante",
    15,
    20,
    10,
    "Maintenir la puissance choisie par le coach sur un tour continu et régulier.",
  ],
  "hold-run": [
    "run",
    "Tenue à allure constante",
    15,
    20,
    10,
    "Tenir l’allure choisie par le coach sur un parcours plat mesuré.",
  ],
  "trail-repeat": [
    "run",
    "Repère sur montée connue",
    10,
    10,
    10,
    "Reprendre la même montée à effort soutenu maîtrisé. Marquer le tour et relever distance, D+, temps et ressenti.",
  ],
  "easy-run": [
    "run",
    "Durée continue confortable",
    5,
    10,
    5,
    "Courir confortablement dans la limite déjà tolérée. Passer à la marche dès que nécessaire et relever la durée continue.",
  ],
} as const;

export function compactSessions(
  module: FieldModule,
  holdMinutes = 20,
  reference?: number | null,
): TestingWeekNolioSession[] {
  if (module === "cs-run") return buildCriticalSpeedNolioSessions();
  if (module === "cp-bike") {
    // Karsten et al., experiment 1 (12, 7, 3 min; two 30 min recoveries).
    const day: NormDay = {
      dayKey: "CP",
      title: "Puissance critique · 12, 7 et 3 min",
      goal: "Estimer CP et W′ à vélo.",
      sessionType: "TEST",
      durationEstimateMin: 107,
      warmup: [{ durationMin: 15, intensityLabel: "Échauffement progressif" }],
      main: [12, 30, 7, 30, 3].map((durationMin, i) => ({
        durationMin,
        recoveryBetweenEfforts: i % 2 === 1,
        intensityLabel:
          i % 2
            ? "Récupération très facile complète"
            : "Puissance moyenne maximale soutenable, tour manuel",
      })),
      recovery: [{ durationMin: 10, intensityLabel: "Retour au calme" }],
      validityCriteria: [],
      dataToRecord: [],
      pacingRules: [],
    };
    return [
      makeSession(
        "bike",
        day,
        "Cycliste entraîné, reposé, même capteur et position. Terminer chaque effort sans interruption. Relever les trois puissances moyennes, les dates et les conditions dans Mesures critiques. Si un effort est interrompu, conserver les autres comme observations. Réutiliser les efforts comparables déjà validés avant de programmer cette séance. DOI 10.1007/s00421-014-3001-z.",
      ),
    ];
  }
  const [sport, title, warmup, defaultWork, cooldown, instruction] =
    definitions[module];
  const hold = module === "hold-run" || module === "hold-bike";
  if (
    hold &&
    (!Number.isInteger(holdMinutes) || holdMinutes < 1 || holdMinutes > 120)
  )
    return [];
  const work = hold ? holdMinutes : defaultWork;
  const target =
    hold && reference && Number.isFinite(reference) && reference > 0
      ? " Cible du bilan à confirmer · " +
        fieldIntensity(sport, reference) +
        "."
      : "";
  const day: NormDay = {
    dayKey: module,
    title,
    goal: title,
    sessionType: "VALIDATION",
    durationEstimateMin: warmup + work + cooldown,
    warmup: [
      {
        durationMin: warmup,
        intensityLabel:
          sport === "bike" ? "Pédalage progressif" : "Mise en route facile",
      },
    ],
    main: [{ durationMin: work, intensityLabel: instruction + target }],
    recovery: [
      { durationMin: cooldown, intensityLabel: "Retour au calme facile" },
    ],
    pacingRules: [],
    validityCriteria: [],
    dataToRecord: [],
  };
  const reading = module.startsWith("hold")
    ? "Pour un adulte habitué à cette intensité. Choisir la cible numérique avant le départ. Noter la moyenne réellement tenue et la raison de l’arrêt. Un bloc terminé établit une durée minimale. Reporter dans Tests → Documenter un effort continu."
    : module === "trail-repeat"
      ? "Traileur habitué à cette pente. Comparer à une montée déjà parcourue dans des conditions similaires. Documenter le sol et la météo, prendre les temps sur les mêmes repères."
      : "Débutant déjà capable de courir quelques minutes. Noter le ressenti et la récupération le lendemain. Adapter la durée au niveau actuel.";
  return [
    makeSession(
      sport,
      day,
      reading +
        " Arrêter en cas de douleur ou d’incapacité à conserver le geste prévu. Refaire uniquement si la comparaison change le choix du prochain bloc.",
    ),
  ];
}

function makeSession(
  sport: string,
  day: NormDay,
  instructions: string,
): TestingWeekNolioSession {
  return {
    weekNumber: 1,
    dayIndex: 0,
    sessionIndex: 0,
    sport,
    title: day.title,
    objectif: day.goal + " · " + instructions,
    details: instructions,
    isRest: false,
    structuredWorkout: dayToNolioSteps(day),
  };
}

export function nextFieldCheck(input: CoachingCompassInput): {
  text: string;
  module?: FieldModule;
  protocol?: "bike_vlamax_sprint_15s" | "run_vlamax_sprint_15s_12min";
} {
  const kind = objectiveDemands(input.objectif)?.kind;
  const lead = rankedFieldGaps(input.limiterResult);
  const sport =
    input.sportFocus === "run" ||
    kind === "road" ||
    kind === "trail" ||
    kind === "beginner"
      ? "run"
      : "bike";
  if (kind === "beginner")
    return {
      text: "Relever sur une sortie habituelle les minutes courues confortablement et la récupération le lendemain.",
      module: "easy-run",
    };
  if (kind === "trail")
    return {
      text: "Comparer deux passages sur la même montée, avec pente, technicité et effort comparables. Reprendre une sortie déjà enregistrée si disponible.",
      module: "trail-repeat",
    };
  if (
    input.limiterResult?.primaryLimiter &&
    input.limiterResult.primaryLimiter !== "none" &&
    lead.some((r) => !r.hypothesis)
  )
    return {
      text: coachingAction(
        input.objectif,
        sport,
        lead.some(
          (r) => !r.hypothesis && /TTE|durabilit/i.test(r.metric.metric),
        ),
      ),
    };
  if (
    lead.find((r) => r.hypothesis && r.metric.metric !== "FatMax")?.metric
      .metric === "VLamax"
  )
    return {
      text: "Comparer d’abord les efforts courts et soutenus déjà datés du même sport. Si leur rapport reste incertain, reprendre le protocole de sprint avec sa référence soutenue.",
      protocol:
        sport === "run"
          ? "run_vlamax_sprint_15s_12min"
          : "bike_vlamax_sprint_15s",
    };
  if (
    lead.some((r) => r.metric.metric === "TTE") ||
    (sport === "bike" ? input.ftp : input.paceThresholdSecPerKm)
  )
    return {
      text: "Rechercher d’abord dans Nolio un bloc continu proche de la cible. Reporter son intensité, sa durée et le motif de l’arrêt. En l’absence de trace comparable, utiliser le bloc de tenue.",
      module: sport === "bike" ? "hold-bike" : "hold-run",
    };
  return {
    text: "Vérifier les efforts maximaux déjà disponibles dans Mesures critiques. Si la courbe reste incomplète, choisir les essais manquants avec le coach.",
    module: sport === "bike" ? "cp-bike" : "cs-run",
  };
}

export function fieldCheckLink(
  check: ReturnType<typeof nextFieldCheck>,
): string | undefined {
  if (check.protocol) return "/diagnostic/tests?protocol=" + check.protocol;
  if (check.module) return "/diagnostic/tests?module=" + check.module;
}
