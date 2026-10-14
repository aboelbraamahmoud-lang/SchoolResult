/* SchoolResult 6.10.46 — offline, browser-side PDF/ZIP export of ORIGINAL report pages.
   No student data is sent to a remote PDF conversion service. */
SR63.safeReportFilename=function(value){
 const normalized=String(value??'').normalize('NFKC').replace(/[\\/:*?"<>|\x00-\x1f]/g,'-').replace(/\s+/g,' ').replace(/\.+$/,'').trim();
 const ext=/\.(pdf|zip)$/i.exec(normalized)?.[0]||'';const base=ext?normalized.slice(0,-ext.length):normalized;return (base||'تقرير').slice(0,115-ext.length)+ext;
};
SR63.reportGroupName=function(page,dimension,mode){
 if(mode==='subjects'||mode==='departmentStats')return 'الصف '+(page.grade||page.entity||'غير محدد');
 if(dimension==='teacher')return 'المعلم '+(page.teacher||page.entity||'غير محدد');
 return 'الصف '+(page.className||page.entity||page.grade||'غير محدد');
};
SR63.groupReportPages=function(pages,dimension,mode){
 const out=new Map();
 for(const page of pages){const key=SR63.reportGroupName(page,dimension,mode);if(!out.has(key))out.set(key,[]);out.get(key).push(page);}
 return [...out].map(([name,pages])=>({name,pages}));
};
// The page template, not the number of compared exams, selects PDF orientation.
SR63.reportPageIsLandscape=function(mode,page=null){
 const explicit=page?.dataset?.orientation||page?.getAttribute?.('data-orientation')||page?.orientation;
 if(explicit==='landscape')return true;
 if(explicit==='portrait')return false;
 if(page?.classList?.contains('grade-subjects-landscape')||page?.classList?.contains('report-landscape'))return true;
 if(page?.classList?.contains('report-portrait'))return false;
 return mode==='subjects'||mode==='departmentStats';
};
SR63.reportArrayBytes=function(base64){const binary=atob(base64);const out=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)out[i]=binary.charCodeAt(i);return out;};
SR63.reportPdfFromJpegs=function(images){
 if(!images?.length)throw Error('لا توجد صفحات لتصديرها.');
 const encoder=new TextEncoder(),parts=[],offsets=[0];let bytes=0;
 const append=data=>{let part=typeof data==='string'?encoder.encode(data):data;parts.push(part);bytes+=part.byteLength;};
 const addObj=(id,content)=>{offsets[id]=bytes;append(`${id} 0 obj\n`);for(const part of content)append(part);append('\nendobj\n');};
 append('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n');
 addObj(1,['<</Type/Catalog/Pages 2 0 R>>']);
 const ids=images.map((_,i)=>3+i*3);
 addObj(2,[`<</Type/Pages/Kids[${ids.map(x=>x+' 0 R').join(' ')}]/Count ${images.length}>>`]);
 images.forEach((im,i)=>{
  const id=3+i*3,w=im.landscape?841.89:595.28,h=im.landscape?595.28:841.89;
  const jpeg=SR63.reportArrayBytes(im.dataUrl.slice(im.dataUrl.indexOf(',')+1));
  addObj(id,[`<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${w} ${h}]/Resources<</XObject<</Im0 ${id+2} 0 R>>>>/Contents ${id+1} 0 R>>`]);
  const content=`q\n${w} 0 0 ${h} 0 0 cm\n/Im0 Do\nQ\n`;
  addObj(id+1,[`<</Length ${encoder.encode(content).length}>>\nstream\n`,content,'endstream']);
  addObj(id+2,[`<</Type/XObject/Subtype/Image/Width ${im.width}/Height ${im.height}/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ${jpeg.length}>>\nstream\n`,jpeg,'\nendstream']);
 });
 const xref=bytes,total=3+images.length*3;
 append(`xref\n0 ${total}\n0000000000 65535 f \n`);
 for(let id=1;id<total;id++)append(String(offsets[id]).padStart(10,'0')+' 00000 n \n');
 append(`trailer\n<</Size ${total}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF\n`);
 return new Blob(parts,{type:'application/pdf'});
};
SR63.reportZipFromPdfs=async function(files){
 // Simple UTF-8 ZIP "store" writer; PDFs already contain JPEG-compressed page images.
 if(!files.length)throw Error('لا توجد تقارير لتنزيلها.');
 const enc=new TextEncoder(),pieces=[],central=[];let offset=0;
 const add=part=>{pieces.push(part);offset+=part.byteLength;};
 const table=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0;}
 const crc32=data=>{let c=0xffffffff;for(const x of data)c=table[(c^x)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
 const hdr=(size,sig)=>{const b=new Uint8Array(size);const d=new DataView(b.buffer);d.setUint32(0,sig,true);return {b,d};};
 for(const {name,blob} of files){
  const filename=enc.encode(SR63.safeReportFilename(name)),fileBytes=new Uint8Array(await blob.arrayBuffer());
  if(fileBytes.length>0xffffffff||offset>0xffffffff)throw Error('حجم التقرير يتجاوز حد ملفات ZIP التقليدية.');
  const crc=crc32(fileBytes),start=offset;
  const {b:l,d:ld}=hdr(30,0x04034b50);ld.setUint16(4,20,true);ld.setUint16(6,0x800,true);ld.setUint32(14,crc,true);ld.setUint32(18,fileBytes.length,true);ld.setUint32(22,fileBytes.length,true);ld.setUint16(26,filename.length,true);
  add(l);add(filename);add(fileBytes);
  const {b:c,d:cd}=hdr(46,0x02014b50);cd.setUint16(4,20,true);cd.setUint16(6,20,true);cd.setUint16(8,0x800,true);cd.setUint32(16,crc,true);cd.setUint32(20,fileBytes.length,true);cd.setUint32(24,fileBytes.length,true);cd.setUint16(28,filename.length,true);cd.setUint32(42,start,true);
  central.push(c,filename);
 }
 const centralStart=offset;for(const b of central)add(b);
 const {b:e,d:ed}=hdr(22,0x06054b50);ed.setUint16(8,files.length,true);ed.setUint16(10,files.length,true);ed.setUint32(12,offset-centralStart,true);ed.setUint32(16,centralStart,true);add(e);
 return new Blob(pieces,{type:'application/zip'});
};
SR63.downloadReportFile=function(blob,name){
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=SR63.safeReportFilename(name);document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
};
SR63.reportEmbedImage=async function(img){
 const src=img.getAttribute('src')||'';if(!src||src.startsWith('data:'))return;
 const absolute=new URL(src,document.baseURI).href;
 const response=await fetch(absolute,{credentials:'same-origin'});
 if(!response.ok)throw Error('تعذر تحميل صورة ترويسة التقرير.');
 const blob=await response.blob();const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('تعذر تجهيز صورة التقرير.'));reader.readAsDataURL(blob);});
 img.setAttribute('src',data);
};
SR63.reportPageJPEG=async function(element,cssText,landscape=false){
 if(!element)throw Error('صفحة التقرير غير موجودة.');
 // Paint the already-laid-out ORIGINAL DOM directly to a same-origin canvas.
 // Chrome deliberately taints foreignObject-SVG screenshots; do not use them for PDFs.
 const w=landscape?1123:794,h=landscape?794:1123,margin=19;
 const base=element.getBoundingClientRect();
 const naturalW=Math.max(1,element.scrollWidth,Math.ceil(base.width)),naturalH=Math.max(1,element.scrollHeight,Math.ceil(base.height));
 const scale=Math.min(1,(w-2*margin)/naturalW,(h-2*margin)/naturalH);
 if(scale<.38)throw Error('الصفحة تحتوي بيانات أكثر مما يتسع لورقة A4. اختر نطاقًا أصغر للحفاظ على وضوح الطباعة.');
 const canvas=document.createElement('canvas');canvas.width=w*2;canvas.height=h*2;
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('هذا المتصفح لا يدعم إنشاء صفحات PDF.');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.save();ctx.setTransform(2*scale,0,0,2*scale,2*margin-2*scale*base.x,2*margin-2*scale*base.y);
 const transparent=c=>!c||c==='transparent'||c==='rgba(0, 0, 0, 0)'||c==='rgb(0 0 0 / 0)';
 const rectOf=node=>node.getBoundingClientRect();
 const fillFor=(node,style)=>{
  const bg=style.backgroundColor;if(!transparent(bg))return bg;
  if(style.backgroundImage&&style.backgroundImage!=='none'){
   if(node.classList.contains('report-title')||node.classList.contains('grade-matrix-caption'))return '#125266';
   if(node.matches('thead th'))return '#275469';
   if(node.classList.contains('report-head')||node.classList.contains('report-meta-grid'))return '#f3f8fa';
   return '#f3f8fa';
  }
  return null;
 };
 const paintText=(node)=>{
  const parent=node.parentElement;if(!parent)return;
  const str=node.nodeValue||'';if(!str.trim())return;
  const css=getComputedStyle(parent),size=parseFloat(css.fontSize)||10;
  const weight=css.fontWeight||'400',family=css.fontFamily||'Tahoma,Arial,sans-serif';
  ctx.font=`${weight} ${size}px ${family}`;ctx.fillStyle=css.color||'#17364b';
  ctx.textBaseline='alphabetic';ctx.direction=css.direction||'rtl';
  const range=document.createRange();range.selectNodeContents(node);
  const rects=[...range.getClientRects()].filter(r=>r.width>.2&&r.height>.2);
  if(!rects.length)return;
  if(rects.length===1){const r=rects[0],rtl=ctx.direction==='rtl';ctx.textAlign=rtl?'right':'left';
   ctx.fillText(str.trim(),rtl?r.right:r.left,r.bottom-Math.max(1,(r.height-size)*.15),Math.max(3,r.width+4));return;}
  // Multi-line paragraphs: paint each visual word at its measured browser position.
  const regex=/\S+/g;let m;while((m=regex.exec(str))){range.setStart(node,m.index);range.setEnd(node,m.index+m[0].length);
   const r=range.getBoundingClientRect();if(r.width<1)continue;const rtl=ctx.direction==='rtl';ctx.textAlign=rtl?'right':'left';
   ctx.fillText(m[0],rtl?r.right:r.left,r.bottom-Math.max(1,(r.height-size)*.15),Math.max(3,r.width+3));}
 };
 const paint=async(node,depth=0)=>{
  if(depth>90)return;
  if(node.nodeType===Node.TEXT_NODE){paintText(node);return;}
  if(node.nodeType!==Node.ELEMENT_NODE)return;
  const tag=node.tagName.toLowerCase(),css=getComputedStyle(node);
  if(css.display==='none'||css.visibility==='hidden'||parseFloat(css.opacity)===0)return;
  const r=rectOf(node);if(!r.width||!r.height)return;
  if(r.right<base.left||r.left>base.left+naturalW||r.bottom<base.top||r.top>base.top+naturalH)return;
  const fill=fillFor(node,css);if(fill){ctx.fillStyle=fill;ctx.fillRect(r.left,r.top,r.width,r.height);}
  const border=parseFloat(css.borderTopWidth)||0;
  if(border>.2&&!transparent(css.borderTopColor)){ctx.strokeStyle=css.borderTopColor;ctx.lineWidth=border;ctx.strokeRect(r.left+border/2,r.top+border/2,r.width-border,r.height-border);}
  if(tag==='img'){
   try{
    const url=node.getAttribute('src')||'';
    const image=new Image();image.crossOrigin='anonymous';
    image.src=url.startsWith('data:')?url:new URL(url,document.baseURI).href;
    await image.decode();
    const ratio=Math.min(r.width/image.naturalWidth,r.height/image.naturalHeight);
    ctx.drawImage(image,r.left+(r.width-image.naturalWidth*ratio)/2,r.top+(r.height-image.naturalHeight*ratio)/2,image.naturalWidth*ratio,image.naturalHeight*ratio);
   }catch(err){throw Error('تعذر تضمين شعار التقرير داخل ملف PDF؛ تحقق من صورة الشعار.');}
   return;
  }
  if(tag==='svg'){
   try{const svg=new XMLSerializer().serializeToString(node);const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
    const image=new Image();image.src=url;await image.decode();ctx.drawImage(image,r.left,r.top,r.width,r.height);URL.revokeObjectURL(url);
   }catch{/* SVG charts are optional decorative elements; other data remains visible. */}
   return;
  }
  for(const child of node.childNodes)await paint(child,depth+1);
 };
 try{await paint(element);ctx.restore();}catch(error){ctx.restore();throw error;}
 const dataUrl=canvas.toDataURL('image/jpeg',.92);
 if(dataUrl.length<5000)throw Error('لم يتم رسم تقرير PDF كاملًا.');
 return {dataUrl,width:canvas.width,height:canvas.height,landscape};
};
