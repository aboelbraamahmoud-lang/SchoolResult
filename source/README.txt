مشروع تطوير الإصدار السحابي 6.9.1
هذه حزمة إصلاح قابلة للبناء فوق الملف المجمع الأصلي، وليست ملفات TSX الأصلية.
قاعدة البيانات موجودة بالفعل؛ db/schema.sql مرجع لبناء مشروع جديد فقط. لا تضف مفاتيح secret أو service_role إلى الواجهة.

البناء من داخل source باستخدام Node 22 أو أحدث:
node --expose-internals build.cjs
node --expose-internals tests/regression.cjs
node --expose-internals tests/cloud.cjs
node --expose-internals tests/structure.cjs
node release.cjs
node tests/release.cjs

الإصدار 6.9.1 يستخدم Workspace Schema 7 ويضيف الهيكل الأكاديمي المترابط، ربط المعلم تلقائيًا من المادة + الشعبة، الملف الأكاديمي للطالب، ولوحة القيادة التنفيذية.
source/src/catalog.js وsource/src/master-ui.js هما نقطتا التطوير الرئيسيتان لهذه الوظائف.
الجلسة تُدار بمكتبة Supabase المضمّنة؛ نتائج المدرسة لا تُحفظ محليًا كمصدر authoritative.
release.cjs يعيد إنشاء update-manifest.json وchecksums.sha256، ويستبعد tests/output لأنها ملفات متغيرة.
