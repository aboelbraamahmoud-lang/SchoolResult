/* 6.10.104 — measured, editable OOXML export.
 * The fitted PDF DOM is the design specification. No PDF/table screenshots.
 * Each A4 page owns positioned native Word tables, paragraphs and vector shapes.
 * This avoids a second pagination algorithm and preserves the PDF page boundary.
 */
(function(){
 'use strict';
 const NS='http://schemas.openxmlformats.org/';
 const esc=v=>String(v??'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 const tw=v=>Math.round(v*15),pt=v=>(v*.75).toFixed(3),num=v=>parseFloat(v)||0;
 const css=el=>getComputedStyle(el);
 const onPage=(el,origin)=>{const b=el.getBoundingClientRect();return b.right>origin.x+.5&&b.left<origin.x+origin.width-.5&&b.bottom>origin.y+.5&&b.top<origin.y+origin.height-.5;};
 const visible=el=>{const s=css(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&num(s.opacity)!==0&&r.width>0&&r.height>0;};
 const color=value=>{
  if(!value||value==='transparent')return null;
  // Let Chromium resolve color-mix(), modern color(), alpha and CSS variables.
  const canvas=color.canvas||(color.canvas=document.createElement('canvas'));canvas.width=canvas.height=1;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,1,1);ctx.fillStyle=value;ctx.fillRect(0,0,1,1);
  const [r,g,b,a]=ctx.getImageData(0,0,1,1).data;if(!a)return null;
  return {hex:[r,g,b].map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase(),alpha:a/255};
 };
 const rect=(node,origin)=>{const b=node.getBoundingClientRect();return {x:b.x-origin.x,y:b.y-origin.y,w:b.width,h:b.height};};
 const scaleOf=el=>{const b=el.getBoundingClientRect();return el.offsetWidth?b.width/el.offsetWidth:1;};
 function runStyle(el){
  const s=css(el),scale=scaleOf(el.closest('.sr-report-fit-content')||el);
  return {font:s.fontFamily.split(',')[0].replace(/["']/g,'').trim(),size:num(s.fontSize)*scale,
   bold:num(s.fontWeight)>=600||s.fontWeight==='bold',italic:s.fontStyle==='italic',color:color(s.color)?.hex||'000000'};
 }
 function run(value,style){
  // Isolate decimal values, percentages and Latin identifiers from Arabic runs.
  return value.split(/(\d+(?:[.,:/-]\d+)*%?|[A-Za-z]+(?:[./_-][A-Za-z0-9]+)*)/g).filter(Boolean).map(t=>{
   const rtl=/[\u0590-\u08ff]/.test(t),size=Math.max(2,Math.round(style.size*1.5));
   return '<w:r><w:rPr><w:rFonts w:ascii="'+esc(style.font)+'" w:hAnsi="'+esc(style.font)+'" w:cs="'+esc(style.font)+'"/>'+
    (style.bold?'<w:b/><w:bCs/>':'')+(style.italic?'<w:i/><w:iCs/>':'')+
    '<w:color w:val="'+style.color+'"/><w:sz w:val="'+size+'"/><w:szCs w:val="'+size+'"/><w:rtl w:val="'+(rtl?1:0)+'"/><w:lang w:val="en-US" w:bidi="ar-QA"/></w:rPr><w:t xml:space="preserve">'+esc(t)+'</w:t></w:r>';
  }).join('');
 }
 // Use browser line fragments instead of estimating wraps from string length.
 function textLines(root,origin,{outsideTables=false,onlyNode=null}={}){
  const lines=[],walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node,order=0;
  while((node=walker.nextNode())){
   if(onlyNode&&node!==onlyNode)continue;
   const parent=node.parentElement;
   if(!parent||!node.nodeValue.trim()||!visible(parent)||parent.closest('script,style,button,svg,canvas')||
      (outsideTables&&parent.closest('table')))continue;
   const style=runStyle(parent),text=node.nodeValue,range=document.createRange();
   for(const match of text.matchAll(/\s+|\S+/gu)){
    range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);
    const boxes=[...range.getClientRects()].filter(b=>b.width&&b.height);
    if(!boxes.length)continue;
    // A long word can wrap under overflow-wrap:anywhere; retain all characters.
    const pieces=boxes.length>1?Array.from(match[0]).map((c,i)=>({text:c,start:match.index+Array.from(match[0]).slice(0,i).join('').length})): [{text:match[0],start:match.index}];
    for(const piece of pieces){range.setStart(node,piece.start);range.setEnd(node,piece.start+piece.text.length);const b=range.getBoundingClientRect();if(!b.width||!b.height)continue;
     if(b.x+b.width/2<origin.x||b.x+b.width/2>origin.x+origin.width||b.y+b.height/2<origin.y||b.y+b.height/2>origin.y+origin.height)continue;
     const x=b.x-origin.x,y=b.y-origin.y;
     let line=lines.find(l=>Math.abs((l.y+l.h/2)-(y+b.height/2))<Math.min(2,b.height*.18));
     if(!line){line={x,y,w:b.width,h:b.height,runs:[]};lines.push(line);}
     const right=Math.max(line.x+line.w,x+b.width);line.x=Math.min(line.x,x);line.w=right-line.x;line.y=Math.min(line.y,y);line.h=Math.max(line.h,b.height);
     line.runs.push({text:piece.text,style,order:order++,x,w:b.width});
    }
   }
  }
  return lines.sort((a,b)=>a.y-b.y);
 }
 const emptyP='<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="1" w:lineRule="exact"/></w:pPr></w:p>';
 function paragraphs(lines,box){
  let cursor=box.y,out='';
  for(const line of lines){
   const before=Math.max(0,line.y-cursor),lg=Math.max(0,line.x-box.x),rg=Math.max(0,box.x+box.w-line.x-line.w);
   const align=Math.abs(lg-rg)<2?'center':rg<lg?'start':'end',left=align==='end'?Math.max(0,lg-1):0,right=align==='start'?Math.max(0,rg-1):0;
   // Adjacent words with identical formatting share a run. Word otherwise has
   // to maintain a complete property set for every whitespace/token during edits.
   const compact=[];
   for(const r of line.runs.sort((a,b)=>a.order-b.order)){
    const previous=compact.at(-1);
    if(previous&&JSON.stringify(previous.style)===JSON.stringify(r.style))previous.text+=r.text;
    else compact.push({text:r.text,style:r.style});
   }
   const text=compact.map(r=>run(r.text,r.style)).join('');
   out+='<w:p><w:pPr><w:widowControl w:val="0"/><w:bidi w:val="1"/><w:snapToGrid w:val="0"/><w:spacing w:before="'+tw(before)+'" w:after="0" w:line="'+tw(line.h)+'" w:lineRule="exact"/><w:ind w:left="'+tw(right)+'" w:right="'+tw(left)+'"/><w:jc w:val="'+align+'"/></w:pPr>'+text+'</w:p>';
   cursor=line.y+line.h;
  }
  return out||emptyP;
 }
 function drawing(context,box,graphic){
  const id=++context.shapeId,emu=v=>Math.round(v*9525),w=emu(Math.max(.1,box.w)),h=emu(Math.max(.1,box.h));
  const data=graphic(w,h,id);
  if(context.decorationGroup){
   // One native, editable DrawingML group owns the page decorations instead of
   // one floating anchor per table-cell edge. Child geometry remains editable.
   const child=/<wps:wsp>[\s\S]*<\/wps:wsp>/.exec(data)?.[0];
   if(child){context.decorationGroup.push(child.replace('<a:off x="0" y="0"/>','<a:off x="'+emu(box.x)+'" y="'+emu(box.y)+'"/>'));return '';}
  }
  return '<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="'+(251658240+id*1024)+'" behindDoc="0" locked="0" layoutInCell="0" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>'+emu(box.x)+'</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>'+emu(box.y)+'</wp:posOffset></wp:positionV><wp:extent cx="'+w+'" cy="'+h+'"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="'+id+'" name="Report object '+id+'"/><wp:cNvGraphicFramePr/><a:graphic>'+data+'</a:graphic></wp:anchor></w:drawing></w:r>';
 }
 const solid=c=>c?'<a:solidFill><a:srgbClr val="'+c.hex+'"><a:alpha val="'+Math.round(c.alpha*100000)+'"/></a:srgbClr></a:solidFill>':'<a:noFill/>';
 const xfrm=(w,h)=>'<a:xfrm><a:off x="0" y="0"/><a:ext cx="'+w+'" cy="'+h+'"/></a:xfrm>';
 function paintedShape(context,box,fill,stroke,extra,radius){
  const imageId=/r:id="([^"]+)"/.exec(extra)?.[1];
  if(imageId)return drawing(context,box,(w,h,id)=>'<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="'+id+'" name="Original report logo"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="'+imageId+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr>'+xfrm(w,h)+'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData>');
  let paint=solid(fill);
  if(extra.includes('gradient')){
   const raw=/colors="([^"]+)"/.exec(extra)?.[1]||'',stops=[...raw.matchAll(/([\d.]+)% #(\w+)/g)],vml=Number(/angle="([^"]+)"/.exec(extra)?.[1])||0,cssAngle=(360-vml)%360,angle=((cssAngle+270)%360)*60000;
   paint='<a:gradFill rotWithShape="1"><a:gsLst>'+stops.map(m=>'<a:gs pos="'+Math.round(Number(m[1])*1000)+'"><a:srgbClr val="'+m[2]+'"/></a:gs>').join('')+'</a:gsLst><a:lin ang="'+angle+'" scaled="1"/></a:gradFill>';
  }
  // A zero-radius roundRect is geometrically a rectangle. Explicit adj=0
  // also avoids readers that discard an implicit, unadjusted rect geometry.
  const geom='<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val '+Math.round(Math.min(.5,radius/Math.min(box.w,box.h))*100000)+'"/></a:avLst></a:prstGeom>';
  return drawing(context,box,(w,h)=>'<a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr/><wps:spPr>'+xfrm(w,h)+geom+paint+'<a:ln w="'+Math.round((stroke?.width||0)*9525)+'">'+solid(stroke)+'</a:ln></wps:spPr><wps:bodyPr/></wps:wsp></a:graphicData>');
 }
 function shape(context,box,content='',fill=null,stroke=null,extra='',radius=0){
  if(box.w<=0||box.h<=0)return '';
  if(!content)return paintedShape(context,box,fill,stroke,extra,radius);
  const id='srShape'+(++context.shapeId),tag=radius?'roundrect':'rect',arc=radius?' arcsize="'+(100*Math.min(1,2*radius/Math.min(box.w,box.h)))+'%"':'';
  return '<w:r><w:pict><v:'+tag+arc+' id="'+id+'" style="position:absolute;margin-left:'+pt(box.x)+'pt;margin-top:'+pt(box.y)+'pt;width:'+pt(box.w)+'pt;height:'+pt(box.h)+'pt;z-index:'+context.shapeId+';mso-position-horizontal-relative:page;mso-position-vertical-relative:page" filled="'+(fill||extra.includes('<v:fill')||extra.includes('<v:imagedata')?'t':'f')+'"'+(fill?' fillcolor="#'+fill.hex+'"':'')+' stroked="'+(stroke?'t':'f')+'"'+(stroke?' strokecolor="#'+stroke.hex+'" strokeweight="'+pt(stroke.width)+'pt"':'')+'>'+
   (fill?'<v:fill opacity="'+fill.alpha+'"/>':'')+extra+
   (content?'<v:textbox inset="0,0,0,0" style="mso-fit-shape-to-text:f"><w:txbxContent>'+content+'</w:txbxContent></v:textbox>':'')+
   '<w10:wrap type="none"/></v:'+tag+'></w:pict></w:r>';
 }
 function decorations(root,origin,context){
  let out='';const borders=new Set();
  // Fixed sheets can safely share one page-sized group. Flowing column reports
  // may contain decoration fragments beyond the sheet; keep their independent
  // anchors so Office does not rescale the group to those off-page bounds.
  context.decorationGroup=root.dataset.wordFlow==='true'?null:[];
  const paint=(s,box,scale)=>{
   const fill=color(s.backgroundColor),radius=num(s.borderTopLeftRadius)*scale;
   if(fill)fill.alpha*=Number(s.opacity);
   const gradient=s.backgroundImage.match(/(?:rgba?\([^)]*\)|#[0-9a-f]{3,8})/gi);
   let extra='';if(gradient?.length){
    const first=color(gradient[0]),last=color(gradient.at(-1)),angle=(360-(Number(/(-?[\d.]+)deg/.exec(s.backgroundImage)?.[1])||180))%360;
    const stops=[...s.backgroundImage.matchAll(/(rgba?\([^)]*\)|#[0-9a-f]{3,8})\s*([\d.]+%)?/gi)].map((m,i,a)=>(m[2]||100*i/(a.length-1)+'%')+' #'+color(m[1]).hex).join(',');
    if(first&&last)extra='<v:fill type="gradient" color="#'+first.hex+'" color2="#'+last.hex+'" colors="'+stops+'" angle="'+angle+'"/>';
   }
   if(fill||extra)out+=shape(context,box,'',extra?null:fill,null,extra,radius);
  };
  for(const el of [root,...root.querySelectorAll('*')]){
   if(!visible(el)||!onPage(el,origin)||el.tagName==='IMG'||el.closest('svg,canvas'))continue;
   const s=css(el),scale=scaleOf(el.closest('.sr-report-fit-content')||el);
   // Fragmented annual-report blocks expose one rectangle for each print column.
   const fragments=[...el.getClientRects()].filter(r=>r.right>origin.x+.5&&r.left<origin.x+origin.width-.5);
   for(const r of fragments){const box={x:r.x-origin.x,y:r.y-origin.y,w:r.width,h:r.height};paint(s,box,scale);
    for(const side of ['Top','Right','Bottom','Left']){
     const width=num(s['border'+side+'Width'])*scale,c=color(s['border'+side+'Color']);if(!width||!c||s['border'+side+'Style']==='none')continue;
     const b={...box},collapsed=/^(TD|TH)$/.test(el.tagName)&&css(el.closest('table')).borderCollapse==='collapse';
     if(side==='Top'||side==='Bottom'){b.h=width;if(side==='Bottom')b.y+=box.h-width;if(collapsed)b.y+=side==='Top'?-width/2:width/2;}
     else{b.w=width;if(side==='Right')b.x+=box.w-width;if(collapsed)b.x+=side==='Left'?-width/2:width/2;}
     const key=[b.x,b.y,b.w,b.h].map(v=>v.toFixed(2)).join(',')+c.hex;if(!borders.has(key)){borders.add(key);out+=shape(context,b,'',c);}
    }
   }
  }
  const before=getComputedStyle(root,'::before');
  if(before.content!=='none'&&before.position==='absolute'&&num(before.height)>0){paint(before,{x:num(before.left),y:num(before.top),w:num(before.width)||origin.width,h:num(before.height)},1);}
  const children=context.decorationGroup;delete context.decorationGroup;
  if(children?.length)out+=drawing(context,{x:0,y:0,w:origin.width,h:origin.height},(w,h)=>
   '<a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"><wpg:wgp><wpg:cNvGrpSpPr/><wpg:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+w+'" cy="'+h+'"/><a:chOff x="0" y="0"/><a:chExt cx="'+w+'" cy="'+h+'"/></a:xfrm></wpg:grpSpPr>'+children.join('')+'</wpg:wgp></a:graphicData>');
  return out;
 }
 function nativeTable(table,origin){
  const rows=[...table.rows].filter(tr=>visible(tr)&&onPage(tr,origin));if(!rows.length)return null;
  const rowBoxes=rows.map(tr=>rect(tr,origin)),box={x:0,w:0,y:Math.min(...rowBoxes.map(r=>r.y)),h:0};box.h=Math.max(...rowBoxes.map(r=>r.y+r.h))-box.y;
  const edges=[];
  for(const tr of rows)for(const td of tr.cells){const r=rect(td,origin);edges.push(r.x,r.x+r.w);}
  const points=edges.sort((a,b)=>a-b).filter((x,i,a)=>!i||x-a[i-1]>1.5);
  box.x=points[0];box.w=points[points.length-1]-points[0];
  const widths=points.slice(1).map((x,i)=>tw(x-points[i])).reverse();
  const pending=Array(widths.length).fill(null);
  const indexAt=x=>points.reduce((best,p,i)=>Math.abs(p-x)<Math.abs(points[best]-x)?i:best,0);
  let xml='<w:tbl><w:tblPr><w:bidiVisual/><w:tblW w:w="'+tw(box.w)+'" w:type="dxa"/><w:jc w:val="start"/><w:tblCellSpacing w:w="0" w:type="dxa"/><w:tblInd w:w="0" w:type="dxa"/><w:tblBorders>'+['top','left','bottom','right','insideH','insideV'].map(s=>'<w:'+s+' w:val="nil"/>').join('')+'</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar>'+['top','left','bottom','right'].map(s=>'<w:'+s+' w:w="0" w:type="dxa"/>').join('')+'</w:tblCellMar></w:tblPr><w:tblGrid>'+widths.map(w=>'<w:gridCol w:w="'+w+'"/>').join('')+'</w:tblGrid>';
  for(let n=0;n<rows.length;n++){
   const row=rows[n],rb=rect(row,origin),cells=[...row.cells].sort((a,b)=>b.getBoundingClientRect().right-a.getBoundingClientRect().right);
   xml+='<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="'+tw(rb.h)+'" w:hRule="exact"/>'+(row.closest('thead')?'<w:tblHeader/>':'')+'</w:trPr>';
   let col=0;
   const emit=(td,span,merge,cb)=>{
    const width=widths.slice(col,col+span).reduce((a,b)=>a+b,0);
    xml+='<w:tc><w:tcPr><w:tcW w:w="'+width+'" w:type="dxa"/>'+(span>1?'<w:gridSpan w:val="'+span+'"/>':'')+(merge?'<w:vMerge w:val="'+merge+'"/>':'')+'<w:tcBorders>'+['top','left','bottom','right'].map(s=>'<w:'+s+' w:val="nil"/>').join('')+'</w:tcBorders><w:tcMar>'+['top','left','bottom','right'].map(s=>'<w:'+s+' w:w="0" w:type="dxa"/>').join('')+'</w:tcMar><w:vAlign w:val="top"/></w:tcPr>'+ (td?paragraphs(textLines(td,origin),cb):emptyP)+'</w:tc>';col+=span;
   };
   const carry=()=>{const c=pending[col];if(!c)return false;emit(null,c.span,'continue');for(let k=col-c.span;k<col;k++){pending[k].remaining--;if(!pending[k].remaining)pending[k]=null;}return true;};
   for(const td of cells){while(pending[col])carry();const cb=rect(td,origin),span=Math.max(1,indexAt(cb.x+cb.w)-indexAt(cb.x)),start=col;emit(td,span,td.rowSpan>1?'restart':'',cb);if(td.rowSpan>1)for(let k=start;k<col;k++)pending[k]={span,remaining:td.rowSpan-1};}
   while(col<widths.length&&pending[col])carry();xml+='</w:tr>';
  }
  return {box,xml:xml+'</w:tbl>'+emptyP};
 }
 async function image(el,origin,context){
  await el.decode();if(!el.naturalWidth)throw Error('تعذر تحميل شعار التقرير.');
  const src=el.currentSrc||el.src;let id=context.imageCache.get(src);
  if(!id){
   // Only original image elements may produce media parts; no table/page capture.
   const canvas=document.createElement('canvas');canvas.width=el.naturalWidth;canvas.height=el.naturalHeight;canvas.getContext('2d').drawImage(el,0,0);
   const blob=await new Promise((ok,no)=>canvas.toBlob(b=>b?ok(b):no(Error('تعذر تجهيز شعار التقرير.')),'image/png'));
   id='image'+(context.images.length+1);context.images.push({id,blob});context.imageCache.set(src,id);
  }
  const b=rect(el,origin),style=css(el);
  if(['contain','scale-down'].includes(style.objectFit)){const fit=Math.min(b.w/el.naturalWidth,b.h/el.naturalHeight,style.objectFit==='scale-down'?1:Infinity),w=el.naturalWidth*fit,h=el.naturalHeight*fit,position=style.objectPosition.split(' ');b.x+=(b.w-w)*(num(position[0]||'50')/100);b.y+=(b.h-h)*(num(position[1]||'50')/100);b.w=w;b.h=h;}
  return shape(context,b,'',null,null,'<v:imagedata r:id="'+id+'" o:title="'+esc(el.alt||'شعار التقرير')+'"/>');
 }
 function vectorPath(context,box,path,fill,stroke){
  const id=++context.shapeId,emu=v=>Math.round(v*9525),points=[...path.matchAll(/(-?\d+),(-?\d+)/g)],w=Math.max(1,Math.round(box.w*100)),h=Math.max(1,Math.round(box.h*100));
  const paint=c=>c?'<a:solidFill><a:srgbClr val="'+c.hex+'"><a:alpha val="'+Math.round(c.alpha*100000)+'"/></a:srgbClr></a:solidFill>':'<a:noFill/>';
  return '<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="'+id+'" behindDoc="0" locked="0" layoutInCell="0" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>'+emu(box.x)+'</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>'+emu(box.y)+'</wp:posOffset></wp:positionV><wp:extent cx="'+emu(Math.max(.1,box.w))+'" cy="'+emu(Math.max(.1,box.h))+'"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="'+id+'" name="Report vector '+id+'"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+emu(Math.max(.1,box.w))+'" cy="'+emu(Math.max(.1,box.h))+'"/></a:xfrm><a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/><a:pathLst><a:path w="'+w+'" h="'+h+'">'+points.map((p,i)=>'<a:'+(i?'lnTo':'moveTo')+'><a:pt x="'+p[1]+'" y="'+p[2]+'"/></a:'+(i?'lnTo':'moveTo')+'>').join('')+(/x/.test(path)?'<a:close/>':'')+'</a:path></a:pathLst></a:custGeom>'+paint(fill)+'<a:ln w="'+emu(stroke?.width||0)+'">'+paint(stroke)+'</a:ln></wps:spPr><wps:bodyPr/></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>';
 }
 function svgShape(svg,origin,context){
  let result='';
  for(const el of svg.querySelectorAll('rect,line,circle,ellipse,text,path,polygon,polyline')){
   if(el.closest('defs,clipPath,mask')||!onPage(el,origin))continue;
   const b=rect(el,origin),s=css(el),tag=el.tagName.toLowerCase();if((!b.w&&!b.h)||s.display==='none')continue;
   if(tag==='text'){
    const style=runStyle(el),room=Math.max(4,b.w*.16),box={...b,x:b.x-room/2,w:b.w+room,h:b.h+2};result+=shape(context,box,paragraphs([{...b,runs:[{text:el.textContent,style,order:0}]}],box));
   }else if(typeof el.getTotalLength==='function'){
    const matrix=el.getScreenCTM(),length=el.getTotalLength(),count=tag==='line'?1:tag==='rect'&&!num(el.getAttribute('rx'))&&!num(el.getAttribute('ry'))?4:Math.max(2,Math.min(1500,Math.ceil(length/1.5))),points=[];
    for(let i=0;i<=count;i++){let p;
     if(tag==='rect'&&count===4){const x=num(el.getAttribute('x')),y=num(el.getAttribute('y')),w=num(el.getAttribute('width')),h=num(el.getAttribute('height'));p=[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h},{x,y}][i];}
     else p=el.getPointAtLength(length*i/count);
     const q=new DOMPoint(p.x,p.y).matrixTransform(matrix);points.push(Math.round((q.x-origin.x-b.x)*100)+','+Math.round((q.y-origin.y-b.y)*100));}
    const fill=s.fill==='none'?null:color(s.fill),stroke=s.stroke==='none'?null:color(s.stroke);
    if(fill)fill.alpha*=Number(s.fillOpacity)*Number(s.opacity);
    if(stroke)stroke.width=num(s.strokeWidth)*Math.hypot(matrix.a,matrix.b);
    const closed=['rect','circle','ellipse','polygon'].includes(tag)||/[zZ]\s*$/.test(el.getAttribute('d')||'');
    result+=vectorPath(context,b,'m '+points[0]+' l '+points.slice(1).join(' ')+(closed?' x':'')+' e',fill,stroke);
   }
  }return result;
 }
 const section=landscape=>'<w:sectPr><w:pgSz w:w="'+(landscape?16838:11906)+'" w:h="'+(landscape?11906:16838)+'"'+(landscape?' w:orient="landscape"':'')+'/><w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>';
 SR63.wordReportBlob=async function(pages,options={}){
  if(!Array.isArray(pages)||!pages.length)throw Error('لا توجد صفحات جاهزة لتصدير Word.');
  if(pages.length>250)throw Error('حدد نطاقًا لا يزيد على 250 صفحة.');
  const context={shapeId:0,images:[],imageCache:new Map()},stage=document.createElement('div');
  stage.style.cssText='position:fixed;left:-25000px;top:0;pointer-events:none;background:white;z-index:-1;';document.body.append(stage);
  const bodies=[];
  try{
   if(options.css){const style=document.createElement('style');style.textContent=SR63.reportScreenCSS(options.css);stage.append(style);}
   await document.fonts.ready;
   for(let i=0;i<pages.length;i++){
    const holder=document.createElement('div');if(!pages[i]?.root)holder.innerHTML=typeof pages[i]==='string'?pages[i]:pages[i].outerHTML;stage.append(holder);
    const root=pages[i]?.root||holder.firstElementChild;if(!root)throw Error('صفحة تقرير فارغة.');
    const landscape=SR63.reportPageIsLandscape('',root)||options.landscape===true;
    holder.style.width=(landscape?'297':'210')+'mm';
    await Promise.all([...root.querySelectorAll('img')].map(im=>im.decode()));
    SR63.ensureReportContrast?.(root);
    if(root.classList.contains('school-report-page'))SR63.planReportSheet(root,(landscape?297:210)*96/25.4,(landscape?210:297)*96/25.4);
    const origin=pages[i]?.origin||root.getBoundingClientRect();let objects=decorations(root,origin,context);
    for(const img of root.querySelectorAll('img'))if(visible(img)&&onPage(img,origin))objects+=await image(img,origin,context);
    for(const svg of root.querySelectorAll('svg'))objects+=svgShape(svg,origin,context);
    if(root.querySelector('canvas'))throw Error('الرسم النقطي ليس مدعومًا كتقرير Word قابل للتعديل.');
    for(const table of root.querySelectorAll('table')){if(table.parentElement.closest('table'))continue;const t=nativeTable(table,origin);if(!t)continue;objects+=shape(context,{...t.box,h:t.box.h+2},t.xml);}
    // Outside-table content retains its exact text, position, font and color.
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
    while((node=walker.nextNode())){const p=node.parentElement;if(!node.nodeValue.trim()||p.closest('table,svg,script,style,button')||!visible(p))continue;
     // A temporary wrapper is not used: ranges observe original DOM geometry.
     const all=textLines(p,origin,{outsideTables:true,onlyNode:node});
     for(const line of all){const room=Math.max(4,line.w*.16),b={x:line.x-room/2,y:line.y,w:line.w+room,h:line.h+2};objects+=shape(context,b,paragraphs([line],b));}
    }
    let stack=0;objects=objects.replace(/(z-index:|relativeHeight=")\d+/g,(_,prefix)=>prefix+(251658240+(++stack)*1024));
    // Own a section per original PDF sheet; anchored objects never repaginate flow.
    bodies.push('<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="1" w:lineRule="exact"/>'+ (i<pages.length-1?section(landscape):'')+'</w:pPr>'+objects+'</w:p>'+(i===pages.length-1?section(landscape):''));
    holder.remove();options.onProgress?.(i+1,pages.length);if(i%4===0)await new Promise(r=>setTimeout(r,0));
   }
   const xml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="'+NS+'wordprocessingml/2006/main" xmlns:r="'+NS+'officeDocument/2006/relationships" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:w10="urn:schemas-microsoft-com:office:word"><w:body>'+bodies.join('')+'</w:body></w:document>';
   const rel=(id,type,target)=>'<Relationship Id="'+id+'" Type="'+NS+'officeDocument/2006/relationships/'+type+'" Target="'+target+'"/>';
   const rels=contents=>'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="'+NS+'package/2006/relationships">'+contents+'</Relationships>';
   const settings='<?xml version="1.0" encoding="UTF-8"?><w:settings xmlns:w="'+NS+'wordprocessingml/2006/main"><w:defaultTabStop w:val="720"/><w:autoHyphenation w:val="0"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>';
   const types='<?xml version="1.0" encoding="UTF-8"?><Types xmlns="'+NS+'package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>';
   const files=[['[Content_Types].xml',types],['_rels/.rels',rels(rel('root','officeDocument','word/document.xml'))],['word/document.xml',xml],['word/settings.xml',settings],['word/_rels/document.xml.rels',rels(rel('settings','settings','settings.xml')+context.images.map(im=>rel(im.id,'image','media/'+im.id+'.png')).join(''))]].map(([name,data])=>({name,blob:new Blob([data])}));
   files.push(...context.images.map(im=>({name:'word/media/'+im.id+'.png',blob:im.blob})));
   return new Blob([await SR63.reportZipFromPdfs(files,true)],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  }finally{stage.remove();}
 };
 SR63.downloadWordReport=async function(pages,options={}){
  const blob=await SR63.wordReportBlob(pages,options),filename=SR63.safeReportFilename((options.filename||options.title||'تقرير المدرسة')+'.docx');
  SR63.downloadReportFile(blob,filename);return {filename,bytes:blob.size,pages:pages.length};
 };
 SR63.downloadStaffReportWord=async function(report,meta={}){
  const html=SR63.staffReportDocument(report,meta),frame=document.createElement('iframe');
  frame.style.cssText='position:fixed;left:-30000px;top:0;width:1123px;height:794px;border:0';
  document.body.append(frame);
  try{
   const doc=frame.contentDocument;doc.open();doc.write(html);doc.close();
   await Promise.all([doc.fonts.ready,...[...doc.images].map(im=>im.decode())]);
   SR63.ensureReportContrast?.(doc);
   const styles=[...doc.querySelectorAll('style')].map(n=>n.textContent).join('\n'),landscape=!/@page\s*\{[^}]*size\s*:\s*A4\s+portrait/i.test(styles);
   const mm=96/25.4,w=(landscape?297:210)*mm,h=(landscape?210:297)*mm,margin=3*mm;
   // Chromium's column fragmentation uses the same break-inside/row rules as
   // native print. Its measured fragments are retained as editable Word objects.
   const flow=doc.createElement('div');flow.dataset.wordFlow='true';while(doc.body.firstChild)flow.append(doc.body.firstChild);doc.body.append(flow);
   const print=doc.createElement('style');print.textContent=SR63.reportScreenCSS(styles)+'main{width:auto!important;max-width:none!important;margin:0;direction:rtl}';doc.head.append(print);
   // Round the printable height to a CSS pixel, as the native print fragment
   // does; a fractional remainder must not move the last complete row.
   flow.style.cssText='width:'+(w-2*margin)+'px;height:'+Math.ceil(h-2*margin)+'px;column-width:'+(w-2*margin)+'px;column-gap:'+(2*margin)+'px;column-fill:auto;direction:ltr;';
   const bounds=flow.getBoundingClientRect();
   // CSS columns do not repeat THEAD, whereas Chromium's printed pages do.
   // Add editable copies at each continuation boundary in this isolated Word
   // layout, then let the same browser fragmentation place the remaining rows.
   for(const table of flow.querySelectorAll('table')){
    if(!table.tHead||!table.tBodies.length)continue;
    for(const row of table.rows){const background=css(row).backgroundColor;row.style.backgroundColor=background;}
    const firstColumn=Math.floor((table.tHead.getBoundingClientRect().x-bounds.x)/w+.01),done=new Set([firstColumn]);
    for(let guard=0;guard<250;guard++){
     const row=[...table.rows].find(r=>!r.closest('thead')&&!r.dataset.wordRepeatedHeader&&!done.has(Math.floor((r.getBoundingClientRect().x-bounds.x)/w+.01)));
     if(!row)break;
     const column=Math.floor((row.getBoundingClientRect().x-bounds.x)/w+.01);done.add(column);
     [...table.tHead.rows].forEach((head,index)=>{const clone=head.cloneNode(true);[head,...head.querySelectorAll('*')].forEach((node,i)=>{const target=[clone,...clone.querySelectorAll('*')][i],style=css(node);for(const name of style)target.style.setProperty(name,style.getPropertyValue(name));});clone.dataset.wordRepeatedHeader='true';if(index===0)clone.style.breakBefore='column';row.parentNode.insertBefore(clone,row);});
    }
   }
   const count=Math.max(1,Math.ceil((flow.scrollWidth+2*margin)/w));
   const pages=Array.from({length:count},(_,i)=>({root:flow,origin:{x:bounds.x+i*w-margin,y:bounds.y-margin,width:w,height:h}}));
   return await SR63.downloadWordReport(pages,{landscape,title:report.title,filename:report.title+' - '+(meta.schoolName||'المدرسة')});
  }finally{frame.remove();}
 };
})();
