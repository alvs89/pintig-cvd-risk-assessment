import { useId, useMemo, useState, useLayoutEffect, useRef } from "react";
import { referenceMarker, validateCif } from "../services/cif";
import type {
  CumulativeIncidenceOutput,
  ModelPredictionContext,
  ReferenceProbability,
} from "../types/cif";

interface Props {
  risk: number;
  patientId: number;
  cif?: CumulativeIncidenceOutput;
  predictionContext?: ModelPredictionContext;
  storedModelVersion?: string;
  loading?: boolean;
  /** Normal assessment views omit unavailable/loading panels; diagnostics retain them. */
  compatibleOnly?: boolean;
}
const percent = (probability: number) =>
  new Intl.NumberFormat("en-PH", { maximumFractionDigits: 6 }).format(
    probability * 100,
  ) + "%";
const axisPercent = (probability: number) =>
  new Intl.NumberFormat("en-PH", { maximumFractionDigits: 1 }).format(
    probability * 100,
  ) + "%";
const title =
  "Estimated Cumulative Probability of First Major CVD Event Over 10 Years";

/** An interpretation layer for supplied model output, never a prediction generator. */
export function CumulativeIncidencePanel({
  risk,
  patientId,
  cif,
  predictionContext,
  storedModelVersion,
  loading = false,
  compatibleOnly = false,
}: Props) {
  const id = useId();
  const [reference, setReference] = useState<ReferenceProbability>(0.05);
  const [inspectionYear, setInspectionYear] = useState(10);
  const plotRef = useRef<SVGSVGElement>(null);
  const [plotWidth, setPlotWidth] = useState(640);
  const validated = useMemo(
    () =>
      validateCif(cif, predictionContext, patientId, risk, storedModelVersion),
    [cif, predictionContext, patientId, risk, storedModelVersion],
  );
  useLayoutEffect(() => {
    const plot = plotRef.current;
    if (!plot) return;
    const update = () => setPlotWidth(Math.max(1, plot.clientWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(plot);
    return () => observer.disconnect();
  }, [validated.status, loading, compatibleOnly]);
  if (compatibleOnly && (loading || validated.status !== "ready")) return null;
  if (loading)
    return (
      <section
        className="panel cif-panel"
        aria-labelledby={id + "-title"}
        aria-busy="true"
      >
        <h2 id={id + "-title"}>{title}</h2>
        <p role="status">Loading cumulative probability…</p>
      </section>
    );
  if (validated.status === "unavailable")
    return (
      <section className="panel cif-panel" aria-labelledby={id + "-title"}>
        <h2 id={id + "-title"}>{title}</h2>
        <div className="cif-empty" role="status">
          <strong>Cumulative probability curve unavailable</strong>
          <p>
            {validated.reason === "missing"
              ? "No cumulative probability curve is available for this assessment."
              : "The cumulative probability curve could not be verified for this assessment."}{" "}
            The ten-year estimate above remains unchanged.
          </p>
        </div>
      </section>
    );

  const marker = referenceMarker(validated.annual, reference);
  const inspected =
    validated.annual.find((point) => point.year === inspectionYear) ??
    validated.annual[validated.annual.length - 1];
  // Axis headroom depends only on supplied probabilities, never an unreached reference.
  const ceiling = Math.min(
    1,
    Math.max(0.01, validated.tenYearProbability * 1.18),
  );
  const x = (year: number) => year * 64;
  const radius = (pixels: number) => (pixels * 640) / plotWidth;
  const y = (probability: number) => 252 - (probability / ceiling) * 244;
  const path = validated.points
    .map((point, index) =>
      index === 0
        ? `M ${x(point.year)} ${y(point.probability)}`
        : `H ${x(point.year)} V ${y(point.probability)}`,
    )
    .join(" ");
  const markerStatus = marker
    ? `${percent(reference)} cumulative probability first reached by Year ${marker.year}.`
    : "Reference level not reached within the 10-year prediction horizon.";
  return (
    <section className="panel cif-panel" aria-labelledby={id + "-title"}>
      <div className="cif-heading">
        <h2 id={id + "-title"}>{title}</h2>
        <p className="cif-endpoint">{validated.outcomeLabel}</p>
      </div>
      <div className="cif-controls">
        <div className="cif-control">
          <label htmlFor={id + "-reference"}>
            Cumulative probability reference
          </label>
          <select
            id={id + "-reference"}
            value={reference}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (value === 0.05 || value === 0.1 || value === 0.2)
                setReference(value);
            }}
            aria-describedby={id + "-reference-help"}
          >
            <option value={0.05}>5%</option>
            <option value={0.1}>10%</option>
            <option value={0.2}>20%</option>
          </select>
        </div>
        <div className="cif-control">
          <label htmlFor={id + "-inspection"}>Inspect a supported year</label>
          <select
            id={id + "-inspection"}
            value={inspected.year}
            onChange={(event) => setInspectionYear(Number(event.target.value))}
          >
            {validated.annual.map((point) => (
              <option key={point.year} value={point.year}>
                Year {point.year}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p id={id + "-reference-help"} className="cif-help">
        These percentages match PINTIG’s provisional ten-year cutoffs
        numerically. Selecting a reference does not change the ten-year risk
        category.
      </p>
      <div
        className="cif-marker-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <strong>{markerStatus}</strong>
        <p>
          {marker
            ? `The estimated cumulative probability first reaches ${percent(reference)} by Year ${marker.year}. This is a reference point on the prediction curve, not the expected year of a cardiovascular event.`
            : `The estimated cumulative probability does not reach ${percent(reference)} within the ten-year prediction horizon.`}
        </p>
      </div>
      <p className="cif-axis-title">
        Estimated Cumulative Event Probability (%)
      </p>
      <div className="cif-plot-grid">
        <div className="cif-y-scale" aria-hidden="true">
          {[1, 0.75, 0.5, 0.25, 0].map((fraction) => (
            <span key={fraction}>{axisPercent(ceiling * fraction)}</span>
          ))}
        </div>
        <svg
          ref={plotRef}
          className="cif-svg"
          viewBox="0 0 640 260"
          preserveAspectRatio="none"
          role="img"
          aria-labelledby={id + "-svg-title " + id + "-svg-description"}
        >
          <title id={id + "-svg-title"}>
            Ten-year cumulative probability curve
          </title>
          <desc id={id + "-svg-description"}>
            Step curve for {validated.outcomeLabel}. Ten-year probability:{" "}
            {percent(validated.tenYearProbability)}. {markerStatus} Use the
            supported-year selector or the data table to inspect values.
          </desc>
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
            <line
              key={fraction}
              x1="0"
              x2="640"
              y1={y(ceiling * fraction)}
              y2={y(ceiling * fraction)}
              className="cif-gridline"
            />
          ))}
          <path
            d={path}
            className="cif-curve"
            vectorEffect="non-scaling-stroke"
          />
          {validated.annual.map((point) => (
            <ellipse
              key={point.year}
              cx={x(point.year)}
              cy={y(point.probability)}
              rx={radius(3)}
              ry="3"
              className="cif-point"
            />
          ))}
          {marker && (
            <g data-cif-marker-year={marker.year}>
              <line
                x1="0"
                x2="640"
                y1={y(reference)}
                y2={y(reference)}
                className="cif-reference-line"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={`M ${x(marker.year)} ${y(marker.probability) - 8} l ${radius(8)} 8 l ${-radius(8)} 8 l ${-radius(8)} -8 Z`}
                className="cif-marker"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}
          <ellipse
            cx={x(inspected.year)}
            cy={y(inspected.probability)}
            rx={radius(6)}
            ry="6"
            className="cif-inspected-point"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div />
        <div className="cif-x-scale" aria-hidden="true">
          {Array.from({ length: 11 }, (_, year) => (
            <span key={year}>{year}</span>
          ))}
        </div>
      </div>
      <p className="cif-x-title">Years Since Assessment (0–10)</p>
      <div className="cif-readouts">
        <p>
          <strong>Ten-year estimate</strong>
          <span>{percent(validated.tenYearProbability)}</span>
        </p>
        <output aria-live="polite" aria-atomic="true">
          <strong>Year {inspected.year}</strong>
          <span>{percent(inspected.probability)} cumulative probability</span>
        </output>
      </div>
      <p className="cif-explanation">
        The graph shows how the estimated cumulative probability of experiencing
        a first major cardiovascular event develops over ten years, based on the
        information recorded during this assessment.
      </p>
      <details className="cif-details">
        <summary>View supported annual values and interpretation</summary>
        <p>
          Reference markers identify the first supported annual horizon meeting
          the selected probability. They do not predict an event date or a
          change in risk category, and do not set treatment or reassessment
          schedules. Values use the last model estimate at or before each year,
          without interpolation. Comparisons use unrounded probabilities.
        </p>
        <p>
          <strong>Outcome definition:</strong> {validated.outcomeDefinition}
        </p>
        <div className="tablewrap">
          <table>
            <caption>Supported annual cumulative probabilities</caption>
            <thead>
              <tr>
                <th scope="col">Years since assessment</th>
                <th scope="col">Cumulative probability</th>
              </tr>
            </thead>
            <tbody>
              {validated.annual.map((point) => (
                <tr key={point.year}>
                  <th scope="row">Year {point.year}</th>
                  <td>{percent(point.probability)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
