// ============================================================
// KUTUBXONA BOSHQARUV TIZIMI - CONSTANTS & ENUMS
// ============================================================

// --- ROLES ---
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  VILOYAT_ADMIN: 'viloyat_admin',
  TUMAN_ADMIN: 'tuman_admin',
  KUTUBXONA_XODIMI: 'kutubxona_xodimi',
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.VILOYAT_ADMIN]: 'Viloyat Admini',
  [ROLES.TUMAN_ADMIN]: 'Tuman/Shahar Admini',
  [ROLES.KUTUBXONA_XODIMI]: 'Kutubxona Xodimi',
};

export const ROLE_COLORS = {
  [ROLES.SUPER_ADMIN]: 'red',
  [ROLES.VILOYAT_ADMIN]: 'purple',
  [ROLES.TUMAN_ADMIN]: 'blue',
  [ROLES.KUTUBXONA_XODIMI]: 'green',
};

export const DEFAULT_SETTINGS = {
  systemName: 'Kutubxona Boshqaruv Tizimi',
  systemVersion: '1.0.0',
  organization: '',
  language: 'uz',
  theme: 'light',
  itemsPerPage: 20,
  enableNotifications: true,
  enableAuditLog: true,
  sessionTimeout: 60,
  passwordMinLength: 6,
};

// Explicit Tailwind class strings (required for JIT - no dynamic class names)
export const AVATAR_BG_CLASSES = {
  red: 'bg-red-100 text-red-600',
  purple: 'bg-purple-100 text-purple-600',
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  amber: 'bg-amber-100 text-amber-600',
  indigo: 'bg-indigo-100 text-indigo-600',
};

export const BADGE_BG_CLASSES = {
  red: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  indigo: 'bg-indigo-100 text-indigo-700',
};

export function avatarClass(roleColor) {
  return AVATAR_BG_CLASSES[roleColor] || AVATAR_BG_CLASSES.blue;
}

export function badgeClass(roleColor) {
  return BADGE_BG_CLASSES[roleColor] || BADGE_BG_CLASSES.blue;
}

// --- PERMISSIONS ---
export const PERMISSIONS = {
  // Dashboard
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_ALL_REGIONS: 'view_all_regions',
  VIEW_OWN_REGION: 'view_own_region',
  VIEW_OWN_DISTRICT: 'view_own_district',
  VIEW_OWN_LIBRARY: 'view_own_library',

  // Library management
  MANAGE_LIBRARIES: 'manage_libraries',
  VIEW_LIBRARIES: 'view_libraries',

  // Daily activity
  CREATE_ACTIVITY: 'create_activity',
  VIEW_ACTIVITIES: 'view_activities',
  APPROVE_ACTIVITY: 'approve_activity',

  // Reports
  CREATE_REPORT: 'create_report',
  VIEW_REPORTS: 'view_reports',
  REVIEW_REPORT: 'review_report',
  APPROVE_REPORT: 'approve_report',
  REJECT_REPORT: 'reject_report',

  // Tasks
  CREATE_TASK: 'create_task',
  VIEW_TASKS: 'view_tasks',
  ASSIGN_TASK: 'assign_task',
  COMPLETE_TASK: 'complete_task',

  // Books
  MANAGE_BOOKS: 'manage_books',
  VIEW_BOOKS: 'view_books',

  // Readers
  MANAGE_READERS: 'manage_readers',
  VIEW_READERS: 'view_readers',

  // Events
  MANAGE_EVENTS: 'manage_events',
  VIEW_EVENTS: 'view_events',

  // Inventory
  MANAGE_INVENTORY: 'manage_inventory',
  VIEW_INVENTORY: 'view_inventory',

  // Documents
  MANAGE_DOCUMENTS: 'manage_documents',
  VIEW_DOCUMENTS: 'view_documents',

  // Appeals
  MANAGE_APPEALS: 'manage_appeals',
  VIEW_APPEALS: 'view_appeals',

  // Notifications
  MANAGE_NOTIFICATIONS: 'manage_notifications',
  VIEW_NOTIFICATIONS: 'view_notifications',

  // KPI
  VIEW_KPI: 'view_kpi',
  MANAGE_KPI: 'manage_kpi',

  // Statistics
  VIEW_STATISTICS: 'view_statistics',

  // Analytics
  VIEW_ANALYTICS: 'view_analytics',

  // Map
  VIEW_MAP: 'view_map',

  // Users
  MANAGE_USERS: 'manage_users',
  VIEW_USERS: 'view_users',

  // Roles
  MANAGE_ROLES: 'manage_roles',

  // Audit
  VIEW_AUDIT: 'view_audit',

  // Security
  MANAGE_SECURITY: 'manage_security',

  // Settings
  MANAGE_SETTINGS: 'manage_settings',
};

