import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  CoachProfileForm,
  type CoachProfileFormPayload,
} from "../CoachProfileForm";
const metrics = ["VLamax", "FatMax", "VMA", "VO2max", "TTE"];
const prefill = {
  metabolicProfile: "balanced" as const,
  limiterMetrics: metrics,
  primaryLimiterMetric: "VLamax",
  secondaryLimiterMetric: "FatMax",
};
const name = "SYNTHETIC_LIMITER_FORM";
const key = `tfcl:coachProfileForm:${name}`;
afterEach(() => {
  cleanup();
  localStorage.removeItem(key);
});
function draft() {
  localStorage.setItem(
    key,
    JSON.stringify({
      metabolic: "balanced",
      durationMode: "free",
      freeWeeks: "12",
    }),
  );
}
it("the unedited form passes the full automatic list, preserving VMA rather than relabelling it as VO2max", () => {
  draft();
  const callback = vi.fn();
  render(
    <CoachProfileForm
      open
      onOpenChange={() => {}}
      athleteName={name}
      objectiveValue="10K"
      prefill={{
        ...prefill,
        primaryLimiterMetric: "VMA",
        secondaryLimiterMetric: "VLamax",
        limiterMetrics: ["VMA", "VLamax", "FatMax"],
      }}
      onGenerate={callback}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /Générer le plan/i }));
  expect(callback).toHaveBeenCalledOnce();
  const p = callback.mock.calls[0][0] as CoachProfileFormPayload;
  expect(p.limiterOrder).toEqual(["VMA", "VLamax", "FatMax"]);
  expect(p.primaryLimiterMetric).toBe("VMA");
  expect(p.overriddenByCoach).toEqual({ primary: false, secondary: false });
  expect(p.excludedLimiterMetrics).toEqual([]);
});
it("explicit reorder and exclusion survive closing, reopening and a fresh component load", () => {
  draft();
  const saved = vi.fn();
  const props = {
    open: true,
    onOpenChange: () => {},
    athleteName: name,
    objectiveValue: "10K",
    prefill,
    onGenerate: vi.fn(),
    onSubmit: saved,
  };
  const view = render(<CoachProfileForm {...props} />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Inclure FatMax" }));
  fireEvent.click(screen.getByRole("button", { name: "Monter VMA" }));
  fireEvent.click(screen.getByRole("button", { name: "Monter VMA" }));
  fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
  expect(saved.mock.calls[0][0].limiterOrder).toEqual([
    "VMA",
    "VLamax",
    "VO2max",
    "TTE",
  ]);
  expect(saved.mock.calls[0][0].excludedLimiterMetrics).toEqual(["FatMax"]);
  view.rerender(<CoachProfileForm {...props} open={false} />);
  view.rerender(<CoachProfileForm {...props} />);
  expect(screen.getByRole("checkbox", { name: "Inclure FatMax" })).not
    .toBeChecked();
  view.unmount();
  render(<CoachProfileForm {...props} />);
  fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
  expect(saved.mock.calls.at(-1)?.[0].limiterOrder).toEqual([
    "VMA",
    "VLamax",
    "VO2max",
    "TTE",
  ]);
});
it("an old draft containing only the primary choice cannot imply deletion of the automatic secondary and remaining metrics", () => {
  localStorage.setItem(
    key,
    JSON.stringify({
      metabolic: "balanced",
      primary: "glycolytic",
      secondary: "unknown",
      durationMode: "free",
      freeWeeks: "12",
      touchedPrimary: false,
      touchedSecondary: false,
    }),
  );
  const callback = vi.fn();
  render(
    <CoachProfileForm
      open
      onOpenChange={() => {}}
      athleteName={name}
      objectiveValue="10K"
      prefill={prefill}
      onGenerate={callback}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /Générer le plan/i }));
  expect(callback.mock.calls[0][0].limiterOrder).toEqual(metrics);
});
it("excluding every metric cannot start a generation; changing objective does not silently reuse exclusions", () => {
  draft();
  const callback = vi.fn();
  const props = {
    open: true,
    onOpenChange: () => {},
    athleteName: name,
    objectiveValue: "10K",
    prefill,
    onGenerate: callback,
  };
  const view = render(<CoachProfileForm {...props} />);
  for (const metric of metrics) {
    fireEvent.click(
      screen.getByRole("checkbox", { name: `Inclure ${metric}` }),
    );
  }
  expect(screen.getByRole("button", { name: /Générer le plan/i }))
    .toBeDisabled();
  expect(callback).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Conservez au moins un limiteur",
  );
  view.rerender(<CoachProfileForm {...props} objectiveValue="703" />);
  expect(screen.getByRole("checkbox", { name: "Inclure VLamax" }))
    .toBeChecked();
});
