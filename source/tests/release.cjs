const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert');
const projectRoot=path.resolve(__dirname,'../..'),webRoot=projectRoot;
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const version=JSON.parse(fs.readFileSync(path.join(webRoot,'version.json'),'utf8'));
const pkg=JSON.parse(fs.readFileSync(path.join(projectRoot,'package.json'),'utf8'));
let passed=0;
function ok(cond,msg){assert.ok(cond,msg);passed++;}
function eq(a,b,msg){assert.equal(a,b,msg);passed++;}
eq(pkg.version,version.version,'package/web version mismatch');
const app=fs.readFileSync(path.join(webRoot,'app.js'),'utf8');
ok(app.includes(`version:'${version.version}'`)||app.includes(`version:\"${version.version}\"`)||app.includes(`version:${JSON.stringify(version.version)}`),'runtime version missing from app.js');
for(const forbidden of ['طلاب فريدون','نتائج مقيمة','نتيجة مقيمة','حاضر/مقيم'])ok(!app.includes(forbidden),`forbidden legacy wording remains: ${forbidden}`);
ok(!app.includes('service_role'),'service_role must not be present in app.js');
const supabase=fs.readFileSync(path.join(webRoot,'supabase.js'),'utf8');
ok(!supabase.includes('service_role'),'service_role must not be present in supabase.js');
const manifest=JSON.parse(fs.readFileSync(path.join(webRoot,'update-manifest.json'),'utf8'));
eq(manifest.version,version.version,'manifest version mismatch');
for(const entry of manifest.files){eq(sha(path.join(webRoot,entry.name)),entry.sha256,`manifest hash mismatch: ${entry.name}`);}
const checksumPath=path.join(projectRoot,'checksums.sha256');
const rows=fs.readFileSync(checksumPath,'utf8').trim().split(/\r?\n/).filter(Boolean);
ok(rows.length>10,'checksums file unexpectedly small');
for(const row of rows){
  const m=row.match(/^([a-f0-9]{64})  (.+)$/);ok(!!m,`invalid checksum row: ${row}`);
  const file=path.join(projectRoot,...m[2].split('/'));ok(fs.existsSync(file),`checksum file missing: ${m[2]}`);eq(sha(file),m[1],`checksum mismatch: ${m[2]}`);
}
console.log(`Release tests passed: ${passed}/${passed}`);
