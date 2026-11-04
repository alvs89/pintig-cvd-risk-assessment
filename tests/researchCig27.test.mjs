import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyResearchCif27,firstThresholdCrossing,research27Compatibility } from '../src/services/researchCig27.ts';
import { MODEL27,MODEL27_SHA256,TRANSFORM27,PREDICTORS27,validateResearch27Request } from '../src/services/research27Contract.mjs';
import { patients } from '../src/state/store.ts';
import { intakes27 } from '../src/state/intakes27.ts';
import { age } from '../src/utils/format.ts';
import { INTAKE27_SCHEMA } from '../src/services/assessment27.ts';
// Fabricated contract fixture tests shape and step semantics, never performance.
const response=()=>({schemaVersion:'research-27p-cif-v1',modelVersion:MODEL27,modelSha256:MODEL27_SHA256,transformVersion:TRANSFORM27,researchOnly:true,outcomeId:'recorded-cvd-proxy',competingEvent:'death-before-recorded-cvd-cause-unverified',numberOfTrees:200,curveSource:'all-model-event-times-step-cif',risk10:.21,cif:{timeUnit:'days',daysPerYear:365.25,supportedUntil:3652.5,probabilityUnit:'fraction',times:[0,100,200,800,1200,3652.5],probabilities:[0,.04,.05,.1,.21,.21]}});
test('27-feature CIG uses exact steps and first event-time threshold crossings',()=>{
 const c=verifyResearchCif27(response());assert.ok(c);assert.equal(c.risk,c.annual[9].probability);
 assert.equal(c.annual[0].probability,.05);assert.equal(c.annual[1].probability,.05);
 for(const [threshold,day] of [[.05,200],[.1,800],[.2,1200]])assert.equal(firstThresholdCrossing(c,threshold).year*365.25,day);
 assert.equal(firstThresholdCrossing(c,.3),null);
});
test('CIG rejects decreasing, nonfinite, incomplete, mismatched, and wrong-model outputs',()=>{
 for(const change of [r=>r.cif.probabilities[3]=.01,r=>r.risk10=.2,r=>r.cif.times[5]=3600,r=>r.cif.times[1]=0,r=>r.cif.probabilities[1]=NaN,r=>r.cif.probabilities[4]=1.2,r=>r.cif.probabilities[0]=.1,r=>r.modelVersion='7p',r=>r.modelSha256='wrong',r=>r.transformVersion='unknown',r=>r.numberOfTrees=500,r=>r.curveSource='interpolated',r=>r.cif.times.pop()]){const r=response();change(r);assert.equal(verifyResearchCif27(r),null);}
});
test('complete current questionnaires remain blocked for known definition mismatches',()=>{
 const p=patients[0];const r={pid:p.id,ageAtAssessment:age(p.dob),researchQuestionnaire:{schema:INTAKE27_SCHEMA,age:age(p.dob),answers:{...intakes27[0].rawResponses}}};
 const outcome=research27Compatibility(p,r);assert.equal(outcome.request,null);assert.ok(outcome.reasons.some(x=>x.includes('SES')));assert.ok(outcome.reasons.some(x=>x.includes('grain')));
 r.researchQuestionnaire.answers.sleep='';assert.ok(research27Compatibility(p,r).reasons.some(x=>x.includes('missing')));
 delete r.researchQuestionnaire;assert.match(research27Compatibility(p,r).reasons[0],/snapshot/);
});
export const fictionalRequest=()=>{
 const features=Object.fromEntries(PREDICTORS27.map(k=>[k,0]));
 Object.assign(features,{age_years:50,sex_male:1,ses_index_0_100:null,waist_cm:85,hip_circumference_cm:100,sbp_mmhg:120,dbp_mmhg:80,heart_rate_bpm:70,smoking_status:'Never',activity_min_week:150,sitting_minutes_day:360,diet_score_0_100:50,sleep_duration_hours:7});
 return {researchOnly:true,modelVersion:MODEL27,modelSha256:MODEL27_SHA256,transformVersion:TRANSFORM27,features,ses:{education_category:3,income_band:2,income_supported_people:4}};
};
test('inference contract rejects every missing feature, invalid SES and transformation mismatch',()=>{
 assert.equal(validateResearch27Request(fictionalRequest()),null);
 for(const key of PREDICTORS27){const r=fictionalRequest();delete r.features[key];assert.ok(validateResearch27Request(r));}
 for(const change of [r=>r.ses.income_band=99,r=>r.ses.income_supported_people=0,r=>r.features.ses_index_0_100=0,r=>r.features.sleep_duration_hours=null,r=>r.features.smoking_status='Unknown',r=>r.features.current_smoking_intensity_cigs_day=10,r=>r.transformVersion='PINTIG-FE-1.3']){const r=fictionalRequest();change(r);assert.ok(validateResearch27Request(r));}
});
