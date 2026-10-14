import type { RiskBand } from "../types/domain";
export const RISK_BAND_VERSION = "PINTIG-BANDS-1.0";
export const band = (risk: number): RiskBand =>
  risk < 0.05
    ? "Low"
    : risk < 0.1
      ? "Moderate"
      : risk < 0.2
        ? "High"
        : "Very High";
