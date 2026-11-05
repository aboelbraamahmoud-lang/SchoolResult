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
 const para=(runs,align='right',shade='')=>'<w:p><w:pPr><w:bidi/><w:jc w:val="'+align+'"/><w:spacing w:after="65" w:line="245" w:lineRule="auto"/>'+(shade?'<w:shd w:val="clear" w:fill="'+shade+'"/>':'')+'</w:pPr>'+runs+'</w:p>';
 function fontStyle(el){
  const s=getComputedStyle(el),font=Math.min(29,Math.max(14,Math.round((parseFloat(s.fontSize)||12)*1.5)));
  const color=rgb(s.color)||'19384A';
  const bold=/bold|bolder/i.test(s.fontWeight)||+s.fontWeight>=600||/^(B|STRONG|TH|H[1-6])$/.test(el.tagName);
  return '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:rtl/><w:sz w:val="'+font+'"/><w:szCs w:val="'+font+'"/><w:color w:val="'+color+'"/>'+(bold?'<w:b/>':'')+'</w:rPr>';
 }
 const txt=(s,el)=>'<w:r>'+fontStyle(el)+'<w:t xml:space="preserve">'+esc(s)+'</w:t></w:r>';
 const inline=node=>{
  if(node.nodeType===3)return clean(node.nodeValue)?txt(node.nodeValue,node.parentElement):'';
  if(node.nodeType!==1||!visible(node))return '';
  if(node.tagName==='BR')return '<w:r><w:br/></w:r>';
  return [...node.childNodes].map(inline).join('');
 };
 const tagP=el=>para([...el.childNodes].map(inline).join(''),['center','left','right','justify'].includes(getComputedStyle(el).textAlign)?getComputedStyle(el).textAlign:'right');
 const wordWidth=landscape=>landscape?15000:10400;
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
 async function embed(element,context){
  let type='png',blob,uri;
  if(element.tagName==='IMG'){
   uri=element.getAttribute('src')||'';
   if(!uri)return '';
   const link=new URL(uri,document.baseURI);
   if(link.protocol!=='data:'&&link.origin!==document.location.origin)return para(txt('صورة مصدر خارجي غير متاح',element));
   const response=await fetch(link.href,{credentials:'same-origin'});
   if(!response.ok)return '';
   blob=await response.blob();
   type=/jpe?g/i.test(blob.type)?'jpeg':/webp/i.test(blob.type)?'webp':'png';
  }else{
   if(typeof SR72Canvas==='undefined'||!SR72Canvas.toCanvas)return '';
   const bounds=element.getBoundingClientRect();
   if(bounds.width<10||bounds.height<10)return '';
   const canvas=await SR72Canvas.toCanvas(element,{pixelRatio:2,backgroundColor:'#ffffff'});
   const data=canvas.toDataURL('image/png');
   blob=await(await fetch(data)).blob();
  }
  const key=uri&&uri.length<4000?uri:null;
  if(key&&context.imageCache.has(key))return context.imageCache.get(key);
  const number=++context.imagesNumber,id='rId'+number,name='word/media/report-'+number+'.'+type;
  context.imageFiles.push({name,blob});context.imageRelations.push({id,name:'media/report-'+number+'.'+type});
  context.usedTypes.set(type,type==='jpeg'?'image/jpeg':type==='webp'?'image/webp':'image/png');
  const rect=element.getBoundingClientRect(),maxWidth=context.landscape?675:450;
  const measuredWidth=rect.width||180,measuredHeight=rect.height||75;
  const width=Math.max(30,Math.min(maxWidth,measuredWidth)),height=Math.max(14,Math.min(context.landscape?220:280,measuredHeight*(width/measuredWidth)));
  const output=para(imageRun(id,number,width,height),'center');
  if(key)context.imageCache.set(key,output);
  return output;
 }
 function wordTable(table,context){
  const lines=[...table.rows];if(!lines.length)return '';
  const maxCols=Math.max(1,...lines.map(tr=>[...tr.cells].reduce((sum,td)=>sum+Math.max(1,td.colSpan||1),0)));
  const width=wordWidth(context.landscape),colWidth=Math.floor(width/maxCols);
  const grid='<w:tblGrid>'+Array.from({length:maxCols},()=>'<w:gridCol w:w="'+colWidth+'"/>').join('')+'</w:tblGrid>';
  const border='<w:tblBorders>'+['top','bottom','left','right','insideH','insideV'].map(x=>'<w:'+x+' w:val="single" w:sz="4" w:color="BFCFD6"/>').join('')+'</w:tblBorders>';
  const rows=lines.map((tr,rowIndex)=>{
   const heads=tr.closest('thead')!==null;
   const cells=[...tr.cells].map(td=>{
    const span=Math.max(1,td.colSpan||1),style=getComputedStyle(td);
    const bg=rgb(style.backgroundColor)|| (heads?'D9E9EE':rowIndex%2?'FFFFFF':'F5FAFB');
    const value=clean(td.textContent)||' ';
    const sp=span>1?'<w:gridSpan w:val="'+span+'"/>':'';
    const props='<w:tcPr><w:tcW w:w="'+(colWidth*span)+'" w:type="dxa"/>'+sp+'<w:shd w:val="clear" w:fill="'+bg+'"/>'+
     '<w:tcMar><w:top w:w="74" w:type="dxa"/><w:bottom w:w="74" w:type="dxa"/><w:right w:w="68" w:type="dxa"/><w:left w:w="68" w:type="dxa"/></w:tcMar></w:tcPr>';
    return '<w:tc>'+props+para(txt(value,td))+'</w:tc>';
   }).join('');
   return '<w:tr><w:trPr><w:cantSplit/>'+(heads?'<w:tblHeader/>':'')+'</w:trPr>'+cells+'</w:tr>';
  }).join('');
  return '<w:tbl><w:tblPr><w:tblW w:w="'+width+'" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:bidiVisual/>'+border+'</w:tblPr>'+grid+rows+'</w:tbl>';
 }
 async function walk(el,context,depth=0){
  if(depth>24||!el||el.nodeType!==1||!visible(el))return '';
  const name=el.tagName;
  if(['SCRIPT','STYLE','BUTTON','SELECT','INPUT','TEXTAREA','NOSCRIPT'].includes(name))return '';
  if(name==='TABLE')return wordTable(el,context);
  if(name==='IMG'||name==='SVG'||name==='CANVAS')return await embed(el,context);
  const children=[...el.children].filter(visible);
  const hasBlocks=children.some(child=>isBlock(child)||['TABLE','IMG','SVG','CANVAS'].includes(child.tagName));
  if(!hasBlocks){
   const value=clean(el.textContent);
   if(!value)return '';
   return tagP(el);
  }
  let out='';
  for(const node of el.childNodes){
   if(node.nodeType===3){if(clean(node.nodeValue))out+=para(txt(node.nodeValue,el));}
   else if(node.nodeType===1)out+=await walk(node,context,depth+1);
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
   const css=await SR63.getReportStyleText();
   const style=document.createElement('style');style.textContent=SR63.reportScreenCSS(css)+'\n'+String(options.css||'');stage.appendChild(style);
   await(document.fonts?.ready||Promise.resolve());
   for(let i=0;i<pages.length;i++){
    const holder=document.createElement('div');holder.innerHTML=typeof pages[i]==='string'?pages[i]:pages[i].outerHTML;
    stage.appendChild(holder);
    const node=holder.firstElementChild;
    if(!node)throw Error('إحدى صفحات التقرير فارغة.');
    SR63.ensureReportContrast?.(node);
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
