/**
 * Approbation coach des séances avancées — invariants du parcours de production.
 *
 * Ces tests gèlent volontairement la liste fermée : ajouter ou retirer une
 * fiche approuvable est une décision de sécurité qui doit casser ce test et
 * être relue, jamais passer inaperçue.
 */
import { describe, it, expect } from "vitest";
import {
  APPROVABLE_ADVANCED_SESSION_IDS,
  buildLevelPrerequisiteSignal,
  evaluateAdvancedSessionApproval,
  isApprovableAdvancedSessionId,
  sanitizeApprovedAdvancedSessionIds,
} from "../advancedSessionApproval";
import {
  ADVANCED_SESSION_GROUP_ORDER,
  groupApprovableAdvancedSessions,
  listApprovableAdvancedSessions,
} from "../advancedSessionApprovalCatalog";
import { isLevelPrerequisiteIncompatible } from "../levelPrerequisiteCompatibility";
import { auditedSafetyPrerequisitesFor } from "@/lib/workoutSafetyPrerequisites";
import { WorkoutLibrary } from "@/lib/workoutLibrary";

const EXPECTED_APPROVABLE = [
  "BILLAT_RUN_LACTATE_TOLERANCE",
  "BILLAT_SWIM_30_30",
  "B_BIKE_CP_W_PRIME_TEST",
  "B_BIKE_SPRINT_NEUROMUSCULAR",
  "B_SWIM_SPRINT_25S",
  "CONTRAST_RUN_FORCE_SPEED",
  "C_STR_CYCLIST_PEDAL_POWER",
  "C_STR_LOWER_PRO",
  "C_STR_RE_ECONOMY_BLAGROVE",
  "D_PAP_PRE_RACE",
  "ENR_BIKE_LACTATE_SHUTTLE",
  "ENR_BIKE_NORWEGIAN_5X5",
  "ENR_RUN_LACTATE_CLEARANCE",
  "ENR_RUN_NORWEGIAN_4X8",
  "ENR_RUN_NORWEGIAN_5X6",
  "EXPE_HORS_VILLE_BACK_TO_BACK",
  "KENYAN_RUN_DOUBLE_DAY",
  "KENYAN_WEEK_STRUCTURE_MARATHON",
  "NORWEGIAN_RUN_DOUBLE_THRESHOLD_DAY",
  "NORWEGIAN_RUN_LACTATE_TEST_PROTOCOL",
  "NORWEGIAN_RUN_THRESHOLD_HIGH_PM",
  "NORWEGIAN_RUN_THRESHOLD_LOW_AM",
  "NORWEGIAN_WEEK_STRUCTURE_RUN",
  "SEILER_BIKE_4X4MIN",
  "URBAN_COTES_NORVEGIEN_DOUBLE_SEUIL",
  "URBAN_EXCENTRIQUE_DESCENTE_SALLE",
  "V2_BIKE_SPRINT_NEUROMUSCULAR",
  "V2_BIKE_TABATA",
  "V2_RUN_SPRINT_PLAT",
  "V3_BIKE_VO2_TABATA",
].sort();

/**
 * Sélection automatique bloquée : hypoxie, exposition chaleur, et la navette
 * lactate course au seuil (ses exclusions « fatigue élevée / VLamax très
 * haute » n'ont pas de contrat vérifiable — revue lactate/norvégien
 * 2026-11-09). Aucune approbation ne les rouvre.
 */
const NEVER_APPROVABLE = ["TPL_SWIM_HYPOXIE", "A_HEAT_ACCLIM_RUN", "C_HEAT_ACCLIM_BIKE_INDOOR", "B_RUN_LACTATE_SHUTTLE"];

/** Fiche accessible sans revue nominative : hors liste fermée. */
const NOT_REVIEW_GATED = "NORWEGIAN_RUN_THRESHOLD_LOW_VOLUME";
/** Fiche approuvable prise comme exemple courant. */
const EXAMPLE = "ENR_RUN_LACTATE_CLEARANCE";

const LEVELS = ["untrained", "light", "trained", "highly_trained", "unknown"];
const SOURCES = ["manual", "auto-tss", "fallback-prudent", "auto", ""];

