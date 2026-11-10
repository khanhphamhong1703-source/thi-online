import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Edit3,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Unlock,
  UserRound,
} from 'lucide-react';
import { adminApi } from '../../api/admin';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import { formatDate, formatDateTime, getInitials } from '../../utils/format';
import PageHeader from '../../components/PageHeader';
import LoadingState from '../../components/LoadingState';
import Button from '../../components/Button';
import Badge, { StatusBadge } from '../../components/Badge';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import ResetPasswordModal from '../../components/admin/ResetPasswordModal';

export default function TeacherDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    adminApi
      .getTeacher(id)
      .then(({ data }) => {
        if (active) setTeacher(data.data);
      })
      .catch((apiError) => {
        if (active) setError(getErrorMessage(apiError, 'Không tải được thông tin giáo viên'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const handleToggleStatus = async () => {
    setStatusLoading(true);
    try {
      const { data } = await adminApi.setTeacherStatus(id, !teacher.isActive);
      setTeacher((current) => ({ ...current, ...data.data }));
      toast.success(data.message);
      setStatusOpen(false);
    } catch (apiError) {
      toast.error(getErrorMessage(apiError, 'Không thể cập nhật trạng thái'));
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) return <LoadingState label="Đang tải hồ sơ giáo viên..." />;

  if (error || !teacher) {
    return (
      <div className="surface mx-auto max-w-lg p-8 text-center">
        <p className="font-semibold text-slate-900">Không tìm thấy giáo viên</p>
        <p className="mt-1 text-sm text-slate-500">{error}</p>
        <Link to="/admin/teachers" className="mt-5 inline-flex text-sm font-semibold text-brand-600">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        backTo="/admin/teachers"
        backLabel="Quay lại danh sách giáo viên"
        title={teacher.fullName}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="surface overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-navy-950 via-navy-900 to-brand-800" />
            <div className="px-5 pb-6 sm:px-6">
              <div className="-mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-end gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-brand-50 text-xl font-bold text-brand-700 shadow-sm">
                    {getInitials(teacher.fullName)}
                  </div>
                  <div className="pb-1">
                    <h2 className="text-xl font-bold text-slate-900">{teacher.fullName}</h2>
                    <p className="text-sm text-slate-500">@{teacher.username}</p>
                  </div>
                </div>
                <div className="pb-1">
                  <StatusBadge active={teacher.isActive} />
                </div>
              </div>

              <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Email</p>
                  <p className="mt-1.5 flex items-center gap-2 text-sm text-slate-700">
                    <Mail className="h-4 w-4 text-slate-400" />
                    {teacher.email ? (
                      <a href={`mailto:${teacher.email}`} className="hover:text-brand-600">
                        {teacher.email}
                      </a>
                    ) : (
                      'Chưa cập nhật'
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Số điện thoại
                  </p>
                  <p className="mt-1.5 flex items-center gap-2 text-sm text-slate-700">
                    <Phone className="h-4 w-4 text-slate-400" />
                    {teacher.phone ? (
                      <a href={`tel:${teacher.phone}`} className="hover:text-brand-600">
                        {teacher.phone}
                      </a>
                    ) : (
                      'Chưa cập nhật'
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Ngày tạo tài khoản
                  </p>
                  <p className="mt-1.5 flex items-center gap-2 text-sm text-slate-700">
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                    {formatDateTime(teacher.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Vai trò
                  </p>
                  <p className="mt-1.5 flex items-center gap-2 text-sm text-slate-700">
                    <UserRound className="h-4 w-4 text-slate-400" />
                    Giáo viên
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Lớp học gần đây</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {teacher.classCount || 0} lớp học do giáo viên phụ trách
                </p>
              </div>
              <Link
                to={`/admin/data/classes?teacherId=${id}&teacherName=${encodeURIComponent(
                  teacher.fullName
                )}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                Xem trong dữ liệu <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {teacher.recentClasses?.length ? (
              <ul className="divide-y divide-slate-100">
                {teacher.recentClasses.map((classroom) => (
                  <li key={classroom.id} className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{classroom.name}</p>
                        <p className="text-xs text-slate-500">
                          {classroom.classCode} · {classroom.schoolYear}
                        </p>
                      </div>
                    </div>
                    <Badge variant="info">{classroom._count?.enrollments || 0} học sinh</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                icon={BookOpen}
                title="Chưa có lớp học"
                description="Giáo viên chưa tạo lớp học nào trên hệ thống."
              />
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="surface p-5">
            <h3 className="text-sm font-semibold text-slate-900">Thao tác tài khoản</h3>
            <div className="mt-4 space-y-2">
              <Button
                variant="secondary"
                icon={Edit3}
                className="w-full justify-start"
                onClick={() => navigate(`/admin/teachers/${id}/edit`)}
              >
                Chỉnh sửa thông tin
              </Button>
              <Button
                variant="secondary"
                icon={KeyRound}
                className="w-full justify-start"
                onClick={() => setResetOpen(true)}
              >
                Đặt lại mật khẩu
              </Button>
              <Button
                variant={teacher.isActive ? 'ghost-danger' : 'ghost'}
                icon={teacher.isActive ? Lock : Unlock}
                className="w-full justify-start"
                onClick={() => setStatusOpen(true)}
              >
                {teacher.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
              </Button>
            </div>
          </div>

          <div className="surface p-5">
            <h3 className="text-sm font-semibold text-slate-900">Trạng thái hiện tại</h3>
            <div className="mt-3 rounded-xl bg-slate-50 p-4">
              <StatusBadge active={teacher.isActive} />
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {teacher.isActive
                  ? 'Giáo viên có thể đăng nhập và quản lý lớp học.'
                  : 'Tài khoản đang bị khóa. Giáo viên không thể đăng nhập.'}
              </p>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Ngày tạo: {formatDate(teacher.createdAt)}
            </p>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        onConfirm={handleToggleStatus}
        loading={statusLoading}
        tone={teacher.isActive ? 'danger' : 'primary'}
        title={teacher.isActive ? 'Khóa tài khoản giáo viên?' : 'Mở khóa tài khoản?'}
        description={
          teacher.isActive
            ? `${teacher.fullName} sẽ bị đăng xuất và không thể đăng nhập cho đến khi được mở khóa.`
            : `${teacher.fullName} sẽ có thể đăng nhập trở lại ngay sau khi mở khóa.`
        }
        confirmLabel={teacher.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
      />

      <ResetPasswordModal
        teacher={teacher}
        open={resetOpen}
        onClose={() => setResetOpen(false)}
      />
    </div>
  );
}
