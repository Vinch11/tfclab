import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import type { RepairIntentFamily, RepairWorkoutMetadata } from "../_shared/repairSportingEquivalence.ts";
import { applySLFloorEnforcement } from "./jsonPlanHandler.ts";

/**
 * Correction 1 (finalisation PR #383, "preserve-repair-intent") :
 * `repairCandidateCompatible` contournait TOUTE vérification sportive dès
 * que le pool de candidats transmis à une réparation ne contenait AUCUNE
 * métadonnée structurée (`if (!pool.some(item => item.metadata)) return
 * true;`). Ce raccourci n'était pas qu'un artefact de test : un payload
 * client ancien (sans `chunkRepairCatalogs`/`phaseRepairCatalogs`) ou un
 * chunk entièrement retombé sur le parsing Markdown déclenchait exactement
 * la même condition EN PRODUCTION. Ces tests vérifient, en appelant les
 * fonctions de réparation SANS jamais positionner `allowUnverifiedCatalog-
 * Metadata` (donc avec son défaut `false`, identique au comportement réel
 * du handler SSE), que :
 *   1. l'absence totale de métadonnées ne bypasse plus rien (ancien format
 *      de payload) ;
 *   2. un catalogue partiellement peuplé en métadonnées ne laisse jamais
 *      passer une fiche SANS métadonnées propre, même si d'autres entrées
 *      du pool global en portent ;
 *   3. une séance d'origine absente du catalogue actuel bloque le
 *      remplacement par prudence ;
 *   4. le repli catalogue global retrouve correctement des métadonnées
 *      présentes dans un AUTRE chunk ;
 *   5. une incompatibilité sportive reste rejetée même avec des métadonnées
 *      complètes des deux côtés ;
 *   6. une substitution réellement équivalente reste acceptée en mode
 *      production strict (pas besoin du mode de compatibilité test-only) ;
 *   7. une entrée de métadonnées malformée (incohérente) est ignorée plutôt
 *      qu'acceptée aveuglément — repli sur un pool sans métadonnées, donc
 *      refusé comme au point 1.
 */

function metadata(
  id: string,
  intentFamily: RepairIntentFamily,
  zones: string[],
  options: Partial<RepairWorkoutMetadata> = {},
): RepairWorkoutMetadata {
  return {
    metadataVersion: 1,
    complete: true,
    id,
    sport: "run",
    title: id,
    objective: id,
    intentFamily,
    goals: [],
    objectiveSpecific: false,
    phases: ["base", "build", "peak", "taper"],
    durationMin: [60, 120],
    mainZoneMax: zones.some(zone => /Z4/i.test(zone)) ? 4 : 2,
    specialContext: null,
    prerequisiteKeys: [],
    necessity: "Recommandé",
    when: "Toute l'année",
    avoid: "",
    tags: [],
    structure: `${id} ${zones.join(" ")}`,
    zones,
    ...options,
  };
}

function mkChunk(weekNumber: number, sessions: any[]): any {
  return { weeks: [{ weekNumber, phase: "build", theme: "Test", sessions }] };
}

const SL_FLOOR_ENTRY = {
  weekType: "load",
  longRideWeekly: false,
  longRunWeekly: true,
  slLongRideMin: 0,
  slLongRunMin: 90,
};

Deno.test("Correction 1 — ancien format de payload (pas de repairCatalogsByChunk) : la réparation échoue fermé, plus de bypass silencieux", () => {
  // Dump Markdown seul — exactement le format qu'un client non redéployé
  // envoyait avant l'introduction de chunkRepairCatalogs/phaseRepairCatalogs.
  // Avant le fix, le pool entier étant sans métadonnées, la substitution
  // était acceptée sans aucune vérification sportive.
  const dump = `#### Course
| ID | Cat | Titre | Phase | Durée | Structure |
| LEGACY_RUN_LONG | A | Sortie longue générique | Base | 90-150 | endurance Z2 continue |
`;
  const chunk = mkChunk(1, [
    { day: "dimanche", sport: "run", title: "Footing", details: "", catalogId: "CUSTOM_RUN", custom: true, durationMin: 60 },
  ]);

  // Appel strictement au format production (pas de repairCatalogsByChunk,
  // pas de allowUnverifiedCatalogMetadata) : le défaut doit s'appliquer.
  const { chunks: out, repairs } = applySLFloorEnforcement([chunk], { 1: SL_FLOOR_ENTRY }, [dump]);

  const sess = out[0].weeks[0].sessions[0];
  assertEquals(sess.catalogId, "CUSTOM_RUN", "sans métadonnées vérifiables, la séance d'origine doit être conservée");
  const repair = repairs.find(r => r.code === "sl_upgrade_unresolved");
  assert(repair, "sl_upgrade_unresolved attendu : plus de contournement implicite sans métadonnées");
  assertEquals(repair!.severity, "critical");
});

