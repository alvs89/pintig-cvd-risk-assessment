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
            Proposed rule-based follow-up · for illustration only
          </p>
          <p className="further-assessment-category">
            {prototype.guidance.category} risk grouping · illustrative 10-year estimate
          </p>
          <p>{prototype.guidance.introduction}</p>
          <div className="further-assessment-rule-grid" role="list">
            {prototype.guidance.actions.map((action) => (
              <article className="further-assessment-rule" role="listitem" key={action.id}>
                <h3>{action.title}</h3>
                <p className="further-assessment-finding">
                  <strong>Recorded finding:</strong> {action.finding}
                </p>
                <p>{action.consideration}</p>
              </article>
            ))}
          </div>
          <p className="further-assessment-note">
            These suggestions demonstrate proposed communication rules, not
            clinical recommendations validated for this population or outcome.
            The current estimate uses an illustrative calculation, and the 10%
            display rule is not a validated referral threshold. A professional
            decides whether and when further evaluation is appropriate. This
            panel does not diagnose disease, issue referral orders, or recommend
            changing medication. Acute-symptom procedures remain independent.
          </p>
        </>
      ) : prototype?.status === "below-threshold" ? (
        <div role="status" aria-live="polite">
          <p className="further-assessment-category">
            No additional category-based follow-up suggested
          </p>
          <p>{prototype.reason}</p>
          <p className="further-assessment-note">
            This 10% cut-off illustrates the proposed workflow only,
            not a clinical safety or referral threshold.
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
                For healthcare-worker decision support. Recommendations are based
                on PINTIG's research risk-grouping rules and do not replace
                professional clinical judgment. This result is not a diagnosis,
                referral order, or treatment instruction.
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
