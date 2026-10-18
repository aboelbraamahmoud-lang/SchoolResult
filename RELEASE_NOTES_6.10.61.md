# SchoolResult 6.10.61 — Coordinator subject stability

- Coordinators see their department's subject in a fixed, non-editable field. No «كل المواد» or change-subject action is available.
- A single-subject department's preview, printer, vector PDF, consolidated PDF and ZIP all use the same fixed subject rather than accidentally selecting the entire school.
- For accounts authorized for multiple departments, the fixed field lists only their server-provided authorized subject names; other departments remain inaccessible.
- A department with no subject results receives a clear notice, and empty preview/export actions are disabled.
- Admin, principal and vice principal retain their standard subject filter and printing features.
- Regression coverage for coordinator and admin paths. No changes to Supabase schema, users or student data.
