import { describe, expect, it } from "vitest";
import { formatSLRepairDiagnostic } from "../slRepairDiagnostics";

describe("diagnostic SL : informations réelles, pas des placeholders trompeurs", () => {
  it("affiche le jour conservé, les candidats réellement comptés et les exclusions", () => {
    const message = formatSLRepairDiagnostic("sl_upgrade_unresolved", "critical", {
      weekNumber: 1, sport: "bike", floorMin: 120,
      before: { day: "samedi", title: "Force SFR", details: "5x5 min force", durationMin: 80 },
      sameSportCandidatesInChunk: 37, totalCandidatesInChunk: 130,
      nearestCandidates: [{ id: "LONG_BIKE_EASY", durationMedian: 135, deltaMin: 15 }],
      diagnostics: { localRejections: { "intent:force->endurance_fondamentale": 37 }, globalRejections: {} },
    });
    expect(message).toContain("W1 samedi");
    expect(message).toContain("37/130");
    expect(message).toContain("LONG_BIKE_EASY(135min");
    expect(message).toContain("intent:force->endurance_fondamentale");
    expect(message).not.toContain("?/?");
    expect(message).not.toContain("nearest=[aucun]");
  });
  it("ancien serveur : distingue donnée non transmise et pool réellement vide", () => {
    const message = formatSLRepairDiagnostic("sl_upgrade_unresolved", "critical", { weekNumber: 9,
      before: { day: "samedi", title: "Séance", durationMin: 60 } });
    expect(message).toContain("comptage non transmis");
    expect(message).not.toContain("Séance");
    expect(message).toContain("nearest=[non transmis");
  });
});
