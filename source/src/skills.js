/* Arabic skills assessment – model v1; values are imported locally by the signed-in admin.
   Uploaded names and academic IDs are NEVER embedded in public application assets. */
SR63.skillSubjects={
 arabic:{label:'اللغة العربية',keys:[
  ['listening','استماع وإملاء'],['memorization','حفظ'],['reading','قراءة'],
  ['grammar','قواعد'],['writing','كتابة']
 ]}
};
SR63.skillSafeNumber=value=>{
 if(value===null||value===undefined||String(value).trim()==='')return null;
 const n=SR63.number(value);
 if(n===null||n<0||n>999)throw Error('درجة مهارة غير صالحة: '+String(value).slice(0,35));
 return n;
};
SR63.skillParseWorkbook=function(buffer,fileName,exam='exam1',subject='arabic'){
 const schema=SR63.skillSubjects[subject];
 if(!schema||!['exam1','exam2','exam3','exam4'].includes(exam))throw Error('المادة أو الاختبار غير معتمد.');
 const workbook=hv(buffer,{type:'array'}),records=[],errors=[],ids=new Set(),classes=new Set(),grades=new Set();
 const ordered=['السابع','الثامن','التاسع'],required=['الاسم','الصف','استماع','حفظ','قراءة','قواعد','كتابة'];
 for(const gradeLabel of ordered){
  const sheet=workbook.SheetNames.find(name=>String(name).trim()===gradeLabel);
  if(!sheet){errors.push('لم تُعثر ورقة الصف '+gradeLabel);continue;}
  const rows=Gv.sheet_to_json(workbook.Sheets[sheet],{header:1,raw:true,defval:null,blankrows:true});
  const headerIndex=rows.findIndex(row=>row&&String(row[2]||'').includes('الاسم')&&String(row[3]||'').includes('الشعب')&&
   String(row[4]||'').includes('استماع')&&String(row[8]||'').includes('كتابة'));
  if(headerIndex<0)throw Error('لا تتطابق أعمدة مهارات الصف '+gradeLabel+' مع قالب اللغة العربية المرفق.');
  const header=rows[headerIndex];
  if(!required.every(term=>header.some(cell=>String(cell||'').includes(term))))throw Error('توجد مهارة أو بيانات طالب ناقصة من أعمدة '+gradeLabel);
  for(let index=headerIndex+1;index<rows.length;index++){
   const row=rows[index]||[];
   const serial=SR63.number(row[1]),name=String(row[2]??'').trim(),
    id=String(row[0]??'').trim().replace(/\.0$/,''),
    className=String(row[3]??'').trim().replace(/^0([789])\//,'$1/');
   if(serial===null||serial<1||!name||!id||!/^[789]\/\d{1,2}$/.test(className))continue;
   if(name.length>150||id.length>40)throw Error('بيانات هوية الطالب غير صالحة في '+gradeLabel+'، الصف '+(index+1));
   const identity=id+'|'+className;
   if(ids.has(identity))throw Error('طالب مكرر في الملف: '+gradeLabel+'، صف '+(index+1));
   ids.add(identity);classes.add(className);grades.add(className.split('/')[0]);
   const marks={};schema.keys.forEach(([key],skillIndex)=>{
    try{marks[key]=SR63.skillSafeNumber(row[4+skillIndex]);}
    catch(err){throw Error('الصف '+(index+1)+' في '+gradeLabel+': '+err.message);}
   });
   records.push({id,name,className,grade:className.split('/')[0],marks});
  }
 }
 if(!records.length)throw Error('لا توجد سجلات طلاب صحيحة في أوراق مهارات اللغة العربية.');
 if(records.length>5000)throw Error('ملف المهارات يحتوي عددًا كبيرًا من الطلاب؛ يُسمح حتى 5000 سجل.');
 const year=String(workbook.Sheets[workbook.SheetNames.find(name=>ordered.includes(String(name).trim()))]?
   Gv.sheet_to_json(workbook.Sheets[workbook.SheetNames.find(name=>ordered.includes(String(name).trim()))],{header:1,raw:true,defval:null})?.[1]?.[5]||'':'')
    .match(/20\d{2}\s*[-–\/]\s*20\d{2}/)?.[0]?.replace(/\s+/g,'')||'';
 return {version:1,id:'skills-'+subject+'-'+exam+'-'+(year||'current'),subject:schema.label,subjectKey:subject,
  exam,academicYear:year,fileName:String(fileName||'ملف مهارات').slice(0,180),
  importedAt:new Date().toISOString(),
  skills:schema.keys.map(([key,label])=>({key,label,max:null})),
  records,issues:errors,
  classCount:classes.size,gradeCount:grades.size};
};
SR63.skillScoped=function(data,subjectNames=null){
 const all=Array.isArray(data)?data:[];
 if(!Array.isArray(subjectNames))return all;
 const allowed=new Set(subjectNames.map(x=>SR63.subjectAliasKey(x)));
 return all.filter(item=>allowed.has(SR63.subjectAliasKey(item?.subject||'')));
};
SR63.skillPercent=(score,maximum)=>Number.isFinite(score)&&Number.isFinite(maximum)&&maximum>0?
 Math.round(1000*score/maximum)/10:null;
SR63.skillAggregate=function(assessment,records=assessment?.records||[],pass=50){
 const bySkill=(assessment?.skills||[]).map(skill=>{
  const values=records.map(r=>r.marks?.[skill.key]).filter(x=>Number.isFinite(x)&&x>=0);
  const mean=values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
  const rate=SR63.skillPercent(mean,skill.max);
  const mastered=Number.isFinite(skill.max)&&skill.max>0?values.filter(x=>x/skill.max*100>=pass).length:null;
  return {...skill,observed:values.length,missing:records.length-values.length,mean,rate,
   mastered,masteryRate:mastered===null||!values.length?null:100*mastered/values.length};
 });
 const ratios=records.flatMap(r=>bySkill.map(s=>SR63.skillPercent(r.marks?.[s.key],s.max)).filter(x=>x!==null));
 return {students:records.length,skills:bySkill,
  observed:bySkill.reduce((n,s)=>n+s.observed,0),missing:bySkill.reduce((n,s)=>n+s.missing,0),
  achievement:ratios.length?Math.round(10*ratios.reduce((n,x)=>n+x,0)/ratios.length)/10:null};
};
SR63.skillComparison=function(older,newer){
 if(!older||!newer||SR63.subjectAliasKey(older.subject)!==SR63.subjectAliasKey(newer.subject))return [];
 const byId=new Map((older.records||[]).map(r=>[r.id,r]));
 return (newer.records||[]).flatMap(current=>{
  const previous=byId.get(current.id);if(!previous)return [];
  const diffs=(newer.skills||[]).flatMap(skill=>{
   const earlier=(older.skills||[]).find(x=>x.key===skill.key);
   const a=SR63.skillPercent(previous.marks?.[skill.key],earlier?.max);
   const b=SR63.skillPercent(current.marks?.[skill.key],skill.max);
   return a===null||b===null?[]:[{key:skill.key,label:skill.label,previous:a,current:b,change:Math.round(10*(b-a))/10}];
  });
  return diffs.length?[{id:current.id,name:current.name,className:current.className,skills:diffs}]:[];
 });
};
SR63.skillPages=function(assessment,{grade='الكل',className='الكل',pageSize=20,pass=50}={}){
 if(!assessment)return [];
 const list=(assessment.records||[]).filter(r=>(grade==='الكل'||r.grade===grade)&&
  (className==='الكل'||r.className===className));
 const grades=[...new Set(list.map(r=>r.grade))].sort((a,b)=>Number(a)-Number(b));
 const pages=[];
 for(const gradeKey of grades){
  const gradeRows=list.filter(r=>r.grade===gradeKey),classes=[...new Set(gradeRows.map(r=>r.className))].sort((a,b)=>a.localeCompare(b,'ar',{numeric:true}));
  pages.push({kind:'summary',grade:gradeKey,className:'',rows:gradeRows,classes,pass});
  for(const classKey of classes){
   const students=gradeRows.filter(r=>r.className===classKey);
   for(let offset=0;offset<students.length;offset+=pageSize){
    pages.push({kind:'students',grade:gradeKey,className:classKey,rows:students.slice(offset,offset+pageSize),
     start:offset,groupTotal:students.length,part:1+Math.floor(offset/pageSize),
     parts:Math.ceil(students.length/pageSize),pass});
   }
  }
 }
 return pages.map((page,index)=>({...page,number:index+1,total:pages.length}));
};
SR63.skillPageHTML=function(page,assessment,settings={}){
 const esc=SR63.escape,num=v=>Number.isFinite(v)?(Math.round(v*10)/10).toLocaleString('en-US',{maximumFractionDigits:1}):'—',pct=v=>Number.isFinite(v)?num(v)+'%':'—';
 const heading={7:'السابع',8:'الثامن',9:'التاسع'}[page.grade]||page.grade;
 const foot=SR63.reportFooterHTML({settings,rows:[],teachers:[],subjects:[]},assessment.subject);
 const skills=assessment.skills||[],max=skills.map(s=>Number.isFinite(s.max)&&s.max>0?num(s.max):'غير محددة');
 const header='<header class="srskill-header"><img src="./moehe.png" alt="شعار وزارة التربية والتعليم والتعليم العالي"><div><strong>'+esc(settings.schoolName||'المدرسة')+'</strong><h2>تحليل درجات مهارات '+esc(assessment.subject)+'</h2><p>'+esc((settings.exams||[]).find(x=>x.key===assessment.exam)?.name||assessment.exam)+' · '+esc(assessment.academicYear||settings.academicYear||'')+' · الصف '+esc(heading)+(page.className?' · الشعبة '+esc(page.className):'')+'</p></div></header>';
 let body='';
 if(page.kind==='summary'){
  const classRows=page.classes.map(cls=>{
   const stats=SR63.skillAggregate(assessment,page.rows.filter(r=>r.className===cls),page.pass);
   return '<tr><th>'+esc(cls)+'</th>'+stats.skills.map(s=>'<td>'+pct(s.rate)+'</td>').join('')+
    '<td>'+stats.students+'</td><td>'+pct(stats.achievement)+'</td></tr>';
  }).join('');
  const overall=SR63.skillAggregate(assessment,page.rows,page.pass);
  body='<h3>ملخص تحليل المهارات حسب الشعب — الصف '+esc(heading)+'</h3>'+
   '<table class="srskill-table"><thead><tr><th>الشعبة</th>'+skills.map(s=>'<th>'+esc(s.label)+'</th>').join('')+
   '<th>الطلاب</th><th>متوسط التحصيل</th></tr></thead><tbody>'+classRows+
   '<tr class="srskill-total"><th>إجمالي الصف</th>'+overall.skills.map(s=>'<td>'+pct(s.rate)+'</td>').join('')+
   '<td>'+overall.students+'</td><td>'+pct(overall.achievement)+'</td></tr></tbody></table>';
 }else{
  const rows=page.rows.map((student,index)=>{
   const points=skills.map(skill=>student.marks?.[skill.key]);
   const canTotal=skills.every((skill,index)=>Number.isFinite(points[index])&&Number.isFinite(skill.max)&&skill.max>0);
   const total=canTotal?points.reduce((a,b)=>a+b,0):null;
   const maximum=canTotal?skills.reduce((a,s)=>a+s.max,0):null;
   return '<tr><td>'+(page.start+index+1)+'</td><td>'+esc(student.name)+'</td><td>'+esc(student.className)+'</td>'+
    points.map(n=>'<td>'+num(n)+'</td>').join('')+'<td>'+num(total)+'</td><td>'+pct(SR63.skillPercent(total,maximum))+'</td></tr>';
  }).join('');
  body='<h3>كشف درجات المهارات — الشعبة '+esc(page.className)+(page.parts>1?' · الجزء '+page.part+' من '+page.parts:'')+'</h3>'+
   '<table class="srskill-table"><thead><tr><th>م</th><th>اسم الطالب</th><th>الشعبة</th>'+
   skills.map(s=>'<th>'+esc(s.label)+'</th>').join('')+'<th>المجموع</th><th>النسبة %</th></tr>'+
   '<tr class="srskill-max"><th colspan="3">الدرجة القصوى لكل مهارة</th>'+max.map(x=>'<th>'+esc(x)+'</th>').join('')+
   '<th>'+num(skills.every(s=>Number.isFinite(s.max)&&s.max>0)?skills.reduce((a,s)=>a+s.max,0):null)+'</th><th>100%</th></tr></thead>'+
   '<tbody>'+rows+'</tbody></table>';
 }
 return header+'<div class="srskill-body">'+body+'</div><p class="srskill-note">الشرطة (—) تعني درجة غير مرصودة؛ لا تُحتسب الدرجة الفارغة صفرًا. التحصيل والنسب لا تظهر حتى تُحدد الدرجة القصوى لكل مهارة.</p>'+
  foot+'<div class="srskill-page-number">صفحة '+page.number+' من '+page.total+'</div>';
};
SR63.skillFullHTML=function(page,assessment,settings){
 return '<section class="school-report-page skill-report-page report-landscape" data-orientation="landscape">'+
  SR63.skillPageHTML(page,assessment,settings)+'</section>';
};
SR63.SkillCenter=function({workspace,setWorkspace=null,readOnly=false,canPrint=true,allowedSubjects=null}){
 const h=(tag,props,...children)=>(0,v.createElement)(tag,props,...children);
 const [selectedId,select]=(0,v.useState)(''),[exam,setExam]=(0,v.useState)(workspace?.activeExam||'exam1'),
  [grade,setGrade]=(0,v.useState)('الكل'),[cls,setClass]=(0,v.useState)('الكل'),
  [limitEdit,setLimitEdit]=(0,v.useState)({}),[busy,setBusy]=(0,v.useState)(false),
  [notice,setNotice]=(0,v.useState)(''),[preview,setPreview]=(0,v.useState)(0);
 const available=SR63.skillScoped(workspace?.skillsAssessments||[],allowedSubjects);
 const active=available.find(x=>x.id===selectedId)||available[0]||null;
 const school=workspace?.settings||{},grades=[...new Set((active?.records||[]).map(r=>r.grade))].sort(),
  classes=[...new Set((active?.records||[]).filter(r=>grade==='الكل'||r.grade===grade).map(r=>r.className))].sort((a,b)=>a.localeCompare(b,'ar',{numeric:true}));
 const chosenClass=classes.includes(cls)?cls:'الكل';
 const pages=SR63.skillPages(active,{grade,className:chosenClass,pass:school.pass||50});
 const summary=SR63.skillAggregate(active,(active?.records||[]).filter(r=>(grade==='الكل'||r.grade===grade)&&(chosenClass==='الكل'||r.className===chosenClass)),school.pass||50);
 const permitted=!readOnly&&typeof setWorkspace==='function';
 const updateRecords=next=>{if(!permitted)return;const normalized=SR63.validate(next).workspace;setWorkspace(normalized);};
 const importFile=async file=>{
  if(!permitted||!file)return;
  setBusy(true);setNotice('جارٍ قراءة أوراق الصفوف الثلاثة…');
  try{
   if(!/\.xlsx?$/i.test(file.name)||file.size>15*1024*1024)throw Error('اختر ملف Excel صالحًا بحجم لا يتجاوز 15 ميجابايت.');
   const parsed=SR63.skillParseWorkbook(await file.arrayBuffer(),file.name,exam);
   const records=workspace.skillsAssessments||[],old=records.find(x=>x.id===parsed.id);
   if(old&&!window.confirm('هذا الاختبار موجود بالفعل. هل تريد استبدال بيانات مهاراته بعد حفظ نسخة احتياطية؟')){setNotice('أُلغي استبدال ملف المهارات.');return;}
   const next={...workspace,skillsAssessments:[...records.filter(x=>x.id!==parsed.id),parsed]};
   if(typeof Kj==='function'&&!await Kj(workspace,'قبل استيراد ملف مهارات اللغة العربية'))throw Error('تعذّر إنشاء نسخة أمان قبل استيراد المهارات.');
   updateRecords(next);select(parsed.id);setGrade('الكل');setClass('الكل');setPreview(0);
   setNotice('تم تجهيز '+parsed.records.length+' طالبًا من '+parsed.classCount+' شعبة. احفظ التعديلات من لوحة الأدمن.');
  }catch(error){setNotice('تعذر الاستيراد: '+(error?.message||error));}
  finally{setBusy(false);}
 };
 const updateMaxima=()=>{
  if(!active||!permitted)return;
  try{
   const skills=active.skills.map(s=>{
    const input=limitEdit[s.key]===undefined?s.max:limitEdit[s.key];
    const val=SR63.skillSafeNumber(input);
    if(val!==null&&val<=0)throw Error('الدرجة القصوى للمهارة يجب أن تكون أكبر من الصفر: '+s.label);
    const maxSeen=Math.max(0,...active.records.map(r=>Number(r.marks?.[s.key])||0));
    if(val!==null&&val<maxSeen)throw Error('الدرجة القصوى أقل من درجة مرصودة: '+s.label);
    return {...s,max:val};
   });
   updateRecords({...workspace,skillsAssessments:(workspace.skillsAssessments||[]).map(x=>x.id===active.id?{...x,skills}:x)});
   setNotice('تم تحديث الدرجات القصوى. احفظ التعديلات في حساب الأدمن.');
  }catch(error){setNotice(error.message||String(error));}
 };
 const ready=()=>{if(!active||!pages.length)throw Error('لا توجد صفحات مهارات ضمن الاختيارات.');if(pages.length>200)throw Error('اختر صفًا أو شعبة لتقليل عدد الصفحات إلى 200.');};
 const print=async()=>{
  if(!canPrint)return;
  let win=null;
  try{
   ready();win=window.open('','_blank');if(!win)throw Error('اسمح بالنوافذ المنبثقة لمعاينة التقرير.');
   setBusy(true);setNotice('جارٍ تجهيز '+pages.length+' صفحة للطباعة…');
   const html=pages.map(p=>SR63.skillFullHTML(p,active,school));
   await SR63.printReportBatch(html,'تحليل مهارات '+active.subject,true,win);
   setNotice('تم فتح معاينة الطباعة بنفس صفحات التقرير.');
  }catch(error){if(win&&!win.closed)try{win.close();}catch{}setNotice(error.message||String(error));}
  finally{setBusy(false);}
 };
 const savePDF=async(split=false)=>{
  if(!canPrint)return;
  let stage=null;
  try{
   ready();setBusy(true);setNotice('جارٍ تجهيز PDF بنفس محتوى المعاينة…');
   const css=await SR63.getReportStyleText();
   stage=document.createElement('div');stage.className='srskill-export-stage';
   stage.style.cssText='position:fixed;left:-24000px;top:0;width:297mm;z-index:-1;pointer-events:none';
   document.body.appendChild(stage);
   const groups=new Map();
   for(const page of pages){
    const group=split?(page.className||'ملخص الصف '+page.grade):'الكل';
    if(!groups.has(group))groups.set(group,[]);
    groups.get(group).push(page);
   }
   const output=[];
   for(const [group,groupPages] of groups){
    const images=[];
    for(const page of groupPages){
     stage.innerHTML=SR63.skillFullHTML(page,active,school);
     await (document.fonts?.ready||Promise.resolve());
     const node=stage.querySelector('.skill-report-page');
     images.push(await SR63.reportPageJPEG(node,css,true));
    }
    output.push({name:SR63.safeReportFilename('مهارات '+active.subject+' - '+group+'.pdf'),blob:SR63.reportPdfFromJpegs(images)});
   }
   const name=SR63.safeReportFilename('تحليل مهارات '+active.subject+' '+(school.exams||[]).find(x=>x.key===active.exam)?.name);
   if(split)SR63.downloadReportFile(await SR63.reportZipFromPdfs(output),name+' - تفصيلي.zip');
   else SR63.downloadReportFile(output[0].blob,name+'.pdf');
   setNotice('اكتمل تجهيز '+pages.length+' صفحة باستخدام نفس قالب المعاينة.');
  }catch(error){setNotice('تعذر إنشاء PDF: '+(error.message||error));}
  finally{if(stage)stage.remove();setBusy(false);}
 };
 const stat=n=>Number.isFinite(n)?n.toFixed(1)+'%':'—';
 return h('main',{className:'srskill-center',dir:'rtl'},
  h('header',{className:'srskill-toolbar'},h('div',{},h('h2',{},'تحليل مهارات اللغة العربية'),h('p',{},'نتائج المهارات حسب الطالب والشعبة والصف، مع طباعة A4 بالعرض وملفات PDF مطابقة لقالب المعاينة.'))),
  permitted?h('section',{className:'srskill-controls'},h('label',{},'اختبار استيراد الدرجات',h('select',{value:exam,onChange:e=>setExam(e.target.value)},(school.exams||[]).map(x=>h('option',{key:x.key,value:x.key},x.name)))),
   h('label',{},busy?'جارٍ الاستيراد…':'رفع ملف تحليل المهارات (.xlsx)',
    h('input',{type:'file',accept:'.xlsx,.xls',disabled:busy,onChange:e=>{const f=e.target.files?.[0];if(f)void importFile(f);e.target.value='';}})),
   h('p',{},'يتم تجاهل خلايا الملخص الجانبية وحساب المتوسطات من درجات المهارات المرصودة فقط.')):null,
  h('section',{className:'srskill-controls'},
   h('label',{},'الاختبار المحفوظ',h('select',{value:active?.id||'',onChange:e=>{select(e.target.value);setPreview(0);setLimitEdit({});}},available.length?available.map(x=>h('option',{key:x.id,value:x.id},(school.exams||[]).find(y=>y.key===x.exam)?.name||x.exam+' — '+(x.academicYear||''))):[h('option',{value:''},'لا توجد بيانات مهارات مستوردة')])),
   h('label',{},'الصف',h('select',{value:grade,onChange:e=>{setGrade(e.target.value);setClass('الكل');setPreview(0);}},[h('option',{key:'all',value:'الكل'},'كل الصفوف'),...grades.map(x=>h('option',{key:x,value:x},'الصف '+x))])),
   h('label',{},'الشعبة',h('select',{value:chosenClass,onChange:e=>{setClass(e.target.value);setPreview(0);}},[h('option',{key:'all',value:'الكل'},'كل الشعب'),...classes.map(x=>h('option',{key:x,value:x},x))]))),
  active&&permitted?h('section',{className:'srskill-limits'},h('strong',{},'الدرجات القصوى للمهارات — أدخلها وفق سلم التقييم المعتمد (ليست محددة في ملف Excel)'),...
   active.skills.map(skill=>h('label',{key:skill.key},skill.label,h('input',{type:'number',min:'0',step:'0.5',value:limitEdit[skill.key]===undefined?(skill.max??''):limitEdit[skill.key],
    onChange:e=>setLimitEdit(s=>({...s,[skill.key]:e.target.value}))}))),h('button',{type:'button',onClick:updateMaxima},'حفظ الدرجات القصوى')):null,
  active?h('section',{className:'srskill-metrics'},[
   ['الطلاب',summary.students],['الشعب',classes.length],['درجات المهارات المرصودة',summary.observed],
   ['الدرجات غير المرصودة',summary.missing],['متوسط التحصيل',stat(summary.achievement)]
  ].map(([label,value])=>h('div',{key:label},h('span',{},label),h('strong',{},String(value))))):null,
  active?h('section',{className:'srskill-actions'},
   h('button',{disabled:busy||!pages.length||!canPrint,onClick:()=>void print()},'معاينة الطباعة / PDF متجهي'),
   h('button',{disabled:busy||!pages.length||!canPrint,onClick:()=>void savePDF(false)},'تنزيل PDF كامل'),
   h('button',{disabled:busy||!pages.length||!canPrint,onClick:()=>void savePDF(true)},'تنزيل ZIP بحسب الشعبة'),
   h('span',{},'عدد الصفحات: '+pages.length)):null,
  notice?h('p',{className:'srskill-status',role:'status'},notice):null,
  !available.length?h('section',{className:'srskill-empty'},'لم تُرفع بيانات مهارات اللغة العربية بعد. ارفع ملف Excel من حساب الأدمن، ثم أدخل الدرجات القصوى.'):null,
  active&&pages.length?h('section',{className:'srskill-preview'},
   h('div',{className:'srskill-preview-navigation'},h('strong',{},'معاينة التقرير الموحّدة — '+(Math.floor(preview/3)+1)+' من '+Math.ceil(pages.length/3)),
    h('button',{type:'button',disabled:preview<=0,onClick:()=>setPreview(Math.max(0,preview-3))},'السابق'),
    h('button',{type:'button',disabled:preview+3>=pages.length,onClick:()=>setPreview(preview+3)},'التالي')),
   ...pages.slice(preview,preview+3).map(page=>h('section',{key:page.number,className:'school-report-page skill-report-page report-landscape',
    'data-orientation':'landscape',dangerouslySetInnerHTML:{__html:SR63.skillPageHTML(page,active,school)}}))):null
 );
};
