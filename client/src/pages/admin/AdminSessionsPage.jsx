import { useEffect, useState } from 'react';
import { Laptop, RefreshCcw, ShieldOff, Trash2 } from 'lucide-react';
import { adminSessionsApi } from '../../api/sessions';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDateTime } from '../../utils/format';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import SearchInput from '../../components/SearchInput';
import Select from '../../components/Select';

const STATUS_META = {
  ACTIVE: { label: 'Đang hoạt động', variant: 'active' },
  REVOKED: { label: 'Đã thu hồi', variant: 'locked' },
  EXPIRED: { label: 'Hết hạn', variant: 'warning' },
};

export default function AdminSessionsPage() {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [status, setStatus] = useState('ACTIVE');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], pagination: null });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    adminSessionsApi
      .list({ page, limit: 20, search: debouncedSearch, status })
      .then(({ data: payload }) => {
        if (!active) return;
        setData({ items: payload.data || [], pagination: payload.pagination });
        setSummary(payload.summary || null);
      })
      .catch((apiError) => {
        if (!active) return;
        setError(getErrorMessage(apiError, 'Không tải được danh sách phiên đăng nhập'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, debouncedSearch, status, reloadKey]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await adminSessionsApi.remove(deleteTarget.id);
      toast.success(`Đã xoá phiên của ${deleteTarget.user.fullName}`);
      setDeleteTarget(null);
      setReloadKey((value) => value + 1);
    } catch (apiError) {
      toast.error(getErrorMessage(apiError, 'Không thể xoá phiên đăng nhập'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeAll = async () => {
    if (!revokeTarget) return;
    setActionLoading(true);
    try {
      await adminSessionsApi.revokeAll(revokeTarget.id);
      toast.success(`Đã thu hồi toàn bộ phiên của ${revokeTarget.fullName}`);
      setRevokeTarget(null);
      setReloadKey((value) => value + 1);
    } catch (apiError) {
      toast.error(getErrorMessage(apiError, 'Không thể thu hồi phiên đăng nhập'));
    } finally {
      setActionLoading(false);
    }
  };

  const firstSessionByUser = new Map();
  data.items.forEach((session) => {
    if (!firstSessionByUser.has(session.user.id)) {
      firstSessionByUser.set(session.user.id, session.id);
    }
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="Phiên đăng nhập" fill />

      <section className="surface flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 flex-col gap-3 border-b border-slate-100 p-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <SearchInput
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo tên hoặc username..."
              className="lg:max-w-sm"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={status}
                aria-label="Lọc theo trạng thái phiên"
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-44"
              >
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="REVOKED">Đã thu hồi</option>
                <option value="EXPIRED">Hết hạn</option>
                <option value="ALL">Tất cả phiên</option>
              </Select>
              <Button
                variant="secondary"
                icon={RefreshCcw}
                onClick={() => setReloadKey((value) => value + 1)}
              >
                Làm mới
              </Button>
            </div>
          </div>

          {summary ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Badge variant="active">Đang hoạt động: {summary.active}</Badge>
              <Badge variant="locked">Đã thu hồi: {summary.revoked}</Badge>
              <Badge variant="warning">Hết hạn: {summary.expired}</Badge>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="shrink-0 border-b border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-auto">
          {loading && !data.items.length ? (
            <LoadingState label="Đang tải phiên đăng nhập..." />
          ) : data.items.length === 0 ? (
            <EmptyState
              icon={Laptop}
              title="Không có phiên đăng nhập"
              description="Chỉ quản lý phiên của tài khoản giáo viên. Thử đổi bộ lọc hoặc trạng thái phiên."
            />
          ) : (
            <>
              <div className={`hidden sm:block ${loading ? 'opacity-60' : ''}`}>
                <table className="w-full min-w-[1080px] text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="table-header">
                      <th className="px-4 py-3 font-semibold">Tài khoản</th>
                      <th className="px-4 py-3 font-semibold">Thiết bị</th>
                      <th className="px-4 py-3 font-semibold">IP</th>
                      <th className="px-4 py-3 font-semibold">Đăng nhập</th>
                      <th className="px-4 py-3 font-semibold">Hết hạn</th>
                      <th className="px-4 py-3 font-semibold">Trạng thái</th>
                      <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((session) => {
                      const statusMeta = STATUS_META[session.status] || STATUS_META.ACTIVE;
                      return (
                        <tr key={session.id} className="table-row">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">
                              {session.user.fullName}
                            </p>
                            <p className="text-xs text-slate-500">@{session.user.username}</p>
                            {!session.user.isActive ? (
                              <p className="mt-1 text-xs text-rose-600">Tài khoản đã khóa</p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {[session.device, session.browser].filter(Boolean).join(' · ')}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {session.ip || '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {formatDateTime(session.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {formatDateTime(session.expiresAt)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              {firstSessionByUser.get(session.user.id) === session.id ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  icon={ShieldOff}
                                  onClick={() => setRevokeTarget(session.user)}
                                  title="Thu hồi tất cả phiên của tài khoản"
                                >
                                  Thu hồi tất cả
                                </Button>
                              ) : null}
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={Trash2}
                                onClick={() => setDeleteTarget(session)}
                                title="Xoá refresh token"
                              >
                                Xoá
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <ul className={`divide-y divide-slate-100 sm:hidden ${loading ? 'opacity-60' : ''}`}>
                {data.items.map((session) => {
                  const statusMeta = STATUS_META[session.status] || STATUS_META.ACTIVE;
                  return (
                    <li key={session.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">
                            {session.user.fullName}
                          </p>
                          <p className="text-xs text-slate-500">@{session.user.username}</p>
                        </div>
                        <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">
                        {[session.device, session.browser].filter(Boolean).join(' · ')}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        IP: {session.ip || '—'} · Đăng nhập: {formatDateTime(session.createdAt)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Hết hạn: {formatDateTime(session.expiresAt)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {firstSessionByUser.get(session.user.id) === session.id ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={ShieldOff}
                            onClick={() => setRevokeTarget(session.user)}
                          >
                            Thu hồi tất cả
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Trash2}
                          onClick={() => setDeleteTarget(session)}
                        >
                          Xoá
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {data.pagination ? (
          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            total={data.pagination.total}
            limit={data.pagination.limit}
            onChange={setPage}
          />
        ) : null}
      </section>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={actionLoading}
        title="Xoá refresh token"
        confirmLabel="Xoá phiên"
        description={
          deleteTarget
            ? `Xoá phiên của ${deleteTarget.user.fullName} trên ${deleteTarget.device}? Thiết bị này sẽ không thể tự gia hạn phiên; access token hiện tại hết hạn sau tối đa 15 phút.`
            : ''
        }
      />

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevokeAll}
        loading={actionLoading}
        title="Thu hồi tất cả phiên"
        confirmLabel="Thu hồi tất cả"
        description={
          revokeTarget
            ? `Toàn bộ access token và refresh token của ${revokeTarget.fullName} sẽ mất hiệu lực ngay.`
            : ''
        }
      />
    </div>
  );
}
