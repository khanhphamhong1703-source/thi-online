import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ClipboardList,
  History,
  KeyRound,
  LogIn,
  RefreshCcw,
  UserRound,
} from 'lucide-react';
import { activityApi } from '../../api/activity';
import { getErrorMessage } from '../../api/client';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDate, formatDateTime } from '../../utils/format';
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_DATA_LABELS,
  ACTIVITY_STATUS,
  describeActivityData,
  formatActivityValue,
  getActionLabel,
} from '../../utils/activity';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import SearchInput from '../../components/SearchInput';
import Select from '../../components/Select';
import { inputBaseClass } from '../../components/Input';

const CATEGORY_META = {
  AUTH: { icon: LogIn, tone: 'bg-blue-50 text-blue-600' },
  CLASS: { icon: BookOpen, tone: 'bg-amber-50 text-amber-600' },
  STUDENT: { icon: UserRound, tone: 'bg-emerald-50 text-emerald-600' },
  EXAM: { icon: ClipboardList, tone: 'bg-violet-50 text-violet-600' },
  ACCOUNT: { icon: KeyRound, tone: 'bg-slate-100 text-slate-600' },
};

function dayKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function groupLabel(value) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (dayKey(date) === dayKey(today)) return 'Hôm nay';
  if (dayKey(date) === dayKey(yesterday)) return 'Hôm qua';
  return formatDate(date);
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-2 last:border-0 sm:flex-row sm:justify-between sm:gap-6">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-slate-800 sm:text-right">{value}</dd>
    </div>
  );
}

