/* Skill Center v2. Uses the pre-existing SchoolResult A4 report/PDF services. */
SR63.SkillCenter=function({workspace,setWorkspace=null,readOnly=false,canPrint=true,allowedSubjects=null,onSaved=null,expectedRevision=null}){
 const h=(tag,props,...children)=>(0,v.createElement)(tag,props,...children);
 const [wantedKind,setWantedKind]=(0,v.useState)(''),[exam,setExam]=(0,v.useState)(workspace?.activeExam||'exam1'),
  [chosenId,setChosenId]=(0,v.useState)(''),[grade,setGrade]=(0,v.useState)('الكل'),[className,setClass]=(0,v.useState)('الكل'),
  [report,setReport]=(0,v.useState)('school'),[wantedSkill,setWantedSkill]=(0,v.useState)(''),
  [wantedPrior,setWantedPrior]=(0,v.useState)(''),[threshold,setThreshold]=(0,v.useState)(''),
  [drafts,setDrafts]=(0,v.useState)({}),[configEdits,setConfigEdits]=(0,v.useState)({}),
  [addName,setAddName]=(0,v.useState)(''),[page,setPage]=(0,v.useState)(0),[reportPage,setReportPage]=(0,v.useState)(0),
  [loading,setLoading]=(0,v.useState)(false),[message,setMessage]=(0,v.useState)('');
 const kinds=['arabic','english'].filter(k=>!Array.isArray(allowedSubjects)||allowedSubjects.some(x=>SR63.skillKind(x)===k));
 const kind=kinds.includes(wantedKind)?wantedKind:(kinds[0]||'');
 const allowed=SR63.skillScoped(workspace?.skillsAssessments||[],allowedSubjects).filter(x=>SR63.skillKind(x.subject)===kind);
 const active=allowed.find(x=>x.id===chosenId)||allowed[0]||null;
 const settings=workspace?.settings||{},grades=[...new Set((active?.records||[]).map(x=>x.grade))].sort((a,b)=>Number(a)-Number(b));
 const classes=[...new Set((active?.records||[]).filter(r=>grade==='الكل'||r.grade===grade).map(x=>x.className))].sort((a,b)=>a.localeCompare(b,'ar',{numeric:true}));
 const chosenClass=classes.includes(className)?className:'الكل';
 const subset=(active?.records||[]).filter(r=>(grade==='الكل'||r.grade===grade)&&(chosenClass==='الكل'||r.className===chosenClass));
 const skill=active?.skills.find(s=>s.key===wantedSkill)||active?.skills[0]||null;
 const thresholdValue=threshold===''?Number(active?.passThreshold??50):Number(threshold);
 const pass=Number.isFinite(thresholdValue)&&thresholdValue>=0&&thresholdValue<=100?thresholdValue:50;
 const metrics=(0,v.useMemo)(()=>SR63.skillAggregate(active,subset,pass),[active,grade,chosenClass,pass]);
 const audit=(0,v.useMemo)(()=>SR63.skillAudit(active,workspace,allowedSubjects),[active,workspace,allowedSubjects]);
 const alerts=audit.filter(x=>['mismatch','maxMismatch'].includes(x.status));
 const pending=audit.filter(x=>['incomplete','noOfficial','unlinked'].includes(x.status));
 const otherTests=allowed.filter(x=>x.id!==active?.id&&x.exam!==active?.exam&&String(x.academicYear||'')===String(active?.academicYear||''));
 const prior=otherTests.find(x=>x.id===wantedPrior)||otherTests[0]||null;
 const reportModel=(0,v.useMemo)(()=>SR63.skillReports(active,workspace,{type:report,grade,className:chosenClass,skillKey:skill?.key||'',threshold:pass,older:prior,departments:allowedSubjects}),[active,workspace,report,grade,chosenClass,skill?.key,pass,prior,allowedSubjects]);
 const editor=!readOnly&&(typeof setWorkspace==='function'||typeof onSaved==='function');
 const scoreFmt=n=>Number.isFinite(n)?String(Math.round(n*100)/100):'—';
 const percent=n=>Number.isFinite(n)?scoreFmt(n)+'%':'—';
 const typeName=kind==='english'?'اللغة الإنجليزية':'اللغة العربية';
 const control=(name,value,onChange,opts)=>h('label',{className:'srskill-field'},h('span',{},name),h('select',{value,onChange:e=>onChange(e.target.value)},opts.map(([k,v])=>h('option',{key:k,value:k},v))));
 const btn=(label,fn,disabled=false)=>h('button',{type:'button',disabled:loading||disabled,onClick:fn},label);
 const reset=()=>{setGrade('الكل');setClass('الكل');setDrafts({});setConfigEdits({});setThreshold('');setPage(0);setReportPage(0);};
 async function persist(candidate,{safety=false}={}){
  if(!editor)throw Error('تعديل المهارات غير مصرح به لهذا الحساب.');
  const validated=SR63.skillSafeAssessment(candidate,workspace,allowedSubjects);
  if(typeof setWorkspace==='function'){
   if(safety&&typeof Kj==='function'&&!await Kj(workspace,'قبل تعديل سجلات المهارات'))throw Error('تعذّر إنشاء نقطة حماية قبل تغيير البيانات.');
   const others=(workspace.skillsAssessments||[]).filter(x=>x.id!==validated.id);
   setWorkspace(SR63.validate({...workspace,skillsAssessments:[...others,validated]}).workspace);
  }else{
   if(!Number.isSafeInteger(expectedRevision))throw Error('نسخة بيانات المنسق غير صالحة؛ حدّث الصفحة.');
   await SR63.staff.call({action:'save_skills',assessment:validated,expectedRevision});
   await onSaved();
  }
  setChosenId(validated.id);setDrafts({});setConfigEdits({});
 }
 const task=(action,success)=>{
  setLoading(true);setMessage('جارٍ التحقق من البيانات والحفظ…');
  Promise.resolve().then(action).then(()=>setMessage(success)).catch(e=>setMessage('تعذّر الإجراء: '+(e?.message||e))).finally(()=>setLoading(false));
 };
 const create=()=>task(async()=>{
  const fresh=SR63.skillCreate(workspace,kind,exam,allowedSubjects);
  if(allowed.some(x=>x.id===fresh.id))throw Error('تحليل هذا الاختبار موجود بالفعل؛ اختره من القائمة.');
  await persist(fresh);reset();
 },'تم إنشاء جدول المهارات من طلاب المادة. حدّد الدرجة العظمى لكل مهارة.');
 const importFile=file=>{if(!file)return;
  task(async()=>{
   if(!/\.xlsx?$/i.test(file.name)||file.size>15*1024*1024)throw Error('اختر ملف Excel لا يزيد عن 15 ميجابايت.');
   const contents=await file.arrayBuffer();let next;
   if(kind==='arabic'&&hv(contents,{type:'array'}).SheetNames.some(name=>['السابع','الثامن','التاسع'].includes(String(name).trim()))){
    next=SR63.skillParseWorkbook(contents,file.name,exam,'arabic');
    const saved=allowed.find(x=>x.id===next.id);
    if(saved){next.skills=next.skills.map(s=>({...s,max:saved.skills.find(x=>x.key===s.key)?.max??null}));next.passThreshold=saved.passThreshold??50;}
   }else{
    const template=allowed.find(x=>x.exam===exam)||SR63.skillCreate(workspace,kind,exam,allowedSubjects);
    next=SR63.skillParseGeneric(contents,file.name,template);
   }
   if(allowed.some(x=>x.id===next.id)&&!window.confirm('سيتم تحديث درجات مهارات هذا الاختبار. هل تريد المتابعة بعد المراجعة؟'))throw Error('تم إلغاء الاستيراد.');
   await persist(next,{safety:true});reset();
  },'اكتمل استيراد الملف ومطابقة الطلاب. راجع تقرير الفروق مع الدرجات الرسمية.');
 };
 const saveGrades=()=>task(async()=>{
  if(!active)throw Error('اختر اختبارًا محفوظًا أولًا.');
  if(!Object.keys(drafts).length)throw Error('لا توجد درجات جديدة.');
  const records=active.records.map(r=>{
   const marks={...r.marks};for(const s of active.skills){const key=r.id+'|'+r.className+'|'+s.key;
    if(!Object.prototype.hasOwnProperty.call(drafts,key))continue;
    const n=SR63.skillSafeNumber(drafts[key]);if(n!==null&&Number.isFinite(s.max)&&n>s.max)throw Error('درجة '+r.name+' في '+s.label+' تتجاوز الحد الأقصى.');
    marks[s.key]=n;
   }return {...r,marks};
  });
  await persist({...active,records,importedAt:new Date().toISOString()});
 },'حُفظت درجات المهارات دون تعديل نتائج الاختبارات الرسمية.');
 const saveConfig=()=>task(async()=>{
  if(!active)throw Error('اختر تحليلًا محفوظًا أولًا.');
  const skills=active.skills.map(s=>{
   const changed=configEdits[s.key]||{},label=String(changed.label??s.label).trim();
   const maximum=SR63.skillSafeNumber(changed.max===undefined?s.max:changed.max);
   if(!label||label.length>85||maximum!==null&&maximum<=0)throw Error('اسم المهارة أو درجتها العظمى غير صالح.');
   const largest=Math.max(0,...active.records.map(r=>Number(r.marks[s.key])||0));
   if(maximum!==null&&maximum<largest)throw Error('الحد الأقصى لمهارة '+label+' أقل من درجة طالب مرصودة.');
   return {...s,label,max:maximum};
  });
  if(threshold!==''&&(!Number.isFinite(Number(threshold))||Number(threshold)<0||Number(threshold)>100))throw Error('حد التعثر يجب أن يقع بين 0 و100.');
  await persist({...active,skills,passThreshold:pass});
 },'حُفظت المهارات والدرجات القصوى وحد التعثر لهذا الاختبار فقط.');
 const addSkill=()=>task(async()=>{
  if(!active)throw Error('أنشئ اختبار مهارات أولًا.');
  const label=addName.trim();if(!label||label.length>85||active.skills.some(s=>s.label===label))throw Error('اسم المهارة غير صالح أو مستخدم.');
  if(active.skills.length>=12)throw Error('الحد الأقصى 12 مهارة.');
  const key='custom_'+Math.random().toString(36).slice(2,11);
  await persist({...active,skills:[...active.skills,{key,label,max:null}],records:active.records.map(r=>({...r,marks:{...r.marks,[key]:null}}))});
  setAddName('');
 },'تمت إضافة المهارة. حدّد الدرجة العظمى لها.');
 const deleteSkill=target=>task(async()=>{
  if(!active||active.skills.length<=1)throw Error('لا يمكن حذف المهارة الوحيدة.');
  if(active.records.some(r=>r.marks[target]!==null&&r.marks[target]!==undefined))throw Error('لا يمكن حذف مهارة لديها درجات؛ حفاظًا على السجل التاريخي.');
  if(!window.confirm('حذف المهارة الفارغة من هذا الاختبار فقط؟'))throw Error('أُلغي الحذف.');
  await persist({...active,skills:active.skills.filter(s=>s.key!==target),records:active.records.map(r=>{const marks={...r.marks};delete marks[target];return {...r,marks};})});
 },'حُذفت المهارة الفارغة من الاختبار الحالي.');
 const csvTemplate=()=>{
  if(!active)return;
  SR63.skillCsv([['الرقم الأكاديمي','اسم الطالب','الشعبة',...active.skills.map(s=>s.label)],
   ...active.records.map(r=>[r.id,r.name,r.className,...active.skills.map(s=>r.marks[s.key]??'')])],
   'نموذج درجات مهارات '+active.subject);
  setMessage('تم تنزيل نموذج CSV يفتح في Excel. بعد تعبئته، احفظه بصيغة XLSX ثم ارفعه.');
 };
 const csvReport=()=>{
  if(!active)return;
  const auditMap=new Map(audit.map(x=>[x.id+'|'+x.className,x]));
  SR63.skillCsv([['الرقم الأكاديمي','الاسم','الشعبة',...active.skills.map(s=>s.label),'مجموع المهارات','الدرجة الرسمية','الفرق','الحالة'],
   ...subset.map(r=>{const a=auditMap.get(r.id+'|'+r.className);return [r.id,r.name,r.className,...active.skills.map(s=>r.marks[s.key]??''),a?.total??'',a?.officialScore??'',a?.difference??'',a?.status??''];})],
   'تقرير درجات مهارات '+active.subject);
 };
 const print=async()=>{
  if(!canPrint)return;let win=null;try{
   if(!reportModel.pages.length||reportModel.pages.length>200)throw Error('اختر تقريرًا يحتوي من 1 إلى 200 صفحة.');
   win=window.open('','_blank');if(!win)throw Error('اسمح بالنوافذ المنبثقة للمعاينة.');
   setLoading(true);setMessage('جارٍ تجهيز معاينة الطباعة…');
   await SR63.printReportBatch(reportModel.pages,'تحليل مهارات '+active.subject,true,win);
   setMessage('اكتملت المعاينة.');
  }catch(e){try{win?.close();}catch{}setMessage('تعذرت المعاينة: '+(e?.message||e));}finally{setLoading(false);}
 };
 const pdf=async()=>{
  if(!canPrint)return;let stage=null;try{
   if(!reportModel.pages.length||reportModel.pages.length>200)throw Error('اختر تقريرًا يحتوي من 1 إلى 200 صفحة.');
   setLoading(true);setMessage('جارٍ تصدير PDF…');
   const css=await SR63.getReportStyleText();stage=document.createElement('div');
   stage.className='srskill-export-stage';stage.style.cssText='position:fixed;left:-24000px;top:0;width:297mm;z-index:-1;pointer-events:none';
   document.body.appendChild(stage);const images=[];
   for(const html of reportModel.pages){stage.innerHTML=html;await (document.fonts?.ready||Promise.resolve());
    images.push(await SR63.reportPageJPEG(stage.querySelector('.skill-report-page'),css,true));}
   SR63.downloadReportFile(SR63.reportPdfFromJpegs(images),SR63.safeReportFilename('تحليل مهارات '+active.subject)+'.pdf');
   setMessage('اكتمل تصدير ملف PDF.');
  }catch(e){setMessage('تعذر تصدير PDF: '+(e?.message||e));}finally{stage?.remove();setLoading(false);}
 };
 const zipByClass=async()=>{
  if(!canPrint||!active)return;
  let stage=null;try{
   const allClasses=[...new Set(subset.map(r=>r.className))];
   if(!allClasses.length||allClasses.length>32)throw Error('اختر صفًا لتقليل عدد الشعب إلى 32 كحد أقصى.');
   setLoading(true);setMessage('جارٍ تجهيز ملفات PDF للشعب…');
   const css=await SR63.getReportStyleText(),outputs=[];
   stage=document.createElement('div');stage.className='srskill-export-stage';
   stage.style.cssText='position:fixed;left:-24000px;top:0;width:297mm;z-index:-1;pointer-events:none';
   document.body.appendChild(stage);
   for(const klass of allClasses){
    const prepared=SR63.skillReports(active,workspace,{type:report==='summary'?'students':report,grade:klass.split('/')[0],className:klass,
     skillKey:skill?.key||'',threshold:pass,older:prior,departments:allowedSubjects});
    const images=[];
    for(const html of prepared.pages){
     stage.innerHTML=html;await (document.fonts?.ready||Promise.resolve());
     images.push(await SR63.reportPageJPEG(stage.querySelector('.skill-report-page'),css,true));
    }
    if(images.length)outputs.push({name:SR63.safeReportFilename(active.subject+' - '+klass+'.pdf'),blob:SR63.reportPdfFromJpegs(images)});
   }
   if(!outputs.length)throw Error('لا توجد ملفات تقرير قابلة للتصدير.');
   SR63.downloadReportFile(await SR63.reportZipFromPdfs(outputs),SR63.safeReportFilename('تقارير المهارات حسب الشعب - '+active.subject)+'.zip');
   setMessage('اكتمل إنشاء ZIP يحتوي تقريرًا مستقلًا لكل شعبة.');
  }catch(e){setMessage('تعذر تصدير ZIP: '+(e?.message||e));}finally{stage?.remove();setLoading(false);}
 };
 const selectedRows=subset.slice(page*40,page*40+40),maxPage=Math.max(1,Math.ceil(subset.length/40));
 const currentReportPage=Math.min(reportPage,Math.max(0,reportModel.pages.length-1));
 const rowAudit=new Map(audit.map(x=>[x.id+'|'+x.className,x]));
 return h('main',{className:'srskill-center srskill-v2',dir:'rtl'},
  h('header',{className:'srskill-toolbar'},h('div',{},h('h2',{},'تحليل مهارات '+typeName),h('p',{},'الرصد التفصيلي، ومطابقة درجات الاختبار، وتقارير الصفوف والشعب والمتعثرين.'))),
  !kinds.length?h('p',{className:'srskill-warning'},'هذا الحساب ليس له قسم لغة عربية أو إنجليزية معتمد.'):null,
  kinds.length>1?h('section',{className:'srskill-controls'},control('المادة',kind,x=>{setWantedKind(x);setChosenId('');reset();},kinds.map(k=>[k,SR63.skillSubjects[k].label]))):null,
  editor?h('section',{className:'srskill-controls'},
   control('اختبار إعداد المهارات',exam,setExam,(settings.exams||[]).map(e=>[e.key,e.name])),
   btn('إنشاء تحليل من أسماء الطلاب',create,!kind),
   h('label',{className:'srskill-field'},h('span',{},'استيراد Excel (.xlsx)'),h('input',{type:'file',accept:'.xlsx,.xls',disabled:loading,onChange:e=>{const file=e.target.files?.[0];if(file)importFile(file);e.target.value='';}})),
   active?btn('تنزيل قالب للتعبئة في Excel',csvTemplate):null):null,
  h('section',{className:'srskill-controls'},
   control('التحليل المحفوظ',active?.id||'',x=>{setChosenId(x);reset();},allowed.length?allowed.map(a=>[a.id,((settings.exams||[]).find(e=>e.key===a.exam)?.name||a.exam)+' · '+(a.academicYear||'')]):[['','لا توجد اختبارات محفوظة']]),
   control('الصف',grade,x=>{setGrade(x);setClass('الكل');setPage(0);setReportPage(0);},[['الكل','كل الصفوف'],...grades.map(g=>[g,'الصف '+g])]),
   control('الشعبة',chosenClass,x=>{setClass(x);setPage(0);setReportPage(0);},[['الكل','كل الشعب'],...classes.map(c=>[c,c])])),
  active?h('section',{className:'srskill-metrics'},[
   ['الطلاب',metrics.students],['درجات مرصودة',metrics.observed],['غير مرصودة',metrics.missing],
   ['متوسط الإتقان',percent(metrics.achievement)],['اختلافات مع النتيجة',alerts.length],['رصد غير مكتمل',pending.length]
  ].map(([key,value])=>h('div',{key},h('span',{},key),h('strong',{},String(value))))):null,
  alerts.length?h('p',{className:'srskill-warning',role:'alert'},'يوجد '+alerts.length+' طالبًا لديهم اختلاف بين مجموع المهارات ودرجتهم الرسمية أو اختلاف في الدرجة العظمى. راجع تقرير المطابقة.'):null,
  active&&editor?h('section',{className:'srskill-panel'},h('h3',{},'إدارة المهارات والدرجات القصوى'),
   h('p',{},'يمكن تغيير أسماء المهارات ودرجاتها لهذا الاختبار دون تعديل بيانات الاختبارات السابقة.'),
   h('div',{className:'srskill-skill-grid'},active.skills.map(s=>h('div',{key:s.key,className:'srskill-skill-input'},
    h('input',{'aria-label':'اسم المهارة',value:configEdits[s.key]?.label??s.label,onChange:e=>setConfigEdits(p=>({...p,[s.key]:{...p[s.key],label:e.target.value}}))}),
    h('input',{'aria-label':'الدرجة القصوى',type:'number',min:0,step:0.5,placeholder:'الدرجة العظمى',value:configEdits[s.key]?.max??(s.max??''),onChange:e=>setConfigEdits(p=>({...p,[s.key]:{...p[s.key],max:e.target.value}}))}),
    btn('حذف',()=>deleteSkill(s.key),active.skills.length<=1)))),
   h('div',{className:'srskill-controls'},h('label',{className:'srskill-field'},h('span',{},'حد التعثر (%)'),h('input',{type:'number',min:0,max:100,step:1,value:threshold===''?String(active.passThreshold??50):threshold,onChange:e=>setThreshold(e.target.value)})),
    btn('حفظ إعدادات المهارات',saveConfig),h('label',{className:'srskill-field'},h('span',{},'إضافة مهارة جديدة'),h('input',{value:addName,onChange:e=>setAddName(e.target.value),placeholder:'اسم مهارة أخرى'})),
    btn('إضافة المهارة',addSkill,!addName.trim()))):null,
  active&&editor?h('section',{className:'srskill-panel'},h('h3',{},'رصد درجات الطلاب'),
   h('p',{},'اترك الخانة فارغة عند عدم الرصد؛ لا تُحسب صفرًا، ولا تُعدّل الدرجة الرسمية من هذه الشاشة.'),
   h('div',{className:'srskill-table-scroll'},h('table',{className:'srskill-table'},
    h('thead',{},h('tr',{},...['الرقم الأكاديمي','اسم الطالب','الشعبة',...active.skills.map(s=>s.label),'المجموع','الدرجة الرسمية','المطابقة'].map(t=>h('th',{key:t},t)))),
    h('tbody',{},selectedRows.map(r=>{
     const check=rowAudit.get(r.id+'|'+r.className);return h('tr',{key:r.id+'|'+r.className,className:check?.status==='mismatch'?'srskill-highlight':''},
      h('td',{},r.id),h('td',{},r.name),h('td',{},r.className),...active.skills.map(s=>{
       const key=r.id+'|'+r.className+'|'+s.key;
       return h('td',{key:s.key},h('input',{'aria-label':s.label+' '+r.name,type:'number',min:0,max:s.max??999,step:0.5,
        value:Object.prototype.hasOwnProperty.call(drafts,key)?drafts[key]:(r.marks?.[s.key]??''),onChange:e=>setDrafts(d=>({...d,[key]:e.target.value}))}));
      }),h('td',{},scoreFmt(check?.total)),h('td',{},scoreFmt(check?.officialScore)),h('td',{},check?.status==='matched'?'مطابق':
       check?.status==='mismatch'?'اختلاف':check?.status==='maxMismatch'?'اختلاف الدرجة العظمى':'بانتظار الرصد'));
    })))),h('div',{className:'srskill-actions'},btn('حفظ درجات المهارات',saveGrades,!Object.keys(drafts).length),
     btn('السابق',()=>setPage(x=>Math.max(0,x-1)),page===0),h('span',{},'صفحة '+(page+1)+' من '+maxPage),
     btn('التالي',()=>setPage(x=>x+1),page+1>=maxPage))):null,
  active?h('section',{className:'srskill-panel'},h('h3',{},'مؤشرات إتقان المهارات'),h('div',{className:'srskill-graphs'},metrics.skills.map(s=>h('article',{key:s.key},
   h('div',{},h('strong',{},s.label),h('span',{},percent(s.rate))),h('div',{className:'srskill-bar'},h('div',{style:{width:Math.max(0,Math.min(100,s.rate||0))+'%'}})),
   h('small',{},'مرصود: '+s.observed+' · متعثر: '+(s.mastered===null?'—':s.observed-s.mastered)))))):null,
  active?h('section',{className:'srskill-panel'},h('h3',{},'مركز تقارير تحليل المهارات'),h('div',{className:'srskill-controls'},
   control('نوع التقرير',report,x=>{setReport(x);setReportPage(0);},[
    ['school','التحليل العام للمدرسة أو الصف أو الشعبة'],['summary','تقرير ملخص الشعب'],['students','درجات مهارات الطلاب'],
    ['weak','الطلاب المتعثرون في مهارة'],['ranking','ترتيب المهارات'],['audit','اختلاف الدرجات الرسمية'],['comparison','مقارنة مهارة بين اختبارين']]),
   ['weak','comparison'].includes(report)?control('المهارة',skill?.key||'',setWantedSkill,active.skills.map(s=>[s.key,s.label])):null,
   report==='comparison'?control('الاختبار السابق',prior?.id||'',setWantedPrior,otherTests.length?otherTests.map(x=>[x.id,(settings.exams||[]).find(e=>e.key===x.exam)?.name||x.exam]):[['','لا توجد بيانات مقارنة']]):null),
   h('div',{className:'srskill-actions'},btn('معاينة وطباعة',()=>void print(),!canPrint||!reportModel.pages.length),
    btn('تنزيل PDF',()=>void pdf(),!canPrint||!reportModel.pages.length),btn('تقارير الشعب ZIP',()=>void zipByClass(),!canPrint||!reportModel.pages.length),btn('تصدير Excel (CSV)',csvReport,!canPrint),h('span',{},'عدد الصفحات: '+reportModel.pages.length)),
   report==='comparison'&&!prior?h('p',{},'يلزم وجود درجات مهارات محفوظة للاختبار السابق للمقارنة.'):null,
   reportModel.pages.length?h('section',{className:'srskill-preview'},
    h('div',{className:'srskill-preview-navigation'},btn('صفحة سابقة',()=>setReportPage(n=>Math.max(0,n-1)),currentReportPage===0),
     h('strong',{},'معاينة '+(currentReportPage+1)+' / '+reportModel.pages.length),
     btn('صفحة تالية',()=>setReportPage(n=>n+1),currentReportPage+1>=reportModel.pages.length)),
    h('div',{dangerouslySetInnerHTML:{__html:reportModel.pages[currentReportPage]}})):null):null,
  message?h('p',{role:'status',className:'srskill-status'},message):null,
  !active?h('section',{className:'srskill-empty'},editor?'أنشئ تحليلًا لطلاب هذه المادة أو استورد ملف المهارات.':'لا توجد بيانات مهارات محفوظة لهذه المادة.'):null
 );
};
