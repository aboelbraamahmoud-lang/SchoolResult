'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/skills.js'),'utf8');
const mk=(grade,id,name,klass,marks)=>{
 const row=[Number(id),1,name,klass,...marks,null,null,null];return row;
};
const rows=(grade)=>[
 ['','','',null,null,'تحليل درجات مهارات اللغة العربية في اختبار منتصف الفصل الدراسي الأول للعام 2025 - 2026 م'],
 [null,null,null,null,null,'تحليل 2025 - 2026'],
 ['الرقم','الرقم','الاسم','الصف / الشعبة','استماع وإملاء','حفظ','قراءة','قواعد','كتابة','المجموع','النسبة','ملاحظات'],
 mk(grade, '3101234567'+grade,'طالب تجريبي '+grade,'0'+grade+'/1',[null,null,null,null,null]),
 [null,null,null,null,null,null,null,null,null,null,null,null, 'جدول تلخيص لا يمثل طالبًا']
];
const book={SheetNames:['السابع','الثامن','التاسع'],Sheets:{
 'السابع':{matrix:rows(7)},'الثامن':{matrix:rows(8)},'التاسع':{matrix:rows(9)}
}};
const SR63={
 number:v=>v===null||v===undefined||String(v).trim()===''?null:(Number.isFinite(Number(v))?Number(v):null),
 subjectAliasKey:v=>String(v||'').replace(/\s/g,''),
 escape:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
};
const scope={SR63,hv:()=>book,Gv:{sheet_to_json:sheet=>sheet.matrix},console,Date};
vm.runInNewContext(source,scope,{timeout:5000});
const assessment=SR63.skillParseWorkbook(new ArrayBuffer(10),'مهارات لغة عربية.xlsx','exam1');
assert.equal(assessment.subject,'اللغة العربية');
assert.equal(assessment.records.length,3,'grades 7, 8 and 9 parsed exactly');
assert.equal(assessment.classCount,3,'one class per grade');
assert.equal(assessment.skills.length,5);
assert.equal(assessment.academicYear,'2025-2026');
assert.equal(assessment.records[0].marks.listening,null,'blank grades are not treated as zero');
assert.equal(assessment.records.filter(r=>r.marks.listening===null).length,3,'all uploaded blank skill cells stay null');
assert.equal(SR63.skillAggregate(assessment).observed,0);
assert.equal(SR63.skillAggregate(assessment).achievement,null,'no invented percentages for blank scores');
const pages=SR63.skillPages(assessment);
assert.equal(pages.length,6,'one summary and one student page for each grade');
assert.deepEqual([...pages.map(p=>p.number)],[1,2,3,4,5,6]);
const preview=SR63.skillFullHTML(pages[0],assessment,{schoolName:'مدرسة اختبار',exams:[{key:'exam1',name:'منتصف الفصل'}]});
assert.match(preview,/data-orientation="landscape"/);
assert.match(preview,/شعار وزارة التربية والتعليم/);
assert.doesNotMatch(preview,/—%/,'missing score must not get fabricated percentage');
assert.match(preview,/—/);
const edited=structuredClone(assessment);
edited.skills=edited.skills.map(x=>({...x,max:10}));
edited.records[0].marks={listening:8,memorization:9,reading:7,grammar:6,writing:10};
assert.equal(SR63.skillAggregate(edited).observed,5);
const again=structuredClone(edited);
again.exam='exam2';again.id='skills-arabic-exam2-2025-2026';
again.records[0].marks.reading=9;
const comparison=SR63.skillComparison(edited,again);
assert.equal(comparison.length,1,'only students with two scored skill sets are compared');
assert.ok(comparison.find(r=>r.grade===undefined)?.skills.some(s=>s.key==='reading'&&s.change===20));
assert.equal(SR63.skillScoped([edited],['العلوم']).length,0,'coordinator may not see other subjects');
assert.equal(SR63.skillScoped([edited],['اللغة العربية']).length,1);
assert.throws(()=>SR63.skillSafeNumber(-1),/غير صالحة/);
assert.throws(()=>SR63.skillSafeNumber('NOT A SCORE'),/غير صالحة/);
book.Sheets['السابع'].matrix[3][4]=-5;
assert.throws(()=>SR63.skillParseWorkbook(new ArrayBuffer(2),'x.xlsx','exam1'),/الصف 4/);
const {ctx}=require('./harness.cjs').loadApp();
const sample=ctx.zj(),updated={...sample,skillsAssessments:[edited]};
const checked=ctx.SR63.validate(updated);
assert.equal(checked.workspace.skillsAssessments.length,1,'cloud JSONB workspace normalization preserves skill records');
assert.equal(checked.workspace.skillsAssessments[0].records.length,3);
const bad=structuredClone(updated);bad.skillsAssessments[0].records[0].marks.reading=11;
assert.throws(()=>ctx.SR63.validate(bad),/تتجاوز/,'impossible skill scores rejected before cloud save');
const staff=fs.readFileSync(path.join(__dirname,'../src/staff.js'),'utf8');
const edge=fs.readFileSync(path.join(__dirname,'../../supabase/functions/school-staff/index.ts'),'utf8');
const build=fs.readFileSync(path.join(__dirname,'../build.cjs'),'utf8');
assert.match(staff,/page==='skillsReports'&&perms\.reports/);
assert.match(staff,/allowedSubjects:isLeadership\?null:profile\.departments/,'coordinator client scope');
assert.match(edge,/const skillsAssessments=.*\.filter/,'server filters subject skill records before sending');
assert.match(edge,/allowedSkills\.has\(skillSubject\(a\.subject\)\)/,'Arabic coordinator aliases remain private and scoped');
assert.match(edge,/if\(profile\.permissions\.reports!==true\)scoped\.workspace\.skillsAssessments=\[\]/,'deny skill data without reports permission');
assert.match(build,/skills\.js/);
assert.match(build,/o===\x60skillsReports\x60/);
console.log('PASS 6.10.64: Arabic Excel columns, three grades, null scores, mastery, 2-exam comparison, role scope, cloud persistence and print markup');
