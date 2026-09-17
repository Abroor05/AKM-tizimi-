import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api, authApi, getToken, setToken, STORAGE_TO_API } from '../utils/api.js';
import { generateId } from '../utils/helpers.js';
import { STORAGE_KEYS, ROLE_PERMISSIONS, DEFAULT_SETTINGS } from '../data/constants.js';

const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [initialized, setInitializedState] = useState(false);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);
  const [collections, setCollections] = useState({});
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const collectionsRef = useRef({});

  // Keep ref in sync with state for synchronous reads
  useEffect(() => { collectionsRef.current = collections; }, [collections]);

  // --- Load all data from API ---
  const loadAllData = useCallback(async () => {
    const endpoints = [
      [STORAGE_KEYS.USERS, 'users'],
      [STORAGE_KEYS.LIBRARIES, 'libraries'],
      [STORAGE_KEYS.BOOKS, 'books'],
      [STORAGE_KEYS.READERS, 'readers'],
      [STORAGE_KEYS.ACTIVITIES, 'activities'],
      [STORAGE_KEYS.REPORTS, 'reports'],
      [STORAGE_KEYS.TASKS, 'tasks'],
      [STORAGE_KEYS.EVENTS, 'events'],
      [STORAGE_KEYS.INVENTORY, 'inventory'],
      [STORAGE_KEYS.DOCUMENTS, 'documents'],
      [STORAGE_KEYS.APPEALS, 'appeals'],
      [STORAGE_KEYS.NOTIFICATIONS, 'notifications'],
      [STORAGE_KEYS.KPI_DATA, 'kpi-data'],
      [STORAGE_KEYS.AUDIT_LOG, 'audit-log'],
    ];

    const results = await Promise.allSettled(
      endpoints.map(([_, ep]) => api.get(ep))
    );

    const newCollections = {};
    endpoints.forEach(([key, _], i) => {
      newCollections[key] = results[i].status === 'fulfilled' ? results[i].value : [];
    });

    setCollections(newCollections);
    collectionsRef.current = newCollections;

    // Load settings
    try {
      const settingsData = await api.get('settings');
      setSettings(settingsData);
    } catch { /* keep defaults */ }
  }, []);

  // --- Initialize: check token and restore session, or check bootstrap ---
  useEffect(() => {
    const token = getToken();
    if (token) {
      authApi.me()
        .then(async ({ user }) => {
          if (getToken() !== token) {
            setInitializedState(true);
            return;
          }
          setCurrentUser(user);
          await loadAllData();
          setInitializedState(true);
        })
        .catch(async () => {
          if (getToken() !== token) {
            setInitializedState(true);
            return;
          }
          setToken(null);
          // Token invalid — check if bootstrap is needed, otherwise auto-login
          try {
            const check = await authApi.bootstrapCheck();
            if (check.needsBootstrap) {
              setNeedsBootstrap(true);
            } else {
              const { token: newToken, user } = await authApi.login('admin', 'admin123');
              setToken(newToken);
              setCurrentUser(user);
              await loadAllData();
            }
          } catch { /* server down — show login */ }
          setInitializedState(true);
        });
    } else {
      // No token — check if bootstrap is needed, otherwise auto-login
      authApi.bootstrapCheck()
        .then(async (check) => {
          if (check.needsBootstrap) {
            setNeedsBootstrap(true);
          } else {
            // Auto-login with default credentials (bypass login page)
            try {
              const { token, user } = await authApi.login('admin', 'admin123');
              setToken(token);
              setCurrentUser(user);
              await loadAllData();
            } catch {
              // Auto-login failed — show login page
            }
          }
          setInitializedState(true);
        })
        .catch(() => {
          setInitializedState(true);
        });
    }
  }, []);

  // --- Bootstrap: create first admin ---
  const bootstrap = useCallback(async (data) => {
    try {
      const { token, user } = await authApi.bootstrap(data);
      setToken(token);
      setCurrentUser(user);
      await loadAllData();
      setNeedsBootstrap(false);
      return { success: true, user };
    } catch (err) {
      return { success: false, message: err.message || 'Sozlama xatosi' };
    }
  }, [loadAllData]);

  // --- Helper: update collection in state ---
  const updateCollection = useCallback((key, updater) => {
    setCollections(prev => {
      const current = prev[key] || [];
      const updated = typeof updater === 'function' ? updater(current) : updater;
      return { ...prev, [key]: updated };
    });
  }, []);

  // --- AUTH ---
  const login = useCallback(async (username, password) => {
    try {
      const { token, user } = await authApi.login(username, password);
      setToken(token);
      setCurrentUser(user);
      await loadAllData();
      return { success: true, user };
    } catch (err) {
      return { success: false, message: err.message || 'Login yoki parol noto\'g\'ri!' };
    }
  }, [loadAllData]);

  const logout = useCallback(async () => {
    await authApi.logout();
    setToken(null);
    setCurrentUser(null);
    setCollections({});
    collectionsRef.current = {};
  }, []);

  const hasPermission = useCallback((permission) => {
    if (!currentUser) return false;
    const perms = ROLE_PERMISSIONS[currentUser.role] || [];
    return perms.includes(permission);
  }, [currentUser]);

  const isRole = useCallback((...roles) => {
    if (!currentUser) return false;
    return roles.includes(currentUser.role);
  }, [currentUser]);

  // --- AUDIT LOG ---
  const addAuditLog = useCallback((userId, action, module, details) => {
    // Fire and forget - API creates the audit log
    api.create('audit-log', { userId, action, module, details }).catch(() => {});
    // Also update local state for immediate display
    const newLog = {
      id: generateId('log'),
      userId, action, module, details,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
    };
    updateCollection(STORAGE_KEYS.AUDIT_LOG, (logs) => [newLog, ...(logs || [])]);
  }, [updateCollection]);

  // --- Generic CRUD factory (optimistic + API) ---
  const createEntity = useCallback((storageKey, entity, userId = null, action = null, module = null) => {
    const apiEndpoint = STORAGE_TO_API[storageKey];
    const newItem = { ...entity, id: entity.id || generateId('ent'), createdAt: entity.createdAt || new Date().toISOString() };
    // Optimistic update
    updateCollection(storageKey, (items) => [newItem, ...(items || [])]);
    // API call
    if (apiEndpoint) {
      api.create(apiEndpoint, entity).catch(err => {
        console.error('Create failed:', err);
      });
    }
    if (userId && action) {
      addAuditLog(userId, action, module || 'unknown', `${action}: ${newItem.id}`);
    }
    return newItem;
  }, [updateCollection, addAuditLog]);

  const updateEntity = useCallback((storageKey, id, updates, userId = null, action = null, module = null) => {
    const apiEndpoint = STORAGE_TO_API[storageKey];
    // Optimistic update
    updateCollection(storageKey, (items) =>
      (items || []).map(item => item.id === id ? { ...item, ...updates } : item)
    );
    // API call
    if (apiEndpoint) {
      api.update(apiEndpoint, id, updates).catch(err => {
        console.error('Update failed:', err);
      });
    }
    if (userId && action) {
      addAuditLog(userId, action, module || 'unknown', `${action}: ${id}`);
    }
    const items = collectionsRef.current[storageKey] || [];
    return items.find(i => i.id === id);
  }, [updateCollection, addAuditLog]);

  const deleteEntity = useCallback((storageKey, id, userId = null, action = null, module = null) => {
    const apiEndpoint = STORAGE_TO_API[storageKey];
    // Optimistic update
    updateCollection(storageKey, (items) => (items || []).filter(item => item.id !== id));
    // API call
    if (apiEndpoint) {
      api.remove(apiEndpoint, id).catch(err => {
        console.error('Delete failed:', err);
      });
    }
    if (userId && action) {
      addAuditLog(userId, action, module || 'unknown', `${action}: ${id}`);
    }
  }, [updateCollection, addAuditLog]);

  // --- State-based getCollection (replaces localStorage) ---
  const getCollection = useCallback((key) => collectionsRef.current[key] || [], []);
  const saveCollection = useCallback((key, data) => updateCollection(key, data), [updateCollection]);

  // --- USERS ---
  const getUsers = useCallback(() => getCollection(STORAGE_KEYS.USERS), [getCollection]);

  const createUser = useCallback(async (user) => {
    try {
      const newUser = await api.create('users', user);
      updateCollection(STORAGE_KEYS.USERS, (users) => [...(users || []), newUser]);
      return newUser;
    } catch (err) {
      console.error('Create user failed:', err);
      throw err;
    }
  }, [updateCollection]);

  const updateUser = useCallback(async (id, updates) => {
    try {
      const updated = await api.update('users', id, updates);
      updateCollection(STORAGE_KEYS.USERS, (users) =>
        (users || []).map(u => u.id === id ? updated : u)
      );
      // If updating self, refresh current user
      if (currentUser && currentUser.id === id) {
        setCurrentUser(updated);
      }
      return updated;
    } catch (err) {
      console.error('Update user failed:', err);
      throw err;
    }
  }, [currentUser, updateCollection]);

  const deleteUser = useCallback(async (id) => {
    try {
      await api.remove('users', id);
      updateCollection(STORAGE_KEYS.USERS, (users) => (users || []).filter(u => u.id !== id));
    } catch (err) {
      console.error('Delete user failed:', err);
      throw err;
    }
  }, [updateCollection]);

  const resetPassword = useCallback(async (id, newPassword) => {
    try {
      await api.action('users', id, 'reset-password', { newPassword });
    } catch (err) {
      console.error('Reset password failed:', err);
      throw err;
    }
  }, []);

  // --- REPORTS ---
  const getReports = useCallback(() => getCollection(STORAGE_KEYS.REPORTS), [getCollection]);

  const createReport = useCallback(async (report) => {
    try {
      const newReport = await api.create('reports', {
        ...report,
        userId: currentUser?.id,
        viloyatId: currentUser?.viloyatId,
        tumanId: currentUser?.tumanId,
        libraryId: currentUser?.libraryId,
      });
      updateCollection(STORAGE_KEYS.REPORTS, (reports) => [newReport, ...(reports || [])]);
      return newReport;
    } catch (err) {
      console.error('Create report failed:', err);
      throw err;
    }
  }, [currentUser, updateCollection]);

  const submitReport = useCallback(async (id) => {
    try {
      const updated = await api.action('reports', id, 'submit');
      updateCollection(STORAGE_KEYS.REPORTS, (reports) =>
        (reports || []).map(r => r.id === id ? updated : r)
      );
      return updated;
    } catch (err) {
      console.error('Submit report failed:', err);
      throw err;
    }
  }, [updateCollection]);

  const reviewReport = useCallback(async (id, action, comment = '') => {
    try {
      const updated = await api.action('reports', id, 'review', { action, comment });
      updateCollection(STORAGE_KEYS.REPORTS, (reports) =>
        (reports || []).map(r => r.id === id ? updated : r)
      );
      return updated;
    } catch (err) {
      console.error('Review report failed:', err);
      throw err;
    }
  }, [updateCollection]);

  // --- TASKS ---
  const getTasks = useCallback(() => getCollection(STORAGE_KEYS.TASKS), [getCollection]);

  const createTask = useCallback(async (task) => {
    try {
      const newTask = await api.create('tasks', task);
      updateCollection(STORAGE_KEYS.TASKS, (tasks) => [newTask, ...(tasks || [])]);
      return newTask;
    } catch (err) {
      console.error('Create task failed:', err);
      throw err;
    }
  }, [updateCollection]);

  const updateTaskStatus = useCallback(async (id, status) => {
    try {
      const updated = await api.action('tasks', id, 'status', { status });
      updateCollection(STORAGE_KEYS.TASKS, (tasks) =>
        (tasks || []).map(t => t.id === id ? updated : t)
      );
      return updated;
    } catch (err) {
      console.error('Update task status failed:', err);
      throw err;
    }
  }, [updateCollection]);

  // --- NOTIFICATIONS ---
  const getNotifications = useCallback(() => {
    if (!currentUser) return [];
    return getCollection(STORAGE_KEYS.NOTIFICATIONS);
  }, [currentUser, getCollection]);

  const getUnreadCount = useCallback(() => {
    return getNotifications().filter(n => !n.read).length;
  }, [getNotifications]);

  const markNotificationRead = useCallback(async (id) => {
    // Optimistic
    updateCollection(STORAGE_KEYS.NOTIFICATIONS, (all) =>
      (all || []).map(n => n.id === id ? { ...n, read: true } : n)
    );
    try {
      await api.action('notifications', id, 'read');
    } catch (err) {
      console.error('Mark read failed:', err);
    }
  }, [updateCollection]);

  const markAllRead = useCallback(async () => {
    // Optimistic
    updateCollection(STORAGE_KEYS.NOTIFICATIONS, (all) =>
      (all || []).map(n => ({ ...n, read: true }))
    );
    try {
      await api.collectionAction('notifications', 'read-all');
    } catch (err) {
      console.error('Mark all read failed:', err);
    }
  }, [updateCollection]);

  // --- SETTINGS ---
  const getSettings = useCallback(() => settings, [settings]);

  const updateSettings = useCallback(async (updates) => {
    setSettings(prev => ({ ...prev, ...updates }));
    try {
      await api.raw('/settings', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error('Update settings failed:', err);
    }
  }, []);

  // --- RESET ALL DATA ---
  const resetAllData = useCallback(async () => {
    try {
      await api.raw('/reset', { method: 'POST' });
      setToken(null);
      setCurrentUser(null);
      window.location.reload();
    } catch (err) {
      console.error('Reset failed:', err);
      window.location.reload();
    }
  }, []);

  const value = {
    // State
    currentUser,
    initialized,
    needsBootstrap,

    // Auth
    login,
    logout,
    bootstrap,
    hasPermission,
    isRole,

    // CRUD factory
    createEntity,
    updateEntity,
    deleteEntity,
    getCollection,
    saveCollection,

    // Users
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    resetPassword,

    // Reports
    getReports,
    createReport,
    submitReport,
    reviewReport,

    // Tasks
    getTasks,
    createTask,
    updateTaskStatus,

    // Notifications
    getNotifications,
    getUnreadCount,
    markNotificationRead,
    markAllRead,

    // Settings
    getSettings,
    updateSettings,

    // Audit
    addAuditLog,

    // Reset
    resetAllData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
