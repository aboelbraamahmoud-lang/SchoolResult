# SchoolResult 6.9.20 — Developer Handoff

## البنية
- `web/`: التطبيق المنشور وناتج البناء الوحيد.
- `source/`: السورس، الاختبارات، SQL migrations وأدوات البناء والإصدار.
- `main.cjs`, `server.cjs`, `preload.cjs`: غلاف Electron.

## أوامر العمل
- `npm run build:web` — إعادة بناء `web/app.js` و`web/style.css`.
- `npm test` — تشغيل جميع اختبارات السورس.
- `npm run verify` — بوابة الإصدار الكاملة: build + syntax + tests + manifest + checksums + release tests.
- `npm run build:win` — بناء Windows بعد تثبيت dependencies على Windows.

## قواعد الإصدار
1. وحّد رقم الإصدار في `package.json` و`web/version.json` و`source/src/engine.js`.
2. شغّل `npm run verify` قبل أي ZIP أو EXE.
3. لا تعدل `web/app.js` يدويًا؛ عدّل `source/` ثم أعد البناء.
4. لا تحذف `source/tests` أو `source/db/migrations`.
5. لا تستخدم `service_role` في الواجهة الأمامية.
6. أي تغيير في Supabase يجب أن يكون Migration محفوظًا ومراجعًا مع RLS.

## 6.9.20

- إصلاح منشئ التقارير المخصصة ليبدأ بالاختبار النشط بدل `exam4` الثابت.
- مزامنة أعمدة الدرجة والنسبة والمستوى عند تغيير الاختبار داخل المنشئ.
- تحسين تشخيص حالة عدم وجود بيانات.
- إضافة Keep-Alive آمن لـSupabase باستخدام قراءة فقط من جدول صحي مخصص وRLS.
- قبل الاعتماد الدوري للـKeep-Alive، طبّق مرة واحدة `source/db/6.9.19_keep_alive.sql` ثم اختبر Workflow يدويًا.

## 6.9.18
- إحصائية نتائج القسم: الشعب رأسيًا، المواد أفقيًا، وتحت كل مادة: `اسم المعلم | نسبة النجاح | نسبة التحصيل`.
- مقارنة المواد ما زالت صفحتين لكل صف: نجاح / تحصيل.
- تم توحيد المصطلحات الرسمية وإصلاح build/test/release paths.
- لم تحدث أي Migration لقاعدة Production في هذا الإصدار.
