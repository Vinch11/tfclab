import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ObservedFactors, MeasureStatus } from "../ObservedFactors";
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

describe("Qualité de la mesure et prochaine étape", () => {
  it("mesure fiable : badge sans liste de réserves", () => {
    render(<MeasureStatus r={row({ reliability: { level: "ok", notes: [] } })} />);
    expect(screen.getByText("Mesure fiable")).toBeVisible();
    expect(screen.queryByRole("list")).toBeNull();
  });
  it("mesure à revoir : réserves listées en clair", () => {
    render(<MeasureStatus r={row({ reliability: { level: "review", notes: ["Efforts de plus de 42 jours : à refaire."] } })} />);
    expect(screen.getByText("Mesure à revoir")).toBeVisible();
    expect(screen.getByText("Efforts de plus de 42 jours : à refaire.")).toBeVisible();
  });
  it("mesure absente : le lien mène à la page de tests", () => {
    render(<ObservedFactors title="t" rows={[row({ value: null, state: "missing", caption: undefined, action: { label: "Programmer les 3 efforts dans Nolio", href: "/diagnostic/tests?module=cs-run" } })]} />);
    expect(screen.getByRole("link", { name: "Programmer les 3 efforts dans Nolio" })).toHaveAttribute("href", "/diagnostic/tests?module=cs-run");
  });
  it("sans fiabilité ni action, rien n'est rendu", () => {
    const { container } = render(<MeasureStatus r={row({ reliability: undefined, action: undefined })} />);
    expect(container).toBeEmptyDOMElement();
  });
});
