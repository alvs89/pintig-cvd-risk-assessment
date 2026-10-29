.libPaths(c("C:/Users/Alvin Guillermo/Documents/R/win-library/4.6", .libPaths()))
suppressPackageStartupMessages(library(data.table))
root <- "C:/Users/Alvin Guillermo/Downloads/PINTIG System"
d <- fread(file.path(root,"data/processed/pintig_frozen_clean_analysis_v3_16predictors.csv"))
stopifnot(nrow(d)==4191L, uniqueN(d$participant_id)==4191L)
out <- list()
for (n in c(14L,15L)) {
  for (f in 1:5) {
    path <- file.path(root,"analysis/modeling",paste0("rsf_selection_candidate_",n),
                      "folds",paste0("fold_",f),"rsf_oof_predictions.csv")
    if (!file.exists(path)) {
      out[[length(out)+1L]] <- data.table(candidate=n,outer_fold=f,status="PENDING",rows=NA_integer_)
      next
    }
    x <- fread(path)
    expected <- d[outer_fold==f]
    ok <- nrow(x)==nrow(expected) && uniqueN(x$participant_id)==nrow(x) &&
      setequal(x$participant_id,expected$participant_id) &&
      all(is.finite(x$pred_cif_major_cvd_10y)) &&
      all(x$pred_cif_major_cvd_10y>=0 & x$pred_cif_major_cvd_10y<=1)
    if (ok) {
      m <- merge(x,expected[,.(participant_id,analysis_time_days,event_type,outer_fold)],
                 by="participant_id",suffixes=c("_pred","_expected"))
      ok <- nrow(m)==nrow(expected) &&
        all(m$analysis_time_days_pred==m$analysis_time_days_expected) &&
        all(m$event_type_pred==m$event_type_expected) &&
        all(m$outer_fold_pred==m$outer_fold_expected)
    }
    out[[length(out)+1L]] <- data.table(candidate=n,outer_fold=f,
                         status=if(ok) "PASS" else "FAIL",rows=nrow(x))
  }
}
result <- rbindlist(out)
dest <- file.path(root,"analysis/results/v3/RSF_CANDIDATE_FOLD_VALIDATION.csv")
fwrite(result,dest)
print(result)
if(any(result$status=="FAIL")) quit(status=1L)
if(any(result$status=="PENDING")) quit(status=2L)
cat("ALL RSF CANDIDATE FOLDS VALIDATED\n")
