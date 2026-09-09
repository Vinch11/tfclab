import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { applyReconciler } from "./jsonPlanHandler.ts";

/**
 * Bug réel confirmé sur 2 régénérations indépendantes du plan "Vince" (audit
 * fiabilité génération de plan IA) : le LLM réutilise parfois verbatim le
 * même catalogId 2× (voire 3×) dans la même semaine — ex: V3_BIKE_FORCE_SFR
 * jeudi ET vendredi, alors que sa PROPRE fiche dit "1x/semaine max" — ou une
 * même séance de récupération/gut-training copiée-collée sur 2-3 jours
 * consécutifs. Conséquence observée sur les vrais plans : des semaines
 * entières où un sport ne reçoit plus AUCUNE variété, parfois plus aucune
 * séance qualité du tout (toutes les occurrences restantes = la même
 * récupération recopiée). Rien ne détectait ni ne corrigeait cela avant ce
 * correctif : le réconciliateur ne vérifiait que les min/max par sport et
 * par jour, jamais la répétition d'un même catalogId au sein d'une semaine.
 */

const CATALOG_DUMP_WITH_ALTERNATIVE = `#### Vélo
| ID | Cat | Titre | Phase | Durée | Structure |
| V3_BIKE_FORCE_SFR | B | SFR Côte | Base/Build | 70-90 | Warmup [Z1,Z2] 15min. Main 6-8x4min montée [Z3,Z4] r=4min Z1. |
| V3_BIKE_THRESHOLD_HILLS | B | Seuil Côtes | Base/Build | 60-80 | Warmup [Z1,Z2] 15min. Main 4x8min côte [Z3,Z4] r=5min Z1. |
`;

const CATALOG_DUMP_NO_ALTERNATIVE = `#### Vélo
| ID | Cat | Titre | Phase | Durée | Structure |
| V3_BIKE_FORCE_SFR | B | SFR Côte | Base/Build | 70-90 | Warmup [Z1,Z2] 15min. Main 6-8x4min montée [Z3,Z4] r=4min Z1. |
`;

function mkSfrSession(day: string): any {
  return {
    day,
    sport: "bike",
    title: "SFR — Strength/Force Resistance en côte",
    details: "Warm-up 15' Z1→Z2. Main 6-8x4' montée Z3,Z4 r=4' Z1. [ID: V3_BIKE_FORCE_SFR]",
    isKeySession: false,
    custom: false,
    catalogId: "V3_BIKE_FORCE_SFR",
    durationMin: 80,
    zones: ["Z3", "Z4"],
  };
}

function mkChunk(sessions: any[]): any {
  return { weeks: [{ weekNumber: 1, phase: "base", theme: "Test", sessions }] };
}

const BASE_QUOTA = {
  1: {
    weekType: "load",
    quota: {
      swim: { min: 0, max: 0 }, bike: { min: 1, max: 5 }, run: { min: 0, max: 5 },
      brick: { min: 0, max: 1 }, strength: { min: 0, max: 2 },
      totalSessions: { min: 1, max: 10 }, maxSessionsPerDay: 2, minFullRestDays: 0,
    },
    floors: {},
  },
};

Deno.test("applyReconciler — catalogId dupliqué dans la même semaine (cas réel SFR jeu+ven) : remplacé par une alternative de même classe d'intensité", () => {
  const chunk = mkChunk([mkSfrSession("jeudi"), mkSfrSession("vendredi")]);
  const { chunks, repairs } = applyReconciler([chunk], BASE_QUOTA, [CATALOG_DUMP_WITH_ALTERNATIVE], null);

  const sessions = chunks[0].weeks[0].sessions;
  const ids = sessions.map((s: any) => s.catalogId);
  // La 1re occurrence (jeudi) reste intacte.
  assertEquals(ids[0], "V3_BIKE_FORCE_SFR");
  // La 2e occurrence (vendredi) a été remplacée — plus le même ID dupliqué.
  assertEquals(ids[1], "V3_BIKE_THRESHOLD_HILLS");
  // Plus aucun doublon dans la semaine.
  assertEquals(new Set(ids).size, ids.length);

  const repair = repairs.find((r) => r.code === "duplicate_catalog_id_replaced");
  assert(repair, "repair duplicate_catalog_id_replaced attendu");
  assertEquals(repair!.sport, "bike");
});

