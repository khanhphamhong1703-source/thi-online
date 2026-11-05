import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingState from '../components/LoadingState';

export default function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingState fullPage label="Đang kiểm tra phiên đăng nhập..." />;
  }

  if (!user) {
    const loginPath = role === 'ADMIN' ? '/admin/login' : '/teacher/login';
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/teacher'} replace />;
  }

  return children;
}