// --- ROLE-PERMISSION MATRIX ---
export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),

  [ROLES.VILOYAT_ADMIN]: Object.values(PERMISSIONS),

  [ROLES.TUMAN_ADMIN]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_OWN_DISTRICT,
    PERMISSIONS.VIEW_LIBRARIES,
    PERMISSIONS.VIEW_ACTIVITIES,
    PERMISSIONS.APPROVE_ACTIVITY,
    PERMISSIONS.CREATE_REPORT,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.VIEW_TASKS,
    PERMISSIONS.ASSIGN_TASK,
    PERMISSIONS.VIEW_BOOKS,
    PERMISSIONS.VIEW_READERS,
    PERMISSIONS.VIEW_EVENTS,
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.VIEW_APPEALS,
    PERMISSIONS.VIEW_NOTIFICATIONS,
    PERMISSIONS.VIEW_KPI,
    PERMISSIONS.VIEW_STATISTICS,
    PERMISSIONS.VIEW_MAP,
    PERMISSIONS.VIEW_USERS,
  ],

  [ROLES.KUTUBXONA_XODIMI]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_OWN_LIBRARY,
    PERMISSIONS.CREATE_ACTIVITY,
    PERMISSIONS.VIEW_ACTIVITIES,
    PERMISSIONS.CREATE_REPORT,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_TASKS,
    PERMISSIONS.COMPLETE_TASK,
    PERMISSIONS.MANAGE_BOOKS,
    PERMISSIONS.VIEW_BOOKS,
    PERMISSIONS.MANAGE_READERS,
    PERMISSIONS.VIEW_READERS,
    PERMISSIONS.MANAGE_EVENTS,
    PERMISSIONS.VIEW_EVENTS,
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.VIEW_APPEALS,
    PERMISSIONS.VIEW_NOTIFICATIONS,
    PERMISSIONS.VIEW_KPI,
    PERMISSIONS.VIEW_STATISTICS,
  ],
};

// --- SIDEBAR MENU ---
export const MENU_ITEMS = [
  { id: 'dashboard', label: 'Boshqaruv paneli', icon: 'dashboard', permission: PERMISSIONS.VIEW_DASHBOARD },
  { id: 'libraries', label: 'AKM / Kutubxonalar', icon: 'library', permission: PERMISSIONS.VIEW_LIBRARIES },
  { id: 'daily-activity', label: 'Kunlik faoliyat', icon: 'activity', permission: PERMISSIONS.VIEW_ACTIVITIES },
  { id: 'reports', label: 'Hisobotlar', icon: 'reports', permission: PERMISSIONS.VIEW_REPORTS },
  { id: 'tasks', label: 'Topshiriqlar', icon: 'tasks', permission: PERMISSIONS.VIEW_TASKS },
  { id: 'books', label: 'Kitob fondi', icon: 'books', permission: PERMISSIONS.VIEW_BOOKS },
  { id: 'readers', label: 'Kitobxonlar', icon: 'readers', permission: PERMISSIONS.VIEW_READERS },
  { id: 'events', label: 'Tadbirlar', icon: 'events', permission: PERMISSIONS.VIEW_EVENTS },
  { id: 'inventory', label: 'Inventarlar', icon: 'inventory', permission: PERMISSIONS.VIEW_INVENTORY },
  { id: 'documents', label: 'Hujjatlar', icon: 'documents', permission: PERMISSIONS.VIEW_DOCUMENTS },
  { id: 'appeals', label: 'Murojaatlar', icon: 'appeals', permission: PERMISSIONS.VIEW_APPEALS },
  { id: 'notifications', label: 'Bildirishnomalar', icon: 'notifications', permission: PERMISSIONS.VIEW_NOTIFICATIONS },
  { id: 'kpi', label: 'KPI va Reyting', icon: 'kpi', permission: PERMISSIONS.VIEW_KPI },
  { id: 'statistics', label: 'Statistika', icon: 'statistics', permission: PERMISSIONS.VIEW_STATISTICS },
  { id: 'analytics', label: 'BI Analytics', icon: 'analytics', permission: PERMISSIONS.VIEW_ANALYTICS },
  { id: 'map', label: 'Xarita', icon: 'map', permission: PERMISSIONS.VIEW_MAP },
  { id: 'users', label: 'Foydalanuvchilar', icon: 'users', permission: PERMISSIONS.VIEW_USERS },
  { id: 'roles', label: 'Rollar va Permissionlar', icon: 'roles', permission: PERMISSIONS.MANAGE_ROLES },
  { id: 'audit', label: 'Audit Log', icon: 'audit', permission: PERMISSIONS.VIEW_AUDIT },
  { id: 'security', label: 'Xavfsizlik', icon: 'security', permission: PERMISSIONS.MANAGE_SECURITY },
  { id: 'settings', label: 'Tizim sozlamalari', icon: 'settings', permission: PERMISSIONS.MANAGE_SETTINGS },
];

