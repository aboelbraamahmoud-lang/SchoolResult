/* Desktop-only: route print requests to Electron's native Windows dialog. */
(() => {
  'use strict';
  const bridge = window.schoolResultDesktop;
  if (!bridge || !bridge.isDesktop) return;
  const landscape = doc => {
    try {
      const css = [...doc.querySelectorAll('style')].map(tag => tag.textContent || '').join('\n');
      return /@page\s*[^{}]*\{[^}]*\bsize\s*:\s*(?:A\d\s+)?landscape\b/i.test(css);
    } catch { return false; }
  };
  const reportFailure = error => {
    const reason = error && error.message ? error.message : String(error || 'خطأ غير معروف');
    console.error('Desktop report print failed:', reason);
    window.alert('تعذر بدء طباعة التقرير. يمكنك حفظه بصيغة PDF ثم طباعته من الجهاز.\n' + reason);
  };
  const doPrint = (promise, after = null) => {
    Promise.resolve(promise).then(result => {
      if (result && result.status === 'error') reportFailure(new Error(result.reason || 'تعذر طباعة التقرير'));
    }).catch(reportFailure).finally(() => { if (typeof after === 'function') after(); });
  };
  const originalOpen = window.open.bind(window);
  window.open = function (url, ...args) {
    const popup = originalOpen(url === '' ? 'about:blank' : url, ...args);
    if (!popup || (url !== '' && url !== 'about:blank')) return popup;
    try {
      popup.print = () => doPrint(bridge.printPopup({ landscape: landscape(popup.document) }));
    } catch (error) { reportFailure(error); }
    return popup;
  };
  window.print = () => doPrint(bridge.printCurrent({ landscape: landscape(document) }), () => window.dispatchEvent(new Event('afterprint')));
})();