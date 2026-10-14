import type { Factor } from "../types/domain";
export const EXPLANATION_VERSION = "ILLUSTRATIVE-FACTORS-1.0";
export function explainCalculation(parts: Factor[]): string {
  return (
    "Factors used in the estimate: " +
    parts
      .slice(0, 4)
      .map((part) => part[0])
      .join(", ") +
    ". Calculation-based explanation."
  );
}
