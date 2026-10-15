# Dashboard risk distribution

Both roles currently access the shared session-only assessment records. There is
no worker ownership/facility filter. The chart receives that accessible array and
counts assessments, including multiple saved assessments for the same patient.
It never reads Research CIG probabilities and does not change records.

Finite probabilities in [0,1] and consistent stored categories are required. The
existing unversioned v27 records use the same documented boundaries as
PINTIG-BANDS-1.0. Other explicit classification versions are excluded pending an
approved compatibility policy, rather than reclassified. Missing or invalid values
and inconsistent categories are also excluded and their count is shown.

Percentages use valid represented assessments as denominator and display one
decimal place. Rounding does not change counts. Four categories remain visible
when empty. Selecting a category exposes a textual summary without filtering or
changing saved records. State rerenders provide updates after saving.
