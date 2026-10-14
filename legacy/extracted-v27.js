
(()=>{'use strict';const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));let users=[{id:1,name:'System Administrator',email:'admin@pintig.demo',pass:'Admin123!',role:'admin',active:true},{id:2,name:'Maria Santos, RN',email:'worker@pintig.demo',pass:'Worker123!',role:'worker',active:true},{id:3,name:'Joel Reyes, RN',email:'joel@pintig.demo',pass:'Worker123!',role:'worker',active:true}],patients=[{id:1,record:'PNT-000001',first:'Roberto',middle:'M.',last:'Dela Cruz',dob:'1968-04-17',sex:'Male',locality:'Quezon City',phone:'+639170000001',pin:'',facility:'Community Health Center'},{id:2,record:'PNT-000002',first:'Elena',middle:'',last:'Reyes',dob:'1975-07-08',sex:'Female',locality:'San Mateo, Rizal',phone:'',pin:'',facility:'Community Health Center'},{id:3,record:'PNT-000003',first:'Antonio',middle:'',last:'Santos',dob:'1982-01-13',sex:'Male',locality:'Marikina City',phone:'',pin:'',facility:'Community Health Center'}],records=[{id:1,pid:1,uid:2,date:'2026-09-26',risk:.238,band:'Very High',model:'ILLUSTRATIVE-0.2',inputs:{sbp:165,dbp:95,bmi:29,smoking:'Current',diabetes:'Yes'},explanation:'Age, blood pressure and recorded health factors.',guidance:'General cardiovascular health education.'},{id:2,pid:2,uid:2,date:'2026-09-30',risk:.114,band:'High',model:'ILLUSTRATIVE-0.2',inputs:{sbp:145,dbp:88,bmi:27,smoking:'Never'},explanation:'Age and systolic blood pressure.',guidance:'General cardiovascular health education.'}],logs=[{when:'2026-09-30',user:'System',action:'Initialized patient records'}];let S={user:null,page:'Dashboard',patientId:null,editPatient:null,editUser:null,query:'',filter:'All',draft:null,result:null,historyId:null,report:'Patients',help:'guide',message:'',error:false,reset:false,revealedId:null,userQuery:'',userRole:'All',userStatus:'All',auditQuery:'',auditType:'All',reportQuery:'',reportCategory:'All'};
let pendingConfirm=null;
let modalInvoker=null;
function openPintigConfirm({title,description,actionLabel='Clear',onConfirm}){
 const dialog=$('pintigConfirm');
 if(!dialog || typeof dialog.showModal!=='function')return;
 if(dialog.open)return;
 modalInvoker=document.activeElement;
 pendingConfirm=onConfirm;
 $('pintigConfirmTitle').textContent=title;
 $('pintigConfirmDescription').textContent=description;
 $('pintigConfirmAction').textContent=actionLabel;
 dialog.showModal();
 $('pintigCancel').focus();
}
$('pintigCancel').addEventListener('click',()=> $('pintigConfirm').close('cancel'));
$('pintigConfirmAction').addEventListener('click',()=>{
 const act=pendingConfirm;
 $('pintigConfirm').close('confirm');
 if(typeof act==='function')act();
});
$('pintigConfirm').addEventListener('close',()=>{
 pendingConfirm=null;
 if(modalInvoker && modalInvoker.isConnected)modalInvoker.focus({preventScroll:true});
 modalInvoker=null;
});
// Keep keyboard focus on the dialog's controls while a decision is pending.
document.addEventListener('keydown',event=>{
 const dialog=$('pintigConfirm');
 if(!dialog.open||event.key!=='Tab')return;
 const controls=[...dialog.querySelectorAll('button:not([disabled])')];
 if(!controls.length)return;
 const current=controls.indexOf(document.activeElement);
 event.preventDefault();
 const next=event.shiftKey?(current<=0?controls.length-1:current-1):(current<0||current===controls.length-1?0:current+1);
 controls[next].focus();
});

const adminNav=['Dashboard','Patient Management','New Risk Assessment','Assessment History','Reports','User Accounts','Audit Logs','Maintenance','Help','About','My Account'];const workerNav=['Dashboard','Patient Management','New Risk Assessment','Assessment History','Help','About','My Account'];const icons={'Dashboard':'▦','Patient Management':'♧','New Risk Assessment':'♡','Assessment History':'◷','Reports':'▤','User Accounts':'♙','Audit Logs':'☷','Maintenance':'⚙','Help':'?','About':'ⓘ','My Account':'♙'};const pname=p=>[p.first,p.middle,p.last].filter(Boolean).join(' '),P=id=>patients.find(p=>p.id===+id),U=id=>users.find(u=>u.id===+id),T=()=>new Date().toISOString().slice(0,10),dt=v=>new Date(v+'T12:00:00').toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'}),band=r=>r<.05?'Low':r<.10?'Moderate':r<.20?'High':'Very High',tag=t=>'<span class="tag '+(t==='Very High'?'veryhigh':t==='High'?'high':t==='Low'||t==='Active'?'low':'')+'">'+esc(t)+'</span>',b=(label,act,kind='')=>'<button type="button" class="btn '+kind+'" data-act="'+act+'">'+label+'</button>',f=(label,key,val='',type='text',required=false,attrs='')=>'<div class="field"><label for="'+key+'">'+label.replace(/\s*\*\s*$/, '')+(required?' *':'')+'</label><input id="'+key+'" name="'+key+'" type="'+type+'" value="'+esc(val)+'" '+(required?'required':'')+' '+attrs+'></div>',sel=(label,key,opts,val)=>'<div class="field"><label for="'+key+'">'+label+'</label><select id="'+key+'" name="'+key+'">'+opts.map(o=>{let a=Array.isArray(o)?o:[o,o];return '<option value="'+esc(a[0])+'" '+(String(a[0])===String(val)?'selected':'')+'>'+esc(a[1])+'</option>'}).join('')+'</select></div>',head=(title,sub,extra='')=>'<div class="pagehead"><div><div class="eyebrow">PINTIG / '+esc(S.page)+'</div><h1>'+title+'</h1><div class="muted tiny">'+sub+'</div></div>'+extra+'</div>',metric=(a,n)=>'<div class="metric"><div class="muted tiny">'+a+'</div><div class="num">'+n+'</div></div>',log=action=>logs.unshift({when:new Date().toLocaleString('en-PH'),user:S.user?.name||'System',action}),msg=(s,error=false)=>{S.message=s;S.error=error},go=page=>{if(!(S.user?.role==='admin'?adminNav:workerNav).includes(page)){msg('Access denied for this role.',true);return render()}S.page=page;S.revealedId=null;S.editPatient=null;S.editUser=null;S.historyId=null;S.result=null;S.query='';return render()};

const eyeOpen='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
const eyeClosed='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.5 5.2c.5-.1 1-.2 1.5-.2 6.4 0 10 7 10 7a17 17 0 0 1-3.1 3.9M6.1 6.1C3.5 8 2 12 2 12s3.6 7 10 7c1.7 0 3.1-.5 4.5-1.2"/><path d="M9.8 9.8a3 3 0 0 0 4.4 4.4"/></svg>';
const canReveal=p=>!!S.user?.active&&['admin','worker'].includes(S.user.role)&&!!p&&patients.some(v=>v.id===p.id);
const isRevealed=p=>canReveal(p)&&S.revealedId===p.id;
function patientIdent(p,showId=true){
 if(!p)return '<span class="identity-mask">Select a patient record</span>';
 let shown=isRevealed(p),key=esc(p.record);
 return '<span class="patient-ident">'+(showId?'<span class="patient-code">'+key+'</span>':'')+
 '<span class="'+(shown?'private-name':'identity-mask')+'">'+(shown?esc(pname(p)):'Name hidden')+'</span>'+
 (canReveal(p)?'<button type="button" class="privacy-eye" data-act="revealIdentity:'+p.id+'" title="'+(shown?'Hide':'Reveal')+' patient name" aria-label="'+(shown?'Hide':'Reveal')+' name for '+key+'" aria-pressed="'+shown+'">'+(shown?eyeClosed:eyeOpen)+'</button>':'')+'</span>';
}
const patientLabel=p=>p?.record||'Patient record';

