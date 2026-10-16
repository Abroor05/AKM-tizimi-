import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api, authApi, getToken, setToken, getCachedUser, setCachedUser, STORAGE_TO_API } from '../utils/api.js';
import { generateId, formatDate } from '../utils/helpers.js';
import { STORAGE_KEYS, ROLE_PERMISSIONS, DEFAULT_SETTINGS, REPORT_TYPES, REPORT_STATUS } from '../data/constants.js';
import { toast } from './ToastContext.jsx';

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
      endpoints.map(([, ep]) => api.get(ep))
    );

    const newCollections = {};
    endpoints.forEach(([key], i) => {
      newCollections[key] = results[i].status === 'fulfilled' ? results[i].value : [];
    });

    setCollections(newCollections);
    collectionsRef.current = newCollections;

    // Load settings
    try {
      const settingsData = await api.get('settings');
      if (settingsData && typeof settingsData === 'object' && Object.keys(settingsData).length > 0) {
        setSettings(prev => ({ ...prev, ...settingsData }));
      }
    } catch { /* keep defaults */ }
  }, []);

  // --- Initialize: restore session from localStorage, verify token ---
  useEffect(() => {
    const initializeAuth = async () => {
      const cachedUser = getCachedUser();
      const token = getToken();

      if (cachedUser && cachedUser.id && token) {
        setCurrentUser(cachedUser);
      } else if (cachedUser || token) {
        setToken(null);
        setCachedUser(null);
        setCurrentUser(null);
      }

      try {
        if (token) {
          const { user } = await authApi.me();
          if (getToken() === token) {
            setCurrentUser(user);
            setCachedUser(user);
            await loadAllData();
          }
        } else {
          const check = await authApi.bootstrapCheck();
          setNeedsBootstrap(check.needsBootstrap);
        }
      } catch {
        if (getToken()) {
          setToken(null);
          setCachedUser(null);
          setCurrentUser(null);
        }

        try {
          const check = await authApi.bootstrapCheck();
          setNeedsBootstrap(check.needsBootstrap);
        } catch {
          // Keep login screen visible even if bootstrap check is temporarily unavailable.
        }
      } finally {
        setInitializedState(true);
      }
    };

    initializeAuth();
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
    const tempId = entity.id || generateId('ent');
    const newItem = { ...entity, id: tempId, createdAt: entity.createdAt || new Date().toISOString() };
    // Optimistic update — insert immediately for fast UI
    updateCollection(storageKey, (items) => [newItem, ...(items || [])]);
    // API call — replace temp item with server-confirmed item on success
    if (apiEndpoint) {
      api.create(apiEndpoint, newItem)
        .then(serverItem => {
          // Replace optimistic item with real server response (may have different id/fields)
          updateCollection(storageKey, (items) =>
            (items || []).map(item => item.id === tempId ? serverItem : item)
          );
        })
        .catch(err => {
          console.error('Create failed:', err);
          // Rollback: remove the optimistic item on failure
          updateCollection(storageKey, (items) =>
            (items || []).filter(item => item.id !== tempId)
          );
        });
    }
    if (userId && action) {
      addAuditLog(userId, action, module || 'unknown', `${action}: ${tempId}`);
    }
    return newItem;
  }, [updateCollection, addAuditLog]);

  const updateEntity = useCallback((storageKey, id, updates, userId = null, action = null, module = null) => {
    const apiEndpoint = STORAGE_TO_API[storageKey];
    // Save original for potential rollback
    const originalItems = collectionsRef.current[storageKey] || [];
    const original = originalItems.find(i => i.id === id);
    // Optimistic update
    updateCollection(storageKey, (items) =>
      (items || []).map(item => item.id === id ? { ...item, ...updates } : item)
    );
    // API call
    if (apiEndpoint) {
      api.update(apiEndpoint, id, updates)
        .then(serverItem => {
          // Sync with server response
          updateCollection(storageKey, (items) =>
            (items || []).map(item => item.id === id ? serverItem : item)
          );
        })
        .catch(err => {
          console.error('Update failed:', err);
          // Rollback on failure
          if (original) {
            updateCollection(storageKey, (items) =>
              (items || []).map(item => item.id === id ? original : item)
            );
          }
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
    // Save original for potential rollback
    const originalItems = collectionsRef.current[storageKey] || [];
    const original = originalItems.find(i => i.id === id);
    // Optimistic update
    updateCollection(storageKey, (items) => (items || []).filter(item => item.id !== id));
    // API call
    if (apiEndpoint) {
      api.remove(apiEndpoint, id).catch(err => {
        console.error('Delete failed:', err);
        // Rollback: restore the deleted item
        if (original) {
          updateCollection(storageKey, (items) => [...(items || []), original]);
        }
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
      const isSubmitted = report.status === 'submitted';
      const targetRecipients = report.targetRecipients || ['super_admin', 'viloyat_admin'];
      const dataPayload = {
        ...(typeof report.data === 'object' ? report.data : {}),
        targetRecipients,
        sentToText: report.sentToText || (
          targetRecipients.includes('super_admin') && targetRecipients.includes('viloyat_admin')
            ? 'Super Admin va Viloyat Admini'
            : targetRecipients.includes('super_admin')
            ? 'Super Admin'
            : 'Viloyat Admini'
        ),
      };

      const newReport = await api.create('reports', {
        ...report,
        data: dataPayload,
        targetRole: targetRecipients.join(','),
        userId: currentUser?.id,
        viloyatId: currentUser?.viloyatId,
        tumanId: currentUser?.tumanId,
        libraryId: currentUser?.libraryId,
      });

      const formatted = {
        ...newReport,
        data: dataPayload,
        targetRecipients,
      };

      updateCollection(STORAGE_KEYS.REPORTS, (reports) => [formatted, ...(reports || [])]);

      // Notify recipient admins
      const libraries = collectionsRef.current[STORAGE_KEYS.LIBRARIES] || [];
      const myLib = libraries.find(l => l.id === currentUser?.libraryId);
      const allUsers = collectionsRef.current[STORAGE_KEYS.USERS] || [];
      const libText = myLib?.name ? ` (${myLib.name})` : '';
      const authorName = currentUser?.fullName || 'Bo\'lim boshlig\'i';

      if (isSubmitted) {
        if (targetRecipients.includes('super_admin')) {
          await createNotification({
            type: 'report',
            title: 'Yangi hisobot keldi (Bo\'lim boshlig\'idan)',
            message: `${authorName}${libText} tomonidan "${formatted.title || 'Hisobot'}" ko'rib chiqish uchun yuborildi`,
            targetRole: 'super_admin',
          });
        }
        if (targetRecipients.includes('viloyat_admin')) {
          const viloyatAdmins = allUsers.filter(u =>
            u.role === 'viloyat_admin' &&
            u.viloyatId === currentUser?.viloyatId
          );
          if (viloyatAdmins.length > 0) {
            for (const va of viloyatAdmins) {
              await createNotification({
                type: 'report',
                title: 'Yangi hisobot keldi (Bo\'lim boshlig\'idan)',
                message: `${authorName}${libText} tomonidan "${formatted.title || 'Hisobot'}" ko'rib chiqish uchun yuborildi`,
                targetUserId: va.id,
                targetRole: 'viloyat_admin',
              });
            }
          } else {
            await createNotification({
              type: 'report',
              title: 'Yangi hisobot keldi (Bo\'lim boshlig\'idan)',
              message: `${authorName}${libText} tomonidan "${formatted.title || 'Hisobot'}" ko'rib chiqish uchun yuborildi`,
              targetRole: 'viloyat_admin',
            });
          }
        }
      } else {
        await createNotification({
          type: 'report',
          title: 'Yangi hisobot yaratildi (qoralama)',
          message: `"${formatted.title || 'Nomsiz'}" hisoboti ${authorName} tomonidan qoralama sifatida saqlandi`,
          targetUserId: currentUser?.id,
        });
      }

      return formatted;
    } catch (err) {
      console.error('Create report failed:', err);
      throw err;
    }
  }, [currentUser, updateCollection, createNotification]);

  const submitReport = useCallback(async (id, options = {}) => {
    try {
      const existingReport = (collectionsRef.current[STORAGE_KEYS.REPORTS] || []).find(r => r.id === id);
      let existingData = {};
      try {
        existingData = typeof existingReport?.data === 'object' && existingReport?.data
          ? existingReport.data
          : JSON.parse(existingReport?.data || '{}');
      } catch { existingData = {}; }

      const targetRecipients = options.targetRecipients || existingData.targetRecipients || ['super_admin', 'viloyat_admin'];
      const mergedData = {
        ...existingData,
        ...options.data,
        targetRecipients,
        sentToText: options.sentToText || (
          targetRecipients.includes('super_admin') && targetRecipients.includes('viloyat_admin')
            ? 'Super Admin va Viloyat Admini'
            : targetRecipients.includes('super_admin')
            ? 'Super Admin'
            : 'Viloyat Admini'
        ),
      };

      const updated = await api.action('reports', id, 'submit', {
        data: mergedData,
        targetRole: targetRecipients.join(','),
      });

      const formattedUpdated = {
        ...updated,
        data: mergedData,
        targetRole: targetRecipients.join(','),
        targetRecipients,
      };

      updateCollection(STORAGE_KEYS.REPORTS, (reports) =>
        (reports || []).map(r => r.id === id ? { ...r, ...formattedUpdated } : r)
      );

      const libraries = collectionsRef.current[STORAGE_KEYS.LIBRARIES] || [];
      const myLib = libraries.find(l => l.id === currentUser?.libraryId);
      const allUsers = collectionsRef.current[STORAGE_KEYS.USERS] || [];
      const libText = myLib?.name ? ` (${myLib.name})` : '';
      const authorName = currentUser?.fullName || 'Bo\'lim boshlig\'i';

      if (targetRecipients.includes('super_admin')) {
        await createNotification({
          type: 'report',
          title: 'Yangi hisobot keldi (Bo\'lim boshlig\'idan)',
          message: `${authorName}${libText} tomonidan "${updated.title || 'Hisobot'}" ko'rib chiqish uchun yuborildi`,
          targetRole: 'super_admin',
        });
      }

      if (targetRecipients.includes('viloyat_admin')) {
        const viloyatAdmins = allUsers.filter(u =>
          u.role === 'viloyat_admin' &&
          u.viloyatId === (currentUser?.viloyatId || existingReport?.viloyatId)
        );
        if (viloyatAdmins.length > 0) {
          for (const va of viloyatAdmins) {
            await createNotification({
              type: 'report',
              title: 'Yangi hisobot keldi (Bo\'lim boshlig\'idan)',
              message: `${authorName}${libText} tomonidan "${updated.title || 'Hisobot'}" ko'rib chiqish uchun yuborildi`,
              targetUserId: va.id,
              targetRole: 'viloyat_admin',
            });
          }
        } else {
          await createNotification({
            type: 'report',
            title: 'Yangi hisobot keldi (Bo\'lim boshlig\'idan)',
            message: `${authorName}${libText} tomonidan "${updated.title || 'Hisobot'}" ko'rib chiqish uchun yuborildi`,
            targetRole: 'viloyat_admin',
          });
        }
      }

      return formattedUpdated;
    } catch (err) {
      console.error('Submit report failed:', err);
      throw err;
    }
  }, [currentUser, updateCollection, createNotification]);

  const reviewReport = useCallback(async (id, action, comment = '') => {
    try {
      const updated = await api.action('reports', id, 'review', { action, comment });
      let parsedData = updated?.data;
      if (typeof parsedData === 'string') {
        try { parsedData = JSON.parse(parsedData); } catch {}
      }
      const formattedUpdated = {
        ...updated,
        ...(parsedData ? { data: parsedData } : {}),
      };

      updateCollection(STORAGE_KEYS.REPORTS, (reports) =>
        (reports || []).map(r => r.id === id ? { ...r, ...formattedUpdated, ...(r.data && !parsedData ? { data: r.data } : {}) } : r)
      );
      // Notify report creator about review result
      if (updated.userId) {
        await createNotification({
          type: action === 'approve' ? 'success' : 'warning',
          title: action === 'approve' ? 'Hisobot tasdiqlandi' : 'Hisobot rad etildi',
          message: `"${updated.title || 'Nomsiz'}" hisobingiz ${action === 'approve' ? 'tasdiqlandi' : 'rad etildi'}${comment ? ': ' + comment : ''}`,
          targetUserId: updated.userId,
        });
      }
      return formattedUpdated;
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
      n.targetRole === currentUser.role ||            // targeted at this role
      (n.targetRole && n.targetRole.split(',').map(s => s.trim()).includes(currentUser.role))
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

  // --- ACTIVITIES ---
  const submitActivity = useCallback(async (activityId) => {
    try {
      const updated = await api.update('activities', activityId, { status: 'sent' });
      updateCollection(STORAGE_KEYS.ACTIVITIES, (items) =>
        (items || []).map(a => a.id === activityId ? { ...a, status: 'sent' } : a)
      );

      // O'z TUMANI boshliqni topish (libraryId emas, tumanId bo'yicha)
      const allUsers = collectionsRef.current[STORAGE_KEYS.USERS] || [];
      const libraries = collectionsRef.current[STORAGE_KEYS.LIBRARIES] || [];
      const myLib = libraries.find(l => l.id === currentUser?.libraryId);
      const libText = myLib?.name ? ` (${myLib.name})` : '';
      const boshligi = allUsers.find(u =>
        u.role === 'xodimlar_boshligi' &&
        u.tumanId === currentUser?.tumanId &&
        u.viloyatId === currentUser?.viloyatId
      );

      await createNotification({
        type: 'report',
        title: 'Yangi kunlik hisobot keldi',
        message: `${currentUser?.fullName}${libText} tomonidan ${new Date().toLocaleDateString('uz-UZ')} kunlik hisobot yuborildi`,
        targetUserId: boshligi?.id || null,
        targetRole:   boshligi ? null : 'xodimlar_boshligi',
      });

      return updated;
    } catch (err) {
      console.error('Submit activity failed:', err);
      throw err;
    }
  }, [currentUser, updateCollection, createNotification]);

  // Bolim boshligi — xodim hisobotini qabul qilish
  // Qabul qilganda: status='accepted', oylik jamlangan hisobot tuman adminga yuboriladi
  const acceptActivity = useCallback(async (activityId) => {
    try {
      // 1. Faoliyatni "accepted" ga o'zgartir
      await api.update('activities', activityId, { status: 'accepted' });
      updateCollection(STORAGE_KEYS.ACTIVITIES, (items) =>
        (items || []).map(a => a.id === activityId ? { ...a, status: 'accepted' } : a)
      );

      // 2. Bu oyning qabul qilingan barcha faoliyatlarini jamlash
      const activity = (collectionsRef.current[STORAGE_KEYS.ACTIVITIES] || [])
        .find(a => a.id === activityId);
      const month = activity?.date?.slice(0, 7) || new Date().toISOString().slice(0, 7);

      const allActs = collectionsRef.current[STORAGE_KEYS.ACTIVITIES] || [];
      const monthActs = allActs.filter(a =>
        a.type === 'daily_report' &&
        a.libraryId === currentUser?.libraryId &&
        a.date?.startsWith(month) &&
        (a.status === 'accepted' || a.id === activityId)
      );

      // Oylik jami hisoblash
      const monthTotals = {};
      monthActs.forEach(a => {
        let data = {};
        try { data = typeof a.data === 'object' && a.data ? a.data : JSON.parse(a.data || '{}'); } catch { /**/ }
        Object.entries(data).forEach(([k, v]) => { monthTotals[k] = (monthTotals[k] || 0) + Number(v); });
      });

      // 3. Tuman adminga notification yuborish
      const allUsers = collectionsRef.current[STORAGE_KEYS.USERS] || [];
      const libraries = collectionsRef.current[STORAGE_KEYS.LIBRARIES] || [];
      const myLib = libraries.find(l => l.id === currentUser?.libraryId);
      const libText = myLib?.name ? ` (${myLib.name})` : '';
      const tumanAdmin = allUsers.find(u =>
        u.role === 'tuman_admin' &&
        u.tumanId === currentUser?.tumanId &&
        u.viloyatId === currentUser?.viloyatId
      );

      const monthLabel = (() => {
        const [y, m] = month.split('-');
        const months = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
        return `${months[+m - 1]} ${y}`;
      })();

      const totalSum = Object.values(monthTotals).reduce((s, v) => s + v, 0);

      await createNotification({
        type: 'report',
        title: `${monthLabel} jamlangan hisoboti keldi`,
        message: `${currentUser?.fullName} (Bo'lim boshlig'i${libText}) tomonidan ${monthLabel} oylik jamlangan hisoboti tasdiqlanib yuborildi. Jami: ${totalSum} ta ish (${monthActs.length} kun).`,
        targetUserId: tumanAdmin?.id || null,
        targetRole:   tumanAdmin ? null : 'tuman_admin',
      });

      // 4. Hisobotni yuborgan xodimga ham xabar
      const xodim = allUsers.find(u => u.id === activity?.userId);
      if (xodim) {
        await createNotification({
          type: 'success',
          title: 'Hisobotingiz qabul qilindi',
          message: `${formatDate(activity?.date)} kunlik hisobotingiz bolim boshligi tomonidan qabul qilindi`,
          targetUserId: xodim.id,
        });
      }

      return { accepted: true, month, monthTotals, monthActs: monthActs.length };
    } catch (err) {
      console.error('Accept activity failed:', err);
      throw err;
    }
  }, [currentUser, updateCollection, createNotification]);


  // Bolim boshligi — kunlik faoliyatni Super Admin va Viloyat Adminiga rasmiy jo'natish
  const forwardDailyActivityToAdmins = useCallback(async (activityOrDate, targetRecipients = ['super_admin', 'viloyat_admin']) => {
    try {
      const allActs = collectionsRef.current[STORAGE_KEYS.ACTIVITIES] || [];
      const allUsers = collectionsRef.current[STORAGE_KEYS.USERS] || [];
      const libraries = collectionsRef.current[STORAGE_KEYS.LIBRARIES] || [];
      const myLib = libraries.find(l => l.id === currentUser?.libraryId);
      const authorName = currentUser?.fullName || "Bo'lim boshlig'i";

      let targetDate = '';
      let actsToInclude = [];

      if (typeof activityOrDate === 'string') {
        targetDate = activityOrDate;
        actsToInclude = allActs.filter(a =>
          a.type === 'daily_report' &&
          (a.libraryId === currentUser?.libraryId || a.userId === currentUser?.id) &&
          a.date === targetDate
        );
      } else if (activityOrDate && typeof activityOrDate === 'object') {
        targetDate = activityOrDate.date || new Date().toISOString().split('T')[0];
        actsToInclude = [activityOrDate];
      }

      const totals = {
        kitob_skanerlash: 0,
        kitob_pdf: 0,
        texnik_xizmat: 0,
        jihozlash: 0,
        tuzatish: 0,
        boshqa: 0,
      };
      const staffContributions = {};

      actsToInclude.forEach(a => {
        let d = {};
        try { d = typeof a.data === 'object' && a.data ? a.data : JSON.parse(a.data || '{}'); } catch { /**/ }
        Object.keys(totals).forEach(k => {
          totals[k] += Number(d[k] || 0);
        });
        const u = allUsers.find(user => user.id === a.userId);
        const name = u?.fullName || "Noma'lum xodim";
        const sum = Object.values(d).reduce((s, v) => s + Number(v || 0), 0);
        staffContributions[name] = (staffContributions[name] || 0) + sum;
      });

      const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);
      const recipientText = targetRecipients.includes('super_admin') && targetRecipients.includes('viloyat_admin')
        ? 'Super Admin va Viloyat Admini'
        : targetRecipients.includes('super_admin')
        ? 'Super Admin'
        : 'Viloyat Admini';

      const staffText = Object.entries(staffContributions).map(([n, s]) => `${n}: ${s} ta`).join(', ');
      const title = `${formatDate(targetDate)} kunlik hisoboti — ${myLib?.name || 'AKM Kutubxonasi'}`;
      const description = `${formatDate(targetDate)} kunida kutubxona xodimlari tomonidan jami ${grandTotal} ta ish bajarildi. Xodimlar: ${staffText || authorName}.`;

      const reportPayload = {
        title,
        type: REPORT_TYPES.DAILY || 'daily',
        period: targetDate,
        description,
        status: REPORT_STATUS.SUBMITTED,
        submittedAt: targetDate,
        targetRecipients,
        data: {
          totals,
          grandTotal,
          staffContributions,
          actsCount: actsToInclude.length,
          targetRecipients,
          sentToText: recipientText,
          authorName,
          authorRole: 'xodimlar_boshligi',
          libraryName: myLib?.name || '',
          viloyatId: currentUser?.viloyatId,
          tumanId: currentUser?.tumanId,
        },
      };

      const createdReport = await createReport(reportPayload);

      // Faoliyatlarni status='accepted' qilish
      for (const a of actsToInclude) {
        if (a.status !== 'accepted') {
          api.update('activities', a.id, { status: 'accepted' }).catch(() => {});
        }
      }

      updateCollection(STORAGE_KEYS.ACTIVITIES, (items) =>
        (items || []).map(item => actsToInclude.some(a => a.id === item.id) ? { ...item, status: 'accepted' } : item)
      );

      return { success: true, report: createdReport };
    } catch (err) {
      console.error('Forward daily activity failed:', err);
      throw err;
    }
  }, [currentUser, updateCollection, createReport]);

  // Bolim boshligi — oylik yig'ma hisobotni Super Admin va Viloyat Adminiga rasmiy jo'natish
  const forwardMonthlyReportToAdmins = useCallback(async (monthStr, targetRecipients = ['super_admin', 'viloyat_admin']) => {
    try {
      const targetMonth = monthStr || new Date().toISOString().slice(0, 7);
      const allActs = collectionsRef.current[STORAGE_KEYS.ACTIVITIES] || [];
      const allUsers = collectionsRef.current[STORAGE_KEYS.USERS] || [];
      const libraries = collectionsRef.current[STORAGE_KEYS.LIBRARIES] || [];
      const existingReports = collectionsRef.current[STORAGE_KEYS.REPORTS] || [];
      const myLib = libraries.find(l => l.id === currentUser?.libraryId);
      const authorName = currentUser?.fullName || "Bo'lim boshlig'i";

      // Shu oyga tegishli faoliyatlar
      const monthActs = allActs.filter(a =>
        a.type === 'daily_report' &&
        (a.libraryId === currentUser?.libraryId || a.userId === currentUser?.id || a.viloyatId === currentUser?.viloyatId) &&
        a.date?.startsWith(targetMonth)
      );

      const totals = {
        kitob_skanerlash: 0,
        kitob_pdf: 0,
        texnik_xizmat: 0,
        jihozlash: 0,
        tuzatish: 0,
        boshqa: 0,
      };
      const staffContributions = {};

      monthActs.forEach(a => {
        let d = {};
        try { d = typeof a.data === 'object' && a.data ? a.data : JSON.parse(a.data || '{}'); } catch { /**/ }
        Object.keys(totals).forEach(k => {
          totals[k] += Number(d[k] || 0);
        });
        const u = allUsers.find(user => user.id === a.userId);
        const name = u?.fullName || "Noma'lum xodim";
        const sum = Object.values(d).reduce((s, v) => s + Number(v || 0), 0);
        staffContributions[name] = (staffContributions[name] || 0) + sum;
      });

      const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);
      const recipientText = targetRecipients.includes('super_admin') && targetRecipients.includes('viloyat_admin')
        ? 'Super Admin va Viloyat Admini'
        : targetRecipients.includes('super_admin')
        ? 'Super Admin'
        : 'Viloyat Admini';

      const monthLabel = (() => {
        const [y, m] = targetMonth.split('-');
        const months = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
        return `${months[+m - 1] || targetMonth} ${y || ''}`.trim();
      })();

      const staffText = Object.entries(staffContributions).map(([n, s]) => `${n}: ${s} ta`).join(', ');
      const title = `${monthLabel} oylik yig'ma hisoboti — ${myLib?.name || 'AKM Kutubxonasi'}`;
      const description = `${monthLabel} davrida kutubxona xodimlari tomonidan jami ${grandTotal} ta ish (${monthActs.length} ta hisobot) amalga oshirildi. Xodimlar hissasi: ${staffText || authorName}.`;
      const todayStr = new Date().toISOString().split('T')[0];

      // Mavjud oylik hisobotni tekshirish
      const existingReport = existingReports.find(r =>
        r.type === (REPORT_TYPES.MONTHLY || 'monthly') &&
        r.period === targetMonth &&
        (r.libraryId === currentUser?.libraryId || r.userId === currentUser?.id)
      );

      const reportData = {
        totals,
        grandTotal,
        staffContributions,
        actsCount: monthActs.length,
        daysCount: new Set(monthActs.map(a => a.date)).size,
        targetRecipients,
        sentToText: recipientText,
        authorName,
        authorRole: 'xodimlar_boshligi',
        libraryName: myLib?.name || '',
        viloyatId: currentUser?.viloyatId,
        tumanId: currentUser?.tumanId,
      };

      let finalReport = null;

      if (existingReport) {
        finalReport = await submitReport(existingReport.id, {
          title,
          description,
          targetRecipients,
          sentToText: recipientText,
          data: reportData,
        });
      } else {
        finalReport = await createReport({
          title,
          type: REPORT_TYPES.MONTHLY || 'monthly',
          period: targetMonth,
          description,
          status: REPORT_STATUS.SUBMITTED,
          submittedAt: todayStr,
          targetRecipients,
          data: reportData,
        });
      }

      return { success: true, report: finalReport };
    } catch (err) {
      console.error('Forward monthly report failed:', err);
      throw err;
    }
  }, [currentUser, createReport, submitReport]);

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

    // Activities
    submitActivity,
    acceptActivity,
    forwardDailyActivityToAdmins,
    forwardMonthlyReportToAdmins,

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

    // Push Toast Notification
    toast,
    showToast: toast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
