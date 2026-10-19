# SchoolResult 6.10.64 — Skill-based exam grades

## New authorized grade-review editor
- Admin/owner: open **مراجعة درجات الطلاب**, select an exam, student and subject, and click **تعديل**.
- For a present student choose **توزيع درجة الاختبار على مهارات**. Each skill has name, maximum mark and earned mark.
- The overall exam mark is calculated **exclusively** from the exact two-decimal-place sum of skill marks.
- Maximum skill marks must sum **exactly** to the existing per-row exam maximum; each earned mark must be within its own skill maximum and the aggregate may never exceed the exam maximum.
- Existing scores with no skill breakdown stay unchanged. Opt-in changes only one student, subject and selected exam.
- Future independent edits to an established skill-based total are rejected. Changes to skills, total and status are validated together.
- Every skill change stores a regular reversible workspace audit entry with old/new breakdown, old/new totals, timestamp and authenticated admin actor/role.
- Admin save still creates a recovery checkpoint and uses the existing revision-checked Supabase RPC. No new database policies or Supabase schema.
- Coordinator, principal and vice accounts retain read-only grades. They cannot open the editor or save a full workspace through staff RPCs.

## Testing
- Regression tests cover arithmetic, invalid and over-max scores, negative/empty/fractional values, duplicated skills, unchanged legacy records, tampered backup validation and staff role denial.
- Feature is introduced on a review branch first, not released to production until the comprehensive verification succeeds.
