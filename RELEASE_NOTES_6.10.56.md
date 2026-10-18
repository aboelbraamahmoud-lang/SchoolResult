# SchoolResult 6.10.56 — A4 full-paper report fidelity

- Use the same on-screen report CSS for browser printing, Electron preview, and native vector PDF; exclude legacy print-only selectors that moved the ministry emblem, headings or footer.
- Keep exact A4 dimensions (210 × 297 mm or 297 × 210 mm), with no extra center shrinking. Preserve the original 9/9/8 mm report interior padding.
- Keep the report's flex layout, logo and heading coordinates, signatures and footer. Adjust table row height in spare space; compact dense table cells only when needed; explicitly fail rather than clip data.
- PDF and ZIP raster exports use identical full-page geometry. Preserve CSS object-position for ministry and school logos.
- Show reports with native landscape class in the website preview. Honor data-orientation in Electron printing; show correct page counts for exports without prepared preview.
- Add full-paper and consolidated PDF/ZIP regression coverage. No Supabase/schema/security changes.
- In-browser raster PDF uses Canvas text painting, so tiny glyph-rendering differences against vector browser printing can remain.
