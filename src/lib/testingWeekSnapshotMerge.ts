import type { DbSnapshot } from "@/hooks/useCloudData";

/**
 * testingWeekSnapshotMerge — Consolide en UN snapshot les résultats déjà
 * enregistrés séparément par les 3 parcours de test (semaine vélo TFCL,
 * semaine course CAP, TFCL Pool Day™ natation) pendant une même campagne
 * de test.
 *
 * Contexte (audit coach) : ces 3 parcours écrivent aujourd'hui de façon
 * hétérogène — natation crée TOUJOURS une nouvelle ligne, vélo crée une
 * ligne seulement si aucun snapshot actif n'existe (sinon met à jour en
 * place), course ne fait QUE mettre à jour une ligne existante (jamais de
 * création) — et aucun des 3 ne marque explicitement le résultat comme
 * "actif" sur l'athlète. Les données d'une même campagne peuvent donc se
 * retrouver éparpillées sur 1, 2 ou 3 lignes distinctes selon l'ordre dans
 * lequel les tests ont été faits.
 *
 * Ce module ne modifie AUCUN des 3 parcours existants (risque de
 * régression trop élevé sur un mécanisme déjà utilisé) — il ajoute une
 * étape explicite, réversible et relisable : le coach choisit une date de
 * départ de campagne, voit un aperçu du snapshot qui EN RÉSULTERAIT
 * (valeur retenue + date/source d'origine pour chaque champ), puis valide
 * pour créer UN nouveau snapshot consolidé, marqué actif sur l'athlète.
 *
 * Règle de fusion : pour chaque champ suivi, on retient la valeur du
 * snapshot le plus RÉCENT (par date, puis created_at) parmi ceux de la
 * campagne qui renseigne ce champ — jamais une moyenne ou un mélange :
 * une seule vraie mesure gagne, peu importe sur quelle ligne elle atterrit.
 */

export type TestingField = keyof Pick<
  DbSnapshot,
  | "weight_kg"
  | "fc_max"
  | "fc_repos"
  | "vo2max"
  | "css"
  | "p30s_w"
  | "p60s_w"
  | "map5min_w"
  | "ftp"
  | "tte_observed_min"
  | "bike_hr_drift_flag"
  | "bike_cadence_rpm"
  | "vma"
  | "pace_threshold_sec_per_km"
  | "sprint_15s_distance"
  | "tte_observed_min_run"
  | "running_power_max"
  | "running_power_threshold"
  | "run_hr_drift_pct"
>;

export const TESTING_FIELDS: TestingField[] = [
  "weight_kg",
  "fc_max",
  "fc_repos",
  "vo2max",
  "css",
  "p30s_w",
  "p60s_w",
  "map5min_w",
  "ftp",
  "tte_observed_min",
  "bike_hr_drift_flag",
  "bike_cadence_rpm",
  "vma",
  "pace_threshold_sec_per_km",
  "sprint_15s_distance",
  "tte_observed_min_run",
  "running_power_max",
  "running_power_threshold",
  "run_hr_drift_pct",
];

export const TESTING_FIELD_LABELS: Record<TestingField, string> = {
  weight_kg: "Poids (kg)",
  fc_max: "FC max (bpm)",
  fc_repos: "FC repos (bpm)",
  vo2max: "VO2max (ml/kg/min)",
  css: "CSS natation (sec/100m)",
  p30s_w: "P30s (W)",
  p60s_w: "P60s (W)",
  map5min_w: "MAP 5 min (W)",
  ftp: "FTP (W)",
  tte_observed_min: "TTE observé vélo (min)",
  bike_hr_drift_flag: "Dérive FC vélo Z2",
  bike_cadence_rpm: "Cadence vélo (rpm)",
  vma: "VMA (km/h)",
  pace_threshold_sec_per_km: "Allure seuil course (s/km)",
  sprint_15s_distance: "Sprint 15s (m)",
  tte_observed_min_run: "TTE observé course (min)",
  running_power_max: "Puissance course max (W)",
  running_power_threshold: "Puissance course seuil (W)",
  run_hr_drift_pct: "Dérive FC course (%)",
};

export interface MergedFieldOrigin {
  date: string;
  source: string;
}

export interface MergedTestingSnapshot {
  athleteId: string;
  fields: Partial<Record<TestingField, DbSnapshot[TestingField]>>;
  fieldOrigins: Partial<Record<TestingField, MergedFieldOrigin>>;
  /** Snapshots de la campagne ayant effectivement contribué au moins un champ. */
  contributingSnapshots: DbSnapshot[];
}

function isPresent(v: unknown): boolean {
  return v !== null && v !== undefined;
}

/**
 * Fusionne les snapshots d'une campagne de test (athlete_id + date >= sinceDateISO)
 * en un seul jeu de champs — "dernière valeur mesurée gagne" par champ, peu
 * importe la ligne d'origine.
 */
export function mergeTestingWeekSnapshots(
  athleteId: string,
  snapshots: DbSnapshot[],
  sinceDateISO: string,
): MergedTestingSnapshot {
  const candidates = snapshots
    .filter((s) => s.athlete_id === athleteId && s.date >= sinceDateISO)
    .slice()
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
      return (a.created_at ?? "").localeCompare(b.created_at ?? "");
    });

  const fields: MergedTestingSnapshot["fields"] = {};
  const fieldOrigins: MergedTestingSnapshot["fieldOrigins"] = {};
  const contributingIds = new Set<string>();

  for (const snap of candidates) {
    for (const field of TESTING_FIELDS) {
      const value = snap[field];
      if (isPresent(value)) {
        fields[field] = value;
        fieldOrigins[field] = { date: snap.date, source: snap.source };
        contributingIds.add(snap.id);
      }
    }
  }

  return {
    athleteId,
    fields,
    fieldOrigins,
    contributingSnapshots: candidates.filter((s) => contributingIds.has(s.id)),
  };
}

/**
 * Construit le payload prêt pour `addSnapshot` à partir d'une fusion —
 * `coach_id` est ignoré/écrasé par `addSnapshot` lui-même (il force toujours
 * `coach_id: user.id`), la valeur passée ici n'est jamais persistée.
 */
export function buildConsolidatedSnapshotPayload(
  merged: MergedTestingSnapshot,
  todayISO: string,
): Omit<DbSnapshot, "id" | "created_at" | "updated_at"> {
  const sourceDates = Array.from(
    new Set(merged.contributingSnapshots.map((s) => `${s.source} (${s.date})`)),
  );
  return {
    athlete_id: merged.athleteId,
    coach_id: "",
    date: todayISO,
    source: "testing_week_consolidated",
    coach_notes: sourceDates.length > 0
      ? `Snapshot consolidé — semaine de test complète. Sources : ${sourceDates.join(", ")}.`
      : "Snapshot consolidé — semaine de test complète.",
    ...merged.fields,
  } as Omit<DbSnapshot, "id" | "created_at" | "updated_at">;
}
