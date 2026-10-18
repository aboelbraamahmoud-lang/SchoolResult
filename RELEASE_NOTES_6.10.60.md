# SchoolResult 6.10.60 — Reports and printing for department coordinators

- The same official printing/report center used by the school principal and vice principal now appears for authorized coordinators, with identical report types, original preview, A4 print, full PDF, individual report ZIP and vector PDF.
- Coordinator reports only use the server-returned department-scoped workspace; other departments' students/grades/subjects are never included. No browser-side filtering replaces server access control.
- Report viewing requires the existing `reports` permission; printing and downloading additionally require `export`. Report design and records remain read-only to coordinators.
- Keep the principal and vice principal report center school-wide, and preserve the qualitative Word report center as an independent section.
- Restore safe role-aware scope labels in reports, with regression tests against the actual Supabase coordinator projection and role permissions.
- No Supabase database mutations or schema changes.
