/* Desktop-only: preview the actual report document before native printing. */
(() => {
  'use strict';
  const bridge = window.schoolResultDesktop;
  if (!bridge || !bridge.isDesktop) return;
  const landscape = doc => {
    try {
      const oriented = doc.querySelector?.('[data-orientation="landscape"], [data-orientation="portrait"]');
      const explicit = oriented?.dataset?.orientation || oriented?.getAttribute?.('data-orientation');
      if (explicit === 'landscape') return true;
      if (explicit === 'portrait') return false;
      if (doc.querySelector?.('.grade-subjects-landscape, .report-landscape, .sr633-certificate')) return true;
      if (doc.querySelector?.('.report-portrait, .student-result-page')) return false;
      const css = [...doc.querySelectorAll('style')].map(tag => tag.textContent || '').join('\n');
      let selected = null;
      for (const rule of css.matchAll(/@page\s*[^{}]*\{[^}]*\bsize\s*:\s*(?:A\d+\s+)?(landscape|portrait)\b/gi))
        selected = rule[1].toLowerCase();
      return selected === 'landscape';
    } catch { return false; }
  };
  const reportFailure = error => {
    const reason = error && error.message ? error.message : String(error || 'خطأ غير معروف');
    console.error('Desktop report print failed:', reason);
    window.alert('تعذر تنفيذ الأمر. يمكنك حفظ التقرير PDF ثم طباعته من جهازك.\n' + reason);
  };
  const doPrint = (promise, after = null) => {
    Promise.resolve(promise).then(result => {
      if (result && result.status === 'error') reportFailure(new Error(result.reason || 'تعذر طباعة التقرير'));
    }).catch(reportFailure).finally(() => { if (typeof after === 'function') after(); });
  };
  const previewPopup = popup => {
    if (!popup || popup.closed) return;
    try {
      const doc = popup.document;
      if (!doc.body) return;
      if (doc.getElementById('sr-desktop-preview-toolbar')) { popup.focus(); return; }
      const css = doc.createElement('style');
      css.textContent = [
        '.sr-desktop-preview-toolbar{position:fixed!important;top:10px!important;left:12px!important;right:12px!important;z-index:2147483647!important;display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:10px!important;padding:12px 18px!important;background:#123247!important;color:#fff!important;border-radius:12px!important;box-shadow:0 8px 30px #0003!important;direction:rtl!important;font:14px Tahoma,Arial,sans-serif!important}',
        '.sr-desktop-preview-toolbar button{all:unset!important;box-sizing:border-box!important;cursor:pointer!important;background:#fff!important;color:#123247!important;border-radius:7px!important;padding:9px 14px!important;font-weight:bold!important}',
        '.sr-desktop-preview-toolbar button:hover{background:#dceef3!important}',
        '.sr-desktop-preview-toolbar small{color:#e2eef3!important;font-size:12px!important}',
        '@media screen{body{padding-top:84px!important;background:#eef3f7!important}.sr650-sheet{margin:0 auto 18px!important;box-shadow:0 8px 22px #0002!important}}',
        '@media print{.sr-desktop-preview-toolbar{display:none!important}}'
      ].join('\n');
      (doc.head || doc.documentElement).appendChild(css);
      const toolbar = doc.createElement('div');
      toolbar.id = 'sr-desktop-preview-toolbar';
      toolbar.className = 'sr-desktop-preview-toolbar';
      toolbar.setAttribute('role', 'toolbar');
      toolbar.setAttribute('aria-label', 'معاينة التقرير وطباعته');
      const heading = doc.createElement('strong');
      heading.textContent = 'معاينة التقرير — نسخة سطح المكتب';
      toolbar.appendChild(heading);
      const action = (label, callback) => {
        const button = doc.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.addEventListener('click', callback);
        toolbar.appendChild(button);
      };
      action('طباعة التقرير', () => doPrint(bridge.printPopup({ landscape: landscape(doc) })));
      action('حفظ PDF مطابق للمعاينة', () => doPrint(bridge.savePopupPDF({ landscape: landscape(doc) })));
      action('إغلاق المعاينة', () => popup.close());
      const note = doc.createElement('small');
      note.textContent = 'نافذة ويندوز قد لا تعرض معاينة إضافية؛ هذه الصفحة هي المعاينة الفعلية للتقرير.';
      toolbar.appendChild(note);
      doc.body.appendChild(toolbar);
      popup.focus();
    } catch (error) { reportFailure(error); }
  };
  const originalOpen = window.open.bind(window);
  window.open = function (url, ...args) {
    const popup = originalOpen(url === '' ? 'about:blank' : url, ...args);
    if (!popup || (url !== '' && url !== 'about:blank')) return popup;
    try { popup.print = () => previewPopup(popup); }
    catch (error) { reportFailure(error); }
    return popup;
  };
  window.print = () => doPrint(bridge.printCurrent({ landscape: landscape(document) }), () => window.dispatchEvent(new Event('afterprint')));
})();
