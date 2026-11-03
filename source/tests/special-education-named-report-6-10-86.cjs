'use strict';
/* 6.10.86: department in academic structure «التربية الخاصة» must
   print student names and earned marks, not only department aggregates. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {ctx}=require('./harness.cjs').loadApp(),S=ctx.SR63;
const settings=JSON.parse(JSON.stringify(ctx.zj().settings)),exam='exam1';
settings.pass=50;
settings.exams=settings.exams.map((e,i)=>i===0?{...e,total:30,certificateTotal:15}:e);
const make=(id,name,klass,subject,score,status='present',department='التربية الخاصة',teacher='')=>({
 id:'se-'+id+'-'+subject,studentId:id,studentName:name,className:klass,
 grade:klass.startsWith('7')?'السابع':klass.startsWith('8')?'الثامن':'التاسع',
 subject,department,teacher,
 scores:{exam1:score},statuses:{exam1:status},totals:{exam1:30},
 examClasses:{exam1:klass},examTeachers:{exam1:teacher}
});
const special=[
 make('S71','طالبة سابع رياضيات','7/1','الرياضيات',14.5),
 make('S72','طالبة سابع أخرى','7/2','الرياضيات',14),
 make('S71','طالبة سابع رياضيات','7/1','اللغة العربية',23),
 make('S81','طالبة ثامن','8/3','الرياضيات',20),
 make('S91','طالبة تاسع','9/1','العلوم',25),
 make('ABS','طالبة غائبة','7/1','الرياضيات',null,'absent')
];
const ese=make('E71','طالبة دمج','7/ESE','الرياضيات',10,'present','الدعم الإضافي');
const ordinary=make('G11','طالب تعليم عام','7/1','الرياضيات',28,'present','الرياضيات','أستاذ الرياضيات');
const settingsCopy=JSON.parse(JSON.stringify(settings));
const list=[...special,ese,ordinary];
assert.equal(S.specialEducationRows(list,exam).length,special.length+1,'ESE and new academic department included');
assert.ok(!S.specialEducationRows([ordinary],exam).length,'general school pupils must never be added');
assert.deepEqual(Array.from(S.supportLevelGradeChoices(list,exam)),['7/ESE','8/ESE','9/ESE']);
assert.deepEqual(Array.from(S.supportLevelSubjectChoices(list,exam,settingsCopy)).sort(),['الرياضيات','اللغة العربية','العلوم'].sort());
const pages=S.buildReportPages(list,'grade','الكل','الكل','support',exam,50,settings);
assert.equal(pages.length,4,'seventh Arabic+Math, eighth Math, ninth Science');
assert.deepEqual(Array.from(new Set(pages.map(p=>p.gradeNo))),[7,8,9]);
for(const page of pages){
 assert.ok(page.supportLevel&&page.allRows.length,'named detail must always exist on report page');
 assert.ok(page.rows.every(row=>row.studentName&&S.specialEducationRows([row],exam).length),'every row is special-education pupil');
 assert.equal(new Set(page.allRows.map(row=>S.subjectAliasKey(row.subject))).size,1);
 const normalized=S.normalizeReportPage(page,'support',exam,{settings,rows:list});
 assert.equal(normalized.rows.length,page.rows.length,'print normalization cannot erase pupil rows');
 assert.equal(normalized.allRows.length,page.allRows.length);
 assert.ok(S.reportScopeAudit(page,'support',exam).ok,'correct normalized printable cohort scope');
}
const math=pages.find(p=>p.gradeNo===7&&S.subjectAliasKey(p.subject)===S.subjectAliasKey('الرياضيات'));
assert.ok(math);assert.deepEqual(Array.from(math.allRows,r=>r.studentName).sort(),
 ['طالبة سابع رياضيات','طالبة سابع أخرى','طالبة غائبة','طالبة دمج'].sort());
assert.equal(math.scope,'subject','mixed ESE and structure-driven special department scopes by subject');
assert.equal(math.allRows.length,4);
assert.equal(ctx.bj(math.allRows,exam,settings).evaluated,3);
assert.equal(ctx.bj(math.allRows,exam,settings).passed,1);
assert.equal(S.certificateScore(math.allRows.find(r=>r.studentId==='S71'),exam,settings).certificateScore,7.5,'ceiling half-mark conversion remains correct');
assert.equal(S.reportScoreHeaderMax(math.allRows,exam,settings),'30');
assert.equal(S.reportScoreHeaderMax(math.allRows,exam,settings,'certificate'),'15');
assert.equal(S.buildReportPages(list,'grade','8/ESE','الكل','support',exam,50,settings).length,1);
assert.equal(S.buildReportPages(list,'grade','السابع','الكل','support',exam,50,settings).length,2);
assert.equal(S.buildReportPages(list,'support','الكل','الرياضيات','levels',exam,50,settings).length,2);
assert.equal(S.buildReportPages([ordinary],'grade','الكل','الكل','support',exam,50,settings).length,0);
const departmentWorkspace={settings,rows:special,activeExam:exam};
const byDepartment=S.buildReportPages(departmentWorkspace.rows,'grade','الكل','الكل','support',exam,50,settings);
assert.equal(byDepartment.length,4);
assert.equal(byDepartment.flatMap(p=>p.rows).length,special.length,'department coordinator does not drop unentered or unassigned pupils');
assert.ok(byDepartment.every(p=>!p.rows.some(r=>r.studentId==='G11')),'school-wide data must not leak');
const large=Array.from({length:50},(_,i)=>make('N'+i,'طالبة خاصة '+i,'7/1','الرياضيات',i%20));
const continuations=S.buildReportPages(large,'grade','7/ESE','الكل','support',exam,50,settings);
assert.deepEqual(Array.from(continuations,p=>p.rows.length),[22,22,6]);
assert.equal(continuations.reduce((n,p)=>n+p.rows.length,0),50,'A4 pages retain all named pupils');
const ui=fs.readFileSync(path.join(__dirname,'../src/patches/ui.js'),'utf8'),
  reports=fs.readFileSync(path.join(__dirname,'../src/reports.js'),'utf8'),
  styles=fs.readFileSync(path.join(__dirname,'../src/repair.css'),'utf8');
for(const needle of ['specialEducationAvailable','التربية الخاصة — كشف الطلاب بالأسماء',"n==='support'||n==='levels'&&i==='support'",'supportLevelGradeChoices'])
 assert.ok(ui.includes(needle),'report center must expose real special education roster '+needle);
for(const needle of ['sr686-special-table','sr686-student-name','اسم الطالب','درجة الاختبار','الدرجة في الشهادة','row.studentName','SR63.supportLevelReportPages(rows,exam'])
 assert.ok(reports.includes(needle),'report must show named students and marks '+needle);
assert.ok(!reports.includes('نتائج طلاب الدمج مستقلة بالكامل'),'no misleading general-school exclusion for structure-defined department');
assert.ok(styles.includes('.sr686-special-table .sr686-student-name strong'));
console.log('PASS 6.10.86: academic التربية الخاصة + ESE, names and marks on support reports, 7/8/9 per subject, 50-name pagination, coordinator scope, no absent zeroing, no unrelated students, certificate ceilings');
