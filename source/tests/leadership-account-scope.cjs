const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const src=fs.readFileSync(path.join(root,'supabase/functions/school-staff/index.ts'),'utf8');
const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const ownerId='00000000-0000-4000-8000-000000000001';
const staffId='00000000-0000-4000-8000-000000000002';
const requests=[],created=[],updated=[],authCreated=[];
let handler,roleExisting='vice_principal',departmentsExisting=['الرياضيات'];
const ws={teacherAssignments:[{department:'الرياضيات',subject:'الرياضيات'},{department:'اللغة العربية',subject:'اللغة العربية'}],rows:[],settings:{},aiPlans:[]};
const chain=(table,updates=null)=>({
  filters:{},select(){return this},eq(column,value){this.filters[column]=value;return this},order(){return Promise.resolve({data:[],error:null})},
  maybeSingle(){
    if(table==='school_workspaces')return Promise.resolve({data:{owner_id:ownerId,workspace:ws,revision:2,saved_at:'2026-10-13'},error:null});
    if(table==='school_staff_accounts'&&this.filters.user_id===staffId&&this.filters.owner_id===ownerId)return Promise.resolve({data:{user_id:staffId,role:roleExisting,departments:departmentsExisting,permissions:{reports:true,savePlans:true,generateAI:true},active:true},error:null});
    return Promise.resolve({data:null,error:null});
  },
  insert(item){created.push(item);return Promise.resolve({error:null})},
  update(item){updated.push(item);return {eq(){return this},then(resolve){return Promise.resolve({error:null}).then(resolve)}}}
});
function getAdmin(){return {auth:{admin:{createUser:async data=>{authCreated.push(data);return {data:{user:{id:staffId}},error:null}},deleteUser:async()=>{},updateUserById:async()=>({error:null})}},from(name){
 return chain(name);
}}}
const sandbox={exports:{},require:()=>({createClient:(url,key)=>key==='service'?getAdmin():{auth:{getUser:async()=>({data:{user:{id:ownerId,email:'owner@test.invalid'}},error:null})}}}),Deno:{serve:fn=>handler=fn,env:{get:k=>({'SUPABASE_URL':'https://unit.test','SUPABASE_SERVICE_ROLE_KEY':'service','SUPABASE_ANON_KEY':'anon'})[k]}},TextEncoder,crypto:crypto.webcrypto,URL,Response,console};
vm.runInNewContext(js,sandbox,{timeout:20000});
async function call(action,body={}){const input={action,...body};requests.push(input);const req=new Request('https://unit.test/functions/v1/school-staff',{method:'POST',headers:{Authorization:'Bearer TEST','Content-Type':'application/json'},body:JSON.stringify(input)});const out=await handler(req);return {status:out.status,data:await out.json()}}
async function main(){
 let caps=await call('capabilities');assert.equal(caps.status,200);assert.equal(caps.data.leadershipRoles,true);assert.equal(caps.data.departmentScope,'coordinator_only');
 for(const role of ['vice_principal','principal']){
  const result=await call('create',{username:role+'1',displayName:'موظف قيادي',password:'securepass123!',role,departments:['قسم غير موجود'],permissions:{reports:true,savePlans:true,generateAI:true}});
  assert.equal(result.status,200,JSON.stringify(result));
  assert.deepEqual(Array.from(created.at(-1).departments),[]);
  assert.equal(created.at(-1).role,role);
  assert.equal(created.at(-1).permissions.savePlans,false);
  assert.equal(created.at(-1).permissions.generateAI,false);
 }
 let rejected=await call('create',{username:'coordinator1',displayName:'منسق',password:'securepass123!',role:'coordinator',departments:[]});
 assert.equal(rejected.status,400);assert.equal(rejected.data.error,'COORDINATOR_NEEDS_DEPARTMENT');
 rejected=await call('create',{username:'coordinator2',displayName:'منسق',password:'securepass123!',role:'coordinator',departments:['قسم غير موجود']});
 assert.equal(rejected.status,400);assert.equal(rejected.data.error,'INVALID_DEPARTMENT');
 const valid=await call('create',{username:'coordinator3',displayName:'منسق',password:'securepass123!',role:'coordinator',departments:['الرياضيات']});
 assert.equal(valid.status,200);assert.deepEqual(Array.from(created.at(-1).departments),['الرياضيات']);
 for(const role of ['vice_principal','principal']){
   roleExisting=role;departmentsExisting=['قسم قديم'];
   const res=await call('update',{userId:staffId,permissions:{reports:true,savePlans:true},departments:['قسم غير موجود']});
   assert.equal(res.status,200,JSON.stringify(res));
   assert.deepEqual(Array.from(updated.at(-1).departments),[]);
   assert.equal(updated.at(-1).permissions.savePlans,false);
 }
 roleExisting='coordinator';departmentsExisting=['الرياضيات'];
 rejected=await call('update',{userId:staffId,departments:['قسم غير موجود']});
 assert.equal(rejected.status,400);assert.equal(rejected.data.error,'INVALID_DEPARTMENT');
 let converted=await call('update',{userId:staffId,role:'principal',departments:['قسم غير موجود']});
 assert.equal(converted.status,200);assert.deepEqual(Array.from(updated.at(-1).departments),[]);
 const ui=fs.readFileSync(path.join(root,'source/src/staff.js'),'utf8');
 assert(ui.includes('form.role===\'coordinator\'?form.departments:[]'));
 assert(ui.includes('user.role===\'coordinator\'?(0,q.jsx)(\'div\''));
 assert(ui.includes("action:'capabilities'"));
 const sql=fs.readFileSync(path.join(root,'supabase/migrations/20261013_101000_leadership_accounts_scope_fix.sql'),'utf8');
 assert(sql.includes("role <> 'coordinator' OR cardinality(departments) > 0"));
 assert(sql.includes("role IN ('vice_principal','principal')"));
 console.log('Leadership scope: principal+vice create without departments; coordinator scoped+validated; capabilities; migration: PASS (19 checks)');
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
