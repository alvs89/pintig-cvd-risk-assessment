# Interface terminology and retained research details

Normal screens use concise action-oriented wording. Questionnaire prefilling and
sign-in shortcuts explicitly identify fictional practice use. Neither action is
verified clinical-data retrieval or production identity verification. Switching
accounts retains the original sign-out behavior.

Saved questionnaire grouping and raw responses are retained. Blank values display
as Not recorded, unknown responses as Not sure, and No remains a negative answer.
Result provenance uses the original model identifier; unknown model provenance is
not labeled illustrative or clinically validated automatically. No historical
questionnaire values, model versions or saved guidance text are rewritten.

Research CIG technical details remain here and in CIF_INTEGRATION.md rather than
ordinary failure messages: the private research model is a separate provisional
Framingham seven-predictor competing-risk RSF with 500 trees. Its endpoint is
recorded CVD, with recorded death before CVD as a competing event; non-CVD cause of
death is not verified. It differs from the intended PURE Philippines composite.
The response is checked by researchCig.ts. The curve retains step values without
linear interpolation; the administrative ten-year terminal evaluation is defined
by the private inference adapter. The UI remains restricted to the existing local
development environment and three recognized fictional identities. Startup and
service configuration belong in private harness documentation, not patient views.

Risk-based educational follow-up is unvalidated. Its existing 10% display rule is
not a validated referral threshold. Current illustrative estimates and research
probabilities must not determine clinical care, medication or referrals.

Maintenance exports are not anonymous: profile identifiers are omitted selectively,
but record identifiers, account details, questionnaire responses and audit entries
are retained. No encryption, persistent backup or secure authorization is implied.

Human review remains needed for questionnaire research wording, educational
guidance and any claims of clinical applicability. Model status and eligibility
warnings remain visible. References in About are retained without changing the
approved research scope.
