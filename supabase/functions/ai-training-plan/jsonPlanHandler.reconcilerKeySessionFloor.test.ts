import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { applyReconciler } from "./jsonPlanHandler.ts";

/**
 * Fix 4/4 vague 1 (audit "génération de plan IA", volet composition
 * hebdomadaire), volet serveur : le filet INSERT de applyReconciler (b) ne se
 * déclenchait que si `present === 0` (aucune séance de ce sport DU TOUT) —
 * un sport avec des séances toutes classées récupération/technique passait
 * sans jamais recevoir de séance de qualité. Pour swim/bike/run, `present`
 * compte désormais uniquement les séances déjà classées endurance/seuil/
 * vo2/race_sim (via classifyIntensity). Deuxième moitié du même bug : le pool
 * de candidats d'insertion acceptait "recovery" pour ces sports (la séance
 * injectée pouvait donc elle-même être une récup) et la séance insérée était
 * taguée `isKeySession: floorMin > 0` — toujours faux pour swim, qui n'a pas
 * de floor SL dédié. Renfo garde l'ancien comportement (présence simple,
 * pool large, tag inchangé) — sa notion de "clé" n'a pas le même sens.
 */

function mkSess(day: string, sport: string, opts: { title: string; details?: string; zones?: string[]; catalogId?: string | null }): any {
  return {
    day, sport, title: opts.title, details: opts.details ?? "",
    catalogId: opts.catalogId ?? null, custom: !opts.catalogId,
    durationMin: 45, zones: opts.zones ?? [],
  };
}
function mkChunk(weekNumber: number, sessions: any[]): any {
  return { weeks: [{ weekNumber, phase: "build", theme: "Test", sessions }] };
}

const SWIM_QUOTA = {
  quota: {
    swim: { min: 1, max: 5 }, bike: { min: 0, max: 0 }, run: { min: 0, max: 0 },
    brick: { min: 0, max: 1 }, strength: { min: 0, max: 2 },
    totalSessions: { min: 1, max: 10 }, maxSessionsPerDay: 2, minFullRestDays: 0,
  },
  weekType: "load",
};

const DUMP_SWIM_ENDURANCE = `#### Natation
| ID | Cat | Titre | Phase | Durée | Structure |
| SWIM_ENDURANCE_CONTINU | A | Sortie continue | Base | 40-55 | endurance Z2 continue [Z2] |
`;

const DUMP_SWIM_RECOVERY_ONLY = `#### Natation
| ID | Cat | Titre | Phase | Durée | Structure |
| SWIM_RECUP_ACTIVE | D | Récupération active | Base | 20-30 | récup Z1 souple [Z1] |
`;

Deno.test("applyReconciler (insert) — natation 2 séances toutes récup/technique + quota min=1 : le floor s'active quand même", () => {
  const chunk = mkChunk(1, [
    mkSess("mardi", "swim", { title: "Récup natation", details: "Retour au calme", zones: ["Z1"] }),
    mkSess("jeudi", "swim", { title: "Technique nage", details: "Drills", zones: ["Z1"] }),
  ]);
  const { chunks: out, repairs } = applyReconciler([chunk], { 1: SWIM_QUOTA }, [DUMP_SWIM_ENDURANCE], null);

  const swimSessions = out[0].weeks[0].sessions.filter((s: any) => s.sport === "swim");
  assertEquals(swimSessions.length, 3, "une 3e séance natation doit avoir été insérée");
  const inserted = swimSessions.find((s: any) => s.catalogId === "SWIM_ENDURANCE_CONTINU");
  assert(inserted, "la séance insérée doit venir du catalogue endurance");
  assertEquals(inserted.isKeySession, true, "swim n'a pas de floor SL dédié : sans le fix, ce tag restait toujours false");
  assert(repairs.some((r: any) => r.code === "session_inserted" && r.sport === "swim"));
});

Deno.test("applyReconciler (insert) — natation avec une séance déjà classée endurance : le floor ne se déclenche pas", () => {
  const chunk = mkChunk(1, [
    mkSess("mardi", "swim", { title: "Sortie continue", details: "endurance Z2", zones: ["Z2"] }),
    mkSess("jeudi", "swim", { title: "Technique nage", details: "Drills", zones: ["Z1"] }),
  ]);
  const { chunks: out, repairs } = applyReconciler([chunk], { 1: SWIM_QUOTA }, [DUMP_SWIM_ENDURANCE], null);

  const swimSessions = out[0].weeks[0].sessions.filter((s: any) => s.sport === "swim");
  assertEquals(swimSessions.length, 2, "aucune insertion attendue, une séance clé existe déjà");
  assert(!repairs.some((r: any) => r.code === "session_inserted" && r.sport === "swim"));
});

Deno.test("applyReconciler (insert) — seule candidate catalogue dispo pour natation est une récup : insertion refusée, pas de fausse correction", () => {
  const chunk = mkChunk(1, [
    mkSess("mardi", "swim", { title: "Récup natation", details: "Retour au calme", zones: ["Z1"] }),
  ]);
  const { chunks: out, repairs } = applyReconciler([chunk], { 1: SWIM_QUOTA }, [DUMP_SWIM_RECOVERY_ONLY], null);

  const swimSessions = out[0].weeks[0].sessions.filter((s: any) => s.sport === "swim");
  assertEquals(swimSessions.length, 1, "aucune séance récup ne doit être insérée pour combler le floor clé");
  assert(repairs.some((r: any) => r.code === "insert_unresolved" && r.sport === "swim"));
});

const STRENGTH_QUOTA = {
  quota: {
    swim: { min: 0, max: 0 }, bike: { min: 0, max: 0 }, run: { min: 0, max: 0 },
    brick: { min: 0, max: 1 }, strength: { min: 1, max: 3 },
    totalSessions: { min: 1, max: 10 }, maxSessionsPerDay: 2, minFullRestDays: 0,
  },
  weekType: "load",
};

const DUMP_STRENGTH = `#### Renfo
| ID | Cat | Titre | Phase | Durée | Structure |
| STRENGTH_GENERAL | A | Circuit général | Base | 40-50 | renforcement général |
`;

Deno.test("applyReconciler (insert) — régression : renfo garde le critère de simple présence (pas de notion de séance clé)", () => {
  const chunk = mkChunk(1, [
    mkSess("mercredi", "strength", { title: "Circuit léger", details: "récup articulaire" }),
  ]);
  const { chunks: out, repairs } = applyReconciler([chunk], { 1: STRENGTH_QUOTA }, [DUMP_STRENGTH], null);

  const strengthSessions = out[0].weeks[0].sessions.filter((s: any) => s.sport === "strength");
  assertEquals(strengthSessions.length, 1, "renfo déjà présent (même non-clé) : aucune insertion");
  assert(!repairs.some((r: any) => r.code === "session_inserted" && r.sport === "strength"));
});
