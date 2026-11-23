import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CompassCritical } from "../CompassCritical";
import type { CoachingCompassInput } from "@/lib/coachingCompass/types";

afterEach(cleanup);
const input = (criticalMetrics?: object) => ({ objectif: "IM", ambition: "competitor", criticalMetrics }) as unknown as CoachingCompassInput;
const running = { critical: 3.9, reserve: 190, status: "estimate", latestEffortDate: "2026-10-20", efforts: [], warnings: [] };

describe("Compass : seuil critique", () => {
  it("affiche CS et D′ de la course, sans mélanger le vélo", () => {
    render(<CompassCritical sport="run" input={input({ running })} />);
    expect(screen.getByLabelText("Seuil critique · course")).toBeVisible();
    expect(screen.getByText("Vitesse critique (CS)")).toBeVisible();
    expect(screen.getByText("14 km/h")).toBeVisible();
    expect(screen.getByText("Réserve anaérobie (D′)")).toBeVisible();
    expect(screen.queryByText("Puissance critique (CP)")).toBeNull();
  });
  it("sans mesure : « À mesurer » et le lien vers les 3 efforts", () => {
    render(<CompassCritical sport="bike" input={input()} />);
    expect(screen.getByText("À mesurer")).toBeVisible();
    expect(screen.getByRole("link", { name: /Programmer le Bike Day · Puissance critique/ })).toHaveAttribute("href", "/diagnostic/tests?module=cp-day");
  });
});
