# SchoolResult 6.10.59 — Role-aware Report De-duplication and Unified Export

- Remove redundant school-overview shortcut and repeated school-leadership KPI/chart displays without removing distinct reports or changing permissions.
- Share one original React report renderer for on-screen preview, native print, vector Save-as-PDF, automatic full PDF and grouped ZIP reports.
- Ensure all selected pages and exact absolute page numbering survive per-group ZIP capture; verify group counts before download.
- Preserve A4 orientation based on the actual template. Use CSS object-fit:fill and image clipping for the 300dpi raster exporter.
- Add regression tests for role gating, duplicate navigation, renderer parity, page completeness, ZIP group capture, exact logo fit behavior.
- No Supabase/schema/auth changes. Raster Canvas typography may still differ subtly from Chromium vector PDF.
