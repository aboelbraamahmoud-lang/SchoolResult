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
 // A clean, print-ready A4 landscape certificate, built from the existing validated
 // DOCX package. The ministry image/rels remain embedded in the official Word file.
 let certificateReady=false;
 const certificateWordXml=()=>{
  const template=SR63.behaviorOfficialTemplate;
  if(!template||!template['word/document.xml'])throw Error('قالب Word غير متاح.');
  if(certificateReady)return;
  const original=template['word/document.xml'];
  const bodyPos=original.indexOf('<w:body>'),sectionPos=original.lastIndexOf('<w:sectPr'),endBody=original.indexOf('</w:body>',sectionPos);
  if(bodyPos<0||sectionPos<0||endBody<0)throw Error('تعذر فتح هيكل شهادة Word الرسمية.');
  const esc=escapeXml;
  const run=(text,{size=20,bold=false,color='213547'}={})=>`<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:rtl/><w:color w:val="${color}"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/>${bold?'<w:b/><w:bCs/>':''}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
  const para=(text,style={})=>`<w:p><w:pPr><w:bidi/><w:jc w:val="${style.align||'center'}"/><w:spacing w:before="${style.before||0}" w:after="${style.after||0}" w:line="240" w:lineRule="auto"/></w:pPr>${text===null?'':run(text,style)}</w:p>`;
  const cell=(text,{color='213547',bg='FFFFFF',bold=false,size=18,align='center',pad=85,width=0}={})=>`<w:tc><w:tcPr>${width?`<w:tcW w:w="${width}" w:type="dxa"/>`:''}<w:shd w:fill="${bg}"/><w:tcMar><w:top w:w="${pad}" w:type="dxa"/><w:bottom w:w="${pad}" w:type="dxa"/><w:left w:w="90" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tcMar><w:tcBorders><w:top w:val="single" w:sz="5" w:color="CFD8DF"/><w:bottom w:val="single" w:sz="5" w:color="CFD8DF"/><w:left w:val="single" w:sz="5" w:color="CFD8DF"/><w:right w:val="single" w:sz="5" w:color="CFD8DF"/></w:tcBorders></w:tcPr>${para(text,{color,size,bold,align})}</w:tc>`;
  const table=(rows,widths)=>`<w:tbl><w:tblPr><w:bidiVisual/><w:tblW w:w="${widths.reduce((a,b)=>a+b,0)}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblCellSpacing w:w="0" w:type="dxa"/><w:jc w:val="center"/></w:tblPr><w:tblGrid>${widths.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${rows.map(cols=>`<w:tr>${cols.join('')}</w:tr>`).join('')}</w:tbl>`;
  const logo=`<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="580000" cy="650000"/><wp:docPr id="633" name="شعار وزارة التربية والتعليم والتعليم العالي"/><wp:cNvGraphicFramePr/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="633" name="Ministry logo"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId7"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="580000" cy="650000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
  const header=table([[
   cell('{{SCHOOL_NAME}}',{width:5900,bold:true,size:25,color:'24394A',pad:95}),
   cell('وزارة التربية والتعليم والتعليم العالي',{width:4700,bold:true,size:19,color:'6E1939',pad:95}),
   `<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>${logo}</w:tc>`
  ]],[5900,4700,3000]);
  const title=table([[cell('التقرير الأكاديمي والسلوكي للطالب',{bg:'702441',color:'FFFFFF',size:29,bold:true,pad:135})]],[13600]);
  const identity=table([[
   cell('اسم الطالب: {{STUDENT_NAME}}',{width:6800,align:'right',bg:'F4F7F8',size:20,bold:true,pad:105}),
   cell('الشعبة: {{CLASS_NAME}}',{width:3900,align:'right',bg:'F4F7F8',size:19,bold:true,pad:105}),
   cell('شهر التقرير: {{MONTH}}',{width:2900,align:'right',bg:'F4F7F8',size:17,bold:true,pad:105})
  ]],[6800,3900,2900]);
  const head=['المادة / المستوى','المستوى الأكاديمي','التفاعل والمشاركة','إحضار الكتب والأدوات','الواجبات','السلوك'];
  const headers=head.map((text,i)=>cell(text,{bg:i===0?'284D5D':i===5?'AE8230':'2C6074',color:'FFFFFF',bold:true,size:17,pad:105}));
  const widths=[3850,1950,1950,1950,1950,1950];
  const grades=subjects.map((s,i)=>[
   cell(s.label,{bg:i%2?'F5F8F8':'FFFFFF',align:'right',size:18,bold:true,pad:105}),
   ...Array.from({length:5},(_,j)=>cell(`{{S${i+1}_${j+1}}}`,{bg:i%2?'F5F8F8':'FFFFFF',size:17,pad:105}))
  ]);
  const report=table([headers,...grades],widths);
  const footer=table([[
   cell('ختم المدرسة / الاعتماد',{width:6800,color:'677885',size:17,pad:125}),
   cell('مدير المدرسة: {{PRINCIPAL_NAME}}',{width:6800,color:'702441',size:20,bold:true,pad:125})
  ]],[6800,6800]);
  const body=header+para('العام الأكاديمي: {{ACADEMIC_YEAR}}',{align:'right',size:16,color:'6B7280',before:45,after:80})+title+para(' ',{size:8,before:50,after:50})+identity+para(' ',{size:8,before:70,after:70})+report+para(' ',{size:8,before:70,after:70})+footer;
  const section=original.slice(sectionPos,endBody).replace(/<w:pgMar[^>]*\/>/,'<w:pgMar w:top="680" w:right="700" w:bottom="680" w:left="700" w:header="300" w:footer="300" w:gutter="0"/>');
  template['word/document.xml']=original.slice(0,bodyPos+8)+body+section+original.slice(endBody);
  certificateReady=true;
 };
 const documentFor=(stu,options={})=>{
  const values={SCHOOL_NAME:options.schoolName||'اسم المدرسة',MONTH:options.month||'سبتمبر 2025',ACADEMIC_YEAR:options.academicYear||'—',PRINCIPAL_NAME:options.principalName||'...................................',STUDENT_NAME:stu.name,CLASS_NAME:stu.className};
  for(let i=0;i<9;i++){const fields=stu.subjects[subjects[i].id]||[];for(let j=0;j<5;j++)values[`S${i+1}_${j+1}`]=fields[j]||'';}
  const source=SR63.behaviorOfficialTemplate?.['word/document.xml'];if(!source)throw Error('قالب Word الأكاديمي السلوكي غير موجود.');
  return source.replace(/\{\{([A-Z0-9_]+)\}\}/g,(original,name)=>Object.hasOwn(values,name)?escapeXml(values[name]):original);
 };
 SR63.behaviorBuildWord=function(students,options={}){
  if(!Array.isArray(students)||!students.length)throw Error('اختر طالبًا أو شعبة تحتوي طلابًا لإنشاء التقرير.');
  if(students.length>500)throw Error('للأمان وسلامة Word: أقصى تصدير جماعي 500 طالب في الملف الواحد.');
  certificateWordXml();
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
 const toPrint=stu=>subjects.map(s=>{const cells=stu.subjects[s.id]||[];return `<tr><th scope="row">${escapeHtml(s.label)}</th>${Array.from({length:5},(_,i)=>`<td>${escapeHtml(cells[i]||'')}</td>`).join('')}</tr>`}).join('');
 const certificateHtml=(stu,options={})=>{
  const school=escapeHtml(options.schoolName||'اسم المدرسة'),month=escapeHtml(options.month||'—'),year=escapeHtml(options.academicYear||'—'),principal=escapeHtml(options.principalName||'...................................');
  const logo=escapeHtml(options.logoSrc||'./moehe.png'),stampSrc=String(options.stampSrc||'').trim(),showStamp=options.showStamp!==false&&!!stampSrc;
  const stampBlock=showStamp?`<div class="sr633-seal"><span>الختم الإلكتروني</span><img class="sr633-stamp" src="${escapeHtml(stampSrc)}" alt="الختم الإلكتروني للمدرسة"></div>`:`<div class="sr633-seal">ختم المدرسة / الاعتماد</div>`;
  return `<section class="sr633-certificate" dir="rtl" aria-label="شهادة التقرير الأكاديمي والسلوكي"><header class="sr633-doc-head"><div class="sr633-brand"><div class="sr633-ministry">وزارة التربية والتعليم والتعليم العالي</div><strong class="sr633-school">${school}</strong><small>العام الأكاديمي: ${year}</small></div><img src="${logo}" alt="شعار وزارة التربية والتعليم والتعليم العالي"></header><h2 class="sr633-doc-title">التقرير الأكاديمي والسلوكي للطالب</h2><div class="sr633-identity"><span>اسم الطالب: <b>${escapeHtml(stu.name)}</b></span><span>الشعبة: <b>${escapeHtml(stu.className)}</b></span><span>الشهر: <b>${month}</b></span></div><table class="sr633-results"><colgroup><col style="width:28%"><col span="5" style="width:14.4%"></colgroup><thead><tr>${['المادة / المستوى','المستوى الأكاديمي','التفاعل والمشاركة','إحضار الكتب والأدوات','الواجبات','السلوك'].map(x=>`<th scope="col">${x}</th>`).join('')}</tr></thead><tbody>${toPrint(stu)}</tbody></table><footer class="sr633-doc-footer">${stampBlock}<div class="sr633-principal"><span>مدير المدرسة</span><strong>${principal}</strong><small>التوقيع: ...........................</small></div></footer></section>`;
 };
 SR63.behaviorCertificateHtml=certificateHtml;
 const certificatePrintStyle=`@page{size:A4 landscape;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;font-family:Arial,Tahoma,sans-serif;color:#203749;background:#e7eaed}.sr633-certificate{box-sizing:border-box;width:297mm;height:210mm;min-height:210mm;background:#fff;margin:0 auto 15px;padding:13mm 15mm 10mm;display:flex;flex-direction:column;break-after:page;page-break-after:always;direction:rtl;overflow:hidden}.sr633-certificate:last-child{break-after:auto;page-break-after:auto}.sr633-doc-head{display:flex;align-items:center;justify-content:space-between;gap:14px;border-bottom:3px solid #702441;padding:0 0 14px;margin-bottom:13px;min-height:70px}.sr633-doc-head img{width:205px;max-height:60px;object-fit:contain;object-position:left}.sr633-brand{display:grid;gap:3px}.sr633-ministry{font-size:13px;font-weight:800;color:#702441}.sr633-school{font-size:21px;font-weight:900;color:#203749}.sr633-brand small{font-size:11px;color:#678}.sr633-doc-title{margin:0;background:#702441;color:#fff;text-align:center;border-radius:5px;padding:10px;font-size:21px;font-weight:900}.sr633-identity{display:grid;grid-template-columns:2.1fr 1fr 1fr;gap:8px;margin:13px 0 15px}.sr633-identity span{border:1px solid #d7dfe4;background:#f5f8f9;padding:12px 13px;font-size:13px;border-radius:5px;color:#526676;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sr633-identity b{color:#142e41;font-weight:900}.sr633-results{width:100%;border-collapse:collapse;table-layout:fixed;text-align:center;direction:rtl}.sr633-results th,.sr633-results td{border:1px solid #cbd6dd;padding:9px 5px;font-weight:800;font-size:12px;line-height:1.55}.sr633-results thead th{background:#2c6074;color:#fff;font-weight:900;font-size:12px}.sr633-results thead th:first-child{background:#284d5d}.sr633-results thead th:last-child{background:#ae8230}.sr633-results tbody th{text-align:right;color:#27485d;font-weight:900}.sr633-results tbody tr:nth-child(even){background:#f4f8fa}.sr633-doc-footer{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;border-top:2px solid #e3cfa2;margin-top:auto;padding-top:15px;min-height:74px}.sr633-seal{font-size:12px;color:#7a8996;display:grid;gap:6px;justify-items:start;align-items:end}.sr633-seal span{font-weight:900;color:#556673}.sr633-stamp{width:115px;max-width:115px;max-height:115px;object-fit:contain;opacity:.94;filter:drop-shadow(0 2px 4px rgba(90,30,55,.18))}.sr633-principal{min-width:260px;text-align:center;display:grid;gap:5px;color:#702441}.sr633-principal span{font-size:13px;font-weight:900}.sr633-principal strong{font-size:17px;font-weight:900}.sr633-principal small{font-size:11px;color:#7a8996}@media print{html,body{background:#fff}.sr633-certificate{margin:0;width:297mm;height:210mm;box-shadow:none}.sr633-doc-title,.sr633-results thead th{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;
 SR63.behaviorPrint=function(students,options={}){
  if(!students.length)throw Error('لا توجد بيانات للطباعة.');
  const win=window.open('','_blank');if(!win)throw Error('يرجى السماح بالنوافذ المنبثقة لطباعة التقارير.');
  const logoSrc=new URL('./moehe.png',document.baseURI).href;
  const html=students.map(stu=>certificateHtml(stu,{...options,logoSrc})).join('');
  win.document.open();win.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>التقارير الأكاديمية والسلوكية</title><style>${certificatePrintStyle}</style></head><body>${html}</body></html>`);win.document.close();
  let printed=false;const print=()=>{if(printed)return;printed=true;win.focus();win.print();};
  Promise.race([win.document.fonts?.ready||Promise.resolve(),new Promise(resolve=>setTimeout(resolve,1500))]).then(()=>{
   const image=win.document.querySelector('img');if(!image||image.complete)print();else{image.addEventListener('load',print,{once:true});image.addEventListener('error',print,{once:true});setTimeout(print,2000);}
  });
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
  const doWord=async()=>{try{setBusy(true);await SR63.loadWordTemplate('behavior');const out=SR63.behaviorBuildWord(scoped,{schoolName:workspace.settings.schoolName,academicYear:workspace.settings.academicYear,principalName:workspace.settings.principalName,month,className:selectedClass});SR63.behaviorReportSave(out.bytes,out.filename);setMessage(`تم تجهيز ${scoped.length} تقرير Word مطابق للنموذج المعتمد.`);}catch(e){setMessage(e.message);}finally{setBusy(false);}};
  const doPrint=()=>{try{SR63.behaviorPrint(scoped,{schoolName:workspace.settings.schoolName,academicYear:workspace.settings.academicYear,principalName:workspace.settings.principalName,month,stampSrc:workspace.settings.reportDesign?.stampDataUrl||'',showStamp:workspace.settings.reportDesign?.showStamp!==false});}catch(e){setMessage(e.message);}};
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
   (0,q.jsxs)('div',{className:'sr632-actions',children:[(0,q.jsx)('button',{type:'button',onClick:()=>setPrepared(true),children:'تجهيز المعاينة'}),(0,q.jsx)('button',{type:'button',disabled:busy||!scoped.length,onClick:()=>void doWord(),children:scoped.length===1?'تنزيل تقرير الطالب Word':`تنزيل ${scoped.length} تقريرًا بملف Word واحد`}),(0,q.jsx)('button',{type:'button',disabled:!scoped.length,onClick:doPrint,children:'طباعة التقارير / حفظ PDF'})]}),
   (0,q.jsxs)('div',{children:[(0,q.jsx)('p',{className:'sr632-note',children:`الطلاب ضمن الاختيار: ${scoped.length}. يتم ترك القيم غير الموجودة في Excel فارغة، دون وضع تقييمات افتراضية.`}),(0,q.jsx)('p',{className:'sr632-note',children:workspace.settings.reportDesign?.stampDataUrl?(workspace.settings.reportDesign?.showStamp!==false?'الختم الإلكتروني مفعّل وسيظهر تلقائيًا في معاينة الشهادات والطباعة / PDF.':'تم رفع ختم إلكتروني لكنه مخفي حاليًا من إعدادات تصميم التقارير.'):'لإظهار ختم إلكتروني على الشهادات، ارفعه من إعدادات «تصميم التقارير» ثم فعّل خيار إظهار الختم.'})]}),
   (0,q.jsxs)('details',{children:[(0,q.jsx)('summary',{children:`سجل مراجعة الاستيراد (${issueReport.length} تنبيه)`}),(0,q.jsx)('div',{className:'sr632-issues',children:issueReport.slice(0,100).map((x,i)=>(0,q.jsx)('p',{children:x.text},i))})]}),
   (0,q.jsxs)('div',{className:'sr632-preview',children:[
    !prepared?(0,q.jsx)('p',{className:'sr632-note',children:'اضغط «تجهيز المعاينة» لرؤية شهادات الطلاب. لا تُنشأ معاينة جميع الشعب تلقائيًا لتجنب إبطاء البرنامج.'}):null,
    ...reports.slice(0,10).map(stu=>(0,q.jsx)('article',{className:'sr632-preview-sheet sr633-preview-wrap',children:(0,q.jsx)('div',{dangerouslySetInnerHTML:{__html:certificateHtml(stu,{schoolName:workspace.settings.schoolName,academicYear:workspace.settings.academicYear,principalName:workspace.settings.principalName,month,stampSrc:workspace.settings.reportDesign?.stampDataUrl||'',showStamp:workspace.settings.reportDesign?.showStamp!==false})}})},stu.id)),
    prepared&&reports.length>10?(0,q.jsx)('p',{className:'sr632-note',children:`تُعرض أول 10 شهادات فقط للمعاينة السريعة؛ تصدير Word والطباعة يشملان جميع الطلاب المحددين (${reports.length}).`}):null
   ]})]}):null
  ]});
 };
})();
