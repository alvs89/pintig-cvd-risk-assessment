.libPaths(c("C:/Users/Alvin Guillermo/Documents/R/win-library/4.6", .libPaths()))
suppressPackageStartupMessages(library(data.table))
root <- "C:/Users/Alvin Guillermo/Downloads/PINTIG System"
source(file.path(root,"scripts","pintig_v3_modeling_config.R"))
d <- fread(file.path(root,"data","processed","pintig_frozen_clean_analysis_v3_16predictors.csv"))
stopifnot(nrow(d)==4191L, uniqueN(d$participant_id)==4191L, length(pintig_v3_predictors)==16L)
rows <- list()
for (outer in 1:5) {
  tr <- copy(d[outer_fold != outer])
  va <- copy(d[outer_fold == outer])
  z <- pintig_impute_train_validation_v3(tr,va)
  stopifnot(nrow(z$train)==nrow(tr), nrow(z$validation)==nrow(va))
  stopifnot(!anyNA(z$train[, ..pintig_v3_predictors]))
  stopifnot(!anyNA(z$validation[, ..pintig_v3_predictors]))
  rows[[outer]] <- data.table(
    outer_fold=outer,
    bp_medication_mode=z$imputer$bp_medication_mode,
    smoker_cigarettes_per_day_median=z$imputer$current_smoker_cigarettes_per_day_median,
    heart_rate_bpm_median=z$imputer$heart_rate_bpm_median,
    train_n=nrow(z$train),validation_n=nrow(z$validation)
  )
}
out <- rbindlist(rows)
fwrite(out,file.path(root,"analysis","reports","pintig_v3_imputation_validation.csv"))
print(out)
cat("V3 IMPUTATION VALIDATION PASSED\n")
