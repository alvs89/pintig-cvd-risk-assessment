// Isolated component verification only; this entry is not imported by the application.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import "../../../src/styles.css";
import "../../../src/styles/cif.css";
import { CumulativeIncidencePanel } from "../../../src/components/CumulativeIncidencePanel";
import type {
  CumulativeIncidenceOutput,
  ModelPredictionContext,
} from "../../../src/types/cif";
import { band } from "../../../src/utils/risk";

const context: ModelPredictionContext = {
  source: "competing-risk-rsf",
  patientId: 1,
  modelVersion: "UNIT-TEST-RSF",
  outcome: {
    id: "TEST-FIRST-MAJOR-CVD",
    label: "First major cardiovascular event",
    definition: "Isolated test endpoint; not a clinical model.",
    kind: "first-major-cvd",
    eventCode: "CVD",
    competingEventCode: "NON-CVD-DEATH",
  },
};
const cif: CumulativeIncidenceOutput = {
  patientId: 1,
  modelVersion: context.modelVersion,
  outcomeId: context.outcome.id,
  eventCode: "CVD",
  probabilityUnit: "fraction",
  timeUnit: "years",
  supportedUntil: 10,
  times: [0, 1, 5, 6, 7, 8, 10],
  probabilities: [0, 0.005, 0.033, 0.043, 0.05, 0.062, 0.081],
};
function Harness() {
  const scenario = new URLSearchParams(location.search).get("case");
  const [loading, setLoading] = useState(scenario === "loading");
  const data =
    scenario === "missing"
      ? undefined
      : scenario === "invalid"
        ? { ...cif, probabilities: [NaN] }
        : scenario === "wrong-event"
          ? { ...cif, eventCode: "NON-CVD-DEATH" }
          : cif;
  return (
    <main className="maincontent">
      <p>Isolated test fixture — not a patient prediction.</p>
      <h1>Assessment Result</h1>
      <div className="panel">
        <p>
          Ten-year estimate: <strong>8.1%</strong>
        </p>
        <span data-testid="risk-category">{band(0.081)}</span>
      </div>
      {loading && (
        <button type="button" onClick={() => setLoading(false)}>
          Complete loading
        </button>
      )}
      <CumulativeIncidencePanel
        risk={0.081}
        patientId={1}
        predictionContext={context}
        cif={data}
        loading={loading}
      />
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
