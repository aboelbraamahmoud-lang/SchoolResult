const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const data=fs.readFileSync(path.join(root,'app.js'),'utf8');
const assets={
 reference:'teacher-reference-data.js',
 improvement:'approved-improvement-template.js',
 behavior:'behavior-template.js'
};
// Large official OOXML payloads must remain available without blocking startup.
assert.ok(Buffer.byteLength(data,'utf8')<2_600_000,'app.js contains unexpectedly large eager templates');
assert.ok(data.includes('SR63.loadWordTemplate='),'missing on-demand Word loader');
for(const [type,src] of Object.entries(assets)){
 const external=fs.readFileSync(path.join(root,'assets',`word-${type}.js`),'utf8');
 assert.equal(external,fs.readFileSync(path.join(root,'source/src',src),'utf8'),'asset out of sync: '+src);
 assert.ok(!data.includes(external.slice(0,110)),'Word template accidentally bundled: '+type);
 assert.ok(data.includes(`assets/word-${type}.js`),'missing loader route: '+type);
}
const build=fs.readFileSync(path.join(root,'source/build.cjs'),'utf8');
assert.ok(!build.includes("'teacher-reference-data.js',")&&!build.includes("'behavior-template.js',")&&!build.includes("'approved-improvement-template.js',"));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'update-manifest.json'),'utf8'));
for(const type of Object.keys(assets))assert.ok(manifest.files.some(f=>f.name===`assets/word-${type}.js`));
const source=fs.readFileSync(path.join(root,'source/src/catalog.js'),'utf8');
assert.ok(source.includes('groups.get(className)?.get(subject)'),'heat map grouping was removed');
const ui=fs.readFileSync(path.join(root,'source/src/teacher-performance-ui.js'),'utf8');
assert.ok(ui.includes('SR63.loadWordTemplate'),'teacher export must load its template first');
console.log('Lazy Word assets + efficient heat map performance invariants: PASS');
