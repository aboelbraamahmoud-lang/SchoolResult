/* 6.10.19 — native Office Open XML Word exports of school teacher performance.
   No external dependency, AI call, or student data upload. */
SR63.teacherWordKit=function(meta,{landscape=false,maroon='8D153A'}={}){
 const esc=x=>String(x??'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 const width=landscape?14750:9800;
 const r=(x,{bold=false,size=21,color='243746'}={})=>`<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:rtl/>${bold?'<w:b/><w:bCs/>':''}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:color w:val="${color}"/></w:rPr>${String(x??'').split(/\r?\n/).map((line,i)=>(i?'<w:br/>':'')+`<w:t xml:space="preserve">${esc(line)}</w:t>`).join('')}</w:r>`;
 const p=(val,{size=21,bold=false,color='243746',center=false,after=105,keep=false}={})=>`<w:p><w:pPr><w:bidi/><w:jc w:val="${center?'center':'right'}"/><w:spacing w:before="0" w:after="${after}" w:line="290" w:lineRule="auto"/>${keep?'<w:keepNext/>':''}</w:pPr>${Array.isArray(val)?val.map(x=>r(x.text,x)).join(''):r(val,{size,bold,color})}</w:p>`;
 const header=title=>p(title,{size:26,bold:true,color:maroon,after:95,keep:true});
 const borders='<w:tblBorders><w:top w:val="single" w:sz="7" w:color="BACBD0"/><w:left w:val="single" w:sz="7" w:color="BACBD0"/><w:bottom w:val="single" w:sz="7" w:color="BACBD0"/><w:right w:val="single" w:sz="7" w:color="BACBD0"/><w:insideH w:val="single" w:sz="5" w:color="D3E0E4"/><w:insideV w:val="single" w:sz="5" w:color="D3E0E4"/></w:tblBorders>';
 const table=(rows,widths,{head=true,size=18,alternate=true}={})=>{
   if(!widths||!rows.length)return '';
   const total=widths.reduce((n,x)=>n+x,0),norm=widths.map(x=>Math.round(x/total*width)),delta=width-norm.reduce((n,x)=>n+x,0);norm[norm.length-1]+=delta;
   return `<w:tbl><w:tblPr><w:tblW w:w="${width}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:bidiVisual/>${borders}<w:tblCellMar><w:top w:w="82" w:type="dxa"/><w:bottom w:w="82" w:type="dxa"/><w:start w:w="105" w:type="dxa"/><w:end w:w="105" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${norm.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${rows.map((cells,i)=>`<w:tr><w:trPr><w:cantSplit/>${head&&i===0?'<w:tblHeader/>':''}</w:trPr>${cells.map((cell,k)=>`<w:tc><w:tcPr><w:tcW w:w="${norm[k]}" w:type="dxa"/>${head&&i===0?`<w:shd w:fill="${maroon}"/>`:alternate&&i%2===0?'<w:shd w:fill="F0F6F7"/>':''}</w:tcPr>${p(cell,{size,bold:head&&i===0,color:head&&i===0?'FFFFFF':'233847',after:18})}</w:tc>`).join('')}</w:tr>`).join('')}</w:tbl>`;
 };
 const pkg=(tag,body)=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><${tag} xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${body}</${tag}>`;
 const sign=table([['جهة الاعتماد','الاسم','التوقيع'],['المعلم',meta.teacher||'—','....................'],['منسق المادة',meta.coordinator||'....................','....................'],['النائب الأكاديمي',meta.vice||'....................','....................'],['مدير المدرسة',meta.principal||'....................','....................']],[2500,4400,2900],{size:16});
 const footer=p('إعداد معلم المادة · تُراجع النتائج والمقترحات وتعتمدها الإدارة المدرسية قبل التنفيذ.',{size:15,color:'607887',center:true,after:45});
 const section=`<w:sectPr><w:headerReference w:type="default" r:id="rId2"/><w:footerReference w:type="default" r:id="rId3"/><w:pgSz w:w="${landscape?16838:11906}" w:h="${landscape?11906:16838}" w:orient="${landscape?'landscape':'portrait'}"/><w:pgMar w:top="1130" w:right="1010" w:bottom="1060" w:left="1010" w:header="470" w:footer="430"/></w:sectPr>`;
 const make=(body,name)=>{
   const files={
    '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>',
    '_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    'word/_rels/document.xml.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>',
    'word/styles.xml':pkg('w:styles','<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:rtl/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr></w:pPrDefault></w:docDefaults>'),
    'word/document.xml':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>'+body+section+'</w:body></w:document>',
    'word/header1.xml':pkg('w:hdr',p('وزارة التربية والتعليم والتعليم العالي  |  '+(meta.schoolName||'اسم المدرسة'),{size:18,bold:true,color:maroon,center:true,after:40})),
    'word/footer1.xml':pkg('w:ftr',footer)
   };
   const encoder=new TextEncoder(),crcTable=new Uint32Array(256),parts=[],central=[];
   for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;crcTable[n]=c>>>0;}
   const crc32=a=>{let c=0xffffffff;for(const b of a)c=(crcTable[(c^b)&255]^(c>>>8))>>>0;return(c^0xffffffff)>>>0;};
   const record=(size,items)=>{const b=new Uint8Array(size),view=new DataView(b.buffer);for(const [at,bytes,value] of items){if(bytes===2)view.setUint16(at,value,true);else view.setUint32(at,value>>>0,true);}return b;};
   let offset=0;
   for(const [path,xml] of Object.entries(files)){
     const filename=encoder.encode(path),data=encoder.encode(xml),checksum=crc32(data);
     const local=record(30,[[0,4,0x04034b50],[4,2,20],[14,4,checksum],[18,4,data.length],[22,4,data.length],[26,2,filename.length]]);
     parts.push(local,filename,data);
     const dir=record(46,[[0,4,0x02014b50],[4,2,20],[6,2,20],[16,4,checksum],[20,4,data.length],[24,4,data.length],[28,2,filename.length],[42,4,offset]]);
     central.push(dir,filename);offset+=local.length+filename.length+data.length;
   }
   const centralSize=central.reduce((n,x)=>n+x.length,0),end=record(22,[[0,4,0x06054b50],[8,2,Object.keys(files).length],[10,2,Object.keys(files).length],[12,4,centralSize],[16,4,offset]]);
   const out=new Uint8Array(offset+centralSize+end.length);let cursor=0;
   for(const part of [...parts,...central,end]){out.set(part,cursor);cursor+=part.length;}
   return {bytes:out,filename:name.replace(/[\\/:*?"<>|]/g,'-').slice(0,155)+'.docx'};
 };
 return {p,header,table,sign,make,esc,width};
};
SR63.teacherWordDownload=function(output){
 const blob=new Blob([output.bytes],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=output.filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);return output.filename;
};
SR63.teacherImprovementWordBuild=function(analysis,edits={}){
 const kit=SR63.teacherWordKit({schoolName:analysis.schoolName,teacher:analysis.teacher,coordinator:analysis.coordinator,vice:analysis.academicViceName,principal:analysis.principalName},{landscape:true});
 const {p,header,table,sign,make}=kit,f=x=>x===null||x===undefined?'—':String(x),pp=x=>x===null?'—':x.toFixed(1)+'%',chg=x=>x===null?'—':(x>0?'+':'')+x.toFixed(1)+' نقطة';
 const defaults=SR63.teacherImprovementDefaults(analysis.subject),actions={...defaults,...edits};
 const names={low:'الطلبة ذوو الأداء المتدني',middle:'الطلبة ذوو الأداء المتوسط',high:'الطلبة ذوو الأداء المرتفع'};
 let body=p('خطة تحسين أداء الطلبة',{size:34,bold:true,color:'8D153A',center:true,after:100});
 body+=p(`تحليل نتائج ${analysis.examName} وخطة تحسين الأداء`,{size:23,bold:true,center:true,after:110});
 body+=table([['المدرسة','العام الأكاديمي','المعلم','المادة','الصفوف والشعب'],[analysis.schoolName,analysis.academicYear,analysis.teacher,analysis.subjectLabel,analysis.groups.map(g=>g.className).join('، ')]],[2500,1700,2400,2050,1800],{size:17});
 body+=p(`التقييم السابق: ${analysis.prevExamName||'لا يوجد'}   |   عدد الطلاب: ${analysis.studentCount}   |   درجات حاضرة: ${analysis.evaluated}   |   المقارنون: ${analysis.compared}`,{size:19,after:145});
 body+=table([['المؤشر','النتيجة الحالية','مقارنة بالتقييم السابق','ملاحظة'],
 ['النجاح',pp(analysis.success),'—','من بين أصحاب النتائج الحاضرة فقط'],
 ['التحصيل',pp(analysis.achievement),'—','مجموع الدرجات ÷ مجموع الكلي'],
 ['القيمة المضافة',chg(analysis.valueAdded),analysis.prevExamName||'لا توجد مقارنة','متوسط فرق نقاط مئوية للطلاب ذوي نتيجتين'],
 ['الطلبة الحاصلون على 90% فأعلى',pp(analysis.high90),'—','من بين أصحاب النتائج الحاضرة فقط']],[2500,1500,1850,3950],{size:18});
 for(const [band,rows] of Object.entries(analysis.bands).filter(([k])=>k!=='missing')){
  body+=header(`${names[band]} — ${rows.length} طالبًا`);
  const groups=rows.length?rows:[];
  body+=groups.length?table([['م','اسم الطالب','الشعبة','السابق','الحالي','التغير'],...groups.map((s,i)=>[String(i+1),s.studentName,s.className,pp(s.previous),pp(s.current),chg(s.change)])],[500,4150,1200,1300,1300,1350],{size:17}):p('لا يوجد طلاب في هذه الفئة بهذا الاختبار.',{size:18});
  body+=table([['الأهداف المنشودة','آلية التدخل والدعم — قابلة للتعديل','المخرجات الكمية المتوقعة'],[actions[band+'Goal'],actions[band+'Actions'],actions[band+'Indicator']]],[2500,4850,2650],{size:18});
 }
 if(analysis.bands.missing.length){
  body+=header(`حالات لا تُصنَّف وفق المستوى — ${analysis.bands.missing.length}`);
  body+=p('هذه الحالات غير مرصودة أو غير محتسبة؛ لا تُحوَّل إلى صفر ولا توضع في فئة الأداء المتدني. تُستكمل البيانات أولًا.',{size:18});
  body+=table([['اسم الطالب','الشعبة','حالة التقييم'],...analysis.bands.missing.map(s=>[s.studentName,s.className,({'absent':'غائب','excused':'بعذر','unexcused':'غياب دون عذر','deprived':'محروم','not_enrolled':'غير مقيد','unentered':'غير مرصود'})[s.currentStatus]||'غير محتسب'])],[5600,2200,2200],{size:18});
 }
 body+=header('آلية متابعة أثر خطة التحسين');
 body+=p('تُراجع مستويات الطلاب والإجراءات عقب الاختبار اللاحق؛ ويُقاس التحسن بمقارنة نسب الطالب في الاختبارين ذوي الدرجات الحاضرة، مع اعتماد المهارات المتعثرة على اختبار تشخيصي.',{size:20});
 body+=header('اعتماد ومراجعة الخطة');body+=sign;
 return make(body,`خطة-تحسين-الأداء-${analysis.teacher}-${analysis.subjectLabel}-${analysis.examName}`);
};
SR63.teacherQuantitativeWordBuild=function(analysis,edits={}){
 const {p,header,table,sign,make}=SR63.teacherWordKit({schoolName:analysis.schoolName,teacher:analysis.teacher,coordinator:analysis.coordinator,vice:analysis.academicViceName,principal:analysis.principalName},{landscape:analysis.groups.length>4});
 const fmt=x=>x===null||x===undefined?'—':Number(x).toFixed(1)+'%',positive=x=>x===null?'—':(x>0?'+':'')+Number(x).toFixed(1)+' نقطة';
 const targets={success:90,achievement:75,valueAdded:3,high90:30,...(edits.targets||{})};
 const achieved=(v,target)=>v===null?'لا تتوافر بيانات':v>=Number(target)?'متحقق':'غير متحقق';
 const metrics=[
  {label:`نسبة النجاح في ${analysis.examName}`,field:'success',target:targets.success,type:'percent'},
  {label:'نسبة التحصيل الأكاديمي في التقييم الحالي',field:'achievement',target:targets.achievement,type:'percent'},
  {label:`متوسط الدرجة للتلاميذ المقارنين في ${analysis.prevExamName||'التقييم السابق'}`,field:'matchedPrevious',target:null,type:'percent'},
  {label:'القيمة المضافة بين الاختبارين للطلاب ذوي نتيجتين',field:'valueAdded',target:targets.valueAdded,type:'change'},
  {label:'نسبة الحاصلين على 90% فأعلى',field:'high90',target:targets.high90,type:'percent'},
  {label:'عدد الطلاب ذوي نتيجتين قابلتين للمقارنة',field:'compared',target:null,type:'number'}
 ];
 const titles=analysis.groups.map(g=>g.className);
 let body=p('تقرير كمي ووصفي لتحليل نتائج التقييم',{size:31,bold:true,color:'8D153A',center:true,after:90});
 body+=p(`${analysis.examName} لمادة ${analysis.subjectLabel} · العام الأكاديمي ${analysis.academicYear}`,{size:22,center:true,bold:true,after:85});
 body+=p(`المدرسة: ${analysis.schoolName}     |     المعلم: ${analysis.teacher}     |     منسق المادة: ${analysis.coordinator||'........................'}`,{size:19,after:110});
 body+=p(`المنسق الفاضل: ${analysis.coordinator||'........................'}، بعد قراءة نتائج الطلبة للشعب التي أقوم بتدريسها، أقدم تقريرًا كميًا ووصفيًا يوضح نسب النجاح والتحصيل ومستويات الأداء والقيمة المضافة، مع تفسير مدعوم بالبيانات ومواضع التحديات والحلول المقترحة.`,{size:20,after:145});
 for(let start=0;start<analysis.groups.length;start+=4){
  const chunk=analysis.groups.slice(start,start+4);
  if(start)body+=header('تابع المؤشرات للشعب الدراسية');
  const rows=[['بنود التقرير',...chunk.map(g=>g.className),'إجمالي المعلم','تحقيق المستهدف']];
  for(const metric of metrics){
   const show=x=>metric.type==='number'?String(x??'—'):metric.type==='change'?positive(x):fmt(x);
   rows.push([metric.label,...chunk.map(g=>show(g[metric.field])),show(analysis[metric.field]),metric.target===null?'—':achieved(analysis[metric.field],metric.target)]);
  }
  const widths=[4300,...chunk.map(()=>1100),1800,1500];
  body+=table(rows,widths,{size:18});
 }
 body+=p(`ضوابط القراءة: النجاح والتحصيل على النتائج الحاضرة؛ القيمة المضافة متوسط الفرق بين النسبتين للطلاب الذين لديهم نتيجة في كلا الاختبارين (${analysis.compared} طالبًا). لا تُحتسب حالات الغياب أو عدم الرصد صفرًا.`,{size:17,color:'557083',after:115});
 body+=header('تفسير النتائج (الأسباب / التحديات / الحلول)');
 body+=p(edits.interpretation||SR63.teacherReportNarrative(analysis),{size:20,after:95});
 body+=header('التحديات المرصودة والتشخيص المطلوب');
 body+=p(edits.challenges||`يوجد ${analysis.bands.low.length} طالبًا ضمن فئة الأداء المتدني و${analysis.bands.middle.length} ضمن الفئة المتوسطة، مع ${analysis.bands.missing.length} حالة غير مرصودة. لا تُنسب أسباب الضعف إلى الطلاب دون نتائج تشخيصية أو ملاحظات موثقة.`,{size:20});
 body+=header('الحلول والإجراءات المقترحة');
 body+=p(edits.solutions||'إجراء تقويم تشخيصي للمهارات المستهدفة، وإعداد أوراق عمل متفاوتة المستوى، وتوظيف مجموعات دعم وتعلم أقران وأنشطة إثرائية للمتفوقين، ثم تقويم بعدي لمراجعة أثر الإجراءات.',{size:20});
 body+=header('التغذية الراجعة من منسق المادة');
 body+=p(edits.feedback||'..................................................................................................\n..................................................................................................',{size:19,after:160});
 body+=header('الاعتماد والتوقيعات');body+=sign;
 return make(body,`تقرير-كمي-ووصفي-${analysis.teacher}-${analysis.subjectLabel}-${analysis.examName}`);
};
