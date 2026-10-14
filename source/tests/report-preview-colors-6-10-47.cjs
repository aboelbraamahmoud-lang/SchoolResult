const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const css=fs.readFileSync(path.join(root,'source/src/repair.css'),'utf8');
const behavior=fs.readFileSync(path.join(root,'source/src/behavior-reports.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'source/src/patches/ui.js'),'utf8');
// Screen and print use the same two semantic colors, not alternating arbitrary greens.
assert(css.includes('--sr-behavior-head:#2c6074'));
assert(css.includes('--sr-behavior-gold:#ae8230'));
assert.match(css,/\.sr632-preview-sheet:not\(\.sr633-preview-wrap\) thead th:nth-child\(2\)/);
assert.match(css,/\.sr633-preview-wrap \.sr633-results thead th:first-child\{background:var\(--sr-behavior-gold\)/);
assert(behavior.includes('.sr633-results thead th:first-child{background:#ae8230}'));
assert(behavior.includes('.sr633-results thead th{background:#2c6074'));
assert(ui.includes('const exportPages=prepared?D:SR63.buildReportPages'));
assert(!ui.includes('if(downloadState||!canPrint||!prepared||!D.length)return;'));
assert(ui.includes('if(split)SR63.downloadReportFile(await SR63.reportZipFromPdfs'));
console.log('PASS 6.10.47: same approved behavior header colors on screen and print, ZIP single/multiple always and automatic preview calculation');
// Inspect the same React report-center controls without a prepared preview.
// A visible ZIP button must remain enabled for authorized users, and disabled
// when export permission is absent.
const {loadApp}=require('./harness.cjs');
const {ctx}=loadApp();
const workspace=ctx.zj();
const render=canPrint=>{
 ctx.v={...ctx.v,useState:initial=>[typeof initial==='function'?initial():initial,()=>{}],useEffect:()=>{},useMemo:fn=>fn(),useCallback:fn=>fn,useRef:()=>({current:null})};
 return ctx.xde({workspace,onExportExcel:()=>{},readOnly:false,canPrint});
};
const find=(node,needle)=>{
 if(Array.isArray(node))return node.flatMap(child=>find(child,needle));
 if(!node||typeof node!=='object')return [];
 const own=String(node.props?.children||'').includes(needle)?[node]:[];
 return [...own,...find(node.props?.children,needle)];
};
const zipControls=find(render(true),'تنزيل تقارير مفردة ZIP — حسب');
assert.equal(zipControls.length,1,'exactly one download ZIP control is rendered');
assert.equal(zipControls[0].props.disabled,false,'ZIP is available before the preview is generated');
assert.equal(typeof zipControls[0].props.onClick,'function');
assert.equal(find(render(false),'تنزيل تقارير مفردة ZIP — حسب')[0].props.disabled,true,'ZIP stays forbidden without export permission');
console.log('PASS 6.10.47 UI: ZIP enabled pre-preview and gated by export permission.');
