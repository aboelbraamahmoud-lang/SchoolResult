/* Multi-column school-grade imports: preserve raw, official and component marks. */
SR63.gradeImportPeriod=function(sheet){
 const note=String([sheet.period,sheet.sheet].filter(Boolean).join(' '));
 if(['exam1','exam2','exam3','exam4'].includes(sheet.exam))return sheet.exam;
 if(sheet.yearFinal||/(نهاية\s*(?:الفصل\s*(?:الدراسي\s*)?الثاني|العام|السنة)|الاختبار\s*الرابع)/.test(note))return 'exam4';
 if(sheet.termFinal||/نهاية\s*الفصل\s*(?:الدراسي\s*)?الأول/.test(note))return 'exam2';
 if(/منتصف\s*الفصل\s*(?:الدراسي\s*)?الثاني/.test(note))return 'exam3';
 if(/منتصف\s*الفصل\s*(?:الدراسي\s*)?الأول/.test(note))return 'exam1';
 return null;
};
SR63.gradeImportCertificateMax=(settings,subject,exam)=>exam==='exam1'||exam==='exam3'?15:
 exam==='exam2'?(SR63.termSubjectRule(settings,subject)?.certificateTotal??40):
 exam==='exam4'?(SR63.yearSubjectRule(settings,subject)?.certificateTotal??100):100;
SR63.gradeImportRawMax=(settings,subject,exam)=>exam==='exam2'?(SR63.termSubjectRule(settings,subject)?.examRawTotal??50):
 exam==='exam4'?(SR63.yearSubjectRule(settings,subject)?.examRawTotal??50):
 Number(settings?.exams?.find(x=>x.key===exam)?.total??30);
