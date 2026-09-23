import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api, authApi, getToken, setToken, getCachedUser, setCachedUser, STORAGE_TO_API } from '../utils/api.js';
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

  // --- Initialize: restore session from localStorage, verify token ---
  useEffect(() => {
    // 1. Immediately restore cached user for instant UI (no flash)
    const cachedUser = getCachedUser();
    const token = getToken();

    if (cachedUser && token) {
      // Show cached user immediately while verifying
      setCurrentUser(cachedUser);
    }

    // 2. Verify token with backend
    if (token) {
      authApi.me()
        .then(async ({ user }) => {
          if (getToken() !== token) {
            setInitializedState(true);
            return;
          }
          // Token valid — update with fresh user data
          setCurrentUser(user);
          setCachedUser(user);
          await loadAllData();
          setInitializedState(true);
        })
        .catch(() => {
          if (getToken() !== token) {
            setInitializedState(true);
            return;
          }
          // Token expired/invalid — clear and show login
          setToken(null);
          setCachedUser(null);
          setCurrentUser(null);
          // Check if bootstrap is needed
          authApi.bootstrapCheck()
            .then((check) => { setNeedsBootstrap(check.needsBootstrap); })
            .catch(() => {})
            .finally(() => setInitializedState(true));
        });
    } else {
      // No token — check if bootstrap is needed, otherwise show login
      authApi.bootstrapCheck()
        .then((check) => {
          setNeedsBootstrap(check.needsBootstrap);
          setInitializedState(true);
        })
        .catch(() => {
          setInitializedState(true);
        });
    }
  }, []);

  // --- Poll for new notifications every 15s (so admin sees report notifications without refresh) ---
  useEffect(() => {
    if (!currentUser) return;
    const pollNotifications = async () => {
      try {
        const fresh = await api.get('notifications');
        setCollections(prev => ({ ...prev, [STORAGE_KEYS.NOTIFICATIONS]: fresh }));
      } catch (err) {
        // silent — backend might be briefly unavailable
      }
    };
    const interval = setInterval(pollNotifications, 15000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // --- Bootstrap: create first admin ---
  const bootstrap = useCallback(async (data) => {
    try {
      const { token, user } = await authApi.bootstrap(data);
      setToken(token);
      setCachedUser(user);
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
      setCachedUser(user);
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
    setCachedUser(null);
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
      api.create(apiEndpoint, newItem).catch(err => {
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

  // --- State-based getCollection (reactive — triggers re-render when data changes) ---
  const getCollection = useCallback((key) => collections[key] || [], [collections]);
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
      // If updating self, refresh current user + cached user
      if (currentUser && currentUser.id === id) {
        setCurrentUser(updated);
        setCachedUser(updated);
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

  // --- Helper: create notification (API + optimistic state update) ---
  const createNotification = useCallback(async (notif) => {
    const tempId = 'tmp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const newNotif = {
      type: notif.type || 'info',
      title: notif.title || '',
      message: notif.message || '',
      targetRole: notif.targetRole || null,
      targetUserId: notif.targetUserId || null,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      read: false,
    };
    // Optimistic update — insert with temp ID
    updateCollection(STORAGE_KEYS.NOTIFICATIONS, (all) => [{ ...newNotif, id: tempId }, ...(all || [])]);
    // API call — replace temp with real on success
    try {
      const created = await api.create('notifications', newNotif);
      updateCollection(STORAGE_KEYS.NOTIFICATIONS, (all) =>
        (all || []).map(n => n.id === tempId ? created : n)
      );
    } catch (err) {
      console.error('Create notification failed:', err);
      // Remove the temp notification on failure
      updateCollection(STORAGE_KEYS.NOTIFICATIONS, (all) =>
        (all || []).filter(n => n.id !== tempId)
      );
    }
  }, [updateCollection]);

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
      // Notify admins about new report
      await createNotification({
        type: 'report',
        title: 'Yangi hisobot yaratildi',
        message: `"${newReport.title || 'Nomsiz'}" hisoboti ${currentUser?.fullName || ''} tomonidan yaratildi`,
        targetRole: 'super_admin',
      });
      return newReport;
    } catch (err) {
      console.error('Create report failed:', err);
      throw err;
    }
  }, [currentUser, updateCollection, createNotification]);

  const submitReport = useCallback(async (id) => {
    try {
      const updated = await api.action('reports', id, 'submit');
      updateCollection(STORAGE_KEYS.REPORTS, (reports) =>
        (reports || []).map(r => r.id === id ? updated : r)
      );
      // Notify admins about submitted report
      await createNotification({
        type: 'report',
        title: 'Hisobot yuborildi',
        message: `"${updated.title || 'Nomsuz'}" hisoboti ko'rib chiqish uchun yuborildi`,
        targetRole: 'super_admin',
      });
      return updated;
    } catch (err) {
      console.error('Submit report failed:', err);
      throw err;
    }
  }, [updateCollection, createNotification]);

  const reviewReport = useCallback(async (id, action, comment = '') => {
    try {
      const updated = await api.action('reports', id, 'review', { action, comment });
      updateCollection(STORAGE_KEYS.REPORTS, (reports) =>
        (reports || []).map(r => r.id === id ? updated : r)
      );
      // Notify report creator about review result
      if (updated.userId) {
        await createNotification({
          type: action === 'approve' ? 'success' : 'warning',
          title: action === 'approve' ? 'Hisobot tasdiqlandi' : 'Hisobot rad etildi',
          message: `"${updated.title || 'Nomsuz'}" hisobingiz ${action === 'approve' ? 'tasdiqlandi' : 'rad etildi'}${comment ? ': ' + comment : ''}`,
          targetUserId: updated.userId,
        });
      }
      return updated;
    } catch (err) {
      console.error('Review report failed:', err);
      throw err;
    }
  }, [updateCollection, createNotification]);

  // --- TASKS ---
  const getTasks = useCallback(() => getCollection(STORAGE_KEYS.TASKS), [getCollection]);

  const createTask = useCallback(async (task) => {
    try {
      const newTask = await api.create('tasks', task);
      updateCollection(STORAGE_KEYS.TASKS, (tasks) => [newTask, ...(tasks || [])]);
      // Notify assigned user
      if (newTask.assignedTo) {
        await createNotification({
          type: 'task',
          title: 'Yangi topshiriq',
          message: `"${newTask.title}" topshirig'i sizga biriktirildi`,
          targetUserId: newTask.assignedTo,
        });
      }
      return newTask;
    } catch (err) {
      console.error('Create task failed:', err);
      throw err;
    }
  }, [updateCollection, createNotification]);

  const updateTaskStatus = useCallback(async (id, status) => {
    try {
      const updated = await api.action('tasks', id, 'status', { status });
      updateCollection(STORAGE_KEYS.TASKS, (tasks) =>
        (tasks || []).map(t => t.id === id ? updated : t)
      );
      // Notify task creator about completion
      if (status === 'completed' && updated.assignedBy) {
        await createNotification({
          type: 'success',
          title: 'Topshiriq bajarildi',
          message: `"${updated.title}" topshirig'i bajarildi`,
          targetUserId: updated.assignedBy,
        });
      }
      return updated;
    } catch (err) {
      console.error('Update task status failed:', err);
      throw err;
    }
  }, [updateCollection, createNotification]);

  // --- NOTIFICATIONS (client-side filter: only show notifications targeted at current user) ---
  const getNotifications = useCallback(() => {
    if (!currentUser) return [];
    const all = getCollection(STORAGE_KEYS.NOTIFICATIONS);
    return all.filter(n =>
      (!n.targetUserId && !n.targetRole) ||          // broadcast to everyone
      n.targetUserId === currentUser.id ||            // targeted at this user
      n.targetRole === currentUser.role               // targeted at this role
    );
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
      setCachedUser(null);
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
    createNotification,

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