describe("liste fermée des fiches approuvables", () => {
  it("contient exactement les 30 fiches à revue coach nominative", () => {
    expect([...APPROVABLE_ADVANCED_SESSION_IDS]).toEqual(EXPECTED_APPROVABLE);
  });

  it("chaque fiche approuvable exige la revue coach ET un profil vérifié, sans blocage automatique", () => {
    for (const id of APPROVABLE_ADVANCED_SESSION_IDS) {
      const prerequisites = auditedSafetyPrerequisitesFor(id);
      expect(prerequisites?.requireExplicitCoachApproval, id).toBe(true);
      expect(prerequisites?.requireVerifiedProfile, id).toBe(true);
      expect(prerequisites?.blockAutomaticSelection, id).not.toBe(true);
    }
  });

  it("les fiches à sélection automatique bloquée ne sont jamais approuvables", () => {
    for (const id of NEVER_APPROVABLE) {
      expect(auditedSafetyPrerequisitesFor(id)?.blockAutomaticSelection, id).toBe(true);
      expect(isApprovableAdvancedSessionId(id), id).toBe(false);
      expect(APPROVABLE_ADVANCED_SESSION_IDS).not.toContain(id);
    }
  });

  it("isApprovableAdvancedSessionId tolère la casse et les espaces, refuse le reste", () => {
    expect(isApprovableAdvancedSessionId("enr_run_lactate_clearance")).toBe(true);
    expect(isApprovableAdvancedSessionId("  ENR_RUN_LACTATE_CLEARANCE ")).toBe(true);
    expect(isApprovableAdvancedSessionId("A_RUN_Z2_EASY")).toBe(false);
    expect(isApprovableAdvancedSessionId(null)).toBe(false);
    expect(isApprovableAdvancedSessionId(42)).toBe(false);
  });
});

describe("sanitizeApprovedAdvancedSessionIds", () => {
  it("normalise la casse, dédoublonne et trie", () => {
    expect(
      sanitizeApprovedAdvancedSessionIds([
        "v2_run_sprint_plat",
        " ENR_RUN_LACTATE_CLEARANCE ",
        "enr_run_lactate_clearance",
      ]),
    ).toEqual(["ENR_RUN_LACTATE_CLEARANCE", "V2_RUN_SPRINT_PLAT"]);
  });

  it("écarte les fiches bloquées, la dérogation historique, les IDs inconnus et les non-chaînes", () => {
    expect(
      sanitizeApprovedAdvancedSessionIds([
        ...NEVER_APPROVABLE,
        // Dérogation (approbation SANS revue nominative) : non exposée.
        NOT_REVIEW_GATED,
        // Axe historique "débutant" : un ID approuvé y contournerait le garde-fou.
        "CANOVA_RUN_INTRODUCTIVE_PHASE",
        "COGGAN_BIKE_CP_DEPLETION",
        "A_RUN_Z2_EASY",
        "INCONNU",
        "",
        null,
        7,
        { id: EXAMPLE },
        EXAMPLE,
      ]),
    ).toEqual([EXAMPLE]);
  });

  it("renvoie une liste vide pour toute entrée qui n'est pas un tableau", () => {
    expect(sanitizeApprovedAdvancedSessionIds(undefined)).toEqual([]);
    expect(sanitizeApprovedAdvancedSessionIds(null)).toEqual([]);
    expect(sanitizeApprovedAdvancedSessionIds(EXAMPLE)).toEqual([]);
    expect(sanitizeApprovedAdvancedSessionIds({ 0: EXAMPLE })).toEqual([]);
  });
});

