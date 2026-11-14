import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const location = useLocation();
  const currentRole = location.pathname.startsWith('/admin')
    ? 'ADMIN'
    : location.pathname.startsWith('/teacher')
      ? 'TEACHER'
      : null;
  const isLoginPage = location.pathname === '/admin/login' || location.pathname === '/teacher/login';
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [checkedRole, setCheckedRole] = useState(null);
  const pendingRole = useRef(null);

  const refresh = useCallback(async (role = currentRole) => {
    setAuthLoading(true);
    try {
      const { data } = await authApi.me();
      setUser(data.user);
      return data.user;
    } catch (error) {
      if (error.response?.status === 401) {
        setUser(null);
      }
      return null;
    } finally {
      setAuthLoading(false);
      if (role) setCheckedRole(role);
    }
  }, [currentRole]);

  useEffect(() => {
    if (!currentRole || isLoginPage) {
      setAuthLoading(false);
      setCheckedRole(null);
      return;
    }
    if (checkedRole !== currentRole && pendingRole.current !== currentRole) {
      pendingRole.current = currentRole;
      refresh(currentRole).finally(() => {
        if (pendingRole.current === currentRole) pendingRole.current = null;
      });
    }
  }, [checkedRole, currentRole, isLoginPage, refresh]);

  useEffect(() => {
    const handleUnauthorized = () => setUser(null);
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await authApi.login(credentials);
    setUser(data.user);
    setCheckedRole(data.user.role);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading: authLoading || Boolean(currentRole && !isLoginPage && checkedRole !== currentRole),
      login,
      logout,
      refresh,
      setUser,
    }),
    [user, authLoading, currentRole, isLoginPage, checkedRole, login, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth phải dùng bên trong AuthProvider');
  return context;
}
