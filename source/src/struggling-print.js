/* A student-first intervention report, using the original report header/footer and print engine. */
SR63.strugglingPrintModel=function(workspace,minimum,maximum){
 const min=SR63.number(minimum),max=SR63.number(maximum),exam=workspace.activeExam,settings=workspace.settings;
 const error=min===null||max===null||min<0||max>100||min>max?'أدخل نطاقًا صحيحًا بين 0 و100، بحيث لا يزيد الحد الأدنى على الحد الأعلى.':'';
 if(error)return {error,students:[],pages:[],subjectCount:0,min,max,exam};
 const groups=new Map();
 // Use only this workspace's authorized rows. Never fetch wider school records.
 for(const row of workspace.rows||[]){
  const percent=vj(row,exam,settings);
  if(percent===null||percent>=settings.pass)continue;
  const className=hj(row,exam)||row.className||'غير محدد',key=SR63.studentEntityKey(row,exam)+'|'+lj(className);
  if(!groups.has(key))groups.set(key,{key,studentId:SR63.studentCanonicalId(row,exam),studentName:row.studentName,className,selected:false,subjects:[],seen:new Set()});
  const student=groups.get(key),teacher=mj(row,exam)||'غير محدد',score=row.scores[exam],total=pj(row,exam,settings);
  if(percent>=min&&percent<=max)student.selected=true;
  const duplicate=JSON.stringify([SR63.subjectAliasKey(row.subject),teacher,score,total]);
  if(student.seen.has(duplicate))continue;student.seen.add(duplicate);
  student.subjects.push({subject:row.subject,teacher,score,total,percent,action:percent<30?'تدخل عاجل وخطة فردية':'دعم علاجي ومتابعة أسبوعية'});
 }
 const students=[...groups.values()].filter(s=>s.selected).sort((a,b)=>lj(a.className).localeCompare(lj(b.className),'en',{numeric:true})||String(a.studentName).localeCompare(String(b.studentName),'ar')||a.key.localeCompare(b.key));
 students.forEach(s=>{s.subjects.sort((a,b)=>SR63.reportSubjectCompare(a.subject,b.subject,settings)||a.teacher.localeCompare(b.teacher,'ar'));delete s.seen;});
 const pages=[],capacity=12;let current=null;
 for(const student of students){
  for(let start=0;start<student.subjects.length;start+=capacity){
   const subjects=student.subjects.slice(start,start+capacity);
   if(!current||current.className!==student.className||current.rowCount+subjects.length>capacity){current={className:student.className,groups:[],rowCount:0};pages.push(current);}
   current.groups.push({...student,subjects,continued:start>0});current.rowCount+=subjects.length;
  }
 }
 return {error:'',students,pages,subjectCount:students.reduce((n,s)=>n+s.subjects.length,0),min,max,exam};
};
SR63.StrugglingReportPage=function({workspace,model,page,pageIndex,generatedAt,pageRef}){
 const h=v.createElement,exam=model.exam,title='تقرير الطلاب المتعثرين ومواد الرسوب',assessment=tj(workspace.settings,exam).name;
 const rows=page.groups.flatMap(student=>student.subjects.map((item,index)=>h('tr',{key:student.key+'-'+index},
  index===0?h('td',{rowSpan:student.subjects.length,className:'sr678-student'},h('b',{},student.studentName),student.continued?h('small',{},'تابع'):null):null,
  index===0?h('td',{rowSpan:student.subjects.length},SR63.displayClass(student.className)):null,
  h('td',{},SR63.reportSubjectLabel(item.subject,workspace.settings)),h('td',{},item.teacher),
  h('td',{className:'sr678-number'},item.score+' / '+item.total),
  h('td',{className:'sr678-number'},SR63.rangePercentLabel(item.percent,{min:0,max:workspace.settings.pass,error:''})),
  h('td',{},item.action))));
 return h('section',{ref:pageRef,className:'school-report-page sr-fitted-report grade-subjects-landscape report-landscape sr678-struggling-report','data-orientation':'landscape',style:j9(workspace)},
  h('div',{className:'sr-report-fit-content'},
   h(M9,{workspace,title,subject:'كل المواد الراسب فيها',assessment}),
   h('div',{className:'report-meta-grid'},h('b',{},'الصف / الشعبة: '+SR63.displayClass(page.className)),h('span',{},'عدد الطلاب في التقرير: '+Q(model.students.length)),h('span',{},'مواد الرسوب: '+Q(model.subjectCount))),
   h('p',{className:'report-method-note'},'اختيار الطلاب: لديهم مادة راسبة بين '+model.min+'% و'+model.max+'% (شاملًا الحدين). يُعرض لكل طالب جميع مواد رسوبه في الاختبار المحدد. حد النجاح: '+workspace.settings.pass+'%.'),
   h('table',{className:'report-table sr678-struggling-table'},
    h('colgroup',{},...[23,8,14,18,8,7,22].map((width,index)=>h('col',{key:index,style:{width:width+'%'}}))),
    h('thead',{},h('tr',{},...['اسم الطالب','الصف','المادة الراسب فيها','المعلم','الدرجة / الكلية','النسبة','الإجراء المطلوب'].map(label=>h('th',{key:label},label)))),h('tbody',{},...rows)),
   h(N9,{workspace:{...workspace,reportGeneratedAt:generatedAt},subject:'',teacher:''}),
   h('span',{className:'report-page-number'},'صفحة '+(pageIndex+1)+' من '+model.pages.length)));
};
SR63.printStrugglingReport=async function(workspace,model,preparedWindow){
 let stage=null,root=null;
 try{
  if(model.error||!model.pages.length)throw Error(model.error||'لا يوجد طلاب متعثرون ضمن النطاق المحدد.');
  const generatedAt=new Date().toLocaleString('ar-EG'),html=[];
  stage=document.createElement('div');stage.style.cssText='position:fixed;left:-20000px;top:0;width:297mm;pointer-events:none;';document.body.append(stage);root=y.createRoot(stage);
  for(let pageIndex=0;pageIndex<model.pages.length;pageIndex++){
   if(preparedWindow.closed)return 0;
   await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('تعذر تجهيز التقرير. أعد المحاولة.')),15000);root.render(v.createElement(SR63.StrugglingReportPage,{key:pageIndex,workspace,model,page:model.pages[pageIndex],pageIndex,generatedAt,pageRef:node=>{if(node){clearTimeout(timer);resolve();}}}));});
   html.push(stage.querySelector('.school-report-page').outerHTML);
  }
  return await SR63.printReportBatch(html,'تقرير الطلاب المتعثرين — '+tj(workspace.settings,model.exam).name,true,preparedWindow);
 }catch(error){if(preparedWindow&&!preparedWindow.closed)preparedWindow.close();throw error;}
 finally{root?.unmount();stage?.remove();}
};
SR63.StrugglingPrintButton=function({workspace,minimum,maximum,canPrint=true}){
 const [busy,setBusy]=v.useState(false),model=v.useMemo(()=>canPrint?SR63.strugglingPrintModel(workspace,minimum,maximum):null,[workspace,minimum,maximum,canPrint]);
 if(!canPrint)return null;
 const print=async()=>{
  if(busy||model.error||!model.pages.length)return;
  const popup=window.open('','_blank');if(!popup){eb.error('فعّل السماح بالنوافذ المنبثقة للطباعة.');return;}
  popup.document.write('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>تجهيز تقرير المتعثرين</title><body>جارٍ تجهيز جميع صفحات التقرير…</body></html>');popup.document.close();
  setBusy(true);try{await SR63.printStrugglingReport(workspace,model,popup);}catch(error){eb.error(error.message||'تعذر تجهيز التقرير.');}finally{setBusy(false);}
 };
 return v.createElement('div',{className:'sr678-print-action'},v.createElement(dA,{onClick:print,disabled:busy||!!model.error||!model.pages.length,title:'طباعة كل الطلاب المطابقين للنطاق وجميع مواد رسوبهم، وليس صفحة القائمة الحالية فقط'},v.createElement(Fy,{}),busy?'جارٍ تجهيز التقرير…':'طباعة تقرير المتعثرين'),v.createElement('small',{role:model.error?'alert':undefined},model.error||(!model.students.length?'لا توجد مواد رسوب ضمن النطاق المحدد.':Q(model.students.length)+' طالب · '+Q(model.subjectCount)+' مادة راسبة · طباعة / حفظ PDF')));
};


