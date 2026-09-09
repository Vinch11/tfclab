import { describe, it, expect } from "vitest";
import { phasesForWeekRange } from "@/lib/workoutCatalogBuilder";
import { ficheCompatibleWithPhases } from "@/lib/plan/phaseNormalization";
import { EnrichedWorkoutsStartToRun } from "@/lib/enrichedWorkoutsStartToRun";

/**
 * Bug réel corrigé (audit "génération de plan IA", volet catalogue — smoking
 * gun #2). La bibliothèque Start-to-Run (16 fiches) cite sa semaine cible
 * exacte en texte libre ("Semaine 12"...) mais ses tags `phase[]` ne
 * couvraient pas toujours cette même semaine une fois passée dans le calcul
 * générique par pourcentage (`phasesForWeekRange`, pensé pour des plans
 * longs, pas pour un programme rigide de 12 semaines).
 *
 * Ce test vérifie le mécanisme précis (alignement phase[]/when), pas le
 * pipeline complet `buildWorkoutCatalog` : celui-ci a un filet de repli
 * ("floor relax") qui réintègre des fiches renforcement/mobilité SANS
 * contrainte de phase dès qu'un sport est sous le plancher — ce filet peut
 * masquer, dans un test de bout en bout, le fait que le contenu COURSE
 * spécifique (le cœur du programme Start-to-Run) reste absent pour certaines
 * semaines. Le symptôme réel rapporté ("plus rien à proposer pour ce sport
 * cette semaine") se vérifie donc directement sur les fiches COURSE
 * "Obligatoire" de la bibliothèque, comme fait ici.
 *
 * Corrigé en ajoutant "taper" aux tags phase[] de S2R_CONSOLIDATION_WEEK_SESSION,
 * S2R_CONTINUOUS_20_25 et S2R_CONTINUOUS_30_LONG, pour qu'ils correspondent
 * à leur propre `when`.
 */
const CHUNK_SIZE = 4;

function chunkRanges(totalWeeks: number): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (let start = 1; start <= totalWeeks; start += CHUNK_SIZE) {
    ranges.push([start, Math.min(start + CHUNK_SIZE - 1, totalWeeks)]);
  }
  return ranges;
}

const mandatoryRunFiches = EnrichedWorkoutsStartToRun.filter(
  w => w.sport === "course" && w.necessite === "Obligatoire",
);

describe("Start-to-Run — alignement phase[]/when sur un cycle réel (12 et 16 semaines)", () => {
  it("chaque chunk (CHUNK_SIZE=4) d'un plan de 12 semaines a au moins une fiche course Obligatoire compatible", () => {
    for (const [start, end] of chunkRanges(12)) {
      const phases = phasesForWeekRange(start, end, 12);
      const compatible = mandatoryRunFiches.filter(w => ficheCompatibleWithPhases(w, phases));
      expect(compatible.length, `chunk S${start}-${end} (phases=[${phases.join(",")}]) : aucune fiche course Obligatoire compatible`).toBeGreaterThan(0);
    }
  });

  it("chaque chunk d'un plan de 16 semaines (dont le dernier, en taper) a au moins une fiche course Obligatoire compatible", () => {
    for (const [start, end] of chunkRanges(16)) {
      const phases = phasesForWeekRange(start, end, 16);
      const compatible = mandatoryRunFiches.filter(w => ficheCompatibleWithPhases(w, phases));
      expect(compatible.length, `chunk S${start}-${end} (phases=[${phases.join(",")}]) : aucune fiche course Obligatoire compatible`).toBeGreaterThan(0);
    }
  });

  it("la séance phare du cycle (S2R_CONTINUOUS_30_LONG, S12) reste compatible avec la phase calculée pour sa propre semaine", () => {
    const phases = phasesForWeekRange(9, 12, 12);
    const fiche = EnrichedWorkoutsStartToRun.find(w => w.id === "S2R_CONTINUOUS_30_LONG")!;
    expect(ficheCompatibleWithPhases(fiche, phases)).toBe(true);
  });
});
