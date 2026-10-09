const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),results=[];
function test(name,fn){try{fn();results.push({name,status:'pass'});console.log('PASS '+name);}catch(error){results.push({name,status:'fail',error:error.stack});console.error('FAIL '+name+'\n'+error.message);}}
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Vercel has strict browser security headers',()=>{const v=JSON.parse(read('vercel.json')),headers=Object.fromEntries(v.headers[0].headers.map(x=>[x.key,x.value]));assert.equal(v.framework,null);for(const key of ['Content-Security-Policy','X-Content-Type-Options','Referrer-Policy','Permissions-Policy','X-Frame-Options','Cross-Origin-Opener-Policy'])assert.ok(headers[key],key);assert.match(headers['Content-Security-Policy'],/object-src 'none'/);assert.match(headers['Permissions-Policy'],/camera=\(\)/);});

test('frontend does not expose service_role',()=>{for(const file of ['app.js','supabase.js','source/src/cloud.js','source/src/engine.js','desktop/main.cjs'])assert.ok(!read(file).toLowerCase().includes('service_role'),file);});

test('desktop isolates renderer from Node',()=>{const s=read('desktop/main.cjs');assert.match(s,/contextIsolation\s*:\s*true/);assert.match(s,/nodeIntegration\s*:\s*false/);assert.match(s,/setPermissionRequestHandler/);});

test('desktop restricts external navigation protocols',()=>{const s=read('desktop/main.cjs');assert.match(s,/https:/);assert.match(s,/mailto:/);assert.ok(!/shell\.openExternal\([^\n]*(?:file:|javascript:)/.test(s));});

test('CSP exists for both web and desktop',()=>{assert.match(read('vercel.json'),/Content-Security-Policy/);assert.match(read('desktop/server.cjs'),/Content-Security-Policy|content-security-policy/i);});

const report={passed:results.filter(x=>x.status==='pass').length,failed:results.filter(x=>x.status==='fail').length,results};console.log(JSON.stringify(report));if(report.failed)process.exitCode=1;