// --- REPORT TYPES ---
export const REPORT_TYPES = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  ANNUAL: 'annual',
  THEMATIC: 'thematic',
  FINANCIAL: 'financial',
  ACTIVITY: 'activity',
};

export const REPORT_TYPE_LABELS = {
  [REPORT_TYPES.MONTHLY]: 'Oylik hisobot',
  [REPORT_TYPES.QUARTERLY]: 'Choraklik hisobot',
  [REPORT_TYPES.ANNUAL]: 'Yillik hisobot',
  [REPORT_TYPES.THEMATIC]: 'Mavzuli hisobot',
  [REPORT_TYPES.FINANCIAL]: 'Moliyaviy hisobot',
  [REPORT_TYPES.ACTIVITY]: 'Faoliyat hisoboti',
};

// --- REPORT STATUS ---
export const REPORT_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const REPORT_STATUS_LABELS = {
  [REPORT_STATUS.DRAFT]: 'Qoralama',
  [REPORT_STATUS.SUBMITTED]: 'Yuborilgan',
  [REPORT_STATUS.UNDER_REVIEW]: 'Ko\'rib chiqilmoqda',
  [REPORT_STATUS.APPROVED]: 'Tasdiqlangan',
  [REPORT_STATUS.REJECTED]: 'Rad etilgan',
};

export const REPORT_STATUS_COLORS = {
  [REPORT_STATUS.DRAFT]: 'gray',
  [REPORT_STATUS.SUBMITTED]: 'blue',
  [REPORT_STATUS.UNDER_REVIEW]: 'amber',
  [REPORT_STATUS.APPROVED]: 'green',
  [REPORT_STATUS.REJECTED]: 'red',
};

// --- TASK PRIORITY ---
export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

export const TASK_PRIORITY_LABELS = {
  [TASK_PRIORITY.LOW]: 'Past',
  [TASK_PRIORITY.MEDIUM]: "O'rta",
  [TASK_PRIORITY.HIGH]: 'Yuqori',
  [TASK_PRIORITY.URGENT]: 'Shoshilinch',
};

export const TASK_PRIORITY_COLORS = {
  [TASK_PRIORITY.LOW]: 'gray',
  [TASK_PRIORITY.MEDIUM]: 'blue',
  [TASK_PRIORITY.HIGH]: 'amber',
  [TASK_PRIORITY.URGENT]: 'red',
};

// --- TASK STATUS ---
export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
};

export const TASK_STATUS_LABELS = {
  [TASK_STATUS.PENDING]: "Kutilmoqda",
  [TASK_STATUS.IN_PROGRESS]: "Bajarilmoqda",
  [TASK_STATUS.COMPLETED]: "Bajarilgan",
  [TASK_STATUS.OVERDUE]: "Muddati o'tgan",
  [TASK_STATUS.CANCELLED]: "Bekor qilingan",
};

