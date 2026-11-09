
/* Annual certificate is built from the previous /40 semester, second midterm,
   second final test, activity and (for science) practical. Raw final test controls attainment. */
SR63.yearGradeDefaults=function(){
 return SR63.termGradeDefaults().map(base=>({
  key:base.key,label:base.label,mode:base.mode,examRawTotal:50,
  examWeight:base.key===SR63.subjectAliasKey('العلوم')?35:40,
  practicalRawTotal:5,practicalWeight:base.key===SR63.subjectAliasKey('العلوم')?5:0,
  activityRawTotal:50,activityWeight:5,firstTermWeight:40,secondMidtermWeight:15,
  certificateTotal:100,activityLabel:base.activityLabel||'أنشطة الفصل الثاني',
  showFirstTerm:true,showMidterm:true,showActivity:false,
  showPractical:false
 }));
};
SR63.yearGradeConfig=function(settings){
 const stored=settings?.yearGradeRules||{};
 return {
  enabled:stored.enabled!==false,
  firstFinalExamKey:stored.firstFinalExamKey||SR63.termGradeConfig(settings).finalExamKey||'exam2',
  secondMidtermExamKey:stored.secondMidtermExamKey||'exam3',
  finalExamKey:stored.finalExamKey||'exam4',
  rounding:stored.rounding||SR63.termGradeConfig(settings).rounding||'ceil-half',
  subjects:stored.subjects||{}
 };
};
SR63.yearSubjectRule=function(settings,subject){
 const key=SR63.subjectAliasKey(subject),base=SR63.yearGradeDefaults().find(s=>s.key===key);
 return base?{...base,...(SR63.yearGradeConfig(settings).subjects[key]||{}),key}:null;
};
SR63.yearGradeBreakdown=function(row,exam,settings){
 const cfg=SR63.yearGradeConfig(settings),data=row?.termComponents?.[exam];
 if(!row||!cfg.enabled||exam!==cfg.finalExamKey||data?.source!=='year_end_final')return null;
 const rule=SR63.yearSubjectRule(settings,row.subject);
 if(!rule)return null;
 const round=cfg.rounding;
 const rawScore=data.originalExamPresent===false?null:row.statuses?.[exam]==='present'?row.scores?.[exam]:null;
 const rawTotal=rule.examRawTotal;
 const originalPercent=Number.isFinite(rawScore)&&rawScore>=0&&rawScore<=rawTotal?100*rawScore/rawTotal:null;
 const examPart=SR63.termConvert(rawScore,rawTotal,rule.examWeight,round);
 const firstRecord=row.termComponents?.[cfg.firstFinalExamKey];
 const firstDetails=yearFirstTermBreakdown(row,cfg.firstFinalExamKey,settings);
 const firstCertificate=SR63.certificateScore(row,cfg.firstFinalExamKey,settings);
 // Prefer the fully composed first-semester /40 certificate. If those rules are
 // disabled, accept the explicitly imported official /40 rather than the bare /50 exam.
 const storedOfficial=firstRecord?.source==='first_term_final'&&Number.isFinite(firstRecord.certificateOfficial)&&
  firstRecord.certificateOfficial>=0&&firstRecord.certificateOfficial<=40?firstRecord.certificateOfficial:null;
 const verifiedFirst=firstDetails?.certificateScore!==null&&Number.isFinite(firstDetails?.certificateScore)
  ?{score:firstDetails.certificateScore,total:firstDetails.certificateTotal}
  :storedOfficial!==null?{score:storedOfficial,total:40}
  :firstCertificate?.certificateTotal===40?{score:firstCertificate.certificateScore,total:40}:null;
 const firstTermPart=verifiedFirst?SR63.termConvert(verifiedFirst.score,verifiedFirst.total,rule.firstTermWeight,round):null;
 const midtermScore=row.statuses?.[cfg.secondMidtermExamKey]==='present'?row.scores?.[cfg.secondMidtermExamKey]:null;
 const midtermTotal=Number(row.totals?.[cfg.secondMidtermExamKey]??settings?.exams?.find(x=>x.key===cfg.secondMidtermExamKey)?.total??15);
 const midOfficial=row.termComponents?.[cfg.secondMidtermExamKey]?.source==='midterm_certificate'?row.termComponents[cfg.secondMidtermExamKey].certificateOfficial:null;
  const midtermPart=Number.isFinite(midOfficial)&&midOfficial>=0&&midOfficial<=15?SR63.termConvert(midOfficial,15,rule.secondMidtermWeight,round):SR63.termConvert(midtermScore,midtermTotal,rule.secondMidtermWeight,round);
 const activityPart=rule.activityWeight>0?SR63.termConvert(data.activityRaw,rule.activityRawTotal,rule.activityWeight,round):0;
 const practicalPart=rule.practicalWeight>0?SR63.termConvert(data.practicalRaw,rule.practicalRawTotal,rule.practicalWeight,round):0;
 const pieces=[firstTermPart,midtermPart,examPart,activityPart,practicalPart];
 const complete=rule.mode==='composite'&&pieces.every(Number.isFinite);
 const calculated=complete?Number(pieces.reduce((a,b)=>a+b,0).toFixed(6)):null;
 const firstAndMid=Number.isFinite(firstTermPart)&&Number.isFinite(midtermPart);
 const officialSecond=Number.isFinite(data.secondTermOfficial)&&data.secondTermOfficial>=0&&
  data.secondTermOfficial<=rule.examWeight+rule.activityWeight+rule.practicalWeight?
  data.secondTermOfficial:null;
 const officialAnnual=Number.isFinite(data.certificateOfficial)&&data.certificateOfficial>=0&&
  data.certificateOfficial<=rule.certificateTotal?data.certificateOfficial:null;
 // For directly supplied second-semester /45, combine with recorded /40 + /15.
 const officialBuilt=firstAndMid&&officialSecond!==null?
  Number((firstTermPart+midtermPart+officialSecond).toFixed(6)):null;
 const official=officialAnnual??officialBuilt;
 const certificateScore=calculated??official;
 const earnedSecond=pieces.slice(2).every(Number.isFinite)?Number(pieces.slice(2).reduce((a,b)=>a+b,0).toFixed(6)):null;
 const officialSecondDiscrepancy=earnedSecond!==null&&officialSecond!==null&&Math.abs(earnedSecond-officialSecond)>.01;
 const discrepancy=calculated!==null&&official!==null&&Math.abs(calculated-official)>.01||officialSecondDiscrepancy;
 return {
  rule,rawScore,rawTotal,originalPercent,originalExamPresent:data.originalExamPresent!==false,
  firstTermPart,firstTermTotal:rule.firstTermWeight,midtermPart,examPart,activityPart,practicalPart,
  calculated,official,officialAnnual,officialSecond,earnedSecond,officialBuilt,
  certificateScore,certificateTotal:rule.certificateTotal,
  certificatePercent:certificateScore===null?null:100*certificateScore/rule.certificateTotal,
  pending:calculated===null,officialUsed:calculated===null&&official!==null,discrepancy,
  missing:[['نهاية الفصل الأول',firstTermPart],['منتصف الفصل الثاني',midtermPart],['الاختبار النهائي',examPart],
    ...(rule.activityWeight>0?[['أنشطة الفصل الثاني',activityPart]]:[]),
    ...(rule.practicalWeight>0?[['العملي',practicalPart]]:[])].filter(([,v])=>v===null).map(([name])=>name)
 };
};
const yearFirstTermBreakdown=SR63.termGradeBreakdown;
SR63.termGradeBreakdown=function(row,exam,settings){
 return SR63.yearGradeBreakdown(row,exam,settings)??yearFirstTermBreakdown(row,exam,settings);
};
const yearFirstTermPrintColumns=SR63.termPrintColumns;
SR63.termPrintColumns=function(settings,exam,subjects=[]){
 const cfg=SR63.yearGradeConfig(settings);
 if(!cfg.enabled||exam!==cfg.finalExamKey)return yearFirstTermPrintColumns(settings,exam,subjects);
 const rules=(subjects.length?subjects:SR63.yearGradeDefaults().map(r=>r.label)).map(s=>SR63.yearSubjectRule(settings,s)).filter(Boolean);
 return {
  exam:true,firstFinal:rules.some(r=>r.showFirstTerm),
  midterm:rules.some(r=>r.showMidterm),activity:rules.some(r=>r.showActivity&&r.activityWeight>0),
  practical:rules.some(r=>r.showPractical&&r.practicalWeight>0)
 };
};
SR63.yearAttachWorkbookPreview=function(sheets,book,fileName,settings){
 const cfg=SR63.yearGradeConfig(settings);
 for(const sheet of sheets){
  const worksheet=book.Sheets[sheet.sheet||sheet.sourceSheet];
  if(!worksheet||!sheet.rows?.length)continue;
  const matrix=Gv.sheet_to_json(worksheet,{header:1,raw:true,defval:null,blankrows:true});
  const headers=(matrix[sheet.headerRow-1]||[]).map(C9);
  const col=(...names)=>headers.findIndex(v=>names.some(n=>ij(v)===ij(n)));
  const fileTitle=matrix.slice(0,3).flat().map(x=>String(x||'')).join(' ');
  const fullCol=col('نهاية العام','المجموع السنوي','المجموع النهائي','الدرجة النهائية','مجموع نهاية العام');
  const semesterCol=col('نهاية الفصل الثاني','نهاية الفصل الدراسي الثاني');
  const hasYear=/(نهاية\s*الفصل\s*(?:الدراسي\s*)?الثاني|نهاية\s*العام|نهاية\s*السنة|الاختبار\s*الرابع)/.test(fileTitle)||
    (semesterCol>=0||fullCol>=0);
  if(!hasYear||sheet.termFinal)continue;
  const rule=SR63.yearSubjectRule(settings,sheet.subject||sheet.sheet);
  if(!rule)continue;
  const sci=col('الاختبار النظري','الاختبار التحريري');
  const examCol=sci>=0?sci:col('التقييم الرئيسي','الاختبار النهائي','اختبار نهاية العام');
  const scoreCol=examCol>=0?examCol:(fullCol>=0?fullCol:semesterCol);
  if(scoreCol<0)continue;
  sheet.exam=cfg.finalExamKey;sheet.period='نهاية العام';sheet.yearFinal=true;
  sheet.selectedScoreKey=String(scoreCol);
  let primary=sheet.scoreColumns.find(x=>x.index===scoreCol);
  if(!primary){primary={index:scoreCol,key:String(scoreCol),header:headers[scoreCol],numericCount:0,statusCount:0};sheet.scoreColumns.push(primary);}
  Object.assign(primary,{suggestedTotal:examCol>=0?rule.examRawTotal:fullCol===scoreCol?rule.certificateTotal:rule.examWeight+rule.practicalWeight+rule.activityWeight,totalKnown:true});
  const activityCol=col('نشاط الطالب','أعمال الفصل','الأنشطة','أنشطة الفصل الثاني');
  const practicalCol=col('الاختبار العملي','العملي');
  for(const row of sheet.rows){
   const values=matrix[row.sourceRow-1]||[];
   const number=idx=>idx<0?null:T9(values[idx]);
   if(!row.values[String(scoreCol)]){
    const score=number(scoreCol),status=E9(values[scoreCol],score!==null,settings);
    row.values[String(scoreCol)]={score,status:status.status,recognized:status.recognized,raw:C9(values[scoreCol])};
   }
   row.termComponents={
    source:'year_end_final',originalExamPresent:examCol>=0,
    activityRaw:number(activityCol),practicalRaw:number(practicalCol),
    certificateOfficial:number(fullCol),secondTermOfficial:number(semesterCol)
   };
   for(const [label,value,max] of [
    ['النشاط',row.termComponents.activityRaw,rule.activityRawTotal],
    ['العملي',row.termComponents.practicalRaw,rule.practicalRawTotal],
    ['درجة نهاية العام',row.termComponents.certificateOfficial,rule.certificateTotal],
    ['مجموع الفصل الثاني',row.termComponents.secondTermOfficial,rule.examWeight+rule.activityWeight+rule.practicalWeight]
   ]){
    if(value!==null&&(value<0||value>max))
     sheet.issues.push({severity:'error',row:row.sourceRow,sheet:sheet.sheet,message:'درجة '+label+' خارج المدى المسموح 0 إلى '+max});
   }
  }
 }
};
SR63.YearGradeSettings=function({settings,onChange}){
 const h=v.createElement,cfg=SR63.yearGradeConfig(settings);
 const rules=SR63.yearGradeDefaults().map(x=>SR63.yearSubjectRule(settings,x.key));
 const update=patch=>onChange({yearGradeRules:{...cfg,...patch}});
 const updateRule=(key,patch)=>update({subjects:{...cfg.subjects,[key]:{...(cfg.subjects[key]||{}),...patch}}});
 const examOptions=(settings.exams||[]).map(e=>h('option',{value:e.key,key:e.key},e.name));
 const examSelect=(label,value,callback)=>h('label',{},label,h('select',{value,onChange:e=>callback(e.target.value)},...examOptions));
 const num=(label,value,fn)=>h('label',{className:'sr-term-field'},h('span',{},label),h('input',{
  type:'number',min:0,max:200,step:.5,value:String(value),onChange:e=>{
   if(e.target.value==='')return;
   const value=Number(e.target.value);if(Number.isFinite(value)&&value>=0)fn(value);
  }}));
 const toggle=(label,value,fn)=>h('label',{className:'sr-term-toggle'},h('input',{
  type:'checkbox',checked:!!value,onChange:e=>fn(e.target.checked)}),label);
 return h('section',{className:'sr-term-settings sr-year-settings'},
  h('header',{},h('h2',{},'توزيع درجة شهادة نهاية العام من 100'),
   h('p',{},'تعتمد شهادة نهاية العام على شهادة نهاية الفصل الأول من 40، ومنتصف الفصل الثاني من 15، ودرجات الاختبار الرابع والأنشطة والعملي. التحصيل يُحسب من الاختبار الرابع الأصلي فقط. لا يُضاعف نشاط الفصل الأول، لأنه داخل درجته المعتمدة من 40.')),
  h('div',{className:'sr-term-general'},
   toggle('تفعيل نظام شهادة نهاية العام',cfg.enabled,v=>update({enabled:v})),
   examSelect('نتيجة نهاية الفصل الأول (من 40)',cfg.firstFinalExamKey,v=>update({firstFinalExamKey:v})),
   examSelect('منتصف الفصل الثاني (من 15)',cfg.secondMidtermExamKey,v=>update({secondMidtermExamKey:v})),
   examSelect('اختبار نهاية العام (الرابع)',cfg.finalExamKey,v=>update({finalExamKey:v})),
   h('label',{},'جبر درجات المكونات',h('select',{value:cfg.rounding,onChange:e=>update({rounding:e.target.value})},
    h('option',{value:'ceil-half'},'إلى أعلى نصف درجة'),h('option',{value:'nearest-half'},'إلى أقرب نصف درجة'),h('option',{value:'none'},'دون جبر'))
   )),
  ...rules.map(rule=>h('details',{key:rule.key,open:rule.key===SR63.subjectAliasKey('العلوم'),className:'sr-term-subject'},
   h('summary',{},rule.label+' — '+(rule.mode==='official'?'درجة شهادة رسمية':[
    rule.firstTermWeight,' + ',rule.secondMidtermWeight,' + ',rule.examWeight,' + ',rule.practicalWeight,' + ',rule.activityWeight,' = ',rule.certificateTotal].join(''))),
   h('div',{className:'sr-term-grid'},
    h('label',{},'طريقة الحساب',h('select',{value:rule.mode,onChange:e=>updateRule(rule.key,{mode:e.target.value})},
     h('option',{value:'composite'},'حساب المكونات'),h('option',{value:'official'},'الشهادة الرسمية'))),
    num('وزن نتيجة الفصل الأول',rule.firstTermWeight,v=>updateRule(rule.key,{firstTermWeight:v})),
    num('وزن منتصف الفصل الثاني',rule.secondMidtermWeight,v=>updateRule(rule.key,{secondMidtermWeight:v})),
    num('درجة الاختبار الرابع الأصلية',rule.examRawTotal,v=>updateRule(rule.key,{examRawTotal:v})),
    num('وزن الاختبار الرابع في الشهادة',rule.examWeight,v=>updateRule(rule.key,{examWeight:v})),
    num('درجة العملي الأصلية',rule.practicalRawTotal,v=>updateRule(rule.key,{practicalRawTotal:v})),
    num('وزن العملي',rule.practicalWeight,v=>updateRule(rule.key,{practicalWeight:v})),
    num('درجة النشاط الأصلية',rule.activityRawTotal,v=>updateRule(rule.key,{activityRawTotal:v})),
    num('وزن أنشطة الفصل الثاني',rule.activityWeight,v=>updateRule(rule.key,{activityWeight:v})),
    num('الدرجة النهائية للشهادة',rule.certificateTotal,v=>updateRule(rule.key,{certificateTotal:v})),
    h('label',{className:'sr-term-field'},h('span',{},'مسمى أنشطة الفصل الثاني'),h('input',{
     type:'text',maxLength:80,value:rule.activityLabel,onChange:e=>updateRule(rule.key,{activityLabel:e.target.value})})),
    toggle('إظهار نتيجة الفصل الأول',rule.showFirstTerm,v=>updateRule(rule.key,{showFirstTerm:v})),
    toggle('إظهار منتصف الفصل الثاني',rule.showMidterm,v=>updateRule(rule.key,{showMidterm:v})),
    toggle('إظهار أنشطة الفصل الثاني',rule.showActivity,v=>updateRule(rule.key,{showActivity:v})),
    toggle('إظهار العملي',rule.showPractical,v=>updateRule(rule.key,{showPractical:v}))
   ),
   h('p',{className:'sr-term-equation'},'مجموع الأوزان = '+
    (rule.firstTermWeight+rule.secondMidtermWeight+rule.examWeight+rule.practicalWeight+rule.activityWeight)+
    ' من '+rule.certificateTotal)
  )),
  h('p',{className:'sr-term-note'},'إذا نقصت درجة لازمة، لا تُختلق ولا تُحسب صفرًا. يمكن عرض الدرجة السنوية الرسمية المستوردة مع وسمها، ومراجعة أي اختلاف بين الرسمية والمحسوبة.')
 );
};
