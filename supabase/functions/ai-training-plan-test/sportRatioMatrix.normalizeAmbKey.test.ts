import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { normalizeAmbKey } from "./sportRatioMatrix.ts";

/**
 * Bug reel signale par le coach : carte Benchmark affichant "Ambition visee :
 * Confirme" pour un athlete configure en "Elite" (world_class) + "Verrouiller
 * l'ambition". Racine : `config.ambition` transmis au prompt (buildUserPrompt)
 * est toujours l'un des 5 libelles UI actuels (Decouverte/Confirme/Competiteur/
 * Qualifiable/Elite - voir src/types/ambitionLevel.ts AMBITION_DEFINITIONS).
 * "Elite" (mot nu) est desormais le libelle de `world_class`, mais
 * normalizeAmbKey matchait la branche "elite/pro/qualif" avant le fix et
 * retrogradait silencieusement tout athlete Elite vers les cibles de l'ancien
 * palier interne "elite" (libelle "Qualifiable") pour les doubles/semaine, la
 * duree d'affutage et les quotas IM/70.3.
 */
Deno.test("normalizeAmbKey('Elite') -> world_class (libelle UI actuel du palier top 3%)", () => {
  assertEquals(normalizeAmbKey("Elite"), "world_class");
  assertEquals(normalizeAmbKey("elite"), "world_class");
  assertEquals(normalizeAmbKey(" Elite "), "world_class");
});

Deno.test("normalizeAmbKey('Qualifiable') reste elite (ancien palier interne, top 10%)", () => {
  assertEquals(normalizeAmbKey("Qualifiable"), "elite");
  assertEquals(normalizeAmbKey("Qualif"), "elite");
});

Deno.test("normalizeAmbKey — les 5 libelles UI actuels resolvent vers les bonnes cles canoniques", () => {
  assertEquals(normalizeAmbKey("Decouverte"), "finisher");
  assertEquals(normalizeAmbKey("Confirme"), "age_group");
  assertEquals(normalizeAmbKey("Competiteur"), "competitor");
  assertEquals(normalizeAmbKey("Qualifiable"), "elite");
  assertEquals(normalizeAmbKey("Elite"), "world_class");
});

Deno.test("normalizeAmbKey — alias 'world class' / 'mondial' toujours world_class", () => {
  assertEquals(normalizeAmbKey("World Class"), "world_class");
  assertEquals(normalizeAmbKey("mondial"), "world_class");
});
