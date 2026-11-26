import { describe, expect, it } from "vitest";
import { buildRaceCard, raceKindFromObjective, standaloneRun, bikeWhatIf, runWhatIf, type RaceCardAthlete } from "@/lib/raceSimulation/raceCard";
import { raceOptions, simulationHiddenFor, simulationUnavailable } from "@/lib/raceSimulation/raceCardData";
import { compareResult, parseRaceTime, snapshotPrediction, withRaceResult, readRaceResults } from "@/lib/raceSimulation/raceResults";
import { buildRaceCardHTML } from "@/lib/raceSimulation/buildRaceCardHTML";
import { buildTargetTable } from "@/lib/plan/targetTable";

const emanuela: RaceCardAthlete = {
  ambition: "competitor", weightKg: 52, ftpW: 188, cssSecPer100: 110, vo2max: 48, tteBikeMin: null, fcMax: 192,
  snapshot: { date: "2026-11-25", ftp: 188, vma: 13, pace_threshold_sec_per_km: 305, fc_max: 192, fc_repos: 58, weight_kg: 52 },
};

describe("objectifs reconnus", () => {
  it("10K, 5K, StartToRun et Trail ne tombent plus sur un Ironman", () => {
    expect(raceKindFromObjective("10K").kind).toBe("10K");
    expect(raceKindFromObjective("Semi").kind).toBe("Semi");
    expect(raceKindFromObjective("703").kind).toBe("703");
    expect(raceKindFromObjective("IRONMAN 70.3").kind).toBe("703");
    expect(raceKindFromObjective("Ironman").kind).toBe("IM");
    expect(raceKindFromObjective("5K")).toEqual({ kind: null, reason: "not_needed" });
    expect(raceKindFromObjective("StartToRun")).toEqual({ kind: null, reason: "not_needed" });
    expect(raceKindFromObjective("TrailUltra")).toEqual({ kind: null, reason: "trail" });
    expect(simulationHiddenFor("5K")).toBe(true);
    expect(simulationHiddenFor("Marathon")).toBe(false);
  });
  it("liste les courses à venir de l'athlète, puis l'objectif principal", () => {
    const opts = raceOptions({ goal: "IM" }, [
      { id: "g2", race_type: "IM", race_name: "Sables", race_date: "2027-06-27", race_format: null },
      { id: "g1", race_type: "Marathon", race_name: "Valence", race_date: "2027-02-28", race_format: null },
      { id: "old", race_type: "Semi", race_name: null, race_date: "2025-01-01", race_format: null },
    ], "2026-11-26");
    expect(opts.map(o => o.label)).toEqual(["Valence · 28/02/2027", "Sables · 27/06/2027"]);
    expect(simulationUnavailable({ goal: "StartToRun" }, [])).toBe("not_needed");
    expect(simulationUnavailable({ goal: "Trail" }, [])).toBe("trail");
  });
});

describe("course seule calée sur Smyth et Muniz-Pumares 2020", () => {
  it("≈ 93 % de la CS pour 2 h 30, ≈ 85 % pour 4 h, ≈ 80 % pour 6 h", () => {
    const at = (amb: string, minutes: number) => { const cs = 42.195 / (minutes / 60); let lo = cs * 0.7, hi = cs * 1.3;
      for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; standaloneRun(42.195, mid, amb).timeMin > minutes ? lo = mid : hi = mid; }
      return standaloneRun(42.195, (lo + hi) / 2, amb).fraction; };
    expect(at("competitor", 150)).toBeGreaterThan(0.91); expect(at("competitor", 150)).toBeLessThan(0.95);
    expect(at("age_group", 240)).toBeGreaterThan(0.83); expect(at("age_group", 240)).toBeLessThan(0.88);
    expect(at("finisher", 360)).toBeGreaterThan(0.77); expect(at("finisher", 360)).toBeLessThan(0.83);
  });
  it("un marathon seul est plus rapide qu'un marathon d'Ironman", () => {
    const solo = buildRaceCard({ kind: "Marathon", athlete: emanuela, today: "2026-11-26" }).segments.find(s => s.sport === "run")!;
    const im = buildRaceCard({ kind: "IM", athlete: emanuela, today: "2026-11-26" }).segments.find(s => s.sport === "run")!;
    expect(solo.timeMin!).toBeLessThan(im.timeMin! - 15);
    expect(solo.timeMin!).toBeGreaterThan(220); expect(solo.timeMin!).toBeLessThan(250);
  });
});

