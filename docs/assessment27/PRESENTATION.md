# Questionnaire presentation rules

Source stems are shown once above their response rows. Standalone source questions remain complete questions. Row and column headings remain labels, not rewritten questions.

| Source structure | Assessment presentation |
| --- | --- |
| PURE Q17, PDF 9 (printed 4) | Shared diagnosis stem; condition labels; diagnosis-duration follow-ups omitted |
| PURE Q40(b), PDF 33 (printed 16) | Shared family-history instruction; disease context and relative columns; affected-sibling counts omitted; total siblings retained for applicability |
| PURE Q28(c), PDF 19 (printed 9) | Shared alcohol stem; beverage rows; frequency and quantity retain beverage context; duration and cessation omitted |
| IPAQ duration questions | One source question followed by separate hours/minutes response boxes |
| FFQ Q3 | Shared past-year instruction followed by food/portion labels and original frequency options |
| Framingham TECH05 | Extracted sleep question only; full-day instruction and total validation removed |
| Framingham MD02 / MD08 | Complete existing questions retained; repeated age/exposure fields retain condition/person context |
| Measurements, education, stress, administrative residence | Existing measurement labels and standalone questions retained |

The renderer handles shared prompts through metadata, without a medical-history special case. Screen-reader names include the shared prompt or row context. Saved responses and exported dictionaries retain that context. Selectors remain digital adaptations of paper boxes, with existing codes, missing responses and skip logic preserved. This presentation review does not certify every transcription as a fresh verbatim PDF audit. No dataset, scoring formula or model changes are part of this change.

Waist and hip each have a measurement group containing their two readings and clothing selector. Clothing is visually secondary measurement metadata, retains the original two response options, and is saved without entering the predictor matrix or numerically correcting circumference. On narrow screens the fields stack within the same labeled group.


Alcohol and active smoking use focused layouts based on the supplied UI references. Status and binary items use native radios; beverage selection uses native checkboxes. Source wording, stored options and calculations are retained. On first checkbox interaction the other unmarked types become explicitly Not selected; Clear beverage answers restores unanswered states. Hidden dependent answers are retained. Former users retain the source's historical beverage questions rather than silently changing them to current consumption. Unknown is offered only where supported by the existing source options; clear/unanswered remains available otherwise.
Selected beverages have frequency/quantity cards and reference serving volumes. Summaries use plain-language labels and show unavailable/check-responses instead of inventing values. Active smoking retains the previously approved last-year item and uses profile age read-only.
Physical activity has Work/Travel/Home/Leisure/Sitting substeps; Back/Continue traverse these before changing the main assessment step. Activity cards group the original day question and hours/minutes responses; day selectors offer0..7. Previously retired motorized travel items remain absent. Existing IPAQ scoring/cleaning is unchanged (including handling durations below10minutes), regardless of illustrative validation in the supplied mockup.
Questionnaire references for the focused sections are available in a collapsed disclosure. Visual styling stays navy/teal; mockup-only demo text and technical predictor names are not used as normal patient-facing labels. All calculations remain assessment features, not enabled risk predictions.

### Dropdown labels, family history and dietary pages
Source-coded choices retain their exact stored values; only visible labels omit numeric prefixes and expand `unk` to `Unknown`. The frontend saves session records; there is no backend submission endpoint to verify.
The sibling-count field is retired from new intake. Existing historical metadata remains available. Sibling disease questions no longer depend on a hidden count. Unanswered sibling history remains missing rather than being inferred as No; users without siblings may leave those responses unanswered.
Dietary questions are shown in source order, eight per page, with numbered navigation and Back/Continue. Draft answers persist across pages and all food responses remain available to scoring and saving. Questionnaire wording, frequency values and dietary scoring are unchanged. Stress questions and their applicability logic are unchanged.
