import { useId } from "react";
import { assessmentVisualizationData } from "../services/assessmentVisualization";
import type { Factor, RiskBand } from "../types/domain";

interface Props {
  risk: number;
  category: RiskBand;
  parts: readonly Factor[];
}
const formatted = (value: number) =>
  (value >= 0 ? "+" : "") + value.toFixed(2);

/** Displays existing illustrative arithmetic terms; not RSF feature importance. */
export function AssessmentVisualizations({ risk, category, parts }: Props) {
  const id = useId();
  const data = assessmentVisualizationData(risk, category, parts);
  if (data.status === "unavailable")
    return <p role="status">Calculation chart unavailable: {data.reason}</p>;
  if (!data.factors.length)
    return <p>There are no nonzero calculation factors to chart.</p>;

  return (
    <div className="assessment-visualizations-factor" role="group" aria-labelledby={id}>
      <h3 id={id}>Contribution chart</h3>
      <p className="assessment-visualizations-note">
        Bars show arithmetic contributions from the illustrative calculation in
        percentage points, not RSF explanations or causal effects. The vertical
        middle line represents zero.
      </p>
      <div className="assessment-factor-chart" role="img" aria-label="Signed factor contributions shown as bars, with values listed alongside and in the expandable table">
        {data.factors.map((factor, index) => (
          <div className="assessment-factor-entry" key={index}>
            <div className="assessment-factor-meta">
              <span>{factor.name}</span>
              <strong>{formatted(factor.points)} points</strong>
            </div>
            <div className="assessment-factor-track" aria-hidden="true">
              <span className="assessment-factor-zero" />
              <span
                className={"assessment-factor-bar " + factor.direction}
                style={{
                  width: factor.widthPercent + "%",
                  left: factor.direction === "positive"
                    ? "50%"
                    : 50 - factor.widthPercent + "%",
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="assessment-visualizations-note">
        The baseline and probability limits are not included in these bars.
      </p>
      <details className="assessment-factor-details">
        <summary>View numerical contributions</summary>
        <div className="tablewrap">
          <table>
            <caption>Calculation contributions</caption>
            <thead>
              <tr><th scope="col">Factor</th><th scope="col">Percentage points</th></tr>
            </thead>
            <tbody>
              {data.factors.map((factor, index) => (
                <tr key={index}>
                  <th scope="row">{factor.name}</th>
                  <td>{formatted(factor.points)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
