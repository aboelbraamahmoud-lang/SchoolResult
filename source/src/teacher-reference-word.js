/* 6.10.25 — exact teacher form content and safe extra-class rendering; Word-compatible output: omit inherited Office sensitivity-label and external custom XML metadata from the source forms; keep the official Word body, drawings, headers, RTL tables and signatures. */
(function(){
 const templates=SR63.teacherReferenceTemplates;
 const xmlEsc=value=>String(value??'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
 const safe=value=>xmlEsc(value).replace(/\r\n|\r|\n/g,'</w:t><w:br/><w:t>');
 const fill=(source,fields)=>source.replace(/\{\{([A-Z][A-Z0-9_]*)\}\}/g,(match,key)=>safe(fields[key]??'—'));
 const base64Bytes=encoded=>{
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',result=[];let acc=0,bits=0;
  for(const ch of encoded){if(ch==='=')break;const n=alphabet.indexOf(ch);if(n<0)continue;acc=(acc<<6)|n;bits+=6;if(bits>=8){bits-=8;result.push((acc>>>bits)&255);}}
  return new Uint8Array(result);
 };
 const cleanWordParts=original=>{
  // The original school documents carry a Microsoft Purview sensitivity label
  // belonging to their former publisher. Republishing that label in a new
  // student's report can make Word reject or restrict the otherwise valid DOCX.
  // Remove only the label + unused bibliography/custom XML metadata; retain
  // the actual source Word document, design, headers, images and styles.
  const parts={};
  for(const [name,value] of Object.entries(original)){
   if(name==='docMetadata/LabelInfo.xml'||name==='docProps/custom.xml'||name.startsWith('customXml/'))continue;
   if(name==='[Content_Types].xml'){
    parts[name]=value.replace(/<Override\b[^>]*PartName=["']\/(?:docMetadata\/LabelInfo\.xml|docProps\/custom\.xml|customXml\/[^"']+)["'][^>]*\s*\/>/g,'');
   }else if(name.endsWith('.rels')){
    // Relationship targets may be relative to /word or /word/glossary,
    // hence match by final target segment instead of any one path format.
    parts[name]=value.replace(/<Relationship\b[^>]*Target=["'][^"']*(?:customXml\/|docMetadata\/LabelInfo\.xml|docProps\/custom\.xml)[^"']*["'][^>]*\s*\/>/g,'');
   }else parts[name]=value;
  }
  return parts;
 };
 const zip=files=>{
  const crcTable=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;crcTable[n]=c>>>0;}
  const crc32=data=>{let c=0xffffffff;for(const b of data)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
  const record=(size,values)=>{const b=new Uint8Array(size),v=new DataView(b.buffer);for(const [at,len,value] of values)len===2?v.setUint16(at,value,true):v.setUint32(at,value>>>0,true);return b;};
  const encoder=new TextEncoder(),parts=[],dir=[];let offset=0,num=0;
  for(const [name,raw] of Object.entries(files)){
   const filename=encoder.encode(name),data=typeof raw==='string'?encoder.encode(raw):base64Bytes(raw.b64),hash=crc32(data);
   const local=record(30,[[0,4,0x04034b50],[4,2,20],[12,2,0x21],[14,4,hash],[18,4,data.length],[22,4,data.length],[26,2,filename.length]]);
   const central=record(46,[[0,4,0x02014b50],[4,2,20],[6,2,20],[14,2,0x21],[16,4,hash],[20,4,data.length],[24,4,data.length],[28,2,filename.length],[42,4,offset]]);
   parts.push(local,filename,data);dir.push(central,filename);offset+=local.length+filename.length+data.length;num++;
  }
  const dirSize=dir.reduce((total,item)=>total+item.length,0),end=record(22,[[0,4,0x06054b50],[8,2,num],[10,2,num],[12,4,dirSize],[16,4,offset]]);
  const output=new Uint8Array(offset+dirSize+22);let pos=0;
  for(const item of [...parts,...dir,end]){output.set(item,pos);pos+=item.length;}return output;
 };
 const build=(type,fields,extras={},filename,documentOverride=null)=>{
  const parts=cleanWordParts(templates[type]),source=documentOverride||parts['word/document.xml'];
  if(typeof source!=='string')throw Error('القالب الأصلي غير متاح.');
  let documentXml=source;
  for(const [needle,content] of Object.entries(extras)){
   if(!documentXml.includes(needle))throw Error('أحد مواضع النموذج الأصلي غير موجود.');
   documentXml=documentXml.replace(needle,content);
  }
  documentXml=fill(documentXml,fields);
  if(documentXml.includes('{{')||documentXml.includes('<!--EXTRA_TEACHER_ROWS-->')||documentXml.includes('<!--STUDENT_TABLE_'))throw Error('يوجد حقل لم يُملأ داخل النموذج.');
  parts['word/document.xml']=documentXml;
  return {bytes:zip(parts),filename:filename.replace(/[\\/:*?"<>|]/g,'-').slice(0,170)+'.docx'};
 };
 const fmt=value=>value===null||value===undefined||!Number.isFinite(Number(value))?'—':Number(value).toFixed(1)+'%';
 const fmtPlain=value=>value===null||value===undefined||!Number.isFinite(Number(value))?'—':Number(value).toFixed(Number(value)%1===0?0:1);
 const fmtCell=value=>value===null||value===undefined||!Number.isFinite(Number(value))?'—':Number(value).toFixed(Number(value)%1===0?0:1)+'%';
 const fmtDelta=value=>value===null||value===undefined||!Number.isFinite(Number(value))?'—':(value>0?'+':'')+Number(value).toFixed(1)+' نقطة';
 const status=(value,target)=>value===null||value===undefined?'—':Number(value)>=Number(target)?'متحقق':'غير متحقق';
 const range=analysis=>{
  const count=analysis.studentCount||analysis.students?.length||0;
  return count===1?'طالب واحد':`${count} طالب`;
 };
 SR63.teacherQuantitativeWordBuild=function(analysis,edits={}){
  if(!analysis?.groups?.length)throw Error('لا توجد شعب للمعلم في التقييم المختار.');
  const groups=analysis.groups,targets={success:90,achievement:75,valueAdded:3,high90:30,...edits.targets};
  const rows=SR63.teacherQuantitativeMetricRows(analysis);
  const metrics=(g,key,type)=>type==='delta'?fmtDelta(g?.[key]):type==='plain'?fmtPlain(g?.[key]):fmt(g?.[key]);
  const values={SUBTITLE:`لتحليل نتائج ${analysis.examName} لمادة ${analysis.subjectLabel} للعام الأكاديمي ${analysis.academicYear}م`,
    COORDINATOR_GREETING:`المنسق الفاضل: أ/ ${analysis.coordinator||'........................'}`,
    INTRODUCTION:`بعد قراءة نتائج الطلبة للصفوف التي أقوم بتدريسها، في ${analysis.examName} لمادة ${analysis.subjectLabel} أقدم لكم تقريرًا كميًا ووصفيًا يوضح نسب النجاح والتحصيل الأكاديمي ومستويات الطلبة المختلفة، وأسباب ارتفاع أو انخفاض نتائج الطلبة.`,
    CURRENT_METRIC_LABEL:rows.find(row=>row.slot===2).label,
    PREVIOUS_METRIC_LABEL:analysis.prevExam?rows.find(row=>row.slot===3).label:'',
    INTERPRETATION:edits.interpretation||`أظهرت النتائج نسبة نجاح ${fmt(analysis.success)} وتحصيلًا أكاديميًا ${fmt(analysis.achievement)}. وتُعالج جوانب التعثر التي يحددها التقويم التشخيصي من خلال أنشطة متدرجة وأوراق عمل ومتابعة منتظمة للطلاب.`,
    FEEDBACK:edits.feedback||'يُرجى الاستمرار في إجراءات الدعم المناسبة، ومراجعة نتائج التقييم اللاحق، وتحديث التدخلات وفق مستويات الطلاب.',
    TEACHER_NAME:analysis.teacher,COORDINATOR_NAME:analysis.coordinator||'........................'};
  if(edits.challenges||edits.solutions)values.INTERPRETATION+=[edits.challenges,edits.solutions].filter(Boolean).join('\n');
  const groupFields=(list)=>{
   const o={};for(let i=0;i<3;i++)o['CLASS_'+(i+1)]=list[i]?.className||'—';
   rows.forEach(({key,format,target,slot})=>{
    for(let j=0;j<3;j++)o[`METRIC_${slot}_${j+1}`]=list[j]?metrics(list[j],key,format):'—';
    o[`METRIC_${slot}_TOTAL`]=metrics(analysis,key,format);
    o[`METRIC_${slot}_TARGET`]=targets[target]===null?'—':status(analysis[key],targets[target]);
   });return o;
  };
  Object.assign(values,groupFields(groups.slice(0,3)));
  // The attached teacher form has room for THREE classes on one page. For
  // teachers with more classes, repeat the *whole original form* per set of
  // three instead of inserting duplicate mid-table rows (which could split
  // across pages and change the published form's layout).
  const source=templates.quant['word/document.xml'];
  const bodyMarker='<w:body>',bodyAt=source.indexOf(bodyMarker)+bodyMarker.length;
  const sectionAt=source.lastIndexOf('<w:sectPr');
  if(bodyAt<bodyMarker.length||sectionAt<bodyAt)throw Error('تعذر تحديد صفحات نموذج المعلم الأصلي.');
  let inner=source.slice(bodyAt,sectionAt).replace('<!--EXTRA_TEACHER_ROWS-->','');
  if(!analysis.prevExam){
   // The first assessment must not show a preceding assessment or value added.
   // Remove only those two Word table rows; retain the official table design.
   let removed=0;
   inner=inner.replace(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g,row=>{
    if(row.includes('{{PREVIOUS_METRIC_LABEL}}')||row.includes('{{METRIC_4_1}}')){removed++;return '';}
    return row;
   });
   if(removed!==2)throw Error('تعذر إخفاء المقارنة السابقة من النموذج الأصلي.');
  }
  let fullBody='';
  for(let i=0;i<groups.length;i+=3){
   let page=fill(inner,{...values,...groupFields(groups.slice(i,i+3))});
   if(i){
    // Prevent cloned Word 2010 paragraph IDs from colliding with the first page.
    page=page.replace(/\s+w14:paraId="[0-9A-F]+"/g,'');
    fullBody+='<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
   }
   fullBody+=page;
  }
  const xml=source.slice(0,bodyAt)+fullBody+source.slice(sectionAt);
  return build('quant',{}, {},`التقرير-الكمي-والوصفي-للمعلم-${analysis.teacher}-${analysis.subjectLabel}`,xml);
 };
 SR63.teacherImprovementWordBuild=function(analysis,edits={}){
  if(analysis.groups.length!==1)throw Error('خطة تحسين الأداء تُصدَّر لشعبة واحدة فقط. اختر الشعبة أولًا.');
  const klass=analysis.groups[0].className,preset=SR63.teacherImprovementDefaults(analysis.subject),edit={...preset,...edits};
  const labels={LOW:'low',MIDDLE:'middle',HIGH:'high'},values={
   TEACHER_NAME:analysis.teacher,SUBJECT_NAME:analysis.subjectLabel,CLASS_NAME:klass,
   SCHOOL_NAME:analysis.schoolName,STUDENT_COUNT:analysis.studentCount,ACADEMIC_YEAR:analysis.academicYear,
   UNSCORED_NOTE:analysis.students?.some(s=>s.previous!==null&&s.previous!==undefined)?'إيضاح الدرجات: يظهر ناتج الاختبار السابق بين قوسين أسفل درجة الاختبار الحالي.':'',
   COORDINATOR_NAME:analysis.coordinator||'................',VICE_NAME:analysis.academicViceName||'................',TODAY:new Date().toLocaleDateString('en-GB')
  },extras={};
  for(const [level,key] of Object.entries(labels)){
   const students=analysis.bands[key],tested=students.filter(s=>s.current!==null),paired=tested.filter(s=>s.change!==null);
   const mean=tested.length?fmt(tested.reduce((n,s)=>n+s.current,0)/tested.length):'—';
   const improved=paired.filter(s=>s.change>0).length;
   values[level+'_GOAL']=edit[key+'Goal']||'—';values[level+'_ACTIONS']=edit[key+'Actions']||'—';
   values[level+'_INDICATOR']=(edit[key+'Indicator']||'—')+`\nمؤشر المتابعة: ${paired.length?`${improved} من ${paired.length} طالبًا تحسنوا (${fmt(100*improved/paired.length)})`:'بانتظار اختبار تالٍ قابل للمقارنة'}.`;
   const nested=templates.nested[level];
   if(!nested)throw Error('فقد قالب المستوى '+level);
   const records=(students.length?students:[{studentName:'لا يوجد طلاب في هذا المستوى',className:klass,current:null,previous:null}]);
   const studentRows=records.map((student,i)=>{
    const v={STUDENT_NAME:student.studentName,STUDENT_CLASS:student.className||klass,
     STUDENT_GRADE:student.current===null?'—':fmtCell(student.current)+(student.previous!==null&&student.previous!==undefined?`\n(${fmtCell(student.previous)})`:''),
     STUDENT_AVERAGE:i===0?mean:''};
    return fill(nested.rowXml,v);
   }).join('');
   const nestedXml=nested.nestedXml.replace('<!--DYNAMIC_STUDENT_ROWS-->',studentRows);
   extras[`<!--STUDENT_TABLE_${level}-->`]=nestedXml;
  }
  // Unscored students stay outside low/middle/high; do not invent a score or a classification.
  if(analysis.bands.missing.length){
   values.STUDENT_COUNT=`${analysis.studentCount} — ${analysis.bands.missing.length} دون درجة مرصودة`;
   values.UNSCORED_NOTE='حالات غير مصنفة لعدم وجود درجة مرصودة: '+analysis.bands.missing.map(s=>s.studentName+' ('+({absent:'غائب',excused:'غياب بعذر',unexcused:'غياب دون عذر',deprived:'محروم',not_enrolled:'غير مقيد'}[s.currentStatus]||'غير مرصود')+')').join('، ');
  }
  return build('improvement',values,extras,`خطة-تحسين-أداء-الطلبة-${analysis.subjectLabel}-${klass}-${analysis.examName}`);
 };
})();
