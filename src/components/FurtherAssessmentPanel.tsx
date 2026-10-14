import { useId } from "react";
import type { FurtherAssessmentResult } from "../services/furtherAssessment";

export function FurtherAssessmentPanel({
  result,
}: {
  result: FurtherAssessmentResult;
}) {
  const id = useId();
  return (
    <section
      className="panel further-assessment"
      aria-labelledby={id}
      aria-busy={result.status === "loading"}
    >
      <h2 id={id}>Further Assessment Guidance</h2>
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
    </section>
  );
}
