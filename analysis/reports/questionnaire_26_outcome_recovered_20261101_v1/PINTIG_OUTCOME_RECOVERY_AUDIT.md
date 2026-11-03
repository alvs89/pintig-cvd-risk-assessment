# PINTIG outcome recovery audit
## Why the old file had outcomes
The original frozen v3 file stored a provisional competing-risk proxy derived from raw Framingham `CVD`, `TIMECVD`, `DEATH`, and `TIMEDTH`. The exact preprocessing script first constructing the frozen v2 outcome could not be uniquely verified by this audit; the calculation itself is explicitly reproduced and checked by `analysis/scripts/reconstruction_26/build.py` lines 153-164 and this recovery script.
Time = min(TIMECVD,TIMEDTH,3652.5). Status=1 when recorded CVD first by 3652.5 (ties favor CVD); status=2 for recorded all-cause death before CVD by 3652.5; status=0 otherwise. Flags follow status.
## Why the new file had missing outcomes
`analysis/scripts/reconstruction_26/build.py` deliberately creates `output_base=base[predictors+META].copy()` and then `output_base[META[1:5]]=np.nan` (in the inspected section around lines 167–170). This is intentional, because recorded CVD and all-cause death do not identify the entire MI/stroke/HF/CVD-death clinical endpoint or verified non-CVD death.
## Recovery
Matched 4,191 IDs by participant_id (not row order) between original v3, reconstruction, and separately saved proxy. Independently reproduced provisional event time and status from raw first exam event fields. Every recovered time, status, indicator and fold equals v3, and all 26 predictors are byte-value-equivalent at the DataFrame level to the questionnaire reconstruction. No source file overwritten.
- event_type=0: 3604
- event_type=1: 369
- event_type=2: 218
- Missing event times/status in proxy: 0/0
- Missing event times/status in exact endpoint: 4,191/4,191
- Follow-up: min 26.0, median 3652.5, mean 3413.4023, max 3652.5 days
- Administrative 10-year censored participants: 3588
- 5 folds: {1: 839, 2: 838, 3: 838, 4: 838, 5: 838}
- Zero unmatched participants; zero event/fold discrepancies.
## Important labeling
The proxy columns in the experimental CSV keep legacy six-field schema ONLY for compatibility with the old RSF pipeline. They are NOT clinical non-CVD death or the exact requested composite. Metadata and file names explicitly forbid interpreting them as adjudicated endpoints. The exact-endpoint file keeps all four fields NA.
## Training and validity limitations
No outcome is fabricated; the recovery is strictly a join of the existing v3 proxy. Six legacy and ten expanded predictors are simulated; recent four were questionnaire-informed but new model fit must be performed. Corrected v4 metrics cannot be transferred to this modified predictor simulation. Training should use cause 1 competing-risk CIF with documented horizon boundary handling and fold-only imputation. Any fit is a software smoke test, NOT clinical validation.
