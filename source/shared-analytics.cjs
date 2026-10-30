// Lift the original admin renderers at build time. Admin and leadership use one component.
module.exports=function(code,acorn){
 const ast=acorn.parse(code,{ecmaVersion:'latest'}),admin=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='Nde');
 if(!admin)throw Error('Admin component missing');
 const names=['He','Ue','We','Ge','Ke','qe'],functions=names.map(name=>{const n=admin.body.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);if(!n)throw Error('Missing original analysis '+name);return code.slice(n.start,n.end);}).join('\n');
 const begin=code.indexOf('let ye=(0,v.useMemo)',admin.start),end=code.indexOf('function Oe()',begin);
 if(begin<0||end<0)throw Error('Original analytics context missing');
 const context=require('./clean-runtime.cjs').context(code.slice(begin,end),acorn,true);
 const routeStart=code.indexOf('o===`classes`?He(',admin.start),routeEnd=code.indexOf('o===`reports`?',routeStart);
 if(routeStart<0||routeEnd<0)throw Error('Original analysis routes missing');
 const routes=code.slice(routeStart,routeEnd),pages=['classes','teachers','departments','school','comparison','value','levels','struggling'];
 const generated=`SR63.OriginalAnalytics=function({workspace:e,page:o,onNavigate:s}){
 const [y,b]=(0,v.useState)('الكل'),[x,S]=(0,v.useState)('الكل'),[C,w]=(0,v.useState)('الكل'),[T,E]=(0,v.useState)('الكل'),[D,O]=(0,v.useState)('exam3'),[k,A]=(0,v.useState)('exam4'),[j,M]=(0,v.useState)(0),[N,P]=(0,v.useState)(50),[L,ee]=(0,v.useState)(1),te='',R='الكل',re='الكل';
 (0,v.useEffect)(()=>E('الكل'),[o]);
 ${context}\n${functions}\nreturn ${routes}null;};\n`;
 const replacement=`${JSON.stringify(pages)}.includes(o)?(0,q.jsx)(SR63.OriginalAnalytics,{workspace:e,page:o,onNavigate:s}):`;
 return {code:code.slice(0,routeStart)+replacement+code.slice(routeEnd),generated};
};
