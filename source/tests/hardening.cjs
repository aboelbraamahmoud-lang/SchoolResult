const assert=require('assert/strict');
const {loadApp}=require('./harness.cjs');
const c=loadApp().ctx;
const tests=[];
function test(name,fn){try{fn();tests.push({name,status:'pass'});console.log('PASS '+name);}catch(error){tests.push({name,status:'fail',error:error.stack});console.error('FAIL '+name+'\n'+error.message);}}
function makeRow(studentId,name,className,subject,score=15,total=20){
  return {id:`row-${studentId}-${subject}`,studentId,studentName:name,className,grade:c.uj(className),subject,department:subject,teacher:'معلم '+subject,
    scores:{exam1:score,exam2:null,exam3:null,exam4:null},statuses:{exam1:'present',exam2:'unentered',exam3:'unentered',exam4:'unentered'},
    totals:{exam1:total,exam2:30,exam3:30,exam4:40},examClasses:{exam1:className,exam2:'',exam3:'',exam4:''},examTeachers:{exam1:'معلم '+subject,exam2:'',exam3:'',exam4:''},importBatches:{exam1:'B',exam2:null,exam3:null,exam4:null}};
}
const subjects=['شرعية','عربي','E','رياضيات','علوم','اجتماعية','حاسب','فنية','بدنية'];

test('150 students x 9 subjects remains 150 students',()=>{
  const rows=[];for(let i=1;i<=150;i++){const cls=`7/${1+((i-1)%9)}`;for(const sub of subjects)rows.push(makeRow(`S${i}`,`طالب ${i}`,cls,sub));}
  const m=c.bj(rows,'exam1',c.ej);assert.equal(m.students,150);assert.equal(m.evaluated,1350);assert.equal(m.rows,1350);
});

test('multi-subject vocabulary distinguishes students from results',()=>{
  const rows=[makeRow('S1','أحمد','7/1','علوم'),makeRow('S1','أحمد','7/1','رياضيات')];
  assert.deepEqual(JSON.parse(JSON.stringify(c.SR63.metricVocabulary(rows))),{multi:true,students:'عدد الطلاب',evaluated:'النتائج المرصودة',passed:'النتائج الناجحة',failed:'النتائج الراسبة',absent:'نتائج غائب/غير مقيم'});
  assert.match(c.SR63.metricDisclosure(rows),/عدد الطلاب/);
});

test('single-subject vocabulary stays student terminology',()=>{
  const vocab=c.SR63.metricVocabulary([makeRow('S1','أحمد','7/1','علوم')]);assert.equal(vocab.multi,false);assert.equal(vocab.evaluated,'حاضر');assert.equal(vocab.passed,'ناجح');
});

test('import reconciliation counts repeated subjects once per student',()=>{
  const items=subjects.flatMap((sub,si)=>[1,2,3].map(i=>({studentId:'',studentName:`طالب ${i}`,className:'7/1',subject:sub,sourceFile:`${sub}.xlsx`})));
  const r=c.SR63.importReconciliation(items,c.Aj(),'replace',{created:27,empty:0,overwritten:0,unchanged:0},[],{});assert.equal(r.students,3);assert.equal(r.results,27);assert.equal(r.subjects,9);
});

test('import reconciliation does not merge distinct official IDs with same name',()=>{
  const items=[{studentId:'1001',studentName:'محمد أحمد',className:'7/1',subject:'علوم'},{studentId:'2002',studentName:'محمد أحمد',className:'7/1',subject:'رياضيات'}];
  const r=c.SR63.importReconciliation(items,c.Aj(),'replace',{},[],{});assert.equal(r.students,2);
});

test('wide grade reports never exceed four subjects per page',()=>{
  const rows=subjects.flatMap(sub=>[makeRow('S1','أحمد','7/1',sub),makeRow('S2','محمد','7/2',sub)]);const pages=c.SR63.gradeSubjectPages(rows,'exam1','الكل');assert.ok(pages.length);assert.ok(pages.every(p=>p.subjectChunk.length<=4));
});

test('department report never exceeds three subjects per page',()=>{
  const rows=subjects.flatMap(sub=>[makeRow('S1','أحمد','7/1',sub),makeRow('S2','محمد','7/2',sub)]);const pages=c.SR63.departmentStatsPages(rows,'exam1','الكل');assert.ok(pages.length);assert.ok(pages.every(p=>p.subjectChunk.length<=3));
});

