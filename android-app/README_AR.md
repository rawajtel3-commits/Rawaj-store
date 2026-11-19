# تطبيق متجر رواج لأندرويد (Android Studio + نطاقك الخاص)

هذا المجلد يحتوي على مشروع **Android Studio (Kotlin + Gradle)** كامل ومتكامل مع خادم متجر رواج، مع دعم:
- ربط التطبيق بنطاقك الخاص (`HTTPS`) من إعداد واحد فقط.
- تشغيل ميزة **تجربة المنتجات بالواقع المعزز (3D Camera AR)** والبحث الصوتي عبر ربط صلاحيات الكاميرا والمايكروفون مباشرةً داخل WebView.
- دعم تسجيل الدخول عبر Google (عبر Chrome Custom Tabs) وتنزيل الفواتير ولقطات AR.
- دعم التحقق التلقائي لروابط التطبيق (**Android App Links**) عبر نقطة النهاية `/.well-known/assetlinks.json` المدمجة في الخادم.

---

## 1. ضبط نطاقك الخاص في الخادم (Backend)
عند استضافة المتجر على نطاقك الخاص (مثلاً `https://store.yourdomain.com`) مع شهادة SSL صالحة:
1. أضف المتغيرات التالية في إعدادات الخادم (`.env`):
   ```env
   CUSTOM_DOMAIN="https://store.yourdomain.com"
   ANDROID_APP_PACKAGE="com.rawaj.store"
   ANDROID_SHA256_CERT_FINGERPRINTS="AA:BB:CC:..."
   ```
2. سيقوم الخادم تلقائياً بتقديم ملف التحقق على المسار:
   `https://store.yourdomain.com/.well-known/assetlinks.json`
3. تأكد أيضاً من إضافة نطاقك الخاص ضمن **Authorized Domains** في لوحة تحكم Firebase Authentication ليتمكن العملاء من تسجيل الدخول.

---

## 2. ضبط نطاقك الخاص داخل مشروع Android Studio
افتح الملف `android-app/gradle.properties` وحدّث القيم:
```properties
RAWAJ_STORE_URL=https://store.yourdomain.com
RAWAJ_APP_PACKAGE=com.rawaj.store
RAWAJ_APP_VERSION_CODE=1
RAWAJ_APP_VERSION_NAME=1.0.0
```

---

## 3. تصدير ملف APK بطريقتين
### الطريقة أ: عبر Android Studio على جهازك
1. افتح Android Studio واختر **Open** ثم حدد مجلد `android-app`.
2. انتظر حتى ينتهي Gradle Sync.
3. من القائمة العلوية اختر:
   - للتجربة المباشرة: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
   - للنشر على Google Play: **Build > Generate Signed Bundle / APK** وتوقيعه بمفتاحك (Keystore).

### الطريقة ب: بناء APK تلقائياً عبر GitHub Actions (بدون تثبيت Android Studio)
1. ارفع المشروع إلى مستودع GitHub الخاص بك.
2. ادخل إلى تبويب **Actions** وشغّل سير العمل **Build Rawaj Store Android APK**.
3. أدخل رابط نطاقك الخاص (`https://store.yourdomain.com`) واسم الحزمة.
4. عند اكتمال التشغيل، ستجد ملف `.apk` جاهزاً للتحميل ضمن **Artifacts**.
