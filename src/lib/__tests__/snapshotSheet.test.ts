import { describe, expect, it } from "vitest";
import { buildSnapshotSheet, sheetHeadline } from "@/lib/snapshotSheet";

const snap = {
  date: "2026-11-12", source: "track_day", weight_kg: 58, fc_max: 186, fc_repos: 49,
  ftp: 188, map5min_w: 230, vma: 13, pace_threshold_sec_per_km: 305, css: 110, vo2max: null,
  field_sources: { pace_threshold_sec_per_km: { source: "track_day_cs" }, vo2max_watch: { source: "watch", value: 52 } },
  critical_metrics: { cycling: { status: "confirmed", critical: 195, reserve: 12000, efforts: [], warnings: [] } },
  coach_notes: "",
};

describe("fiche en lecture", () => {
  const blocks = Object.fromEntries(buildSnapshotSheet(snap).map(b => [b.id, b]));
  it("un résumé par bloc, dans l'ordre de la fiche", () => {
    expect(buildSnapshotSheet(snap).map(b => b.id)).toEqual(["ctx", "bike", "run", "swim", "durability", "labo", "notes"]);
    expect(sheetHeadline(snap)).toBe("Bilan du 12/11/2026 · Track Day");
  });
  it("la CP confirmée passe avant la FTP ; la provenance du seuil course est affichée", () => {
    expect(blocks.bike.summary).toBe("CP 195 W (confirmée) · 5 min 230 W");
    expect(blocks.run.rows.find(r => r.label === "Allure seuil")).toEqual({ label: "Allure seuil", value: "5:05/km", source: "Track Day" });
    expect(blocks.swim.summary).toBe("CSS 1:50/100 m");
  });
  it("une VO₂max de montre est signalée hors calculs ; un bloc vide est « À compléter »", () => {
    expect(blocks.labo.summary).toBe("VO₂max 52 (montre, hors calculs)");
    expect(blocks.durability.summary).toBe("À compléter");
    expect(blocks.notes.rows).toEqual([]);
  });
});
