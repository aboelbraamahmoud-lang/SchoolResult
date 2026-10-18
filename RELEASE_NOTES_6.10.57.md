# SchoolResult 6.10.57 — Stable Electron print and student A4 parity

- Prevent the Electron **Object has been destroyed** error when users close report preview windows during asynchronous printer discovery, the native Windows print dialog, or Save as PDF.
- Treat deliberate window closure and native print cancellation as **cancelled**, not a fatal application error or a second warning dialog. Drop late callbacks from destroyed windows.
- Print student result statements through the **same A4 popup/DOM-based engine** as the displayed preview instead of printing the full main application window with competing CSS @page rules.
- Preserve the original student result template's 12mm horizontal margins, ministry logo, grades, identity, totals, footer and signatures; explicitly measure student report tables for page overflow.
- Avoid removing the report's visible inner outline only at print time.
- Safely ignore pending load/font/image callbacks for academic/behavioral and staff reports when the popup is closed.
- Add dynamic tests for native print lifecycle races and for student result preview/print parity.
- No changes to Supabase, database schema, student data, permissions or desktop security policy.
- Physical printing on the user's printer still requires a real Windows smoke test.