Deno.test("Correction 1 — catalogue partiellement peuplé : une fiche SANS métadonnées propre n'est jamais choisie, même si le pool global en contient ailleurs", () => {
  // Chunk 0 : la semaine à réparer, dump local sans aucune fiche run.
  const DUMP0_NO_RUN = `#### Vélo
| ID | Cat | Titre | Phase | Durée | Structure |
| V2_BIKE_RECOVERY | D | Récup vélo | Base | 30-45 | récup Z1 |
`;
  // Chunk 1 : métadonnées structurées présentes, mais pour un AUTRE sport
  // (swim) — c'est cette entrée qui, avant le fix, aurait suffi à rendre
  // `pool.some(item => item.metadata)` vrai pour tout le pool et à
  // bypasser la vérification du candidat run du chunk 2.
  const SWIM_METADATA = metadata("SWIM_UNRELATED", "endurance_fondamentale", ["Z2"], { sport: "swim" });
  // Chunk 2 : AUCUNE métadonnée structurée transmise pour ce chunk — repli
  // sur le parsing Markdown, donc candidat run SANS métadonnées propre.
  const DUMP2_WITH_RUN_MARKDOWN_ONLY = `#### Course
| ID | Cat | Titre | Phase | Durée | Structure |
| MARKDOWN_ONLY_RUN_LONG | A | Sortie longue générique | Base | 90-150 | endurance Z2 continue |
`;

  const chunk0 = mkChunk(1, [
    { day: "dimanche", sport: "run", title: "Footing", details: "", catalogId: "CUSTOM_RUN", custom: true, durationMin: 60 },
  ]);
  const chunk1 = mkChunk(2, []);
  const chunk2 = mkChunk(3, []);

  const { chunks: out, repairs } = applySLFloorEnforcement(
    [chunk0, chunk1, chunk2],
    { 1: SL_FLOOR_ENTRY },
    [DUMP0_NO_RUN, "", DUMP2_WITH_RUN_MARKDOWN_ONLY],
    [[], [SWIM_METADATA], []],
  );

  const sess = out[0].weeks[0].sessions[0];
  assertEquals(sess.catalogId, "CUSTOM_RUN", "le candidat markdown-only (chunk 2) ne doit jamais être choisi sans métadonnées propres");
  const repair = repairs.find(r => r.code === "sl_upgrade_unresolved");
  assert(repair, "sl_upgrade_unresolved attendu malgré la présence de métadonnées ailleurs dans le pool (chunk 1, sport différent)");
});

Deno.test("Correction 1 — séance d'origine absente du catalogue actuel : remplacement refusé par prudence", () => {
  // Le candidat de remplacement est sportivement plausible et porte des
  // métadonnées complètes, mais AUCUNE entrée du pool ne correspond à
  // l'identifiant de la séance d'origine — le remplacement ne peut pas
  // prouver qu'il préserve l'intention d'origine.
  const CANDIDATE = metadata("RUN_CANDIDATE_LONG", "endurance_fondamentale", ["Z2"], { durationMin: [90, 150] });
  const chunk = mkChunk(1, [
    { day: "dimanche", sport: "run", title: "Footing", details: "", catalogId: "GHOST_SESSION_NOT_IN_CATALOG", custom: false, durationMin: 60 },
  ]);

  const { chunks: out, repairs } = applySLFloorEnforcement(
    [chunk],
    { 1: SL_FLOOR_ENTRY },
    [""],
    [[CANDIDATE]],
  );

  const sess = out[0].weeks[0].sessions[0];
  assertEquals(sess.catalogId, "GHOST_SESSION_NOT_IN_CATALOG", "sans preuve de l'intention d'origine, la séance doit être conservée");
  assert(repairs.some(r => r.code === "sl_upgrade_unresolved"));
});

Deno.test("Correction 1 — métadonnées de l'origine présentes dans un AUTRE chunk : le repli catalogue global les retrouve et autorise un remplacement compatible", () => {
  const ORIGINAL = metadata("RUN_ORIGINAL_SHORT", "endurance_fondamentale", ["Z2"], { durationMin: [40, 65] });
  const CANDIDATE = metadata("RUN_CANDIDATE_LONG", "endurance_fondamentale", ["Z2"], { durationMin: [90, 150] });

  // La séance à réparer (chunk 0) référence RUN_ORIGINAL_SHORT, mais ses
  // métadonnées ne sont transmises que dans le repairCatalogsByChunk du
  // chunk 1 (même plan, autre semaine) — scénario réaliste de rotation de
  // catalogue par chunk.
  const chunk0 = mkChunk(1, [
    { day: "dimanche", sport: "run", title: ORIGINAL.title, details: ORIGINAL.structure, catalogId: ORIGINAL.id, custom: false, durationMin: 60 },
  ]);
  const chunk1 = mkChunk(2, []);

  const { chunks: out, repairs } = applySLFloorEnforcement(
    [chunk0, chunk1],
    { 1: SL_FLOOR_ENTRY },
    ["", ""],
    [[CANDIDATE], [ORIGINAL]],
  );

  const sess = out[0].weeks[0].sessions[0];
  assertEquals(sess.catalogId, CANDIDATE.id, "le lookup cross-chunk de l'origine doit permettre la substitution");
  assert(repairs.some(r => r.code === "sl_upgraded"));
});

