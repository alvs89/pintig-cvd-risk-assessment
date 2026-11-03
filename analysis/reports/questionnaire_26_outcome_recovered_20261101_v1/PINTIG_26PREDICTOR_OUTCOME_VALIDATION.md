# Recovered proxy validation


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
