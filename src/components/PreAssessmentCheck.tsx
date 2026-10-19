import { P, S } from "../state/store";
import {
  WARNING_SIGNS,
  screeningDecision,
} from "../services/preAssessmentRules.mjs";
import { age } from "../utils/format";
import { requiredLabel } from "./shared";

export function PreAssessmentCheck() {
  const p = P(S.patientId),
    answers =
      S.preAssessment?.pid === p?.id ? (S.preAssessment?.answers ?? {}) : {};
  const decision = p
    ? screeningDecision(answers, age(p.dob))
    : {
        status: "incomplete",
        title: "Select a patient",
        message:
          "Choose a patient in Patient identification before completing the eligibility and safety check.",
      };
  const question = (key: string, label: string, no: string, yes: string) => (
    <div className="field" key={key}>
      <label htmlFor={`screen-${key}`}>{requiredLabel(label, true)}</label>
      <select
        id={`screen-${key}`}
        data-screening-key={key}
        required
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
        <option value="No">{no}</option>
        <option value="Yes">{yes}</option>
        <option value="Unknown">Unable to confirm</option>
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
      <div className="screening-group screening-safety-card">
        <h3>Pre-Assessment Safety Checklist</h3>
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
        <ul className="screening-checklist">
          {WARNING_SIGNS.map(([key, label]) => (
            <li key={key}>{label}</li>
          ))}
        </ul>
        <small>
          Reference: DOH PhilPEN Risk Assessment Form, Revised 2022.
        </small>
      </div>
      <div className="screening-group">
        <h3>Healthcare Worker Confirmation</h3>
        <p>
          PINTIG predicts a first major cardiovascular event; it does not
          estimate recurrent cardiovascular risk. Confirm the patient's own
          history, including other diagnosed coronary heart disease such as
          angina.
        </p>
        <div className="screening-grid">
          {question(
            "warningSigns",
            "After reviewing the safety checklist, were any warning signs identified?",
            "No warning signs identified",
            "Yes, one or more warning signs identified",
          )}
          {question(
            "cardiovascularHistory",
            "Does the patient have a history of any qualifying cardiovascular condition, including heart attack, stroke, heart failure, or other diagnosed coronary heart disease?",
            "No previous qualifying cardiovascular condition",
            "Yes, previously experienced or diagnosed",
          )}
        </div>
        <p className="tiny">
          Before continuing, ensure these responses are sufficient and verified.
          These confirmations do not independently establish clinical safety.
        </p>
      </div>
      <div className="actions">
        <button
          type="button"
          className="btn primary"
          data-act="continueAssessment"
          disabled={!!p && decision.status !== "eligible"}
        >
          {p ? "Continue to Risk Assessment" : "Select patient to continue"}
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
