import { useState, useRef, useEffect, useMemo } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { MENU_ITEMS, ROLE_LABELS, ROLE_COLORS, avatarClass, STORAGE_KEYS, REPORT_STATUS, TASK_STATUS } from '../data/constants.js';
import { getViloyatName, getTumanName } from '../data/regions.js';
import ICONS from './icons.jsx';
import Logo from './ui/Logo.jsx';
import Badge from './ui/Badge.jsx';
import { NOTIFICATION_TYPES } from '../data/constants.js';

const MENU_SECTIONS = [
  {
    title: 'Boshqaruv',
    ids: ['dashboard', 'map', 'statistics', 'analytics'],
  },
  {
    title: 'Kutubxona & Faoliyat',
    ids: ['libraries', 'daily-activity', 'events', 'inventory'],
  },
  {
    title: 'Hisobot & Ijro',
    ids: ['reports', 'tasks', 'kpi', 'documents', 'appeals', 'notifications'],
  },
  {
    title: 'Tizim & Nazorat',
    ids: ['users', 'roles', 'audit', 'security', 'settings', 'profile'],
  },
];

export default function Layout({ children }) {
  const {
    currentUser,
    logout,
    getNotifications,
    getUnreadCount,
    markNotificationRead,
    markAllRead,
    hasPermission,
    getCollection,
  } = useApp();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const notifications = getNotifications();
  const unreadCount = getUnreadCount();

  // Active counts for badges
  const reports = useMemo(() => getCollection(STORAGE_KEYS.REPORTS) || [], [getCollection]);
  const tasks = useMemo(() => getCollection(STORAGE_KEYS.TASKS) || [], [getCollection]);
  const appeals = useMemo(() => getCollection(STORAGE_KEYS.APPEALS) || [], [getCollection]);

  const pendingReportsCount = useMemo(() =>
    reports.filter(r => r.status === REPORT_STATUS.SUBMITTED || r.status === REPORT_STATUS.UNDER_REVIEW).length,
  [reports]);

  const pendingTasksCount = useMemo(() =>
    tasks.filter(t => t.status === TASK_STATUS.PENDING || t.status === TASK_STATUS.IN_PROGRESS).length,
  [tasks]);

  const newAppealsCount = useMemo(() =>
    appeals.filter(a => a.status === 'new').length,
  [appeals]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const roleColor = ROLE_COLORS[currentUser?.role] || 'blue';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Group visible menu items
  const menuMap = useMemo(() => {
    const map = new Map();
    MENU_ITEMS.forEach(item => {
      if (hasPermission(item.permission)) {
        map.set(item.id, item);
      }
    });
    return map;
  }, [hasPermission]);

  // Get item badge
  const getItemBadge = (id) => {
    if (id === 'notifications' && unreadCount > 0) {
      return { count: unreadCount, color: 'bg-rose-500 text-white' };
    }
    if (id === 'reports' && pendingReportsCount > 0) {
      return { count: pendingReportsCount, color: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' };
    }
    if (id === 'tasks' && pendingTasksCount > 0) {
      return { count: pendingTasksCount, color: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' };
    }
    if (id === 'appeals' && newAppealsCount > 0) {
      return { count: newAppealsCount, color: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' };
    }
    return null;
  };

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString('uz-UZ', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Senior Executive Sidebar (Deep Slate/Obsidian) */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-[#0b1120] border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand header */}
        <div className="h-18 flex items-center justify-between px-5 border-b border-slate-800/80 shrink-0 bg-[#090d16]">
          <Logo size="md" theme="light" subtitle="Yagona Boshqaruv Tizimi" />
          <button
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <ICONS.close className="text-lg" />
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6 dark-scrollbar">
          {MENU_SECTIONS.map(section => {
            const sectionItems = section.ids
              .map(id => menuMap.get(id))
              .filter(Boolean);

            if (sectionItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 select-none">
                  {section.title}
                </div>
                {sectionItems.map(item => {
                  const Icon = ICONS[item.icon] || ICONS.dashboard;
                  const path = item.id === 'dashboard' ? '/dashboard' : `/${item.id}`;
                  const badge = getItemBadge(item.id);

                  return (
                    <NavLink
                      key={item.id}
                      to={path}
                      className={({ isActive }) =>
                        `group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-950/60 ring-1 ring-blue-400/30'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon className={`text-base shrink-0 transition-colors ${
                              isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                            }`} />
                            <span className="truncate">{item.label}</span>
                          </div>
                          {badge && (
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${badge.color}`}>
                              {badge.count}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User Card at bottom of sidebar */}
        <div className="p-3.5 border-t border-slate-800/80 bg-[#090d16] shrink-0">
          <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-900/80 border border-slate-800/90">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <div className={`w-9 h-9 rounded-xl ${avatarClass(roleColor)} flex items-center justify-center font-bold text-sm shadow-sm ring-1 ring-white/10`}>
                  {currentUser?.fullName?.charAt(0) || 'U'}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate leading-tight">
                  {currentUser?.fullName}
                </p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                  {ROLE_LABELS[currentUser?.role]}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Tizimdan chiqish"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
            >
              <ICONS.logout className="text-base" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Modern Glassmorphic Topbar */}
        <header className="h-18 sticky top-0 z-30 glass-surface border-b border-slate-200/80 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Mobile Toggle & Context Breadcrumb */}
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              className="lg:hidden p-2.5 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <ICONS.bars className="text-xl" />
            </button>

            <div className="min-w-0 hidden sm:flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold border border-blue-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                {currentUser?.viloyatId ? getViloyatName(currentUser.viloyatId) : "O'zbekiston Respublikasi"}
              </span>
              {currentUser?.tumanId && (
                <>
                  <span className="text-slate-300">/</span>
                  <span className="text-slate-600 font-medium">
                    {getTumanName(currentUser.viloyatId, currentUser.tumanId)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right: Date, Notifications & User Menu */}
          <div className="flex items-center gap-3">
            {/* Live date stamp */}
            <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200/60">
              <ICONS.calendar className="text-slate-400" />
              <span className="capitalize">{todayStr}</span>
            </div>

            {/* Notifications Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                className={`relative p-2.5 rounded-xl transition-colors ${
                  notifOpen ? 'bg-slate-100 text-slate-900' : 'hover:bg-slate-100 text-slate-600'
                }`}
                onClick={() => setNotifOpen(!notifOpen)}
                title="Bildirishnomalar"
              >
                <ICONS.notifications className="text-xl" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-executive-xl border border-slate-200/90 z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Bildirishnomalar</h3>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {unreadCount > 0 ? `${unreadCount} ta yangi bildirishnoma` : 'Barcha xabarlar o\'qilgan'}
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        Hammasini o'qildi
                      </button>
                    )}
                  </div>

                  <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="py-12 text-center text-sm text-slate-400">
                        <ICONS.notifications className="text-3xl mx-auto mb-2 text-slate-300" />
                        Bildirishnomalar mavjud emas
                      </div>
                    ) : (
                      notifications.slice(0, 8).map(n => (
                        <button
                          key={n.id}
                          onClick={() => markNotificationRead(n.id)}
                          className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-start gap-3 ${
                            !n.read ? 'bg-blue-50/40' : ''
                          }`}
                        >
                          <div className={`p-2 rounded-xl shrink-0 ${
                            n.type === NOTIFICATION_TYPES.SUCCESS ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            n.type === NOTIFICATION_TYPES.WARNING ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                            n.type === NOTIFICATION_TYPES.ERROR ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                            n.type === NOTIFICATION_TYPES.TASK ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                            n.type === NOTIFICATION_TYPES.REPORT ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                            'bg-blue-50 text-blue-600 border border-blue-100'
                          }`}>
                            <ICONS.info className="text-sm" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 leading-snug">{n.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                            <p className="text-[10px] text-slate-400 mt-1 font-medium">{n.date} {n.time}</p>
                          </div>
                          {!n.read && <div className="w-2 h-2 bg-blue-600 rounded-full shrink-0 mt-1.5" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                className="flex items-center gap-2.5 p-1.5 pl-2 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className={`w-8 h-8 rounded-lg ${avatarClass(roleColor)} flex items-center justify-center font-bold text-xs ring-1 ring-slate-200`}>
                  {currentUser?.fullName?.charAt(0) || 'U'}
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-xs font-bold text-slate-900 leading-none">{currentUser?.fullName?.split(' ')[0]}</p>
                  <p className="text-[10px] text-slate-500 leading-none mt-1 font-medium">{ROLE_LABELS[currentUser?.role]}</p>
                </div>
                <ICONS.chevronDown className="text-[10px] text-slate-400 hidden sm:block ml-1" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-executive-xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/60">
                    <p className="text-sm font-bold text-slate-900 truncate">{currentUser?.fullName}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{currentUser?.email || `@${currentUser?.username}`}</p>
                    <div className="mt-2.5">
                      <Badge color={roleColor} withDot>{ROLE_LABELS[currentUser?.role]}</Badge>
                    </div>
                  </div>
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => { navigate('/profile'); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <ICONS.user className="text-sm text-slate-400" />
                      Profil va Sozlamalar
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <ICONS.logout className="text-sm" />
                      Tizimdan chiqish
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
