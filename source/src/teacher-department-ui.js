/* 6.10.21 — standalone department report with the exact uploaded Word template. */
SR63.DepartmentQuantitativePage=function({workspace,canExport=true}){
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
 const officialFmt=(x,format)=>typeof x!=='number'?'—':format==='delta'?(x>0?'+':'')+x.toFixed(1)+' نقطة':format==='plain'?x.toFixed(x%1?1:0):x.toFixed(1)+'%';
 const officialStatus=(key,target)=>{
  const raw=targets[target],num=raw!==''?Number(raw):NaN;
  return !Number.isFinite(num)||report?.[key]===null||report?.[key]===undefined?'غير محدد':report[key]>=num?'متحقق':'غير متحقق';
 };
 const field=(label,node)=>(0,q.jsxs)('label',{className:'sr619-field',children:[(0,q.jsx)('span',{children:label}),node]});
 const selector=(value,change,options)=>(0,q.jsx)('select',{value,onChange:e=>change(e.target.value),children:options.map(([value,label])=>(0,q.jsx)('option',{value,children:label},value))});
 const download=()=>{if(!report)return;if(!canExport){setProblem('الأدمن لم يمنحك صلاحية تصدير Word.');return;}setProblem('');try{
  const doc=SR63.departmentQuantWordBuild(report,{interpretation,feedback,targets});
  const filename=SR63.teacherWordDownload(doc);
  eb.success('تم تنزيل التقرير الكمي والوصفي للقسم بصيغة Word: '+filename);
 }catch(e){setProblem(e.message||'تعذر إنشاء التقرير.');}};
 return (0,q.jsxs)('main',{className:'sr616-page sr619-teacher-center sr621-department',dir:'rtl',children:[
  (0,q.jsxs)('header',{className:'sr616-title',children:[(0,q.jsx)('h1',{children:'التقرير الكمي والوصفي للقسم كاملًا'}),
   (0,q.jsx)('p',{children:'بنفس القالب الرسمي المعتمد لتقرير المعلم: الترويسة والشعار والخطوط والألوان وترتيب التفسير والتوقيعات، مع تجميع الصفوف السابع والثامن والتاسع لكل القسم.'})]}),
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
   (0,q.jsx)('p',{className:'sr616-hint',children:'التقييم المختار: '+report.examName+(report.previousExam?' · المقارنة بالتقييم السابق مباشرةً: '+report.previousExamName:' · أول تقييم، لا توجد مقارنة سابقة أو قيمة مضافة.') }),
   (0,q.jsx)('div',{className:'sr625-report-preview',dir:'rtl',children:(0,q.jsxs)('section',{className:'sr625-report-page',children:[
    (0,q.jsxs)('header',{className:'sr631-report-preview-header',children:[
      (0,q.jsx)('img',{src:'moehe.png',alt:'شعار وزارة التربية والتعليم والتعليم العالي'}),
      (0,q.jsxs)('div',{children:[(0,q.jsx)('h3',{children:'تقرير كمي ووصفي لتحليل نتائج '+report.examName}),
       (0,q.jsx)('p',{children:report.schoolName+' — '+report.academicYear+' | القسم: '+report.departmentName})]})
    ]}),
    (0,q.jsxs)('table',{dir:'rtl',children:[
     (0,q.jsx)('thead',{children:(0,q.jsx)('tr',{children:['الشعب الدراسية / بنود التقرير','السابع','الثامن','التاسع','إجمالي المستوى','تحقيق المستهدف'].map((t,i)=>(0,q.jsx)('th',{children:t},i))})}),
     (0,q.jsx)('tbody',{children:SR63.departmentQuantitativeMetricRows(report).map(({label,key,format,target})=>(0,q.jsx)('tr',{children:[
      (0,q.jsx)('th',{scope:'row',children:label}),
      ...['7','8','9'].map(g=>(0,q.jsx)('td',{children:officialFmt(report.grades[g][key],format)},g)),
      (0,q.jsx)('td',{children:officialFmt(report[key],format)}),
      (0,q.jsx)('td',{children:officialStatus(key,target)})
     ]},key))})
    ]})
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
   (0,q.jsx)('div',{className:'sr619-actions',children:(0,q.jsx)('button',{disabled:!canExport,onClick:download,children:'تنزيل التقرير الكمي والوصفي للقسم Word'})})
  ]}):null
 ]});
};
