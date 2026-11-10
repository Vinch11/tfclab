import { AUDITED_WORKOUT_SAFETY_PREREQUISITES } from "./workoutSafetyPrerequisites.ts";

/**
 * Familles de séances exigeantes que le coach peut autoriser pour un plan.
 * Une autorisation rend les fiches de la famille SÉLECTIONNABLES ; elle ne
 * les impose pas, et ne contourne ni le profil vérifié, ni le niveau, ni les
 * heures minimales, ni les blocages automatiques (hypoxie, chaleur, navette
 * course au seuil dont les exclusions qualitatives restent invérifiables).
 */
export type DemandingSessionFamilyKey =
  | "double_threshold"
  | "double_day_load"
  | "lactate_shuttles"
  | "norwegian_intervals"
  | "vo2_high_intensity"
  | "sprints_max_tests"
  | "heavy_strength";

export interface DemandingSessionFamily {
  key: DemandingSessionFamilyKey;
  label: string;
  description: string;
  workoutIds: readonly string[];
}

export const DEMANDING_SESSION_FAMILIES: readonly DemandingSessionFamily[] = [
  {
    key: "double_threshold",
    label: "Doubles seuils (norvégien)",
    description: "Deux séances au seuil dans la même journée ou semaine structurée norvégienne.",
    workoutIds: [
      "NORWEGIAN_RUN_THRESHOLD_LOW_AM",
      "NORWEGIAN_RUN_THRESHOLD_HIGH_PM",
      "NORWEGIAN_RUN_DOUBLE_THRESHOLD_DAY",
      "NORWEGIAN_WEEK_STRUCTURE_RUN",
      "URBAN_COTES_NORVEGIEN_DOUBLE_SEUIL",
    ],
  },
  {
    key: "double_day_load",
    label: "Doubles journées et blocs de charge",
    description: "Journées doubles kényanes, back-to-back, semaines à forte dose.",
    workoutIds: ["KENYAN_RUN_DOUBLE_DAY", "EXPE_HORS_VILLE_BACK_TO_BACK", "KENYAN_WEEK_STRUCTURE_MARATHON"],
  },
  {
    key: "lactate_shuttles",
    label: "Navettes sévères et protocoles lactate",
    description: "Tolérance/clearance lactique, navette vélo, test lactate norvégien.",
    workoutIds: [
      "BILLAT_RUN_LACTATE_TOLERANCE",
      "ENR_RUN_LACTATE_CLEARANCE",
      "ENR_BIKE_LACTATE_SHUTTLE",
      "NORWEGIAN_RUN_LACTATE_TEST_PROTOCOL",
    ],
  },
  {
    key: "norwegian_intervals",
    label: "Intervalles norvégiens guidés",
    description: "4×8, 5×6 course et 5×5 vélo à dose élevée.",
    workoutIds: ["ENR_RUN_NORWEGIAN_4X8", "ENR_RUN_NORWEGIAN_5X6", "ENR_BIKE_NORWEGIAN_5X5"],
  },
  {
    key: "vo2_high_intensity",
    label: "Très haute intensité (VO₂max, Tabata)",
    description: "Seiler 4×4, Tabata vélo, 30/30 natation.",
    workoutIds: ["SEILER_BIKE_4X4MIN", "V2_BIKE_TABATA", "V3_BIKE_VO2_TABATA", "BILLAT_SWIM_30_30"],
  },
  {
    key: "sprints_max_tests",
    label: "Sprints maximaux et tests all-out",
    description: "Sprints course/vélo/natation, test CP/W′.",
    workoutIds: [
      "V2_RUN_SPRINT_PLAT",
      "B_BIKE_SPRINT_NEUROMUSCULAR",
      "V2_BIKE_SPRINT_NEUROMUSCULAR",
      "B_BIKE_CP_W_PRIME_TEST",
      "B_SWIM_SPRINT_25S",
    ],
  },
  {
    key: "heavy_strength",
    label: "Force lourde, explosive et excentrique",
    description: "PAP, contrastes, force lourde, excentrique descente.",
    workoutIds: [
      "D_PAP_PRE_RACE",
      "CONTRAST_RUN_FORCE_SPEED",
      "C_STR_RE_ECONOMY_BLAGROVE",
      "C_STR_CYCLIST_PEDAL_POWER",
      "C_STR_LOWER_PRO",
      "URBAN_EXCENTRIQUE_DESCENTE_SALLE",
    ],
  },
];

/** Fiches jamais débloquables par une autorisation de famille. */
export const PERMANENTLY_BLOCKED_DEMANDING_IDS: readonly string[] = Object.entries(
  AUDITED_WORKOUT_SAFETY_PREREQUISITES,
)
  .filter(([, p]) => p.blockAutomaticSelection)
  .map(([id]) => id);

const KNOWN_KEYS = new Set(DEMANDING_SESSION_FAMILIES.map(f => f.key));

export function sanitizeDemandingFamilies(value: unknown): DemandingSessionFamilyKey[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v): v is DemandingSessionFamilyKey => KNOWN_KEYS.has(v)))];
}

/** IDs nominativement approuvés, hors fiches bloquées en permanence. */
export function approvedIdsForFamilies(keys: readonly string[] | null | undefined): string[] {
  const allowed = new Set(sanitizeDemandingFamilies(keys));
  const blocked = new Set(PERMANENTLY_BLOCKED_DEMANDING_IDS);
  return DEMANDING_SESSION_FAMILIES.filter(f => allowed.has(f.key))
    .flatMap(f => f.workoutIds)
    .filter(id => !blocked.has(id));
}
