/* 6.10.17 — AI plans plus owner-only Gemini Vault settings. */
SR63.AIPlans=function({workspace,setWorkspace}){
  const [tab,setTab]=(0,v.useState)('create'),[exam,setExam]=(0,v.useState)(workspace.activeExam),
    [mode,setMode]=(0,v.useState)('group'),[cohort,setCohort]=(0,v.useState)('general'),
    [subject,setSubject]=(0,v.useState)(''),[grade,setGrade]=(0,v.useState)('الكل'),
    [className,setClassName]=(0,v.useState)('الكل'),[teacher,setTeacher]=(0,v.useState)('الكل'),
    [studentId,setStudentId]=(0,v.useState)(''),[level,setLevel]=(0,v.useState)('below60'),
    [config,setConfig]=(0,v.useState)(()=>SR63.aiPlanSettings(workspace)),
    [draft,setDraft]=(0,v.useState)(null),[request,setRequest]=(0,v.useState)(null),
    [selectedId,setSelectedId]=(0,v.useState)(''),[busy,setBusy]=(0,v.useState)(false),
    [error,setError]=(0,v.useState)(''),[approvedBy,setApprovedBy]=(0,v.useState)(''),[follow,setFollow]=(0,v.useState)({}),[savedEdit,setSavedEdit]=(0,v.useState)(null),
    [apiKey,setApiKey]=(0,v.useState)(''),[apiModel,setApiModel]=(0,v.useState)('gemini-2.5-flash'),
    [connect,setConnect]=(0,v.useState)({state:'loading',configured:false,connected:null,message:'جارٍ التحقق من إعدادات Gemini…'}),
    [connectBusy,setConnectBusy]=(0,v.useState)(false);
  const plans=workspace.aiPlans||[],active=plans.find(p=>p.id===selectedId)||plans[0]||null;
  const subjects=[...new Map((workspace.rows||[]).map(r=>[SR63.subjectAliasKey(r.subject),r.subject])).entries()]
    .filter(([key])=>key).sort((a,b)=>SR63.reportSubjectCompare(a[1],b[1],workspace.settings));
  const realSubject=subjects.some(([key])=>key===subject)?subject:subjects[0]?.[0]||'';
  const rawSubject=subjects.find(([key])=>key===realSubject)?.[1]||'';
  const groupPages=(0,v.useMemo)(()=>SR63.studentResultPages(workspace,exam),[workspace,exam]);
  const grades=[...new Set(groupPages.filter(p=>(cohort==='support')===SR63.isSupportClass(p.className)).map(p=>p.grade))];
  const classes=[...new Set(groupPages.filter(p=>(cohort==='support')===SR63.isSupportClass(p.className)&&(grade==='الكل'||ij(p.grade)===ij(grade))).map(p=>p.className))];
  const teachers=[...new Set((workspace.rows||[]).filter(r=>SR63.subjectAliasKey(r.subject)===realSubject).map(r=>r.examTeachers?.[exam]||r.teacher).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));
  const candidates=(0,v.useMemo)(()=>rawSubject?SR63.aiPlanCandidateSet(workspace,{exam,subject:rawSubject,cohort,grade,className,teacher:mode==='teacher'?teacher:'الكل',mode:'group',level:'all'}):[],[workspace,exam,rawSubject,cohort,grade,className,teacher,mode]);
  const selectedMembers=(0,v.useMemo)(()=>{
    if(!rawSubject)return [];
    return SR63.aiPlanCandidateSet(workspace,{exam,subject:rawSubject,cohort,grade,className,
      teacher:mode==='teacher'?teacher:'الكل',mode,level,studentId:mode==='individual'?studentId:''});
  },[workspace,exam,rawSubject,cohort,grade,className,teacher,mode,level,studentId]);
  const connectionCall=async(body)=>{
    const client=SR63.cloud.client();
    const {data,error:invokeError}=await client.functions.invoke('school-ai-plans',{body});
    if(invokeError){
      let detail='تعذر الاتصال بالخادم الآمن. تحقق من تسجيل الدخول وصلاحيات الحساب.';
      try{const response=invokeError.context;if(response&&typeof response.json==='function'){const json=await response.json();detail=json?.error||detail;}}catch{}
      throw new Error(detail);
    }
    if(data?.error)throw new Error(data.error);
    return data;
  };
  const refreshConnection=async()=>{
    setConnectBusy(true);
    try{
      const data=await connectionCall({action:'connection_status'});
      setApiModel(data.model||'gemini-2.5-flash');
      setConnect({state:data.configured?'saved':'missing',configured:!!data.configured,connected:null,message:data.configured?'المفتاح محفوظ بأمان. اضغط «اختبار الاتصال» للتحقق من تشغيل Gemini.':'لم يُحفظ مفتاح Gemini بعد.'});
    }catch(e){setConnect({state:'error',configured:false,connected:null,message:e.message||'تعذر الاتصال.'});}
    finally{setConnectBusy(false);}
  };
  (0,v.useEffect)(()=>{void refreshConnection();},[]);
  const saveConnection=async()=>{
    if(connectBusy)return;
    if(!apiKey.trim()){setConnect(c=>({...c,state:'error',connected:null,message:'أدخل مفتاح Gemini الجديد أولًا.'}));return;}
    setConnectBusy(true);
    try{
      const data=await connectionCall({action:'connection_save',apiKey:apiKey.trim(),model:apiModel});
      setApiKey('');
      setConnect({state:'saved',configured:true,connected:null,message:data.message||'تم حفظ المفتاح. اختبر الاتصال الآن.'});
      eb.success('تم حفظ المفتاح في Supabase Vault.');
    }catch(e){setConnect(c=>({...c,state:'error',connected:null,message:e.message||'تعذر الحفظ.'}));}
    finally{setConnectBusy(false);}
  };
  const testConnection=async()=>{
    if(connectBusy)return;setConnectBusy(true);
    setConnect(c=>({...c,state:'testing',connected:null,message:'جارٍ إرسال اختبار حقيقي إلى Gemini…'}));
    try{
      const data=await connectionCall({action:'connection_test'});
      setConnect({state:data.connected?'connected':'error',configured:!!data.configured,connected:!!data.connected,message:data.message||'تم الاختبار.',model:data.model});
      if(data.connected)eb.success('اتصال Gemini ناجح.');
    }catch(e){setConnect(c=>({...c,state:'error',connected:false,message:e.message||'فشل اختبار الاتصال.'}));}
    finally{setConnectBusy(false);}
  };
  const field=(title,node)=>(0,q.jsxs)('label',{className:'sr616-field',children:[(0,q.jsx)('span',{children:title}),node]});
  const options=(value,onChange,items)=>(0,q.jsx)('select',{value,onChange:e=>onChange(e.target.value),children:items.map(([id,label])=>(0,q.jsx)('option',{value:id,children:label},id))});
  const input=(value,onChange,props={})=>(0,q.jsx)('input',{value,onChange:e=>onChange(e.target.value),...props});
  const updateConfig=(key,value)=>setConfig(prev=>({...prev,[key]:value}));
  const filters=()=>({exam,subject:rawSubject,cohort,grade,className,teacher:mode==='teacher'?teacher:'الكل',mode,level,studentId});
  const persist=async(description,change)=>{
    if(SR63.storage.blocked)throw new Error('الحفظ السحابي متوقف بسبب تعارض.');
    if(!await Kj(workspace,description))throw new Error('تعذر إنشاء نقطة الاستعادة. لم تُحفظ التعديلات.');
    setWorkspace(previous=>change(previous));
  };
  const preview=()=>{const made=SR63.aiPlanRequest(workspace,filters(),config);setRequest(made);return made;};
  const generate=async(manual=false)=>{
    if(busy)return;setBusy(true);setError('');setDraft(null);
    try{
      const made=preview();
      if(!manual){
        const client=SR63.cloud.client(),{data,error:invokeError}=await client.functions.invoke('school-ai-plans',{body:{evidence:made.evidence}});
        if(invokeError){const status=invokeError.context?.status;throw new Error(status===404?'وظيفة Gemini لم تُنشر بعد في مشروع Supabase الصحيح.':status===429?'بلغت حد توليد الخطط اليومي.': 'تعذر الاتصال بالخدمة الآمنة. تحقق من إعدادات Supabase والمفتاح.');}
        if(!data?.plan)throw new Error(data?.error||'لم تُرجع الخدمة خطة صالحة.');
        setDraft(SR63.aiPlanNormalize(data.plan,made.evidence));
      }else setDraft(SR63.aiPlanManualDraft(made.evidence));
    }catch(e){setError(e.message||'تعذّر إنشاء الخطة.');}finally{setBusy(false);}
  };
  const saveDraft=async()=>{
    if(!draft||!request||busy)return;setBusy(true);setError('');
    try{const source=draft.cautions?.includes('مسودة إجرائية محلية')?'manual':'gemini';
      const title=draft.title;
      await persist('قبل حفظ خطة علاجية جديدة',previous=>({...SR63.aiPlanCreate(previous,request,draft,source),aiPlanSettings:config}));
      setDraft(null);setRequest(null);setTab('library');eb.success(`حُفظت الخطة «${title}» كمسودة بانتظار اعتماد المعلم.`);
    }catch(e){setError(e.message);}finally{setBusy(false);}
  };
  const edit=async(id,change,description)=>{
    if(busy)return;setBusy(true);setError('');
    try{await persist(description,previous=>SR63.aiPlanUpdate(previous,id,change));eb.success('سُجّل التحديث وحُفظت نقطة استعادة.');}
    catch(e){setError(e.message||'تعذر الحفظ.');}finally{setBusy(false);}
  };
  const printPlan=(plan)=>{
    const safe=SR63.escape;
    document.getElementById('sr616-print-root')?.remove();
    const root=document.createElement('section');root.id='sr616-print-root';root.className='sr616-print-root';
    root.innerHTML=`<h1>${safe(workspace.settings.schoolName)}</h1><h2>${safe(plan.title)}</h2><p>المادة: ${safe(plan.subject)} | التقييم: ${safe(plan.exam)} | ${safe(plan.cohort==='support'?'الدعم الإضافي':'التعليم العام')}</p><p>عدد الطلاب: ${plan.members.length} | الحالة: ${safe(plan.status)} | مصدر المسودة: ${safe(plan.source)}</p><h3>الطلاب المستهدفون (نسخة داخلية)</h3><p>${plan.members.map(m=>safe(m.studentName)+' - '+safe(m.className)).join('، ')}</p><h3>التشخيص</h3><p>${safe(plan.diagnosis)}</p><h3>الهدف</h3><p>${safe(plan.goal)}</p><h3>معيار النجاح</h3><p>${safe(plan.successCriterion)}</p><table><thead><tr><th>الأسبوع</th><th>الإجراء</th><th>الموارد</th><th>أداة القياس</th><th>التنفيذ والمتابعة</th></tr></thead><tbody>${plan.steps.map(s=>`<tr><td>${s.week}</td><td>${safe(s.action)}</td><td>${safe(s.resources)}</td><td>${safe(s.measure)}</td><td>${safe(s.completed?'تم':'لم يُنفذ')}: ${safe(s.followUp||'—')}</td></tr>`).join('')}</tbody></table><p>ملاحظات: ${safe(plan.cautions)}</p><p>اعتماد المسؤول: ${safe(plan.approvedBy||'________________')}</p>`;
    document.body.append(root);document.body.classList.add('sr616-printing');
    const clear=()=>{root.remove();document.body.classList.remove('sr616-printing');};
    window.addEventListener('afterprint',clear,{once:true});try{window.print();}catch(e){clear();setError('تعذر فتح الطباعة.');}
  };
  return (0,q.jsxs)('div',{className:'sr616-plans',children:[
    (0,q.jsxs)('header',{className:'sr616-hero',children:[(0,q.jsx)('span',{children:'SchoolResult AI · توصيات خاضعة للاعتماد'}),(0,q.jsx)('h1',{children:'مركز الخطط العلاجية الذكية'}),(0,q.jsx)('p',{children:'خطط فردية وجماعية وإجراءات قابلة للقياس من درجات الاختبارات والموارد المتاحة. لا تُرسل أسماء الطلاب ولا أرقامهم الأكاديمية إلى Gemini.'})]}),
    (0,q.jsxs)('nav',{className:'sr616-tabs',children:[(0,q.jsx)('button',{onClick:()=>setTab('create'),className:tab==='create'?'active':'',children:'إعداد خطة جديدة'}),(0,q.jsx)('button',{onClick:()=>setTab('library'),className:tab==='library'?'active':'',children:`الخطط المحفوظة (${plans.length})`}),(0,q.jsx)('button',{onClick:()=>setTab('connection'),className:tab==='connection'?'active':'',children:'إعدادات اتصال Gemini'})]}),
    error?(0,q.jsx)('div',{className:'sr616-error',role:'alert',children:error}):null,
    tab==='connection'?(0,q.jsxs)('section',{className:'sr616-panel sr617-connection',children:[
      (0,q.jsx)('h2',{children:'إعداد Gemini API من داخل البرنامج'}),
      (0,q.jsx)('p',{className:'sr616-hint',children:'هذه الإعدادات مخصصة لمالك مساحة العمل. يُحفظ المفتاح مشفرًا في Supabase Vault ولا يُخزن في قاعدة نتائج الطلاب أو داخل ملفات GitHub. المفتاح القديم الذي ظهر في محادثة لا تستخدمه؛ أنشئ مفتاحًا بديلًا.'}),
      (0,q.jsxs)('div',{className:`sr617-status ${connect.state}`,role:'status',children:[
        (0,q.jsx)('strong',{children:connect.state==='connected'?'الاتصال ناجح':connect.state==='saved'?'مفتاح محفوظ — لم يُختبر بعد':connect.state==='missing'?'لم يُضبط المفتاح':connect.state==='testing'?'جارٍ فحص Gemini':'حالة الاتصال'}),
        (0,q.jsx)('span',{children:connect.message})
      ]}),
      (0,q.jsx)('div',{className:'sr616-grid',children:[
        field('مفتاح Gemini API الجديد',(0,q.jsx)('input',{type:'password',value:apiKey,onChange:e=>setApiKey(e.target.value),autoComplete:'new-password',spellCheck:false,placeholder:'الصق المفتاح الجديد هنا — لن يُعرض بعد الحفظ',maxLength:260})),
        field('النموذج',options(apiModel,setApiModel,[['gemini-2.5-flash','Gemini 2.5 Flash — سريع'],['gemini-2.5-pro','Gemini 2.5 Pro — تحليل أعمق'],['gemini-2.5-flash-lite','Gemini 2.5 Flash-Lite — اقتصادي']]))
      ]}),
      (0,q.jsxs)('div',{className:'sr616-actions',children:[
        (0,q.jsx)('button',{disabled:connectBusy||!apiKey.trim(),onClick:()=>void saveConnection(),children:connectBusy?'جارٍ التنفيذ…':'حفظ المفتاح والنموذج بأمان'}),
        (0,q.jsx)('button',{className:'secondary',disabled:connectBusy||!connect.configured,onClick:()=>void testConnection(),children:'اختبار اتصال Gemini فعليًا'}),
        (0,q.jsx)('button',{className:'secondary',disabled:connectBusy,onClick:()=>void refreshConnection(),children:'تحديث حالة الاتصال'})
      ]}),
      (0,q.jsx)('p',{className:'sr616-hint',children:'يشغّل اختبار الاتصال طلبًا صغيرًا حقيقيًا إلى Gemini، وقد يستهلك قدرًا ضئيلًا من حصة API. نجاح الحفظ وحده لا يعني نجاح الاتصال. لن يعود المفتاح إلى المتصفح بعد تخزينه.'})
    ]}):null,
    tab==='create'?(0,q.jsxs)('section',{className:'sr616-panel',children:[
      (0,q.jsx)('h2',{children:'1. تحديد الطلاب والمادة'}),
      (0,q.jsx)('div',{className:'sr616-grid',children:[
        field('نوع الخطة',options(mode,value=>{setMode(value);setDraft(null)},[['individual','خطة فردية'],['group','خطة جماعية'],['teacher','خطة معلم'],['department','خطة قسم']])),
        field('الاختبار',options(exam,setExam,workspace.settings.exams.map(x=>[x.key,x.name]))),
        field('الفئة',options(cohort,value=>{setCohort(value);setGrade('الكل');setClassName('الكل')},[['general','التعليم العام'],['support','الدعم الإضافي (ESE)']])),
        field('المادة',options(realSubject,value=>{setSubject(value);setStudentId('')},subjects.map(([key,name])=>[key,SR63.reportSubjectLabel(name,workspace.settings)]))),
        field('الصف',options(grade,value=>{setGrade(value);setClassName('الكل')},[['الكل','كل الصفوف'],...grades.map(x=>[x,x])])),
        field('الشعبة',options(className,setClassName,[['الكل','كل الشعب'],...classes.map(x=>[x,x])])),
        mode==='teacher'?field('المعلم',options(teacher,setTeacher,[['الكل','كل المعلمين'],...teachers.map(x=>[x,x])])):null,
        mode==='individual'?field('الطالب',options(studentId,setStudentId,[['','اختر طالبًا'],...candidates.map(x=>[x.studentId,`${x.studentName} — ${x.className} (${x.percentage===null?'غير مرصود':x.percentage+'%'})`])])):null,
        mode!=='individual'?field('المستوى المستهدف',options(level,setLevel,[['below50','أقل من 50%'],['below60','أقل من 60%'],['between60and80','من 60% إلى أقل من 80%'],['unentered','غير المرصود'],['all','كل النتائج']])):null
      ].filter(Boolean)}),
      (0,q.jsxs)('p',{className:'sr616-hint',children:['الطلاب المطابقون: ',(0,q.jsx)('b',{children:selectedMembers.length}),' · يُستخدم التحليل الرقمي لاكتشاف الحاجة إلى تدخل، ولا يحدد بمفرده المهارات الضعيفة.']}),
      (0,q.jsx)('h2',{children:'2. الإمكانات والمهارات التشخيصية'}),
      (0,q.jsx)('div',{className:'sr616-grid',children:[
        field('عدد الأسابيع',input(config.weeks,x=>updateConfig('weeks',x),{type:'number',min:1,max:8})),
        field('الحصص أسبوعيًا',input(config.sessionsPerWeek,x=>updateConfig('sessionsPerWeek',x),{type:'number',min:1,max:5})),
        field('دقائق الحصة',input(config.minutesPerSession,x=>updateConfig('minutesPerSession',x),{type:'number',min:10,max:90})),
        field('الحد الأقصى للمجموعة',input(config.maxGroupSize,x=>updateConfig('maxGroupSize',x),{type:'number',min:2,max:30}))
      ]}),
      field('الموارد المتاحة',(0,q.jsx)('textarea',{rows:2,value:config.resources,onChange:e=>updateConfig('resources',e.target.value),placeholder:'وسائل تعليمية متاحة فعلًا'})),
      field('المهارات المتعثرة المثبتة بالتشخيص (اختياري)',(0,q.jsx)('textarea',{rows:3,value:config.skillNotes,onChange:e=>updateConfig('skillNotes',e.target.value),placeholder:'مثال: أخطاء متكررة في العمليات على الكسور. لا تكتب أسماء الطلاب أو أرقامهم.'})),
      (0,q.jsxs)('div',{className:'sr616-actions',children:[
        (0,q.jsx)('button',{disabled:busy||!rawSubject||!selectedMembers.length,onClick:()=>void generate(false),children:busy?'جارٍ الإنشاء…':'إنشاء خطة عبر Gemini'}),
        (0,q.jsx)('button',{disabled:busy||!rawSubject||!selectedMembers.length,className:'secondary',onClick:()=>void generate(true),children:'مسودة إجرائية بدون ذكاء اصطناعي'})
      ]}),
      draft?(0,q.jsxs)('section',{className:'sr616-draft',children:[
        (0,q.jsx)('h2',{children:'3. مراجعة الخطة وتعديلها قبل الحفظ'}),
        field('عنوان الخطة',input(draft.title,x=>setDraft({...draft,title:x}))),
        field('الهدف',(0,q.jsx)('textarea',{rows:2,value:draft.goal,onChange:e=>setDraft({...draft,goal:e.target.value})})),
        field('معيار النجاح',(0,q.jsx)('textarea',{rows:2,value:draft.successCriterion,onChange:e=>setDraft({...draft,successCriterion:e.target.value})})),
        (0,q.jsx)('div',{className:'sr616-steps',children:draft.steps.map((step,i)=>(0,q.jsxs)('article',{children:[(0,q.jsx)('b',{children:`الأسبوع ${step.week} — ${step.objective}`}),field('الإجراء',(0,q.jsx)('textarea',{rows:2,value:step.action,onChange:e=>setDraft({...draft,steps:draft.steps.map((s,j)=>j===i?{...s,action:e.target.value}:s)})})),field('أداة القياس',input(step.measure,x=>setDraft({...draft,steps:draft.steps.map((s,j)=>j===i?{...s,measure:x}:s)})))]},i))}),
        (0,q.jsx)('button',{disabled:busy,onClick:()=>void saveDraft(),children:'حفظ المسودة مع نقطة استعادة'})
      ]}):null
    ]}):tab==='library'?(0,q.jsxs)('section',{className:'sr616-library',children:[
      (0,q.jsxs)('aside',{children:[(0,q.jsx)('h2',{children:'الخطط المحفوظة'}),plans.length?plans.map(p=>(0,q.jsxs)('button',{className:active?.id===p.id?'active':'',onClick:()=>{setSelectedId(p.id);setSavedEdit(null)},children:[(0,q.jsx)('strong',{children:p.title}),(0,q.jsx)('small',{children:`${p.subject} · ${p.members.length} طالب · ${p.status}`})]},p.id)):(0,q.jsx)('p',{children:'لا توجد خطط محفوظة بعد.'})]}),
      active?(0,q.jsxs)('section',{className:'sr616-panel',children:[
        (0,q.jsx)('h2',{children:active.title}),(0,q.jsxs)('p',{children:[active.subject,' · ',active.exam,' · ',active.members.length,' طالب · ',active.cohort==='support'?'الدعم الإضافي':'التعليم العام']}),
        (0,q.jsx)('h3',{children:'التشخيص'}),(0,q.jsx)('p',{children:active.diagnosis}),
        (0,q.jsx)('h3',{children:'الهدف ومعيار النجاح'}),(0,q.jsx)('p',{children:active.goal}),(0,q.jsx)('p',{children:active.successCriterion}),
        active.status==='draft'?(0,q.jsxs)('div',{className:'sr616-draft',children:[
          (0,q.jsx)('button',{className:'secondary',disabled:busy,onClick:()=>setSavedEdit(savedEdit?null:{title:active.title,goal:active.goal,successCriterion:active.successCriterion,steps:active.steps.map(x=>({...x}))}),children:savedEdit?'إلغاء التحرير':'تحرير المسودة المحفوظة'}),
          savedEdit?(0,q.jsxs)('div',{className:'sr616-draft',children:[
            field('العنوان',input(savedEdit.title,x=>setSavedEdit({...savedEdit,title:x}))),
            field('الهدف',(0,q.jsx)('textarea',{value:savedEdit.goal,rows:2,onChange:e=>setSavedEdit({...savedEdit,goal:e.target.value})})),
            field('معيار النجاح',(0,q.jsx)('textarea',{value:savedEdit.successCriterion,rows:2,onChange:e=>setSavedEdit({...savedEdit,successCriterion:e.target.value})})),
            (0,q.jsx)('div',{className:'sr616-steps',children:savedEdit.steps.map((step,i)=>(0,q.jsxs)('article',{children:[
              (0,q.jsx)('b',{children:`الأسبوع ${step.week}`}),
              field('الإجراء',(0,q.jsx)('textarea',{rows:2,value:step.action,onChange:e=>setSavedEdit({...savedEdit,steps:savedEdit.steps.map((s,j)=>j===i?{...s,action:e.target.value}:s)})})),
              field('القياس',input(step.measure,x=>setSavedEdit({...savedEdit,steps:savedEdit.steps.map((s,j)=>j===i?{...s,measure:x}:s)})))
            ]},i))}),
            (0,q.jsx)('button',{disabled:busy,onClick:async()=>{await edit(active.id,savedEdit,'قبل تعديل الخطة العلاجية المحفوظة');setSavedEdit(null);},children:'حفظ تعديلات الخطة'})
          ]}):null
        ]}):null,
        (0,q.jsxs)('div',{className:'sr616-actions',children:[
          active.status==='draft'?field('المسؤول المعتمد',input(approvedBy,setApprovedBy,{placeholder:'اسم المعلم أو المنسق'})):null,
          active.status==='draft'?(0,q.jsx)('button',{disabled:busy||!approvedBy.trim(),onClick:()=>void edit(active.id,{status:'approved',approvedBy},'قبل اعتماد الخطة العلاجية'),children:'اعتماد الخطة'}):null,
          active.status==='approved'?(0,q.jsx)('button',{disabled:busy,onClick:()=>void edit(active.id,{status:'in_progress'},'قبل بدء تنفيذ الخطة'),children:'بدء التنفيذ'}):null,
          active.status==='in_progress'?(0,q.jsx)('button',{disabled:busy||!active.steps.every(s=>s.completed),onClick:()=>void edit(active.id,{status:'completed'},'قبل إغلاق الخطة'),children:'إغلاق الخطة بعد تنفيذ الإجراءات'}):null,
          (0,q.jsx)('button',{className:'secondary',onClick:()=>printPlan(active),children:'طباعة الخطة'})
        ].filter(Boolean)}),
        (0,q.jsx)('div',{className:'sr616-steps',children:active.steps.map((step,i)=>(0,q.jsxs)('article',{children:[
          (0,q.jsxs)('header',{children:[(0,q.jsx)('b',{children:`الأسبوع ${step.week} · ${step.objective}`}),active.status!=='draft'?(0,q.jsx)('label',{children:[(0,q.jsx)('input',{type:'checkbox',checked:step.completed,disabled:busy,onChange:e=>void edit(active.id,{steps:active.steps.map((s,j)=>j===i?{...s,completed:e.target.checked}:s)},'قبل تحديث إنجاز إجراء علاجي')}),' نُفذ']}):null]}),
          (0,q.jsx)('p',{children:step.action}),(0,q.jsxs)('small',{children:['وسيلة القياس: ',step.measure,' · الموارد: ',step.resources]}),
          active.status!=='draft'?field('نتيجة التقويم والمتابعة',input(follow[`${active.id}:${i}`]??step.followUp??'',value=>{
            // Keep local edits until the user explicitly saves instead of writing on every keystroke.
            setSelectedId(active.id);setFollow({...follow,[`${active.id}:${i}`]:value});
          },{placeholder:'سجل الإتقان والنتيجة بعد التطبيق'})):null,
          active.status!=='draft'?(0,q.jsx)('button',{className:'secondary',disabled:busy,onClick:()=>void edit(active.id,{steps:active.steps.map((s,j)=>j===i?{...s,followUp:follow[`${active.id}:${i}`]??s.followUp}:s)},'قبل حفظ متابعة التدخل'),children:'حفظ المتابعة'}):null
        ]},i))}),
        (0,q.jsx)('p',{className:'sr616-hint',children:'اعتماد الخطة مسؤولية المعلم/المنسق. قياس التحسن الحقيقي يتطلب تقويمًا تشخيصيًا وبعديًا موثقًا.'})
      ]}):null
    ]}):null
  ]});
};
