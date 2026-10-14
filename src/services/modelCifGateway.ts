import type {
  CumulativeIncidenceOutput,
  ModelPredictionContext,
} from "../types/cif";
import { validateCif } from "./cif";

/**
 * Source-controlled release manifest supplied ONLY after model/outcome validation,
 * institutional authorization and server-side approval. An API response cannot
 * authorize itself. This type alone provides no security or clinical assurance.
 */
export interface ModelReleaseManifest {
  releaseId: string;
  modelVersion: string;
  cohortId: string;
  outcome: ModelPredictionContext["outcome"];
  timeUnit: CumulativeIncidenceOutput["timeUnit"];
  daysPerYear?: number;
}

/** Explicitly disabled. Do not replace with provisional Framingham model metadata. */
export const ACTIVE_MODEL_RELEASE: ModelReleaseManifest | null = null;

export interface IntegratedCifPrediction {
  risk: number;
  predictionContext: ModelPredictionContext;
  cif: CumulativeIncidenceOutput;
}
export type ModelCifGatewayResult =
  | { status: "ready"; prediction: IntegratedCifPrediction }
  | {
      status: "unavailable";
      reason:
        | "not-authorized"
        | "invalid-identity"
        | "invalid-release"
        | "invalid-outcome"
        | "invalid-values"
        | "incompatible-cif";
    };

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const nonempty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const disallowed = (text: string) =>
  /^(ILLUSTRATIVE|PROVISIONAL|DEMO|TEST)[-_]/i.test(text);

/**
 * Pure future API boundary. No network requests, patient lookup or inference.
 * The caller supplies a release manifest from a trusted deployment configuration;
 * the default release is disabled while PURE outcome and predictors are pending.
 * Passing a manifest in unit tests is NOT clinical or deployment authorization.
 *
 * The server must perform its own independent patient/session authorization,
 * endpoint verification, follow-up policy and model provenance validation.
 */
export function acceptModelCifResponse(
  payload: unknown,
  expectedPatientId: number,
  manifest: ModelReleaseManifest | null = ACTIVE_MODEL_RELEASE,
): ModelCifGatewayResult {
  if (!manifest)
    return { status: "unavailable", reason: "not-authorized" };

  if (
    !Number.isSafeInteger(expectedPatientId) ||
    expectedPatientId < 1 ||
    !record(payload) ||
    payload.schemaVersion !== "pintig-model-cif-v1" ||
    payload.patientId !== expectedPatientId
  )
    return { status: "unavailable", reason: "invalid-identity" };

  if (
    !nonempty(manifest.releaseId) ||
    !nonempty(manifest.modelVersion) ||
    !nonempty(manifest.cohortId) ||
    disallowed(manifest.modelVersion) ||
    !record(manifest.outcome) ||
    manifest.outcome.kind !== "first-major-cvd" ||
    !nonempty(manifest.outcome.id) ||
    !nonempty(manifest.outcome.label) ||
    !nonempty(manifest.outcome.definition) ||
    !nonempty(manifest.outcome.eventCode) ||
    !nonempty(manifest.outcome.competingEventCode) ||
    manifest.outcome.eventCode === manifest.outcome.competingEventCode ||
    !["days", "months", "years"].includes(manifest.timeUnit) ||
    (manifest.timeUnit === "days" &&
      (!finite(manifest.daysPerYear) || manifest.daysPerYear <= 0)) ||
    (manifest.timeUnit !== "days" && manifest.daysPerYear !== undefined) ||
    payload.modelSource !== "competing-risk-rsf" ||
    payload.releaseId !== manifest.releaseId ||
    payload.modelVersion !== manifest.modelVersion ||
    payload.cohortId !== manifest.cohortId
  )
    return { status: "unavailable", reason: "invalid-release" };

  if (
    payload.outcomeId !== manifest.outcome.id ||
    payload.eventCode !== manifest.outcome.eventCode ||
    payload.competingEventCode !== manifest.outcome.competingEventCode
  )
    return { status: "unavailable", reason: "invalid-outcome" };

  if (
    !finite(payload.risk10) ||
    payload.risk10 < 0 ||
    payload.risk10 > 1 ||
    !record(payload.cif)
  )
    return { status: "unavailable", reason: "invalid-values" };

  const body = payload.cif;
  if (
    body.timeUnit !== manifest.timeUnit ||
    body.probabilityUnit !== "fraction" ||
    (manifest.timeUnit === "days"
      ? body.daysPerYear !== manifest.daysPerYear
      : body.daysPerYear !== undefined) ||
    !finite(body.supportedUntil) ||
    !Array.isArray(body.times) ||
    !Array.isArray(body.probabilities) ||
    body.times.length !== body.probabilities.length ||
    body.times.length === 0 ||
    !body.times.every(finite) ||
    !body.probabilities.every(finite)
  )
    return { status: "unavailable", reason: "invalid-values" };

  const predictionContext: ModelPredictionContext = {
    source: "competing-risk-rsf",
    patientId: expectedPatientId,
    modelVersion: manifest.modelVersion,
    outcome: { ...manifest.outcome },
  };
  const cif: CumulativeIncidenceOutput = {
    patientId: expectedPatientId,
    modelVersion: manifest.modelVersion,
    outcomeId: manifest.outcome.id,
    eventCode: manifest.outcome.eventCode,
    probabilityUnit: "fraction",
    timeUnit: manifest.timeUnit,
    ...(manifest.timeUnit === "days"
      ? { daysPerYear: manifest.daysPerYear }
      : {}),
    supportedUntil: body.supportedUntil,
    times: [...body.times] as number[],
    probabilities: [...body.probabilities] as number[],
  };

  const result = validateCif(
    cif,
    predictionContext,
    expectedPatientId,
    payload.risk10,
    manifest.modelVersion,
  );
  if (result.status !== "ready")
    return { status: "unavailable", reason: "incompatible-cif" };

  return {
    status: "ready",
    prediction: {
      risk: payload.risk10,
      predictionContext,
      cif,
    },
  };
}
