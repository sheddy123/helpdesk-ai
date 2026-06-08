import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-600" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!user.roles.includes('Admin')) return <Navigate to="/" replace />;

  return <Outlet />;
}
