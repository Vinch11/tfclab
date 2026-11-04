import { describe, it, expect, vi, beforeAll } from "vitest";
import { explainEngineRefusal, buildAthleteDetInputs, prefillFromRecord, initialLimiterOrder, athleteChecklist, clockSportsFor, requiredAnchorKeys, GENERAL_CONFIRMATIONS, CONDITIONAL_CONFIRMATIONS, type AthleteRecordView, type CoachAnswers, type PlanFormView, type GenuineSourceReviews, BRICKS_703 } from "../athleteDetBridge";
import { findSource } from "../coachDetContext";
import { fingerprintV3SportingSource } from "../../../../scripts/library-v3/sportingQualification800";
import { familySourcePool, poolLibraryProblems } from "../familySourcePools";
import { hashCoachInputs } from "../coachDetContext";
import { runCoachDetPlan, eligibleLimiterMetrics } from "../coachDetRun";
import { coachFamilyFor } from "../../../../experimental/det-engine/v401-coach-inputs-core";
import { dispatchCoachEngine } from "@/lib/plan/engineDispatch";

/** Enregistrements SYNTHÉTIQUES au format du dépôt (athletes/snapshots/refs), aucune donnée réelle. */
const COACH = "00000000-0000-4000-8000-0000000000c1";
const A1 = "00000000-0000-4000-8000-0000000000a1";
const runner = (over: Partial<AthleteRecordView> = {}): AthleteRecordView => ({
  athleteId: A1, coachId: COACH, birthDate: "1990-05-01", sex: "F",
  refs: { vma: 18, ftp: 260, css: null, vo2max: 58, weightKg: 58, fcMax: 188,
    sources: { vma: "snapshot", ftp: "profile", css: "none", vo2max: "snapshot", weightKg: "snapshot", fcMax: "profile" } },
  snapshot: { id: "snap-synthetique", date: "2026-10-01", pace_threshold_sec_per_km: 240, tte_observed_min_run: 45, vlamax_run: 0.45, vlamax: null, fatigue_state: "ok" },
  diagnosticLimiters: ["TTE", "VLamax", "VO2max"], ...over,
});
const form = (objective: string, weeks: number, hours: number): PlanFormView => ({
  objective, planStartDate: "2026-10-26", raceDate: new Date(Date.UTC(2026, 9, 26 + weeks * 7 - 1)).toISOString().slice(0, 10),
  weeksAvailable: weeks, weeklyHours: hours, sessionsPerWeek: /70/.test(objective) ? 8 : 5, strengthSessionsPerWeek: 1, maxSessionsPerDay: 2, ambition: "age_group",
});
const days = Array(7).fill(true);
function answers(objective: string, extra: Partial<CoachAnswers> = {}): CoachAnswers {
  const fam = coachFamilyFor(objective)!; const pool = familySourcePool(fam.key);
  const times: Record<string, string> = { run: "07:00", bike: "12:00", swim: "06:00", strength: "19:00", brick: "08:00" };
  const all = { ...GENERAL_CONFIRMATIONS, ...CONDITIONAL_CONFIRMATIONS };
  return {
    provenance: Object.fromEntries(["runThresholdPaceSecPerKm", "runVvo2SpeedMps", "bikeFtpWatts", "cssSecPer100m", "vo2max", "weightKg", "fcMax", "tteRunMin", "vlamaxRun", "vlamaxBike"].map((k) => [k, { kind: "explicit_estimate", uncertainty: "±5 %" }])),
    entered: { runSprintSpeedRangeMps: { value: [5.2, 7.0], kind: "explicit_estimate", method: "SYNTHÉTIQUE sprints 15 s", uncertainty: "±0,2 m/s" },
      bikeSprintPowerRangeWatts: { value: [600, 870], kind: "explicit_estimate", method: "SYNTHÉTIQUE sprints", uncertainty: "±30 W" },
      bikePmaWatts: { value: 390, kind: "explicit_estimate", method: "SYNTHÉTIQUE rampe", uncertainty: "±10 W" } }, swimPaces: {}, athleteLevel: "trained", recentLoad: "moderate", fatigue: "ready", injuryScreen: "cleared_by_coach",
    general: Object.fromEntries(Object.keys(all).map((k) => [k, true])), prerequisitesAllMet: true, unmetPrerequisites: [], contraindicationsAllAbsent: true, presentContraindications: [],
    strengthLoadAndRpeConfirmed: true, clock: { timeZone: "Europe/Brussels", bySport: Object.fromEntries(clockSportsFor(fam, pool).map((s) => [s, { time: times[s], days }])) },
    bricksConfirmed: true, coachLimiterOrder: null, ...extra,
  };
}
/** Revue par séance SYNTHÉTIQUE au format de la grille « Avancé » (représente une revue humaine enregistrée ; test uniquement). */
function genuineFor(rec: AthleteRecordView, objective: string, over: Partial<GenuineSourceReviews> = {}): GenuineSourceReviews {
  const pool = familySourcePool(coachFamilyFor(objective)!.key);
  return { origin: "det_coach_review_contexts", reviewContextId: "ctx-grille-synthetique", coachId: rec.coachId, athleteId: rec.athleteId, reviewedAt: "2026-11-03T10:00:00Z",
    qualifications: pool.ids.map((id) => { const w = findSource(id)!; return { id, sourceFingerprint: fingerprintV3SportingSource(w), preferReviewedV3: true, ...(pool.doses[id] ?? {}),
      evidence: { coachReviewedSource: true, ...Object.fromEntries(Object.keys({ ...GENERAL_CONFIRMATIONS, ...CONDITIONAL_CONFIRMATIONS }).map((k) => [k, true])), currentPhase: w.phase[0], recentLoad: "moderate", fatigue: "ready", injuryScreen: "cleared_by_coach",
        checkedPrerequisites: [...w.prerequisites], checkedContraindications: [...w.contraindications] } as never } as never; }),
    brickApprovals: /70/.test(objective) ? BRICKS_703 : [], ...over };
}
async function generate(rec: AthleteRecordView, f: PlanFormView, a: CoachAnswers, limits?: { maxNodes: number; maxMilliseconds: number }, nowIso = "2026-11-04T00:00:00Z") {
  const b = buildAthleteDetInputs(rec, f, a, genuineFor(rec, f.objective));
  if (!b.snapshot || !b.ctx) return { b, out: null };
  const inputsHash = await hashCoachInputs(b.snapshot);
  const out = runCoachDetPlan({ reviewContextId: "ctx-bridge", ctx: { ...b.ctx, inputsHash, sourcesVersion: "b".repeat(64) }, coachId: COACH, athleteId: rec.athleteId,
    snapshot: b.snapshot, inputsHash, sourcesVersion: "b".repeat(64), engineVersion: "a".repeat(64), releaseId: null, now: () => new Date(nowIso), limits });
  return { b, out };
}
beforeAll(() => { vi.spyOn(console, "log").mockImplementation(() => {}); vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("NETWORK_FORBIDDEN"); }); });

