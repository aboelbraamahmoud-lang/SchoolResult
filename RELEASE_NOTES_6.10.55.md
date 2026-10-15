# SchoolResult 6.10.55 — Unified Print and Export Layout
- Report Center prints **every page in the selected report scope**; 8-page preview pagination no longer truncates printing.
- Printing, vector PDF and raster PDF/ZIP now share the same original React report template and A4 width, margin, heading and table sizing rules.
- Electron opens a local, scrollable **report preview** before submitting to Windows printers. The Windows OS native dialog may still say that it cannot display a *second* preview.
- Desktop preview offers print and vector PDF save, using Chromium's original document, and honors portrait/landscape page size.
- Web retains native browser print/Save as PDF. Direct-download PDF/ZIP remain offline browser-side 300dpi raster outputs; rendering difference vs vector text is intrinsic to this export method.
- Regression smoke tests added for all-selected pages and desktop print/PDF preview. No changes to student data schema, Supabase policies, or access controls.
