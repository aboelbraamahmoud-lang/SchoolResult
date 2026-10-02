const fs=require('fs'),vm=require('vm'),crypto=require('crypto').webcrypto;
const acorn=require('internal/deps/acorn/acorn/dist/acorn');
function loadApp(){
 const source=fs.readFileSync('../app.js','utf8');
 const ast=acorn.parse(source,{ecmaVersion:'latest'}),bootstrapStart=source.lastIndexOf('var $9=document.getElementById');
 const skipped=[];
 const statements=ast.body.filter(node=>{const code=source.slice(node.start,node.end);if(node.start>=bootstrapStart||code.startsWith('(function(){let e=document.createElement')){skipped.push(code.slice(0,85));return false;}return true;});
 const ctx=vm.createContext({console,crypto,structuredClone,Blob,URL,TextEncoder,TextDecoder,queueMicrotask,setTimeout,clearTimeout,setInterval,clearInterval,performance});
 vm.runInContext(statements.map(n=>source.slice(n.start,n.end)).join('\n'),ctx,{timeout:20000,filename:'app-without-dom-bootstrap.js'});
 const nodes=new Map();function index(body,prefix=''){for(const n of body){if(n.type==='FunctionDeclaration'){const key=prefix+n.id.name;nodes.set(key,n);index(n.body.body,key+'.');}if(n.type==='VariableDeclaration')for(const d of n.declarations)if(d.id.type==='Identifier')nodes.set(prefix+d.id.name,d);}}index(ast.body);
 return {ctx,source,skipped,run(name,env,args=[]){const node=nodes.get(name);if(!node)throw Error('Unknown symbol '+name);let code=source.slice(node.start,node.end);if(node.type==='VariableDeclarator')code=source.slice(node.init.start,node.init.end);return new Function(...Object.keys(ctx),...Object.keys(env),'__args',`return (${code})(...__args)`)(...Object.values(ctx),...Object.values(env),args);}};
}
module.exports={loadApp};
if(require.main===module){const {ctx,skipped}=loadApp();console.log('Loaded application logic; UI DOM bootstrap excluded:',skipped.length);console.log('Demo records',ctx.zj().rows.length,'SheetJS',typeof ctx.hv,typeof ctx.Cv);console.log('Validation',ctx.LN(ctx.zj()).workspace.rows.length);}
