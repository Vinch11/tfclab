import { describe, it, expect } from "vitest";
import {
  computeWeeklySessionQuota,
  normalizeSizingObjective,
  normalizeSizingAmbition,
  inferWeekType,
  computeWeekQuotaEntry,
  applySessionsPerWeekTarget,
  applyBannedSportsRedistribution,
} from "@/engines/plan/sessionSizingMatrix";

describe("sessionSizingMatrix — computeWeeklySessionQuota", () => {
  it("703 age_group 10h load → swim 3, total 11", () => {
    const r = computeWeeklySessionQuota("IRONMAN 70.3", "age_group", 10, "load");
    expect(r).not.toBeNull();
    expect(r!.quota.swim.min).toBe(3);
    expect(r!.quota.swim.max).toBe(3);
    expect(r!.quota.totalSessions.min).toBe(11);
    expect(r!.downgraded).toBe(false);
  });

  // Fix D5 (audit "génération de plan IA") : le brick est mis à zéro pour un
  // plan LCW (course à étapes 3 jours) mais totalSessions n'était jamais
  // ajusté en conséquence — le plancher devenait structurellement
  // inatteignable (10 max sans brick < 11 requis pour 703 age_group),
  // déclenchant systématiquement un faux positif "total hors fourchette".
  it("703 age_group 10h load, LCW : brick à 0 ET totalSessions réduit du brick d'origine (plancher réellement atteignable)", () => {
    const r = computeWeeklySessionQuota("IRONMAN 70.3", "age_group", 10, "load", true);
    expect(r).not.toBeNull();
    const q = r!.quota;
    expect(q.brick).toEqual({ min: 0, max: 0 });
    // Sans LCW : totalSessions.min=11 (swim3+bike3+run3+brick1+strength1).
    // Avec LCW (brick retranché) : 11-1=10, exactement swim3+bike3+run3+strength1.
    expect(q.totalSessions.min).toBe(10);
    expect(q.totalSessions.max).toBe(10);
    const achievableMax = q.swim.max + q.bike.max + q.run.max + q.brick.max + q.strength.max;
    expect(
      q.totalSessions.min,
      `totalSessions.min=${q.totalSessions.min} > plafond réellement atteignable (${achievableMax}) — faux positif garanti`,
    ).toBeLessThanOrEqual(achievableMax);
  });

  it("703 finisher 6h load, LCW : brick {0,1} d'origine → seul totalSessions.max baisse (min déjà atteignable sans brick)", () => {
    const withoutLCW = computeWeeklySessionQuota("IRONMAN 70.3", "finisher", 6, "load", false);
    const withLCW = computeWeeklySessionQuota("IRONMAN 70.3", "finisher", 6, "load", true);
    expect(withoutLCW).not.toBeNull();
    expect(withLCW).not.toBeNull();
    expect(withLCW!.quota.brick).toEqual({ min: 0, max: 0 });
    expect(withLCW!.quota.totalSessions.min).toBe(withoutLCW!.quota.totalSessions.min);
    expect(withLCW!.quota.totalSessions.max).toBe(withoutLCW!.quota.totalSessions.max - 1);
  });

  it("N'affecte PAS totalSessions pour un objectif non-LCW (703 sans isLCW)", () => {
    const r = computeWeeklySessionQuota("IRONMAN 70.3", "age_group", 10, "load", false);
    expect(r).not.toBeNull();
    expect(r!.quota.brick).toEqual({ min: 1, max: 1 });
    expect(r!.quota.totalSessions.min).toBe(11);
  });

  it("N'affecte PAS totalSessions pour un objectif non-703/IM même avec isLCW=true (garde objKey déjà en place)", () => {
    const r = computeWeeklySessionQuota("SEMI-MARATHON", "competitor", 6, "load", true);
    expect(r).not.toBeNull();
    const witness = computeWeeklySessionQuota("SEMI-MARATHON", "competitor", 6, "load", false);
    expect(r!.quota.totalSessions).toEqual(witness!.quota.totalSessions);
  });

  it("703 elite 12h → downgraded=true vers competitor", () => {
    const r = computeWeeklySessionQuota("IRONMAN 70.3", "elite", 12, "load");
    expect(r).not.toBeNull();
    expect(r!.downgraded).toBe(true);
    expect(r!.downgradeReason).toBeTruthy();
    expect(r!.quota.strength.min).toBe(2); // competitor row
  });

  it("recovery STARTTORUN finisher → totalSessions cohérent avec run+strength réellement atteignables (pas de faux positif quota_range_drift)", () => {
    // Régression : le calcul générique (×0.7 du total load) ignorait que
    // `strength` reste épinglé au plancher STARTTORUN (2, jamais réduit en
    // récup) — le plancher run(2)+strength(2)=4 dépassait systématiquement
    // `totalSessions.max` (2-3 avant le fix), déclenchant un faux positif
    // quota_range_drift à CHAQUE semaine de récup S2R.
    const r = computeWeeklySessionQuota("Start to Run", "finisher", 2, "recovery");
    expect(r).not.toBeNull();
    const q = r!.quota;
    const achievableMin = q.swim.min + q.bike.min + q.run.min + q.brick.min + q.strength.min;
    expect(
      q.totalSessions.max,
      `totalSessions.max=${q.totalSessions.max} < plancher réellement atteignable (${achievableMin}) — faux positif garanti`,
    ).toBeGreaterThanOrEqual(achievableMin);
    expect(q.strength.min).toBe(2);
    expect(q.run.min).toBe(2);
  });

  it("recovery 703 age_group → total ≤ 8, swim ≥ 2, strength ≥ 1", () => {
    const r = computeWeeklySessionQuota("IRONMAN 70.3", "age_group", 10, "recovery");
    expect(r).not.toBeNull();
    expect(r!.quota.totalSessions.max).toBeLessThanOrEqual(8);
    expect(r!.quota.swim.min).toBeGreaterThanOrEqual(2);
    expect(r!.quota.strength.min).toBeGreaterThanOrEqual(1);
  });

  it("taper → longRideWeekly désactivé, swim ≥ 2 maintenu", () => {
    const r = computeWeeklySessionQuota("IRONMAN 70.3", "age_group", 10, "taper");
    expect(r).not.toBeNull();
    expect(r!.floors.longRideWeekly).toBe(false);
    expect(r!.floors.longRunWeekly).toBe(false);
    expect(r!.floors.minSwimPerWeek).toBe(2);
  });

  it("TRI_SPRINT age_group → bike 2, run 2, swim 3", () => {
    const r = computeWeeklySessionQuota("TRIATHLON SPRINT", "age_group", 8, "load");
    expect(r).not.toBeNull();
    expect(r!.quota.bike.min).toBe(2);
    expect(r!.quota.run.min).toBe(2);
    expect(r!.quota.swim.min).toBe(3);
  });

  it("SEMI competitor → run 5, swim 0", () => {
    const r = computeWeeklySessionQuota("SEMI-MARATHON", "competitor", 6, "load");
    expect(r).not.toBeNull();
    expect(r!.quota.run.min).toBe(5);
    expect(r!.quota.run.max).toBe(5);
    expect(r!.quota.swim.max).toBe(0);
    expect(r!.downgraded).toBe(false); // CAP: pas de seuil horaire v1
  });

  it("est une fonction pure : mêmes entrées = mêmes sorties", () => {
    const a = computeWeeklySessionQuota("IRONMAN 70.3", "age_group", 10, "load");
    const b = computeWeeklySessionQuota("IRONMAN 70.3", "age_group", 10, "load");
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("normalizeSizingObjective — trail retourne null (hors scope 2A)", () => {
    expect(normalizeSizingObjective("UTMB")).toBeNull();
    expect(normalizeSizingObjective("Trail court")).toBeNull();
  });

  it("normalizeSizingAmbition — world_class mappe elite", () => {
    expect(normalizeSizingAmbition("world_class")).toBe("elite");
  });

  it("inferWeekType — dernière semaine = race, sinon 4e = recovery, sinon load", () => {
    expect(inferWeekType(32, 32)).toBe("race");   // pct=1 > 0.92 ET dernière
    expect(inferWeekType(31, 32)).toBe("taper");  // pct≈0.97 > 0.92
    expect(inferWeekType(4, 12)).toBe("recovery");
    expect(inferWeekType(5, 12)).toBe("load");
  });

  it("fix C3 : 'Trail montagne' (libellé UI réel, français) reconnu au même titre que 'Trail mountain' — taper 2 semaines", () => {
    // Plan de 10 semaines : taper=2 → S8 est déjà taper (10-2=8). taper=1 (bug)
    // → S8 reste "recovery" (8%4===0), pas "taper". Avant le fix, "Trail
    // montagne" (graphie française réelle de l'UI) ne matchait aucun mot-clé
    // de taperWeeksForTrail et retombait sur 1 semaine — divergent du prompt
    // LLM (sportRatioMatrix.ts, edge function), qui reconnaît déjà les deux
    // graphies et demande 2 semaines de taper pour cet objectif.
    expect(inferWeekType(8, 10, "Trail montagne")).toBe("taper");
    expect(inferWeekType(8, 10, "Trail mountain")).toBe("taper"); // déjà correct avant le fix
  });

  // ─── PHASE 2A.1 — Invariant de faisabilité sur TOUTES les cellules ─────────
  it("invariant faisabilité : totalSessions.max ≤ (7−minRest)×maxPerDay ET totalSessions.min ≥ Σ mins sport", () => {
    const objectives = ["IRONMAN 70.3", "IRONMAN", "TRIATHLON SPRINT", "TRIATHLON OLYMPIQUE",
                        "SEMI-MARATHON", "MARATHON", "10K", "5K"];
    const ambitions = ["finisher", "age_group", "competitor", "elite"];
    for (const obj of objectives) {
      for (const amb of ambitions) {
        const r = computeWeeklySessionQuota(obj, amb, 15, "load");
        if (!r) continue;
        const q = r.quota;
        const capacity = (7 - q.minFullRestDays) * q.maxSessionsPerDay;
        expect(q.totalSessions.max, `${obj}/${amb}: total.max=${q.totalSessions.max} > capacité=${capacity}`).toBeLessThanOrEqual(capacity);
        const sumMin = q.swim.min + q.bike.min + q.run.min + q.brick.min + q.strength.min;
        expect(q.totalSessions.min, `${obj}/${amb}: total.min=${q.totalSessions.min} < ΣminsSport=${sumMin}`).toBeGreaterThanOrEqual(sumMin);
      }
    }
  });

  it("finishers ont tous maxSessionsPerDay=2 (1 doublon nat+renfo autorisé)", () => {
    const objectives = ["IRONMAN 70.3", "IRONMAN", "TRIATHLON SPRINT", "TRIATHLON OLYMPIQUE",
                        "SEMI-MARATHON", "MARATHON", "10K", "5K"];
    for (const obj of objectives) {
      const r = computeWeeklySessionQuota(obj, "finisher", 6, "load");
      expect(r).not.toBeNull();
      expect(r!.quota.maxSessionsPerDay).toBe(2);
    }
  });

  it("floors 70.3 exposent slLongRideMin=120, slLongRunMin=90", () => {
    const r = computeWeeklySessionQuota("IRONMAN 70.3", "age_group", 10, "load");
    expect(r!.floors.slLongRideMin).toBe(120);
    expect(r!.floors.slLongRunMin).toBe(90);
  });

  it("floors IM exposent slLongRideMin=150, slLongRunMin=100", () => {
    const r = computeWeeklySessionQuota("IRONMAN", "age_group", 10, "load");
    expect(r!.floors.slLongRideMin).toBe(150);
    expect(r!.floors.slLongRunMin).toBe(100);
  });

  it("recovery week — planchers SL réduits ×0.7 arrondis 5min", () => {
    const r = computeWeeklySessionQuota("IRONMAN 70.3", "age_group", 10, "recovery");
    // 120*0.7=84 → arrondi 5 → 85 ; 90*0.7=63 → arrondi 5 → 65
    expect(r!.floors.slLongRideMin).toBe(85);
    expect(r!.floors.slLongRunMin).toBe(65);
  });

  it("taper — planchers SL désactivés (undefined)", () => {
    const r = computeWeeklySessionQuota("IRONMAN 70.3", "age_group", 10, "taper");
    expect(r!.floors.slLongRideMin).toBeUndefined();
    expect(r!.floors.slLongRunMin).toBeUndefined();
    expect(r!.floors.longRideWeekly).toBe(false);
  });
});

// Fix "réconciliation régénération semaine seule" (audit génération de plan
// IA, B2) : cette composition (base matrice → cible séances/semaine →
// redistribution disciplines bannies) était dupliquée entre la boucle de
// génération complète (useAITrainingPlan.ts) et le nouveau chemin de
// régénération semaine seule (AITrainingPlanPage.tsx) — factorisée ici pour
// que les deux appelants soient prouvés identiques.
describe("sessionSizingMatrix — computeWeekQuotaEntry", () => {
  it("sans options : équivalent strict à computeWeeklySessionQuota seul", () => {
    const direct = computeWeeklySessionQuota("IRONMAN 70.3", "age_group", 10, "load");
    const composed = computeWeekQuotaEntry("IRONMAN 70.3", "age_group", 10, "load", false);
    expect(composed).not.toBeNull();
    expect(composed!.quota).toEqual(direct!.quota);
    expect(composed!.floors).toEqual(direct!.floors);
    expect(composed!.weekType).toBe("load");
    expect(composed!.downgraded).toBe(direct!.downgraded);
  });

  it("objectif non reconnu → null (comme computeWeeklySessionQuota)", () => {
    expect(computeWeekQuotaEntry("Objectif inconnu xyz", "age_group", 10, "load", false)).toBeNull();
  });

  it("sessionsPerWeek fourni → identique à applySessionsPerWeekTarget appliqué manuellement", () => {
    const q0 = computeWeeklySessionQuota("IRONMAN 70.3", "age_group", 10, "load")!;
    const expected = applySessionsPerWeekTarget({ quota: q0.quota, floors: q0.floors }, 8, "load");
    const composed = computeWeekQuotaEntry("IRONMAN 70.3", "age_group", 10, "load", false, { sessionsPerWeek: 8 });
    expect(composed!.quota).toEqual(expected.quota);
    expect(composed!.floors).toEqual(expected.floors);
  });

  it("bannedSports fourni → identique à applyBannedSportsRedistribution appliqué manuellement", () => {
    const q0 = computeWeeklySessionQuota("IRONMAN 70.3", "age_group", 10, "load")!;
    const expected = applyBannedSportsRedistribution({ quota: q0.quota, floors: q0.floors }, ["swim"]);
    const composed = computeWeekQuotaEntry("IRONMAN 70.3", "age_group", 10, "load", false, { bannedSports: ["swim"] });
    expect(composed!.quota.swim).toEqual({ min: 0, max: 0 });
    expect(composed!.quota).toEqual(expected.quota);
    expect(composed!.floors).toEqual(expected.floors);
  });

  it("sessionsPerWeek ET bannedSports combinés : ordre identique à la boucle de génération complète (cible d'abord, puis redistribution)", () => {
    const q0 = computeWeeklySessionQuota("IRONMAN 70.3", "age_group", 10, "load")!;
    const afterTarget = applySessionsPerWeekTarget({ quota: q0.quota, floors: q0.floors }, 8, "load");
    const expected = applyBannedSportsRedistribution(afterTarget, ["swim"]);
    const composed = computeWeekQuotaEntry("IRONMAN 70.3", "age_group", 10, "load", false, {
      sessionsPerWeek: 8,
      bannedSports: ["swim"],
    });
    expect(composed!.quota).toEqual(expected.quota);
    expect(composed!.floors).toEqual(expected.floors);
  });
});
