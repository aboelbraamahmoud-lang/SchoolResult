/* SchoolResult — top ten DISTINCT ranks by grade/class and subject. Calculated only when selected. */
SR63.studentTopOrdinal=function(rank){
 const names=["الأول","الثاني","الثالث","الرابع","الخامس","السادس","السابع","الثامن","التاسع","العاشر"];
 return names[rank-1]||String(rank);
};
SR63.studentTopRankings=function(workspace,options={}){
 const exam=options.exam||workspace.activeExam, settings=workspace.settings||{}, mode=options.mode==="subject"?"subject":"grade";
 const groupType=options.groupType==="class"?"class":"grade",gradeFilter=options.grade||"الكل",classFilter=options.className||"الكل";
 const onlyComplete=options.onlyComplete===true;
 const subjectFilter=options.subject&&options.subject!=="الكل"?SR63.subjectAliasKey(options.subject):"";
 // Apply the existing student identity reconciliation used by the official student results.
 // Missing grades are NOT zero and are NOT a reason to silently drop an otherwise ranked student.
 const reconciled=SR63.reconcileStudentRows(workspace.rows||[]);
 const groups=new Map(),general=SR63.generalRows(reconciled,exam);
 const gradeKey=value=>{const label=String(value||"").trim(),number=SR63.gradeOrder(label);return Number.isInteger(number)&&number>0&&number<999?"grade:"+number:ij(label);};
 for(const row of general){
  const grade=String(gj(row,exam)||row.grade||"").trim(),className=String(hj(row,exam)||row.className||"").trim(),name=String(row.studentName||"").trim();
  const subject=String(row.subject||"").trim(),subjectKey=SR63.subjectAliasKey(subject);
  if(!grade||!name||!subjectKey||groupType==="class"&&!className)continue;
  if(gradeFilter!=="الكل"&&gradeKey(grade)!==gradeKey(gradeFilter))continue;
  if(groupType==="class"&&classFilter!=="الكل"&&lj(className)!==lj(classFilter))continue;
  if(subjectFilter&&mode==="subject"&&subjectKey!==subjectFilter)continue;
  // The whole grade is ONE group across all its classes; avoid grade label variants splitting it.
  const groupId=gradeKey(grade)+"|"+(groupType==="class"?lj(className):"")+"|"+(mode==="subject"?subjectKey:"");
  if(!groups.has(groupId))groups.set(groupId,{grade,className:groupType==="class"?className:"",subject:mode==="subject"?subject:"",students:new Map(),required:new Map()});
  const group=groups.get(groupId),studentKey=SR63.studentEntityKey(row,exam);
  if(!studentKey)continue;
  if(!group.students.has(studentKey))group.students.set(studentKey,{studentId:SR63.studentCanonicalId(row,exam),studentName:name,className,bySubject:new Map()});
  const student=group.students.get(studentKey),valid=SR63.validResult(row,exam,settings)&&row.statuses?.[exam]==="present";
  if(valid&&!group.required.has(subjectKey))group.required.set(subjectKey,subject);
  const previous=student.bySubject.get(subjectKey);
  const score=valid?row.scores[exam]:null,total=valid?pj(row,exam,settings):null;
  if(!previous)student.bySubject.set(subjectKey,{valid,score,total,conflict:false});
  else if(valid&&previous.valid&&(previous.score!==score||previous.total!==total))previous.conflict=true;
  else if(valid&&!previous.valid)student.bySubject.set(subjectKey,{valid,score,total,conflict:false});
 }
 const output=[];
 for(const group of groups.values()){
  const required=[...group.required.keys()],eligible=[];let excluded=0,incompleteCount=0,unscoredCount=0,conflictCount=0;
  if(!required.length)continue;
  for(const student of group.students.values()){
   const records=required.map(key=>student.bySubject.get(key));
   const conflict=records.some(record=>record?.conflict===true);
   if(conflict){excluded++;conflictCount++;continue;}
   const measured=records.filter(record=>record?.valid===true);
   if(!measured.length){excluded++;unscoredCount++;continue;}
   const complete=measured.length===required.length;
   if(!complete)incompleteCount++;
   if(!complete&&onlyComplete){excluded++;continue;}
   const score=measured.reduce((sum,record)=>sum+record.score,0),total=measured.reduce((sum,record)=>sum+record.total,0);
   if(total<=0){excluded++;unscoredCount++;continue;}
   eligible.push({studentId:student.studentId,studentName:student.studentName,className:student.className,score,total,
    percentage:100*score/total,recordedCount:measured.length,expectedCount:required.length,complete});
  }
  eligible.sort((a,b)=>(b.score/b.total-a.score/a.total)||a.studentName.localeCompare(b.studentName,"ar")||String(a.studentId).localeCompare(String(b.studentId)));
  let rank=0,previousRatio=null;
  for(const item of eligible){
   const ratio=item.score/item.total;
   if(previousRatio===null||Math.abs(ratio-previousRatio)>1e-10){rank++;previousRatio=ratio;}
   item.rank=rank;
  }
  const counts=new Map();for(const person of eligible)counts.set(person.rank,(counts.get(person.rank)||0)+1);
  const winners=eligible.filter(person=>person.rank<=10).map(person=>({...person,position:SR63.studentTopOrdinal(person.rank)+(counts.get(person.rank)>1?" مكرر":"")}));
  const groupTitle=groupType==="class"?"الشعبة "+group.className:"الصف "+group.grade;
  const subjectTitle=mode==="subject"?" — "+SR63.reportSubjectLabel(group.subject,settings):"";
  output.push({grade:group.grade,className:group.className,subject:group.subject,title:groupTitle+subjectTitle,rows:winners,
   eligible:eligible.length,excluded,requiredCount:required.length,totalStudents:group.students.size,
   incompleteCount,unscoredCount,conflictCount});
 }
 output.sort((a,b)=>SR63.gradeOrder(a.grade)-SR63.gradeOrder(b.grade)||String(a.grade).localeCompare(String(b.grade),"ar",{numeric:true})||String(a.className).localeCompare(String(b.className),"ar",{numeric:true})||SR63.reportSubjectCompare(a.subject,b.subject,settings));
 return output;
};
SR63.StudentTopRanksCenter=function({workspace,mode="grade",canPrint=true,departmentMode=false}){
 const h=(tag,props,...children)=>(0,v.createElement)(tag,props,...children);
 const settings=workspace.settings||{},exams=Array.isArray(settings.exams)?settings.exams:[];
 const [exam,setExam]=(0,v.useState)(workspace.activeExam||exams[0]?.key||"exam1");
 const [groupType,setGroupType]=(0,v.useState)("grade"),[grade,setGrade]=(0,v.useState)("الكل");
 const [className,setClassName]=(0,v.useState)("الكل"),[subject,setSubject]=(0,v.useState)("الكل"),
  [onlyComplete,setOnlyComplete]=(0,v.useState)(false),[prepared,setPrepared]=(0,v.useState)(false);
 const raw=(0,v.useMemo)(()=>SR63.generalRows(workspace.rows||[],exam),[workspace,exam]);
 const grades=(0,v.useMemo)(()=>[...new Set(raw.map(row=>gj(row,exam)).filter(Boolean))].sort((a,b)=>SR63.gradeOrder(a)-SR63.gradeOrder(b)||String(a).localeCompare(String(b),"ar",{numeric:true})),[raw,exam]);
 const classes=(0,v.useMemo)(()=>[...new Set(raw.filter(row=>grade==="الكل"||ij(gj(row,exam))===ij(grade)).map(row=>hj(row,exam)).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),"ar",{numeric:true})),[raw,exam,grade]);
 const subjects=(0,v.useMemo)(()=>{
  const found=new Map();
  for(const row of raw){if(grade!=="الكل"&&ij(gj(row,exam))!==ij(grade))continue;
   const key=SR63.subjectAliasKey(row.subject);if(key&&!found.has(key))found.set(key,row.subject);
  }
  return [...found.values()].sort((a,b)=>SR63.reportSubjectCompare(a,b,settings));
 },[raw,exam,grade,settings]);
 const filters={exam,mode,groupType,grade,className:groupType==="class"?className:"الكل",subject:mode==="subject"?subject:"الكل",onlyComplete};
 const groups=(0,v.useMemo)(()=>prepared?SR63.studentTopRankings(workspace,filters):[],[prepared,workspace,exam,mode,groupType,grade,className,subject,onlyComplete]);
 const reset=()=>setPrepared(false),count=groups.reduce((sum,g)=>sum+g.rows.length,0);
 const list=(value,change,options,label)=>h("label",{style:{display:"grid",gap:"5px",fontWeight:700,fontSize:"13px",minWidth:"170px",flex:"1 1 170px"}},
  h("span",{},label),h("select",{value,onChange:event=>{change(event.target.value);reset();},style:{height:"40px",width:"100%",padding:"4px 8px",border:"1px solid #c6d7df",borderRadius:"8px",background:"white",color:"#173e54"}},
    options.map(option=>h("option",{key:option.value,value:option.value},option.label))));
 const num=value=>Number(value).toLocaleString("en-US",{maximumFractionDigits:2});
 const percentage=value=>Number(value).toFixed(3)+"%";
 const heading=mode==="grade"?"المراكز العشرة الأولى للطلاب حسب الصف":"المراكز العشرة الأولى للطلاب حسب المادة";
 const esc=SR63.staffReportEsc||SR63.escape;
 const method=mode==="grade"?"يشمل الترتيب جميع طلاب الصف عبر جميع شُعَبه، حسب مجموع الدرجات المحصّلة مقسومًا على مجموع الدرجات القصوى للمواد المرصودة فعليًا لكل طالب. تظهر النتائج الجزئية بوضوح ولا تُعامل المادة غير المرصودة على أنها صفر.":"الترتيب حسب نسبة الدرجة المرصودة إلى الدرجة القصوى في المادة والاختبار المختارين داخل الصف الدراسي بجميع شُعَبه أو داخل الشعبة المختارة.";
 const note="المراكز العشرة تعني عشرة مراكز ترتيبية متميزة، وقد يزيد عدد الطلاب عند التعادل. تظهر كلمة «مكرر» لجميع المتعادلين، ويأتي المركز التالي بعدهم بالتسلسل. لا تُستخدم النسبة المعروضة بعد التقريب لتحديد التعادل.";
 const columns=["المركز","اسم الطالب","الشعبة","الدرجة المحصّلة","الدرجة الكلية","النسبة","رصد المواد"];
 const cells=person=>[person.position,person.studentName,person.className,num(person.score),num(person.total),percentage(person.percentage),
  person.recordedCount+" / "+person.expectedCount+(person.complete?" · مكتمل":" · جزئي")];
 function print(){
  if(!canPrint||!prepared||!count)return;
  const body=groups.map((group,index)=>{
   const rows=group.rows.map(person=>"<tr>"+cells(person).map(value=>"<td>"+esc(value)+"</td>").join("")+"</tr>").join("");
   return '<section class="sr640-section"'+(index?' style="break-before:page;page-break-before:always"':"")+"><h3>"+esc(group.title)+"</h3><p>"+group.eligible+" طالب محسوب · "+group.incompleteCount+" نتيجة جزئية · "+group.excluded+" بلا درجة صالحة أو لديه تعارض (أو غير مكتمل عند تفعيل المرشح) · "+group.rows.length+" اسمًا ضمن المراكز العشرة</p><table class=\"sr640-table\"><thead><tr>"+columns.map(label=>"<th>"+esc(label)+"</th>").join("")+"</tr></thead><tbody>"+rows+"</tbody></table></section>";
  }).join("");
  SR63.staffPrintHtml({title:heading,subtitle:(exams.find(item=>item.key===exam)?.name||exam)+" · "+groups.length+" مجموعات",body:body+'<p class="sr640-note">'+esc(method+" "+note)+"</p>"},{schoolName:settings.schoolName,academicYear:settings.academicYear,principalName:settings.principalName,workspace});
 }
 return h("section",{dir:"rtl",className:"sr67-year-center",style:{marginTop:"16px"},"aria-label":heading},
  h("header",{className:"sr67-year-header"},h("div",{},h("h2",{},heading),h("p",{},"حدّد الاختبار والنطاق، ثم اطلب تجهيز كشف المراكز دون تحميله تلقائيًا عند فتح مركز التقارير."))),
  h("div",{style:{display:"flex",flexWrap:"wrap",gap:"12px",margin:"18px 0"}},
   list(exam,value=>{setExam(value);setGrade("الكل");setClassName("الكل");setSubject("الكل");},exams.map(e=>({value:e.key,label:e.name})),"الاختبار"),
   list(groupType,value=>{setGroupType(value);setClassName("الكل");},[{value:"grade",label:"حسب الصف الدراسي"},{value:"class",label:"حسب الشعبة"}],"نطاق ترتيب الطلاب"),
   list(grade,value=>{setGrade(value);setClassName("الكل");setSubject("الكل");},[{value:"الكل",label:"جميع الصفوف"},...grades.map(g=>({value:g,label:g}))],"الصف"),
   groupType==="class"?list(className,setClassName,[{value:"الكل",label:"جميع الشعب"},...classes.map(c=>({value:c,label:c}))],"الشعبة"):null,
   mode==="subject"?list(subject,setSubject,[{value:"الكل",label:departmentMode?"كل مواد القسم المصرح بها":"جميع المواد"},...subjects.map(s=>({value:s,label:SR63.reportSubjectLabel(s,settings)}))],"المادة"):null
  ),
  h("label",{style:{display:"flex",alignItems:"center",gap:"9px",marginBottom:"14px",fontSize:"13px",fontWeight:700}},
   h("input",{type:"checkbox",checked:onlyComplete,onChange:event=>{setOnlyComplete(event.target.checked);reset();}}),
   "إظهار الطلاب ذوي درجات المواد المكتملة فقط (اختياري؛ الافتراضي يشمل جميع الطلاب ذوي الدرجات المرصودة)"),
  h("div",{style:{display:"flex",gap:"10px",flexWrap:"wrap",marginBottom:"16px"}},
   h("button",{type:"button",onClick:()=>setPrepared(true),style:{background:"#087f78",color:"#fff",border:0,borderRadius:"9px",padding:"10px 18px",cursor:"pointer"}},"عرض المراكز العشرة"),
   h("button",{type:"button",disabled:!canPrint||!prepared||!count,onClick:print,style:{background:canPrint&&prepared&&count?"#884522":"#adb9be",color:"white",border:0,borderRadius:"9px",padding:"10px 18px",cursor:"pointer"}},"معاينة الطباعة / حفظ PDF")
  ),
  h("p",{className:"sr67-year-method"},method+" "+note),
  !prepared?h("p",{className:"sr67-year-note",role:"status"},"التقرير جاهز للاختيار. لن تُحسب المراكز قبل الضغط على «عرض المراكز العشرة»."):null,
  prepared&&!groups.length?h("p",{className:"sr67-year-alert",role:"status"},"لا توجد درجات مرصودة صالحة ضمن النطاق والاختبار المختارين."):null,
  prepared?groups.map((group,index)=>h("section",{key:index,style:{padding:"15px 0",borderTop:"1px solid #d1dfe5"}},
    h("h3",{style:{fontSize:"17px",fontWeight:800,marginBottom:"6px"}},group.title),
    h("p",{style:{fontSize:"12px",color:"#4e6876",marginBottom:"10px"}},group.eligible+" طالب محسوب من "+group.totalStudents+" · "+group.incompleteCount+" نتيجة جزئية · "+group.excluded+" غير مدرج · "+group.rows.length+" اسمًا ضمن المراكز"),
    group.rows.length?h("div",{className:"sr67-year-scroll",style:{overflowX:"auto"}},h("table",{className:"sr67-year-table",style:{width:"100%",minWidth:"650px"}},
      h("thead",{},h("tr",{},columns.map((c,i)=>h("th",{key:i},c)))),
      h("tbody",{},group.rows.map((student,i)=>h("tr",{key:student.studentId+"-"+i},cells(student).map((x,j)=>h(j===0?"th":"td",{key:j},x))))))):h("p",{},"لا توجد نتائج مكتملة مؤهلة للترتيب.")
   )):null
 );
};