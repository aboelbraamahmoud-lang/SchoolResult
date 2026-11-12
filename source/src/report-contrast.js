/* 6.10.95 — readability safeguard for ALL school report surfaces.
   Preserve grade-band background colors and change only unreadable foreground text. */
(function(){
 const rgba=function(value){
  const s=String(value||'').trim();
  const rgb=s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i);
  if(rgb)return [+rgb[1],+rgb[2],+rgb[3],rgb[4]===undefined?1:+rgb[4]];
  const srgb=s.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/i);
  if(srgb)return [+srgb[1]*255,+srgb[2]*255,+srgb[3]*255,srgb[4]===undefined?1:+srgb[4]];
  const h=s.match(/^#([a-f\d]{3,8})$/i);
  if(h){let v=h[1];if(v.length===3||v.length===4)v=v.split('').map(c=>c+c).join('');if(v.length===6||v.length===8)return [parseInt(v.slice(0,2),16),parseInt(v.slice(2,4),16),parseInt(v.slice(4,6),16),v.length===8?parseInt(v.slice(6,8),16)/255:1];}
  return null;
 };
 const blend=(front,back)=>{const alpha=front?.[3]??1;return [0,1,2].map(i=>(front?.[i]??back[i])*alpha+back[i]*(1-alpha)).concat([1]);};
 const lum=color=>[.2126,.7152,.0722].reduce((n,weight,i)=>{let v=color[i]/255;return n+weight*(v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));},0);
 const ratio=(a,b)=>{const la=lum(a),lb=lum(b);return (Math.max(la,lb)+.05)/(Math.min(la,lb)+.05)};
 const bgColor=(el)=>{
  let colors=[[255,255,255,1]],stack=[];
  for(let node=el;node?.nodeType===1;node=node.parentElement)stack.push(node);
  for(let i=stack.length-1;i>=0;i--){
   const style=stack[i].ownerDocument.defaultView.getComputedStyle(stack[i]),bg=rgba(style.backgroundColor);
   if(bg&&bg[3]>0)colors=colors.map(color=>blend(bg,color));
   const gradients=String(style.backgroundImage||'').match(/(?:rgba?\([^)]+\)|color\(srgb[^)]+\)|#[0-9a-f]{3,8})/gi);
   if(gradients&&/gradient/i.test(style.backgroundImage)){
    const samples=gradients.map(rgba).filter(Boolean);
    if(samples.length){
     // Check every stop rather than hiding a dark endpoint in an average.
     colors=colors.flatMap(color=>samples.map(sample=>blend(sample,color)));
     if(colors.length>32)colors=[colors.reduce((a,b)=>lum(a)<lum(b)?a:b),colors.reduce((a,b)=>lum(a)>lum(b)?a:b)];
    }
   }
  }
  return colors;
 };
 SR63.readableReportColor=function(foreground,background){
  const fg=rgba(foreground),bg=rgba(background);
  if(!fg||!bg)return foreground;
  const painted=blend(fg,bg);
  if(ratio(painted,bg)>=4.5)return foreground;
  const light=[255,255,255,1],dark=[0,0,0,1];
  return ratio(light,bg)>ratio(dark,bg)?'#ffffff':'#000000';
 };
 SR63.ensureReportContrast=function(root){
  if(!root||typeof getComputedStyle!=='function')return 0;
  const candidates=[...(root.nodeType===1?[root]:[]),...(root.querySelectorAll?.('*')||[])];
  let changed=0;
  for(const el of candidates){
   if(!el||!/^(?!SCRIPT$|STYLE$|NOSCRIPT$|IMG$|SVG$|PATH$|RECT$|STOP$|CANVAS$|INPUT$|OPTION$|TEXTAREA$)[A-Z][A-Z0-9]*$/.test(el.tagName||''))continue;
   // Change only actual text-bearing elements, not an outer card whose inherited color would change everything.
   if(![...el.childNodes].some(node=>node.nodeType===3&&node.nodeValue?.trim()))continue;
   // Meter fill is a positioned sibling, so ancestor backgrounds alone miss it.
   if(el.matches?.('.report-meter > b')){
    const meter=el.parentElement,fill=meter.querySelector('i'),view=el.ownerDocument.defaultView;
    el.style.setProperty('background','transparent','important');
    el.style.removeProperty('transform');
    const base=bgColor(meter),f=fill&&view.getComputedStyle(fill),fr=fill?.getBoundingClientRect();
    const fillColors=f&&f.display!=='none'?bgColor(fill).map(c=>blend(c.slice(0,3).concat([parseFloat(f.opacity)||0]),base[0])):base;
    const best=colors=>Math.min(...colors.map(c=>ratio([255,255,255],c)))>Math.min(...colors.map(c=>ratio([0,0,0],c)))?'#ffffff':'#000000';
    const outside=best(base),inside=best(fillColors),mr=meter.getBoundingClientRect();
    let br=el.getBoundingClientRect();
    if(fr&&fr.width>0&&inside!==outside&&br.left<fr.left&&br.right>fr.left){
     // Keep the whole editable number over one paint region instead of a plaque,
     // stroke, duplicate text or splitting a digit at the dark/light boundary.
     const spaceLeft=fr.left-mr.left,spaceRight=mr.right-fr.left;
     let target=null;
     if(spaceRight>=br.width+2)target=Math.max(fr.left+1,Math.min(br.left,mr.right-br.width-1));
     else if(spaceLeft>=br.width+2)target=Math.min(fr.left-br.width-1,Math.max(br.left,mr.left+1));
     if(target!==null){const scale=mr.width/(meter.offsetWidth||mr.width);el.style.setProperty('transform','translateX('+((target-br.left)/scale)+'px)');br=el.getBoundingClientRect();}
    }
    const onFill=fr&&fr.width>0&&(br.left+br.right)/2>=fr.left&&(br.left+br.right)/2<=fr.right;
    const replacement=onFill?inside:outside;
    el.style.setProperty('color',replacement,'important');
    el.style.setProperty('-webkit-text-fill-color',replacement,'important');
    el.style.setProperty('text-shadow','none','important');
    changed++;continue;
   }
   const style=el.ownerDocument.defaultView.getComputedStyle(el);
   if(style.display==='none'||style.visibility==='hidden')continue;
   const fg=style.webkitTextFillColor&&style.webkitTextFillColor!=='currentcolor'?style.webkitTextFillColor:style.color;
   const backgrounds=bgColor(el),foreground=rgba(fg)||[0,0,0,1];
   const readable=backgrounds.every(background=>{const painted=blend(foreground,background);return ratio(painted,background)>=4.5;});
   if(readable){
    // Word reads color, while browser paint can use -webkit-text-fill-color.
    if(style.color!==fg)el.style.setProperty('color',fg,'important');
    continue;
   }
   const white=Math.min(...backgrounds.map(background=>ratio([255,255,255],background)));
   const black=Math.min(...backgrounds.map(background=>ratio([0,0,0],background)));
   const replacement=white>black?'#ffffff':'#000000';
   if(Math.max(white,black)<4.5){
    // A single foreground cannot cover a dark-to-light gradient safely.
    el.style.setProperty('background-color',replacement==='#ffffff'?'#000000':'#ffffff','important');
    el.style.setProperty('background-image','none','important');
   }
   el.style.setProperty('color',replacement,'important');
   el.style.setProperty('-webkit-text-fill-color',replacement,'important');
   el.style.setProperty('text-shadow','none','important');
   changed++;
  }
  return changed;
 };
})();
