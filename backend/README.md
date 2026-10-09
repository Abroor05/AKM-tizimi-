# Kutubxona Boshqaruv Tizimi (AKM / KBT) — Backend API

Express.js va SQLite (better-sqlite3) asosida yaratilgan RESTful API serveri.

---

## 🚀 Ishga tushirish

```bash
cd backend
npm install
npm run dev
```

Server manzili: `http://localhost:5000`

---

## 📖 Swagger API Dokumentatsiyasi

Loyiha to'liq **OpenAPI 3.0** spetsifikatsiyasi va interaktiv **Swagger UI** bilan ta'minlangan:

* **Swagger UI interfeysi:** [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
* **Qisqa havola:** [http://localhost:5000/docs](http://localhost:5000/docs)
* **OpenAPI JSON sxemasi:** [http://localhost:5000/api/docs.json](http://localhost:5000/api/docs.json)

> **Eslatma:** Swagger UI orqali himoyalangan so'rovlarni yuborish uchun avval `POST /api/auth/login` orqali JWT token oling va sahifadagi **Authorize** tugmasi orqali kiriting (`Bearer <TOKEN>`).

---

## 🗂️ Asosiy API Yo'nalishlari

| Bo'lim | Asosiy yo'nalish | Tavsif |
| :--- | :--- | :--- |
| **Auth** | `/api/auth/*` | Tizimga kirish, profil, parolni almashtirish |
| **Kutubxonalar** | `/api/libraries` | Axborot-kutubxona markazlari va filiallar |
| **Kitoblar** | `/api/books` | Kitob fondi, qidirish va boshqaruv |
| **Kitobxonlar** | `/api/readers` | A'zolik kartalari va kitobxonlar hisobi |
| **Faoliyat** | `/api/activities` | Kunlik faoliyat monitoringi |
| **Hisobotlar** | `/api/reports` | Davriy hisobotlar, tasdiqlash workflow |
| **Topshiriqlar** | `/api/tasks` | Xodimlarga vazifalar biriktirish |
| **Tadbirlar** | `/api/events` | Madaniy-ma'rifiy tadbirlar |
| **Inventar** | `/api/inventory` | Moddiy-texnik jihozlar hisobi |
| **Hujjatlar** | `/api/documents` | Me'yoriy-huquqiy hujjatlar |
| **Murojaatlar** | `/api/appeals` | Fuqarolar murojaatlari |
| **Bildirishnomalar** | `/api/notifications` | Tizim xabarnomalari |
| **Foydalanuvchilar** | `/api/users` | Xodimlar va administratorlar |
| **Statistika** | `/api/dashboard/stats` | Boshqaruv paneli ko'rsatkichlari |
