import { describe, it, expect } from "vitest";
import { computeObjectiveCycleSegments } from "../multiObjectiveClassification";
import { computeMultiObjectiveSegments } from "../../../../supabase/functions/ai-training-plan/promptHelpers";

/**
 * Régression réelle (audit "génération de plan IA", plan Ironman/Sables
 * d'Olonne 39 sem, retour coach "encore plein de vélo/natation" après
 * republish confirmé) : une régénération complète recale `planStartDate` sur
 * la semaine courante SANS recalculer `weeksAvailable`/`totalWeeks` depuis
 * cette nouvelle date (closure figée sur l'ancienne). L'objectif final
 * (Ironman) tombait alors 1 semaine APRÈS la fin du plan (`goalWeek =
 * totalWeeks + 1`) — filtré par `goalWeek <= totalWeeks`, il ne restait plus
 * qu'un seul "pic complet" (le Marathon), `computeObjectiveCycleSegments`
 * retournait `null`, et le plan ENTIER retombait sur le catalogue de
 * l'objectif final (Ironman → vélo/natation complets) au lieu de segmenter
 * S1-S21 (Marathon) / S24-S39 (Ironman).
 *
 * Fix (Lovable, commit "Corrigé le calcul du cycle") : recalcul de
 * `weeksAvailable` depuis la date de début fraîche (AITrainingPlanPage.tsx)
 * + filet de sécurité ici (clamp `totalWeeks+1` → `totalWeeks` pour le
 * DERNIER objectif) au cas où l'arrondi semaines/jours laisse subsister un
 * décalage d'une semaine malgré la correction en amont.
 */
describe("computeObjectiveCycleSegments — décalage d'une semaine sur l'objectif final", () => {
  const raceGoals = [
    { objective: "Marathon", raceDate: "2026-09-27", priority: "B" as const },
    { objective: "IM", raceDate: "2027-02-01", priority: "A" as const },
  ];
  // planStartDate choisi pour que l'Ironman tombe exactement à totalWeeks+1
  // (Marathon en S21, Ironman en S40) quand totalWeeks=39.
  const planStartDate = "2026-05-04";

  it("sans le clamp, un objectif final à totalWeeks+1 ferait perdre toute la segmentation (documente le bug)", () => {
    // Vérifie la précondition du scénario : l'Ironman tombe bien 1 semaine
    // après la fin du plan tronqué (reproduit le symptôme observé).
    const totalWeeksBuggy = 39;
    const segments = computeObjectiveCycleSegments(raceGoals, planStartDate, totalWeeksBuggy);
    // Avec le clamp, la segmentation doit malgré tout être récupérée.
    expect(segments).not.toBeNull();
    expect(segments!.at(-1)?.objective).toBe("IM");
    expect(segments!.at(-1)?.endWeek).toBe(totalWeeksBuggy);
  });

  it("segmente correctement Marathon (cycle intermédiaire) puis IM (cycle final) une fois clampé", () => {
    const totalWeeks = 39;
    const segments = computeObjectiveCycleSegments(raceGoals, planStartDate, totalWeeks);
    expect(segments).toEqual([
      expect.objectContaining({ objective: "Marathon", startWeek: 1, isLastCycle: false }),
      expect.objectContaining({ objective: "IM", isLastCycle: true, endWeek: totalWeeks }),
    ]);
  });

  it("mirror serveur : computeMultiObjectiveSegments applique le même clamp que le client", () => {
    const totalWeeks = 39;
    const config = { raceGoals, planStartDate };
    const client = computeObjectiveCycleSegments(raceGoals, planStartDate, totalWeeks);
    const server = computeMultiObjectiveSegments(config, totalWeeks);
    expect(server).not.toBeNull();
    expect(server!.map((s) => ({ objective: s.objective, startWeek: s.startWeek, endWeek: s.endWeek, isLastCycle: s.isLastCycle }))).toEqual(
      client!.map((s) => ({ objective: s.objective, startWeek: s.startWeek, endWeek: s.endWeek, isLastCycle: s.isLastCycle })),
    );
  });

  it("un décalage de PLUS d'une semaine (bug différent) n'est pas masqué par le clamp — reste null", () => {
    const totalWeeksTooShort = 30; // Ironman tomberait à totalWeeks+10, hors clamp
    const segments = computeObjectiveCycleSegments(raceGoals, planStartDate, totalWeeksTooShort);
    expect(segments).toBeNull();
  });
});
