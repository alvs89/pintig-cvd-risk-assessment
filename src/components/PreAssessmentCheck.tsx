import { P, S } from "../state/store";
import {
  WARNING_SIGNS,
  EVENT_HISTORY,
  screeningDecision,
} from "../services/preAssessmentRules.mjs";
import { age } from "../utils/format";
import { requiredLabel } from "./shared";

export function PreAssessmentCheck() {
  const p = P(S.patientId),
    answers =
      S.preAssessment?.pid === p?.id ? (S.preAssessment?.answers ?? {}) : {};
  const decision = screeningDecision(answers, p ? age(p.dob) : NaN);
  const safe = WARNING_SIGNS.every(([key]) => answers[key] === "No");
  const question = (key: string, label: string) => (
    <div className="field" key={key}>
      <label htmlFor={`screen-${key}`}>{requiredLabel(label, true)}</label>
      <select
        id={`screen-${key}`}
        data-screening-key={key}
        aria-required="true"
        aria-invalid={answers[key] === "Unknown" || undefined}
        aria-describedby={
          answers[key] === "Unknown" ? `screen-${key}-note` : undefined
        }
        disabled={!p}
        value={answers[key] ?? ""}
        onChange={() => {}}
      >
        <option value="">Choose an answer</option>
        <option value="Yes">Yes</option>
        <option value="No">No</option>
        <option value="Unknown">Unable to Confirm</option>
      </select>
      {answers[key] === "Unknown" && (
        <small id={`screen-${key}-note`} className="screening-clarification">
          Clarify this answer with the responsible healthcare professional
          before continuing.
        </small>
      )}
    </div>
  );
  return (
    <section className="pre-assessment" aria-labelledby="eligibility-heading">
      <div className="intake-section-head">
        <span className="intake-step">02</span>
        <div>
          <h2 id="eligibility-heading">Eligibility and Safety Check</h2>
          <p>
            Complete these checks before routine first-event risk assessment.
          </p>
        </div>
      </div>
      <div
        className={`screening-status screening-${decision.status}`}
        role="status"
        tabIndex={-1}
        aria-live="polite"
        aria-atomic="true"
      >
        <h3>{decision.title}</h3>
        <p>{decision.message}</p>
      </div>
      <details open className="screening-group">
        <summary>Pre-Assessment Safety Check</summary>
        <p>
          Before proceeding, ask about the warning signs below. If a warning
          sign is reported, pause routine assessment and arrange immediate
          evaluation by a qualified healthcare professional according to
          applicable clinical and referral protocols.
        </p>
        <p>
          For each item, ask whether it is present now or has occurred recently.
          A recently resolved concerning symptom still requires clarification;
          do not assume it is safe.
        </p>
        <div className="screening-grid">
          {WARNING_SIGNS.map(([key, label]) => question(key, label))}
        </div>
        <small>
          Reference: DOH PhilPEN Risk Assessment Form, Revised 2022.
        </small>
      </details>
      <div
        hidden={!safe && !EVENT_HISTORY.some(([key]) => !!answers[key])}
        className="screening-group"
      >
        <h3>Previous Major Cardiovascular Event</h3>
        <p>
          Confirm the patient's own history before estimating a first event.
          These questions do not concern family history.
        </p>
        <div className="screening-grid">
          {EVENT_HISTORY.map(([key, label]) => question(key, label))}
        </div>
        <p className="tiny">
          The connected research model also excludes previous coronary heart
          disease, including angina.
        </p>
        {question(
          "verified",
          "Is the information sufficient and verified to proceed?",
        )}
      </div>
      <div className="actions">
        <button
          type="button"
          className="btn primary"
          data-act="continueAssessment"
          disabled={decision.status !== "eligible"}
        >
          Continue to Risk Assessment
        </button>
        {p && (
          <button
            type="button"
            className="btn"
            data-act={`openPatient:${p.id}`}
          >
            Return to patient record
          </button>
        )}
      </div>
    </section>
  );
}