/* 6.10.80 — school-wide failed-student statistics. Each student is counted once,
   even when several subjects are failed. All data stays within the supplied workspace. */
SR63.strugglingStatistics=function(workspace,exam=workspace.activeExam){
 const settings=workspace.settings,pass=settings.pass,students=new Map(),subjectMap=new Map(),classMap=new Map();
 const order=grade=>[7,8,9].includes(grade)?grade:0;
 const classKey=(grade,name)=>grade+'|'+lj(name);
 for(const row of workspace.rows||[]){
  const percent=vj(row,exam,settings);
  if(percent===null)continue;
  const className=hj(row,exam)||row.className||'غير محدد';
  const grade=order(SR63.gradeOrder(gj(row,exam)||className));
  const ck=classKey(grade,className);
  if(!classMap.has(ck))classMap.set(ck,{grade,className,ids:new Set()});
  const subjectKey=SR63.subjectAliasKey(row.subject)||ij(row.subject||'');
  if(subjectKey&&!subjectMap.has(subjectKey))subjectMap.set(subjectKey,{subject:row.subject,key:subjectKey,ids:new Set()});
  if(percent>=pass)continue;
  const studentKey=SR63.studentEntityKey(row,exam);
  if(!studentKey)continue;
  // A student's official academic ID wins over any repetition across subjects.
  // In inconsistent cross-class imports the first observed failing class owns the count.
  if(!students.has(studentKey))students.set(studentKey,{grade,className,ck,subjects:new Set()});
  const student=students.get(studentKey);
  if(subjectKey){subjectMap.get(subjectKey).ids.add(studentKey);student.subjects.add(subjectKey);}
 }
 const gradeMap=new Map([[7,new Set()],[8,new Set()],[9,new Set()],[0,new Set()]]);
 for(const [key,student] of students){gradeMap.get(student.grade).add(key);classMap.get(student.ck)?.ids.add(key);}
 const gradeLabels={7:'السابع',8:'الثامن',9:'التاسع',0:'غير محدد'};
 const gradeRows=[7,8,9,0].filter(g=>g!==0||gradeMap.get(g).size).map(g=>({grade:g,label:gradeLabels[g],count:gradeMap.get(g).size}));
 const subjectRows=[...subjectMap.values()].map(item=>({subject:item.subject,key:item.key,count:item.ids.size}))
  .sort((a,b)=>SR63.reportSubjectCompare(a.subject,b.subject,settings)||a.key.localeCompare(b.key,'ar'));
 const classRows=[...classMap.values()].map(item=>({grade:item.grade,gradeLabel:gradeLabels[item.grade],className:item.className,count:item.ids.size}))
  .filter(item=>item.grade!==0||item.count).sort((a,b)=>(a.grade||999)-(b.grade||999)||String(a.className).localeCompare(String(b.className),'ar',{numeric:true}));
 return {exam,pass,totalStudents:students.size,failedSubjectRecords:subjectRows.reduce((sum,item)=>sum+item.count,0),subjectRows,gradeRows,classRows};
};
SR63.StrugglingStatsContent=function({model,workspace,part='all',classChunk}){
 const h=v.createElement,number=n=>Q(n);
 const note='الأرقام لجميع النتائج الراسبة في '+tj(workspace.settings,model.exam).name+' (أقل من '+model.pass+'%) ضمن البيانات المصرح بها. الطالب يُحسب مرة واحدة في إجمالي المدرسة والصف والشعبة، ومرة واحدة في كل مادة رسب فيها. لا تُجمع أعداد المواد لاستخراج إجمالي الطلاب.';
 const stat=(label,value,key)=>h('div',{className:'sr680-stat',key},h('span',{},label),h('strong',{},number(value)));
 const gradeTable=h('table',{className:'report-table sr680-table sr680-grade-table'},
  h('thead',{},h('tr',{},h('th',{},'الصف الدراسي'),h('th',{},'طلاب متعثرون دون تكرار'))),
  h('tbody',{},...model.gradeRows.map(r=>h('tr',{key:r.grade},h('td',{},r.label),h('td',{},number(r.count))))),
  h('tfoot',{},h('tr',{},h('th',{},'إجمالي المدرسة — طلاب فريدون'),h('th',{},number(model.totalStudents)))));
 const subjectTable=h('table',{className:'report-table sr680-table sr680-subject-table'},
  h('thead',{},h('tr',{},h('th',{},'المادة الدراسية'),h('th',{},'عدد الطلاب الراسبين في المادة'))),
  h('tbody',{},...model.subjectRows.map(r=>h('tr',{key:r.key},h('td',{},SR63.reportSubjectLabel(r.subject,workspace.settings)),h('td',{},number(r.count))))),
  h('tfoot',{},h('tr',{},h('th',{},'مجموع حالات الرسوب بالمواد (قد يتكرر الطالب بين المواد)'),h('th',{},number(model.failedSubjectRecords)))));
 const classes=classChunk||model.classRows;
 const classTable=h('table',{className:'report-table sr680-table sr680-class-table'},
  h('thead',{},h('tr',{},h('th',{},'الصف الدراسي'),h('th',{},'الشعبة'),h('th',{},'الطلاب المتعثرون دون تكرار'))),
  h('tbody',{},...classes.map((r,index)=>h('tr',{key:r.className+'-'+index},h('td',{},r.gradeLabel),h('td',{},SR63.displayClass(r.className)),h('td',{},number(r.count)))));
 return h('div',{className:'sr680-statistics',dir:'rtl'},
  h('div',{className:'sr680-stat-grid'},stat('الطلاب المتعثرون في المدرسة',model.totalStudents,'students'),stat('مجموع حالات الرسوب بالمواد',model.failedSubjectRecords,'subjects'),stat('المواد في الإحصاء',model.subjectRows.length,'count')),
  h('p',{className:'report-method-note sr680-method'},note),
  part!=='classes'?h('div',{className:'sr680-overview-grid'},
   h('section',{},h('h3',{},'عدد الراسبين في كل مادة'),subjectTable),
   h('section',{},h('h3',{},'الإجمالي حسب الصف الدراسي'),gradeTable)):null,
  part==='all'?h('details',{className:'sr680-class-details'},h('summary',{},'تفصيل الطلاب المتعثرين حسب كل شعبة ('+number(model.classRows.length)+' شعبة)'),classTable):null,
  part==='classes'?h('section',{className:'sr680-classes-only'},h('h3',{},'توزيع المتعثرين حسب الشعبة'),classTable):null,
  !model.totalStudents?h('p',{className:'report-method-note'},'لا يوجد طلاب راسبون في التقييم المحدد ضمن البيانات المتاحة.'):null);
};
SR63.StrugglingStatsPanel=function({workspace}){
 const model=v.useMemo(()=>SR63.strugglingStatistics(workspace),[workspace]);
 return v.createElement('section',{className:'sr680-analytics-panel'},
  v.createElement('h2',{},'إحصاء الطلاب المتعثرين — المدرسة والمواد والشعب'),
  v.createElement(SR63.StrugglingStatsContent,{model,workspace,part:'all'}));
};
SR63.strugglingStatsPages=function(rows,exam,settings){
 const workspace={rows,activeExam:exam,settings},stats=SR63.strugglingStatistics(workspace,exam),size=16;
 const common={entity:'المدرسة',scope:'school',className:'',teacher:'',subject:'كل المواد',rows,allRows:rows,grade:'',rowOffset:0};
 const pages=[{...common,key:'struggling-stats-overview-'+exam,title:'إحصاء المتعثرين حسب المواد والصفوف',statsPart:'overview'}];
 for(let i=0;i<stats.classRows.length;i+=size)pages.push({...common,key:'struggling-stats-classes-'+i,title:'إحصاء المتعثرين حسب الشعب',statsPart:'classes',classChunk:stats.classRows.slice(i,i+size)});
 return pages.map((page,index)=>({...page,part:index+1,totalParts:pages.length}));
};
SR63.StrugglingStatsReport=function({page,exam,workspace}){
 const model=SR63.strugglingStatistics(workspace,exam);
 return v.createElement(SR63.StrugglingStatsContent,{model,workspace,part:page.statsPart,classChunk:page.classChunk});
};
