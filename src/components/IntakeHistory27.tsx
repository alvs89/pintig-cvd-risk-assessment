import { FEATURE_NAMES27, QUESTIONS27, RETIRED_QUESTIONS27 } from "../services/assessment27";
import { intakes27 } from "../state/intakes27";
import { P, S } from "../state/store";

export function IntakeHistory27() {
  if (!S.user?.active) return null;
  const rows = intakes27.filter((r) =>
    (P(r.patientId)?.record ?? "")
      .toLowerCase()
      .includes(S.query.toLowerCase()),
  );
  if (!rows.length) return null;
  return (
    <section className="panel">
      <h2>Saved questionnaire responses</h2>
      <p>
        These records have no risk estimate. Responses are retained for the
        current session.
      </p>
      {rows.map((r) => (
        <details key={r.id} className="intake27-section">
          <summary>
            {P(r.patientId)?.record} ·{" "}
            {new Date(r.recordedAt).toLocaleString("en-PH")} · No risk
            calculated
          </summary>
          <dl>
            {[...QUESTIONS27, ...RETIRED_QUESTIONS27].filter((q) => Object.hasOwn(r.rawResponses, q.id)).map(
              (q) => (
                <div key={q.id} className="intake27-saved">
                  <dt>
                    {q.sharedPrompt && <span>{q.sharedPrompt} &mdash; </span>}
                    {q.context && <span>{q.context} &mdash; </span>}
                    {q.text}
                    {q.unit && ` (${q.unit})`}
                  </dt>
                  <dd>
                    {r.rawResponses[q.id] || "Not answered"}
                    {!r.applicability[q.id]
                      ? " — Not applicable to the saved response path"
                      : ""}
                  </dd>
                </div>
              ),
            )}
          </dl>
          <p>
            {r.incomplete.length} applicable fields unanswered at save time.
          </p>
          <h3>Calculated predictors and provenance</h3>
          <dl className="intake27-derived">
            {FEATURE_NAMES27.map((name) => {
              const value = r.features[name];
              const source = r.featureProvenance[name];
              return (
                <div key={name}>
                  <dt>{name.replaceAll("_", " ")}</dt>
                  <dd>
                    {value == null ? "Unavailable" : String(value)} ·{" "}
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
