/* 6.10.21 — standalone department report with the exact uploaded Word template. */
SR63.DepartmentQuantitativePage=function({workspace}){
 const [exam,setExam]=(0,v.useState)(workspace.activeExam),[subject,setSubject]=(0,v.useState)(''),
 [cohort,setCohort]=(0,v.useState)('general'),[interpretation,setInterpretation]=(0,v.useState)(''),
 [feedback,setFeedback]=(0,v.useState)(''),[targets,setTargets]=(0,v.useState)({success:'',achievement:'',valueAdded:'',high90:''}),
 [problem,setProblem]=(0,v.useState)('');
 const choices=(0,v.useMemo)(()=>SR63.departmentPerformanceChoices(workspace,exam),[workspace,exam]);
 const selected=choices.find(x=>x.key===SR63.subjectAliasKey(subject))||choices[0];
 const currentSubject=selected?.subject||'';
 (0,v.useEffect)(()=>{setInterpretation('');setFeedback('');setProblem('');},[exam,currentSubject,cohort]);
 let report=null,error='';
 try{if(currentSubject)report=SR63.departmentPerformanceAnalyze(workspace,{exam,subject:currentSubject,cohort});}
 catch(ex){error=ex.message||'تعذر تحليل نتائج القسم.';}
 const nf=x=>typeof x==='number'?x.toFixed(1)+'%':'—',df=x=>typeof x==='number'?(x>0?'+':'')+x.toFixed(1)+' نقطة':'—';
 const field=(label,node)=>(0,q.jsxs)('label',{className:'sr619-field',children:[(0,q.jsx)('span',{children:label}),node]});
 const selector=(value,change,options)=>(0,q.jsx)('select',{value,onChange:e=>change(e.target.value),children:options.map(([value,label])=>(0,q.jsx)('option',{value,children:label},value))});
 const download=()=>{if(!report)return;setProblem('');try{
  const doc=SR63.departmentQuantWordBuild(report,{interpretation,feedback,targets});
  const filename=SR63.teacherWordDownload(doc);
  eb.success('تم تنزيل التقرير الكمي والوصفي للقسم بصيغة Word: '+filename);
 }catch(e){setProblem(e.message||'تعذر إنشاء التقرير.');}};
 return (0,q.jsxs)('main',{className:'sr616-page sr619-teacher-center sr621-department',dir:'rtl',children:[
  (0,q.jsxs)('header',{className:'sr616-title',children:[(0,q.jsx)('h1',{children:'التقرير الكمي والوصفي للقسم كاملًا'}),
   (0,q.jsx)('p',{children:'وفق النموذج الوزاري المرفق: الصفوف السابع والثامن والتاسع، وجميع شعب المادة والمعلمين. ملف Word عربي قابل للتحرير بنمط النموذج الأصلي وشعار الوزارة.'})]}),
  (0,q.jsxs)('section',{className:'sr619-card',children:[(0,q.jsx)('h2',{children:'تحديد القسم والتقييم'}),
   (0,q.jsx)('div',{className:'sr619-grid',children:[
    field('التقييم',selector(exam,setExam,XA.map(x=>[x,tj(workspace.settings,x).name]))),
    field('القسم / المادة الدراسية',selector(currentSubject,setSubject,choices.map(x=>[x.subject,x.label]))),
    field('فئة الطلاب',selector(cohort,setCohort,[['general','التعليم العام — السابع والثامن والتاسع'],['support','طلاب الدمج — تقرير مستقل']]))
   ]}),
   (0,q.jsx)('p',{className:'sr616-hint',children:'يشمل التقرير جميع معلمي القسم وشعبه، ويحتسب الطالب مرة واحدة في مادته. تُستبعد حالات الغياب وعدم الرصد من مقام النسب، وتقتصر القيمة المضافة على أصحاب نتيجتين مرصودتين.'}),
   error?(0,q.jsx)('p',{className:'sr619-notice',children:error}):null
  ]}),
  report?(0,q.jsxs)('section',{className:'sr619-card',children:[
   (0,q.jsx)('h2',{children:'معاينة المؤشرات حسب الصفوف الدراسية'}),
   (0,q.jsx)('div',{className:'sr619-table-wrap',children:
    (0,q.jsxs)('table',{children:[
     (0,q.jsx)('thead',{children:(0,q.jsx)('tr',{children:['بند التقرير','السابع','الثامن','التاسع','إجمالي القسم'].map(t=>(0,q.jsx)('th',{children:t},t))})}),
     (0,q.jsx)('tbody',{children:[
      ['نسبة النجاح في الاختبار','success',nf],['نسبة التحصيل الأكاديمي','achievement',nf],['القيمة المضافة بين التقييمات','valueAdded',df],['نسبة الحاصلين على 90% فأعلى','high90',nf]
     ].map(([label,key,format])=>(0,q.jsx)('tr',{children:[(0,q.jsx)('td',{children:label}),...['7','8','9'].map(g=>(0,q.jsx)('td',{children:format(report.grades[g][key])},g)),(0,q.jsx)('td',{children:format(report[key])})]},key))})
    ]})}),
   (0,q.jsx)('p',{className:'sr616-hint',children:`الطلاب: ${report.studentCount} | نتائج مرصودة: ${report.evaluated} | حالات دون درجة محتسبة: ${report.ungraded} | عينة المقارنة: ${report.compared} طالبًا. عدد الشعب: ${['7','8','9'].map(g=>report.grades[g].classes.length).join('، ')} على الترتيب.`}),
   (0,q.jsx)('h3',{children:'المستهدفات وفق الخطة التشغيلية للمدرسة'}),
   (0,q.jsx)('p',{className:'sr616-hint',children:'لا يُحكم على تحقيق المستهدف إلا بعد إدخال القيمة المعتمدة من المدرسة. لا تُحفظ المستهدفات افتراضيًا ولا يُفترض تحققها.'}),
   (0,q.jsx)('div',{className:'sr619-grid',children:[
    ...[['success','مستهدف نسبة النجاح (%)'],['achievement','مستهدف نسبة التحصيل (%)'],['valueAdded','مستهدف القيمة المضافة (نقطة مئوية)'],['high90','مستهدف نسبة المتفوقين ≥90%']].map(([k,label])=>field(label,(0,q.jsx)('input',{type:'number',step:'0.1',min:k==='valueAdded'?-100:0,max:100,placeholder:'وفق الخطة التشغيلية',value:targets[k],onChange:e=>setTargets(old=>({...old,[k]:e.target.value}))})))
   ]}),
   (0,q.jsx)('h3',{children:'تفسير النتائج (الأسباب / التحديات / الحلول)'}),
   field('نص التفسير — قابل للتعديل أو اتركه فارغًا ليستخدم البرنامج الوصف المستخرج من المؤشرات',(0,q.jsx)('textarea',{rows:5,maxLength:3500,value:interpretation,placeholder:SR63.departmentNarrative(report),onChange:e=>setInterpretation(e.target.value)})),
   (0,q.jsx)('h3',{children:'التغذية الراجعة من نائب المدير للشؤون الأكاديمية'}),
   field('التغذية الراجعة — تُترك فارغة ليكتبها المسؤول إن لم تُقدَّم',(0,q.jsx)('textarea',{rows:3,maxLength:2200,value:feedback,placeholder:'يُكتب هنا نص التغذية الراجعة عند الاعتماد.',onChange:e=>setFeedback(e.target.value)})),
   problem?(0,q.jsx)('p',{className:'sr619-notice',children:problem}):null,
   (0,q.jsx)('div',{className:'sr619-actions',children:(0,q.jsx)('button',{onClick:download,children:'تنزيل التقرير الكمي والوصفي للقسم Word'})})
  ]}):null
 ]});
};
