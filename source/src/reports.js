SR63.reportExamKeys=config=>[...new Set([config.exam,...config.columns.flatMap(c=>(c.key.match(/exam[1-4]/g)??[])),...(config.mode==='summary'?[config.compareExam]:[])])].filter(k=>XA.includes(k));
SR63.print=async function(workspace,exams){
  if(!workspace.rows.length){eb.error('لا توجد نتائج للطباعة.');return;}
  const invalid=[...new Set(exams)].map(key=>({key,quality:RN(workspace,key)})).filter(item=>item.quality.critical>0);
  if(invalid.length){eb.error('عالج المشكلات الحرجة في جودة البيانات قبل الطباعة: '+invalid.map(item=>tj(workspace.settings,item.key).name).join('، '));return;}
  const report=document.getElementById('custom-printable-reports')??document.getElementById('printable-reports');
  if(!report)return eb.error('افتح معاينة التقرير أولًا.');
  if(document.fonts?.ready)await document.fonts.ready;
  document.getElementById('sr63-print-root')?.remove();
  const printRoot=document.createElement('div');printRoot.id='sr63-print-root';printRoot.appendChild(report.cloneNode(true));document.body.appendChild(printRoot);
  const cleanup=()=>printRoot.remove();window.addEventListener('afterprint',cleanup,{once:true});
  try{window.print();}catch{cleanup();eb.error('تعذر فتح الطباعة.');}
};
SR63.reportStatus=function(workspace,assessment,subject){
  const cache=SR63.reportStatusCache??(SR63.reportStatusCache=new WeakMap());let byScope=cache.get(workspace);if(!byScope){byScope=new Map();cache.set(workspace,byScope);}const scope=assessment+'|'+subject;if(byScope.has(scope))return byScope.get(scope);
  const keys=workspace.settings.exams.filter(exam=>String(assessment).includes(exam.name)).map(exam=>exam.key);
  const subset=subject&&subject!=='كل المواد'&&subject!=='الكل'?workspace.rows.filter(row=>row.subject===subject):workspace.rows;
  const checks=(keys.length?keys:[workspace.activeExam]).map(exam=>RN({...workspace,rows:subset},exam));
  const result=checks.every(c=>c.ready)?'فحص البيانات مكتمل — يُراجع قبل الاعتماد':'مسودة — توجد بيانات غير مكتملة أو تحتاج معالجة';byScope.set(scope,result);return result;
};
SR63.formatWorkbook=function(book){
  book.Workbook??={};book.Workbook.Views=[{...(book.Workbook.Views?.[0]??{}),RTL:true}];
  for(const name of book.SheetNames){const sheet=book.Sheets[name];if(!sheet['!ref'])continue;const range=Gv.decode_range(sheet['!ref']);
    sheet['!autofilter']={ref:sheet['!ref']};sheet['!srFreeze']=1;
    sheet['!cols']=Array.from({length:range.e.c+1},(_,column)=>{let max=12;for(let row=0;row<=Math.min(range.e.r,120);row++){const value=sheet[Gv.encode_cell({r:row,c:column})]?.v;max=Math.max(max,String(value??'').length+2);}return {wch:Math.min(42,max)};});
    for(let column=0;column<=range.e.c;column++){
      const header=String(sheet[Gv.encode_cell({r:range.s.r,c:column})]?.v??''),percent=sheet['!srPercentColumns']?.includes(column)||/نسبة|التحصيل/.test(header),delta=sheet['!srDeltaColumns']?.includes(column)||/القيمة المضافة|الفارق/.test(header);
      for(let row=range.s.r+1;row<=range.e.r;row++){const cell=sheet[Gv.encode_cell({r:row,c:column})];if(!cell||cell.t!=='n')continue;if(percent)cell.z='0.0%';else if(delta)cell.z='+0.0;-0.0;0.0';else cell.z='0.##';}
    }
  }
  const workspace=SR63.currentWorkspace;
  if(workspace&&!book.SheetNames.includes('بيانات التقرير')){
    const meta=Gv.aoa_to_sheet([['البيان','القيمة'],['المدرسة',workspace.settings.schoolName],['العام الأكاديمي',workspace.settings.academicYear],['الاختبار النشط',tj(workspace.settings,workspace.activeExam).name],['وقت التصدير',new Date().toLocaleString('ar-EG')],['حد النجاح (%)',workspace.settings.pass],['تعريف نسبة النجاح','عدد نتائج المواد الناجحة ÷ عدد نتائج المواد المقيمة'],['تعريف التحصيل','مجموع الدرجات ÷ مجموع الدرجات الممكنة'],['القيم الفارغة','غير متاحة؛ لا تعني صفرًا'],['الإصدار',SR63.version],...(SR63.exportContext??[])]);
    meta['!cols']=[{wch:26},{wch:80}];meta['!srFreeze']=1;Gv.book_append_sheet(book,meta,'بيانات التقرير');
  }
  SR63.exportContext=null;return book;
};
SR63.exportCustom=function(config,rows){
  const book=Gv.book_new(),sheet=Gv.aoa_to_sheet([config.columns.map(c=>c.label),...rows.map(row=>config.columns.map(c=>Ede(row[c.key]??'',c.key)))]);
  sheet['!srPercentColumns']=config.columns.flatMap((c,i)=>c.key.startsWith('percent:')||['success','achievement'].includes(c.key)?[i]:[]);
  sheet['!srDeltaColumns']=config.columns.flatMap((c,i)=>c.key.startsWith('delta:')||c.key==='valueAdded'?[i]:[]);
  Gv.book_append_sheet(book,sheet,'التقرير');SR63.exportContext=[['عنوان التقرير',config.title],['المادة',config.subject],['نطاق التقرير',config.entity],['حدود النسبة',`${config.minPercent}–${config.maxPercent}`]];Tv(book,`${config.name||'تقرير-مخصص'}.xlsx`);
};
SR63.csvValue=value=>typeof value==='string'&&/^[=+\-@\t\r]/.test(value)?"'"+value:value;
SR63.archivePreview=function(snapshot){
  const workspace=snapshot.workspace,esc=SR63.escape,rows=workspace.rows.slice(0,2000);
  const summaries=workspace.settings.exams.map(exam=>{const m=bj(workspace.rows,exam.key,workspace.settings);return `<tr><td>${esc(exam.name)}</td><td>${m.students}</td><td>${m.evaluated}</td><td>${esc(wj(m.success))}</td><td>${esc(wj(m.achievement))}</td></tr>`;}).join('');
  const detail=rows.map(row=>`<tr><td>${esc(row.studentId)}</td><td>${esc(row.studentName)}</td><td>${esc(row.subject)}</td>${XA.map(exam=>`<td>${esc(hj(row,exam))} — ${esc(row.statuses[exam]==='present'?row.scores[exam]+'/'+pj(row,exam,workspace.settings):Dj(row.statuses[exam]))}</td>`).join('')}</tr>`).join('');
  const documentText=`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>أرشيف ${esc(workspace.settings.academicYear)}</title><style>body{font:16px/1.8 Tahoma,Arial;margin:30px;color:#173b4c}table{border-collapse:collapse;width:100%;margin:20px 0}th,td{border:1px solid #ccd8de;padding:8px;text-align:right}th{background:#edf5f6}h1{font-size:26px}thead{display:table-header-group}tr{break-inside:avoid}</style><h1>${esc(workspace.settings.schoolName)} — ${esc(workspace.settings.academicYear)}</h1><p>أرشيف دائم للقراءة فقط. وقت الحفظ: ${esc(new Date(snapshot.at).toLocaleString('ar-EG'))}.</p><table><thead><tr><th>الاختبار</th><th>طلاب فريدون</th><th>نتائج مقيمة</th><th>النجاح</th><th>التحصيل</th></tr></thead><tbody>${summaries}</tbody></table><h2>سجلات النتائج</h2><p>معاينة ${rows.length} من ${workspace.rows.length} سجل. نسخة JSON المحفوظة تتضمن جميع السجلات.</p><table><thead><tr><th>الرقم</th><th>الاسم</th><th>المادة</th>${workspace.settings.exams.map(exam=>`<th>${esc(exam.name)}</th>`).join('')}</tr></thead><tbody>${detail}</tbody></table></html>`;
  SR63.download(documentText,`أرشيف-${workspace.settings.academicYear}-للقراءة.html`,'text/html;charset=utf-8');
};

