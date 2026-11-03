/* 6.10.85 — grouped A4 outputs and suppression of personal identifiers. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {ctx}=require('./harness.cjs').loadApp(),S=ctx.SR63;
const base=ctx.zj(),settings=structuredClone(base.settings),exam='exam1';
settings.pass=50;settings.exams=settings.exams.map((e,i)=>i===0?{...e,total:30,certificateTotal:15}:e);
const make=(name,id,className,subject,teacher,score,status='present',rawTotal=30)=>({
 id:'audit-'+id+'-'+className+'-'+subject,
 studentName:name,studentId:id,grade:/^7/.test(className)?'السابع':/^8/.test(className)?'الثامن':'التاسع',
 className,subject,department:subject,teacher,
 scores:{exam1:score},statuses:{exam1:status},totals:{exam1:rawTotal},
 examClasses:{exam1:className},examTeachers:{exam1:teacher}
});
const rows=[
 make('طالب سابع أول','70000000001','7/1','الرياضيات','أ. سالم',14),
 make('طالب سابع ثان','70000000002','7/2','الرياضيات','أ. سالم',14.5),
 make('طالب سابع ثالث','70000000003','7/3','الرياضيات','أ. أحمد',11),
 make('طالب سابع عربي','70000000004','7/1','اللغة العربية','أ. سالم',12),
 make('طالب ثامن رياضيات','80000000001','8/1','الرياضيات','أ. سالم',8),
 make('طالب تاسع أول','90000000001','9/1','العلوم','أ. أحمد',9),
 make('طالب ناجح','70000000005','7/1','الرياضيات','أ. سالم',25),
 make('طالب غائب','70000000006','7/2','الرياضيات','أ. سالم',null,'absent'),
 make('طالب دمج','70000000999','7/ESE','الرياضيات','الدعم الإضافي',8)
];
const range={min:0,max:50};
const build=(dim,entity='الكل',subject='الكل',dataset=rows)=>
 S.buildReportPages(dataset,dim,entity,subject,'struggling',exam,range,settings);
const gradePages=build('gradeGroup');
assert.equal(gradePages.length,4,'seventh mathematics and Arabic, eighth and ninth');
assert.deepEqual(Array.from(new Set(gradePages.map(p=>p.grade))),['السابع','الثامن','التاسع']);
const math=gradePages.find(p=>p.grade==='السابع'&&p.subject==='الرياضيات');
assert.equal(math.rows.length,3,'all seventh failing-range marks across classes collected');
assert.deepEqual(Array.from(math.rows,r=>r.studentName).sort(),['طالب سابع أول','طالب سابع ثان','طالب سابع ثالث'].sort());
assert.equal(S.reportScoreHeaderMax(math.allRows,exam,settings), '30');
assert.equal(S.reportScoreHeaderMax(math.allRows,exam,settings,'certificate'), '15');
assert.equal(S.certificateScore(math.rows.find(r=>r.studentName==='طالب سابع ثان'),exam,settings).certificateScore,7.5);
assert.equal(S.certificateScore(math.rows.find(r=>r.studentName==='طالب سابع ثان'),exam,settings).passed,true);
assert.equal(S.reportItemHeaderMax([{total:30,certificate:{certificateTotal:15}}],exam,settings),'30');
assert.equal(S.reportItemHeaderMax([{total:30,certificate:{certificateTotal:15}}],exam,settings,'certificate'),'15');
assert.equal(build('gradeGroup','7').length,2,'seventh pages only');
assert.equal(build('gradeGroup','8').length,1,'eighth pages only');
assert.equal(build('gradeGroup','9').length,1,'ninth pages only');
assert.equal(build('gradeGroup','الكل','اللغة العربية').length,1,'subject filtering');
const teacherPages=build('teacherGroup');
assert.equal(teacherPages.length,2);
const salem=teacherPages.find(p=>p.groupTeacher==='أ. سالم');
assert.equal(salem.allRows.length,4,'one teacher across grades and subjects');
assert.ok(salem.allRows.some(r=>r.className==='8/1'));
assert.ok(salem.allRows.some(r=>r.className==='7/2'));
assert.equal(build('teacherGroup','أ. أحمد').length,1,'teacher filtering');
assert.ok(build('teacherGroup','أ. سالم').every(p=>p.allRows.every(r=>(ctx.mj(r,exam)||r.teacher)==='أ. سالم')));
assert.equal(build('gradeGroup','الكل','الكل',rows.filter(r=>r.subject==='اللغة العربية')).length,1,'coordinator scoped subset');
assert.ok(gradePages.every(p=>p.rows.every(r=>r.className!=='7/ESE'&&r.studentName!=='طالب ناجح'&&r.studentName!=='طالب غائب')));
assert.ok(gradePages.every(p=>S.normalizeReportPage(p,'struggling',exam,{rows,settings}).rows.length===p.rows.length),'print report scope');
const large=Array.from({length:54},(_,i)=>make('طالب رقم '+i,String(70000001000+i),'7/1','الرياضيات','أ. سالم',i%3+7));
const many=build('teacherGroup','أ. سالم','الكل',large);
assert.equal(many.length,3,'one teacher has multi-page output without omitted students');
assert.deepEqual(Array.from(many,p=>p.rows.length),[23,23,8]);
assert.ok(many.every(p=>p.allRows.length===54));
const failed=rows.filter(r=>r.statuses.exam1==='present').map(r=>({row:r,cert:S.certificateScore(r,exam,settings)}))
 .filter(x=>x.cert&&!x.cert.passed).map(({row:r,cert})=>({
 name:r.studentName,studentId:r.studentId,className:r.className,subject:r.subject,teacher:r.teacher,
 score:r.scores.exam1,total:30,certificateScore:cert.certificateScore,certificateTotal:15,percentage:cert.originalPercent,certificatePercentage:cert.certificatePercent
 }));
const args={failed,scopeLabel:'المدرسة',examName:'الاختبار الأول'};
const staffGrade=S.staffReportBuild('failedGrade',args),staffTeacher=S.staffReportBuild('failedTeacher',args);
assert.match(staffGrade.body,/السابع/);assert.match(staffGrade.body,/الثامن/);assert.match(staffGrade.body,/التاسع/);
assert.match(staffTeacher.body,/المعلم: أ. سالم/);assert.match(staffTeacher.body,/المعلم: أ. أحمد/);
assert.match(staffGrade.body,/الدرجة العظمى 30/);assert.match(staffGrade.body,/الدرجة العظمى 15/);
for(const report of [staffGrade,staffTeacher]){
 for(const row of rows)assert.ok(!report.body.includes(row.studentId),'personal ID leak in staff grouped print');
 assert.ok(!report.body.includes('14/30'),'do not repeat score denominator in cells');
}
assert.match(staffGrade.body,/font-weight:900/,'bold readable student names');
const sourceRoot=path.resolve(__dirname,'../src');
const sourceFile=f=>fs.readFileSync(path.join(sourceRoot,f),'utf8');
assert.ok(!sourceFile('reports.js').includes('children:row.studentId'),'personal ID hidden in range report');
assert.ok(!sourceFile('reports.js').includes('esc(row.studentId)'),'personal ID hidden in archive preview');
assert.ok(!sourceFile('student-results-print.js').includes('children:page.studentId'),'student statement private');
assert.ok(!sourceFile('grade-review.js').includes('safe(item.studentId)'),'grade review print private');
assert.ok(!sourceFile('patches/reports.js').includes("'الرقم الأكاديمي':row.studentId"),'Excel report private');
assert.match(sourceFile('patches/ui.js'),/gradeGroup/);assert.match(sourceFile('patches/ui.js'),/teacherGroup/);
assert.match(sourceFile('staff.js'),/failedGrade/);assert.match(sourceFile('staff.js'),/failedTeacher/);
const style=sourceFile('repair.css');
assert.match(style,/sr685-group-table/);assert.match(style,/font-weight:900/);assert.match(style,/11\.5pt/);
console.log('PASS 6.10.85 grouped school and staff reports: grade 7/8/9, subjects, teachers, scoped data, certificate pass, 54-row pagination, private IDs, max-only headings, A4 names.');
