# Reference build — SchoolResult 6.10.72

## Rebuild

Use Node.js 22 or 24, then run from the repository root:

```sh
npm --prefix source ci
npm run verify
npm --prefix desktop run verify
```

Deploy the generated root web files with the existing Vercel configuration. Source lives in `source/src`, the preserved original bundle in `source/base`, and the reproducible compiler in `source/build.cjs`. Do not edit generated `app.js` or `desktop/web/app.js` directly.

## Report rendering

- Native print uses the screen stylesheet without legacy print overrides, the original report markup and A4 page size. Content typography and spacing are never stretched or reduced only for printing.
- Direct PDF and ZIP share `reportPageJPEG`, using the browser to rasterize the original DOM at 300dpi. They are raster PDFs; native print / Save as PDF provides selectable vector text.
- `html-to-image` 1.11.13 is bundled locally. Its default font-size rounding is removed in a temporary build copy with an explicit build guard; otherwise Arabic text wraps differently from the preview. The installed dependency remains untouched. Its MIT license is included.
- Report-center and custom pagination happens before preview/export. Every selected row is retained. Overflow is reported instead of silently clipping content.
- Report geometry tests compare original and print DOM, and before/after direct capture. They cover all roles, custom reports, student statements and Arabic/English skills reports. Annual comparisons also verify every subject and the school total.
- Print and raster tests use synthetic records. Real printer settings, Safari and authenticated production accounts were not exercised.

No database schema, grades or account permissions changed in this release. Existing Supabase migrations, Edge Functions and the existing keep-alive workflow remain included for reference.
