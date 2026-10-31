# SchoolResult 6.10.75

- Smart plans reuse subject labels, subject-order comparisons and class subject lists within each student-analysis calculation. Caches are local to the calculation, so changing report settings always produces fresh labels. Student scores, statuses and plan selection rules are unchanged.
- Saved-plan Word metadata is computed only in the saved-plan tab. Gemini connection settings are requested only when the connection tab opens. Teacher filtering uses a row-ID index instead of scanning all results for every student.
- The custom-report builder opens its controls immediately. Click **عرض التقرير** after choosing the scope and columns to generate the existing full preview. Changing any configuration or the workspace invalidates the preview and disables printing/export until it is refreshed, preventing stale output. The same report DOM and print/export paths are retained.
- The account footer identifies both owner and administrator accounts as **الأدمن**, retaining the existing save/connection statuses and permissions.

## Validation

On a local synthetic 9,000-row / 1,000-student workspace, student report preparation decreased from 10,653 ms to 628 ms, and subject-presentation reconstruction calls decreased from 12,000 to 12. Serialized student results before and after were identical. These are local calculation measurements, not production login/network timings.

Regression tests cover bounded subject-presentation work, fresh labels after settings changes, unchanged scores, lazy custom-report preview and invalidation, Gemini settings requests on demand, and creating a manual AI-plan draft. The browser print audit explicitly generates both custom-report orientations before comparing the preview and print geometry.

Based on main d811495c1ee52b9338cf86ba27bd273c135fd5e1, including the latest top-ten ranking fixes.
