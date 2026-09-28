import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { ROLE_PERMISSIONS, PERMISSIONS } from '../data/constants.js';

export default function ProtectedRoute({ children, requiredPermission = null, allowedRoles = null }) {
  const { currentUser, initialized, hasPermission } = useApp();
  const location = useLocation();

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role restriction
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check permission restriction
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