/* 6.7 — grade-wide all-subject comparison, one landscape sheet per grade. */
/* 6.9.5 — unified premium report visuals: data bars, macro bands and executive hierarchy. */
SR63.gradeOrder=function(value){
  const text=String(value??'');
  if(/السابع|(?:^|\D)[٧7](?:\D|$)/.test(text))return 7;
  if(/الثامن|(?:^|\D)[٨8](?:\D|$)/.test(text))return 8;
  if(/التاسع|(?:^|\D)[٩9](?:\D|$)/.test(text))return 9;
  const n=Number((text.match(/\d+/)||[])[0]);return Number.isFinite(n)?n:999;
};
SR63.displayClass=value=>String(value??'').replace(/\s*\/\s*/g,' - ').replace(/\s+/g,' ').trim();
SR63.metricTone=function(value){if(value===null||value===undefined||!Number.isFinite(Number(value)))return 'na';const n=Number(value);return n<21?'very-low':n<50?'low':n<71?'mid':n<91?'good':'excellent';};
SR63.clampPercent=value=>value===null||value===undefined||!Number.isFinite(Number(value))?0:Math.max(0,Math.min(100,Number(value)));
SR63.renderReportValue=function(value,key=''){
  const raw=value??'',text=String(raw).trim(),keyText=String(key),numeric=typeof raw==='number'?raw:Number(text.replace(/[%،,\s]/g,'')),isDelta=/delta|valueAdded|القيمة المضافة|القيمة المنقوصة|الفارق/i.test(keyText),isPercent=/percent|success|achievement|ratio|نسبة|تحصيل/i.test(keyText)||/%$/.test(text);
  if(isDelta&&Number.isFinite(numeric)){
    const n=Number(numeric),tone=n>0?'positive':n<0?'negative':'neutral',arrow=n>0?'↑':n<0?'↓':'•',sign=n>0?'+':'';
    return (0,q.jsxs)(`span`,{className:`report-delta-chip delta-${tone}`,title:n>0?'قيمة مضافة':n<0?'قيمة منقوصة':'لا تغير',children:[(0,q.jsx)(`i`,{children:arrow}),(0,q.jsx)(`b`,{children:`${sign}${n.toFixed(1)}`})]});
  }
  if(isPercent&&Number.isFinite(numeric)){
    let pct=/%$/.test(text)?numeric:(numeric>=0&&numeric<=1?numeric*100:numeric);pct=SR63.clampPercent(pct);const tone=SR63.metricTone(pct);
    return (0,q.jsxs)(`div`,{className:`report-meter report-cell-meter tone-${tone}`,children:[(0,q.jsx)(`i`,{style:{width:`${pct}%`}}),(0,q.jsx)(`b`,{children:/%$/.test(text)?text:wj(pct)})]});
  }
  return raw;
};
SR63.macroLabel=macro=>macro==='above'?'فوق المتوسط':macro==='average'?'في المتوسط':macro==='below'?'دون المتوسط':'غير مصنف';
SR63.macroTone=macro=>macro==='above'?'above':macro==='average'?'average':macro==='below'?'below':'na';
SR63.gradeSubjectPages=function(rows,exam,selected='الكل'){
  const grades=[...new Set(rows.map(row=>gj(row,exam)).filter(Boolean))].sort((a,b)=>SR63.gradeOrder(a)-SR63.gradeOrder(b)||String(a).localeCompare(String(b),'ar',{numeric:true}));
  const target=selected==='الكل'?grades:grades.filter(value=>value===selected);
  const pages=[];
  for(const grade of target){
    const subset=rows.filter(row=>gj(row,exam)===grade),subjects=[...new Set(subset.map(row=>row.subject||'غير محدد'))].sort((a,b)=>String(a).localeCompare(String(b),'ar',{numeric:true}));
    const chunks=subjects.length?Array.from({length:Math.ceil(subjects.length/8)},(_,i)=>subjects.slice(i*8,(i+1)*8)):[[]];
    for(const metricType of ['success','achievement'])chunks.forEach((subjectChunk,index)=>pages.push({key:`subjects-${grade}-${metricType}-${index}`,title:grade,entity:grade,scope:'grade',grade,className:'',teacher:'',subject:'كل المواد',rows:subset.filter(row=>subjectChunk.includes(row.subject||'غير محدد')),allRows:subset,subjectChunk,metricType,rowOffset:0,part:index+1,totalParts:chunks.length}));
  }
  return pages;
};
SR63.gradeSubjectMatrix=function(rows,exam,settings,subjectChunk){
  const sort=values=>[...new Set(values.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'ar',{numeric:true}));
  const subjects=(subjectChunk?.length?subjectChunk:sort(rows.map(row=>row.subject||'غير محدد'))),classes=sort(rows.map(row=>hj(row,exam)));
  const cells=new Map();
  for(const className of classes)for(const subject of subjects){const subset=rows.filter(row=>hj(row,exam)===className&&(row.subject||'غير محدد')===subject),teachers=sort(subset.map(row=>mj(row,exam)).filter(Boolean));cells.set(`${className}\u0000${subject}`,{rows:subset,teacher:teachers.join(' / ')||'—',metric:bj(subset,exam,settings)});}
  const totals=Object.fromEntries(subjects.map(subject=>[subject,bj(rows.filter(row=>(row.subject||'غير محدد')===subject),exam,settings)]));
  return {subjects,classes,cells,totals,overall:bj(rows,exam,settings)};
};
function SRGradeSubjectsReport({page:e,exam:t,workspace:n}){
  const data=SR63.gradeSubjectMatrix(e.allRows,t,n.settings,e.subjectChunk),grade=e.grade||e.entity||'غير محدد',metric=e.metricType==='achievement'?'achievement':'success',label=metric==='achievement'?'التحصيل الأكاديمي':'نسب النجاح';
  const headSubjects=data.subjects.map(subject=>(0,q.jsx)(`th`,{colSpan:2,className:`grade-matrix-subject`,children:(0,q.jsxs)(q.Fragment,{children:[(0,q.jsx)(`b`,{children:subject}),SR63.subjectCoordinator(n,subject)?(0,q.jsxs)(`small`,{children:[`المنسق: `,SR63.subjectCoordinator(n,subject)]}):null]})},subject));
  const subheads=data.subjects.flatMap(subject=>[(0,q.jsx)(`th`,{children:`اسم المعلم`},`${subject}-teacher`),(0,q.jsx)(`th`,{children:`النسبة`},`${subject}-metric`)]);
  const rows=data.classes.map(className=>(0,q.jsxs)(`tr`,{children:[(0,q.jsx)(`th`,{className:`grade-matrix-class`,children:SR63.displayClass(className)}),...data.subjects.flatMap(subject=>{const cell=data.cells.get(`${className}\u0000${subject}`),value=cell?.metric?.[metric],tone=SR63.metricTone(value);return[(0,q.jsx)(`td`,{className:`grade-matrix-teacher`,children:cell?.teacher||'—'},`${className}-${subject}-teacher`),(0,q.jsx)(`td`,{className:`grade-matrix-value tone-${tone}`,children:cell?.rows?.length?(0,q.jsxs)(`div`,{className:`report-meter tone-${tone}`,children:[(0,q.jsx)(`i`,{style:{width:`${SR63.clampPercent(value)}%`}}),(0,q.jsx)(`b`,{children:wj(value)})]}):'—'},`${className}-${subject}-metric`)];})]},className));
  const totals=data.subjects.flatMap(subject=>{const value=data.totals[subject]?.[metric],tone=SR63.metricTone(value);return[(0,q.jsx)(`td`,{className:`grade-matrix-total-label`,children:`متوسط`},`${subject}-total-label`),(0,q.jsx)(`td`,{className:`grade-matrix-value total tone-${tone}`,children:(0,q.jsxs)(`div`,{className:`report-meter total tone-${tone}`,children:[(0,q.jsx)(`i`,{style:{width:`${SR63.clampPercent(value)}%`}}),(0,q.jsx)(`b`,{children:wj(value)})]})},`${subject}-total`) ];});
  return(0,q.jsxs)(q.Fragment,{children:[
    (0,q.jsxs)(`div`,{className:`grade-matrix-caption`,children:[(0,q.jsx)(`strong`,{children:metric==='achievement'?`بيان نسب التحصيل الأكاديمي`:`بيان نسب النجاح`}),(0,q.jsxs)(`span`,{children:[grade,` · `,tj(n.settings,t).name,e.totalParts>1?` · مجموعة مواد ${e.part}/${e.totalParts}`:``]})]}),
    (0,q.jsxs)(`table`,{className:`report-table grade-subject-matrix`,children:[
      (0,q.jsxs)(`thead`,{children:[(0,q.jsxs)(`tr`,{children:[(0,q.jsx)(`th`,{rowSpan:2,className:`grade-matrix-class-head`,children:`الشعبة`}),...headSubjects]}),(0,q.jsx)(`tr`,{children:subheads})]}),
      (0,q.jsx)(`tbody`,{children:rows}),
      (0,q.jsx)(`tfoot`,{children:(0,q.jsxs)(`tr`,{children:[(0,q.jsx)(`th`,{children:`على مستوى الصف`}),...totals]})})
    ]}),
    (0,q.jsxs)(`div`,{className:`grade-matrix-legend`,children:[(0,q.jsx)(`b`,{children:`المفتاح`}),(0,q.jsx)(`span`,{className:`tone-very-low`,children:`< 21%`}),(0,q.jsx)(`span`,{className:`tone-low`,children:`21% - 49.9%`}),(0,q.jsx)(`span`,{className:`tone-mid`,children:`50% - 70.9%`}),(0,q.jsx)(`span`,{className:`tone-good`,children:`71% - 90.9%`}),(0,q.jsx)(`span`,{className:`tone-excellent`,children:`≥ 91%`})]}),
    (0,q.jsxs)(`div`,{className:`grade-matrix-summary`,children:[(0,q.jsxs)(`span`,{children:[`متوسط `,label,`: `,(0,q.jsx)(`b`,{children:wj(data.overall[metric])})]}),(0,q.jsxs)(`span`,{children:[`عدد الشعب: `,(0,q.jsx)(`b`,{children:data.classes.length})]}),(0,q.jsxs)(`span`,{children:[`عدد المواد: `,(0,q.jsx)(`b`,{children:data.subjects.length})]})]})
  ]});
}

