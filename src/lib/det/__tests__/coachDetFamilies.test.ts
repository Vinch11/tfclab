import { describe, it, expect, vi, beforeAll } from "vitest";
import { hashCoachInputs, checkCoachReviewContext, type CoachReviewContext, type SourceQualification } from "../coachDetContext";
import { buildCoachPlanInputs } from "../coachDetRun";
import { coachObjectiveKey, coachFamilyFor, runCoachInputsDet, COACH_703_BRICK_IDS } from "../../../../experimental/det-engine/v401-coach-inputs-core";
import { V3_BASE_BRICK_ID } from "../../../../experimental/det-engine/v31-v3-brick";
import { AppendOnlyPlanVersionSaver, type PlanVersionRow } from "@/lib/plan/appendOnlyPlanVersionSave";
import { restoreStructuredPlan } from "@/lib/plan/restoreStructuredPlan";
import { readPlanProvenance, isDetCoachInputsProvenance } from "@/lib/plan/planProvenance";
import { dispatchCoachEngine } from "@/lib/plan/engineDispatch";
import { COACH, ATHLETE, SOURCES_VERSION, snap, ctx, run, ymd, RUN332, STRENGTH, TRI_COMMON, TRI_RACE, TRI_DOSES, runClock, triClock, BRICKS_703, SEMI_TAPER, SEMI_CROSS_BIKE, SEMI_DOSES, semiClock, TRI_V3_ROLE_POOL, TRI_TAPER_SPECIFIC } from "./coachDetFamilies.test.shared";

/**
 * Familles DET « entrées coach » au-delà du marathon : formulaire coach →
 * adaptateur → VRAI solveur → validateurs sportifs finaux. Valeurs saisies
 * EXPLICITEMENT SYNTHÉTIQUES (coachDetFamiliesShared.ts). Une acceptation ici
 * n'est PAS une preuve pour un athlète réel.
 */
const results: Record<string, unknown> = {};
beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("NETWORK_FORBIDDEN"); });
});

describe("familles : clés canoniques strictes", () => {
  it("noms d'événements libres jamais rattachés à une famille", () => {
    expect(coachObjectiveKey("Semi-marathon")).toBe("semi_marathon");
    expect(coachObjectiveKey("Ironman 70.3")).toBe("triathlon_703");
    expect(coachObjectiveKey("Ironman")).toBe("triathlon_ironman");
    expect(coachObjectiveKey("Ironman 70.3 Nice")).toBe("unsupported");
    expect(coachObjectiveKey("Semi-marathon de trail")).toBe("unsupported");
    expect(coachObjectiveKey("Trail court")).toBe("trail");
    expect(coachObjectiveKey("10 km")).toBe("10k");
    expect(coachFamilyFor("10 km")).toBeNull();
    expect(coachFamilyFor("Trail court")).toBeNull();
  });
  it.each([["10 km", /acceptation stricte/], ["Trail court", /generateTrailPlan/], ["Triathlon olympique", /sprint\/olympique/], ["5 km", /5 km/]])("%s refusé avec la raison exacte", async (o, re) => {
    const s = snap(o, 12, 6, ymd(12));
    const r = await run(s, await ctx(s, RUN332, {}, runClock));
    expect(r.kind).toBe("refused");
    expect(r.kind === "refused" && r.refusals.join("|")).toMatch(re);
  });
  it("le moteur refuse lui-même une famille non raccordée (aucun contournement par l'adaptateur)", () => {
    const { athlete, config } = buildCoachPlanInputs(snap("Marathon", 16, 7, ymd(16)));
    expect(() => runCoachInputsDet({ athlete, config: { ...config, objective: "Trail court" }, reviews: [], clock: runClock })).toThrow(/objective_not_qualified:trail/);
    expect(() => runCoachInputsDet({ athlete, config: { ...config, objective: "Semi" }, reviews: [], clock: runClock, brickApprovals: [{ id: V3_BASE_BRICK_ID, transitionSeconds: 300 }] })).toThrow(/bricks_not_qualified/);
  });
});

