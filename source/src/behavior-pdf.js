/* 6.10.36 — browser-local, per-student A4-landscape PDF engine. No student data leaves the device. */
(function(){
 const encoder=new TextEncoder();
 const ascii=s=>encoder.encode(s);
 const asBytes=s=>{const b=atob(s);const a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a;};
 const printable=s=>String(s??'').replace(/[\u0000-\u001f]/g,' ').trim();
 const prepareImg=src=>new Promise((resolve,reject)=>{
  if(!src)return resolve(null);
  const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('تعذر تحميل صورة الشعار أو الختم؛ أعد رفعها ثم حاول.'));
  image.src=src;
 });
 // One valid PDF document holding one JPEG page. PDF coordinates are A4 landscape.
 const pdfFromJpeg=(jpeg,w,h)=>{
  const chunks=[];let length=0;const offsets=[0];
  function write(bytes){chunks.push(bytes);length+=bytes.length;}
  function str(text){write(ascii(text));}
  function object(num,body){offsets[num]=length;str(`${num} 0 obj\n${body}\nendobj\n`);}
  str('%PDF-1.4\n%SchoolResult\n');
  object(1,'<< /Type /Catalog /Pages 2 0 R >>');
  object(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  object(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
  offsets[4]=length;str(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);write(jpeg);str('\nendstream\nendobj\n');
  const commands='q\n842 0 0 595 0 0 cm\n/Im0 Do\nQ\n';
  offsets[5]=length;str(`5 0 obj\n<< /Length ${ascii(commands).length} >>\nstream\n${commands}endstream\nendobj\n`);
  const xref=length;str('xref\n0 6\n0000000000 65535 f \n');for(let i=1;i<=5;i++)str(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
  str(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const bytes=new Uint8Array(length);let n=0;for(const item of chunks){bytes.set(item,n);n+=item.length;}return bytes;
 };
 const subjects=[
  ['التربية الإسلامية','islamic'],['اللغة العربية','arabic'],['اللغة الإنجليزية','english'],['الرياضيات','math'],['العلوم','science'],
  ['العلوم الاجتماعية','social'],['الحوسبة وتكنولوجيا المعلومات','computer'],['الفنون البصرية','art'],['التربية البدنية','pe']
 ];
 const headers=['المادة / المستوى','المستوى الأكاديمي','التفاعل والمشاركة','إحضار الكتب والأدوات','الواجبات','السلوك'];
 SR63.behaviorPdfForStudent=async function(student,options={}){
  if(!student||!student.subjects||typeof student.name!=='string')throw new Error('بيانات الطالب غير مكتملة.');
  const [ministry,seal]=await Promise.all([prepareImg(options.logoSrc||'./moehe.png'),options.showStamp!==false?prepareImg(options.stampSrc||''):Promise.resolve(null)]);
  const canvas=document.createElement('canvas');canvas.width=1980;canvas.height=1400;
  const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('المتصفح لا يدعم تجهيز ملفات PDF.');
  const sx=canvas.width/1000,sy=canvas.height/707;ctx.scale(sx,sy);ctx.fillStyle='#fff';ctx.fillRect(0,0,1000,707);ctx.direction='rtl';
  const rectangle=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
  const border=(x,y,w,h,color='#cbd6dd',lw=.75)=>{ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.strokeRect(x,y,w,h);};
  const text=(value,x,y,size=15,color='#203749',weight=700,align='right',maxWidth=280)=>{
   ctx.save();ctx.direction='rtl';ctx.textBaseline='middle';ctx.textAlign=align;ctx.font=`${weight} ${size}px Arial, Tahoma, sans-serif`;ctx.fillStyle=color;
   const line=printable(value);ctx.fillText(line,x,y,maxWidth);ctx.restore();
  };
  text('وزارة التربية والتعليم والتعليم العالي',705,45,18,'#702441',800,'right',640);
  text(options.schoolName||'اسم المدرسة',705,78,24,'#203749',900,'right',640);
  text('العام الأكاديمي: '+(options.academicYear||'—'),705,102,14,'#667988',700,'right',640);
  if(ministry)ctx.drawImage(ministry,760,28,180,79);
  rectangle(55,118,890,2,'#702441');
  rectangle(55,135,890,56,'#702441');text('التقرير الأكاديمي والسلوكي للطالب',500,164,23,'#ffffff',900,'center',820);
  const cells=[['اسم الطالب',student.name,420],['الشعبة',student.className,215],['الشهر',options.month||'—',215]];
  let x=55;for(const [label,value,w] of cells){rectangle(x,208,w,50,'#f5f8f9');border(x,208,w,50);text(label+':',x+w-14,223,13,'#576f7d',700,'right',w-26);text(value,x+w-14,243,w>300?17:15,'#18364a',800,'right',w-26);x+=w+20;}
  const cols=[260,126,126,126,126,126],left=55,tableTop=276,headH=50,rowH=31;
  let current=left;
  for(let i=0;i<6;i++){
   const colW=cols[i];rectangle(current,tableTop,colW,headH,i===0?'#284d5d':i===5?'#ae8230':'#2c6074');
   border(current,tableTop,colW,headH,'#dde6eb');
   text(headers[i],current+colW/2,tableTop+25,i===3?11:13,'#fff',900,'center');current+=colW;
  }
  for(let i=0;i<subjects.length;i++){
   const top=tableTop+headH+i*rowH;current=left;
   const values=[subjects[i][0],...Array.from({length:5},(_,j)=>student.subjects[subjects[i][1]]?.[j]||'')];
   for(let j=0;j<6;j++){rectangle(current,top,cols[j],rowH,i%2?'#f3f7f9':'#fff');border(current,top,cols[j],rowH);text(values[j],j===0?current+cols[j]-8:current+cols[j]/2,top+rowH/2,j===0?12:11,j===0?'#25475b':'#21394c',j===0?800:700,j===0?'right':'center',cols[j]-12);current+=cols[j];}
  }
  const footerY=637;rectangle(55,footerY,890,2,'#e3cfa2');
  text('مدير المدرسة',922,658,15,'#702441',900);text(options.principalName||'................................',922,680,17,'#702441',900);
  text(seal?'الختم الإلكتروني':'ختم المدرسة / الاعتماد',64,662,12,'#667988',800,'left');
  if(seal){const w=Math.min(86,seal.width),h=Math.min(70,seal.height),ratio=Math.min(w/seal.width,h/seal.height);ctx.drawImage(seal,206,632,seal.width*ratio,seal.height*ratio);}
  const jpeg=asBytes(canvas.toDataURL('image/jpeg',.92).split(',')[1]);
  return pdfFromJpeg(jpeg,canvas.width,canvas.height);
 };
 SR63.behaviorPdfSafeName=name=>printable(name).replace(/[\\/:*?"<>|\r\n]/g,'-').replace(/\s+/g,'-').slice(0,130)||'طالب';
})();
