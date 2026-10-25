import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LimiterHierarchyEditor } from "../LimiterHierarchyEditor";
import type { UnifiedGapAnalysis } from "@/lib/v2/unifiedLimiterDetection";

const gaps: UnifiedGapAnalysis[] = [
  { metric: "VO2max", value: 40, target: 50, gap: -10, gapPercent: -20, status: "limiting", weight: 0.5, weightedImpact: 10 },
  { metric: "TTE", value: 35, target: 50, gap: -15, gapPercent: -30, status: "limiting", weight: 0.2, weightedImpact: 6 },
];
const props = { gaps, confidence: 0.7, limiterLabel: "Synthetic", limiterExplanation: "Fixture", leverEmoji: "", leverLabel: "", primaryLimiter: "", onOrderChange: vi.fn() };

describe("coach hierarchy on saved plan recovery", () => {
  it("shows restored coach order, and returns to scientific default on athlete reset", () => {
    const view = render(<LimiterHierarchyEditor {...props} orderedMetrics={["TTE", "VO2max"]} />);
    const text = () => view.container.textContent!;
    expect(text().indexOf("TTE")).toBeLessThan(text().indexOf("VO2max"));
    expect(screen.getByText("Ordre modifié par le coach")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Réinitialiser/ }));
    expect(props.onOrderChange).toHaveBeenCalledWith([]);
    view.rerender(<LimiterHierarchyEditor {...props} orderedMetrics={[]} />);
    expect(text().indexOf("VO2max")).toBeLessThan(text().indexOf("TTE"));
    expect(screen.queryByText("Ordre modifié par le coach")).not.toBeInTheDocument();
    view.unmount();
  });
});
