.libPaths(c("C:/Users/Alvin Guillermo/Documents/R/win-library/4.6", .libPaths()))
suppressPackageStartupMessages(library(data.table))

root <- "C:/Users/Alvin Guillermo/Downloads/PINTIG System"
base <- file.path(root,"analysis","modeling","v3_16predictors")
foldbase <- file.path(base,"folds")

# Outer fold 1 was completed by the original serial v3 run before execution
# was parallelized. Folds 2-5 are stored in fold-specific directories.
read_outer1 <- function(file) {
  x <- fread(file=file.path(base,file))
  x[outer_fold==1]
}
read_fold_files <- function(file) {
  xs <- list()
  for (f in 2:5) {
    p <- file.path(foldbase,paste0("fold_",f),file)
    if (!file.exists(p)) stop("Missing fold file: ",p)
    xs[[as.character(f)]] <- fread(file=p)
  }
  xs
}

stageA <- rbindlist(c(
  list(read_outer1("v3_rsf_stageA_screening.csv")),
  read_fold_files("rsf_stageA_screening.csv")
),fill=TRUE)
stageB <- rbindlist(c(
  list(read_outer1("v3_rsf_stageB_refinement.csv")),
  read_fold_files("rsf_stageB_refinement.csv")
),fill=TRUE)
stageC <- rbindlist(c(
  list(read_outer1("v3_rsf_stageC_ntree.csv")),
  read_fold_files("rsf_stageC_ntree.csv")
),fill=TRUE)
selected <- rbindlist(c(
  list(read_outer1("v3_rsf_selected_hyperparameters.csv")),
  read_fold_files("rsf_selected_hyperparameters.csv")
),fill=TRUE)
oof <- rbindlist(c(
  list(read_outer1("v3_rsf_oof_predictions.csv")),
  read_fold_files("rsf_oof_predictions.csv")
),fill=TRUE)
oof1_for_summary <- read_outer1("v3_rsf_oof_predictions.csv")
imp1 <- fread(file=file.path(root,"analysis","reports","pintig_v3_imputation_validation.csv"))[outer_fold==1]
summary1 <- oof1_for_summary[,.(outer_fold=1L,n=.N,
  major_cvd=sum(event_type==1),competing_death=sum(event_type==2),
  mean_pred=mean(pred_cif_major_cvd_10y),
  min_pred=min(pred_cif_major_cvd_10y),
  max_pred=max(pred_cif_major_cvd_10y))]
summary1[, `:=`(
  bp_medication_mode=imp1$bp_medication_mode,
  smoker_cigarettes_per_day_median=imp1$smoker_cigarettes_per_day_median,
  heart_rate_bpm_median=imp1$heart_rate_bpm_median
)]
summary <- rbindlist(c(
  list(summary1),
  read_fold_files("rsf_fold_summary.csv")
),fill=TRUE)

inner1 <- fread(file=file.path(base,"v3_inner_fold_assignments.csv"))[outer_fold==1]
inner_rest <- read_fold_files("inner_fold_assignments.csv")
inner <- rbindlist(c(list(inner1),inner_rest),fill=TRUE)

setorder(stageA,outer_fold,mean_brier,sd_brier)
setorder(stageB,outer_fold,mean_brier,sd_brier)
setorder(stageC,outer_fold,mean_brier,sd_brier,ntree)
setorder(selected,outer_fold)
setorder(oof,participant_id)
setorder(summary,outer_fold)
setorder(inner,outer_fold,participant_id)

stopifnot(
  nrow(selected)==5L,
  uniqueN(selected$outer_fold)==5L,
  nrow(oof)==4191L,
  uniqueN(oof$participant_id)==4191L,
  all(sort(unique(oof$outer_fold))==1:5),
  all(oof$pred_cif_major_cvd_10y>=0 & oof$pred_cif_major_cvd_10y<=1)
)

fwrite(stageA,file.path(base,"v3_rsf_stageA_screening.csv"))
fwrite(stageB,file.path(base,"v3_rsf_stageB_refinement.csv"))
fwrite(stageC,file.path(base,"v3_rsf_stageC_ntree.csv"))
fwrite(selected,file.path(base,"v3_rsf_selected_hyperparameters.csv"))
fwrite(oof,file.path(base,"v3_rsf_oof_predictions.csv"))
fwrite(summary,file.path(base,"v3_rsf_fold_summary.csv"))
fwrite(inner,file.path(base,"v3_inner_fold_assignments.csv"))

cat("V3 RSF FOLD AGGREGATION COMPLETE\n")
print(selected)
print(summary)
