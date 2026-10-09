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

const report={passed:tests.filter(x=>x.status==='pass').length,failed:tests.filter(x=>x.status==='fail').length,tests};console.log(JSON.stringify(report));if(report.failed)process.exitCode=1;
