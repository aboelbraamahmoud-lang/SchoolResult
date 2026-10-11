/* SchoolResult 6.10.27: approved, clean Word template from the supplied school model.
   The package is regenerated from a Word-compatible normalised DOCX template,
   replacing content only. No personal sample names are embedded in the program. */
(function(){
const src=SR63.approvedImprovementWord;
const esc=v=>String(v??'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const text=v=>esc(v).replace(/\r\n|\r|\n/g,'</w:t><w:br/><w:t>');
const fill=(xml,values)=>xml.replace(/\{\{([A-Z][A-Z_0-9]*)\}\}/g,(_,key)=>text(values[key]??'—'));
const bytes64=s=>{const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',a=[];let bits=0,acc=0;for(const ch of s){if(ch==='=')break;const n=chars.indexOf(ch);if(n<0)continue;acc=(acc<<6)|n;bits+=6;if(bits>=8){bits-=8;a.push((acc>>>bits)&255);}}return new Uint8Array(a);};
const zip=parts=>{
 const encoder=new TextEncoder(),items=[];let total=0;
 const table=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;table[i]=c>>>0;}
 const crc32=data=>{let c=0xffffffff;for(const b of data)c=table[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
 const dosDate=(()=>{const d=new Date();return((Math.max(1980,d.getFullYear())-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();})();
 const dosTime=(()=>{const d=new Date();return(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1);})();
 for(const [path,content] of Object.entries(parts)){
  const name=encoder.encode(path),data=typeof content==='string'?encoder.encode(content):bytes64(content.b64),crc=crc32(data);
  items.push({name,data,crc,offset:total});total+=30+name.length+data.length;
 }
 const centSize=items.reduce((n,x)=>n+46+x.name.length,0),buf=new Uint8Array(total+centSize+22),dv=new DataView(buf.buffer);let at=0;
 const u16=(off,x)=>dv.setUint16(off,x,true),u32=(off,x)=>dv.setUint32(off,x>>>0,true);
 for(const x of items){u32(at,0x04034b50);u16(at+4,20);u16(at+6,0x0800);u16(at+8,0);u16(at+10,dosTime);u16(at+12,dosDate);u32(at+14,x.crc);u32(at+18,x.data.length);u32(at+22,x.data.length);u16(at+26,x.name.length);at+=30;buf.set(x.name,at);at+=x.name.length;buf.set(x.data,at);at+=x.data.length;}
 const start=at;
 for(const x of items){u32(at,0x02014b50);u16(at+4,20);u16(at+6,20);u16(at+8,0x0800);u16(at+10,0);u16(at+12,dosTime);u16(at+14,dosDate);u32(at+16,x.crc);u32(at+20,x.data.length);u32(at+24,x.data.length);u16(at+28,x.name.length);u32(at+42,x.offset);at+=46;buf.set(x.name,at);at+=x.name.length;}
 u32(at,0x06054b50);u16(at+8,items.length);u16(at+10,items.length);u32(at+12,at-start);u32(at+16,start);
 return buf;
};
const percent=n=>typeof n==='number'&&Number.isFinite(n)?n.toFixed(1)+'%':'—';
const amount=n=>typeof n==='number'&&Number.isFinite(n)?n.toFixed(Number.isInteger(n)?0:1):'—';
const change=n=>typeof n==='number'&&Number.isFinite(n)?`${n>0?'+':''}${n.toFixed(1)} نقطة`:'—';
SR63.teacherImprovementWordBuild=function(analysis,edits={}){
 if(!analysis?.groups||analysis.groups.length!==1)throw Error('يجب اختيار شعبة واحدة لإنشاء خطة تحسين الأداء.');
 const klass=analysis.groups[0].className||'—',presets=SR63.teacherImprovementDefaults(analysis.subject),edited={...presets,...edits};
 const bands={LOW:'low',MIDDLE:'middle',HIGH:'high'},headings={LOW:'الطلبة ذوو الأداء المتدني',MIDDLE:'الطلبة ذوو الأداء المتوسط',HIGH:'الطلبة ذوو الأداء المرتفع'};
 const fields={TEACHER_NAME:analysis.teacher,SUBJECT_NAME:analysis.subjectLabel||analysis.subject,CLASS_NAME:klass,
  SCHOOL_YEAR:`${analysis.schoolName||'المدرسة'} — ${analysis.academicYear||'—'}`,
  EXAM_NAMES:`${analysis.examName||'الاختبار الحالي'} / ${analysis.prevExamName||'لا يوجد اختبار سابق'}`,
  ANALYSIS_TITLE:`تحليل بيانات نتائج الطلبة وخطة تحسين أدائهم — ${klass} — إجمالي الطلاب: ${analysis.studentCount}`,
  COORDINATOR_NAME:analysis.coordinator||'................',VICE_NAME:analysis.academicViceName||'................',PRINCIPAL_NAME:analysis.principalName||'................',
  FOOTER_NOTE:`${analysis.schoolName||'المدرسة'} — وثيقة تربوية للمراجعة والاعتماد`,
  REVIEW_NOTE:'تُراجع الأهداف والإجراءات بعد إعلان نتيجة الاختبار التالي، وتقارن درجات الطلاب في الاختبارين على أساس النسب المئوية للدرجات المرصودة، وتُوثق نتائج التدخل ومؤشرات تحقق الأهداف.'
 };
 let xml=src.parts['word/document.xml'];
 for(const [upper,lower] of Object.entries(bands)){
  const students=analysis.bands?.[lower]||[],scored=students.filter(s=>typeof s.current==='number'),paired=scored.filter(s=>typeof s.change==='number'),
   average=scored.length?scored.reduce((acc,s)=>acc+s.current,0)/scored.length:null,improved=paired.filter(s=>s.change>0).length;
  fields[upper+'_LABEL']=`${headings[upper]}\n(${students.length} طالب)`;
  fields[upper+'_SUMMARY']=`متوسط مستوى الفئة: ${percent(average)} — العدد: ${students.length}`;
  fields[upper+'_GOAL']=edited[lower+'Goal']||'—';fields[upper+'_ACTIONS']=edited[lower+'Actions']||'—';
  fields[upper+'_INDICATOR']=`${edited[lower+'Indicator']||'—'}\nنسبة تحقق المؤشر: ${paired.length?`${improved} من ${paired.length} طالبًا — ${percent(improved/paired.length*100)}`:'بانتظار نتيجة قابلة للمقارنة'}`;
  const records=students.length?students:[{studentName:'لا يوجد طلاب في هذا المستوى',className:klass,current:null,previous:null,change:null,score:null,total:null}];
  const content=records.map(s=>fill(src.rows[upper],{
   STUDENT_NAME:s.studentName||'—',STUDENT_CLASS:s.className||klass,STUDENT_GRADE:typeof s.score==='number'&&typeof s.total==='number'?`${amount(s.score)}/${amount(s.total)}`:'—',
   CURRENT:percent(s.current),PREVIOUS:percent(s.previous),CHANGE:change(s.change)
  })).join('');
  const marker=`<!--DYNAMIC_ROWS_${upper}-->`;
  if(!xml.includes(marker))throw Error('قالب Word المعتمد ناقص أحد مواضع الطلاب.');
  xml=xml.replace(marker,content);
 }
 if(analysis.bands?.missing?.length){fields.REVIEW_NOTE+='\nحالات لا تُصنّف في مستويات الأداء لعدم وجود درجة مرصودة: '+analysis.bands.missing.map(s=>s.studentName||'طالب').join('، ')+'.';}
 xml=fill(xml,fields);
 if(xml.includes('{{')||xml.includes('<!--DYNAMIC_ROWS_'))throw Error('تعذر استكمال حقول خطة التحسين.');
 const parts={...src.parts,'word/document.xml':xml};
 for(const [name,part] of Object.entries(parts))if(typeof part==='string'&&part.includes('{{'))parts[name]=fill(part,fields);
 const filename=`خطة-تحسين-أداء-الطلبة-${analysis.subjectLabel||analysis.subject}-${klass}-${analysis.examName||'الاختبار'}`.replace(/[\\/:*?"<>|]/g,'-').slice(0,140)+'.docx';
 return {bytes:zip(parts),filename};
};
})();
