# بناء نسخة Windows من SchoolResult 6.10.29

هذه حزمة بناء سطح المكتب الخاصة بـ **الإصدار 6.10.29**، وهي تعديل إعدادات البناء **وليس تعديلًا لدرجات الطلاب أو التقارير**.

## الملفات المهمة

- `.github/workflows/build-windows-setup.yml` — Workflow لإنشاء **ملف التثبيت** و**النسخة المحمولة** على Windows.
- `.github/workflows/verify.yml` — اختبارات البرنامج عند تحديث المستودع.
- `desktop/assets/icon.ico` — أيقونة لازمة لتجميع تطبيق Windows؛ كانت مفقودة من الحزمة السابقة.
- `desktop/package.json` — إعداد Electron وelectron-builder.

## الخطوات على GitHub

1. افتح مستودع **SchoolResult**، وارفع **محتويات الحزمة كاملةً** إلى جذر المستودع؛ لا ترفع ملف ZIP كما هو دون فك ضغطه.
2. تأكد من وجود `.github/workflows/build-windows-setup.yml` في مستودع GitHub، ومن وجود `desktop/assets/icon.ico`.
3. افتح تبويب **Actions**، ثم اختر **Build SchoolResult Windows Desktop**.
4. اضغط **Run workflow** وحدد فرع `main` (أو الفرع الذي رفعت عليه الحزمة).
5. انتظر انتهاء مهمة Windows. إذا نجحت، افتح المهمة ثم **Artifacts** وحمّل `SchoolResult-Windows-<رقم التشغيل>`.
6. ستجد: `SchoolResult-Setup-6.10.29-x64.exe` للتثبيت، و`SchoolResult-Portable-6.10.29-x64.exe` للتشغيل المحمول، و`SHA256SUMS.txt` للتحقق.

> مجلد `.github` يبدأ بنقطة وقد يكون مخفيًا في بعض أدوات إدارة الملفات. لا تحذفه أثناء الرفع.

> لم يُشغّل بناء Windows داخل هذه البيئة؛ اختبار إنتاج ملف EXE النهائي يكون في GitHub Actions على `windows-latest`.

> التطبيق المولّد غير موقّع بشهادة رقمية؛ قد يُظهر Windows SmartScreen رسالة حماية عند التنزيل أو التشغيل. تحقق من المصدر ونتيجة GitHub Actions قبل التشغيل.
