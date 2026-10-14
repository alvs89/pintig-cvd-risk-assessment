import { Fragment } from "react";
import { TenYearProbabilityChart } from "../components/TenYearProbabilityChart";
import { FurtherAssessmentPanel } from "../components/FurtherAssessmentPanel";
import { storedFurtherAssessment } from "../services/furtherAssessment";
import { storedPrototypeFollowUp } from "../services/prototypeFollowUp";
import { ModelStatus } from "../components/ModelStatus";
import { CumulativeIncidencePanel } from "../components/CumulativeIncidencePanel";
import {
  assessmentLabels,
  displayAssessmentValue,
} from "../utils/assessmentLabels";
import {
  htmlAttributes,
  Select,
  styleFromText,
  withKeys,
} from "../components/markup";
import {
  b,
  guidanceHtml,
  head,
  patientIdent,
  recordsTable,
  storedGuidance,
  tag,
} from "../components/shared";
import { P, records, S, U } from "../state/store";
import { dt, esc } from "../utils/format";
export function HistoryPage() {
  const list = records.filter((r) => {
    let p = P(r.pid)!;
    return (
      (p.record + " AST-" + r.id)
        .toLowerCase()
        .includes(S.query.trim().toLowerCase()) &&
      (S.filter === "All" || r.band === S.filter)
    );
  });
  return (
    <>
      {head(
        "Assessment History",
        "Review preserved previous assessment records.",
      )}
      <section className={"panel"}>
        <div
          className={"toolbar pintig-table-filters"}
          role={"search"}
          aria-label={"Filter assessment history"}
        >
          <input
            className={"search"}
            type={"search"}
            id={"historySearch"}
            placeholder={"Patient record or assessment ID"}
            aria-label={"Search assessment history"}
            value={S.query}
            onChange={() => {}}
          />
          <Select
            id={"historyCategory"}
            className={"search"}
            style={styleFromText("max-width:180px")}
            aria-label={"Risk category"}
          >
            {withKeys(
              ["All", "Low", "Moderate", "High", "Very High"].map(
                (a, _index) => (
                  <Fragment key={_index}>
                    <option
                      {...htmlAttributes(S.filter === a ? "selected" : "")}
                    >
                      {a}
                    </option>
                  </Fragment>
                ),
              ),
            )}
          </Select>
          {b("Clear", "clearHistory")}
        </div>
        <div id={"historyLiveResults"} className={"pintig-live-results"}>
          <div className={"pintig-count"}>
            {list.length}
            {" of "}
            {records.length}
            {" assessments"}
          </div>
          {recordsTable(list)}
        </div>
      </section>
    </>
  );
}

export function RecordPage() {
  let r = records.find((x) => x.id === S.historyId);
  if (!r) return <HistoryPage />;
  let p = P(r.pid)!;
  return (
    <>
      {head(
        "Assessment AST-" + String(r.id).padStart(4, "0"),
        p.record + " · Saved assessment",
        b("← History", "nav:Assessment History"),
      )}
      <div className={"identity-context"}>{patientIdent(p)}</div>
      <ModelStatus />
      <div className={"twocol"}>
        <div className={"panel"}>
          <div className={"eyebrow"}>{"Ten-year estimate"}</div>
          <div className={"risk"}>
            {(r.risk * 100).toFixed(1)}
            {"%"}
          </div>
          {tag(r.band)}
          <TenYearProbabilityChart risk={r.risk} />
        </div>
        <div className={"panel"}>
          <h2>{"Assessment details"}</h2>
          <p>
            {"Assessment date: "}
            {dt(r.date)}
            <br />
            {"Assessor: "}
            {esc(U(r.uid)?.name || "Unknown")}
          </p>
        </div>
      </div>
      <CumulativeIncidencePanel
        key={r.id}
        risk={r.risk}
        patientId={r.pid}
        cif={r.cif}
        predictionContext={r.predictionContext}
        storedModelVersion={r.model}
      />
      <FurtherAssessmentPanel
        result={storedFurtherAssessment(
          r.furtherAssessmentGuidance,
          r.risk,
          r.band,
          r.model,
        )}
        prototype={
          r.prototypeFollowUpGuidance
            ? storedPrototypeFollowUp(
                r.prototypeFollowUpGuidance,
                r.risk,
                r.band,
                r.model,
              )
            : undefined
        }
      />
      <div className={"panel"}>
        <h2>{"Recorded assessment information"}</h2>
        <div className={"threecol"}>
          {withKeys(
            Object.entries(r.inputs).map(([key, value], _index) => (
              <Fragment key={_index}>
                <div className={"snapshot"}>
                  <strong>
                    {assessmentLabels[key] ??
                      key.replace(/([a-z])([A-Z])/g, "$1 $2")}
                  </strong>
                  {displayAssessmentValue(key, value, p.record)}
                </div>
              </Fragment>
            )),
          )}
        </div>
        <h3>{"Assessment explanation"}</h3>
        <p>{esc(r.explanation)}</p>
        <h3>{"General Educational Guidance"}</h3>
        {storedGuidance(r).length ? (
          guidanceHtml(storedGuidance(r))
        ) : (
          <>
            <p>{esc(r.guidance)}</p>
          </>
        )}
        <div className={"actions"}>
          {b("Print record", "print")}
          {b("Back", "nav:Assessment History")}
        </div>
      </div>
    </>
  );
}
