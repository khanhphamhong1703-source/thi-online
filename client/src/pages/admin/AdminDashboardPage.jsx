import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Plus,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react';
import { adminApi } from '../../api/admin';
import { getErrorMessage } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { formatDate, getInitials } from '../../utils/format';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import LoadingState from '../../components/LoadingState';
import Button from '../../components/Button';
import Badge, { StatusBadge } from '../../components/Badge';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    adminApi
      .getDashboard()
      .then(({ data }) => {
        if (active) setDashboard(data.data);
      })
      .catch((apiError) => {
        if (!active) return;
        const message = getErrorMessage(apiError, 'Không tải được dashboard');
        setError(message);
        toast.error(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey, toast]);

  if (loading && !dashboard) {
    return <LoadingState label="Đang tải tổng quan quản trị..." />;
  }

  if (error && !dashboard) {
    return (
      <div className="surface mx-auto max-w-lg p-8 text-center">
        <p className="font-semibold text-slate-900">Không tải được dữ liệu</p>
        <p className="mt-1 text-sm text-slate-500">{error}</p>
        <Button className="mt-4" onClick={() => setReloadKey((value) => value + 1)}>
          Thử lại
        </Button>
      </div>
    );
  }

  const totals = dashboard?.totals || {};

  return (
    <div>
      <PageHeader
        eyebrow="Tổng quan"
        title={`Chào ${user?.fullName || 'quản trị viên'}`}
        description="Theo dõi nhanh đội ngũ giáo viên và trạng thái tài khoản trong hệ thống."
        actions={
          <Link
            to="/admin/teachers/new"
            className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Tạo giáo viên
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tổng số giáo viên"
          value={totals.teachers ?? 0}
          icon={Users}
          tone="blue"
          hint="Toàn bộ tài khoản giáo viên"
        />
        <StatCard
          label="Đang hoạt động"
          value={totals.active ?? 0}
          icon={UserCheck}
          tone="emerald"
          hint="Có thể đăng nhập hệ thống"
        />
        <StatCard
          label="Tài khoản bị khóa"
          value={totals.locked ?? 0}
          icon={UserX}
          tone="rose"
          hint="Tạm thời không thể đăng nhập"
        />
        <StatCard
          label="Giáo viên mới"
          value={totals.newTeachers ?? 0}
          icon={UserPlus}
          tone="violet"
          hint="Được tạo trong 30 ngày qua"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="surface overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Giáo viên mới nhất</h2>
              <p className="mt-0.5 text-xs text-slate-500">5 tài khoản được tạo gần đây</p>
            </div>
            <Link
              to="/admin/teachers"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Xem tất cả <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {dashboard?.recentTeachers?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="px-5 py-3 font-semibold">Giáo viên</th>
                    <th className="px-5 py-3 font-semibold">Username</th>
                    <th className="px-5 py-3 font-semibold">Trạng thái</th>
                    <th className="px-5 py-3 font-semibold">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recentTeachers.map((teacher) => (
                    <tr key={teacher.id} className="table-row">
                      <td className="px-5 py-3.5">
                        <Link
                          to={`/admin/teachers/${teacher.id}`}
                          className="flex items-center gap-3"
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                            {getInitials(teacher.fullName)}
                          </span>
                          <span>
                            <span className="block font-medium text-slate-900">{teacher.fullName}</span>
                            <span className="block text-xs text-slate-500">
                              {teacher.email || 'Chưa có email'}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">@{teacher.username}</td>
                      <td className="px-5 py-3.5">
                        <StatusBadge active={teacher.isActive} />
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(teacher.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              Chưa có giáo viên nào. Hãy tạo tài khoản giáo viên đầu tiên.
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="surface p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-950 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-sm font-semibold text-slate-900">Quyền quản trị</h2>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">
              Tài khoản của bạn có thể tạo giáo viên, khóa/mở khóa và đặt lại mật khẩu. Mọi thay
              đổi có hiệu lực ngay khi giáo viên đăng nhập.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="info">JWT HttpOnly</Badge>
              <Badge variant="active">Phân quyền</Badge>
            </div>
          </div>

          <div className="surface p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Quản lý lớp học</p>
                <p className="text-xs text-slate-500">Giáo viên tự quản lý lớp của mình</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Admin không truy cập dữ liệu lớp học hoặc học sinh. Phạm vi này thuộc tài khoản giáo
              viên sở hữu lớp.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
