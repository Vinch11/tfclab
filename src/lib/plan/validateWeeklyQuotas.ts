/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 2A — Validation post-merge du quota hebdo (source moteur, non IA).
 * ═══════════════════════════════════════════════════════════════════════════════
 * Consomme le MergedPlan produit par mergePlanChunks + la map quotasByWeek
 * calculée en amont côté client, et remonte deux niveaux d'issues :
 *
 *  - CRITICAL "quota_floor_violation"   → violation d'un floor
 *  - WARNING  "quota_range_drift"       → hors fourchette min-max sans floor
 *
 * Aligné sur la mécanique des issues sport↔objectif (validateSportObjective).
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { MergedPlan } from "./mergePlanChunks";
import type { WeeklyQuota, SizingFloors, WeekType } from "@/engines/plan/sessionSizingMatrix";
import { diffLayoutVsWeek, type WeeklySlotLayout } from "@/engines/plan/weeklySlotLayout";

export interface QuotaIssue {
  severity: "critical" | "warning";
  code: "quota_floor_violation" | "quota_range_drift" | "layout_drift";
  weekNumber: number;
  reason: string;
  expected?: string;
  observed?: string;
}

export interface WeekQuotaEntry {
  quota: WeeklyQuota;
  floors: SizingFloors;
  weekType: WeekType;
  downgraded: boolean;
  downgradeReason?: string;
  /** Layout jour-par-jour attendu (Phase 2A.1 — optional). */
  layout?: WeeklySlotLayout;
}

// Fallback si le format n'a pas de plancher SL explicite (ex: matrice ancienne).
const LONG_RIDE_DEFAULT_MIN = 120;
const LONG_RUN_DEFAULT_MIN = 90;

