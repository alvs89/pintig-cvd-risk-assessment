import type {
  CifPoint,
  CifValidation,
  CumulativeIncidenceOutput,
  ModelPredictionContext,
  ReferenceProbability,
} from "../types/cif";
import { band } from "../utils/risk";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const nonempty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
export function isModelPredictionContext(
  value: unknown,
  patientId: number,
): value is ModelPredictionContext {
  if (
    !isRecord(value) ||
    value.source !== "competing-risk-rsf" ||
    value.patientId !== patientId ||
    !nonempty(value.modelVersion) ||
    /^ILLUSTRATIVE-/i.test(value.modelVersion) ||
    !isRecord(value.outcome)
  )
    return false;
  const outcome = value.outcome;
  return (
    outcome.kind === "first-major-cvd" &&
    nonempty(outcome.id) &&
    nonempty(outcome.label) &&
    nonempty(outcome.definition) &&
    nonempty(outcome.eventCode) &&
    nonempty(outcome.competingEventCode) &&
    outcome.eventCode !== outcome.competingEventCode
  );
}
const unavailable = (
  reason: Extract<CifValidation, { status: "unavailable" }>["reason"],
): CifValidation => ({ status: "unavailable", reason });

/** Right-continuous evaluation within the supplied grid and supported follow-up only. */
export function probabilityAt(
  points: readonly CifPoint[],
  year: number,
): number | undefined {
  if (
    !finite(year) ||
    !points.length ||
    year < points[0].year ||
    year > points[points.length - 1].year
  )
    return undefined;
  let value: number | undefined;
  for (const point of points) {
    if (point.year > year) break;
    value = point.probability;
  }
  return value;
}

/** Validate metadata and every grid value before exposing a curve or marker.
 * Ten-year risk remains the existing primary output; this function never replaces it.
 */
export function validateCif(
  raw: unknown,
  context: unknown,
  patientId: number,
  risk: number,
  storedModelVersion?: string,
): CifValidation {
  if (raw === undefined || raw === null) return unavailable("missing");
  if (!isRecord(raw) || !isRecord(context)) return unavailable("identity");
  if (
    context.source !== "competing-risk-rsf" ||
    context.patientId !== patientId ||
    raw.patientId !== patientId ||
    !nonempty(context.modelVersion) ||
    raw.modelVersion !== context.modelVersion ||
    /^ILLUSTRATIVE-/i.test(context.modelVersion) ||
    (storedModelVersion !== undefined &&
      storedModelVersion !== context.modelVersion)
  )
    return unavailable("identity");
  const outcome = context.outcome;
  if (
    !isRecord(outcome) ||
    outcome.kind !== "first-major-cvd" ||
    !nonempty(outcome.id) ||
    !nonempty(outcome.label) ||
    !nonempty(outcome.definition) ||
    !nonempty(outcome.eventCode) ||
    !nonempty(outcome.competingEventCode) ||
    outcome.eventCode === outcome.competingEventCode ||
    raw.outcomeId !== outcome.id ||
    raw.eventCode !== outcome.eventCode
  )
    return unavailable("outcome");
  if (
    raw.probabilityUnit !== "fraction" ||
    !["years", "months", "days"].includes(String(raw.timeUnit))
  )
    return unavailable("units");
  let divisor = 1;
  if (raw.timeUnit === "months") divisor = 12;
  if (raw.timeUnit === "days") {
    if (!finite(raw.daysPerYear) || raw.daysPerYear <= 0)
      return unavailable("units");
    divisor = raw.daysPerYear;
  }
  if (
    !finite(risk) ||
    risk < 0 ||
    risk > 1 ||
    !Array.isArray(raw.times) ||
    !Array.isArray(raw.probabilities) ||
    !raw.times.length ||
    raw.times.length !== raw.probabilities.length
  )
    return unavailable("values");
  if (!finite(raw.supportedUntil) || raw.supportedUntil < 0)
    return unavailable("horizon");
  const points: CifPoint[] = [];
  for (let index = 0; index < raw.times.length; index++) {
    const time: unknown = raw.times[index],
      probability: unknown = raw.probabilities[index];
    if (
      !finite(time) ||
      time < 0 ||
      (index > 0 && time <= raw.times[index - 1])
    )
      return unavailable("times");
    if (!finite(probability) || probability < 0 || probability > 1)
      return unavailable("values");
    // Reject decreases rather than silently smoothing or changing model probabilities.
    if (index > 0 && probability < raw.probabilities[index - 1])
      return unavailable("decreasing");
    const year = time / divisor;
    if (!finite(year)) return unavailable("units");
    points.push({ year, probability });
  }
  if (!finite(raw.supportedUntil / divisor)) return unavailable("units");
  const supportedUntil = Math.min(
    raw.supportedUntil / divisor,
    points[points.length - 1].year,
  );
  if (supportedUntil < 10 || points[0].year > 10) return unavailable("horizon");
  const tenYearProbability = probabilityAt(points, 10);
  if (tenYearProbability === undefined) return unavailable("horizon");
  // Only machine-scale discrepancies are tolerated; even those cannot change a band.
  if (
    Math.abs(tenYearProbability - risk) > 1e-12 ||
    band(tenYearProbability) !== band(risk)
  )
    return unavailable("risk-mismatch");
  const annual: CifPoint[] = [];
  for (let year = 1; year <= 10; year++) {
    const probability = probabilityAt(points, year);
    if (probability !== undefined) annual.push({ year, probability });
  }
  const displayed = points.filter((point) => point.year <= 10);
  if (displayed[displayed.length - 1].year !== 10)
    displayed.push({ year: 10, probability: tenYearProbability });
  return {
    status: "ready",
    points: displayed,
    annual,
    tenYearProbability,
    outcomeLabel: outcome.label,
    outcomeDefinition: outcome.definition,
  };
}

/** First supported annual horizon, not an exact event time or continuous crossing. */
export function referenceMarker(
  annual: readonly CifPoint[],
  reference: ReferenceProbability,
): CifPoint | undefined {
  if (![0.05, 0.1, 0.2].includes(reference)) return undefined;
  return annual.find(
    (point) =>
      point.year >= 1 &&
      point.year <= 10 &&
      Number.isInteger(point.year) &&
      finite(point.probability) &&
      point.probability <= 1 &&
      point.probability >= reference,
  );
}

/** Copy original output into a snapshot without recalculating historical curves. */
export function copyCif(
  output: CumulativeIncidenceOutput,
): CumulativeIncidenceOutput {
  return {
    ...output,
    times: [...output.times],
    probabilities: [...output.probabilities],
  };
}
export function copyPredictionContext(
  context: ModelPredictionContext,
): ModelPredictionContext {
  return { ...context, outcome: { ...context.outcome } };
}
