import { describe, it, expect } from "vitest";
import { buildStructuredDiagnosticBlock } from "../../../../supabase/functions/ai-training-plan/promptHelpers";

/**
 * Batch 2 — "VO2max semaine 1 de Fondation" : la matrice "Séquençage par
 * Limiteur Principal" du prompt statique (systemPrompt.ts) exclut le VO2max
 * de la Fondation quand VO2max EST le limiteur #1 (réservé au Bloc Chantier
 * dédié), mais le bloc dynamique par-plan (buildStructuredDiagnosticBlock)
 * étiquetait systématiquement "Bloc Fondation + Intensité" sans jamais
 * détecter ce cas — l'instruction réellement injectée au moment de la
 * génération contredisait donc la règle générale.
 */

const BASE_CONFIG = {
  objective: "IM",
  ambition: "age_group",
};

describe("buildStructuredDiagnosticBlock — exclusion VO2max de la Fondation quand L1=VO2max", () => {
  it("exclut VO2max de la Fondation et le signale explicitement quand L1='VO2max'", () => {
    const output = buildStructuredDiagnosticBlock(
      { ...BASE_CONFIG, identifiedLimitersRaw: ["VO2max", "TTE"] },
      16
    );

    expect(output).toContain("Bloc Fondation (SANS VO2max — réservé au Bloc Chantier dédié)");
    expect(output).not.toContain("Bloc Fondation + Intensité");
  });

  it("garde le priming VO2max en Fondation quand L1 est un autre limiteur (ex: VLamax)", () => {
    const output = buildStructuredDiagnosticBlock(
      { ...BASE_CONFIG, identifiedLimitersRaw: ["VLamax", "TTE"] },
      16
    );

    expect(output).toContain("Bloc Fondation + Intensité");
    expect(output).not.toContain("SANS VO2max");
  });

  it("garde le priming VO2max en Fondation quand L1='FTP/kg' (distinct de VO2max dans la matrice)", () => {
    const output = buildStructuredDiagnosticBlock(
      { ...BASE_CONFIG, identifiedLimitersRaw: ["FTP/kg", "TTE"] },
      16
    );

    expect(output).toContain("Bloc Fondation + Intensité");
    expect(output).not.toContain("SANS VO2max");
  });
});
