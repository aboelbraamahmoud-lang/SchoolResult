/* Heavy Office templates are private to Word exports; fetch only on explicit export.
   Avoid inflating navigation/initial render with historical OOXML templates. */
SR63.loadWordTemplate=(function(){
 const paths={reference:['teacherReferenceTemplates','./assets/word-reference.js'],improvement:['approvedImprovementWord','./assets/word-improvement.js'],behavior:['behaviorOfficialTemplate','./assets/word-behavior.js?v=6.10.45']};
 const pending=new Map();
 return function(kind){
  const item=paths[kind];
  if(!item)return Promise.reject(new Error('نوع قالب Word غير معروف.'));
  const [property,file]=item;
  if(SR63[property])return Promise.resolve();
  if(pending.has(kind))return pending.get(kind);
  const request=new Promise((resolve,reject)=>{
   if(typeof document==='undefined'||!document.head){reject(new Error('تعذر تحميل قالب Word في هذه البيئة.'));return;}
   const tag=document.createElement('script');tag.src=new URL(file,document.baseURI).href;tag.async=true;
   tag.onload=()=>SR63[property]?resolve():reject(new Error('لم يُحمّل محتوى قالب Word بصورة صحيحة.'));
   tag.onerror=()=>reject(new Error('تعذر تنزيل قالب Word، تحقق من الاتصال وحاول مرة أخرى.'));
   document.head.appendChild(tag);
  });
  pending.set(kind,request);
  request.catch(()=>pending.delete(kind));
  return request;
 };
})();
