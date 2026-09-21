import { describe, it, expect } from "vitest";
import { getSystemPrompt } from "../../../../supabase/functions/ai-training-plan/systemPrompt";
import { buildUserPrompt, buildStructuredDiagnosticBlock, classifyMultiObjectiveGoals } from "../../../../supabase/functions/ai-training-plan/promptHelpers";
import { EnrichedWorkoutsStartToRun } from "../../../lib/enrichedWorkoutsStartToRun";

/**
 * Piste "fiabilité des plans générés" (suite de l'audit "duplications
 * client/serveur" + discussion sur les leviers de fiabilité) : presque tous
 * les bugs de contradiction trouvés cette session (S2R vs few-shot, S2R vs
 * matrice Lorang, priorité vs chronologie multi-objectifs) n'étaient visibles
 * QUE dans le prompt final assemblé (système + utilisateur) — aucun test
 * unitaire sur une fonction isolée ne pouvait les attraper, puisque chaque
 * morceau est individuellement correct pris séparément.
 *
 * Ce fichier construit le prompt complet pour une matrice représentative
 * d'objectifs × ambitions × cas particuliers (Start to Run, multi-objectifs)
 * et vérifie des invariants textuels simples qui doivent TOUJOURS tenir,
 * indépendamment de qui a écrit quel morceau du prompt.
 */

type ObjectifType =
  | "IM" | "703" | "Sprint" | "Olympic" | "Marathon" | "Semi"
  | "5K" | "10K" | "StartToRun" | "Trail" | "TrailShort" | "TrailMountain" | "TrailUltra";

const ALL_OBJECTIVES: ObjectifType[] = [
  "IM", "703", "Sprint", "Olympic", "Marathon", "Semi",
  "5K", "10K", "StartToRun", "Trail", "TrailShort", "TrailMountain", "TrailUltra",
];
const AMBITIONS = ["finisher", "age_group", "elite"];

function buildAssembledPrompt(config: any, profileExtra: any = {}): string {
  const sys = getSystemPrompt({ objective: config.objective, ...profileExtra });
  const usr = buildUserPrompt({}, config);
  return `${sys}\n${usr}`;
}

function baseConfig(objective: string, ambition: string, extra: any = {}) {
  return {
    objective,
    ambition,
    weeksAvailable: 12,
    planStartDate: "2027-01-04",
    ...extra,
  };
}

describe("Cohérence du prompt assemblé — smoke test toutes combinaisons objectif × ambition", () => {
  for (const objective of ALL_OBJECTIVES) {
    for (const ambition of AMBITIONS) {
      it(`${objective} × ${ambition} : génération sans exception, prompt non vide`, () => {
        const prompt = buildAssembledPrompt(baseConfig(objective, ambition));
        expect(prompt.length).toBeGreaterThan(500);
      });
    }
  }
});

