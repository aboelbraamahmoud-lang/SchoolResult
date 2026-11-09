/* SchoolResult 6.10.110: pre-commit import conflict workbench. This changes
   only the pending Excel preview, never previously saved student results. */
SR63.importReviewChangeRow=function(files,sheetId,rowId,change){
 let found=false;
 const allowed=['present','absent','excused','unexcused','deprived','not_enrolled','unentered'];
 const updated=files.map(file=>({...file,sheets:file.sheets.map(sheet=>{
  if(sheet.id!==sheetId)return sheet;
  return {...sheet,rows:sheet.rows.map(row=>{
   if(row.id!==rowId)return row;
   found=true;
   if(change.kind==='exclude')return {...row,excluded:!!change.value};
   if(change.kind==='identity'){
    if(!['studentId','studentName','className'].includes(change.field))SR63.fail('حقل التصحيح غير مدعوم.');
    const value=String(change.value??'').slice(0,200),next={...row,[change.field]:value};
    return change.field==='className'?{...next,grade:uj(value)}:next;
   }
   if(change.kind==='grade'){
    const key=String(change.column??''),column=sheet.scoreColumns?.find(c=>String(c.key)===key);
    if(!column)SR63.fail('عمود الدرجة غير موجود في ورقة Excel.');
    const previous=row.values?.[key]??{score:null,status:'unentered',recognized:true};
    const status=change.field==='status'?String(change.value):previous.status==='present'?'present':String(change.value??'').trim()?'present':'unentered';
    if(!allowed.includes(status))SR63.fail('حالة الدرجة غير معروفة.');
    const raw=change.field==='status'?(status==='present'?String(previous.raw??previous.score??''):''):String(change.value??'').trim();
    const score=status==='present'?SR63.number(raw):null;
    const value={...previous,raw,score,status,recognized:status!=='present'||score!==null};
    return {...row,values:{...row.values,[key]:value}};
   }
   SR63.fail('نوع التصحيح غير معروف.');
  })};
 })}));
 if(!found)SR63.fail('سجل المراجعة لم يعد موجودًا. أعد فتح ملف الاستيراد.');
 return updated;
};
SR63.importReviewIssueDetails=function(files,items,invalid,workspace,defaultExam){
 const map=new Map();
 const fileName=item=>String(item.sourceFile||'')+'|'+String(item.sourceSheet||'')+'|'+String(item.sourceRow||'')+'|'+String(item.exam||defaultExam);
 const add=(item,reason)=>{
  const key=fileName(item),old=map.get(key);
  if(old){if(!old.reasons.includes(reason))old.reasons.push(reason);}
  else map.set(key,{item,reasons:[reason]});
 };
 for(const item of invalid||[])add(item,'درجة أو حالة غير صالحة');
 const seen=new Map();
 for(const item of items||[]){
  const key=ij(item.studentId)+'|'+SR63.subjectAliasKey(item.subject)+'|'+(item.exam||defaultExam);
  if(!seen.has(key))seen.set(key,[]);
  seen.get(key).push(item);
 }
 for(const group of seen.values())if(group.length>1)for(const item of group)add(item,'نتيجة مكررة لنفس الطالب والمادة والاختبار');
 const names=new Map();
 const register=(item)=>{
  const id=SR63.nationalityId(item.studentId),name=SR63.studentNameKey(String(item.studentName||''));
  if(!id||!name)return;
  if(!names.has(id))names.set(id,new Set());
  names.get(id).add(name);
 };
 for(const row of workspace?.rows??[])register(row);
 for(const row of workspace?.students??[])register(row);
 for(const item of items??[])register(item);
 for(const item of items??[]){
  const id=SR63.nationalityId(item.studentId);
  if((names.get(id)?.size??0)>1)add(item,'اسم مختلف للرقم الأكاديمي نفسه');
 }
 const sources=new Map();
 for(const file of files||[])for(const sheet of file.sheets||[])for(const row of sheet.rows||[]){
  const key=String(file.fileName||'')+'|'+String(sheet.sheet||'')+'|'+String(row.sourceRow||'')+'|'+String(sheet.exam||defaultExam);
  sources.set(key,{file,sheet,row});
 }
 return [...map.values()].map(entry=>({...entry,source:sources.get(fileName(entry.item))??null}));
};
SR63.ImportReconcileFixPanel=function(props){
 const h=v.createElement;
 const {files,setFiles,items,invalid,unmatched,matches,setAssignments,workspace,defaultExam,getTotal,totals,setTotals,onSheetPatch,metadataIssues}=props;
 const [limit,setLimit]=v.useState(20);
 const allIssues=SR63.importReviewIssueDetails(files,items,invalid,workspace,defaultExam);
 const issues=props.identityUnresolved===0?allIssues.map(item=>({...item,reasons:item.reasons.filter(reason=>!reason.includes('اسم مختلف للرقم الأكاديمي'))})).filter(item=>item.reasons.length):allIssues;
 const sheetProblems=[];
 for(const file of files||[]){
  for(const error of file.issues||[])if(error.severity==='error')sheetProblems.push({file,sheet:null,issue:error});
  for(const sheet of file.sheets||[])if(sheet.selected)for(const error of sheet.issues||[])if(error.severity==='error')sheetProblems.push({file,sheet,issue:error});
 }
 const studentOptions=['present','absent','excused','unexcused','deprived','not_enrolled','unentered'];
 const statusLabels=['حاضر','غائب','معذور','غياب دون عذر','محروم','غير مقيد','غير مرصود'];
 const button=(title,handler,className)=>h('button',{type:'button',className:className||'sr-import-fix-button',onClick:handler},title);
 const apply=(source,change)=>{
  if(!source)return;
  setFiles(current=>SR63.importReviewChangeRow(current,source.sheet.id,source.row.id,change));
 };
 const field=(label,value,handler,extra={})=>h('label',{className:'sr-import-fix-field',key:label},
  h('span',{},label),
  h('input',{type:'text',value:String(value??''),onChange:event=>handler(event.target.value),...extra}));
 const scoreFields=source=>{
  const {sheet,row}=source,roles=sheet.gradeColumns?[
   ['raw','الاختبار الخام',SR63.gradeImportRawMax(workspace.settings,sheet.subject,sheet.exam||defaultExam)],
   ['certificate','الشهادة الرسمية',SR63.gradeImportCertificateMax(workspace.settings,sheet.subject,sheet.exam||defaultExam)],
   ['activity','النشاط من 50',50],
   ['practical','عملي العلوم من 5',5],
   ['secondTerm','الفصل الثاني من 45',45]
  ]:[['raw','درجة الاختبار',getTotal({...row,sourceFile:source.file.fileName,sourceSheet:sheet.sheet})]];
  return roles.filter(([key])=>key==='raw'?!!(sheet.gradeColumns?.raw||sheet.selectedScoreKey):!!sheet.gradeColumns?.[key]).map(([role,label,max])=>{
   const key=String(role==='raw'?(sheet.gradeColumns?.raw||sheet.selectedScoreKey):sheet.gradeColumns[role]);
   const value=row.values?.[key]??{score:null,status:'unentered'};
   const active=value.status==='present';
   const outOfRange=active&&(!Number.isFinite(value.score)||value.score<0||value.score>max);
   return h('label',{className:'sr-import-fix-field',key:role},
    h('span',{},label+' (0–'+max+')'),
    h('input',{type:'text',inputMode:'decimal',value:value.raw!=null&&value.raw!==''?String(value.raw):Number.isFinite(value.score)?String(value.score):'',
     'aria-invalid':outOfRange,placeholder:'أدخل الدرجة الأصلية',
     onChange:event=>apply(source,{kind:'grade',column:key,field:'score',value:event.target.value})}),
    outOfRange?h('small',{className:'sr-import-fix-invalid'},'الدرجة لا تقع ضمن المدى المحدد'):null);
  });
 };
 const gradeStatus=source=>{
  const {sheet,row}=source,key=String(sheet.gradeColumns?.raw||sheet.selectedScoreKey||sheet.gradeColumns?.certificate||'');
  if(!key)return null;
  const status=row.values?.[key]?.status||'unentered';
  return h('label',{className:'sr-import-fix-field'},
   h('span',{},'حالة نتيجة الاختبار'),
   h('select',{value:status,onChange:event=>apply(source,{kind:'grade',column:key,field:'status',value:event.target.value})},
    ...studentOptions.map((item,i)=>h('option',{key:item,value:item},statusLabels[i]))));
 };
 const rowCard=issue=>{
  const item=issue.item,source=issue.source;
  return h('article',{className:'sr-import-fix-card',key:String(item.sourceFile)+'-'+String(item.sourceSheet)+'-'+String(item.sourceRow)+'-'+String(item.exam)},
   h('div',{className:'sr-import-fix-card-head'},
    h('strong',{},item.studentName||'طالب بلا اسم'),
    h('span',{},(item.subject||'مادة غير محددة')+' · '+(item.className||'شعبة غير محددة')),
    h('small',{},'الملف: '+item.sourceFile+' · الورقة: '+item.sourceSheet+' · الصف: '+item.sourceRow),
    h('b',{className:'sr-import-fix-error'},issue.reasons.join(' • '))),
   source?h('div',{className:'sr-import-fix-fields'},
    field('اسم الطالب',source.row.studentName,value=>apply(source,{kind:'identity',field:'studentName',value})),
    field('الرقم الأكاديمي',source.row.studentId,value=>apply(source,{kind:'identity',field:'studentId',value})),
    field('الشعبة',source.row.className,value=>apply(source,{kind:'identity',field:'className',value})),
    gradeStatus(source),
    ...scoreFields(source)):h('p',{},'لم يُعثر على صف المصدر؛ يجب إعادة اختيار ورقة Excel.'),
   source?h('div',{className:'sr-import-fix-actions'},
    h('small',{},source.row.excluded?'تم استبعاد هذا الصف من الدفعة، دون حذف المصدر أو درجات الطلاب المحفوظة.':'تُطبَّق التصحيحات على معاينة الاستيراد فقط.'),
    button(source.row.excluded?'إعادة إدراج الصف':'استبعاد هذا الصف المكرر',()=>{
     if(!source.row.excluded&&!window.confirm('استبعاد الصف '+item.sourceRow+' من هذه الدفعة فقط؟ لن يتم حذف أي نتيجة محفوظة سابقًا.'))return;
     apply(source,{kind:'exclude',value:!source.row.excluded});
    },'sr-import-fix-button sr-import-fix-danger')):null);
 };
 const totalErrorSheets=files.flatMap(file=>file.sheets.filter(sheet=>sheet.selected&&invalid.some(i=>i.sourceFile===file.fileName&&i.sourceSheet===sheet.sheet)).map(sheet=>({file,sheet})));
 const advisory=files.flatMap(file=>file.sheets.filter(sheet=>sheet.selected).map(sheet=>({file,sheet})));
 const excludedRows=files.flatMap(file=>file.sheets.filter(sheet=>sheet.selected).flatMap(sheet=>sheet.rows.filter(row=>row.excluded).map(row=>({file,sheet,row}))));
 const schoolSubjects=[...new Set((workspace?.subjects||[]).filter(s=>s.active!==false).map(s=>s.name))];
 const unmatchedGroups=(unmatched||[]).slice(0,limit);
 return h('section',{className:'sr-import-fix-workbench',dir:'rtl'},
  h('header',{className:'sr-import-fix-header'},
   h('div',{},h('h3',{},'إصلاح التعارضات قبل اعتماد النتائج'),
    h('p',{},'عدّل بيانات الصفوف المستوردة، أو الربط، أو الدرجة الكلية من هنا. لا تُحفظ أي درجة في القاعدة حتى تضغط «اعتماد النتائج».')),
   h('span',{className:issues.length||unmatched?.length||sheetProblems.length?'sr-import-fix-count is-risk':'sr-import-fix-count'},
    (issues.length+(unmatched?.length||0)+sheetProblems.length)+' موضع للمراجعة')),
  sheetProblems.length?h('div',{className:'sr-import-fix-parser'},
   h('h4',{},'أخطاء قراءة Excel التي تمنع الاعتماد ('+sheetProblems.length+')'),
   ...sheetProblems.slice(0,limit).map(({file,sheet,issue},i)=>h('p',{key:i},
     file.fileName+' / '+(sheet?.sheet||issue.sheet||'الملف')+' / الصف '+(issue.row??'—')+': '+issue.message)),
   h('small',{},'إذا كان الصف مفقودًا بالكامل من قراءة الملف، فلا يمكن افتراض بياناته أو تجاهل الخطأ. صحّح ورقة المصدر وأعد رفعها. أما القيم المقروءة فتُصحح أدناه.')):null,
  issues.length?h('div',{className:'sr-import-fix-group'},
   h('h4',{},'درجات أو هويات أو صفوف مكررة تحتاج تصحيحًا ('+issues.length+')'),
   ...issues.slice(0,limit).map(rowCard)):h('p',{className:'sr-import-fix-cleared'},'لا توجد درجات غير صالحة أو صفوف مكررة في النتائج المحددة.'),
  excludedRows.length?h('div',{className:'sr-import-fix-group'},
   h('h4',{},'صفوف مستبعدة من هذه الدفعة ('+excludedRows.length+')'),
   h('p',{},'يمكنك إعادة أي صف قبل الاعتماد. استبعاده لا يحذف بياناته من ملف Excel أو من قاعدة النتائج الحالية.'),
   ...excludedRows.slice(0,limit).map(({file,sheet,row})=>h('div',{className:'sr-import-fix-actions',key:sheet.id+'-'+row.id},
    h('span',{},row.studentName+' — '+sheet.subject+' — '+file.fileName+' / الصف '+row.sourceRow),
    button('إعادة إدراج الصف',()=>apply({file,sheet,row},{kind:'exclude',value:false}))))):null,
  totalErrorSheets.length?h('div',{className:'sr-import-fix-group'},
   h('h4',{},'الدرجة الكلية للورقة'),
   h('div',{className:'sr-import-fix-fields'},...totalErrorSheets.map(({file,sheet})=>{
    const key=file.fileName+'\u0000'+sheet.sheet,existing=totals[key],exam=sheet.exam||defaultExam;
    const fallback=getTotal({sourceFile:file.fileName,sourceSheet:sheet.sheet,exam});
    return h('label',{className:'sr-import-fix-field',key},
     h('span',{},sheet.subject+' — '+sheet.sheet),
     h('input',{type:'number',min:'0.01',step:'0.5',value:Number.isFinite(existing)?existing:fallback,
      onChange:event=>setTotals(old=>({...old,[key]:Number(event.target.value)}))}));
   }))):null,
  unmatchedGroups.length?h('div',{className:'sr-import-fix-group'},
   h('h4',{},'حسم تكليف المعلم مباشرة ('+unmatched.length+')'),
   h('div',{className:'sr-import-fix-fields'},
   ...unmatchedGroups.map(group=>{
    const choices=[...(workspace.teachers||[])].filter(p=>p.active!==false).sort((a,b)=>a.teacher.localeCompare(b.teacher,'ar'));
    return h('label',{className:'sr-import-fix-field',key:group.key},
     h('span',{},group.subject+' — '+group.className),
     h('select',{value:group.selectedProfileId||'',onChange:event=>setAssignments(old=>({...old,[group.key]:event.target.value}))},
      h('option',{value:''},'اختر المعلم الصحيح'),
      ...choices.map(p=>h('option',{key:p.id,value:p.id},p.teacher+' — '+p.subject))));
   }))):null,
  advisory.length?h('details',{className:'sr-import-fix-alias'},
   h('summary',{},'تصحيح أسماء المواد وربطها بالهيكل الأكاديمي ('+advisory.length+' أوراق)'),
   h('p',{},'اختلاف كتابة مسمى المادة ليس تعارض درجات بحد ذاته. اختر الاسم المعتمد من الهيكل، ولا تُغيّر مادة إلى أخرى دون مراجعة.'),
   h('div',{className:'sr-import-fix-fields'},
   ...advisory.slice(0,limit).map(({file,sheet})=>h('label',{key:sheet.id,className:'sr-import-fix-field'},
    h('span',{},sheet.sheet+' — '+file.fileName),
    h('select',{value:schoolSubjects.find(name=>ij(name)===ij(sheet.subject))||'',
     onChange:event=>onSheetPatch(sheet.id,{subject:event.target.value||sheet.subject})},
     h('option',{value:''},'اسم الملف: '+sheet.subject),
     ...schoolSubjects.map(name=>h('option',{value:name,key:name},name))))))):null,
  metadataIssues?.length?h('p',{className:'sr-import-fix-parser'},'اختلاف بيانات المدرسة/العام: '+metadataIssues.slice(0,3).join('؛ ')+'. راجع التنبيه ومربع الموافقة الموجودين قبل الاعتماد؛ لا يُصحّح هذا الاختلاف بتبديل الدرجات.'):null,
  issues.length>limit||unmatched?.length>limit||sheetProblems.length>limit||advisory.length>limit||excludedRows.length>limit?
   button('عرض المزيد من مواضع المراجعة',()=>setLimit(value=>value+20)):null);
};