test('catalog health surfaces incomplete structure',()=>{
  const w=c.Aj();w.rows=[makeRow('S1','أحمد','7/1','علوم')];const h=c.SR63.catalogHealth(w);assert.ok(Number.isFinite(h.score));assert.equal(typeof h.ready,'boolean');assert.ok(Array.isArray(h.issues));
});

test('student registry preserves two official students with identical name and class',()=>{
  const rows=[makeRow('1001','محمد أحمد','7/1','علوم'),makeRow('2002','محمد أحمد','7/1','رياضيات')];assert.equal(c.SR63.studentRegistry({rows},'exam1').length,2);assert.equal(c.SR63.studentIdentityConflicts({rows},'exam1').size,1);
});


test('clear one exam preserves all other exams and student rows',()=>{
  const row=makeRow('S1','أحمد','7/1','علوم');row.scores.exam2=24;row.statuses.exam2='present';row.totals.exam2=30;row.examTeachers.exam2='معلم علوم';row.examClasses.exam2='7/1';row.importBatches.exam2='B2';
  const w=c.Aj();w.rows=[row];w.imports=[{id:'i1',name:'mid.xlsx',at:new Date().toISOString(),rows:1,warnings:0,kind:'results',exam:'exam1'},{id:'i2',name:'end.xlsx',at:new Date().toISOString(),rows:1,warnings:0,kind:'results',exam:'exam2'}];
  const next=c.SR63.clearResults(w,'exam1');assert.equal(next.rows.length,1);assert.equal(next.rows[0].scores.exam1,null);assert.equal(next.rows[0].statuses.exam1,'unentered');assert.equal(next.rows[0].scores.exam2,24);assert.equal(next.rows[0].statuses.exam2,'present');assert.equal(next.imports.some(x=>x.exam==='exam1'),false);assert.equal(next.imports.some(x=>x.exam==='exam2'),true);
});

test('clear all results removes result rows but keeps teacher imports',()=>{
  const w=c.Aj();w.rows=[makeRow('S1','أحمد','7/1','علوم')];w.imports=[{id:'t',name:'teachers.xlsx',at:new Date().toISOString(),rows:1,warnings:0,kind:'teachers'},{id:'r',name:'results.xlsx',at:new Date().toISOString(),rows:1,warnings:0,kind:'results',exam:'exam1'}];
  const next=c.SR63.clearResults(w,'all');assert.equal(next.rows.length,0);assert.equal(next.imports.length,1);assert.equal(next.imports[0].kind,'teachers');
});

test('dashboard subject scope excludes unselected subjects from metrics',()=>{
  const w=c.Aj();w.rows=[makeRow('S1','أحمد','7/1','علوم',18),makeRow('S1','أحمد','7/1','بدنية',10)];w.settings={...w.settings,dashboardSubjects:['علوم']};w.activeExam='exam1';
  const model=c.SR63.dashboardModel(w,{});assert.equal(model.rows.length,1);assert.equal(model.metric.evaluated,1);assert.equal(model.subjectGroups.length,1);assert.equal(model.subjectGroups[0].name,'علوم');
});



test('ESE codes normalize into the three Additional Support cohorts',()=>{
  assert.equal(c.lj('07/ESE'),'7/ESE');assert.equal(c.lj('08/ESE'),'8/ESE');assert.equal(c.lj('09/ESE'),'9/ESE');
  assert.equal(c.SR63.supportClassInfo('07/ESE').label,'طلاب الدمج سابع');assert.equal(c.SR63.supportClassInfo('8/ESE').label,'طلاب الدمج ثامن');assert.equal(c.SR63.supportClassInfo('09/ESE').label,'طلاب الدمج تاسع');
});

test('general school metrics exclude ESE while support-only metrics remain measurable',()=>{
  const general=makeRow('G1','طالب عام','7/1','علوم',18,20),support=makeRow('E1','طالب دمج','7/ESE','علوم',0,20),mixed=c.bj([general,support],'exam1',c.ej),supportOnly=c.bj([support],'exam1',c.ej);
  assert.deepEqual([mixed.students,mixed.evaluated,mixed.success,mixed.achievement],[1,1,100,90]);
  assert.deepEqual([supportOnly.students,supportOnly.evaluated,supportOnly.success,supportOnly.achievement],[1,1,0,0]);
});

test('dashboard keeps ESE out of general rows and exposes independent support summary',()=>{
  let w=c.Aj();w.rows=[makeRow('G1','طالب عام','7/1','علوم',18),makeRow('E1','طالب دمج','7/ESE','علوم',10)];w.activeExam='exam1';w=c.SR63.withCatalog(w);
  const model=c.SR63.dashboardModel(w,{}),support=c.SR63.supportSummary(w,'exam1');assert.equal(model.rows.length,1);assert.equal(model.rows[0].className,'7/1');assert.equal(support.length,1);assert.equal(support[0].label,'طلاب الدمج سابع');assert.equal(support[0].metric.students,1);
});