describe("carte Ironman d'Emanuela", () => {
  const card = buildRaceCard({ kind: "IM", athlete: emanuela, today: "2026-11-26" });
  it("un seul chiffre vélo : le même que la table des zones (plans et rapports)", () => {
    const table = buildTargetTable({ ftp: 188, objective: "IM", ambition: "competitor", weightKg: 52 });
    expect(card.bike!.rangeW).toEqual(table.racePowerRange);
    expect(card.segments.find(s => s.sport === "bike")!.target!.range).toEqual(table.racePowerRange);
  });
  it("segments, total et glucides cohérents", () => {
    expect(card.segments.map(s => s.sport)).toEqual(["swim", "t1", "bike", "t2", "run"]);
    const sum = card.segments.reduce((a, s) => a + (s.timeMin ?? 0), 0);
    expect(card.totalMin).toBeCloseTo(sum, 5);
    expect(card.totalRange![0]).toBeLessThan(card.totalMin!); expect(card.totalRange![1]).toBeGreaterThan(card.totalMin!);
    // Sans VLamax ni tolérance : repère général par durée.
    expect(card.segments.find(s => s.sport === "bike")!.carbs!.gh).toEqual([75, 90]);
    expect(card.segments.find(s => s.sport === "run")!.carbs!.gh[1]).toBeLessThanOrEqual(60);
    expect(card.fuel.method).toBe("guideline");
    expect(card.missing.map(m => m.label)).toEqual(["Glucides tolérés à l'entraînement", "Taux de sueur testé"]);
  });
  it("curseurs : +10 W fait gagner du temps mais sort de la charge visée", () => {
    const w = bikeWhatIf(card, 10, 52)!;
    expect(w.deltaMin).toBeLessThan(0);
    expect(["risky", "high"]).toContain(w.verdict);
    expect(bikeWhatIf(card, 0, 52)!.deltaMin).toBeCloseTo(0, 5);
    expect(runWhatIf(card, 0)!.deltaMin).toBeCloseTo(0, 5);
  });
});

describe("pas de valeurs inventées", () => {
  it("données manquantes listées avec le bloc de la fiche, total partiel", () => {
    const card = buildRaceCard({ kind: "IM", athlete: { ...emanuela, ambition: null, cssSecPer100: null, weightKg: null, snapshot: { ...emanuela.snapshot!, weight_kg: null } } });
    expect(card.missing.map(m => m.block)).toEqual(["athlete", "swim", "ctx", "ctx", "ctx"]);
    expect(card.partial).toBe(true);
    expect(card.segments[0].confidence).toBe("missing");
  });
  it("sans seuil ni VMA : pas d'allure de course", () => {
    const card = buildRaceCard({ kind: "10K", athlete: { ...emanuela, snapshot: { date: "2026-11-25" } } });
    expect(card.segments[0].target).toBeNull();
    expect(card.missing[0].block).toBe("run");
  });
});

describe("Long Course Weekend", () => {
  it("trois épreuves séparées, sans transitions ni total enchaîné", () => {
    const card = buildRaceCard({ kind: "703", lcw: true, athlete: emanuela });
    expect(card.segments.map(s => `${s.day}:${s.sport}`)).toEqual(["1:swim", "2:bike", "3:run"]);
    expect(card.totalMin).toBeNull();
    expect(snapshotPrediction(card).totalMin).toBeGreaterThan(0);
  });
});

describe("prévu / réel", () => {
  it("lit les temps saisis et compare au prévu", () => {
    expect(parseRaceTime("3:58:12")).toBe(14292);
    expect(parseRaceTime("3h58")).toBe(14280);
    expect(parseRaceTime("52:30")).toBe(3150);
    const card = buildRaceCard({ kind: "Marathon", athlete: emanuela });
    const refs = withRaceResult({ ambition: "competitor" }, { raceKey: "goal:x", kind: "Marathon", date: "2027-02-28", savedAt: "", predicted: snapshotPrediction(card), actual: { totalSec: card.totalMin! * 60 * 1.06, runSec: card.totalMin! * 60 * 1.06 } });
    expect((refs as { ambition: string }).ambition).toBe("competitor");
    const { rows, reading } = compareResult(readRaceResults(refs)["goal:x"]);
    expect(rows.find(r => r.label === "Total")!.deltaPct).toBeCloseTo(6, 0);
    expect(reading).toMatch(/Plus lent que prévu de 6/);
  });
});

describe("export athlète", () => {
  it("une page : cibles, règles et zones Garmin", () => {
    const card = buildRaceCard({ kind: "IM", athlete: emanuela });
    const html = buildRaceCardHTML({ card, athleteName: "Emanuela", raceLabel: "Sables · 27/06/2027", athlete: emanuela, generatedAt: "26/11/2026" });
    expect(html).toContain(card.segments.find(s => s.sport === "bike")!.target!.text);
    expect(html).toContain("Les règles du jour");
    expect(html).toContain('data-garmin="bike"');
    expect(html).toContain('data-garmin="run"');
  });
});
