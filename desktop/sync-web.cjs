const fs = require('fs');
const path = require('path');

const desktopRoot = __dirname;
const repoRoot = path.resolve(desktopRoot, '..');
const target = path.join(desktopRoot, 'web');
const required = [
  'index.html', 'app.js', 'style.css', 'supabase.js', 'version.json',
  'update-manifest.json', 'checksums.sha256', 'moehe.png',
  'نموذج-استيراد-نتائج-المدرسة.xlsx',
  'نموذج-قاعدة-بيانات-المعلمين.xlsx',
  'نموذج-نتيجة-مادة.xlsx'
];

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
for (const name of required) {
  const src = path.join(repoRoot, name);
  if (!fs.existsSync(src)) throw new Error(`Missing web file: ${name}`);
  fs.copyFileSync(src, path.join(target, name));
}
const version = JSON.parse(fs.readFileSync(path.join(target, 'version.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf8'));
if (version.version !== pkg.version) {
  throw new Error(`Version mismatch: web=${version.version}, desktop=${pkg.version}`);
}
console.log(`Synced ${required.length} web files for SchoolResult ${pkg.version}.`);
