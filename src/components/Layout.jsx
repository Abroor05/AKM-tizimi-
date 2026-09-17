import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { MENU_ITEMS, ROLE_LABELS, ROLE_COLORS, avatarClass } from '../data/constants.js';
import { getViloyatName, getTumanName } from '../data/regions.js';
import ICONS from './icons.jsx';
import Logo from './ui/Logo.jsx';
import Badge from './ui/Badge.jsx';
import { getRelativeTime } from '../utils/helpers.js';
import { NOTIFICATION_TYPES } from '../data/constants.js';

export default function Layout({ children }) {
  const { currentUser, logout, getNotifications, getUnreadCount, markNotificationRead, markAllRead, hasPermission } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const notifications = getNotifications();
  const unreadCount = getUnreadCount();

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

  // Filter menu items based on permissions
  const visibleMenuItems = MENU_ITEMS.filter(item => hasPermission(item.permission));

  const roleColor = ROLE_COLORS[currentUser?.role] || 'blue';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-100 shrink-0">
          <Logo size="md" color="blue" />
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            onClick={() => setSidebarOpen(false)}
          >
            <ICONS.close />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {visibleMenuItems.map(item => {
            const Icon = ICONS[item.icon] || ICONS.dashboard;
            const path = item.id === 'dashboard' ? '/dashboard' : `/${item.id}`;
            return (
              <NavLink
                key={item.id}
                to={path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <Icon className="text-base shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User info */}
        <div className="border-t border-gray-100 p-3 shrink-0">
          <div className="flex items-center gap-3 px-2">
            <div className={`w-9 h-9 rounded-full ${avatarClass(roleColor)} flex items-center justify-center font-semibold text-sm shrink-0`}>
              {currentUser?.fullName?.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800 truncate">{currentUser?.fullName}</p>
              <p className="text-xs text-gray-400 truncate">{ROLE_LABELS[currentUser?.role]}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
              title="Chiqish"
            >
              <ICONS.logout />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 sticky top-0 z-20 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
          {/* Left: mobile menu button + page indicator */}
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              onClick={() => setSidebarOpen(true)}
            >
              <ICONS.bars className="text-xl" />
            </button>
            <div className="hidden sm:block">
              <p className="text-sm text-gray-400">
                {currentUser?.viloyatId ? getViloyatName(currentUser.viloyatId) : "O'zbekiston Respublikasi"}
                {currentUser?.tumanId ? ' / ' + getTumanName(currentUser.viloyatId, currentUser.tumanId) : ''}
              </p>
            </div>
          </div>

          {/* Right: notifications + user */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                onClick={() => setNotifOpen(!notifOpen)}
              >
                <ICONS.notifications className="text-xl" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-[70vh] overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-800">Bildirishnomalar</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                        Hammasini o'qildi
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-sm text-gray-400">
                        <ICONS.notifications className="text-3xl mx-auto mb-2 text-gray-300" />
                        Bildirishnomalar yo'q
                      </div>
                    ) : (
                      notifications.slice(0, 10).map(n => (
                        <button
                          key={n.id}
                          onClick={() => markNotificationRead(n.id)}
                          className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}
                        >
                          <div className="flex items-start gap-2">
                            <div className={`p-1.5 rounded-full shrink-0 ${
                              n.type === NOTIFICATION_TYPES.SUCCESS ? 'bg-green-50 text-green-600' :
                              n.type === NOTIFICATION_TYPES.WARNING ? 'bg-amber-50 text-amber-600' :
                              n.type === NOTIFICATION_TYPES.ERROR ? 'bg-red-50 text-red-600' :
                              n.type === NOTIFICATION_TYPES.TASK ? 'bg-purple-50 text-purple-600' :
                              n.type === NOTIFICATION_TYPES.REPORT ? 'bg-indigo-50 text-indigo-600' :
                              'bg-blue-50 text-blue-600'
                            }`}>
                              <ICONS.info className="text-xs" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-700">{n.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                              <p className="text-[10px] text-gray-400 mt-1">{n.date} {n.time}</p>
                            </div>
                            {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1" />}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className={`w-8 h-8 rounded-full ${avatarClass(roleColor)} flex items-center justify-center font-semibold text-sm`}>
                  {currentUser?.fullName?.charAt(0)}
                </div>
                <ICONS.chevronDown className="text-xs text-gray-400 hidden sm:block" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-12 w-56 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800">{currentUser?.fullName}</p>
                    <p className="text-xs text-gray-500">{currentUser?.email}</p>
                    <Badge color={roleColor} className="mt-2">{ROLE_LABELS[currentUser?.role]}</Badge>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
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

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