describe("familles : refus stricts avant moteur", () => {
  it("plage testée : semaines/heures hors enveloppe ⇒ refus explicite", async () => {
    const a = snap("Ironman 70.3", 20, 10, ymd(20));
    const b = snap("Semi-marathon", 8, 12, ymd(8));
    const ra = await run(a, await ctx(a, TRI_COMMON, TRI_DOSES, triClock));
    const rb = await run(b, await ctx(b, RUN332, {}, runClock));
    expect(ra.kind === "refused" && ra.refusals.join("|")).toMatch(/20 semaines hors de la plage testée.*12 semaines/);
    expect(rb.kind === "refused" && rb.refusals.join("|")).toMatch(/12 h\/semaine hors de la plage testée/);
  });
  it("triathlon : FTP, CSS et allures natation manquantes ⇒ refus nommé, jamais complété", async () => {
    const s = snap("Ironman", 16, 14, ymd(16));
    delete s.anchors.bikeFtpWatts; delete s.anchors.cssSecPer100m; delete s.swimDomainPaces;
    const r = await run(s, await ctx(s, [...TRI_COMMON, ...TRI_RACE.IM], TRI_DOSES, triClock));
    const j = r.kind === "refused" ? r.refusals.join("|") : "";
    expect(j).toMatch(/FTP vélo \(W\) requis/);
    expect(j).toMatch(/CSS natation \(s\/100 m\) requis/);
    expect(j).toMatch(/swim_domain_pace_sec_per_100m/);
  });
  it("triathlon : créneau natation absent ⇒ refus", async () => {
    const s = snap("Ironman", 16, 14, ymd(16));
    const { swim: _drop, ...rest } = triClock.minutesBySport;
    const r = await run(s, await ctx(s, [...TRI_COMMON, ...TRI_RACE.IM], TRI_DOSES, { ...triClock, minutesBySport: rest }));
    expect(r.kind === "refused" && r.refusals.join("|")).toMatch(/aucun créneau confirmé pour le sport natation/);
  });
  it("bricks : réservés au 70.3, transition 3–10 min confirmée, id du registre", async () => {
    const s = snap("Ironman", 16, 14, ymd(16));
    const r = await run(s, await ctx(s, [...TRI_COMMON, ...TRI_RACE.IM], TRI_DOSES, triClock, [{ id: V3_BASE_BRICK_ID, transitionSeconds: 300 }]));
    expect(r.kind === "refused" && r.refusals.join("|")).toMatch(/uniquement pour le triathlon 70.3/);
    const t = snap("Ironman 70.3", 12, 10, ymd(12));
    const r2 = await run(t, await ctx(t, [...TRI_COMMON, ...TRI_RACE["703"]], TRI_DOSES, triClock, [{ id: "V3B_FAKE", transitionSeconds: 30 }]));
    const j = r2.kind === "refused" ? r2.refusals.join("|") : "";
    expect(j).toMatch(/inconnu du registre/); expect(j).toMatch(/transition non confirmée/);
    expect(COACH_703_BRICK_IDS).toContain(V3_BASE_BRICK_ID);
  });
  it("budget impossible (heures < séances requises) : refus moteur, jamais IA", async () => {
    const s = snap("Semi-marathon", 8, 6, ymd(8), { sessionsPerWeek: 4 });
    // Aucune source de course qualifiée ⇒ aucune séance possible sur le budget.
    const c = await ctx(s, STRENGTH, {}, runClock);
    let aiCalls = 0;
    const out = await dispatchCoachEngine("det", { det: () => run(s, c, { maxNodes: 3000, maxMilliseconds: 3000 }), ai: async () => { aiCalls++; throw new Error("IA interdite"); } });
    expect(aiCalls).toBe(0);
    expect(["refused", "engine_refused"]).toContain(out.kind);
  });
});

