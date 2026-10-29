# PINTIG v3 shared predictor and imputation configuration
# This file does not fit models. It defines the 16-predictor contract and
# leakage-safe imputation to be called inside outer/inner training splits.

pintig_v3_predictors <- c(
  "age_years","sex_male","sbp_mmhg","dbp_mmhg","waist_cm","current_smoker",
  "hypertension_history","bp_medication","alcohol_drinks_week","activity_min_week",
  "diet_score_0_100","ses_index_0_100","family_history_cvd",
  "diabetes","cigarettes_per_day","heart_rate_bpm"
)

pintig_mode_value <- function(x) {
  x <- x[!is.na(x)]
  ux <- unique(x)
  ux[which.max(tabulate(match(x, ux)))]
}

pintig_learn_imputer_v3 <- function(train) {
  stopifnot(!anyNA(train$diabetes))
  smoker_observed <- train[
    current_smoker == 1 & !is.na(cigarettes_per_day),
    cigarettes_per_day
  ]
  stopifnot(length(smoker_observed) > 0)
  list(
    bp_medication_mode = pintig_mode_value(train$bp_medication),
    current_smoker_cigarettes_per_day_median = median(smoker_observed),
    heart_rate_bpm_median = median(train$heart_rate_bpm, na.rm = TRUE)
  )
}

pintig_apply_imputer_v3 <- function(dat, imputer) {
  out <- data.table::copy(dat)

  # Framingham teaching-data definition: CIGPDAY=0 means not a current smoker.
  out[
    current_smoker == 0 & is.na(cigarettes_per_day),
    cigarettes_per_day := 0
  ]
  out[
    current_smoker == 1 & is.na(cigarettes_per_day),
    cigarettes_per_day := imputer$current_smoker_cigarettes_per_day_median
  ]

  out[
    is.na(heart_rate_bpm),
    heart_rate_bpm := imputer$heart_rate_bpm_median
  ]
  out[
    is.na(bp_medication),
    bp_medication := imputer$bp_medication_mode
  ]

  # Diabetes is complete in the current Framingham baseline cohort.
  # If future cohorts contain missing diabetes, do not silently guess it:
  # revise the imputation plan for that cohort.
  stopifnot(!anyNA(out$diabetes))
  stopifnot(!anyNA(out[, ..pintig_v3_predictors]))
  out
}

pintig_impute_train_validation_v3 <- function(train, validation) {
  imp <- pintig_learn_imputer_v3(train)
  list(
    train = pintig_apply_imputer_v3(train, imp),
    validation = pintig_apply_imputer_v3(validation, imp),
    imputer = imp
  )
}
