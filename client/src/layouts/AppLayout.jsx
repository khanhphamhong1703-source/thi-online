import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  ClipboardList,
  Database,
  GraduationCap,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { cx, getInitials } from '../utils/format';

const NAVIGATION = {
  ADMIN: [
    { to: '/admin', label: 'Tổng quan', icon: LayoutDashboard, end: true },
    { to: '/admin/teachers', label: 'Quản lý giáo viên', icon: Users },
    {
      to: '/admin/data',
      label: 'Dữ liệu toàn hệ thống',
      icon: Database,
    },
    { to: '/admin/activity', label: 'Lịch sử hoạt động', icon: History },
    { to: '/admin/settings', label: 'Hệ thống', icon: Settings },
  ],
  TEACHER: [
    { to: '/teacher', label: 'Tổng quan', icon: LayoutDashboard, end: true },
    { to: '/teacher/classes', label: 'Quản lý lớp học', icon: BookOpen },
    { to: '/teacher/exams', label: 'Quản lý đề thi', icon: ClipboardList },
    { to: '/teacher/activity', label: 'Lịch sử hoạt động', icon: History },
    { to: '/teacher/profile', label: 'Thông tin cá nhân', icon: UserRound },
  ],
};

export default function AppLayout({ role }) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = NAVIGATION[role] || [];
  const homePath = role === 'ADMIN' ? '/admin' : '/teacher';
  const loginPath = role === 'ADMIN' ? '/admin/login' : '/teacher/login';
  const extraLabels = [
    { prefix: '/teacher/students', label: 'Quản lý lớp học' },
    { prefix: '/teacher/change-password', label: 'Thông tin cá nhân' },
  ];
  const activeNavItem = navItems.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );
  const activeChild = activeNavItem?.children?.find((child) =>
    child.end ? location.pathname === child.to : location.pathname.startsWith(child.to)
  );
  const currentLabel =
    (activeNavItem && activeChild
      ? `${activeNavItem.label} · ${activeChild.label}`
      : activeNavItem?.label) ||
    extraLabels.find((item) => location.pathname.startsWith(item.prefix))?.label ||
    'Không gian làm việc';
  const examEditMatch =
    role === 'TEACHER'
      ? location.pathname.match(/^\/teacher\/exams\/([^/]+)\/edit\/?$/)
      : null;
  const isExamCreate = role === 'TEACHER' && /^\/teacher\/exams\/new\/?$/.test(location.pathname);
  const isExamForm = Boolean(examEditMatch || isExamCreate);
  const examFormBackTo = isExamCreate
    ? '/teacher/exams'
    : examEditMatch
      ? `/teacher/exams/${examEditMatch[1]}`
      : '/teacher/exams';
  const examFormTitle = isExamCreate ? 'Tạo đề thi' : 'Chỉnh sửa đề thi';

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileOpen]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      toast.success('Bạn đã đăng xuất khỏi hệ thống');
      navigate(loginPath, { replace: true });
    } catch {
      toast.error('Không thể đăng xuất. Vui lòng thử lại.');
    } finally {
      setLoggingOut(false);
    }
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-navy-950 text-slate-300">
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
        <NavLink to={homePath} className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-lg shadow-blue-950/40">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-base font-bold tracking-tight text-white">ViExam</span>
          </span>
        </NavLink>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Đóng menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="px-3 pb-2 pt-5">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {role === 'ADMIN' ? 'Quản trị hệ thống' : 'Không gian giáo viên'}
        </p>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-blue-950/30'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                )
              }
            >
              <Icon className="h-[18px] w-[18px]" />
              <span className="flex-1">{item.label}</span>
              <ChevronRight className="h-4 w-4 opacity-0 transition group-hover:opacity-60" />
            </NavLink>
          );
        })}
      </nav>

      <div className="m-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
          {role === 'ADMIN' ? (
            <ShieldCheck className="h-4 w-4 text-brand-400" />
          ) : (
            <BookOpen className="h-4 w-4 text-brand-400" />
          )}
          {role === 'ADMIN' ? 'Quyền quản trị viên' : 'Quyền giáo viên'}
        </div>
        <p className="mt-1.5 text-[11px] leading-4 text-slate-500">
          Dữ liệu hiển thị theo tài khoản đang đăng nhập.
        </p>
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-200 ring-1 ring-brand-400/30">
            {getInitials(user?.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.fullName}</p>
            <p className="truncate text-xs text-slate-500">@{user?.username}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            title="Đăng xuất"
            aria-label="Đăng xuất"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-dvh overflow-hidden bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>

      <div
        className={
          mobileOpen
            ? 'pointer-events-auto fixed inset-0 z-[60] lg:hidden'
            : 'pointer-events-none fixed inset-0 z-[60] lg:hidden'
        }
        aria-hidden={!mobileOpen}
        inert={mobileOpen ? undefined : ''}
      >
        <button
          type="button"
          className={
            mobileOpen
              ? 'absolute inset-0 bg-slate-950/50 opacity-100 backdrop-blur-sm transition-opacity duration-300'
              : 'absolute inset-0 bg-slate-950/50 opacity-0 backdrop-blur-sm transition-opacity duration-300'
          }
          onClick={() => setMobileOpen(false)}
          tabIndex={-1}
          aria-label="Đóng menu"
        />
        <aside
          className={
            mobileOpen
              ? 'absolute inset-y-0 left-0 h-full w-72 max-w-[85vw] translate-x-0 shadow-2xl transition-transform duration-300 ease-out'
              : 'absolute inset-y-0 left-0 h-full w-72 max-w-[85vw] -translate-x-full shadow-2xl transition-transform duration-300 ease-out'
          }
        >
          {sidebar}
        </aside>
      </div>

      <div className="flex h-full min-w-0 flex-col lg:pl-64">
        <header className="z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="focus-ring rounded-lg border border-slate-200 bg-white p-2 text-slate-600 lg:hidden"
              aria-label="Mở menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            {isExamForm ? (
              <div className="flex min-w-0 items-center gap-2">
                <Link
                  to={examFormBackTo}
                  className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  aria-label={isExamCreate ? 'Quay lại danh sách đề thi' : 'Quay lại chi tiết đề thi'}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{examFormTitle}</p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  {role === 'ADMIN' ? 'Admin' : 'Giáo viên'}
                </p>
                <p className="text-sm font-semibold text-slate-800">{currentLabel}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-5 text-slate-800">{user?.fullName}</p>
              <p className="text-xs text-slate-500">
                {role === 'ADMIN' ? 'Quản trị viên' : 'Giáo viên'}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700 ring-1 ring-brand-100">
              {getInitials(user?.fullName)}
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
            <Outlet />
          </main>

          <footer className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 pb-6 text-xs text-slate-400 sm:px-6">
            <span>ViExam · Quản lý lớp học và đề thi trực tuyến</span>
            <span className="hidden sm:inline">Năm học hiệu quả</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