Deno.test("applyReconciler — catalogId dupliqué, aucune alternative disponible : signalé mais pas de fausse correction", () => {
  const chunk = mkChunk([mkSfrSession("jeudi"), mkSfrSession("vendredi")]);
  const { chunks, repairs } = applyReconciler([chunk], BASE_QUOTA, [CATALOG_DUMP_NO_ALTERNATIVE], null);

  const sessions = chunks[0].weeks[0].sessions;
  const ids = sessions.map((s: any) => s.catalogId);
  // Sans alternative, on ne remplace PAS par un ID inventé — les deux occurrences
  // restent identiques (dégradation visible plutôt que correction hasardeuse).
  assertEquals(ids[0], "V3_BIKE_FORCE_SFR");
  assertEquals(ids[1], "V3_BIKE_FORCE_SFR");

  const repair = repairs.find((r) => r.code === "duplicate_catalog_id_unresolved");
  assert(repair, "repair duplicate_catalog_id_unresolved attendu");
});

Deno.test("applyReconciler — pas de duplicata : aucun repair de déduplication émis", () => {
  const chunk = mkChunk([mkSfrSession("jeudi")]);
  const { repairs } = applyReconciler([chunk], BASE_QUOTA, [CATALOG_DUMP_WITH_ALTERNATIVE], null);
  assert(!repairs.some((r) => r.code === "duplicate_catalog_id_replaced" || r.code === "duplicate_catalog_id_unresolved"));
});

Deno.test("applyReconciler — aucune alternative dans le dump du chunk courant, mais disponible dans un AUTRE chunk : repli catalogue global (bug réel 'Test_Vince', S1 mardi+jeudi jamais corrigé)", () => {
  // Chunk 0 (S1) : dump rotationné ne contient QUE V3_BIKE_FORCE_SFR — aucune
  // alternative locale, exactement le cas réel observé (rotation catalogue
  // par chunk peut exclure les fiches concurrentes de la même classe).
  const chunk0 = mkChunk([mkSfrSession("mardi"), mkSfrSession("jeudi")]);
  // Chunk 1 (S2, autre semaine) : dump différent, contient une alternative.
  const chunk1 = mkChunk([]);
  chunk1.weeks[0].weekNumber = 2;

  const { chunks, repairs } = applyReconciler(
    [chunk0, chunk1],
    { ...BASE_QUOTA, 2: BASE_QUOTA[1] },
    [CATALOG_DUMP_NO_ALTERNATIVE, CATALOG_DUMP_WITH_ALTERNATIVE],
    null,
  );

  const ids = chunks[0].weeks[0].sessions.map((s: any) => s.catalogId);
  assertEquals(ids[0], "V3_BIKE_FORCE_SFR", "1re occurrence intacte");
  assertEquals(ids[1], "V3_BIKE_THRESHOLD_HILLS", "2e occurrence corrigée via le catalogue de l'AUTRE chunk");
  assertEquals(new Set(ids).size, ids.length, "plus aucun doublon dans S1");

  const repair = repairs.find((r) => r.code === "duplicate_catalog_id_replaced");
  assert(repair, "repair duplicate_catalog_id_replaced attendu (repli global réussi)");
});

