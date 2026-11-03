/* 6.10.83 — certified marks are the single source of grading truth. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {ctx}=require('./harness.cjs').loadApp(),S=ctx.SR63;
const w=ctx.Aj();w.activeExam='exam1';w.settings.pass=50;
w.settings.exams=w.settings.exams.map((x,i)=>i===0?{...x,total:30,certificateTotal:15}:i===1?{...x,total:50,certificateTotal:20}:x);
const make=(id,raw,raw2,status='present',klass='7/1',sub='الرياضيات')=>({
 id:'c-'+id+'-'+sub,studentId:id,studentName:'طالب '+id,grade:'السابع',className:klass,
 subject:sub,department:sub,teacher:'معلم الرياضيات',
 scores:{exam1:raw,exam2:raw2,exam3:null,exam4:null},
 statuses:{exam1:status,exam2:status,exam3:'unentered',exam4:'unentered'},
 totals:{exam1:30,exam2:50,exam3:40,exam4:40},
 examClasses:{exam1:klass,exam2:klass},examTeachers:{exam1:'معلم الرياضيات',exam2:'معلم الرياضيات'}
});
w.rows=[make('A',14.5,24.5),make('B',14,23.5),make('C',29.5,49.5),make('D',null,null,'absent')];
const cert=(id,exam='exam1')=>S.certificateScore(w.rows.find(r=>r.studentId===id),exam,w.settings);
const near=(v,n)=>assert.ok(Math.abs(v-n)<0.000001,String(v)+' != '+String(n));
assert.equal(cert('A').rawScore,14.5);assert.equal(cert('A').rawTotal,30);
assert.equal(cert('A').certificateScore,7.5);assert.equal(cert('A').certificateTotal,15);
near(cert('A').originalPercent,100*14.5/30);assert.equal(cert('A').certificatePercent,50);assert.equal(cert('A').passed,true);
assert.equal(cert('B').certificateScore,7);assert.equal(cert('B').passed,false);
assert.equal(cert('C').certificateScore,15);assert.equal(cert('C').passed,true);
assert.equal(cert('A','exam2').certificateScore,10);
assert.equal(cert('A','exam2').certificateTotal,20);assert.equal(cert('A','exam2').passed,true);
assert.equal(cert('B','exam2').certificateScore,9.5);assert.equal(cert('B','exam2').passed,false);
assert.equal(cert('C','exam2').certificateScore,20);assert.equal(cert('C','exam2').passed,true);
assert.equal(cert('D'),null);assert.equal(S.certificatePercentage(w.rows[3],'exam1',w.settings),null);
near(ctx.vj(w.rows[0],'exam1',w.settings),100*14.5/30);
const legacy={...w.settings,exams:w.settings.exams.map((e,i)=>i===0?{...e,certificateTotal:null}:e)};
const prior=S.certificateScore(w.rows[0],'exam1',legacy);assert.equal(prior.certificateScore,14.5);assert.equal(prior.certificateTotal,30);assert.equal(prior.passed,false);
const m=ctx.bj(w.rows,'exam1',w.settings);
assert.equal(m.evaluated,3);assert.equal(m.passed,2);assert.equal(m.failed,1);near(m.success,200/3);
near(m.achievement,100*(7.5+7+15)/45);assert.equal(m.certificateEarned,29.5);assert.equal(m.certificatePossible,45);
const problem=S.strugglingStatistics(w);assert.equal(problem.totalStudents,1);
const students=S.strugglingPrintModel(w,0,100);assert.equal(students.students.length,1);assert.equal(students.students[0].studentName,'طالب B');
assert.equal(students.students[0].subjects[0].certificateScore,7);
const pages=S.studentResultPages(w,'exam1'),page=pages.find(x=>x.studentId==='A');
assert.ok(page);const item=page.results.find(x=>x.rawSubject==='الرياضيات');
assert.equal(item.score,14.5);near(item.percent,100*14.5/30);
assert.equal(item.certificate.certificateScore,7.5);assert.equal(item.certificate.certificateTotal,15);
near(page.certificateAverage,50);
const school=S.schoolQuantitativeAnalyze(w,'exam1');
assert.equal(school.evaluated,3);near(school.success,66.7);near(school.achievement,65.6);
const dept=S.departmentPerformanceAnalyze(w,{exam:'exam1',subject:'الرياضيات'});
assert.equal(dept.evaluated,3);near(dept.success,66.7);
const teachers=S.teacherPerformanceAnalyze(w,{exam:'exam1',teacher:'معلم الرياضيات',subject:'الرياضيات'});
assert.equal(teachers.evaluated,3);assert.equal(teachers.passed,2);
const levels=S.staffStudentLevels(w,'exam1');
assert.equal(levels.filter(x=>x.id!=='not_assessed').reduce((sum,x)=>sum+x.students.length,0),3);
const graded=levels.flatMap(x=>x.students).find(s=>s.name==='طالب A');
assert.equal(graded.percentage,48.3);assert.equal(graded.certificatePercentage,50);
const backup={...w,settings:{...w.settings,exams:w.settings.exams.map((e,i)=>i===0?{...e,certificateTotal:15.25}:e)}};
assert.throws(()=>S.validate(backup),/درجة الشهادة/);
assert.doesNotThrow(()=>S.validate(w));
const build=fs.readFileSync(path.join(__dirname,'../build.cjs'),'utf8');
const statement=fs.readFileSync(path.join(__dirname,'../src/student-results-print.js'),'utf8');
assert.match(build,/CertificateExamSettings/);assert.match(statement,/الدرجة في الشهادة/);
console.log('PASS 6.10.83: raw/certificate conversion, 30/15 and 50/20, half-mark ceiling, original percentages, pass/fail, all school and staff analytics, backups, legacy defaults');
