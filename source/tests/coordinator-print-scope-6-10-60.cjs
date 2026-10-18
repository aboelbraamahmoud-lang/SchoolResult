'use strict';
// All PDF/ZIP/print scopes must use the actual server-filtered coordinator data.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const crypto=require('node:crypto').webcrypto;
const {loadApp}=require('./harness.cjs');
const app=loadApp().ctx;
const source=fs.readFileSync(path.join(__dirname,'../../supabase/functions/school-staff/index.ts'),'utf8');
let compile;
try{const esbuild=require('esbuild');compile=input=>esbuild.transformSync(input,{loader:'ts',format:'cjs',target:'es2022'}).code;}
catch{const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');compile=input=>ts.transpileModule(input,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;}
const output=compile(source+'\nexports.__test={cleanCoordinator,cleanLeadership};');
const sandbox={exports:{},require:()=>({createClient:()=>({})}),Deno:{serve:()=>{}},TextEncoder,crypto,URL,Response,console};
vm.runInNewContext(output,sandbox,{timeout:10000});
const {cleanCoordinator,cleanLeadership}=sandbox.exports.__test;
const ws=app.zj();
ws.settings.schoolName='مدرسة اختبار النطاق';
ws.rows=[
 {id:'math',studentId:'student1',studentName:'طالب رياضيات',className:'7/1',grade:'7',subject:'الرياضيات',department:'الرياضيات',teacher:'معلم الرياضيات',scores:{exam1:25,exam2:27},statuses:{exam1:'present',exam2:'present'},totals:{exam1:30,exam2:30}},
 {id:'arabic',studentId:'student2',studentName:'طالب لغة عربية',className:'7/1',grade:'7',subject:'اللغة العربية',department:'اللغة العربية',teacher:'معلم اللغة العربية',scores:{exam1:21,exam2:22},statuses:{exam1:'present',exam2:'present'},totals:{exam1:30,exam2:30}}
];
ws.teacherAssignments=[{teacher:'معلم الرياضيات',subject:'الرياضيات',department:'الرياضيات',className:'7/1'},{teacher:'معلم اللغة العربية',subject:'اللغة العربية',department:'اللغة العربية',className:'7/1'}];
ws.teachers=[{teacher:'معلم الرياضيات',subject:'الرياضيات',department:'الرياضيات'},{teacher:'معلم اللغة العربية',subject:'اللغة العربية',department:'اللغة العربية'}];
ws.imports=[{secret:'SECRET_BACKUP'}];ws.auditLog=[{secret:'SECRET_LOG'}];
const scoped=cleanCoordinator(ws,['الرياضيات']).workspace;
const leader=cleanLeadership(ws).workspace;
assert.equal(scoped.rows.length,1,'only assigned department students are visible');
assert.equal(scoped.rows[0].subject,'الرياضيات');
assert.equal(scoped.teacherAssignments.length,1,'teacher assignments remain scoped');
assert.equal(scoped.teachers.length,1,'teacher list remains scoped');
assert.equal(leader.rows.length,2,'principal and vice retain school-wide scope');
assert.equal(scoped.settings.schoolName,ws.settings.schoolName,'school report branding remains');
assert.equal(JSON.stringify(scoped.settings.reportDesign),JSON.stringify(ws.settings.reportDesign),'report template is preserved');
assert.equal(scoped.imports.length,0);assert.equal(scoped.auditLog.length,0);
assert.ok(!JSON.stringify(scoped).includes('طالب لغة عربية'),'forbidden department data cannot leak');
assert.ok(!JSON.stringify(scoped).includes('SECRET_'),'private workspace data cannot leak');
const pages=app.mde(scoped.rows,'className','الكل','الكل','summary','exam1',ws.settings.pass,scoped.settings);
assert.ok(pages.length>0,'official report engine builds coordinator pages');
for(const page of pages){
 assert.ok([...(page.rows||[]),...(page.allRows||[])].every(x=>x.subject==='الرياضيات'),'the output never includes another department');
}
const portal=fs.readFileSync(path.join(__dirname,'../src/staff.js'),'utf8');
assert.match(portal,/\['reportCenter','مركز التقارير والطباعة',!!perms\.reports\]/);
assert.match(portal,/readOnly:true,canPrint:!!perms\.export/);
assert.match(portal,/reportScope:isLeadership\?'school':'department'/);
console.log('PASS: coordinator server scope, printable report data, read-only authorization and principal-wide access');