describe("buildLevelPrerequisiteSignal", () => {
  const ambitionMeta = { trainingLevel: "trained", trainingLevelSource: "manual" };

  it("reste null sans ambitionMeta, même avec des approbations", () => {
    expect(buildLevelPrerequisiteSignal(null)).toBeNull();
    expect(buildLevelPrerequisiteSignal(undefined)).toBeNull();
    expect(
      buildLevelPrerequisiteSignal({ weeklyHours: 8, approvedAdvancedSessionIds: [EXAMPLE] }),
    ).toBeNull();
  });

  it("sans approbation : niveau, source et heures, pas de clé approvedAdvancedSessionIds", () => {
    const signal = buildLevelPrerequisiteSignal({ ambitionMeta, weeklyHours: 8 });
    expect(signal).toEqual({ trainingLevel: "trained", trainingLevelSource: "manual", weeklyHours: 8 });
    expect(signal).not.toHaveProperty("approvedAdvancedSessionIds");
    expect(buildLevelPrerequisiteSignal({ ambitionMeta, approvedAdvancedSessionIds: [] })).toEqual({
      trainingLevel: "trained",
      trainingLevelSource: "manual",
      weeklyHours: null,
    });
  });

  it("ne transmet au garde-fou que des IDs de la liste fermée", () => {
    const signal = buildLevelPrerequisiteSignal({
      ambitionMeta,
      weeklyHours: 8,
      approvedAdvancedSessionIds: [
        "enr_run_lactate_clearance",
        "TPL_SWIM_HYPOXIE",
        "B_RUN_LACTATE_SHUTTLE",
        NOT_REVIEW_GATED,
        "CANOVA_RUN_INTRODUCTIVE_PHASE",
      ],
    });
    expect(signal?.approvedAdvancedSessionIds).toEqual([EXAMPLE]);
  });

  it("une liste brute hostile ne déclenche jamais la dérogation historique du garde-fou", () => {
    // Avec le signal BRUT, la branche historique ouvre la fiche à un débutant…
    const raw = {
      trainingLevel: "untrained",
      trainingLevelSource: "manual",
      approvedAdvancedSessionIds: ["CANOVA_RUN_INTRODUCTIVE_PHASE"],
    };
    expect(isLevelPrerequisiteIncompatible("CANOVA_RUN_INTRODUCTIVE_PHASE", raw)).toBe(false);
    // …mais le signal de production la laisse fermée.
    const produced = buildLevelPrerequisiteSignal({
      ambitionMeta: { trainingLevel: "untrained", trainingLevelSource: "manual" },
      approvedAdvancedSessionIds: ["CANOVA_RUN_INTRODUCTIVE_PHASE"],
    });
    expect(isLevelPrerequisiteIncompatible("CANOVA_RUN_INTRODUCTIVE_PHASE", produced)).toBe(true);
  });

  it("une fiche bloquée reste incompatible quel que soit le contenu de la liste", () => {
    for (const id of NEVER_APPROVABLE) {
      const produced = buildLevelPrerequisiteSignal({
        ambitionMeta: { trainingLevel: "highly_trained", trainingLevelSource: "manual" },
        weeklyHours: 20,
        approvedAdvancedSessionIds: [id],
      });
      expect(produced).not.toHaveProperty("approvedAdvancedSessionIds");
      expect(isLevelPrerequisiteIncompatible(id, produced), id).toBe(true);
    }
  });
});

