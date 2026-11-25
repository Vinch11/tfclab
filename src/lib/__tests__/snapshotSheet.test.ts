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

describe("CS et durabilité visibles", () => {
  it("CS à deux distances du Track Day affichée quand la CS ajustée manque", () => {
    const b = buildSnapshotSheet({ date: "2026-11-12", critical_metrics: { trackDay: { protocol: "1500m_3000m_1000m_cs", csMs: 3.3, dPrimeM: 190 } } }).find(x => x.id === "run")!;
    expect(b.summary).toBe("CS 5:03/km (Track Day)");
    expect(b.rows[0].source).toBe("Track Day 1 500 / 3 000 m, à valider");
  });
  it("Durability Day affiché avec son découplage", () => {
    const b = buildSnapshotSheet({ date: "2026-11-12" }, { durabilityPairs: [{ sport: "run", decouplingPct: 4.2, day: "2026-11-20" }] }).find(x => x.id === "durability")!;
    expect(b.summary).toBe("Course 4,2 %");
  });
});

describe("sexe et âge dans la fiche", () => {
  it("renseignés : « Femme, 41 ans » ; absents : à compléter, repères non ajustés", () => {
    const ok = buildSnapshotSheet({ date: "2026-11-25" }, { athlete: { sex: "F", birthDate: "1985-03-10" } }).find(b => b.id === "ctx")!;
    expect(ok.summary).toBe("Femme, 41 ans");
    const missing = buildSnapshotSheet({ date: "2026-11-25" }, { athlete: { sex: null, birthDate: null } }).find(b => b.id === "ctx")!;
    expect(missing.summary).toBe("Sexe/âge à renseigner");
    expect(missing.rows[0].source).toContain("repères non ajustés");
  });
});

describe("chronos et mesures labo dans la fiche", () => {
  it("chronos de course affichés dans Course, MLSS et lactate dans Labo", () => {
    const blocks = buildSnapshotSheet({ date: "2026-11-25", time_10k_sec: 2850, time_10k_date: "2026-10-12", critical_metrics: { lab: { mlssW: 230, lactateMmol: 3.4 } } });
    const run = blocks.find(b => b.id === "run")!;
    expect(run.rows.find(r => r.label === "Chrono 10 km")).toEqual({ label: "Chrono 10 km", value: "47:30 (4:45/km)", source: "12/10/2026" });
    const labo = blocks.find(b => b.id === "labo")!;
    expect(labo.rows.map(r => r.label)).toEqual(["MLSS mesurée (vélo)", "Lactate au seuil"]);
  });
});