function login(){return '<div class="login-screen"><section class="hero"><div class="logo"><span>♥</span>PINTIG</div><div class="hero-acronym">Predictive Intelligence for Non-Laboratory Ten-Year Individualized Grouping of Major Cardiovascular Event Risk Using Random Survival Forest</div><h1>Better insight.<br>Earlier awareness.</h1><p>Non-laboratory cardiovascular risk assessment and decision support.</p><div><span class="tag">Cardiovascular Risk Assessment</span></div></section><section class="login-side"><div class="login-card"><div class="eyebrow">Account access</div><h2>Welcome back</h2><p class="muted">Sign in to access PINTIG.</p>'+(S.message?'<div class="feedback '+(S.error?'error':'')+'" role="status">'+esc(S.message)+'</div>':'')+(S.reset?'<div class="notice warn">Password recovery via OTP is planned in the manuscript, but email/OTP delivery is not active in this offline demonstration. Use a demo account below.</div>'+b('Back to sign in','backLogin'): '<div class="demo-accounts"><button type="button" data-act="adminDemo"><b>🛡 Administrator</b><br>admin@pintig.demo<br><span class="muted">Admin123!</span></button><button type="button" data-act="workerDemo"><b>♡ Healthcare Worker</b><br>worker@pintig.demo<br><span class="muted">Worker123!</span></button></div><form id="loginForm">'+f('Email','email','','email',true)+f('Password','password','','password',true)+'<button type="submit" class="btn primary wfull">Sign in →</button></form><div style="text-align:right;margin-top:10px">'+b('Forgot password?','forgot')+'</div>')+'<div class="separator"></div><div class="tiny muted">Authorized access • Secure handling of patient information</div></div></section></div>'}
function recordsTable(arr){return '<div class="tablewrap"><table><thead><tr><th>Assessment</th><th>Patient record</th><th>Date</th><th>10-year estimate</th><th>Risk group</th><th>Action</th></tr></thead><tbody>'+arr.map(r=>'<tr><td>AST-'+String(r.id).padStart(4,'0')+'</td><td>'+patientIdent(P(r.pid))+'</td><td>'+dt(r.date)+'</td><td><b>'+(r.risk*100).toFixed(1)+'%</b></td><td>'+tag(r.band)+'</td><td><button class="link" data-act="record:'+r.id+'">View</button></td></tr>').join('')+'</tbody></table></div>'+(arr.length?'':'<div class="empty">No matching assessments.</div>')}
function dashboard(){let admin=S.user.role==='admin';return head(admin?'Administrator Dashboard':'Healthcare Dashboard','Patient and assessment activity overview.')+'<div class="cards">'+(admin?metric('User accounts',users.length)+metric('Active accounts',users.filter(u=>u.active).length)+metric('Registered patients',patients.length)+metric('Assessment records',records.length):metric('Registered patients',patients.length)+metric('Total assessments',records.length)+metric('Assessed patients',new Set(records.map(r=>r.pid)).size)+metric('This month',records.filter(r=>r.date.slice(0,7)===T().slice(0,7)).length))+'</div><div class="twocol"><div class="panel"><h2>Quick actions</h2><div class="actions">'+b('Patient Management','nav:Patient Management')+b('New Assessment','nav:New Risk Assessment','primary')+b(admin?'User Accounts':'Assessment History','nav:'+(admin?'User Accounts':'Assessment History'))+'</div></div><div class="panel"><h2>Assessment services</h2><p>✓ Patient management and risk assessment</p><p class="muted tiny">Review assessment activity, records, and results in one workspace.</p></div></div><section class="panel"><h2>Recent assessments</h2>'+recordsTable(records.slice().reverse().slice(0,5))+'</section>'}
function patientsPage(){
 const list=patients.filter(p=>p.record.toLowerCase().includes(S.query.trim().toLowerCase()));
 return head('Patient Management','Patient names are concealed by default. Use the eye icon to verify identity.',b('+ Register Patient','newPatient','primary'))+
 '<div class="panel"><div class="toolbar pintig-table-filters" role="search" aria-label="Search patient records">'+
 '<input class="search" type="search" id="patientQuery" aria-label="Search patient records" placeholder="Search by Patient Record Number" value="'+esc(S.query)+'">'+b('Clear','clearPatient')+'</div>'+
 '<div id="patientLiveResults" class="pintig-live-results"><div class="pintig-count">'+list.length+' of '+patients.length+' patients</div><div class="tablewrap"><table><thead><tr><th>Patient ID</th><th>Identity</th><th>Facility</th><th>Record status</th><th>Actions</th></tr></thead><tbody>'+
 list.map(p=>'<tr><td><b class="patient-code">'+p.record+'</b></td><td>'+patientIdent(p,false)+'</td><td>'+esc(p.facility)+'</td><td>Active</td><td><button class="link" data-act="openPatient:'+p.id+'">Open</button> · <button class="link" data-act="editPatient:'+p.id+'">Edit</button> · <button class="link" data-act="assessPatient:'+p.id+'">Assess</button></td></tr>').join('')+
 '</tbody></table></div>'+(list.length?'':'<div class="empty">No patients match your search.</div>')+'</div></div>';
}
// Philippine mobile numbers use a +63 country code and a ten-digit mobile component.
// Support the local 09XXXXXXXXX notation when loading pre-existing records.
function phoneDigits(value){let d=String(value??'').replace(/\D/g,'');if(/^639\d{9}$/.test(d))return d.slice(2);if(/^09\d{9}$/.test(d))return d.slice(1);return d;}
function phoneField(value=''){
 return '<div class="field phone-field"><label for="phone">Contact number</label>'+
 '<div class="phone-control"><span class="phone-prefix" aria-hidden="true">+63</span>'+
 '<input id="phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="10" minlength="10" pattern="9[0-9]{9}" value="'+esc(phoneDigits(value))+'" placeholder="9XXXXXXXXX"></div></div>';
}
function patientForm(){let p=P(S.editPatient)||{};if(p.id&&!isRevealed(p))return head('Edit patient '+p.record,'Verify patient identity to edit personal details.',b('← Patients','nav:Patient Management'))+'<section class="panel"><h2>Identity verification</h2><p>Patient identifying fields remain concealed until explicitly revealed.</p><div class="identity-context">'+patientIdent(p)+'</div></section>';return head(p.id?'Edit patient profile':'Register new patient',p.id?'Review and update patient information.':'Enter the patient’s identification and contact details.',b('← Patient Management','nav:Patient Management'))+
 '<section class="panel"><form id="patientForm"><h2>Patient information</h2>'+
 '<div class="patient-name-grid">'+
 f('First name','first',p.first,'text',true,'autocomplete="given-name" spellcheck="false"')+
 f('Middle name','middle',p.middle,'text',false,'autocomplete="additional-name" spellcheck="false"')+
 f('Last name','last',p.last,'text',true,'autocomplete="family-name" spellcheck="false"')+
 '</div><div class="patient-personal-grid">'+
 f('Date of birth','dob',p.dob,'date',true,'autocomplete="bday"')+
 sel('Sex','sex',['Male','Female'],p.sex||'Male')+
 phoneField(p.phone)+
 '</div><div class="patient-address-row">'+
 f('Address / locality','locality',p.locality,'text',true,'autocomplete="street-address"')+
 '</div><div class="patient-admin-grid">'+
 f('PhilHealth PIN (optional)','pin',p.pin,'text',false,'inputmode="numeric" maxlength="12" autocomplete="off"')+
 f('Healthcare facility','facility',p.facility||'','text',false,'placeholder="Enter facility name"')+
 '</div><div class="notice">PINTIG Record Number: <b>'+(p.record||'Automatically generated upon registration')+'</b>.</div><div class="actions"><button class="btn primary" type="submit">'+(p.id?'Save changes':'Register patient')+'</button>'+b('Cancel','nav:Patient Management')+'</div></form></section>';
}
function patientDetails(){let p=P(S.patientId);if(!p)return patientsPage();
const show=isRevealed(p);
return head('Patient '+p.record,'Patient profile · Identifying information hidden by default',b('← Patients','nav:Patient Management'))+
'<div class="twocol"><div class="panel"><h2>Patient identity</h2><div class="identity-context">'+patientIdent(p)+'</div><p class="identity-notice">Use the eye control to verify identity only when required for your task.</p><p><b>Date of birth:</b> '+(show?esc(p.dob):'Hidden')+'<br><b>Sex:</b> '+esc(p.sex)+'<br><b>Contact number:</b> '+(show?esc(p.phone||'Not recorded'):'Hidden')+'<br><b>PhilHealth PIN:</b> '+(show?esc(p.pin||'Not recorded'):'Hidden')+'<br><b>Locality:</b> '+(show?esc(p.locality):'Hidden')+'<br><b>Facility:</b> '+esc(p.facility)+'</p><div class="actions">'+b('Edit profile','editPatient:'+p.id)+b('New risk assessment','assessPatient:'+p.id,'primary')+'</div></div><div class="panel"><h2>Assessment overview</h2><div class="risk">'+records.filter(r=>r.pid===p.id).length+'</div><div class="muted">Saved assessments</div><p class="tiny">Each assessment is stored as a separate historical snapshot.</p></div></div><div class="panel"><h2>Assessment history</h2>'+recordsTable(records.filter(r=>r.pid===p.id))+'</div>';
}
function age(d){let b=new Date(d+'T12:00:00'),t=new Date();return t.getFullYear()-b.getFullYear()-(t.getMonth()<b.getMonth()||(t.getMonth()===b.getMonth()&&t.getDate()<b.getDate())?1:0)}
// Framingham-inspired structured intake. Referenced forms: FHS Gen 3 Exam 1 (2005).
// Question wording adapted for PINTIG; this is NOT a verbatim or validated FHS questionnaire.
function assessment(){
 let x=S.draft||{}, p=S.patientId?P(S.patientId):null;const v=(k,d='')=>x[k]??d;
 const ynu=[['','Choose an answer'],['Yes','Yes'],['No','No'],['Unknown','Not sure']];
 const yn=[['','Choose an answer'],['Yes','Yes'],['No','No']];
 const num=(label,key,max,unit='',required=false,step='1')=>f(label+(unit?' ('+unit+')':''),key,v(key),'number',required,'min="0" max="'+max+'" step="'+step+'"');
 return head('New Risk Assessment','Guided intake · Record measurements and interview responses.',b('← Dashboard','nav:Dashboard'))+
 '<section class="panel"><form id="assessmentForm"><div class="intake-section-head"><span class="intake-step">01</span><div><h2>Patient identification</h2><p>Select the patient before recording the current visit.</p></div></div>'+
 sel('Patient profile *','pid',[['','Choose patient'],...patients.map(z=>[z.id,z.record])],p?.id||'')+
 '<div class="identity-context" id="assessmentIdentity">'+patientIdent(p)+'</div>'+
 '<div class="profile-meta-header"><strong>Patient information</strong><span class="source-hint">✓ Retrieved from patient profile · Read-only</span></div>'+
 '<dl class="patient-baseline" aria-label="Patient information retrieved from the selected profile">'+
 '<div class="fact-cell"><dt>Date of birth</dt><dd id="patientDob">'+(p?esc(dt(p.dob)):'—')+'</dd></div>'+
 '<div class="fact-cell"><dt>Age at assessment</dt><dd id="patientAge">'+(p?age(p.dob)+' years':'—')+'</dd></div>'+
 '<div class="fact-cell"><dt>Sex</dt><dd id="patientSex">'+(p?esc(p.sex):'—')+'</dd></div>'+
 '</dl>'+
 '<div class="intake-section-head"><span class="intake-step">02</span><div><h2>Eligibility questions</h2><p>Confirm the intended first-event prediction population.</p></div></div>'+
 '<div class="gridform">'+sel('Has the patient previously been diagnosed with a heart attack, stroke, or heart failure? *','prior',ynu,v('prior'))+sel('Is the information sufficient to proceed with the assessment? *','verified',ynu,v('verified'))+'</div><p class="hintline">People with a previous component of the target event are outside the intended first-event assessment. Age eligibility is checked automatically.</p>'+
 '<div class="intake-section-head"><span class="intake-step">03</span><div><h2>Clinic measurements</h2><p>Measure blood pressure and body size; do not ask the patient to guess measurement values.</p></div></div>'+
 '<div class="gridform">'+
 f('Systolic blood pressure (mmHg)','sbp',v('sbp'),'number',true,'min="70" max="260" step="1"')+
 f('Diastolic blood pressure (mmHg)','dbp',v('dbp'),'number',true,'min="40" max="160" step="1"')+
 f('Height (cm)','height',v('height'),'number',false,'min="110" max="220" step="0.1"')+
 f('Weight (kg)','weight',v('weight'),'number',false,'min="25" max="250" step="0.1"')+
 '<div class="field"><label for="bmi" id="bmiLabel">Body mass index (BMI, kg/m²) *</label><div class="bmi-value-host"><input type="number" id="bmi" name="bmi" value="'+esc(v('bmi'))+'" min="12" max="65" step="0.1" required><div class="derived-text-value" id="bmiReadout" role="status" aria-labelledby="bmiLabel" data-state="complete" hidden><span id="bmiDisplay" class="derived-main">—</span><span class="calc-flag">Calculated</span></div></div></div>'+
 f('Waist circumference (cm, if available)','waist',v('waist'),'number',false,'min="40" max="190" step="0.1"')+
 '</div><p class="hintline">BMI is calculated automatically when height and weight are supplied. Otherwise enter an existing verified BMI value.</p>'+
 '<div class="intake-section-head"><span class="intake-step">04</span><div><h2>Smoking and medication history</h2><p>Adapted from documented Framingham examination questions; responses are mapped to the provisional core variables.</p></div></div>'+
 '<div class="gridform">'+
 sel('Has the patient smoked cigarettes during the past month? *','currentSmoking',ynu,v('currentSmoking'))+
 sel('Is the patient currently taking medication for high blood pressure? *','bpMeds',ynu,v('bpMeds'))+
 sel('Has a healthcare professional previously diagnosed the patient with diabetes?','diabetesHistory',ynu,v('diabetesHistory'))+
 sel('Has the patient used blood pressure medication in the past, but not currently?','pastBpMeds',ynu,v('pastBpMeds'))+
 '</div><p class="hintline">Diabetes diagnosis history is recorded separately; it is not assumed to be the same as the original Framingham laboratory-influenced diabetes field.</p>'+
 '<div class="intake-section-head"><span class="intake-step">05</span><div><h2>Lifestyle, diet and family questionnaire</h2><p>Structured responses are converted to compatible indicators when the derivation is supported.</p></div></div>'+
 sel('Assessment input set *','mode',[['observed','Core clinical and history inputs'],['extended','Core inputs with lifestyle and social information']],v('mode','extended'))+
 '<div id="extraQuestionnaire" class="extra-questionnaire"><div class="question-group"><div class="group-title">Alcohol consumption</div><div class="gridform">'+
 sel('Has the patient consumed alcoholic drinks during the past year?','alcoholUse',ynu,v('alcoholUse'))+
 num('On average, how many days per week does the patient drink alcohol?','alcoholDays',7,'days/week',false)+
 num('On a drinking day, approximately how many drinks does the patient have?','drinksPerDay',30,'drinks/day',false)+
 '<div class="field"><label id="alcoholDrinksLabel">Estimated drinks per week</label><div class="derived-text-value" role="status" aria-labelledby="alcoholDrinksLabel" data-state="pending"><span id="alcoholDrinksDisplay" class="derived-main placeholder">Not yet calculated</span><span class="calc-flag" id="alcoholDrinksFlag" hidden>Calculated</span><input id="alcoholDrinks" name="alcoholDrinks" type="hidden" value="'+esc(v('alcoholDrinks'))+'"></div></div>'+
 '</div></div><div class="question-group"><div class="group-title">Physical activity</div><p class="hintline">Point-of-care adaptation. Framingham also used daily activity and recreation questionnaires; these two questions are not its original scoring instrument.</p><div class="gridform">'+
 num('On how many days per week does the patient do moderate physical activity?','activityDays',7,'days/week',false)+
 num('On those days, about how many minutes are spent being active?','activityPerDay',300,'minutes/day',false)+
 '<div class="field"><label id="activityMinutesLabel">Estimated activity per week</label><div class="derived-text-value" role="status" aria-labelledby="activityMinutesLabel" data-state="pending"><span id="activityMinutesDisplay" class="derived-main placeholder">Not yet calculated</span><span class="calc-flag" id="activityMinutesFlag" hidden>Calculated</span><input id="activityMinutes" name="activityMinutes" type="hidden" value="'+esc(v('activityMinutes'))+'"></div></div>'+
 sel('Typical walking pace','walkingPace',[['','Not recorded'],['Slow','Slow'],['Average','Average'],['Brisk','Brisk'],['Unable','Unable to walk']],v('walkingPace'))+
 '</div></div><div class="question-group"><div class="group-title">Diet and nutrition</div><p class="hintline">Dietary answers are recorded as reported. They do not produce a validated diet score or a calculated sodium intake.</p><div class="gridform">'+
 num('How many servings of fruits and vegetables does the patient usually eat daily?','fruitVeg',25,'servings/day',false,'0.5')+
 num('How many servings of whole-grain foods does the patient usually eat daily?','wholeGrain',20,'servings/day',false,'0.5')+
 sel('How often does the patient add salt or salty condiments to prepared food?','saltFrequency',[['','Not recorded'],['Rarely','Rarely'],['Sometimes','Sometimes'],['Often','Often']],v('saltFrequency'))+
 sel('How often does the patient eat packaged or heavily processed food?','processedFood',[['','Not recorded'],['Rarely','Rarely'],['Sometimes','Sometimes'],['Often','Often']],v('processedFood'))+
 '</div></div><div class="question-group"><div class="group-title">Family and social history</div><div class="gridform">'+
 sel('Has a parent or sibling been diagnosed with heart disease or stroke?','family',ynu,v('family'))+
 sel('What is the highest level of schooling the patient has completed?','education',[['','Not recorded'],['No formal education','No formal schooling'],['Primary','Elementary / primary school'],['Secondary','High school / secondary school'],['Vocational','Vocational / technical training'],['Tertiary','College / university'],['Postgraduate','Postgraduate studies'],['Prefer not to say','Prefer not to say']],v('education'))+
 sel('Current employment status','employment',[['','Not recorded'],['Employed','Employed'],['Self-employed','Self-employed'],['Unemployed','Unemployed'],['Student','Student'],['Retired','Retired'],['Other','Other'],['Prefer not to say','Prefer not to say']],v('employment'))+
 '</div></div></div>'+
 '<div class="derived-panel" aria-live="polite"><div><b>Assessment input summary</b><p>Derived values update as you complete measurements and questions.</p></div><div class="derived-grid"><div><span>BMI</span><strong id="previewBmi">—</strong></div><div><span>Alcohol intake</span><strong id="previewAlcohol">Not yet calculated</strong></div><div><span>Physical activity</span><strong id="previewActivity">Not yet calculated</strong></div></div></div>'+
 '<p class="hintline">Clinical measurements and core questions are based on the Framingham risk-prediction inputs. Supplementary interview questions are adapted for PINTIG; their final model use depends on verification against the PURE Philippines dictionary.</p>'+
 '<div class="actions"><button class="btn primary" type="submit">Review 10-year risk result →</button>'+b('Clear assessment','resetAssessment')+'</div></form></section>';
}
// Illustrative engine, not an actual learned competing-risk forest.
function simulate(x,p){let bmi=+x.bmi,years=age(p.dob),parts=[['Age',(years-45)*.0024],['Systolic blood pressure',(+x.sbp-120)*.0007],['Body mass index',(bmi-24)*.001],['Current smoking',x.currentSmoking==='Yes'?.034:0],['Antihypertensive medication history',x.bpMeds==='Yes'?.014:0]];
if(x.mode==='extended'){
 if(x.activityMinutes!=='')parts.push(['Weekly activity',+x.activityMinutes<150?.012:+x.activityMinutes>=300?-.008:0]);
 if(x.alcoholDrinks!=='')parts.push(['Weekly alcohol intake',Math.max(0,+x.alcoholDrinks-7)*.00075]);
 if(x.family==='Yes')parts.push(['Family history',.009]);
 if(x.education==='Primary'||x.education==='No formal education')parts.push(['Educational attainment',.006]);
}
let risk=Math.max(.008,Math.min(.35,.033+parts.reduce((a,z)=>a+z[1],0)+(p.sex==='Male'?.008:0)));return{risk,bmi,parts:parts.sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]))};}

