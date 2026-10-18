# SchoolResult 6.10.58 — A4 trailing-content-safe page fitting

- Correct the shared school/student A4 page fit planner: distribute row height only within the actual free region AFTER the last meaningful body element and BEFORE the signatures/footer.
- Preserve student summary cards and the methodology note below the scores table. The former table-to-footer calculation could push signatures off A4 for 9 or 16 subject statements.
- Tested locally using actual headless Chromium with illustrative 9- and 16-subject report DOMs: each occupies one portrait A4 page with complete RTL columns, logo and signature footer.
- Add a deterministic 9-subject summary/footer geometry regression test.
- Retain v6.10.57 Electron close-preview lifecycle protections and all prior print, PDF/ZIP, Vercel and Supabase behavior. No data/schema changes.
