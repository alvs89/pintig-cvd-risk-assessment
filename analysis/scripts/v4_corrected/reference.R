.libPaths(c('C:/Users/Alvin Guillermo/Documents/R/win-library/4.6',.libPaths()))
suppressPackageStartupMessages(library(riskRegression))
suppressPackageStartupMessages(library(prodlim))
suppressPackageStartupMessages(library(data.table))
suppressPackageStartupMessages(library(survival))
out<-'analysis/results/v4_corrected_20261031_v1'
args<-commandArgs(trailingOnly=TRUE)
counts<-if(length(args))as.integer(args) else 16:26
destination<-if(length(args))file.path(out,'reference_diagnostic') else out
dir.create(destination,showWarnings=FALSE)
grid<-seq(3652.5/40,3652.5,length.out=40)
view<-fread(file.path(out,'evaluation_followup_view.csv'))
models<-list();dat<-NULL
for(n in counts){
 nm<-paste0('n',n)
 d<-rbindlist(lapply(1:5,function(k)fread(file.path(out,'primary_train20265000',paste0(nm,'_fold',k,'.csv')))))
 setorder(d,participant_id)
 if(is.null(dat))dat<-copy(d[,.(participant_id,analysis_time_days,event_type)])
 stopifnot(identical(dat$participant_id,d$participant_id))
 models[[nm]]<-as.matrix(d[,paste0('risk_',1:40),with=FALSE])
}
dat[,evaluation_time_days:=view$evaluation_time_days[match(participant_id,view$participant_id)]]
# This view only moves VERIFIED terminal administrative censoring past tau.
# It does not change event labels, genuine event dates, or early censoring dates.
sc<-Score(models,Hist(evaluation_time_days,event_type)~1,data=dat,cause=1,times=grid,metrics=c('auc','brier'),null.model=FALSE,cens.model='KaplanMeier',se.fit=FALSE,contrasts=FALSE,verbose=0)
fwrite(as.data.table(sc$AUC$score),file.path(destination,'riskRegression_auc.csv'))
fwrite(as.data.table(sc$Brier$score),file.path(destination,'riskRegression_brier.csv'))
ajrows<-list()
for(nm in names(models)){
 p<-models[[nm]][,40];grp<-pmin(10L,ceiling(rank(p,ties.method='first')/(length(p)/10)))
 for(g in 1:10){
  sg<-copy(dat[grp==g]);fit<-prodlim(Hist(evaluation_time_days,event_type)~1,data=sg)
  obs<-as.numeric(predictRisk(fit,newdata=sg[1],times=3652.5,cause=1))
  ajrows[[length(ajrows)+1L]]<-data.table(configuration=nm,decile=g,n=nrow(sg),mean_predicted=mean(p[grp==g]),observed_AJ=obs)
 }
}
fwrite(rbindlist(ajrows),file.path(destination,'calibration_AJ_deciles.csv'))
ordered<-copy(dat);ordered[,row_index:=.I];setorder(ordered,evaluation_time_days,-event_type)
wg<-ipcw(Hist(evaluation_time_days,event_type)~1,data=ordered,method='marginal',times=3652.5,subject.times=ordered$evaluation_time_days,lag=1,keep=NULL)
tt<-ordered$evaluation_time_days;ee<-ordered$event_type
ww<-numeric(nrow(ordered));ev<-ee!=0&tt<=3652.5;free<-tt>3652.5
ww[ev]<-1/as.numeric(wg$IPCW.subject.times)[ev];ww[free]<-1/as.numeric(wg$IPCW.times)[1]
cal<-list()
for(nm in names(models)){
 pr<-models[[nm]][ordered$row_index,40];zz<-qlogis(pmin(pmax(pr,1e-7),1-1e-7));yy<-as.integer(ee==1&tt<=3652.5)
 fit<-glm(yy~zz,weights=ww,family=quasibinomial())
 citl<-glm(yy~1+offset(zz),weights=ww,family=quasibinomial())
 cal[[nm]]<-data.table(configuration=nm,slope_R=coef(fit)[2],citl_R=coef(citl)[1],joint_intercept_R=coef(fit)[1],converged=fit$converged&&citl$converged)
}
fwrite(rbindlist(cal),file.path(destination,'calibration_R_reference.csv'))
# Check inclusive administrative horizon convention independently on all nine cases.
toy<-data.table(t=rep(c(9,10,11),each=3),e=rep(0:2,3),p=c(.2,.7,.1,.2,.7,.1,.2,.2,.2))
toy[e==0&t==10,t:=10.5]
ts<-Score(list(toy=matrix(toy$p,ncol=1)),Hist(t,e)~1,data=toy,cause=1,times=10,metrics=c('auc','brier'),null.model=FALSE,cens.model='KaplanMeier',se.fit=FALSE,contrasts=FALSE,verbose=0)
fwrite(data.table(AUC=ts$AUC$score$AUC,Brier=ts$Brier$score$Brier),file.path(destination,'riskRegression_boundary_fixture.csv'))
writeLines(c(capture.output(sessionInfo()),paste('riskRegression',packageVersion('riskRegression'))),file.path(destination,'reference_session_info.txt'))
cat('R_REFERENCE_COMPLETE\n')
