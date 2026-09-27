import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Garde-fou de régression (audit "génération de plan IA", plan Emanuela) :
 * "Bloc 4 · Régénération post-pic" (les 2 semaines de régénération
 * inter-cycles insérées par `computeObjectiveCycleSegments` entre le cycle
 * Marathon et le cycle Ironman) affichait une semaine de charge COMPLÈTE
 * (natation CSS, vélo ramp jusqu'à 105% FTP, brique longue 140', squat/
 * deadlift lourds 4×5 @80-85% 1RM) — alors que le prompt dit explicitement
 * "vraie récupération (-40% volume, pas d'intensité)" pour ces semaines
 * (`RÉGÉNÉRATION POST-PIC`, promptHelpers.ts).
 *
 * Cause : le quota hebdomadaire DÉTERMINISTE (`_weeklyQuotas`, "Le LLM n'a
 * plus la main sur 'combien'") calculait `weekType` via `inferWeekType`, qui
 * ne regarde QUE la position globale de la semaine dans le plan
 * (`load`/`recovery`/`taper`/`race` selon numéro de semaine, cadence de
 * décharge, distance à la fin du plan) — sans aucune connaissance des
 * segments de cycles multi-objectifs. Une semaine de régénération
 * inter-cycles (qui ne tombe dans AUCUN segment de `computeObjectiveCycleSegments`)
 * recevait donc le même quota "load" qu'une semaine normale de
 * développement, recréant côté quota déterministe exactement la
 * contradiction "texte prompt vs contenu réel" déjà rencontrée avec
 * `catalogObjective` (PR #270).
 *
 * `generatePlan` (la fonction contenant ce calcul) fait un appel réseau
 * authentifié complet — non unitairement testable ici sans mock lourd, même
 * limitation que les autres guard tests de ce fichier. Ce test vérifie donc,
 * en lisant le SOURCE, que le quota force bien `weekType="recovery"` pour
 * toute semaine hors des segments de cycles connus, AVANT l'appel à
 * `inferWeekType`.
 */
describe("useAITrainingPlan — garde-fou anti-régression : les semaines de régénération inter-cycles reçoivent un quota réduit", () => {
  const source = readFileSync(
    join(__dirname, "../useAITrainingPlan.ts"),
    "utf-8",
  );

  it("calcule cycleSegmentsForRegen via computeObjectiveCycleSegments avant la boucle de quota", () => {
    const idx = source.indexOf("const cycleSegmentsForRegen = computeObjectiveCycleSegments(");
    expect(idx, "cycleSegmentsForRegen est introuvable — a-t-il été renommé/déplacé ?").toBeGreaterThan(-1);
    const loopIdx = source.indexOf("for (let w = 1; w <= totalWeeks; w++) {");
    expect(loopIdx).toBeGreaterThan(-1);
    expect(idx, "cycleSegmentsForRegen doit être calculé AVANT la boucle de quota").toBeLessThan(loopIdx);
  });

  it("force weekType='recovery' pour toute semaine hors des segments de cycles connus, avant inferWeekType", () => {
    const isPostPeakIdx = source.indexOf("const isPostPeakRegenWeek =");
    expect(isPostPeakIdx, "la détection isPostPeakRegenWeek est introuvable").toBeGreaterThan(-1);
    const weekTypeIdx = source.indexOf('const weekType = isPostPeakRegenWeek\n          ? "recovery"');
    expect(
      weekTypeIdx,
      "weekType ne force plus 'recovery' pour une semaine de régénération inter-cycles — la fausse 'régénération post-pic' (plan Emanuela) redeviendrait une semaine de charge complète",
    ).toBeGreaterThan(-1);
    expect(weekTypeIdx).toBeGreaterThan(isPostPeakIdx);
    // inferWeekType reste l'implémentation de fallback pour les semaines normales.
    const inferCallIdx = source.indexOf(": inferWeekType(globalWeekNum, effTotalWeeks,");
    expect(inferCallIdx).toBeGreaterThan(weekTypeIdx);
  });
});
