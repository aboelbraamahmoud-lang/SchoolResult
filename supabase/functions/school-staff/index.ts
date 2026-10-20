/** SchoolResult staff authentication, account management and server-scoped coordinator read, 6.10.26. */
import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { yearExamCompare, yearExamDataset, previousAcademicYear } from './year-over-year.ts';
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
const skillKind=(value:unknown)=>{
 const x=dept(value).replace(/^قسم(?=(?:اللغة|العربية|الانجليزية|عربي|انجليزي))/,'');
 return ['عربي','العربية','لغةعربية','اللغةالعربية','arabic'].includes(x)?'arabic':
  ['انجليزي','الانجليزي','الانجليزية','لغةانجليزية','اللغةالانجليزية','english','englishlanguage'].includes(x)?'english':null;
};
const skillClass=(value:unknown)=>String(value??'').trim().replace(/^0([789])\//,'$1/').toUpperCase();
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
 const scoped=departmentRows(ws,deps),authorizedKinds=new Set(deps.map(skillKind).filter(Boolean));
 const rows=(Array.isArray(ws.rows)?ws.rows:[]).filter((r:any)=>scoped.includes(r)||authorizedKinds.has(skillKind(r.subject))),subjects=indexSubjects(ws,deps),depts=new Set(deps.map(dept));
 const assignments=(ws.teacherAssignments||[]).filter((r:any)=>depts.has(dept(r.department))||subjects.has(dept(r.subject)));
 const teacherNames=new Set(assignments.map((x:any)=>String(x.teacher||'')));
 const teachers=(ws.teachers||[]).filter((t:any)=>depts.has(dept(t.department))||subjects.has(dept(t.subject)));
 const settings=ws.settings||{};
 // Whitelist settings. Never send whole workspace or backups, imports, other-subject records, auth metadata.
 const fields=['schoolName','academicYear','exams','pass','bands','minSampleSize','subjectPresentation','subjectLabels','subjectOrder','reportDesign','coordinatorName','stable','academicViceName','principalName','signatures','footerText','reportTitle'];
 const publicSettings=Object.fromEntries(fields.filter(k=>Object.prototype.hasOwnProperty.call(settings,k)).map(k=>[k,settings[k]]));
 if(typeof publicSettings.coordinatorName!=='string')publicSettings.coordinatorName='';
 if(!Number.isFinite(Number(publicSettings.stable)))publicSettings.stable=3;
 const plans=(ws.aiPlans||[]).filter((p:any)=>subjects.has(dept(p.subject)));
 // Arabic spelling aliases are equivalent for skill reports, without widening any row permissions.
 const skillSubject=(value:unknown)=>skillKind(value)||dept(value);
 const allowedSkills=new Set([...subjects,...depts].map(skillSubject));
 const skillsAssessments=(Array.isArray(ws.skillsAssessments)?ws.skillsAssessments:[]).filter((a:any)=>allowedSkills.has(skillSubject(a.subject)));
 return {workspace:{version:ws.version,settings:publicSettings,activeExam:ws.activeExam,rows,teachers,teacherAssignments:assignments,aiPlans:plans,skillsAssessments,grades:[],classes:[],subjects:[],imports:[],auditLog:[],customReports:[]}};
};
// School leadership sees the entire school's analytical rows through this
// whitelisted read-only response. Never expose auth data, backups or arbitrary
// workspace settings to staff without owner/admin privileges.
const cleanLeadership=(ws:any)=>{
 const visible=cleanCoordinator(ws,[...new Set<string>((ws.teacherAssignments||[] as any[]).map((r:any)=>String(r.department||r.subject||'').trim()).filter(Boolean))]);
 // The original admin print center reads these presentation-only settings.
 // Preserve them for school leaders so its comparisons, notes and signatory
 // fields are identical; NEVER forward auth tokens, secrets or backup metadata.
 const printFields=['stable','coordinatorName','schoolVision','programmerDesignerName','reportSystemName','preparedByName','reviewedByName','showGeneratedAt','statusAliases'];
 const originalSettings=ws.settings||{};
 for(const key of printFields)if(Object.prototype.hasOwnProperty.call(originalSettings,key))visible.workspace.settings[key]=originalSettings[key];
 // Some legacy school workspaces predate this field, but the original report
 // renderer assumes coordinatorName is a string.
 if(typeof visible.workspace.settings.coordinatorName!=='string')visible.workspace.settings.coordinatorName='';
 visible.workspace.skillsAssessments=Array.isArray(ws.skillsAssessments)?ws.skillsAssessments:[];
 visible.workspace.rows=Array.isArray(ws.rows)?ws.rows:[];
 visible.workspace.teachers=Array.isArray(ws.teachers)?ws.teachers:[];
 visible.workspace.teacherAssignments=Array.isArray(ws.teacherAssignments)?ws.teacherAssignments:[];
 // Read-only school leadership does not receive editable AI plans.
 visible.workspace.aiPlans=[];
 return visible;
};
async function emailForUsername(username:string){const raw=new TextEncoder().encode('schoolresult-v1:'+username),hash=await crypto.subtle.digest('SHA-256',raw);return 'u-'+[...new Uint8Array(hash)].slice(0,24).map(b=>b.toString(16).padStart(2,'0')).join('')+'@staff.schoolresult.example.com';}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'*';if(req.method==='OPTIONS')return reply({},200,origin);
 if(req.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405,origin);
 if(Number(req.headers.get('content-length')||0)>2000000)return reply({error:'REQUEST_TOO_LARGE'},413,origin);
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
 if(JSON.stringify(body).length>(body?.action==='save_skills'?2000000:18000))return reply({error:'REQUEST_TOO_LARGE'},413,origin);
 const action=String(body.action||'profile');
 const [mine,owner]=await Promise.all([
   admin.from('school_staff_accounts').select('user_id,owner_id,username,display_name,role,departments,permissions,active').eq('user_id',user.id).maybeSingle(),
   admin.from('school_workspaces').select('owner_id').eq('owner_id',user.id).maybeSingle()
 ]);
 if(mine.error||owner.error)return reply({error:'ACCOUNT_LOOKUP_FAILED'},503,origin);
 const account=mine.data,ownerId=owner.data?user.id:(account?.active?account.owner_id:null),role=owner.data?'owner':account?.active?account.role:null;
 if(!ownerId||!role)return reply({error:'ACCOUNT_DISABLED_OR_UNAUTHORIZED'},403,origin);
 const profile={role,ownerId,username:account?.username||null,displayName:account?.display_name||user.email?.split('@')[0]||'مدير المدرسة',departments:account?.departments||[],permissions:readRoles.includes(role)?boolPermissions(account?.permissions):Object.fromEntries(pkeys.map(k=>[k,true])),skillsWrite:role==='coordinator'&&boolPermissions(account?.permissions).reports===true&&(account?.departments||[]).some((x:string)=>!!skillKind(x))};
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
  if(profile.permissions.reports!==true)scoped.workspace.skillsAssessments=[];
  return reply({...scoped,benchmarks:profile.permissions.compare===true?summaryBenchmarks(data.workspace,String(body.exam||'')):[],revision:data.revision,savedAt:data.saved_at,profile},200,origin);
 }
 if(action==='year_comparison'){
  // Authenticated report-only endpoint. Returns only per-grade and school aggregates, not old-year pupils.
  if(!(['owner','admin'].includes(role)||readRoles.includes(role))||
     (readRoles.includes(role)&&profile.permissions.reports!==true))
   return reply({error:'PERMISSION_DENIED'},403,origin);
  const exam=String(body.exam||'');
  if(!/^exam[1-4]$/.test(exam))return reply({error:'INVALID_EXAM'},400,origin);
  const {data:school,error:schoolError}=await admin.from('school_workspaces')
   .select('workspace').eq('owner_id',ownerId).maybeSingle();
  if(schoolError||!school?.workspace)return reply({error:'WORKSPACE_NOT_AVAILABLE'},503,origin);
  const ws=school.workspace,previousYear=previousAcademicYear(ws.settings?.academicYear);
  if(!previousYear)return reply({error:'INVALID_YEAR'},400,origin);
  const {data:candidates,error:archiveError}=await admin.from('school_archives')
   .select('id,year,at,reason,pinned,workspace').eq('owner_id',ownerId)
   .eq('year',previousYear).is('deleted_at',null)
   .order('pinned',{ascending:false}).order('at',{ascending:false}).limit(20);
  if(archiveError)return reply({error:'YEAR_ARCHIVE_READ_FAILED'},503,origin);
  if(!candidates?.length)return reply({error:'YEAR_ARCHIVE_NOT_FOUND',previousYear},404,origin);
  const selected=candidates.find((x:any)=>(x.workspace?.settings?.exams||[]).some((e:any)=>e.key===exam)&&
    (x.workspace?.rows||[]).some((r:any)=>r.statuses?.[exam]==='present'))||
    candidates.find((x:any)=>Array.isArray(x.workspace?.rows)&&x.workspace.rows.length)||
    candidates[0];
  const departments=role==='coordinator'?[...(profile.departments||[]),...indexSubjects(ws,profile.departments||[])]:null;
  try{
   const report=yearExamCompare(ws,selected.workspace,exam,departments);
   return reply({report:{...report,archiveAt:selected.at,archivePinned:selected.pinned===true,
     archiveLabel:selected.pinned===true?'الأرشيف السنوي المعتمد':'آخر أرشيف متاح للعام السابق'}},200,origin);
  }catch(error){
   const message=String((error as Error)?.message||'YEAR_COMPARISON_FAILED');
   const known=['INVALID_EXAM','INVALID_YEAR','ARCHIVE_YEAR_MISMATCH','EXAM_NOT_AVAILABLE_IN_BOTH_YEARS'];
   return reply({error:known.includes(message)?message:'YEAR_COMPARISON_FAILED'},known.includes(message)?400:503,origin);
  }
 }
 if(action==='save_skills'){
  // Only coordinators may update skill analysis for their assigned subject.
  // No full workspace writes and no changes to official exam results.
  if(role!=='coordinator'||profile.permissions.reports!==true||profile.skillsWrite!==true)return reply({error:'PERMISSION_DENIED'},403,origin);
  const incoming=body.assessment,expected=Number(body.expectedRevision),kind=skillKind(incoming?.subject);
  if(!incoming||typeof incoming!=='object'||Array.isArray(incoming)||!Number.isSafeInteger(expected)||expected<0||!kind)
   return reply({error:'INVALID_SKILL_DATA'},400,origin);
  if(!(profile.departments||[]).some((x:string)=>skillKind(x)===kind))return reply({error:'PERMISSION_DENIED'},403,origin);
  if(incoming.version!==1||!['exam1','exam2','exam3','exam4'].includes(incoming.exam)||
    typeof incoming.id!=='string'||!new RegExp('^skills-'+kind+'-'+incoming.exam+'-[a-zA-Z0-9-]{1,45}$').test(incoming.id)||
    !Array.isArray(incoming.skills)||incoming.skills.length<1||incoming.skills.length>12||
    !Array.isArray(incoming.records)||incoming.records.length>5000)return reply({error:'INVALID_SKILL_DATA'},400,origin);
  const definitions=new Set<string>(),labels=new Set<string>(),skills:any[]=[];
  for(const def of incoming.skills){
   const label=String(def?.label||'').trim(),maximum=def?.max??null;
   if(!def||typeof def.key!=='string'||!/^[-_a-zA-Z0-9]{1,50}$/.test(def.key)||definitions.has(def.key)||
     !label||label.length>85||labels.has(label)||
     maximum!==null&&(!Number.isFinite(maximum)||maximum<=0||maximum>999))
    return reply({error:'INVALID_SKILL_DATA'},400,origin);
   definitions.add(def.key);labels.add(label);skills.push({key:def.key,label,max:maximum});
  }
  const pass=Number(incoming.passThreshold??50);
  if(!Number.isFinite(pass)||pass<0||pass>100)return reply({error:'INVALID_SKILL_DATA'},400,origin);
  const {data:prior,error:readError}=await admin.from('school_workspaces')
   .select('workspace,revision').eq('owner_id',ownerId).maybeSingle();
  if(readError||!prior)return reply({error:'WORKSPACE_NOT_AVAILABLE'},503,origin);
  if(Number(prior.revision)!==expected)return reply({error:'CLOUD_CONFLICT'},409,origin);
  const ws=prior.workspace||{};
  const official=(Array.isArray(ws.rows)?ws.rows:[]).filter((r:any)=>skillKind(r.subject)===kind);
  const roster=new Map<string,any>();
  for(const r of official){
   const id=String(r.studentId||'').trim(),klass=skillClass(r.examClasses?.[incoming.exam]||r.className);
   if(id&&klass)roster.set(id+'|'+klass,r);
  }
  if(!roster.size)return reply({error:'NO_AUTHORIZED_STUDENTS'},403,origin);
  const seen=new Set<string>(),records:any[]=[];
  for(const r of incoming.records){
   const id=String(r?.id??'').trim(),klass=skillClass(r?.className),key=id+'|'+klass,source=roster.get(key);
   if(!source||seen.has(key)||id.length>40||klass.length>25||!r.marks||typeof r.marks!=='object'||Array.isArray(r.marks)||
    Object.keys(r.marks).some(k=>!definitions.has(k)))return reply({error:'UNAUTHORIZED_SKILL_STUDENT'},403,origin);
   seen.add(key);
   const marks:Record<string,number|null>={};
   for(const s of skills){
    const value=r.marks[s.key]??null;
    if(value!==null&&(!Number.isFinite(value)||value<0||value>999||(s.max!==null&&value>s.max)))
     return reply({error:'INVALID_SKILL_DATA'},400,origin);
    marks[s.key]=value;
   }
   records.push({id,name:String(source.studentName||'').slice(0,150),className:klass,grade:klass.split('/')[0],marks});
  }
  if(!records.length)return reply({error:'INVALID_SKILL_DATA'},400,origin);
  const savedItems=Array.isArray(ws.skillsAssessments)?ws.skillsAssessments:[];
  if(savedItems.length>=32&&!savedItems.some((a:any)=>a.id===incoming.id))return reply({error:'SKILL_LIMIT_REACHED'},400,origin);
  if(savedItems.some((a:any)=>a.id===incoming.id&&(
    skillKind(a.subject)!==kind||a.exam!==incoming.exam)))return reply({error:'PERMISSION_DENIED'},403,origin);
  // Keep only server-verified fields; any supplied official score is ignored.
  const assessment={version:1,id:incoming.id,subject:kind==='arabic'?'اللغة العربية':'اللغة الإنجليزية',
   subjectKey:kind,exam:incoming.exam,academicYear:String(incoming.academicYear||ws.settings?.academicYear||'').slice(0,40),
   fileName:String(incoming.fileName||'إدخال درجات المهارات').slice(0,180),importedAt:new Date().toISOString(),
   modifiedAt:new Date().toISOString(),modifiedBy:profile.displayName,passThreshold:pass,
   skills,records,issues:[],classCount:new Set(records.map(r=>r.className)).size,
   gradeCount:new Set(records.map(r=>r.grade)).size};
  const updated={...ws,skillsAssessments:[...savedItems.filter((a:any)=>a.id!==incoming.id),assessment]};
  const {data:saved,error:saveError}=await admin.from('school_workspaces')
   .update({workspace:updated,revision:expected+1,saved_at:new Date().toISOString(),write_id:crypto.randomUUID()})
   .eq('owner_id',ownerId).eq('revision',expected).select('revision').maybeSingle();
  if(saveError)return reply({error:'SKILL_SAVE_FAILED'},503,origin);
  if(!saved)return reply({error:'CLOUD_CONFLICT'},409,origin);
  return reply({saved:true,revision:saved.revision,students:records.length},200,origin);
 }
 if(!['owner','admin'].includes(role))return reply({error:'ADMIN_ONLY'},403,origin);
 if(action==='list'){
  const {data,error}=await admin.from('school_staff_accounts').select('user_id,username,display_name,role,departments,permissions,active,created_at').eq('owner_id',ownerId).order('created_at',{ascending:true});
  if(error)return reply({error:'ACCOUNT_LIST_FAILED'},503,origin);
  const {data:work}=await admin.from('school_workspaces').select('workspace').eq('owner_id',ownerId).maybeSingle();
  const departments=[...new Set<string>((work?.workspace?.teacherAssignments||[] as any[]).map((r:any)=>String(r.department||r.subject||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));
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
