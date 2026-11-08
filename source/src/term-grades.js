
/* First-term subject composition: raw exam analytics stay independent from /40. */
const termCatalog=[
 ['شرعية','التربية الإسلامية','composite',20,0],['عربي','اللغة العربية','composite',20,0],
 ['e','اللغة الإنجليزية','composite',20,0],['رياضيات','الرياضيات','composite',20,0],
 ['علوم','العلوم','composite',15,5],['اجتماعية','الدراسات الاجتماعية','composite',20,0],
 ['حاسب','الحوسبة وتكنولوجيا المعلومات','composite',20,0],['فنية','الفنون البصرية','composite',20,0],
 ['بدنية','التربية البدنية','official',20,0],['مهارات','المهارات الحياتية والمهنية','official',20,0]
];
SR63.termGradeDefaults=()=>termCatalog.map(([alias,label,mode,examWeight,practicalWeight])=>({
 key:SR63.subjectAliasKey(alias),label,mode,examRawTotal:50,examWeight,
 practicalRawTotal:5,practicalWeight,activityRawTotal:50,activityWeight:5,
 midtermWeight:15,certificateTotal:40,activityLabel:'أعمال الفصل',
 showMidterm:false,showActivity:false,showPractical:false
}));
SR63.termGradeConfig=settings=>({
 enabled:settings?.termGradeRules?.enabled!==false,
 finalExamKey:settings?.termGradeRules?.finalExamKey||'exam2',
 midtermExamKey:settings?.termGradeRules?.midtermExamKey||'exam1',
 rounding:settings?.termGradeRules?.rounding||'ceil-half',
 subjects:settings?.termGradeRules?.subjects||{}
});
SR63.termSubjectRule=function(settings,subject){
 const key=SR63.subjectAliasKey(subject),base=SR63.termGradeDefaults().find(x=>x.key===key);
 return base?{...base,...(SR63.termGradeConfig(settings).subjects[key]||{}),key}:null;
};
SR63.termConvert=function(value,max,weight,rounding='ceil-half'){
 if(typeof value!=='number'||!Number.isFinite(value)||value<0||!Number.isFinite(max)||max<=0||value>max||!Number.isFinite(weight)||weight<0)return null;
 if(weight===0)return 0;
 const exact=value/max*weight;
 const result=rounding==='none'?exact:rounding==='nearest-half'?Math.round(exact*2)/2:Math.ceil((exact-1e-10)*2)/2;
 return Math.max(0,Math.min(weight,Number(result.toFixed(6))));
};
SR63.termGradeBreakdown=function(row,exam,settings){
 const cfg=SR63.termGradeConfig(settings),extra=row?.termComponents?.[exam];
 if(!row||!cfg.enabled||exam!==cfg.finalExamKey||extra?.source!=='first_term_final')return null;
 const rule=SR63.termSubjectRule(settings,row.subject);if(!rule)return null;
 const rawScore=row.statuses?.[exam]==='present'?row.scores?.[exam]:null;
 const rawTotal=Number(rule.examRawTotal);
 const examPart=SR63.termConvert(rawScore,rawTotal,rule.examWeight,cfg.rounding);
 const midScore=row.statuses?.[cfg.midtermExamKey]==='present'?row.scores?.[cfg.midtermExamKey]:null;
 const midTotal=Number(row.totals?.[cfg.midtermExamKey]??settings?.exams?.find(e=>e.key===cfg.midtermExamKey)?.total??15);
 const midtermPart=SR63.termConvert(midScore,midTotal,rule.midtermWeight,cfg.rounding);
 const activityPart=rule.activityWeight>0?SR63.termConvert(extra.activityRaw,rule.activityRawTotal,rule.activityWeight,cfg.rounding):0;
 const practicalPart=rule.practicalWeight>0?SR63.termConvert(extra.practicalRaw,rule.practicalRawTotal,rule.practicalWeight,cfg.rounding):0;
 const parts=[examPart,midtermPart,activityPart,practicalPart];
 const complete=rule.mode==='composite'&&parts.every(Number.isFinite);
 const calculated=complete?Number(parts.reduce((sum,n)=>sum+n,0).toFixed(6)):null;
 const official=typeof extra.certificateOfficial==='number'&&Number.isFinite(extra.certificateOfficial)&&extra.certificateOfficial>=0&&extra.certificateOfficial<=rule.certificateTotal?extra.certificateOfficial:null;
 const certificateScore=calculated??official;
 const originalPercent=typeof rawScore==='number'&&rawScore>=0&&rawScore<=rawTotal&&rawTotal>0?100*rawScore/rawTotal:null;
 return {rule,rawScore,rawTotal,originalPercent,examPart,midtermPart,activityPart,practicalPart,
  calculated,official,certificateScore,certificateTotal:rule.certificateTotal,
  certificatePercent:certificateScore===null?null:100*certificateScore/rule.certificateTotal,
  pending:calculated===null,officialUsed:calculated===null&&official!==null,
  discrepancy:calculated!==null&&official!==null&&Math.abs(calculated-official)>0.01,
  missing:[['الاختبار',examPart],['منتصف الفصل',midtermPart],...(rule.activityWeight>0?[['الأنشطة',activityPart]]:[]),...(rule.practicalWeight>0?[['العملي',practicalPart]]:[])].filter(([,v])=>v===null).map(([name])=>name)
 };
};
const termPreviousCertificateScore=SR63.certificateScore;
SR63.certificateScore=function(row,exam,settings){
 const term=SR63.termGradeBreakdown(row,exam,settings);
 if(!term)return termPreviousCertificateScore(row,exam,settings);
 return term.certificateScore===null?null:{...term,enabled:true,passed:term.originalPercent!==null&&term.originalPercent>=Number(settings?.pass??50)};
};
const termPreviousCertificatePercentage=SR63.certificatePercentage;
SR63.certificatePercentage=function(row,exam,settings){
 const term=SR63.termGradeBreakdown(row,exam,settings);
 return term?term.originalPercent:termPreviousCertificatePercentage(row,exam,settings);
};
SR63.termMetricRaw=(row,exam,settings)=>SR63.termGradeBreakdown(row,exam,settings)!==null;
SR63.termMetricPercentage=(row,exam,settings)=>SR63.certificatePercentage(row,exam,settings);
SR63.termPrintColumns=(settings,exam,subjects=[])=>{
 const cfg=SR63.termGradeConfig(settings);
 if(!cfg.enabled||exam!==cfg.finalExamKey)return {exam:false,midterm:false,activity:false,practical:false};
 const rules=(subjects.length?subjects:SR63.termGradeDefaults().map(x=>x.label)).map(s=>SR63.termSubjectRule(settings,s)).filter(Boolean);
 return {exam:true,midterm:rules.some(r=>r.showMidterm),activity:rules.some(r=>r.showActivity),practical:rules.some(r=>r.showPractical&&r.practicalWeight>0)};
};
SR63.termAttachWorkbookPreview=function(sheets,book,fileName,settings){
 const finalKey=SR63.termGradeConfig(settings).finalExamKey;
 for(const sheet of sheets){
  const worksheet=book.Sheets[sheet.sheet||sheet.sourceSheet];if(!worksheet||!sheet.rows?.length)continue;
  const matrix=Gv.sheet_to_json(worksheet,{header:1,raw:true,defval:null,blankrows:true});
  const headers=(matrix[sheet.headerRow-1]||[]).map(C9);
  const col=name=>headers.findIndex(x=>ij(x)===ij(name));
  const sci=col('الاختبار النظري'),examCol=sci>=0?sci:col('التقييم الرئيسي'),officialCol=col('نهاية الفصل الأول');
  const hasFinal=matrix.slice(0,3).some(row=>row.some(x=>/الفترة\s*:\s*نهاية الفصل الأول/.test(String(x||''))))||officialCol>=0;
  if(!hasFinal||examCol<0)continue;
  const rule=SR63.termSubjectRule(settings,sheet.subject||sheet.sheet);if(!rule)continue;
  sheet.exam=finalKey;sheet.period='نهاية الفصل الأول';sheet.termFinal=true;sheet.selectedScoreKey=String(examCol);
  let examColumn=sheet.scoreColumns.find(x=>Number(x.index)===examCol);
  if(!examColumn){examColumn={key:String(examCol),index:examCol,header:headers[examCol],numericCount:0,statusCount:0};sheet.scoreColumns.push(examColumn);}
  Object.assign(examColumn,{key:String(examCol),suggestedTotal:rule.examRawTotal,totalKnown:true});
  const activityCol=col('نشاط الطالب'),practicalCol=col('الاختبار العملي');
  for(const row of sheet.rows){
   const values=matrix[row.sourceRow-1]||[],num=index=>index<0?null:T9(values[index]);
   const examValue=num(examCol);
   if(!row.values[String(examCol)]){const status=E9(values[examCol],examValue!==null,settings);row.values[String(examCol)]={score:examValue,status:status.status,recognized:status.recognized,raw:C9(values[examCol])};}
   row.termComponents={source:'first_term_final',activityRaw:num(activityCol),practicalRaw:num(practicalCol),certificateOfficial:num(officialCol)};
   for(const [label,value,max] of [['النشاط',row.termComponents.activityRaw,rule.activityRawTotal],['العملي',row.termComponents.practicalRaw,rule.practicalRawTotal],['الشهادة',row.termComponents.certificateOfficial,rule.certificateTotal]]){
    if(value!==null&&(value<0||value>max))sheet.issues.push({severity:'error',row:row.sourceRow,sheet:sheet.sheet,message:'درجة '+label+' خارج 0 إلى '+max});
   }
  }
 }
};
SR63.TermGradeSettings=function({settings,onChange}){
 const h=v.createElement,cfg=SR63.termGradeConfig(settings),rules=SR63.termGradeDefaults().map(x=>SR63.termSubjectRule(settings,x.key));
 const update=patch=>onChange({termGradeRules:{...cfg,...patch}});
 const ruleUpdate=(key,patch)=>update({subjects:{...cfg.subjects,[key]:{...(cfg.subjects[key]||{}),...patch}}});
 const numeric=(label,value,onEdit)=>h('label',{className:'sr-term-field'},h('span',{},label),h('input',{type:'number',min:'0',max:'200',step:'0.5',value:String(value),onChange:e=>{const n=Number(e.target.value);if(Number.isFinite(n)&&n>=0)onEdit(n);}}));
 const check=(label,value,onEdit)=>h('label',{className:'sr-term-toggle'},h('input',{type:'checkbox',checked:!!value,onChange:e=>onEdit(e.target.checked)}),label);
 return h('section',{className:'sr-term-settings'},
  h('header',{},h('h2',{},'توزيع درجة شهادة نهاية الفصل الأول حسب المادة'),
   h('p',{},'تُحفظ درجة الاختبار الأصلية ونسبة التحصيل منها وحدها؛ وتُحسب الشهادة من 40 بإضافة مكونات المادة ودرجة منتصف الفصل. كل وزن ومسمى قابل للتعديل.')),
  h('div',{className:'sr-term-general'},
   check('تفعيل قواعد الشهادة التفصيلية',cfg.enabled,n=>update({enabled:n})),
   h('label',{},'اختبار نهاية الفصل',h('select',{value:cfg.finalExamKey,onChange:e=>update({finalExamKey:e.target.value})},...(settings.exams||[]).map(x=>h('option',{key:x.key,value:x.key},x.name)))),
   h('label',{},'اختبار منتصف الفصل',h('select',{value:cfg.midtermExamKey,onChange:e=>update({midtermExamKey:e.target.value})},...(settings.exams||[]).map(x=>h('option',{key:x.key,value:x.key},x.name)))),
   h('label',{},'جبر الدرجات',h('select',{value:cfg.rounding,onChange:e=>update({rounding:e.target.value})},
    h('option',{value:'ceil-half'},'إلى أعلى نصف درجة'),h('option',{value:'nearest-half'},'إلى أقرب نصف'),h('option',{value:'none'},'دون جبر')))),
  ...rules.map(rule=>h('details',{key:rule.key,className:'sr-term-subject',open:rule.key===SR63.subjectAliasKey('العلوم')},
   h('summary',{},rule.label+' — '+(rule.mode==='official'?'درجة شهادة رسمية':'اختبار '+rule.examWeight+' + عملي '+rule.practicalWeight+' + نشاط '+rule.activityWeight+' + منتصف '+rule.midtermWeight+' = '+rule.certificateTotal)),
   h('div',{className:'sr-term-grid'},
    h('label',{},'نوع حساب الشهادة',h('select',{value:rule.mode,onChange:e=>ruleUpdate(rule.key,{mode:e.target.value})},h('option',{value:'composite'},'تجميع المكونات'),h('option',{value:'official'},'شهادة رسمية مستوردة'))),
    numeric('درجة الاختبار الأصلية',rule.examRawTotal,n=>ruleUpdate(rule.key,{examRawTotal:n})),
    numeric('وزن الاختبار في الشهادة',rule.examWeight,n=>ruleUpdate(rule.key,{examWeight:n})),
    numeric('درجة العملي الأصلية',rule.practicalRawTotal,n=>ruleUpdate(rule.key,{practicalRawTotal:n})),
    numeric('وزن العملي',rule.practicalWeight,n=>ruleUpdate(rule.key,{practicalWeight:n})),
    numeric('درجة الأنشطة الأصلية',rule.activityRawTotal,n=>ruleUpdate(rule.key,{activityRawTotal:n})),
    numeric('وزن الأنشطة',rule.activityWeight,n=>ruleUpdate(rule.key,{activityWeight:n})),
    numeric('وزن منتصف الفصل',rule.midtermWeight,n=>ruleUpdate(rule.key,{midtermWeight:n})),
    numeric('مجموع الشهادة',rule.certificateTotal,n=>ruleUpdate(rule.key,{certificateTotal:n})),
    h('label',{className:'sr-term-field'},h('span',{},'مسمى الأنشطة في التقارير'),h('input',{type:'text',maxLength:80,value:rule.activityLabel,onChange:e=>ruleUpdate(rule.key,{activityLabel:e.target.value})})),
    check('طباعة منتصف الفصل',rule.showMidterm,n=>ruleUpdate(rule.key,{showMidterm:n})),
    check('طباعة الأنشطة',rule.showActivity,n=>ruleUpdate(rule.key,{showActivity:n})),
    check('طباعة العملي',rule.showPractical,n=>ruleUpdate(rule.key,{showPractical:n}))
   ),
   h('p',{className:'sr-term-equation'},rule.mode==='official'?'تُستخدم الشهادة الرسمية فقط؛ لا تُختلق مكونات غير مرصودة.':'مجموع الأوزان: '+(rule.examWeight+rule.practicalWeight+rule.activityWeight+rule.midtermWeight)+' من '+rule.certificateTotal)
  )),
  h('p',{className:'sr-term-note'},'لن تُعامل الدرجات المفقودة على أنها صفر. عند وجود درجة شهادة رسمية دون بعض المكونات، تظهر كمستوردة مع بيان حالة الحساب.')
 );
};