describe("Cohérence du prompt assemblé — Start to Run ne contient jamais la matrice Lorang générique", () => {
  it("StartToRun : présence confirmée des règles S2R, absence totale de la matrice Lorang", () => {
    const prompt = buildAssembledPrompt(
      baseConfig("StartToRun", "finisher", {
        // Simule le wizard QuickStartWizard : un limiteur coach est saisi.
        identifiedLimiters: [
          "## ⚙️ LIMITEURS SAISIS PAR LE COACH (source manuelle, prime sur inférence auto)",
          "### Limiteur #1 — TTE (jugement coach)",
        ],
      }),
    );
    // Sanity : on est bien sur le chemin S2R (sinon le test ne teste rien).
    expect(prompt).toMatch(/pas de seuil, pas de vma/i);
    // La régression trouvée cette session : la matrice Lorang générique
    // (seuil, VMA, côtes, sprints) apparaissait dans le MÊME prompt.
    expect(prompt).not.toMatch(/MATRICE SÉANCE CLÉ × LIMITEUR × PHASE/i);
    expect(prompt).not.toMatch(/LIMITEURS IDENTIFIÉS PAR L'APP/i);
  });

  it("StartToRun : la règle d'interdiction du terme \"sortie longue\" est bien énoncée", () => {
    const prompt = buildAssembledPrompt(baseConfig("StartToRun", "finisher"));
    expect(prompt).toMatch(/mot "sortie longue" \/ "SL" est INTERDIT/i);
  });

  // Une recherche globale "≤1 occurrence dans tout le prompt" s'est avérée
  // trop stricte : plusieurs occurrences restantes sont légitimes — soit la
  // règle elle-même qui doit citer le terme qu'elle bannit (S2R_STRUCTURE_RULES),
  // soit un bloc générique partagé par tous les objectifs "course route"
  // (VÉLO AUTORISÉ EN RÉCUP, définition de "séance clé") qui n'est pas du
  // texte destiné à être recopié tel quel dans une séance. Les deux bugs
  // réels trouvés cette session (fiche catalogue + table de durées calibrées
  // injectant le terme comme LIBELLÉ d'un paramètre pour StartToRun) sont
  // ciblés précisément ci-dessous.
  it("StartToRun : aucune fiche catalogue n'utilise le terme banni \"sortie longue\"", () => {
    for (const fiche of EnrichedWorkoutsStartToRun) {
      const haystack = `${fiche.objectif ?? ""} ${(fiche.tags ?? []).join(" ")} ${fiche.notes ?? ""}`;
      expect(haystack, `fiche ${fiche.id}`).not.toMatch(/sortie longue/i);
    }
  });

  it("StartToRun : la matrice de durées calibrées n'affiche pas le libellé banni pour la course longue", () => {
    const prompt = buildAssembledPrompt(baseConfig("StartToRun", "finisher"));
    expect(prompt).not.toMatch(/Sortie longue CAP \(SL\)/i);
  });

  it("Marathon (objectif performance) continue de recevoir la matrice Lorang normalement (non-régression)", () => {
    const prompt = buildAssembledPrompt(
      baseConfig("Marathon", "elite", {
        identifiedLimiters: [
          "## ⚙️ LIMITEURS SAISIS PAR LE COACH",
          "### Limiteur #1 — VLamax (jugement coach)",
        ],
      }),
    );
    expect(prompt).toMatch(/MATRICE SÉANCE CLÉ × LIMITEUR × PHASE/i);
  });
});

describe("Cohérence du prompt assemblé — multi-objectifs : le texte reflète exactement la classification pic complet/jalon", () => {
  const SCENARIOS: { label: string; raceGoals: any[] }[] = [
    {
      label: "Marathon (fév) + IM (juil), ~5 mois — 2 pics complets attendus",
      raceGoals: [
        { objective: "Marathon", raceDate: "2027-02-07", priority: "A" },
        { objective: "IM", raceDate: "2027-07-04", priority: "B" },
      ],
    },
    {
      label: "10K (mars) + Marathon (juin), ~13 sem — le 10K reste un jalon (format non éligible)",
      raceGoals: [
        { objective: "10K", raceDate: "2027-03-01", priority: "A" },
        { objective: "Marathon", raceDate: "2027-05-31", priority: "B" },
      ],
    },
    {
      label: "Marathon (fév) + IM (mars), ~6 sem — écart insuffisant, Marathon reste jalon",
      raceGoals: [
        { objective: "Marathon", raceDate: "2027-02-07", priority: "A" },
        { objective: "IM", raceDate: "2027-03-21", priority: "B" },
      ],
    },
  ];

  for (const { label, raceGoals } of SCENARIOS) {
    it(`${label} : occurrences textuelles == classification réelle`, () => {
      const classification = classifyMultiObjectiveGoals(raceGoals);
      const expectedFullPeaks = classification.filter((c) => c.isFullPeak && c.goal.raceDate).length;
      const expectedJalons = classification.filter((c) => !c.isFullPeak && c.goal.raceDate).length;

      const prompt = buildAssembledPrompt(
        baseConfig(raceGoals[0].objective, "age_group", { raceGoals, weeksAvailable: undefined }),
      );

      // Le code a 3 branches de rendu, pas 2 : un pic complet qui est aussi
      // la dernière course chronologique ("isLast") reçoit le libellé
      // "DOIT être la SEMAINE DE COURSE avec", tandis qu'un pic complet qui
      // n'est PAS la dernière course (2e pic d'une double périodisation)
      // reçoit le libellé distinct "🎯 PIC DE FORME COMPLET" — les deux
      // représentent isFullPeak === true et doivent être comptés ensemble.
      const fullPeakMentions =
        (prompt.match(/DOIT être la SEMAINE DE COURSE avec/g) || []).length +
        (prompt.match(/🎯 \*\*PIC DE FORME COMPLET\*\*/g) || []).length;
      const jalonMentions = (prompt.match(/CE N'EST PAS la dernière semaine du plan/g) || []).length;

      expect(fullPeakMentions, "nombre de courses annoncées comme pic complet dans le texte").toBe(expectedFullPeaks);
      expect(jalonMentions, "nombre de courses annoncées comme jalon dans le texte").toBe(expectedJalons);
    });
  }
});

describe("Cohérence du prompt assemblé — multi-objectifs : le squelette de phases (BORNES DE PHASE) s'accorde avec l'Ancrage absolu", () => {
  /**
   * Piste "structure d'un plan multi-objectifs long" (Marathon + IM, ~18 sem
   * d'écart) : `buildStructuredDiagnosticBlock` (section "BORNES DE PHASE
   * ESTIMÉES") et `buildUserPrompt` (section "Ancrage absolu" par course)
   * décrivaient chacune, indépendamment, où tombe le taper de la course
   * intermédiaire — avant le fix, la première ignorait totalement la course
   * intermédiaire (un seul cycle continu sur tout le plan) ; la seconde avait
   * par ailleurs un off-by-one sur la borne de départ du taper. Ce test
   * assemble les DEUX sections (comme le fait réellement jsonPlanHandler.ts :
   * baseUserPrompt + structuredDiagnostic) et vérifie qu'elles citent
   * EXACTEMENT la même plage de semaines pour le taper de la course non-
   * finale, plutôt que de tester chaque section isolément.
   */
  it("Marathon (S22) + IM (S40) : le Bloc Affûtage du 1er cycle et l'Ancrage absolu du Marathon citent la même plage de semaines", () => {
    const raceGoals = [
      { objective: "Marathon", raceDate: "2027-02-21", priority: "A" },
      { objective: "IM", raceDate: "2027-06-27", priority: "A" },
    ];
    const config = baseConfig("IM", "age_group", { raceGoals, weeksAvailable: undefined, planStartDate: "2026-09-21" });
    const usr = buildUserPrompt({}, config);
    const diag = buildStructuredDiagnosticBlock(config, 40);

    const ancrageMatch = usr.match(/affûtage complet de \d+ semaine\(s\) de (S\d+ à S\d+)/);
    const affutageLine = diag.split("\n").find((l) => l.includes("Bloc Affûtage"));

    expect(ancrageMatch, "la section Ancrage absolu doit citer une plage de taper pour le pic non-final").not.toBeNull();
    expect(affutageLine, "buildStructuredDiagnosticBlock doit produire un Bloc Affûtage pour le 1er cycle").toBeDefined();

    const ancrageRange = ancrageMatch![1].replace(/ à /, "-"); // "S21 à S22" -> "S21-S22"
    expect(affutageLine).toContain(ancrageRange);

    // Non-régression du bug d'origine : le bloc segmenté doit exister (2
    // cycles), pas un seul cycle continu qui engloberait S22 dans un bloc de
    // charge (Fondation/Chantier/Consolidation/Race-Specific).
    expect((diag.match(/📅 BORNES DE PHASE ESTIMÉES/g) || []).length).toBe(2);
  });
});
