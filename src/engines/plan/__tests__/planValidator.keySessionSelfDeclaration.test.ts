import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Fix A6 (audit "génération de plan IA") : `isKeySession` est un booléen
 * AUTO-DÉCLARÉ par le LLM (chemin JSON) et prime sur toute autre détection
 * dans `isKeySession()` (planValidator.ts), sans jamais être confronté au
 * contenu réel de la séance. Un LLM qui sur-étiquette une récup en "clé"
 * contournerait silencieusement le plancher par sport (A1/A2) même corrigé.
 * Cette règle ne change PAS `isKeySession()` — elle ajoute un avertissement
 * séparé quand `isKeySession:true` n'est confirmé par AUCUN marqueur
 * d'intensité moyenne/haute dans le texte.
 */
function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Test",
    phase: "build",
    dayName: "Lundi",
    dayIndex: 0,
    sport: "Course",
    title: "Séance",
    details: "",
    isRest: false,
    ...overrides,
  };
}

function makeWeek(weekNumber: number, sessions: Partial<ParsedSession>[]): ParsedWeek {
  return {
    weekNumber,
    theme: `Semaine ${weekNumber}`,
    phase: "build",
    sessions: sessions.map((s, i) => makeSession({ weekNumber, dayIndex: i, ...s })),
  };
}

function makePlan(weeks: ParsedWeek[]): ParsedPlan {
  return { title: "Plan TFCL™ — Marathon — 4 semaines", phases: [], weeks, totalWeeks: weeks.length };
}

describe("validateKeySessionSelfDeclaration — isKeySession auto-déclaré sans contre-vérification (fix A6)", () => {
  it("avertit quand isKeySession:true mais aucun marqueur d'intensité dans le texte (récup sur-étiquetée)", () => {
    const week = makeWeek(1, [
      { title: "Footing tranquille", details: "30min facile, discussion possible", isKeySession: true },
    ]);
    const result = validatePlan(makePlan([week]));
    const issue = result.issues.find((i) => i.rule === "key_session_self_declaration_mismatch");
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("warning");
    expect(issue?.week).toBe(1);
  });

  it("n'avertit PAS quand isKeySession:true est confirmé par un marqueur d'intensité", () => {
    const week = makeWeek(1, [
      { title: "Intervalles seuil 4x8min", details: "Z4 seuil", isKeySession: true },
    ]);
    const result = validatePlan(makePlan([week]));
    expect(result.issues.filter((i) => i.rule === "key_session_self_declaration_mismatch")).toHaveLength(0);
  });

  it("n'avertit PAS pour une séance non déclarée clé (isKeySession absent ou false), même sans marqueur d'intensité", () => {
    const week = makeWeek(1, [
      { title: "Footing tranquille", details: "30min facile" },
      { title: "Footing léger", details: "20min", isKeySession: false },
    ]);
    const result = validatePlan(makePlan([week]));
    expect(result.issues.filter((i) => i.rule === "key_session_self_declaration_mismatch")).toHaveLength(0);
  });

  it("ne compte pas les séances de repos", () => {
    const week = makeWeek(1, [
      { title: "Repos", sport: "Repos", isRest: true, isKeySession: true },
    ]);
    const result = validatePlan(makePlan([week]));
    expect(result.issues.filter((i) => i.rule === "key_session_self_declaration_mismatch")).toHaveLength(0);
  });
});
