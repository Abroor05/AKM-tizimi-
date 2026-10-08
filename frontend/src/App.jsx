import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import { getLastRoute, setLastRoute } from './utils/api.js';

import Login from './pages/auth/Login.jsx';
import Dashboard from './pages/shared/Dashboard.jsx';
import LibrariesPage from './pages/shared/LibrariesPage.jsx';
import DailyActivityPage from './pages/shared/DailyActivityPage.jsx';
import ReportsPage from './pages/shared/ReportsPage.jsx';
import TasksPage from './pages/shared/TasksPage.jsx';
import BooksPage from './pages/shared/BooksPage.jsx';
import ReadersPage from './pages/shared/ReadersPage.jsx';
import EventsPage from './pages/shared/EventsPage.jsx';
import InventoryPage from './pages/shared/InventoryPage.jsx';
import DocumentsPage from './pages/shared/DocumentsPage.jsx';
import AppealsPage from './pages/shared/AppealsPage.jsx';
import NotificationsPage from './pages/shared/NotificationsPage.jsx';
import KpiPage from './pages/shared/KpiPage.jsx';
import StatisticsPage from './pages/shared/StatisticsPage.jsx';
import AnalyticsPage from './pages/shared/AnalyticsPage.jsx';
import MapPage from './pages/shared/MapPage.jsx';
import UsersPage from './pages/shared/UsersPage.jsx';
import RolesPage from './pages/shared/RolesPage.jsx';
import AuditPage from './pages/shared/AuditPage.jsx';
import SecurityPage from './pages/shared/SecurityPage.jsx';
import SettingsPage from './pages/shared/SettingsPage.jsx';
import ProfilePage from './pages/shared/ProfilePage.jsx';

// Xodimlar boshligi — dedicated pages
import XBDashboard from './pages/xodimlar-boshligi/XBDashboard.jsx';
import XBDailyActivity from './pages/xodimlar-boshligi/XBDailyActivity.jsx';
import { ROLES } from './data/constants.js';

const MODULES = [
  { path: 'libraries', comp: LibrariesPage, perm: 'view_libraries' },
  { path: 'daily-activity', comp: DailyActivityPage, perm: 'view_activities' },
  { path: 'reports', comp: ReportsPage, perm: 'view_reports' },
  { path: 'tasks', comp: TasksPage, perm: 'view_tasks' },
  { path: 'books', comp: BooksPage, perm: 'view_books' },
  { path: 'readers', comp: ReadersPage, perm: 'view_readers' },
  { path: 'events', comp: EventsPage, perm: 'view_events' },
  { path: 'inventory', comp: InventoryPage, perm: 'view_inventory' },
  { path: 'documents', comp: DocumentsPage, perm: 'view_documents' },
  { path: 'appeals', comp: AppealsPage, perm: 'view_appeals' },
  { path: 'notifications', comp: NotificationsPage, perm: 'view_notifications' },
  { path: 'kpi', comp: KpiPage, perm: 'view_kpi' },
  { path: 'statistics', comp: StatisticsPage, perm: 'view_statistics' },
  { path: 'analytics', comp: AnalyticsPage, perm: 'view_analytics' },
  { path: 'map', comp: MapPage, perm: 'view_map' },
  { path: 'users', comp: UsersPage, perm: 'view_users' },
  { path: 'roles', comp: RolesPage, perm: 'manage_roles' },
  { path: 'audit', comp: AuditPage, perm: 'view_audit' },
  { path: 'security', comp: SecurityPage, perm: 'manage_security' },
  { path: 'settings', comp: SettingsPage, perm: 'manage_settings' },
  { path: 'profile', comp: ProfilePage, perm: 'view_profile' },
];

const VALID_ROUTES = new Set(['/dashboard', ...MODULES.map(({ path }) => `/${path}`)]);

function AppRoutes() {
  const { currentUser, initialized } = useApp();
  const location = useLocation();

  useEffect(() => {
    if (VALID_ROUTES.has(location.pathname)) {
      setLastRoute(location.pathname);
    }
  }, [location.pathname]);

  const safeLastRoute = (() => {
    const route = getLastRoute();
    return VALID_ROUTES.has(route) ? route : '/dashboard';
  })();

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
          <p className="text-gray-500">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to={safeLastRoute} replace />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredPermission="view_dashboard">
            <Layout>
              {/* Xodimlar boshligi gets their own dedicated dashboard */}
              {currentUser?.role === ROLES.XODIMLAR_BOSHLIGI
                ? <XBDashboard />
                : <Dashboard />
              }
            </Layout>
          </ProtectedRoute>
        }
      />
      {/* Xodimlar boshligi dedicated daily-activity with staff reporting */}
      <Route
        path="/daily-activity"
        element={
          <ProtectedRoute requiredPermission="view_activities">
            <Layout>
              {currentUser?.role === ROLES.XODIMLAR_BOSHLIGI
                ? <XBDailyActivity />
                : <DailyActivityPage />
              }
            </Layout>
          </ProtectedRoute>
        }
      />
      {MODULES.filter(m => m.path !== 'daily-activity').map(m => (
        <Route
          key={m.path}
          path={`/${m.path}`}
          element={
            <ProtectedRoute requiredPermission={m.perm}>
              <Layout>
                <m.comp />
              </Layout>
            </ProtectedRoute>
          }
        />
      ))}
      <Route path="*" element={<Navigate to={safeLastRoute} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}
