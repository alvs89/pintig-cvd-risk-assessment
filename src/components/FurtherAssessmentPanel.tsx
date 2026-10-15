import { useId } from "react";
import type { FurtherAssessmentResult } from "../services/furtherAssessment";
import type { PrototypeFollowUpResult } from "../services/prototypeFollowUp";

export function FurtherAssessmentPanel({
  result,
  prototype,
}: {
  result: FurtherAssessmentResult;
  prototype?: PrototypeFollowUpResult;
}) {
  const id = useId();
  const showingPrototype = prototype?.status === "ready";
  return (
    <section
      className="panel further-assessment"
      aria-labelledby={id}
      aria-busy={result.status === "loading" && !prototype}
    >
      <h2 id={id}>Further Assessment Guidance</h2>
      {showingPrototype && prototype ? (
        <>
          <p className="further-assessment-prototype-label">
            Educational follow-up considerations
          </p>
          <p className="further-assessment-category">
            {prototype.guidance.category} risk grouping · illustrative 10-year
            estimate
          </p>
          <p>{prototype.guidance.introduction}</p>
          <div className="further-assessment-rule-grid" role="list">
            {prototype.guidance.actions.map((action) => (
              <article
                className="further-assessment-rule"
                role="listitem"
                key={action.id}
              >
                <h3>{action.title}</h3>
                <p className="further-assessment-finding">
                  <strong>Recorded finding:</strong> {action.finding}
                </p>
                <p>{action.consideration}</p>
              </article>
            ))}
          </div>
          <p className="further-assessment-note">
            This guidance is educational and does not replace evaluation by a
            qualified healthcare professional. Risk-based guidance is
            unvalidated; the 10% display rule is not a validated referral
            threshold. It is not a diagnosis, referral order, or treatment
            instruction.
          </p>
        </>
      ) : prototype?.status === "below-threshold" ? (
        <div role="status" aria-live="polite">
          <p className="further-assessment-category">
            Continue risk-factor education
          </p>
          <p>{prototype.reason}</p>
          <p className="further-assessment-note">
            Risk-based guidance is unvalidated. A probability below 10% does not
            rule out the need for clinical assessment.
          </p>
        </div>
      ) : (
        <div role="status" aria-live="polite" aria-atomic="true">
          {result.status === "ready" ? (
            <>
              <p className="further-assessment-category">
                {result.guidance.category} ten-year risk category
              </p>
              <p>{result.guidance.message}</p>
              <p className="further-assessment-note">
                For healthcare-worker decision support. Recommendations are
                based on PINTIG's research risk-grouping rules and do not
                replace professional clinical judgment. This result is not a
                diagnosis, referral order, or treatment instruction.
              </p>
            </>
          ) : (
            <>
              <p className="further-assessment-category">
                {result.status === "loading"
                  ? "Guidance pending"
                  : "Further assessment guidance unavailable"}
              </p>
              <p>{result.reason}</p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
