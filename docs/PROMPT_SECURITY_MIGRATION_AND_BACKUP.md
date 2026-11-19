# خطة الترحيل والنسخ الاحتياطي وتدوير المفاتيح للبرومبت الهندسي (Master Prompt Security Runbook)

## 1. معمارية العزل والتحكم بالوصول (RBAC)
تم فصل صلاحيات لوحة التحكم إلى دورين صريحين يتم التحقق منهما على الخادم (`server.ts` و `firestore.rules`):
- **`promoter_admin`** (أدمن المروّج / المؤسس): يملك صلاحية الوصول الكاملة إلى الخزنة المشفّرة للبرومبت الهندسي، وتدوير المفاتيح، وتبديل الميزة، واستعراض سجل التدقيق، وإدارة تعيينات الأدوار.
- **`user_admin`** (أدمن مستخدم/مدير المتجر): يدير المنتجات، المخزون، الطلبات، الاسترجاعات، والعروض وإعدادات المتجر؛ ويُحجب تماماً عن البرومبت الهندسي (لا يُضمن في حزمة الواجهة، ويُحذف من شجرة React عبر استجابة `/api/admin/capabilities`، وتُرجع كافة نقاط النهاية `/api/admin/master-prompt*` رمز **`403 PROMOTER_ADMIN_REQUIRED`**).
- **`customer`**: مستخدم المتجر العادي (يُرجع له `403` أو `401`).

---

## 2. التخزين المشفّر وتدوير المفاتيح (Envelope Encryption & Key Rotation)
- **التشفير**: تشفير AES-256-GCM بمغلف مفاتيح (Envelope Encryption):
  - **DEK (Data Encryption Key)**: مفتاح عشوائي 256-بت خاص بتشفير نص البرومبت داخل جدول `encrypted_master_prompts`.
  - **KEK (Key Encryption Key)**: مشتق عبر HMAC-SHA256 من `PROMPT_KMS_KEY` (أو مفتاح بيئة التشغيل الآمن بصلاحيات `0600`) لتغليف مفاتيح DEK وحفظها في جدول `prompt_keyring`.
- **التدوير الدوري واليدوي**:
  - تتحقق الخزنة تلقائياً من حقل `rotate_after_at` (كل **30 يوماً**) لتوليد `keyVersion` جديد وإعادة تشفير البرومبت وتعليم المفتاح السابق بـ `rotated`.
  - يمكن لأدمن المروّج التدوير الفوري عبر الواجهة أو `POST /api/admin/master-prompt/rotate-key`.
- **تدوير الـ KEK في الإنتاج**:
  1. تعيين `PROMPT_KMS_KEY` الجديد في متغيرات البيئة السرية على منصة الاستضافة.
  2. تصدير نسخة احتياطية مشفّرة وموقّعة قبل التبديل (`POST /api/admin/master-prompt/backup`).
  3. استدعاء `POST /api/admin/master-prompt/restore` بعد تشغيل الخادم بالمفتاح الجديد لإعادة تغليف المفتاح دون فقدان البيانات.

---

## 3. خطة الترحيل من الإصدار السابق إلى الخزنة الآمنة
1. **إزالة النص من الكود المصدري للعميل**: حذف `MASTER_PROMPT_TEXT` من حزمة Vite (`src/data/initialData.ts`) واستبدال أي استيراد له باستعلام ديناميكي لـ `/api/admin/master-prompt` عبر `fetch(..., { cache: 'no-store' })`.
2. **تهيئة جداول الخزنة تلقائياً**: عند أول إقلاع للخادم، ينشئ `ensurePromptVaultInitialized()` جداول `prompt_keyring`، `encrypted_master_prompts`، `prompt_feature_flags`، `prompt_access_audit_logs`، و `rbac_role_assignments` في SQLite باستخدام استعلامات Prepared Statements.
3. **نشر قواعد Firestore المحدّثة**: دعم القيم `promoter_admin` و `user_admin` في `firestore.rules` والتحقق عبر `eslint`.
4. **مراجعة التعيينات**: تعيين حسابات مشغّلي المتجر كـ `user_admin` عبر `POST /api/admin/roles/assign` أو متغير البيئة `USER_ADMIN_EMAILS`.

---

## 4. النسخ الاحتياطي والاستعادة (Encrypted Backup & Restore)
- **التصدير**: `POST /api/admin/master-prompt/backup` يُصدر ملف JSON مشفّر بـ AES-256-GCM وموقّع بتوقيع HMAC-SHA256 (`envelopeSignatureSha256`) وبدون أي نص خام.
- **التحقق عند الاستعادة**: `POST /api/admin/master-prompt/restore` يتحقق أولاً من توقيع المغلف، ثم يفك التشفير، ويتحقق من `checksumSha256` قبل إعادة التغليف بمفتاح DEK جديد وإصدار مفتاح محدّث.
- **مفتاح الإيقاف الطارئ (Feature Flag)**: يمكن تعطيل العرض فوراً عبر `PATCH /api/admin/master-prompt/feature` (`{ "enabled": false }`) لترجع نقطة النهاية `403 FEATURE_DISABLED` فوراً دون إعادة نشر.

---

## 5. سياسة سجلات التدقيق (Audit Policy)
- يُحظر تسجيل أي نص خام من البرومبت الهندسي في سجلات الخادم أو قاعدة البيانات.
- يُسجل فقط `accessRefId` (مثل `prm-acc-xxxxxx`) مع البريد المموّه، معرّف المستخدم، الدور، العملية (`viewed` / `denied` / `feature_toggled` / `key_rotated` / `backup_exported` / `backup_restored` / `role_switched` / `role_assigned`)، رمز الحالة (`200`/`401`/`403`)، وإصدار المفتاح.
