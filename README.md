# Hisobot — Kutubxona Boshqaruv Tizimi (KBT)

Loyiha quyidagi qismlardan iborat:

```
Hisobot/
├── frontend/     ← React + Vite frontend
├── backend/      ← Express.js + PostgreSQL backend API
├── database/     ← Zaxira va migratsiya fayllari
└── package.json  ← Root boshqaruv skriptlari
```

---

## Ishga tushirish

### 1. Backend (API server)

```bash
cd backend
npm install
npm run dev
```

Server: `http://localhost:5000`

### 2. Frontend (React app)

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:3000`

---

## Root skriptlar

```bash
# Faqat frontendni ishga tushirish
npm run dev

# Faqat backendni ishga tushirish
npm run dev:backend

# Barcha paketlarni o'rnatish
npm run install:all

# Production build (frontend)
npm run build
```

---

## Texnologiyalar

**Frontend:** React 19, Vite, TailwindCSS, React Query, React Router  
**Backend:** Node.js, Express.js, PostgreSQL (`pg`), JWT, bcryptjs, Helmet, Rate Limiter, Swagger UI  
**Database:** PostgreSQL (`akm_db`)
