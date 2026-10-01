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
SR63.gradeOrder=function(value){
  const text=String(value??'');
  if(/السابع|(?:^|\D)[٧7](?:\D|$)/.test(text))return 7;
  if(/الثامن|(?:^|\D)[٨8](?:\D|$)/.test(text))return 8;
  if(/التاسع|(?:^|\D)[٩9](?:\D|$)/.test(text))return 9;
  const n=Number((text.match(/\d+/)||[])[0]);return Number.isFinite(n)?n:999;
};
SR63.gradeSubjectPages=function(rows,exam,selected='الكل'){
  const values=[...new Set(rows.map(row=>gj(row,exam)).filter(Boolean))].sort((a,b)=>SR63.gradeOrder(a)-SR63.gradeOrder(b)||String(a).localeCompare(String(b),'ar',{numeric:true}));
  return (selected==='الكل'?values:values.filter(value=>value===selected)).map(grade=>{
    const subset=rows.filter(row=>gj(row,exam)===grade);
    return {key:`subjects-grade-${grade}`,title:grade,entity:grade,scope:'grade',grade,className:'',teacher:'',subject:'كل المواد',rows:subset,allRows:subset,rowOffset:0,part:1,totalParts:1};
  });
};
SR63.gradeSubjectMatrix=function(rows,exam,settings){
  const sort=values=>[...new Set(values.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'ar',{numeric:true}));
  const classes=sort(rows.map(row=>hj(row,exam))),subjects=sort(rows.map(row=>row.subject||'غير محدد'));
  const cells=new Map();
  for(const row of rows){
    const className=hj(row,exam),subject=row.subject||'غير محدد',teacher=mj(row,exam)||'غير مربوط',key=`${className}\u0000${subject}`,list=cells.get(key)??[],teacherEntry=list.find(item=>item.teacher===teacher);
    if(teacherEntry)teacherEntry.rows.push(row);else list.push({teacher,rows:[row]});cells.set(key,list);
  }
  const teacherGroups=new Map();
  for(const row of rows){
    const teacher=mj(row,exam)||'غير مربوط',subject=row.subject||'غير محدد',key=`${teacher}\u0000${subject}`,group=teacherGroups.get(key)??{teacher,subject,rows:[]};group.rows.push(row);teacherGroups.set(key,group);
  }
  const subjectMetrics=new Map(subjects.map(subject=>[subject,bj(rows.filter(row=>(row.subject||'غير محدد')===subject),exam,settings)]));
  return {
    classes,subjects,overall:bj(rows,exam,settings),subjectMetrics,
    cell(className,subject){return (cells.get(`${className}\u0000${subject}`)??[]).map(item=>({...item,metric:bj(item.rows,exam,settings)})).sort((a,b)=>a.teacher.localeCompare(b.teacher,'ar',{numeric:true}));},
    teachers:[...teacherGroups.values()].map(group=>({...group,metric:bj(group.rows,exam,settings)})).sort((a,b)=>a.subject.localeCompare(b.subject,'ar',{numeric:true})||a.teacher.localeCompare(b.teacher,'ar',{numeric:true}))
  };
};
function SRGradeSubjectsReport({page:e,exam:t,workspace:n}){
  const data=SR63.gradeSubjectMatrix(e.allRows,t,n.settings),grade=e.grade||e.entity||'غير محدد',dense=data.subjects.length>9||data.teachers.length>12||data.classes.length>5,ultra=data.subjects.length>12||data.teachers.length>24||data.classes.length>7;
  return(0,q.jsxs)(q.Fragment,{children:[
    (0,q.jsxs)(`div`,{className:`report-meta-grid grade-subject-meta`,children:[
      (0,q.jsxs)(`b`,{children:[`الصف الدراسي: `,grade]}),
      (0,q.jsxs)(`span`,{children:[`الشعب: `,data.classes.length.toLocaleString(`ar-EG`)]}),
      (0,q.jsxs)(`span`,{children:[`المواد: `,data.subjects.length.toLocaleString(`ar-EG`),` · `,tj(n.settings,t).name]})
    ]}),
    (0,q.jsx)(`h2`,{className:`report-section-title grade-subject-title`,children:`مقارنة ${grade} بين جميع المواد`} ),
    (0,q.jsxs)(`table`,{className:`report-table grade-subject-matrix ${dense?`dense`:``} ${ultra?`ultra-dense`:``}`,children:[
      (0,q.jsx)(`thead`,{children:(0,q.jsxs)(`tr`,{children:[(0,q.jsx)(`th`,{className:`grade-class-col`,children:`الصف / الشعبة`}),...data.subjects.map(subject=>(0,q.jsx)(`th`,{children:subject},subject))]})}),
      (0,q.jsx)(`tbody`,{children:data.classes.map(className=>(0,q.jsxs)(`tr`,{children:[
        (0,q.jsx)(`td`,{className:`grade-class-name`,children:className}),
        ...data.subjects.map(subject=>{const teachers=data.cell(className,subject);return(0,q.jsx)(`td`,{children:teachers.length?teachers.map(item=>(0,q.jsxs)(`div`,{className:`grade-subject-cell`,children:[(0,q.jsx)(`b`,{children:item.teacher}),(0,q.jsxs)(`small`,{children:[`نجاح `,wj(item.metric.success),` · تحصيل `,wj(item.metric.achievement)]})]},`${subject}-${item.teacher}`)):(0,q.jsx)(`span`,{className:`grade-no-data`,children:`—`})},subject)})
      ]},className))}),
      (0,q.jsx)(`tfoot`,{children:(0,q.jsxs)(`tr`,{children:[(0,q.jsx)(`td`,{children:`متوسط المادة في ${grade}`}),...data.subjects.map(subject=>{const metric=data.subjectMetrics.get(subject);return(0,q.jsxs)(`td`,{children:[(0,q.jsxs)(`b`,{children:[`نجاح `,wj(metric.success)]}),(0,q.jsxs)(`small`,{children:[`تحصيل `,wj(metric.achievement)]})]},subject)})]})})
    ]}),
    (0,q.jsxs)(`div`,{className:`grade-overall-summary`,children:[
      (0,q.jsx)(`strong`,{children:`إجمالي ${grade} — جميع المواد`} ),
      (0,q.jsxs)(`span`,{children:[`نسبة النجاح: `,(0,q.jsx)(`b`,{children:wj(data.overall.success)})]}),
      (0,q.jsxs)(`span`,{children:[`نسبة التحصيل: `,(0,q.jsx)(`b`,{children:wj(data.overall.achievement)})]}),
      (0,q.jsxs)(`span`,{children:[`النتائج المقيمة: `,(0,q.jsx)(`b`,{children:data.overall.evaluated.toLocaleString(`ar-EG`)})]})
    ]}),
    (0,q.jsx)(`h2`,{className:`report-section-title grade-teachers-title`,children:`نسبة كل معلم في ${grade}`} ),
    (0,q.jsx)(`div`,{className:`grade-teacher-summary ${dense?`dense`:``} ${ultra?`ultra-dense`:``}`,children:data.teachers.length?data.teachers.map(item=>(0,q.jsxs)(`div`,{className:`grade-teacher-card`,children:[
      (0,q.jsxs)(`div`,{children:[(0,q.jsx)(`b`,{children:item.teacher}),(0,q.jsx)(`small`,{children:item.subject})]}),
      (0,q.jsxs)(`span`,{children:[`نجاح `,(0,q.jsx)(`b`,{children:wj(item.metric.success)})]}),
      (0,q.jsxs)(`span`,{children:[`تحصيل `,(0,q.jsx)(`b`,{children:wj(item.metric.achievement)})]})
    ]},`${item.teacher}-${item.subject}`)):(0,q.jsx)(`div`,{className:`grade-no-data`,children:`لا توجد بيانات معلمين لهذا الصف.`})})
  ]});
}
