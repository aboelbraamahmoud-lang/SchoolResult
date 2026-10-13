const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/cloud-ui.js'),'utf8');
const delay=ms=>new Promise(ok=>setTimeout(ok,ms));
const id='11111111-2222-4333-8444-555555555555',session={user:{id,email:'person@school.test'},access_token:'access_test',refresh_token:'refresh_test'};
function fixture(options={}){
 let hookIndex=0,hooks=[],initial=[],roleCalls=0,sessionCalls=0,signInCalls=0,listener,loggedIn=false;
 const storage=new Map(),memory={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 const sdk={auth:{onAuthStateChange(fn){listener=fn;return{data:{subscription:{unsubscribe(){}}}}},async getSession(){sessionCalls++;return {data:{session:loggedIn?session:null},error:null}},async signInWithPassword(){signInCalls++;loggedIn=true;listener('SIGNED_IN',session);return {data:{session},error:null}}}};
 const useState=init=>{const slot=hookIndex++;if(!(slot in hooks))hooks[slot]={state:typeof init==='function'?init():init};return [hooks[slot].state,v=>{hooks[slot].state=typeof v==='function'?v(hooks[slot].state):v}];};
 const useRef=init=>{const slot=hookIndex++;if(!(slot in hooks))hooks[slot]={current:init};return hooks[slot];};
 const useEffect=(fn,deps)=>{const slot=hookIndex++;if(!(slot in hooks)){hooks[slot]=true;initial.push(fn);}};
 const jsx=(type,props)=>({tag:type,...props});
 const SR63={version:'6.10.39',formDirty:false,settingsDirty:false,storage:{pending:false,busy:0,reset(){}},currentWorkspace:null,cloud:{client:()=>sdk,bind(){},setAccess(){},message:e=>e},staff:{emailForUsername:async username=>username+'@staff.invalid',async profile(){roleCalls++;if(options.failFirst&&roleCalls===1)throw Object.assign(new Error('temporary'),{transient:true});if(options.forbidden)throw Object.assign(new Error('forbidden'),{code:'ACCOUNT_DISABLED_OR_UNAUTHORIZED'});await delay(12);return {role:'coordinator',departments:['الرياضيات'],displayName:'المنسق'};}},CoordinatorPortal(){}};
 const sandbox={SR63,v:{useState,useRef,useEffect,Fragment:'FRAGMENT'},q:{jsx,jsxs:jsx},window:{location:{href:'https://example.test/',protocol:'https:'},addEventListener(){},removeEventListener(){}},localStorage:memory,setTimeout,clearTimeout,URL,console};
 vm.runInNewContext(source,sandbox,{timeout:10000});
 const render=()=>{hookIndex=0;return sandbox.SR63.CloudApp();};
 const mount=()=>{const node=render();for(const fn of initial.splice(0))fn();return node;};
 const fire=(event,s)=>listener(event,s);
 const nodes=(root)=>{const result=[];function walk(n){if(!n)return;if(Array.isArray(n)){n.forEach(walk);return;}if(typeof n==='object'){result.push(n);walk(n.children);}}walk(root);return result;};
 return {mount,fire,render,nodes,get roleCalls(){return roleCalls},get sessionCalls(){return sessionCalls},get signInCalls(){return signInCalls},storage};
}
async function run(){
 const a=fixture();a.mount();a.fire('INITIAL_SESSION',session);a.fire('SIGNED_IN',session);await delay(85);
 assert.equal(a.roleCalls,1,'concurrent events must share one role request');assert.equal(a.sessionCalls,0,'no duplicate getSession on normal initial load');
 a.fire('TOKEN_REFRESHED',session);await delay(20);assert.equal(a.roleCalls,1,'routine token refresh should not trigger another role fetch');
 assert.ok(a.nodes(a.render()).some(x=>x.tag==='aside'&&x.className==='sr-cloud-account'),'valid session mounts the user portal');
 const b=fixture({failFirst:true});b.mount();b.fire('INITIAL_SESSION',session);await delay(780);assert.equal(b.roleCalls,2,'transient profile error retried once');assert.ok(b.nodes(b.render()).some(x=>x.tag==='aside'&&x.className==='sr-cloud-account'));
 const c=fixture({forbidden:true});c.mount();c.fire('INITIAL_SESSION',session);await delay(45);assert.equal(c.roleCalls,1,'403 must not be retried');assert.ok(!c.nodes(c.render()).some(x=>x.tag==='aside'&&x.className==='sr-cloud-account'));
 const d=fixture();d.mount();d.fire('INITIAL_SESSION',null);await delay(20);let tree=d.render();let n=d.nodes(tree),inputs=n.filter(x=>x.tag==='input');assert.equal(inputs.length,2,'login offers identifier and password without mode toggle');inputs[0].onChange({target:{value:'fahd'}});inputs[1].onChange({target:{value:'secure_password_123'}});tree=d.render();n=d.nodes(tree);const form=n.find(x=>x.tag==='form');assert.ok(form);await form.onSubmit({preventDefault(){}});await delay(40);assert.equal(d.signInCalls,1);assert.equal(d.roleCalls,1);assert.ok(d.nodes(d.render()).some(x=>x.tag==='aside'&&x.className==='sr-cloud-account'));assert.equal(d.storage.get('schoolresult-last-identifier'),'fahd');
 console.log('Auth single-flight events, transient retry, no retry on 403, one-field login, remembered identifier: PASS');
}
run().catch(err=>{console.error(err);process.exitCode=1;});
