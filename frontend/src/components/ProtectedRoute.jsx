import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { ROLES } from '../data/constants.js';

export default function ProtectedRoute({ children, requiredPermission }) {
  const { currentUser, initialized, hasPermission } = useApp();
  const location = useLocation();

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Tizimga kirmagan bo'lsa login sahifasiga yo'naltirish
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // SuperAdmin har qanday bo'limga to'siqsiz kira oladi
  const isSuperAdmin = currentUser?.role === ROLES?.SUPER_ADMIN || currentUser?.role === 'superadmin';
  if (isSuperAdmin) {
    return children;
  }

  // Ruxsat talab qilinmagan bo'lsa o'tkazish
  if (!requiredPermission) {
    return children;
  }

  // Qolgan rollar uchun ruxsatni qat'iy tekshirish
  const allowed = typeof hasPermission === 'function' ? hasPermission(requiredPermission) : true;
  if (!allowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
