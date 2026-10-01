مشروع تطوير الإصدار السحابي 6.6
هذه حزمة إصلاح قابلة للبناء فوق الملف المجمع الأصلي 6.2، وليست ملفات TSX أصلية.
قاعدة البيانات أُنشئت بالفعل؛ db/schema.sql مرجع لبنائها في مشروع جديد فقط. db/verify.sql اختبار تشخيصي يستخدم ROLLBACK.
إعدادات المشروع العامة موجودة في src/cloud.js. لا تضف مفاتيح secret أو service_role إلى ملفات الواجهة.

البناء من داخل source باستخدام Node 22 أو أحدث:
node --expose-internals build.cjs
npm ci
npx --no-install esbuild sdk-entry.js --bundle --minify --format=iife --global-name=SchoolSupabase --outfile=../supabase.js
node --expose-internals tests/regression.cjs
node --expose-internals tests/cloud.cjs
node --expose-internals tests/structure.cjs

حدّث version.json وupdate-manifest.json وchecksums.sha256 عند توزيع تغييرات جديدة.
الجلسة تُدار بمكتبة Supabase 2.117.2؛ نتائج المدرسة لا تُحفظ في IndexedDB في الإصدار السحابي.

أوامر 6.6 الإضافية:
node release.cjs
node tests/release.cjs

release.cjs يعيد إنشاء update-manifest.json وchecksums.sha256، ويستبعد tests/output لأنها ملفات متغيرة ناتجة عن تشغيل الاختبارات وليست جزءًا ثابتًا من سلامة الإصدار.
