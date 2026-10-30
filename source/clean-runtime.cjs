// Remove superseded local renderers only after the shared admin/leader renderer
// has been extracted. Fail the build if a supposedly dead function is still used.
function visit(node,fn){
 if(!node||typeof node!=='object')return;
 fn(node);
 for(const value of Object.values(node)){
  if(Array.isArray(value))value.forEach(child=>visit(child,fn));
  else if(value?.type)visit(value,fn);
 }
}
function context(source,acorn,shared=false){
 const declaration=acorn.parse(source,{ecmaVersion:'latest'}).body[0];
 if(declaration?.type!=='VariableDeclaration')throw Error('Analytics context changed');
 const omitted=new Set(shared?['be','Se','H']:['ye','Se']);
 return 'let '+declaration.declarations.filter(d=>!omitted.has(d.id.name)).map(d=>{
  const name=d.id.name;let expression=source.slice(d.init.start,d.init.end);
  if(!shared&&name==='Ce')expression=expression.replace('()=>e.rows.filter','()=>o===`data`?e.rows.filter').replace(',[e.rows,e.activeExam,y,x,C])',':[],[o,e.rows,e.activeExam,y,x,C])');
  if(name==='we')expression=`(0,v.useMemo)(()=>${shared?'':'o===\`data\`?'}${expression}${shared?'':':[]'},[e.rows,e.activeExam,e.settings${shared?'':',o'}])`;
  if(name==='De')expression=`(0,v.useMemo)(()=>${shared?'':'o===\`data\`?'}${expression}${shared?'':':null'},[e,y,x,C${shared?'':',o'}])`;
  return name+'='+expression;
 }).join(',')+';';
}
function clean(code,acorn){
 const admin=acorn.parse(code,{ecmaVersion:'latest'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='Nde');
 const removed=['Le','He','Ue','We','Ge','Ke','qe','Fe'],edits=[];
 for(const name of removed){
  const fn=admin.body.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);
  if(!fn)throw Error('Missing superseded renderer '+name);
  let references=0;visit(admin,n=>{if(n.type==='Identifier'&&n.name===name)references++;});
  if(references!==1)throw Error('Renderer is still referenced: '+name);
  edits.push({start:fn.start,end:fn.end,text:''});
 }
 const declaration=admin.body.body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name==='ye'));
 if(!declaration)throw Error('Admin analysis context missing');
 edits.push({start:declaration.start,end:declaration.end,text:context(code.slice(declaration.start,declaration.end),acorn)});
 for(const edit of edits.sort((a,b)=>b.start-a.start))code=code.slice(0,edit.start)+edit.text+code.slice(edit.end);
 return code;
}
module.exports={context,clean};
