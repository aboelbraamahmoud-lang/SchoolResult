'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),zlib=require('node:zlib');
async function check(compression){
 const c={SR63:{safeReportFilename:v=>v},TextEncoder,Uint8Array,Uint32Array,DataView,Blob,Response,...(compression?{CompressionStream}:{})};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/report-download-pdf.js'),'utf8'),c);
 const xml='<document>'+('<p>نص قابل للتحرير 123.45</p>'.repeat(2000))+'</document>',blob=new Blob([xml]);
 const zip=Buffer.from(await (await c.SR63.reportZipFromPdfs([{name:'word/document.xml',blob}],true)).arrayBuffer());
 const method=zip.readUInt16LE(8),size=zip.readUInt32LE(18),start=30+zip.readUInt16LE(26),payload=zip.subarray(start,start+size);
 assert.equal(method,compression?8:0);assert.equal((method?zlib.inflateRawSync(payload):payload).toString(),xml);
 assert.equal(zip.readUInt32LE(22),Buffer.byteLength(xml));
 if(compression)assert.ok(zip.length<blob.size*.1,'compress repetitive native XML without losing editability');
 const pdfZip=Buffer.from(await(await c.SR63.reportZipFromPdfs([{name:'report.pdf',blob}])).arrayBuffer());assert.equal(pdfZip.readUInt16LE(8),0,'PDF ZIP behavior unchanged');
 return zip.length;
}
(async()=>console.log('PASS Word ZIP compressed/fallback sizes:',await check(true),await check(false)))().catch(e=>{console.error(e);process.exitCode=1});
