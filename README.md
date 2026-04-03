# Aman AI - المساعد الذكي

هذا المشروع هو تطبيق Angular مدمج مع Gemini AI.

## استخدام Docker

يمكنك بناء وتشغيل التطبيق باستخدام Docker باتباع الخطوات التالية:

### 1. بناء الصورة (Build)
```bash
docker build -t aman-ai .
```

### 2. تشغيل الحاوية (Run)
```bash
docker run -d -p 8080:80 aman-ai
```

سيكون التطبيق متاحاً على `http://localhost:8080`.

## المميزات
- واجهة مستخدم متجاوبة.
- دعم كامل للغة العربية.
- تكامل مع Firebase و Gemini AI.