// Fix B4 (audit "génération de plan IA") : l'ancien filtre acceptait
// N'IMPORTE QUELLE classe de remplacement dès que la classe de la VICTIME
// était "unknown" (texte non reconnu par classifyIntensity) — une séance clé
// dupliquée dont le texte ne matche aucun marqueur d'intensité connu pouvait
// ainsi être silencieusement dégradée en récupération. Le fix : sans classe
// de confiance sur l'original, on ne devine plus — la séance d'origine est
// conservée telle quelle plutôt que remplacée à l'aveugle.
function mkUnknownClassSession(day: string): any {
  return {
    day,
    sport: "bike",
    title: "Séance signature propriétaire",
    details: "Protocole confidentiel — voir coach pour le détail.",
    isKeySession: true,
    custom: false,
    catalogId: "V3_BIKE_UNKNOWN_PROTOCOL",
    durationMin: 80,
    zones: [],
  };
}

Deno.test("applyReconciler — victime classe 'unknown' : occurrence dupliquée CONSERVÉE telle quelle, jamais remplacée par une classe devinée (recovery incluse)", () => {
  // Dump avec une alternative "recovery" — exactement le scénario risqué que
  // l'ancien filtre permissif aurait accepté (dégradation silencieuse d'une
  // séance clé en récupération).
  const dumpWithRecoveryAlternative = `#### Vélo
| ID | Cat | Titre | Phase | Durée | Structure |
| V3_BIKE_UNKNOWN_PROTOCOL | B | Protocole propriétaire | Base/Build | 70-90 | Protocole confidentiel — voir coach. |
| V3_BIKE_RECOVERY_SPIN | B | Récup spin | Base/Build | 40-60 | Récupération active [Z1]. |
`;
  const chunk = mkChunk([mkUnknownClassSession("jeudi"), mkUnknownClassSession("vendredi")]);
  const { chunks, repairs } = applyReconciler([chunk], BASE_QUOTA, [dumpWithRecoveryAlternative], null);

  const sessions = chunks[0].weeks[0].sessions;
  const ids = sessions.map((s: any) => s.catalogId);
  // Les 2 occurrences restent IDENTIQUES — pas de substitution hasardeuse.
  assertEquals(ids[0], "V3_BIKE_UNKNOWN_PROTOCOL");
  assertEquals(ids[1], "V3_BIKE_UNKNOWN_PROTOCOL");
  // isKeySession n'est jamais dégradé (aucune mutation de la séance).
  assertEquals(sessions[1].isKeySession, true);

  assert(
    !repairs.some((r) => r.code === "duplicate_catalog_id_replaced"),
    "aucun remplacement ne doit être tenté pour une victime de classe unknown",
  );
  const unresolved = repairs.find((r) => r.code === "duplicate_catalog_id_unresolved");
  assert(unresolved, "repair duplicate_catalog_id_unresolved attendu (visibilité QA du doublon conservé)");
  assertEquals(unresolved!.sport, "bike");
});

Deno.test("applyReconciler — 3 occurrences du même catalogId : les 2 dernières remplacées, la 1re intacte", () => {
  const dump = `#### Vélo
| ID | Cat | Titre | Phase | Durée | Structure |
| V3_BIKE_FORCE_SFR | B | SFR Côte | Base/Build | 70-90 | Warmup [Z1,Z2] 15min. Main 6-8x4min montée [Z3,Z4] r=4min Z1. |
| V3_BIKE_THRESHOLD_HILLS | B | Seuil Côtes | Base/Build | 60-80 | Warmup [Z1,Z2] 15min. Main 4x8min côte [Z3,Z4] r=5min Z1. |
| V3_BIKE_TEMPO_HILLS | B | Tempo Côtes | Base/Build | 60-80 | Warmup [Z1,Z2] 15min. Main 3x10min côte [Z3,Z4] r=5min Z1. |
`;
  const chunk = mkChunk([mkSfrSession("mardi"), mkSfrSession("jeudi"), mkSfrSession("vendredi")]);
  const { chunks } = applyReconciler([chunk], BASE_QUOTA, [dump], null);
  const ids = chunks[0].weeks[0].sessions.map((s: any) => s.catalogId);
  assertEquals(ids[0], "V3_BIKE_FORCE_SFR");
  assertEquals(new Set(ids).size, 3, "les 3 occurrences doivent porter des catalogId distincts");
});
