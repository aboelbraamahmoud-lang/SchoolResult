'use strict';
// A real asynchronous race: closing the Windows preview must never become
// "Object has been destroyed" or open a second error dialog.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {EventEmitter}=require('node:events');
const source=fs.readFileSync(path.join(__dirname,'../main.cjs'),'utf8');
const begin=source.indexOf('  function livePrintContents('),end=source.indexOf('  async function createWindow()',begin);
assert.ok(begin>0&&end>begin,'Native printer lifecycle helpers must be present');
let dialogs=0,writes=0,selected='/tmp/print-lifecycle-test.pdf';
const parent={isDestroyed:()=>false};
const sandbox={
  app:{getPath:()=>'/tmp'},
  fs:{promises:{writeFile:async()=>{writes++}}},
  path,
  BrowserWindow:{fromWebContents:()=>parent},
  mainWindow:parent,
  dialog:{
    showSaveDialogSync:()=>{dialogs++;return selected},
    showMessageBoxSync:()=>{dialogs++;return 1}
  },
  writeLog:()=>{}
};
vm.runInNewContext(source.slice(begin,end)+'\nthis.printApis={printWithWindows,saveAsPDF};',sandbox);
const {printWithWindows,saveAsPDF}=sandbox.printApis;
function contents(opts={}){
 const c=new EventEmitter();
 c.dead=false;
 c.isDestroyed=()=>c.dead;
 c.getPrintersAsync=opts.getPrintersAsync|| (async()=>[{name:'printer'}]);
 c.print=opts.print||((_settings,callback)=>callback(true));
 c.printToPDF=opts.printToPDF|| (async()=>Buffer.alloc(300));
 c.destroy=()=>{c.dead=true;c.emit('destroyed')};
 return c;
}
(async()=>{
 let used=null;
 const c=contents({print:(settings,callback)=>{used=settings;callback(true)}});
 assert.equal((await printWithWindows(c,false)).status,'submitted');
 assert.equal(used.pageSize,'A4');
 assert.equal(used.landscape,false);
 assert.equal(used.margins.marginType,'none');
 assert.equal(dialogs,0,'Printer success must not show another dialog');
 const instant=contents({getPrintersAsync:async()=>{instant.dead=true;return [{name:'printer'}]}});
 assert.equal((await printWithWindows(instant,false)).status,'cancelled','closed preview during printer discovery');
 const deferred=contents({print:(_settings,callback)=>{deferred.callback=callback}});
 const waiting=printWithWindows(deferred,true);
 await new Promise(ok=>setImmediate(ok));
 assert.equal(typeof deferred.callback,'function','native dialog must be reached');
 deferred.destroy();
 assert.equal((await waiting).status,'cancelled','closing preview while native dialog is open');
 deferred.callback(false,'Object has been destroyed');
 assert.equal(dialogs,0,'late print callbacks must not show an error after window closes');
 const cancelled=contents({print:(_settings,callback)=>callback(false,'user cancelled')});
 assert.equal((await printWithWindows(cancelled,false)).status,'cancelled','native dialog Cancel is harmless');
 const invalid=contents({print:()=>{throw Error('Object has been destroyed')}});
 assert.equal((await printWithWindows(invalid,false)).status,'cancelled','Electron destruction exception is harmless');
 const saving=contents();
 sandbox.dialog.showSaveDialogSync=()=>{dialogs++;saving.destroy();return selected};
 assert.equal((await saveAsPDF(saving,false)).status,'cancelled','closing preview while save dialog is open');
 assert.equal(writes,0,'a cancelled PDF must not be written');
 sandbox.dialog.showSaveDialogSync=()=>{dialogs++;return selected};
 assert.equal((await saveAsPDF(contents(),true)).status,'pdf-saved','normal vector PDF still works');
 assert.equal(writes,1);
 console.log('PASS 6.10.57 Windows popup lifecycle, async printer close/cancel, A4 native print, vector PDF save');
})().catch(err=>{console.error(err);process.exitCode=1});
