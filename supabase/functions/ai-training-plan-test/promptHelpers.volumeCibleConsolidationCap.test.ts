import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { buildUserPrompt, buildStructuredDiagnosticBlock, resolveEffectiveVolumeCible } from "./promptHelpers.ts";

/**
 * Audit Codex (oct. 2026), P0-1 — confirmé sur le profil réel B-10K-TO-70.3
 * (consigne coach explicite) : `derived.volumeCible` (ambition elite ×1.1 =
 * 18h pour 17h/sem déclaré) était affiché comme "VOLUME CIBLE HEBDO (SOURCE
 * UNIQUE, NON NÉGOCIABLE)" dans le MÊME prompt qui affiche aussi "Heures
 * dispo/semaine (saisie athlète) : 17h" — deux cibles hebdo différentes sans
 * relation expliquée. Pour CE profil, une consolidation de charge récente
 * est en cours (8h→17h/sem sur 4 semaines, `config.loadHistory`) : 17h est
 * un plafond PROVISOIRE de consolidation, pas un volume obligatoire
 * (consigne coach explicite) — `resolveEffectiveVolumeCible` plafonne donc
 * la cible affichée à la charge récente démontrée tant que la consolidation
 * n'est pas validée par le coach.
 */
function b10kTo703Config(overrides: Record<string, unknown> = {}) {
  return {
    objective: "IRONMAN 70.3",
    ambition: "Qualifiable", // libellé UI → clé canonique "elite" (multiplicateurVolume 1.1)
    weeklyHours: 17,
    weeksAvailable: 32,
    raceGoals: [{ objective: "IRONMAN 70.3", priority: "A" }],
    ...overrides,
  };
}

Deno.test("resolveEffectiveVolumeCible — consolidation active (ratio >1.3) ET cible ambition au-dessus de la charge récente → plafonne à la charge récente", () => {
  const { effectiveVolumeCible, consolidationCapApplied } = resolveEffectiveVolumeCible(18, {
    chronicWeeklyHours: 8,
    recentWeeklyHours: 17,
  });
  assertEquals(effectiveVolumeCible, 17);
  assertEquals(consolidationCapApplied, true);
});

Deno.test("resolveEffectiveVolumeCible — pas de loadHistory → volumeCible inchangé (comportement historique)", () => {
  const { effectiveVolumeCible, consolidationCapApplied } = resolveEffectiveVolumeCible(18, undefined);
  assertEquals(effectiveVolumeCible, 18);
  assertEquals(consolidationCapApplied, false);
});

Deno.test("resolveEffectiveVolumeCible — hausse déclarative sous le seuil Gabbett (ratio ≤1.3) → pas de plafond", () => {
  const { effectiveVolumeCible, consolidationCapApplied } = resolveEffectiveVolumeCible(18, {
    chronicWeeklyHours: 15,
    recentWeeklyHours: 17, // ratio 1.133 ≤ 1.3
  });
  assertEquals(effectiveVolumeCible, 18);
  assertEquals(consolidationCapApplied, false);
});

Deno.test("resolveEffectiveVolumeCible — charge récente déjà au-dessus de la cible ambition → rien à plafonner", () => {
  const { effectiveVolumeCible, consolidationCapApplied } = resolveEffectiveVolumeCible(18, {
    chronicWeeklyHours: 8,
    recentWeeklyHours: 20, // > volumeCible(18) : aucune raison de "plafonner" vers le haut
  });
  assertEquals(effectiveVolumeCible, 18);
  assertEquals(consolidationCapApplied, false);
});

Deno.test("resolveEffectiveVolumeCible — volumeCible null (pas de weeklyHours en entrée) → reste null", () => {
  const { effectiveVolumeCible, consolidationCapApplied } = resolveEffectiveVolumeCible(null, {
    chronicWeeklyHours: 8,
    recentWeeklyHours: 17,
  });
  assertEquals(effectiveVolumeCible, null);
  assertEquals(consolidationCapApplied, false);
});

Deno.test("buildUserPrompt — B-10K-TO-70.3 (17h déclaré, ambition elite, consolidation 8h→17h) : la cible hebdo affichée est 17h, jamais 18h", () => {
  const prompt = buildUserPrompt({}, b10kTo703Config({
    loadHistory: { chronicWeeklyHours: 8, recentWeeklyHours: 17, recentWeeksCount: 4 },
  }));
  assertStringIncludes(prompt, "Heures dispo/semaine (saisie athlète) :** 17h");
  assertStringIncludes(prompt, "VOLUME CIBLE HEBDO (SOURCE UNIQUE, NON NÉGOCIABLE) :** 17h");
  assert(
    !prompt.includes("NON NÉGOCIABLE) :** 18h"),
    "la cible 'non négociable' ne doit plus jamais afficher 18h tant que la consolidation 17h n'est pas validée — c'était la contradiction confirmée (audit Codex P0-1)",
  );
  assertStringIncludes(prompt, "PLAFONNÉ à 17h");
  assertStringIncludes(prompt, "18h reste la cible à LONG TERME");
});

Deno.test("buildUserPrompt — même profil SANS loadHistory (consolidation non déclarée) → comportement historique inchangé (18h affiché)", () => {
  const prompt = buildUserPrompt({}, b10kTo703Config());
  assertStringIncludes(prompt, "VOLUME CIBLE HEBDO (SOURCE UNIQUE, NON NÉGOCIABLE) :** 18h");
  assert(!prompt.includes("PLAFONNÉ à"));
});

Deno.test("buildStructuredDiagnosticBlock — même plafond de consolidation appliqué au chiffre du bloc diagnostic (chunk 1), jamais un 2e chiffre différent", () => {
  const diag = buildStructuredDiagnosticBlock(
    b10kTo703Config({ loadHistory: { chronicWeeklyHours: 8, recentWeeklyHours: 17, recentWeeksCount: 4 } }),
    32,
  );
  assertStringIncludes(diag, "Volume cible hebdo");
  assertStringIncludes(diag, "17h/sem");
  assert(!diag.includes("18h/sem"), "le bloc diagnostic ne doit jamais afficher un chiffre différent du bloc utilisateur (contradiction P0-1 confirmée)");
});
