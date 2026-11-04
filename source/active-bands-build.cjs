/* Apply the active grade-band selection to the original admin dashboard and settings. */
module.exports=function(code){
 function patch(before,after,expected=1){
  const found=code.split(before).length-1;
  if(found!==expected)throw Error('6.10.89 grade band patch expected '+expected+' occurrences, found '+found+': '+before.slice(0,70));
  code=code.split(before).join(after);
 }
 patch('yj=(e,t)=>[...t].sort((e,t)=>t.min-e.min).find', 'yj=(e,t)=>[...SR63.activeBands(t)].sort((e,t)=>t.min-e.min).find');
 patch('Object.fromEntries(n.bands.map(e=>[e.id,0]))','Object.fromEntries(SR63.activeBands(n.bands).map(e=>[e.id,0]))');
 patch('e.settings.bands.map(e=>','SR63.activeBands(e.settings.bands).map(e=>',4);
 patch('n.settings.bands.map(e=>','SR63.activeBands(n.settings.bands).map(e=>');
 patch('desc:`ست فئات قابلة للتعديل مع منع التداخل والفجوات والخروج عن 0–100.`', 'desc:`فعّل من ثلاثة إلى ستة مستويات. تغطي المستويات المختارة جميع النسب من 0 إلى 100 دون فجوات.`');
 patch('(0,q.jsx)(_A,{children:`اللون`}),(0,q.jsx)(_A,{className:`text-right`,children:`المستوى`})','(0,q.jsx)(_A,{children:`تفعيل`}),(0,q.jsx)(_A,{children:`اللون`}),(0,q.jsx)(_A,{className:`text-right`,children:`المستوى`})');
 patch('(0,q.jsx)(hA,{children:n.bands.map(e=>(0,q.jsxs)(gA,{children:[(0,q.jsx)(vA,{children:(0,q.jsx)(`input`,{type:`color`',
       '(0,q.jsx)(hA,{children:n.bands.map(e=>(0,q.jsxs)(gA,{children:[(0,q.jsx)(vA,{children:(0,q.jsx)(`input`,{type:`checkbox`,checked:e.enabled!==false,disabled:e.enabled!==false&&n.bands.filter(b=>b.enabled!==false).length<=3,onChange:t=>o({bands:n.bands.map(b=>b.id===e.id?{...b,enabled:t.target.checked}:b)}),title:`إدراج ${e.label} في كل تقارير ومستويات التقدير`})}),(0,q.jsx)(vA,{children:(0,q.jsx)(`input`,{type:`color`');
 return code;
}
