import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { CoachingCompassInput } from "@/lib/coachingCompass/types";
import { FieldDecisionReview } from "../FieldDecisionReview";
import { FieldHoldForm } from "../FieldHoldForm";
const cloud = vi.hoisted(() => ({
  tests: [] as {
    id: string;
    athlete_id: string;
    type: string;
    sport: string;
    date: string;
    raw: Record<string, string>;
  }[],
  addTest: vi.fn(),
}));
vi.mock("@/contexts/CloudDataContext", () => ({
  useCloudDataContext: () => cloud,
}));
const input = {
  athleteId: "athlete-a",
  objectif: "Marathon",
  ambition: "competitor",
  sportFocus: "run",
  paceThresholdSecPerKm: 270,
  limiterResult: {
    primaryLimiter: "none",
    limiterLabel: "VLamax · hypothèse à vérifier",
    confidence: 0,
    gapAnalysis: [],
  },
} as CoachingCompassInput;
afterEach(cleanup);
beforeEach(() => {
  cloud.tests = [];
  cloud.addTest.mockReset().mockResolvedValue({ id: "record" });
});
it("saves the athlete, threshold identity, pace in seconds, reason for stopping and actual date", async () => {
  render(<FieldHoldForm athleteId="athlete-a" initialSport="run" pace={270} />);
  fireEvent.click(
    screen.getByText("Documenter un effort continu déjà réalisé"),
  );
  fireEvent.change(screen.getByLabelText(/séance distincte/), {
    target: { value: "2025-03-01" },
  });
  fireEvent.change(screen.getByLabelText("Date de l’effort"), {
    target: { value: "2025-03-18" },
  });
  fireEvent.change(screen.getByLabelText(/Allure tenue/), {
    target: { value: "4:25" },
  });
  fireEvent.change(screen.getByLabelText(/Durée continue/), {
    target: { value: "25" },
  });
  fireEvent.change(screen.getByLabelText(/Conditions \(/), {
    target: { value: "Piste sèche à frais" },
  });
  fireEvent.change(screen.getByLabelText(/Fin du bloc/), {
    target: { value: "cap" },
  });
  const save = screen.getByRole("button", { name: "Enregistrer l’effort" });
  expect(save).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(save);
  await waitFor(() =>
    expect(cloud.addTest).toHaveBeenCalledWith(
      "athlete-a",
      "tfcl-continuous-hold-v1",
      expect.any(String),
      "run",
      null,
      null,
      expect.objectContaining({
        day: "2025-03-18",
        reference: 270,
        referenceDate: "2025-03-01",
        intensity: 265,
        minutes: 25,
        exhausted: false,
      }),
    ),
  );
});
it("records the original decision and accepts a contradictory dated follow-up only after baseline", async () => {
  const view = render(<FieldDecisionReview input={input} snapshotId="s" />);
  fireEvent.click(
    screen.getByText("Vérifier une priorité sur une prochaine séance"),
  );
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Allure sur le dernier bloc à effort comparable." },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Figer la décision et le critère" }),
  );
  await waitFor(() =>
    expect(cloud.addTest).toHaveBeenCalledWith(
      "athlete-a",
      "tfcl-priority-review-v1",
      expect.any(String),
      "run",
      null,
      null,
      expect.objectContaining({
        snapshotId: "s",
        objective: "Marathon",
        threshold: "4:30/km",
      }),
    ),
  );
  cloud.tests = [
    {
      id: "record",
      athlete_id: "athlete-a",
      date: "2025-03-20",
      sport: "run",
      type: "tfcl-priority-review-v1",
      raw: { headline: "VLamax", criterion: "Dernier bloc" },
    },
    {
      id: "other",
      athlete_id: "athlete-b",
      date: "2025-03-19",
      sport: "run",
      type: "tfcl-priority-review-v1",
      raw: { objective: "Privé" },
    },
  ];
  view.rerender(<FieldDecisionReview input={input} snapshotId="s" />);
  expect(screen.queryByText(/Privé/)).toBeNull();
  fireEvent.change(screen.getByLabelText(/Référence de la séance/), {
    target: { value: "Tour 4, allure 4:30/km, même piste et météo." },
  });
  fireEvent.change(screen.getByLabelText(/Lecture par rapport/), {
    target: { value: "Contradictoire" },
  });
  const followup = screen.getByRole("button", {
    name: "Enregistrer l’observation",
  });
  fireEvent.change(screen.getByLabelText(/Date de la séance suivante/), {
    target: { value: "2025-03-20" },
  });
  expect(followup).toBeDisabled();
  fireEvent.change(screen.getByLabelText(/Date de la séance suivante/), {
    target: { value: "2025-03-25" },
  });
  fireEvent.click(followup);
  await waitFor(() =>
    expect(cloud.addTest).toHaveBeenCalledWith(
      "athlete-a",
      "tfcl-priority-followup-v1",
      expect.any(String),
      "run",
      null,
      null,
      expect.objectContaining({
        baselineId: "record",
        performedOn: "2025-03-25",
        verdict: "Contradictoire",
      }),
    ),
  );
});