// Guidance rules are applied independently of the illustrative risk engine.
// Versioned rule IDs and recorded triggers make every suggestion auditable.
const GUIDANCE_VERSION='GUIDE-RULES-1.0';
function generateGuidance(x,p){
 const items=[];
 const add=(id,title,trigger,steps,priority='standard')=>items.push({id,title,trigger,steps,priority});
 const sbp=Number(x.sbp),dbp=Number(x.dbp),bmi=Number(x.bmi);
 if(sbp>=180||dbp>=120){
  add('BP-URGENT','Repeat and escalate markedly elevated blood pressure',`Recorded blood pressure ${sbp}/${dbp} mmHg`,
  'Repeat the measurement after ensuring correct cuff size and technique. Arrange prompt clinician assessment according to the facility protocol. If the patient has chest pain, severe shortness of breath, new neurological symptoms, or other acute symptoms, follow emergency response procedures.','priority');
 } else if(sbp>=140||dbp>=90){
  add('BP-REVIEW','Arrange blood pressure review',`Recorded blood pressure ${sbp}/${dbp} mmHg`,
  'Repeat the measurement after a seated rest, document both readings, and arrange follow-up with a qualified healthcare professional to evaluate persistently elevated measurements.','priority');
 } else if(sbp>=130||dbp>=80){
  add('BP-MONITOR','Monitor blood pressure',`Recorded blood pressure ${sbp}/${dbp} mmHg`,
  'Review measurement technique and encourage repeat measurements at subsequent visits. Discuss reducing excess sodium and maintaining regular physical activity where appropriate.');
 }
 if(x.currentSmoking==='Yes')add('TOBACCO','Offer smoking-cessation support','Current smoking: Yes','Ask about readiness to quit, offer brief cessation counselling, help identify a quit date when the patient is ready, and discuss locally available tobacco-cessation services.','priority');
 if(x.bpMeds==='Yes')add('MED-REVIEW','Review existing blood pressure treatment','Blood pressure medication: Yes','Confirm that the medication list is accurate and encourage a clinician-led review of adherence, side effects, and recorded blood pressure. Do not change medication or doses using this assessment.');
 if(bmi>=25)add('BMI','Discuss weight-related lifestyle support',`Recorded BMI: ${bmi.toFixed(1)} kg/m²`,'Discuss achievable eating and activity habits that fit the patient’s circumstances, and arrange a broader nutritional assessment where appropriate. Avoid treating BMI alone as a diagnosis.');
 if(x.mode==='extended'){
  const activity=x.activityMinutes===''?NaN:Number(x.activityMinutes),drinks=x.alcoholDrinks===''?NaN:Number(x.alcoholDrinks);
  if(Number.isFinite(activity)&&activity<150)add('ACTIVITY','Build a sustainable activity routine',`Physical activity: ${activity} minutes/week`,'Ask about mobility and current activity, then discuss a gradual increase in suitable moderate-intensity activities such as walking. A commonly used adult goal is 150 minutes weekly when clinically appropriate.');
  if(Number.isFinite(drinks)&&drinks>0)add('ALCOHOL','Review alcohol consumption',`Reported alcohol: ${drinks} drinks/week`,'Discuss current drinking patterns and opportunities to reduce intake. Avoid recommending alcohol for cardiovascular protection. Offer additional support if controlling intake is difficult.');
  if(x.saltFrequency==='Often'||x.processedFood==='Often')add('DIET-SALT','Review salty and processed foods','Frequent use of salty condiments or processed foods','Discuss practical ways to reduce added salt and compare packaged food labels. Consider a dietitian-led assessment if appropriate.');
  if(x.fruitVeg!==''&&Number(x.fruitVeg)<3)add('DIET-PRODUCE','Discuss fruit and vegetable intake',`Reported intake: ${x.fruitVeg} servings/day`,'Ask about access and preferences, then discuss affordable ways to add fruits and vegetables to regular meals.');
  if(x.family==='Yes')add('FAMILY','Review cardiovascular family history','Family history of CVD: Yes','Clarify which relatives were affected and the approximate ages at diagnosis, then discuss whether additional clinician-led cardiovascular evaluation is appropriate.');
 }
 if(!items.length)add('PREVENTION','Continue preventive risk-factor reviews','No additional rule thresholds triggered','Continue routine assessment of blood pressure, tobacco exposure, activity, diet and other applicable risk factors at future healthcare visits.');
 return items;
}
function guidanceHtml(items){return '<div class="guidance-grid">'+items.map((g,i)=>'<article class="guidance-item"><div class="guidance-no">'+String(i+1).padStart(2,'0')+'</div><div><div class="guidance-title">'+esc(g.title)+(g.priority==='priority'?' <span class="tag high">Follow-up priority</span>':'')+'</div><p class="guidance-trigger"><b>Based on:</b> '+esc(g.trigger)+'</p><p class="guidance-body">'+esc(g.steps)+'</p></div></article>').join('')+'</div>'}
function storedGuidance(r){return Array.isArray(r.guidanceRules)?r.guidanceRules:(r.inputs&&P(r.pid)?generateGuidance(r.inputs,P(r.pid)):[])}
function resultPage(){let r=S.result,p=P(r.pid),guid=r.guidanceRules||generateGuidance(r.inputs,p);r.guidanceRules=guid;
return head('Assessment Result',p.record+' · 10-year assessment',b('← New Assessment','nav:New Risk Assessment'))+
'<div class="identity-context">'+patientIdent(p)+'</div><div class="notice warn"><b>Model status:</b> Preview calculation — the PURE-trained competing-risk RSF is not connected. This probability is not suitable for clinical decisions.</div>'+
'<div class="twocol"><div class="panel"><div class="eyebrow">Estimated 10-year major cardiovascular event risk</div><div class="risk">'+(r.risk*100).toFixed(1)+'%</div>'+tag(r.band)+'<div class="progress"><div style="width:'+Math.min(100,r.risk*250)+'%"></div></div>'+
'<div class="threshold-box"><div class="threshold-title">Risk Classification Thresholds</div><div class="threshold-grid">'+
'<div class="threshold-item'+(r.band==="Low"?' active':'')+'"><span class="label">Low</span><span class="range">&lt; 5%</span></div>'+
'<div class="threshold-item'+(r.band==="Moderate"?' active':'')+'"><span class="label">Moderate</span><span class="range">5% to &lt; 10%</span></div>'+
'<div class="threshold-item'+(r.band==="High"?' active':'')+'"><span class="label">High</span><span class="range">10% to &lt; 20%</span></div>'+
'<div class="threshold-item'+(r.band==="Very High"?' active':'')+'"><span class="label">Very High</span><span class="range">≥ 20%</span></div>'+
'</div></div>'+
'<h3>Target outcome</h3><p class="tiny">First myocardial infarction, stroke, heart failure, or cardiovascular death within 10 years. The intended model considers competing non-cardiovascular mortality.</p></div>'+
'<div class="panel"><h2>Factors associated with this estimate</h2><p class="muted tiny">These factors describe the calculation used for the displayed estimate; they do not establish cause and effect.</p>'+r.parts.slice(0,7).map(([n,v])=>'<div class="factor"><div class="row"><span>'+esc(n)+'</span><b>'+(v>=0?'+':'')+(v*100).toFixed(2)+' points</b></div><div class="progress"><div style="width:'+Math.min(100,Math.abs(v)*1300)+'%"></div></div></div>').join('')+'</div></div>'+
'<section class="panel"><div class="section-divider"><h2>General Educational Guidance</h2><span class="tag">Condition-based guidance</span></div><p class="muted">Practical follow-up topics selected from the recorded assessment. Recommendations come from transparent rules, not the prediction model; the rule set requires expert review before clinical deployment.</p>'+guidanceHtml(guid)+'<p class="tiny muted">Guidance rules: '+GUIDANCE_VERSION+' · The risk category is not used as a medication or referral threshold.</p></section>'+
 '<div class="panel"><h2>Recorded assessment inputs</h2><div class="threecol">'+
 [['Age at assessment',r.ageAtAssessment+' years'],['Sex',p.sex],['Currently smokes',r.inputs.currentSmoking],['BP medication',r.inputs.bpMeds],['Systolic BP',r.inputs.sbp+' mmHg'],['Diastolic BP',r.inputs.dbp+' mmHg'],['BMI',r.inputs.bmi+' kg/m²'],['History of diabetes diagnosis',r.inputs.diabetesHistory||'Not recorded'],['Activity',r.inputs.mode==='extended'&&r.inputs.activityMinutes!==''?r.inputs.activityMinutes+' minutes/week':'Not recorded'],['Alcohol intake',r.inputs.mode==='extended'&&r.inputs.alcoholDrinks!==''?r.inputs.alcoholDrinks+' drinks/week':'Not recorded'],['Fruit and vegetables',r.inputs.mode==='extended'&&r.inputs.fruitVeg!==''?r.inputs.fruitVeg+' servings/day':'Not recorded'],['Whole grains',r.inputs.mode==='extended'&&r.inputs.wholeGrain!==''?r.inputs.wholeGrain+' servings/day':'Not recorded'],['Added salt',r.inputs.mode==='extended'?(r.inputs.saltFrequency||'Not recorded'):'Not recorded'],['Family history',r.inputs.mode==='extended'?(r.inputs.family||'Not recorded'):'Not recorded'],['Education',r.inputs.mode==='extended'?(r.inputs.education||'Not recorded'):'Not recorded']].map(([k,v])=>'<div class="snapshot"><strong>'+esc(k)+'</strong>'+esc(v)+'</div>').join('')+'</div></div>'+
'<div class="panel"><h2>Assessment details</h2><div class="threecol"><div class="snapshot"><strong>Patient</strong>'+p.record+'</div><div class="snapshot"><strong>Age at assessment</strong>'+r.ageAtAssessment+' years</div><div class="snapshot"><strong>Prediction horizon</strong>10 years</div><div class="snapshot"><strong>Calculation version</strong>ILLUSTRATIVE-0.2</div><div class="snapshot"><strong>Guidance version</strong>'+GUIDANCE_VERSION+'</div><div class="snapshot"><strong>Assessment mode</strong>'+esc(r.inputs.mode==='extended'?'Extended input set':'Core input set')+'</div></div><div class="actions">'+(r.saved?tag('Saved assessment'):b('Save assessment snapshot','saveAssessment','primary'))+b('Assessment History','nav:Assessment History')+b('Print','print')+'</div></div>'}
function history(){
 const list=records.filter(r=>{let p=P(r.pid);return(p.record+' AST-'+r.id).toLowerCase().includes(S.query.trim().toLowerCase())&&(S.filter==='All'||r.band===S.filter)});
 return head('Assessment History','Review preserved previous assessment records.')+
 '<section class="panel"><div class="toolbar pintig-table-filters" role="search" aria-label="Filter assessment history">'+
 '<input class="search" type="search" id="historySearch" placeholder="Patient record or assessment ID" aria-label="Search assessment history" value="'+esc(S.query)+'">'+
 '<select id="historyCategory" class="search" style="max-width:180px" aria-label="Risk category">'+['All','Low','Moderate','High','Very High'].map(a=>'<option '+(S.filter===a?'selected':'')+'>'+a+'</option>').join('')+'</select>'+b('Clear','clearHistory')+'</div>'+
 '<div id="historyLiveResults" class="pintig-live-results"><div class="pintig-count">'+list.length+' of '+records.length+' assessments</div>'+recordsTable(list)+'</div></section>';
}
function recordPage(){let r=records.find(x=>x.id===S.historyId);if(!r)return history();let p=P(r.pid);return head('Assessment AST-'+String(r.id).padStart(4,'0'),p.record+' · Saved assessment',b('← History','nav:Assessment History'))+'<div class="identity-context">'+patientIdent(p)+'</div><div class="notice">Assessment record • Saved values are preserved for future review.</div><div class="twocol"><div class="panel"><div class="eyebrow">Ten-year estimate</div><div class="risk">'+(r.risk*100).toFixed(1)+'%</div>'+tag(r.band)+'</div><div class="panel"><h2>Record metadata</h2><p>Assessment date: '+dt(r.date)+'<br>Assessor: '+esc(U(r.uid)?.name||'Unknown')+'<br>Model version: '+esc(r.model)+'</p></div></div><div class="panel"><h2>Saved predictor snapshot</h2><div class="threecol">'+Object.entries(r.inputs).map(([key,value])=>'<div class="snapshot"><strong>'+esc(key)+'</strong>'+esc(value)+'</div>').join('')+'</div><h3>Stored explanation</h3><p>'+esc(r.explanation)+'</p><h3>General Educational Guidance</h3>'+(storedGuidance(r).length?guidanceHtml(storedGuidance(r)):'<p>'+esc(r.guidance)+'</p>')+'<div class="actions">'+b('Print record','print')+b('Back','nav:Assessment History')+'</div></div>'}
function usersPage(){
 const filtered=users.filter(u=>{
  const matchText=(u.name+' '+u.email).toLowerCase().includes(S.userQuery.trim().toLowerCase());
  const matchRole=S.userRole==='All'||u.role===S.userRole;
  const matchStatus=S.userStatus==='All'||(S.userStatus==='Active'?u.active:!u.active);
  return matchText&&matchRole&&matchStatus;
 });
 return head('User and Access Management','Manage authorized healthcare worker accounts.',b('+ Add healthcare worker','newUser','primary'))+
 '<div class="panel"><div class="toolbar pintig-table-filters" role="search" aria-label="Filter user accounts">'+
 '<input class="search" id="userSearch" type="search" aria-label="Search user accounts" placeholder="Search name or email" value="'+esc(S.userQuery)+'">'+
 '<select class="search" id="userRole" aria-label="Filter by user role"><option value="All">All roles</option><option value="admin" '+(S.userRole==='admin'?'selected':'')+'>Administrator</option><option value="worker" '+(S.userRole==='worker'?'selected':'')+'>Healthcare Worker</option></select>'+
 '<select class="search" id="userStatus" aria-label="Filter by account status">'+['All','Active','Inactive'].map(v=>'<option '+(S.userStatus===v?'selected':'')+'>'+v+'</option>').join('')+'</select>'+b('Clear','clearUsers')+'</div>'+
 '<div id="userLiveResults" class="pintig-live-results"><div class="pintig-count">'+filtered.length+' of '+users.length+' accounts</div>'+
 '<div class="tablewrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+filtered.map(u=>'<tr><td>'+esc(u.name)+'</td><td>'+esc(u.email)+'</td><td>'+(u.role==='admin'?'Administrator':'Healthcare Worker')+'</td><td>'+tag(u.active?'Active':'Inactive')+'</td><td><button class="link" data-act="editUser:'+u.id+'">Edit</button> '+(u.id===S.user.id?'':'· <button class="link" data-act="toggleUser:'+u.id+'">'+(u.active?'Deactivate':'Activate')+'</button>')+'</td></tr>').join('')+'</tbody></table></div>'+
 (filtered.length?'':'<div class="empty">No accounts match these filters.</div>')+'</div></div>';
}
function userForm(){let u=U(S.editUser)||{};return head(u.id?'Edit User Account':'Register Healthcare Worker','Demo account updates are session-only.',b('← User Accounts','nav:User Accounts'))+'<div class="panel"><form id="userForm"><div class="gridform">'+f('Full name','name',u.name,'text',true)+f('Email','email',u.email,'email',true)+sel('Access role','role',u.id?['admin','worker']:['worker'],u.role||'worker')+f(u.id?'New password (optional)':'Temporary password','pass','','text',!u.id)+'</div><div class="actions"><button class="btn primary" type="submit">Save account</button>'+b('Cancel','nav:User Accounts')+'</div></form></div>'}
function audit(){
 const categories=['All','Sign-in / sign-out','Patient records','Assessments','Account changes','Other activity'];
 const typeOf=action=>/login|logged out/i.test(action)?categories[1]:/patient|identity/i.test(action)?categories[2]:/assessment|risk estimate/i.test(action)?categories[3]:/user|account|healthcare worker/i.test(action)?categories[4]:categories[5];
 const filtered=logs.filter(l=>(l.when+' '+l.user+' '+l.action).toLowerCase().includes(S.auditQuery.trim().toLowerCase())&&(S.auditType==='All'||typeOf(l.action)===S.auditType));
 return head('Audit Logs','Review account access and record activity.')+
 '<div class="panel"><div class="toolbar pintig-table-filters" role="search" aria-label="Filter audit logs">'+
 '<input class="search" id="auditSearch" type="search" aria-label="Search audit logs" value="'+esc(S.auditQuery)+'" placeholder="Search user or activity">'+
 '<select class="search" id="auditType" aria-label="Activity type">'+categories.map(c=>'<option '+(c===S.auditType?'selected':'')+'>'+c+'</option>').join('')+'</select>'+b('Clear','clearAudit')+'</div>'+
 '<div id="auditLiveResults" class="pintig-live-results"><div class="pintig-count">'+filtered.length+' of '+logs.length+' activities</div>'+
 '<div class="tablewrap"><table><thead><tr><th>Time</th><th>User</th><th>Action</th></tr></thead><tbody>'+filtered.map(l=>'<tr><td>'+esc(l.when)+'</td><td>'+esc(l.user)+'</td><td>'+esc(l.action)+'</td></tr>').join('')+'</tbody></table></div>'+
 (filtered.length?'':'<div class="empty">No activities match these filters.</div>')+'</div></div>';
}
function reportRows(){
 const text=S.reportQuery.trim().toLowerCase();
 if(S.report==='Patients')return patients.filter(p=>(p.record+' '+p.facility).toLowerCase().includes(text));
 return records.filter(r=>{
  const p=P(r.pid);const match=('AST-'+r.id+' '+(p?.record||'')).toLowerCase().includes(text);
  return match&&(S.reportCategory==='All'||r.band===S.reportCategory);
 });
}
function reports(){
 const rows=reportRows();
 const total=S.report==='Patients'?patients.length:records.length;
 return head('Reports','Patient and assessment summaries.')+'<div class="panel">'+
 sel('Report type','reportType',[['Patients','Registered Patients'],['Assessments','Risk Assessments']],S.report)+
 '<div class="toolbar pintig-table-filters" role="search" aria-label="Filter report records">'+
 '<input class="search" type="search" id="reportSearch" aria-label="Search report records" placeholder="Search patient or assessment record" value="'+esc(S.reportQuery)+'">'+
 '<select id="reportCategory" class="search" aria-label="Risk category" '+(S.report==='Patients'?'disabled title="Risk categories apply to assessment reports"':'')+'>'+['All','Low','Moderate','High','Very High'].map(x=>'<option '+(x===S.reportCategory?'selected':'')+'>'+x+'</option>').join('')+'</select>'+b('Clear filters','clearReport')+'</div>'+
 '<div class="actions">'+b('Export CSV','exportCSV')+b('Print','print')+'</div>'+
 '<div id="reportLiveResults" class="pintig-live-results"><div class="separator"></div><h2>'+(S.report==='Patients'?'Registered Patients':'Risk Assessments')+'</h2><div class="cards">'+metric('Matching records',rows.length)+'</div>'+
 '<div class="pintig-count">'+rows.length+' of '+total+' records</div>'+
 '<div class="tablewrap"><table><thead><tr>'+(S.report==='Patients'?'<th>Patient record</th><th>Identity</th><th>Sex</th><th>Facility</th>':'<th>Assessment</th><th>Patient record</th><th>10-year risk</th><th>Category</th>')+'</tr></thead><tbody>'+
 (S.report==='Patients'?rows.map(p=>'<tr><td>'+p.record+'</td><td>'+patientIdent(p,false)+'</td><td>'+esc(p.sex)+'</td><td>'+esc(p.facility)+'</td></tr>').join(''):rows.map(r=>'<tr><td>AST-'+r.id+'</td><td>'+patientIdent(P(r.pid))+'</td><td>'+(r.risk*100).toFixed(1)+'%</td><td>'+esc(r.band)+'</td></tr>').join(''))+'</tbody></table></div>'+
 (rows.length?'':'<div class="empty">No records match these filters.</div>')+
 '<div class="identity-notice">Exports include record identifiers, not patient names or PhilHealth numbers.</div></div></div>';
}
function maintenance(){return head('Maintenance','Manage system data exports and review operational information.')+'<div class="twocol"><div class="panel"><h2>Export de-identified system records</h2><p class="muted">Export a JSON copy without patient names, dates of birth, contact details, or PhilHealth identifiers.</p>'+b('Export records','backup','primary')+'</div><div class="panel"><h2>Service availability</h2><p>Browser application: Running<br>Database: Session memory only<br>RSF service: Not connected<br>Model version: ILLUSTRATIVE-0.2</p></div></div>'}
function help(){return head('Help Center','Guidance for system features and workflows.')+'<div class="panel"><div class="actions">'+b('User Guide','help:guide')+b('FAQs','help:faq')+'</div><div class="separator"></div>'+(S.help==='guide'?'<h2>Quick workflow</h2><p>1. Open Patient Management and locate a patient by record number. Use the eye icon to verify the name only when needed.<br>2. Choose New Risk Assessment, confirm eligibility, record clinic measurements, and complete the guided interview.<br>3. Generate a 10-year risk estimate and review its risk category.<br>4. Save the assessment and retrieve it from Assessment History.<br>5. Use role switching to review administrator-only tools.</p><p class="tiny muted">Question design references Framingham Heart Study Generation 3 Exam 1 forms; wording is adapted for PINTIG. <a href="https://www.framinghamheartstudy.org/files/2017/08/Gen-3-Exam-1.pdf" target="_blank" rel="noopener noreferrer">View study examination forms ↗</a></p>':'<h2>Frequently asked questions</h2><p><b>Is this a trained RSF system?</b> No; the live system uses only an illustrative calculation.</p><p><b>Can I use real patient information?</b> No. The current browser version does not provide secure clinical data storage; use non-identifying records until secure deployment.</p><p><b>What does PhilHealth PIN do?</b> It is an optional profile identifier and not an integration with PhilHealth.</p>')+'</div>'}
function about(){return head('About PINTIG','System overview, methodology and limitations.')+'<section class="panel"><h2>Predictive Intelligence for Non-Laboratory Ten-Year Individualized Grouping of Major Cardiovascular Event Risk Using Random Survival Forest</h2><p>A proposed web-based, explainable, non-laboratory cardiovascular risk-stratification research system for eligible adults.</p><div class="threecol">'+[['Outcome','First MI, stroke, heart failure, or cardiovascular death'],['Prediction horizon','10 years'],['Population','Baseline ages 35–70'],['Competing event','Qualifying non-cardiovascular death'],['Final data source','PURE Philippines cohort (planned)'],['Risk categories','Low, Moderate, High, Very High']].map(([a,c])=>'<div class="snapshot"><strong>'+a+'</strong>'+c+'</div>').join('')+'</div><h3>Planned three-tier architecture</h3><p>React / TypeScript / Vite → Python FastAPI → R randomForestSRC competing-risk RSF and PostgreSQL with SQLAlchemy/Alembic.</p><div class="notice warn">Current model status: the risk calculation is illustrative; a validated RSF model and clinical deployment controls are not yet connected.</div></section>'}
function account(){return head('My Account','Your account details and session settings.')+'<div class="panel"><p><b>Name:</b> '+esc(S.user.name)+'</p><p><b>Email:</b> '+esc(S.user.email)+'</p><p><b>Role:</b> '+(S.user.role==='admin'?'System Administrator':'Healthcare Worker')+'</p>'+b('Sign out','logout','danger')+'</div>'}
// Refresh only the results region; the active search box and caret are never replaced.
function updateLiveFilters(){
 const configs={
  'Patient Management':['patientLiveResults',patientsPage],
  'Assessment History':['historyLiveResults',history],
  'User Accounts':['userLiveResults',usersPage],
  'Audit Logs':['auditLiveResults',audit],
  'Reports':['reportLiveResults',reports]
 };
 const cfg=configs[S.page];if(!cfg)return;
 const target=$(cfg[0]);if(!target)return;
 const template=document.createElement('template');template.innerHTML=cfg[1]();
 const updated=template.content.querySelector('#'+cfg[0]);if(!updated)return;
 target.innerHTML=updated.innerHTML;
 const count=target.querySelector('.pintig-count')?.textContent||'Results updated';
 const announcement=$('pintigLiveAnnouncement');if(announcement)announcement.textContent=count;
}
function render(){if(!S.user){$('root').innerHTML=login();return}let nav=S.user.role==='admin'?adminNav:workerNav,p=S.page,body=p==='Dashboard'?dashboard():p==='Patient Management'?(S.editPatient!==null?patientForm():S.patientId?patientDetails():patientsPage()):p==='New Risk Assessment'?(S.result?resultPage():assessment()):p==='Assessment History'?(S.historyId?recordPage():history()):p==='User Accounts'?(S.editUser!==null?userForm():usersPage()):p==='Audit Logs'?audit():p==='Reports'?reports():p==='Maintenance'?maintenance():p==='Help'?help():p==='About'?about():account();$('root').innerHTML='<div class="app"><aside class="sidebar"><div class="logo"><span>♥</span>PINTIG</div><div class="brand-subtitle">Major Cardiovascular Risk<br>Assessment System</div><small>WORKSPACE</small>'+nav.map(n=>'<button type="button" class="nav-button '+(n===p?'active':'')+'" data-act="nav:'+n+'">'+icons[n]+' &nbsp; '+n+'</button>').join('')+'<div class="userinfo"><div class="identity-caption">SIGNED IN AS</div><div class="identity-name">'+esc(S.user.name)+'</div><div class="identity-role">'+(S.user.role==='admin'?'System Administrator':'Healthcare Worker')+'</div>'+b('Sign out','logout')+'</div></aside><div class="appmain"><header class="topbar"><div class="muted tiny">PINTIG / '+esc(p)+'</div><div class="actions top-actions" style="margin:0"><span class="tiny">'+esc(S.user.name)+'</span>'+b('Switch role','switchRole')+'</div></header><main class="maincontent">'+(S.message?'<div class="feedback '+(S.error?'error':'')+'" role="status">'+esc(S.message)+'</div>':'')+body+'<div id="pintigLiveAnnouncement" class="pintig-sr-only" role="status" aria-live="polite" aria-atomic="true"></div></main><footer class="footer">PINTIG • Cardiovascular Risk Assessment & Decision Support</footer></div></div>';S.message='';if(p==='New Risk Assessment'&&!S.result)updateQuestionnaire()}
function download(file,body,mime){let url=URL.createObjectURL(new Blob([body],{type:mime})),a=document.createElement('a');a.href=url;a.download=file;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
function updateQuestionnaire(){
 const form=$('assessmentForm');if(!form)return;
 const get=k=>form.elements[k]?.value??'';
 const set=(k,val)=>{if(form.elements[k])form.elements[k].value=val};
 const h=Number(get('height')),w=Number(get('weight'));
 const bmiInput=form.elements.bmi, bmiResult=$('bmiReadout');
 const bmiAuto=get('height')!==''&&get('weight')!==''&&Number.isFinite(h)&&Number.isFinite(w)&&h>0&&w>0;
 if(bmiAuto){
   const computed=(w/Math.pow(h/100,2)).toFixed(1);
   set('bmi',computed);
   bmiInput.hidden=true;
   if(bmiResult)bmiResult.hidden=false;
   if($('bmiDisplay'))$('bmiDisplay').textContent=computed+' kg/m²';
 } else {
   if(form.dataset.bmiAutofilled==='true')set('bmi','');
   bmiInput.hidden=false;
   if(bmiResult)bmiResult.hidden=true;
 }
 form.dataset.bmiAutofilled=String(bmiAuto);
 const b=get('bmi');if($('previewBmi'))$('previewBmi').textContent=b?b+' kg/m²':'Not yet provided';
 if(get('alcoholUse')==='No'){set('alcoholDays','0');set('drinksPerDay','0');}
 const alc=(get('alcoholDays')!==''&&get('drinksPerDay')!=='')?(+get('alcoholDays')*+get('drinksPerDay')).toFixed(1):'';
 set('alcoholDrinks',alc);
 if($('alcoholDrinksDisplay')){
   const display=$('alcoholDrinksDisplay'), container=display.closest('.derived-text-value');
   display.textContent=alc!==''?Number(alc).toFixed(1)+' drinks/week':'Not yet calculated';
   display.classList.toggle('placeholder',alc==='');
   container.dataset.state=alc!==''?'complete':'pending';
   $('alcoholDrinksFlag').hidden=alc==='';
 }
 if($('previewAlcohol'))$('previewAlcohol').textContent=get('mode')==='observed'?'Not included':alc!==''?Number(alc).toFixed(1)+' drinks/week':'Not yet calculated';
 const act=(get('activityDays')!==''&&get('activityPerDay')!=='')?String(Math.round(+get('activityDays')*+get('activityPerDay'))):'';
 set('activityMinutes',act);
 if($('activityMinutesDisplay')){
   const display=$('activityMinutesDisplay'), container=display.closest('.derived-text-value');
   display.textContent=act!==''?act+' min/week':'Not yet calculated';
   display.classList.toggle('placeholder',act==='');
   container.dataset.state=act!==''?'complete':'pending';
   $('activityMinutesFlag').hidden=act==='';
 }
 if($('previewActivity'))$('previewActivity').textContent=get('mode')==='observed'?'Not included':act!==''?act+' min/week':'Not yet calculated';
 if($('extraQuestionnaire'))$('extraQuestionnaire').hidden=get('mode')==='observed';
}
document.addEventListener('paste',e=>{
 if(e.target.id!=='phone')return;
 const pasted=e.clipboardData?.getData('text')||'';
 if(!pasted)return;
 e.preventDefault();
 const el=e.target, val=phoneDigits(pasted).slice(0,10);
 el.value=val;
 el.dispatchEvent(new Event('input',{bubbles:true}));
});
document.addEventListener('input',e=>{
 if(e.target.id==='phone'){
   const el=e.target;
   const cleaned=phoneDigits(el.value).slice(0,10);
   if(cleaned!==el.value)el.value=cleaned;

 }
 const stateKey={patientQuery:'query',historySearch:'query',userSearch:'userQuery',auditSearch:'auditQuery',reportSearch:'reportQuery'}[e.target.id];
 if(stateKey&&S.user){S[stateKey]=e.target.value;S.revealedId=null;updateLiveFilters();}
 if(e.target.closest('#assessmentForm'))updateQuestionnaire()
});
document.addEventListener('change',e=>{
 const id=e.target.id;
 const stateKey={historyCategory:'filter',userRole:'userRole',userStatus:'userStatus',auditType:'auditType',reportCategory:'reportCategory'}[id];
 if(stateKey&&S.user){S[stateKey]=e.target.value;S.revealedId=null;updateLiveFilters();return;}
 if(id==='reportType'&&S.user){S.report=e.target.value;S.reportCategory='All';const cat=$('reportCategory');if(cat){cat.value='All';cat.disabled=S.report==='Patients';}S.revealedId=null;updateLiveFilters();return;}
 if(e.target.id==='pid'){const p=P(e.target.value);const dob=$('patientDob'),a=$('patientAge'),sex=$('patientSex');if(dob)dob.textContent=p?dt(p.dob):'—';if(a)a.textContent=p?age(p.dob)+' years':'—';if(sex)sex.textContent=p?p.sex:'—';S.revealedId=null;const ident=$('assessmentIdentity');if(ident)ident.innerHTML=patientIdent(p);}if(e.target.closest('#assessmentForm'))updateQuestionnaire();});
document.addEventListener('click',e=>{let el=e.target.closest('[data-act]');if(!el)return;let raw=el.dataset.act,i=raw.indexOf(':'),action=i<0?raw:raw.slice(0,i),arg=i<0?'':raw.slice(i+1);if(action==='revealIdentity'){
 const p=P(arg);
 if(!canReveal(p)){log('Denied patient identity reveal attempt');msg('You do not have permission to view that identity.',true);return render()}
 const ass=$('assessmentForm'), appScroll=document.querySelector('.appmain')?.scrollTop||0,sideScroll=document.querySelector('.sidebar')?.scrollTop||0;
 if(ass){updateQuestionnaire();S.draft=Object.fromEntries(new FormData(ass).entries());S.patientId=+(ass.elements.pid?.value||0)||null;}
 const showing=S.revealedId!==p.id;S.revealedId=showing?p.id:null;
 if(showing)log('Patient identity revealed: '+p.record);else log('Patient identity hidden: '+p.record);
 render();const sc=document.querySelector('.appmain'),side=document.querySelector('.sidebar');if(sc)sc.scrollTop=appScroll;if(side)side.scrollTop=sideScroll;
 let el=document.querySelector('[data-act="revealIdentity:'+p.id+'"]');if(el)el.focus({preventScroll:true});return;
}if(action==='adminDemo'||action==='workerDemo'){const email=$('email'),pass=$('password');if(email&&pass){email.value=action==='adminDemo'?'admin@pintig.demo':'worker@pintig.demo';pass.value=action==='adminDemo'?'Admin123!':'Worker123!'}return}if(action==='forgot'){S.reset=true;return render()}if(action==='backLogin'){S.reset=false;S.message='';return render()}if(action==='logout'||action==='switchRole'){
 const switchRole=action==='switchRole';
 openPintigConfirm({
  title:switchRole?'Switch account?':'Sign out?',
  description:switchRole?'You will be signed out of your current account and returned to the sign-in page.':'You will be signed out of PINTIG and returned to the sign-in page.',
  actionLabel:switchRole?'Switch account':'Sign out',
  onConfirm:()=>{log('Logged out');S.revealedId=null;S.user=null;S.patientId=null;S.historyId=null;S.result=null;S.draft=null;S.editPatient=null;S.editUser=null;S.page='Dashboard';render();}
 });return;
}if(action==='nav'){S.revealedId=null;S.patientId=null;return go(arg)}if(action==='newPatient'){S.page='Patient Management';S.patientId=null;S.editPatient=0;return render()}if(action==='editPatient'){S.page='Patient Management';S.patientId=null;S.editPatient=+arg;return render()}if(action==='openPatient'){S.revealedId=null;S.page='Patient Management';S.patientId=+arg;S.editPatient=null;return render()}if(action==='assessPatient'){S.revealedId=null;S.patientId=+arg;S.page='New Risk Assessment';S.result=null;S.draft=null;return render()}if(action==='searchPatient'){S.revealedId=null;S.query=$('patientQuery').value;return render()}if(action==='clearPatient'){S.revealedId=null;S.query='';return render()}if(action==='filterHistory'){S.revealedId=null;S.query=$('historySearch').value;S.filter=$('historyCategory').value;return render()}if(action==='clearHistory'){S.revealedId=null;S.query='';S.filter='All';return render()}if(action==='record'){S.revealedId=null;S.page='Assessment History';S.historyId=+arg;return render()}if(action==='loadSample'){const form=$('assessmentForm');if(!form)return;const data={prior:'No',verified:'Yes',sbp:'132',dbp:'82',height:'168',weight:'71.4',waist:'88',currentSmoking:'No',bpMeds:'No',diabetesHistory:'No',pastBpMeds:'No',mode:'extended',alcoholUse:'Yes',alcoholDays:'1',drinksPerDay:'2',activityDays:'3',activityPerDay:'60',walkingPace:'Average',fruitVeg:'3',wholeGrain:'1',saltFrequency:'Sometimes',processedFood:'Sometimes',family:'No',education:'Secondary',employment:'Employed'};Object.entries(data).forEach(([k,v])=>{if(form.elements[k])form.elements[k].value=v});updateQuestionnaire();msg('Example interview responses loaded; review all fields before submitting.');let current=$('assessmentForm');if(current){let n=document.createElement('div');n.className='notice';n.setAttribute('role','status');n.textContent='Example responses loaded. Review values and patient before continuing.';current.prepend(n)}return}if(action==='resetAssessment'){openPintigConfirm({title:'Clear assessment?',description:'This will remove the information entered in the current assessment. Saved assessment records will not be affected.',actionLabel:'Clear',onConfirm:()=>{S.draft=null;S.result=null;msg('Assessment form cleared.');render();}});return}if(action==='saveAssessment'){if(!S.result||S.result.saved)return;let r=S.result,rec={id:Math.max(0,...records.map(x=>x.id))+1,pid:r.pid,uid:S.user.id,date:T(),risk:r.risk,band:r.band,model:'ILLUSTRATIVE-0.2',inputs:{...r.inputs,ageAtAssessment:r.ageAtAssessment,bmi:r.bmi.toFixed(1)},explanation:'Factors used in the estimate: '+r.parts.slice(0,4).map(x=>x[0]).join(', ')+'. Calculation-based explanation.',guidance: r.guidanceRules.map(g=>g.title+': '+g.steps).join('\n'),guidanceRules:r.guidanceRules.map(g=>({...g})),guidanceVersion:GUIDANCE_VERSION};records.push(rec);r.saved=true;log('Saved assessment AST-'+rec.id);msg('Assessment saved successfully.');return render()}if(action==='newUser'){S.editUser=0;return render()}if(action==='editUser'){S.editUser=+arg;return render()}if(action==='toggleUser'){let u=U(+arg);if(!u||u.id===S.user.id)return;if(u.active){openPintigConfirm({title:'Deactivate account?',description:'This user will no longer be able to sign in until the account is reactivated.',actionLabel:'Deactivate',onConfirm:()=>{u.active=false;log('Deactivated account: '+u.email);msg('User account deactivated.');render();}});return}u.active=true;log('Activated account: '+u.email);msg('User account activated.');return render()}if(action==='filterUsers'){S.userQuery=$('userSearch').value;S.userRole=$('userRole').value;S.userStatus=$('userStatus').value;return render()}
if(action==='clearUsers'){S.userQuery='';S.userRole='All';S.userStatus='All';return render()}
if(action==='filterAudit'){S.auditQuery=$('auditSearch').value;S.auditType=$('auditType').value;return render()}
if(action==='clearAudit'){S.auditQuery='';S.auditType='All';return render()}
if(action==='clearReport'){S.reportQuery='';S.reportCategory='All';return render()}
if(action==='generateReport'){S.revealedId=null;S.report=$('reportType').value;S.reportQuery=$('reportSearch').value;S.reportCategory=S.report==='Patients'?'All':$('reportCategory').value;return render()}
if(action==='exportCSV'){
 S.report=$('reportType').value;S.reportQuery=$('reportSearch').value;S.reportCategory=S.report==='Patients'?'All':$('reportCategory').value;
 const rows=reportRows();
 const arr=S.report==='Patients'?[['Patient record','Sex','Facility'],...rows.map(p=>[p.record,p.sex,p.facility])]:[['Assessment','Patient record','Risk','Category'],...rows.map(r=>['AST-'+r.id,P(r.pid)?.record||'',(r.risk*100).toFixed(1),r.band])];
 download('PINTIG_'+S.report+'.csv',arr.map(row=>row.map(c=>'"'+String(c).replaceAll('"','""')+'"').join(',')).join('\n'),'text/csv');
 msg(rows.length+' records exported.');return render()}
if(action==='backup'){download('PINTIG_Demo_Backup.json',JSON.stringify({users:users.map(({pass,...x})=>x),patients:patients.map(({first,middle,last,dob,locality,phone,pin,...rest})=>rest),records,logs},null,2),'application/json');log('Exported demo backup');msg('Demo backup downloaded.');return render()}if(action==='help'){S.help=arg;return render()}if(action==='print'){S.revealedId=null;render();return window.print()}});
document.addEventListener('submit',e=>{e.preventDefault();let form=e.target;if(form.id==='loginForm'){let email=$('email').value.trim().toLowerCase(),pass=$('password').value;let u=users.find(x=>x.email===email&&x.pass===pass&&x.active);if(!u){msg('Invalid email/password, or account is inactive.',true);return render()}S.user=u;S.page='Dashboard';S.message='';log('Successful demo login');return render()}if(form.id==='patientForm'){let d=Object.fromEntries(new FormData(form).entries()),existing=P(S.editPatient),pin=d.pin.trim();if(d.phone&&!/^9\d{9}$/.test(d.phone)){msg('Enter a valid Philippine mobile number: 10 digits beginning with 9, after +63.',true);return render()}d.phone=d.phone?'+63'+d.phone:'';if(!d.first.trim()||!d.last.trim()||!d.locality.trim()||!d.dob||new Date(d.dob)>new Date()){msg('Complete the required patient fields with a valid birth date.',true);return render()}if(pin&&!/^\d{12}$/.test(pin)){msg('Optional PhilHealth PIN should contain 12 digits in the demo.',true);return render()}if(pin&&patients.some(p=>p.pin===pin&&p.id!==existing?.id)){msg('PhilHealth PIN already assigned to another patient.',true);return render()}if(existing){Object.assign(existing,d);S.patientId=existing.id;log('Updated patient '+existing.record)}else{let id=Math.max(0,...patients.map(x=>x.id))+1;patients.push({id,record:'PNT-'+String(id).padStart(6,'0'),...d});S.patientId=id;log('Registered patient PNT-'+String(id).padStart(6,'0'))}S.editPatient=null;msg('Patient profile saved.');return render()}if(form.id==='userForm'){let d=Object.fromEntries(new FormData(form).entries()),u=U(S.editUser),email=d.email.trim().toLowerCase();if(!d.name.trim()||!email.includes('@')){msg('Enter valid user details.',true);return render()}if(users.some(x=>x.email===email&&x.id!==u?.id)){msg('Email already registered.',true);return render()}if(u){u.name=d.name;u.email=email;if(d.pass)u.pass=d.pass;log('Edited user account '+email)}else{if(d.pass.length<8){msg('Temporary password must be at least eight characters.',true);return render()}users.push({id:Math.max(...users.map(x=>x.id))+1,name:d.name,email,pass:d.pass,role:'worker',active:true});log('Created healthcare worker '+email)}S.editUser=null;msg('Account saved.');return render()}if(form.id==='assessmentForm'){
 updateQuestionnaire();let x=Object.fromEntries(new FormData(form).entries()),p=P(x.pid);S.patientId=p?.id||null;S.draft=x;
 const fail=message=>{msg(message,true);render()};
 if(!p)return fail('Choose a patient before starting the assessment.');
 if(age(p.dob)<35||age(p.dob)>70)return fail('The patient is outside the supported 35–70 baseline age range.');
 if(x.prior!=='No'||x.verified!=='Yes')return fail('Confirm patient eligibility and the absence of previous major-CVD events.');
 if(x.sbp===''||x.dbp===''||+x.sbp<70||+x.sbp>260||+x.dbp<40||+x.dbp>160||+x.dbp>=+x.sbp)return fail('Enter valid systolic and diastolic blood pressure readings.');
 if(x.bmi===''||+x.bmi<12||+x.bmi>65)return fail('Enter height and weight, or an existing verified BMI value.');
 if(!['Yes','No'].includes(x.currentSmoking))return fail('Confirm whether the patient currently smokes cigarettes.');
 if(!['Yes','No'].includes(x.bpMeds))return fail('Confirm whether the patient currently takes blood-pressure medication.');
 if(x.mode==='extended'){
  if(!['Yes','No'].includes(x.alcoholUse)||x.alcoholDays===''||x.drinksPerDay==='')return fail('Complete the alcohol-use questions, entering zero when appropriate.');
  if(x.activityDays===''||x.activityPerDay==='')return fail('Complete the weekly physical-activity questions, entering zero when appropriate.');
  if(+x.alcoholDays<0||+x.alcoholDays>7||+x.activityDays<0||+x.activityDays>7)return fail('Weekly activity and drinking days must be between 0 and 7.');
 } else {['alcoholUse','alcoholDays','drinksPerDay','alcoholDrinks','activityDays','activityPerDay','activityMinutes','walkingPace','fruitVeg','wholeGrain','saltFrequency','processedFood','family','education','employment'].forEach(k=>{x[k]=''});}
 let out=simulate(x,p);S.result={...out,pid:p.id,ageAtAssessment:age(p.dob),inputs:x,band:band(out.risk),saved:false};S.page='New Risk Assessment';S.message='';log('Calculated an illustrative cardiovascular risk estimate for '+p.record);return render();}
});
render();})();