describe("pont fiche athlète → DET", () => {
  it("reprend les valeurs de la fiche avec origine et date, sans les déclarer mesurées", () => {
    const p = prefillFromRecord(runner());
    const pace = p.find((x) => x.key === "runThresholdPaceSecPerKm")!;
    expect(pace).toMatchObject({ value: 240, origin: "snapshot", recordedOn: "2026-10-01" });
    expect(p.find((x) => x.key === "runVvo2SpeedMps")!.value).toBe(5);
    expect(p.some((x) => x.key === "cssSecPer100m")).toBe(false);
    const b = buildAthleteDetInputs(runner(), form("Semi-marathon", 8, 6), answers("Semi-marathon", { provenance: {} }));
    expect(b.snapshot).toBeNull();
    expect(b.missing.map((m) => m.key)).toEqual(expect.arrayContaining(["prov:runThresholdPaceSecPerKm", "prov:runVvo2SpeedMps"]));
  });
  it("estimation jamais promue en mesure ; incertitude exigée", () => {
    const b = buildAthleteDetInputs(runner(), form("Semi-marathon", 8, 6), answers("Semi-marathon"));
    expect(b.snapshot!.anchors.runThresholdPaceSecPerKm).toMatchObject({ kind: "explicit_estimate", uncertainty: "±5 %", measuredOn: "2026-10-01" });
    const c = buildAthleteDetInputs(runner(), form("Semi-marathon", 8, 6), answers("Semi-marathon", { provenance: { runThresholdPaceSecPerKm: { kind: "explicit_estimate" } } }));
    expect(c.missing.map((m) => m.key)).toContain("unc:runThresholdPaceSecPerKm");
  });
  it("donnée absente ⇒ demande nommée, jamais complétée", () => {
    const b = buildAthleteDetInputs(runner({ snapshot: null }), form("Semi-marathon", 8, 6), answers("Semi-marathon"));
    expect(b.missing.find((m) => m.key === "val:runThresholdPaceSecPerKm")?.why).toMatch(/absent de la fiche/);
  });
  it("blessure : l'absence de signalement ne vaut pas feu vert", () => {
    const b = buildAthleteDetInputs(runner(), form("Semi-marathon", 8, 6), answers("Semi-marathon", { injuryScreen: "" }));
    expect(b.missing.find((m) => m.key === "injuryScreen")?.why).toMatch(/absence de signalement/);
  });
  it("charge de vérification : deux listes dédupliquées, pas une grille par séance", () => {
    const pool = familySourcePool("triathlon_703"); const l = athleteChecklist(pool);
    expect(pool.ids.length).toBeGreaterThan(80);
    expect(l.prerequisites.length + l.contraindications.length).toBeLessThan(pool.ids.length / 2);
    const a = answers("Ironman 70.3");
    const confirmations = Object.keys(a.general).length + 2;
    expect(confirmations).toBeLessThanOrEqual(13);
  });
  it("contre-indication présente ⇒ sources concernées écartées (jamais l'inverse)", () => {
    const pool = familySourcePool("semi_marathon"); const c = athleteChecklist(pool).contraindications[0];
    const b = buildAthleteDetInputs(runner(), form("Semi-marathon", 8, 6), answers("Semi-marathon", { presentContraindications: [c] }), genuineFor(runner(), "Semi-marathon"));
    expect(b.excludedSources.length).toBeGreaterThan(0);
    expect(b.ctx!.qualifications.some((q) => b.excludedSources.some((e) => e.id === q.id))).toBe(false);
  });
  it("pool de bibliothèque figé : une empreinte différente est refusée", async () => {
    expect(await poolLibraryProblems(familySourcePool("semi_marathon"))).toEqual([]);
    expect((await poolLibraryProblems({ ...familySourcePool("semi_marathon"), pinnedFingerprint: "0".repeat(64) })).join()).toMatch(/nouvelle revue du pool/);
    expect(familySourcePool("marathon").independentScientificReview).toBe(false);
  });
  it("objectif non raccordé ⇒ message clair, aucun appel moteur", () => {
    const b = buildAthleteDetInputs(runner(), form("10 km", 10, 6), answers("Semi-marathon"));
    expect(b.family).toBeNull(); expect(b.missing[0].why).toMatch(/pas encore pris en charge/);
  });
  it("limiteurs : ordre du diagnostic de l'app, restreint aux éligibles, non-guidants signalés", () => {
    expect(initialLimiterOrder(["TTE", "FatMax", "VLamax"], ["VLamax", "TTE", "MLSS"])).toEqual({ order: ["TTE", "VLamax", "MLSS"], fromDiagnostic: ["TTE", "VLamax"], appendedEligible: ["MLSS"], notGuiding: ["FatMax"] });
  });
  it("limiteurs : sans action du coach, aucun ordre « coach » n'est enregistré (ordre automatique DET)", () => {
    const b = buildAthleteDetInputs(runner(), form("Semi-marathon", 8, 6), answers("Semi-marathon"));
    expect(b.snapshot!.coachLimiterOrder).toBeNull(); expect(b.limiterTrace.coach).toBeNull();
  });
});

