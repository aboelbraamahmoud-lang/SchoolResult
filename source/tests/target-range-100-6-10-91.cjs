'use strict';
/* 6.10.91: regress 100%-heavy PE classes and existing report/print boundaries. */
const assert=require('node:assert/strict');
const {ctx}=require('./harness.cjs').loadApp(),S=ctx.SR63,ws=ctx.zj();
ws.activeExam='exam1';
ws.rows=[];
const classes=['7/1','8/1','9/1'];
for(const klass of classes){
 const grade=klass[0]==='7'?'السابع':klass[0]==='8'?'الثامن':'التاسع';
 const teacher='معلم البدنية '+klass;
 const make=(suffix,score,status='present',total=20)=>({
  id:klass+'-'+suffix,studentId:'S'+klass+'-'+suffix,
  studentName:'طالب اختبار '+klass+' '+suffix,
  className:klass,examClasses:{exam1:klass},grade,subject:'بدنية',department:'بدنية',teacher,
  examTeachers:{exam1:teacher},scores:{exam1:score},totals:{exam1:total},
  statuses:{exam1:status}
 });
 for(let i=0;i<20;i++)ws.rows.push(make('full-'+i,20));
 for(let i=0;i<2;i++)ws.rows.push(make('high-'+i,19));
 ws.rows.push(make('low',17.8));
 ws.rows.push(make('absent',null,'absent'));
}
const range=S.studentPercentRange({min:90,max:100});
assert.equal(range.error,'');
assert.equal(S.percentInRange(100,range),true,'perfect score must be included');
assert.equal(S.percentInRange(95,range),true);
assert.equal(S.percentInRange(89,range),false);
assert.equal(S.percentInRange(100.001,range),false,'never count invalid higher than 100');
assert.equal(S.percentInRange(90,S.studentPercentRange({min:80,max:90})),false,'normal bounds remain upper-exclusive');
assert.equal(S.percentInRange(100,S.studentPercentRange({min:0,max:100})),true);
const pages=S.buildReportPages(ws.rows,'className','الكل','بدنية','struggling','exam1',range,ws.settings);
assert.equal(pages.length,3);
for(const p of pages){
 assert.ok(classes.includes(p.className));
 assert.equal(p.rows.length,22,p.className+' must show 20 perfect + 2 high scorers');
 assert.equal(p.rows.filter(x=>x.scores.exam1===20).length,20);
 assert.ok(p.rows.every(x=>x.subject==='بدنية'&&x.statuses.exam1==='present'));
 const component=ctx.SRTargetRangeReport({page:p,exam:'exam1',threshold:range,workspace:ws});
 assert.ok(component,'report renders with 100% scores');
}
assert.equal(pages.flatMap(p=>p.rows).length,66,'66 of 69 scored PE students should be included');
const byTeacher=S.buildReportPages(ws.rows,'teacher','الكل','بدنية','struggling','exam1',range,ws.settings);
assert.equal(byTeacher.length,3);
assert.equal(byTeacher.flatMap(p=>p.rows).length,66,'teacher report uses identical upper bound');
assert.equal(S.buildReportPages(ws.rows,'className','الكل','بدنية','struggling','exam1',{min:99,max:100},ws.settings).flatMap(p=>p.rows).length,60);
assert.equal(S.buildReportPages(ws.rows,'className','الكل','بدنية','struggling','exam1',{min:90,max:95},ws.settings).flatMap(p=>p.rows).length,0,'95 is excluded from non-100 upper bound');
assert.equal(S.buildReportPages(ws.rows,'className','الكل','بدنية','struggling','exam1',{min:0,max:100},ws.settings).flatMap(p=>p.rows).length,69,'all valid scores including full 100');
console.log('PASS 6.10.91: PE reports include all 100% students in every class and teacher; 100-inclusive, ordinary upper-exclusive, absent excluded, no duplicates');
