import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';

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
];

function AppRoutes() {
  const { currentUser } = useApp();

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
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredPermission="view_dashboard">
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      {MODULES.map(m => (
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
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
