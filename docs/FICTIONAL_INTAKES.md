# Fictional patient intake records

The three existing coded patient identities have explicit fictional intake fixtures
in `src/state/seededIntakes.ts`. These are demonstration-only data, not PURE or
Framingham participants, clinical observations, or model outputs. They must be
excluded from any future live clinical deployment. Contact numbers and government
identifiers remain empty.

Select a patient in New Risk Assessment or open their assessment from Patient
Management, then choose **Load recorded intake**. Review and edit the answers before
submitting. Loading over entered answers and switching patients require confirmation.
Selecting a patient alone does not load, calculate risk or save an assessment.
Newly registered patients have no fixture. Derived BMI, weekly drinks and activity
use the existing intake service; fixture objects contain no derived values.

The two original history records are unchanged. Their incomplete legacy fields
remain unavailable rather than being filled from a new intake. Only the normal
assessment submission and explicit Save action can add a record. Predictions remain
illustrative; CIF and further-assessment guidance safeguards remain unchanged.
