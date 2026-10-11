const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {loadApp}=require('./harness.cjs');
const c=loadApp().ctx,SR=c.SR63;
let passed=0;
function test(title,fn){try{fn();console.log('PASS '+title);passed++;}catch(error){console.error('FAIL '+title,error.stack);process.exitCode=1;}}
const row=(id,name,cls,subject,score,status='present')=>({id:`${id}-${subject}`,studentId:id,studentName:name,className:cls,grade:c.uj(cls),subject,teacher:'معلم',
 scores:{exam1:score,exam2:null,exam3:null,exam4:null},statuses:{exam1:status,exam2:'unentered',exam3:'unentered',exam4:'unentered'},
 totals:{exam1:20,exam2:30,exam3:40,exam4:40},examTeachers:{exam1:'معلم'},examClasses:{exam1:cls}});
const make=()=>{const w=c.Aj();w.rows=[row('1111111111','اسم خاص ١','7/1','رياضيات',8),row('2222222222','اسم خاص ٢','7/1','رياضيات',15),row('3333333333','اسم خاص ٣','7/1','رياضيات',null,'absent'),row('4444444444','اسم خاص ٤','7/ESE','رياضيات',5)];return w;};
const filters={exam:'exam1',mode:'group',cohort:'general',subject:'رياضيات',grade:'الكل',className:'الكل',level:'below60'};
test('individual privacy envelope omits real academic identifiers and names',()=>{const w=make(),obj=SR.aiPlanRequest(w,{...filters,mode:'individual',studentId:'1111111111'},SR.aiPlanDefaults);assert.equal(obj.members.length,1);assert.equal(obj.evidence.participants,1);const outbound=JSON.stringify({evidence:obj.evidence});for(const word of ['1111111111','اسم خاص','2222222222','studentName','studentId'])assert.ok(!outbound.includes(word),word);});
test('general cohort excludes ESE and targets weak students only',()=>{const o=SR.aiPlanRequest(make(),filters,SR.aiPlanDefaults);assert.equal(o.evidence.participants,1);assert.equal(o.members[0].studentId,'1111111111');assert.equal(o.evidence.distribution.under50,1);});
test('ESE cohort is isolated',()=>{const o=SR.aiPlanRequest(make(),{...filters,cohort:'support'},SR.aiPlanDefaults);assert.equal(o.members.length,1);assert.equal(o.members[0].className,'7/ESE');});
test('missing grades are not zeros or weak-score diagnosis',()=>{const o=SR.aiPlanRequest(make(),{...filters,level:'all'},SR.aiPlanDefaults);assert.equal(o.evidence.participants,3);assert.equal(o.evidence.assessed,2);assert.equal(o.evidence.distribution.unscored,1);assert.equal(o.evidence.statusSummary.absent,1);});
test('safe notes scrub email and academic numbers',()=>{const o=SR.aiPlanRequest(make(),filters,{...SR.aiPlanDefaults,skillNotes:'مراجعة الطالب 9999999990 user@school.edu تحتاج الكسور'});assert.ok(!JSON.stringify(o.evidence).includes('9999999990'));assert.ok(!JSON.stringify(o.evidence).includes('user@school.edu'));});
test('manual plan is explicitly distinguished and has one activity per week',()=>{const req=SR.aiPlanRequest(make(),filters,SR.aiPlanDefaults);const plan=SR.aiPlanManualDraft(req.evidence);assert.equal(plan.steps.length,4);assert.ok(plan.cautions.includes('ليست خطة مولدة'));});
test('a draft saves under workspace without changing student results',()=>{const w=make(),r=SR.aiPlanRequest(w,filters,SR.aiPlanDefaults),next=SR.aiPlanCreate(w,r,SR.aiPlanManualDraft(r.evidence));assert.equal(next.aiPlans.length,1);assert.equal(next.aiPlans[0].status,'draft');assert.equal(next.rows.length,4);assert.equal(next.rows[0].scores.exam1,8);assert.equal(w.aiPlans.length,0);});
test('approval requires responsible name and completion requires all steps',()=>{const w=make(),r=SR.aiPlanRequest(w,filters,SR.aiPlanDefaults),s=SR.aiPlanCreate(w,r,SR.aiPlanManualDraft(r.evidence)),id=s.aiPlans[0].id;assert.throws(()=>SR.aiPlanUpdate(s,id,{status:'approved'}));const approved=SR.aiPlanUpdate(s,id,{status:'approved',approvedBy:'منسق'});assert.equal(approved.aiPlans[0].status,'approved');assert.throws(()=>SR.aiPlanUpdate(approved,id,{status:'completed'}));const updated=SR.aiPlanUpdate(approved,id,{steps:approved.aiPlans[0].steps.map(x=>({...x,completed:true,followUp:'78%'}))});assert.equal(SR.aiPlanUpdate(updated,id,{status:'completed'}).aiPlans[0].status,'completed');});
test('tampering cannot update arbitrary fields or drop plan steps',()=>{const w=make(),r=SR.aiPlanRequest(w,filters,SR.aiPlanDefaults),s=SR.aiPlanCreate(w,r,SR.aiPlanManualDraft(r.evidence)),id=s.aiPlans[0].id;assert.throws(()=>SR.aiPlanUpdate(s,id,{members:[]}));assert.throws(()=>SR.aiPlanUpdate(s,id,{steps:[]}));});
test('AI response without measurable actions is rejected',()=>{const r=SR.aiPlanRequest(make(),filters,SR.aiPlanDefaults);assert.throws(()=>SR.aiPlanNormalize({title:'x',steps:[{action:'شرح'}]},r.evidence));});
test('approved AI plans survive workspace validation and restoration',()=>{const w=make(),r=SR.aiPlanRequest(w,filters,SR.aiPlanDefaults),saved=SR.aiPlanCreate(w,r,SR.aiPlanManualDraft(r.evidence));saved.aiPlanSettings={...SR.aiPlanDefaults,weeks:6};const checked=c.LN(saved).workspace;assert.equal(checked.aiPlans.length,1);assert.equal(checked.aiPlans[0].title,saved.aiPlans[0].title);assert.equal(checked.aiPlanSettings.weeks,6);});
test('UI / secure gateway wiring and quota migration are present',()=>{const root=path.join(__dirname,'../..'),app=fs.readFileSync(path.join(root,'app.js'),'utf8'),edge=fs.readFileSync(path.join(root,'supabase/functions/school-ai-plans/index.ts'),'utf8'),sql=fs.readFileSync(path.join(__dirname,'../db/migrations/6.10.16_ai_quota.sql'),'utf8');assert.ok(app.includes('الخطط العلاجية الذكية'));assert.ok(app.includes("functions.invoke('school-ai-plans'"));assert.ok(edge.includes('GEMINI_API_KEY'));assert.ok(edge.includes('school_ai_take_quota'));assert.ok(sql.includes('SECURITY DEFINER'));assert.ok(!app.includes('GEMINI_API_KEY'));});
test('Gemini setup page has secret-only input and separate save test status actions',()=>{
 const root=path.join(__dirname,'../..'),ui=fs.readFileSync(path.join(root,'source/src/ai-plans-ui.js'),'utf8'),runtime=fs.readFileSync(path.join(root,'app.js'),'utf8');
 for(const op of ['connection_save','connection_test','connection_status'])assert.ok(ui.includes(op),op);
 assert.ok(ui.includes("type:'password'"));
 assert.ok(ui.includes("setApiKey('')"));
 assert.ok(!runtime.includes('SUPABASE_SERVICE_ROLE_KEY'));
 assert.ok(!runtime.includes('school_ai_vault_action'));
});
test('Vault migration locks secret table and restricts privileged RPC',()=>{
 const root=path.join(__dirname,'../..'),sql=fs.readFileSync(path.join(root,'source/db/migrations/6.10.17_ai_vault.sql'),'utf8');
 assert.match(sql,/vault\.create_secret/);
 assert.match(sql,/vault\.decrypted_secrets/);
 assert.match(sql,/REVOKE ALL ON TABLE public\.school_ai_credentials FROM PUBLIC, anon, authenticated/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.school_ai_vault_action[\s\S]*FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.school_ai_vault_action[\s\S]*TO service_role/);
});
test('server authenticates owner before exposing config actions, test calls Gemini',()=>{
 const root=path.join(__dirname,'../..'),edge=fs.readFileSync(path.join(root,'supabase/functions/school-ai-plans/index.ts'),'utf8');
 assert.ok(edge.indexOf(".eq('owner_id',auth.user.id)")<edge.indexOf("action=String(data?.action"));
 assert.ok(edge.includes("vault('save'"));assert.ok(edge.includes("vault('read'"));
 assert.ok(edge.includes("connection_test"));assert.ok(edge.includes('x-goog-api-key'));
});
console.log('AI plans tests: '+passed+'/15');
