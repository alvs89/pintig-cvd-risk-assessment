export const SCREENING_VERSION: string;
export const WARNING_SIGNS: readonly (readonly [string, string])[];
export const EVENT_HISTORY: readonly (readonly [string, string])[];
export const SCREENING_KEYS: readonly string[];
export interface ScreeningAttestation {
  version: string;
  answers: Record<string, string>;
}
export interface ScreeningDecision {
  status:
    | "warning"
    | "history"
    | "age"
    | "uncertain"
    | "unverified"
    | "incomplete"
    | "eligible";
  title: string;
  message: string;
}
export function screeningDecision(
  answers: unknown,
  years: number,
): ScreeningDecision;
export function validScreeningAttestation(
  screening: unknown,
  years: number,
): boolean;
