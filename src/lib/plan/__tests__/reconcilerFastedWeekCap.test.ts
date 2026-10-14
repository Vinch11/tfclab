/**
 * Audit qualité plans IA (plan "Vince", 10K, semaine 7) : "Sleep Low double
 * day" (mardi) + "Sortie longue à jeun" (dimanche) cumulées dans la même
 * semaine — le plafond "1 séance à jeun/semaine max" n'existe QUE côté
 * réconciliateur serveur (jsonPlanHandler.ts bloc (c2)), jamais côté client
 * (planReconciler.ts) : la substitution phase/durée/discipline peut
 * réintroduire un cumul que le serveur avait pourtant respecté à la
 * génération. Voir dedupeFastedWithinWeek dans planReconciler.ts.
 */
import { describe, it, expect, vi } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { PlanChunk, PlanSession, DayLower } from "@/lib/plan/planSchema";

vi.mock("@/lib/workoutLibrary", () => {
  const fiches: LibraryWorkout[] = [
    // 1re séance à jeun — reste intacte (1re occurrence).
    {
      id: "SLEEP_LOW_RUN",
      cat: "A", sport: "run", objectif: "Sleep Low double day", necessite: "Recommandé",
      when: "", phase: ["base", "build"],
      avoid: "", durationMin: [45, 60], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "Z2 matin à jeun après HIT veille", zones: ["Z2"] }],
      variants: {}, tags: ["sleep-low"], goals: ["10k"],
    },
    // 2e séance à jeun — doit être remplacée par une alternative non-fasted.
    {
      id: "FASTED_LONG_RUN",
      cat: "A", sport: "run", objectif: "Sortie longue à jeun", necessite: "Recommandé",
      when: "", phase: ["base", "build"],
      avoid: "", durationMin: [75, 100], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "Z2 à jeun matinal", zones: ["Z2"] }],
      variants: {}, tags: ["fasted"], goals: ["10k"],
    },
    // Alternative non-fasted, même sport/phase/durée proche — doit être
    // choisie pour remplacer la 2e occurrence.
    {
      id: "LONG_RUN_FED",
      cat: "A", sport: "run", objectif: "Sortie longue standard", necessite: "Recommandé",
      when: "", phase: ["base", "build"],
      avoid: "", durationMin: [75, 100], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "Z2 continu", zones: ["Z2"] }],
      variants: {}, tags: [], goals: ["10k"],
    },
  ];
  return { WorkoutLibrary: fiches };
});

import { runReconciler } from "@/lib/plan/planReconciler";

// Le titre/details reflète le contenu réel de la fiche assignée (comme le
// ferait assignFiche en production) — sessionIsFastedPattern lit le texte de
// la SÉANCE (title+details), pas la fiche catalogue, exactement comme côté
// serveur (jsonPlanHandler.ts bloc (c2)).
function makeSession(day: DayLower, catalogId: string, title: string, durationMin = 60): PlanSession {
  return {
    day, sport: "run", title, details: "", isKeySession: false,
    custom: false, catalogId, durationMin, zones: ["Z2"],
  };
}

function makeWeekChunk(sessions: PlanSession[], phase: PlanChunk["weeks"][number]["phase"] = "base"): PlanChunk {
  return {
    weeks: [{ weekNumber: 1, phase, theme: "T", sessions }],
  };
}

describe("runReconciler — plafond cumul \"à jeun\" intra-semaine (filet final)", () => {
  it("reproduit le cas réel S7 : 2 séances à jeun la même semaine → la 2e est remplacée par une alternative non-fasted", () => {
    const mardi = makeSession("mardi", "SLEEP_LOW_RUN", "Sleep Low double day", 50);
    const dimanche = makeSession("dimanche", "FASTED_LONG_RUN", "Sortie longue à jeun", 85);
    const chunk = makeWeekChunk([mardi, dimanche], "base");

    // P0 (consigne coach, suite PR #376) : phase recalculée numériquement —
    // globalTotalWeeks:10 place la semaine 1 en "base" (pct=10%).
    const rec = runReconciler([chunk], {}, 2, undefined, { globalTotalWeeks: 10 });

    expect(mardi.catalogId).toBe("SLEEP_LOW_RUN"); // 1re occurrence intacte
    expect(dimanche.catalogId).toBe("LONG_RUN_FED"); // 2e remplacée, non-fasted
    expect(rec.counters.week_fasted_cap_replaced).toBe(1);
    expect(rec.counters.week_fasted_cap_unresolved).toBeUndefined();
    expect(rec.logs.some(l => l.includes("[week_fasted_cap_replaced]") && l.includes("FASTED_LONG_RUN") && l.includes("LONG_RUN_FED"))).toBe(true);
  });

  it("aucune alternative non-fasted disponible : le cumul est laissé intact mais signalé", () => {
    const mardi = makeSession("mardi", "SLEEP_LOW_RUN", "Sleep Low double day", 50);
    const dimanche = makeSession("dimanche", "FASTED_LONG_RUN", "Sortie longue à jeun", 85);
    // Catalogue restreint aux deux fiches à jeun — aucune alternative non-fasted.
    const injected = new Set(["SLEEP_LOW_RUN", "FASTED_LONG_RUN"]);
    const chunk = makeWeekChunk([mardi, dimanche], "base");

    const rec = runReconciler([chunk], {}, 2, injected);

    expect(mardi.catalogId).toBe("SLEEP_LOW_RUN");
    expect(dimanche.catalogId).toBe("FASTED_LONG_RUN"); // conservé, pas de fausse correction
    expect(rec.counters.week_fasted_cap_unresolved).toBe(1);
    expect(rec.counters.week_fasted_cap_replaced).toBeUndefined();
  });

  it("une seule séance à jeun dans la semaine : aucune action (pas de faux positif)", () => {
    const mardi = makeSession("mardi", "SLEEP_LOW_RUN", "Sleep Low double day", 50);
    const dimanche = makeSession("dimanche", "LONG_RUN_FED", "Sortie longue standard", 85);
    const chunk = makeWeekChunk([mardi, dimanche], "base");

    const rec = runReconciler([chunk], {}, 2);

    expect(mardi.catalogId).toBe("SLEEP_LOW_RUN");
    expect(dimanche.catalogId).toBe("LONG_RUN_FED");
    expect(rec.counters.week_fasted_cap_replaced).toBeUndefined();
    expect(rec.counters.week_fasted_cap_unresolved).toBeUndefined();
  });

  it("deux semaines différentes, chacune avec 1 séance à jeun : pas de faux positif inter-semaines", () => {
    const s1 = makeSession("mardi", "SLEEP_LOW_RUN", "Sleep Low double day", 50);
    const s2 = makeSession("dimanche", "FASTED_LONG_RUN", "Sortie longue à jeun", 85);
    const chunk: PlanChunk = {
      weeks: [
        { weekNumber: 1, phase: "base", theme: "T", sessions: [s1] },
        { weekNumber: 2, phase: "base", theme: "T", sessions: [s2] },
      ],
    };

    const rec = runReconciler([chunk], {}, 2);

    expect(s1.catalogId).toBe("SLEEP_LOW_RUN");
    expect(s2.catalogId).toBe("FASTED_LONG_RUN");
    expect(rec.counters.week_fasted_cap_replaced).toBeUndefined();
    expect(rec.counters.week_fasted_cap_unresolved).toBeUndefined();
  });
});
