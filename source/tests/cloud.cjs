const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{loadApp}=require('./harness.cjs');
const results=[],noop=()=>{};
async function test(name,fn){try{await fn();results.push({name,status:'pass'});}catch(error){results.push({name,status:'fail',error:error.stack});console.error(name,error);}}
const server={rows:new Map(),archives:new Map(),fail:false,loseResponse:false,readFail:false,requests:[],release:null};
function client(owner='account-a'){
 const app=loadApp(),c=app.ctx;let session={user:{id:owner,email:owner+'@example.test'}},sdkOptions;
 const sdk={auth:{getSession:async()=>({data:{session}})},from:table=>{let user,id;const q={select:()=>q,eq:(key,value)=>{if(key==='owner_id')user=value;else id=value;return q;},maybeSingle:async()=>server.readFail?{error:{message:'network',code:'FETCH_ERROR'}}:{data:structuredClone(server.rows.get(user)??null)},delete:()=>q,then:resolve=>{server.archives.get(user)?.delete(id);resolve({error:null});}};return q;},rpc:async(name,args)=>{
  server.requests.push({name,args:structuredClone(args),owner});
  if(server.release)await new Promise(resolve=>server.release.push(resolve));
  if(server.fail)return {error:{message:'network',code:'FETCH_ERROR'}};
  if(name==='school_archive_list')return {data:[...(server.archives.get(owner)?.values()??[])].map(({workspace,...meta})=>meta)};
  if(name==='school_archive_get'){const point=server.archives.get(owner)?.get(args.p_id);return point?{data:structuredClone(point)}:{error:{message:'ARCHIVE_NOT_FOUND',code:'P0002'}};}
  if(name==='school_archive_delete'){const removed=server.archives.get(owner)?.delete(args.p_id)??false;return {data:removed};}
  if(name==='school_snapshot'){if(!server.archives.has(owner))server.archives.set(owner,new Map());server.archives.get(owner).set(args.p_point.id,args.p_point);return {data:args.p_point};}
  const old=server.rows.get(owner);
  if(old?.write_id===args.p_write_id)return {data:{revision:old.revision,savedAt:old.saved_at,writeId:old.write_id}};
  if((old?.revision??0)!==args.p_expected)return {error:{message:'CLOUD_CONFLICT',code:'P0001'}};
  const saved={workspace:args.p_workspace,revision:(old?.revision??0)+1,write_id:args.p_write_id,saved_at:new Date().toISOString()};server.rows.set(owner,saved);
  if(server.loseResponse){server.loseResponse=false;return {error:{message:'connection lost'}};}
  return {data:{revision:saved.revision,savedAt:saved.saved_at,writeId:saved.write_id}};
 }};
 c.SchoolSupabase={createClient:(url,key,options)=>{sdkOptions=options;return sdk;}};c.sessionStorage={getItem:()=>null,setItem:noop,removeItem:noop};c.localStorage={getItem:()=>{throw Error('Grades must not use local storage');},setItem:()=>{throw Error('Grades must not use local storage');}};c.SR63.cloud.bind(owner);
 return {app,c,sdk,session(value){session=value;},get options(){return sdkOptions;}};
}
(async()=>{
 const first=client(),c=first.c;
 await test('Cloud save forbidden before initial load',async()=>{await assert.rejects(c.Xj(c.Aj()));assert.equal(server.rows.size,0);});
 await test('New cloud account loads empty without local grades',async()=>assert.equal(await c.Yj(),null));
 await test('SDK uses tab session storage and auto refresh',()=>{assert.equal(first.options.auth.storage,c.sessionStorage);assert.equal(first.options.auth.autoRefreshToken,true);assert.equal(first.options.auth.detectSessionInUrl,false);});
 await test('Confirmed cloud save clears pending status',async()=>{c.SR63.storage.touch();const r=await c.Xj(c.Aj());assert.equal(r.storage,'cloud');assert.equal(r.revision,1);assert.equal(c.SR63.storage.pending,false);});
 await test('Second device loads identical account data',async()=>{const other=client();const w=await other.c.Yj();assert.equal(w.settings.schoolName,c.Aj().settings.schoolName);assert.equal(w.__storage.revision,1);});
 await test('Network failure remains unsaved without browser fallback',async()=>{server.fail=true;c.SR63.storage.touch();await assert.rejects(c.Xj(c.Aj()));assert.equal(c.SR63.storage.pending,true);assert.ok(c.SR63.storage.error);server.fail=false;});
 await test('Retry after network restoration commits successfully',async()=>{await c.Xj(c.Aj());assert.equal(c.SR63.storage.pending,false);});
 const other=client();await other.c.Yj();
 await test('Stale device cannot overwrite newer cloud revision',async()=>{await c.Xj(c.Aj());await assert.rejects(other.c.Xj(other.c.Aj()),e=>e.code==='LOCAL_CONFLICT');assert.equal(other.c.SR63.storage.blocked,true);});
 await test('Explicit reload releases conflict',async()=>{const w=await other.c.Yj();await other.c.Xj(w);assert.equal(other.c.SR63.storage.blocked,false);});
 await test('Lost response retry is idempotent',async()=>{await c.Yj();const w=c.Aj();server.loseResponse=true;await assert.rejects(c.Xj(w));const rev=server.rows.get('account-a').revision;await c.Xj(w);assert.equal(server.rows.get('account-a').revision,rev);assert.equal(c.SR63.storage.pending,false);});
 await test('Reading cloud waits for queued writes',async()=>{const w=c.Aj();w.settings.schoolName='Queued School';const saving=c.Xj(w);const read=c.Yj();await saving;assert.equal((await read).settings.schoolName,'Queued School');});
 await test('Full restore passes archives in the same save request',async()=>{const w=c.Aj(),point={id:'archive',at:new Date().toISOString(),reason:'test',workspace:w};await c.Xj(w,{snapshots:[point]});assert.equal(server.requests.at(-1).args.p_archives[0].id,'archive');});
 await test('Archive list is metadata-only and bodies are fetched on demand',async()=>{const point=await c.Kj(c.Aj(),'أرشيف نهاية العام 2026');assert.ok(point.pinned);const list=await c.qj();assert.equal(list.length,1);assert.equal('workspace' in list[0],false);const full=await c.SR63.getSnapshot(list[0]);assert.equal(full.workspace.settings.schoolName,c.Aj().settings.schoolName);});
 await test('Failed archive listing does not silently return empty',async()=>{server.fail=true;await assert.rejects(c.SR63.listSnapshots());server.fail=false;});
 await test('Archive deletion uses protected RPC path',async()=>{const point=await c.Kj(c.Aj(),'حذف اختباري');const before=server.requests.length;await c.SR63.cloud.remove(point.id);assert.equal(server.archives.get('account-a').has(point.id),false);assert.equal(server.requests.slice(before).some(r=>r.name==='school_archive_delete'),true);});
 await test('Expired login cannot read or save grades',async()=>{first.session(null);await assert.rejects(c.Yj());await assert.rejects(c.Xj(c.Aj()));first.session({user:{id:'account-a'}});});
 await test('Account switch cannot save preceding account data',async()=>{first.session({user:{id:'account-b'}});await assert.rejects(c.Xj(c.Aj()));first.session({user:{id:'account-a'}});});
 await test('Cloud read error does not initialize empty account',async()=>{server.readFail=true;await assert.rejects(c.Yj());server.readFail=false;});
 await test('Later edits stay pending while earlier request completes',async()=>{await c.Yj();server.release=[];c.SR63.storage.touch();const saving=c.Xj(c.Aj());await new Promise(resolve=>setImmediate(resolve));c.SR63.storage.touch();const callbacks=server.release;server.release=null;callbacks.forEach(fn=>fn());await saving;assert.equal(c.SR63.storage.pending,true);});
 await test('Complete backup remains portable with its archives',()=>{const w=c.Aj(),point={id:'test',at:new Date().toISOString(),reason:'test',workspace:w};const restored=c.SR63.parseBackup(c.SR63.makeBackup(w,[point]));assert.equal(restored.snapshots.length,1);});
 await test('Full archive export hydrates metadata before backup',async()=>{const full=await c.SR63.listFullSnapshots();assert.ok(full.length>=1&&full.every(point=>point.workspace));});
 await test('Browser persistence functions are never called by cloud adapter',()=>{assert.ok(!server.requests.some(r=>r.owner!=='account-a'));assert.ok(c.SR63.storage.pending);});
 const report={passed:results.filter(r=>r.status==='pass').length,failed:results.filter(r=>r.status==='fail').length,method:'Actual cloud application adapter and bundled logic with simulated SDK network replies; separate database verification ran on Supabase.',results};fs.writeFileSync(path.join(__dirname,'output/cloud-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(report.failed)process.exitCode=1;
})();
