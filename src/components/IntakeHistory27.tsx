import { FEATURE_NAMES27, QUESTIONS27, RETIRED_QUESTIONS27 } from "../services/assessment27";
import { intakes27 } from "../state/intakes27";
import { P, S } from "../state/store";

export function IntakeHistory27() {
  if (!S.user?.active) return null;
  const rows = intakes27.filter((record) =>
    (P(record.patientId)?.record ?? "")
      .toLowerCase()
      .includes(S.query.toLowerCase()),
  );
  if (!rows.length) return null;
  return (
    <section className="panel">
      <h2>Saved questionnaire responses</h2>
      <p>
        Responses are retained for the current session. Fictional demonstration
        responses are clearly identified and have no clinical risk estimate.
      </p>
      {rows.map((record) => (
        <details key={record.id} className="intake27-section">
          <summary>
            {P(record.patientId)?.record} &middot;{" "}
            {new Date(record.recordedAt).toLocaleString("en-PH")} &middot;{" "}
            {record.demonstration
              ? "Fictional demonstration responses"
              : "No risk calculated"}
          </summary>
          <dl>
            {[...QUESTIONS27, ...RETIRED_QUESTIONS27]
              .filter((question) => Object.hasOwn(record.rawResponses, question.id))
              .map((question) => (
                <div key={question.id} className="intake27-saved">
                  <dt>
                    {question.sharedPrompt && <span>{question.sharedPrompt} &mdash; </span>}
                    {question.context && <span>{question.context} &mdash; </span>}
                    {question.text}
                    {question.unit && ` (${question.unit})`}
                  </dt>
                  <dd>
                    {record.rawResponses[question.id] || "Not answered"}
                    {!record.applicability[question.id]
                      ? " — Not applicable to the saved response path"
                      : ""}
                  </dd>
                </div>
              ))}
          </dl>
          <p>{record.incomplete.length} applicable fields unanswered at save time.</p>
          <h3>Calculated predictors and provenance</h3>
          <dl className="intake27-derived">
            {FEATURE_NAMES27.map((name) => {
              const value = record.features[name];
              const source = record.featureProvenance[name];
              return (
                <div key={name}>
                  <dt>{name.replaceAll("_", " ")}</dt>
                  <dd>
                    {value == null ? "Unavailable" : String(value)} &middot;{" "}
                    {source.state}; {source.method}
                  </dd>
                </div>
              );
            })}
          </dl>
        </details>
      ))}
    </section>
  );
}
