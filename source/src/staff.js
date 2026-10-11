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
  const {data,error}=await SR63.cloud.client().functions.invoke('school-staff',{body});
  if(error){let reason='تعذّر الاتصال بخدمة إدارة المستخدمين.';
   try{const response=error.context;if(response&&typeof response.json==='function'){const json=await response.json();reason=json?.error||reason;}}catch{}
   const messages={ACCOUNT_DISABLED_OR_UNAUTHORIZED:'هذا الحساب غير مفعّل أو لا يملك صلاحية الدخول.',INVALID_SESSION:'انتهت جلسة تسجيل الدخول.',ADMIN_ONLY:'هذه العملية مخصصة للأدمن.',INVALID_ACCOUNT_DATA:'راجع اسم المستخدم وكلمة المرور (10 أحرف على الأقل).',USERNAME_EXISTS:'اسم المستخدم مستخدم من قبل.',INVALID_DEPARTMENT:'القسم غير موجود ضمن تكليفات المدرسة.',COORDINATOR_NEEDS_DEPARTMENT:'يجب تحديد قسم واحد على الأقل للمنسق.',ACCOUNT_SAVE_FAILED:'تعذر حفظ المستخدم.',INVALID_NAME:'الاسم الظاهر غير صالح.',STAFF_NOT_FOUND:'المستخدم غير موجود.',PERMISSION_DENIED:'لا تملك صلاحية هذه العملية.'};
   throw new Error(messages[reason]||reason);
  }
  if(data?.error)throw new Error(data.error);
  return data;
 },
 async profile(){return (await this.call({action:'profile'})).profile;},
 async coordinatorLoad(){return this.call({action:'coordinator_data'});}
};
SR63.StaffAdminPage=function(){
 const [accounts,setAccounts]=(0,v.useState)([]),[departments,setDepartments]=(0,v.useState)([]),
 [busy,setBusy]=(0,v.useState)(false),[error,setError]=(0,v.useState)(''),[success,setSuccess]=(0,v.useState)(''),
 [form,setForm]=(0,v.useState)({username:'',displayName:'',password:'',role:'coordinator',departments:[],permissions:{reports:true,plans:true,savePlans:true,compare:true,failedStudents:true,teacherAnalysis:true,generateAI:false,export:true}});
 const reload=async()=>{setBusy(true);setError('');try{const data=await SR63.staff.call({action:'list'});setAccounts(data.accounts||[]);setDepartments(data.departments||[]);}catch(e){setError(e.message);}finally{setBusy(false);}};
 (0,v.useEffect)(()=>{void reload()},[]);
 const permissions=[['reports','إنشاء التقارير وطباعتها'],['teacherAnalysis','تحليل المعلمين في القسم'],['compare','مقارنة القسم بالأقسام الأخرى (إجماليات فقط)'],['failedStudents','عرض الطلاب المتعثرين في مادة القسم'],['plans','عرض الخطط العلاجية وخطط التحسين'],['savePlans','حفظ وتحديث الخطط العلاجية'],['generateAI','توليد مسودات باستخدام Gemini'],['export','تصدير Word والتقارير']];
 const toggle=(key,checked)=>setForm(p=>({...p,permissions:{...p.permissions,[key]:checked}}));
 const save=async e=>{e.preventDefault();setBusy(true);setError('');setSuccess('');try{
  await SR63.staff.call({action:'create',...form});setSuccess('تم إنشاء الحساب. يستطيع المستخدم الدخول بالاسم وكلمة المرور مباشرة.');setForm({...form,username:'',displayName:'',password:''});await reload();
 }catch(ex){setError(ex.message);}finally{setBusy(false);}};
 const edit=async(account,patch)=>{setBusy(true);setError('');setSuccess('');try{await SR63.staff.call({action:'update',userId:account.user_id,...patch});setSuccess('تم حفظ صلاحيات الحساب.');await reload();}catch(ex){setError(ex.message);}finally{setBusy(false);}};
 const field=(title,node)=>(0,q.jsxs)('label',{className:'srstaff-field',children:[(0,q.jsx)('span',{children:title}),node]});
 return (0,q.jsxs)('main',{className:'srstaff-page',dir:'rtl',children:[
  (0,q.jsx)('h1',{children:'إدارة المستخدمين والصلاحيات'}),
  (0,q.jsx)('p',{children:'أنشئ عدة حسابات أدمن أو منسقين بأسماء مستخدمين وكلمات مرور فقط. حماية النتائج والصلاحيات تتم على الخادم، وليس بإخفاء الأزرار.'}),
  error?(0,q.jsx)('p',{className:'srstaff-alert',role:'alert',children:error}):null,success?(0,q.jsx)('p',{className:'srstaff-success',role:'status',children:success}):null,
  (0,q.jsxs)('form',{className:'srstaff-panel',onSubmit:save,children:[
   (0,q.jsx)('h2',{children:'إنشاء حساب جديد'}),(0,q.jsx)('div',{className:'srstaff-grid',children:[
    field('اسم المستخدم (عربي أو إنجليزي)',(0,q.jsx)('input',{required:true,minLength:3,maxLength:42,autoComplete:'off',value:form.username,onChange:e=>setForm(x=>({...x,username:e.target.value})),placeholder:'مثال: منسق_الرياضيات'})),
    field('الاسم الظاهر',(0,q.jsx)('input',{required:true,value:form.displayName,onChange:e=>setForm(x=>({...x,displayName:e.target.value})),placeholder:'اسم الموظف'})),
    field('كلمة المرور — 10 أحرف على الأقل',(0,q.jsx)('input',{required:true,type:'password',autoComplete:'new-password',minLength:10,maxLength:128,value:form.password,onChange:e=>setForm(x=>({...x,password:e.target.value}))})),
    field('نوع الحساب',(0,q.jsx)('select',{value:form.role,onChange:e=>setForm(x=>({...x,role:e.target.value})),children:[(0,q.jsx)('option',{value:'coordinator',children:'منسق — صلاحيات محددة'}),(0,q.jsx)('option',{value:'admin',children:'أدمن — جميع صلاحيات البرنامج'})]}))
   ]}),
   form.role==='coordinator'?(0,q.jsxs)('div',{children:[(0,q.jsx)('h3',{children:'الأقسام التي يستطيع المنسق الوصول إليها'}),(0,q.jsx)('div',{className:'srstaff-checks',children:departments.map(name=>(0,q.jsxs)('label',{children:[(0,q.jsx)('input',{type:'checkbox',checked:form.departments.includes(name),onChange:e=>setForm(p=>({...p,departments:e.target.checked?[...p.departments,name]:p.departments.filter(x=>x!==name)}))}),name]},name))})]}):null,
   form.role==='coordinator'?(0,q.jsxs)('div',{children:[(0,q.jsx)('h3',{children:'صلاحيات المنسق'}),(0,q.jsx)('div',{className:'srstaff-checks',children:permissions.map(([key,label])=>(0,q.jsxs)('label',{children:[(0,q.jsx)('input',{type:'checkbox',checked:form.permissions[key]===true,onChange:e=>toggle(key,e.target.checked)}),label]},key))})]}):null,
   (0,q.jsx)('button',{type:'submit',disabled:busy||form.role==='coordinator'&&!form.departments.length,children:busy?'جارٍ الحفظ…':'إنشاء الحساب'})
  ]}),
  (0,q.jsxs)('section',{className:'srstaff-panel',children:[(0,q.jsxs)('header',{className:'srstaff-flex',children:[(0,q.jsx)('h2',{children:'الحسابات الحالية ('+accounts.length+')'}),(0,q.jsx)('button',{type:'button',disabled:busy,onClick:()=>void reload(),children:'تحديث القائمة'})]}),
   accounts.length?(0,q.jsx)('div',{className:'srstaff-users',children:accounts.map(user=>(0,q.jsxs)('article',{className:'srstaff-user',children:[
    (0,q.jsxs)('div',{children:[(0,q.jsx)('strong',{children:user.display_name}),(0,q.jsx)('small',{children:user.username+' · '+(user.role==='admin'?'أدمن كامل':'منسق')+' · '+(user.active?'مفعّل':'موقوف')})]}),
    user.role==='coordinator'?(0,q.jsx)('p',{children:(user.departments||[]).join('، ')}):null,
    (0,q.jsxs)('div',{className:'srstaff-flex',children:[
      (0,q.jsx)('button',{type:'button',disabled:busy,onClick:()=>void edit(user,{active:!user.active}),children:user.active?'إيقاف الحساب':'تفعيل الحساب'}),
      (0,q.jsx)('button',{type:'button',disabled:busy,onClick:()=>{const password=window.prompt('أدخل كلمة مرور جديدة (10 أحرف على الأقل).');if(password!==null)void edit(user,{password});},children:'تغيير كلمة المرور'}),
      (0,q.jsx)('button',{type:'button',disabled:busy,onClick:()=>void edit(user,{role:user.role==='admin'?'coordinator':'admin',departments:user.role==='admin'?departments.slice(0,1):[],permissions:user.permissions}),children:user.role==='admin'?'تحويل إلى منسق':'منحه صلاحيات أدمن'}),
      user.role==='coordinator'?(0,q.jsx)('button',{type:'button',disabled:busy,onClick:()=>{setForm(x=>({...x,role:'coordinator',departments:user.departments,permissions:{...x.permissions,...user.permissions}}));window.scrollTo({top:0,behavior:'smooth'});setSuccess('انسخ/عدّل صلاحيات هذا المنسق في النموذج لإنشاء حساب مماثل. لتعديل الحساب الحالي استخدم الخيارات المباشرة أدناه.');},children:'نسخ إعداداته'}):null
    ]}),
    user.role==='coordinator'?(0,q.jsxs)('details',{children:[(0,q.jsx)('summary',{children:'تعديل أقسام وصلاحيات هذا المنسق'}),(0,q.jsx)('div',{className:'srstaff-checks',children:departments.map(name=>(0,q.jsxs)('label',{children:[(0,q.jsx)('input',{type:'checkbox',disabled:busy,checked:(user.departments||[]).includes(name),onChange:e=>void edit(user,{departments:e.target.checked?[...user.departments,name]:user.departments.filter(x=>x!==name)})}),name]},name))}),(0,q.jsx)('div',{className:'srstaff-checks',children:permissions.map(([key,label])=>(0,q.jsxs)('label',{children:[(0,q.jsx)('input',{type:'checkbox',disabled:busy,checked:user.permissions?.[key]===true,onChange:e=>void edit(user,{permissions:{...user.permissions,[key]:e.target.checked}})}),label]},key))})]}):null
   ]},user.user_id))}):(0,q.jsx)('p',{children:'لا توجد حسابات إضافية بعد. حساب المالك الأصلي يظل متاحًا.'})
  ]})
 ]});
};
SR63.CoordinatorPortal=function({profile}){
 const [payload,setPayload]=(0,v.useState)(null),[error,setError]=(0,v.useState)(''),[loading,setLoading]=(0,v.useState)(true),[page,setPage]=(0,v.useState)('dashboard');
 const reload=async()=>{setLoading(true);setError('');try{setPayload(await SR63.staff.coordinatorLoad());}catch(e){setError(e.message);}finally{setLoading(false);}};
 (0,v.useEffect)(()=>{void reload();},[profile.ownerId,profile.username]);
 const workspace=payload?.workspace,perms=profile.permissions||{},rows=workspace?.rows||[],exam=workspace?.activeExam||'exam1',settings=workspace?.settings||{};
 const subjects=[...new Set(rows.map(r=>r.subject))].filter(Boolean);
 const metric=workspace?bj(rows.filter(r=>!SR63.isSupportRow(r,exam)),exam,settings):null;
 const teacherMetrics=workspace?[...new Set(rows.map(r=>mj(r,exam)||r.teacher).filter(Boolean))].map(name=>({name,m:bj(rows.filter(r=>(mj(r,exam)||r.teacher)===name),exam,settings)})):[];
 const failed=workspace?[...new Map(rows.filter(r=>r.statuses?.[exam]==='present'&&typeof r.scores?.[exam]==='number'&&typeof pj(r,exam,settings)==='number'&&pj(r,exam,settings)>0&&r.scores[exam]/pj(r,exam,settings)*100<Number(settings.pass??50)).map(r=>[(r.studentId||'')+'|'+r.subject,{name:r.studentName,studentId:r.studentId,className:hj(r,exam)||r.className,subject:r.subject,score:r.scores[exam],total:pj(r,exam,settings)}])).values()]:[];
 const fmt=x=>typeof x==='number'?x.toFixed(1)+'%':'—';
 const saveWorkspace=async change=>{
  if(!perms.savePlans)throw Error('لم يمنحك الأدمن صلاحية حفظ الخطط.');
  if(!workspace)throw Error('البيانات لم تُحمّل.');
  const next=change(workspace),before=new Map((workspace.aiPlans||[]).map(p=>[p.id,JSON.stringify(p)]));
  const updated=(next.aiPlans||[]).filter(p=>before.get(p.id)!==JSON.stringify(p));
  if(updated.length!==1)throw Error('لا يمكن تعديل أكثر من خطة في العملية الواحدة.');
  const plan=updated[0];
  const result=await SR63.cloud.rpc('school_staff_coordinator_plan_save',{p_plan:plan,p_expected:payload.revision});
  setPayload(prev=>({...prev,workspace:next,revision:result.revision}));
 };
 const cards=[['الطلاب الذين لديهم نتائج',metric?.students||0],['النتائج المرصودة',metric?.evaluated||0],['نسبة النجاح',fmt(metric?.success)],['نسبة التحصيل',fmt(metric?.achievement)],['معلمو القسم',teacherMetrics.length],['طلاب متعثرون بمادتك',failed.length]];
 const views=[['dashboard','لوحة القسم',true],['failed','الطلاب المتعثرون',!!perms.failedStudents],['teachers','معلمو القسم',!!perms.teacherAnalysis],['comparison','مقارنة الأقسام',!!perms.compare],['reports','خطط التحسين وتقارير المعلمين',!!perms.reports],['department','التقرير الكمي والوصفي للقسم',!!perms.reports],['plans','الخطط العلاجية الذكية',!!perms.plans]];
 return (0,q.jsxs)('main',{className:'srstaff-coordinator',dir:'rtl',children:[
  (0,q.jsxs)('header',{className:'srstaff-coordinator-head',children:[(0,q.jsxs)('div',{children:[(0,q.jsx)('span',{children:'لوحة المنسق — عرض القسم المصرح به فقط'}),(0,q.jsx)('h1',{children:profile.displayName||profile.username}),(0,q.jsx)('p',{children:'الأقسام: '+(profile.departments||[]).join('، ')+' · لا توجد صلاحية لتعديل الدرجات أو استيراد النتائج.'})]}),(0,q.jsx)('button',{type:'button',disabled:loading,onClick:()=>void reload(),children:'تحديث النتائج'})]}),
  (0,q.jsx)('nav',{className:'srstaff-nav',children:views.filter(x=>x[2]).map(([key,label])=>(0,q.jsx)('button',{type:'button',className:page===key?'active':'',onClick:()=>setPage(key),children:label},key))}),
  error?(0,q.jsx)('p',{className:'srstaff-alert',role:'alert',children:error}):null,
  loading?(0,q.jsx)('p',{children:'جارٍ تحميل بيانات القسم المصرح بها من الخادم…'}):null,
  workspace&&!loading?(
   page==='dashboard'?(0,q.jsxs)('section',{className:'srstaff-panel',children:[(0,q.jsx)('h2',{children:'مؤشرات القسم'}),(0,q.jsx)('div',{className:'srstaff-kpis',children:cards.map(([title,value])=>(0,q.jsxs)('article',{children:[(0,q.jsx)('span',{children:title}),(0,q.jsx)('strong',{children:value})]},title))}),(0,q.jsx)('h3',{children:'المواد المشمولة'}),(0,q.jsx)('p',{children:subjects.join('، ')||'لا توجد نتائج مسجلة.'})]}):
   page==='failed'&&perms.failedStudents?(0,q.jsxs)('section',{className:'srstaff-panel',children:[(0,q.jsx)('h2',{children:'الطلاب الأقل من حد النجاح في مواد القسم'}),(0,q.jsx)('p',{children:'الغياب وعدم الرصد لا يُحتسبان صفرًا.'}),(0,q.jsx)('div',{className:'srstaff-scroll',children:(0,q.jsxs)('table',{children:[(0,q.jsx)('thead',{children:(0,q.jsx)('tr',{children:['الطالب','الشعبة','المادة','الدرجة'].map(x=>(0,q.jsx)('th',{children:x},x))})}),(0,q.jsx)('tbody',{children:failed.map((r,i)=>(0,q.jsx)('tr',{children:[r.name,r.className,r.subject,`${r.score}/${r.total}`].map((x,j)=>(0,q.jsx)('td',{children:x},j))},i))})]})})]}):
   page==='teachers'&&perms.teacherAnalysis?(0,q.jsxs)('section',{className:'srstaff-panel',children:[(0,q.jsx)('h2',{children:'تحليل تحصيل معلمي القسم'}),(0,q.jsx)('div',{className:'srstaff-kpis',children:teacherMetrics.map(t=>(0,q.jsxs)('article',{children:[(0,q.jsx)('span',{children:t.name}),(0,q.jsx)('strong',{children:fmt(t.m.achievement)}),(0,q.jsx)('small',{children:'نجاح '+fmt(t.m.success)+' · '+t.m.evaluated+' نتيجة'})]},t.name))})]}):
   page==='comparison'&&perms.compare?(0,q.jsxs)('section',{className:'srstaff-panel',children:[(0,q.jsx)('h2',{children:'مقارنة الأقسام — مؤشرات إجمالية فقط'}),(0,q.jsx)('p',{children:'لا تُعرض أسماء أو درجات الطلاب التابعين للأقسام الأخرى.'}),(0,q.jsx)('div',{className:'srstaff-scroll',children:(0,q.jsxs)('table',{children:[(0,q.jsx)('thead',{children:(0,q.jsx)('tr',{children:['القسم','عدد النتائج المرصودة','النجاح','التحصيل'].map(x=>(0,q.jsx)('th',{children:x},x))})}),(0,q.jsx)('tbody',{children:(payload.benchmarks||[]).map(b=>(0,q.jsx)('tr',{children:[b.department,b.evaluated,fmt(b.success),fmt(b.achievement)].map((x,j)=>(0,q.jsx)('td',{children:x},j))},b.department))})]})})]}):
   page==='reports'&&perms.reports?(0,q.jsx)(SR63.TeacherPerformanceCenter,{workspace,canExport:!!perms.export}):
   page==='department'&&perms.reports?(0,q.jsx)(SR63.DepartmentQuantitativePage,{workspace,canExport:!!perms.export}):
   page==='plans'&&perms.plans?(0,q.jsx)(SR63.AIPlans,{workspace,setWorkspace:saveWorkspace,coordinator:true,canSave:!!perms.savePlans,canExport:!!perms.export}):null
  ):null
 ]});
};
