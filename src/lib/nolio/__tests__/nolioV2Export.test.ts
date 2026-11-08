import { describe, expect, it } from "vitest";
import { mapAiSessionsToNolioV2, tfclSportKey } from "../../../../supabase/functions/_shared/nolioV2/aiTextMapper";
import { prepareExport, planEngine } from "../../../../supabase/functions/_shared/nolioV2/exportPlan";
import { autoSportIds, validateSportIds } from "../../../../supabase/functions/_shared/nolioV2/prodConnection";
import { appOriginFrom, returnLocation } from "../../../../supabase/functions/_shared/nolioV2/oauth";
import { mapTarget } from "../../../../supabase/functions/_shared/nolioV2/plannedMapper";
import type { NolioV2Refs } from "../../../../supabase/functions/_shared/nolioV2/plannedMapper";

const refs: NolioV2Refs = {
  synthetic: false, athleteId: "usr_abc123",
  sportIds: { run: "spt_run1", bike: "spt_bike1", swim: "spt_swim1", strength: "spt_str1" },
  exerciseIds: {}, competition: null, calendarTimeZone: null,
};
const VERSION = "11111111-2222-4333-8444-555555555555";

const aiPlan = {
  title: "Plan IA", _planStartDate: "2026-11-09", phases: [{ name: "Base", weeks: "1" }],
  _provenance: { engine: "ai" },
  weeks: [{
    weekNumber: 1, theme: "Base", phase: "Base",
    sessions: [
      { weekNumber: 1, dayIndex: 0, dayName: "lundi", sport: "Repos", title: "Repos", details: "", isRest: true },
      { weekNumber: 1, dayIndex: 1, dayName: "mardi", sport: "Course à pied", title: "Seuil 3×10 min", details: "Échauffement 15 min…", durationMin: 60, isRest: false },
      { weekNumber: 1, dayIndex: 2, dayName: "mercredi", sport: "Vélo", title: "Endurance", details: "Z2", durationMin: 90, isRest: false },
      { weekNumber: 1, dayIndex: 3, dayName: "jeudi", sport: "Course à pied", title: "Footing", details: "", isRest: false },
      { weekNumber: 1, dayIndex: 4, dayName: "vendredi", sport: "Aviron", title: "Ergo", details: "", durationMin: 40, isRest: false },
    ],
  }],
};

describe("Nolio V2 — export des plans IA", () => {
  it("reconnaît les sports des plans sans en inventer", () => {
    expect(tfclSportKey("Course à pied")).toBe("run");
    expect(tfclSportKey("Vélo")).toBe("bike");
    expect(tfclSportKey("Natation")).toBe("swim");
    expect(tfclSportKey("Renforcement")).toBe("strength");
    expect(tfclSportKey("Repos")).toBeNull();
    expect(tfclSportKey("Aviron")).toBeNull();
  });

  it("envoie chaque séance avec sa prescription complète et refuse explicitement le reste", async () => {
    expect(planEngine(aiPlan)).toBe("ai");
    const p = await prepareExport(aiPlan, refs, VERSION);
    expect(p.rows.map(r => r.status)).toEqual(["excluded_rest", "operation", "operation", "refused", "refused"]);
    expect(p.rows[3].reason).toBe("duration_unknown");
    expect(p.rows[4].reason).toBe("sport_unrecognized:Aviron");
    const run = p.ops[0];
    expect(run.body).toMatchObject({ name: "Seuil 3×10 min", date_start: "2026-11-10", sport: "spt_run1", athletes: ["usr_abc123"], duration: { value: 60, unit: "min" } });
    expect(String(run.body.description)).toContain("Échauffement 15 min");
    expect(String(run.body.description)).toMatch(/\[TFCLab [0-9a-f]{24}\]$/);
    expect(run.opKey).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produit des clés d'opération stables (aucune recréation au renvoi)", async () => {
    const a = await prepareExport(aiPlan, refs, VERSION);
    const b = await prepareExport(structuredClone(aiPlan), refs, VERSION);
    expect(b.ops.map(o => o.opKey)).toEqual(a.ops.map(o => o.opKey));
  });

  it("refuse un athlète Nolio non opaque", () => {
    const r = mapAiSessionsToNolioV2([], { ...refs, athleteId: "42" });
    expect(r.refusals[0].reason).toBe("athlete_reference_not_opaque");
  });
});

describe("Nolio V2 — cibles d'allure", () => {
  it("transmet des allures m:ss entières, bornes ordonnées", () => {
    const notes: string[] = [];
    const t = mapTarget({ metric: "sec_per_km", min: 233, max: 247.4 }, notes, { paceTargets: true, sport: "run" });
    expect(t).toEqual({ type: "raw", value: "3:53", value_max: "4:07", unit: "/km" });
  });
});

describe("Nolio V2 — association des sports de l'athlète", () => {
  const sports = [
    { id: "spu_1", sport: "spt_run1", name: "Course à pied", isActive: true, structuredEnabled: true },
    { id: "spu_2", sport: "spt_trail", name: "Trail", isActive: true, structuredEnabled: true },
    { id: "spu_3", sport: "spt_bike1", name: "Vélo route", isActive: true, structuredEnabled: true },
    { id: "spu_4", sport: "spt_swim1", name: "Natation", isActive: false, structuredEnabled: true },
    { id: "spu_5", sport: "spt_tri", name: "Triathlon", isActive: true, structuredEnabled: false },
  ];
  it("associe par nom parmi les sports actifs structurés, jamais un sport inactif", () => {
    expect(autoSportIds(sports)).toEqual({ run: "spt_run1", bike: "spt_bike1", brick: "spt_tri" });
  });
  it("valide un choix du coach contre les sports réellement lus", () => {
    expect(validateSportIds(sports, { run: "spt_trail" })).toEqual({ ok: true, sportIds: { run: "spt_trail" } });
    expect(validateSportIds(sports, { swim: "spt_swim1" })).toMatchObject({ ok: false });
    expect(validateSportIds(sports, { kayak: "spt_run1" })).toMatchObject({ ok: false });
  });
});

describe("Nolio V2 — retour OAuth", () => {
  it("redirige uniquement vers une origine https de l'app", () => {
    expect(appOriginFrom(undefined)).toBe("https://tfclab.lovable.app");
    expect(appOriginFrom("http://evil.example")).toBe("https://tfclab.lovable.app");
    expect(appOriginFrom("https://app.example.com/path")).toBe("https://tfclab.lovable.app");
    expect(returnLocation("https://app.example.com", "connected")).toBe("https://app.example.com/planning/ai-plan?nolio_v2=connected");
  });
});