describe("revue des séances : pool CI ≠ revue humaine", () => {
  const f = () => form("Semi-marathon", 8, 6);
  const deepHasTrue = (x: unknown): boolean => JSON.stringify(x ?? null).includes('"coachReviewedSource":true');
  it("liste simplifiée seule : aucun drapeau de revue humaine, blocage nommé + tâche amont", () => {
    const b = buildAthleteDetInputs(runner(), f(), answers("Semi-marathon"));
    expect(b.ctx).toBeNull();
    expect(deepHasTrue(b)).toBe(false);
    expect(b.sourceReview).toMatchObject({ status: "blocked_missing_source_review", upstreamTask: "review_family_pool_sources_in_advanced_grid" });
    expect(b.sourceReview.status === "blocked_missing_source_review" && b.sourceReview.unreviewedIds.length).toBe(familySourcePool("semi_marathon").ids.length);
    expect(b.snapshot!.sourcePool!.independentScientificReview).toBe(false);
    expect(b.snapshot!.sourceReviewProvenance).toBeUndefined();
  });
  it("70.3 : la case « enchaînements » ne vaut pas approbation des enchaînements", () => {
    const rec = runner(); const g = genuineFor(rec, "Ironman 70.3", { brickApprovals: [] });
    const sw = Object.fromEntries(["recovery","moderate_lt1","tempo","im_pace","703_pace","marathon_pace","sub_threshold","semi_pace","mlss","vo2max","neuromuscular"].map((k) => [k, { value: 100, kind: "explicit_estimate", method: "SYNTHÉTIQUE", uncertainty: "±3 s" }]));
    const r = { ...rec, refs: { ...rec.refs, css: 95, sources: { ...rec.refs.sources, css: "snapshot" as const } } };
    const b = buildAthleteDetInputs(r, form("Ironman 70.3", 12, 9), answers("Ironman 70.3", { swimPaces: sw as never, bricksConfirmed: true }), g);
    expect(b.ctx).toBeNull();
    expect(b.sourceReview.status === "blocked_missing_source_review" && b.sourceReview.unreviewedBricks.length).toBe(BRICKS_703.length);
  });
  it("revue d'un autre coach ou d'un autre athlète : refusée", () => {
    const rec = runner();
    expect(buildAthleteDetInputs(rec, f(), answers("Semi-marathon"), genuineFor(rec, "Semi-marathon", { coachId: "00000000-0000-4000-8000-0000000000c2" })).ctx).toBeNull();
    expect(buildAthleteDetInputs(rec, f(), answers("Semi-marathon"), genuineFor(rec, "Semi-marathon", { athleteId: "00000000-0000-4000-8000-0000000000a2" })).ctx).toBeNull();
  });
  it("séance modifiée depuis la revue (empreinte) ou revue sans coachReviewedSource : non reprise", () => {
    const rec = runner(); const g = genuineFor(rec, "Semi-marathon");
    const [q0, q1, ...rest] = g.qualifications;
    const bad = { ...g, qualifications: [{ ...q0, sourceFingerprint: "0".repeat(64) }, { ...q1, evidence: { ...(q1.evidence as object), coachReviewedSource: false } as never }, ...rest] };
    const b = buildAthleteDetInputs(rec, f(), answers("Semi-marathon"), bad);
    expect(b.ctx).toBeNull();
    expect(b.sourceReview.status === "blocked_missing_source_review" && b.sourceReview.unreviewedIds).toEqual([q0.id, q1.id]);
  });
  it("revue réelle existante : reprise telle quelle (non réécrite) et tracée", () => {
    const rec = runner(); const g = genuineFor(rec, "Semi-marathon");
    const b = buildAthleteDetInputs(rec, f(), answers("Semi-marathon"), g);
    expect(b.ctx!.qualifications).toEqual(g.qualifications);
    expect(b.snapshot!.sourceReviewProvenance).toMatchObject({ kind: "genuine_coach_source_review", reviewContextId: "ctx-grille-synthetique" });
    expect(b.sourceReview.status).toBe("reviewed");
  });
  it("ancres requises dérivées du pool (triathlon : FTP, allures natation)", () => {
    const r = requiredAnchorKeys(coachFamilyFor("Ironman 70.3")!, familySourcePool("triathlon_703"));
    expect(r.anchors).toEqual(expect.arrayContaining(["bikeFtpWatts", "runThresholdPaceSecPerKm"]));
    expect(r.swimDomains.length).toBeGreaterThan(0);
  });
  it("changement d'athlète : les entrées et le hash changent (revue/sortie précédentes périmées)", async () => {
    const f = form("Semi-marathon", 8, 6);
    const a = buildAthleteDetInputs(runner(), f, answers("Semi-marathon"));
    const b = buildAthleteDetInputs(runner({ athleteId: "00000000-0000-4000-8000-0000000000a2" }), f, answers("Semi-marathon"));
    expect(await hashCoachInputs(a.snapshot!)).not.toBe(await hashCoachInputs(b.snapshot!));
  });
});

