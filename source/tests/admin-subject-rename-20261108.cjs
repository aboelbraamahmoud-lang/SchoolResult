'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {ctx}=require('./harness.cjs').loadApp(),SR63=ctx.SR63;
const workspace=ctx.zj();
workspace.rows=[
{id:'islam-1',studentId:'TEST1',studentName:'طالب تجريبي أول',grade:'السابع',className:'7/1',subject:'شرعية',department:'التربية الإسلامية',teacher:'معلم أول',scores:{exam1:23},totals:{exam1:30},statuses:{exam1:'present'}},
{id:'arabic-1',studentId:'TEST2',studentName:'طالب تجريبي ثان',grade:'السابع',className:'7/1',subject:'عربي',department:'اللغة العربية',teacher:'معلم ثان',scores:{exam1:28},totals:{exam1:30},statuses:{exam1:'present'}}
];
workspace.subjects=[
{id:'islam-id',name:'شرعية',department:'التربية الإسلامية',coordinatorName:'منسق الإسلامية',gradeIds:[],order:1,active:true},
{id:'arab-id',name:'عربي',department:'اللغة العربية',coordinatorName:'منسق العربية',gradeIds:[],order:2,active:true}
];
workspace.teachers=[
{id:'teacher-islam',teacherId:'T1',teacher:'معلم أول',subject:'شرعية',subjects:['شرعية'],department:'التربية الإسلامية',classes:['7/1'],active:true},
{id:'teacher-arab',teacherId:'T2',teacher:'معلم ثان',subject:'عربي',subjects:['عربي'],department:'اللغة العربية',classes:['7/1'],active:true}
];
workspace.teacherAssignments=[
{id:'a1',profileId:'teacher-islam',subjectId:'islam-id',subject:'شرعية',department:'التربية الإسلامية',className:'7/1',teacher:'معلم أول',grade:'السابع',active:true},
{id:'a2',profileId:'teacher-arab',subjectId:'arab-id',subject:'عربي',department:'اللغة العربية',className:'7/1',teacher:'معلم ثان',grade:'السابع',active:true}
];
let current=SR63.withCatalog(workspace);
const gradeSnapshot=JSON.stringify(current.rows.map(r=>({scores:r.scores,totals:r.totals,statuses:r.statuses})));
for(const [id,newName] of [['islam-id','التربية الإسلامية'],['arab-id','اللغة العربية']]){
 const subject=current.subjects.find(s=>s.id===id);
 assert.ok(subject,'same subject ID exists');
 const coordinator=SR63.subjectCoordinator(current,subject.name);
 current=SR63.withCatalog(SR63.renameAcademicSubject(current,id,newName,newName,coordinator));
 assert.equal(current.subjects.find(s=>s.id===id)?.name,newName,'department and subject agree');
}
assert.deepEqual(Array.from(current.subjects,s=>s.name),['التربية الإسلامية','اللغة العربية']);
assert.deepEqual(Array.from(current.rows,r=>r.subject),['التربية الإسلامية','اللغة العربية']);
assert.deepEqual(Array.from(current.teacherAssignments,a=>a.subject),['التربية الإسلامية','اللغة العربية']);
assert.deepEqual(Array.from(current.teachers,t=>t.subject),['التربية الإسلامية','اللغة العربية']);
assert.equal(JSON.stringify(current.rows.map(r=>({scores:r.scores,totals:r.totals,statuses:r.statuses}))),gradeSnapshot,'marks and statuses are unchanged');
assert.equal(current.subjectRenames?.length,2,'authorization rename history retained');
const ui=fs.readFileSync(path.join(__dirname,'../src/master-ui.js'),'utf8');
assert.match(ui,/matchSubjectDepartment=async/);
assert.match(ui,/children:'مطابقة مع القسم'/);
assert.match(ui,/if\(queued\)eb.info/,'no premature cloud success');
const cloud=fs.readFileSync(path.join(__dirname,'../src/cloud.js'),'utf8');
assert.match(cloud,/SR63\.cloud\.role==='admin'\?'school_staff_admin_save':'school_save'/,'admin saves via the authorized owner workspace RPC');
assert.match(cloud,/school_staff_admin_archive_list/,'admin archives show school owner backups');
assert.match(cloud,/school_staff_admin_archive_get/);
assert.match(cloud,/school_staff_admin_archive_delete/);
assert.match(ui,/SR63\\.storage\\.pending\\|\\|SR63\\.storage\\.busy/,'admin must wait for pending cloud saves before editing again');
const dbTimeout=fs.readFileSync(path.join(__dirname,'../../supabase/migrations/20261108_schoolresult_cloud_save_57014_timeout.sql'),'utf8');
assert.match(dbTimeout,/ALTER FUNCTION public\\.school_save\\(bigint, jsonb, uuid, jsonb\\) SET statement_timeout TO '30s'/);
assert.match(dbTimeout,/ALTER FUNCTION public\\.school_snapshot\\(jsonb\\) SET statement_timeout TO '30s'/);
console.log('PASS admin academic subject rename, coordinator and teacher mappings, immutable scores, UI match action');
