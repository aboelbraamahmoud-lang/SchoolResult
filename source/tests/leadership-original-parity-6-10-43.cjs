/* Server projection fidelity: school leader must receive all display-only fields
   that the original report-center uses, while retaining the backend whitelist. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto').webcrypto;
const {loadApp}=require('./harness.cjs');
const app=loadApp().ctx;
const source=fs.readFileSync(path.join(__dirname,'../../supabase/functions/school-staff/index.ts'),'utf8');
let compile;
try{const esbuild=require('esbuild');compile=text=>esbuild.transformSync(text,{loader:'ts',format:'cjs',target:'es2022'}).code;}
catch{const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');compile=text=>ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;}
const code=compile(source+'\nexports.__test={cleanLeadership,cleanCoordinator};');
const sandbox={exports:{},require:()=>({createClient:()=>({})}),Deno:{serve:()=>{}},TextEncoder,crypto,URL,Response,console};
vm.runInNewContext(code,sandbox,{timeout:10000});
const {cleanLeadership,cleanCoordinator}=sandbox.exports.__test;
const ws=app.zj();
ws.settings.schoolVision='رؤية المدرسة';
ws.settings.preparedByName='أعده النائب';
ws.settings.reviewedByName='مراجعة مدير المدرسة';
ws.settings.coordinatorName='منسق المدرسة';
ws.settings.secretAPIToken='NEVER_EXPOSE_THIS_TOKEN';
ws.imports=[{secret:'DO_NOT_EXPOSE_INTERNAL_IMPORT'}];
ws.auditLog=[{message:'DO_NOT_EXPOSE_INTERNAL_AUDIT'}];
const school=cleanLeadership(ws).workspace;
const coordinator=cleanCoordinator(ws,['الرياضيات']).workspace;
for(const key of ['stable','coordinatorName','schoolVision','programmerDesignerName','reportSystemName','preparedByName','reviewedByName','showGeneratedAt','statusAliases','reportDesign']){
 assert.equal(JSON.stringify(school.settings[key]),JSON.stringify(ws.settings[key]),'print design/calculation field matches admin: '+key);
}
assert.equal(school.rows.length,ws.rows.length,'principal/vice sees same school rows');
assert.equal(JSON.stringify(school.rows),JSON.stringify(ws.rows),'exactly same grade, subject and status data');
assert.equal(JSON.stringify(school.teachers),JSON.stringify(ws.teachers),'same teacher catalog');
assert.equal(JSON.stringify(school.teacherAssignments),JSON.stringify(ws.teacherAssignments),'same allocations');
assert.equal(school.settings.secretAPIToken,undefined,'no secret config exposed');
assert.equal(school.aiPlans.length,0,'school leadership must not receive AI plan drafts');
assert.ok(!JSON.stringify(school).includes('NEVER_EXPOSE_THIS_TOKEN'),'no accidental secrets');
assert.ok(!JSON.stringify(school).includes('DO_NOT_EXPOSE_INTERNAL'),'no imports or audit log');
assert.equal(coordinator.settings.schoolVision,ws.settings.schoolVision,'coordinator preserves school print vision without widening student scope');
for(const tab of ['summary','levels','struggling','teachers','comparison','subjects']){
 const dimension=tab==='teachers'?'teacher':'className';
 const args=(settings)=>[ws.rows,dimension,'الكل','الكل',tab,'exam2',ws.settings.pass,settings];
 const full=app.mde(...args(ws.settings));
 const leader=app.mde(...args(school.settings));
 assert.equal(JSON.stringify(leader),JSON.stringify(full),'original '+tab+' exactly same pages for admin and leader');
 assert.ok(full.length>0,'original '+tab+' has pages');
}
console.log('PASS 6.10.43: live-shape backend school projection, six original print models data parity, no internal data leaks.');
