import { useId, useState } from "react";
import type { AssessmentRecord, RiskBand } from "../types/domain";
import { riskDistribution } from "../services/riskDistribution";

export function RiskDistributionChart({
  records,
  administrator,
}: {
  records: readonly AssessmentRecord[];
  administrator: boolean;
}) {
  const id = useId();
  const [selected, setSelected] = useState<RiskBand | null>(null);
  const data = riskDistribution(records);
  const detail = data.categories.find((row) => row.category === selected);
  return (
    <section className="panel risk-distribution" aria-labelledby={id}>
      <div className="distribution-heading">
        <h2 id={id}>Cardiovascular Risk Distribution</h2>
        <span>{data.total} saved assessments represented</span>
      </div>
      <p className="distribution-scope">
        {administrator
          ? "Overall accessible assessment records."
          : "Shared assessment records accessible to Healthcare Workers."}{" "}
        Each saved assessment is counted separately, including repeat
        assessments for a patient.
      </p>
      <p id={`${id}-description`} className="distribution-description">
        Counts and percentages use recorded ten-year classifications. Select a
        category to inspect its summary.
      </p>
      {!data.total && (
        <p role="status">
          {records.length
            ? "No compatible saved assessments are available for this chart."
            : "No saved assessments are available. Save an assessment to view its distribution."}
        </p>
      )}
      <div
        className="distribution-rows"
        role="group"
        aria-describedby={`${id}-description`}
        aria-label="Saved assessment risk categories"
      >
        {data.categories.map((row) => (
          <button
            key={row.category}
            type="button"
            className="distribution-row"
            aria-pressed={selected === row.category}
            onClick={() =>
              setSelected(selected === row.category ? null : row.category)
            }
          >
            <span className="distribution-label">{row.category}</span>
            <span>
              {row.count} {row.count === 1 ? "assessment" : "assessments"}
            </span>
            <span className="distribution-percent">
              {row.percentage.toFixed(1)}%
            </span>
            <span className="distribution-track" aria-hidden="true">
              <span style={{ width: `${row.percentage}%` }} />
            </span>
          </button>
        ))}
      </div>
      <p className="distribution-detail" role="status" aria-live="polite">
        {detail
          ? `${detail.category}: ${detail.count} saved ${detail.count === 1 ? "assessment" : "assessments"} (${detail.percentage.toFixed(1)}% of represented assessments).`
          : "All four recorded categories are shown; percentages may not sum to 100% after rounding."}
      </p>
      {!!data.excluded && (
        <p className="distribution-exclusions">
          {data.excluded}{" "}
          {data.excluded === 1 ? "record excluded" : "records excluded"}:
          missing or invalid probability, inconsistent category, or unsupported
          classification version.
        </p>
      )}
      <p className="distribution-note">
        Recorded classifications are research groupings, not diagnoses.
        Illustrative assessments remain illustrative.
      </p>
    </section>
  );
}
