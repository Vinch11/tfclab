import { describe, it, expect } from "vitest";
import {
  mergeTestingWeekSnapshots,
  buildConsolidatedSnapshotPayload,
} from "../testingWeekSnapshotMerge";
import type { DbSnapshot } from "@/hooks/useCloudData";

/**
 * Fix "consolider les résultats de la semaine de test en un seul snapshot"
 * (demande coach, suite à l'audit sur les 3 parcours qui écrivent aujourd'hui
 * de façon hétérogène — vélo/course/natation peuvent finir sur 1, 2 ou 3
 * lignes distinctes selon l'ordre des tests). Ces tests vérifient la règle
 * de fusion "dernière valeur mesurée gagne, par champ" — jamais un mélange
 * ou une moyenne.
 */
function snap(overrides: Partial<DbSnapshot>): DbSnapshot {
  return {
    id: overrides.id ?? "id-default",
    athlete_id: "ath-1",
    coach_id: "coach-1",
    date: "2026-09-01",
    source: "manual",
    created_at: "2026-09-01T10:00:00Z",
    ...overrides,
  };
}

describe("mergeTestingWeekSnapshots", () => {
  it("ne prend que les snapshots de l'athlète demandé, à partir de la date de campagne", () => {
    const snapshots: DbSnapshot[] = [
      snap({ id: "other-athlete", athlete_id: "ath-2", date: "2026-09-10", ftp: 300 }),
      snap({ id: "too-old", date: "2026-08-01", ftp: 250 }),
      snap({ id: "in-range", date: "2026-09-05", ftp: 280 }),
    ];
    const merged = mergeTestingWeekSnapshots("ath-1", snapshots, "2026-09-01");
    expect(merged.fields.ftp).toBe(280);
    expect(merged.contributingSnapshots.map((s) => s.id)).toEqual(["in-range"]);
  });

  it("retient la valeur du snapshot le plus récent par champ (jamais un mélange)", () => {
    const snapshots: DbSnapshot[] = [
      snap({ id: "bike-d1", date: "2026-09-02", p30s_w: 900, fc_max: 185 }),
      snap({ id: "swim", date: "2026-09-03", css: 95, weight_kg: 72 }),
      // Bike D5 arrive après le swim, mais ne touche pas fc_max — sa valeur (D1) doit rester.
      snap({ id: "bike-d5", date: "2026-09-06", ftp: 285, tte_observed_min: 42 }),
    ];
    const merged = mergeTestingWeekSnapshots("ath-1", snapshots, "2026-09-01");
    expect(merged.fields).toMatchObject({
      p30s_w: 900,
      fc_max: 185,
      css: 95,
      weight_kg: 72,
      ftp: 285,
      tte_observed_min: 42,
    });
  });

  it("écrase une valeur plus ancienne par une valeur plus récente pour le MÊME champ", () => {
    const snapshots: DbSnapshot[] = [
      snap({ id: "old-css", date: "2026-09-02", css: 100 }),
      snap({ id: "new-css", date: "2026-09-08", css: 92 }),
    ];
    const merged = mergeTestingWeekSnapshots("ath-1", snapshots, "2026-09-01");
    expect(merged.fields.css).toBe(92);
    expect(merged.fieldOrigins.css).toEqual({ date: "2026-09-08", source: "manual" });
  });

  it("départage par created_at quand deux snapshots ont la même date", () => {
    const snapshots: DbSnapshot[] = [
      snap({ id: "first", date: "2026-09-05", created_at: "2026-09-05T08:00:00Z", ftp: 270 }),
      snap({ id: "second", date: "2026-09-05", created_at: "2026-09-05T18:00:00Z", ftp: 275 }),
    ];
    const merged = mergeTestingWeekSnapshots("ath-1", snapshots, "2026-09-01");
    expect(merged.fields.ftp).toBe(275);
  });

  it("ignore les snapshots qui ne renseignent aucun champ suivi (jamais listés comme contributeurs)", () => {
    const snapshots: DbSnapshot[] = [
      snap({ id: "empty", date: "2026-09-04" }),
      snap({ id: "useful", date: "2026-09-05", vma: 17 }),
    ];
    const merged = mergeTestingWeekSnapshots("ath-1", snapshots, "2026-09-01");
    expect(merged.contributingSnapshots.map((s) => s.id)).toEqual(["useful"]);
  });

  it("aucun snapshot dans la fenêtre → fields et contributingSnapshots vides", () => {
    const merged = mergeTestingWeekSnapshots("ath-1", [], "2026-09-01");
    expect(merged.fields).toEqual({});
    expect(merged.contributingSnapshots).toEqual([]);
  });
});

describe("buildConsolidatedSnapshotPayload", () => {
  it("assemble un payload avec source dédiée et coach_notes listant les sources d'origine", () => {
    const snapshots: DbSnapshot[] = [
      snap({ id: "bike", date: "2026-09-02", source: "tfcl_testing_week", ftp: 280 }),
      snap({ id: "swim", date: "2026-09-03", source: "swim_pool_day", css: 95 }),
    ];
    const merged = mergeTestingWeekSnapshots("ath-1", snapshots, "2026-09-01");
    const payload = buildConsolidatedSnapshotPayload(merged, "2026-09-10");

    expect(payload.athlete_id).toBe("ath-1");
    expect(payload.date).toBe("2026-09-10");
    expect(payload.source).toBe("testing_week_consolidated");
    expect(payload.ftp).toBe(280);
    expect(payload.css).toBe(95);
    expect(payload.coach_notes).toContain("tfcl_testing_week (2026-09-02)");
    expect(payload.coach_notes).toContain("swim_pool_day (2026-09-03)");
  });

  it("sans aucun contributeur, produit un coach_notes générique et aucun champ mesuré", () => {
    const merged = mergeTestingWeekSnapshots("ath-1", [], "2026-09-01");
    const payload = buildConsolidatedSnapshotPayload(merged, "2026-09-10");
    expect(payload.coach_notes).toBe("Snapshot consolidé — semaine de test complète.");
    expect(payload.ftp).toBeUndefined();
  });
});
