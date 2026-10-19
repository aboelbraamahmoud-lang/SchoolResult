'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const SR63={
 number:v=>v===null||v===undefined||String(v).trim()===''?null:Number.isFinite(Number(v))?Number(v):null,
 subjectAliasKey:v=>String(v??'').replace(/\s/g,''),
 escape:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
};
const testRows={SheetNames:['English'],Sheets:{English:{rows:[
 ['الرقم الأكاديمي','اسم الطالب','الشعبة','الاستماع','التحدث','القراءة','القواعد','الكتابة'],
 ['111','طالب تجريبي','7/1',9,7,8,8,10]
]}}};
const globals={SR63,hv:()=>testRows,Gv:{sheet_to_json:s=>s.rows||[]},console,Date,Map,Set};
vm.runInNewContext(read('src/skills.js'),globals,{timeout:5000});
vm.runInNewContext(read('src/skills-enhancements.js'),globals,{timeout:5000});
vm.runInNewContext(read('src/skills-center-v2.js'),globals,{timeout:5000});
const workspace={activeExam:'exam1',settings:{academicYear:'2026-2027',schoolName:'مدرسة اختبار',
 exams:[{key:'exam1',name:'الاختبار الأول',total:50},{key:'exam2',name:'الاختبار الثاني',total:50}]},
 rows:[
  {studentId:'111',studentName:'طالب تجريبي',className:'7/1',subject:'اللغة الإنجليزية',
   scores:{exam1:44,exam2:45},statuses:{exam1:'present',exam2:'present'},
   totals:{exam1:50,exam2:50}},
  {studentId:'222',studentName:'طالب عربي تجريبي',className:'7/2',subject:'اللغة العربية',
   scores:{exam1:45},statuses:{exam1:'present'},totals:{exam1:50}}
 ]};
assert.equal(SR63.skillSubjects.english.keys.length,5,'five default English skills');
assert.equal(SR63.skillSubjectKind('اللغة الانجليزية'),'english','Arabic spelling aliases');
assert.equal(SR63.skillSubjectKind('English Language'),'english','English alias');
assert.equal(SR63.skillSubjectKind('اللغة العربية'),'arabic');
assert.equal(SR63.skillRoster(workspace,'english','exam1',['اللغة العربية']).length,0,'department fence');
assert.equal(SR63.skillRoster(workspace,'english','exam1',['اللغة الإنجليزية']).length,1);
const assessment=SR63.skillNewAssessment(workspace,'english','exam1',['English Language']);
assert.equal(assessment.records.length,1);
assert.equal(assessment.skills.length,5);
assert.equal(assessment.records[0].marks.listening,null,'blank must stay null');
assert.equal(SR63.skillReconciliation(assessment,workspace)[0].state,'incomplete','unentered marks are not zero');
assessment.skills.forEach(s=>s.max=10);
assessment.records[0].marks={listening:9,speaking:7,reading:8,grammar:8,writing:10};
const audit=SR63.skillReconciliation(assessment,workspace);
assert.equal(audit[0].total,42);
assert.equal(audit[0].official,44);
assert.equal(audit[0].delta,-2);
assert.equal(audit[0].state,'mismatch','mismatch warning');
assert.equal(SR63.skillWeakStudents(assessment,'speaking',80).length,1);
assert.equal(SR63.skillWeakStudents(assessment,'writing',80).length,0);
const generic=SR63.skillParseGenericWorkbook(new ArrayBuffer(1),'English.xlsx',assessment);
assert.equal(generic.records[0].marks.listening,9,'Excel import matching by school identifier');
assert.equal(generic.records[0].marks.grammar,8);
const newer=structuredClone(assessment);newer.exam='exam2';newer.id='newer';
newer.records[0].marks.speaking=9;
const comparisons=SR63.skillComparison(assessment,newer);
assert.equal(comparisons.length,1);
assert.ok(comparisons[0].skills.some(s=>s.key==='speaking'&&s.change===20),'fair comparison in percent');
const weak=SR63.skillReportSelection({assessment,workspace,kind:'weak',skillKey:'speaking',threshold:80});
assert.ok(weak.pages.length>=1,'weak students report pages');
assert.match(weak.pages[0],/data-orientation="landscape"/,'landscape report printable');
const mismatchReport=SR63.skillReportSelection({assessment,workspace,kind:'reconciliation'});
assert.match(mismatchReport.pages[0],/غير متطابقة/);
assert.doesNotMatch(mismatchReport.pages[0],/طالب عربي تجريبي/,'subject scope remains intact');
const edge=fs.readFileSync(path.join(__dirname,'../../supabase/functions/school-staff/index.ts'),'utf8');
const staff=read('src/staff.js'),build=read('build.cjs');
assert.match(edge,/action==='save_skills'/);
assert.match(edge,/role!=='coordinator'/);
assert.match(edge,/UNAUTHORIZED_SKILL_STUDENT/);
assert.match(edge,/\.eq\('revision',expected\)/,'optimistic lock');
assert.match(staff,/readOnly:isLeadership\|\|profile\.skillsWrite!==true/);
assert.match(edge,/skillsWrite:role==='coordinator'/,'server capability advertises safe release readiness');
assert.match(staff,/expectedRevision:payload\?\.revision/);
assert.match(build,/skills-enhancements\.js/);
assert.match(build,/skills-center-v2\.js/);
console.log('PASS bilingual skills: defaults, scoped roster, edit/report parser, missing values, grade mismatch, weak students, exam comparison and server gating');