SR63.gradeImportPrepare=function(sheets,book,settings){
 for(const sheet of sheets){
  const worksheet=book.Sheets[sheet.sourceSheet||sheet.sheet];if(!worksheet||!sheet.rows?.length)continue;
  // Keep the legacy one-column import untouched when the assessment period is unknown.
  const exam=SR63.gradeImportPeriod(sheet);if(!exam)continue;
  const matrix=Gv.sheet_to_json(worksheet,{header:1,raw:true,defval:null,blankrows:true});
  const headers=(matrix[sheet.headerRow-1]||[]).map(C9);
  const columns=new Map((sheet.scoreColumns||[]).map(c=>[String(c.key),c]));
  // Wide workbooks previously exposed just one selected exam column. Discover
  // extra numeric columns for the four independent mapping controls as well.
  for(let i=0;i<headers.length&&i<120;i++){
   const header=headers[i];
   if(!header||/^(?:الرقم|رقم الطالب|الرقم الأكاديمي|الاسم|اسم الطالب|الشعبة|الصف|المعلم|المادة|القسم|الجنسية|ملاحظات|حالة)/.test(header))continue;
   if(!columns.has(String(i))&&!sheet.rows.some(row=>Number.isFinite(T9((matrix[row.sourceRow-1]||[])[i]))))continue;
   if(!columns.has(String(i))){
    const entry={index:i,key:String(i),header,numericCount:0,statusCount:0,suggestedTotal:0,totalKnown:false};
    sheet.scoreColumns.push(entry);columns.set(String(i),entry);
   }
   for(const row of sheet.rows){
    const cell=(matrix[row.sourceRow-1]||[])[i];
    row.values??={};
    if(!row.values[String(i)]){
     const score=T9(cell),status=E9(cell,score!==null,settings);
     row.values[String(i)]={score,status:status.status,recognized:status.recognized,raw:C9(cell)};
    }
   }
  }
  sheet.exam=exam;
  const science=SR63.subjectAliasKey(sheet.subject)===SR63.subjectAliasKey('العلوم');
  const find=(rules,avoid=[])=>{
   for(const re of rules){const c=sheet.scoreColumns.find(x=>re.test(String(x.header||''))&&!avoid.includes(String(x.key)));if(c)return String(c.key);}
   return '';
  };
  const raw=find([/^(?:الاختبار النظري|الاختبار التحريري|التقييم الرئيسي|درجة الاختبار|الاختبار النهائي|اختبار نهاية العام|اختبار منتصف الفصل)$/u,/^(?:درجة|علامة)\s*(?:الاختبار|التقييم)/u,/(?:الاختبار النظري|التقييم الرئيسي|الاختبار التحريري)/u]);
  const officialTests=exam==='exam1'?
   [/^(?:منتصف الفصل الأول|منتصف الفصل الدراسي الأول|درجة منتصف الفصل الأول)$/u,/^(?:درجة الشهادة|الشهادة الرسمية|درجة الشهادة الرسمية|الشهادة)$/u]:
   exam==='exam3'?
   [/^(?:منتصف الفصل الثاني|منتصف الفصل الدراسي الثاني|درجة منتصف الفصل الثاني)$/u,/^(?:درجة الشهادة|الشهادة الرسمية|درجة الشهادة الرسمية|الشهادة)$/u]:
   exam==='exam2'?
   [/^(?:نهاية الفصل الأول|نهاية الفصل الدراسي الأول|درجة نهاية الفصل الأول)$/u,/^(?:درجة الشهادة|الشهادة الرسمية|درجة الشهادة الرسمية|الشهادة)$/u]:
   [/^(?:نهاية العام|مجموع نهاية العام|المجموع السنوي|المجموع النهائي|الدرجة النهائية|درجة نهاية العام)$/u,/^(?:درجة الشهادة|الشهادة الرسمية|درجة الشهادة الرسمية|الشهادة)$/u];
  const certificate=find(officialTests,[raw]);
  const activity=exam==='exam2'||exam==='exam4'?find([/^(?:نشاط الطالب|أعمال الفصل|الأنشطة|أنشطة الفصل الثاني|درجة النشاط|النشاط)$/u,/^نشاط/u],[raw,certificate]):'';
  const practical=science&&(exam==='exam2'||exam==='exam4')?find([/^(?:الاختبار العملي|العملي|درجة العملي)$/u,/الاختبار العملي/u],[raw,certificate,activity]):'';
  const secondTerm=exam==='exam4'?find([/^(?:نهاية الفصل الثاني|نهاية الفصل الدراسي الثاني|مجموع الفصل الثاني)$/u],[raw,certificate,activity,practical]):'';
  const originalSelected=String(sheet.selectedScoreKey||'');
  const primary=raw||(originalSelected&&originalSelected!==certificate?originalSelected:'');
  sheet.gradeColumns={raw:primary,certificate,activity,practical,secondTerm};
  sheet.selectedScoreKey=primary||certificate||'';
  const test=columns.get(primary),officialColumn=columns.get(certificate);
  if(test&&exam){test.suggestedTotal=SR63.gradeImportRawMax(settings,sheet.subject,exam);test.totalKnown=true;}
  if(officialColumn&&exam){officialColumn.suggestedTotal=SR63.gradeImportCertificateMax(settings,sheet.subject,exam);officialColumn.totalKnown=true;}
 }
 return sheets;
};
SR63.gradeImportItem=function(sheet,row,fileName,settings){
 const m=sheet.gradeColumns;if(!m)return null;
 const exam=sheet.exam;
 const cell=key=>key?row.values?.[String(key)]??null:null;
 const raw=cell(m.raw),official=cell(m.certificate);
 const hasRaw=!!m.raw&&raw?.status==='present'&&Number.isFinite(raw.score);
 const hasOfficial=!!m.certificate&&official?.status==='present'&&Number.isFinite(official.score);
 const selected=hasRaw?raw:hasOfficial?official:raw??official??{score:null,status:'unentered',recognized:false};
 const officialMax=SR63.gradeImportCertificateMax(settings,sheet.subject,exam);
 const activity=cell(m.activity)?.score??null,practical=cell(m.practical)?.score??null,secondTerm=cell(m.secondTerm)?.score??null;
 const keys=[m.raw,m.certificate,m.activity,m.practical,m.secondTerm].filter(Boolean);
 const valid=(key,limit)=>!key||cell(key)?.recognized!==false&&(cell(key)?.score==null||Number.isFinite(cell(key)?.score)&&cell(key).score>=0&&cell(key).score<=limit);
 const rawStatusConflict=!!m.raw&&!hasRaw&&raw?.status&&raw.status!=='unentered'&&hasOfficial;
 const recognized=!rawStatusConflict&&new Set(keys).size===keys.length&&selected.recognized!==false&&
  valid(m.certificate,officialMax)&&valid(m.activity,50)&&valid(m.practical,5)&&valid(m.secondTerm,45);
 const source=exam==='exam2'?'first_term_final':exam==='exam4'?'year_end_final':'midterm_certificate';
 const termComponents=['exam1','exam2','exam3','exam4'].includes(exam)?{
  source,originalExamPresent:hasRaw,certificateOfficial:hasOfficial?official.score:null,
  ...(exam==='exam2'||exam==='exam4'?{activityRaw:activity,practicalRaw:practical}:{}),
  ...(exam==='exam4'?{secondTermOfficial:secondTerm}:{}),
  importColumns:{...m}
 }:null;
 return {id:row.id,studentId:row.studentId,studentName:row.studentName,
  grade:row.grade,className:row.className,subject:String(sheet.subject||'').trim(),
  score:selected.score??null,status:selected.status??'unentered',recognized,
  sourceFile:fileName,sourceSheet:sheet.sheet,sourceRow:row.sourceRow,exam:exam||null,
  totalOverride:hasRaw?null:hasOfficial?officialMax:null,teacher:row.teacher??'',
  department:row.department??'',termComponents};
};
/* Partial Excel uploads must never overwrite a previously recorded raw mark
   with a certificate-only carrier, or silently erase other saved components. */
