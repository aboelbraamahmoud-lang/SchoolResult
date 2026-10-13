/* 6.10.19 — interactive teacher-level improvement plans and quantitative/qualitative reports. */
SR63.TeacherPerformanceCenter=function({workspace,canExport=true,initialView='improvement'}){
 const [view,setView]=(0,v.useState)(initialView),[exam,setExam]=(0,v.useState)(workspace.activeExam),
 [teacher,setTeacher]=(0,v.useState)(''),[subject,setSubject]=(0,v.useState)(''),[cohort,setCohort]=(0,v.useState)('general'),
 [lower,setLower]=(0,v.useState)(60),[upper,setUpper]=(0,v.useState)(80),
 [actions,setActions]=(0,v.useState)({}),[narrative,setNarrative]=(0,v.useState)({}),
 [targets,setTargets]=(0,v.useState)({success:90,achievement:75,valueAdded:3,high90:30}),
 [feedback,setFeedback]=(0,v.useState)(''),[problem,setProblem]=(0,v.useState)(''),[selectedClass,setSelectedClass]=(0,v.useState)('');
 const choices=(0,v.useMemo)(()=>SR63.teacherPerformanceChoices(workspace,exam),[workspace,exam]);
 const teacherNames=[...new Set(choices.map(x=>x.teacher))],currentTeacher=teacherNames.includes(teacher)?teacher:teacherNames[0]||'';
 const subjectChoices=choices.filter(x=>x.teacher===currentTeacher),picked=subjectChoices.find(x=>SR63.subjectAliasKey(x.subject)===SR63.subjectAliasKey(subject))||subjectChoices[0];
 const currentSubject=picked?.subject||'';
 (0,v.useEffect)(()=>{setActions({});setNarrative({});setProblem('');},[currentTeacher,currentSubject,exam,cohort]);
 const calculated=(0,v.useMemo)(()=>{let analysis=null,fullAnalysis=null,analysisError='';
  try{if(view!=='department'&&currentTeacher&&currentSubject){
   fullAnalysis=SR63.teacherPerformanceAnalyze(workspace,{teacher:currentTeacher,subject:currentSubject,exam,cohort,lower,upper});
   const className=fullAnalysis.groups.some(g=>g.className===selectedClass)?selectedClass:fullAnalysis.groups[0]?.className;
   analysis=view==='improvement'?SR63.teacherPerformanceAnalyze(workspace,{teacher:currentTeacher,subject:currentSubject,exam,cohort,lower,upper,className}):fullAnalysis;
  }}catch(e){analysisError=e.message||'تعذر تحليل النتائج.';}return{analysis,fullAnalysis,analysisError};
 },[workspace,view,currentTeacher,currentSubject,exam,cohort,lower,upper,selectedClass]);
 const {analysis,fullAnalysis,analysisError}=calculated;
 const preset=currentSubject?SR63.teacherImprovementDefaults(currentSubject):{},editActions={...preset,...actions};
 const form=(title,node)=>(0,q.jsxs)('label',{className:'sr619-field',children:[(0,q.jsx)('span',{children:title}),node]});
 const select=(value,change,entries)=>(0,q.jsx)('select',{value,onChange:e=>change(e.target.value),children:entries.map(([key,label])=>(0,q.jsx)('option',{value:key,children:label},key))});
 const textarea=(value,onChange,rows=3)=>(0,q.jsx)('textarea',{rows,value,onChange:e=>onChange(e.target.value),maxLength:2500});
 const nf=(val)=>val===null?'—':val.toFixed(1)+'%',df=(val)=>val===null?'—':(val>0?'+':'')+val.toFixed(1)+' نقطة';
 const officialRows=analysis?SR63.teacherQuantitativeMetricRows(analysis):[];
 const officialFmt=(value,format)=>value===null||value===undefined?'—':format==='plain'?Number(value).toFixed(Number(value)%1?1:0):format==='delta'?(value>0?'+':'')+Number(value).toFixed(1)+' نقطة':Number(value).toFixed(1)+'%';
 const officialStatus=(key,targetKey)=>analysis?.[key]===null||analysis?.[key]===undefined?'—':Number(analysis[key])>=Number(targets[targetKey])?'متحقق':'غير متحقق';
 const officialGroups=analysis?Array.from({length:Math.ceil(analysis.groups.length/3)},(_,i)=>analysis.groups.slice(i*3,i*3+3)):[];
 const download=async(kind)=>{if(!analysis)return;if(!canExport){setProblem('الأدمن لم يمنحك صلاحية تصدير ملفات Word.');return;}setProblem('');try{
   await SR63.loadWordTemplate(kind==='improvement'?'improvement':'reference');
   const file=kind==='improvement'?SR63.teacherImprovementWordBuild(analysis,editActions):SR63.teacherQuantitativeWordBuild(analysis,{...narrative,targets,feedback});
   const name=SR63.teacherWordDownload(file);eb.success('تم تجهيز ملف Word: '+name);
  }catch(e){setProblem(e.message||'تعذر تنزيل التقرير.');}};
 const bandLabels={low:'متدني',middle:'متوسط',high:'مرتفع',missing:'غير محتسب'};
 const labelMap={low:'الطلبة ذوو الأداء المتدني',middle:'الطلبة ذوو الأداء المتوسط',high:'الطلبة ذوو الأداء المرتفع'};
 const actionFields=['Goal','Actions','Indicator'],actionFieldLabels={Goal:'الأهداف المنشودة',Actions:'آلية التدخل والإجراءات',Indicator:'المخرجات الكمية المتوقعة'};
 // A single navigation surface contains all three official reports; department report remains a standalone component internally.
 const reportTabs=(0,q.jsxs)('nav',{className:'sr619-tabs',role:'tablist','aria-label':'أنواع خطط تحسين الأداء والتقارير الكمية والوصفية',children:[
   (0,q.jsx)('button',{type:'button',role:'tab','aria-selected':view==='improvement',className:view==='improvement'?'active':'',onClick:()=>setView('improvement'),children:'خطة تحسين الأداء الشاملة'}),
   (0,q.jsx)('button',{type:'button',role:'tab','aria-selected':view==='quantitative',className:view==='quantitative'?'active':'',onClick:()=>setView('quantitative'),children:'التقرير الكمي والوصفي للمعلم'}),
   (0,q.jsx)('button',{type:'button',role:'tab','aria-selected':view==='department',className:view==='department'?'active':'',onClick:()=>setView('department'),children:'التقرير الكمي والوصفي للقسم'})]});
 if(view==='department')return (0,q.jsxs)('div',{className:'sr619-combined-center',dir:'rtl',children:[reportTabs,(0,q.jsx)(SR63.DepartmentQuantitativePage,{workspace,canExport})]});
 return (0,q.jsxs)('main',{className:'sr616-page sr619-teacher-center',dir:'rtl',children:[
  (0,q.jsxs)('header',{className:'sr616-title',children:[(0,q.jsx)('h1',{children:'خطط تحسين الأداء والتقارير الكمية والوصفية'}),(0,q.jsx)('p',{children:'اختر خطة تحسين الأداء لشعبة كاملة أو التقرير الكمي والوصفي للمعلم أو القسم، مع الحفاظ على قوالب Word المعتمدة.'})]}),
  reportTabs,
  (0,q.jsxs)('section',{className:'sr619-card',children:[(0,q.jsx)('h2',{children:'1. اختيار المعلم وبيانات الاختبار'}),
   (0,q.jsx)('div',{className:'sr619-grid',children:[
    form('التقييم',select(exam,setExam,XA.map(x=>[x,tj(workspace.settings,x).name]))),
    form('اسم المعلم',select(currentTeacher,x=>{setTeacher(x);setSubject('')},teacherNames.map(t=>[t,t]))),
    form('المادة',select(currentSubject,setSubject,subjectChoices.map(x=>[x.subject,x.subjectLabel]))),
    form('فئة الطلاب',select(cohort,setCohort,[['general','التعليم العام'],['support','طلاب الدعم الإضافي (الدمج)']]))
   ]}),
   (0,q.jsx)('p',{className:'sr616-hint',children:'تُستخرج الشعب تلقائيًا من سجلات المعلم في الاختبار المحدد. المقارنة مع الاختبار السابق تتم للطالب نفسه، ولا تُعدّ البيانات المفقودة درجة صفر.'}),
   analysis?(0,q.jsxs)('div',{className:'sr619-stats',children:[
    ...[['الطلاب',analysis.studentCount],['الشعب',analysis.groups.length],['النتائج الحاضرة',analysis.evaluated],['نجاح',nf(analysis.success)],['تحصيل',nf(analysis.achievement)],['القيمة المضافة',df(analysis.valueAdded)]].map(([a,b])=>(0,q.jsxs)('div',{children:[(0,q.jsx)('span',{children:a}),(0,q.jsx)('strong',{children:b})]},a))
   ]}):null,
   analysisError?(0,q.jsx)('p',{className:'sr619-notice',children:analysisError}):null
  ]}),
  analysis?(view==='improvement'?(0,q.jsxs)('section',{className:'sr619-card',children:[
    (0,q.jsx)('h2',{children:'2. خطة تحسين الأداء — للشعبة كاملة'}),
    fullAnalysis?(0,q.jsxs)('div',{className:'sr619-grid',children:[form('حدد الشعبة لإصدار خطة مستقلة لجميع طلابها',select(analysis?.groups[0]?.className||'',setSelectedClass,fullAnalysis.groups.map(g=>[g.className,g.className+' — '+g.students.length+' طالبًا']))) ]}):null,
    (0,q.jsx)('div',{className:'sr619-grid sr619-limits',children:[
      form('نهاية المستوى المتدني (%)',(0,q.jsx)('input',{type:'number',value:lower,min:1,max:95,onChange:e=>setLower(e.target.value)})),
      form('بداية المستوى المرتفع (%)',(0,q.jsx)('input',{type:'number',value:upper,min:5,max:100,onChange:e=>setUpper(e.target.value)}))
    ]}),
    (0,q.jsx)('div',{className:'sr619-band-grid',children:Object.entries(bandLabels).map(([key,label])=>(0,q.jsxs)('div',{children:[(0,q.jsx)('span',{children:label}),(0,q.jsx)('strong',{children:analysis.bands[key].length}),(0,q.jsx)('small',{children:key==='missing'?'لا تُحوّل إلى صفر':`طالبًا ضمن المستوى`})]},key))}),
    (0,q.jsx)('p',{className:'sr616-hint',children:analysis.prevExamName?'الاختبار السابق: '+analysis.prevExamName+' · القياس بنقاط مئوية بين نتائج الطالب الحاضرة في التقييمين.':'هذا أول اختبار في التسلسل، لذلك لا توجد مقارنة سابقة.'}),
    (0,q.jsxs)('div',{className:'sr619-table-wrap',children:[(0,q.jsx)('h3',{children:'معاينة جميع طلاب الشعبة حسب المستويات'}),
      (0,q.jsxs)('table',{children:[(0,q.jsx)('thead',{children:(0,q.jsxs)('tr',{children:['المستوى','اسم الطالب','الشعبة','السابق','الحالي','التغير'].map(h=>(0,q.jsx)('th',{children:h},h))})}),
      (0,q.jsx)('tbody',{children:analysis.students.slice(0,100).map(s=>(0,q.jsxs)('tr',{children:[(0,q.jsx)('td',{children:bandLabels[s.band]}),(0,q.jsx)('td',{children:s.studentName}),(0,q.jsx)('td',{children:s.className}),(0,q.jsx)('td',{children:nf(s.previous)}),(0,q.jsx)('td',{children:nf(s.current)}),(0,q.jsx)('td',{children:df(s.change)})]},s.studentId+'|'+s.className))})]})]}),
    analysis.students.length>100?(0,q.jsx)('p',{className:'sr616-hint',children:'تعرض المعاينة أول 100 طالب، بينما ملف Word يتضمن جميع الطلاب دون حذف.'}):null,
    ...['low','middle','high'].map(key=>(0,q.jsxs)('section',{className:'sr619-edit-band',children:[(0,q.jsx)('h3',{children:labelMap[key]}),
      ...actionFields.map(field=>form(actionFieldLabels[field],textarea(editActions[key+field]||'',x=>setActions(a=>({...a,[key+field]:x})),field==='Actions'?5:2)))]},key)),
    (0,q.jsxs)('div',{className:'sr619-actions',children:[
      (0,q.jsx)('button',{disabled:!canExport,onClick:()=>download('improvement'),children:'تنزيل خطة تحسين الأداء Word — لجميع طلاب الشعبة'}),
      (0,q.jsx)('button',{className:'secondary',onClick:()=>setActions({}),children:'استعادة الإجراءات المقترحة للمادة'})]})
  ]}):(0,q.jsxs)('section',{className:'sr619-card',children:[
   (0,q.jsx)('h2',{children:'2. التقرير الكمي والوصفي لجميع شعب المعلم'}),
   (0,q.jsx)('p',{className:'sr616-hint',children:'تعرض الجداول بيانات النجاح والتحصيل والقيمة المضافة مقارنة بالاختبار السابق، مع إمكانية تعديل النص الوصفي قبل التصدير.'}),
   (0,q.jsx)('p',{className:'sr616-hint',children:'التقييم المختار: '+analysis.examName+(analysis.prevExam?' · التقييم السابق مباشرةً: '+analysis.prevExamName:' · هذا أول تقييم، لذلك لا يظهر تحصيل سابق أو قيمة مضافة.')+' · تنعكس المسميات والدرجات على المعاينة وملف Word معًا. يُصدر Word صفحة مستقلة لكل ثلاث شعب، مع شعار الوزارة والتوقيعات.'}),
   (0,q.jsx)('div',{className:'sr625-report-preview',dir:'rtl',children:officialGroups.map((chunk,page)=>(0,q.jsxs)('section',{className:'sr625-report-page',children:[
    officialGroups.length>1?(0,q.jsx)('h3',{children:'الشعب — صفحة '+(page+1)}):null,
    (0,q.jsxs)('header',{className:'sr631-report-preview-header',children:[
      (0,q.jsx)('img',{src:'moehe.png',alt:'شعار وزارة التربية والتعليم والتعليم العالي'}),
      (0,q.jsxs)('div',{children:[(0,q.jsx)('h3',{children:'تقرير كمي ووصفي لتحليل نتائج '+analysis.examName}),
       (0,q.jsx)('p',{children:analysis.schoolName+' — '+analysis.academicYear+' | المعلم: '+analysis.teacher+' | المادة: '+analysis.subjectLabel})]})
    ]}),
    (0,q.jsxs)('table',{dir:'rtl',children:[
      (0,q.jsx)('thead',{children:(0,q.jsx)('tr',{children:['الشعب الدراسية / بنود التقرير',...Array.from({length:3},(_,i)=>chunk[i]?.className||'—'),'إجمالي المستوى','تحقيق المستهدف'].map((title,i)=>(0,q.jsx)('th',{children:title},i))})}),
      (0,q.jsx)('tbody',{children:officialRows.map(({key,label,format,target})=>(0,q.jsx)('tr',{children:[
        (0,q.jsx)('th',{scope:'row',children:label}),
        ...Array.from({length:3},(_,i)=>(0,q.jsx)('td',{children:chunk[i]?officialFmt(chunk[i][key],format):'—'},i)),
        (0,q.jsx)('td',{children:officialFmt(analysis[key],format)}),
        (0,q.jsx)('td',{children:officialStatus(key,target)})
      ]},key))})
    ]})
   ]},page))}),
   (0,q.jsx)('h3',{children:'حدود المستهدفات — يمكن تعديلها'}),
   (0,q.jsx)('div',{className:'sr619-grid',children:[
     ...[['success','مستهدف نسبة النجاح (%)'],['achievement','مستهدف التحصيل (%)'],['valueAdded','مستهدف القيمة المضافة (نقطة)'],['high90','مستهدف الحاصلين على 90% فأعلى (%)']].map(([key,title])=>form(title,(0,q.jsx)('input',{type:'number',min:key==='valueAdded'?-100:0,max:100,step:.1,value:targets[key],onChange:e=>setTargets(t=>({...t,[key]:e.target.value}))})))
   ]}),
   (0,q.jsx)('h3',{children:'3. تفسير النتائج والتغذية الراجعة (قابل للتحرير)'}),
   form('تفسير النتائج وفق البيانات',textarea(narrative.interpretation??SR63.teacherReportNarrative(analysis),x=>setNarrative(y=>({...y,interpretation:x})),5)),
   form('التحديات والتشخيص',textarea(narrative.challenges??`يوجد ${analysis.bands.low.length} طالبًا بالأداء المتدني و${analysis.bands.middle.length} طالبًا بالأداء المتوسط، و${analysis.bands.missing.length} حالة غير مرصودة. لا تجزم بأسباب التعثر دون تشخيص موثق.`,x=>setNarrative(y=>({...y,challenges:x})),3)),
   form('الحلول والإجراءات',textarea(narrative.solutions??'اختبار تشخيصي، أوراق عمل متدرجة، متابعة أسبوعية، تعلم تعاوني، أنشطة إثرائية، ثم تقويم بعدي لقياس الأثر.',x=>setNarrative(y=>({...y,solutions:x})),3)),
   form('تغذية راجعة من منسق المادة',textarea(feedback,setFeedback,3)),
   (0,q.jsxs)('div',{className:'sr619-actions',children:[(0,q.jsx)('button',{disabled:!canExport,onClick:()=>download('quantitative'),children:'تنزيل التقرير الكمي والوصفي Word'})]})
  ]})):null,
  problem?(0,q.jsx)('p',{className:'sr619-notice',children:problem}):null,
  (0,q.jsx)('p',{className:'sr616-hint',children:'ملفات Word تُنشأ محليًا داخل المتصفح، ولا تُرسل أسماء الطلاب إلى Gemini. لا تُغيّر هذه الشاشة درجات الطلاب أو نتائجهم، ويجب مراجعة التفسيرات والأهداف واعتمادها تربويًا.'})
 ]});
};
