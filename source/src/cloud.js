/* Cloud is authoritative. Browser storage holds the login session, never grades. */
SR63.cloud=(function(){
  let client=null,owner=null;
  const config={url:'https://mzrepavyiaceedmuvfbf.supabase.co',key:'sb_publishable_SMEiYjOH55NJYlow1HIAog_BkxOQmvE'};
  function getClient(){if(!client){if(typeof SchoolSupabase==='undefined')throw new Error('تعذر تحميل مكتبة الاتصال؛ تأكد من وجود ملف supabase.js بجوار البرنامج.');let storage;try{storage=sessionStorage;}catch{}client=SchoolSupabase.createClient(config.url,config.key,{global:{fetch:(url,options={})=>fetch(url,{...options,signal:options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(45000)]):AbortSignal.timeout(45000)})},auth:{persistSession:!!storage,storage,storageKey:'school-results-cloud-session',autoRefreshToken:true,detectSessionInUrl:false}});}return client;}
  function message(error){const text=String(error?.message??'');if(text.includes('CLOUD_CONFLICT')){const result=new Error('توجد نسخة أحدث في السحابة من جهاز آخر. نزّل نسختك الحالية ثم حمّل أحدث نسخة أو اعتمد نسختك صراحةً.');result.code='LOCAL_CONFLICT';return result;}if(text.includes('ARCHIVE_CONFLICT'))return new Error('تغيّر الأرشيف على جهاز آخر؛ أعد تحميله ثم حاول الاستعادة.');if(text.includes('ARCHIVE_NOT_FOUND'))return new Error('هذه النسخة لم تعد موجودة في الأرشيف؛ حدّث القائمة ثم حاول مرة أخرى.');if(error?.status===401||/JWT|session|refresh_token|LOGIN_REQUIRED/i.test(text))return new Error('انتهت جلسة الدخول؛ سجّل الدخول بالحساب نفسه ثم أعد الحفظ.');if(/Invalid login credentials/i.test(text))return new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة.');if(/Email not confirmed/i.test(text))return new Error('الحساب لم يُفعّل بعد؛ فعّله من إدارة مستخدمي المشروع.');return new Error('لم تكتمل العملية السحابية. تحقق من الإنترنت والحساب ثم أعد المحاولة. '+(error?.code?'رمز: '+error.code:''));}
  async function authenticated(){const sdk=getClient(),{data,error}=await sdk.auth.getSession();if(error)throw message(error);if(!data.session||!owner||data.session.user.id!==owner)throw new Error('سجّل الدخول بالحساب نفسه قبل الوصول إلى البيانات.');return sdk;}
  async function rpc(name,args){const sdk=await authenticated(),{data,error}=await sdk.rpc(name,args);if(error)throw message(error);return data;}
  async function load(){const sdk=await authenticated(),{data,error}=await sdk.from('school_workspaces').select('workspace,revision,write_id,saved_at').eq('owner_id',owner).maybeSingle();if(error)throw message(error);return data;}
  async function list(){return await rpc('school_archive_list',{});}
  async function archive(id){if(typeof id!=='string'||!id)throw new Error('معرف الأرشيف غير صالح.');return await rpc('school_archive_get',{p_id:id});}
  async function listFull(){const items=await list(),results=new Array(items.length);let next=0;const workers=Array.from({length:Math.min(4,items.length)},async()=>{while(next<items.length){const index=next++;results[index]=await archive(items[index].id);}});await Promise.all(workers);return results;}
  async function remove(id){if(typeof id!=='string'||!id)throw new Error('معرف الأرشيف غير صالح.');return await rpc('school_archive_delete',{p_id:id});}
  return {client:getClient,rpc,load,list,archive,listFull,remove,message,bind(id){owner=id;},get owner(){return owner;},config};
})();
SR63.storage=(function(){
 let queue=Promise.resolve(),expected=null,pending=false,blocked=false,lastError='',generation=0,retry=null,busy=0,lastSavedAt=null;
 const notify=()=>{if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('sr63-storage'));};
 function touch(){generation++;pending=true;notify();}
 async function load(){await queue.catch(()=>{});const result=await SR63.cloud.load();expected=result?.revision??0;lastSavedAt=result?.saved_at??null;blocked=false;lastError='';pending=false;retry=null;notify();return result?{...result.workspace,__storage:{revision:result.revision,writeId:result.write_id,savedAt:result.saved_at}}:null;}
 function save(workspace,options={}){const token=generation,data=structuredClone(workspace),archives=structuredClone(options.snapshots??[]),owner=SR63.cloud.owner;pending=true;busy++;notify();queue=queue.catch(()=>{}).then(async()=>{
  if(owner!==SR63.cloud.owner)throw new Error('تغيّر الحساب؛ أُوقف حفظ بيانات الحساب السابق.');
  if(blocked||expected===null)throw new Error('حمّل بيانات السحابة بنجاح قبل الحفظ.');
  const signature=JSON.stringify([data,archives]);
  const writeId=retry?.signature===signature?retry.writeId:crypto.randomUUID();retry={signature,writeId};
  const result=await SR63.cloud.rpc('school_save',{p_expected:expected,p_workspace:data,p_write_id:writeId,p_archives:archives});
  expected=result.revision;lastSavedAt=result.savedAt??new Date().toISOString();retry=null;pending=generation!==token;lastError='';notify();return {storage:'cloud',bytes:new Blob([JSON.stringify(data)]).size,revision:result.revision,savedAt:lastSavedAt};
 }).catch(error=>{pending=true;lastError=error.message;if(error.code==='LOCAL_CONFLICT')blocked=true;notify();throw error;}).finally(()=>{busy--;notify();});return queue;}
 if(typeof window!=='undefined')window.addEventListener('beforeunload',event=>{if(pending||busy||SR63.formDirty){event.preventDefault();event.returnValue='';}});
 return {load,save,touch,wait:()=>queue,block(message){blocked=true;lastError=message;notify();},reset(){expected=null;pending=false;blocked=false;lastError='';retry=null;generation=0;lastSavedAt=null;},get pending(){return pending;},get blocked(){return blocked;},get error(){return lastError;},get busy(){return busy;},get revision(){return expected;},get savedAt(){return lastSavedAt;}};
})();
