import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CalendarPlus,
  ClipboardList,
  GraduationCap,
  Plus,
  Users,
} from 'lucide-react';
import { classApi } from '../../api/classes';
import { getErrorMessage } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { formatDate } from '../../utils/format';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import LoadingState from '../../components/LoadingState';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';

export default function TeacherDashboardPage() {
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
    classApi
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
    return <LoadingState label="Đang tải tổng quan lớp học..." />;
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
  const recentClasses = dashboard?.recentClasses || [];

  return (
    <div>
      <PageHeader
        eyebrow="Tổng quan"
        title={`Chào ${user?.fullName || 'giáo viên'}`}
        description="Nắm nhanh lớp học, học sinh và tổ chức các ca thi trực tuyến."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/teacher/exams/new"
              className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700"
            >
              <ClipboardList className="h-4 w-4" />
              Tạo đề thi
            </Link>
            <Link
              to="/teacher/classes/new"
              className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Tạo lớp học
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Tổng số lớp học"
          value={totals.classes ?? 0}
          icon={BookOpen}
          tone="blue"
          hint="Không tính lớp đã lưu trữ"
        />
        <StatCard
          label="Học sinh đang quản lý"
          value={totals.students ?? 0}
          icon={Users}
          tone="emerald"
          hint="Học sinh duy nhất trong các lớp của bạn"
        />
        <StatCard
          label="Lớp mới"
          value={totals.newClasses ?? 0}
          icon={CalendarPlus}
          tone="amber"
          hint="Tạo trong 30 ngày qua"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="surface overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Lớp học gần đây</h2>
              <p className="mt-0.5 text-xs text-slate-500">Cập nhật mới nhất từ dữ liệu MongoDB</p>
            </div>
            <Link
              to="/teacher/classes"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Xem tất cả <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {recentClasses.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="px-5 py-3 font-semibold">Lớp học</th>
                    <th className="px-5 py-3 font-semibold">Năm học</th>
                    <th className="px-5 py-3 font-semibold">Học sinh</th>
                    <th className="px-5 py-3 font-semibold">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {recentClasses.map((classroom) => (
                    <tr key={classroom.id} className="table-row">
                      <td className="px-5 py-3.5">
                        <Link
                          to={`/teacher/classes/${classroom.id}`}
                          className="flex items-center gap-3 group"
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <BookOpen className="h-4 w-4" />
                          </span>
                          <span>
                            <span className="block font-semibold text-slate-900 group-hover:text-brand-700">
                              {classroom.name}
                            </span>
                            <span className="block text-xs text-slate-500">
                              {classroom.classCode}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{classroom.schoolYear}</td>
                      <td className="px-5 py-3.5">
                        <Badge variant="info">
                          {classroom._count?.enrollments || 0} học sinh
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {formatDate(classroom.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="Chưa có lớp học nào"
              description="Tạo lớp học đầu tiên để bắt đầu thêm học sinh và quản lý danh sách."
              action={
                <Link
                  to="/teacher/classes/new"
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  <Plus className="h-4 w-4" /> Tạo lớp học
                </Link>
              }
            />
          )}
        </section>

        <aside className="space-y-4">
          <div className="surface overflow-hidden">
            <div className="bg-navy-950 p-5 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <GraduationCap className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-base font-semibold">Bắt đầu tổ chức thi</h2>
              <p className="mt-1.5 text-sm leading-6 text-slate-400">
                Tạo lớp, thêm học sinh và soạn đề trắc nghiệm để tổ chức thi trực tuyến.
              </p>
            </div>
            <div className="space-y-2 p-4">
              <Link
                to="/teacher/exams/new"
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3.5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Tạo đề thi mới
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link
                to="/teacher/exams"
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3.5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Quản lý đề thi
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link
                to="/teacher/classes/new"
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3.5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Tạo lớp học mới
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link
                to="/teacher/classes"
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3.5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Quản lý danh sách lớp
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            </div>
          </div>

          <div className="surface p-5">
            <h3 className="text-sm font-semibold text-slate-900">Quyền dữ liệu</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Bạn chỉ có thể xem và thao tác trên lớp học do chính mình tạo. Hệ thống kiểm tra quyền
              sở hữu ở mọi API.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