export function validateWeeklyQuotas(
  merged: MergedPlan,
  quotasByWeek: Record<number, WeekQuotaEntry>,
): QuotaIssue[] {
  const out: QuotaIssue[] = [];
  for (const w of merged.weeks) {
    const entry = quotasByWeek[w.weekNumber];
    if (!entry) continue;
    const q = entry.quota;
    const floors = entry.floors;
    const slBikeMin = floors.slLongRideMin ?? LONG_RIDE_DEFAULT_MIN;
    const slRunMin = floors.slLongRunMin ?? LONG_RUN_DEFAULT_MIN;

    // Compte par sport (rest exclu)
    const counts = { swim: 0, bike: 0, run: 0, brick: 0, strength: 0 } as Record<string, number>;
    const dayCounts = new Map<string, number>();
    const dayObservedSports = new Map<string, string[]>();
    let hasLongRide = false;
    let hasLongRun = false;
    // PHASE 2A.4 — un brick de durée ≥ slBikeMin + 20 satisfait le floor SL vélo.
    const brickSLBikeThreshold = slBikeMin + 20;
    for (const s of w.sessions) {
      if (s.isRest || s.sport === "rest") continue;
      if (s.sport in counts) counts[s.sport]++;
      dayCounts.set(s.dayName, (dayCounts.get(s.dayName) ?? 0) + 1);
      // PHASE 2A.2 fix — normaliser la clé pour matcher le layout ("lundi" ≠ "Lundi").
      const dayKey = s.dayName.toLocaleLowerCase("fr-FR");
      const list = dayObservedSports.get(dayKey) ?? [];
      list.push(s.sport);
      dayObservedSports.set(dayKey, list);
      if (s.sport === "bike" && (s.durationMin ?? 0) >= slBikeMin) hasLongRide = true;
      if (s.sport === "brick" && (s.durationMin ?? 0) >= brickSLBikeThreshold) hasLongRide = true;
      if (s.sport === "run" && (s.durationMin ?? 0) >= slRunMin) hasLongRun = true;
    }
    const uniqueTrainingDays = dayCounts.size;
    const restDays = Math.max(0, 7 - uniqueTrainingDays);

    // ─── FLOORS ────────────────────────────────────────────────────────────
    if (typeof floors.minSwimPerWeek === "number" && counts.swim < floors.minSwimPerWeek) {
      out.push({
        severity: "critical", code: "quota_floor_violation", weekNumber: w.weekNumber,
        reason: `swim < minSwimPerWeek (${counts.swim} < ${floors.minSwimPerWeek})`,
        expected: `≥${floors.minSwimPerWeek} nat`, observed: `${counts.swim} nat`,
      });
    }
    if (floors.longRideWeekly && !hasLongRide) {
      out.push({
        severity: "critical", code: "quota_floor_violation", weekNumber: w.weekNumber,
        reason: `pas de SL vélo (≥${slBikeMin}min) ni brick long (≥${brickSLBikeThreshold}min) en semaine ${entry.weekType}`,
        expected: `1 bike ≥${slBikeMin}min OU 1 brick ≥${brickSLBikeThreshold}min`, observed: "aucun",
      });
    }
    if (floors.longRunWeekly && !hasLongRun) {
      out.push({
        severity: "critical", code: "quota_floor_violation", weekNumber: w.weekNumber,
        reason: `pas de SL CAP (≥${slRunMin}min) en semaine ${entry.weekType}`,
        expected: `1 run ≥${slRunMin}min`, observed: "aucun",
      });
    }
    if (counts.strength < floors.minStrengthPerWeek) {
      out.push({
        severity: "critical", code: "quota_floor_violation", weekNumber: w.weekNumber,
        reason: `strength < minStrengthPerWeek (${counts.strength} < ${floors.minStrengthPerWeek})`,
        expected: `≥${floors.minStrengthPerWeek} renfo`, observed: `${counts.strength} renfo`,
      });
    }
    if (q.minFullRestDays > 0 && restDays < q.minFullRestDays) {
      out.push({
        severity: "critical", code: "quota_floor_violation", weekNumber: w.weekNumber,
        reason: `jours repos complet insuffisants (${restDays} < ${q.minFullRestDays})`,
        expected: `≥${q.minFullRestDays} jour repos`, observed: `${restDays} jour(s)`,
      });
    }
    for (const [day, cnt] of dayCounts.entries()) {
      if (cnt > q.maxSessionsPerDay) {
        out.push({
          severity: "critical", code: "quota_floor_violation", weekNumber: w.weekNumber,
          reason: `${day}: ${cnt} séances > max ${q.maxSessionsPerDay}/jour`,
          expected: `≤${q.maxSessionsPerDay}/jour`, observed: `${cnt} le ${day}`,
        });
      }
    }

    // ─── RANGE DRIFT (warnings) ────────────────────────────────────────────
    // PHASE 2A.4 — brick compte comme sollicitation vélo. La fourchette bike
    // affichée est décalée de −brickObserved (clampée ≥0) quand un brick est
    // présent : 3 bike + 0 brick ≡ 2 bike + 1 brick.
    const bikeShift = counts.brick > 0 ? counts.brick : 0;
    const bikeEffective = {
      min: Math.max(0, q.bike.min - bikeShift),
      max: Math.max(0, q.bike.max - bikeShift),
    };
    const check = (sport: string, obs: number, r: { min: number; max: number }) => {
      if (obs < r.min || obs > r.max) {
        out.push({
          severity: "warning", code: "quota_range_drift", weekNumber: w.weekNumber,
          reason: `${sport} hors fourchette (${obs} ∉ [${r.min}, ${r.max}])`,
          expected: `${r.min}-${r.max} ${sport}`, observed: `${obs} ${sport}`,
        });
      }
    };
    check("swim", counts.swim, q.swim);
    check("bike", counts.bike, bikeEffective);
    check("run", counts.run, q.run);
    check("brick", counts.brick, q.brick);
    check("strength", counts.strength, q.strength);

    const total = counts.swim + counts.bike + counts.run + counts.brick + counts.strength;
    if (total < q.totalSessions.min || total > q.totalSessions.max) {
      out.push({
        severity: "warning", code: "quota_range_drift", weekNumber: w.weekNumber,
        reason: `total ${total} hors fourchette [${q.totalSessions.min}, ${q.totalSessions.max}]`,
        expected: `${q.totalSessions.min}-${q.totalSessions.max} séances`, observed: `${total}`,
      });
    }

    // ─── LAYOUT DRIFT (warnings v1) ────────────────────────────────────────
    if (entry.layout) {
      const drifts = diffLayoutVsWeek(entry.layout, dayObservedSports);
      for (const dr of drifts.slice(0, 5)) {
        out.push({
          severity: "warning", code: "layout_drift", weekNumber: w.weekNumber,
          reason: `${dr.dayName}: attendu ${dr.expected}, observé ${dr.observed}`,
          expected: dr.expected, observed: dr.observed,
        });
      }
    }
  }
  return out;
}
