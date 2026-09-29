import { mapObjectiveToSport } from "@/lib/deriveRaceTargets";

/**
 * Auto-défaut "Natation en maintien" pour un plan multi-objectifs dont
 * l'objectif FINAL est un triathlon (IM/703) mais qui contient un objectif
 * intermédiaire 100% course (Marathon/Semi/10K/StartToRun) — ex: Marathon
 * de Séville → Ironman Les Sables d'Olonne.
 *
 * Bug réel (audit "science décorative" ChatGPT, PR #281) : `crossTraining-
 * Natation` démarre décoché par défaut — comportement voulu pour un plan
 * mono-objectif course/trail — mais rien ne re-proposait `true` pour CE cas
 * précis, où le cycle intermédiaire course prépare aussi un Ironman : la
 * natation restait totalement absente pendant tout le cycle Marathon si le
 * coach ne pensait pas lui-même à cocher la case. PR #281 a corrigé la
 * contradiction de prompt qui bannissait la natation même case cochée —
 * ceci corrige le défaut en amont, pour que la case soit cochée d'emblée
 * dans ce scénario précis.
 *
 * Ne concerne QUE ce scénario multi-objectifs précis : un plan mono-objectif
 * Marathon/Semi/Trail garde son défaut historique (natation décochée).
 */
export function shouldAutoEnableNatationMaintenance(
  finalObjective: string | null | undefined,
  raceGoals: Array<{ objective: string }>,
): boolean {
  const finalSport = mapObjectiveToSport(finalObjective);
  const isTriFinal = finalSport === "ironman" || finalSport === "tri_70_3";
  if (!isTriFinal) return false;
  return raceGoals.some((g) => mapObjectiveToSport(g.objective) === "run_route");
}
