/* 6.10.32 — Academic and behavior report, exact user-supplied school Word form.
   Excel values are not test scores. A missing evaluation is never interpreted
   as a negative evaluation or fabricated into a value. */
(function(){
 const subjects=[
  {id:'islamic',sheet:'التربية الاسلامية',label:'التربية الاسلامية'},
  {id:'arabic',sheet:'اللغة العربية',label:'اللغة العربية'},
  {id:'english',sheet:'اللغة الانجليزية',label:'اللغة الانجليزية'},
  {id:'math',sheet:'الرياضيات',label:'الرياضيات'},
  {id:'science',sheet:'العلوم',label:'العلوم'},
  {id:'social',sheet:'الاجتماعيات',label:'العلوم الاجتماعية'},
  {id:'computer',sheet:'الحاسوب',label:'الحوسبة وتكنولوجيا المعلومات'},
  {id:'art',sheet:'الفنية',label:'الفنون البصرية'},
  {id:'pe',sheet:'الرياضة',label:'التربية البدنية'}
 ];
 const norm=v=>String(v??'').normalize('NFKC').trim().replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/\s+/g,' ').toLowerCase();
 const cls=v=>String(v??'').trim().normalize('NFKC').replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\s+/g,'').replace(/^0+(\d+)\//,'$1/').toUpperCase();
 const cell=v=>v===undefined||v===null?'':String(v).trim().replace(/\s+/g,' ').slice(0,150);
 const key=(name,klass)=>norm(name)+'|'+cls(klass);
 const msg=(type,text,context={})=>({type,text,...context});
 const pageSafe=text=>String(text).replace(/[\\/:*?"<>|]/g,'-').slice(0,115);
 const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const escapeXml=v=>String(v??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 const resultsFor=(book,sheetName)=>Gv.sheet_to_json(book.Sheets[sheetName],{header:1,raw:false,defval:'',blankrows:false});
 const identitySet=ws=>{const unique=new Map();for(const row of ws?.rows||[]){const k=key(row.studentName,row.className);if(!unique.has(k))unique.set(k,new Set());unique.get(k).add(String(row.studentId||''));}return unique;};
 SR63.behaviorReportSubjects=subjects;
 SR63.behaviorReportParse=function(book,sourceName,workspace){
  if(!book||!Array.isArray(book.SheetNames))throw Error('تعذر قراءة ملف Excel.');
  const students=new Map(),issues=[],files=[],seenKeys=new Map();
  // The source workbook contains nine reliable single-subject sheets and a
  // wide duplicated sheet named "سابع الكل". Never double count that sheet.
  const target=subjects.filter(s=>book.SheetNames.some(n=>norm(n)===norm(s.sheet)));
  if(!target.length)throw Error('لم أجد أوراق المواد التسع في Excel. تحقق من وجود أوراق التربية الإسلامية واللغة العربية وغيرها.');
  for(const s of target){
   const realName=book.SheetNames.find(n=>norm(n)===norm(s.sheet));if(!realName)continue;
   const matrix=resultsFor(book,realName),first=matrix[0]||[];
   if(norm(first[1])!=='الاسم'||norm(first[2])!=='الصف'||!norm(first[3]).includes('المستوي')){
    issues.push(msg('error','عناوين الأعمدة في ورقة '+realName+' غير مطابقة للقالب.'));continue;
   }
   let accepted=0;
   for(let r=1;r<matrix.length;r++){
    const a=matrix[r]||[],name=cell(a[1]),className=cell(a[2]);
    if(!name&&!className)continue;
    if(norm(name)==='الاسم'&&norm(className)==='الصف')continue;
    if(!name||!/^\d{1,2}\/([1-9]\d?|ESE)$/i.test(cls(className))){
     issues.push(msg('warning','صف غير صالح أو عنوان متكرر داخل ورقة '+realName,{row:r+1}));continue;
    }
    const id=key(name,className),previousKey=seenKeys.get(realName+'|'+id);
    if(previousKey!==undefined){issues.push(msg('error',`الطالب «${name}» مكرر في ورقة ${realName} — الصف ${className}.`,{row:r+1}));continue;}
    seenKeys.set(realName+'|'+id,r);
    if(!students.has(id))students.set(id,{id,name,className,subjects:{},notes:{},officialId:''});
    const student=students.get(id),values=[3,4,5,6,7].map(c=>cell(a[c]));
    if(!student.subjects[s.id])student.subjects[s.id]=values;
    const annotation=cell(a[8]);if(annotation&&/(?:محروم|غائب|عذر|عدم|بدون تقييم)/.test(annotation)){
     student.notes[s.id]=annotation;
     issues.push(msg('warning',`تنبيه في ${realName}: ${name} — ${annotation}.`,{row:r+1}));
    }
    if(values.every(v=>!v))issues.push(msg('warning',`لا توجد تقييمات في ${realName} للطالب ${name}.`,{row:r+1}));
    accepted++;
   }
   files.push({sheet:realName,subject:s.label,rows:accepted});
  }
  if(!students.size)throw Error('ملف Excel لا يحتوي طلابًا صالحين للاستيراد.');
  const registry=identitySet(workspace),seenName=new Map();
  for(const stu of students.values()){
   const ids=registry.get(stu.id);stu.officialId=ids?.size===1?[...ids][0]:'';
   if(ids?.size>1)issues.push(msg('warning',`الطالب ${stu.name} له أكثر من رقم مطابق في سجلات النتائج. راجع الهوية.`,{studentId:stu.id}));
   const sameName=norm(stu.name);(seenName.get(sameName)||seenName.set(sameName,[]).get(sameName)).push(stu.className);
  }
  for(const [studentName,groups] of seenName)if(new Set(groups.map(cls)).size>1)issues.push(msg('warning',`اسم متكرر بين أكثر من شعبة: ${studentName} — ${groups.join('، ')}. تم الفصل حسب الشعبة.`));
  const sorted=[...students.values()].sort((a,b)=>cls(a.className).localeCompare(cls(b.className),'en',{numeric:true})||a.name.localeCompare(b.name,'ar'));
  const missing=sorted.filter(stu=>subjects.some(s=>!stu.subjects[s.id]||stu.subjects[s.id].some(v=>!v))).length;
  return {version:1,sourceName:String(sourceName||'تقييمات.xlsx').slice(0,200),at:new Date().toISOString(),students:sorted,issueCount:issues.length,issues:issues.slice(0,700),sheets:files,missing,matched:sorted.filter(s=>s.officialId).length};
 };
 const base64Bytes=encoded=>{const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',result=[];let acc=0,bits=0;for(const c of encoded){if(c==='=')break;const n=alphabet.indexOf(c);if(n<0)continue;acc=(acc<<6)|n;bits+=6;if(bits>=8){bits-=8;result.push((acc>>>bits)&255);}}return new Uint8Array(result);};
 const packageZip=files=>{
  const tbl=new Uint32Array(256);for(let i=0;i<256;i++){let n=i;for(let k=0;k<8;k++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;tbl[i]=n;}
  const crc=data=>{let x=0xffffffff;for(const v of data)x=tbl[(x^v)&255]^(x>>>8);return(x^0xffffffff)>>>0;};
  const encoder=new TextEncoder(),records=[];let total=0;
  const date=new Date(),year=Math.max(1980,date.getFullYear()),dosDate=((year-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate(),dosTime=(date.getHours()<<11)|(date.getMinutes()<<5)|(date.getSeconds()>>1);
  for(const [name,val] of Object.entries(files)){const file=encoder.encode(name),data=typeof val==='string'?encoder.encode(val):val?.b64?base64Bytes(val.b64):val;
   if(!(data instanceof Uint8Array))throw Error('محتوى Word غير معروف: '+name);records.push({file,data,hash:crc(data),offset:total});total+=30+file.length+data.length;}
  const cd=records.reduce((sum,x)=>sum+46+x.file.length,0),buf=new Uint8Array(total+cd+22),view=new DataView(buf.buffer);let pos=0;
  const u16=(p,v)=>view.setUint16(p,v,true),u32=(p,v)=>view.setUint32(p,v>>>0,true);
  for(const x of records){u32(pos,0x04034b50);u16(pos+4,20);u16(pos+6,0x0800);u16(pos+8,0);u16(pos+10,dosTime);u16(pos+12,dosDate);u32(pos+14,x.hash);u32(pos+18,x.data.length);u32(pos+22,x.data.length);u16(pos+26,x.file.length);pos+=30;buf.set(x.file,pos);pos+=x.file.length;buf.set(x.data,pos);pos+=x.data.length;}
  const offset=pos;for(const x of records){u32(pos,0x02014b50);u16(pos+4,20);u16(pos+6,20);u16(pos+8,0x0800);u16(pos+10,0);u16(pos+12,dosTime);u16(pos+14,dosDate);u32(pos+16,x.hash);u32(pos+20,x.data.length);u32(pos+24,x.data.length);u16(pos+28,x.file.length);u32(pos+42,x.offset);pos+=46;buf.set(x.file,pos);pos+=x.file.length;}
  u32(pos,0x06054b50);u16(pos+8,records.length);u16(pos+10,records.length);u32(pos+12,pos-offset);u32(pos+16,offset);return buf;
 };
 const documentFor=(stu,options={})=>{
  const values={SCHOOL_NAME:options.schoolName||'مدرسة أبو عبيدة الإعدادية للبنين',MONTH:options.month||'سبتمبر 2025',STUDENT_NAME:stu.name,CLASS_NAME:stu.className};
  for(let i=0;i<9;i++){const fields=stu.subjects[subjects[i].id]||[];for(let j=0;j<5;j++)values[`S${i+1}_${j+1}`]=fields[j]||'';}
  const source=SR63.behaviorOfficialTemplate?.['word/document.xml'];if(!source)throw Error('قالب Word الأكاديمي السلوكي غير موجود.');
  return source.replace(/\{\{([A-Z0-9_]+)\}\}/g,(original,name)=>Object.hasOwn(values,name)?escapeXml(values[name]):original);
 };
 SR63.behaviorBuildWord=function(students,options={}){
  if(!Array.isArray(students)||!students.length)throw Error('اختر طالبًا أو شعبة تحتوي طلابًا لإنشاء التقرير.');
  if(students.length>500)throw Error('للأمان وسلامة Word: أقصى تصدير جماعي 500 طالب في الملف الواحد.');
  const template=SR63.behaviorOfficialTemplate,source=template['word/document.xml'],start=source.indexOf('<w:body>'),end=source.lastIndexOf('<w:sectPr');
  if(start<0||end<start)throw Error('لا يمكن تقسيم قالب التقرير الأكاديمي السلوكي.');
  const bodyStart=start+'<w:body>'.length,bodyEnd=source.indexOf('</w:body>',end),head=source.slice(0,bodyStart),section=source.slice(end,bodyEnd),tail=source.slice(bodyEnd),inner=source.slice(bodyStart,end);
  const payload=students.map(s=>documentFor(s,options));
  const body=students.length===1?payload[0]:head+students.map((s,i)=>{
   const rendered=payload[i];let filled=rendered.slice(bodyStart,rendered.lastIndexOf('<w:sectPr'));
   // Every repeated Word page needs unique OOXML drawing / paragraph IDs.
   // Office may otherwise reject a valid ZIP as a malformed Word document.
   if(i){
    filled=filled.replace(/<(wp:docPr|pic:cNvPr) id="(\d+)"/g,(_,tag,num)=>`<${tag} id="${Number(num)+i*100}"`);
    filled=filled.replace(/(w14:(?:paraId|textId)="|<wp14:(?:anchorId|editId)>)([0-9A-Fa-f]{8})("|<\/wp14:(?:anchorId|editId)>)/g,(_,before,hex,after)=>before+((parseInt(hex,16)+i*1237)>>>0).toString(16).padStart(8,'0').toUpperCase()+after);
   }
   return (i?'<w:p><w:pPr><w:pageBreakBefore/></w:pPr></w:p>':'')+filled;
  }).join('')+section+tail;
  const parts={...template,'word/document.xml':body};
  const name=students.length===1?'التقرير-الأكاديمي-السلوكي-'+students[0].name:'التقارير-الأكاديمية-السلوكية-'+(options.className||'جميع-الشعب')+'-'+students.length+'-طالب';
  return {bytes:packageZip(parts),filename:pageSafe(name)+'.docx'};
 };
 SR63.behaviorReportSave=(bytes,filename,mime='application/vnd.openxmlformats-officedocument.wordprocessingml.document')=>{
  const file=new Blob([bytes],{type:mime}),url=URL.createObjectURL(file),anchor=document.createElement('a');anchor.href=url;anchor.download=filename;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),9000);
 };
 const toPrint=stu=>subjects.map(s=>{const cells=stu.subjects[s.id]||[];return `<tr><th>${escapeHtml(s.label)}</th>${Array.from({length:5},(_,i)=>`<td>${escapeHtml(cells[i]||'')}</td>`).join('')}</tr>`}).join('');
 SR63.behaviorPrint=function(students,options){if(!students.length)throw Error('لا توجد بيانات للطباعة.');
  const title=options.schoolName||'مدرسة أبو عبيدة الإعدادية للبنين',month=options.month||'سبتمبر 2025';
  const win=window.open('','_blank');if(!win)throw Error('يرجى السماح بالنوافذ المنبثقة لطباعة التقارير.');
  const officialLogo=SR63.behaviorOfficialTemplate?.['word/media/image1.jpeg']?.b64;
  const logoSrc=officialLogo?'data:image/jpeg;base64,'+officialLogo:'./moehe.png';
  const html=students.map(stu=>`<section class="page" dir="rtl"><header><img src="${logoSrc}" alt="شعار الوزارة"><b>${escapeHtml(title)}</b></header><h2>التقرير الأكاديمي السلوكي لشهر ${escapeHtml(month)}</h2><div class="identity"><span>اسم الطالب: <b>${escapeHtml(stu.name)}</b></span><span>الصف: <b>${escapeHtml(stu.className)}</b></span></div><table><thead><tr><th>المادة / المستوى</th><th>المستوى الأكاديمي</th><th>التفاعل والمشاركة</th><th>إحضار الكتب والأدوات</th><th>الواجبات</th><th>السلوك</th></tr></thead><tbody>${toPrint(stu)}</tbody></table><footer>إدارة المدرسة</footer></section>`).join('');
  win.document.open();win.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>التقارير الأكاديمية والسلوكية</title><style>body{font-family:Arial,Tahoma,sans-serif;margin:0;color:#071a2a}.page{box-sizing:border-box;width:297mm;min-height:210mm;padding:14mm 10mm;page-break-after:always;break-after:page}.page:last-child{page-break-after:auto;break-after:auto}header{display:flex;align-items:center;justify-content:space-between;min-height:28mm;font-size:19px}header img{width:21mm;height:auto}h2{font-size:20px;text-align:center;background:#bcd7ec;border:2px solid #142e44;padding:5px}.identity{display:flex;justify-content:space-between;background:#f5cdae;padding:8px 14px;margin:12px 25mm;font-size:17px;font-weight:bold;border:1px solid #333}table{border-collapse:collapse;width:100%;table-layout:fixed;direction:rtl;margin-top:8mm}th,td{border:2px solid #555;text-align:center;vertical-align:middle;padding:10px 4px;height:27px;font-size:13px;font-weight:bold}thead th{background:#b7cdec}thead th:first-child{background:#fff}thead th:nth-child(2),thead th:nth-child(4){background:#c7e0ba}thead th:nth-child(6){background:#ffe69b}th:first-child{width:22%}footer{margin-top:10mm;font-size:18px;font-weight:bold}@page{size:A4 landscape;margin:0}@media screen{body{background:#eee}.page{background:#fff;margin:18px auto;box-shadow:0 2px 10px #999}}@media print{.page{width:auto;min-height:0}}</style></head><body>${html}</body></html>`);win.document.close();win.focus();setTimeout(()=>win.print(),500);
 };
 SR63.BehaviorAcademicReports=function({workspace,setWorkspace}){
  const existing=workspace.behaviorReports||null;
  const [month,setMonth]=(0,v.useState)(existing?.month||'سبتمبر 2025'),[selectedClass,setClass]=(0,v.useState)('الكل'),[selectedStudent,setStudent]=(0,v.useState)('الكل'),[prepared,setPrepared]=(0,v.useState)(false),[busy,setBusy]=(0,v.useState)(false),[message,setMessage]=(0,v.useState)('');
  const [current,setCurrent]=(0,v.useState)(null);
  const dataset=current||existing,students=dataset?.students||[];
  const classList=[...new Set(students.map(s=>s.className))].sort((a,b)=>cls(a).localeCompare(cls(b),'en',{numeric:true}));
  const scoped=students.filter(s=>(selectedClass==='الكل'||cls(s.className)===cls(selectedClass))&&(selectedStudent==='الكل'||s.id===selectedStudent));
  const reports=prepared?scoped:[];
  const importFile=async(event)=>{const file=event.target.files?.[0];if(!file)return;setBusy(true);setMessage('');setPrepared(false);
   try{if(file.size>20_000_000)throw Error('يجب ألا يتجاوز ملف Excel حجم 20 ميجابايت.');
    const book=hv(new Uint8Array(await file.arrayBuffer()),{type:'array'});
    const parsed=SR63.behaviorReportParse(book,file.name,workspace);
    const next={...parsed,month};setCurrent(next);
    setWorkspace(w=>({...w,behaviorReports:next}));
    setMessage(`تم استيراد ${next.students.length} طالبًا من ${next.sheets.length} مواد. تمت إضافة البيانات السلوكية منفصلة عن درجات الاختبارات.`);
    setClass('الكل');setStudent('الكل');
   }catch(err){setMessage('تعذر الاستيراد: '+err.message);}finally{setBusy(false);event.target.value='';}
  };
  const saveMonth=value=>{setMonth(value);if(dataset){setCurrent({...dataset,month:value});setWorkspace(w=>({...w,behaviorReports:{...w.behaviorReports,month:value}}));}};
  const doWord=()=>{try{const out=SR63.behaviorBuildWord(scoped,{schoolName:workspace.settings.schoolName,month,className:selectedClass});SR63.behaviorReportSave(out.bytes,out.filename);setMessage(`تم تجهيز ${scoped.length} تقرير Word مطابق للنموذج المعتمد.`);}catch(e){setMessage(e.message);}};
  const doPrint=()=>{try{SR63.behaviorPrint(scoped,{schoolName:workspace.settings.schoolName,month});}catch(e){setMessage(e.message);}};
  const control=(label,value,setter,options)=>(0,q.jsxs)('label',{className:'sr632-control',children:[(0,q.jsx)('span',{children:label}),(0,q.jsx)('select',{value,onChange:e=>{setter(e.target.value);setPrepared(false)},children:options.map(({value,label})=>(0,q.jsx)('option',{value,children:label},value))})]});
  const missingCount=stu=>subjects.reduce((n,s)=>n+(stu.subjects[s.id]||[]).filter(v=>!v).length+(stu.subjects[s.id]?0:5),0);
  const issueReport=dataset?.issues||[];
  return (0,q.jsxs)('main',{className:'sr632-page',dir:'rtl',children:[
   (0,q.jsxs)('header',{className:'sr632-banner',children:[(0,q.jsx)('img',{src:'./moehe.png',alt:'شعار وزارة التربية والتعليم والتعليم العالي'}),(0,q.jsxs)('div',{children:[(0,q.jsx)('small',{children:workspace.settings.schoolName}),(0,q.jsx)('h1',{children:'التقارير الأكاديمية والسلوكية للطلاب'}),(0,q.jsx)('p',{children:'استيراد التقييمات من Excel وإصدار شهادة Word رسمية لكل طالب أو لجميع طلاب الشعبة وفق النموذج المعتمد.'})]})]}),
   (0,q.jsxs)('section',{className:'sr632-panel',children:[(0,q.jsx)('h2',{children:'1. بيانات Excel والشهادة الشهرية'}),(0,q.jsx)('div',{className:'sr632-grid',children:[
    (0,q.jsxs)('label',{className:'sr632-control',children:[(0,q.jsx)('span',{children:'استيراد تقييمات Excel (أوراق المواد التسع)'}),(0,q.jsx)('input',{type:'file',accept:'.xlsx,.xls',disabled:busy,onChange:e=>void importFile(e)})]}),
    (0,q.jsxs)('label',{className:'sr632-control',children:[(0,q.jsx)('span',{children:'شهر التقرير — يُطبع كما تكتبه'}),(0,q.jsx)('input',{value:month,maxLength:70,onChange:e=>saveMonth(e.target.value),placeholder:'مثال: سبتمبر 2025'})]})]}),
    (0,q.jsx)('p',{className:'sr632-note',children:'نستخدم أوراق المواد المستقلة؛ ولا نستورد الورقة الشاملة مرة أخرى. يظل تقييم 07/ESE منفصلًا، ولا تُعدّل درجات الاختبارات.'}),
    message?(0,q.jsx)('div',{className:'sr632-notice',role:'status',children:message}):null,
    dataset?(0,q.jsxs)('div',{className:'sr632-kpis',children:[['الطلاب',students.length],['المواد',dataset.sheets?.length||0],['الشعب',classList.length],['مطابقة بسجلات المدرسة',dataset.matched||0],['طلاب يحتاجون مراجعة بيانات',dataset.missing||0]].map(([key,value])=>(0,q.jsxs)('div',{children:[(0,q.jsx)('span',{children:key}),(0,q.jsx)('b',{children:value})]},key))}):null
   ]}),
   dataset?(0,q.jsxs)('section',{className:'sr632-panel',children:[(0,q.jsx)('h2',{children:'2. اختيار الصف والشعبة والطالب'}),(0,q.jsx)('div',{className:'sr632-grid',children:[
    control('الشعبة',selectedClass,value=>{setClass(value);setStudent('الكل')},[{value:'الكل',label:'جميع الشعب'},...classList.map(x=>({value:x,label:x}))]),
    control('الطالب',selectedStudent,setStudent,[{value:'الكل',label:'كل طلاب الشعبة'},...students.filter(s=>selectedClass==='الكل'||cls(s.className)===cls(selectedClass)).map(s=>({value:s.id,label:s.name+' — '+s.className}))])
   ]}),
   (0,q.jsxs)('div',{className:'sr632-actions',children:[(0,q.jsx)('button',{type:'button',onClick:()=>setPrepared(true),children:'تجهيز المعاينة'}),(0,q.jsx)('button',{type:'button',disabled:!scoped.length,onClick:doWord,children:scoped.length===1?'تنزيل تقرير الطالب Word':`تنزيل ${scoped.length} تقريرًا بملف Word واحد`}),(0,q.jsx)('button',{type:'button',disabled:!scoped.length,onClick:doPrint,children:'طباعة التقارير / حفظ PDF'})]}),
   (0,q.jsx)('p',{className:'sr632-note',children:`الطلاب ضمن الاختيار: ${scoped.length}. يتم ترك القيم غير الموجودة في Excel فارغة، دون وضع تقييمات افتراضية.`}),
   (0,q.jsxs)('details',{children:[(0,q.jsx)('summary',{children:`سجل مراجعة الاستيراد (${issueReport.length} تنبيه)`}),(0,q.jsx)('div',{className:'sr632-issues',children:issueReport.slice(0,100).map((x,i)=>(0,q.jsx)('p',{children:x.text},i))})]}),
   (0,q.jsxs)('div',{className:'sr632-preview',children:[
    !prepared?(0,q.jsx)('p',{className:'sr632-note',children:'اضغط «تجهيز المعاينة» لرؤية شهادات الطلاب. لا تُنشأ معاينة جميع الشعب تلقائيًا لتجنب إبطاء البرنامج.'}):null,
    ...reports.slice(0,10).map(stu=>(0,q.jsxs)('article',{className:'sr632-preview-sheet',children:[(0,q.jsxs)('header',{children:[(0,q.jsx)('b',{children:workspace.settings.schoolName}),(0,q.jsx)('small',{children:'التقرير الأكاديمي السلوكي لشهر '+month})]}),(0,q.jsxs)('div',{className:'sr632-name',children:[(0,q.jsx)('b',{children:stu.name}),(0,q.jsx)('span',{children:stu.className})]}),(0,q.jsxs)('table',{children:[(0,q.jsx)('thead',{children:(0,q.jsx)('tr',{children:['المادة / المستوى','المستوى الأكاديمي','التفاعل والمشاركة','إحضار الكتب والأدوات','الواجبات','السلوك'].map(x=>(0,q.jsx)('th',{children:x},x))})}),(0,q.jsx)('tbody',{children:subjects.map(s=>(0,q.jsx)('tr',{children:[(0,q.jsx)('th',{children:s.label}),...(stu.subjects[s.id]||['','','','','']).map((x,i)=>(0,q.jsx)('td',{children:x||''},i))]},s.id))})]}),(0,q.jsx)('small',{children:missingCount(stu)?`حقول بلا تقييم: ${missingCount(stu)}`:'جميع الحقول مكتملة'})]},stu.id)),
    prepared&&reports.length>10?(0,q.jsx)('p',{className:'sr632-note',children:`تُعرض أول 10 شهادات فقط للمعاينة السريعة؛ تصدير Word والطباعة يشملان جميع الطلاب المحددين (${reports.length}).`}):null
   ]})]}):null
  ]});
 };
})();