export const TASK_STATUS_COLORS = {
  [TASK_STATUS.PENDING]: 'gray',
  [TASK_STATUS.IN_PROGRESS]: 'blue',
  [TASK_STATUS.COMPLETED]: 'green',
  [TASK_STATUS.OVERDUE]: 'red',
  [TASK_STATUS.CANCELLED]: 'gray',
};

// --- BOOK CATEGORIES ---
export const BOOK_CATEGORIES = {
  FICTION: 'fiction',
  SCIENCE: 'science',
  HISTORY: 'history',
  CHILDREN: 'children',
  EDUCATION: 'education',
  RELIGIOUS: 'religious',
  REFERENCE: 'reference',
  PERIODICAL: 'periodical',
  OTHER: 'other',
};

export const BOOK_CATEGORY_LABELS = {
  [BOOK_CATEGORIES.FICTION]: 'Badiiy adabiyot',
  [BOOK_CATEGORIES.SCIENCE]: 'Ilmiy adabiyot',
  [BOOK_CATEGORIES.HISTORY]: 'Tarixiy adabiyot',
  [BOOK_CATEGORIES.CHILDREN]: 'Bolalar adabiyoti',
  [BOOK_CATEGORIES.EDUCATION]: "O'quv adabiyoti",
  [BOOK_CATEGORIES.RELIGIOUS]: 'Diniy adabiyot',
  [BOOK_CATEGORIES.REFERENCE]: "Ma'lumotnomalar",
  [BOOK_CATEGORIES.PERIODICAL]: 'Davriy nashrlar',
  [BOOK_CATEGORIES.OTHER]: 'Boshqa',
};

// --- BOOK STATUS ---
export const BOOK_STATUS = {
  AVAILABLE: 'available',
  BORROWED: 'borrowed',
  RESERVED: 'reserved',
  LOST: 'lost',
  REPAIR: 'repair',
  WRITTEN_OFF: 'written_off',
};

export const BOOK_STATUS_LABELS = {
  [BOOK_STATUS.AVAILABLE]: 'Mavjud',
  [BOOK_STATUS.BORROWED]: 'Berilgan',
  [BOOK_STATUS.RESERVED]: 'Zaxirada',
  [BOOK_STATUS.LOST]: 'Yo\'qolgan',
  [BOOK_STATUS.REPAIR]: 'Ta\'mirda',
  [BOOK_STATUS.WRITTEN_OFF]: 'Hisobdan olib tashlangan',
};

export const BOOK_STATUS_COLORS = {
  [BOOK_STATUS.AVAILABLE]: 'green',
  [BOOK_STATUS.BORROWED]: 'amber',
  [BOOK_STATUS.RESERVED]: 'blue',
  [BOOK_STATUS.LOST]: 'red',
  [BOOK_STATUS.REPAIR]: 'amber',
  [BOOK_STATUS.WRITTEN_OFF]: 'gray',
};

// --- READER STATUS ---
export const READER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BLOCKED: 'blocked',
};

export const READER_STATUS_LABELS = {
  [READER_STATUS.ACTIVE]: 'Faol',
  [READER_STATUS.INACTIVE]: 'Nofaol',
  [READER_STATUS.BLOCKED]: 'Bloklangan',
};

export const READER_STATUS_COLORS = {
  [READER_STATUS.ACTIVE]: 'green',
  [READER_STATUS.INACTIVE]: 'gray',
  [READER_STATUS.BLOCKED]: 'red',
};

// --- EVENT TYPES ---
export const EVENT_TYPES = {
  BOOK_PRESENTATION: 'book_presentation',
  READING_HOUR: 'reading_hour',
  MEETING: 'meeting',
  EXHIBITION: 'exhibition',
  COMPETITION: 'competition',
  TRAINING: 'training',
  OTHER: 'other',
};

export const EVENT_TYPE_LABELS = {
  [EVENT_TYPES.BOOK_PRESENTATION]: 'Kitob taqdimoti',
  [EVENT_TYPES.READING_HOUR]: "O'qish soati",
  [EVENT_TYPES.MEETING]: 'Uchrashuv',
  [EVENT_TYPES.EXHIBITION]: 'Ko\'rgazma',
  [EVENT_TYPES.COMPETITION]: 'Tanlov',
  [EVENT_TYPES.TRAINING]: "Trening/Seminar",
  [EVENT_TYPES.OTHER]: 'Boshqa',
};

