import { describe, it, expect } from "vitest";
import { getVLamaxRangeForPlan } from "../../../../supabase/functions/ai-training-plan/vlamaxTargets";

/**
 * Audit "cohérence cross-engine" — même bug que le fix client
 * (src/lib/physiologicalTargets.ts::getVLamaxRange, cf. PR VLamax), trouvé
 * en miroir dans l'edge function : `getVLamaxRangeForPlan` retombait sur la
 * discipline 'bike' dès que `sport` n'était pas explicitement fourni — y
 * compris pour un Marathon/Semi/10K/5K/Trail, où la discipline n'est
 * pourtant pas ambiguë.
 *
 * Plus grave ici que côté client : cette fonction alimente DIRECTEMENT le
 * prompt de génération de plan (promptHelpers.ts, ligne "Cible VLamax pour
 * ...") — pas un simple affichage. Le caller avait bien une détection locale
 * (`sportForVlamax`), mais incomplète (Marathon/Semi/Trail seulement,
 * ratait 10K/5K/TrailShort/TrailMountain/TrailUltra/Start to Run) : ces
 * objectifs recevaient une cible VLamax vélo injectée dans le prompt IA.
 */
describe("getVLamaxRangeForPlan (edge function) — discipline par défaut quand sport est omis", () => {
  it("un objectif course pure (Marathon/Semi/10K/5K/Trail) reçoit la cible RUN par défaut, pas vélo", () => {
    for (const objectif of ["Marathon", "Semi-Marathon", "10K", "5K", "Trail"]) {
      const withoutSport = getVLamaxRangeForPlan(objectif, "age_group");
      const explicitRun = getVLamaxRangeForPlan(objectif, "age_group", "run");
      const explicitBike = getVLamaxRangeForPlan(objectif, "age_group", "bike");
      expect(withoutSport, objectif).toEqual(explicitRun);
      expect(withoutSport, objectif).not.toEqual(explicitBike);
    }
  });

  it("un objectif triathlon ambigu (IM/70.3) reste sur le défaut historique vélo quand sport est omis", () => {
    for (const objectif of ["IM", "703"]) {
      const withoutSport = getVLamaxRangeForPlan(objectif, "age_group");
      const explicitBike = getVLamaxRangeForPlan(objectif, "age_group", "bike");
      expect(withoutSport, objectif).toEqual(explicitBike);
    }
  });

  it("les objectifs auparavant ratés par la détection locale incomplète du caller (10K, 5K, TrailShort) reçoivent désormais la bonne cible", () => {
    // `sportForVlamax` (promptHelpers.ts) ne détectait que
    // Marathon/Semi/Trail via startsWith — ces variantes en faisaient partie
    // des angles morts avant le fix (sport transmis = null, donc bike).
    const tenK = getVLamaxRangeForPlan("10K", "age_group", null);
    const tenKRun = getVLamaxRangeForPlan("10K", "age_group", "run");
    expect(tenK).toEqual(tenKRun);

    const trailShort = getVLamaxRangeForPlan("TrailShort", "age_group", null);
    const trailShortRun = getVLamaxRangeForPlan("TrailShort", "age_group", "run");
    expect(trailShort).toEqual(trailShortRun);
  });
});
