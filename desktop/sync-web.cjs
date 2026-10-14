const fs = require('fs');
const path = require('path');

const desktopRoot = __dirname;
const repoRoot = path.resolve(desktopRoot, '..');
const target = path.join(desktopRoot, 'web');
const required = [
  'index.html', 'app.js', 'style.css', 'supabase.js', 'version.json',
  'update-manifest.json', 'checksums.sha256', 'moehe.png',
  'assets/word-reference.js', 'assets/word-improvement.js', 'assets/word-behavior.js',
  'نموذج-استيراد-نتائج-المدرسة.xlsx',
  'نموذج-قاعدة-بيانات-المعلمين.xlsx',
  'نموذج-نتيجة-مادة.xlsx'
];

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
for (const name of required) {
  const src = path.join(repoRoot, name);
  if (!fs.existsSync(src)) throw new Error(`Missing web file: ${name}`);
  fs.mkdirSync(path.dirname(path.join(target,name)),{recursive:true});
  fs.copyFileSync(src, path.join(target, name));
}
// Native printing bridge is bundled ONLY into the Electron web copy.
// Public site files and the original report templates are unchanged.
const printBridge = path.join(desktopRoot, 'print-bridge.js');
if (!fs.existsSync(printBridge)) throw new Error('Desktop print bridge is missing.');
fs.copyFileSync(printBridge, path.join(target, 'desktop-print-bridge.js'));
const indexPath = path.join(target, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');
if (!/<\/body>/i.test(html)) throw new Error('Desktop HTML has no body closing tag.');
fs.writeFileSync(indexPath, html.replace(/<\/body>/i, '<script defer src="./desktop-print-bridge.js"></script></body>'), 'utf8');
const version = JSON.parse(fs.readFileSync(path.join(target, 'version.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf8'));
if (version.version !== pkg.version) {
  throw new Error(`Version mismatch: web=${version.version}, desktop=${pkg.version}`);
}
console.log(`Synced ${required.length} web files for SchoolResult ${pkg.version}.`);
