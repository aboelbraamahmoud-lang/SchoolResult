'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const ui=fs.readFileSync(path.join(root,'source/src/patches/ui.js'),'utf8');
const printer=fs.readFileSync(path.join(root,'source/src/report-print-batch.js'),'utf8');
assert.match(ui,/root=\(0,y\.createRoot\)\(stage\)/);
assert.doesNotMatch(ui,/\[y,b\]=\(0,v\.useState\)\(0\)/,'numeric shadow must not mask ReactDOM');
assert.match(ui,/\[reportOverflowCount,b\]=\(0,v\.useState\)\(0\)/);
assert.match(printer,/SR63\.fitReportPagesForPrint\(win\.document,landscape\)/);
const sandbox={SR63:{},console,URL,Blob,TextEncoder,Uint8Array,Uint32Array,DataView,atob};
vm.runInNewContext(printer,sandbox);
const scaled=[],page=(width,height)=>({scrollWidth:width,scrollHeight:height,style:{setProperty:(n,v)=>scaled.push([n,String(v)])},getBoundingClientRect:()=>({width,height,left:0,right:width,top:0,bottom:height}),querySelectorAll:()=>[]});
const result=sandbox.SR63.fitReportPagesForPrint({querySelectorAll:()=>[page(1450,760),page(1020,1800)]},true);
assert.ok(result[0].zoom<1&&result[0].zoom>.6);
assert.equal(result[1].singleSheet,false);
assert.ok(scaled.some(([n])=>n==='zoom'));
(async()=>{
 const {loadApp}=require('./harness.cjs'),{ctx}=loadApp(),ws=ctx.zj(),downloads=[],rendered=[];
 ctx.v={...ctx.v,useState:v=>[typeof v==='function'?v():v,()=>{}],useMemo:fn=>fn(),useEffect:()=>{},useCallback:fn=>fn,useRef:v=>({current:v})};
 ctx.y={createRoot:()=>({render:x=>rendered.push(x),unmount:()=>{}})};
 ctx.requestAnimationFrame=cb=>setTimeout(cb,0);
 const stage={style:{cssText:''},querySelector:()=>({}),remove:()=>{}};
 ctx.document={createElement:()=>stage,body:{appendChild:()=>{}},fonts:{ready:Promise.resolve()}};
 ctx.SR63.getReportStyleText=async()=>'.school-report-page{color:#123}';
 ctx.SR63.buildReportPages=()=>[{key:'p1',totalParts:1,part:1,rows:[],className:'7/1',entity:'7/1',subject:'رياضيات'}];
 ctx.SR63.groupReportPages=pages=>[{name:'الصف 7-1',pages}];
 ctx.SR63.reportPageJPEG=async()=>({dataUrl:'data:image/jpeg;base64,YQ==',landscape:false,width:3,height:3});
 ctx.SR63.reportPdfFromJpegs=a=>new Blob(['pdf '+a.length],{type:'application/pdf'});
 ctx.SR63.reportZipFromPdfs=async a=>new Blob(['zip '+a.length],{type:'application/zip'});
 ctx.SR63.downloadReportFile=(blob,name)=>downloads.push(name);
 const el=ctx.xde({workspace:ws,onExportExcel:()=>{},readOnly:false,canPrint:true}),controls=[];
 function visit(x){if(Array.isArray(x))return x.forEach(visit);if(!x||typeof x!=='object')return;if(typeof x.props?.onClick==='function')controls.push(x);visit(x.props?.children)}visit(el);
 function visibleText(x){if(Array.isArray(x))return x.map(visibleText).join(' ');if(typeof x==='string')return x;if(x&&typeof x==='object')return visibleText(x.props?.children);return ''}
 for(const [label,ext] of [['تنزيل PDF كامل — ملف واحد','.pdf'],['تنزيل تقارير مفردة ZIP — حسب','.zip']]){
  const button=controls.find(x=>visibleText(x.props.children).includes(label));
  assert.ok(button,label);assert.equal(button.props.disabled,false);
  button.props.onClick();
  const desired=ext==='.pdf'?1:2;
  for(let n=0;n<50&&downloads.length<desired;n++)await new Promise(ok=>setTimeout(ok,12));
  assert.equal(downloads.length,desired,'download must start after clicking '+label);
  assert.ok(downloads.at(-1).endsWith(ext),downloads.at(-1));
 }
 assert.equal(rendered.length,2);
 console.log('PASS 6.10.48: real PDF and ZIP button actions; A4 automatic fitting and long-table flow');
})().catch(e=>{console.error(e);process.exitCode=1});
