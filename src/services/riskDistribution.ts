import type { AssessmentRecord, RiskBand } from "../types/domain";
import { band, RISK_BAND_VERSION } from "../utils/risk";

export const DISTRIBUTION_CATEGORIES: readonly RiskBand[] = [
  "Low",
  "Moderate",
  "High",
  "Very High",
];
type DistributionRecord = Pick<
  AssessmentRecord,
  "risk" | "band" | "riskBandVersion"
>;
/** Missing versions are the retained v27 records, whose boundaries match version 1.
 * Unknown rule versions are excluded, never silently reclassified with today's rules.
 */
export function riskDistribution(records: readonly DistributionRecord[]) {
  const counts: Record<RiskBand, number> = {
    Low: 0,
    Moderate: 0,
    High: 0,
    "Very High": 0,
  };
  let excluded = 0;
  for (const record of records) {
    if (
      !record ||
      typeof record.risk !== "number" ||
      !Number.isFinite(record.risk) ||
      record.risk < 0 ||
      record.risk > 1 ||
      (record.riskBandVersion !== undefined &&
        record.riskBandVersion !== RISK_BAND_VERSION) ||
      !DISTRIBUTION_CATEGORIES.includes(record.band) ||
      band(record.risk) !== record.band
    ) {
      excluded++;
      continue;
    }
    counts[record.band]++;
  }
  const total = records.length - excluded;
  return {
    total,
    excluded,
    categories: DISTRIBUTION_CATEGORIES.map((category) => ({
      category,
      count: counts[category],
      percentage: total ? (counts[category] / total) * 100 : 0,
    })),
  };
}
