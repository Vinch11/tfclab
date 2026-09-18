import { describe, it, expect } from "vitest";
import { buildUserPrompt } from "../../../../supabase/functions/ai-training-plan/promptHelpers";

/**
 * Audit "démarrage guidé" (QuickStartWizard) : le wizard route un débutant
 * Start to Run vers un limiteur Lorang (durability/TTE ou
 * neuromuscular/Économie selon la gêne articulaire déclarée), et
 * `buildCoachOverrides` alimentait `config.identifiedLimiters` sans
 * distinction d'objectif — déclenchant l'injection de la matrice Dan Lorang
 * générique (seuil, VMA, côtes, sprints) dans le MÊME prompt que
 * S2R_STRUCTURE_RULES ("pas de seuil, pas de VMA, pas de côtes avant S9").
 */
function makeConfig(objective: string) {
  return {
    objective,
    planStartDate: "2027-01-04",
    identifiedLimiters: [
      "## ⚙️ LIMITEURS SAISIS PAR LE COACH (source manuelle, prime sur inférence auto)",
      "### Limiteur #1 — TTE (jugement coach)",
    ],
  };
}

describe("buildUserPrompt — Start to Run n'injecte jamais la matrice Dan Lorang générique", () => {
  it("objectif StartToRun : le bloc LIMITEURS IDENTIFIÉS / matrice Lorang (seuil, VMA, côtes) est absent", () => {
    const prompt = buildUserPrompt({}, makeConfig("StartToRun"));
    expect(prompt).not.toMatch(/LIMITEURS IDENTIFIÉS PAR L'APP/i);
    expect(prompt).not.toMatch(/MATRICE SÉANCE CLÉ × LIMITEUR × PHASE/i);
    expect(prompt).not.toMatch(/Seuil continu.*Norvégienne/i);
    expect(prompt).not.toMatch(/Côtes 8×30s/i);
  });

  it("un objectif performance (Marathon) continue de recevoir la matrice Lorang normalement", () => {
    const prompt = buildUserPrompt({}, makeConfig("Marathon"));
    expect(prompt).toMatch(/LIMITEURS IDENTIFIÉS PAR L'APP/i);
    expect(prompt).toMatch(/MATRICE SÉANCE CLÉ × LIMITEUR × PHASE/i);
  });
});
