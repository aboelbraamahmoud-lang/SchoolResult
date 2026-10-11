/* SchoolResult 6.10.26 — credentials may be a staff username or legacy owner email. */
SR63.CloudApp=function(){
 const [user,setUser]=(0,v.useState)(null),[mounted,setMounted]=(0,v.useState)(null),[role,setRole]=(0,v.useState)(null),
 [ready,setReady]=(0,v.useState)(false),[email,setEmail]=(0,v.useState)(''),[loginMode,setLoginMode]=(0,v.useState)('username'),
 [password,setPassword]=(0,v.useState)(''),[error,setError]=(0,v.useState)(''),[busy,setBusy]=(0,v.useState)(false),
 [tick,setTick]=(0,v.useState)(0),bound=(0,v.useRef)(null),sessionTask=(0,v.useRef)(0);
 const el=(type,props,children)=>(0,q.jsx)(type,{...props,children});
 (0,v.useEffect)(()=>{
  let alive=true;
  const apply=async session=>{
   const nonce=++sessionTask.current,next=session?.user??null;
   if(!next){if(!alive)return;setUser(null);if(!SR63.storage.pending&&!SR63.storage.busy){bound.current=null;SR63.cloud.bind(null);SR63.cloud.setAccess(null);SR63.storage.reset();SR63.currentWorkspace=null;setMounted(null);setRole(null);}setReady(true);return;}
   try{
    const profile=await SR63.staff.profile();if(!alive||nonce!==sessionTask.current)return;
    if(!['owner','admin','coordinator'].includes(profile.role))throw new Error('الحساب ليس لديه صلاحيات نشطة.');
    if(next.id!==bound.current){
     if(bound.current&&(SR63.storage.pending||SR63.storage.busy)){setError('توجد تغييرات معلّقة؛ سجّل الدخول بالحساب السابق لإكمال حفظها.');return;}
     bound.current=next.id;SR63.cloud.bind(next.id);SR63.cloud.setAccess(profile);SR63.storage.reset();setMounted(next.id);
    }else SR63.cloud.setAccess(profile);
    setRole(profile);setUser(next);setError('');setReady(true);
   }catch(err){if(alive&&nonce===sessionTask.current){setUser(null);setMounted(null);setError(err.message||'لا تملك صلاحية الدخول إلى هذه المدرسة.');setReady(true);}}
  };
  try{
   const sdk=SR63.cloud.client();sdk.auth.getSession().then(({data,error})=>{if(error)throw error;void apply(data.session);}).catch(err=>{if(alive){setError(err.message);setReady(true);}});
   const {data}=sdk.auth.onAuthStateChange((_event,session)=>setTimeout(()=>void apply(session),0));
   const update=()=>setTick(x=>x+1);window.addEventListener('sr63-storage',update);
   return()=>{alive=false;data.subscription.unsubscribe();window.removeEventListener('sr63-storage',update);};
  }catch(err){setError(err.message);setReady(true);return()=>{alive=false;};}
 },[]);
 const login=async event=>{event.preventDefault();setBusy(true);setError('');try{
  const address=loginMode==='username'?await SR63.staff.emailForUsername(email):email.trim();
  const {data,error}=await SR63.cloud.client().auth.signInWithPassword({email:address,password});if(error)throw error;
  if(bound.current&&data.user.id!==bound.current)throw new Error('WRONG_ACCOUNT');setPassword('');
 }catch(err){setError(err.message==='WRONG_ACCOUNT'?'سجّل الدخول بالحساب السابق لحفظ التغييرات المعلّقة.':SR63.cloud.message(err).message);}finally{setBusy(false);}};
 const logout=async()=>{setError('');if(SR63.storage.busy){setError('انتظر اكتمال الحفظ قبل تسجيل الخروج.');return;}
  if(SR63.storage.pending||SR63.formDirty||SR63.settingsDirty){setError('لديك تعديلات غير محفوظة؛ احفظها أولًا.');return;}
  setBusy(true);try{const {error}=await SR63.cloud.client().auth.signOut({scope:'local'});if(error)throw error;}catch(err){setError(SR63.cloud.message(err).message);}finally{setBusy(false);}};
 if(!ready)return el('main',{className:'sr-cloud-login',dir:'rtl'},el('p',{role:'status'},'جارٍ التحقق من جلسة الدخول وصلاحياتها…'));
 const authorized=user&&mounted===user.id&&role;
 return el(v.Fragment,{},[
  authorized&&el('div',{key:mounted,children:null},role.role==='coordinator'?el(SR63.CoordinatorPortal,{profile:role}):el(Nde,{})),
  authorized&&el('aside',{className:'sr-cloud-account',dir:'rtl','aria-label':'الحساب السحابي'},[
   el('span',{},role.displayName||role.username||user.email),
   el('strong',{role:'status'},role.role==='coordinator'?'منسق · '+(role.departments||[]).join('، '):SR63.storage.busy?'جارٍ الحفظ السحابي…':SR63.storage.pending?'تغييرات لم تُحفظ':SR63.storage.error?'تعذر الاتصال':role.role==='admin'?'أدمن · حفظ سحابي محمي':'مالك المدرسة · متصل'),
   el('button',{type:'button',disabled:busy,onClick:logout},'تسجيل الخروج'),error&&el('p',{role:'alert'},error)]),
  !authorized&&el('main',{className:'sr-cloud-login'+(mounted?' sr-cloud-overlay':''),dir:'rtl'},el('section',{className:'sr-cloud-card'},[
   el('span',{className:'sr63-kicker'},`مرصد النتائج المدرسية · الإصدار ${SR63.version}`),
   el('h1',{},'تسجيل دخول العاملين في المدرسة'),
   el('p',{},'يدخل الأدمن والمنسق باسم مستخدم وكلمة مرور. يظل حساب المالك القديم بالبريد متاحًا.'),
   el('div',{className:'srstaff-mode'},[
    el('button',{type:'button',className:loginMode==='username'?'active':'',onClick:()=>{setLoginMode('username');setEmail('');}},'اسم مستخدم'),
    el('button',{type:'button',className:loginMode==='email'?'active':'',onClick:()=>{setLoginMode('email');setEmail('');}},'حساب المالك بالبريد')
   ]),
   el('form',{onSubmit:login},[
    el('label',{},[loginMode==='username'?'اسم المستخدم':'البريد الإلكتروني',el('input',{type:loginMode==='username'?'text':'email',required:true,autoComplete:'username',value:email,onChange:event=>setEmail(event.target.value),dir:'auto'})]),
    el('label',{},['كلمة المرور',el('input',{type:'password',required:true,autoComplete:'current-password',value:password,onChange:event=>setPassword(event.target.value),dir:'ltr'})]),
    el('button',{type:'submit',className:'sr63-button',disabled:busy},busy?'جارٍ تسجيل الدخول…':'تسجيل الدخول')
   ]),error&&el('p',{role:'alert',className:'sr-cloud-error'},error),
   el('p',{className:'sr-cloud-note'},'يُنشئ الأدمن حسابات جديدة من «الإدارة ← المستخدمون والصلاحيات». لا تحتاج حساب بريد لإنشاء مستخدم جديد.')
  ]))
 ]);
};
