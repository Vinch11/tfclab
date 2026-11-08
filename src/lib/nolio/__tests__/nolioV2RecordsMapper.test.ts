/**
 * Records Nolio V2 → candidats snapshot : mapping pur, aucun réseau.
 * Couvre les 3 pièges identifiés dans l'audit (provenance, unités, plausibilité).
 */
import { describe, it, expect } from "vitest";
import { mapRecordsToSnapshotCandidates } from "../../../../supabase/functions/_shared/nolioV2/recordsMapper";
import type { RawMetricsRecord } from "../../../../supabase/functions/_shared/nolioV2/recordsClient";

const rec = (over: Partial<RawMetricsRecord>): RawMetricsRecord => ({
  value: 0, unit: "W", date: "2026-10-15", cat: "ppr", record_type: "time", inner_val: 0,
  source: "activity", training_id: "trn_x", training_name: "Sortie vélo", sport_id: "spt_bike", sport_name: "Vélo - Route",
  ...over,
});

describe("mapRecordsToSnapshotCandidates — vélo", () => {
  it("extrait pmax_5s/p30s_w/map5min_w en watts, ignore les autres unités", () => {
    const records = [
      rec({ value: 950, unit: "W", inner_val: 5 }),
      rec({ value: 320, unit: "W", inner_val: 30 }),
      rec({ value: 260, unit: "W", inner_val: 300 }),
      rec({ value: 45, unit: "km/h", inner_val: 30 }), // même fenêtre, mauvaise unité : jamais mélangé
    ];
    const { candidates } = mapRecordsToSnapshotCandidates(records);
    expect(candidates.find((c) => c.field === "pmax_5s")?.value).toBe(950);
    const p30 = candidates.find((c) => c.field === "p30s_w");
    expect(p30?.value).toBe(320);
    expect(p30?.unit).toBe("W");
    expect(candidates.find((c) => c.field === "map5min_w")?.value).toBe(260);
  });

  it("préfère P30' direct à P20'×0.95 pour l'estimation FTP, et le signale dans le libellé", () => {
    const records = [rec({ value: 280, unit: "W", inner_val: 1200 }), rec({ value: 250, unit: "W", inner_val: 1800 })];
    const { candidates } = mapRecordsToSnapshotCandidates(records);
    const ftp = candidates.find((c) => c.field === "ftp_estimated");
    expect(ftp?.value).toBe(250);
    expect(ftp?.label).toMatch(/directe/);
  });

  it("retombe sur P20'×0.95 si seule la fenêtre 20 min est disponible", () => {
    const records = [rec({ value: 280, unit: "W", inner_val: 1200 })];
    const { candidates } = mapRecordsToSnapshotCandidates(records);
    const ftp = candidates.find((c) => c.field === "ftp_estimated");
    expect(ftp?.value).toBe(Math.round(280 * 0.95));
  });

  it("rejette un pic de puissance invraisemblable (ratio FTP connu) au lieu de l'exposer en candidat", () => {
    const records = [rec({ value: 1900, unit: "W", inner_val: 5 })]; // ratio 9.5x un FTP de 200W
    const { candidates, warnings } = mapRecordsToSnapshotCandidates(records, { knownFtp: 200 });
    expect(candidates.find((c) => c.field === "pmax_5s")).toBeUndefined();
    expect(warnings.some((w) => w.reason === "pmax_5s_implausible")).toBe(true);
  });
});

