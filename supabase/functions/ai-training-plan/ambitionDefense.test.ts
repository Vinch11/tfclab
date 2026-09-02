import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { enforceAmbitionCap } from "./ambitionDefense.ts";

/**
 * Meme bug que sportRatioMatrix.normalizeAmbKey (voir ce fichier de test) mais
 * dans le filet de securite serveur : `enforceAmbitionCap` recoit
 * `planConfig.ambition`, toujours l'un des 5 libelles UI actuels
 * (src/types/ambitionLevel.ts). "Elite" (mot nu) est le libelle de
 * world_class ; avant le fix, il matchait la branche "elite/pro/qualif" et
 * l'athlete etait traite comme l'ancien palier interne "elite" (Qualifiable)
 * pour le cap trainingLevel -> ambition.
 */
Deno.test("enforceAmbitionCap('Elite', 'trained') plafonne au bon niveau (world_class > cap elite)", () => {
  const result = enforceAmbitionCap("Elite", "trained");
  assertEquals(result.ambitionSaisie, "world_class");
  assertEquals(result.ambitionEffective, "elite");
  assertEquals(result.serverDowngraded, true);
});

Deno.test("enforceAmbitionCap('Elite', 'highly_trained') ne plafonne pas (pas de cap)", () => {
  const result = enforceAmbitionCap("Elite", "highly_trained");
  assertEquals(result.ambitionSaisie, "world_class");
  assertEquals(result.ambitionEffective, "world_class");
  assertEquals(result.serverDowngraded, false);
});

Deno.test("enforceAmbitionCap('Qualifiable', 'trained') reste sur l'ancien palier elite, pas de cap", () => {
  const result = enforceAmbitionCap("Qualifiable", "trained");
  assertEquals(result.ambitionSaisie, "elite");
  assertEquals(result.ambitionEffective, "elite");
  assertEquals(result.serverDowngraded, false);
});