describe("evaluateAdvancedSessionApproval", () => {
  it("effective = verdict du garde-fou, et blocker n'existe que si effective est faux", () => {
    for (const id of APPROVABLE_ADVANCED_SESSION_IDS) {
      for (const trainingLevel of LEVELS) {
        for (const trainingLevelSource of SOURCES) {
          for (const weeklyHours of [null, 3, 12]) {
            const profile = { trainingLevel, trainingLevelSource, weeklyHours };
            const evaluation = evaluateAdvancedSessionApproval(id, profile);
            const gate = !isLevelPrerequisiteIncompatible(id, { ...profile, approvedAdvancedSessionIds: [id] });
            const label = `${id} ${trainingLevel}/${trainingLevelSource}/${weeklyHours}`;
            expect(evaluation.approvable, label).toBe(true);
            expect(evaluation.effective, label).toBe(gate);
            expect(evaluation.blocker === null, label).toBe(evaluation.effective);
          }
        }
      }
    }
  });

  it("sans approbation, aucune fiche approuvable n'est éligible — quel que soit le profil", () => {
    for (const id of APPROVABLE_ADVANCED_SESSION_IDS) {
      expect(
        isLevelPrerequisiteIncompatible(id, {
          trainingLevel: "highly_trained",
          trainingLevelSource: "manual",
          weeklyHours: 20,
        }),
        id,
      ).toBe(true);
    }
  });

  it("profil absent ou de source non fiable → sans effet, « profil non vérifié »", () => {
    for (const profile of [
      null,
      undefined,
      { trainingLevel: "trained", trainingLevelSource: "fallback-prudent", weeklyHours: 10 },
    ]) {
      const evaluation = evaluateAdvancedSessionApproval(EXAMPLE, profile);
      expect(evaluation.effective).toBe(false);
      expect(evaluation.blocker).toBe("unverified_profile");
    }
  });

  it("profil vérifié → une fiche approuvée devient éligible", () => {
    for (const trainingLevelSource of ["manual", "auto-tss"]) {
      const evaluation = evaluateAdvancedSessionApproval("enr_run_lactate_clearance", {
        trainingLevel: "trained",
        trainingLevelSource,
        weeklyHours: 6,
      });
      expect(evaluation).toMatchObject({ approvable: true, effective: true, blocker: null });
    }
  });

  it("niveau minimal de la fiche non atteint → « niveau insuffisant », avec le niveau exigé", () => {
    for (const id of ["V3_BIKE_VO2_TABATA", "B_SWIM_SPRINT_25S"]) {
      const blocked = evaluateAdvancedSessionApproval(id, {
        trainingLevel: "light",
        trainingLevelSource: "manual",
        weeklyHours: 10,
      });
      expect(blocked, id).toMatchObject({
        effective: false,
        blocker: "insufficient_level",
        minimumTrainingLevel: "trained",
      });
      const allowed = evaluateAdvancedSessionApproval(id, {
        trainingLevel: "trained",
        trainingLevelSource: "manual",
        weeklyHours: 10,
      });
      expect(allowed.effective, id).toBe(true);
    }
  });

  it("double seuil norvégien : l'approbation ne lève ni le niveau « très chargé » ni les 8 h/sem", () => {
    const id = "NORWEGIAN_RUN_DOUBLE_THRESHOLD_DAY";
    expect(
      evaluateAdvancedSessionApproval(id, { trainingLevel: "trained", trainingLevelSource: "manual", weeklyHours: 12 }),
    ).toMatchObject({ effective: false, blocker: "insufficient_level", minimumTrainingLevel: "highly_trained" });
    for (const weeklyHours of [7, null]) {
      expect(
        evaluateAdvancedSessionApproval(id, { trainingLevel: "highly_trained", trainingLevelSource: "manual", weeklyHours }),
        String(weeklyHours),
      ).toMatchObject({ effective: false, blocker: "insufficient_hours", minimumWeeklyHours: 8 });
    }
    expect(
      evaluateAdvancedSessionApproval(id, { trainingLevel: "highly_trained", trainingLevelSource: "manual", weeklyHours: 8 }),
    ).toMatchObject({ effective: true, blocker: null });
  });

  it.each(["KENYAN_WEEK_STRUCTURE_MARATHON", "NORWEGIAN_WEEK_STRUCTURE_RUN"])(
    "%s (axe historique débutant) : une approbation ne l'ouvre pas à un débutant vérifié",
    id => {
    for (const trainingLevel of ["untrained", "light"]) {
      for (const trainingLevelSource of ["manual", "auto-tss"]) {
        const profile = { trainingLevel, trainingLevelSource, weeklyHours: 12 };
        expect(
          isLevelPrerequisiteIncompatible(id, buildLevelPrerequisiteSignal({
            ambitionMeta: profile,
            weeklyHours: 12,
            approvedAdvancedSessionIds: [id],
          })),
        ).toBe(true);
        expect(evaluateAdvancedSessionApproval(id, profile)).toMatchObject({
          approvable: true,
          effective: false,
          blocker: "beginner_level",
        });
      }
    }
    expect(
      evaluateAdvancedSessionApproval(id, { trainingLevel: "trained", trainingLevelSource: "manual", weeklyHours: 12 }),
    ).toMatchObject({ effective: true, blocker: null });
    },
  );

  it("les 8 fiches de l'axe historique restent fermées à un débutant, toutes approbations cochées", () => {
    const historical = [
      "CANOVA_RUN_INTRODUCTIVE_PHASE",
      "CANOVA_RUN_FAST_CONTINUOUS_INTRO",
      "BILLAT_RUN_30_30_INTRO",
      "NORWEGIAN_WEEK_STRUCTURE_RUN",
      "KENYAN_WEEK_STRUCTURE_MARATHON",
      "COGGAN_BIKE_CP_OVER_UNDER",
      "COGGAN_BIKE_CP_DEPLETION",
      "V3_BIKE_VO2_TABATA",
    ];
    for (const trainingLevel of ["untrained", "light"]) {
      const signal = buildLevelPrerequisiteSignal({
        ambitionMeta: { trainingLevel, trainingLevelSource: "manual" },
        weeklyHours: 15,
        approvedAdvancedSessionIds: [...APPROVABLE_ADVANCED_SESSION_IDS, ...historical],
      });
      for (const id of historical) {
        expect(isLevelPrerequisiteIncompatible(id, signal), `${id} ${trainingLevel}`).toBe(true);
      }
    }
  });

  it("fiche hors liste fermée → non approuvable, jamais effective", () => {
    for (const id of [...NEVER_APPROVABLE, NOT_REVIEW_GATED, "A_RUN_Z2_EASY", ""]) {
      const evaluation = evaluateAdvancedSessionApproval(id, {
        trainingLevel: "highly_trained",
        trainingLevelSource: "manual",
        weeklyHours: 20,
      });
      expect(evaluation, id).toMatchObject({ approvable: false, effective: false, blocker: "not_approvable" });
    }
  });
});

