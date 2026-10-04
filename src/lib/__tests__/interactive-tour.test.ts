import { describe, it, expect } from "vitest";
import { TOUR_STEPS } from "@/components/InteractiveTour";

describe("InteractiveTour Diligence Mission Configuration", () => {
  it("should define all 6 institutional diligence phases", () => {
    expect(TOUR_STEPS).toHaveLength(6);
    expect(TOUR_STEPS.map((s) => s.stepNumber)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("should have valid DOM target selectors for all steps", () => {
    TOUR_STEPS.forEach((step) => {
      expect(step.targetSelector).toMatch(/^\[data-tour="[\w-]+"]$/);
      expect(step.objective).toBeTruthy();
      expect(step.counselRationale).toBeTruthy();
      expect(step.autoActionLabel).toBeTruthy();
      expect(step.actionHint).toBeTruthy();
    });
  });

  it("should cover the full diligence lifecycle in correct operational order", () => {
    const ids = TOUR_STEPS.map((s) => s.id);
    expect(ids).toEqual([
      "step-select-doc",
      "step-liability-query",
      "step-inspect-citation",
      "step-risk-audit",
      "step-propose-redline",
      "step-export-memo",
    ]);
  });
});
