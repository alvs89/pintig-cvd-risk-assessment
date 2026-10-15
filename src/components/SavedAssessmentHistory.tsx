import type { AssessmentRecord } from "../types/domain";
import {
  groupSavedQuestionnaire,
  isLimitedLegacyAssessment,
  savedEstimateSource,
} from "../services/assessmentHistoryView";
import {
  assessmentLabels,
  displayAssessmentValue,
} from "../utils/assessmentLabels";

export function SavedAssessmentProvenance({
  record,
}: {
  record: AssessmentRecord;
}) {
  const source = savedEstimateSource(record);
  return (
    <section
      className="panel history-provenance"
      aria-labelledby="history-provenance-title"
    >
      <h2 id="history-provenance-title">Assessment Result Information</h2>
      <div className="history-provenance-row">
        <div>
          <span className="history-provenance-label">Calculation source</span>
          <strong>{source.heading}</strong>
        </div>
        <div>
          <span className="history-provenance-label">Assessment period</span>
          <strong>10 years</strong>
        </div>
      </div>
      <p>{source.message}</p>
    </section>
  );
}

export function SavedQuestionnaireSections({
  record,
  patientRecord,
}: {
  record: AssessmentRecord;
  patientRecord: string;
}) {
  const groups = groupSavedQuestionnaire(record.inputs);
  const total = groups.reduce((count, group) => count + group.fields.length, 0);
  return (
    <div
      className="history-questionnaire"
      aria-label="Saved questionnaire responses"
    >
      <div className="history-questionnaire-summary">
        <span>{total} questionnaire entries</span>
        {isLimitedLegacyAssessment(record.inputs) && (
          <p className="history-legacy-note">
            Some assessment information is unavailable for this record.
          </p>
        )}
        <p>Unanswered fields are displayed as 'Not recorded'.</p>
      </div>
      {groups.length ? (
        groups.map((group) => (
          <section
            key={group.id}
            className="history-question-group"
            aria-labelledby={"history-group-" + group.id}
          >
            <div className="history-question-group-heading">
              <h3 id={"history-group-" + group.id}>{group.title}</h3>
              <span>
                {group.fields.length}{" "}
                {group.fields.length === 1 ? "field" : "fields"}
              </span>
            </div>
            <dl className="history-question-grid">
              {group.fields.map(({ key, value }) => (
                <div className="history-question-value" key={key}>
                  <dt>
                    {assessmentLabels[key] ??
                      key.replace(/([a-z])([A-Z])/g, "$1 $2")}
                  </dt>
                  <dd>{displayAssessmentValue(key, value, patientRecord)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))
      ) : (
        <p className="history-legacy-note">
          No questionnaire responses were stored with this assessment.
        </p>
      )}
    </div>
  );
}
