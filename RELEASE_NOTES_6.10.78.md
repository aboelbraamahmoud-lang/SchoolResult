# SchoolResult 6.10.78

The Struggling Students page now has a **طباعة تقرير المتعثرين** button. It uses the existing report-center header, footer, landscape A4 fitting and native print / Save as PDF pipeline.

The current inclusive percentage range selects students with at least one failed subject. The report groups each student and academic ID with the active-exam class, all failed subjects, the active-exam teacher, score, percentage and required intervention. Other failed subjects for the selected student remain included even outside the selection range. Passing, absent, unentered and invalid results are excluded. Only records already authorized in the supplied workspace are used.

Printing covers the complete list, including rows beyond the screen's 100-result pagination. Students stay together where possible; unusually long student groups continue on numbered pages. Empty or invalid ranges disable printing. Leadership uses the existing export permission.

Validation: model tests cover identity separation, duplicate records, percentage boundaries, zero, invalid and absent results, active exams and teachers, scoped workspaces, 235 students and a 27-subject continuation. Browser verification through the actual analytics page prints 105 synthetic students / 106 failed subjects over nine A4 pages, with original headers and footers, no clipping, current teacher names and export-permission enforcement.
