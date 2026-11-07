# Editable Word export regression

The PDF renderer's fitted DOM is the layout contract. Word measures those same
pages (including computed colors, line fragments, table grids and original
logos) and emits native OOXML tables/text plus editable vector decorations.
A section owns each A4 sheet. No report page/table is rasterized or embedded.
The annual native-print report uses isolated CSS fragmentation, with repeated
native table headers on continuation pages. Its print template is unchanged.

The former exporter reconstructed approximate tables and header/footer layouts,
replaced computed CSS with a small style palette, and let Word paginate the
result again. Those were the causes of color, width, typography and page-count
drift. The separate raster-Word path is no longer built into the application.

## Reproduce

Install source dependencies, Playwright 1.56.1 with Chromium, LibreOffice Writer,
Poppler, Python Pillow/numpy/lxml, and DejaVu Sans. Run `npm run build`.

```sh
export FONTCONFIG_FILE="$PWD/source/tests/word-fonts.conf"
export NODE_PATH="/path/to/playwright/node_modules:$PWD/source/node_modules"
node --expose-internals source/tests/word-layout-browser.cjs
python3 source/tests/word-layout-verify.py audit-artifacts/word-layout
python3 source/tests/word-edit-roundtrip.py audit-artifacts/word-layout
WORD_MODES=levels WORD_ROWS=26 WORD_CLASSES=26 WORD_AUDIT_OUT=audit-artifacts/word-26 node --expose-internals source/tests/word-layout-browser.cjs
python3 source/tests/word-layout-verify.py audit-artifacts/word-26
WORD_MODES=yearComparison WORD_YEAR_SUBJECTS=15 WORD_AUDIT_OUT=audit-artifacts/word-year-dense node --expose-internals source/tests/word-layout-browser.cjs
python3 source/tests/word-layout-verify.py audit-artifacts/word-year-dense
```

The browser test clicks the real React report controls for all thirteen modes.
Only workspace/server inputs are synthetic. The PDF and DOCX exporters are not
mocked. External requests are blocked. Nothing is written to a school database.

The independent Writer renderer verifies physical pages and produces comparison
PNGs (PDF left, Word right). XML checks assert native tables/cells, exact cell
values/order, explicit Arabic word boundaries, RTL, same page ownership, and
original-image-only media. Pixel comparisons cover both whole sheets and ink /
colored areas so white paper cannot conceal a missing header or background.
The round-trip test changes a native grade from 19 to 18.5, saves through Writer,
reopens the DOCX, and compares the rendered layout after saving.

On Linux, Microsoft fonts are not installed. The QA fontconfig maps both Arial
and Tahoma to the same DejaVu Sans in Chromium and Writer. Production DOCX keeps
the PDF's requested font names. This validates the engine with consistent fonts;
it is not a claim of pixel identity in every Word version or substitute font.
Native Windows Word and a packaged Windows desktop executable require Windows;
the repository's desktop startup, local-server and print lifecycle tests also
run separately with the same web bundle.

No student data or source reference files should be committed as fixtures.
GitHub Actions stores only generated synthetic evidence for fourteen days.
