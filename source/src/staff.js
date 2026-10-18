/* SchoolResult 6.10.26 — authenticated, server-scoped school staff. */
SR63.staff={
 normalize(username){return String(username||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en');},
 async emailForUsername(username){
  const cleaned=this.normalize(username);
  if(cleaned.length<3||cleaned.length>42||!/^[\p{L}\p{N}_. -]+$/u.test(cleaned))throw new Error('اسم المستخدم بين 3 و42 حرفًا، ويمكن كتابته بالعربية.');
  const data=new TextEncoder().encode('schoolresult-v1:'+cleaned),digest=await crypto.subtle.digest('SHA-256',data);
  return 'u-'+[...new Uint8Array(digest)].slice(0,24).map(x=>x.toString(16).padStart(2,'0')).join('')+'@staff.schoolresult.example.com';
 },
 async call(body){
  // Profile loading must not leave the sign-in screen waiting for the global 45s timeout.
  // Other operations (imports, large department reports) retain their normal timeout.
  const isProfile=body?.action==='profile',controller=isProfile?new AbortController():null;
  const timeout=controller?setTimeout(()=>controller.abort(),14000):null;
  let result;try{result=await SR63.cloud.client().functions.invoke('school-staff',{body,...(controller?{signal:controller.signal}:{})});}
  catch(cause){const ex=new Error(isProfile?'تعذر التحقق من الصلاحيات بسبب اتصال مؤقت. يُرجى إعادة التحقق.':'تعذر الاتصال بخدمة إدارة المستخدمين.');ex.code='STAFF_NETWORK_TIMEOUT';ex.transient=true;throw ex;}
  finally{if(timeout)clearTimeout(timeout);}
  const {data,error}=result;
  if(error){let reason='تعذّر الاتصال بخدمة إدارة المستخدمين.';
   try{const response=error.context;if(response&&typeof response.json==='function'){const json=await response.json();reason=json?.error||reason;}}catch{}
   const messages={STAFF_FUNCTION_OUTDATED:'خدمة إدارة المستخدمين في Supabase تحتاج تحديثًا لتفعيل حسابات النائب الأكاديمي والمدير. انشر آخر إصدار من وظيفة school-staff وطبّق ترحيل الصلاحيات.',ACCOUNT_DISABLED_OR_UNAUTHORIZED:'هذا الحساب غير مفعّل أو لا يملك صلاحية الدخول.',INVALID_SESSION:'انتهت جلسة تسجيل الدخول.',ADMIN_ONLY:'هذه العملية مخصصة للأدمن.',INVALID_ACCOUNT_DATA:'راجع اسم المستخدم وكلمة المرور (10 أحرف على الأقل).',USERNAME_EXISTS:'اسم المستخدم مستخدم من قبل.',INVALID_DEPARTMENT:'القسم غير موجود ضمن تكليفات المدرسة.',COORDINATOR_NEEDS_DEPARTMENT:'يجب تحديد قسم واحد على الأقل للمنسق.',ACCOUNT_SAVE_FAILED:'تعذر حفظ المستخدم.',INVALID_NAME:'الاسم الظاهر غير صالح.',STAFF_NOT_FOUND:'المستخدم غير موجود.',PERMISSION_DENIED:'لا تملك صلاحية هذه العملية.'};
   const failure=new Error(messages[reason]||reason);failure.code=reason;
   const status=Number(error.context?.status||0);
   failure.transient=status===408||status===429||status>=500||/network|fetch|abort|timeout/i.test(String(error.message||''));
   if(failure.transient&&reason==='تعذّر الاتصال بخدمة إدارة المستخدمين.')failure.message='اتصال خدمة الصلاحيات متأخر مؤقتًا، تُعاد المحاولة تلقائيًا.';
   throw failure;
  }
  if(data?.error){const failure=new Error(data.error);failure.code=data.error;failure.transient=data.error==='ACCOUNT_LOOKUP_FAILED';throw failure;}
  return data;
 },
 async profile(){return (await this.call({action:'profile'})).profile;},
 async coordinatorLoad(exam=''){const result=await this.call({action:'coordinator_data',exam});return {...result,comparisonExam:exam};}
};
SR63.StaffAdminPage=function(){
 const [accounts,setAccounts]=(0,v.useState)([]),[departments,setDepartments]=(0,v.useState)([]),
 [busy,setBusy]=(0,v.useState)(false),[error,setError]=(0,v.useState)(''),[success,setSuccess]=(0,v.useState)(''),[leadershipStatus,setLeadershipStatus]=(0,v.useState)('checking'),
 [form,setForm]=(0,v.useState)({username:'',displayName:'',password:'',role:'coordinator',departments:[],permissions:{reports:true,plans:true,savePlans:true,compare:true,failedStudents:true,teacherAnalysis:true,generateAI:false,export:true,studentLevels:true}});
 const reload=async()=>{setBusy(true);setError('');try{const data=await SR63.staff.call({action:'list'});setAccounts(data.accounts||[]);setDepartments(data.departments||[]);}catch(e){setError(e.message);}finally{setBusy(false);}};
 const checkLeadership=async()=>{try{const data=await SR63.staff.call({action:'capabilities'});const ok=data?.leadershipRoles===true&&data?.departmentScope==='coordinator_only';setLeadershipStatus(ok?'ready':'outdated');return ok;}catch{setLeadershipStatus('outdated');return false;}};
 (0,v.useEffect)(()=>{void reload();void checkLeadership()},[]);
 const permissions=[['reports','إنشاء التقارير وطباعتها'],['teacherAnalysis','تحليل المعلمين في القسم'],['compare','مقارنة القسم بالأقسام الأخرى (إجماليات فقط)'],['failedStudents','عرض الطلاب المتعثرين في مادة القسم'],['plans','عرض الخطط العلاجية وخطط التحسين'],['savePlans','حفظ وتحديث الخطط العلاجية'],['generateAI','توليد مسودات باستخدام Gemini'],['export','تصدير Word والتقارير'],['studentLevels','عرض مستويات طلاب الصفوف بالألوان']];
 const toggle=(key,checked)=>setForm(p=>({...p,permissions:{...p.permissions,[key]:checked}}));
 const save=async e=>{e.preventDefault();setBusy(true);setError('');setSuccess('');try{
  const isLeadership=['vice_principal','principal'].includes(form.role);
  if(isLeadership&&!(await checkLeadership()))throw Object.assign(new Error('يلزم نشر وظيفة school-staff الجديدة وتطبيق ترحيل صلاحيات الإدارة في Supabase قبل إنشاء حساب النائب الأكاديمي أو المدير.'),{code:'STAFF_FUNCTION_OUTDATED'});
  await SR63.staff.call({action:'create',...form,departments:form.role==='coordinator'?form.departments:[]});setSuccess('تم إنشاء الحساب. يستطيع المستخدم الدخول بالاسم وكلمة المرور مباشرة.');setForm({...form,username:'',displayName:'',password:''});await reload();
 }catch(ex){setError(['INVALID_DEPARTMENT','INVALID_ACCOUNT_DATA','ACCOUNT_SAVE_FAILED'].includes(ex.code)&&['vice_principal','principal'].includes(form.role)?'تعذر إنشاء حساب القيادة. تأكد من تطبيق ترحيل أدوار النائب والمدير ونشر وظيفة school-staff الجديدة في مشروع Supabase المرتبط بالموقع.':ex.message);}finally{setBusy(false);}};
 const edit=async(account,patch)=>{setBusy(true);setError('');setSuccess('');try{const targetRole=patch.role||account.role;if(['vice_principal','principal'].includes(targetRole)&&!(await checkLeadership()))throw new Error('يلزم تحديث خدمة school-staff قبل تعديل صلاحيات حساب المدير أو النائب الأكاديمي.');await SR63.staff.call({action:'update',userId:account.user_id,...patch,departments:targetRole==='coordinator'?(patch.departments??account.departments):[]});setSuccess('تم حفظ صلاحيات الحساب.');await reload();}catch(ex){setError(ex.message);}finally{setBusy(false);}};
 const field=(title,node)=>(0,q.jsxs)('label',{className:'srstaff-field',children:[(0,q.jsx)('span',{children:title}),node]});
 return (0,q.jsxs)('main',{className:'srstaff-page',dir:'rtl',children:[
  (0,q.jsx)('h1',{children:'إدارة المستخدمين والصلاحيات'}),
  (0,q.jsx)('p',{children:'أنشئ حسابات أدمن أو منسقين أو نائب أكاديمي أو مدير مدرسة. المنسق يُربط بقسمه فقط؛ أما النائب والمدير فيشرفان على المدرسة بكل أقسامها دون ربط بالأقسام.'}),
  leadershipStatus==='outdated'?(0,q.jsx)('p',{className:'srstaff-alert',role:'alert',children:'خدمة إدارة المستخدمين في Supabase بإصدار قديم أو لا تعلن دعم أدوار القيادة. يلزم نشر وظيفة school-staff الجديدة وتطبيق ترحيل الصلاحيات، قبل إنشاء المدير أو النائب.'}):null,
  error?(0,q.jsx)('p',{className:'srstaff-alert',role:'alert',children:error}):null,success?(0,q.jsx)('p',{className:'srstaff-success',role:'status',children:success}):null,
  (0,q.jsxs)('form',{className:'srstaff-panel',onSubmit:save,children:[
   (0,q.jsx)('h2',{children:'إنشاء حساب جديد'}),(0,q.jsx)('div',{className:'srstaff-grid',children:[
    field('اسم المستخدم (عربي أو إنجليزي)',(0,q.jsx)('input',{required:true,minLength:3,maxLength:42,autoComplete:'off',value:form.username,onChange:e=>setForm(x=>({...x,username:e.target.value})),placeholder:'مثال: منسق_الرياضيات'})),
    field('الاسم الظاهر',(0,q.jsx)('input',{required:true,value:form.displayName,onChange:e=>setForm(x=>({...x,displayName:e.target.value})),placeholder:'اسم الموظف'})),
    field('كلمة المرور — 10 أحرف على الأقل',(0,q.jsx)('input',{required:true,type:'password',autoComplete:'new-password',minLength:10,maxLength:128,value:form.password,onChange:e=>setForm(x=>({...x,password:e.target.value}))})),
    field('نوع الحساب',(0,q.jsx)('select',{value:form.role,onChange:e=>setForm(x=>({...x,role:e.target.value,departments:e.target.value==='coordinator'?x.departments:[]})),children:[(0,q.jsx)('option',{value:'coordinator',children:'منسق — صلاحيات محددة'}),(0,q.jsx)('option',{value:'admin',children:'أدمن — جميع صلاحيات البرنامج'}),(0,q.jsx)('option',{value:'vice_principal',children:'النائب الأكاديمي — تقارير جميع الأقسام'}),(0,q.jsx)('option',{value:'principal',children:'مدير المدرسة — متابعة المدرسة كاملة'})]}))
   ]}),
   ['vice_principal','principal'].includes(form.role)?(0,q.jsx)('p',{className:'srstaff-success',children:'نطاق الحساب: جميع أقسام المدرسة وكل المعلمين والصفوف. لا يلزم اختيار أي قسم.'}):null,
   form.role==='coordinator'?(0,q.jsxs)('div',{children:[(0,q.jsx)('h3',{children:'الأقسام التي يستطيع المنسق الوصول إليها'}),(0,q.jsx)('div',{className:'srstaff-checks',children:departments.map(name=>(0,q.jsxs)('label',{children:[(0,q.jsx)('input',{type:'checkbox',checked:form.departments.includes(name),onChange:e=>setForm(p=>({...p,departments:e.target.checked?[...p.departments,name]:p.departments.filter(x=>x!==name)}))}),name]},name))})]}):null,
   form.role!=='admin'?(0,q.jsxs)('div',{children:[(0,q.jsx)('h3',{children:'صلاحيات العرض والتقارير للحساب'}),(0,q.jsx)('div',{className:'srstaff-checks',children:permissions.filter(([key])=>form.role==='coordinator'||!['plans','savePlans','generateAI'].includes(key)).map(([key,label])=>(0,q.jsxs)('label',{children:[(0,q.jsx)('input',{type:'checkbox',checked:form.permissions[key]===true,onChange:e=>toggle(key,e.target.checked)}),label]},key))})]}):null,
   (0,q.jsx)('button',{type:'submit',disabled:busy||form.role==='coordinator'&&!form.departments.length||['vice_principal','principal'].includes(form.role)&&leadershipStatus!=='ready',children:busy?'جارٍ الحفظ…':'إنشاء الحساب'})
  ]}),
  (0,q.jsxs)('section',{className:'srstaff-panel',children:[(0,q.jsxs)('header',{className:'srstaff-flex',children:[(0,q.jsx)('h2',{children:'الحسابات الحالية ('+accounts.length+')'}),(0,q.jsx)('button',{type:'button',disabled:busy,onClick:()=>void reload(),children:'تحديث القائمة'})]}),
   accounts.length?(0,q.jsx)('div',{className:'srstaff-users',children:accounts.map(user=>(0,q.jsxs)('article',{className:'srstaff-user',children:[
    (0,q.jsxs)('div',{children:[(0,q.jsx)('strong',{children:user.display_name}),(0,q.jsx)('small',{children:user.username+' · '+(user.role==='admin'?'أدمن كامل':user.role==='coordinator'?'منسق':user.role==='vice_principal'?'النائب الأكاديمي':'مدير المدرسة')+' · '+(user.active?'مفعّل':'موقوف')})]}),
    user.role==='coordinator'?(0,q.jsx)('p',{children:(user.departments||[]).join('، ')}):null,
    (0,q.jsxs)('div',{className:'srstaff-flex',children:[
      (0,q.jsx)('button',{type:'button',disabled:busy,onClick:()=>void edit(user,{active:!user.active}),children:user.active?'إيقاف الحساب':'تفعيل الحساب'}),
      (0,q.jsx)('button',{type:'button',disabled:busy,onClick:()=>{const password=window.prompt('أدخل كلمة مرور جديدة (10 أحرف على الأقل).');if(password!==null)void edit(user,{password});},children:'تغيير كلمة المرور'}),
      ['admin','coordinator'].includes(user.role)?(0,q.jsx)('button',{type:'button',disabled:busy,onClick:()=>void edit(user,{role:user.role==='admin'?'coordinator':'admin',departments:user.role==='admin'?departments.slice(0,1):[],permissions:user.permissions}),children:user.role==='admin'?'تحويل إلى منسق':'منحه صلاحيات أدمن'}):null,
      user.role==='coordinator'?(0,q.jsx)('button',{type:'button',disabled:busy,onClick:()=>{setForm(x=>({...x,role:'coordinator',departments:user.departments,permissions:{...x.permissions,...user.permissions}}));window.scrollTo({top:0,behavior:'smooth'});setSuccess('انسخ/عدّل صلاحيات هذا المنسق في النموذج لإنشاء حساب مماثل. لتعديل الحساب الحالي استخدم الخيارات المباشرة أدناه.');},children:'نسخ إعداداته'}):null
    ]}),
    user.role!=='admin'?(0,q.jsxs)('details',{children:[(0,q.jsx)('summary',{children:'تعديل صلاحيات هذا الحساب'}),user.role==='coordinator'?(0,q.jsx)('div',{className:'srstaff-checks',children:departments.map(name=>(0,q.jsxs)('label',{children:[(0,q.jsx)('input',{type:'checkbox',disabled:busy,checked:(user.departments||[]).includes(name),onChange:e=>void edit(user,{departments:e.target.checked?[...user.departments,name]:user.departments.filter(x=>x!==name)})}),name]},name))}):(0,q.jsx)('p',{className:'srstaff-success',children:'نطاق الصلاحيات: جميع أقسام المدرسة دون قسم محدد.'}),(0,q.jsx)('div',{className:'srstaff-checks',children:permissions.filter(([key])=>user.role==='coordinator'||!['plans','savePlans','generateAI'].includes(key)).map(([key,label])=>(0,q.jsxs)('label',{children:[(0,q.jsx)('input',{type:'checkbox',disabled:busy,checked:user.permissions?.[key]===true,onChange:e=>void edit(user,{permissions:{...user.permissions,[key]:e.target.checked}})}),label]},key))})]}):null
   ]},user.user_id))}):(0,q.jsx)('p',{children:'لا توجد حسابات إضافية بعد. حساب المالك الأصلي يظل متاحًا.'})
  ]})
 ]});
};
/* Coordinator analytical dashboard. All calculations use server-filtered department rows. */
SR63.coordinatorDashboardData=function(workspace,exam,benchmarks=[]){
 const rows=Array.isArray(workspace?.rows)?workspace.rows:[],settings=workspace?.settings||{},
 exams=Array.isArray(settings.exams)?settings.exams:[],labels=exams.map(x=>({key:x.key,name:x.name}));
 const value=(r,e)=>{const max=Number(r?.totals?.[e]??exams.find(x=>x.key===e)?.total),num=r?.scores?.[e];return r?.statuses?.[e]==='present'&&typeof num==='number'&&Number.isFinite(num)&&Number.isFinite(max)&&max>0?{percentage:Math.min(100,Math.max(0,num/max*100)),score:num,max}:null;};
 const key=r=>String(r.studentId||r.studentName||r.id||'غير محدد');
 const evaluated=rows.map(r=>({row:r,result:value(r,exam)})).filter(x=>x.result),
 nonSupport=evaluated.filter(x=>!SR63.isSupportRow(x.row,exam)),
 persons=[...new Set(evaluated.map(x=>key(x.row)))];
 const count=(predicate,list=nonSupport)=>list.filter(predicate).length;
 const success=count(x=>x.result.percentage>=Number(settings.pass??50)),achievement=nonSupport.length?nonSupport.reduce((a,b)=>a+b.result.percentage,0)/nonSupport.length:null;
 const levels=[{label:'متدنٍ',color:'#c55664',min:0,max:60},{label:'متوسط',color:'#d5a238',min:60,max:80},{label:'مرتفع',color:'#0a877b',min:80,max:101}].map(l=>({...l,value:count(x=>x.result.percentage>=l.min&&x.result.percentage<l.max)}));
 const failed=evaluated.filter(x=>x.result.percentage<Number(settings.pass??50)).map(x=>({name:x.row.studentName,studentId:x.row.studentId,className:hj(x.row,exam)||x.row.className,subject:x.row.subject,score:x.result.score,total:x.result.max,percentage:x.result.percentage,teacher:mj(x.row,exam)||x.row.teacher}));
 const teachers=new Map(),classes=new Map();
 for(const x of nonSupport){const teacher=String(mj(x.row,exam)||x.row.teacher||'غير محدد'),klass=String(hj(x.row,exam)||x.row.className||'غير محدد');
  for(const [m,k] of [[teachers,teacher],[classes,klass]]){const old=m.get(k)||{name:k,results:0,success:0,sum:0};old.results++;old.sum+=x.result.percentage;if(x.result.percentage>=Number(settings.pass??50))old.success++;m.set(k,old);}}
 const stats=m=>[...m.values()].map(x=>({...x,achievement:x.results?x.sum/x.results:null,successRate:x.results?100*x.success/x.results:null})).sort((a,b)=>(b.achievement??0)-(a.achievement??0));
 const trend=labels.map(x=>{const ready=rows.filter(r=>!SR63.isSupportRow(r,x.key)).map(r=>value(r,x.key)).filter(Boolean);return {key:x.key,name:x.name,results:ready.length,achievement:ready.length?ready.reduce((a,b)=>a+b.percentage,0)/ready.length:null,success:ready.length?100*ready.filter(y=>y.percentage>=Number(settings.pass??50)).length/ready.length:null};});
 // Distribution is by unique students and weighted observed subject scores, not by rows.
 // Use the exact classification rules of the student-level report; never turn missing grades into zero.
 const bands=Array.isArray(settings.bands)&&settings.bands.length?settings.bands:[
  {id:'low',label:'دون 60%',min:0,max:60,color:'#c55664'},
  {id:'medium',label:'من 60% إلى أقل من 80%',min:60,max:80,color:'#d5a238'},
  {id:'high',label:'80% فأكثر',min:80,max:100,color:'#0a877b'}];
 const studentLevels=SR63.staffStudentLevels({settings:{...settings,bands},rows:rows.filter(r=>!SR63.isSupportRow(r,exam))},exam);
 const grades=new Map();for(const x of nonSupport){
  const klass=String(hj(x.row,exam)||x.row.className||'').trim();
  const match=klass.match(/(?:^|[^\d])(7|8|9)(?=\s*[/\-–]|\s|$)/);
  const grade=match?match[1]:null;if(!grade)continue;
  const entry=grades.get(grade)||{grade,results:0,passed:0,sum:0};entry.results++;entry.sum+=x.result.percentage;if(x.result.percentage>=Number(settings.pass??50))entry.passed++;grades.set(grade,entry);
 }
 const gradeSummary=[...grades.values()].sort((a,b)=>Number(a.grade)-Number(b.grade)).map(x=>({name:'الصف '+({'7':'السابع','8':'الثامن','9':'التاسع'}[x.grade]||x.grade),grade:x.grade,results:x.results,achievement:x.sum/x.results,successRate:100*x.passed/x.results}));
 return {students:persons.length,evaluated:evaluated.length,regular:nonSupport.length,success:nonSupport.length?100*success/nonSupport.length:null,achievement,levels,studentLevels,gradeSummary,failed,teachers:stats(teachers),classes:stats(classes),trend,benchmarks};
};
SR63.CoordinatorPortal=function({profile}){
 const [payload,setPayload]=(0,v.useState)(null),[error,setError]=(0,v.useState)(''),[loading,setLoading]=(0,v.useState)(true),
 [page,setPage]=(0,v.useState)('dashboard'),[chosenExam,setChosenExam]=(0,v.useState)(''),[showLegend,setShowLegend]=(0,v.useState)(true),[levelClass,setLevelClass]=(0,v.useState)('الكل'),[levelSubject,setLevelSubject]=(0,v.useState)('الكل'),[previousExam,setPreviousExam]=(0,v.useState)('');
 const reload=async(requestedExam=chosenExam)=>{setLoading(true);setError('');try{const next=await SR63.staff.coordinatorLoad(requestedExam);setPayload(next);}catch(e){setError(e.message||'تعذر تحديث النتائج');}finally{setLoading(false);}};
 (0,v.useEffect)(()=>{void reload();},[profile.ownerId,profile.username]);
 const workspace=payload?.workspace||null,perms=profile.permissions||{},settings=workspace?.settings||{},exams=settings.exams||[],
 exam=exams.some(x=>x.key===chosenExam)?chosenExam:(workspace?.activeExam||exams[0]?.key||'exam1');
 const currentExam=exams.find(x=>x.key===exam),examName=currentExam?.name||'التقييم المحدد',active={...workspace,activeExam:exam};
 const benchmarks=(payload?.comparisonExam===exam||!payload?.comparisonExam&&exam===workspace?.activeExam)?(payload?.benchmarks||[]):[];
 const data=(0,v.useMemo)(()=>workspace?SR63.coordinatorDashboardData(workspace,exam,benchmarks):null,[workspace,exam,payload]);
 // Original admin reports consult SR63.currentWorkspace for report-scope auditing
 // and label/subject ordering. Always bind it to THIS authenticated school;
 // clear the reference when staff exits or switches account/exam.
 (0,v.useEffect)(()=>{if(!workspace)return;const reportWorkspace={...workspace,activeExam:exam};SR63.currentWorkspace=reportWorkspace;return()=>{if(SR63.currentWorkspace===reportWorkspace)SR63.currentWorkspace=null;};},[workspace,exam,profile.ownerId,profile.username]);
 const isLeadership=['vice_principal','principal'].includes(profile.role),scopeLabel=isLeadership?'المدرسة':'القسم';
 const scopedClasses=[...new Set((workspace?.rows||[]).map(r=>String(r.examClasses?.[exam]||r.className||'')).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar',{numeric:true}));
 const scopedSubjects=[...new Set((workspace?.rows||[]).map(r=>String(r.subject||'')).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));
 const levelGroups=(0,v.useMemo)(()=>workspace?SR63.staffStudentLevels(workspace,exam,levelClass,levelSubject):[],[workspace,exam,levelClass,levelSubject]);
 const otherExam=exams.some(x=>x.key===previousExam&&x.key!==exam)?previousExam:(exams.find(x=>x.key!==exam&&exams.indexOf(x)<exams.findIndex(y=>y.key===exam))?.key||exams.find(x=>x.key!==exam)?.key||'');
 const chronological=SR63.staffExamChronology(settings,exam,otherExam),canCompare=!!chronological;
 const compared=(0,v.useMemo)(()=>workspace&&chronological?SR63.staffExamComparison(workspace,chronological.older,chronological.later):[],[workspace,chronological?.older,chronological?.later]);
 const staffPrint=(type,args)=>{try{SR63.staffReportPrint(type,args,{schoolName:settings.schoolName,academicYear:settings.academicYear,principalName:settings.principalName});}catch(error){setError(error.message||'تعذرت الطباعة.');}};
 const fmt=n=>typeof n==='number'&&Number.isFinite(n)?n.toFixed(1)+'%':'—';
 const h=(tag,props,children)=>(0,q.jsx)(tag,{...props,children});
 const liveChart=html=>h('div',{className:'sr640-chart-live',dangerouslySetInnerHTML:{__html:html}});
 const chart=(label,value,color)=>h('div',{className:'srcoord-bar-row'},[h('div',{className:'srcoord-bar-name'},label),h('div',{className:'srcoord-bar-track'},h('div',{className:'srcoord-bar-fill',style:{width:`${Math.max(0,Math.min(100,value||0))}%`,background:color||'#0b867d'}})),h('strong',{},fmt(value))]);
 const note=(text)=>h('p',{className:'sr642-chart-note'},text);
 const compareBar=(label,value,color)=>h('div',{className:'sr642-compare-bar',key:label},[h('span',{},label),h('div',{className:'sr642-meter'},h('div',{style:{width:`${Math.max(0,Math.min(100,value??0))}%`,background:color}})),h('strong',{},fmt(value))]);
 const rankedPanel=(title,items,opts={})=>{
  const list=[...items].filter(x=>typeof x.achievement==='number'&&Number.isFinite(x.achievement));
  list.sort((a,b)=>opts.lowFirst?(a.achievement-b.achievement):(b.achievement-a.achievement));
  const selected=list.slice(0,opts.limit||18);
  return h('article',{className:'srcoord-chart sr642-ranked '+(opts.wide?'sr642-wide':'')},[
   h('header',{className:'sr642-chart-heading'},[h('h3',{},title),h('span',{className:'sr642-chart-tag'},opts.lowFirst?'الأقل تحصيلًا أولًا':'الأعلى تحصيلًا أولًا')]),
   note(opts.note||'الشريط يوضح نسبة التحصيل؛ الرقم بجانبه هو حجم النتائج المرصودة.'),
   selected.length?h('div',{className:'sr642-rank-grid'},selected.map((x,i)=>h('div',{className:'sr642-rank-item',key:x.name+'-'+i},[
    h('div',{className:'sr642-rank-head'},[h('strong',{},x.name),h('span',{},`${x.results||0} نتيجة مرصودة`)]),
    compareBar('التحصيل',x.achievement,'#0a887a'),
    opts.success!==false?compareBar('النجاح',x.successRate,'#bf872e'):null
   ]))):h('p',{className:'srcoord-muted'},'لا تتوفر نتائج مرصودة صالحة لعرض المقارنة.'),
   list.length>selected.length?note(`يعرض الرسم ${selected.length} من ${list.length}؛ بقية البيانات موجودة في التفاصيل أدناه.`):null
  ]);
 };
 const trendPanel=()=>{
  const valid=data.trend,chartW=680,chartH=250,padLeft=50,padRight=25,padTop=25,padBottom=30;
  const plotW=chartW-padLeft-padRight,plotH=chartH-padTop-padBottom;
  const at=(i,v)=>({x:padLeft+(valid.length===1?plotW/2:i*plotW/(valid.length-1)),y:padTop+(100-v)*plotH/100});
  const lines=(metric,color)=>{
   const parts=[];let segment=[];
   const flush=()=>{if(segment.length>1)parts.push(h('polyline',{key:metric+'-'+parts.length,points:segment.map(c=>c.x+','+c.y).join(' '),fill:'none',stroke:color,'stroke-width':4,'stroke-linecap':'round','stroke-linejoin':'round'}));segment=[];};
   valid.forEach((item,i)=>{if(typeof item[metric]==='number')segment.push(at(i,item[metric]));else flush();});flush();
   valid.forEach((item,i)=>{if(typeof item[metric]==='number'){const pos=at(i,item[metric]);parts.push(h('circle',{key:metric+'p'+i,cx:pos.x,cy:pos.y,r:6,fill:color,stroke:'#fff','stroke-width':3}));}});
   return parts;
  };
  return h('article',{className:'srcoord-chart sr642-trend-panel'},[
   h('header',{className:'sr642-chart-heading'},[h('h3',{},'كيف تغيّر أداء '+(isLeadership?'المدرسة':'القسم')+' بين الاختبارات؟'),h('span',{className:'sr642-chart-tag'},'من 0 إلى 100%')]),
   note('التحصيل = متوسط نسب النتائج المرصودة؛ النجاح = نسبة النتائج التي بلغت حد النجاح. تُستبعد حالات الغياب والدعم الإضافي.'),
   h('div',{className:'sr642-chart-legend'},[h('span',{},[h('i',{style:{background:'#087d76'}}),'التحصيل الأكاديمي']),h('span',{},[h('i',{style:{background:'#c58c2c'}}),'نسبة النجاح'])]),
   h('div',{className:'sr642-trend-svg'},h('svg',{viewBox:`0 0 ${chartW} ${chartH}`,role:'img','aria-label':'مقارنة تحصيل ونجاح النتائج عبر الاختبارات بنسب مئوية من صفر إلى مئة'},[
    ...[0,25,50,75,100].map(n=>{const y=at(0,n).y;return h('g',{key:'grid'+n},[h('line',{x1:padLeft,y1:y,x2:chartW-padRight,y2:y,stroke:'#dce9eb','stroke-dasharray':'5 6'}),h('text',{x:padLeft-9,y:y+5,'text-anchor':'end','font-size':12,fill:'#536e7d'},String(n)+'%')]);}),
    ...valid.map((ex,i)=>h('line',{key:'axis'+i,x1:at(i,0).x,x2:at(i,0).x,y1:padTop,y2:chartH-padBottom,stroke:'#ecf2f3'})),
    ...lines('achievement','#087d76'),...lines('success','#c58c2c')
   ])),
   h('div',{className:'sr642-trend-points'},valid.map(x=>h('div',{className:'sr642-trend-point',key:x.key},[
    h('b',{},x.name),h('span',{},['التحصيل ',h('strong',{style:{color:'#087d76'}},fmt(x.achievement))]),
    h('span',{},['النجاح ',h('strong',{style:{color:'#a77420'}},fmt(x.success))]),
    h('small',{},`${x.results} نتيجة مرصودة`)
   ])))
  ]);
 };
 const bandPanel=()=>{
  const bands=data.studentLevels||[],total=bands.reduce((n,x)=>n+x.students.length,0),r=52,C=2*Math.PI*r;let used=0;
  const slices=bands.map(b=>{const count=b.students.length,len=total?C*count/total:0,start=used;used+=len;return h('circle',{key:b.id,cx:80,cy:80,r,fill:'none',stroke:b.color,'stroke-width':21,'stroke-dasharray':`${len} ${C-len}`,'stroke-dashoffset':-start,transform:'rotate(-90 80 80)'});});
  return h('article',{className:'srcoord-chart sr642-level-panel'},[
   h('h3',{},'ما مستويات الطلاب في '+(isLeadership?'المدرسة':'القسم')+'؟'),
   note('كل طالب يُحسب مرة واحدة بناءً على مجموع درجات مواده المرصودة، وفق حدود مستويات المدرسة. الغياب لا يُحسب صفرًا.'),
   total?h('div',{className:'srcoord-ring-layout'},[
    h('div',{className:'sr642-ring-wrap'},[h('svg',{className:'srcoord-ring',viewBox:'0 0 160 160',role:'img','aria-label':'رسم دائري لنسب توزيع الطلاب على مستويات الأداء'},[h('circle',{cx:80,cy:80,r,fill:'none',stroke:'#edf1f3','stroke-width':21}),...slices]),h('div',{className:'sr642-ring-center'},[h('strong',{},String(total)),h('span',{},'طالب')])]),
    h('div',{className:'srcoord-legend'},bands.map(x=>h('div',{key:x.id},[h('i',{style:{background:x.color}}),h('span',{},x.label),h('strong',{},`${x.students.length} طالب · ${(100*x.students.length/total).toFixed(1)}%`)])))
   ]):h('p',{className:'srcoord-muted'},'لا توجد بيانات طلاب لعرض توزيع المستويات.'),
   note('يُظهر هذا الرسم عدد الطلاب الفريدين وليس عدد نتائج المواد. حالات الدعم الإضافي خارج هذه المقارنة.')
  ]);
 };
 const gradePanel=()=>rankedPanel('كيف يتوزع تحصيل المدرسة على الصفوف؟',data.gradeSummary,{note:'مقارنة نسب التحصيل والنجاح للصفوف، وأعداد نتائج المواد المرصودة بكل صف.',success:true,wide:true,lowFirst:true});
 const sectionCharts=()=>h('section',{className:'srcoord-chart-grid sr642-chart-grid'},[
  trendPanel(),bandPanel(),
  isLeadership&&data.gradeSummary?.length?gradePanel():null,
  rankedPanel('أي الشعب تحتاج إلى متابعة أكبر؟',data.classes,{note:'الشعب مرتبة من الأقل تحصيلًا. المقارنة حسب نتائج التعليم العام المرصودة في الاختبار المختار.',success:true,wide:true,lowFirst:true,limit:20})
 ]);
 const cards=[['الطلاب ذوو نتائج',data?.students??0,'طالب فريد يشمل الدعم الإضافي'],['النتائج المرصودة',data?.evaluated??0,'يشمل الدعم الإضافي'],['نسبة نجاح النتائج',fmt(data?.success),'من نتائج التعليم العام المرصودة'],['التحصيل الأكاديمي',fmt(data?.achievement),'متوسط نسبة النتائج المرصودة'],['معلمو '+scopeLabel,data?.teachers?.length??0,'من لديهم نتائج مرصودة'],['الطلاب المتعثرون',new Set((data?.failed||[]).map(x=>(x.studentId||x.name)+'|'+x.className)).size,'عدد الطلاب المختلفين تحت حد النجاح في مادة واحدة أو أكثر']];
 const views=[['dashboard','لوحة '+scopeLabel,true],['overview','ملخص أداء المدرسة',isLeadership&&!!perms.reports],['levels','مستويات الطلاب بالألوان',!!perms.studentLevels],['failed','الطلاب المتعثرون',!!perms.failedStudents],['teachers','معلمو '+scopeLabel,!!perms.teacherAnalysis],['comparison',isLeadership?'مقارنة نتائج المدرسة بين اختبارين':'مقارنة اختبارين للقسم والأقسام',!!perms.compare],['reports',isLeadership?'التقرير الكمي والوصفي':'خطط تحسين الأداء والتقارير الكمية والوصفية',!!perms.reports],['reportCenter','مركز التقارير والطباعة',!!perms.reports],['plans','الخطط العلاجية الذكية',!isLeadership&&!!perms.plans]];
 const saveWorkspace=async change=>{if(profile.role!=='coordinator'||!perms.savePlans)throw Error('ليس لديك صلاحية حفظ الخطط.');
  if(!workspace)throw Error('لم تكتمل البيانات.');const next=change(workspace),before=new Map((workspace.aiPlans||[]).map(p=>[p.id,JSON.stringify(p)])),updated=(next.aiPlans||[]).filter(p=>before.get(p.id)!==JSON.stringify(p));
  if(updated.length!==1)throw Error('يجب تعديل خطة واحدة في كل عملية.');const result=await SR63.cloud.rpc('school_staff_coordinator_plan_save',{p_plan:updated[0],p_expected:payload.revision});
  setPayload(prev=>({...prev,workspace:next,revision:result.revision}));};
 const header=h('header',{className:'srcoord-hero'},[
  h('div',{className:'srcoord-brand'},[
   h('img',{src:'./moehe.png',alt:'شعار وزارة التربية والتعليم والتعليم العالي'}),
   h('div',{},[h('span',{className:'srcoord-kicker'},'مرصد النتائج المدرسية · SchoolResult'),h('h1',{},settings.schoolName||'اسم المدرسة غير محدد'),h('p',{},`العام الأكاديمي: ${settings.academicYear||'—'} · لوحة التحليل والمتابعة ${isLeadership?'للمدرسة':'للقسم'}`)])
  ]),h('div',{className:'srcoord-identity'},[h('span',{},profile.role==='principal'?'حساب مدير المدرسة':profile.role==='vice_principal'?'حساب النائب الأكاديمي':'حساب المنسق'),h('strong',{},profile.displayName||profile.username),h('small',{},isLeadership?'المدرسة بالكامل':(profile.departments||[]).join('، '))]),
  h('div',{className:'srcoord-head-controls'},[
   h('label',{},[h('span',{},'اختيار التقييم'),h('select',{value:exam,onChange:e=>{setChosenExam(e.target.value);void reload(e.target.value);}},exams.map(x=>h('option',{key:x.key,value:x.key},x.name)))]),
   h('button',{type:'button',disabled:loading,onClick:()=>void reload()},loading?'جارٍ التحديث…':'تحديث النتائج')
  ])
 ]);
 return h('main',{className:'srstaff-coordinator srcoord-upgraded',dir:'rtl'},[
  header,h('nav',{className:'srstaff-nav','aria-label':'صفحات المنسق'},views.filter(x=>x[2]).map(([key,label])=>h('button',{key,type:'button',className:page===key?'active':'',onClick:()=>setPage(key)},label))),
  error?h('p',{className:'srstaff-alert',role:'alert'},error):null,
  loading?h('p',{className:'srstaff-panel'},isLeadership?'جارٍ تحميل بيانات المدرسة من الخادم…':'جارٍ تحميل بيانات القسم المصرح بها من الخادم…'):null,
  workspace&&!loading&&data?[
   h('div',{className:'srcoord-exam-summary'},[h('strong',{},examName),h('span',{},'تُحسب المؤشرات من النتائج المتاحة لهذا الحساب حسب صلاحياته على الخادم، ولا يمكن تعديل الدرجات من هذه اللوحة.')]),
   page==='dashboard'?h('section',{className:'srcoord-charts-section'},[h('div',{className:'srcoord-section-title'},[h('h2',{},'مؤشرات الأداء والتحليل البياني '+(isLeadership?'للمدرسة بالكامل':'لقسم المنسق')),h('span',{},'نسب مئوية موثقة بحجم العينة وتُحدّث حسب الاختبار المختار')]),sectionCharts()]):null,
   page==='dashboard'?h('section',{className:'srstaff-panel'},[h('h2',{},'مؤشرات '+scopeLabel+' — '+examName),h('div',{className:'srstaff-kpis srcoord-kpis'},cards.map(([title,value,note])=>h('article',{key:title},[h('span',{},title),h('strong',{},value),h('small',{},note)]))),h('h3',{},'تفاصيل التحصيل والنجاح لكل شعبة — '+examName),h('div',{className:'srcoord-class-grid'},data.classes.map(t=>h('div',{className:'srcoord-mini',key:t.name},[h('strong',{},t.name),h('span',{},`${t.results} نتيجة مرصودة`),chart('التحصيل',t.achievement),chart('النجاح',t.successRate,'#c58c2c')]))) ]):null,
   page==='overview'&&isLeadership&&perms.reports?h('section',{className:'srstaff-panel'},[
    h('h2',{},'الملخص التنفيذي لأداء المدرسة — '+examName),
    h('p',{},'مؤشرات جميع الأقسام (التعليم العام وحده لمؤشري النجاح والتحصيل)؛ يظهر الدعم الإضافي منفصلًا في التقارير التفصيلية.'),
    h('p',{},'مؤشرات المدرسة ورسومها البيانية متاحة في لوحة المدرسة؛ يقتصر هذا الملخص على جدول الصفوف دون تكرارها.'),
    h('h3',{},'ملخص النتائج حسب الصف الدراسي'),
    h('div',{className:'srstaff-scroll'},h('table',{},[h('thead',{},h('tr',{},['الصف','عدد النتائج المرصودة','نسبة النجاح','نسبة التحصيل'].map(x=>h('th',{key:x},x)))),
    h('tbody',{},data.gradeSummary.map(x=>h('tr',{key:x.grade},[x.name,x.results,fmt(x.successRate),fmt(x.achievement)].map((c,i)=>h('td',{key:i},c)))))])),
    h('p',{},'تم اعتماد نموذج التقرير الكمي والوصفي الرسمي المستخدم للأقسام، ليُصدر تقرير المدرسة بالكامل من النائب الأكاديمي إلى مدير المدرسة عبر تبويب التقرير الكمي والوصفي.')
   ]):null,
   page==='levels'&&perms.studentLevels?h('section',{className:'srstaff-panel',id:'srstaff-levels'},[
    h('h2',{},'توزيع الطلاب حسب مستويات الأداء — '+examName),
    h('p',{},'يوضع كل طالب في مستوى واحد وفق نسبة مجموع درجات المواد المرصودة، وتظهر أعداد الطلاب ونسبهم حسب الحدود المعتمدة في المدرسة. لا تُحتسب القيم الغائبة صفرًا.'),
    h('div',{className:'srstaff-level-controls'},[
      h('label',{},['الشعبة',h('select',{value:scopedClasses.includes(levelClass)?levelClass:'الكل',onChange:e=>setLevelClass(e.target.value)},[h('option',{value:'الكل'},'كل الشعب'),...scopedClasses.map(x=>h('option',{key:x,value:x},x))])]),
      h('label',{},['المادة',h('select',{value:scopedSubjects.includes(levelSubject)?levelSubject:'الكل',onChange:e=>setLevelSubject(e.target.value)},[h('option',{value:'الكل'},'كل مواد '+scopeLabel),...scopedSubjects.map(x=>h('option',{key:x,value:x},x))])]),
      h('button',{type:'button',disabled:!perms.export,onClick:()=>staffPrint('levels',{groups:levelGroups,examName,className:levelClass,subject:levelSubject})},'طباعة المستويات والرسوم البيانية')
    ]),
    liveChart(SR63.staffReportLevelChart(levelGroups)),
    h('div',{className:'srstaff-band-grid'},levelGroups.map(group=>h('article',{key:group.id,className:'srstaff-band-card',style:{borderTopColor:group.color}},[
      h('header',{},[h('span',{className:'srstaff-band-dot',style:{background:group.color}}),h('strong',{},group.label),h('b',{},String(group.students.length)+' طالب')]),
      h('div',{className:'srstaff-band-names'},group.students.slice(0,140).map(stu=>h('div',{key:stu.key},[
        h('span',{},stu.name+' — '+stu.className),h('strong',{},stu.percentage===null?'غير مرصود':fmt(stu.percentage))
      ]))),group.students.length>140?h('p',{},'تعرض المعاينة أول 140 طالبًا؛ اختر شعبة لعرض القائمة كاملة.'):null
    ])))
   ]):null,
   page==='failed'&&perms.failedStudents?h('section',{className:'srstaff-panel'},[h('h2',{},'الطلاب المتعثرون في '+scopeLabel),h('p',{},'يتم استبعاد الغياب والدرجات غير المرصودة من حساب الرسوب.'),h('button',{type:'button',disabled:!perms.export,onClick:()=>staffPrint('failed',{failed:data.failed,examName,scopeLabel})},'طباعة المتعثرين مع الرسوم البيانية'),liveChart(SR63.staffReportBarChart('عدد حالات التعثر حسب المادة — طول الشريط نسبي للأكثر حالات',(()=>{const tally=new Map;for(const item of data.failed)tally.set(item.subject,(tally.get(item.subject)||0)+1);const values=[...tally];const max=Math.max(1,...values.map(x=>x[1]));return values.map(([name,count])=>({name,value:100*count/max,label:count+' نتيجة',color:'#df784e'}));})(),{limit:14})),h('div',{className:'srstaff-scroll'},h('table',{},[h('thead',{},h('tr',{},['الطالب','الشعبة','المادة','المعلم','الدرجة','النسبة'].map(x=>h('th',{key:x},x)))),h('tbody',{},data.failed.map((r,i)=>h('tr',{key:(r.studentId||r.name)+'|'+r.subject+'|'+i},[r.name,r.className,r.subject,r.teacher,`${r.score}/${r.total}`,fmt(r.percentage)].map((x,j)=>h('td',{key:j},x)))))])),!data.failed.length?h('p',{},'لا توجد نتائج أقل من حد النجاح في الاختبار المحدد.'):null]):null,
   page==='teachers'&&perms.teacherAnalysis?h('section',{className:'srstaff-panel'},[h('h2',{},'تحصيل ونجاح نتائج معلمي '+scopeLabel),h('p',{},'تُظهر الأشرطة نسب النجاح والتحصيل وحجم النتائج المرصودة، ولا تُعد وحدها تقييمًا مهنيًا للمعلم.'),h('button',{type:'button',disabled:!perms.export,onClick:()=>staffPrint('teachers',{teachers:data.teachers,examName,scopeLabel})},'طباعة تقرير شامل للمعلمين مع الرسوم البيانية'),liveChart(SR63.staffReportBarChart('مقارنة نسبة التحصيل والنجاح للمعلمين',data.teachers.slice(0,14).map(t=>({name:t.name,value:t.achievement,second:t.successRate})),{two:true,secondColor:'#c39130',firstLabel:'نسبة التحصيل',secondLabel:'نسبة النجاح'})),h('div',{className:'srcoord-teacher-grid'},data.teachers.map(t=>h('article',{key:t.name,className:'srcoord-teacher-card'},[h('span',{},t.name),h('strong',{},fmt(t.achievement)),chart('نسبة النجاح',t.successRate),h('small',{},`${t.results} نتيجة مرصودة`)]))) ]):null,
   page==='comparison'&&perms.compare?h('section',{className:'srstaff-panel sr644-comparison',id:'srstaff-comparison'},[
    h('h2',{},'مقارنة تحصيل شعب '+(isLeadership?'المدرسة':'القسم')+' بين اختبارين'),
    h('div',{className:'srstaff-level-controls'},[
     h('label',{},['اختبار المقارنة',h('select',{value:otherExam,onChange:e=>setPreviousExam(e.target.value)},exams.filter(x=>x.key!==exam).map(x=>h('option',{key:x.key,value:x.key},x.name)))]),
     h('span',{},'الاختبار المختار: '+examName),
     h('button',{type:'button',disabled:!perms.export||!canCompare,onClick:()=>canCompare&&staffPrint('comparison',{rows:compared,benchmarks:isLeadership?[]:benchmarks,fromName:chronological.olderName,toName:chronological.laterName,scopeLabel})},'طباعة المقارنة والرسوم البيانية')
    ]),
    chronological?h('p',{className:'sr644-comparison-explainer'},'ترتيب المقارنة زمنيًا: '+chronological.olderName+' (الأقدم) ← '+chronological.laterName+' (الأحدث). الفارق = تحصيل الأحدث ناقص الأقدم، وليس قيمة مضافة للطلاب أنفسهم.'):
      h('p',{className:'srstaff-alert'},'يلزم وجود اختبارين مختلفين لإجراء المقارنة.'),
    canCompare?liveChart(SR63.staffReportBarChart('تحصيل الشعب في الاختبارين (الأقدم والأحدث)',compared.slice(0,18).map(t=>({name:t.className,value:t.previous,second:t.current,label:t.previous===null?'غير مرصود':t.previous.toFixed(1)+'% · '+t.previousCount+' نتيجة'})),{two:true,color:'#64748b',secondColor:'#0e887f',firstLabel:'الأقدم: '+chronological.olderName,secondLabel:'الأحدث: '+chronological.laterName})):null,
    canCompare?h('div',{className:'srstaff-scroll'},h('table',{},[h('thead',{},h('tr',{},['الشعبة',chronological.olderName+' (الأقدم)',chronological.laterName+' (الأحدث)','الفرق (نقطة مئوية)','نتائج أقدم / أحدث','الاتجاه'].map(x=>h('th',{key:x},x)))),
     h('tbody',{},compared.map(x=>h('tr',{key:x.className},[x.className,fmt(x.previous),fmt(x.current),x.change===null?'—':(x.change>0?'+':'')+x.change.toFixed(1),x.previousCount+' / '+x.currentCount,x.change===null?'عينة غير مكتملة':x.change>0?'تحسن':x.change<0?'تراجع':'ثبات'].map((t,i)=>h('td',{key:i},t)))))])):null,
    !isLeadership?h('section',{},[h('h2',{},'مقارنة الأقسام — إجماليات فقط'),h('p',{},'لا تُعرض أسماء أو درجات الطلاب في الأقسام الأخرى.'),h('div',{className:'srstaff-scroll'},h('table',{},[h('thead',{},h('tr',{},['القسم','عدد النتائج','نسبة النجاح','التحصيل'].map(x=>h('th',{key:x},x)))),h('tbody',{},benchmarks.map(b=>h('tr',{key:b.department},[b.department,b.evaluated,fmt(b.success),fmt(b.achievement)].map((x,i)=>h('td',{key:i},x)))))])),!benchmarks.length?h('p',{},'لا تتوفر مقارنة إجمالية لهذا الاختبار حتى تحديث خدمة الأقسام.'):null]):null
   ]):null,
   page==='reports'&&perms.reports?(isLeadership?h(SR63.SchoolQuantitativePage,{key:exam,workspace:active,canExport:!!perms.export}):h(SR63.TeacherPerformanceCenter,{key:exam,workspace:active,canExport:!!perms.export})):null,
   page==='reportCenter'&&perms.reports?h('section',{className:'srstaff-original-report-center',dir:'rtl'},[
    h('header',{className:'srstaff-panel'},[
     h('h2',{},isLeadership?'مركز التقارير والطباعة الأصلي — جميع صفوف المدرسة':'مركز التقارير والطباعة — أقسامي المصرح بها فقط'),
     h('p',{},isLeadership?'هذه هي نفس شاشة مركز التقارير والطباعة ونفس النماذج والبيانات والتصميم الموجودة بحساب الأدمن. يمكن للمدير والنائب الاطلاع عليها وتجهيز المعاينة وطباعتها، دون تعديل نتائج الطلاب أو إعدادات التقارير.':'نفس تقارير المدير والنائب بنفس القوالب والمعاينة والطباعة وPDF وZIP، ومربع المادة ثابت على مادة قسمك، ولا يمكن اختيار «كل المواد» أو التبديل بينها. البيانات محدودة من الخادم بأقسامك المصرح بها ('+(profile.departments||[]).join('، ')+') فقط، دون عرض نتائج الأقسام الأخرى أو تعديلها.'),
     !perms.export?h('p',{className:'srstaff-alert',role:'alert'},'العرض متاح، لكن الطباعة غير مفعلة لهذا الحساب. اطلب من مسؤول النظام تفعيل صلاحية «تصدير Word والتقارير».'):null
    ]),
    h(xde,{key:'original-report-center-'+profile.role+'-'+payload?.revision+'-'+exam,workspace:active,readOnly:true,canPrint:!!perms.export,onSchoolSummary:()=>setPage(isLeadership?'overview':'dashboard'),reportScope:isLeadership?'school':'department'})
   ]):null,
   
   
   page==='plans'&&!isLeadership&&perms.plans?h(SR63.AIPlans,{key:exam,workspace:active,setWorkspace:saveWorkspace,coordinator:true,canSave:profile.role==='coordinator'&&!!perms.savePlans,canExport:!!perms.export}):null
  ]:null
 ]);
};
