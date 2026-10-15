/// <reference types="vite/client" />
import { useEffect, useMemo, useState } from "react";
import type { Patient, Result } from "../types/domain";
import {
  RESEARCH_CIG_ENDPOINT,
  researchInputsFor,
  verifyResearchCif,
  type ResearchCif,
} from "../services/researchCig";

interface Props {
  patient: Patient;
  result: Result;
}
const percent = (x: number) => (x * 100).toFixed(2) + "%";
type RemoteState =
  | { kind: "loading" }
  | { kind: "ready"; data: ResearchCif }
  | { kind: "unavailable"; reason: string };

export function ResearchCigPanel({ patient, result }: Props) {
  const [version, setVersion] = useState(0);
  const [reference, setReference] = useState(0.05);
  const [year, setYear] = useState(10);
  const [response, setResponse] = useState<{
    assessment: Result;
    key: string;
    version: number;
    state: RemoteState;
  } | null>(null);
  const localDevelopment =
    import.meta.env?.DEV === true &&
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");
  const observed = researchInputsFor(patient, result);
  const signature = JSON.stringify([patient.id, observed]);
  const request = useMemo(() => observed, [signature]);
  const remote: RemoteState =
    response?.assessment === result &&
    response.key === signature &&
    response.version === version
      ? response.state
      : { kind: "loading" };

  useEffect(() => {
    if (!localDevelopment || !request) return;
    const controller = new AbortController();
    const update = (state: RemoteState) =>
      setResponse({
        assessment: result,
        key: signature,
        version,
        state,
      });
    const unavailable: RemoteState = {
      kind: "unavailable",
      reason:
        "The cumulative probability graph could not be generated. Please try again or contact the system administrator.",
    };
    const timeout = setTimeout(() => {
      update(unavailable);
      controller.abort();
    }, 50000);
    update({ kind: "loading" });
    fetch(RESEARCH_CIG_ENDPOINT, {
      method: "POST",
      mode: "cors",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Pintig-Research": "fictional-local-only",
      },
      body: JSON.stringify({ fictionalOnly: true, predictors: request }),
    })
      .then(async (response) => {
        if (!response.ok) throw Error("Local research model unavailable");
        return response.json();
      })
      .then((json: unknown) => {
        if (controller.signal.aborted) return;
        const verified = verifyResearchCif(json);
        if (!verified) throw Error("Research model response failed CIF checks");
        update({ kind: "ready", data: verified });
      })
      .catch(() => {
        if (!controller.signal.aborted) update(unavailable);
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [localDevelopment, request, version, result, signature]);

  if (!localDevelopment || !observed) return null;

  const chart = remote.kind === "ready" ? remote.data : null;
  const reaching = chart?.annual.find(
    (point) => point.probability >= reference,
  );
  const current = chart?.annual[year - 1];
  const ceiling = chart
    ? Math.min(
        1,
        Math.max(0.025, Math.ceil((chart.risk * 1.18) / 0.025) * 0.025),
      )
    : 0.2;
  const x = (time: number) => 47 + time * 64;
  const y = (p: number) => 238 - (p / ceiling) * 218;
  const curve = chart
    ? chart.points
        .map((point, index) =>
          index === 0
            ? "M " + x(point.year) + " " + y(point.probability)
            : "H " + x(point.year) + " V " + y(point.probability),
        )
        .join(" ")
    : "";

  return (
    <section
      className="panel research-cig"
      aria-labelledby="research-cig-heading"
    >
      <div className="research-cig-heading">
        <div>
          <div className="eyebrow">Research use only · fictional patients</div>
          <h2 id="research-cig-heading">
            Research Cumulative Incidence Graph (CIG)
          </h2>
          <p className="research-cig-subtitle">
            Framingham-recorded CVD over ten years, accounting for death before
            CVD. This differs from the intended PURE Philippines outcome.
          </p>
        </div>
        <button
          className="btn"
          type="button"
          onClick={() => setVersion((v) => v + 1)}
          disabled={remote.kind === "loading"}
        >
          Refresh research CIG
        </button>
      </div>
      <div className="research-cig-warning" role="note">
        <strong>Research use only — not clinically validated.</strong>
        This Framingham model does not replace the illustrative assessment
        estimate. Do not use this graph to make care, medication, or referral
        decisions.
      </div>
      {remote.kind === "loading" && (
        <p role="status" aria-live="polite">
          Generating research graph…
        </p>
      )}
      {remote.kind === "unavailable" && (
        <div className="research-cig-empty" role="status">
          <strong>Research graph unavailable</strong>
          <p>{remote.reason}</p>
        </div>
      )}
      {chart && (
        <>
          <div className="research-cig-toolbar">
            <div className="research-cig-metric">
              <small>Model-derived 10-year recorded-CVD probability</small>
              <strong data-testid="research-cig-risk">
                {percent(chart.risk)}
              </strong>
            </div>
            <label>
              Probability reference
              <select
                value={reference}
                onChange={(e) => setReference(Number(e.target.value))}
              >
                <option value={0.05}>5%</option>
                <option value={0.1}>10%</option>
                <option value={0.2}>20%</option>
              </select>
            </label>
            <label>
              Inspect year
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {chart.annual.map((p) => (
                  <option key={p.year} value={p.year}>
                    Year {p.year}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p
            className="research-cig-reference"
            role="status"
            aria-live="polite"
          >
            {reaching
              ? "Selected reference first reached by the annual Year " +
                reaching.year +
                "."
              : "Selected reference not reached by Year 10."}{" "}
            This is a model-curve reference, not the predicted date of a
            cardiovascular event.
          </p>
          <div className="research-cig-graph">
            <div className="research-cig-axis">
              Recorded-CVD cumulative incidence (%)
            </div>
            <svg
              viewBox="0 0 710 280"
              className="research-cig-svg"
              role="img"
              aria-label={
                "Research model-generated ten-year step curve ending at " +
                percent(chart.risk) +
                "; inspected Year " +
                year +
                " " +
                percent(current!.probability)
              }
            >
              {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
                <g key={fraction}>
                  <line
                    x1="47"
                    x2="687"
                    y1={y(ceiling * fraction)}
                    y2={y(ceiling * fraction)}
                    className="research-gridline"
                  />
                  <text
                    x="41"
                    y={y(ceiling * fraction) + 4}
                    textAnchor="end"
                    className="research-axis-text"
                  >
                    {percent(ceiling * fraction)}
                  </text>
                </g>
              ))}
              {Array.from({ length: 6 }, (_, i) => i * 2).map((yr) => (
                <text
                  key={yr}
                  x={x(yr)}
                  y="266"
                  textAnchor="middle"
                  className="research-axis-text"
                >
                  {yr}
                </text>
              ))}
              <path d={curve} className="research-cif-curve" />
              {reaching && (
                <line
                  x1="47"
                  x2="687"
                  y1={y(reference)}
                  y2={y(reference)}
                  className="research-reference-line"
                />
              )}
              <line
                x1={x(year)}
                x2={x(year)}
                y1={y(current!.probability)}
                y2="238"
                className="research-inspection-line"
              />
              <circle
                cx={x(year)}
                cy={y(current!.probability)}
                r="6"
                className="research-inspection-dot"
              />
            </svg>
            <div className="research-cig-inspection">
              Year {year}: <strong>{percent(current!.probability)}</strong>{" "}
              cumulative probability
            </div>
            <p className="research-cig-caption">
              Years since assessment (0–10). The curve shows the cumulative
              probability of the Framingham-recorded outcome.
            </p>
          </div>
          <details className="research-cig-details">
            <summary>View original model-derived annual probabilities</summary>
            <div className="tablewrap">
              <table>
                <caption>
                  Fictional assessment · Research model cumulative incidence
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Year</th>
                    <th scope="col">CIF</th>
                  </tr>
                </thead>
                <tbody>
                  {chart.annual.map((point) => (
                    <tr key={point.year}>
                      <th scope="row">Year {point.year}</th>
                      <td>{percent(point.probability)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
      <p className="research-cig-footer">
        Provisional Framingham competing-risk Random Survival Forest. For
        fictional assessments only.
      </p>
    </section>
  );
}