SR63.gradeImportMergeRow=function(previous,item,exam,total){
 const incoming=item.termComponents;
 if(!incoming)return {score:item.score,status:item.status,total,components:null};
 const old=previous?.termComponents?.[exam]||{},parts={...old,...incoming};
 for(const key of ['certificateOfficial','activityRaw','practicalRaw','secondTermOfficial']){
  if(parts[key]===null&&Number.isFinite(old[key]))parts[key]=old[key];
 }
 const priorRaw=previous?.statuses?.[exam]==='present'&&Number.isFinite(previous?.scores?.[exam])&&
  Number.isFinite(previous?.totals?.[exam])&&old.originalExamPresent!==false;
 const preserveRaw=incoming.originalExamPresent===false&&priorRaw;
 if(preserveRaw)parts.originalExamPresent=true;
 return {score:preserveRaw?previous.scores[exam]:item.score,
  status:preserveRaw?previous.statuses[exam]:item.status,
  total:preserveRaw?previous.totals[exam]:total,components:parts};
};
SR63.ImportGradeColumnFields=function({sheet,onChange}){
 const h=v.createElement,exam=sheet.exam||'',m=sheet.gradeColumns||{raw:sheet.selectedScoreKey||'',certificate:'',activity:'',practical:'',secondTerm:''};
 const final=exam==='exam2'||exam==='exam4';
 const science=SR63.subjectAliasKey(sheet.subject)===SR63.subjectAliasKey('العلوم');
 const options=[h('option',{key:'none',value:''},'— غير محدد —'),...(sheet.scoreColumns||[]).map(c=>h('option',{key:c.key,value:String(c.key)},String(c.header)+' (عمود '+(Number(c.index)+1)+')'))];
 const previewValue=(row,key)=>{const x=key?row.values?.[String(key)]?.score:null;return Number.isFinite(x)?String(x):'—';};
 const activityLabel=row=>{const x=m.activity?row.values?.[String(m.activity)]?.score:null;return Number.isFinite(x)?String(x)+' / 50 ← '+String(Number((x/10).toFixed(3)))+' / 5 قبل الجبر':'—';};
 const sample=sheet.rows.slice(0,3);
 const update=(key,value)=>{
  const next={...m,[key]:value},patch={gradeColumns:next};
  if(key==='raw')patch.selectedScoreKey=value||next.certificate||'';
  if(key==='certificate'&&!next.raw)patch.selectedScoreKey=value||'';
  onChange(patch);
 };
 const select=(label,key)=>h('label',{key,className:'sr-term-field'},h('span',{},label),
  h('select',{className:'w-full rounded-lg border border-slate-300 bg-white p-2 text-sm',
   value:m[key]||'',onChange:e=>update(key,e.target.value)},...options));
 return h('div',{className:'sr-import-grade-map'},
  h('p',{className:'sr-import-grade-map-title'},'ربط أعمدة Excel — اختر أكثر من عمود للنتيجة الواحدة'),
  h('label',{className:'mb-3 block text-sm'},h('span',{},'فترة التقييم'),
   h('select',{className:'mt-1 w-full rounded-lg border border-slate-300 bg-white p-2',value:exam,
    onChange:e=>onChange({exam:e.target.value,gradeColumns:{...m},selectedScoreKey:m.raw||m.certificate||''})},
    h('option',{value:''},'الاختبار المحدد في أعلى الصفحة'),
    ...[['exam1','منتصف الفصل الأول'],['exam2','نهاية الفصل الأول'],['exam3','منتصف الفصل الثاني'],['exam4','نهاية العام']].map(([value,label])=>h('option',{key:value,value},label)))),
  h('div',{className:'sr-import-grade-map-fields'},select('درجة الاختبار الأصلية — للتحصيل','raw'),
   select('الشهادة الرسمية (15 للمنتصف، 40 للفصل الأول، 100 للعام)','certificate'),
   ...(final?[select('النشاط الأصلي من 50 (يُحوَّل إلى 5)','activity'),
    ...(science?[select('العملي للعلوم من 5','practical')]:[]),
    ...(exam==='exam4'?[select('مجموع الفصل الثاني من 45 (اختياري)','secondTerm')]:[])]:[])),
  h('p',{className:'mt-2 text-xs text-sky-800'},'تبقى الدرجتان الأصلية والرسمية محفوظتين. النشاط من 50 ويحول إلى 5. لا تُضاف أنشطة الفصل الأول مرتين.'),
  h('div',{className:'sr-import-grade-preview'},
   h('p',{className:'mb-2 text-xs font-bold text-sky-900'},'معاينة أول '+sample.length+' نتائج من الأعمدة المختارة'),
   h('table',{className:'sr-import-grade-preview-table'},
    h('thead',{},h('tr',{},...['الطالب','الاختبار الخام','الشهادة الرسمية','النشاط (50 ← 5)','العملي'].map(title=>h('th',{key:title,className:'border-b p-1'},title)))),
    h('tbody',{},...sample.map(row=>h('tr',{key:row.id},
     h('td',{className:'border-b p-1'},row.studentName||'—'),
     h('td',{className:'border-b p-1'},previewValue(row,m.raw)),
     h('td',{className:'border-b p-1'},previewValue(row,m.certificate)),
     h('td',{className:'border-b p-1'},activityLabel(row)),
     h('td',{className:'border-b p-1'},previewValue(row,m.practical))))))),
  new Set(Object.values(m).filter(Boolean)).size!==Object.values(m).filter(Boolean).length?
   h('p',{className:'mt-2 font-bold text-rose-700'},'اختر عمودًا مختلفًا لكل مكوّن.'):null);
};
const srImportOldCertificateScore=SR63.certificateScore;
const srImportOldCertificatePercentage=SR63.certificatePercentage;
SR63.certificateScore=function(row,exam,settings){
 const info=row?.termComponents?.[exam];
 if(info?.source!=='midterm_certificate')return srImportOldCertificateScore(row,exam,settings);
 if(row.statuses?.[exam]!=='present')return null;
 const rawTotal=Number(row.totals?.[exam]??settings?.exams?.find(e=>e.key===exam)?.total);
 const rawScore=info.originalExamPresent!==false?row.scores?.[exam]:null;
 const originalPercent=Number.isFinite(rawScore)&&rawScore>=0&&Number.isFinite(rawTotal)&&rawTotal>0&&rawScore<=rawTotal?rawScore/rawTotal*100:null;
 const official=Number.isFinite(info.certificateOfficial)&&info.certificateOfficial>=0&&info.certificateOfficial<=15?info.certificateOfficial:null;
 const calculated=originalPercent!==null?SR63.termConvert(rawScore,rawTotal,15,SR63.termGradeConfig(settings).rounding):null;
 const certificateScore=official??calculated;if(certificateScore===null)return null;
 return {rawScore,rawTotal,originalPercent,certificateScore,certificateTotal:15,certificatePercent:certificateScore/15*100,
  calculated,official,officialUsed:official!==null,discrepancy:calculated!==null&&official!==null&&Math.abs(calculated-official)>.01,
  enabled:true,passed:(originalPercent??certificateScore/15*100)>=Number(settings?.pass??50)};
};
SR63.certificatePercentage=function(row,exam,settings){
 if(row?.termComponents?.[exam]?.source==='midterm_certificate')return SR63.certificateScore(row,exam,settings)?.originalPercent??null;
 return srImportOldCertificatePercentage(row,exam,settings);
};
