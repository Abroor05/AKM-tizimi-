// ============================================================
// SWAGGER / OPENAPI 3.0 SPECIFICATION FOR KBT API
// ============================================================
import swaggerUi from 'swagger-ui-express';

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Kutubxona Boshqaruv Tizimi (AKM / KBT) API',
    version: '1.0.0',
    description: `
**Axborot-Kutubxona Markazi Boshqaruv Tizimi (AKM / KBT) uchun RESTful API hujjati.**

Ushbu platforma kutubxonalar, xodimlar, kitob fondi, kitobxonlar, kunlik faoliyat monitoringi, davriy hisobotlar va tahliliy ko'rsatkichlarni boshqarishga mo'ljallangan.

---
### 🔐 Avtorizatsiya:
Himoyalangan API endpointlaridan foydalanish uchun \`POST /auth/login\` orqali token oling va Swagger sahifasining yuqori o'ng burchagidagi **Authorize** tugmasini bosib, quyidagi formatda kiriting:
\`Bearer <SIZNING_TOKENINGIZ>\`
    `,
    contact: {
      name: 'AKM Texnik Qo\'llab-quvvatlash',
      email: 'admin@akm.uz',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000/api',
      description: 'Lokal server (to\'g\'ridan-to\'g\'ri)',
    },
    {
      url: 'http://127.0.0.1:5000/api',
      description: 'Lokal IP server',
    },
    {
      url: '/api',
      description: 'Nisbiy manzil (Vite proxy)',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT tokenni kiriting. Masalan: Bearer eyJhbGciOi...',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Xatolik haqida xabar' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'u_1791096778851_upw13g' },
          username: { type: 'string', example: 'admin' },
          fullName: { type: 'string', example: 'Abrorbek Ikromiddinov' },
          role: {
            type: 'string',
            enum: ['super_admin', 'viloyat_admin', 'tuman_admin', 'xodimlar_boshligi', 'kutubxona_xodimi'],
            example: 'super_admin',
          },
          phone: { type: 'string', example: '+998901234567' },
          email: { type: 'string', example: 'admin@akm.uz' },
          viloyatId: { type: 'string', nullable: true, example: 'v01' },
          tumanId: { type: 'string', nullable: true, example: 't0101' },
          libraryId: { type: 'string', nullable: true, example: 'lib_01' },
          active: { type: 'boolean', example: true },
          createdAt: { type: 'string', example: '2026-10-04' },
          lastLogin: { type: 'string', nullable: true, example: '2026-10-08' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', example: 'admin' },
          password: { type: 'string', example: 'admin123' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      Library: {
        type: 'object',
        required: ['name'],
        properties: {
          id: { type: 'string', example: 'lib_01' },
          name: { type: 'string', example: 'Markaziy Axborot-kutubxona' },
          type: { type: 'string', example: 'regional' },
          viloyatId: { type: 'string', example: 'v01' },
          tumanId: { type: 'string', example: 't0101' },
          address: { type: 'string', example: 'Mustaqillik shoh ko\'chasi, 15-uy' },
          latitude: { type: 'number', example: 41.311081 },
          longitude: { type: 'number', example: 69.240562 },
          phone: { type: 'string', example: '+998712000000' },
          email: { type: 'string', example: 'library@akm.uz' },
          staffCount: { type: 'integer', example: 12 },
          foundingYear: { type: 'integer', example: 1985 },
          status: { type: 'string', enum: ['active', 'inactive', 'repair'], example: 'active' },
        },
      },
      Book: {
        type: 'object',
        required: ['title'],
        properties: {
          id: { type: 'string', example: 'b_01' },
          title: { type: 'string', example: 'O\'tkan kunlar' },
          author: { type: 'string', example: 'Abdulla Qodiriy' },
          category: { type: 'string', example: 'Badiiy adabiyot' },
          isbn: { type: 'string', example: '978-9943-00-000-0' },
          publisher: { type: 'string', example: 'Sharq' },
          year: { type: 'integer', example: 2021 },
          copiesTotal: { type: 'integer', example: 5 },
          copiesAvailable: { type: 'integer', example: 4 },
          libraryId: { type: 'string', example: 'lib_01' },
          language: { type: 'string', example: 'o\'zbek' },
          pages: { type: 'integer', example: 380 },
          status: { type: 'string', example: 'available' },
        },
      },
      Reader: {
        type: 'object',
        required: ['fullName'],
        properties: {
          id: { type: 'string', example: 'r_01' },
          fullName: { type: 'string', example: 'Aliyev Jasur Anvar o\'g\'li' },
          cardNumber: { type: 'string', example: 'AKM-2026-0042' },
          phone: { type: 'string', example: '+998901112233' },
          address: { type: 'string', example: 'Toshkent sh., Chilonzor 7' },
          birthYear: { type: 'integer', example: 2002 },
          birthDate: { type: 'string', example: '2002-05-14' },
          libraryId: { type: 'string', example: 'lib_01' },
          status: { type: 'string', example: 'active' },
          borrowedCount: { type: 'integer', example: 2 },
          lastVisit: { type: 'string', example: '2026-10-07' },
        },
      },
      Activity: {
        type: 'object',
        required: ['type'],
        properties: {
          id: { type: 'string', example: 'a_01' },
          type: { type: 'string', example: 'daily_monitoring' },
          libraryId: { type: 'string', example: 'lib_01' },
          userId: { type: 'string', example: 'u_1791096832356_o9f9' },
          description: { type: 'string', example: 'Kunlik kitobxonlar tashrifi va xizmatlar' },
          date: { type: 'string', example: '2026-10-08' },
          time: { type: 'string', example: '18:00' },
          count: { type: 'integer', example: 45 },
          data: { type: 'string', example: '{"visitors":45,"booksGiven":32,"newReaders":4}' },
          status: { type: 'string', example: 'completed' },
        },
      },
      Report: {
        type: 'object',
        required: ['type', 'title'],
        properties: {
          id: { type: 'string', example: 'rep_01' },
          type: { type: 'string', enum: ['monthly', 'quarterly', 'annual', 'special'], example: 'monthly' },
          title: { type: 'string', example: '2026-yil Sentyabr oyi yakuniy hisoboti' },
          libraryId: { type: 'string', example: 'lib_01' },
          userId: { type: 'string', example: 'u_01' },
          viloyatId: { type: 'string', example: 'v01' },
          tumanId: { type: 'string', example: 't0101' },
          status: { type: 'string', enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected'], example: 'submitted' },
          period: { type: 'string', example: '2026-09' },
          submittedAt: { type: 'string', nullable: true, example: '2026-10-01' },
          reviewedAt: { type: 'string', nullable: true },
          reviewedBy: { type: 'string', nullable: true },
          reviewComment: { type: 'string', nullable: true },
          description: { type: 'string', example: 'Kutubxonaning oylik umumiy ko\'rsatkichlari' },
          data: { type: 'object' },
        },
      },
      Task: {
        type: 'object',
        required: ['title'],
        properties: {
          id: { type: 'string', example: 'tsk_01' },
          title: { type: 'string', example: 'Yangi fondni inventarizatsiyadan o\'tkazish' },
          description: { type: 'string', example: 'Keltirilgan 250 ta yangi kitobni ro\'yxatga olish' },
          assignedBy: { type: 'string', example: 'u_admin' },
          assignedTo: { type: 'string', example: 'u_xodim' },
          libraryId: { type: 'string', example: 'lib_01' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], example: 'high' },
          status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'overdue'], example: 'pending' },
          dueDate: { type: 'string', example: '2026-10-15' },
          createdAt: { type: 'string', example: '2026-10-08' },
        },
      },
      Event: {
        type: 'object',
        required: ['title'],
        properties: {
          id: { type: 'string', example: 'ev_01' },
          title: { type: 'string', example: 'Kitobxonlik haftaligi taqdimoti' },
          type: { type: 'string', example: 'cultural' },
          libraryId: { type: 'string', example: 'lib_01' },
          viloyatId: { type: 'string', example: 'v01' },
          tumanId: { type: 'string', example: 't0101' },
          date: { type: 'string', example: '2026-10-20' },
          time: { type: 'string', example: '14:00' },
          location: { type: 'string', example: 'Katta o\'quv zali' },
          participants: { type: 'integer', example: 50 },
          description: { type: 'string', example: 'Yoshlar o\'rtasida kitob mutolaasini oshirish tadbiri' },
          organizer: { type: 'string', example: 'Kutubxona xodimlari' },
          status: { type: 'string', enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], example: 'upcoming' },
        },
      },
      Inventory: {
        type: 'object',
        required: ['name'],
        properties: {
          id: { type: 'string', example: 'inv_01' },
          name: { type: 'string', example: 'Monoblok HP 24-df' },
          type: { type: 'string', example: 'IT uskunalari' },
          libraryId: { type: 'string', example: 'lib_01' },
          quantity: { type: 'integer', example: 10 },
          unitPrice: { type: 'integer', example: 7500000 },
          status: { type: 'string', enum: ['good', 'repair_needed', 'broken'], example: 'good' },
          purchaseDate: { type: 'string', example: '2024-03-15' },
          serialNumber: { type: 'string', example: 'HP-884920' },
        },
      },
      Document: {
        type: 'object',
        required: ['title'],
        properties: {
          id: { type: 'string', example: 'doc_01' },
          title: { type: 'string', example: 'Kutubxona faoliyati to\'g\'risidagi nizom' },
          type: { type: 'string', example: 'Nizom' },
          libraryId: { type: 'string', example: 'lib_01' },
          uploadedBy: { type: 'string', example: 'u_admin' },
          date: { type: 'string', example: '2026-01-10' },
          fileFormat: { type: 'string', example: 'pdf' },
          size: { type: 'string', example: '2.4 MB' },
          description: { type: 'string', example: 'Tasdiqlangan rasmiy nizom nusxasi' },
        },
      },
      Appeal: {
        type: 'object',
        required: ['subject', 'message'],
        properties: {
          id: { type: 'string', example: 'ap_01' },
          fullName: { type: 'string', example: 'Sobirov Ulug\'bek' },
          phone: { type: 'string', example: '+998939998877' },
          email: { type: 'string', example: 'sobirov@mail.uz' },
          libraryId: { type: 'string', example: 'lib_01' },
          subject: { type: 'string', example: 'Elektron nusxalarni ko\'paytirish bo\'yicha' },
          message: { type: 'string', example: 'Dasturlashga oid kitoblarni elektron formatda fondga qo\'shishingizni so\'rayman.' },
          status: { type: 'string', enum: ['new', 'in_progress', 'resolved', 'rejected'], example: 'new' },
          date: { type: 'string', example: '2026-10-07' },
          resolvedAt: { type: 'string', nullable: true },
          resolvedBy: { type: 'string', nullable: true },
          resolution: { type: 'string', nullable: true },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'notif_01' },
          type: { type: 'string', enum: ['info', 'warning', 'success', 'danger'], example: 'info' },
          title: { type: 'string', example: 'Yangi hisobot yuborildi' },
          message: { type: 'string', example: 'Markaziy AKM dan sentyabr oyi hisoboti tekshirish uchun yuborildi' },
          targetRole: { type: 'string', nullable: true, example: 'super_admin' },
          targetUserId: { type: 'string', nullable: true },
          date: { type: 'string', example: '2026-10-08' },
          time: { type: 'string', example: '15:30' },
          read: { type: 'boolean', example: false },
        },
      },
      DashboardStats: {
        type: 'object',
        properties: {
          totalLibraries: { type: 'integer', example: 2 },
          totalBooks: { type: 'integer', example: 120 },
          totalReaders: { type: 'integer', example: 85 },
          totalActivities: { type: 'integer', example: 10 },
          totalReports: { type: 'integer', example: 4 },
          pendingReports: { type: 'integer', example: 1 },
          totalTasks: { type: 'integer', example: 8 },
          pendingTasks: { type: 'integer', example: 3 },
          totalEvents: { type: 'integer', example: 2 },
          upcomingEvents: { type: 'integer', example: 1 },
          totalInventory: { type: 'integer', example: 25 },
          totalAppeals: { type: 'integer', example: 5 },
          newAppeals: { type: 'integer', example: 2 },
          totalUsers: { type: 'integer', example: 5 },
          unreadNotifications: { type: 'integer', example: 2 },
        },
      },
    },
  },
  paths: {
    // ------------------------------------------------------------
    // AUTHENTICATION
    // ------------------------------------------------------------
    '/auth/bootstrap-check': {
      get: {
        tags: ['Auth'],
        summary: 'Tizimda boshlang\'ich admin mavjudligini tekshirish',
        description: 'Agar foydalanuvchilar soni 0 bo\'lsa, `needsBootstrap: true` qaytaradi.',
        responses: {
          200: {
            description: 'Muvaffaqiyatli',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    needsBootstrap: { type: 'boolean', example: false },
                    userCount: { type: 'integer', example: 5 },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/bootstrap': {
      post: {
        tags: ['Auth'],
        summary: 'Birinchi Super Admin hisobini yaratish',
        description: 'Faqat bo\'sh ma\'lumotlar bazasida ishlaydi.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password', 'fullName'],
                properties: {
                  username: { type: 'string', example: 'admin' },
                  password: { type: 'string', example: 'Admin123!' },
                  fullName: { type: 'string', example: 'Super Administrator' },
                  phone: { type: 'string', example: '+998901234567' },
                  email: { type: 'string', example: 'admin@akm.uz' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Admin yaratildi va token qaytarildi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } },
          },
          409: { description: 'Admin allaqachon mavjud' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Tizimga kirish (Login)',
        description: 'Foydalanuvchi nomi va parol orqali JWT token olish.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Muvaffaqiyatli kirildi',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
              },
            },
          },
          401: {
            description: 'Login yoki parol noto\'g\'ri',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Joriy foydalanuvchi ma\'lumotlarini olish',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Foydalanuvchi profili',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          401: { description: 'Avtorizatsiya talab qilinadi' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Tizimdan chiqish (Logout)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Muvaffaqiyatli chiqildi',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean', example: true } },
                },
              },
            },
          },
        },
      },
    },
    '/auth/change-password': {
      post: {
        tags: ['Auth'],
        summary: 'Joriy foydalanuvchi parolini o\'zgartirish',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['oldPassword', 'newPassword'],
                properties: {
                  oldPassword: { type: 'string', example: 'eski_parol' },
                  newPassword: { type: 'string', example: 'yangi_parol123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Parol muvaffaqiyatli o\'zgartirildi' },
          400: { description: 'Eski parol noto\'g\'ri yoki yangi parol talablarga mos emas' },
        },
      },
    },

    // ------------------------------------------------------------
    // DASHBOARD & STATS
    // ------------------------------------------------------------
    '/dashboard/stats': {
      get: {
        tags: ['Dashboard'],
        summary: 'Boshqaruv paneli umumiy statistikasi',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Barcha modullar statistikasi va hisobotlar holati',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/DashboardStats' } } },
          },
        },
      },
    },

    // ------------------------------------------------------------
    // USERS MANAGEMENT
    // ------------------------------------------------------------
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'Barcha foydalanuvchilar ro\'yxati',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Foydalanuvchilar ro\'yxati',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/User' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Users'],
        summary: 'Yangi foydalanuvchi / xodim yaratish',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password', 'fullName', 'role'],
                properties: {
                  username: { type: 'string', example: 'xodim01' },
                  password: { type: 'string', example: 'Xodim123!' },
                  fullName: { type: 'string', example: 'Anvar Qodirov' },
                  role: { type: 'string', example: 'kutubxona_xodimi' },
                  phone: { type: 'string', example: '+998901234567' },
                  email: { type: 'string', example: 'anvar@akm.uz' },
                  viloyatId: { type: 'string', example: 'v01' },
                  tumanId: { type: 'string', example: 't0101' },
                  libraryId: { type: 'string', example: 'lib_01' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Yaratildi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
        },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Foydalanuvchini ID bo\'yicha olish',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          404: { description: 'Topilmadi' },
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Foydalanuvchi ma\'lumotlarini yangilash',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  fullName: { type: 'string' },
                  phone: { type: 'string' },
                  email: { type: 'string' },
                  active: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Foydalanuvchini o\'chirish',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'O\'chirildi' },
        },
      },
    },
    '/users/{id}/reset-password': {
      post: {
        tags: ['Users'],
        summary: 'Foydalanuvchi parolini tiklash (admin huquqi)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['newPassword'],
                properties: { newPassword: { type: 'string', example: 'YangiParol123' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Parol muvaffaqiyatli yangilandi' },
        },
      },
    },

    // ------------------------------------------------------------
    // LIBRARIES (KUTUBXONALAR)
    // ------------------------------------------------------------
    '/libraries': {
      get: {
        tags: ['Libraries'],
        summary: 'Barcha kutubxonalar ro\'yxati',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Library' } } } },
          },
        },
      },
      post: {
        tags: ['Libraries'],
        summary: 'Yangi kutubxona / filial qo\'shish',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Library' } } },
        },
        responses: {
          201: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Library' } } } },
        },
      },
    },
    '/libraries/{id}': {
      get: {
        tags: ['Libraries'],
        summary: 'Kutubxonani ID bo\'yicha olish',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Library' } } } },
          404: { description: 'Topilmadi' },
        },
      },
      put: {
        tags: ['Libraries'],
        summary: 'Kutubxona ma\'lumotlarini to\'liq yangilash',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Library' } } },
        },
        responses: {
          200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Library' } } } },
        },
      },
      delete: {
        tags: ['Libraries'],
        summary: 'Kutubxonani o\'chirish',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'O\'chirildi' } },
      },
    },

    // ------------------------------------------------------------
    // BOOKS (KITOB FONDI)
    // ------------------------------------------------------------
    '/books': {
      get: {
        tags: ['Books'],
        summary: 'Barcha kitoblar fondi ro\'yxati',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Book' } } } },
          },
        },
      },
      post: {
        tags: ['Books'],
        summary: 'Fondga yangi kitob qo\'shish',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Book' } } },
        },
        responses: {
          201: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Book' } } } },
        },
      },
    },
    '/books/{id}': {
      get: {
        tags: ['Books'],
        summary: 'Kitobni ID bo\'yicha olish',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Book' } } } },
          404: { description: 'Topilmadi' },
        },
      },
      put: {
        tags: ['Books'],
        summary: 'Kitob ma\'lumotlarini yangilash',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Book' } } },
        },
        responses: {
          200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Book' } } } },
        },
      },
      delete: {
        tags: ['Books'],
        summary: 'Kitobni o\'chirish',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'O\'chirildi' } },
      },
    },

    // ------------------------------------------------------------
    // READERS (KITOBXONLAR)
    // ------------------------------------------------------------
    '/readers': {
      get: {
        tags: ['Readers'],
        summary: 'Barcha kitobxonlar ro\'yxati',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Reader' } } } },
          },
        },
      },
      post: {
        tags: ['Readers'],
        summary: 'Yangi kitobxonni ro\'yxatga olish',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Reader' } } },
        },
        responses: {
          201: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Reader' } } } },
        },
      },
    },
    '/readers/{id}': {
      get: {
        tags: ['Readers'],
        summary: 'Kitobxonni ID bo\'yicha olish',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Reader' } } } },
          404: { description: 'Topilmadi' },
        },
      },
      put: {
        tags: ['Readers'],
        summary: 'Kitobxon ma\'lumotlarini yangilash',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Reader' } } },
        },
        responses: {
          200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Reader' } } } },
        },
      },
      delete: {
        tags: ['Readers'],
        summary: 'Kitobxonni o\'chirish',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'O\'chirildi' } },
      },
    },

    // ------------------------------------------------------------
    // ACTIVITIES (KUNLIK FAOLIYAT)
    // ------------------------------------------------------------
    '/activities': {
      get: {
        tags: ['Activities'],
        summary: 'Barcha kunlik faoliyat qaydlari',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Activity' } } } },
          },
        },
      },
      post: {
        tags: ['Activities'],
        summary: 'Yangi kunlik faoliyat kiritish',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Activity' } } },
        },
        responses: {
          201: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Activity' } } } },
        },
      },
    },
    '/activities/{id}': {
      get: {
        tags: ['Activities'],
        summary: 'Faoliyat qaydini ID bo\'yicha olish',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Activity' } } } },
          404: { description: 'Topilmadi' },
        },
      },
      delete: {
        tags: ['Activities'],
        summary: 'Faoliyat qaydini o\'chirish',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'O\'chirildi' } },
      },
    },

    // ------------------------------------------------------------
    // REPORTS (HISOBOTLAR)
    // ------------------------------------------------------------
    '/reports': {
      get: {
        tags: ['Reports'],
        summary: 'Barcha davriy hisobotlar ro\'yxati',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Report' } } } },
          },
        },
      },
      post: {
        tags: ['Reports'],
        summary: 'Yangi hisobot yaratish (Qoralama holatida)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Report' } } },
        },
        responses: {
          201: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Report' } } } },
        },
      },
    },
    '/reports/{id}': {
      get: {
        tags: ['Reports'],
        summary: 'Hisobotni ID bo\'yicha olish',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Report' } } } },
          404: { description: 'Topilmadi' },
        },
      },
      put: {
        tags: ['Reports'],
        summary: 'Hisobotni tahrirlash',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Report' } } },
        },
        responses: {
          200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Report' } } } },
        },
      },
      delete: {
        tags: ['Reports'],
        summary: 'Hisobotni o\'chirish',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'O\'chirildi' } },
      },
    },
    '/reports/{id}/submit': {
      post: {
        tags: ['Reports'],
        summary: 'Hisobotni tekshirishga yuborish (submitted holatiga o\'tkazish)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Report' } } } },
        },
      },
    },
    '/reports/{id}/review': {
      post: {
        tags: ['Reports'],
        summary: 'Hisobotni tasdiqlash yoki rad etish (approved / rejected)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['approved', 'rejected', 'under_review'], example: 'approved' },
                  comment: { type: 'string', example: 'Ko\'rsatkichlar to\'liq va to\'g\'ri' },
                },
              },
            },
          },
        },
        responses: {
          200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Report' } } } },
        },
      },
    },

    // ------------------------------------------------------------
    // TASKS (TOPSHIRIQLAR)
    // ------------------------------------------------------------
    '/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'Barcha topshiriqlar ro\'yxati',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Task' } } } },
          },
        },
      },
      post: {
        tags: ['Tasks'],
        summary: 'Xodimga yangi topshiriq biriktirish',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Task' } } },
        },
        responses: {
          201: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Task' } } } },
        },
      },
    },
    '/tasks/{id}': {
      get: {
        tags: ['Tasks'],
        summary: 'Topshiriqni ID bo\'yicha olish',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Task' } } } },
          404: { description: 'Topilmadi' },
        },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Topshiriqni o\'chirish',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'O\'chirildi' } },
      },
    },
    '/tasks/{id}/status': {
      patch: {
        tags: ['Tasks'],
        summary: 'Topshiriq holatini yangilash (pending, in_progress, completed)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'overdue'], example: 'completed' },
                },
              },
            },
          },
        },
        responses: {
          200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Task' } } } },
        },
      },
    },

    // ------------------------------------------------------------
    // EVENTS (TADBIRLAR)
    // ------------------------------------------------------------
    '/events': {
      get: {
        tags: ['Events'],
        summary: 'Barcha tadbirlar ro\'yxati',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Event' } } } },
          },
        },
      },
      post: {
        tags: ['Events'],
        summary: 'Yangi tadbir rejalashtirish',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Event' } } },
        },
        responses: {
          201: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Event' } } } },
        },
      },
    },
    '/events/{id}': {
      get: {
        tags: ['Events'],
        summary: 'Tadbirni ID bo\'yicha olish',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Event' } } } },
          404: { description: 'Topilmadi' },
        },
      },
      delete: {
        tags: ['Events'],
        summary: 'Tadbirni o\'chirish',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'O\'chirildi' } },
      },
    },

    // ------------------------------------------------------------
    // INVENTORY (INVENTARIZATSIYA)
    // ------------------------------------------------------------
    '/inventory': {
      get: {
        tags: ['Inventory'],
        summary: 'Barcha moddiy-texnik vositalar',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Inventory' } } } },
          },
        },
      },
      post: {
        tags: ['Inventory'],
        summary: 'Yangi vosita / jihoz qo\'shish',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Inventory' } } },
        },
        responses: {
          201: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Inventory' } } } },
        },
      },
    },
    '/inventory/{id}': {
      get: {
        tags: ['Inventory'],
        summary: 'Inventar vositasini ID bo\'yicha olish',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Inventory' } } } },
          404: { description: 'Topilmadi' },
        },
      },
      delete: {
        tags: ['Inventory'],
        summary: 'Inventar vositasini o\'chirish',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'O\'chirildi' } },
      },
    },

    // ------------------------------------------------------------
    // DOCUMENTS (HUJJATLAR)
    // ------------------------------------------------------------
    '/documents': {
      get: {
        tags: ['Documents'],
        summary: 'Barcha me\'yoriy hujjatlar ro\'yxati',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Document' } } } },
          },
        },
      },
      post: {
        tags: ['Documents'],
        summary: 'Yangi me\'yoriy hujjat qo\'shish',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Document' } } },
        },
        responses: {
          201: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Document' } } } },
        },
      },
    },
    '/documents/{id}': {
      get: {
        tags: ['Documents'],
        summary: 'Hujjatni ID bo\'yicha olish',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Document' } } } },
          404: { description: 'Topilmadi' },
        },
      },
      delete: {
        tags: ['Documents'],
        summary: 'Hujjatni o\'chirish',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'O\'chirildi' } },
      },
    },

    // ------------------------------------------------------------
    // APPEALS (MUROJAATLAR)
    // ------------------------------------------------------------
    '/appeals': {
      get: {
        tags: ['Appeals'],
        summary: 'Barcha fuqarolar murojaatlari',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Appeal' } } } },
          },
        },
      },
      post: {
        tags: ['Appeals'],
        summary: 'Yangi murojaat qoldirish',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Appeal' } } },
        },
        responses: {
          201: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Appeal' } } } },
        },
      },
    },
    '/appeals/{id}': {
      get: {
        tags: ['Appeals'],
        summary: 'Murojaatni ID bo\'yicha ko\'rish',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Appeal' } } } },
          404: { description: 'Topilmadi' },
        },
      },
      patch: {
        tags: ['Appeals'],
        summary: 'Murojaatni ko\'rib chiqish / javob berish (resolved / rejected)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'resolved' },
                  resolution: { type: 'string', example: 'Murojaat qanoatlantirildi va kerakli kitob fondga kiritildi.' },
                },
              },
            },
          },
        },
        responses: {
          200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Appeal' } } } },
        },
      },
      delete: {
        tags: ['Appeals'],
        summary: 'Murojaatni o\'chirish',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'O\'chirildi' } },
      },
    },

    // ------------------------------------------------------------
    // NOTIFICATIONS (BILDIRISHNOMALAR)
    // ------------------------------------------------------------
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'Barcha bildirishnomalar ro\'yxati',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Notification' } } } },
          },
        },
      },
      post: {
        tags: ['Notifications'],
        summary: 'Yangi bildirishnoma yaratish',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Notification' } } },
        },
        responses: {
          201: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Notification' } } } },
        },
      },
    },
    '/notifications/{id}/read': {
      post: {
        tags: ['Notifications'],
        summary: 'Bildirishnomani o\'qilgan deb belgilash',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'O\'qildi deb belgilandi' },
        },
      },
    },
    '/notifications/read-all': {
      post: {
        tags: ['Notifications'],
        summary: 'Barcha bildirishnomalarni o\'qilgan deb belgilash',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Barchasi o\'qilgan qilindi' },
        },
      },
    },
    '/notifications/{id}': {
      delete: {
        tags: ['Notifications'],
        summary: 'Bildirishnomani o\'chirish',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'O\'chirildi' } },
      },
    },

    // ------------------------------------------------------------
    // SETTINGS (SOZLAMALAR)
    // ------------------------------------------------------------
    '/settings': {
      get: {
        tags: ['Settings'],
        summary: 'Tizim sozlamalarini olish',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Tizim konfiguratsiyasi',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
      put: {
        tags: ['Settings'],
        summary: 'Tizim sozlamalarini yangilash',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' } } },
        },
        responses: {
          200: { description: 'Sozlamalar yangilandi' },
        },
      },
    },

    // ------------------------------------------------------------
    // AUDIT LOG (AUDIT JURNALI)
    // ------------------------------------------------------------
    '/audit-log': {
      get: {
        tags: ['Audit'],
        summary: 'Tizim amallari auditi ro\'yxati',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      userId: { type: 'string' },
                      action: { type: 'string' },
                      module: { type: 'string' },
                      details: { type: 'string' },
                      ipAddress: { type: 'string' },
                      timestamp: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ------------------------------------------------------------
    // SYSTEM HEALTH & UTILITIES
    // ------------------------------------------------------------
    '/health': {
      get: {
        tags: ['System'],
        summary: 'API server holati va vaqtini tekshirish (Health Check)',
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', example: '2026-10-08T16:20:00.000Z' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { background-color: #1e3a8a; }
    .swagger-ui .topbar .download-url-wrapper { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { color: #1e3a8a; }
    .swagger-ui .scheme-container { background: #f8fafc; padding: 15px; border-radius: 8px; }
  `,
  customSiteTitle: 'AKM / KBT API Dokumentatsiyasi (Swagger UI)',
};

export function setupSwagger(app) {
  // JSON formatdagi OpenAPI sxemasi
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Swagger UI sahifasi (/api/docs va /docs)
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  app.use('/docs', (req, res) => res.redirect('/api/docs'));
}
