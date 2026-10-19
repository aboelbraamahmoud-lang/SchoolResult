# SchoolResult 6.10.63 — Staff smart-plan menu retirement

- Remove AI smart planning UI, creation, and save entry points from coordinator, principal and vice principal portals even if their older records still say `plans:true`.
- Remove plan-related permission checkboxes from admin staff account creation/editing forms; ensure all three legacy AI flags are disabled on new and edited staff accounts.
- Leave the main admin AI plan interface, saved plans, and the independent quantitative/qualitative performance-improvement reports unchanged.
- Retain coordinator locked subject, protected preview, printing, PDF and ZIP, Supabase authorization and Windows app behavior.
- Test portal trees for all three staff roles, including legacy plan permissions, plus admin account grant controls.
- No data deletion or Supabase schema changes. For existing accounts, UI ignores old flags; persisted flags are cleared upon an account edit.
