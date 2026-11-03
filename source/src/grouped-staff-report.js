/* 6.10.85 — server-scoped school staff grouped failed-student printouts.
   Never put student personal identifiers in report HTML. */
SR63.staffGradeMax=function(items,key,fallback='—'){
 const vals=new Set((items||[]).map(x=>x?.[key]).filter(x=>typeof x==='number'&&Number.isFinite(x)&&x>0));
 return vals.size===1?String([...vals][0]):vals.size>1?'متعددة':fallback;
};
SR63.staffGroupedFailedBuild=function(type,{failed=[],examName='',scopeLabel=''}) {
 if(!['failedGrade','failedTeacher'].includes(type))throw Error('نوع التقرير غير معتمد');
 const escape=SR63.staffReportEsc;
 const grouped=new Map(),byGrade=type==='failedGrade';
 const gradeName={7:'السابع',8:'الثامن',9:'التاسع'};
 const gradeNumber=x=>Number(/^\s*([789])(?:\s*\/|$)/.exec(String(x.className||''))?.[1]||0);
 for(const item of failed){
  const grade=gradeNumber(item),teacher=String(item.teacher||'غير محدد').trim()||'غير محدد';
  const subject=String(item.subject||'غير محدد').trim()||'غير محدد';
  const key=byGrade?grade+'|'+SR63.subjectAliasKey(subject):teacher;
  if(!grouped.has(key))grouped.set(key,{grade,teacher,subject,items:[]});
  grouped.get(key).items.push(item);
 }
 const groups=[...grouped.values()].sort((a,b)=>byGrade?(a.grade-b.grade||SR63.reportSubjectCompare(a.subject,b.subject,SR63.currentWorkspace?.settings)):a.teacher.localeCompare(b.teacher,'ar',{numeric:true}));
 const maxLabel=(rows,key)=>SR63.staffGradeMax(rows,key);
 const reportLabel=byGrade?'كشف مجمع للمتعثرين حسب الصف والمادة':'كشف مجمع للمتعثرين حسب المعلم';
 const percent=x=>typeof x==='number'&&Number.isFinite(x)?x.toFixed(1)+'%':'—';
 const sections=groups.map(g=>{
  const sorted=[...g.items].sort((a,b)=>(gradeNumber(a)-gradeNumber(b))||String(a.className).localeCompare(String(b.className),'ar',{numeric:true})||SR63.reportSubjectCompare(a.subject,b.subject,SR63.currentWorkspace?.settings)||String(a.name).localeCompare(String(b.name),'ar',{numeric:true}));
  const rawMax=maxLabel(sorted,'total'),certMax=maxLabel(sorted,'certificateTotal'),heading=byGrade?'الصف '+(gradeName[g.grade]||'غير محدد')+' — '+g.subject:'المعلم: '+g.teacher;
  const students=new Set(sorted.map(x=>String(x.studentId||x.name)+'|'+x.className));
  const tableHeaders=['م','اسم الطالب','الشعبة',byGrade?'المعلم':'المادة','درجة الاختبار','درجة الشهادة','النسبة الأصلية'];
  const titles=tableHeaders.map((t,i)=>'<th>'+escape(t)+(i===4?'<small style="display:block;font-weight:800">الدرجة العظمى '+escape(rawMax)+'</small>':i===5?'<small style="display:block;font-weight:800">الدرجة العظمى '+escape(certMax)+'</small>':'')+'</th>').join('');
  const body=sorted.map((x,i)=>'<tr><td>'+(i+1)+'</td><td><strong class="sr685-staff-name" style="font-size:12pt;font-weight:900">'+escape(x.name)+'</strong></td><td>'+escape(x.className)+'</td><td>'+escape(byGrade?x.teacher||'غير محدد':x.subject)+'</td><td>'+escape(x.score??'—')+'</td><td>'+escape(x.certificateScore??x.score??'—')+'</td><td>'+escape(percent(x.percentage))+'</td></tr>').join('');
  return '<section class="sr640-section sr685-staff-group"><h3>'+escape(heading)+'</h3><p style="font-size:10pt;font-weight:700">عدد نتائج الرسوب: '+sorted.length+' · الطلاب المختلفون: '+students.size+' · التقويم: '+escape(examName)+'</p><table class="sr640-table"><thead><tr>'+titles+'</tr></thead><tbody>'+body+'</tbody></table></section>';
 }).join('');
 return {title:reportLabel,subtitle:scopeLabel+' · '+examName+' · '+groups.length+' كشف',
  body:'<p class="sr640-note">هذه النتائج راسبة وفق درجة الشهادة بعد الجبر عند تفعيل تحويل الاختبار؛ لا تُحسب حالات الغياب وغير المرصود. يرد اسم الطالب دون رقم شخصي، وتظهر الدرجة العظمى مرة واحدة فوق عمود الدرجة ما دامت موحّدة.</p>'
   + (sections||'<p>لا توجد نتائج راسبة في النطاق المصرّح به.</p>')};
};
const sr685StaffReportBuild=SR63.staffReportBuild;
SR63.staffReportBuild=function(type,args){
 if(type==='failedGrade'||type==='failedTeacher')return SR63.staffGroupedFailedBuild(type,args);
 return sr685StaffReportBuild(type,args);
};
