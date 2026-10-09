const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'public');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
const required=['index.html','app.js','style.css','supabase.js','moehe.png','version.json','update-manifest.json'];
const optional=['نموذج-استيراد-نتائج-المدرسة.xlsx','نموذج-قاعدة-بيانات-المعلمين.xlsx','نموذج-نتيجة-مادة.xlsx'];
for(const name of required){const src=path.join(root,name);if(!fs.existsSync(src))throw new Error('Missing Vercel static file: '+name);fs.copyFileSync(src,path.join(out,name));}
for(const name of optional){const src=path.join(root,name);if(fs.existsSync(src))fs.copyFileSync(src,path.join(out,name));}
console.log(`Prepared ${fs.readdirSync(out).length} static files in public/`);