Deno.test("Correction 1 — rejet d'un remplacement sportivement incompatible malgré des métadonnées complètes des deux côtés", () => {
  const ORIGINAL = metadata("RUN_EASY_ORIGINAL", "endurance_fondamentale", ["Z2"], { durationMin: [40, 65] });
  const INCOMPATIBLE = metadata("RUN_VO2_DISGUISED", "vo2", ["Z4"], { durationMin: [90, 150] });

  const chunk = mkChunk(1, [
    { day: "dimanche", sport: "run", title: ORIGINAL.title, details: ORIGINAL.structure, catalogId: ORIGINAL.id, custom: false, durationMin: 60 },
  ]);

  const { chunks: out, repairs } = applySLFloorEnforcement(
    [chunk],
    { 1: SL_FLOOR_ENTRY },
    [""],
    [[ORIGINAL, INCOMPATIBLE]],
  );

  const sess = out[0].weeks[0].sessions[0];
  assertEquals(sess.catalogId, ORIGINAL.id, "un remplacement vo2 ne doit jamais se substituer à une sortie longue facile, même avec métadonnées complètes");
  assert(repairs.some(r => r.code === "sl_upgrade_unresolved"));
});

Deno.test("Correction 1 — acceptation d'un remplacement sportivement réellement équivalent, en mode production strict (sans allowUnverifiedCatalogMetadata)", () => {
  const ORIGINAL = metadata("RUN_EASY_ORIGINAL", "endurance_fondamentale", ["Z2"], { durationMin: [40, 65] });
  const EQUIVALENT = metadata("RUN_EASY_LONGER", "endurance_fondamentale", ["Z2"], { durationMin: [90, 150] });

  const chunk = mkChunk(1, [
    { day: "dimanche", sport: "run", title: ORIGINAL.title, details: ORIGINAL.structure, catalogId: ORIGINAL.id, custom: false, durationMin: 60 },
  ]);

  const { chunks: out, repairs } = applySLFloorEnforcement(
    [chunk],
    { 1: SL_FLOOR_ENTRY },
    [""],
    [[ORIGINAL, EQUIVALENT]],
  );

  const sess = out[0].weeks[0].sessions[0];
  assertEquals(sess.catalogId, EQUIVALENT.id, "une substitution génuinement équivalente doit rester acceptée même en mode production strict");
  assert(repairs.some(r => r.code === "sl_upgraded"));
});

Deno.test("Correction 1 — métadonnées incohérentes/malformées (complete:false) : ignorées plutôt qu'acceptées aveuglément, repli sur un pool sans métadonnées donc refusé", () => {
  const ORIGINAL = metadata("RUN_EASY_ORIGINAL", "endurance_fondamentale", ["Z2"], { durationMin: [40, 65] });
  // Entrée volontairement incohérente (payload malformé/legacy) : `complete`
  // à false alors que le reste du shape ressemble à une métadonnée valide.
  // `catalogCandidatesFromMetadata` doit la filtrer, pas l'accepter — le
  // chunk retombe alors entièrement sur le parsing Markdown (sans
  // métadonnées), exactement le cas déjà couvert par le 1er test de ce
  // fichier.
  const MALFORMED = { ...metadata("RUN_CANDIDATE_LONG", "endurance_fondamentale", ["Z2"], { durationMin: [90, 150] }), complete: false } as unknown as RepairWorkoutMetadata;

  // Le dump Markdown du chunk à réparer contient la même fiche candidate
  // sous forme texte (seule forme qui subsiste une fois MALFORMED filtrée).
  const dump0 = `#### Course
| ID | Cat | Titre | Phase | Durée | Structure |
| RUN_CANDIDATE_LONG | A | Sortie longue générique | Base | 90-150 | endurance Z2 continue |
`;
  const chunk0 = mkChunk(1, [
    { day: "dimanche", sport: "run", title: ORIGINAL.title, details: ORIGINAL.structure, catalogId: ORIGINAL.id, custom: false, durationMin: 60 },
  ]);
  // Les métadonnées de l'origine, elles, sont valides et transmises dans un
  // AUTRE chunk — pour prouver que même avec un original retrouvable, le
  // candidat malformé-devenu-markdown-only reste refusé.
  const chunk1 = mkChunk(2, []);

  const { chunks: out, repairs } = applySLFloorEnforcement(
    [chunk0, chunk1],
    { 1: SL_FLOOR_ENTRY },
    [dump0, ""],
    [[MALFORMED], [ORIGINAL]],
  );

  const sess = out[0].weeks[0].sessions[0];
  assertEquals(sess.catalogId, ORIGINAL.id, "une entrée de métadonnées incohérente/malformée ne doit jamais faire accepter un remplacement");
  assert(repairs.some(r => r.code === "sl_upgrade_unresolved"));
});
