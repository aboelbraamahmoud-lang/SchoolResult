'use strict';
// SchoolResult 6.10.52: exported PDF/ZIP must retain the exact CSS report
// gradients and distinct per-side borders, not guessed flat substitutes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../src/report-download-pdf.js'),'utf8');
const print=fs.readFileSync(path.join(__dirname,'../src/report-print-batch.js'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'../src/patches/ui.js'),'utf8');
assert.match(src,/extractGradient\(style\.backgroundImage\)/,'paint real computed CSS gradient');
assert.match(src,/createLinearGradient\(/,'gradient paint must use browser geometry');
assert.match(src,/createRadialGradient\(/,'radial gradients must not become gray');
assert.match(src,/gradientPaint\.addColorStop\(s\.offset,s\.color\)/,'retain exact authored color stops');
assert.match(src,/canvasBackground\(node,css,r\)/,'use gradient paint for every report element');
assert.match(src,/canvasBackground\(node,before/,'render decorative report-header stripe');
assert.match(src,/paintBorders\(css,r\)/,'preserve colored side borders');
for(const edge of ['Top','Right','Bottom','Left'])assert.match(src,new RegExp("'"+edge+"'"),'border '+edge);
assert.doesNotMatch(src,/if\(node\.classList\.contains\('report-title'\)\|\|node\.classList\.contains\('grade-matrix-caption'\)\)return '#125266'/,'remove guessed title fill');
assert.match(src,/ctx\.direction=css\.direction\|\|'rtl'/,'retain native RTL text');
assert.match(src,/SR63\.planReportSheet\(element,w-2\*margin,h-2\*margin\)/,'keep original physical A4 fitting');
assert.match(ui,/images\.push\(await SR63\.reportPageJPEG\(node,css,renderedLandscape\)\)/,'single PDF and ZIP share corrected renderer');
assert.match(print,/-webkit-print-color-adjust:exact/);
// Execute the exact helper code from the real PDF renderer, with a Canvas2D
// spy. These tests catch direction/color confusion that regex-only CI misses.
const begin=src.indexOf(' const transparent=c=>'),end=src.indexOf(' const paintText=(node)=>{',begin);
assert.ok(begin>=0&&end>begin,'gradient helper must remain available');
const op=[],fill=[];
const canvas={
 fillStyle:null,strokeStyle:null,lineWidth:0,
 createLinearGradient(...coords){const g={kind:'linear',coords,stops:[],addColorStop(pos,color){assert.match(color,/^(?:#[\da-f]{3,8}|rgba?\(|hsla?\(|transparent|white|black|red|blue|green)/i,'valid CSS stop');this.stops.push([pos,color]);}};op.push(g);return g;},
 createRadialGradient(...coords){const g={kind:'radial',coords,stops:[],addColorStop(pos,color){assert.match(color,/^(?:#[\da-f]{3,8}|rgba?\(|hsla?\(|transparent|white|black|red|blue|green)/i,'valid radial color');this.stops.push([pos,color]);}};op.push(g);return g;},
 fillRect(...coords){fill.push({coords,style:this.fillStyle});},
 beginPath(){},moveTo(){},lineTo(){},stroke(){op.push({kind:'border',color:this.strokeStyle,width:this.lineWidth})}
};
const painter=new Function('ctx',src.slice(begin,end)+';return {canvasBackground,paintBorders};')(canvas);
const r={left:4,top:8,width:500,height:320,right:504,bottom:328};
const node={};
painter.canvasBackground(node,{backgroundColor:'rgba(0, 0, 0, 0)',backgroundImage:'linear-gradient(100deg, #123f50, #0c7173 58%, #168f86)'},r);
assert.equal(op.at(-1).kind,'linear');assert.equal(op.at(-1).stops.length,3);
assert.equal(op.at(-1).stops[0][1],'#123f50');assert.equal(op.at(-1).stops[1][1],'#0c7173');assert.equal(op.at(-1).stops[2][1],'#168f86');
assert.ok(fill.at(-1).style===op.at(-1),'gradient must actually paint onto page');
painter.canvasBackground(node,{backgroundColor:'transparent',backgroundImage:'linear-gradient(to right, #abcdef 0%, #fedcba 100%)'},r);
assert.equal(op.at(-1).kind,'linear');assert.equal(op.at(-1).stops.length,2,'direction must never become a color stop');
painter.canvasBackground(node,{backgroundColor:'transparent',backgroundImage:'radial-gradient(ellipse at top right, #dcefed, #f5f7fa 65%)'},r);
assert.equal(op.at(-1).kind,'radial');assert.equal(op.at(-1).stops.length,2,'radial descriptor must not become a color');
const sideStyles=Object.fromEntries(['Top','Right','Bottom','Left'].flatMap((edge,i)=>[['border'+edge+'Width','1px'],['border'+edge+'Color',['#112233','#334455','#556677','#778899'][i]]]));
painter.paintBorders(sideStyles,r);
assert.deepEqual(op.filter(x=>x.kind==='border').map(x=>x.color),['#112233','#334455','#556677','#778899'],'all four report border colors survive rasterization');
console.log('PASS 6.10.52: actual gradient stop execution, directions, radial fills, colored borders, PDF/ZIP and RTL contracts');
