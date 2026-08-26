/**
 * fetchCurrentPlanBlock — bloc réel de la semaine en cours pour un athlète,
 * depuis SA VRAIE source de vérité (dernière ligne `plan_versions`, la même
 * que consulte AITrainingPlanPage à l'ouverture — pas la table `plans`,
 * secondaire et alimentée seulement par les chemins de régénération/patch).
 *
 * Remplace le stub qui retournait toujours "build" (DashboardPage). Le
 * `theme` renvoyé est le texte écrit par l'IA pour cette semaine (censé
 * nommer le chantier réel, ex. "Chantier VLamax ↓" — cf. systemPrompt.ts,
 * "Noms des blocs : Fondation, Chantier [Limiteur], Consolidation,
 * Race-Specific, Affûtage") : pas une étiquette générique recalculée
 * séparément, la même donnée que le coach voit déjà dans le plan.
 *
 * Politique TFCL : aucune valeur inventée. `null` si aucun plan, aucune
 * date de départ inférable, ou semaine hors plage du plan.
 */
import { supabase } from "@/integrations/supabase/client";
import { differenceInCalendarDays } from "date-fns";
import { inferLegacyPlanStartDate } from "./legacyPlanUpgrade";

export interface CurrentPlanBlock {
  weekNumber: number;
  totalWeeks: number;
  /** Texte libre écrit par l'IA pour cette semaine — nomme le chantier réel quand le prompt est suivi. */
  theme: string | null;
  /** Catégorie technique générique ("base"|"build"|"peak"|"taper"), jamais le nom du chantier. */
  phase: string | null;
}

/**
 * Logique pure (testable sans mock réseau) : résout le bloc de la semaine en
 * cours à partir d'un `plan_json` déjà chargé et d'une date de référence.
 */
export function resolveCurrentPlanBlock(
  planJson: Record<string, unknown> | null | undefined,
  now: Date,
): CurrentPlanBlock | null {
  if (!planJson) return null;
  const weeks = Array.isArray(planJson.weeks) ? (planJson.weeks as Array<Record<string, unknown>>) : [];
  const totalWeeks = weeks.length;
  if (totalWeeks === 0) return null;

  const start = inferLegacyPlanStartDate(planJson, totalWeeks, planJson._raceDate as string | undefined);
  if (!start) return null;

  const days = differenceInCalendarDays(now, start);
  const weekNumber = days < 0 ? 1 : Math.floor(days / 7) + 1;
  if (weekNumber > totalWeeks) return null; // plan terminé/dépassé — pas de bloc "en cours"

  const week = weeks.find((w) => w.weekNumber === weekNumber);
  if (!week) return null;

  return {
    weekNumber,
    totalWeeks,
    theme: (week.theme as string | undefined) ?? null,
    phase: (week.phase as string | undefined) ?? null,
  };
}

export async function fetchCurrentPlanBlock(athleteId: string): Promise<CurrentPlanBlock | null> {
  const { data, error } = await supabase
    .from("plan_versions")
    .select("plan_json, created_at")
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error || !data?.[0]?.plan_json) return null;
  return resolveCurrentPlanBlock(data[0].plan_json as Record<string, unknown>, new Date());
}
