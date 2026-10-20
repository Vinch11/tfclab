import { describe, it, expect } from "vitest";
import { checkB15, checkB15ToValidationIssues } from "../checkB15";
import { deriveRaceTargets } from "@/lib/deriveRaceTargets";
import { getLiteratureHintText } from "@/lib/raceStandards";

/**
 * Correction sprint qualité Marathon/Ironman (oct. 2026), #4 : B15 revérifie
 * APRÈS génération l'écart ambition chronométrique ↔ physiologie actuelle
 * (déjà calculé par `deriveRaceTargets`, déjà affiché en PRÉ-génération par
 * GapAmbitionPanel) — pour qu'il atteigne le coach à chaque génération
 * réelle, pas seulement s'il a consulté ce panneau avant de lancer le plan.
 */
describe("checkB15 — cohérence ambition chronométrique ↔ physiologie (post-génération)", () => {
  it("signale un écart quand l'ambition visée est très au-delà de la physiologie actuelle", () => {
    // VMA 11 km/h (joggeur occasionnel) + ambition "world_class" sur Marathon
    // (standard sub2h35) : écart énorme, bien au-delà du seuil de 8%.
    const result = checkB15({ vmaKmh: 11, objective: "Marathon", ambition: "world_class" });
    expect(result.pass).toBe(false);
    expect(result.id).toBe("B15");
    expect(result.level).toBe("warning");
    expect(result.details[0]).toMatch(/incompatible avec la physiologie actuelle/i);
  });

  it("ne signale rien quand l'ambition visée est cohérente avec la physiologie actuelle", () => {
    // VMA EXACTEMENT requise pour le standard "perf" Marathon (calculée par
    // deriveRaceTargets lui-même, indépendante de la VMA d'entrée) : par
    // construction, écart ≈ 0%, bien sous le seuil de 8%.
    const probe = deriveRaceTargets({
      vmaKmh: 16, objective: "Marathon", ambition: "perf",
      literatureHintText: getLiteratureHintText("Marathon", "perf"),
    });
    expect(probe.vmaRequiredForLiterature).not.toBeNull();
    const coherentVma = probe.vmaRequiredForLiterature!;

    const result = checkB15({ vmaKmh: coherentVma, objective: "Marathon", ambition: "perf" });
    expect(result.pass).toBe(true);
    expect(result.details[0]).toMatch(/sous le seuil de 8%/);
  });

  it("objectif hors périmètre (IM/70.3) : pass=true avec le détail explicite, jamais un signal fabriqué", () => {
    const result = checkB15({ vmaKmh: 11, objective: "IM", ambition: "world_class" });
    expect(result.pass).toBe(true);
    expect(result.details[0]).toMatch(/hors périmètre/i);
  });

  it("VMA et seuil tous deux absents : pass=true, écart non calculable", () => {
    const result = checkB15({ objective: "Marathon", ambition: "perf" });
    expect(result.pass).toBe(true);
    expect(result.details[0]).toMatch(/non calculable/i);
  });

  it("checkB15ToValidationIssues : issue vide quand pass=true", () => {
    const probe = deriveRaceTargets({
      vmaKmh: 16, objective: "Marathon", ambition: "perf",
      literatureHintText: getLiteratureHintText("Marathon", "perf"),
    });
    const result = checkB15({ vmaKmh: probe.vmaRequiredForLiterature!, objective: "Marathon", ambition: "perf" });
    expect(checkB15ToValidationIssues(result)).toHaveLength(0);
  });

  it("checkB15ToValidationIssues : avertissement non bloquant quand pass=false", () => {
    const result = checkB15({ vmaKmh: 11, objective: "Marathon", ambition: "world_class" });
    const issues = checkB15ToValidationIssues(result);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("warning");
    expect(issues[0].rule).toBe("ambition_physiology_gap");
  });
});
