/* 6.10.84 — ESE pupils must be included in the existing Level Analysis report
   by real grade and subject; no teacher assignment is required. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {ctx}=require('./harness.cjs').loadApp(),SR=ctx.SR63;
const settings=structuredClone(ctx.zj().settings);
settings.pass=50;
settings.exams=settings.exams.map((exam,index)=>index===0?{...exam,total:30,certificateTotal:15}:exam);
const exam='exam1';
const row=(id,name,klass,subject,mark,status='present',teacher='',other={})=>({
 id:'ese-'+id+'-'+subject,studentId:id,studentName:name,className:klass,grade:klass.startsWith('7')?'السابع':klass.startsWith('8')?'الثامن':'التاسع',
 subject,department:subject,teacher,
 examClasses:{exam1:klass},examTeachers:{exam1:teacher},scores:{exam1:mark},statuses:{exam1:status},
 totals:{exam1:30},...other
});
const all=[
 row('S71','طالب سابع أول','7/ESE','الرياضيات',14.5),
 row('S72','طالب سابع ثان','7/ESE','الرياضيات',14),
 row('S71','طالب سابع أول','7/ESE','اللغة العربية',20),
 row('S72','طالب سابع ثان','7/ESE','اللغة العربية',null,'unentered'),
 row('S81','طالب ثامن','8/ESE','الرياضيات',26),
 row('S91','طالب تاسع','9/ESE','العلوم',21),
 row('G1','طالب غير دمج','7/1','الرياضيات',30,'present','معلم الرياضيات')
];
const workspace={settings,rows:all,activeExam:exam};
const get=(grade='الكل',subject='الكل')=>SR.buildReportPages(workspace.rows,'support',grade,subject,'levels',exam,50,settings);
const pages=get();
assert.equal(pages.length,4,'two seventh subjects plus eighth and ninth');
assert.deepEqual(Array.from(pages,p=>p.className),['7/ESE','7/ESE','8/ESE','9/ESE']);
assert.deepEqual(Array.from(SR.supportLevelGradeChoices(all,exam)),['7/ESE','8/ESE','9/ESE']);
assert.equal(SR.supportLevelSubjectChoices(all,exam,settings).length,3);
for(const page of pages){
 assert.ok(page.supportLevel&&page.scope==='className');
 assert.equal(page.teacher,'','ESE teacher assignment must be optional');
 assert.equal(page.allRows.length,page.rows.length,'small cohort stays on one page');
 assert.equal(new Set(page.allRows.map(x=>SR.subjectAliasKey(x.subject))).size,1,'one subject per page');
 assert.ok(page.allRows.every(x=>SR.isSupportRow(x,exam)),'general pupils never leak into ESE reports');
 assert.equal(SR.normalizeReportPage(page,'levels',exam,workspace).rows.length,page.rows.length,'print scope must not drop ESE students without department assignment');
 assert.ok(SR.reportScopeAudit(page,'levels',exam).ok,'all ESE pages must pass scope audit');
}
const seventhMath=pages.find(p=>p.className==='7/ESE'&&SR.subjectAliasKey(p.subject)===SR.subjectAliasKey('الرياضيات'));
assert.ok(seventhMath);assert.equal(seventhMath.rows.length,2);
assert.deepEqual(Array.from(seventhMath.rows,r=>r.studentName).sort(),['طالب سابع أول','طالب سابع ثان'].sort());
const m=ctx.bj(seventhMath.allRows,exam,settings);
assert.equal(m.evaluated,2);assert.equal(m.passed,1);assert.equal(m.failed,1);
assert.equal(m.success,50);assert.ok(Math.abs(m.achievement-(14.5/30*100))<0.0001);
assert.equal(SR.certificateScore(seventhMath.rows.find(r=>r.studentId==='S71'),exam,settings).certificateScore,7.5);
const seventhArabic=pages.find(p=>p.className==='7/ESE'&&SR.subjectAliasKey(p.subject)===SR.subjectAliasKey('اللغة العربية'));
assert.ok(seventhArabic);assert.equal(seventhArabic.rows.length,2);
assert.equal(ctx.bj(seventhArabic.allRows,exam,settings).evaluated,1);
assert.equal(ctx.bj(seventhArabic.allRows,exam,settings).success,100);
assert.ok(SR.supportLevelReportPages(all,exam,'7/ESE','الرياضيات',settings).every(p=>p.className==='7/ESE'&&p.subject==='الرياضيات'));
assert.equal(get('7/ESE','الرياضيات').length,1);
assert.equal(get('8/ESE').length,1);assert.equal(get('9/ESE').length,1);
assert.deepEqual(Array.from(SR.buildReportPages(all,'className','7/1','الكل','levels',exam,50,settings).flatMap(p=>p.rows),r=>r.studentId),['G1'],'general report remains isolated from ESE');
const noSupport=SR.buildReportPages([all.at(-1)],'support','الكل','الكل','levels',exam,50,settings);
assert.equal(noSupport.length,0);
const u=fs.readFileSync(path.join(__dirname,'../src/patches/ui.js'),'utf8');
const r=fs.readFileSync(path.join(__dirname,'../src/reports.js'),'utf8');
for(const must of ['طلاب الدمج — حسب الصف والمادة','supportLevelGradeChoices','supportLevelSubjectChoices',"supportLevels=n===\`levels\`&&i===\`support\`"])assert.ok(u.includes(must),'ESE selector integration: '+must);
for(const must of ['sr684-ese-report-heading','نسبة نجاح المادة','نسبة تحصيل المادة','isSupport||row.statuses'])assert.ok(r.includes(must),'ESE report content: '+must);
console.log('PASS 6.10.84: ESE levels seventh/eighth/ninth, each subject, student names, teacher-free scope, original/certificate grades, success and achievement, no ESE/general mixing, print scope');
