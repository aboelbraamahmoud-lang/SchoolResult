# SchoolResult 6.10.64 — Arabic language skills analysis

- Added an admin **تحليل مهارات المواد** section for importing the supplied Arabic skills workbook (seventh, eighth, ninth grades and 5 skills). The source workbook is NOT embedded in repository assets, keeping student names and academic identifiers private.
- Null/blank marks stay **unentered**, never zero. Maxima must be entered by the school before valid skill percentages/mastery are computed; original workbook has no maximum score specifications.
- Class-by-class student detail and grade/class summary reports share identical A4 landscape HTML template for preview, native printing and vector Save-as-PDF; raster PDF and grouped ZIP reuse the same HTML.
- Skills records stored as a validated `skillsAssessments` array inside the existing private school workspace JSONB. Import creates backup first, and existing records for the same subject/exam/year require confirmation to replace.
- Staff: director and vice see permitted full-school skill reports; coordinator sees only matching subject-scope records, filtered on the Supabase Edge Function. Staff cannot import or mutate marks.
- Defined pairwise student/skill comparison function, ready when a later exam file is provided. English skill layout is not assumed; it will be implemented on reviewing the user's English workbook.
- Added regression tests for import columns, exact null handling, year, A4 report format, restrictions and workspace persistence.
- Requires deployment of updated `supabase/functions/school-staff/index.ts` for coordinator and leadership visibility. No SQL migrations, tables or Supabase policies changed.
