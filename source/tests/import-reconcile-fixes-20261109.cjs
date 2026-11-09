/* 6.10.110 — editable reconciliation / full-width grading sheet regression. */
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path');
const {loadApp}=require('./harness.cjs');
const app=loadApp(),ctx=app.ctx,S=ctx.SR63;
const settings=ctx.Aj().settings;
const studentId='31312345678',studentName='طالب تجريبي';
const template={
 id:'sheet-1',sheet:'العلوم - نهاية الفصل الأول',subject:'العلوم',exam:'exam2',selected:true,period:'نهاية الفصل الأول',
 scoreColumns:['الاختبار النظري','نهاية الفصل الأول','نشاط الطالب','العملي'].map((header,index)=>({key:String(index+3),index:index+3,header})),
 selectedScoreKey:'3',gradeColumns:{raw:'3',certificate:'4',activity:'5',practical:'6',secondTerm:''},rows:[
  {id:'source-1',sourceRow:6,studentId,studentName,className:'7/1',grade:'السابع',values:{
   '3':{score:32,status:'present',recognized:true,raw:'32'},
   '4':{score:37,status:'present',recognized:true,raw:'37'},
   '5':{score:55,status:'present',recognized:true,raw:'55'},
   '6':{score:4,status:'present',recognized:true,raw:'4'}
  }}
 ]};
let files=[{fileName:'grades.xlsx',sheets:[template],issues:[]}];
const initial=ctx.O9(files,settings);
assert.equal(initial.length,1);
assert.equal(initial[0].recognized,false,'Activity 55/50 must be rejected');
assert.equal(S.importReviewIssueDetails(files,initial,initial,{rows:[],students:[]},'exam2').length,1);
const replace=(change)=>S.importReviewChangeRow(files,'sheet-1','source-1',change);
const corrected=replace({kind:'grade',column:'5',field:'score',value:'45'});
assert.equal(files[0].sheets[0].rows[0].values['5'].score,55,'Original parse must remain unchanged');
assert.equal(corrected[0].sheets[0].rows[0].values['5'].score,45);
assert.equal(ctx.O9(corrected,settings)[0].recognized,true);
const names=S.importReviewChangeRow(corrected,'sheet-1','source-1',{kind:'identity',field:'studentName',value:'اسم مصحح'});
assert.equal(ctx.O9(names,settings)[0].studentName,'اسم مصحح');
const invalidName=S.importReviewChangeRow(corrected,'sheet-1','source-1',{kind:'identity',field:'studentName',value:''});
assert.equal(String(ctx.O9(invalidName,settings)[0].studentName).trim(),'');
const nonPresent=S.importReviewChangeRow(corrected,'sheet-1','source-1',{kind:'grade',column:'3',field:'status',value:'absent'});
assert.equal(nonPresent[0].sheets[0].rows[0].values['3'].status,'absent');
assert.equal(nonPresent[0].sheets[0].rows[0].values['3'].score,null);
assert.equal(ctx.O9(nonPresent,settings)[0].recognized,false,'An absent raw exam and an official present mark must remain a blocking contradiction');
const duplicate=structuredClone(corrected);
const row2={...structuredClone(duplicate[0].sheets[0].rows[0]),id:'source-2',sourceRow:7};
duplicate[0].sheets[0].rows.push(row2);
const duplicatedItems=ctx.O9(duplicate,settings);
const problem=S.importReviewIssueDetails(duplicate,duplicatedItems,[],{rows:[],students:[]},'exam2');
assert.equal(problem.length,2,'Both duplicate rows must be available for review');
assert.ok(problem.every(x=>x.reasons.some(r=>r.includes('مكررة'))));
const excluded=S.importReviewChangeRow(duplicate,'sheet-1','source-2',{kind:'exclude',value:true});
assert.equal(ctx.O9(excluded,settings).length,1,'Exclude only one pending row');
assert.equal(ctx.O9(duplicate,settings).length,2,'Exclusion never mutates original pending workbook');
const restored=S.importReviewChangeRow(excluded,'sheet-1','source-2',{kind:'exclude',value:false});
assert.equal(ctx.O9(restored,settings).length,2);
const stored={rows:[{studentId,studentName:'طالب باسم آخر'}],students:[]};
const collision=S.importReviewIssueDetails(corrected,ctx.O9(corrected,settings),[],stored,'exam2');
assert.ok(collision.some(i=>i.reasons.some(reason=>reason.includes('اسم مختلف'))),'Identity differences must surface in the review panel');
assert.throws(()=>S.importReviewChangeRow(files,'sheet-1','source-1',{kind:'grade',column:'999',field:'score',value:'2'}),/عمود الدرجة/);
const root=path.resolve(__dirname,'../..');
const build=fs.readFileSync(path.join(root,'source/build.cjs'),'utf8');
const page=fs.readFileSync(path.join(root,'app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
assert.ok(build.includes('sr-import-sheet-list'));
assert.ok(page.includes('ImportReconcileFixPanel')&&page.includes('sr-import-sheet-list'),'UI must render review and single-column cards');
assert.ok(css.includes('.sr-import-sheet-list')&&css.includes('.sr-import-fix-fields'),'Responsive import layout must be published');
console.log('PASS import reconciliation / editing invalid grade and identity, duplicate exclusion, legacy safety and full-width responsive sheet UI');