/** Exécutions réelles du solveur : résultat effectivement obtenu, consigné tel quel. */
type Case = { id: string; objective: string; weeks: number; hours: number; ids: string[]; doses: Record<string, Partial<SourceQualification>>; clock: CoachReviewContext["clock"]; bricks?: CoachReviewContext["brickApprovals"]; limits: { maxNodes: number; maxMilliseconds: number } };
const CASES: Case[] = [
  { id: "semi-8w-6h", objective: "Semi-marathon", weeks: 8, hours: 6, ids: [...RUN332, ...SEMI_TAPER, ...SEMI_CROSS_BIKE, ...STRENGTH], doses: SEMI_DOSES, clock: semiClock, limits: { maxNodes: 25000, maxMilliseconds: 15000 } },
  { id: "semi-30w-6h", objective: "Semi-marathon", weeks: 30, hours: 6, ids: [...RUN332, ...SEMI_TAPER, ...SEMI_CROSS_BIKE, ...STRENGTH], doses: SEMI_DOSES, clock: semiClock, limits: { maxNodes: 25000, maxMilliseconds: 15000 } },
  { id: "703-12w-9h", objective: "Ironman 70.3", weeks: 12, hours: 9, ids: [...TRI_COMMON, ...TRI_RACE["703"], ...TRI_V3_ROLE_POOL, ...TRI_TAPER_SPECIFIC["703"], ...STRENGTH], doses: TRI_DOSES, clock: triClock, bricks: BRICKS_703, limits: { maxNodes: 200000, maxMilliseconds: 120000 } },
  { id: "703-12w-9.5h", objective: "Ironman 70.3", weeks: 12, hours: 9.5, ids: [...TRI_COMMON, ...TRI_RACE["703"], ...TRI_V3_ROLE_POOL, ...TRI_TAPER_SPECIFIC["703"], ...STRENGTH], doses: TRI_DOSES, clock: triClock, bricks: BRICKS_703, limits: { maxNodes: 200000, maxMilliseconds: 120000 } },
  { id: "703-12w-10h", objective: "Ironman 70.3", weeks: 12, hours: 10, ids: [...TRI_COMMON, ...TRI_RACE["703"], ...TRI_V3_ROLE_POOL, ...TRI_TAPER_SPECIFIC["703"], ...STRENGTH], doses: TRI_DOSES, clock: triClock, bricks: BRICKS_703, limits: { maxNodes: 200000, maxMilliseconds: 120000 } },
  { id: "IM-16w-13h", objective: "Ironman", weeks: 16, hours: 13, ids: [...TRI_COMMON, ...TRI_RACE.IM, ...TRI_V3_ROLE_POOL, ...TRI_TAPER_SPECIFIC.IM, ...STRENGTH], doses: TRI_DOSES, clock: triClock, limits: { maxNodes: 200000, maxMilliseconds: 16000 } },
  { id: "IM-16w-14h", objective: "Ironman", weeks: 16, hours: 14, ids: [...TRI_COMMON, ...TRI_RACE.IM, ...TRI_V3_ROLE_POOL, ...TRI_TAPER_SPECIFIC.IM, ...STRENGTH], doses: TRI_DOSES, clock: triClock, limits: { maxNodes: 200000, maxMilliseconds: 16000 } },
];

describe("familles : formulaire coach → solveur réel → validateurs finaux", () => {
  it.each(CASES)("$id", async (c) => {
    const s = snap(c.objective, c.weeks, c.hours, ymd(c.weeks));
    const context = await ctx(s, c.ids, c.doses, c.clock, c.bricks);
    expect(checkCoachReviewContext({ ctx: context, current: { coachId: COACH, athleteId: ATHLETE, snapshot: s, inputsHash: await hashCoachInputs(s), sourcesVersion: SOURCES_VERSION } }).ok).toBe(true);
    const t0 = Date.now();
    const r = await run(s, context, c.limits);
    const ms = Date.now() - t0;
    results[c.id] = r.kind === "accepted" ? { kind: r.kind, sessions: r.sessions, weeks: (r.plan.weeks as unknown[]).length, ms }
      : r.kind === "engine_refused" ? { kind: r.kind, reason: r.reason, blockingCodes: r.blockingCodes, ms } : { kind: r.kind, refusals: r.refusals, ms };
    process.stdout.write(`DET_COACH_FAMILY ${c.id} ${JSON.stringify(results[c.id])}\n`);
    // Jamais de repli : un refus moteur reste un refus, sans plan.
    expect(["accepted", "engine_refused"]).toContain(r.kind);
    if (r.kind === "engine_refused") {
      // Refus moteur réel : codes bloquants nommés, aucun plan, aucune bascule IA.
      expect(r.blockingCodes.length).toBeGreaterThan(0);
      expect("plan" in r).toBe(false);
    }
    if (r.kind === "accepted") {
      const fam = coachFamilyFor(c.objective)!;
      expect(r.provenance.family).toBe(fam.key);
      expect(r.provenance.engine).toBe("det");
      expect(r.provenance.prescriptionAllowed).toBe(false);
      expect(r.provenance.sportingAttestation).toBe(false);
      expect(r.provenance.syntheticFixture).toBe(false);
      expect(r.plan.weeks as unknown[]).toHaveLength(c.weeks);
      // Toutes les séances viennent d'une source admise ; heures ≤ budget.
      const admitted = new Set(r.provenance.admittedSourceIds);
      for (const w of r.plan.weeks as unknown as Array<{ sessions: Array<Record<string, unknown>> }>) {
        let minutes = 0;
        for (const x of w.sessions) {
          if (x.isRest || String(x.title).startsWith("COURSE : ")) continue;
          // Aucune carte native : chaque séance vient d'une source V3 admise (ou d'un brick validé).
          expect(typeof x.catalogId).toBe("string");
          if (String(x.catalogId).startsWith("V3P_")) expect(admitted.has(x.catalogId as string)).toBe(true);
          else expect(((r.provenance as { brickApprovals?: { id: string }[] }).brickApprovals ?? []).map((b) => b.id)).toContain(x.catalogId);
          if (typeof x.durationMin === "number") minutes += x.durationMin;
        }
        expect(minutes).toBeLessThanOrEqual(c.hours * 60 + 1e-6);
      }
      if (fam.sportFocus === "tri") {
        const sports = new Set((r.plan.weeks as unknown as Array<{ sessions: Array<{ sport: string }> }>).flatMap((w) => w.sessions.map((x) => x.sport)));
        for (const sp of ["swim", "bike", "run"]) expect(sports.has(sp)).toBe(true);
      }
      // Sauvegarde append-only + réouverture : provenance famille intacte.
      const db = new Map<string, PlanVersionRow>();
      const transport = {
        insert: async (row: PlanVersionRow) => { db.set(row.id, JSON.parse(JSON.stringify(row))); return { error: null }; },
        readById: async (id: string) => ({ data: db.get(id) ?? null, error: null }),
      };
      const payload = { athlete_id: ATHLETE, coach_id: COACH, plan_json: r.plan, objective: c.objective, weeks_count: c.weeks,
        sessions_count: r.sessions, validator_score: null, validator_grade: null, validator_summary: null };
      const saved = await new AppendOnlyPlanVersionSaver({ transport }).save(payload);
      expect(saved.status).toBe("CONFIRMED");
      const restored = restoreStructuredPlan(db.get(saved.attemptId!)!.plan_json);
      expect(restored).not.toBeNull();
      const raw = (restored as unknown as { _provenance?: unknown })._provenance;
      expect(isDetCoachInputsProvenance(raw)).toBe(true);
      expect((raw as { family?: string }).family).toBe(fam.key);
      expect(readPlanProvenance(restored).label).toBe("DET Engine (entrées coach, QA)");
    }
  }, 120_000);
});

