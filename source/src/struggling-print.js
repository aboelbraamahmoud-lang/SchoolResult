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
 const rows=page.groups.flatMap(student=>student.subjects.map((item,index)=>h('tr',{key:student.key+'-'+index,'data-student-id':student.studentId},
  index===0?h('td',{rowSpan:student.subjects.length,className:'sr678-student'},h('b',{},student.studentName),h('small',{},student.studentId),student.continued?h('small',{},'تابع'):null):null,
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
    h('thead',{},h('tr',{},...['الطالب / الرقم الأكاديمي','الصف','المادة الراسب فيها','المعلم','الدرجة / الكلية','النسبة','الإجراء المطلوب'].map(label=>h('th',{key:label},label)))),h('tbody',{},...rows)),
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
