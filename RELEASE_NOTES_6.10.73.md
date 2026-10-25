# SchoolResult 6.10.73

- Route principal and vice-principal directly to the original leadership dashboard loader. Do not compute the coordinator dashboard, student bands and two-exam comparison first. Preserve the same admin components, permissions and server-scoped read endpoint.
- Avoid resetting empty dashboard overrides after initial payload load, which recalculated the same school dashboard twice. Provide a retry control when the initial school-data request fails.
- Fit ordinary class reports in the preview itself using the exact same A4 fitting function as print, PDF and ZIP. Keep classes of up to 40 students together; larger classes keep all students across numbered continuation sheets. Preserve footer, logo, content and proportions, and reject extreme overflow rather than clip it.
- Lock physical report header columns and ministry-logo dimensions independently of mobile/popup width. School logo, school name and academic year stay on the left; ministry stays on the right.
- Give student names 40% of the levels table, and 32% of comparison/follow-up tables. Reduce small numeric/remarks columns; allow long names to wrap without truncation.
- Browser checks now exercise actual print media, a 390px preview, a 480px popup, long Arabic names, a 40-student single sheet, PDF and ZIP. Leadership parity also asserts zero unused coordinator calculations and one initial dashboard calculation.

No database schema, account grants, student scores or Edge Function changes. The existing Supabase keep-alive workflow is retained. Tests use synthetic school data; they do not measure production authentication/network time or a physical printer.
