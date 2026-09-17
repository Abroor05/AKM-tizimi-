# Hisobot - Professional Kutubxona Boshqaruv Tizimi

## Loyiha haqida
- React + Vite + React Router + Tailwind CSS bilan qurilgan
- O'zbekiston Axborot-Kutubxona Markazlari (AKM) uchun professional boshqaruv tizimi
- 14 viloyat, 192+ tuman, 6 kutubxona bilan ishlaydi
- 21 ta modul, 6 xil rol (Super Admin, Viloyat Admini, Tuman Admini, Kutubxona Xodimi, Monitoring, Tekshiruvchi)
- Ma'lumotlar localStorage'da saqlanadi (frontend-only)

## Demo loginlar
- Super Admin: superadmin / admin123
- Viloyat Admin: viloyatadmin / admin123
- Tuman Admin: tumanadmin / admin123
- Kutubxona Xodimi: xodim1 / user123
- Monitoring: monitor / admin123
- Tekshiruvchi: tekshiruvchi / admin123

## Texnologiyalar
- Vite 8.3.0 + React 19
- Tailwind CSS (v4, @tailwindcss/vite)
- react-router-dom (BrowserRouter)
- @tanstack/react-query
- recharts (grafiklar uchun)
- react-icons/fa6 (professional SVG iconlar)
- react-hook-form + zod (formlar va validatsiya)
- leaflet + react-leaflet (xarita uchun)
- Context API (AppContext) - auth, RBAC, CRUD
- localStorage (persistence)

## Fayil tuzilmasi
- src/data/constants.js - rollar, permissionlar, enumlar, storage kalitlari
- src/data/regions.js - 14 viloyat va tumanlar
- src/data/seedData.js - boshlang'ich ma'lumotlar (users, libraries, books, readers, etc.)
- src/context/AppContext.jsx - global state (login, CRUD, RBAC, audit)
- src/components/icons.jsx - markazlashgan icon registr
- src/components/Layout.jsx - 21-elementli sidebar, topbar, bildirishnomalar
- src/components/ProtectedRoute.jsx - rol/permission asosida himoya
- src/components/ui/* - qayta ishlatiluvchi UI komponentlar
- src/pages/auth/Login.jsx - kirish sahifasi
- src/pages/shared/* - 21 modul sahifalari (Dashboard, Libraries, Books, Readers, Reports, Tasks, DailyActivity, Events, Inventory, Documents, Appeals, Notifications, KPI, Statistics, Analytics, Map, Users, Roles, Audit, Security, Settings)

## 21 Modul
1. Boshqaruv paneli (Dashboard) - rol asosida statistika va grafiklar
2. AKM/Kutubxonalar - kutubxona va filiallarni boshqarish
3. Kunlik faoliyat - kunlik faoliyat yozuvlari
4. Hisobotlar - oylik/choraklik/moliyaviy hisobotlar, ko'rib chiqish
5. Topshiriqlar - vazifalarni boshqarish va kuzatish
6. Kitob fondi - kitoblar kategoriyalari va holati
7. Kitobxonlar - kitobxonlar ro'yxati va kartalari
8. Tadbirlar - tadbirlar kalendarini boshqarish
9. Inventarlar - jihoz va inventarlar
10. Hujjatlar - hujjatlar va arxiv
11. Murojaatlar - fuqarolar murojaatlari
12. Bildirishnomalar - tizim xabarnomalari
13. KPI va Reyting - kalit ko'rsatkichlar
14. Statistika - statistik ko'rsatkichlar va diagrammalar
15. BI Analytics - qiyosiy tahlil va radial ko'rsatkichlar
16. Xarita - viloyatlar kesimida kutubxonalar
17. Foydalanuvchilar - foydalanuvchilarni boshqarish
18. Rollar va Permissionlar - ruxsat matritsasi
19. Audit Log - tizim amallari jurnali
20. Xavfsizlik - xavfsizlik sozlamalari va kirish tarixi
21. Tizim sozlamalari - umumiy va xavfsizlik sozlamalari

## Ishga tushirish
```
cd C:/Users/Fujitsu-HS/Desktop/Hisobot
npm run dev
```
Server: http://localhost:3000
