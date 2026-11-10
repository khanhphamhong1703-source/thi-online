import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Edit3,
  Eye,
  KeyRound,
  Lock,
  Plus,
  RefreshCcw,
  Trash2,
  Unlock,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react';
import { adminApi } from '../../api/admin';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDate, getInitials } from '../../utils/format';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import SearchInput from '../../components/SearchInput';
import Select from '../../components/Select';
import Button from '../../components/Button';
import Badge, { StatusBadge } from '../../components/Badge';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import ConfirmDialog from '../../components/ConfirmDialog';
import ResetPasswordModal from '../../components/admin/ResetPasswordModal';
import DeleteEntityDialog from '../../components/admin/DeleteEntityDialog';

export default function TeacherListPage() {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [totals, setTotals] = useState(null);

  useEffect(() => {
    let active = true;
    adminApi
      .getDashboard()
      .then(({ data }) => {
        if (active) setTotals(data.data?.totals || null);
      })
      .catch(() => {
        if (active) setTotals(null);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    adminApi
      .listTeachers({ page, limit: 10, search: debouncedSearch, status })
      .then(({ data: payload }) => {
        if (!active) return;
        setData({ items: payload.data, pagination: payload.pagination });
      })
      .catch((apiError) => {
        if (!active) return;
        const message = getErrorMessage(apiError, 'Không tải được danh sách giáo viên');
        setError(message);
        toast.error(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, debouncedSearch, status, reloadKey, toast]);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(1);
  };

  const handleStatusFilter = (event) => {
    setStatus(event.target.value);
    setPage(1);
  };

  const handleToggleStatus = async () => {
    if (!statusTarget) return;
    setStatusLoading(true);
    try {
      const nextStatus = !statusTarget.isActive;
      await adminApi.setTeacherStatus(statusTarget.id, nextStatus);
      toast.success(
        nextStatus
          ? `Đã mở khóa tài khoản ${statusTarget.fullName}`
          : `Đã khóa tài khoản ${statusTarget.fullName}`
      );
      setStatusTarget(null);
      setReloadKey((value) => value + 1);
    } catch (apiError) {
      toast.error(getErrorMessage(apiError, 'Không thể cập nhật trạng thái tài khoản'));
    } finally {
      setStatusLoading(false);
    }
  };

  const pagination = data.pagination;
  const hasFilters = Boolean(debouncedSearch) || status !== 'all';
  const showInitialLoading = loading && data.items.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="Quản lý giáo viên" fill />

      <div className="mb-5 grid shrink-0 grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Tổng số giáo viên"
          value={totals?.teachers ?? 0}
          icon={Users}
          tone="blue"
          hint="Toàn bộ tài khoản giáo viên"
        />
        <StatCard
          label="Đang hoạt động"
          value={totals?.active ?? 0}
          icon={UserCheck}
          tone="emerald"
          hint="Có thể đăng nhập hệ thống"
        />
        <StatCard
          label="Tài khoản bị khóa"
          value={totals?.locked ?? 0}
          icon={UserX}
          tone="rose"
          hint="Tạm thời không thể đăng nhập"
        />
        <StatCard
          label="Giáo viên mới"
          value={totals?.newTeachers ?? 0}
          icon={UserPlus}
          tone="violet"
          hint="Được tạo trong 30 ngày qua"
        />
      </div>

      <div className="surface flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <SearchInput
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Tìm theo họ tên, username, email..."
            className="w-full sm:max-w-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="status-filter" className="whitespace-nowrap text-sm text-slate-500">
              Trạng thái
            </label>
            <Select
              id="status-filter"
              value={status}
              onChange={handleStatusFilter}
              className="w-40"
            >
              <option value="all">Tất cả</option>
              <option value="active">Đang hoạt động</option>
              <option value="locked">Đã khóa</option>
            </Select>
            <Link
              to="/admin/teachers/new"
              className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700"
            >
              <Plus className="h-4 w-4" />
              Tạo giáo viên
            </Link>
          </div>
        </div>

        {error && data.items.length > 0 ? (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-5 py-3 text-sm text-amber-800">
            <span>{error}</span>
            <button
              type="button"
              className="inline-flex items-center gap-1 font-semibold"
              onClick={() => setReloadKey((value) => value + 1)}
            >
              <RefreshCcw className="h-3.5 w-3.5" /> Thử lại
            </button>
          </div>
        ) : null}

        {showInitialLoading ? (
          <LoadingState label="Đang tải danh sách giáo viên..." />
        ) : error && data.items.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Không tải được dữ liệu"
            description={error}
            action={
              <Button variant="secondary" icon={RefreshCcw} onClick={() => setReloadKey((v) => v + 1)}>
                Thử lại
              </Button>
            }
          />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={Users}
            title={hasFilters ? 'Không tìm thấy giáo viên phù hợp' : 'Chưa có giáo viên nào'}
            description={
              hasFilters
                ? 'Hãy thử từ khóa khác hoặc bỏ bộ lọc trạng thái.'
                : 'Tạo tài khoản giáo viên đầu tiên để bắt đầu quản lý lớp học.'
            }
            action={
              hasFilters ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearchTerm('');
                    setStatus('all');
                    setPage(1);
                  }}
                >
                  Xóa bộ lọc
                </Button>
              ) : (
                <Link
                  to="/admin/teachers/new"
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  <Plus className="h-4 w-4" /> Tạo giáo viên
                </Link>
              )
            }
          />
        ) : (
          <>
            <div className="hidden min-h-0 flex-1 overflow-auto lg:block">
              <table className="w-full min-w-[960px] text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="table-header">
                    <th className="w-14 px-5 py-3.5 font-semibold">STT</th>
                    <th className="px-4 py-3.5 font-semibold">Họ và tên</th>
                    <th className="px-4 py-3.5 font-semibold">Username</th>
                    <th className="px-4 py-3.5 font-semibold">Email</th>
                    <th className="px-4 py-3.5 font-semibold">Số điện thoại</th>
                    <th className="px-4 py-3.5 font-semibold">Trạng thái</th>
                    <th className="px-4 py-3.5 font-semibold">Ngày tạo</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className={loading ? 'opacity-60' : ''}>
                  {data.items.map((teacher, index) => (
                    <tr key={teacher.id} className="table-row">
                      <td className="px-5 py-4 text-slate-500">
                        {(pagination.page - 1) * pagination.limit + index + 1}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                            {getInitials(teacher.fullName)}
                          </span>
                          <div className="min-w-0">
                            <Link
                              to={`/admin/teachers/${teacher.id}`}
                              className="block truncate font-semibold text-slate-900 hover:text-brand-700"
                            >
                              {teacher.fullName}
                            </Link>
                            <span className="text-xs text-slate-500">
                              {teacher.classCount || 0} lớp học
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="neutral">@{teacher.username}</Badge>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {teacher.email || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {teacher.phone || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge active={teacher.isActive} />
                      </td>
                      <td className="px-4 py-4 text-slate-500">{formatDate(teacher.createdAt)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/admin/teachers/${teacher.id}`}
                            className="focus-ring rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                            title="Xem chi tiết"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            to={`/admin/teachers/${teacher.id}/edit`}
                            className="focus-ring rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                            title="Chỉnh sửa"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setResetTarget(teacher)}
                            className="focus-ring rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                            title="Đặt lại mật khẩu"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatusTarget(teacher)}
                            className={
                              teacher.isActive
                                ? 'focus-ring rounded-lg p-2 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700'
                                : 'focus-ring rounded-lg p-2 text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700'
                            }
                            title={teacher.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                          >
                            {teacher.isActive ? (
                              <Lock className="h-4 w-4" />
                            ) : (
                              <Unlock className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ type: 'teacher', item: teacher })}
                            className="focus-ring rounded-lg p-2 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700"
                            title="Xoá vĩnh viễn"
                            aria-label={`Xoá vĩnh viễn ${teacher.fullName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={`min-h-0 flex-1 divide-y divide-slate-100 overflow-auto lg:hidden ${loading ? 'opacity-60' : ''}`}>
              {data.items.map((teacher) => (
                <div key={teacher.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                        {getInitials(teacher.fullName)}
                      </span>
                      <div className="min-w-0">
                        <Link
                          to={`/admin/teachers/${teacher.id}`}
                          className="block truncate font-semibold text-slate-900 hover:text-brand-700"
                        >
                          {teacher.fullName}
                        </Link>
                        <p className="truncate text-xs text-slate-500">@{teacher.username}</p>
                      </div>
                    </div>
                    <StatusBadge active={teacher.isActive} />
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <dt className="text-[11px] font-medium text-slate-500">Email</dt>
                      <dd className="mt-0.5 truncate text-sm font-medium text-slate-800">
                        {teacher.email || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-medium text-slate-500">Số điện thoại</dt>
                      <dd className="mt-0.5 text-sm font-medium text-slate-800">
                        {teacher.phone || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-medium text-slate-500">Lớp học</dt>
                      <dd className="mt-0.5 text-sm font-medium text-slate-800">
                        {teacher.classCount || 0}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-medium text-slate-500">Ngày tạo</dt>
                      <dd className="mt-0.5 text-sm font-medium text-slate-800">
                        {formatDate(teacher.createdAt)}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-2 flex items-center justify-end gap-1">
                    <Link
                      to={`/admin/teachers/${teacher.id}`}
                      className="focus-ring rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                      title="Xem chi tiết"
                      aria-label={`Xem chi tiết ${teacher.fullName}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link
                      to={`/admin/teachers/${teacher.id}/edit`}
                      className="focus-ring rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                      title="Chỉnh sửa"
                      aria-label={`Chỉnh sửa ${teacher.fullName}`}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setResetTarget(teacher)}
                      className="focus-ring rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                      title="Đặt lại mật khẩu"
                      aria-label={`Đặt lại mật khẩu ${teacher.fullName}`}
                    >
                      <KeyRound className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusTarget(teacher)}
                      className={
                        teacher.isActive
                          ? 'focus-ring rounded-lg p-2 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700'
                          : 'focus-ring rounded-lg p-2 text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700'
                      }
                      title={teacher.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                      aria-label={`${teacher.isActive ? 'Khóa' : 'Mở khóa'} ${teacher.fullName}`}
                    >
                      {teacher.isActive ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Unlock className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ type: 'teacher', item: teacher })}
                      className="focus-ring rounded-lg p-2 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700"
                      title="Xoá vĩnh viễn"
                      aria-label={`Xoá vĩnh viễn ${teacher.fullName}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onChange={setPage}
            />
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleToggleStatus}
        loading={statusLoading}
        tone={statusTarget?.isActive ? 'danger' : 'primary'}
        title={statusTarget?.isActive ? 'Khóa tài khoản giáo viên?' : 'Mở khóa tài khoản?'}
        description={
          statusTarget?.isActive
            ? `${statusTarget?.fullName} sẽ không thể đăng nhập cho đến khi tài khoản được mở khóa. Dữ liệu lớp học vẫn được giữ nguyên.`
            : `${statusTarget?.fullName} sẽ có thể đăng nhập và tiếp tục quản lý lớp học ngay sau khi mở khóa.`
        }
        confirmLabel={statusTarget?.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
      />

      <ResetPasswordModal
        teacher={resetTarget || {}}
        open={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
      />

      <DeleteEntityDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => setReloadKey((value) => value + 1)}
      />
    </div>
  );
}
