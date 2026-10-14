'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const drawn=[];
const ctx={
  direction:'rtl',fillStyle:'#fff',lineWidth:1,
  scale(){},fillRect(){},strokeRect(){},
  save(){},restore(){},drawImage(){},
  fillText(text,x,y,maxWidth){drawn.push({text,x,y,maxWidth});}
};
class FakeImage{
 constructor(){this.width=200;this.height=90;}
 set src(value){if(!value)throw Error('missing source');if(this.onload)this.onload();}
}
const jpeg=Buffer.from('/9j/2Q==','base64');
const SR63={};
const scope={SR63,Image:FakeImage,atob:s=>Buffer.from(s,'base64').toString('binary'),
 document:{createElement(type){assert.equal(type,'canvas');return {width:0,height:0,getContext:()=>ctx,toDataURL:()=>`data:image/jpeg;base64,${jpeg.toString('base64')}`};}},
 TextEncoder,Uint8Array,DataView,Set,Map,Date,Number,Array,Promise,Object,Buffer,Gv:{sheet_to_json:s=>s}};
vm.createContext(scope);
for(const name of ['behavior-template.js','behavior-reports.js','behavior-pdf.js'])
 vm.runInContext(fs.readFileSync(path.join(root,'src',name),'utf8'),scope,{filename:name});
async function test(){
 const subjects=Object.fromEntries(SR63.behaviorReportSubjects.map(item=>[item.id,['ممتاز','فعال','دائمًا','مكتمل','ممتاز']]));
 const student={name:'اسم طالب تجريبي',className:'07/1',id:'sample',subjects};
 const pdf=await SR63.behaviorPdfForStudent(student,{schoolName:'مدرسة تجريبية للبنين',academicYear:'2026/2027',month:'أكتوبر 2026',principalName:'مدير تجريبي'});
 assert.equal(Buffer.from(pdf).subarray(0,8).toString('ascii'),'%PDF-1.4');
 assert.ok(Buffer.from(pdf).toString('ascii').includes('/MediaBox [0 0 842 595]'),'PDF is landscape A4');
 const find=(label,y)=>drawn.find(x=>x.text===label&&(y==null||x.y===y));
 assert.ok(find('المادة / المستوى',301)?.x>find('السلوك',301)?.x,'subject column at right; behavior at left');
 assert.ok(drawn.find(x=>x.text.startsWith('اسم الطالب:'))?.x>drawn.find(x=>x.text.startsWith('الشهر:'))?.x,'student name at right, month at left');
 assert.ok(find('مدير المدرسة')?.x>find('ختم المدرسة / الاعتماد')?.x,'principal right, seal left');
 assert.equal(drawn.filter(x=>x.text==='التربية الإسلامية').length,1,'a subject label appears once');
 assert.equal(drawn.filter(x=>x.text==='ممتاز').length,18,'student ratings preserved by subject and field');
 const doc=SR63.behaviorBuildWord([student],{schoolName:'مدرسة تجريبية للبنين',month:'أكتوبر 2026',academicYear:'2026/2027',principalName:'مدير تجريبي'});
 const xml=SR63.behaviorOfficialTemplate['word/document.xml'];
 assert.ok(xml.includes('<w:bidiVisual/>'),'Word table is explicitly RTL');
 assert.ok(xml.includes('<w:bidi/>'),'Word Arabic paragraphs are explicitly RTL');
 const batch=SR63.behaviorBuildWord([student,{...student,name:'طالب آخر',id:'other'}],{schoolName:'مدرسة تجريبية للبنين',month:'أكتوبر 2026',academicYear:'2026/2027'});
 const output=path.join(__dirname,'output');fs.mkdirSync(output,{recursive:true});
 const zip=path.join(output,'behavior-rtl-pdfs.zip');
 const packed=Buffer.from(SR63.behaviorZipPdfBytes({'certificate-1.pdf':pdf,'certificate-2.pdf':pdf}));
 fs.writeFileSync(zip,packed);
 let cursor=0,count=0;
 while(packed.readUInt32LE(cursor)===0x04034b50){
  const size=packed.readUInt32LE(cursor+18),nameLen=packed.readUInt16LE(cursor+26),extraLen=packed.readUInt16LE(cursor+28);
  const name=packed.subarray(cursor+30,cursor+30+nameLen).toString('utf8');
  const offset=cursor+30+nameLen+extraLen;
  assert.ok(/^certificate-[12]\.pdf$/.test(name));
  assert.equal(Buffer.compare(packed.subarray(offset,offset+size),Buffer.from(pdf)),0,'ZIP entry preserves corrected PDF');
  cursor=offset+size;count++;
 }
 assert.equal(count,2,'ZIP contains two individually formatted PDFs');
 assert.ok(Buffer.from(doc.bytes).length>20000&&Buffer.from(batch.bytes).length>20000,'Word exports remain valid');
 console.log('RTL academic/behavioral certificate: layout, Word bidi, landscape PDF and ZIP entries PASS');
}
test().catch(e=>{console.error(e);process.exitCode=1});
