import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LabSessionReview } from "../charts/LabSessionReview";
import { readNolio } from "../charts/LabPeriodComparison";
vi.mock("../charts/LabPeriodComparison", () => ({ readNolio: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it("opens actual measured laps and requires choosing the post-bike run", async () => {
  vi.mocked(readNolio).mockImplementation(async (body) =>
    body.action === "test_sessions"
      ? {
          complete: true,
          sessions: [
            {
              id: "b",
              name: "Long vélo",
              date: "2026-09-01T10:00:00Z",
              sportBase: "cycling",
            },
            {
              id: "r",
              name: "Transition",
              date: "2026-09-01T12:30:00Z",
              sportBase: "running",
            },
            {
              id: "earlier",
              name: "Footing du matin",
              date: "2026-09-01T08:00:00Z",
              sportBase: "running",
            },
          ],
        }
      : {
          laps:
            body.training === "b"
              ? [
                  {
                    duration: 600,
                    stats: {
                      watts_avg: { value: 250 },
                      heartrate_avg: { value: 141 },
                    },
                  },
                  {
                    duration: 600,
                    stats: {
                      watts_avg: { value: 250 },
                      heartrate_avg: { value: 148 },
                    },
                  },
                ]
              : [{ duration: 270, distance: 1000 }],
        },
  );
  render(
    <LabSessionReview
      athlete="a"
      sport="bike"
      goal="703"
      tri
      raw={null}
      from="2026-09-01"
      to="2026-09-30"
    />,
  );
  fireEvent.click(screen.getByText("Examiner les séances de la période"));
  fireEvent.change(await screen.findByLabelText("Séance vélo"), {
    target: { value: "b" },
  });
  expect(await screen.findByText(/141 → 148 bpm/)).toBeVisible();
  expect(screen.queryByRole("option", { name: /Footing du matin/ })).toBeNull();
  expect(
    vi.mocked(readNolio).mock.calls.some(([x]) => x.training === "r"),
  ).toBe(false);
  fireEvent.change(screen.getByLabelText(/Course effectivement enchaînée/), {
    target: { value: "r" },
  });
  expect(await screen.findByText(/Tour unique · 4:30\/km/)).toBeVisible();
});
