'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const changes={};
function fixture(background,color,fill=color,image='none'){
 const styles={backgroundColor:background,backgroundImage:image,color,webkitTextFillColor:fill,display:'block',visibility:'visible'};
 const el={nodeType:1,tagName:'B',childNodes:[{nodeType:3,nodeValue:'95%'}],parentElement:null,querySelectorAll:()=>[],style:{setProperty:(k,v)=>changes[k]=v}};
 el.ownerDocument={defaultView:{getComputedStyle:()=>styles}};
 return el;
}
const ctx={SR63:{},getComputedStyle:()=>{}};vm.runInNewContext(fs.readFileSync(__dirname+'/../src/report-contrast.js','utf8'),ctx);
const S=ctx.SR63;
const luminance=hex=>[.2126,.7152,.0722].reduce((s,w,i)=>{let n=parseInt(hex.slice(1+i*2,3+i*2),16)/255;return s+w*(n<=.04045?n/12.92:((n+.055)/1.055)**2.4)},0);
for(let i=0;i<256;i++){
 const bg='#'+i.toString(16).padStart(2,'0').repeat(3),fg=S.readableReportColor(bg,bg),a=luminance(bg),b=luminance(fg);
 assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,`readable gray ${bg}`);
}
S.ensureReportContrast(fixture('rgb(17,40,61)','rgb(255,255,255)','rgb(20,38,56)'));
assert.equal(changes.color,'#ffffff');assert.equal(changes['-webkit-text-fill-color'],'#ffffff');
for(const key of Object.keys(changes))delete changes[key];
S.ensureReportContrast(fixture('rgb(119,119,119)','rgb(136,136,136)'));
assert.equal(changes.color,'#000000','black meets AA on mid-gray where navy does not');
for(const key of Object.keys(changes))delete changes[key];
S.ensureReportContrast(fixture('rgb(255,255,255)','rgb(50,50,50)',undefined,'linear-gradient(rgb(0,0,0),rgb(255,255,255))'));
assert.ok(changes['background-color']);assert.equal(changes['background-image'],'none','mixed gradient receives a safe text surface');
const css=fs.readFileSync(__dirname+'/../src/repair.css','utf8');
assert.match(css,/\.report-meter > b \{[\s\S]*?background:transparent!important;[\s\S]*?font-weight:900!important;/);
assert.match(css,/\.school-report-page \.level-analysis-table \.report-meter > b \{[\s\S]*?font-size:10pt!important/);
assert.equal(S.readableReportColor('color(srgb 0.1 0.1 0.1)','color(srgb 0 0 0)'),'#ffffff');
console.log('PASS report readability: 256 gray levels meet AA, text-fill synchronization, gradient extrema, numeric surface and bold grades');

assert.match(css,/line-height:10\.8pt!important/,'retain the previous numeric line-box height');
