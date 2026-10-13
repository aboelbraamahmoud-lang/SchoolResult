/** SchoolResult staff authentication, account management and server-scoped coordinator read, 6.10.26. */
import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
const reply=(body:unknown,status=200,origin='*')=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'}});
const normalize=(v:unknown)=>String(v??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en');
const safeUsername=(s:string)=>s.length>=3&&s.length<=42&&/^[\p{L}\p{N}_. \-]+$/u.test(s);
const pkeys=['reports','plans','savePlans','compare','failedStudents','teacherAnalysis','generateAI','export','studentLevels'];
const readRoles=['coordinator','vice_principal','principal'];
const editableRoles=['admin',...readRoles];
const needsDepartment=(role:string)=>role==='coordinator';
const leadershipRoles=['vice_principal','principal'];
const boolPermissions=(value:any)=>Object.fromEntries(pkeys.map(k=>[k,value?.[k]===true]));
const dept=(text:unknown)=>String(text??'').normalize('NFKC').replace(/[\s\u0640]+/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').toLowerCase();
const indexSubjects=(ws:any,deps:string[])=>{
 const allowed=new Set(deps.map(dept)),subjects=new Set<string>();
 const assignments=(Array.isArray(ws.teacherAssignments)?ws.teacherAssignments:[]);
 for(const a of assignments)if(allowed.has(dept(a.department))||allowed.has(dept(a.subject)))subjects.add(dept(a.subject));
 for(const d of allowed)subjects.add(d);
 return subjects;
};
const departmentRows=(ws:any,deps:string[])=>{
 const depts=new Set(deps.map(dept)),subjects=indexSubjects(ws,deps);
 return (Array.isArray(ws.rows)?ws.rows:[]).filter((r:any)=>depts.has(dept(r.department))||subjects.has(dept(r.subject)));
};
const summaryBenchmarks=(ws:any,examKey?:string)=>{
 const exam=String(['exam1','exam2','exam3','exam4'].includes(examKey||'')?examKey:ws.activeExam||'exam1'),per=new Map<string,{department:string,evaluated:number,passed:number,score:number,total:number}>();
 for(const row of (Array.isArray(ws.rows)?ws.rows:[])){
  const klass=String(row.examClasses?.[exam]||row.className||'').toUpperCase();
  // Integration/support classes must not skew general-school percentages.
  if(/\/ESE$/.test(klass)||/دمج|دعم إضافي/.test(String(row.department||'')))continue;
  const name=String(row.department||row.subject||'').trim();if(!name)continue;
  const status=row.statuses?.[exam],score=row.scores?.[exam],max=row.totals?.[exam]??ws.settings?.exams?.find((e:any)=>e.key===exam)?.total;
  if(status!=='present'||typeof score!=='number'||!Number.isFinite(score)||typeof max!=='number'||!Number.isFinite(max)||max<=0)continue;
  const x=per.get(name)||{department:name,evaluated:0,passed:0,score:0,total:0};
  x.evaluated++;x.score+=score;x.total+=max;if(score/max*100>=Number(ws.settings?.pass??50))x.passed++;per.set(name,x);
 }
 return [...per.values()].map(x=>({department:x.department,evaluated:x.evaluated,success:Math.round(x.passed/x.evaluated*1000)/10,achievement:Math.round(x.score/x.total*1000)/10}));
};
const cleanCoordinator=(ws:any,deps:string[])=>{
 const rows=departmentRows(ws,deps),subjects=indexSubjects(ws,deps),depts=new Set(deps.map(dept));
 const assignments=(ws.teacherAssignments||[]).filter((r:any)=>depts.has(dept(r.department))||subjects.has(dept(r.subject)));
 const teacherNames=new Set(assignments.map((x:any)=>String(x.teacher||'')));
 const teachers=(ws.teachers||[]).filter((t:any)=>depts.has(dept(t.department))||subjects.has(dept(t.subject)));
 const settings=ws.settings||{};
 // Whitelist settings. Never send whole workspace or backups, imports, other-subject records, auth metadata.
 const fields=['schoolName','academicYear','exams','pass','bands','minSampleSize','subjectPresentation','subjectLabels','subjectOrder','reportDesign','academicViceName','principalName','signatures','footerText','reportTitle'];
 const publicSettings=Object.fromEntries(fields.filter(k=>Object.prototype.hasOwnProperty.call(settings,k)).map(k=>[k,settings[k]]));
 const plans=(ws.aiPlans||[]).filter((p:any)=>subjects.has(dept(p.subject)));
 return {workspace:{version:ws.version,settings:publicSettings,activeExam:ws.activeExam,rows,teachers,teacherAssignments:assignments,aiPlans:plans,grades:[],classes:[],subjects:[],students:[],imports:[],auditLog:[],customReports:[]}};
};
// School leadership sees the entire school's analytical rows through this
// whitelisted read-only response. Never expose auth data, backups or arbitrary
// workspace settings to staff without owner/admin privileges.
const cleanLeadership=(ws:any)=>{
 const visible=cleanCoordinator(ws,[...new Set((ws.teacherAssignments||[]).map((r:any)=>String(r.department||r.subject||'').trim()).filter(Boolean))]);
 visible.workspace.rows=Array.isArray(ws.rows)?ws.rows:[];
 visible.workspace.teachers=Array.isArray(ws.teachers)?ws.teachers:[];
 visible.workspace.teacherAssignments=Array.isArray(ws.teacherAssignments)?ws.teacherAssignments:[];
 visible.workspace.aiPlans=Array.isArray(ws.aiPlans)?ws.aiPlans:[];
 return visible;
};
async function emailForUsername(username:string){const raw=new TextEncoder().encode('schoolresult-v1:'+username),hash=await crypto.subtle.digest('SHA-256',raw);return 'u-'+[...new Uint8Array(hash)].slice(0,24).map(b=>b.toString(16).padStart(2,'0')).join('')+'@staff.schoolresult.example.com';}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'*';if(req.method==='OPTIONS')return reply({},200,origin);
 if(req.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405,origin);
 if(Number(req.headers.get('content-length')||0)>18000)return reply({error:'REQUEST_TOO_LARGE'},413,origin);
 const token=(req.headers.get('authorization')||'').match(/^Bearer\s+(.+)$/i)?.[1];
 if(!token)return reply({error:'LOGIN_REQUIRED'},401,origin);
 const url=Deno.env.get('SUPABASE_URL'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),anon=Deno.env.get('SUPABASE_ANON_KEY');
 if(!url||!service||!anon)return reply({error:'SERVER_NOT_CONFIGURED'},503,origin);
 const auth=createClient(url,anon,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:authData,error:authError}=await auth.auth.getUser(token);
 if(authError||!authData?.user)return reply({error:'INVALID_SESSION'},401,origin);
 const user=authData.user;
 let body:any;try{body=await req.json();}catch{return reply({error:'INVALID_JSON'},400,origin);}
 if(JSON.stringify(body).length>18000)return reply({error:'REQUEST_TOO_LARGE'},413,origin);
 const action=String(body.action||'profile');
 const [mine,owner]=await Promise.all([
   admin.from('school_staff_accounts').select('user_id,owner_id,username,display_name,role,departments,permissions,active').eq('user_id',user.id).maybeSingle(),
   admin.from('school_workspaces').select('owner_id').eq('owner_id',user.id).maybeSingle()
 ]);
 if(mine.error||owner.error)return reply({error:'ACCOUNT_LOOKUP_FAILED'},503,origin);
 const account=mine.data,ownerId=owner.data?user.id:(account?.active?account.owner_id:null),role=owner.data?'owner':account?.active?account.role:null;
 if(!ownerId||!role)return reply({error:'ACCOUNT_DISABLED_OR_UNAUTHORIZED'},403,origin);
 const profile={role,ownerId,username:account?.username||null,displayName:account?.display_name||user.email?.split('@')[0]||'مدير المدرسة',departments:account?.departments||[],permissions:readRoles.includes(role)?boolPermissions(account?.permissions):Object.fromEntries(pkeys.map(k=>[k,true]))};
 if(action==='profile')return reply({profile},200,origin);
 if(action==='capabilities'){
  if(!['owner','admin'].includes(role))return reply({error:'ADMIN_ONLY'},403,origin);
  return reply({apiVersion:'6.10.38',leadershipRoles:true,departmentScope:'coordinator_only',supportedRoles:editableRoles},200,origin);
 }
 if(action==='coordinator_data'){
  if(!readRoles.includes(role))return reply({error:'STAFF_REPORTS_ONLY'},403,origin);
  const {data,error}=await admin.from('school_workspaces').select('workspace,revision,saved_at').eq('owner_id',ownerId).maybeSingle();
  if(error||!data)return reply({error:'WORKSPACE_NOT_AVAILABLE'},503,origin);
  const scoped=role==='coordinator'?cleanCoordinator(data.workspace,profile.departments):cleanLeadership(data.workspace);
  return reply({...scoped,benchmarks:profile.permissions.compare===true?summaryBenchmarks(data.workspace,String(body.exam||'')):[],revision:data.revision,savedAt:data.saved_at,profile},200,origin);
 }
 if(!['owner','admin'].includes(role))return reply({error:'ADMIN_ONLY'},403,origin);
 if(action==='list'){
  const {data,error}=await admin.from('school_staff_accounts').select('user_id,username,display_name,role,departments,permissions,active,created_at').eq('owner_id',ownerId).order('created_at',{ascending:true});
  if(error)return reply({error:'ACCOUNT_LIST_FAILED'},503,origin);
  const {data:work}=await admin.from('school_workspaces').select('workspace').eq('owner_id',ownerId).maybeSingle();
  const departments=[...new Set((work?.workspace?.teacherAssignments||[]).map((r:any)=>String(r.department||r.subject||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));
  return reply({accounts:data,departments},200,origin);
 }
 if(action==='create'){
  const username=normalize(body.username),displayName=String(body.displayName||body.username||'').trim().slice(0,120),password=String(body.password||'');
  const newRole=String(body.role||'coordinator'),departments=Array.isArray(body.departments)?[...new Set(body.departments.map((x:any)=>String(x).trim()))].filter(Boolean):[];
  if(!safeUsername(username)||displayName.length<2||password.length<10||password.length>128||!editableRoles.includes(newRole))return reply({error:'INVALID_ACCOUNT_DATA'},400,origin);
  const {data:work}=await admin.from('school_workspaces').select('workspace').eq('owner_id',ownerId).maybeSingle();
  const allowed=new Set((work?.workspace?.teacherAssignments||[]).map((r:any)=>String(r.department||r.subject||'').trim()).filter(Boolean));
  if(needsDepartment(newRole)&&!departments.length)return reply({error:'COORDINATOR_NEEDS_DEPARTMENT'},400,origin);
  if(needsDepartment(newRole)&&departments.some(x=>!allowed.has(x)))return reply({error:'INVALID_DEPARTMENT'},400,origin);
  // Leadership and admin roles have school-wide scope; discard any stale client department values.
  const scopedDepartments=needsDepartment(newRole)?departments:[];
  const email=await emailForUsername(username);
  const {data:created,error:creationError}=await admin.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{schoolresult_staff:true}});
  if(creationError||!created?.user)return reply({error:/already|registered|exists/i.test(creationError?.message||'')?'USERNAME_EXISTS':'USER_CREATION_FAILED'},409,origin);
  const row={user_id:created.user.id,owner_id:ownerId,username,display_name:displayName,role:newRole,departments:scopedDepartments,permissions:readRoles.includes(newRole)?{...boolPermissions(body.permissions),...(newRole==='coordinator'?{}:{savePlans:false,generateAI:false})}:{},active:true,created_by:user.id};
  const {error:saveError}=await admin.from('school_staff_accounts').insert(row);
  if(saveError){await admin.auth.admin.deleteUser(created.user.id);return reply({error:saveError.code==='23505'?'USERNAME_EXISTS':'ACCOUNT_SAVE_FAILED'},409,origin);}
  return reply({created:true,account:{user_id:row.user_id,username,display_name:displayName,role:newRole,departments:row.departments,permissions:row.permissions,active:true}},200,origin);
 }
 if(action==='update'){
  const id=String(body.userId||'');if(!/^[0-9a-f-]{36}$/i.test(id))return reply({error:'INVALID_USER'},400,origin);
  const {data:target,error:targetErr}=await admin.from('school_staff_accounts').select('user_id,role,departments,permissions,active').eq('owner_id',ownerId).eq('user_id',id).maybeSingle();
  if(targetErr||!target)return reply({error:'STAFF_NOT_FOUND'},404,origin);
  const patch:any={updated_at:new Date().toISOString()};
  if(typeof body.active==='boolean')patch.active=body.active;
  if(body.role!==undefined){if(!editableRoles.includes(body.role))return reply({error:'INVALID_ACCOUNT_DATA'},400,origin);patch.role=body.role;}
  if(body.displayName!==undefined){const name=String(body.displayName).trim();if(name.length<2||name.length>120)return reply({error:'INVALID_NAME'},400,origin);patch.display_name=name;}
  const targetRole=patch.role||target.role;
  if(needsDepartment(targetRole)){
   const rawDepartments=body.departments!==undefined?body.departments:target.departments;
   if(!Array.isArray(rawDepartments))return reply({error:'INVALID_DEPARTMENT'},400,origin);
   const selected=[...new Set(rawDepartments.map((x:any)=>String(x).trim()).filter(Boolean))];
   if(!selected.length)return reply({error:'COORDINATOR_NEEDS_DEPARTMENT'},400,origin);
   const {data:work}=await admin.from('school_workspaces').select('workspace').eq('owner_id',ownerId).maybeSingle();
   const allowed=new Set((work?.workspace?.teacherAssignments||[]).map((r:any)=>String(r.department||r.subject||'').trim()).filter(Boolean));
   if(selected.some(x=>!allowed.has(x)))return reply({error:'INVALID_DEPARTMENT'},400,origin);
   patch.departments=selected;
  }else{
   // Owner-approved leadership accounts supervise every department and require no department list.
   patch.departments=[];
  }
  if(body.permissions!==undefined)patch.permissions=boolPermissions(body.permissions);
  if(leadershipRoles.includes(targetRole))patch.permissions={...boolPermissions(patch.permissions||target.permissions),savePlans:false,generateAI:false};
  if(body.password!==undefined){const pwd=String(body.password||'');if(pwd.length<10||pwd.length>128)return reply({error:'WEAK_PASSWORD'},400,origin);const {error}=await admin.auth.admin.updateUserById(id,{password:pwd});if(error)return reply({error:'PASSWORD_CHANGE_FAILED'},503,origin);}
  const {error}=await admin.from('school_staff_accounts').update(patch).eq('user_id',id).eq('owner_id',ownerId);
  if(error)return reply({error:'ACCOUNT_UPDATE_FAILED'},503,origin);
  return reply({updated:true},200,origin);
 }
 return reply({error:'UNKNOWN_ACTION'},400,origin);
});