describe("mapRecordsToSnapshotCandidates — course, conversion d'unité explicite", () => {
  const base = { cat: "par" as const, record_type: "distance" as const, sport_id: "spt_run", sport_name: "Course à pied" };

  it("convertit correctement un record en km/h", () => {
    // 10 km à 15 km/h → 2400 s
    const records = [rec({ ...base, value: 15, unit: "km/h", inner_val: 10000 })];
    const { candidates } = mapRecordsToSnapshotCandidates(records);
    expect(candidates.find((c) => c.field === "time_10k_sec")?.value).toBe(2400);
  });

  it("convertit correctement un record en m/s, sans le confondre avec du km/h", () => {
    // 5 km à 4.5 m/s → 1111.11 s (très différent de si on l'avait traité comme km/h)
    const records = [rec({ ...base, value: 4.5, unit: "m/s", inner_val: 5000 })];
    const { candidates } = mapRecordsToSnapshotCandidates(records);
    expect(candidates.find((c) => c.field === "time_5k_sec")?.value).toBe(Math.round(5000 / 4.5));
  });

  it("convertit correctement une allure en s/km", () => {
    // 10 km à 240 s/km → 2400 s
    const records = [rec({ ...base, value: 240, unit: "/km", inner_val: 10000 })];
    const { candidates } = mapRecordsToSnapshotCandidates(records);
    expect(candidates.find((c) => c.field === "time_10k_sec")?.value).toBe(2400);
  });

  it("n'invente jamais de valeur pour une unité non reconnue — avertissement, pas de candidat", () => {
    const records = [rec({ ...base, value: 240, unit: "mph", inner_val: 10000 })];
    const { candidates, warnings } = mapRecordsToSnapshotCandidates(records);
    expect(candidates.find((c) => c.field === "time_10k_sec")).toBeUndefined();
    expect(warnings.some((w) => w.reason === "time_10k_sec_unit_unrecognized")).toBe(true);
  });

  it("rejette un temps hors plage physiologique plausible", () => {
    // 10 km à 400 km/h → quelques secondes, non plausible
    const records = [rec({ ...base, value: 400, unit: "km/h", inner_val: 10000 })];
    const { candidates, warnings } = mapRecordsToSnapshotCandidates(records);
    expect(candidates.find((c) => c.field === "time_10k_sec")).toBeUndefined();
    expect(warnings.some((w) => w.reason === "time_10k_sec_implausible")).toBe(true);
  });
});

describe("mapRecordsToSnapshotCandidates — natation (CSS)", () => {
  const base = { cat: "par" as const, sport_id: "spt_swim", sport_name: "Natation" };

  it("calcule le CSS depuis une fenêtre plausible et choisit la meilleure parmi plusieurs", () => {
    // 1.2 m/s → 83.3 s/100m (plausible) ; 400m à 1.3 m/s → 76.9 s/100m (plausible, meilleur)
    const records = [
      rec({ ...base, record_type: "distance", value: 1.2, unit: "m/s", inner_val: 1500 }),
      rec({ ...base, record_type: "distance", value: 1.3, unit: "m/s", inner_val: 400 }),
    ];
    const { candidates } = mapRecordsToSnapshotCandidates(records);
    const css = candidates.find((c) => c.field === "css");
    expect(css?.value).toBeCloseTo(100 / 1.3, 1);
  });

  it("rejette un CSS hors plage piscine plausible [70,180] s/100m", () => {
    // 5 m/s → 20 s/100m, non plausible pour un humain
    const records = [rec({ ...base, record_type: "distance", value: 5, unit: "m/s", inner_val: 400 })];
    const { candidates, warnings } = mapRecordsToSnapshotCandidates(records);
    expect(candidates.find((c) => c.field === "css")).toBeUndefined();
    expect(warnings.some((w) => w.reason === "css_implausible")).toBe(true);
  });
});

describe("mapRecordsToSnapshotCandidates — FC max", () => {
  it("retient le max plausible sur fenêtre ≥5 min, ignore les fenêtres courtes et les valeurs hors plage", () => {
    const records = [
      rec({ cat: "phrr", record_type: "time", value: 250, unit: "bpm", inner_val: 60 }), // fenêtre trop courte
      rec({ cat: "phrr", record_type: "time", value: 300, unit: "bpm", inner_val: 600 }), // implausible
      rec({ cat: "phrr", record_type: "time", value: 188, unit: "bpm", inner_val: 900 }),
    ];
    const { candidates } = mapRecordsToSnapshotCandidates(records);
    expect(candidates.find((c) => c.field === "fc_max")?.value).toBe(188);
  });
});

describe("mapRecordsToSnapshotCandidates — provenance", () => {
  it("chaque candidat garde sa date, son entraînement et sa source Nolio, jamais une confiance implicite", () => {
    const records = [rec({ value: 950, unit: "W", inner_val: 5, date: "2026-10-03", training_name: "Test PMA", source: "manual" })];
    const { candidates } = mapRecordsToSnapshotCandidates(records);
    const c = candidates.find((x) => x.field === "pmax_5s")!;
    expect(c.date).toBe("2026-10-03");
    expect(c.trainingName).toBe("Test PMA");
    expect(c.source).toBe("manual");
    expect(c.rawValue).toBe(950);
    expect(c.rawUnit).toBe("W");
  });
});