SR63.departmentStatsPages=function(rows,exam,selectedSubject='الكل'){
  const subjects=[...new Set(rows.map(row=>row.subject).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar',{numeric:true})),target=selectedSubject==='الكل'?subjects:subjects.filter(s=>s===selectedSubject);
  return target.map(subject=>{const subset=rows.filter(row=>row.subject===subject);return {key:`department-${ij(subject)}`,title:subject,entity:subject,scope:'department',className:'',teacher:'',subject,rows:subset,allRows:subset,rowOffset:0,part:1,totalParts:1};});
};
function SRDepartmentStatsReport({page:e,exam:t,workspace:n}){
  const grades=[...new Set(e.allRows.map(row=>gj(row,t)).filter(Boolean))].sort((a,b)=>SR63.gradeOrder(a)-SR63.gradeOrder(b)||a.localeCompare(b,'ar',{numeric:true})),body=[];
  for(const grade of grades){const gradeRows=e.allRows.filter(row=>gj(row,t)===grade),classes=[...new Set(gradeRows.map(row=>hj(row,t)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar',{numeric:true}));body.push((0,q.jsx)(`tr`,{className:`dept-grade-banner`,children:(0,q.jsx)(`th`,{colSpan:9,children:grade})},`grade-${grade}`));for(const className of classes){const rows=gradeRows.filter(row=>hj(row,t)===className),m=bj(rows,t,n.settings),teachers=[...new Set(rows.map(row=>mj(row,t)).filter(Boolean))].join(' / ')||'—',absent=m.absent+m.excused+m.unexcused+m.deprived;body.push((0,q.jsxs)(`tr`,{children:[(0,q.jsx)(`td`,{children:teachers}),(0,q.jsx)(`td`,{children:SR63.displayClass(className)}),(0,q.jsx)(`td`,{children:m.students}),(0,q.jsx)(`td`,{children:m.evaluated}),(0,q.jsx)(`td`,{children:absent}),(0,q.jsx)(`td`,{children:m.passed}),(0,q.jsx)(`td`,{children:m.failed}),(0,q.jsx)(`td`,{className:`dept-metric-cell`,children:(0,q.jsxs)(`div`,{className:`report-meter compact tone-${SR63.metricTone(m.success)}`,children:[(0,q.jsx)(`i`,{style:{width:`${SR63.clampPercent(m.success)}%`}}),(0,q.jsx)(`b`,{children:wj(m.success)})]})}),(0,q.jsx)(`td`,{className:`dept-metric-cell`,children:(0,q.jsxs)(`div`,{className:`report-meter compact tone-${SR63.metricTone(m.achievement)}`,children:[(0,q.jsx)(`i`,{style:{width:`${SR63.clampPercent(m.achievement)}%`}}),(0,q.jsx)(`b`,{children:wj(m.achievement)})]})})]},className));}const gm=bj(gradeRows,t,n.settings);body.push((0,q.jsxs)(`tr`,{className:`dept-grade-total`,children:[(0,q.jsx)(`td`,{colSpan:2,children:`على مستوى ${grade}`}),(0,q.jsx)(`td`,{children:gm.students}),(0,q.jsx)(`td`,{children:gm.evaluated}),(0,q.jsx)(`td`,{children:gm.absent+gm.excused+gm.unexcused+gm.deprived}),(0,q.jsx)(`td`,{children:gm.passed}),(0,q.jsx)(`td`,{children:gm.failed}),(0,q.jsx)(`td`,{className:`dept-metric-cell`,children:(0,q.jsxs)(`div`,{className:`report-meter compact tone-${SR63.metricTone(gm.success)}`,children:[(0,q.jsx)(`i`,{style:{width:`${SR63.clampPercent(gm.success)}%`}}),(0,q.jsx)(`b`,{children:wj(gm.success)})]})}),(0,q.jsx)(`td`,{className:`dept-metric-cell`,children:(0,q.jsxs)(`div`,{className:`report-meter compact tone-${SR63.metricTone(gm.achievement)}`,children:[(0,q.jsx)(`i`,{style:{width:`${SR63.clampPercent(gm.achievement)}%`}}),(0,q.jsx)(`b`,{children:wj(gm.achievement)})]})})]},`total-${grade}`));}
  const overall=bj(e.allRows,t,n.settings);
  return(0,q.jsxs)(q.Fragment,{children:[(0,q.jsxs)(`div`,{className:`dept-report-meta`,children:[(0,q.jsxs)(`span`,{children:[`المادة: `,(0,q.jsx)(`b`,{children:e.subject})]}),(0,q.jsxs)(`span`,{children:[`منسق المادة: `,(0,q.jsx)(`b`,{children:SR63.subjectCoordinator(n,e.subject)||'—'})]}),(0,q.jsxs)(`span`,{children:[`التقييم: `,(0,q.jsx)(`b`,{children:tj(n.settings,t).name})]})]}),(0,q.jsxs)(`table`,{className:`report-table dept-stats-table`,children:[(0,q.jsx)(`thead`,{children:(0,q.jsxs)(`tr`,{children:[`اسم المعلم`,`الشعبة`,`عدد الطلاب`,`حاضر`,`غائب`,`ناجح`,`راسب`,`نسبة النجاح`,`نسبة التحصيل`].map(h=>(0,q.jsx)(`th`,{children:h},h))})}),(0,q.jsx)(`tbody`,{children:body}),(0,q.jsx)(`tfoot`,{children:(0,q.jsxs)(`tr`,{children:[(0,q.jsx)(`th`,{colSpan:2,children:`على مستوى المادة`}),(0,q.jsx)(`th`,{children:overall.students}),(0,q.jsx)(`th`,{children:overall.evaluated}),(0,q.jsx)(`th`,{children:overall.absent+overall.excused+overall.unexcused+overall.deprived}),(0,q.jsx)(`th`,{children:overall.passed}),(0,q.jsx)(`th`,{children:overall.failed}),(0,q.jsx)(`th`,{className:`dept-metric-cell`,children:(0,q.jsxs)(`div`,{className:`report-meter compact tone-${SR63.metricTone(overall.success)}`,children:[(0,q.jsx)(`i`,{style:{width:`${SR63.clampPercent(overall.success)}%`}}),(0,q.jsx)(`b`,{children:wj(overall.success)})]})}),(0,q.jsx)(`th`,{className:`dept-metric-cell`,children:(0,q.jsxs)(`div`,{className:`report-meter compact tone-${SR63.metricTone(overall.achievement)}`,children:[(0,q.jsx)(`i`,{style:{width:`${SR63.clampPercent(overall.achievement)}%`}}),(0,q.jsx)(`b`,{children:wj(overall.achievement)})]})})]})})]})]});
}

function SRLevelAnalysisReport({page:e,exam:t,workspace:n}){
  const all=e.allRows,metric=bj(all,t,n.settings),groupDefs=[['above','فوق المتوسط'],['average','في المتوسط'],['below','دون المتوسط']],visible=new Set(e.rows.map(row=>row.id)),sections=[],overview=[];
  for(const [macro,label] of groupDefs){
    const full=all.filter(row=>{const p=vj(row,t,n.settings),band=p===null?null:yj(p,n.settings.bands);return band?.macro===macro;}),rows=full.filter(row=>visible.has(row.id)).sort((a,b)=>(vj(b,t,n.settings)??-1)-(vj(a,t,n.settings)??-1)),avg=full.length?full.reduce((sum,row)=>sum+(vj(row,t,n.settings)??0),0)/full.length:null,share=metric.evaluated?full.length/metric.evaluated*100:0;
    overview.push({macro,label,count:full.length,avg,share});if(!rows.length)continue;
    sections.push((0,q.jsxs)(q.Fragment,{children:[
      (0,q.jsxs)(`tr`,{className:`level-group-head macro-${macro}`,children:[(0,q.jsxs)(`th`,{colSpan:3,children:[(0,q.jsx)(`span`,{className:`level-group-dot`}),label]}),(0,q.jsx)(`th`,{children:`عدد الطلاب`}),(0,q.jsx)(`th`,{children:full.length}),(0,q.jsx)(`th`,{children:`معدل المجموعة`}),(0,q.jsx)(`th`,{children:avg===null?'—':wj(avg,0)})]}),
      ...rows.map((row,index)=>{const pct=vj(row,t,n.settings),band=pct===null?null:yj(pct,n.settings.bands),tone=SR63.metricTone(pct),scoreText=F9(row,t);return(0,q.jsxs)(`tr`,{className:`level-row macro-${macro}`,children:[
        (0,q.jsx)(`td`,{children:e.rowOffset+index+1}),
        (0,q.jsx)(`td`,{className:`level-student-name`,children:row.studentName}),
        (0,q.jsx)(`td`,{className:`level-score-visual`,children:(0,q.jsxs)(`div`,{className:`report-meter score tone-${tone}`,children:[(0,q.jsx)(`i`,{style:{width:`${SR63.clampPercent(pct)}%`}}),(0,q.jsx)(`b`,{children:scoreText})]})}),
        (0,q.jsx)(`td`,{className:`level-percent-visual`,children:pct===null?'—':(0,q.jsxs)(`div`,{className:`report-meter tone-${tone}`,children:[(0,q.jsx)(`i`,{style:{width:`${SR63.clampPercent(pct)}%`}}),(0,q.jsx)(`b`,{children:wj(pct,0)})]})}),
        (0,q.jsx)(`td`,{children:(0,q.jsxs)(`span`,{className:`level-macro-badge macro-${macro}`,children:[SR63.macroLabel(macro),band?.label?(0,q.jsx)(`small`,{children:band.label}):null]})}),
        (0,q.jsx)(`td`,{colSpan:2,children:``})
      ]},`${macro}-${row.id}`);})
    ]},macro));
  }
  const absent=e.rows.filter(row=>vj(row,t,n.settings)===null&&row.statuses[t]!=='unentered');
  return(0,q.jsxs)(q.Fragment,{children:[
    (0,q.jsx)(`div`,{className:`level-overview`,children:overview.map(item=>(0,q.jsxs)(`article`,{className:`macro-${item.macro}`,children:[(0,q.jsx)(`span`,{children:item.label}),(0,q.jsx)(`b`,{children:item.count}),(0,q.jsxs)(`small`,{children:[`متوسط `,item.avg===null?'—':wj(item.avg,0),` · `,wj(item.share,0),` من المقيمين`]}),(0,q.jsx)(`div`,{className:`level-overview-bar`,children:(0,q.jsx)(`i`,{style:{width:`${SR63.clampPercent(item.share)}%`}})})]},item.macro))}),
    (0,q.jsxs)(`table`,{className:`report-table level-analysis-table`,children:[
      (0,q.jsx)(`thead`,{children:(0,q.jsxs)(`tr`,{children:[(0,q.jsx)(`th`,{children:`م`}),(0,q.jsx)(`th`,{children:`اسم الطالب`}),(0,q.jsx)(`th`,{children:`الدرجة`}),(0,q.jsx)(`th`,{children:`النسبة (%)`}),(0,q.jsx)(`th`,{children:`المستوى`}),(0,q.jsx)(`th`,{children:`ملاحظات`}),(0,q.jsx)(`th`,{children:`متابعة`})]})}),
      (0,q.jsx)(`tbody`,{children:[...sections,absent.length?(0,q.jsxs)(q.Fragment,{children:[(0,q.jsx)(`tr`,{className:`level-group-head absent`,children:(0,q.jsx)(`th`,{colSpan:7,children:`طلاب لم يؤدوا الاختبار / غير مقيمين`})}),...absent.map((row,index)=>(0,q.jsxs)(`tr`,{children:[(0,q.jsx)(`td`,{children:index+1}),(0,q.jsx)(`td`,{children:row.studentName}),(0,q.jsx)(`td`,{colSpan:3,children:Dj(row.statuses[t])}),(0,q.jsx)(`td`,{colSpan:2,children:``})]},`abs-${row.id}`))]},'absent'):null]})
    ]}),
    (0,q.jsxs)(`div`,{className:`level-analysis-summary`,children:[(0,q.jsxs)(`span`,{children:[`عدد الطلاب: `,(0,q.jsx)(`b`,{children:metric.students})]}),(0,q.jsxs)(`span`,{children:[`حاضر/مقيم: `,(0,q.jsx)(`b`,{children:metric.evaluated})]}),(0,q.jsxs)(`span`,{children:[`ناجح: `,(0,q.jsx)(`b`,{children:metric.passed})]}),(0,q.jsxs)(`span`,{children:[`راسب: `,(0,q.jsx)(`b`,{children:metric.failed})]}),(0,q.jsxs)(`span`,{children:[`نسبة النجاح: `,(0,q.jsx)(`b`,{children:wj(metric.success)})]}),(0,q.jsxs)(`span`,{children:[`التحصيل: `,(0,q.jsx)(`b`,{children:wj(metric.achievement)})]})]})
  ]});
}
