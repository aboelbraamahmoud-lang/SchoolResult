/* SchoolResult 6.10.101. Exact PDF-page Word layout, without network uploads.
   Each Word A4 sheet contains the identical page JPEG rendered for PDF.
   The existing editable DOCX renderer stays available separately. */
(function(){
 const jpegBlob=data=>{
  const match=String(data||'').match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/i);
  if(!match)throw Error('صفحة التقرير ليست صورة JPEG صالحة.');
  const decoded=atob(match[1]),out=new Uint8Array(decoded.length);
  for(let n=0;n<decoded.length;n++)out[n]=decoded.charCodeAt(n);
  return new Blob([out],{type:'image/jpeg'});
 };
 const pic=(id,index,cx,cy)=>'<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:docPr id="'+index+'" name="صفحة التقرير '+index+'" descr="الصفحة الأصلية المطابقة لتقرير PDF"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="'+index+'" name="report-page-'+index+'.jpg"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="'+id+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
 const documentXML=body=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>'+body+'</w:body></w:document>';
 const rootRels='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
 const types='<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
 SR63.visualWordBlob=async function(images,options={}){
  if(!Array.isArray(images)||!images.length)throw Error('لا توجد صفحات للتصدير إلى Word.');
  if(images.length>250)throw Error('الحد الأقصى 250 صفحة لكل ملف Word.');
  const landscape=options.landscape===true,pageW=landscape?16838:11906,pageH=landscape?11906:16838;
  // Small print-safe inset prevents any renderer from splitting one report sheet into two.
  const scale=.973,cx=Math.floor(pageW*scale)*635,cy=Math.floor(pageH*scale)*635;
  const paragraphs=[],relations=[],media=[];
  for(let i=0;i<images.length;i++){
   const image=images[i],number=i+1,id='rId'+number,name='report-page-'+number+'.jpg';
   if(!!image.landscape!==landscape)throw Error('اتجاه Word مختلف عن التقرير.');
   if(!(image.width>0&&image.height>0)||Math.abs(image.width/image.height-pageW/pageH)>.012)throw Error('مقاسات صفحة التقرير لا تتوافق مع ورق A4.');
   media.push({name:'word/media/'+name,blob:jpegBlob(image.dataUrl)});
   relations.push('<Relationship Id="'+id+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/'+name+'"/>');
   paragraphs.push('<w:p><w:pPr><w:bidi w:val="1"/><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/>'+(i?'<w:pageBreakBefore/>':'')+'</w:pPr>'+pic(id,number,cx,cy)+'</w:p>');
   options.onProgress?.(number,images.length);
   if(i%5===0)await new Promise(resolve=>setTimeout(resolve,0));
  }
  const section='<w:sectPr><w:pgSz w:w="'+pageW+'" w:h="'+pageH+'"'+(landscape?' w:orient="landscape"':'')+'/><w:pgMar w:top="70" w:bottom="70" w:right="70" w:left="70" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>';
  const rels='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+relations.join('')+'</Relationships>';
  const zip=await SR63.reportZipFromPdfs([
   {name:'[Content_Types].xml',blob:new Blob([types])},
   {name:'_rels/.rels',blob:new Blob([rootRels])},
   {name:'word/document.xml',blob:new Blob([documentXML(paragraphs.join('')+section)])},
   {name:'word/_rels/document.xml.rels',blob:new Blob([rels])},
   ...media
  ],true);
  return new Blob([zip],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
 };
 SR63.downloadVisualWordReport=async function(images,options={}){
  const blob=await SR63.visualWordBlob(images,options);
  const filename=SR63.safeReportFilename(String(options.filename||options.title||'تقرير المدرسة')+'.docx');
  SR63.downloadReportFile(blob,filename);
  return {filename,bytes:blob.size,pages:images.length};
 };
})();
