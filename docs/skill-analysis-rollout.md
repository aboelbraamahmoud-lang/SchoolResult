# SchoolResult — Arabic / English Skill Analysis (staged rollout)

## Implemented in this branch
- Arabic template: الصف السابع / الثامن / التاسع; Arabic skills listening/dictation, memorization, reading, grammar, writing.
- English default skills: listening, speaking, reading, grammar, writing.
- Editable per-exam labels, maximum marks, extra skills (up to 12), and low-achievement threshold.
- Create assessments from the current approved student roster, enter grades online, import approved Arabic Excel or generic Excel, export an offline CSV template compatible with Excel.
- Compare each fully recorded student's skill sum against their official grade for the SAME exam and subject; differentiate mismatched totals from incomplete entries and maximum-total mismatches. Never write back to official grades.
- Reports scoped by school/grade/class, individual skill, underachieving students, grade reconciliation, skill ranking, and two-exam percentage comparisons. PDF, print and CSV exports.
- Staff coordinator writes use server-side action \`save_skills\`: check JWT, active account and reports permission; only assigned Arabic/English subjects; validate each academic ID against subject roster; only update \`workspace.skillsAssessments\`; optimistic \`revision\` compare-and-swap. The server never accepts a full workspace replacement from staff.
- Leadership remains read-only. Old Edge Functions that don't advertise \`profile.skillsWrite\` leave coordinator editing disabled rather than offering a broken save button.
- Core system grades, staffing permissions, exam definitions and archived records are not automatically modified.

## Required to activate coordinator editing in production
1. Back up production Supabase school workspace.
2. Deploy this branch's \`supabase/functions/school-staff/index.ts\` to the **actual SchoolResult Supabase project** (the one referenced by \`source/src/cloud.js\`), not a different Supabase project.
3. Confirm that signed-in eligible coordinators receive \`profile.skillsWrite === true\` from the deployed function.
4. Deploy the verified web bundle built from this branch. Do not copy only the new JS service files without rebuilding \`app.js\` and \`style.css\`.
5. Test as Arabic coordinator, English coordinator, leadership and owner:
   - coordinator can create/import/modify own subject only;
   - a different-subject score write is rejected by the server;
   - stale revisions return \`CLOUD_CONFLICT\` without replacing data;
   - mismatched student/exam grades show a warning while original scores remain unchanged;
   - PDF and print fit A4 landscape and match the preview;
   - unrelated SchoolResult reports and user permissions remain intact.
6. Check every database save/reload and watch the function error logs; restore from backup if results differ from the approved baseline.

## Access blocker identified during implementation
The connected Supabase accounts visible to this ChatGPT session do NOT list the SchoolResult project referenced by \`source/src/cloud.js\`. The Edge Function therefore has **not** been deployed from here. Editing is intentionally feature-gated until the correct deployment occurs.

## Implementation paths
- \`source/src/skills.js\`: existing model, Arabic parser and official A4 report base, retained.
- \`source/src/skills-enhancements.js\`: bilingual roster, reports, reconciliation, generic Excel parser.
- \`source/src/skills-center-v2.js\`: editing, charts, PDF/CSV/print and warning UI.
- \`source/src/staff.js\`: coordinator editing under advertised server capability.
- \`supabase/functions/school-staff/index.ts\`: scoped write authorization.
- \`source/tests/skills-bilingual-2026.cjs\`: regression and read-only/render tests.
- \`source/src/repair.css\`: responsive panel and printing style.
