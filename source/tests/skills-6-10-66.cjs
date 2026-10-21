'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const from=relative=>fs.readFileSync(path.join(__dirname,'..',relative),'utf8');
const SR63={
 number:v=>v===null||v===undefined||String(v).trim()===''?null: Number.isFinite(Number(v))?Number(v):null,
 subjectAliasKey:v=>String(v??'').replace(/\s/g,''),
 escape:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 safeReportFilename:x=>String(x),downloadReportFile:()=>{}
};
const excel={SheetNames:['English'],Sheets:{English:{rows:[
 ['الرقم الأكاديمي','اسم الطالب','الشعبة','الاستماع','التحدث','القراءة','القواعد','الكتابة'],
 [1234567890,'طالب تجريبي','7/1',9,8,7,6,10]
]}}};
const v={useMemo:fn=>fn(),useState:initial=>[typeof initial==='function'?initial():initial,()=>{}],createElement:(type,props,...children)=>({type,props,children})};
const context={SR63,v,Date,console,Map,Set,hv:()=>excel,Gv:{sheet_to_json:sheet=>sheet.rows}};
vm.createContext(context);
for(const file of ['src/skills.js','src/skills-plus-core.js','src/skills-plus-ui.js'])vm.runInContext(from(file),context,{timeout:7000});
assert.equal(SR63.skillSubjects.english.keys.length,5);
for(const v of ['اللغة الإنجليزية','اللغة الانجليزية','قسم اللغة الإنجليزية','English Language'])assert.equal(SR63.skillKind(v),'english');
assert.equal(SR63.skillKind('اللغة العربية'),'arabic');
const workspace={settings:{academicYear:'2026-2027',schoolName:'مدرسة تجريبية',exams:[{key:'exam1',name:'منتصف الفصل',total:50},{key:'exam2',name:'نهاية الفصل',total:50}]},activeExam:'exam1',
 rows:[{studentId:'1234567890',studentName:'طالب تجريبي',className:'7/1',subject:'اللغة الإنجليزية',department:'اللغة الإنجليزية',scores:{exam1:42,exam2:45},statuses:{exam1:'present',exam2:'present'},totals:{exam1:50,exam2:50}},
 {studentId:'87654',studentName:'طالب اللغة العربية',className:'7/2',subject:'اللغة العربية',scores:{exam1:35},statuses:{exam1:'present'},totals:{exam1:50}}]};
assert.equal(SR63.skillRoster(workspace,'english','exam1',['اللغة العربية']).length,0);
assert.equal(SR63.skillRoster(workspace,'english','exam1',['قسم اللغة الإنجليزية']).length,1);
const a=SR63.skillCreate(workspace,'english','exam1',['اللغة الإنجليزية']);
assert.equal(a.skills.length,5);assert.equal(a.records[0].marks.listening,null);
assert.equal(SR63.skillAudit(a,workspace)[0].status,'incomplete');
for(const s of a.skills)s.max=10;
a.records[0].marks={listening:9,speaking:8,reading:7,grammar:6,writing:10};
assert.equal(SR63.skillAudit(a,workspace)[0].total,40);
assert.equal(SR63.skillAudit(a,workspace)[0].difference,-2);
assert.equal(SR63.skillAudit(a,workspace)[0].status,'mismatch');
assert.equal(SR63.skillWeak(a,'grammar',70).length,1);
assert.equal(SR63.skillWeak(a,'writing',70).length,0);
assert.equal(SR63.skillSafeAssessment(a,workspace,['قسم اللغة الإنجليزية']).records.length,1);
assert.throws(()=>SR63.skillSafeAssessment({...a,records:[{id:'87654',name:'عربي',className:'7/2',marks:{}}]},workspace,['اللغة الإنجليزية']),/غير مطابق/);
const bad=structuredClone(a);bad.records[0].marks.listening=11;
assert.throws(()=>SR63.skillSafeAssessment(bad,workspace),/تتجاوز/);
const parsed=SR63.skillParseGeneric(new ArrayBuffer(1),'english.xlsx',a);
assert.equal(parsed.records[0].marks.grammar,6);
assert.equal(parsed.records[0].marks.listening,9);
const b=structuredClone(a);b.id='skills-english-exam2-2026-2027';b.exam='exam2';b.records[0].marks.grammar=8;
assert.equal(SR63.skillComparison(a,b)[0].skills.find(s=>s.key==='grammar').change,20);
for(const kind of ['school','audit','weak','ranking','comparison','students','summary']){
 const pages=SR63.skillReports(a,workspace,{type:kind,skillKey:'grammar',threshold:70,older:b}).pages;
 assert.ok(pages.length,'report must render: '+kind);
 assert.match(pages[0],/data-orientation="landscape"/);
 pages.forEach((html,i)=>assert.ok(html.includes('صفحة '+(i+1)+' من '+pages.length),'filtered skill reports restart pagination and count only exported pages'));
}
const tree=SR63.SkillCenter({workspace:{...workspace,skillsAssessments:[a]},setWorkspace:()=>{},readOnly:false,allowedSubjects:['اللغة الإنجليزية']});
const visible=JSON.stringify(tree);assert.match(visible,/رصد درجات الطلاب/);assert.match(visible,/حفظ درجات المهارات/);
const boss=SR63.SkillCenter({workspace:{...workspace,skillsAssessments:[a]},readOnly:true});
assert.doesNotMatch(JSON.stringify(boss),/حفظ درجات المهارات/);
const staff=from('src/staff.js'),edge=fs.readFileSync(path.join(__dirname,'../../supabase/functions/school-staff/index.ts'),'utf8'),build=from('build.cjs');
assert.match(staff,/profile\.skillsWrite!==true/);
assert.match(staff,/expectedRevision:payload\?\.revision/);
assert.match(edge,/action==='save_skills'/);
assert.match(edge,/UNAUTHORIZED_SKILL_STUDENT/);
assert.match(edge,/\.eq\('revision',expected\)/);
assert.match(edge,/role!=='coordinator'/);
assert.match(build,/skills-plus-core\.js/);
assert.match(build,/skills-plus-ui\.js/);
console.log('PASS 6.10.66: bilingual setup, coordinator scope, validation, English Excel, mismatch, reports, charts, source integration');
