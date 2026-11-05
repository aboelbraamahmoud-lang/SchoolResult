/* 6.10.95 — readability safeguard for ALL school report surfaces.
   Preserve grade-band background colors and change only unreadable foreground text. */
(function(){
 const rgba=function(value){
  const s=String(value||'').trim();
  const rgb=s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i);
  if(rgb)return [+rgb[1],+rgb[2],+rgb[3],rgb[4]===undefined?1:+rgb[4]];
  const h=s.match(/^#([a-f\d]{3,8})$/i);
  if(h){let v=h[1];if(v.length===3||v.length===4)v=v.split('').map(c=>c+c).join('');if(v.length===6||v.length===8)return [parseInt(v.slice(0,2),16),parseInt(v.slice(2,4),16),parseInt(v.slice(4,6),16),v.length===8?parseInt(v.slice(6,8),16)/255:1];}
  return null;
 };
 const blend=(front,back)=>{const alpha=front?.[3]??1;return [0,1,2].map(i=>(front?.[i]??back[i])*alpha+back[i]*(1-alpha)).concat([1]);};
 const lum=color=>[.2126,.7152,.0722].reduce((n,weight,i)=>{let v=color[i]/255;return n+weight*(v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));},0);
 const ratio=(a,b)=>{const la=lum(a),lb=lum(b);return (Math.max(la,lb)+.05)/(Math.min(la,lb)+.05)};
 const rgbString=a=>'rgb('+a.slice(0,3).map(v=>Math.max(0,Math.min(255,Math.round(v)))).join(',')+')';
 const bgColor=(el)=>{
  let color=[255,255,255,1],stack=[];
  for(let node=el;node?.nodeType===1;node=node.parentElement)stack.push(node);
  for(let i=stack.length-1;i>=0;i--){
   const style=stack[i].ownerDocument.defaultView.getComputedStyle(stack[i]),bg=rgba(style.backgroundColor);
   if(bg&&bg[3]>0)color=blend(bg,color);
   const gradients=String(style.backgroundImage||'').match(/(?:rgba?\([^)]+\)|#[0-9a-f]{3,8})/gi);
   if(gradients&&/gradient/i.test(style.backgroundImage)){
    const samples=gradients.map(rgba).filter(Boolean);
    if(samples.length){
     // If every gradient stop is dark, white text is correct; otherwise use average surface.
     const avg=[0,1,2].map(c=>samples.reduce((sum,item)=>sum+item[c],0)/samples.length).concat([1]);
     color=blend(avg,color);
    }
   }
  }
  return color;
 };
 SR63.readableReportColor=function(foreground,background){
  const fg=rgba(foreground),bg=rgba(background);
  if(!fg||!bg)return foreground;
  const painted=blend(fg,bg);
  if(ratio(painted,bg)>=4.5)return foreground;
  const light=[255,255,255,1],dark=[22,49,65,1];
  return ratio(light,bg)>ratio(dark,bg)?'#ffffff':'#163141';
 };
 SR63.ensureReportContrast=function(root){
  if(!root||typeof getComputedStyle!=='function')return 0;
  const candidates=[...(root.nodeType===1?[root]:[]),...(root.querySelectorAll?.('*')||[])];
  let changed=0;
  for(const el of candidates){
   if(!el||!/^(?!SCRIPT$|STYLE$|NOSCRIPT$|IMG$|SVG$|PATH$|RECT$|STOP$|CANVAS$|INPUT$|OPTION$|TEXTAREA$)[A-Z][A-Z0-9]*$/.test(el.tagName||''))continue;
   // Change only actual text-bearing elements, not an outer card whose inherited color would change everything.
   if(![...el.childNodes].some(node=>node.nodeType===3&&node.nodeValue?.trim()))continue;
   const style=el.ownerDocument.defaultView.getComputedStyle(el);
   if(style.display==='none'||style.visibility==='hidden')continue;
   const fg=style.color,background=bgColor(el),painted=blend(rgba(fg)||[0,0,0,1],background);
   if(ratio(painted,background)>=4.5)continue;
   const replacement=ratio([255,255,255],background)>ratio([22,49,65],background)?'#ffffff':'#163141';
   el.style.setProperty('color',replacement,'important');
   if(el.tagName==='TH'||el.tagName==='TD')el.style.setProperty('text-shadow','none','important');
   changed++;
  }
  return changed;
 };
})();
