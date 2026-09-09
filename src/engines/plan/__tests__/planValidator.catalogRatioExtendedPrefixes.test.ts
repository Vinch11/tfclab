import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Fix E3 (audit "génération de plan IA") : validateCatalogRatio (règle 6)
 * redéclarait une copie locale incomplète du détecteur d'identifiant
 * catalogue (CATALOG_ID_PATTERN) au lieu d'utiliser extractCatalogId — déjà
 * importé et utilisé partout ailleurs dans ce fichier, avec une regex à jour
 * couvrant des préfixes ajoutés depuis (BILLAT_, NORWEGIAN_, HEAT_, FATMAX_,
 * etc. — identifiants qui ne commencent PAS par [A-D]_SPORT_, contrairement
 * à la copie locale qui ne reconnaissait que BRICK_/ENR_/V[0-9]_/TPL_/RS_/
 * BR_/URBAN_/EXPE_ en préfixe autonome). 182 identifiants réels sur 896
 * échappaient à ce contrôle sur le chemin Markdown de secours (catalogId
 * structuré absent, fallback regex title+details).
 */
function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Chantier",
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
    sessions: sessions.map((s, i) => makeSession({
      weekNumber,
      dayIndex: i,
      dayName: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"][i % 5],
      ...s,
    })),
  };
}

function makePlan(weeks: ParsedWeek[]): ParsedPlan {
  return { title: "Plan TFCL™ — Marathon — 5 semaines", phases: [], weeks, totalWeeks: weeks.length };
}

describe("validateCatalogRatio — préfixes d'identifiant catalogue étendus (fix E3)", () => {
  it("reconnaît des identifiants catalogue à préfixe autonome (BILLAT_, NORWEGIAN_, HEAT_, FATMAX_) sans catalogId structuré, sans faux avertissement catalog_ratio", () => {
    // Chemin Markdown de secours : pas de catalogId structuré, seulement le
    // titre — exactement le cas que validateCatalogRatio doit détecter via
    // extractCatalogId (fallback regex title+details). ≥4 semaines requis
    // (early return sinon, non représentatif du fix).
    const sessions = [
      { title: "BILLAT_30_30", details: "6x(30/30 VMA)" },
      { title: "NORWEGIAN_4x13", details: "Double seuil norvégien" },
      { title: "HEAT_ACCLIMATION_60", details: "Séance chaleur" },
      { title: "FATMAX_Z1_90", details: "Endurance fondamentale lipidique" },
    ];
    const weeks = [1, 2, 3, 4].map((n) => makeWeek(n, sessions));
    const result = validatePlan(makePlan(weeks));
    const issue = result.issues.find((i) => i.rule === "catalog_ratio" && i.severity === "warning");
    expect(issue).toBeUndefined();
  });

  it("N'accepte PAS n'importe quel texte : une séance clé réellement custom (sans ID reconnaissable) reste comptée hors catalogue", () => {
    // validateCatalogRatio exige ≥4 semaines pour être significatif (early
    // return sinon) — on répète le même mix 50/50 sur 4 semaines.
    const sessions = [
      { title: "BILLAT_30_30", details: "6x(30/30 VMA)" },
      { title: "Fractionné maison", details: "8x400m allure 10K, texte libre sans identifiant" },
    ];
    const weeks = [1, 2, 3, 4].map((n) => makeWeek(n, sessions));
    const result = validatePlan(makePlan(weeks));
    const issue = result.issues.find((i) => i.rule === "catalog_ratio" && i.severity === "warning");
    expect(issue).toBeDefined();
    expect(issue?.message).toMatch(/50%/);
  });
});
