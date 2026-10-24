'use strict';
// Renderer contract plus real browser visual/geometry coverage in browser-print-audit.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../src/report-download-pdf.js'),'utf8');
const calls=[],element={querySelectorAll:()=>[{decode:async()=>calls.push('image ready'),naturalWidth:100}]};
const sandbox={SR63:{planReportSheet:(el,w,h)=>{assert.equal(el,element);calls.push(['plan',w,h]);}},document:{fonts:{ready:Promise.resolve()}},SR72Canvas:{toCanvas:async(el,options)=>{assert.equal(el,element);calls.push(['canvas',options]);return {width:2480,height:3507,toDataURL:(mime,quality)=>{assert.equal(mime,'image/jpeg');assert.equal(quality,.985);return 'data:image/jpeg;base64,'+'A'.repeat(6000);}};}}};
vm.runInNewContext(src,sandbox);
(async()=>{
 for(const landscape of [false,true]){
  calls.length=0;const result=await sandbox.SR63.reportPageJPEG(element,'',landscape);
  assert.equal(calls[0],'image ready');assert.equal(calls[1][0],'plan');assert.equal(calls[2][0],'canvas');
  const opts=calls[2][1];assert.equal(opts.pixelRatio,300/96);assert.equal(opts.width,opts.canvasWidth);assert.equal(opts.height,opts.canvasHeight);
  assert.equal(opts.width>opts.height,landscape);assert.equal(opts.skipAutoScale,true);assert.equal(result.landscape,landscape);
 }
 element.querySelectorAll=()=>[{decode:async()=>{throw Error('missing logo')},naturalWidth:0}];
 await assert.rejects(()=>sandbox.SR63.reportPageJPEG(element,''),/missing logo/);
 assert.doesNotMatch(src,/fillText|measureText|createLinearGradient/,'no approximate text or palette reconstruction');
 console.log('PASS original DOM renderer, 300dpi A4, orientation, image readiness and shared PDF/ZIP contract');
})().catch(e=>{console.error(e);process.exitCode=1});
