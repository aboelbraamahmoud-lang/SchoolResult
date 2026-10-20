# SchoolResult engineering audit — work in progress

Date: 2026-10-20. This branch is an audit candidate, not a verified production release.

## Baseline and rollback
- Audited main: `6e427933cefd2a9ee640e184c1873b154aecaa11`, release 6.10.68.
- Last source revision with successful status for both production projects: `577b839d1f06a3edee47129b5ef9c3079f9fc63f` (6.10.67).
- Recorded successful deployment references:
  - https://vercel.com/aboelbraamahmoud-6503s-projects/schoolresult/FTHwbdoQ5CzMXYtd4grYEWBRvrs6
  - https://vercel.com/aboelbraamahmoud-6503s-projects/school-result/CfDVMwjDT6MmpCDNXc8FD8y51STU
- The Vercel connector returned 403 for the intended team. Current production aliases and deployment IDs could not be revalidated. Do not describe the references above as verified current production.
- Both Vercel statuses on main report a build rate limit. A new deployment was not attempted.
- The previous scheduled 6.10.68 publication task was inspected and is paused.
- Do not merge or release until the current Vercel production identity and rollback targets can be read, required tests pass, and release coordination is confirmed.
- For rollback after a future release: inspect both existing project aliases, select the recorded good deployments, roll back each existing project, and verify version/commit/domain aliases. Do not restore or migrate academic data. Do not reset main; use a reviewed revert if source rollback is necessary.

## Confirmed defect and correction
A class report stores a comma-separated teacher display label when more than one teacher is associated with the same class and subject. `normalizeReportPage` treated that combined label as a literal teacher filter. Two synthetic rows belonging to different teachers became zero rows. The same path is used by preview, print, PDF and ZIP.

The correction applies teacher scoping only to teacher-scoped pages. Class and subject filters remain active. `reportScopeAudit` now chooses its expected entity from the actual scope rather than always prioritizing the teacher display field.

A pure-JavaScript reproduction failed before the change (2 expected, 0 actual) and passed after it (2 actual). This is not a browser result. The new regression test also covers explicit teacher isolation, class/subject isolation, and comparison cohorts of 10, 18, 28, 40 and 80 students.

## Verification strategy and limits
- Existing official Node/desktop verification runs remain required.
- The old live-buttons test replaces PDF/ZIP producers with synthetic blobs. It does not demonstrate a real valid download.
- The new Chromium workflow builds real assets, mounts real report components with synthetic workspaces, clicks actual controls, saves downloads, validates PDFs with Poppler and ZIP entries with Python, renders every output PDF page, and records JSON results.
- Coordinator/leadership tests simulate the authenticated data boundary. They are not authenticated production tests.
- No production secrets or real student records are used in test fixtures or artifacts.
- Direct PDF/ZIP exports currently use a raster path. Native print/save-PDF provides vector text. This known limitation must remain explicit.
- Screenshots/PDFs require visual review in addition to automated measurements.
- Safari/iPhone, physical printers and authenticated production sessions are not yet verified.
- Local execution was unavailable in the audit session. No local npm/browser/build success is claimed.

## Supabase read-only inspection
The intended project `mzrepavyiaceedmuvfbf` was verified ACTIVE_HEALTHY. The deployed staff function is v8 and AI-plans function v3; both retain verify_jwt=true. All inspected public tables have RLS enabled. Keep-Alive already exists and its latest inspected scheduled run succeeded.

Privileged administrator archive access calls an authenticated active-admin ownership function and restricts records by owner. Warnings about SECURITY DEFINER routines require review, not blanket permission changes. Client-inaccessible tables without policies are intentionally deny-by-default; no policies were relaxed.

No database writes, migrations, grade changes, archive deletions, account recreation, password changes or Edge Function deployments were performed.

## Release state
No version increment, generated-asset commit, merge or production deployment has occurred. Record actual CI results and remaining gaps before changing this state.
