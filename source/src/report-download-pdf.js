/* SchoolResult 6.10.53 — offline, browser-side PDF/ZIP export of ORIGINAL report pages.
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
 const w=landscape?1123:794,h=landscape?794:1123,margin=0;
 // Share the same full-width, single-sheet layout as browser printing and ZIP.
 const layout=SR63.planReportSheet(element,w,h);
 const base=element.getBoundingClientRect();
 const naturalW=layout.width,naturalH=layout.height,scale=layout.scale;
 // The page already includes its original interior padding; do not center a mini-report.
 const offsetX=0,offsetY=0;
 // High-quality *raster fallback* for direct download / ZIP: 300 dpi instead
 // of 192 dpi. True infinitely zoomable text is available via native vector PDF.
 const density=300/96;
 const canvas=document.createElement('canvas');canvas.width=Math.round(w*density);canvas.height=Math.round(h*density);
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('هذا المتصفح لا يدعم إنشاء صفحات PDF.');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.setTransform(density*scale,0,0,density*scale,density*offsetX-density*scale*layout.left,density*offsetY-density*scale*layout.top);
 const transparent=c=>!c||c==='transparent'||/^rgba?\(\s*0(?:[,\s]+0){2}\s*[,/]\s*0(?:\.0+)?\s*\)$/.test(c)||c==='rgba(0, 0, 0, 0)'||c==='rgb(0 0 0 / 0)';
 const rectOf=node=>node.getBoundingClientRect();
 // Read the SAME computed CSS gradient/background that Chrome uses in printing.
 // The previous exporter flattened every gradient to hard-coded teal/gray;
 // that made PDF and individual ZIP reports lose their official color palette.
 const splitGradientArgs=input=>{
  const out=[];let level=0,start=0;
  for(let i=0;i<input.length;i++){
   if(input[i]==='(')level++;
   else if(input[i]===')')level--;
   else if(input[i]===','&&level===0){out.push(input.slice(start,i).trim());start=i+1;}
  }
  out.push(input.slice(start).trim());return out;
 };
 const extractGradient=image=>{
  const m=/(?:repeating-)?(linear|radial)-gradient\(/i.exec(image||'');
  if(!m)return null;
  let depth=1,pos=m.index+m[0].length,start=pos;
  while(pos<image.length&&depth){if(image[pos]==='(')depth++;else if(image[pos]===')')depth--;pos++;}
  if(depth)return null;
  return {type:m[1].toLowerCase(),args:splitGradientArgs(image.slice(start,pos-1))};
 };
 const colorStop=part=>{
  // Gradient direction/shape is not a color stop (e.g. 'to right', 'ellipse at top').
  if(/^(?:to\s|circle\b|ellipse\b|closest-\w+\b|farthest-\w+\b|at\s)/i.test(part.trim()))return null;
  const match=/^(#[\da-f]{3,8}|(?:rgba?|hsla?)\([^)]*\)|[a-z]+)\s*(.*)$/i.exec(part.trim());
  if(!match)return null;
  const at=/(-?\d+(?:\.\d+)?)%/.exec(match[2]||'');
  return {color:match[1],offset:at?Math.max(0,Math.min(1,Number(at[1])/100)):null};
 };
 const canvasBackground=(node,style,r)=>{
  const bg=style.backgroundColor;
  if(!transparent(bg)){ctx.fillStyle=bg;ctx.fillRect(r.left,r.top,r.width,r.height);}
  const gradient=extractGradient(style.backgroundImage);
  if(!gradient)return;
  const args=gradient.args.slice(),first=args[0]||'';
  if(!colorStop(first))args.shift();
  const stops=args.map(colorStop).filter(Boolean);
  if(stops.length<2)return;
  // Normalize missing CSS color-stop offsets, preserving explicit percentages.
  if(stops[0].offset===null)stops[0].offset=0;
  if(stops[stops.length-1].offset===null)stops[stops.length-1].offset=1;
  for(let i=1;i<stops.length-1;i++)if(stops[i].offset===null){
   let j=i+1;while(j<stops.length&&stops[j].offset===null)j++;
   const low=stops[i-1].offset,high=stops[j].offset;
   for(let k=i;k<j;k++)stops[k].offset=low+(high-low)*(k-i+1)/(j-i+1);
   i=j-1;
  }
  let gradientPaint;
  if(gradient.type==='radial'){
   const rad=Math.max(1,Math.hypot(r.width,r.height)/2);
   gradientPaint=ctx.createRadialGradient(r.left+r.width/2,r.top+r.height/2,0,r.left+r.width/2,r.top+r.height/2,rad);
  }else{
   // CSS 0deg points up, 90deg right; diagonal directions are normalized.
   let angle=180;
   if(/-?\d+(?:\.\d+)?deg/.test(first))angle=Number(/(-?\d+(?:\.\d+)?)deg/.exec(first)[1]);
   else if(/\bto\b/i.test(first)){
    if(/top/.test(first)&&/right/.test(first))angle=45;
    else if(/bottom/.test(first)&&/right/.test(first))angle=135;
    else if(/bottom/.test(first)&&/left/.test(first))angle=225;
    else if(/top/.test(first)&&/left/.test(first))angle=315;
    else if(/right/.test(first))angle=90;
    else if(/left/.test(first))angle=270;
    else if(/top/.test(first))angle=0;
   }
   const dx=Math.sin(angle*Math.PI/180),dy=-Math.cos(angle*Math.PI/180);
   const length=Math.abs(r.width*dx)+Math.abs(r.height*dy);
   const cx=r.left+r.width/2,cy=r.top+r.height/2;
   gradientPaint=ctx.createLinearGradient(cx-dx*length/2,cy-dy*length/2,cx+dx*length/2,cy+dy*length/2);
  }
  try{
   for(const s of stops)gradientPaint.addColorStop(s.offset,s.color);
   ctx.fillStyle=gradientPaint;ctx.fillRect(r.left,r.top,r.width,r.height);
  }catch(error){throw Error('تعذر استعادة ألوان التدرجات الأصلية لتقرير PDF: '+error.message);}
 };
 const paintBorders=(css,r)=>{
  // Table rows and KPI cards may have four different border colors; the old
  // exporter only drew border-top as a full gray rectangle.
  for(const [edge,start,end] of [
   ['Top',[r.left,r.top],[r.right,r.top]],
   ['Right',[r.right,r.top],[r.right,r.bottom]],
   ['Bottom',[r.right,r.bottom],[r.left,r.bottom]],
   ['Left',[r.left,r.bottom],[r.left,r.top]]
  ]){
   const size=parseFloat(css['border'+edge+'Width'])||0;
   const color=css['border'+edge+'Color'];
   if(size<=.2||transparent(color))continue;
   ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=size;
   ctx.moveTo(start[0],start[1]);ctx.lineTo(end[0],end[1]);ctx.stroke();
  }
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
   const label=str.trim(),x=rtl?r.right:r.left,y=r.bottom-Math.max(1,(r.height-size)*.15);
   // Do not compress ordinary Arabic glyphs horizontally; only constrain text
   // if its measured width actually exceeds the browser's allocated box.
   const measure=ctx.measureText?.(label)?.width||0;
   if(measure>r.width+3)ctx.fillText(label,x,y,Math.max(3,r.width+3));
   else ctx.fillText(label,x,y);
   return;}
  // Multi-line paragraphs: paint each visual word at its measured browser position.
  const regex=/\S+/g;let m;while((m=regex.exec(str))){range.setStart(node,m.index);range.setEnd(node,m.index+m[0].length);
   const r=range.getBoundingClientRect();if(r.width<1)continue;const rtl=ctx.direction==='rtl';ctx.textAlign=rtl?'right':'left';
   const x=rtl?r.right:r.left,y=r.bottom-Math.max(1,(r.height-size)*.15);
   const actual=ctx.measureText?.(m[0])?.width||0;
   if(actual>r.width+3)ctx.fillText(m[0],x,y,Math.max(3,r.width+3));
   else ctx.fillText(m[0],x,y);
  }
 };
 const paint=async(node,depth=0)=>{
  if(depth>90)return;
  if(node.nodeType===Node.TEXT_NODE){paintText(node);return;}
  if(node.nodeType!==Node.ELEMENT_NODE)return;
  const tag=node.tagName.toLowerCase(),css=getComputedStyle(node);
  if(css.display==='none'||css.visibility==='hidden'||parseFloat(css.opacity)===0)return;
  const r=rectOf(node);if(!r.width||!r.height)return;
  if(r.right<base.left||r.left>base.left+naturalW||r.bottom<base.top||r.top>base.top+naturalH)return;
  canvasBackground(node,css,r);
  // Preserve the report's multi-color upper stripe, a ::before pseudo-element.
  if(node.classList.contains('school-report-page')){
   const before=getComputedStyle(node,'::before');
   const h=parseFloat(before.height)||0;
   if(h>0&&h<30&&before.content!=='none')canvasBackground(node,before,{left:r.left,top:r.top,width:r.width,height:h,right:r.right,bottom:r.top+h});
  }
  paintBorders(css,r);
  if(tag==='img'){
   try{
    const url=node.getAttribute('src')||'';
    const image=new Image();image.crossOrigin='anonymous';
    image.src=url.startsWith('data:')?url:new URL(url,document.baseURI).href;
    await image.decode();
    const objectFit=css.objectFit||'fill';
    const ratio=objectFit==='cover'?Math.max(r.width/image.naturalWidth,r.height/image.naturalHeight):Math.min(r.width/image.naturalWidth,r.height/image.naturalHeight);
    const iw=objectFit==='fill'?r.width:objectFit==='none'?image.naturalWidth:image.naturalWidth*ratio;
    const ih=objectFit==='fill'?r.height:objectFit==='none'?image.naturalHeight:image.naturalHeight*ratio;
    const position=String(css.objectPosition||'50% 50%').trim().toLowerCase().split(/\s+/);
    const fraction=value=>value==='right'||value==='bottom'?1:value==='left'||value==='top'?0:value==='center'?0.5:/^-?\d+(?:\.\d+)?%$/.test(value)?parseFloat(value)/100:0.5;
    const px=fraction(position[0]||'50%'),py=fraction(position[1]||'50%');
    ctx.save();ctx.beginPath();ctx.rect(r.left,r.top,r.width,r.height);ctx.clip();
    ctx.drawImage(image,r.left+(r.width-iw)*px,r.top+(r.height-ih)*py,iw,ih);ctx.restore();
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
 const dataUrl=canvas.toDataURL('image/jpeg',.985);
 if(dataUrl.length<5000)throw Error('لم يتم رسم تقرير PDF كاملًا.');
 return {dataUrl,width:canvas.width,height:canvas.height,landscape};
};
