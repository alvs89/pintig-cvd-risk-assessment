import { Fragment } from "react";
import { htmlAttributes, Select, withKeys } from "../components/markup";
import { b, head } from "../components/shared";
import { logs, S } from "../state/store";
import { esc } from "../utils/format";
export function AuditPage() {
  const categories = [
    "All",
    "Sign-in / sign-out",
    "Patient records",
    "Assessments",
    "Account changes",
    "Other activity",
  ];
  const typeOf = (action: string) =>
    /login|signed in|logged out/i.test(action)
      ? categories[1]
      : /patient|identity/i.test(action)
        ? categories[2]
        : /assessment|risk estimate/i.test(action)
          ? categories[3]
          : /user|account|healthcare worker/i.test(action)
            ? categories[4]
            : categories[5];
  const filtered = logs.filter(
    (l) =>
      (l.when + " " + l.user + " " + l.action)
        .toLowerCase()
        .includes(S.auditQuery.trim().toLowerCase()) &&
      (S.auditType === "All" || typeOf(l.action) === S.auditType),
  );
  return (
    <>
      {head("Audit Logs", "Review account access and record activity.")}
      <div className={"panel"}>
        <div
          className={"toolbar pintig-table-filters"}
          role={"search"}
          aria-label={"Filter audit logs"}
        >
          <input
            className={"search"}
            id={"auditSearch"}
            type={"search"}
            aria-label={"Search audit logs"}
            value={S.auditQuery}
            onChange={() => {}}
            placeholder={"Search user or activity"}
          />
          <Select
            className={"search"}
            id={"auditType"}
            aria-label={"Activity type"}
          >
            {withKeys(
              categories.map((c, _index) => (
                <Fragment key={_index}>
                  <option
                    {...htmlAttributes(c === S.auditType ? "selected" : "")}
                  >
                    {c}
                  </option>
                </Fragment>
              )),
            )}
          </Select>
          {b("Clear", "clearAudit")}
        </div>
        <div id={"auditLiveResults"} className={"pintig-live-results"}>
          <div className={"pintig-count"}>
            {filtered.length}
            {" of "}
            {logs.length}
            {" activities"}
          </div>
          <div className={"tablewrap"}>
            <table>
              <thead>
                <tr>
                  <th>{"Time"}</th>
                  <th>{"User"}</th>
                  <th>{"Action"}</th>
                </tr>
              </thead>
              <tbody>
                {withKeys(
                  filtered.map((l, _index) => (
                    <Fragment key={_index}>
                      <tr>
                        <td>{esc(l.when)}</td>
                        <td>{esc(l.user)}</td>
                        <td>{esc(l.action)}</td>
                      </tr>
                    </Fragment>
                  )),
                )}
              </tbody>
            </table>
          </div>
          {filtered.length ? (
            ""
          ) : (
            <>
              <div className={"empty"}>
                {"No activities match these filters."}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
