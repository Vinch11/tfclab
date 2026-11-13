import { describe, it, expect } from "vitest";
import { checkSnapshotForm, snapshotReadiness } from "@/lib/snapshotTestDays";

const base = { date: "2026-11-09" };
describe("vérification du bilan (création et modification)", () => {
  it("bloque une puissance 5 min supérieure à la puissance 60 s", () => {
    expect(checkSnapshotForm({ ...base, p60s_w: "400", map5min_w: "450" }).errors.length).toBe(1);
  });
  it("bloque une allure seuil plus rapide que la VMA", () => {
    // VMA 15 km/h = 4:00/km ; seuil 3:50 impossible
    expect(checkSnapshotForm({ ...base, vma: "15", pace_threshold: "3:50" }).errors).toContain("Course — allure seuil plus rapide que la VMA.");
  });
  it("bloque une durée tenue au seuil course au-delà de 120 min", () => {
    expect(checkSnapshotForm({ ...base, tte_observed_min_run: "150" }).errors.length).toBe(1);
  });
  it("accepte un bilan cohérent", () => {
    expect(checkSnapshotForm({ ...base, pmax_5s: "900", p30s_w: "600", p60s_w: "450", map5min_w: "320", ftp: "260", vma: "17", pace_threshold: "4:10", tte_observed_min_run: "40" }).errors).toEqual([]);
  });
  it("la date est obligatoire", () => {
    expect(checkSnapshotForm({}).errors).toContain("La date du bilan est obligatoire.");
  });
});

describe("ce que le bilan permet de calculer", () => {
  it("CP/W′ exige au moins 2 valeurs parmi 30 s, 60 s, 5 min", () => {
    const one = snapshotReadiness({ p30s_w: "600" }).find((r) => r.label.startsWith("Puissance critique"));
    const two = snapshotReadiness({ p30s_w: "600", map5min_w: "320" }).find((r) => r.label.startsWith("Puissance critique"));
    expect(one?.ready).toBe(false);
    expect(two?.ready).toBe(true);
  });
  it("TTE vélo exige une durée et un seuil sans certifier une durabilité prolongée", () => {
    const r = snapshotReadiness({ tte_observed_min: "45", ftp: '260' });
    expect(r.find((x) => x.label === "Endurance au seuil vélo · TTE")?.ready).toBe(true);
    expect(r.find((x) => x.label === "Endurance au seuil course · TTE")?.ready).toBe(false);
    expect(r.find((x) => x.label === "Durabilité prolongée")?.ready).toBe(false);
  });
});
