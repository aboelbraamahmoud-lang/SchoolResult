/* 6.10.92 — Student nationality management. Admin-only, exact ID match, no marks changed. */
SR63.nationalityId=function(value){
 const arabic='٠١٢٣٤٥٦٧٨٩',persian='۰۱۲۳۴۵۶۷۸۹';
 return String(value??'').trim().replace(/[\u00a0\u200e\u200f]/g,'').replace(/[٠-٩۰-۹]/g,c=>String(arabic.indexOf(c)>=0?arabic.indexOf(c):persian.indexOf(c))).replace(/\.0+$/,'').trim();
};
SR63.nationalityGroup=function(value){
 const s=String(value??'').trim().toLowerCase().replace(/[\u064b-\u065f\u0670]/g,'').replace(/\s+/g,' ');
 if(!s||/^(?:-|—|--|لا يوجد|غير معروف|غير محدد|جنسية غير محددة|غير مذكور|غير متوفر|غير مبين|غير مدون|unknown|unspecified|none|n\/a|na|null|nan|\?)$/.test(s))return '';
 if(/^(?:قطري|قطرية|قطر|دولة قطر|جنسية قطرية|الجنسية القطرية|qatar|qatari|qa)$/.test(s))return 'qatari';
 if(/^(?:قطري\s*\/\s*مقيم|qatari\s*\/\s*resident)$/.test(s))return '';
 return 'resident'; // Other explicitly stated nationalities, "غير قطري" and "مقيم".
};
SR63.cleanStudentNationalities=function(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return {};
 return Object.fromEntries(Object.entries(input).slice(0,100000).map(([id,value])=>[SR63.nationalityId(id),value])
  .filter(([id,value])=>id.length>0&&id.length<=150&&(value==='qatari'||value==='resident')));
};
SR63.studentNationalityFor=function(workspace,studentId){
 const id=SR63.nationalityId(studentId),v=workspace?.studentNationalities?.[id];
 return v==='qatari'||v==='resident'?v:'';
};
SR63.nationalityHeaderKind=function(value){
 const s=String(value??'').trim().toLowerCase().replace(/[\u064b-\u065f\u0670\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/[^\u0621-\u064a0-9a-z]/g,'');
 if(['الرقمالاكاديمي','الرقمالمدرسي','رقمالطالب','رقمالمتعلم','studentid','studentnumber','academicid','academicnumber','pupilid','studentcode'].includes(s))return 'id';
 if(['اسمالطالب','اسمالمتعلم','اسم','studentname','pupilname','fullname'].includes(s))return 'name';
 if(['الجنسية','جنسيةالطالب','nationality','citizenship','country'].includes(s))return 'nationality';
 if(['الشعبة','الصفوالشعبة','classname','class','section'].includes(s))return 'class';
 if(['الصف','الصفالدراسي','grade','schoolgrade'].includes(s))return 'grade';
 return '';
};
SR63.nationalityImportPreview=function(workspace,matrix){
 const lines=Array.isArray(matrix)?matrix:[],registry=SR63.studentRegistry(workspace,workspace.activeExam);
 const known=new Map(registry.map(s=>[SR63.nationalityId(s.studentId),s]));
 const findHeader=()=>{
  for(let i=0;i<Math.min(20,lines.length);i++){
   const fields=(Array.isArray(lines[i])?lines[i]:[]).map(SR63.nationalityHeaderKind);
   if(fields.includes('id')&&fields.includes('nationality'))return {i,fields};
  }
  return null;
 };
 const header=findHeader();
 if(!header)return {error:'الملف يحتاج عمود الرقم الأكاديمي وعمود الجنسية. نزّل النموذج من هذه الصفحة ثم املأه.',entries:[]};
 const idIndex=header.fields.indexOf('id'),natIndex=header.fields.indexOf('nationality'),nameIndex=header.fields.indexOf('name');
 const draft=new Map(),conflicted=new Set(),examples=[];
 let sourceRows=0,unmatched=0,invalid=0,nameMismatch=0,duplicates=0,conflicts=0;
 const addIssue=(line,message)=>{if(examples.length<15)examples.push({line,message});};
 for(let n=header.i+1;n<lines.length;n++){
  const cells=Array.isArray(lines[n])?lines[n]:[];
  if(!cells.some(v=>v!==null&&v!==undefined&&String(v).trim()))continue;
  sourceRows++;
  const id=SR63.nationalityId(cells[idIndex]),nationality=SR63.nationalityGroup(cells[natIndex]),student=known.get(id);
  if(!id||!student){unmatched++;addIssue(n+1,'رقم أكاديمي غير موجود بالمنصة');continue;}
  const rawNat=String(cells[natIndex]??'').trim();
  if(!nationality){invalid++;addIssue(n+1,rawNat?'جنسية غير واضحة':'الجنسية فارغة');continue;}
  const name=nameIndex>=0?String(cells[nameIndex]??'').trim():'';
  if(name&&SR63.studentNameKey(name)!==SR63.studentNameKey(student.studentName)){
   nameMismatch++;addIssue(n+1,'الاسم لا يطابق الطالب المرتبط بالرقم الأكاديمي');continue;
  }
  if(conflicted.has(id))continue;
  if(draft.has(id)){
   if(draft.get(id).group!==nationality){draft.delete(id);conflicted.add(id);conflicts++;addIssue(n+1,'جنسيتان مختلفتان للرقم الأكاديمي نفسه');}
   else duplicates++;
   continue;
  }
  draft.set(id,{studentId:id,studentName:student.studentName,className:student.className,group:nationality});
 }
 const entries=[...draft.values()],previous=workspace?.studentNationalities||{};
 const merged={...previous,...Object.fromEntries(entries.map(s=>[s.studentId,s.group]))};
 const counts=registry.reduce((tot,s)=>{const k=merged[SR63.nationalityId(s.studentId)];if(k==='qatari')tot.qatari++;else if(k==='resident')tot.resident++;else tot.unknown++;return tot;},{qatari:0,resident:0,unknown:0});
 return {error:'',entries,sourceRows,matched:entries.length,unmatched,invalid,nameMismatch,duplicates,conflicts,examples,counts,totalStudents:registry.length};
};
SR63.studentNationalityTemplate=function(workspace){
 const rows=SR63.studentRegistry(workspace,workspace.activeExam)
  .slice().sort((a,b)=>SR63.gradeOrder(a.grade)-SR63.gradeOrder(b.grade)||String(a.className).localeCompare(String(b.className),'ar',{numeric:true})||a.studentName.localeCompare(b.studentName,'ar'));
 const head=['الرقم الأكاديمي','اسم الطالب','الصف','الشعبة','الجنسية'];
 const matrix=[head,...rows.map(s=>[String(s.studentId),s.studentName,s.grade,s.className,
   SR63.studentNationalityFor(workspace,s.studentId)==='qatari'?'قطري':SR63.studentNationalityFor(workspace,s.studentId)==='resident'?'مقيم':''])];
 const sheet=Gv.aoa_to_sheet(matrix);
 sheet['!cols']=[{wch:24},{wch:46},{wch:19},{wch:19},{wch:23}];
 const book=Gv.book_new();Gv.book_append_sheet(book,sheet,'جنسيات الطلاب');
 Tv(book,'نموذج-جنسيات-الطلاب.xlsx');
 return rows.length;
};
SR63.StudentNationalityAdmin=function({workspace,setWorkspace}){
 const h=(tag,props,...children)=>(0,v.createElement)(tag,props,...children);
 const [preview,setPreview]=(0,v.useState)(null),[busy,setBusy]=(0,v.useState)(false);
 const [error,setError]=(0,v.useState)(''),[filename,setFilename]=(0,v.useState)('');
 const registry=(0,v.useMemo)(()=>SR63.studentRegistry(workspace,workspace.activeExam),[workspace]);
 const summary=(0,v.useMemo)(()=>registry.reduce((out,student)=>{
  const group=SR63.studentNationalityFor(workspace,student.studentId);
  if(group==='qatari')out.qatari++;else if(group==='resident')out.resident++;else out.unknown++;
  return out;
 },{qatari:0,resident:0,unknown:0}),[registry,workspace.studentNationalities]);
 const cardStyle={background:'#fff',border:'1px solid #d3e0e6',borderRadius:16,padding:'18px',boxShadow:'0 6px 22px rgba(15,55,85,.05)'};
 const btnStyle={background:'#087a73',color:'#fff',padding:'11px 17px',border:'none',borderRadius:9,fontWeight:800,cursor:'pointer'};
 const fileChange=async event=>{
  const file=event.target.files?.[0];setPreview(null);setError('');setFilename(file?.name||'');
  if(!file)return;
  if(!/\.(xlsx|xls)$/i.test(file.name))return setError('ارفع ملف Excel بصيغة XLSX أو XLS فقط.');
  if(file.size>8*1024*1024)return setError('حجم الملف أكبر من 8 ميجابايت؛ ارفع كشف الجنسيات فقط.');
  setBusy(true);
  try{
   const bytes=await file.arrayBuffer(),book=Gv.read(new Uint8Array(bytes),{type:'array'});
   let result;
   for(const name of book.SheetNames){
    const matrix=Gv.sheet_to_json(book.Sheets[name],{header:1,raw:false,defval:''});
    const proposal=SR63.nationalityImportPreview(workspace,matrix);
    if(!proposal.error){result=proposal;break;}
   }
   if(!result)throw Error('لم أعثر على ورقة تحتوي الرقم الأكاديمي والجنسية. استخدم النموذج الذي يمكنك تنزيله من هذه الصفحة.');
   setPreview(result);
   if(!result.matched)setError('لم يُطابق الملف أي طالب؛ راجع ملاحظات المطابقة، ولم تُحفظ أي بيانات.');
  }catch(err){setError(String(err?.message||'تعذر فتح ملف Excel.').slice(0,230));}
  finally{setBusy(false);event.target.value='';}
 };
 const apply=async()=>{
  if(busy||!preview||preview.error||!preview.matched)return;
  const currentIds=new Set(SR63.studentRegistry(workspace,workspace.activeExam).map(s=>SR63.nationalityId(s.studentId)));
  if(preview.entries.some(s=>!currentIds.has(s.studentId)))return setError('تغيّرت سجلات الطلاب منذ معاينة الملف. أعد رفع الملف للمراجعة.');
  setBusy(true);setError('');
  try{
   if(!await Kj(workspace,'قبل اعتماد ملف جنسيات الطلاب'))throw Error('تعذر إنشاء نقطة استعادة آمنة؛ لم تُعتمد الجنسيات.');
   const patch=Object.fromEntries(preview.entries.map(s=>[s.studentId,s.group]));
   const count=preview.matched;
   setWorkspace(current=>jj({...current,studentNationalities:{...(current.studentNationalities||{}),...patch}},
    'اعتماد جنسيات الطلاب','تم تصنيف '+count+' طالب من ملف الجنسيات دون تعديل أي درجة أو نتيجة'));
   setPreview(null);setFilename('');
   eb.success('تم اعتماد تصنيفات '+count+' طالب، وسيُستخدم الفصل بين القطريين والمقيمين عند طلب تقارير الأوائل.');
  }catch(err){setError(String(err?.message||'تعذر حفظ الجنسيات.'));}
  finally{setBusy(false);}
 };
 const stat=(label,value)=>h('div',{style:{flex:'1 1 170px',padding:'15px',background:'#f5f9fb',border:'1px solid #d6e4e9',borderRadius:12}},
  h('div',{style:{fontWeight:700,color:'#466477',fontSize:12}},label),h('strong',{style:{fontSize:25,color:'#143c53'}},value));
 return h('section',{dir:'rtl',className:'sr610-nationality-admin',style:{display:'grid',gap:18}},
  h('header',{style:cardStyle},h('h2',{style:{fontSize:24,fontWeight:900,color:'#173f55'}},'جنسيات الطلاب — تقسيم المراكز العشرة الأولى'),
   h('p',{style:{lineHeight:1.9,color:'#486276'}},'ارفع كشف جنسيات الطلاب من لوحة الإدارة بعد معاينته. يُربط كل طالب برقمِه الأكاديمي دون تغيير درجاته أو مواده أو شعبته. لا تُستنتج الجنسية من الاسم أو الرقم.')),
  h('div',{style:{display:'flex',gap:12,flexWrap:'wrap'}},
   stat('طلاب قطريون',summary.qatari),stat('طلاب مقيمون',summary.resident),stat('جنسية غير محددة',summary.unknown),stat('إجمالي الطلاب',registry.length)),
  h('section',{style:cardStyle},
   h('h3',{style:{fontSize:18,fontWeight:900,marginBottom:8}},'الخطوة ١ — تنزيل نموذج Excel من بيانات المنصة'),
   h('p',{style:{marginBottom:14,color:'#4e6876'}},'يحتوي النموذج على الرقم الأكاديمي واسم الطالب والصف والشعبة. املأ عمود «الجنسية» فقط، مثل: قطري، مصري، أردني، أو مقيم.'),
   h('button',{type:'button',style:btnStyle,disabled:busy||!registry.length,onClick:()=>{try{SR63.studentNationalityTemplate(workspace)}catch(err){setError(String(err?.message||'تعذر تنزيل النموذج'))}}},'تنزيل نموذج الجنسيات (Excel)')),
  h('section',{style:cardStyle},
   h('h3',{style:{fontSize:18,fontWeight:900,marginBottom:8}},'الخطوة ٢ — رفع الملف ومراجعة المطابقة'),
   h('input',{type:'file',accept:'.xlsx,.xls',disabled:busy,onChange:fileChange,'aria-label':'رفع ملف جنسيات الطلاب',style:{border:'1px solid #b5c9d2',padding:11,borderRadius:9,width:'100%',maxWidth:530}}),
   filename?h('p',{style:{color:'#42677d',marginTop:8}},'الملف المحدد: '+filename):null,
   error?h('p',{role:'alert',style:{color:'#a52c39',fontWeight:750,marginTop:10}},error):null,
   preview?h('div',{style:{marginTop:14,display:'grid',gap:9}},
    h('div',{style:{display:'flex',gap:9,flexWrap:'wrap'}},
      stat('صفوف الملف',preview.sourceRows),stat('طلاب مطابقون',preview.matched),
      stat('أرقام غير موجودة',preview.unmatched),stat('أسماء غير مطابقة',preview.nameMismatch),
      stat('جنسيات فارغة/غير واضحة',preview.invalid),stat('تعارضات',preview.conflicts)),
    h('p',{style:{fontWeight:750,color:'#295569'}},'بعد الاعتماد: '+preview.counts.qatari+' قطريًا، '+preview.counts.resident+' مقيمًا، و'+preview.counts.unknown+' دون تحديد. يُحتفظ بتصنيفات الطلاب السابقين غير الموجودين في الملف الجديد.'),
    preview.examples.length?h('div',{style:{background:'#fff8ed',padding:12,borderRadius:9,color:'#704416'}},
       h('strong',{},'ملاحظات على الصفوف غير المطابقة (البيانات غير المعتمدة تُتجاهل):'),
       h('ul',{style:{margin:'8px 20px'}},preview.examples.map((x,i)=>h('li',{key:i},'صف '+x.line+': '+x.message)))):null,
    h('button',{type:'button',disabled:busy||!preview.matched,style:{...btnStyle,background:busy||!preview.matched?'#91a4a9':'#22639a',maxWidth:300},onClick:()=>void apply()},
      busy?'جارٍ الاعتماد...':'الخطوة ٣ — اعتماد الجنسيات وحفظها')
   ):h('p',{style:{marginTop:13,color:'#526c78'}},'لن يتغير شيء في قاعدة البيانات قبل اختيار ملف ومراجعة المطابقة ثم الضغط على الاعتماد.')),
  h('p',{style:{color:'#4d6474',fontSize:13,lineHeight:1.8}},'تنبيه: يظهر الطلاب غير محددي الجنسية في عدد المراجعة فقط، ولا يدخلون أي قائمة أوائل خاصة بجنسية حتى تستكمل بياناتهم. يُحسب الترتيب منفصلًا داخل كل صف أو شعبة أو مادة، مع الإبقاء على المراكز المكررة عند التعادل.')
 );
};
