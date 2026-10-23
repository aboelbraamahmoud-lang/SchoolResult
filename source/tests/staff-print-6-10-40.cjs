/* 6.10.40 — staff print, charts, school-wide reports, scope and Word regressions. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {loadApp}=require('./harness.cjs');
const root=path.resolve(__dirname,'../..');
const S=loadApp().ctx.SR63;
const p=(id,name,subject,klass,old,current,extra={})=>({studentId:id,studentName:name,subject,department:subject,teacher:'معلم '+subject,className:klass,examClasses:{exam1:klass,exam2:klass},scores:{exam1:old,exam2:current},statuses:{exam1:'present',exam2:typeof current==='number'?'present':'absent'},totals:{exam1:100,exam2:100},...extra});
const w={activeExam:'exam2',settings:{schoolName:'مدرسة اختبار الجودة',academicYear:'2026/2027',principalName:'المدير التجريبي',academicViceName:'النائب التجريبي',pass:50,exams:[{key:'exam1',name:'الاختبار السابق',total:100},{key:'exam2',name:'الاختبار الحالي',total:100}],bands:[{id:'excellent',label:'ممتاز',min:90,max:100,color:'#0f766e'},{id:'good',label:'جيد',min:70,max:90,color:'#d7a234'},{id:'low',label:'ضعيف',min:0,max:70,color:'#dc6f56'}]},rows:[
 p('1','طالب أول','الرياضيات','7/1',30,50),p('1','طالب أول','العربية','7/1',70,90),p('2','طالب ثانٍ','الرياضيات','8/1',60,80),p('3','طالب ثالث','العربية','8/1',60,null),p('4','طالب دمج','الرياضيات','07/ESE',10,40)
]};
const analyzed=S.schoolQuantitativeAnalyze(w,'exam2');
assert.equal(analyzed.studentCount,3,'student count must be distinct, not summed across subjects');
assert.equal(analyzed.evaluated,3,'only general-education recorded results');
assert.equal(analyzed.ungraded,1,'unrecorded stays separate');
assert.equal(analyzed.compared,3);
assert.equal(analyzed.achievement,73.3);
assert.equal(analyzed.previousAchievement,55); // previous includes the student absent in the current exam
assert.equal(analyzed.valueAdded,20);
assert.equal(analyzed.high90,33.3);
assert.equal(analyzed.grades['7'].studentCount,1);
assert.equal(analyzed.grades['8'].studentCount,2);
assert.equal(analyzed.grades['9'].evaluated,0);
assert.ok(S.schoolReportRecommendations(analyzed).includes('دون التعامل معها بوصفها درجة صفر'));
const groups=S.staffStudentLevels(w,'exam2');
assert.equal(groups.reduce((n,x)=>n+x.students.length,0),4,'levels include support where staff scope includes it');
assert.equal(groups.find(x=>x.id==='not_assessed').students.length,1);
const teachers=S.coordinatorDashboardData(w,'exam2',[]).teachers;
const compared=S.staffExamComparison(w,'exam1','exam2');
const cases={levels:{groups,examName:'الاختبار الحالي',className:'كل الشعب',subject:'كل المواد'},failed:{failed:[{name:'طالب أول',studentId:'1',className:'7/1',subject:'الرياضيات',teacher:'المعلم',score:10,total:100,percentage:10}],examName:'الحالي',scopeLabel:'المدرسة'},teachers:{teachers,examName:'الحالي',scopeLabel:'المدرسة'},comparison:{rows:compared,benchmarks:[{department:'الرياضيات',evaluated:2,success:50,achievement:65}],fromName:'السابق',toName:'الحالي',scopeLabel:'المدرسة'}};
for(const [type,args] of Object.entries(cases)){
 const report=S.staffReportBuild(type,args),text=report.body;
 assert.ok(text.includes('<svg')&&text.includes('</svg>'),'missing inline SVG '+type);
 assert.ok(text.includes('<table')&&text.includes('</table>'),'missing detail table '+type);
 assert.ok(report.title.includes('تقرير'),'missing report title '+type);
 assert.ok(!text.includes('src="javascript:'),'insecure '+type);
 const holder=path.join(root,'qa_6_10_40');fs.mkdirSync(holder,{recursive:true});
 // Only used for headless browser print smoke checks.
 S.document={baseURI:'file://'+root+'/index.html'};
 const ctx=loadApp().ctx;ctx.document={baseURI:'file://'+root+'/index.html'};
 fs.writeFileSync(path.join(holder,type+'.html'),ctx.SR63.staffReportDocument(ctx.SR63.staffReportBuild(type,args),w.settings),'utf8');
}
const malicious=S.staffReportBuild('levels',{...cases.levels,groups:[{id:'x',label:'<img src=x onerror=alert(1)>',color:'#ee6644',students:[{name:'<script>alert(1)</script>',className:'7/1',percentage:60,evaluated:1}]}]});
assert.ok(!malicious.body.includes('<script>'));assert.ok(malicious.body.includes('&lt;script&gt;'));
const documentTable=S.schoolReportTableHtml(analyzed,{achievement:'70',success:'90'});
assert.ok(documentTable.includes('تحقيق المستهدف'));
assert.ok(documentTable.includes('متحقق'));
const word=S.schoolQuantitativeWordBuild(analyzed,{recommendations:'توصيات اختبار الجودة',interpretation:'تحليل اختبار الجودة',targets:{success:'90',achievement:'75',high90:''}});
assert.ok(word.bytes.length>20000&&word.filename.endsWith('.docx'));
fs.writeFileSync(path.join(root,'qa_6_10_40','school-wide-test.docx'),Buffer.from(word.bytes));
const portal=fs.readFileSync(path.join(root,'source/src/staff.js'),'utf8');
for(const x of ["SR63.SchoolQuantitativePage","staffPrint('levels'","staffPrint('failed'","staffPrint('teachers'","staffPrint('comparison'"])assert.ok(portal.includes(x),'missing permission/print: '+x);
assert.ok(!portal.includes("SR63.AIPlans"),'Coordinator and leadership accounts no longer show smart plans');
assert.ok(!portal.includes("page==='plans'"),'Staff cannot navigate to the retired AI plans page');
const printer=fs.readFileSync(path.join(root,'source/src/staff-report-export.js'),'utf8');
assert.ok(printer.includes('parseFromString(SR63.staffReportDocument'));
assert.ok(!printer.includes("rel=\"stylesheet\""),'print must not load the application print styles');
console.log('PASS staff reporting: 4 SVG/chart print layouts, report data and school Word export, permission and XSS checks');
