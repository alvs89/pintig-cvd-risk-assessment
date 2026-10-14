/** Supplied by a verified, participant-specific competing-risk RSF integration.
 * The frontend never infers R array dimensions, event codes or endpoint mappings.
 */
export interface ModelPredictionContext {
  source: "competing-risk-rsf";
  patientId: number;
  modelVersion: string;
  outcome: {
    id: string;
    label: string;
    definition: string;
    kind: "first-major-cvd";
    eventCode: string;
    competingEventCode: string;
  };
}
export interface CumulativeIncidenceOutput {
  patientId: number;
  modelVersion: string;
  outcomeId: string;
  eventCode: string;
  probabilityUnit: "fraction";
  timeUnit: "years" | "months" | "days";
  /** Required for days; supplied by the model's verified time convention. */
  daysPerYear?: number;
  /** Maximum adequately supported follow-up, in timeUnit. */
  supportedUntil: number;
  times: number[];
  probabilities: number[];
}
export interface CifPoint {
  year: number;
  probability: number;
}
export type CifValidation =
  | {
      status: "unavailable";
      reason:
        | "missing"
        | "identity"
        | "outcome"
        | "units"
        | "values"
        | "times"
        | "decreasing"
        | "horizon"
        | "risk-mismatch";
    }
  | {
      status: "ready";
      points: CifPoint[];
      annual: CifPoint[];
      tenYearProbability: number;
      outcomeLabel: string;
      outcomeDefinition: string;
    };
export type ReferenceProbability = 0.05 | 0.1 | 0.2;
