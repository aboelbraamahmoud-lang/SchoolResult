# SchoolResult 6.10.76

The existing subject-comparison report and student-percentage report are now available in the coordinator, principal and vice-principal report centers. The same admin page templates, print pipeline, PDF and ZIP exporters are reused.

Percentage labels retain enough decimal places to stay inside the selected range; a result just below 100% is never displayed as 100% by rounding.

- **الطلاب ضمن نسبة** accepts a minimum (inclusive) and maximum (exclusive), both between 0 and 100. Examples: 90 ≤ percentage < 100, 50 ≤ percentage < 60, 0 ≤ percentage < 60, and 70 ≤ percentage < 80. Empty, reversed and invalid bounds disable preview/export. The unrounded computed percentage determines inclusion; zero is a valid result. Absent, unentered and additional-support records retain the existing exclusion rules.
- Changing either bound invalidates the preview. Direct PDF/ZIP exports apply the same bounds even before preview preparation. Existing single-threshold internal callers preserve their zero lower bound.
- **تقرير مقارنة المواد** keeps the original success and achievement pages, grade/class grouping, subject order, teacher names and A4 layout. Coordinators fetch aggregate matrices only when previewing or exporting. The server requires the existing reports and comparison permissions and resolves school ownership from the authenticated account. No individual student data from other departments is returned.
- The coordinator's ordinary student reports remain locked to the assigned subject. Leadership retains the school-wide read-only workspace and existing export permissions.
- Supabase `school-staff` adds the backward-compatible `subject_comparison` action. It must be deployed with `subject-comparison.ts` and the existing `year-over-year.ts`; JWT authentication remains enabled. No schema migration or grade write is needed.

The previous 6.10.75 update is already merged and deployed. The existing database keep-alive health read was verified successfully. Old draft PRs #2 and #4 remain excluded: #4 was superseded by newer main functionality, and #2 changes official-grade semantics against the accepted requirement.

Validation covers boundary/decimal/Arabic input values, pagination, all four report roles, exact original-renderer parity, server permission/ownership checks and aggregate privacy. Browser export verification uses synthetic data, without opening actual student records.