describe("familles : acceptations réellement obtenues (V3 seul, entrées coach)", () => {
  // Résultats consignés par les exécutions réelles ci-dessus (même fichier, ordre séquentiel).
  it.each(["semi-8w-6h", "semi-30w-6h", "703-12w-9h", "703-12w-9.5h", "703-12w-10h"])("%s : ACCEPTÉ par le solveur et les validateurs finaux", (id) => {
    expect((results[id] as { kind?: string } | undefined)?.kind).toBe("accepted");
  });
  it.each(["IM-16w-13h", "IM-16w-14h"])("%s : refus moteur réel consigné (pas présenté comme accepté)", (id) => {
    expect((results[id] as { kind?: string } | undefined)?.kind).toBe("engine_refused");
  });
  it("semi-marathon 8 sem./6 h : ACCEPTÉ, rappel allure semi revu à 25 min, cross-training V3", async () => {
    const s = snap("Semi-marathon", 8, 6, ymd(8));
    const r = await run(s, await ctx(s, [...RUN332, ...SEMI_TAPER, ...SEMI_CROSS_BIKE, ...STRENGTH], SEMI_DOSES, semiClock), { maxNodes: 25000, maxMilliseconds: 15000 });
    expect(r.kind).toBe("accepted");
    if (r.kind !== "accepted") return;
    expect(r.provenance.family).toBe("semi_marathon");
    const sessions = (r.plan.weeks as unknown as Array<{ weekNumber: number; sessions: Array<Record<string, unknown>> }>).flatMap((w) => w.sessions.map((x) => ({ ...x, week: w.weekNumber }) as Record<string, unknown>));
    const semiPace = sessions.filter((x) => x.catalogId === "V3P_RUN_160");
    for (const x of semiPace) expect(x.durationMin).toBe(25);
    expect(sessions.some((x) => String(x.title).startsWith("COURSE : "))).toBe(true);
  }, 120_000);
  it("semi-marathon sans créneau vélo confirmé : refus nommé avant moteur (le gabarit semi place du cross-training)", async () => {
    const s = snap("Semi-marathon", 8, 6, ymd(8));
    const r = await run(s, await ctx(s, [...RUN332, ...SEMI_TAPER, ...SEMI_CROSS_BIKE, ...STRENGTH], SEMI_DOSES, runClock));
    expect(r.kind).toBe("refused");
    expect(r.kind === "refused" && r.refusals.join("|")).toMatch(/aucun créneau confirmé pour le sport vélo/);
  });
});
