/* SkillCenter v2: editable Arabic and English assessments, scoped reports and safeguards. */
SR63.SkillCenter=function({workspace,setWorkspace=null,readOnly=false,canPrint=true,allowedSubjects=null,onSaved=null,expectedRevision=null}){
 const h=(tag,props,...children)=>(0,v.createElement)(tag,props,...children);
 const [kindChoice,setKindChoice]=(0,v.useState)(''),[exam,setExam]=(0,v.useState)(workspace?.activeExam||'exam1');
 const [selectedId,setSelectedId]=(0,v.useState)(''),[grade,setGrade]=(0,v.useState)('الكل');
 const [cls,setClass]=(0,v.useState)('الكل'),[report,setReport]=(0,v.useState)('school');
 const [skillKey,setSkillKey]=(0,v.useState)(''),[olderId,setOlderId]=(0,v.useState)('');
 const [threshold,setThreshold]=(0,v.useState)(''),[changes,setChanges]=(0,v.useState)({});
 const [skillChanges,setSkillChanges]=(0,v.useState)({}),[newSkill,setNewSkill]=(0,v.useState)('');
 const [busy,setBusy]=(0,v.useState)(false),[notice,setNotice]=(0,v.useState)('');
 const [pageIndex,setPageIndex]=(0,v.useState)(0);
 const permitted=!readOnly&&(typeof setWorkspace==='function'||typeof onSaved==='function');
 const subjectKinds=['arabic','english'].filter(x=>!Array.isArray(allowedSubjects)||
  allowedSubjects.some(subject=>SR63.skillSubjectKind(subject)===x));
 const kind=subjectKinds.includes(kindChoice)?kindChoice:subjectKinds[0]||'';
 const available=SR63.skillScoped(workspace?.skillsAssessments||[],allowedSubjects)
  .filter(a=>SR63.skillSubjectKind(a.subject)===kind);
 const active=available.find(a=>a.id===selectedId)||available[0]||null;
 const grades=[...new Set((active?.records||[]).map(x=>x.grade||x.className.split('/')[0]))].sort((a,b)=>Number(a)-Number(b));
 const classes=[...new Set((active?.records||[]).filter(x=>grade==='الكل'||x.grade===grade).map(x=>x.className))]
  .sort((a,b)=>a.localeCompare(b,'ar',{numeric:true}));
 const chosenClass=classes.includes(cls)?cls:'الكل';
 const skill=active?.skills?.find(x=>x.key===skillKey)||active?.skills?.[0]||null;
 const pass=threshold!==''?Number(threshold):Number(active?.passThreshold??50);
 const passValue=Number.isFinite(pass)&&pass>=0&&pass<=100?pass:50;
 const filtered=(active?.records||[]).filter(r=>(grade==='الكل'||r.grade===grade)&&
  (chosenClass==='الكل'||r.className===chosenClass));
 const summary=SR63.skillAggregate(active,filtered,passValue);
 const comparisonSources=available.filter(a=>a.id!==active?.id&&a.exam!==active?.exam&&
  String(a.academicYear||'')===String(active?.academicYear||''));
 const older=comparisonSources.find(a=>a.id===olderId)||comparisonSources[0]||null;
 const reconciliation=SR63.skillReconciliation(active,workspace,allowedSubjects);
 const pendingCount=reconciliation.filter(r=>r.state==='incomplete'||r.state==='unrecorded'||r.state==='unlinked').length;
 const mismatches=reconciliation.filter(r=>r.state==='mismatch'||r.state==='maximum');
 const reportData=SR63.skillReportSelection({assessment:active,workspace,kind:report,grade,className:chosenClass,
  skillKey:skill?.key||'',threshold:passValue,older,allowedSubjects});
 const fmt=x=>Number.isFinite(x)?(Math.round(x*10)/10).toLocaleString('en-US',{maximumFractionDigits:1}):'—';
 const setStatus=message=>setNotice(String(message||''));
 const reset=()=>{setGrade('الكل');setClass('الكل');setPageIndex(0);setChanges({});setSkillChanges({});setThreshold('');setSkillKey('');setOlderId('');};
 async function persistAssessment(assessment,{backup=false}={}){
  if(!permitted)throw Error('ليس لديك تصريح بتعديل مهارات هذه المادة.');
  if(!subjectKinds.includes(SR63.skillSubjectKind(assessment.subject)))throw Error('المادة خارج صلاحية حسابك.');
  if(backup&&typeof setWorkspace==='function'&&typeof Kj==='function'&&
    !await Kj(workspace,'قبل تعديل درجات المهارات'))throw Error('تعذر إنشاء نسخة أمان قبل حفظ المهارات.');
  if(typeof setWorkspace==='function'){
   const other=(workspace.skillsAssessments||[]).filter(x=>x.id!==assessment.id);
   const next=SR63.validate({...workspace,skillsAssessments:[...other,assessment]}).workspace;
   setWorkspace(next);
  }else{
   if(!Number.isSafeInteger(expectedRevision))throw Error('تعذر تحديد نسخة البيانات الحالية، أعد تحميل صفحة القسم.');
   await SR63.staff.call({action:'save_skills',assessment,expectedRevision});
   await onSaved();
  }
  setSelectedId(assessment.id);
  setChanges({});setSkillChanges({});
 }
 async function saveTask(task,success){
  setBusy(true);setStatus('جارٍ التحقق والحفظ…');
  try{await task();setStatus(success);}
  catch(error){setStatus('تعذر الحفظ: '+(error?.message||String(error)));}
  finally{setBusy(false);}
 }
 const create=()=>void saveTask(async()=>{
  const candidate=SR63.skillNewAssessment(workspace,kind,exam,allowedSubjects);
  if(available.some(x=>x.id===candidate.id))throw Error('يوجد تحليل محفوظ لهذا الاختبار؛ اختره بدل إنشاء نسخة مكررة.');
  await persistAssessment(candidate);
  reset();
 },'تم إنشاء جدول المهارات بأسماء طلاب المادة المعتمدين. حدد الدرجات القصوى، ثم ابدأ الرصد.');
 const importExcel=async file=>{
  if(!file||!permitted)return;
  void saveTask(async()=>{
   if(!/\.xlsx?$/i.test(file.name)||file.size>15*1024*1024)throw Error('ملف Excel غير صالح أو يتجاوز 15 ميجابايت.');
   const buffer=await file.arrayBuffer();
   let candidate;
   if(kind==='arabic'){
    candidate=SR63.skillParseWorkbook(buffer,file.name,exam,'arabic');
    candidate.passThreshold=active?.passThreshold??50;
    // Restore maxima from an already configured analysis of the same examination.
    const prior=available.find(x=>x.id===candidate.id);
    if(prior)candidate.skills=candidate.skills.map(s=>({...s,max:prior.skills.find(x=>x.key===s.key)?.max??null}));
   }else{
    const base=active||SR63.skillNewAssessment(workspace,kind,exam,allowedSubjects);
    candidate=SR63.skillParseGenericWorkbook(buffer,file.name,base);
   }
   if(available.some(x=>x.id===candidate.id)&&!window.confirm('سيتم تحديث درجات هذا الاختبار. هل أكدت مراجعة نسخة الأمان والمطابقة؟'))throw Error('أُلغي التحديث.');
   await persistAssessment(candidate,{backup:true});reset();
  },'تم استيراد درجات المهارات. راجع تنبيهات المطابقة قبل اعتماد التقرير.');
 };
 function patchAssessment(edit){
  return {...active,...edit,importedAt:new Date().toISOString()};
 }
 const saveGrades=()=>void saveTask(async()=>{
  if(!active)throw Error('اختر اختبارًا أولًا.');
  if(!Object.keys(changes).length)throw Error('لم تدخل درجات جديدة.');
  const records=active.records.map(student=>{
   const marks={...student.marks};
   for(const def of active.skills){
    const key=student.id+'|'+student.className+'|'+def.key;
    if(!Object.prototype.hasOwnProperty.call(changes,key))continue;
    const number=SR63.skillSafeNumber(changes[key]);
    if(number!==null&&Number.isFinite(def.max)&&number>def.max)
     throw Error('درجة '+student.name+' في '+def.label+' تتجاوز الدرجة العظمى '+def.max);
    marks[def.key]=number;
   }
   return {...student,marks};
  });
  await persistAssessment(patchAssessment({records}));
 },'تم حفظ درجات المهارات. تظهر الاختلافات مع النتيجة الرسمية في لوحة المطابقة.');
 const saveConfig=()=>void saveTask(async()=>{
  if(!active)throw Error('اختر اختبارًا أولًا.');
  const skills=active.skills.map(s=>{
   const config=skillChanges[s.key]||{},label=String(config.label??s.label).trim(),
    max=SR63.skillSafeNumber(config.max===undefined?s.max:config.max);
   if(!label||label.length>85)throw Error('اسم المهارة غير صالح.');
   if(max!==null&&max<=0)throw Error('الدرجة العظمى يجب أن تكون أكبر من صفر.');
   const observed=Math.max(0,...active.records.map(r=>Number(r.marks?.[s.key])||0));
   if(max!==null&&observed>max)throw Error('الدرجة العظمى للمهارة '+label+' أقل من درجة مرصودة.');
   return {...s,label,max};
  });
  const newPass=Number(passValue);
  await persistAssessment(patchAssessment({skills,passThreshold:newPass}));
 },'تم حفظ أسماء المهارات ودرجاتها القصوى ونسبة التعثر.');
 const addSkill=()=>void saveTask(async()=>{
  if(!active)throw Error('أنشئ تحليلًا أو اختره أولًا.');
  const label=newSkill.trim();
  if(!label||label.length>85)throw Error('أدخل اسم مهارة صحيحًا.');
  if(active.skills.length>=12)throw Error('الحد الأقصى 12 مهارة لكل اختبار.');
  if(active.skills.some(s=>s.label===label))throw Error('اسم المهارة موجود بالفعل.');
  const key='custom_'+Math.random().toString(36).slice(2,11);
  await persistAssessment(patchAssessment({skills:[...active.skills,{key,label,max:null}],
   records:active.records.map(r=>({...r,marks:{...r.marks,[key]:null}}))}));
  setNewSkill('');
 },'أُضيفت المهارة الجديدة. حدد درجتها العظمى قبل إدخال النتائج.');
 const removeSkill=key=>void saveTask(async()=>{
  if(!active||active.skills.length<=1)throw Error('يجب الاحتفاظ بمهارة واحدة على الأقل.');
  if(active.records.some(r=>r.marks?.[key]!==null&&r.marks?.[key]!==undefined))
   throw Error('لا يمكن حذف مهارة توجد بها درجات مرصودة؛ احتفظ بها لضمان سلامة السجل.');
  if(!window.confirm('هل تريد حذف المهارة الفارغة من هذا الاختبار فقط؟'))throw Error('أُلغي الحذف.');
  const records=active.records.map(r=>{const marks={...r.marks};delete marks[key];return {...r,marks};});
  await persistAssessment(patchAssessment({skills:active.skills.filter(s=>s.key!==key),records}));
 },'حُذفت المهارة الفارغة من الاختبار الحالي.');
 const downloadTemplate=()=>{
  try{
   if(!active)throw Error('أنشئ اختبار مهارات أولًا.');
   SR63.skillDownloadCsv([['الرقم الأكاديمي','اسم الطالب','الشعبة',...active.skills.map(s=>s.label)],
    ...active.records.map(r=>[r.id,r.name,r.className,...active.skills.map(s=>r.marks?.[s.key]??'')])],
    'نموذج إدخال مهارات '+active.subject);
   setStatus('تم تنزيل نموذج CSV يمكن تعبئته في Excel ثم حفظه بصيغة Excel ورفعه.');
  }catch(error){setStatus(error.message);}
 };
 const downloadCSV=()=>{
  if(!active)return;
  const headers=['الرقم الأكاديمي','اسم الطالب','الشعبة',...active.skills.map(s=>s.label),
   'مجموع المهارات','الدرجة الرسمية','الفرق'];
  const byKey=new Map(reconciliation.map(x=>[x.id+'|'+x.className,x]));
  SR63.skillDownloadCsv([headers,...filtered.map(r=>{
   const check=byKey.get(r.id+'|'+r.className);
   return [r.id,r.name,r.className,...active.skills.map(s=>r.marks?.[s.key]??''),
    check?.total??'',check?.official??'',check?.delta??''];
  })],'تحليل مهارات '+active.subject);
 };
 const print=async()=>{
  let win=null;
  if(!canPrint)return;
  try{
   if(!reportData.pages.length||reportData.pages.length>200)throw Error('يجب أن يحتوي التقرير على 1 إلى 200 صفحة.');
   win=window.open('','_blank');if(!win)throw Error('اسمح بفتح نافذة الطباعة.');
   setBusy(true);setStatus('جارٍ تجهيز المعاينة…');
   await SR63.printReportBatch(reportData.pages,'تحليل مهارات '+active.subject,true,win);
   setStatus('تم تجهيز معاينة التقرير للطباعة.');
  }catch(error){if(win&&!win.closed)try{win.close();}catch{}setStatus(error.message);}
  finally{setBusy(false);}
 };
 const pdf=async()=>{
  if(!canPrint)return;
  let stage=null;
  try{
   if(!reportData.pages.length||reportData.pages.length>200)throw Error('اختر تقريرًا بعدد صفحات مناسب.');
   setBusy(true);setStatus('جارٍ إنشاء ملف PDF…');
   const css=await SR63.getReportStyleText(),images=[];
   stage=document.createElement('div');stage.className='srskill-export-stage';
   stage.style.cssText='position:fixed;left:-24000px;top:0;width:297mm;z-index:-1;pointer-events:none';
   document.body.appendChild(stage);
   for(const html of reportData.pages){
    stage.innerHTML=html;await (document.fonts?.ready||Promise.resolve());
    images.push(await SR63.reportPageJPEG(stage.querySelector('.skill-report-page'),css,true));
   }
   const blob=SR63.reportPdfFromJpegs(images);
   SR63.downloadReportFile(blob,SR63.safeReportFilename('تقرير مهارات '+active.subject)+'.pdf');
   setStatus('اكتمل تنزيل PDF.');
  }catch(error){setStatus('تعذر تصدير PDF: '+(error.message||error));}
  finally{stage?.remove();setBusy(false);}
 };
 const classStat=grades.length+' صفوف · '+classes.length+' شعب';
 const navLabel=kind==='english'?'اللغة الإنجليزية':'اللغة العربية';
 const helper=(label,node)=>h('label',{className:'srskill-input-label'},h('span',{},label),node);
 const select=(value,action,items)=>h('select',{value,onChange:e=>action(e.target.value)},items.map(([id,label])=>h('option',{key:id,value:id},label)));
 const button=(label,action,disabled=false)=>h('button',{type:'button',onClick:action,disabled:busy||disabled},label);
 const viewRows=filtered.slice(pageIndex*45,(pageIndex+1)*45);
 const extraNotice=mismatches.length?'هناك '+mismatches.length+' حالة اختلاف مع النتيجة الرسمية أو الدرجة العظمى؛ راجع تقرير المطابقة.':'';
 return h('main',{className:'srskill-center srskill-upgraded',dir:'rtl'},
  h('header',{className:'srskill-toolbar'},
   h('div',{},h('h2',{},'مركز تحليل مهارات '+navLabel),h('p',{},'رصد درجات المهارات ومقارنة الاختبارات وتقارير الصف والشعبة والمدرسة.'))),
  !subjectKinds.length?h('p',{role:'alert',className:'srstaff-alert'},'هذا الحساب ليس منسقًا للعربية أو الإنجليزية.'):null,
  subjectKinds.length>1?h('section',{className:'srskill-controls'},
   helper('المادة',select(kind,setKindChoice,subjectKinds.map(x=>[x,SR63.skillSubjects[x].label])))):null,
  h('section',{className:'srskill-controls'},
   permitted?helper('الاختبار المطلوب',select(exam,setExam,(workspace?.settings?.exams||[
    {key:'exam1',name:'الاختبار الأول'},{key:'exam2',name:'الاختبار الثاني'},
    {key:'exam3',name:'الاختبار الثالث'},{key:'exam4',name:'الاختبار الرابع'}
   ]).map(x=>[x.key,x.name]))):null,
   permitted?button('إنشاء جدول مهارات من بيانات الطلاب',create,!kind):null,
   permitted?helper('رفع درجات المهارات من Excel',h('input',{type:'file',accept:'.xlsx,.xls',disabled:busy||!kind,
    onChange:e=>{const f=e.target.files?.[0];if(f)void importExcel(f);e.target.value='';}})):null,
   active&&permitted?button('تنزيل نموذج لتعبئته في Excel',downloadTemplate):null),
  h('section',{className:'srskill-controls'},
   helper('التحليل المحفوظ',select(active?.id||'',x=>{setSelectedId(x);reset();},
    available.length?available.map(x=>[x.id,
     ((workspace?.settings?.exams||[]).find(t=>t.key===x.exam)?.name||x.exam)+' · '+(x.academicYear||'')]):[['','لا توجد اختبارات مهارات محفوظة']])),
   helper('الصف',select(grade,x=>{setGrade(x);setClass('الكل');setPageIndex(0);},
    [['الكل','جميع الصفوف'],...grades.map(x=>[x,'الصف '+x])])),
   helper('الشعبة',select(chosenClass,x=>{setClass(x);setPageIndex(0);},
    [['الكل','جميع الشعب'],...classes.map(x=>[x,x])]))),
  active?h('section',{className:'srskill-metrics'},[
   ['الطلاب',summary.students],['الصفوف والشعب',classStat],['درجات مرصودة',summary.observed],
   ['درجات غير مرصودة',summary.missing],['متوسط الإتقان',fmt(summary.achievement)+'%'],
   ['تنبيهات المطابقة',mismatches.length],['حالات تحتاج استكمال',pendingCount]
  ].map(([label,value])=>h('div',{key:label},h('span',{},label),h('strong',{},String(value))))):null,
  extraNotice?h('p',{className:'srskill-alert',role:'alert'},extraNotice):null,
  active&&permitted?h('section',{className:'srskill-editor'},
   h('h3',{},'إدارة المهارات — '+active.subject),
   h('p',{},'يمكنك تعديل اسم المهارة والدرجة العظمى؛ ولا يؤثر ذلك في الاختبارات السابقة.'),
   h('div',{className:'srskill-config-grid'},active.skills.map(s=>{
    const change=skillChanges[s.key]||{};
    return h('div',{key:s.key,className:'srskill-config-row'},
     h('input',{'aria-label':'اسم المهارة',value:change.label??s.label,
      onChange:e=>setSkillChanges(p=>({...p,[s.key]:{...p[s.key],label:e.target.value}}))}),
     h('input',{'aria-label':'الدرجة العظمى',type:'number',min:'0.1',step:'0.5',placeholder:'الدرجة القصوى',
      value:change.max===undefined?(s.max??''):change.max,
      onChange:e=>setSkillChanges(p=>({...p,[s.key]:{...p[s.key],max:e.target.value}}))}),
     button('حذف',()=>removeSkill(s.key),active.skills.length<=1));
   })),
   h('div',{className:'srskill-controls'},
    helper('نسبة التعثر %',h('input',{type:'number',min:0,max:100,step:1,value:threshold===''?String(active.passThreshold??50):threshold,
     onChange:e=>setThreshold(e.target.value)})),
    button('حفظ إعدادات المهارات',saveConfig),
    helper('اسم مهارة جديدة',h('input',{value:newSkill,placeholder:'إضافة مهارة أخرى',onChange:e=>setNewSkill(e.target.value)})),
    button('إضافة المهارة',addSkill,!newSkill.trim()))):null,
  active&&permitted?h('section',{className:'srskill-editor'},
   h('h3',{},'رصد درجات الطلاب وتعديلها'),
   h('p',{},'الخانة الفارغة لا تُحسب صفرًا. أدخل الدرجة ثم اضغط حفظ. الدرجة الرسمية للطالب لا تتغير هنا.'),
   h('div',{className:'srskill-scroll'},
    h('table',{className:'srskill-table'},h('thead',{},h('tr',{},
     ['الرقم الأكاديمي','اسم الطالب','الشعبة',...active.skills.map(s=>s.label),'المجموع','الدرجة الرسمية','الحالة'].map(x=>h('th',{key:x},x)))),
    h('tbody',{},viewRows.map(r=>{
     const check=reconciliation.find(x=>x.id===r.id&&x.className===r.className);
     return h('tr',{key:r.id+'|'+r.className,className:check?.state==='mismatch'?'srskill-discrepant':''},
      h('td',{},r.id),h('td',{},r.name),h('td',{},r.className),
      ...active.skills.map(s=>{
       const key=r.id+'|'+r.className+'|'+s.key;
       return h('td',{key:s.key},h('input',{'aria-label':s.label+' '+r.name,type:'number',min:0,max:s.max??999,
        step:'0.5',value:Object.prototype.hasOwnProperty.call(changes,key)?changes[key]:(r.marks?.[s.key]??''),
        onChange:e=>setChanges(p=>({...p,[key]:e.target.value}))}));
      }),h('td',{},fmt(check?.total)),h('td',{},fmt(check?.official)),
      h('td',{},check?.state==='mismatch'?'غير متطابق':check?.state==='maximum'?'اختلاف الدرجة العظمى':
       check?.state==='matched'?'متطابق': 'بانتظار الاستكمال'));
    })))),
   h('div',{className:'srskill-actions'},button('حفظ درجات المهارات',saveGrades,!Object.keys(changes).length),
    button('السابق',()=>setPageIndex(n=>Math.max(0,n-1)),pageIndex===0),
    h('span',{},'صفحة '+(pageIndex+1)+' من '+Math.max(1,Math.ceil(filtered.length/45))),
    button('التالي',()=>setPageIndex(n=>n+1),(pageIndex+1)*45>=filtered.length))):null,
  active?h('section',{className:'srskill-editor'},
   h('h3',{},'تحليل إتقان المهارات'),h('div',{className:'srskill-chart-grid'},summary.skills.map(s=>
    h('div',{key:s.key,className:'srskill-chart-item'},h('div',{},h('strong',{},s.label),h('span',{},fmt(s.rate)+'%')),
     h('div',{className:'srskill-chart-track'},h('div',{className:'srskill-chart-bar',style:{width:Math.min(100,Math.max(0,s.rate||0))+'%'}})),
     h('small',{},'المرصود: '+s.observed+' · المتعثرون: '+(s.mastered===null?'—':s.observed-s.mastered)))))):null,
  active?h('section',{className:'srskill-editor'},
   h('h3',{},'مركز تقارير تحليل المهارات'),
   h('div',{className:'srskill-controls'},
    helper('نوع التقرير',select(report,setReport,[
     ['school','التحليل العام على مستوى المدرسة أو الصف أو الشعبة'],
     ['summary','ملخص الشعب حسب الصف'],['students','كشف درجات مهارات الطلاب'],
     ['weak','الطلاب المتعثرون في مهارة معينة'],['ranking','ترتيب المهارات'],
     ['reconciliation','الاختلافات مع الدرجات الرسمية'],['comparison','مقارنة اختبارين للمهارة']])),
    ['weak','comparison'].includes(report)?helper('المهارة',select(skill?.key||'',setSkillKey,active.skills.map(s=>[s.key,s.label]))):null,
    report==='comparison'?helper('الاختبار السابق',select(older?.id||'',setOlderId,
     comparisonSources.length?comparisonSources.map(x=>[x.id,(workspace.settings.exams||[]).find(y=>y.key===x.exam)?.name||x.exam]):
     [['','لا يوجد اختبار آخر محفوظ']])):null),
   h('div',{className:'srskill-actions'},
    button('معاينة وطباعة التقرير',()=>void print(),!canPrint||!reportData.pages.length),
    button('تنزيل PDF',()=>void pdf(),!canPrint||!reportData.pages.length),
    button('تصدير الدرجات إلى Excel (CSV)',downloadCSV,!canPrint),
    h('span',{},'صفحات التقرير: '+reportData.pages.length)),
   report==='comparison'&&!older?h('p',{role:'status'},'المقارنة تحتاج اختبارين محفوظين لنفس المادة والسنة الدراسية.'):null,
   report==='weak'&&(!skill?.max)?h('p',{role:'status'},'حدد الدرجة العظمى للمهارة قبل تقرير المتعثرين.'):null,
   active&&reportData.pages.length?h('section',{className:'srskill-preview'},
    h('div',{className:'srskill-preview-navigation'},h('strong',{},'معاينة نموذج التقرير'),
     button('الصفحة السابقة',()=>setPageIndex(n=>Math.max(0,n-1)),pageIndex===0),
     button('الصفحة التالية',()=>setPageIndex(n=>n+1),pageIndex+1>=reportData.pages.length)),
    h('div',{dangerouslySetInnerHTML:{__html:reportData.pages[Math.min(pageIndex,reportData.pages.length-1)]}})):null):null,
  notice?h('p',{className:'srskill-status',role:'status'},notice):null,
  !active?h('section',{className:'srskill-empty'},
   permitted?'ابدأ بإنشاء جدول مهارات من بيانات الطلاب أو رفع نموذج اللغة العربية.':'لم تُحفظ بيانات مهارات هذه المادة بعد.'):null
 );
};
