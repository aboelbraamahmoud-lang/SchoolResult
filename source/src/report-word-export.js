/* 6.10.95 — Editable, offline DOCX renderer for existing school report DOM.
   Source is the same page HTML used by PDF/print, never a second data query. */
(function(){
 const esc=s=>String(s??'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 const rgb=s=>{
  const m=String(s||'').match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if(m){if(/rgba\(/i.test(String(s))&&/[,/]\s*0(?:\.0+)?\s*\)$/.test(String(s)))return null;return [m[1],m[2],m[3]].map(n=>Math.max(0,Math.min(255,Math.round(+n))).toString(16).padStart(2,'0')).join('').toUpperCase();}
  const h=String(s||'').match(/^#([0-9a-f]{6})$/i);return h?h[1].toUpperCase():null;
 };
 const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
 const isBlock=el=>/^(?:DIV|P|SECTION|ARTICLE|HEADER|FOOTER|MAIN|H[1-6]|UL|OL|LI|FIGURE|FIGCAPTION|ASIDE|BLOCKQUOTE|PRE)$/i.test(el?.tagName||'');
 const visible=el=>{const style=getComputedStyle(el);return style.display!=='none'&&style.visibility!=='hidden';};
 const para=(runs,align='right',shade='')=>'<w:p><w:pPr><w:bidi w:val="1"/><w:jc w:val="'+align+'"/><w:spacing w:after="70" w:line="260" w:lineRule="auto"/>'+(shade?'<w:shd w:val="clear" w:fill="'+shade+'"/>':'')+'</w:pPr>'+runs+'</w:p>';
 // Word handles RTL numerals best when Arabic and numeric runs are isolated.
 const textTokens=value=>String(value??'').split(/(\d+(?:[.,:/%-]\d+)*%?|[A-Za-z]+(?:[./_-][A-Za-z0-9]+)*)/g).filter(Boolean);
 function fontStyle(el,value=''){
  const style=getComputedStyle(el);
  const font=Math.min(40,Math.max(13,Math.round((parseFloat(style.fontSize)||12)*1.5)));
  const color=rgb(style.color)||'19384A';
  const bold=/bold|bolder/i.test(style.fontWeight)||+style.fontWeight>=600||/^(B|STRONG|TH|H[1-6])$/.test(el.tagName);
  const family=/tahoma/i.test(style.fontFamily)?'Tahoma':'Arial';
  const rtl=/[\u0590-\u08FF]/.test(value);
  return '<w:rPr><w:rFonts w:ascii="'+family+'" w:hAnsi="'+family+'" w:cs="'+family+'"/>'+
   '<w:rtl w:val="'+(rtl?'1':'0')+'"/><w:lang w:bidi="ar-QA"/>'+
   '<w:sz w:val="'+font+'"/><w:szCs w:val="'+font+'"/><w:color w:val="'+color+'"/>'+
   (bold?'<w:b/>':'')+'</w:rPr>';
 }
 const txt=(value,element)=>textTokens(value).map(part=>
  '<w:r>'+fontStyle(element,part)+'<w:t xml:space="preserve">'+esc(part)+'</w:t></w:r>').join('');
 const inline=node=>{
  if(node.nodeType===3)return clean(node.nodeValue)?txt(node.nodeValue,node.parentElement):'';
  if(node.nodeType!==1||!visible(node))return '';
  if(node.tagName==='BR')return '<w:r><w:br/></w:r>';
  return [...node.childNodes].map(inline).join('');
 };
 const tagP=el=>{
  const alignment=String(getComputedStyle(el).textAlign||'').toLowerCase();
  return para([...el.childNodes].map(inline).join(''),alignment==='center'?'center':alignment==='left'?'left':alignment==='justify'?'both':'right');
 };
 const wordWidth=landscape=>landscape?15360:10460;
 const docHeader=()=>'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>';
 const partsXml=(body,landscape)=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+docHeader()+body+'<w:sectPr><w:pgSz w:w="'+(landscape?16838:11906)+'" w:h="'+(landscape?11906:16838)+'"'+(landscape?' w:orient="landscape"':'')+'/>'+
  '<w:pgMar w:top="640" w:bottom="640" w:right="700" w:left="700" w:header="340" w:footer="340" w:gutter="0"/></w:sectPr></w:body></w:document>';
 const contentTypes=types=>'<?xml version="1.0" encoding="UTF-8"?>'+
   '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
   types.map(([ext,mime])=>'<Default Extension="'+ext+'" ContentType="'+mime+'"/>').join('')+
   '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
 const rootRels='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
 function imageRun(id,number,width,height){
  const cx=Math.round(width*9525),cy=Math.round(height*9525);
  return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:docPr id="'+number+'" name="صورة التقرير '+number+'"/>'+
   '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic>'+
   '<pic:nvPicPr><pic:cNvPr id="'+number+'" name="صورة التقرير"/><pic:cNvPicPr/></pic:nvPicPr>'+
   '<pic:blipFill><a:blip r:embed="'+id+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'+
   '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'+
   '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
 }
 /* Data/image conversion must not use fetch(data:). It can be rejected by
    Content-Security-Policy connect-src on the production website. */
 const dataURLBlob=value=>{
  const match=String(value||'').match(/^data:([^;,]*)(;base64)?,([\s\S]*)$/i);
  if(!match)throw Error('صيغة الصورة المرفقة غير صالحة.');
  const mime=match[1]||'image/png';
  if(match[2]){
   const bytes=atob(match[3].replace(/\s/g,''));
   const array=new Uint8Array(bytes.length);
   for(let i=0;i<bytes.length;i++)array[i]=bytes.charCodeAt(i);
   return new Blob([array],{type:mime});
  }
  return new Blob([new TextEncoder().encode(decodeURIComponent(match[3]))],{type:mime});
 };
 const canvasBlob=canvas=>new Promise((resolve,reject)=>canvas.toBlob(
  blob=>blob?resolve(blob):reject(Error('تعذر تحويل الرسم إلى صورة داخل Word.')),'image/png'));
 const localImageCanvas=async image=>{
  if(!image?.complete||!image.naturalWidth||!image.naturalHeight)return null;
  const c=document.createElement('canvas');
  c.width=image.naturalWidth;c.height=image.naturalHeight;
  c.getContext('2d').drawImage(image,0,0);
  return await canvasBlob(c);
 };
 const inlineSVGBlob=async svg=>{
  const clone=svg.cloneNode(true);
  clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
  const bounds=svg.getBoundingClientRect();
  const w=Math.max(2,Math.round(bounds.width||parseFloat(svg.getAttribute('width'))||360));
  const h=Math.max(2,Math.round(bounds.height||parseFloat(svg.getAttribute('height'))||180));
  clone.setAttribute('width',String(w));clone.setAttribute('height',String(h));
  if(!clone.getAttribute('viewBox'))clone.setAttribute('viewBox','0 0 '+w+' '+h);
  const source=new XMLSerializer().serializeToString(clone);
  const url=URL.createObjectURL(new Blob([source],{type:'image/svg+xml;charset=utf-8'}));
  try{
   const image=new Image();image.src=url;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=w*2;canvas.height=h*2;
   const context=canvas.getContext('2d');
   context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);
   context.drawImage(image,0,0,canvas.width,canvas.height);
   return await canvasBlob(canvas);
  }finally{URL.revokeObjectURL(url);}
 };
 async function embed(element,context){
  let type='png',blob,uri;
  if(element.tagName==='IMG'){
   uri=element.getAttribute('src')||'';
   if(!uri)return '';
   const link=new URL(uri,document.baseURI);
   if(link.protocol==='data:'){
    blob=dataURLBlob(link.href);
   }else{
    if(link.origin!==document.location.origin)return '';
    // Reuse an image already loaded in the report before attempting a request.
    const cached=[...document.images].find(img=>{
     const current=img.currentSrc||img.src;
     return img.complete&&img.naturalWidth&&current===link.href;
    });
    if(cached){try{blob=await localImageCanvas(cached);}catch(_error){blob=null;}}
    if(!blob){
     // A transient network failure should never prevent downloading the report.
     try{
      const response=await fetch(link.href,{credentials:'same-origin',cache:'force-cache'});
      if(response.ok)blob=await response.blob();
     }catch(_error){blob=null;}
    }
    if(!blob){try{blob=await localImageCanvas(element);}catch(_error){blob=null;}}
    if(!blob)return '';
   }
   const mime=String(blob.type||'').toLowerCase();
   type=mime.includes('jpeg')||mime.includes('jpg')?'jpeg':mime.includes('webp')?'webp':'png';
  }else{
   try{
    const canvas=element.tagName==='CANVAS'?element:
     await SR72Canvas.toCanvas(element,{pixelRatio:2,backgroundColor:'#ffffff'});
    blob=await canvasBlob(canvas);
   }catch(error){
    if(element.tagName!=='SVG')throw Error('تعذر تحويل رسم التقرير إلى Word: '+String(error?.message||error));
    blob=await inlineSVGBlob(element);
   }
  }
  const key=uri&&uri.length<4000?uri:null;
  if(key&&context.imageCache.has(key))return context.imageCache.get(key);
  const number=++context.imagesNumber,id='rId'+number,name='word/media/report-'+number+'.'+type;
  context.imageFiles.push({name,blob});context.imageRelations.push({id,name:'media/report-'+number+'.'+type});
  context.usedTypes.set(type,type==='jpeg'?'image/jpeg':type==='webp'?'image/webp':'image/png');
  const rect=element.getBoundingClientRect(),maxWidth=context.maxImageWidth|| (context.landscape?675:450);
  const measuredWidth=rect.width||180,measuredHeight=rect.height||75;
  const width=Math.max(30,Math.min(maxWidth,measuredWidth)),height=Math.max(14,Math.min(context.landscape?220:280,measuredHeight*(width/measuredWidth)));
  const output=para(imageRun(id,number,width,height),'center');
  if(key)context.imageCache.set(key,output);
  return output;
 }
 /* Widths/column order come from the SAME DOM table shown in PDF. */
 function columnWidths(table,count,total){
  let sizes=[];
  const cols=table.querySelector(':scope > colgroup');
  if(cols){
   for(const col of cols.children){
    if(col.tagName!=='COL')continue;
    const span=Math.max(1,Number(col.span)||1);
    let value=String(col.style.width||col.getAttribute('width')||'').trim();
    let weight=parseFloat(value)||0;
    if(value.endsWith('px'))weight=weight||0;
    if(!weight){const bbox=col.getBoundingClientRect();weight=bbox.width||0;}
    for(let i=0;i<span;i++)sizes.push(weight||1);
   }
  }
  if(sizes.length!==count||sizes.some(v=>v<=0)){
   sizes=Array(count).fill(0);
   const source=[...table.rows].find(row=>[...row.cells].reduce((n,td)=>n+Math.max(1,td.colSpan||1),0)===count);
   if(source){
    let index=0;
    for(const cell of source.cells){
     const span=Math.max(1,cell.colSpan||1),size=cell.getBoundingClientRect().width||span;
     for(let n=0;n<span&&index<count;n++,index++)sizes[index]=size/span;
    }
   }
  }
  if(!sizes.some(Boolean))sizes=Array(count).fill(1);
  sizes=sizes.map(n=>Math.max(.1,n||1));
  const sum=sizes.reduce((n,x)=>n+x,0);
  const widths=sizes.map(v=>Math.max(160,Math.round(total*v/sum)));
  widths[widths.length-1]+=total-widths.reduce((n,x)=>n+x,0);
  return widths;
 }
 const tableBorders=()=>'<w:tblBorders>'+['top','bottom','left','right','insideH','insideV'].map(x=>
  '<w:'+x+' w:val="single" w:sz="5" w:color="BFCFD6"/>').join('')+'</w:tblBorders>';
 const tableStart=(width,widths)=>'<w:tbl><w:tblPr><w:tblW w:w="'+width+'" w:type="dxa"/>'+
  '<w:tblLayout w:type="fixed"/><w:bidiVisual w:val="1"/><w:jc w:val="right"/>'+tableBorders()+'</w:tblPr>'+
  '<w:tblGrid>'+widths.map(w=>'<w:gridCol w:w="'+w+'"/>').join('')+'</w:tblGrid>';
 function wordTable(table,context){
  const lines=[...table.rows];if(!lines.length)return '';
  const count=Math.max(1,...lines.map(tr=>[...tr.cells].reduce((sum,td)=>sum+Math.max(1,td.colSpan||1),0)));
  const width=wordWidth(context.landscape),widths=columnWidths(table,count,width);
  const pending=Array(count).fill(null);
  const rowXML=lines.map((tr,rowIndex)=>{
   const heads=!!tr.closest('thead'),cols=[],alternate=rowIndex%2===0;
   let col=0;
   const item=(td,span,merge)=>{
    const w=widths.slice(col,col+span).reduce((n,x)=>n+x,0);
    const style=td?getComputedStyle(td):null;
    const rgbOf=node=>node?rgb(getComputedStyle(node).backgroundColor):null;
    const bg=(style&&rgb(style.backgroundColor))||rgbOf(tr)||rgbOf(tr.parentElement)||
     (heads?'D9E9EE':alternate?'F5FAFB':'FFFFFF');
    const sp=span>1?'<w:gridSpan w:val="'+span+'"/>':'';
    const merged=merge?'<w:vMerge w:val="'+merge+'"/>':'';
    const prop='<w:tcPr><w:tcW w:w="'+w+'" w:type="dxa"/>'+sp+merged+
     '<w:shd w:val="clear" w:fill="'+bg+'"/><w:vAlign w:val="center"/>'+
     '<w:tcMar><w:top w:w="78" w:type="dxa"/><w:bottom w:w="78" w:type="dxa"/>'+
     '<w:right w:w="76" w:type="dxa"/><w:left w:w="76" w:type="dxa"/></w:tcMar></w:tcPr>';
    const align=style&&style.textAlign==='center'?'center':style&&style.textAlign==='left'?'left':'right';
    const val=td?([...td.childNodes].map(inline).join('')||txt(' ',td)):'';
    return '<w:tc>'+prop+para(val,align)+'</w:tc>';
   };
   function continuation(){
    const carry=pending[col];if(!carry||carry.start!==col)return false;
    cols.push(item(null,carry.span,'continue'));
    for(let i=0;i<carry.span;i++){
     if(pending[col+i])pending[col+i].remaining--;
     if(pending[col+i]?.remaining<=0)pending[col+i]=null;
    }
    col+=carry.span;return true;
   }
   for(const td of tr.cells){
    while(col<count&&pending[col])if(!continuation())col++;
    const span=Math.min(count-col,Math.max(1,td.colSpan||1));if(span<=0)break;
    const rowSpan=Math.max(1,td.rowSpan||1);
    cols.push(item(td,span,rowSpan>1?'restart':null));
    if(rowSpan>1)for(let j=0;j<span;j++)pending[col+j]={start:col,span,remaining:rowSpan-1};
    col+=span;
   }
   while(col<count&&pending[col])if(!continuation())col++;
   return '<w:tr><w:trPr><w:cantSplit/>'+(heads?'<w:tblHeader/>':'')+'</w:trPr>'+cols.join('')+'</w:tr>';
  }).join('');
  return tableStart(width,widths)+rowXML+'</w:tbl>';
 }
 const wordCell=(body,width,shading='FFFFFF')=>'<w:tc><w:tcPr><w:tcW w:w="'+width+'" w:type="dxa"/>'+
  '<w:shd w:val="clear" w:fill="'+shading+'"/><w:vAlign w:val="center"/></w:tcPr>'+body+'</w:tc>';
 async function wordHeader(el,context,depth){
  const images=[...el.querySelectorAll('img')].filter(visible);
  if(!images.length)return null;
  const maxWidth=context.landscape?wordWidth(true):wordWidth(false);
  const logoWidth=context.landscape?2950:2600;
  const previous=context.maxImageWidth;
  context.maxImageWidth=logoWidth/16;
  let media='';
  try{for(const image of images.slice(0,3))media+=await embed(image,context);}
  finally{context.maxImageWidth=previous;}
  const content=await walk(el,context,depth+1,true,true);
  const textBody=content||para(txt(clean(el.textContent),el));
  return tableStart(maxWidth,[maxWidth-logoWidth,logoWidth])+'<w:tr><w:trPr><w:cantSplit/></w:trPr>'+
   wordCell(textBody,maxWidth-logoWidth,'FFFFFF')+wordCell(media||para(''),logoWidth,'FFFFFF')+
   '</w:tr></w:tbl>';
 }
 async function horizontalGroup(el,context,depth){
  const children=[...el.children].filter(visible);
  if(!children.length)return null;
  const cols=children.length,width=wordWidth(context.landscape),colWidth=Math.floor(width/cols);
  const widths=Array(cols).fill(colWidth);widths[cols-1]+=width-colWidth*cols;
  const cells=[];
  for(let i=0;i<cols;i++){
   const child=children[i];
   const title=child.querySelector(':scope > b,:scope > strong');
   const value=child.querySelector(':scope > span,:scope > p');
   let content='';
   if(title&&value){
    content+=para(txt(clean(title.textContent),title),'center','E7F0F3');
    content+=para(txt(clean(value.textContent),value),'center');
   }else content=await walk(child,context,depth+1);
   cells.push(wordCell(content||para(txt(clean(child.textContent),child)),widths[i],i%2===0?'F6FAFB':'FFFFFF'));
  }
  return tableStart(width,widths)+'<w:tr><w:trPr><w:cantSplit/></w:trPr>'+cells.join('')+'</w:tr></w:tbl>';
 }
 async function walk(el,context,depth=0,skipImages=false,skipHeader=false){
  if(depth>24||!el||el.nodeType!==1||!visible(el))return '';
  const name=el.tagName,classes=String(el.className?.baseVal??el.className??'');
  if(['SCRIPT','STYLE','BUTTON','SELECT','INPUT','TEXTAREA','NOSCRIPT'].includes(name))return '';
  if(name==='TABLE')return wordTable(el,context);
  if(skipImages&&name==='IMG')return '';
  if(name==='IMG'||name==='SVG'||name==='CANVAS')return await embed(el,context);
  if(!skipHeader&&(/(?:^|\s)(?:report-head|sr640-header|sr-top-export-header|tr-header)(?:\s|$)/.test(classes)||
     name==='HEADER')&&el.querySelector('img')){
   const header=await wordHeader(el,context,depth);if(header)return header;
  }
  if(/(?:^|\s)(?:report-signatures|sr640-signatures|report-meta-grid)(?:\s|$)/.test(classes)){
   const result=await horizontalGroup(el,context,depth);if(result)return result;
  }
  const children=[...el.children].filter(visible);
  const hasBlocks=children.some(child=>isBlock(child)||['TABLE','IMG','SVG','CANVAS'].includes(child.tagName));
  if(!hasBlocks){
   if(!clean(el.textContent))return '';
   return tagP(el);
  }
  let out='';
  for(const node of el.childNodes){
   if(node.nodeType===3){if(clean(node.nodeValue))out+=para(txt(node.nodeValue,el));}
   else if(node.nodeType===1)out+=await walk(node,context,depth+1,skipImages,skipHeader);
  }
  return out;
 }
 SR63.wordReportBlob=async function(pages,options={}){
  if(!Array.isArray(pages)||!pages.length)throw Error('لا توجد صفحات جاهزة لتصدير Word.');
  if(pages.length>250)throw Error('حدد نطاقًا لا يزيد على 250 صفحة.');
  const context={landscape:options.landscape===true,imageFiles:[],imageRelations:[],imagesNumber:0,imageCache:new Map(),usedTypes:new Map()};
  const stage=document.createElement('div');
  stage.style.cssText='position:fixed;left:-25000px;top:0;z-index:-1;background:#fff;pointer-events:none;width:'+(context.landscape?'297mm':'210mm');
  document.body.appendChild(stage);
  const body=[];
  try{
   // The site's stylesheet is already active in this document. Re-fetching it
   // is unnecessary and used to make Word exports fail with "Failed to fetch".
   if(options.css){const style=document.createElement('style');style.textContent=SR63.reportScreenCSS(String(options.css));stage.appendChild(style);}
   await(document.fonts?.ready||Promise.resolve());
   for(let i=0;i<pages.length;i++){
    const holder=document.createElement('div');holder.innerHTML=typeof pages[i]==='string'?pages[i]:pages[i].outerHTML;
    stage.appendChild(holder);
    const node=holder.firstElementChild;
    if(!node)throw Error('إحدى صفحات التقرير فارغة.');
    SR63.ensureReportContrast?.(node);
    await Promise.all([...node.querySelectorAll('img')].map(image=>image.decode().catch(()=>{})));
    if(i>0)body.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
    body.push(await walk(node,context));
    holder.remove();
    options.onProgress?.(i+1,pages.length);
    if(i%4===0)await new Promise(resolve=>setTimeout(resolve,0));
   }
   const mimeTypes=[...context.usedTypes.entries()];
   const mediaRels='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    context.imageRelations.map(x=>'<Relationship Id="'+x.id+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="'+x.name+'"/>').join('')+'</Relationships>';
   const files=[
    {name:'[Content_Types].xml',blob:new Blob([contentTypes(mimeTypes)])},
    {name:'_rels/.rels',blob:new Blob([rootRels])},
    {name:'word/document.xml',blob:new Blob([partsXml(body.join(''),context.landscape)])},
    {name:'word/_rels/document.xml.rels',blob:new Blob([mediaRels])},
    ...context.imageFiles
   ];
   const compressed=await SR63.reportZipFromPdfs(files,true);
   return new Blob([compressed],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  }finally{stage.remove();}
 };
 SR63.downloadStaffReportWord=async function(report,meta={}){
  const source=SR63.staffReportDocument(report,meta);
  const parsed=new DOMParser().parseFromString(source,'text/html');
  const styles=[...parsed.querySelectorAll('style')].map(node=>node.textContent).join('\n');
  const main='<div dir="rtl" class="sr-word-staff-container">'+parsed.body.innerHTML+'</div>';
  const landscape=!/@page\s*\{[^}]*size\s*:\s*A4\s+portrait/i.test(styles);
  return await SR63.downloadWordReport([main],{css:styles,landscape,title:report.title,
   filename:report.title+' - '+(meta.schoolName||'المدرسة')});
 };
 SR63.downloadWordReport=async function(pages,options={}){
  const blob=await SR63.wordReportBlob(pages,options);
  const name=SR63.safeReportFilename(String(options.filename||options.title||'تقرير المدرسة')+'.docx');
  SR63.downloadReportFile(blob,name);
  return {filename:name,bytes:blob.size,pages:pages.length};
 };
})();
