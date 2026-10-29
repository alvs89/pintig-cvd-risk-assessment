import { b, head } from "../components/shared";
import { patients, records, users, S } from "../state/store";

export function MaintenancePage() {
  return (
    <>
      {head(
        "Maintenance",
        "Export system records and review account and assessment activity.",
      )}
      <div className="twocol">
        <section className="panel">
          <h2>Export system records</h2>
          <p className="muted">
            Exports retain record identifiers, account details, assessment
            responses, and audit entries. Patient profile names, dates of birth,
            contact details, and PhilHealth numbers are omitted; this is not an
            anonymous export.
          </p>
          {b("Export records", "backup", "primary")}
        </section>
        <section className="panel">
          <h2>System records</h2>
          <dl className="patient-baseline">
            <div className="fact-cell">
              <dt>Registered patients</dt>
              <dd>{patients.length}</dd>
            </div>
            <div className="fact-cell">
              <dt>Saved assessments</dt>
              <dd>{records.length}</dd>
            </div>
            <div className="fact-cell">
              <dt>Active accounts</dt>
              <dd>{users.filter((user) => user.active).length}</dd>
            </div>
          </dl>
        </section>
      </div>
    </>
  );
}
export function HelpPage() {
  return (
    <>
      {head(
        "Help Center",
        "Guidance for patient records and assessment workflows.",
      )}
      <section className="panel">
        <div className="actions" role="tablist" aria-label="Help topics">
          {[
            ["guide", "User Guide"],
            ["faq", "FAQs"],
          ].map(([key, label]) => (
            <button
              key={key}
              id={`help-tab-${key}`}
              type="button"
              role="tab"
              className={`btn${S.help === key ? " primary" : ""}`}
              style={S.help === key ? undefined : { background: "transparent" }}
              aria-selected={S.help === key}
              aria-controls="help-topic-panel"
              tabIndex={S.help === key ? 0 : -1}
              data-act={`help:${key}`}
              onKeyDown={(event) => {
                if (
                  !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                    event.key,
                  )
                )
                  return;
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? "guide"
                    : event.key === "End"
                      ? "faq"
                      : key === "guide"
                        ? "faq"
                        : "guide";
                const tab = document.getElementById(`help-tab-${next}`);
                tab?.click();
                tab?.focus();
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="separator" />
        <div
          id="help-topic-panel"
          role="tabpanel"
          aria-labelledby={`help-tab-${S.help}`}
          tabIndex={0}
        >
          {S.help === "guide" ? (
            <>
              <h2>Assessment workflow</h2>
              <ol>
                <li>
                  Find or register a patient in Patient Management. Use the eye
                  control to verify identity when needed.
                </li>
                <li>
                  Open New Risk Assessment, confirm eligibility, and complete
                  the measurements and interview questions.
                </li>
                <li>
                  Review the estimate, risk category, contributing factors, and
                  educational guidance.
                </li>
                <li>
                  Save the assessment and retrieve it from Assessment History.
                </li>
                <li>
                  Administrators can manage accounts and export filtered
                  reports.
                </li>
              </ol>
            </>
          ) : (
            <>
              <h2>Frequently asked questions</h2>
              <h3>How should I interpret an estimate?</h3>
              <p>
                Read the model-status notice with the result and review it
                alongside the recorded health information.
              </p>
              <h3>How do I verify a patient’s identity?</h3>
              <p>
                Use the eye control next to the patient record number. Hide the
                name when verification is complete.
              </p>
              <h3>Where do the assessment questions come from?</h3>
              <p>
                The risk-question section uses official Framingham Heart Study
                wording and response choices for current cigarette smoking and
                hypertension-medication history. PINTIG-specific eligibility
                and safety screening is shown separately and is not presented
                as part of the Framingham questionnaire.
              </p>
              <h3>What is the PhilHealth PIN used for?</h3>
              <p>
                It is an optional patient identifier. It does not connect PINTIG
                to PhilHealth services.
              </p>
              <h3>How do I get help accessing my account?</h3>
              <p>Contact your system administrator.</p>
            </>
          )}
        </div>
      </section>
    </>
  );
}
export function AboutPage() {
  const scope = [
    [
      "Target outcome",
      "First myocardial infarction, stroke, heart failure, or cardiovascular death",
    ],
    ["Assessment period", "10 years"],
    ["Baseline eligibility", "Ages 35–70"],
    ["Competing event", "Non-cardiovascular death"],
    ["Assessment type", "Non-laboratory"],
    ["Risk categories", "Low, Moderate, High, Very High"],
  ];
  return (
    <>
      {head(
        "About PINTIG",
        "Cardiovascular risk assessment and educational guidance.",
      )}
      <section className="panel">
        <h2>
          Predictive Intelligence for Non-Laboratory Ten-Year Individualized
          Grouping of Major Cardiovascular Event Risk Using Random Survival
          Forest
        </h2>
        <p>
          PINTIG supports structured collection and review of cardiovascular
          health information for eligible adults.
        </p>
        <h3>Research scope and model status</h3>
        <p>
          The scope below describes the intended PURE Philippines model. Current
          assessment results use an illustrative calculation, not a clinically
          validated prediction. The separate provisional Framingham research
          graph has a different outcome and must not replace the assessment
          estimate. Neither output should guide clinical decisions.
        </p>
        <div className="threecol">
          {scope.map(([label, value]) => (
            <div key={label} className="snapshot">
              <strong>{label}</strong>
              {value}
            </div>
          ))}
        </div>
        <h3>Assessment workflow</h3>
        <p>
          Record clinical measurements and interview responses, review the risk
          estimate and contributing factors, and consider educational guidance
          based on the recorded health information. Model status is provided
          with each result.
        </p>
        <h3>Questionnaire reference</h3>
        <p>
          The live risk-question section is intentionally limited to directly
          traceable Framingham items used by the current PINTIG assessment flow:
          current cigarette smoking and hypertension-medication history. Their
          displayed wording and response choices follow official Framingham exam
          materials as closely as the baseline PINTIG workflow permits.
        </p>
        <p>
          Custom alcohol, activity, diet, family-history, education, employment,
          diabetes-history, previous-medication, and waist-circumference items
          have been removed from the live New Risk Assessment rather than being
          presented as supplemental Framingham questions. Framingham forms vary
          by cohort and examination cycle.{" "}
          <a
            href="https://www.framinghamheartstudy.org/fhs-for-researchers/exam-forms/"
            target="_blank"
            rel="noopener noreferrer"
          >
            View official Framingham exam forms ↗
          </a>
        </p>
      </section>
    </>
  );
}
export function AccountPage() {
  const user = S.user!;
  return (
    <>
      {head("My Account", "Review your account details and access role.")}
      <section className="panel">
        <p>
          <b>Name:</b> {user.name}
        </p>
        <p>
          <b>Email:</b> {user.email}
        </p>
        <p>
          <b>Role:</b>{" "}
          {user.role === "admin" ? "System Administrator" : "Healthcare Worker"}
        </p>
        {b("Sign out", "logout", "danger")}
      </section>
    </>
  );
}
