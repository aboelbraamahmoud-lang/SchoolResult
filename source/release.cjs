const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const version=JSON.parse(fs.readFileSync(path.join(root,'version.json'),'utf8'));
const updateFiles=['app.js','style.css','version.json','index.html','supabase.js'];
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for(const name of updateFiles)if(!fs.existsSync(path.join(root,name)))throw new Error('Missing update file: '+name);
const manifest={product:'School Results Cloud',version:version.version,files:updateFiles.map(name=>({name,sha256:sha(path.join(root,name))}))};
fs.writeFileSync(path.join(root,'update-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
function walk(dir,prefix=''){
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
    const rel=path.posix.join(prefix,entry.name),full=path.join(dir,entry.name);
    if(rel==='checksums.sha256'||rel.startsWith('source/tests/output/')||entry.name==='.DS_Store')continue;
    if(entry.isDirectory())out.push(...walk(full,rel));else if(entry.isFile())out.push(rel);
  }
  return out;
}
const lines=walk(root).map(rel=>`${sha(path.join(root,...rel.split('/')))}  ${rel}`);
fs.writeFileSync(path.join(root,'checksums.sha256'),lines.join('\n')+'\n');
console.log(`Release ${version.version}: ${manifest.files.length} update files; ${lines.length} stable checksums.`);
