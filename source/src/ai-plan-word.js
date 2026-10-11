/* SchoolResult 6.10.18 — editable, RTL, self-contained .docx plan exports.
   All names are used inside the local browser only; nothing is sent to Gemini. */
SR63.aiPlanWordMeta=function(workspace,plan,overrides){
  const settings=workspace.settings||{},students=Array.isArray(plan.members)?plan.members:[];
  const uniq=items=>[...new Set(items.map(x=>String(x??'').trim()).filter(Boolean))];
  const classes=uniq(students.map(x=>x.className));
  const grades=uniq(students.map(x=>x.grade));
  const studentIds=new Set(students.map(x=>String(x.studentId??'')));
  const exam=(settings.exams||[]).find(x=>x.name===plan.exam)?.key||(settings.exams||[]).find(x=>x.key===plan.exam)?.key||workspace.activeExam;
  const teachers=uniq((workspace.rows||[]).filter(r=>studentIds.has(String(r.studentId??''))&&(SR63.subjectAliasKey(r.subject)===SR63.subjectAliasKey(plan.subject)||SR63.reportSubjectLabel(r.subject,settings)===plan.subject)
    &&(!classes.length||classes.includes(r.examClasses?.[exam]||r.className)))
    .map(r=>r.examTeachers?.[exam]||r.teacher));
  const stored={...(plan.wordMeta||{}),...(overrides||{})};
  const use=(key,fallback)=>String(stored[key]??fallback??'').trim().slice(0,180);
  return {
    schoolName:use('schoolName',settings.schoolName),
    academicYear:use('academicYear',settings.academicYear),
    teacherName:use('teacherName',teachers.join('، ')),
    academicViceName:use('academicViceName',settings.academicViceName),
    principalName:use('principalName',settings.principalName),
    grade:grades.join('، ')||plan.grade||'—',
    className:classes.map(c=>SR63.displayClass?SR63.displayClass(c):c).join('، ')||plan.className||'—',
    ministryHeader:String(settings.reportDesign?.ministryHeader||'وزارة التربية والتعليم والتعليم العالي'),
    studentName:plan.scope==='individual'?String(students[0]?.studentName||'—'):'',
    date:plan.createdAt?new Date(plan.createdAt).toLocaleDateString('ar-QA',{year:'numeric',month:'2-digit',day:'2-digit'}):'',
    exam:String(plan.exam||'—'),subject:String(plan.subject||'—')
  };
};

