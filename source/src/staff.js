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
 async coordinatorLoad(exam=''){const result=await this.call({action:'coordinator_data',exam});return {...result,comparisonExam:exam};}
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
 return {students:persons.length,evaluated:evaluated.length,regular:nonSupport.length,success:nonSupport.length?100*success/nonSupport.length:null,achievement,levels,failed,teachers:stats(teachers),classes:stats(classes),trend,benchmarks};
};
SR63.CoordinatorPortal=function({profile}){
 const [payload,setPayload]=(0,v.useState)(null),[error,setError]=(0,v.useState)(''),[loading,setLoading]=(0,v.useState)(true),
 [page,setPage]=(0,v.useState)('dashboard'),[chosenExam,setChosenExam]=(0,v.useState)(''),[showLegend,setShowLegend]=(0,v.useState)(true);
 const reload=async(requestedExam=chosenExam)=>{setLoading(true);setError('');try{const next=await SR63.staff.coordinatorLoad(requestedExam);setPayload(next);}catch(e){setError(e.message||'تعذر تحديث النتائج');}finally{setLoading(false);}};
 (0,v.useEffect)(()=>{void reload();},[profile.ownerId,profile.username]);
 const workspace=payload?.workspace||null,perms=profile.permissions||{},settings=workspace?.settings||{},exams=settings.exams||[],
 exam=exams.some(x=>x.key===chosenExam)?chosenExam:(workspace?.activeExam||exams[0]?.key||'exam1');
 const currentExam=exams.find(x=>x.key===exam),examName=currentExam?.name||'التقييم المحدد',active={...workspace,activeExam:exam};
 const benchmarks=(payload?.comparisonExam===exam||!payload?.comparisonExam&&exam===workspace?.activeExam)?(payload?.benchmarks||[]):[];
 const data=(0,v.useMemo)(()=>workspace?SR63.coordinatorDashboardData(workspace,exam,benchmarks):null,[workspace,exam,payload]);
 const fmt=n=>typeof n==='number'&&Number.isFinite(n)?n.toFixed(1)+'%':'—';
 const h=(tag,props,children)=>(0,q.jsx)(tag,{...props,children});
 const row=(a,b,c)=>(0,q.jsxs)('div',{className:'srcoord-stat',children:[h('span',{},a),h('strong',{},b),c?h('small',{},c):null]});
 const chart=(label,value,color)=>h('div',{className:'srcoord-bar-row'},[h('div',{className:'srcoord-bar-name'},label),h('div',{className:'srcoord-bar-track'},h('div',{className:'srcoord-bar-fill',style:{width:`${Math.max(0,Math.min(100,value||0))}%`,background:color||'#0b867d'}})),h('strong',{},fmt(value))]);
 const chartPanel=(title,items,colors=null)=>h('article',{className:'srcoord-chart'},[h('h3',{},title),items.length?h('div',{className:'srcoord-bar-list'},items.map((x,i)=>h('div',{key:x.name+'-'+i},chart(x.name,x.achievement??x.value,colors?.[i]||x.color)))):h('p',{className:'srcoord-muted'},'لا توجد بيانات مرصودة لهذا الاختبار.')]);
 const trendPanel=()=>{const points=data.trend.filter(x=>x.achievement!==null),w=450,H=130,pad=20;
  const coords=points.map((x,i)=>({x:pad+(points.length===1?(w-2*pad)/2:i*(w-2*pad)/(points.length-1)),y:H-pad-x.achievement*(H-2*pad)/100,name:x.name,percentage:x.achievement}));
  return h('article',{className:'srcoord-chart'},[h('h3',{},'مقارنة التحصيل عبر الاختبارات الأربعة'),h('div',{className:'srcoord-trend'},[
   h('svg',{viewBox:`0 0 ${w} ${H}`,role:'img','aria-label':'خط زمني لنسبة التحصيل عبر الاختبارات'},[
    ...[0,50,100].map(v=>h('line',{key:'g'+v,x1:pad,x2:w-pad,y1:H-pad-v*(H-2*pad)/100,y2:H-pad-v*(H-2*pad)/100,stroke:'#d9e8e9','stroke-dasharray':'4 4'})),
    points.length>1?h('polyline',{points:coords.map(c=>`${c.x},${c.y}`).join(' '),fill:'none',stroke:'#0b807a','stroke-width':4,'stroke-linecap':'round','stroke-linejoin':'round'}):null,
    ...coords.map((c,i)=>h('circle',{key:'c'+i,cx:c.x,cy:c.y,r:6,fill:'#0b807a',stroke:'#fff','stroke-width':2}))
   ]),h('div',{className:'srcoord-trend-labels'},data.trend.map(x=>h('div',{key:x.key},[h('span',{},x.name),h('strong',{},fmt(x.achievement))])))
  ])]);};
 const bandPanel=()=>{const levels=data.levels,total=levels.reduce((n,x)=>n+x.value,0),r=50,C=2*Math.PI*r;let used=0;
  const arcs=levels.map(x=>{const len=total?C*x.value/total:0,start=used;used+=len;return h('circle',{key:x.label,cx:75,cy:75,r,fill:'none',stroke:x.color,'stroke-width':19,'stroke-dasharray':`${len} ${C-len}`,'stroke-dashoffset':-start,transform:'rotate(-90 75 75)'});});
  return h('article',{className:'srcoord-chart'},[h('h3',{},'توزيع مستويات طلاب القسم'),h('div',{className:'srcoord-ring-layout'},[
   h('svg',{className:'srcoord-ring',viewBox:'0 0 150 150',role:'img','aria-label':'توزيع المستويات'},[
    h('circle',{cx:75,cy:75,r,fill:'none',stroke:'#ebf1f2','stroke-width':19}),...arcs,
    h('text',{x:75,y:73,'text-anchor':'middle','font-size':25,'font-weight':900,fill:'#153a50'},String(total)),
    h('text',{x:75,y:92,'text-anchor':'middle','font-size':11,fill:'#607481'},'نتيجة مرصودة')
   ]),h('div',{className:'srcoord-legend'},levels.map(x=>h('div',{key:x.label},[h('i',{style:{background:x.color}}),h('span',{},x.label),h('strong',{},`${x.value} · ${total?(100*x.value/total).toFixed(0):0}%`)])))
  ])]);};
 const sectionCharts=()=>h('section',{className:'srcoord-chart-grid'},[
  trendPanel(),bandPanel(),chartPanel(page==='teachers'?'تحصيل المعلمين':page==='failed'?'الشعب ذات التحصيل الأعلى':page==='comparison'?'مقارنة تحصيل الأقسام':page==='plans'?'توزيع التحصيل حسب الشعبة':'تحصيل الشعب',
    page==='teachers'?data.teachers:page==='comparison'?benchmarks.map(x=>({name:x.department,achievement:x.achievement})):data.classes)
 ]);
 const cards=[['الطلاب ذوو نتائج',data?.students??0,'طالب فريد'],['النتائج المرصودة',data?.evaluated??0,'يشمل الدعم الإضافي'],['نسبة النجاح',fmt(data?.success),'من نتائج التعليم العام'],['نسبة التحصيل',fmt(data?.achievement),'للاختبار المحدد'],['معلمو القسم',data?.teachers?.length??0,'من لديهم نتائج مرصودة'],['الطلاب المتعثرون',new Set((data?.failed||[]).map(x=>x.studentId||x.name)).size,'درجات دون حد النجاح']];
 const views=[['dashboard','لوحة القسم',true],['failed','الطلاب المتعثرون',!!perms.failedStudents],['teachers','معلمو القسم',!!perms.teacherAnalysis],['comparison','مقارنة الأقسام',!!perms.compare],['reports','خطط التحسين وتقارير المعلمين',!!perms.reports],['department','التقرير الكمي والوصفي للقسم',!!perms.reports],['plans','الخطط العلاجية الذكية',!!perms.plans]];
 const saveWorkspace=async change=>{if(!perms.savePlans)throw Error('ليس لديك صلاحية حفظ الخطط.');
  if(!workspace)throw Error('لم تكتمل البيانات.');const next=change(workspace),before=new Map((workspace.aiPlans||[]).map(p=>[p.id,JSON.stringify(p)])),updated=(next.aiPlans||[]).filter(p=>before.get(p.id)!==JSON.stringify(p));
  if(updated.length!==1)throw Error('يجب تعديل خطة واحدة في كل عملية.');const result=await SR63.cloud.rpc('school_staff_coordinator_plan_save',{p_plan:updated[0],p_expected:payload.revision});
  setPayload(prev=>({...prev,workspace:next,revision:result.revision}));};
 const header=h('header',{className:'srcoord-hero'},[
  h('div',{className:'srcoord-brand'},[
   h('img',{src:'./moehe.png',alt:'شعار وزارة التربية والتعليم والتعليم العالي'}),
   h('div',{},[h('span',{className:'srcoord-kicker'},'مرصد النتائج المدرسية · SchoolResult'),h('h1',{},settings.schoolName||'اسم المدرسة غير محدد'),h('p',{},`العام الأكاديمي: ${settings.academicYear||'—'} · لوحة التحليل والمتابعة للقسم`)])
  ]),h('div',{className:'srcoord-identity'},[h('span',{},'حساب المنسق'),h('strong',{},profile.displayName||profile.username),h('small',{},(profile.departments||[]).join('، '))]),
  h('div',{className:'srcoord-head-controls'},[
   h('label',{},[h('span',{},'اختيار التقييم'),h('select',{value:exam,onChange:e=>{setChosenExam(e.target.value);void reload(e.target.value);}},exams.map(x=>h('option',{key:x.key,value:x.key},x.name)))]),
   h('button',{type:'button',disabled:loading,onClick:()=>void reload()},loading?'جارٍ التحديث…':'تحديث النتائج')
  ])
 ]);
 return h('main',{className:'srstaff-coordinator srcoord-upgraded',dir:'rtl'},[
  header,h('nav',{className:'srstaff-nav','aria-label':'صفحات المنسق'},views.filter(x=>x[2]).map(([key,label])=>h('button',{key,type:'button',className:page===key?'active':'',onClick:()=>setPage(key)},label))),
  error?h('p',{className:'srstaff-alert',role:'alert'},error):null,
  loading?h('p',{className:'srstaff-panel'},'جارٍ تحميل بيانات القسم المصرح بها من الخادم…'):null,
  workspace&&!loading&&data?[
   h('div',{className:'srcoord-exam-summary'},[h('strong',{},examName),h('span',{},'تُحسب جميع المؤشرات والرسوم في هذه الصفحة من الاختبار المحدد، ولا يحق للمنسق تعديل درجات الطلاب.')]),
   h('section',{className:'srcoord-charts-section'},[h('div',{className:'srcoord-section-title'},[h('h2',{},'التحليل البياني للقسم'),h('span',{},'يتغير تلقائيًا مع الاختبار المختار')]),sectionCharts()]),
   page==='dashboard'?h('section',{className:'srstaff-panel'},[h('h2',{},'مؤشرات القسم'),h('div',{className:'srstaff-kpis srcoord-kpis'},cards.map(([title,value,note])=>h('article',{key:title},[h('span',{},title),h('strong',{},value),h('small',{},note)]))),h('h3',{},'تحصيل الشعب حسب الاختبار'),h('div',{className:'srcoord-class-grid'},data.classes.map(t=>h('div',{className:'srcoord-mini',key:t.name},[h('strong',{},t.name),h('span',{},'تحصيل '+fmt(t.achievement)),chart('نسبة النجاح',t.successRate)]))) ]):null,
   page==='failed'&&perms.failedStudents?h('section',{className:'srstaff-panel'},[h('h2',{},'الطلاب المتعثرون في مواد القسم'),h('p',{},'يتم استبعاد الغياب والدرجات غير المرصودة من حساب الرسوب.'),h('div',{className:'srstaff-scroll'},h('table',{},[h('thead',{},h('tr',{},['الطالب','الشعبة','المادة','المعلم','الدرجة','النسبة'].map(x=>h('th',{key:x},x)))),h('tbody',{},data.failed.map((r,i)=>h('tr',{key:(r.studentId||r.name)+'|'+r.subject+'|'+i},[r.name,r.className,r.subject,r.teacher,`${r.score}/${r.total}`,fmt(r.percentage)].map((x,j)=>h('td',{key:j},x)))))])),!data.failed.length?h('p',{},'لا توجد نتائج أقل من حد النجاح في الاختبار المحدد.'):null]):null,
   page==='teachers'&&perms.teacherAnalysis?h('section',{className:'srstaff-panel'},[h('h2',{},'تحصيل معلمي القسم'),h('div',{className:'srcoord-teacher-grid'},data.teachers.map(t=>h('article',{key:t.name,className:'srcoord-teacher-card'},[h('span',{},t.name),h('strong',{},fmt(t.achievement)),chart('نسبة النجاح',t.successRate),h('small',{},`${t.results} نتيجة مرصودة`)]))) ]):null,
   page==='comparison'&&perms.compare?h('section',{className:'srstaff-panel'},[h('h2',{},'مقارنة الأقسام — إجماليات فقط'),h('p',{},'لا تُعرض أسماء أو درجات الطلاب في الأقسام الأخرى.'),h('div',{className:'srstaff-scroll'},h('table',{},[h('thead',{},h('tr',{},['القسم','عدد النتائج','نسبة النجاح','التحصيل'].map(x=>h('th',{key:x},x)))),h('tbody',{},benchmarks.map(b=>h('tr',{key:b.department},[b.department,b.evaluated,fmt(b.success),fmt(b.achievement)].map((x,i)=>h('td',{key:i},x)))))])),!benchmarks.length?h('p',{},'لا تتوفر مقارنة إجمالية لهذا الاختبار حتى تحديث خدمة الأقسام.'):null]):null,
   page==='reports'&&perms.reports?h(SR63.TeacherPerformanceCenter,{key:exam,workspace:active,canExport:!!perms.export}):null,
   page==='department'&&perms.reports?h(SR63.DepartmentQuantitativePage,{key:exam,workspace:active,canExport:!!perms.export}):null,
   page==='plans'&&perms.plans?h(SR63.AIPlans,{key:exam,workspace:active,setWorkspace:saveWorkspace,coordinator:true,canSave:!!perms.savePlans,canExport:!!perms.export}):null
  ]:null
 ]);
};
