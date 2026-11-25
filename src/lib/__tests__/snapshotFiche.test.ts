import { describe, expect, it } from "vitest";
import { TEST_DAYS, checkSnapshotForm, readVo2max, snapshotConfidence, snapshotProtocolQuality, snapshotReadiness, writeVo2max } from "@/lib/snapshotTestDays";

const confirmedCp = JSON.stringify({ cycling: { status: "confirmed", critical: 250, reserve: 18000, efforts: [], warnings: [] } });

describe("fiche athlète : un seul endroit par valeur", () => {
  it("chaque champ n'apparaît que dans un bloc", () => {
    const keys = TEST_DAYS.flatMap(d => d.fields.map(f => f.key));
    expect(new Set(keys).size).toBe(keys.length);
    expect(TEST_DAYS.map(d => d.title)).toEqual(["Contexte", "Vélo", "Course", "Natation", "Labo"]);
    expect(keys).toContain("fc_repos");
  });
});

describe("contrôles", () => {
  it("FC repos ≥ FC max est refusée", () => {
    expect(checkSnapshotForm({ date: "2026-11-24", fc_repos: "190", fc_max: "185" }).errors).toContain("FC repos supérieure ou égale à la FC max.");
    expect(checkSnapshotForm({ date: "2026-11-24", fc_repos: "50", fc_max: "185" }).errors).toEqual([]);
  });
});

describe("ce que la fiche permet de calculer", () => {
  it("la CP confirmée dans Repères critiques est reconnue", () => {
    expect(snapshotReadiness({ critical_metrics: confirmedCp }).find(r => r.label.startsWith("Puissance critique"))?.ready).toBe(true);
    expect(snapshotReadiness({}).find(r => r.label.startsWith("Puissance critique"))?.ready).toBe(false);
  });
});

describe("VO₂max et sa provenance", () => {
  it("une VO₂max de montre n'est jamais écrite dans la colonne utilisée par les calculs", () => {
    const out = writeVo2max({ ftp: { source: "cp_test" } }, 52, "watch", "2026-11-24");
    expect(out.vo2max).toBeNull();
    expect((out.field_sources.vo2max_watch as { value: number }).value).toBe(52);
    expect((out.field_sources.ftp as { source: string }).source).toBe("cp_test");
    expect(readVo2max({ vo2max: null, field_sources: out.field_sources })).toEqual({ value: 52, origin: "watch" });
  });
  it("labo ou estimation : valeur gardée avec sa provenance", () => {
    const out = writeVo2max({}, 46, "estimated", "2026-11-24");
    expect(out.vo2max).toBe(46);
    expect(readVo2max({ vo2max: 46, field_sources: out.field_sources })).toEqual({ value: 46, origin: "estimated" });
  });
});

describe("champs calculés", () => {
  it("fiabilité : rien de documenté → null ; repères testés → 0,3 + 0,1 par repère, plafond 0,9", () => {
    expect(snapshotConfidence({})).toBeNull();
    expect(snapshotConfidence({ vma: "15", critical_metrics: confirmedCp })).toBe(0.5);
  });
  it("qualité du protocole : 4 dès qu'un seuil vient d'un test", () => {
    expect(snapshotProtocolQuality({})).toBe(3);
    expect(snapshotProtocolQuality({ ftp_origin: "cp_test" })).toBe(4);
    expect(snapshotProtocolQuality({ protocol_quality: "5", critical_metrics: confirmedCp })).toBe(5);
  });
});

describe("TTE et seuil auquel elle a été tenue", () => {
  it("tenue à plus de 5 % de la FTP : gardée à part, hors calculs", async () => {
    const { writeTte, readTte } = await import("@/lib/snapshotTestDays");
    const out = writeTte({}, { ftp: "188", tte_observed_min: "19", tte_ref_w: "205" }, "2026-11-25");
    expect(out.tte_observed_min).toBeNull();
    expect(readTte({ tte_observed_min: null, field_sources: out.field_sources }).bike).toMatchObject({ value: 19, ref: 205, stale: true, threshold: 188 });
    expect(checkSnapshotForm({ date: "2026-11-25", ftp: "188", tte_observed_min: "19", tte_ref_w: "205" }).warnings[0]).toContain("À refaire au bon seuil");
  });
  it("tenue au seuil (± 5 %) ou intensité non précisée : utilisée normalement", async () => {
    const { writeTte } = await import("@/lib/snapshotTestDays");
    expect(writeTte({}, { ftp: "188", tte_observed_min: "19", tte_ref_w: "190" }, "2026-11-25").tte_observed_min).toBe(19);
    expect(writeTte({}, { ftp: "188", tte_observed_min: "19" }, "2026-11-25").tte_observed_min).toBe(19);
  });
});
