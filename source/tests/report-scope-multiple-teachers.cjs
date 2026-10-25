'use strict';
const assert=require('node:assert/strict');
const {loadApp}=require('./harness.cjs');
const {ctx}=loadApp(),ws=ctx.zj(),exam='exam4',subject='اللغة العربية';
const seed=ws.rows.find(r=>r.subject===subject&&r.className==='7/1');
assert.ok(seed);
const rows=Array.from({length:18},(_,i)=>({...seed,id:'synthetic-'+i,studentId:'S-'+i,
 studentName:'طالب تجريبي '+i,teacher:i%2?'معلم ب':'معلم أ',
 examTeachers:{...seed.examTeachers,[exam]:i%2?'معلم ب':'معلم أ'}}));
for(const mode of ['summary','levels','comparison','teachers']){
 const pages=ctx.SR63.buildReportPages(rows,'className','7/1',subject,mode,exam,50,ws.settings);
 assert.ok(pages.length);
 const normalized=pages.map(p=>ctx.SR63.normalizeReportPage(p,mode,exam,ws));
 assert.equal(normalized.reduce((sum,p)=>sum+p.rows.length,0),18,mode+': a joined teacher label must not erase student rows');
 for(const p of normalized){assert.equal(p.allRows.length,18);assert.equal(ctx.SR63.reportScopeAudit(p,mode,exam).ok,true);}
}
const teacherPage={scope:'teacher',entity:'معلم أ',teacher:'معلم أ',className:'7/1',subject,rows,allRows:rows};
const scoped=ctx.SR63.normalizeReportPage(teacherPage,'summary',exam,ws);
assert.equal(scoped.rows.length,9,'real teacher scope must remain enforced');
const classPage={scope:'className',entity:'7/1',className:'7/1',teacher:'معلم أ، معلم ب',subject,
 rows:[...rows,{...rows[0],id:'other-class',className:'8/1',examClasses:{...seed.examClasses,[exam]:'8/1'}},
 {...rows[0],id:'other-subject',subject:'الرياضيات'}],allRows:rows};
assert.equal(ctx.SR63.normalizeReportPage(classPage,'summary',exam,ws).rows.length,18,'class and subject scopes remain enforced');
for(const count of [10,18,28,40,80]){
 const data=Array.from({length:count},(_,i)=>({...rows[i%rows.length],id:'case-'+i,studentId:'case-'+i}));
 const pages=ctx.SR63.buildReportPages(data,'className','7/1',subject,'comparison',exam,50,ws.settings);
 assert.equal(pages.length,Math.ceil(count/40));
 const output=Array.from(pages).flatMap(p=>Array.from(ctx.SR63.normalizeReportPage(p,'comparison',exam,ws).rows));
 assert.deepEqual(output.map(r=>r.id),data.map(r=>r.id));
 assert.equal(new Set(output.map(r=>r.id)).size,count);
}
console.log('PASS: multiple-teacher class rows preserved; teacher/class/subject scopes enforced; 10/18/28/40/80 comparisons preserve every student');
