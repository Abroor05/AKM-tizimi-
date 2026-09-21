// ============================================================
// API CLIENT - Fetch wrapper for backend API
// ============================================================

// Use deployed backend URL if available, otherwise fall back to Vite proxy (/api)
const API_BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'kbt_token';
const USER_KEY = 'kbt_user';
const LAST_ROUTE_KEY = 'kbt_last_route';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getCachedUser() {
  try {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

export function setCachedUser(user) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

export function getLastRoute() {
  try {
    const route = localStorage.getItem(LAST_ROUTE_KEY);
    return route && route.startsWith('/') ? route : '/dashboard';
  } catch {
    return '/dashboard';
  }
}

export function setLastRoute(route) {
  if (!route || !route.startsWith('/')) return;
  try {
    localStorage.setItem(LAST_ROUTE_KEY, route);
  } catch {
    // ignore storage failures
  }
}

// --- Core fetch wrapper ---
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // Handle 401 - token expired or invalid
  if (res.status === 401) {
    setToken(null);
    const redirect = encodeURIComponent(window.location.pathname || '/dashboard');
    if (!window.location.pathname.includes('/login')) {
      window.location.href = `/login?redirect=${redirect}`;
    }
    throw new Error('Avtorizatsiya talab qilinadi');
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || 'Server xatosi');
  }

  return data;
}

// --- Generic CRUD methods ---
export const api = {
  // GET /api/{endpoint}
  get(endpoint) {
    return apiFetch(`/${endpoint}`);
  },

  // GET /api/{endpoint}/{id}
  getById(endpoint, id) {
    return apiFetch(`/${endpoint}/${id}`);
  },

  // POST /api/{endpoint}
  create(endpoint, data) {
    return apiFetch(`/${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // PUT /api/{endpoint}/{id}
  update(endpoint, id, data) {
    return apiFetch(`/${endpoint}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // PATCH /api/{endpoint}/{id}
  patch(endpoint, id, data) {
    return apiFetch(`/${endpoint}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // DELETE /api/{endpoint}/{id}
  remove(endpoint, id) {
    return apiFetch(`/${endpoint}/${id}`, {
      method: 'DELETE',
    });
  },

  // POST /api/{endpoint}/{id}/{action}
  action(endpoint, id, action, data = {}) {
    return apiFetch(`/${endpoint}/${id}/${action}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // POST /api/{endpoint}/{action} (for collection-level actions like read-all)
  collectionAction(endpoint, action, data = {}) {
    return apiFetch(`/${endpoint}/${action}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Raw fetch for special cases
  raw: apiFetch,
};

// --- Auth methods ---
export const authApi = {
  login(username, password) {
    return apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  logout() {
    return apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
  },

  me() {
    return apiFetch('/auth/me');
  },

  register(data) {
    return apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  bootstrapCheck() {
    return apiFetch('/auth/bootstrap-check');
  },

  bootstrap(data) {
    return apiFetch('/auth/bootstrap', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// --- Mapping: STORAGE_KEYS -> API endpoint ---
import { STORAGE_KEYS } from '../data/constants.js';

export const STORAGE_TO_API = {
  [STORAGE_KEYS.USERS]: 'users',
  [STORAGE_KEYS.LIBRARIES]: 'libraries',
  [STORAGE_KEYS.BOOKS]: 'books',
  [STORAGE_KEYS.READERS]: 'readers',
  [STORAGE_KEYS.ACTIVITIES]: 'activities',
  [STORAGE_KEYS.REPORTS]: 'reports',
  [STORAGE_KEYS.TASKS]: 'tasks',
  [STORAGE_KEYS.EVENTS]: 'events',
  [STORAGE_KEYS.INVENTORY]: 'inventory',
  [STORAGE_KEYS.DOCUMENTS]: 'documents',
  [STORAGE_KEYS.APPEALS]: 'appeals',
  [STORAGE_KEYS.NOTIFICATIONS]: 'notifications',
  [STORAGE_KEYS.KPI_DATA]: 'kpi-data',
  [STORAGE_KEYS.AUDIT_LOG]: 'audit-log',
};

export { apiFetch };
