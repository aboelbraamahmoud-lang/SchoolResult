'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.cjs'), 'utf8');
const html = fs.readFileSync(path.join(root, 'web', 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'web', 'desktop-print-bridge.js'), 'utf8');
assert.match(html, /<script defer src="\.\/desktop-print-bridge\.js"><\/script>/);
assert.match(main, /url === 'about:blank' && isInternalUrl\(mainWindow\.webContents\.getURL\(\)\)/);
assert.match(main, /child\.webContents\.setWindowOpenHandler\(\(\) => \(\{ action: 'deny' \}\)\)/);
assert.match(main, /contents\.getPrintersAsync\(\)/);
assert.match(main, /silent: false, printBackground: true, color: true, pageSize: 'A4', landscape/);
assert.match(main, /margins: \{ marginType: 'none' \}/);
assert.match(main, /preferCSSPageSize: true/);
assert.match(main, /ipcMain\.handle\('app:save-popup-pdf'/);
assert.match(main, /ipcMain\.handle\('app:print-popup'/);
assert.match(main, /ipcMain\.handle\('app:print-current'/);
assert.match(js, /dispatchEvent\(new Event\('afterprint'\)\)/);
assert.match(js, /originalOpen\(url === '' \? 'about:blank' : url, \.\.\.args\)/);
const calls = [];
const nodes = [];
function element(tag) {
  const listeners = {};
  return { tag, children: [], textContent: '', style: {}, id: '', className: '',
    setAttribute(k,v){this[k]=v},
    addEventListener(k,cb){listeners[k]=cb},
    click(){listeners.click?.()},
    appendChild(x){this.children.push(x);return x}
  };
}
const body = element('body'), head = element('head');
const popupDoc = {
  body, head,
  querySelectorAll: () => [{textContent:'@page{size:A4 landscape;margin:5mm}'}],
  getElementById: id => body.children.find(x => x.id === id) || null,
  createElement: element
};
const popup = {document: popupDoc, closed: false, focus(){ calls.push({kind:'focus'}) }, close(){this.closed = true}};
const window = {
  schoolResultDesktop: {
    isDesktop: true,
    printPopup: options => { calls.push({kind:'popup', ...options}); return Promise.resolve({status:'submitted'}); },
    savePopupPDF: options => { calls.push({kind:'pdf', ...options}); return Promise.resolve({status:'pdf-saved'}); },
    printCurrent: options => { calls.push({kind:'current', ...options}); return Promise.resolve({status:'submitted'}); }
  },
  open(url) { return url === 'about:blank' ? popup : { print: () => calls.push({kind:'external-original'}) }; },
  alert: message => { throw new Error('Unexpected dialog: '+message); },
  dispatchEvent: event => calls.push({kind:'afterprint', type:event.type})
};
const document = {querySelectorAll:() => [{textContent:'@page{size:A4 portrait;margin:5mm}'}]};
vm.runInNewContext(js, {window, document, console, Promise, Event:class Event{constructor(type){this.type=type}}}, {timeout:2000});
window.open('', '_blank').print();
assert.equal(body.children.length,1, 'report must display a local desktop preview first');
const toolbar = body.children[0];
assert.equal(toolbar.id,'sr-desktop-preview-toolbar');
assert.equal(toolbar.children.filter(x=>x.tag==='button').length,3);
assert.equal(calls.filter(x=>x.kind==='popup').length,0,'no native print dialog before user confirms');
window.open('', '_blank').print();
assert.equal(body.children.length,1, 'preview must not duplicate toolbar');
toolbar.children.find(x=>x.textContent==='طباعة التقرير').click();
toolbar.children.find(x=>x.textContent==='حفظ PDF مطابق للمعاينة').click();
window.print();
window.open('https://example.com', '_blank').print();
assert.deepEqual(calls.filter(x=>['popup','pdf','current','external-original'].includes(x.kind)),[
  {kind:'popup',landscape:true},{kind:'pdf',landscape:true},{kind:'current',landscape:false},{kind:'external-original'}
]);
setImmediate(()=>{
  assert.deepEqual(calls.at(-1),{kind:'afterprint',type:'afterprint'});
  toolbar.children.find(x=>x.textContent==='إغلاق المعاينة').click();
  assert.equal(popup.closed,true);
  console.log('Desktop local report preview + A4 native printer + vector PDF + orientation PASS');
});