describe("pont → VRAI solveur → validateurs finaux", () => {
  const toHm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  // Horaires SYNTHÉTIQUES variant selon le jour (saisie « horaires différents selon le jour »).
  const variedClock = { timeZone: "Europe/Brussels", bySport: {
    run: { time: "", days, perDay: [1080, 360, 540, 720, 900, 1020, 1140].map(toHm) },
    strength: { time: "", days, perDay: [900, 900, 1080, 1200, 540, 600, 720].map(toHm) },
    bike: { time: "", days, perDay: [660, 660, 840, 1020, 720, 780, 900].map(toHm) } } };
  it("semi 8 sem./6 h avec une heure fixe par sport : refus moteur réel (créneau de récupération semaine 7), nommé", async () => {
    const { out } = await generate(semiRec(), form("Semi-marathon", 8, 6), answers("Semi-marathon"), { maxNodes: 25000, maxMilliseconds: 15000 });
    expect(out?.kind === "engine_refused" && out.blockingCodes).toContain("det_v3_recovery_safe_slot_unfillable");
    const fr = explainEngineRefusal(out?.kind === "engine_refused" ? out.blockingIssues ?? [] : []).join(" | ");
    expect(fr).toMatch(/Semaine 7 .*ne peut pas être placée.*récupération/);
    expect(fr).not.toMatch(/\d{1,2}:\d{2}/);
  }, 60000);
  const semiRec = () => runner({ birthDate: "1991-01-01", sex: "M",
    refs: { ...runner().refs, ftp: 300, weightKg: 72 }, snapshot: { ...runner().snapshot!, vlamax_run: 0.5 } });
  it("semi 8 sem./6 h, profil A depuis la fiche : ACCEPTÉ, ancres de la fiche et ordre coach tracés", async () => {
    const rec = semiRec(); const f = form("Semi-marathon", 8, 6);
    const base = buildAthleteDetInputs(rec, f, answers("Semi-marathon"));
    const eligible = eligibleLimiterMetrics(base.snapshot!);
    const order = [...initialLimiterOrder(rec.diagnosticLimiters, eligible).order].reverse();

    const { out } = await generate(rec, f, answers("Semi-marathon", { coachLimiterOrder: order, clock: variedClock }), { maxNodes: 25000, maxMilliseconds: 15000 });
    expect(out?.kind).toBe("accepted");
    if (out?.kind !== "accepted") return;
    expect(out.sessions).toBeGreaterThan(30);
    expect((out.provenance as unknown as { prescriptionAllowed: boolean }).prescriptionAllowed).toBe(false);
    expect(out.limiterOrder).toMatchObject({ mode: "coach", coachConfirmed: order });
    const prov = out.provenance as unknown as { coachInputs: { anchors: Record<string, { method: string; kind: string }> } };
    expect(prov.coachInputs.anchors.runThresholdPaceSecPerKm.method).toMatch(/profil physiologique du 2026-10-01/);
    expect(prov.coachInputs.anchors.runThresholdPaceSecPerKm.kind).toBe("explicit_estimate");
  }, 60000);
  it("70.3 12 sem./9 h depuis la fiche + allures natation saisies : ACCEPTÉ", async () => {
    const rec = runner({ refs: { ...runner().refs, css: 95, sources: { ...runner().refs.sources, css: "snapshot" } }, snapshot: { ...runner().snapshot!, vlamax: 0.55 } });
    const sw = { recovery: 120, moderate_lt1: 110, tempo: 103, im_pace: 108, "703_pace": 102, marathon_pace: 103, sub_threshold: 98, semi_pace: 98, mlss: 95, vo2max: 88, neuromuscular: 80 } as const;
    const a = answers("Ironman 70.3", { swimPaces: Object.fromEntries(Object.entries(sw).map(([k, v]) => [k, { value: v, kind: "explicit_estimate", method: "SYNTHÉTIQUE test 400/200", uncertainty: "±3 s" }])) });
    const f = { ...form("Ironman 70.3", 12, 9) };
    const { b, out } = await generate(rec, f, a, { maxNodes: 200000, maxMilliseconds: 120000 });
    expect(b.missing).toEqual([]);
    expect(out?.kind).toBe("accepted");
  }, 90000);
  it("semi 8 sem./6 h, profil B (autre physiologie, femme) : ACCEPTÉ aussi, sans valeur de scénario", async () => {
    const { out } = await generate(runner(), form("Semi-marathon", 8, 6), answers("Semi-marathon", { clock: variedClock }), { maxNodes: 25000, maxMilliseconds: 15000 });
    expect(out?.kind).toBe("accepted");
    const prov = out?.kind === "accepted" ? (out.provenance as unknown as { coachInputs: { sex: string; physiology: Record<string, { value: number }> } }).coachInputs : null;
    expect(prov?.sex).toBe("F"); expect(prov?.physiology.vlamaxRun.value).toBe(0.45);
  }, 60000);
  // Marathon : mêmes options/pool que le cas CI (v356, PR454 b9ba425e) ; l'issue dépend des limiteurs RÉELS de l'athlète.
  const marathonRec = (pace: number) => runner({ birthDate: "1991-01-01", sex: "M", refs: { ...runner().refs, ftp: 300, weightKg: 72 },
    snapshot: { ...runner().snapshot!, vlamax_run: null, pace_threshold_sec_per_km: pace } });
  const mForm = () => ({ ...form("Marathon", 16, 7), sessionsPerWeek: 4 });
  const fast = { maxNodes: 25000, maxMilliseconds: 120000 };
  it("marathon 16 sem./7 h, diagnostic de l'app centré TTE (seuil 3:42/km) : ACCEPTÉ via le pont, preuves marathon et non prescriptif", async () => {
    const { b, out } = await generate(marathonRec(222), mForm(), answers("Marathon", { clock: variedClock }), fast);
    expect(b.snapshot!.coachLimiterOrder).toBeNull();
    expect(out?.kind).toBe("accepted");
    if (out?.kind !== "accepted") return;
    const p = out.provenance as unknown as { prescriptionAllowed: boolean; coachInputs: { sourcePool: { family: string; independentScientificReview: boolean }; sourceReviewProvenance: { kind: string } } };
    expect(p.prescriptionAllowed).toBe(false);
    expect(p.coachInputs.sourcePool).toMatchObject({ family: "marathon", independentScientificReview: false });
    expect(p.coachInputs.sourceReviewProvenance.kind).toBe("genuine_coach_source_review");
    expect(out.limiterOrder).toMatchObject({ mode: "automatic" });
    const pool = new Set(familySourcePool("marathon").ids);
    const weeks = (out.plan as unknown as { weeks: { sessions: { isRest?: boolean; title: string; catalogId?: string }[] }[] }).weeks;
    expect(weeks).toHaveLength(16);
    for (const s of weeks.flatMap((w) => w.sessions)) if (!s.isRest && !s.title.startsWith("COURSE : ")) expect(pool.has(s.catalogId!)).toBe(true);
  }, 120000);
  it("marathon : VLamax d'abord (diagnostic automatique) ⇒ blocage nommé avant solveur (aucune branche primaire VLamax marathon) ; le coach met TTE d'abord ⇒ ACCEPTÉ, ordre coach tracé", async () => {
    const r1 = await generate(marathonRec(230), mForm(), answers("Marathon", { clock: variedClock }), fast);
    expect(r1.out?.kind).toBe("refused");
    expect(r1.out?.kind === "refused" && r1.out.blockedUnsupportedLimiter).toMatchObject({ code: "blocked_unsupported_limiter", raw: "VLamax" });
    const r2 = await generate(marathonRec(230), mForm(), answers("Marathon", { clock: variedClock, coachLimiterOrder: ["TTE", "VLamax"] }), fast);
    expect(r2.out?.kind).toBe("accepted");
    expect(r2.out?.kind === "accepted" && r2.out.limiterOrder).toMatchObject({ mode: "coach", coachConfirmed: ["TTE", "VLamax"] });
  }, 180000);
  it("marathon : interdiction de sprints issue du diagnostic (seuil 4:00/km) ⇒ refus réel nommé en semaine 14, jamais assoupli", async () => {
    const { out } = await generate(marathonRec(240), mForm(), answers("Marathon", { clock: variedClock, coachLimiterOrder: ["TTE", "VLamax"] }), fast);
    expect(out?.kind).toBe("engine_refused");
    if (out?.kind !== "engine_refused") return;
    expect(out.blockingCodes).toEqual(["lorang_categories"]);
    expect(explainEngineRefusal(out.blockingIssues ?? []).join(" ")).toMatch(/Semaine 14 .*seuil/);
  }, 120000);
  it("semi accepté : sauvegarde append-only + réouverture, base de séances = pool ingénierie (revue scientifique : non)", async () => {
    const rec = semiRec();
    const { out } = await generate(rec, form("Semi-marathon", 8, 6), answers("Semi-marathon", { clock: variedClock }), { maxNodes: 25000, maxMilliseconds: 15000 });
    expect(out?.kind).toBe("accepted");
    if (out?.kind !== "accepted") return;
    const ci = (out.provenance as unknown as { coachInputs: { sourcePool: { independentScientificReview: boolean; family: string } } }).coachInputs;
    expect(ci.sourcePool).toMatchObject({ family: "semi_marathon", independentScientificReview: false });
    const { AppendOnlyPlanVersionSaver } = await import("@/lib/plan/appendOnlyPlanVersionSave");
    const { restoreStructuredPlan } = await import("@/lib/plan/restoreStructuredPlan");
    const { readPlanProvenance, isDetCoachInputsProvenance } = await import("@/lib/plan/planProvenance");
    const db = new Map<string, Record<string, unknown>>();
    const transport = { insert: async (row: { id: string }) => { db.set(row.id, JSON.parse(JSON.stringify(row))); return { error: null }; },
      readById: async (id: string) => ({ data: db.get(id) ?? null, error: null }) };
    const saved = await new AppendOnlyPlanVersionSaver({ transport } as never).save({ athlete_id: rec.athleteId, coach_id: COACH, plan_json: out.plan, objective: "Semi-marathon",
      weeks_count: 8, sessions_count: out.sessions, validator_score: null, validator_grade: null, validator_summary: null } as never);
    expect(saved.status).toBe("CONFIRMED");
    const restored = restoreStructuredPlan((db.get(saved.attemptId!) as { plan_json: unknown }).plan_json as never);
    const raw = (restored as unknown as { _provenance?: { coachInputs?: { sourcePool?: unknown } } })._provenance;
    expect(isDetCoachInputsProvenance(raw)).toBe(true);
    expect(raw!.coachInputs!.sourcePool).toMatchObject({ independentScientificReview: false });
    expect(readPlanProvenance(restored!).label).toBe("DET Engine (entrées coach, QA)");
  }, 90000);
  it("VLamax typée « lab » dans la fiche : mesure reprise sans question ; « estimation » jamais promue", () => {
    const m = buildAthleteDetInputs(semiRec(), form("Semi-marathon", 8, 6), answers("Semi-marathon", { provenance: { ...answers("Semi-marathon").provenance, vlamaxRun: undefined } }));
    expect(m.missing.some((x) => x.key === "prov:vlamaxRun")).toBe(false); // non requise : facultative
    const typed = runner({ snapshot: { ...runner().snapshot!, vlamax_source: "lab", vlamax_protocol: "lactate 15 s" } });
    const p = prefillFromRecord(typed).find((x) => x.key === "vlamaxRun")!;
    expect(p.typedKind).toBe("field_measurement");
    const t = buildAthleteDetInputs(typed, form("Semi-marathon", 8, 6), answers("Semi-marathon", { provenance: { ...answers("Semi-marathon").provenance, vlamaxRun: undefined } }));
    expect(t.snapshot!.physiology!.vlamaxRun).toMatchObject({ kind: "field_measurement" });
    const est = runner({ snapshot: { ...runner().snapshot!, vlamax_source: "estimation" } });
    const e = buildAthleteDetInputs(est, form("Semi-marathon", 8, 6), answers("Semi-marathon", { provenance: { ...answers("Semi-marathon").provenance, vlamaxRun: { kind: "field_measurement" } } }));
    expect(e.missing.find((x) => x.key === "prov:vlamaxRun")?.why).toMatch(/ne peut pas être déclarée mesure/);
  });
  it("aucune bascule IA quand DET refuse", async () => {
    const ai = vi.fn();
    await expect(dispatchCoachEngine("det", { ai, det: async () => { throw new Error("det_refused"); } } as never)).rejects.toThrow();
    expect(ai).not.toHaveBeenCalled();
  });
  it("une source obligatoire manquante nomme la semaine et la revue à compléter", () => {
    const message = explainEngineRefusal([{ code: "det_required_horizon_source_missing", week: 13,
      message: JSON.stringify({ day: "Saturday", sport: "brick", phase: "peak", quotaMin: 1 }) }]).join(" ");
    expect(message).toMatch(/Semaine 13/);
    expect(message).toMatch(/enchaînement vélo-course/);
    expect(message).toMatch(/compléter la revue/);
    expect(message).toMatch(/augmenter le temps de calcul ne suffit pas/);
  });
});