describe("vue coach des fiches approuvables", () => {
  it("chaque fiche de la liste fermée existe dans la bibliothèque avec son contenu réel", () => {
    const sessions = listApprovableAdvancedSessions();
    expect(sessions.map(session => session.id).sort()).toEqual(EXPECTED_APPROVABLE);
    for (const session of sessions) {
      expect(session.label.trim().length, session.id).toBeGreaterThan(0);
      expect(session.when.trim().length, session.id).toBeGreaterThan(0);
      expect(session.avoid.trim().length, session.id).toBeGreaterThan(0);
      expect(session.durationMin[0], session.id).toBeGreaterThan(0);
      expect(session.durationMin[1], session.id).toBeGreaterThanOrEqual(session.durationMin[0]);
    }
  });

  it("chaque carte reprend mot pour mot le texte de sa fiche, pas un résumé", () => {
    const library = new Map(WorkoutLibrary.map(workout => [workout.id.toUpperCase(), workout]));
    for (const session of listApprovableAdvancedSessions()) {
      const workout = library.get(session.id);
      expect(workout, session.id).toBeDefined();
      expect(session.label, session.id).toBe(workout?.objectif);
      expect(session.when, session.id).toBe(workout?.when);
      expect(session.avoid, session.id).toBe(workout?.avoid);
      expect(session.durationMin, session.id).toEqual(workout?.durationMin);
    }
  });

  it("affiche les minimums de niveau et de volume réellement appliqués par le garde-fou", () => {
    const byId = new Map(listApprovableAdvancedSessions().map(session => [session.id, session]));
    expect(byId.get("NORWEGIAN_RUN_DOUBLE_THRESHOLD_DAY")).toMatchObject({
      group: "run",
      minimumTrainingLevel: "highly_trained",
      minimumWeeklyHours: 8,
    });
    expect(byId.get("V3_BIKE_VO2_TABATA")).toMatchObject({ minimumTrainingLevel: "trained", minimumWeeklyHours: null });
    expect(byId.get(EXAMPLE)).toMatchObject({ group: "run", minimumTrainingLevel: null, minimumWeeklyHours: null });
  });

  it("la navette lactate course n'est pas proposée au coach", () => {
    expect(listApprovableAdvancedSessions().map(session => session.id)).not.toContain("B_RUN_LACTATE_SHUTTLE");
  });

  it("regroupe par sport dans un ordre stable, sans perdre de fiche", () => {
    const groups = groupApprovableAdvancedSessions();
    expect(groups.map(entry => entry.group)).toEqual([...ADVANCED_SESSION_GROUP_ORDER]);
    expect(groups.reduce((total, entry) => total + entry.sessions.length, 0)).toBe(EXPECTED_APPROVABLE.length);
    for (const entry of groups) {
      for (const session of entry.sessions) expect(session.group).toBe(entry.group);
    }
  });
});
