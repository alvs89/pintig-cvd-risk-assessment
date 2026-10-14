# Further assessment guidance

The independent service uses the existing unrounded `band()` classifier after
rejecting missing, nonfinite, out-of-range or category-inconsistent predictions.
Its four fixed communication messages require both a validated model and clinical
review of the rules. Neither prerequisite exists in the current application.
The clinically reviewed messages remain unavailable to normal illustrative results;
only isolated test fixtures exercise them. A separate explicitly educational and
unvalidated proposed follow-up display is documented in PROTOTYPE_FOLLOWUP.md. CIF controls and condition-based education are independent.

The shared panel appears between the CIF panel and educational guidance. Existing
ModelStatus and blood-pressure education remain unchanged. There is no inference,
referral, scheduling, triage or treatment automation.

Existing snapshots never receive category recommendations from illustrative
results. An optional historical guidance structure supports original message,
probability, category, model identity and rule version. Historical rendering checks
compatibility and preserves the stored text even for earlier rule versions; it
never generates current messages for old records. The current snapshot writer does
not populate this field. Future trusted integration must establish approval and
snapshot provenance before enabling or storing messages; frontend flags alone are
not clinical validation or an authorization mechanism.

Proposed rules require clinical expert review and model validation. They are not
WHO/PhilPEN referral thresholds and must not be presented as validated protocols.