SR63.aiPlanWordBuild=function(workspace,plan,overrides){
  if(!plan||!Array.isArray(plan.steps)||!plan.steps.length)SR63.fail('الخطة غير مكتملة ولا يمكن تصديرها.');
  const m=SR63.aiPlanWordMeta(workspace,plan,overrides),esc=value=>String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const run=(value,{bold=false,size=21,color='233846'}={})=>{
    const lines=String(value??'').split(/\r?\n/);
    return `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:rtl/>${bold?'<w:b/>':''}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:color w:val="${color}"/></w:rPr>${lines.map((x,i)=>(i?'<w:br/>':'')+`<w:t xml:space="preserve">${esc(x)}</w:t>`).join('')}</w:r>`;
  };
  const paragraph=(segments,opts={})=>{
    const items=Array.isArray(segments)?segments:[{text:segments}];
    const justification=opts.center?'center':'right',spacing=opts.after??115;
    return `<w:p><w:pPr><w:bidi/><w:jc w:val="${justification}"/><w:spacing w:before="0" w:after="${spacing}" w:line="295" w:lineRule="auto"/>${opts.keep?'<w:keepNext/>':''}</w:pPr>${items.map(i=>run(i.text,i)).join('')}</w:p>`;
  };
  const heading=(value)=>paragraph([{text:value,bold:true,size:26,color:'106b70'}],{after:135,keep:true});
  const label=(l,v)=>paragraph([{text:l+'  ',bold:true,size:21,color:'183f53'},{text:v||'—',size:21}],{after:115});
  const border='<w:tblBorders><w:top w:val="single" w:sz="6" w:color="A1BAC1"/><w:left w:val="single" w:sz="6" w:color="A1BAC1"/><w:bottom w:val="single" w:sz="6" w:color="A1BAC1"/><w:right w:val="single" w:sz="6" w:color="A1BAC1"/><w:insideH w:val="single" w:sz="5" w:color="D8E5E9"/><w:insideV w:val="single" w:sz="5" w:color="D8E5E9"/></w:tblBorders>';
  const table=(rows,widths,headerRow=false)=>`<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a,b)=>a+b,0)}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:bidiVisual/>${border}<w:tblCellMar><w:top w:w="105" w:type="dxa"/><w:bottom w:w="105" w:type="dxa"/><w:start w:w="110" w:type="dxa"/><w:end w:w="110" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${rows.map((row,idx)=>`<w:tr><w:trPr><w:cantSplit/>${headerRow&&idx===0?'<w:tblHeader/>':''}</w:trPr>${row.map((cell,i)=>`<w:tc><w:tcPr><w:tcW w:w="${widths[i]}" w:type="dxa"/>${headerRow&&idx===0?'<w:shd w:fill="E5F3F2"/>':''}</w:tcPr>${paragraph(Array.isArray(cell)?cell:[{text:cell,bold:headerRow&&idx===0,size:headerRow&&idx===0?20:19}],{after:35})}</w:tc>`).join('')}</w:tr>`).join('')}</w:tbl>`;
  const studentMode=plan.scope==='individual';
  const state=({draft:'مسودة للمراجعة',approved:'معتمدة',in_progress:'قيد التنفيذ',completed:'مكتملة'})[plan.status]||'مسودة';
  let body='';
  body+=paragraph([{text:'خطة علاجية لتحسين التحصيل الدراسي',bold:true,size:34,color:'104b5d'}],{center:true,after:125});
  body+=paragraph([{text:plan.title,bold:true,size:24,color:'146a6c'}],{center:true,after:205});
  body+=table([
    [[{text:'المعلم: ',bold:true},{text:m.teacherName||'................................'}],[{text:'المادة: ',bold:true},{text:m.subject}]],
    [[{text:'الصف: ',bold:true},{text:m.grade}],[{text:'الشعبة: ',bold:true},{text:m.className}]],
    [[{text:'التقييم: ',bold:true},{text:m.exam}],[{text:'الفئة: ',bold:true},{text:plan.cohort==='support'?'الدعم الإضافي':'التعليم العام'}]],
    [[{text:studentMode?'اسم الطالب: ':'عدد الطلاب: ',bold:true},{text:studentMode?m.studentName:String(plan.members.length)}],[{text:'حالة الخطة: ',bold:true},{text:state}]],
    [[{text:'العام الأكاديمي: ',bold:true},{text:m.academicYear}],[{text:'تاريخ الخطة: ',bold:true},{text:m.date}]]
  ],[5040,5040]);
  if(!studentMode){
    body+=heading('الطلاب المستهدفون');
    body+=table([['م','اسم الطالب','الصف والشعبة'],...plan.members.map((s,i)=>[String(i+1),s.studentName,String(s.grade||'')+' — '+String(s.className||'')])],[570,6050,3460],true);
  }
  body+=heading('التشخيص التربوي');body+=paragraph(plan.diagnosis||'يُحدد الاحتياج بصورة أدق بعد التقويم التشخيصي.');
  body+=heading('الهدف العلاجي');body+=paragraph(plan.goal||'—');
  body+=heading('مؤشر النجاح');body+=paragraph(plan.successCriterion||'—');
  body+=heading('إجراءات الخطة ووسائل المتابعة');
  const steps=[['الأسبوع','الهدف والإجراء العلاجي','الموارد والمسؤول','القياس والمتابعة']];
  for(const step of plan.steps){
    const action=[{text:step.objective?step.objective+'\n':'',bold:true,size:20,color:'153e4c'},{text:step.action||'—',size:19}];
    const resources=[{text:'الموارد: ',bold:true,size:19},{text:step.resources||'—',size:19},{text:'\nالمسؤول: ',bold:true,size:19},{text:step.responsible||'معلم المادة',size:19}];
    const measure=[{text:step.measure||'—',size:19},{text:'\nالتنفيذ: '+(step.completed?'تم':'لم يُنفّذ'),bold:true,size:19}];
    if(step.followUp)measure.push({text:'\nنتيجة المتابعة: '+step.followUp,size:19});
    steps.push([String(step.week),action,resources,measure]);
  }
  body+=table(steps,[720,4060,2460,2840],true);
  body+=heading('ملاحظات وضوابط تنفيذ الخطة');
  body+=paragraph(plan.cautions||'تُراجع الخطة بعد التقويم التشخيصي وتُعتمد من المختص.');
  body+=paragraph([{text:'إعداد ومتابعة: ',bold:true,size:20},{text:m.teacherName||'................................',size:20},{text:'   |   اعتماد المسؤول: ',bold:true,size:20},{text:plan.approvedBy||'لم تعتمد بعد',size:20}],{after:40});
  const footer=table([
    [[{text:'النائب الأكاديمي',bold:true,size:21,color:'104b5d'}],[{text:'مدير المدرسة',bold:true,size:21,color:'104b5d'}]],
    [[{text:m.academicViceName||'................................',size:20}],[{text:m.principalName||'................................',size:20}]],
    [[{text:'التوقيع: ........................',size:18}],[{text:'التوقيع: ........................',size:18}]]
  ],[5040,5040]);
  const pkg=(tag,content)=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><${tag} xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${content}</${tag}>`;
  const sect='<w:sectPr><w:headerReference w:type="default" r:id="rId2"/><w:footerReference w:type="default" r:id="rId3"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1260" w:right="870" w:bottom="1510" w:left="870" w:header="500" w:footer="510" w:gutter="0"/></w:sectPr>';
  const files={
    '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>',
    '_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    'word/_rels/document.xml.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>',
    'word/styles.xml':pkg('w:styles','<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:rtl/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr></w:pPrDefault></w:docDefaults>'),
    'word/document.xml':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>'+body+sect+'</w:body></w:document>',
    'word/header1.xml':pkg('w:hdr',paragraph([{text:m.ministryHeader,bold:true,size:19,color:'173f55'}],{center:true,after:65})+paragraph([{text:m.schoolName||'اسم المدرسة',bold:true,size:22,color:'173f55'}],{center:true,after:65})),
    'word/footer1.xml':pkg('w:ftr',footer)
  };
  // ECMA-376 OPC ZIP, STORE method. No CDN, JSZip or external browser dependency required.
  const bytes=new TextEncoder(),parts=[],central=[],crcTable=new Uint32Array(256);
  for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;crcTable[n]=c>>>0;}
  const crc32=a=>{let c=0xffffffff;for(const b of a)c=(crcTable[(c^b)&255]^(c>>>8))>>>0;return(c^0xffffffff)>>>0;};
  const little=(len,...values)=>{const a=new Uint8Array(len),v=new DataView(a.buffer);for(const [off,size,val] of values){if(size===2)v.setUint16(off,val,true);else v.setUint32(off,val>>>0,true);}return a;};
  let offset=0;
  for(const [name,xml] of Object.entries(files)){
    const filename=bytes.encode(name),data=bytes.encode(xml),check=crc32(data);
    const local=little(30,[0,4,0x04034b50],[4,2,20],[6,2,0],[8,2,0],[14,4,check],[18,4,data.length],[22,4,data.length],[26,2,filename.length]);
    parts.push(local,filename,data);
    const dir=little(46,[0,4,0x02014b50],[4,2,20],[6,2,20],[8,2,0],[10,2,0],[16,4,check],[20,4,data.length],[24,4,data.length],[28,2,filename.length],[42,4,offset]);
    central.push(dir,filename);offset+=local.length+filename.length+data.length;
  }
  const centralSize=central.reduce((n,x)=>n+x.length,0),end=little(22,[0,4,0x06054b50],[8,2,Object.keys(files).length],[10,2,Object.keys(files).length],[12,4,centralSize],[16,4,offset]);
  const output=new Uint8Array(offset+centralSize+end.length);let at=0;
  for(const p of [...parts,...central,end]){output.set(p,at);at+=p.length;}
  const short=(studentMode?m.studentName:'مجموعة-'+plan.members.length).replace(/[\\/:*?"<>|]/g,'-').slice(0,50)||'طلاب';
  const filename=`خطة-علاجية-${short}-${m.subject}`.replace(/[\\/:*?"<>|]/g,'-').slice(0,125)+'.docx';
  return {bytes:output,filename,metadata:m};
};
SR63.aiPlanWordDownload=function(workspace,plan,overrides){
  const doc=SR63.aiPlanWordBuild(workspace,plan,overrides);
  const blob=new Blob([doc.bytes],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=doc.filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
  return doc.filename;
};
