/* SchoolResult 6.10.39 — single-flight session verification, persistent login and password recovery.
   Auth refresh tokens are stored by Supabase in localStorage where available;
   school results are never stored in the browser. Do not save passwords. */
SR63.CloudApp=function(){
 const initialReset=(()=>{try{const u=new URL(window.location.href);return u.searchParams.get('sr_reset')==='1'||/\btype=recovery\b/.test(u.hash);}catch{return false;}})();
 const [user,setUser]=(0,v.useState)(null),[mounted,setMounted]=(0,v.useState)(null),[role,setRole]=(0,v.useState)(null),
 [ready,setReady]=(0,v.useState)(false),[email,setEmail]=(0,v.useState)(()=>{try{return localStorage.getItem('schoolresult-last-identifier')||'';}catch{return '';}}),
 [password,setPassword]=(0,v.useState)(''),[error,setError]=(0,v.useState)(''),[busy,setBusy]=(0,v.useState)(false),
 [tick,setTick]=(0,v.useState)(0),[recovery,setRecovery]=(0,v.useState)(initialReset?'update':''),
 [recoveryEmail,setRecoveryEmail]=(0,v.useState)(''),[newPassword,setNewPassword]=(0,v.useState)(''),
 [confirmPassword,setConfirmPassword]=(0,v.useState)(''),[recoveryNotice,setRecoveryNotice]=(0,v.useState)(''),
 bound=(0,v.useRef)(null),sessionTask=(0,v.useRef)(0),recoveryRef=(0,v.useRef)(initialReset),resumeRef=(0,v.useRef)(null),applyRef=(0,v.useRef)(null),verifiedRef=(0,v.useRef)(null),loginRef=(0,v.useRef)(false);
 const el=(type,props,children)=>(0,q.jsx)(type,{...props,children});
 (0,v.useEffect)(()=>{
  let alive=true,initialSeen=false,profileFlight=null;
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const transient=err=>err?.transient===true||err?.code==='STAFF_NETWORK_TIMEOUT'||err?.code==='ACCOUNT_LOOKUP_FAILED';
  const profileFor=async id=>{
   if(verifiedRef.current?.id===id)return verifiedRef.current.profile;
   if(profileFlight?.id===id)return profileFlight.promise;
   const task=(async()=>{
    // Retry only network / service interruptions, never bad credentials, disabled
    // accounts, permission denial, or other authorization failures.
    for(let attempt=0;attempt<2;attempt++){
     try{return await SR63.staff.profile();}
     catch(err){if(!transient(err)||attempt===1)throw err;await pause(650);}
    }
   })();
   profileFlight={id,promise:task};
   task.then(()=>{if(profileFlight?.promise===task)profileFlight=null;},()=>{if(profileFlight?.promise===task)profileFlight=null;});
   return task;
  };
  const apply=async(session,force=false)=>{
   const next=session?.user??null,nonce=++sessionTask.current;
   if(recoveryRef.current){if(alive)setReady(true);return;}
   if(!next){if(!alive||loginRef.current)return;
    verifiedRef.current=null;setUser(null);setRole(null);
    if(!SR63.storage.pending&&!SR63.storage.busy){bound.current=null;SR63.cloud.bind(null);SR63.cloud.setAccess(null);SR63.storage.reset();SR63.currentWorkspace=null;setMounted(null);}
    setReady(true);return;
   }
   if(!force&&verifiedRef.current?.id===next.id){
    if(alive){setMounted(next.id);setRole(verifiedRef.current.profile);setUser(next);setReady(true);setError('');}
    return;
   }
   try{
    const profile=await profileFor(next.id);
    if(!alive||nonce!==sessionTask.current||recoveryRef.current)return;
    if(!['owner','admin','coordinator','vice_principal','principal'].includes(profile.role))throw new Error('الحساب ليس لديه صلاحيات نشطة.');
    if(next.id!==bound.current){
     if(bound.current&&(SR63.storage.pending||SR63.storage.busy))throw new Error('توجد تغييرات معلّقة؛ أكمل حفظ الحساب السابق قبل تبديل المستخدم.');
     bound.current=next.id;SR63.cloud.bind(next.id);SR63.cloud.setAccess(profile);SR63.storage.reset();setMounted(next.id);
    }else SR63.cloud.setAccess(profile);
    setMounted(next.id); // Also restore the mounted identity after an earlier transient failure.
    verifiedRef.current={id:next.id,profile};
    setRole(profile);setUser(next);setError('');setReady(true);
   }catch(err){
    if(alive&&nonce===sessionTask.current){
     verifiedRef.current=null;setUser(null);setRole(null);setMounted(null);
     setError(err?.message||'تعذر التحقق من صلاحيات الحساب. اضغط إعادة التحقق.');setReady(true);
    }
   }
  };
  applyRef.current=apply;
  resumeRef.current=async()=>{try{
   // Fallback / manual verification only; INITIAL_SESSION is the normal entry point.
   const {data,error}=await SR63.cloud.client().auth.getSession();if(error)throw error;
   await apply(data.session,true);
  }catch(err){if(alive){setError(SR63.cloud.message(err).message);setReady(true);}}};
  try{
   const sdk=SR63.cloud.client();
   const {data}=sdk.auth.onAuthStateChange((event,session)=>setTimeout(()=>{
    if(!alive)return;
    if(event==='PASSWORD_RECOVERY'){recoveryRef.current=true;setRecovery('update');setRecoveryNotice('تم التحقق من رابط الاستعادة. أدخل كلمة مرور جديدة للحساب.');setError('');setReady(true);return;}
    if(event==='INITIAL_SESSION')initialSeen=true;
    if(recoveryRef.current)return;
    if(event==='SIGNED_OUT'){void apply(null);return;}
    // signInWithPassword will apply the returned session directly; no duplicate profile call.
    if(loginRef.current&&(event==='SIGNED_IN'||event==='INITIAL_SESSION'))return;
    if(event==='TOKEN_REFRESHED'&&verifiedRef.current?.id===session?.user?.id)return;
    if(['INITIAL_SESSION','SIGNED_IN','TOKEN_REFRESHED','USER_UPDATED'].includes(event))void apply(session);
   },0));
   // Extremely defensive fallback in case INITIAL_SESSION is never delivered.
   const fallback=setTimeout(()=>{if(alive&&!initialSeen&&!recoveryRef.current)void resumeRef.current?.();},2500);
   const update=()=>setTick(x=>x+1);window.addEventListener('sr63-storage',update);
   return()=>{alive=false;clearTimeout(fallback);sessionTask.current++;resumeRef.current=null;data.subscription.unsubscribe();window.removeEventListener('sr63-storage',update);};
  }catch(err){setError(err.message);setReady(true);return()=>{alive=false;resumeRef.current=null;};}
 },[]);
 const login=async event=>{event.preventDefault();if(busy||loginRef.current)return;loginRef.current=true;setBusy(true);setError('');try{
  if(bound.current&&(SR63.storage.pending||SR63.storage.busy))throw new Error('توجد بيانات لم تُحفظ لحساب آخر؛ أكمل حفظها قبل تبديل المستخدم.');
  const identifier=email.trim();const address=identifier.includes('@')?identifier.toLowerCase():await SR63.staff.emailForUsername(identifier);
  const {data,error:authError}=await SR63.cloud.client().auth.signInWithPassword({email:address,password});if(authError)throw authError;
  if(!data?.session)throw new Error('تعذر استلام جلسة الدخول من الخادم.');
  try{localStorage.setItem('schoolresult-last-identifier',identifier);}catch{}
  setPassword('');
  // A successful password login is followed by exactly one scoped authorization check.
  await applyRef.current?.(data.session);
 }catch(err){setError(SR63.cloud.message(err).message);}finally{loginRef.current=false;setBusy(false);}};
 const logout=async()=>{setError('');if(SR63.storage.busy){setError('انتظر اكتمال الحفظ قبل تسجيل الخروج.');return;}
  if(SR63.storage.pending||SR63.formDirty||SR63.settingsDirty){setError('لديك تعديلات غير محفوظة؛ احفظها أولًا.');return;}
  setBusy(true);try{const {error:signoutError}=await SR63.cloud.client().auth.signOut({scope:'local'});if(signoutError)throw signoutError;}catch(err){setError(SR63.cloud.message(err).message);}finally{setBusy(false);}};
 const requestReset=async event=>{event.preventDefault();if(busy)return;setBusy(true);setError('');setRecoveryNotice('');try{
  const address=recoveryEmail.trim().toLowerCase();
  if(!address||!/^\S+@\S+\.\S+$/.test(address))throw new Error('أدخل عنوان بريد إلكتروني صحيحًا.');
  if(address.endsWith('@staff.schoolresult.example.com'))throw new Error('هذا بريد داخلي افتراضي لا يستقبل الرسائل. اطلب من الأدمن تغيير كلمة المرور من صفحة المستخدمين والصلاحيات.');
  if(!/^https?:$/.test(window.location.protocol))throw new Error('استعادة كلمة المرور بالبريد متاحة عبر رابط الموقع المنشور HTTPS.');
  const redirect=new URL(window.location.pathname,window.location.origin);redirect.searchParams.set('sr_reset','1');
  const {error:resetError}=await SR63.cloud.client().auth.resetPasswordForEmail(address,{redirectTo:redirect.toString()});
  if(resetError)throw resetError;
  setRecoveryNotice('إذا كان البريد مسجّلًا لدى المدرسة، ستصلك رسالة تتضمن رابط تعيين كلمة مرور جديدة. تحقق من البريد الوارد والرسائل غير المرغوب فيها.');
 }catch(err){setError(SR63.cloud.message(err).message);}finally{setBusy(false);}};
 const finishReset=async event=>{event.preventDefault();if(busy)return;setBusy(true);setError('');try{
  if(newPassword.length<10||newPassword.length>128)throw new Error('كلمة المرور الجديدة يجب أن تكون بين 10 و128 حرفًا.');
  if(newPassword!==confirmPassword)throw new Error('تأكيد كلمة المرور غير مطابق.');
  const sdk=SR63.cloud.client(),{data,error:sessionError}=await sdk.auth.getSession();
  if(sessionError||!data?.session)throw new Error('رابط الاستعادة منتهي الصلاحية أو غير صالح. اطلب رابطًا جديدًا.');
  const {error:updateError}=await sdk.auth.updateUser({password:newPassword});if(updateError)throw updateError;
  setNewPassword('');setConfirmPassword('');setPassword('');
  recoveryRef.current=false;setRecovery('');setReady(true);
  try{const clean=new URL(window.location.href);clean.searchParams.delete('sr_reset');clean.hash='';window.history.replaceState(null,'',clean.pathname+clean.search);}catch{}
  // Require a normal login after a password change; do not grant account access
  // until the active school role has been validated by school-staff.
  const {error:exitError}=await sdk.auth.signOut({scope:'local'});if(exitError)throw exitError;
  setRecoveryNotice('تم تغيير كلمة المرور بنجاح. سجّل الدخول الآن بكلمة المرور الجديدة.');
 }catch(err){setError(err.message||SR63.cloud.message(err).message);}finally{setBusy(false);}};
 const changeScreen=screen=>{if(screen==='update'&&!recoveryRef.current)return;setRecovery(screen);setError('');setRecoveryNotice('');};
 const cancelRecovery=async()=>{
  // A recovery email confers a short-lived signed-in session. Explicitly revoke
  // this local session before returning to the ordinary login screen.
  setBusy(true);try{await SR63.cloud.client().auth.signOut({scope:'local'});}catch{}finally{
   recoveryRef.current=false;setRecovery('');setError('');setBusy(false);
   try{const clean=new URL(window.location.href);clean.searchParams.delete('sr_reset');clean.hash='';window.history.replaceState(null,'',clean.pathname+clean.search);}catch{}
  }
 };
 if(!ready)return el('main',{className:'sr-cloud-login',dir:'rtl'},el('p',{role:'status'},'جارٍ التحقق من جلسة الدخول وصلاحياتها…'));
 const authorized=user&&mounted===user.id&&role&&!recovery;
 return el(v.Fragment,{},[
  authorized&&el('div',{key:mounted,children:null},['coordinator','vice_principal','principal'].includes(role.role)?el(SR63.CoordinatorPortal,{profile:role}):el(Nde,{})),
  authorized&&el('aside',{className:'sr-cloud-account',dir:'rtl','aria-label':'الحساب السحابي'},[
   el('span',{},role.displayName||role.username||user.email),
   el('strong',{role:'status'},role.role==='coordinator'?'منسق · '+(role.departments||[]).join('، '):role.role==='vice_principal'?'النائب الأكاديمي · تقارير المدرسة':role.role==='principal'?'مدير المدرسة · تقارير المدرسة':SR63.storage.busy?'جارٍ الحفظ السحابي…':SR63.storage.pending?'تغييرات لم تُحفظ':SR63.storage.error?'تعذر الاتصال':role.role==='admin'?'أدمن · حفظ سحابي محمي':'مالك المدرسة · متصل'),
   el('button',{type:'button',disabled:busy,onClick:logout},'تسجيل الخروج'),error&&el('p',{role:'alert'},error)]),
  !authorized&&el('main',{className:'sr-cloud-login'+(mounted?' sr-cloud-overlay':''),dir:'rtl'},el('section',{className:'sr-cloud-card'},[
   el('span',{className:'sr63-kicker'},`مرصد النتائج المدرسية · الإصدار ${SR63.version}`),
   el('h1',{},recovery==='update'?'تعيين كلمة مرور جديدة':recovery==='request'?'استعادة كلمة المرور':'تسجيل دخول العاملين في المدرسة'),
   recovery==='update'?el('form',{onSubmit:finishReset},[
    el('p',{className:'sr-cloud-note'},'ضع كلمة مرور قوية جديدة. لن تُحفظ كلمة المرور داخل المتصفح.'),
    el('label',{},['كلمة المرور الجديدة',el('input',{type:'password',required:true,minLength:10,maxLength:128,autoComplete:'new-password',value:newPassword,onChange:e=>setNewPassword(e.target.value),dir:'ltr'})]),
    el('label',{},['تأكيد كلمة المرور',el('input',{type:'password',required:true,minLength:10,maxLength:128,autoComplete:'new-password',value:confirmPassword,onChange:e=>setConfirmPassword(e.target.value),dir:'ltr'})]),
    el('button',{type:'submit',className:'sr63-button',disabled:busy},busy?'جارٍ الحفظ…':'حفظ كلمة المرور الجديدة'),
    el('button',{type:'button',className:'sr-cloud-text-button',onClick:()=>void cancelRecovery()},'العودة لتسجيل الدخول')
   ]):recovery==='request'?el('form',{onSubmit:requestReset},[
    el('p',{className:'sr-cloud-note'},'استخدم البريد الإلكتروني الحقيقي المسجّل في Supabase Auth لحسابك. حسابات أسماء المستخدمين ذات البريد الافتراضي تحتاج مساعدة الأدمن.'),
    el('label',{},['البريد الإلكتروني',el('input',{type:'email',required:true,autoComplete:'email',value:recoveryEmail,onChange:e=>setRecoveryEmail(e.target.value),dir:'ltr'})]),
    el('button',{type:'submit',className:'sr63-button',disabled:busy},busy?'جارٍ إرسال الطلب…':'إرسال رابط إعادة تعيين كلمة المرور'),
    el('button',{type:'button',className:'sr-cloud-text-button',onClick:()=>changeScreen('')},'العودة لتسجيل الدخول')
   ]):[
    el('p',{},'اكتب اسم المستخدم أو البريد الإلكتروني في الخانة نفسها. سيُحفظ تسجيل الدخول على هذا الجهاز حتى تسجّل الخروج.'),
    el('form',{onSubmit:login},[
     el('label',{},['اسم المستخدم أو البريد الإلكتروني',el('input',{type:'text',required:true,autoComplete:'username',value:email,onChange:event=>setEmail(event.target.value),dir:'auto',placeholder:'اسم المستخدم أو البريد الإلكتروني'})]),
     el('label',{},['كلمة المرور',el('input',{type:'password',required:true,autoComplete:'current-password',value:password,onChange:event=>setPassword(event.target.value),dir:'ltr'})]),
     el('button',{type:'submit',className:'sr63-button',disabled:busy},busy?'جارٍ التحقق من الدخول والصلاحيات…':'تسجيل الدخول')
    ]),
    el('button',{type:'button',className:'sr-cloud-text-button',onClick:()=>{setRecoveryEmail(email.includes('@')?email:'');changeScreen('request');}},'نسيت كلمة المرور؟'),
    error&&el('button',{type:'button',className:'sr-cloud-text-button',disabled:busy,onClick:()=>void resumeRef.current?.()},'إعادة التحقق من الجلسة'),
    el('p',{className:'sr-cloud-note'},'في الأجهزة المشتركة اضغط «تسجيل الخروج» بعد الانتهاء. يستطيع الأدمن إعادة تعيين كلمات مرور حسابات الموظفين ذات أسماء المستخدمين.')
   ],
   error&&el('p',{role:'alert',className:'sr-cloud-error'},error),
   recoveryNotice&&el('p',{role:'status',className:'sr-cloud-success'},recoveryNotice)
  ]))
 ]);
};