test('ESE import bypasses normal teacher assignment and is stored under Additional Support',()=>{
  const item={studentId:'ESE-1',studentName:'طالب دمج',className:'7/ESE',grade:'السابع',subject:'علوم',teacher:'',score:17,status:'present',recognized:true,sourceFile:'علوم.xlsx',sourceSheet:'علوم'},links=c.lde([item],[],[]);
  assert.equal(links[0].status,'support');assert.equal(links[0].selectedProfileId,'__support__');
  const n=c.SR63.commitImport(c.Aj(),[item],links,[{fileName:'علوم.xlsx',issues:[],sheets:[]}],'exam1',20,()=>20,'replace');assert.equal(n.rows.length,1);assert.equal(n.rows[0].department,'الدعم الإضافي');assert.equal(n.rows[0].className,'7/ESE');assert.equal(n.rows[0].teacher,'الدعم الإضافي');
});

test('ESE classes do not create missing teacher-assignment coverage',()=>{
  let w=c.Aj();w.rows=[makeRow('E1','طالب دمج','7/ESE','علوم',16)];w=c.SR63.withCatalog(w);assert.equal(w.classes.some(x=>x.className==='7/ESE'),false);assert.equal(c.SR63.catalogCoverage(w).required,0);
});

test('support report pages are separate by seventh eighth and ninth ESE cohorts',()=>{
  const rows=[makeRow('E7','دمج 7','7/ESE','علوم',15),makeRow('E8','دمج 8','8/ESE','علوم',16),makeRow('E9','دمج 9','9/ESE','علوم',17),makeRow('G','عام','7/1','علوم',18)],pages=c.SR63.supportReportPages(rows,'exam1','الكل');
  assert.equal(JSON.stringify(pages.map(p=>p.title)),JSON.stringify(['طلاب الدمج سابع','طلاب الدمج ثامن','طلاب الدمج تاسع']));assert.ok(pages.every(p=>p.department==='الدعم الإضافي'));assert.ok(pages.every(p=>p.rows.every(r=>c.SR63.isSupportRow(r,'exam1'))));
});



test('value-added comparison excludes ESE from mixed general samples',()=>{
  const a=makeRow('G1','طالب عام','7/1','علوم',10,20),support=makeRow('E1','طالب دمج','7/ESE','علوم',20,20);
  a.scores.exam2=18;a.statuses.exam2='present';a.totals.exam2=20;a.examClasses.exam2='7/1';
  support.scores.exam2=0;support.statuses.exam2='present';support.totals.exam2=20;support.examClasses.exam2='7/ESE';
  const mixed=c.xj([a,support],'exam1','exam2',c.ej),supportOnly=c.xj([support],'exam1','exam2',c.ej);
  assert.equal(mixed.paired,1);assert.equal(mixed.delta,40);assert.equal(supportOnly.paired,1);assert.equal(supportOnly.delta,-100);
});

test('custom reports exclude ESE rows from general report builders',()=>{
  const general=makeRow('G1','طالب عام','7/1','علوم',18),support=makeRow('E1','طالب دمج','7/ESE','علوم',19),w=c.Aj();w.rows=[general,support];
  const config={exam:'exam1',entityDimension:'className',entity:'الكل',subject:'الكل',resultScope:'evaluated',minPercent:0,maxPercent:100};
  const rows=c.SR63.customReportRows(w,config);assert.equal(rows.length,1);assert.equal(rows[0].className,'7/1');
});

test('department analysis exposes Additional Support as a separate department',()=>{
  const rows=[makeRow('G1','طالب عام','7/1','علوم',18),makeRow('E1','طالب دمج','7/ESE','علوم',12)];
  rows[0].department='العلوم';rows[1].department='أي قيمة قديمة';
  const groups=c.Sj(rows,'department','exam1',c.ej,null),support=groups.find(g=>g.name==='الدعم الإضافي'),general=groups.find(g=>g.name==='العلوم');
  assert.ok(support);assert.ok(general);assert.equal(support.metric.students,1);assert.equal(general.metric.students,1);
});

const report={passed:tests.filter(x=>x.status==='pass').length,failed:tests.filter(x=>x.status==='fail').length,tests};console.log(JSON.stringify(report));if(report.failed)process.exitCode=1;
