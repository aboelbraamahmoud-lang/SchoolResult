/* 6.10.42 — staff charts must use correct denominators and clear leadership scope. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {loadApp}=require('./harness.cjs');
const S=loadApp().ctx.SR63;
const exams=['exam1','exam2','exam3','exam4'].map((key,i)=>({key,name:'التقييم '+(i+1),total:100}));
const settings={exams,pass:50,bands:[
 {id:'excellent',label:'ممتاز',min:90,max:100,color:'#0f766e'},
 {id:'average',label:'مقبول',min:60,max:90,color:'#d7a234'},
 {id:'weak',label:'ضعيف',min:0,max:60,color:'#dc6f56'}]};
const row=(id,klass,subject,current,old=40,other={})=>({studentId:id,studentName:'طالب '+id,className:klass,subject,department:subject,teacher:'معلم '+subject,examClasses:{exam1:klass,exam2:klass},scores:{exam1:old,exam2:current},statuses:{exam1:'present',exam2:typeof current==='number'?'present':'absent'},totals:{exam1:100,exam2:100},...other});
const school={activeExam:'exam2',settings,rows:[
 row('st1','7/1','الرياضيات',95),row('st1','7/1','العربية',85),
 row('st2','7/2','الرياضيات',72),row('st3','8/1','العربية',35),
 row('st4','9/1','علوم',null),row('sup','07/ESE','علوم',10)
]};
const d=S.coordinatorDashboardData(school,'exam2');
assert.equal(d.evaluated,5,'overall grade rows: support is separately counted');
assert.equal(d.regular,4,'general education includes exactly four valid subject rows');
assert.equal(d.success,75,'success rate computed from 4 valid regular rows');
assert.equal(d.trend[0].results,5,'exam1 includes valid regular rows including absent-in-exam2 but excludes support');
assert.equal(d.trend[1].results,4,'exam2 excluded absent and support');
assert.equal(d.trend[2].achievement,null,'exams without data must remain missing, not zero');
assert.equal(d.trend[2].success,null);
assert.equal(d.gradeSummary.length,2,'grade rows with recorded data only');
assert.deepEqual(Array.from(d.gradeSummary,x=>x.grade),['7','8']);
assert.equal(d.gradeSummary[0].results,3);
assert.equal(d.gradeSummary[1].results,1);
const bands=d.studentLevels;
assert.equal(bands.find(x=>x.id==='excellent').students.length,1,'st1 average 90% is exactly one pupil');
assert.equal(bands.find(x=>x.id==='average').students.length,1);
assert.equal(bands.find(x=>x.id==='weak').students.length,1);
assert.equal(bands.find(x=>x.id==='not_assessed').students.length,1,'missing grades get their own category');
assert.equal(bands.reduce((n,x)=>n+x.students.length,0),4,'4 unique regular students, not 5 results or support student');
assert.equal(bands.find(x=>x.id==='excellent').students[0].percentage,90);
const source=fs.readFileSync(path.join(__dirname,'../src/staff.js'),'utf8');
for(const needle of ["'مؤشرات '+scopeLabel+' — '+examName", "isLeadership?'مقارنة نتائج المدرسة بين اختبارين'", "'الملخص التنفيذي لأداء المدرسة", "'المدرسة بالكامل'",'sr642-trend-svg','sr642-ring-wrap','sr642-rank-item',"benchmarks:isLeadership?[]:benchmarks",'!isLeadership?h(\'section\'', 'SR63.staffStudentLevels'])assert.ok(source.includes(needle),'scope/clarity regression: '+needle);
const printer=fs.readFileSync(path.join(__dirname,'../src/staff-report-export.js'),'utf8');
assert.ok(printer.includes('الشريط الأول: الاختبار السابق')&&printer.includes('الشريط الثاني: الاختبار الحالي'));
assert.ok(printer.includes('الشريط الأول: التحصيل الأكاديمي')&&printer.includes('الشريط الثاني: نسبة نجاح النتائج'));
const chartHtml=S.staffReportBarChart('اختبار',[{name:'شعبة',value:70,second:80}],{two:true,firstLabel:'تحصيل',secondLabel:'نجاح'});
assert.ok(chartHtml.includes('تحصيل')&&chartHtml.includes('نجاح')&&chartHtml.includes('70.0%')&&chartHtml.includes('80.0%'));
console.log('PASS 6.10.42: school vs department scope, per-student levels, general-education denominator, grades, and chart legends.');
