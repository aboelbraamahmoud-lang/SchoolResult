/* SchoolResult 6.10.94 — download the existing top-ten ranking as real DOCX or PDF. */
(function(){
 const labels=['المركز','اسم الطالب','الشعبة','الدرجة المحصّلة','الدرجة الكلية','النسبة','رصد المواد'];
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const xml=x=>String(x??'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 const nums=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:2});
 const cells=r=>[r.position,r.studentName,r.className,nums(r.score),nums(r.total),Number(r.percentage).toFixed(3)+'%',r.recordedCount+' / '+r.expectedCount+(r.complete?' · مكتمل':' · جزئي')];
 SR63.topRanksExportPages=function(groups,options={}){
  const selected=(groups||[]).filter(g=>options.scope==='qatari'||options.scope==='resident'?g.nationalityGroup===options.scope:true),out=[];
  for(const g of selected){if(!g.rows?.length)continue;for(let i=0;i<g.rows.length;i+=10)
   out.push({group:g,rows:g.rows.slice(i,i+10),part:Math.floor(i/10)+1,parts:Math.ceil(g.rows.length/10)});}
  return out;
 };
 SR63.topRanksExportName=(scope,mode,ext)=>'العشرة الأوائل - '+(scope==='qatari'?'القطريون':scope==='resident'?'المقيمون':'القطريون والمقيمون')+' - '+(mode==='subject'?'حسب المادة':'حسب الصف')+'.'+ext;
 const css=[
 '*{box-sizing:border-box}.top-ranks-export{width:1122px;height:794px;overflow:hidden;background:#fff;direction:rtl;color:#19384a;font-family:Arial,Tahoma,sans-serif;font-size:13px;padding:33px 42px 25px;display:flex;flex-direction:column}',
 '.tr-header{height:118px;flex-shrink:0;display:flex;justify-content:space-between;align-items:center;gap:20px;border-bottom:3px solid #71304a}',
 '.tr-header img{object-fit:contain;width:158px;height:84px}.tr-header h1{font-size:22px;font-weight:900;color:#71304a;margin:5px 0}.tr-header h2{font-size:17px;color:#24516b;margin:5px 0}.tr-header p,.tr-ministry{font-size:12px;color:#496b7c;margin:3px 0}',
 '.tr-content{flex:1;min-height:0}.tr-content h3{font-size:18px;color:#24516b;margin:10px 0 5px}.tr-metrics{font-size:12px;color:#526d7a;margin:3px 0 9px}',
 '.tr-table{width:100%;border-collapse:collapse;direction:rtl;table-layout:fixed;font-size:12px}.tr-table th,.tr-table td{border:1px solid #bdced6;padding:7px 6px;text-align:right;line-height:1.35;overflow-wrap:anywhere}.tr-table th{background:#d9e9ee;color:#173f51;font-weight:900}.tr-table th:nth-child(2){width:27%}.tr-table th:nth-child(7){width:15%}.tr-table tbody tr:nth-child(odd){background:#f5fafb}',
 '.tr-note{font-size:9.3px;line-height:1.4;color:#506978;margin-top:9px;border-top:1px solid #e0e8ed;padding-top:7px;max-height:76px}',
 '.top-ranks-export .report-footer{margin:0;padding-top:8px;border-top:1px solid #cbd8de;font-size:10px;max-height:90px;overflow:hidden;flex-shrink:0}.top-ranks-export .report-signatures{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}',
 '.top-ranks-export .report-signatures>div{border:1px solid #d2e1e6;text-align:center;min-height:42px}.top-ranks-export .report-signatures b{display:block;background:#e5eff1;color:#28576a;padding:3px}.top-ranks-export .report-signatures span{display:block;padding:3px}',
 '.top-ranks-export .report-custom-footer,.top-ranks-export .report-attribution{margin:3px 0;font-size:9.5px}.top-ranks-export .report-stamp-image{max-width:60px;max-height:38px}.tr-page-num{text-align:left;font-size:10px;color:#607583}'
 ].join('');
 const foot=(meta,page)=>SR63.reportFooterHTML(meta.workspace,meta.mode==='subject'?page.group.subject:'');
 function pageHtml(p,meta,n,count){
  const s=meta.workspace.settings,logo=new URL('./moehe.png',document.baseURI).href;
  const rows=p.rows.map((r,i)=>'<tr>'+cells(r).map((v,j)=>'<td'+((j===3||j===5)?' style="font-weight:800;color:#24516b"':'')+'>'+esc(v)+'</td>').join('')+'</tr>').join('');
  return '<article class="top-ranks-export"><header class="tr-header"><div><div class="tr-ministry">وزارة التربية والتعليم والتعليم العالي</div><h1>'+esc(s.schoolName||'المدرسة')+'</h1><h2>'+esc(meta.title)+'</h2><p>'+esc(meta.examName)+' · العام الأكاديمي: '+esc(s.academicYear||'')+'</p></div><img src="'+esc(logo)+'" alt="شعار الوزارة"></header>'+
   '<div class="tr-content"><h3>'+esc(p.group.title)+(p.parts>1?' — الجزء '+p.part+' من '+p.parts:'')+'</h3><p class="tr-metrics">'+p.group.eligible+' طالب محسوب · '+p.group.incompleteCount+' نتيجة جزئية · '+p.group.rows.length+' اسمًا في القائمة</p>'+
   '<table class="tr-table"><thead><tr>'+labels.map(v=>'<th>'+esc(v)+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table>'+
   '<p class="tr-note">'+esc(meta.method+' '+meta.note)+'</p></div>'+foot(meta,p)+
   '<div class="tr-page-num">صفحة '+n+' من '+count+'</div></article>';
 }
 SR63.topRanksExportHtml=(pages,meta)=>'<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>'+css+'</style></head><body>'+pages.map((p,i)=>pageHtml(p,meta,i+1,pages.length)).join('')+'</body></html>';
 const textRun=(value,size=19,bold=false,color='19384A')=>'<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:rtl/><w:sz w:val="'+size+'"/><w:szCs w:val="'+size+'"/>'+(bold?'<w:b/>':'')+'<w:color w:val="'+color+'"/></w:rPr><w:t xml:space="preserve">'+xml(value)+'</w:t></w:r>';
 const p=(value,opts={})=>'<w:p><w:pPr><w:bidi/><w:jc w:val="'+(opts.align||'right')+'"/><w:spacing w:after="'+(opts.after??100)+'"/></w:pPr>'+textRun(value,opts.size||19,opts.bold||false,opts.color||'19384A')+'</w:p>';
 const widths=[1350,3500,1450,1680,1680,1310,2230];
 const col=(value,width,head,alternate)=>'<w:tc><w:tcPr><w:tcW w:w="'+width+'" w:type="dxa"/><w:shd w:val="clear" w:fill="'+(head?'D9E9EE':alternate?'F5FAFB':'FFFFFF')+'"/></w:tcPr>'+p(value,{bold:head,size:head?17:18,color:head?'173F51':'19384A',after:0})+'</w:tc>';
 const table=rows=>{
  const b='<w:tblBorders>'+['top','bottom','left','right','insideH','insideV'].map(x=>'<w:'+x+' w:val="single" w:sz="5" w:color="BCCED6"/>').join('')+'</w:tblBorders>';
  const start='<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblLayout w:type="fixed"/><w:bidiVisual/>'+b+'</w:tblPr><w:tblGrid>'+widths.map(w=>'<w:gridCol w:w="'+w+'"/>').join('')+'</w:tblGrid>';
  const tr=(values,head,index)=>'<w:tr><w:trPr><w:cantSplit/>'+(head?'<w:tblHeader/>':'')+'</w:trPr>'+values.map((x,j)=>col(x,widths[j],head,index%2===0)).join('')+'</w:tr>';
  return start+tr(labels,true,0)+rows.map((r,i)=>tr(cells(r),false,i)).join('')+'</w:tbl>';
 };
 const signature=(meta,group)=>{
  const s=meta.workspace.settings,d=s.reportDesign||{};if(d.showSignatures!==true)return '';
  const keys=d.signatureLabels||{},list=[[keys.teacher||'معلم المادة',''],[keys.coordinator||'منسق المادة',SR63.subjectCoordinator?.(meta.workspace,meta.mode==='subject'?group.subject:'')||s.coordinatorName||''],[keys.vice||'النائب الأكاديمي',s.academicViceName||''],[keys.principal||'مدير المدرسة',s.principalName||'']];
  return '<w:tbl><w:tblPr><w:bidiVisual/><w:tblW w:w="13200" w:type="dxa"/></w:tblPr><w:tblGrid>'+Array(4).fill('<w:gridCol w:w="3300"/>').join('')+'</w:tblGrid><w:tr>'+list.map(([title,name])=>'<w:tc><w:tcPr><w:tcW w:w="3300" w:type="dxa"/></w:tcPr>'+p(title,{size:16,bold:true,color:'24516B',align:'center',after:40})+p(name,{size:16,align:'center',after:40})+'</w:tc>').join('')+'</w:tr></w:tbl>';
 };
 const logo=()=>'<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="1660000" cy="730000"/><wp:docPr id="1" name="شعار الوزارة"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="moehe.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1660000" cy="730000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
 SR63.topRanksWordBlob=async(pages,meta)=>{
  if(!pages.length)throw Error('لا توجد أسماء في النطاق المحدد.');
  const s=meta.workspace.settings,body=[];
  pages.forEach((page,i)=>{
   if(i)body.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
   body.push(logo(),p('وزارة التربية والتعليم والتعليم العالي',{size:16,bold:true,color:'36566A',after:55}),
    p(s.schoolName||'المدرسة',{size:27,bold:true,color:'71304A',after:55}),
    p(meta.title,{size:23,bold:true,color:'24516B',after:50}),
    p(meta.examName+' · العام الأكاديمي: '+(s.academicYear||''),{size:16,color:'456778',after:90}),
    p(page.group.title+(page.parts>1?' — الجزء '+page.part+' من '+page.parts:''),{size:22,bold:true,color:'24516B',after:75}),
    table(page.rows),p(meta.method+' '+meta.note,{size:14,color:'526775',after:95}),signature(meta,page.group),
    p('صفحة '+(i+1)+' من '+pages.length,{size:13,align:'left',color:'526775',after:0}));
  });
  const documentXml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>'+body.join('')+'<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="560" w:right="690" w:bottom="560" w:left="690" w:header="300" w:footer="300" w:gutter="0"/></w:sectPr></w:body></w:document>';
  const types='<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
  const rels='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  const media='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/moehe.png"/></Relationships>';
  const response=await fetch(new URL('./moehe.png',document.baseURI).href,{credentials:'same-origin'});if(!response.ok)throw Error('تعذر تحميل الشعار الرسمي.');
  const files=[['[Content_Types].xml',types],['_rels/.rels',rels],['word/document.xml',documentXml],['word/_rels/document.xml.rels',media]];
  const parts=files.map(([name,content])=>({name,blob:new Blob([content])}));
  parts.push({name:'word/media/moehe.png',blob:new Blob([await response.arrayBuffer()],{type:'image/png'})});
  const zip=await SR63.reportZipFromPdfs(parts,true);
  return new Blob([zip],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
 };
 SR63.topRanksPdfBlob=async(pages,meta)=>{
  if(!pages.length)throw Error('لا توجد أسماء في النطاق المحدد.');
  const host=document.createElement('div');host.style.cssText='position:fixed;left:-15000px;top:0;z-index:-1;background:white;width:1122px;';
  const style=document.createElement('style');style.textContent=css;host.appendChild(style);document.body.appendChild(host);
  const images=[];
  try{
   await(document.fonts?.ready||Promise.resolve());
   for(let i=0;i<pages.length;i++){
    const mount=document.createElement('div');mount.innerHTML=pageHtml(pages[i],meta,i+1,pages.length);host.appendChild(mount);
    const el=mount.firstElementChild;
    for(const img of el.querySelectorAll('img')){await SR63.reportEmbedImage(img);await img.decode();}
    const canvas=await SR72Canvas.toCanvas(el,{pixelRatio:2.5,backgroundColor:'#ffffff',width:1122,height:794,canvasWidth:1122,canvasHeight:794,skipAutoScale:true});
    images.push({dataUrl:canvas.toDataURL('image/jpeg',.975),width:canvas.width,height:canvas.height,landscape:true});
    mount.remove();
   }
   return SR63.reportPdfFromJpegs(images);
  }finally{host.remove();}
 };
 SR63.topRanksDownload=async(format,groups,options)=>{
  const pages=SR63.topRanksExportPages(groups,{scope:options.scope});
  if(!pages.length)throw Error('لا يوجد طلاب في قائمة الجنسية المحددة.');
  const meta={workspace:options.workspace,mode:options.mode,title:options.title,examName:options.examName,method:options.method,note:options.note};
  const blob=format==='docx'?await SR63.topRanksWordBlob(pages,meta):format==='pdf'?await SR63.topRanksPdfBlob(pages,meta):null;
  if(!blob)throw Error('صيغة الملف غير مدعومة.');
  SR63.downloadReportFile(blob,SR63.topRanksExportName(options.scope,options.mode,format));
  return {pages:pages.length,bytes:blob.size};
 };
})();