// --- APPEAL STATUS ---
export const APPEAL_STATUS = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
};

export const APPEAL_STATUS_LABELS = {
  [APPEAL_STATUS.NEW]: 'Yangi',
  [APPEAL_STATUS.IN_PROGRESS]: "Ko'rib chiqilmoqda",
  [APPEAL_STATUS.RESOLVED]: 'Hal qilingan',
  [APPEAL_STATUS.CLOSED]: 'Yopilgan',
};

// --- NOTIFICATION TYPES ---
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  TASK: 'task',
  REPORT: 'report',
  APPEAL: 'appeal',
};

// --- INVENTORY TYPES ---
export const INVENTORY_TYPES = {
  FURNITURE: 'furniture',
  EQUIPMENT: 'equipment',
  COMPUTER: 'computer',
  BOOKSHELF: 'bookshelf',
  OTHER: 'other',
};

export const INVENTORY_TYPE_LABELS = {
  [INVENTORY_TYPES.FURNITURE]: 'Mebel',
  [INVENTORY_TYPES.EQUIPMENT]: 'Uskunalar',
  [INVENTORY_TYPES.COMPUTER]: 'Kompyuter texnikasi',
  [INVENTORY_TYPES.BOOKSHELF]: 'Kitob javonlari',
  [INVENTORY_TYPES.OTHER]: 'Boshqa',
};

// --- INVENTORY STATUS ---
export const INVENTORY_STATUS = {
  GOOD: 'good',
  NEEDS_REPAIR: 'needs_repair',
  BROKEN: 'broken',
  WRITTEN_OFF: 'written_off',
};

export const INVENTORY_STATUS_LABELS = {
  [INVENTORY_STATUS.GOOD]: "Yaxshi holatda",
  [INVENTORY_STATUS.NEEDS_REPAIR]: "Ta'mirga muhtoj",
  [INVENTORY_STATUS.BROKEN]: "Buzilgan",
  [INVENTORY_STATUS.WRITTEN_OFF]: "Hisobdan olib tashlangan",
};

export const INVENTORY_STATUS_COLORS = {
  [INVENTORY_STATUS.GOOD]: 'green',
  [INVENTORY_STATUS.NEEDS_REPAIR]: 'amber',
  [INVENTORY_STATUS.BROKEN]: 'red',
  [INVENTORY_STATUS.WRITTEN_OFF]: 'gray',
};

// --- KPI CATEGORIES ---
export const KPI_CATEGORIES = {
  SERVICE_QUALITY: 'service_quality',
  FUND_GROWTH: 'fund_growth',
  READER_GROWTH: 'reader_growth',
  EVENT_ACTIVITIES: 'event_activities',
  DIGITAL_SERVICES: 'digital_services',
};

export const KPI_CATEGORY_LABELS = {
  [KPI_CATEGORIES.SERVICE_QUALITY]: 'Xizmat ko\'rsatish sifati',
  [KPI_CATEGORIES.FUND_GROWTH]: 'Fond o\'sishi',
  [KPI_CATEGORIES.READER_GROWTH]: 'Kitobxonlar o\'sishi',
  [KPI_CATEGORIES.EVENT_ACTIVITIES]: 'Tadbir faolligi',
  [KPI_CATEGORIES.DIGITAL_SERVICES]: 'Raqamli xizmatlar',
};

// --- STORAGE KEYS ---
export const STORAGE_KEYS = {
  USERS: 'kbt_users',
  CURRENT_USER: 'kbt_current_user',
  LIBRARIES: 'kbt_libraries',
  BOOKS: 'kbt_books',
  READERS: 'kbt_readers',
  ACTIVITIES: 'kbt_activities',
  REPORTS: 'kbt_reports',
  TASKS: 'kbt_tasks',
  EVENTS: 'kbt_events',
  INVENTORY: 'kbt_inventory',
  DOCUMENTS: 'kbt_documents',
  APPEALS: 'kbt_appeals',
  NOTIFICATIONS: 'kbt_notifications',
  KPI_DATA: 'kbt_kpi_data',
  AUDIT_LOG: 'kbt_audit_log',
  SETTINGS: 'kbt_settings',
  INITIALIZED: 'kbt_initialized',
};
