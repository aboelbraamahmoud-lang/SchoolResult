const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const {transformSync}=require('esbuild');
const src=fs.readFileSync(path.join(root,'supabase/functions/school-staff/index.ts'),'utf8');
const js=transformSync(src,{loader:'ts',format:'cjs',target:'es2022'}).code;
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
 let caps=await call('capabilities');assert.equal(caps.status,200);assert.equal(caps.data.leadershipRoles,true);assert.equal(caps.data.departmentScope,'coordinator_only');for(const role of ['psychologist','social_worker'])assert.ok(caps.data.supportedRoles.includes(role));
 for(const role of ['vice_principal','principal','psychologist','social_worker']){
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
 // Special education is a standalone coordinator department, even without teacher assignments.
 ws.rows.push({id:'ese',studentId:'E7',studentName:'طالبة دمج',className:'7/ESE',subject:'الرياضيات',department:'الدعم الإضافي',scores:{exam1:11},statuses:{exam1:'present'},totals:{exam1:30}});
 const offered=await call('list');assert.equal(offered.status,200,JSON.stringify(offered));
 assert.ok(offered.data.departments.includes('التربية الخاصة'),'Users checkbox must offer Special Education');
 const special=await call('create',{username:'specialcoordinator',displayName:'منسقة التربية الخاصة',password:'securepass123!',role:'coordinator',departments:['التربية الخاصة'],permissions:{reports:true,export:true,studentLevels:true}});
 assert.equal(special.status,200,JSON.stringify(special));
 assert.deepEqual(Array.from(created.at(-1).departments),['التربية الخاصة']);
 assert.equal(created.at(-1).permissions.export,true);
 roleExisting='coordinator';departmentsExisting=['الرياضيات'];
 const updateSpecial=await call('update',{userId:staffId,departments:['التربية الخاصة']});
 assert.equal(updateSpecial.status,200,JSON.stringify(updateSpecial));
 assert.deepEqual(Array.from(updated.at(-1).departments),['التربية الخاصة']);

 const valid=await call('create',{username:'coordinator3',displayName:'منسق',password:'securepass123!',role:'coordinator',departments:['الرياضيات']});
 assert.equal(valid.status,200);assert.deepEqual(Array.from(created.at(-1).departments),['الرياضيات']);
 for(const role of ['vice_principal','principal','psychologist','social_worker']){
   roleExisting=role;departmentsExisting=['قسم قديم'];
   const res=await call('update',{userId:staffId,permissions:{reports:true,savePlans:true},departments:['قسم غير موجود']});
   assert.equal(res.status,200,JSON.stringify(res));
   assert.deepEqual(Array.from(updated.at(-1).departments),[]);
   assert.equal(updated.at(-1).permissions.savePlans,false);
 }
 roleExisting='coordinator';departmentsExisting=['الرياضيات'];
 rejected=await call('update',{userId:staffId,departments:['قسم غير موجود']});
 assert.equal(rejected.status,400);assert.equal(rejected.data.error,'INVALID_DEPARTMENT');
 let converted=await call('update',{userId:staffId,role:'social_worker',departments:['قسم غير موجود']});
 assert.equal(converted.status,200);assert.deepEqual(Array.from(updated.at(-1).departments),[]);
 const ui=fs.readFileSync(path.join(root,'source/src/staff.js'),'utf8');
 for(const role of ['psychologist','social_worker'])assert.ok(ui.includes("value:'"+role+"'"),'Admin form must offer '+role);
 const loginUI=fs.readFileSync(path.join(root,'source/src/cloud-ui.js'),'utf8');
 const leadershipUI=fs.readFileSync(path.join(root,'source/src/leadership.js'),'utf8');
 const cloud=fs.readFileSync(path.join(root,'source/src/cloud.js'),'utf8');
 for(const role of ['psychologist','social_worker']){
  assert.ok(loginUI.includes(role),'Login route must recognize '+role);
  assert.ok(leadershipUI.includes(role),'Leadership dashboard must name '+role);
  assert.ok(cloud.includes(role),'Full workspace must be blocked for '+role);
 }
 const migration=fs.readFileSync(path.join(root,'supabase/migrations/20261108_school_specialists_roles.sql'),'utf8');
 for(const role of ['psychologist','social_worker'])assert.ok(migration.includes("'"+role+"'"),'DB role constraint must include '+role);
 assert(ui.includes('form.role===\'coordinator\'?form.departments:[]'));
 assert(ui.includes('user.role===\'coordinator\'?(0,q.jsx)(\'div\''));
 assert(ui.includes("action:'capabilities'"));
 const sql=fs.readFileSync(path.join(root,'supabase/migrations/20261013_101000_leadership_accounts_scope_fix.sql'),'utf8');
 assert(sql.includes("role <> 'coordinator' OR cardinality(departments) > 0"));
 assert(sql.includes("role IN ('vice_principal','principal')"));
 console.log('Leadership scope: principal+vice create without departments; coordinator scoped+validated; capabilities; migration: PASS (19 checks)');
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
