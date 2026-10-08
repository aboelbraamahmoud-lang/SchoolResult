SchoolResult 6.9.22 — current maintainable source

Build from this directory with Node 22+:
node --expose-internals build.cjs
node --expose-internals tests/regression.cjs
node --expose-internals tests/report-logic-current.cjs
node --expose-internals tests/cloud.cjs
node --expose-internals tests/structure.cjs
node release.cjs
node tests/release.cjs

The current architecture still uses source/base/app.js as the compiled baseline plus readable services and patches in source/src/.
Database reference: db/schema.sql. Existing-project migrations remain under db/migrations/.
Do not add service_role or secret keys to frontend files.
Generated test output is intentionally not committed.
