import { Fragment } from "react";
import { htmlAttributes, Select, withKeys } from "../components/markup";
import { b, head, metric, patientIdent, sel } from "../components/shared";
import { reportRows } from "../services/reports";
import { P, patients, records, S } from "../state/store";
import { esc } from "../utils/format";
export function ReportsPage() {
  const rows = reportRows();
  const total = S.report === "Patients" ? patients.length : records.length;
  return (
    <>
      {head("Reports", "Patient and assessment summaries.")}
      <div className={"panel"}>
        {sel(
          "Report type",
          "reportType",
          [
            ["Patients", "Registered Patients"],
            ["Assessments", "Risk Assessments"],
          ],
          S.report,
        )}
        <div
          className={"toolbar pintig-table-filters"}
          role={"search"}
          aria-label={"Filter report records"}
        >
          <input
            className={"search"}
            type={"search"}
            id={"reportSearch"}
            aria-label={"Search report records"}
            placeholder={"Search patient or assessment record"}
            value={S.reportQuery}
            onChange={() => {}}
          />
          <Select
            id={"reportCategory"}
            className={"search"}
            aria-label={"Risk category"}
            {...htmlAttributes(
              S.report === "Patients"
                ? 'disabled title="Risk categories apply to assessment reports"'
                : "",
            )}
          >
            {withKeys(
              ["All", "Low", "Moderate", "High", "Very High"].map(
                (x, _index) => (
                  <Fragment key={_index}>
                    <option
                      {...htmlAttributes(
                        x === S.reportCategory ? "selected" : "",
                      )}
                    >
                      {x}
                    </option>
                  </Fragment>
                ),
              ),
            )}
          </Select>
          {b("Clear filters", "clearReport")}
        </div>
        <div className={"actions"}>
          {b("Export CSV", "exportCSV")}
          {b("Print", "print")}
        </div>
        <div id={"reportLiveResults"} className={"pintig-live-results"}>
          <div className={"separator"}></div>
          <h2>
            {S.report === "Patients"
              ? "Registered Patients"
              : "Risk Assessments"}
          </h2>
          <div className={"cards"}>
            {metric("Matching records", rows.length)}
          </div>
          <div className={"pintig-count"}>
            {rows.length}
            {" of "}
            {total}
            {" records"}
          </div>
          <div className={"tablewrap"}>
            <table>
              <thead>
                <tr>
                  {S.report === "Patients" ? (
                    <>
                      <th>{"Patient record"}</th>
                      <th>{"Identity"}</th>
                      <th>{"Sex"}</th>
                      <th>{"Facility"}</th>
                    </>
                  ) : (
                    <>
                      <th>{"Assessment"}</th>
                      <th>{"Patient record"}</th>
                      <th>{"10-year risk"}</th>
                      <th>{"Category"}</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {S.report === "Patients"
                  ? withKeys(
                      reportRows("Patients").map((p, _index) => (
                        <Fragment key={_index}>
                          <tr>
                            <td>{p.record}</td>
                            <td>{patientIdent(p, false)}</td>
                            <td>{esc(p.sex)}</td>
                            <td>{esc(p.facility)}</td>
                          </tr>
                        </Fragment>
                      )),
                    )
                  : withKeys(
                      reportRows("Assessments").map((r, _index) => (
                        <Fragment key={_index}>
                          <tr>
                            <td>
                              {"AST-"}
                              {r.id}
                            </td>
                            <td>{patientIdent(P(r.pid))}</td>
                            <td>
                              {(r.risk * 100).toFixed(1)}
                              {"%"}
                            </td>
                            <td>{esc(r.band)}</td>
                          </tr>
                        </Fragment>
                      )),
                    )}
              </tbody>
            </table>
          </div>
          {rows.length ? (
            ""
          ) : (
            <>
              <div className={"empty"}>{"No records match these filters."}</div>
            </>
          )}
          <div className={"identity-notice"}>
            {
              "Exports include record identifiers, not patient names or PhilHealth numbers."
            }
          </div>
        </div>
      </div>
    </>
  );
}
