import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ObservedFactors } from "../ObservedFactors";
import type { FactorRow } from "@/lib/coachingCompass/factorStates";

afterEach(cleanup);
const row = (over: Partial<FactorRow>): FactorRow => ({ key: "cs", label: "Vitesse critique (CS)", unit: "km/h", value: 16.2, zone: null, tier: "observed", state: "none",
  basis: "Ajustement d'efforts maximaux.", evidence: ["cs-mlss-2021"], engineNote: null, caption: "Estimation non confirmée", ...over });

describe("Mesures observées", () => {
  it("affiche valeur, statut, étiquette « sans cible » et source, sans classement", () => {
    render(<ObservedFactors title="Seuil critique et durabilité · Course à pied" rows={[row({})]} />);
    expect(screen.getByRole("region", { name: "Seuil critique et durabilité · Course à pied" })).toBeVisible();
    expect(screen.getByText("Vitesse critique (CS)")).toBeVisible();
    expect(screen.getByText("16,2")).toBeVisible();
    expect(screen.getByText("Estimation non confirmée")).toBeVisible();
    expect(screen.getByText(/sans cible publiée ni classement/)).toBeVisible();
    expect(screen.getByRole("link", { name: /MLSS/ })).toHaveAttribute("href", expect.stringContaining("PMC8505327"));
  });
  it("une mesure absente est dite « À mesurer »", () => {
    render(<ObservedFactors title="t" rows={[row({ key: "durability", label: "Durabilité (sorties longues)", unit: "%", value: null, state: "missing", caption: undefined })]} />);
    expect(screen.getByText("À mesurer")).toBeVisible();
    expect(screen.getByText("Données insuffisantes")).toBeVisible();
  });
  it("sans ligne, rien n'est rendu", () => {
    const { container } = render(<ObservedFactors title="t" rows={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
