/* 6.9.10 — Ministry emblem embedded into runtime by the build from the repository asset. */
SR63.moeheEmblemData='__MOEHE_EMBLEM_DATA__';
/* PATCH Tv */
function Tv(book,filename,options){const opts=options||{};SR63.formatWorkbook(book);opts.type='file';opts.file=filename;wv(opts);return Cv(book,opts);}
/* PATCH gm */
function gm(sheet,options,index,book){
  const attrs={workbookViewId:'0'};if(book?.Workbook?.Views?.[0])attrs.rightToLeft=book.Workbook.Views[0].RTL?'1':'0';
  const frozen=sheet['!srFreeze'];const pane=frozen?U('pane',null,{ySplit:String(frozen),topLeftCell:'A'+(frozen+1),activePane:'bottomLeft',state:'frozen'}):null;
  return U('sheetViews',U('sheetView',pane,attrs),{});
}
/* PATCH M9 */
function M9({workspace:e,title:t,subject:n,assessment:r}){
  const design=e.settings.reportDesign,jsx=q.jsx,jsxs=q.jsxs;
  return jsxs(q.Fragment,{children:[
    jsxs('div',{className:'report-head report-head-compact',children:[
      jsx('div',{className:'report-ministry-lockup report-ministry-lockup-official',children:
        jsx('img',{src:SR63.moeheEmblemData,alt:'شعار وزارة التربية والتعليم والتعليم العالي',className:'report-ministry-emblem report-ministry-emblem-official'})
      }),
      jsxs('div',{className:'report-school-lockup',children:[
        design.showLogo&&(design.logoDataUrl?jsx('img',{src:design.logoDataUrl,alt:'شعار المدرسة',className:'report-logo-image report-school-logo'}):jsx('span',{className:'report-brand-mark report-school-mark',children:design.logoLetter})),
        jsxs('div',{className:'report-identity report-identity-compact',children:[
          jsxs('p',{children:[jsx('span',{children:design.schoolLabel}),jsx('b',{children:e.settings.schoolName})]}),
          jsxs('p',{children:[jsx('span',{children:design.yearLabel}),jsx('b',{children:e.settings.academicYear})]})
        ]})
      ]})
    ]}),
    jsx('h1',{className:'report-title',children:t}),
    jsxs('div',{className:'report-context report-context-compact',children:[
      jsxs('p',{children:[jsx('span',{children:design.assessmentLabel}),jsx('b',{children:r})]}),
      jsxs('p',{children:[jsx('span',{children:design.subjectLabel}),jsx('b',{children:n})]}),
      n&&n!=='كل المواد'&&n!=='الكل'&&SR63.subjectCoordinator(e,n)?jsxs('p',{className:'report-coordinator',children:[jsx('span',{children:'منسق المادة'}),jsx('b',{children:SR63.subjectCoordinator(e,n)})]}):null
    ]}),
    jsx('p',{className:'sr-report-status sr-report-status-compact',children:SR63.reportStatus(e,r,n)})
  ]});
}
/* PATCH Nde.Ae */
function Ae(){
  const book=Gv.book_new(),summary=Sj(e.rows,'className',e.activeExam,e.settings,xe).map(group=>({'الصف/الشعبة':group.name,'طلاب فريدون':group.metric.students,'نتائج مقيمة':group.metric.evaluated,'نتائج ناجحة':group.metric.passed,'نتائج راسبة':group.metric.failed,'نسبة النجاح':group.metric.success===null?null:group.metric.success/100,'نسبة التحصيل':group.metric.achievement===null?null:group.metric.achievement/100,'القيمة المضافة':group.va?.delta??null,'حجم عينة المقارنة':group.va?.paired??0}));
  Gv.book_append_sheet(book,Gv.json_to_sheet(summary),'ملخص الصفوف');
  const rows=e.rows.map(row=>({'الرقم الأكاديمي':row.studentId,'اسم الطالب':row.studentName,'الصف':gj(row,e.activeExam),'الشعبة':hj(row,e.activeExam),'القسم':row.department,'المادة':row.subject,'المعلم':mj(row,e.activeExam),...Object.fromEntries(XA.flatMap(exam=>[[`معلم ${tj(e.settings,exam).name}`,mj(row,exam)],[`شعبة ${tj(e.settings,exam).name}`,hj(row,exam)],[`درجة ${tj(e.settings,exam).name}`,row.scores[exam]],[`الدرجة الكلية ${tj(e.settings,exam).name}`,pj(row,exam,e.settings)],[`حالة ${tj(e.settings,exam).name}`,row.statuses[exam]==='excused'?'غياب بعذر':Dj(row.statuses[exam])]]))}));
  Gv.book_append_sheet(book,Gv.json_to_sheet(rows),'درجات الطلاب');
  Gv.book_append_sheet(book,Gv.aoa_to_sheet([['المفتاح','البيان','القيمة'],['school_name','اسم المدرسة',e.settings.schoolName],['academic_year','العام الأكاديمي',e.settings.academicYear],...e.settings.exams.flatMap(exam=>[[exam.key+'_name','اسم الاختبار',exam.name],[exam.key+'_total','الدرجة الكلية',exam.total]])]),'الإعدادات');
  Gv.book_append_sheet(book,Gv.json_to_sheet(e.teacherAssignments.map(assignment=>({'اسم المعلم':assignment.teacher,'المادة':assignment.subject,'القسم':assignment.department,'منسق المادة':SR63.subjectCoordinator(e,assignment.subject),'الصف والشعبة':assignment.className}))),'إسناد المعلمين');
  SR63.exportContext=[['نطاق التصدير','شامل — جميع السجلات والاختبارات']];Tv(book,'تقارير-نتائج-المدرسة.xlsx');
}
