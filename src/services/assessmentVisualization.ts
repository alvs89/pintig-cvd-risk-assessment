import type { Factor, RiskBand } from "../types/domain";
import { band } from "../utils/risk";

export interface VisualFactor {
  name: string;
  points: number;
  widthPercent: number;
  direction: "positive" | "negative";
}
export type AssessmentVisualizationData =
  | { status: "unavailable"; reason: string }
  | {
      status: "ready";
      percent: number;
      remainderPercent: number;
      category: RiskBand;
      factors: VisualFactor[];
    };

/** Visualization only: never predicts, interpolates, modifies, or infers event probabilities. */
export function assessmentVisualizationData(
  risk: unknown,
  category: unknown,
  parts?: readonly Factor[],
): AssessmentVisualizationData {
  if (
    typeof risk !== "number" ||
    !Number.isFinite(risk) ||
    risk < 0 ||
    risk > 1
  )
    return { status: "unavailable", reason: "No valid estimate is available for charting." };
  if (category !== band(risk))
    return { status: "unavailable", reason: "The estimate and risk category do not match." };

  const validParts = (parts ?? [])
    .filter(
      (factor): factor is Factor =>
        Array.isArray(factor) &&
        factor.length === 2 &&
        typeof factor[0] === "string" &&
        factor[0].trim().length > 0 &&
        typeof factor[1] === "number" &&
        Number.isFinite(factor[1]),
    )
    .filter(([, points]) => points !== 0)
    .slice(0, 8);
  const maxAbs = Math.max(0, ...validParts.map(([, points]) => Math.abs(points)));
  return {
    status: "ready",
    percent: risk * 100,
    remainderPercent: (1 - risk) * 100,
    category: band(risk),
    factors: validParts.map(([name, points]) => ({
      name,
      points: points * 100,
      widthPercent: maxAbs > 0 ? (Math.abs(points) / maxAbs) * 48 : 0,
      direction: points > 0 ? "positive" : "negative",
    })),
  };
}