export default function ActivityPage() {
  const [category, setCategory] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const params = { page, limit: 20 };
    if (debouncedSearch) params.search = debouncedSearch;
    if (category !== 'all') params.category = category;
    if (from) params.from = new Date(`${from}T00:00:00`).toISOString();
    if (to) params.to = new Date(`${to}T23:59:59.999`).toISOString();

    activityApi
      .mine(params)
      .then(({ data: payload }) => {
        if (!active) return;
        setData({ items: payload.data || [], pagination: payload.pagination });
      })
      .catch((apiError) => {
        if (!active) return;
        setError(getErrorMessage(apiError, 'Không tải được lịch sử hoạt động'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, debouncedSearch, category, from, to, reloadKey]);

  const groups = useMemo(() => {
    const map = new Map();
    data.items.forEach((log) => {
      const key = dayKey(log.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(log);
    });
    return [...map.values()].map((logs, index) => ({
      key: `${dayKey(logs[0].createdAt)}-${index}`,
      label: groupLabel(logs[0].createdAt),
      logs,
    }));
  }, [data.items]);

  const resetFilters = () => {
    setCategory('all');
    setFrom('');
    setTo('');
    setSearchTerm('');
    setPage(1);
  };

  const selectedStatus = selected ? ACTIVITY_STATUS[selected.status] || ACTIVITY_STATUS.SUCCESS : null;

  return (
    <div>
      <PageHeader
        eyebrow="Tài khoản giáo viên"
        title="Lịch sử hoạt động"
        description="Các lần đăng nhập và thao tác làm thay đổi dữ liệu của bạn, mới nhất ở trên cùng."
        actions={
          <Button variant="secondary" icon={RefreshCcw} onClick={() => setReloadKey((value) => value + 1)}>
            Làm mới
          </Button>
        }
      />

      <section className="surface mb-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo tên lớp, học sinh, đề thi..."
            className="lg:max-w-xs"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              value={category}
              aria-label="Nhóm hoạt động"
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
              className="w-full sm:w-40"
            >
              <option value="all">Tất cả hoạt động</option>
              {ACTIVITY_CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setPage(1);
                }}
                className={`${inputBaseClass} w-full sm:w-36`}
                aria-label="Từ ngày"
              />
              <span className="text-xs text-slate-400">đến</span>
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(event) => {
                  setTo(event.target.value);
                  setPage(1);
                }}
                className={`${inputBaseClass} w-full sm:w-36`}
                aria-label="Đến ngày"
              />
            </div>
            <Button variant="ghost" onClick={resetFilters}>
              Xoá lọc
            </Button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="surface overflow-hidden">
        {loading && !data.items.length ? (
          <LoadingState label="Đang tải lịch sử hoạt động..." />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={History}
            title="Chưa có hoạt động nào"
            description="Các thao tác của bạn sẽ xuất hiện tại đây sau khi thực hiện."
          />
        ) : (
          <div className={loading ? 'opacity-60' : ''}>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="w-24 px-4 py-3 text-left font-semibold">Thời gian</th>
                    <th className="px-4 py-3 text-left font-semibold">Hành động</th>
                    <th className="w-32 px-4 py-3 text-left font-semibold">Kết quả</th>
                    <th className="px-4 py-3 text-left font-semibold">Dữ liệu</th>
                    <th className="w-48 px-4 py-3 text-left font-semibold">Thiết bị</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <Fragment key={group.key}>
                      <tr>
                        <td
                          colSpan={5}
                          className="border-y border-slate-100 bg-slate-50/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                        >
                          {group.label}
                        </td>
                      </tr>
                      {group.logs.map((log) => {
                        const meta = CATEGORY_META[log.category] || CATEGORY_META.ACCOUNT;
                        const Icon = meta.icon;
                        const status = ACTIVITY_STATUS[log.status] || ACTIVITY_STATUS.SUCCESS;
                        const summary = describeActivityData(log);

                        return (
                          <tr
                            key={log.id}
                            className="table-row cursor-pointer"
                            onClick={() => setSelected(log)}
                          >
                            <td className="px-4 py-3 align-top text-xs font-medium text-slate-500">
                              {formatTime(log.createdAt)}
                            </td>
                            <td className="px-4 py-3 align-top">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelected(log);
                                }}
                                className="focus-ring flex items-center gap-2 rounded-md text-left font-semibold text-slate-900 hover:text-brand-600"
                                aria-label={`Xem chi tiết: ${getActionLabel(log.action)}`}
                              >
                                <span
                                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${meta.tone}`}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                </span>
                                {getActionLabel(log.action)}
                              </button>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <Badge variant={status.variant}>{status.label}</Badge>
                              {log.status === 'FAILED' && log.reason ? (
                                <p className="mt-1 max-w-[180px] text-xs text-rose-600">{log.reason}</p>
                              ) : null}
                            </td>
                            <td className="px-4 py-3 align-top text-slate-700">
                              <p className="max-w-[340px] truncate" title={summary}>
                                {summary || '—'}
                              </p>
                            </td>
                            <td className="px-4 py-3 align-top text-xs text-slate-500">
                              {[log.device, log.browser].filter(Boolean).join(' · ') || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sm:hidden">
              {groups.map((group) => (
                <div key={group.key}>
                  <p className="border-y border-slate-100 bg-slate-50/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {group.label}
                  </p>
                  <ul className="divide-y divide-slate-100">
                    {group.logs.map((log) => {
                      const meta = CATEGORY_META[log.category] || CATEGORY_META.ACCOUNT;
                      const Icon = meta.icon;
                      const status = ACTIVITY_STATUS[log.status] || ACTIVITY_STATUS.SUCCESS;
                      const summary = describeActivityData(log);

                      return (
                        <li key={log.id}>
                          <button
                            type="button"
                            onClick={() => setSelected(log)}
                            className="focus-ring flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                          >
                            <span
                              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.tone}`}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-slate-900">
                                  {getActionLabel(log.action)}
                                </span>
                                <Badge variant={status.variant}>{status.label}</Badge>
                              </span>
                              {log.status === 'FAILED' && log.reason ? (
                                <span className="mt-0.5 block text-xs text-rose-600">{log.reason}</span>
                              ) : null}
                              <span className="mt-0.5 block truncate text-xs text-slate-500">
                                {summary || '—'}
                              </span>
                              <span className="mt-0.5 block text-[11px] text-slate-400">
                                {formatTime(log.createdAt)}
                                {[log.device, log.browser].filter(Boolean).length
                                  ? ` · ${[log.device, log.browser].filter(Boolean).join(' · ')}`
                                  : ''}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

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

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? getActionLabel(selected.action) : ''}
        description={selected ? formatDateTime(selected.createdAt) : ''}
        size="md"
      >
        {selected ? (
          <dl>
            <DetailRow label="Thời gian" value={formatDateTime(selected.createdAt)} />
            <DetailRow label="Người thao tác" value={selected.actorFullName} />
            <DetailRow
              label="Kết quả"
              value={
                <span className="inline-flex items-center gap-2">
                  <Badge variant={selectedStatus.variant}>{selectedStatus.label}</Badge>
                  {selected.reason ? (
                    <span className="text-xs text-rose-600">{selected.reason}</span>
                  ) : null}
                </span>
              }
            />
            {selected.targetLabel ? (
              <DetailRow label="Đối tượng" value={selected.targetLabel} />
            ) : null}
            {selected.data
              ? Object.entries(selected.data).map(([key, value]) => (
                  <DetailRow
                    key={key}
                    label={ACTIVITY_DATA_LABELS[key] || key}
                    value={formatActivityValue(key, value)}
                  />
                ))
              : null}
            <DetailRow
              label="Thiết bị"
              value={[selected.device, selected.browser].filter(Boolean).join(' · ') || '—'}
            />
            <DetailRow label="IP" value={selected.ip || '—'} />
          </dl>
        ) : null}
      </Modal>
    </div>
  );
}
