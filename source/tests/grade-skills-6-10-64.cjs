'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {loadApp}=require('./harness.cjs');
const {ctx:c}=loadApp(),SR=c.SR63;
const cases=[];const check=(name,cb)=>{try{cb();cases.push(name)}catch(error){throw Error(name+': '+error.stack)}};
const src=fs.readFileSync(path.join(__dirname,'../src/grade-review.js'),'utf8');
const engine=fs.readFileSync(path.join(__dirname,'../src/engine.js'),'utf8');
const portal=fs.readFileSync(path.join(__dirname,'../src/staff.js'),'utf8');
check('legacy workspace without skill records remains valid',()=>{const ws=c.zj();assert.ok(ws.rows.length);assert.ok(c.LN(ws).workspace.rows.length>0);});
const ws=c.zj(),r=ws.rows.find(row=>row.studentId&&row.subject),exam='exam1';
assert.ok(r,'demo student grade record exists');
const max=c.pj(r,exam,ws.settings),half=Math.round(max*50)/100,remaining=Math.round(max*100)/100-half;
const skillInput=[{name:'القراءة',max:half,score:Math.min(half,Math.round(half*100)/100)},{name:'التطبيق',max:remaining,score:Math.min(remaining,Math.round(remaining*75)/100)}];
const request=extras=>({rowId:r.id,subject:r.subject,className:r.examClasses?.[exam]||r.className,studentId:r.studentId,studentName:r.studentName,status:'present',score:r.scores?.[exam]??0,skillScores:skillInput,...extras});
SR.cloud.setAccess({role:'owner',username:'supervisor'});
let output;
check('sum of individual skills becomes exam score, other exams unchanged',()=>{
 output=SR.gradeReviewApply(ws,exam,request());
 const next=output.rows.find(row=>row.id===r.id);
 const expected=Math.round(skillInput.reduce((sum,item)=>sum+item.score,0)*100)/100;
 assert.equal(next.scores[exam],expected);
 assert.equal(next.scores.exam2,r.scores.exam2);
 assert.equal(next.skillScores[exam].length,2);
 assert.equal(next.statuses[exam],'present');
 assert.notStrictEqual(next,ws.rows.find(row=>row.id===r.id));
});
check('audit stores before, after, skill breakdown and responsible admin',()=>{
 const record=output.auditLog[0];
 assert.equal(record.action,'تعديل درجات المهارات');
 assert.equal(record.actor.role,'owner');
 assert.equal(record.actor.username,'supervisor');
 assert.ok(record.changes?.some(item=>item.rowId===r.id&&item.fields.skillScores&&item.fields.scores),'audit includes both totals and skills');
 assert.ok(c.LN(output).workspace.rows.length===ws.rows.length,'validated workspace persists skill grades');
});
check('reject skill maxima sum not matching exam ceiling',()=>assert.throws(()=>SR.gradeReviewApply(ws,exam,request({skillScores:[{name:'القراءة',max:half,score:half}]})),/مجموع الدرجات العظمى/));
check('reject skill mark above maximum',()=>assert.throws(()=>SR.gradeReviewApply(ws,exam,request({skillScores:[{...skillInput[0],score:half+1},skillInput[1]]})),/تتجاوز/));
check('reject negative, missing, nonfinite and precision beyond two decimals',()=>{
 for(const score of [-1,'',null,'NaN','Infinity',1.234])assert.throws(()=>SR.gradeReviewApply(ws,exam,request({skillScores:[{...skillInput[0],score},skillInput[1]]})));
});
check('reject duplicates and overly long skill names',()=>{
 assert.throws(()=>SR.gradeReviewApply(ws,exam,request({skillScores:[skillInput[0],{...skillInput[1],name:skillInput[0].name}]})),/مكرر/);
 assert.throws(()=>SR.gradeReviewApply(ws,exam,request({skillScores:[{...skillInput[0],name:'x'.repeat(81)},skillInput[1]]})));
});
check('existing skill grades cannot be silently overwritten manually',()=>{
 const changed={...request(),score:0};delete changed.skillScores;
 assert.throws(()=>SR.gradeReviewApply(output,exam,changed),/محسوبة من المهارات/);
});
check('changing one skill records adjustment even when exam total is unchanged',()=>{
 const original=output.rows.find(x=>x.id===r.id),entry=original.skillScores[exam];
 if(entry[0].score<.01||entry[1].score+.01>entry[1].max)return;
 const shifted=[{...entry[0],score:entry[0].score-.01},{...entry[1],score:entry[1].score+.01}];
 const revised=SR.gradeReviewApply(output,exam,request({skillScores:shifted}));
 assert.equal(revised.rows.find(x=>x.id===r.id).scores[exam],original.scores[exam]);
 assert.equal(revised.auditLog[0].action,'تعديل درجات المهارات');
});
check('cannot bypass sum via forged uploaded workspace',()=>{
 const invalid=structuredClone(output),entry=invalid.rows.find(x=>x.id===r.id);
 entry.scores[exam]=Math.min(max,entry.scores[exam]+.5);
 assert.throws(()=>c.LN(invalid),/مجموع درجات المهارات/);
 const invalidMax=structuredClone(output);invalidMax.rows.find(x=>x.id===r.id).skillScores[exam][0].max=max+5;
 assert.throws(()=>c.LN(invalidMax),/مجموع الدرجات العظمى/);
});
check('blocked coordinator, principal and vice cannot write skill grades',()=>{
 for(const role of ['coordinator','principal','vice_principal']){
  SR.cloud.setAccess({role,username:'staff'});
  assert.throws(()=>SR.gradeReviewApply(ws,exam,request()),/الإدارة المخولة/);
 }
 SR.cloud.setAccess({role:'admin',username:'admin_user'});
 assert.equal(SR.gradeReviewApply(ws,exam,request()).auditLog[0].actor.role,'admin');
});
check('restore normal status by clearing a skill breakdown and its score',()=>{
 SR.cloud.setAccess({role:'owner',username:'supervisor'});
 const cleared=SR.gradeReviewApply(output,exam,request({status:'absent',score:''}));
 const next=cleared.rows.find(x=>x.id===r.id);
 assert.equal(next.scores[exam],null);
 assert.equal(next.skillScores[exam],null);
 assert.equal(next.statuses[exam],'absent');
 assert.equal(c.LN(cleared).workspace.rows.length,ws.rows.length);
});
check('read-only staff portal keeps no grade edit entry or save route',()=>{
 assert.doesNotMatch(portal,/StudentGradeReview/);
 assert.doesNotMatch(portal,/gradeReviewApply\(/);
 assert.match(portal,/isLeadership/);
 assert.match(engine,/SR63.gradeSkillNormalize\(row.skillScores\[exam\],total\)/);
 assert.match(src,/sr613-skill-editor/);
});
console.log('PASS SchoolResult 6.10.64 skill sum, ceilings, audit, overwrite lock, legacy compatibility and staff permissions: '+cases.length+' checks');
