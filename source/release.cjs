const fs=require('fs'),path=require('path'),crypto=require('crypto');
const sourceRoot=__dirname,projectRoot=path.resolve(sourceRoot,'..'),webRoot=projectRoot;
const version=JSON.parse(fs.readFileSync(path.join(webRoot,'version.json'),'utf8'));
const projectPackage=JSON.parse(fs.readFileSync(path.join(projectRoot,'package.json'),'utf8'));
if(projectPackage.version!==version.version)throw new Error(`Version mismatch: package ${projectPackage.version} / web ${version.version}`);
const updateFiles=['app.js','style.css','version.json','index.html','supabase.js','moehe.png'];
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for(const name of updateFiles)if(!fs.existsSync(path.join(webRoot,name)))throw new Error('Missing update file: '+name);
const manifest={product:'School Results Cloud',version:version.version,files:updateFiles.map(name=>({name,sha256:sha(path.join(webRoot,name))}))};
fs.writeFileSync(path.join(webRoot,'update-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
function walk(dir,prefix='',exclude=()=>false){
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
    const rel=path.posix.join(prefix,entry.name),full=path.join(dir,entry.name);
    if(exclude(rel,entry))continue;
    if(entry.isDirectory())out.push(...walk(full,rel,exclude));else if(entry.isFile())out.push(rel);
  }
  return out;
}
const repoFiles=walk(projectRoot,'',(rel,entry)=>
  rel==='checksums.sha256'||
  rel.startsWith('source/node_modules/')||
  rel.startsWith('source/tests/output/')||
  rel.startsWith('.git/')||
  entry.name==='.DS_Store'
).map(rel=>`${sha(path.join(projectRoot,...rel.split('/')))}  ${rel}`);
fs.writeFileSync(path.join(projectRoot,'checksums.sha256'),repoFiles.join('\n')+'\n');
console.log(`Web release ${version.version}: ${manifest.files.length} update files; ${repoFiles.length} repository checksums.`);
