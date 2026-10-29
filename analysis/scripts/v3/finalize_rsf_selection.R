.libPaths(c("C:/Users/Alvin Guillermo/Documents/R/win-library/4.6", .libPaths()))
suppressPackageStartupMessages(library(data.table))
root <- "C:/Users/Alvin Guillermo/Downloads/PINTIG System"
path <- file.path(root,"analysis/results/v3/RSF_FOCUSED_SELECTION_POOLED.csv")
stopifnot(file.exists(path))
x <- fread(path)
stopifnot(setequal(x$predictor_count,c(14L,15L)), all(x$n==4191L),
          all(is.finite(x$AUC)),all(is.finite(x$Brier)))
b <- fread(file.path(root,"analysis/modeling/v3_16predictors/final_evaluation/V3_FINAL_MODEL_COMPARISON.csv"))
b <- b[model=="RSF"]
stopifnot(nrow(b)==1L)
comp <- rbindlist(list(x[,.(predictor_count,AUC,Brier,calibration_slope,mean_predicted)],
  data.table(predictor_count=16L,AUC=b$AUC,Brier=b$Brier,
    calibration_slope=b$calibration_slope,mean_predicted=b$mean_predicted)))
setorder(comp,predictor_count)
comp[,abs_slope_deviation:=abs(calibration_slope-1)]
fwrite(comp,file.path(root,"analysis/results/v3/RSF_14_15_16_COMPARISON.csv"))
report <- c("# PINTIG exploratory RSF predictor-set comparison",
  "", "This report compares five-fold held-out 10-year outcomes for the 14-, 15-, and 16-predictor competing-risk RSF candidates.",
  "These are provisional Framingham teaching-cohort results; the candidate specification was examined using the same cohort, so this is not independent external validation.",
  "", "| Predictors | AUC | Brier (10-year) | Calibration slope |",
  "|---|---:|---:|---:|")
for(i in 1:nrow(comp)) report <- c(report,sprintf("| %d | %.5f | %.5f | %.4f |",comp$predictor_count[i],comp$AUC[i],comp$Brier[i],comp$calibration_slope[i]))
report <- c(report,"",
  "Lower Brier is better; higher AUC is better. Calibration slopes nearer 1 are generally preferable.",
  "Do not select solely by the largest AUC. Review uncertainty, clinical plausibility, availability of predictors, calibration, and deployment feasibility.",
  "IBS and cause-specific concordance for the 14/15 candidates are not in this scoring output; therefore this report is a partial metric comparison, not a final clinical validation.",
  "The six synthetic/augmented predictors and absence of Philippine external validation remain important limitations.",
  "Frontend questionnaire and frozen v2 datasets must not be changed automatically.")
writeLines(report,file.path(root,"analysis/reports/v3/RSF_14_15_16_COMPARISON_REPORT.md"))
cat("RSF 14/15/16 pooled comparison and report saved\n")
print(comp)
