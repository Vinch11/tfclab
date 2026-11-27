import { describe, expect, it } from "vitest";
import { buildTargetTable } from "@/lib/plan/targetTable";
import { enrichWithAbsoluteValues } from "@/lib/plan/renderIntensities";

/** Plan d'Emanuela (27/11/2026) : zones de fiche contradictoires, % générique à l'allure Ironman, PDF sans watts. */
const table = buildTargetTable({ ftp: 188, vma: 13, paceThresholdSecPerKm: 305, fcMax: 192, weightKg: 52, objective: "IM", ambition: "competitor", tteMinBike: 43,
  snapshot: { date: "2026-11-25", ftp: 188, vma: 13, pace_threshold_sec_per_km: 305, fc_max: 192, weight_kg: 52 } as never });

describe("séances : zones et watts de l'athlète", () => {
  it("le % prescrit fait foi : l'étiquette de zone est recalée sur la grille de l'athlète", () => {
    const out = enrichWithAbsoluteValues("Main: 2x20min Z4a (95-100% FTP) r=8min Z1.", table, "bike");
    expect(out).toContain("Z4b-Z5 (95-100% FTP (179-188W))");
    expect(out).not.toMatch(/Z4a \(\d/);
  });
  it("une étiquette compatible (à 4 % près) reste inchangée", () => {
    expect(enrichWithAbsoluteValues("270min en Z2 strict (64-68% FTP)", table, "bike")).toContain("Z2 strict (64-68% FTP (120-128W))");
    expect(enrichWithAbsoluteValues("3x25min en Z3/Z4a (78-83% FTP)", table, "bike")).toContain("Z3/Z4a (78-83% FTP (147-156W))");
  });
  it("zone suivie de son % : une seule valeur affichée, celle du %", () => {
    const out = enrichWithAbsoluteValues("6x3 min Z3 (80-85% FTP)", table, "bike");
    expect(out.match(/W\)/g)).toHaveLength(1);
  });
  it("allure de course triathlon = puissance de l'athlète (même source que la simulation)", () => {
    const out = enrichWithAbsoluteValues("3x15min à allure race Ironman (65-68% FTP)", table, "bike");
    expect(out).toContain(`${table.racePowerRange![0]}-${table.racePowerRange![1]}W · ta puissance de course`);
    expect(out).not.toContain("65-68% FTP");
  });
  it("enchaînement : watts pour le vélo, allure pour la course", () => {
    const out = enrichWithAbsoluteValues("Vélo 2h30 Z2 + T2 rapide + Run 30min Z2", table, "brick");
    expect(out).toMatch(/Vélo 2h30 Z2 \(\d+-\d+W\)/);
    expect(out).toMatch(/Run 30min Z2 \(\d:\d\d-\d:\d\d\/km\)/);
  });
  it("sans plage de course (objectif course à pied), le % reste celui de la fiche", () => {
    const marathon = buildTargetTable({ ftp: 188, vma: 13, objective: "Marathon", ambition: "competitor" });
    expect(enrichWithAbsoluteValues("allure race (65-68% FTP)", marathon, "bike")).toContain("65-68% FTP (122-128W)");
  });
  it("zones ouvertes et références de fiche", () => {
    expect(enrichWithAbsoluteValues("Main: 25min Z1 strict", table, "run")).toMatch(/Z1 \(plus lent que \d:\d\d\/km\)/);
    expect(enrichWithAbsoluteValues("Warm-up: 10min Z1", table, "bike")).toContain("Z1 (< 127W)");
    expect(enrichWithAbsoluteValues("Main: 8x200m @ CSS r=20s [ID: B_SWIM_CSS_8x200_PRO]", { ...table, cssSecPer100m: 110 }, "swim"))
      .toContain("[ID: B_SWIM_CSS_8x200_PRO]");
  });
});
