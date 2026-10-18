# SchoolResult 6.10.62 — Coordinator preview white-screen fix

- Confirmed cause: the coordinator's server-scoped settings omitted `coordinatorName`, while the shared report footer accesses `coordinatorName.trim()`. This could crash the React portal upon pressing Prepare Preview.
- Use a non-mutating, presentation-only workspace with safe defaults for `coordinatorName` and `stable`; all student records remain filtered by the backend's existing department authorization.
- Lock the coordinator's report center to one subject already present in the authorized row scope. No editable subject selection or fallback to All Subjects; normalized whitespace ensures consistent filtering.
- Wrap the coordinator/leadership report center in a React error boundary so any future report-template error can be recovered without showing a fully blank page.
- Include safe display fields `coordinatorName` and `stable` in the *source* Edge Function whitelist for a future backend deployment; the live frontend does not require the Edge Function to be redeployed to correct this crash.
- Add an executable regression test that first reproduces the actual original report-footer TypeError and then checks the original report rendering with coordinator-safe settings and an active, single-subject preview.
- No Supabase table, RLS policy, login permission, student grade, or other stored data modifications.

## React bootstrap compatibility

The local report-center error boundary is initialized lazily on first portal render, rather than at module load, because the legacy bundle initializes its React namespace later. This keeps both the UI bootstrap and the recovery screen operational.
