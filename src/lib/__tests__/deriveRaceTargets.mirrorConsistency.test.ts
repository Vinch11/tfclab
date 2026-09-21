import { describe, it, expect } from "vitest";
import { buildPaceTargets, deriveRaceTargets } from "../deriveRaceTargets";
import {
  buildPaceTargets as buildPaceTargetsServer,
  deriveRaceTargets as deriveRaceTargetsServer,
} from "../../../supabase/functions/_shared/deriveRaceTargets";

/**
 * Piste "fiabilité des plans générés" (suite de l'audit "duplications
 * client/serveur") : `deriveRaceTargets.ts` est marqué "MIROIR EXACT" entre
 * src/lib/ (client) et supabase/functions/_shared/ (edge function, Deno —
 * ne peut pas importer depuis src/). Un vrai écart a été trouvé ici : la
 * copie serveur avait perdu le champ `allureMarathon` de `PaceTargets`
 * (silencieusement `undefined` côté edge function). Ce test compare les
 * deux copies sur des entrées représentatives pour empêcher toute future
 * divergence silencieuse du même type.
 */
describe("deriveRaceTargets — les copies client et serveur restent des MIROIRS EXACTS", () => {
  it("buildPaceTargets : sorties identiques pour plusieurs allures/VMA", () => {
    const cases: Array<[number, number | null]> = [
      [240, 16],
      [300, null],
      [180, 20],
      [420, 12],
    ];
    for (const [racePaceSecPerKm, vmaKmh] of cases) {
      expect(buildPaceTargetsServer(racePaceSecPerKm, vmaKmh)).toEqual(
        buildPaceTargets(racePaceSecPerKm, vmaKmh),
      );
    }
  });

  it("deriveRaceTargets : sorties identiques pour plusieurs profils objectif × ambition", () => {
    const inputs = [
      { vmaKmh: 16, thresholdPaceSecPerKm: 240, objective: "Marathon", ambition: "age_group" },
      { vmaKmh: null, thresholdPaceSecPerKm: null, objective: "Semi", ambition: "finisher" },
      { vmaKmh: 18, thresholdPaceSecPerKm: 210, objective: "10K", ambition: "elite", weeklyHours: 8 },
      { vmaKmh: 14, thresholdPaceSecPerKm: null, objective: "IM", ambition: "competitor", sport: "triathlon_im" as const },
    ];
    for (const input of inputs) {
      expect(deriveRaceTargetsServer(input)).toEqual(deriveRaceTargets(input));
    }
  });
});
