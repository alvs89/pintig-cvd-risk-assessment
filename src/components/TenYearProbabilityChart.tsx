import { useId } from "react";

/** Visualizes the existing scalar estimate only; never constructs a survival curve. */
export function TenYearProbabilityChart({ risk }: { risk: number }) {
  const id = useId();
  if (!Number.isFinite(risk) || risk < 0 || risk > 1) return null;
  const percent = risk * 100;
  const label = `${percent.toFixed(1)}% estimated ten-year probability`;
  return (
    <figure className="ten-year-chart" aria-labelledby={id}>
      <figcaption id={id}>Ten-year probability overview</figcaption>
      <div
        className="ten-year-chart-ring"
        role="img"
        aria-label={label}
        style={{
          background: `conic-gradient(#087d81 0% ${percent}%, #e2e8f0 ${percent}% 100%)`,
        }}
      >
        <div>
          <strong>{percent.toFixed(1)}%</strong>
          <span>Ten-year estimate</span>
        </div>
      </div>
      <p>
        The highlighted portion represents the displayed ten-year estimate on a
        0–100% scale.
      </p>
    </figure>
  );
}
