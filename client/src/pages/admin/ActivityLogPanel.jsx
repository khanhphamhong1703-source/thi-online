import { useEffect, useState } from 'react';
import { History, RefreshCcw } from 'lucide-react';
import { activityApi } from '../../api/activity';
import { adminDataApi } from '../../api/adminData';
import { getErrorMessage } from '../../api/client';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDateTime } from '../../utils/format';
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
import Pagination from '../../components/Pagination';
import SearchInput from '../../components/SearchInput';
import Select from '../../components/Select';
import { inputBaseClass } from '../../components/Input';

export default function ActivityLogPanel() {
  const [teachers, setTeachers] = useState([]);
  const [teacherId, setTeacherId] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
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
    const loadTeachers = async () => {
      const collected = [];
      let nextPage = 1;
      let totalPages = 1;
      try {
        do {
          const { data: payload } = await adminDataApi.listTeachers({
            page: nextPage,
            limit: 100,
          });
          collected.push(...(payload.data || []));
          totalPages = payload.pagination?.totalPages ?? 1;
          nextPage += 1;
        } while (nextPage <= totalPages && nextPage <= 20);
        if (active) setTeachers(collected);
      } catch {
        if (active) setTeachers([]);
      }
    };
    loadTeachers();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const params = { page, limit: 15 };
    if (debouncedSearch) params.search = debouncedSearch;
    if (teacherId) params.teacherId = teacherId;
    if (category !== 'all') params.category = category;
    if (status !== 'all') params.status = status;
    if (from) params.from = new Date(`${from}T00:00:00`).toISOString();
    if (to) params.to = new Date(`${to}T23:59:59.999`).toISOString();

    activityApi
      .adminList(params)
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
  }, [page, debouncedSearch, teacherId, category, status, from, to, reloadKey]);

  const resetFilters = () => {
    setTeacherId('');
    setCategory('all');
    setStatus('all');
    setFrom('');
    setTo('');
    setSearchTerm('');
    setPage(1);
  };

  const selectedStatus = selected
    ? ACTIVITY_STATUS[selected.status] || ACTIVITY_STATUS.SUCCESS
    : null;

  return (
    <section className="surface overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo giáo viên, lớp, học sinh, đề thi..."
            className="lg:max-w-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={teacherId}
              aria-label="Lọc theo giáo viên"
              onChange={(event) => {
                setTeacherId(event.target.value);
                setPage(1);
              }}
              className="w-full sm:w-52"
            >
              <option value="">Tất cả giáo viên</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.fullName} (@{teacher.username})
                </option>
              ))}
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

        <div className="flex flex-wrap items-center gap-2">
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
          <Select
            value={status}
            aria-label="Lọc theo kết quả"
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="w-full sm:w-40"
          >
            <option value="all">Mọi kết quả</option>
            <option value="SUCCESS">Thành công</option>
            <option value="FAILED">Thất bại</option>
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

      {error ? (
        <div className="border-b border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {loading && !data.items.length ? (
        <LoadingState label="Đang tải lịch sử hoạt động..." />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={History}
          title="Không có hoạt động"
          description="Thử thay đổi bộ lọc hoặc khoảng thời gian."
        />
      ) : (
        <div className={`hidden overflow-x-auto sm:block ${loading ? 'opacity-60' : ''}`}>
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 font-semibold">Thời gian</th>
                <th className="px-4 py-3 font-semibold">Giáo viên</th>
                <th className="px-4 py-3 font-semibold">Hành động</th>
                <th className="px-4 py-3 font-semibold">Kết quả</th>
                <th className="px-4 py-3 font-semibold">Dữ liệu</th>
                <th className="px-4 py-3 font-semibold">Thiết bị</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((log) => {
                const statusMeta = ACTIVITY_STATUS[log.status] || ACTIVITY_STATUS.SUCCESS;
                const summary = describeActivityData(log);

                return (
                  <tr
                    key={log.id}
                    className="table-row cursor-pointer"
                    onClick={() => setSelected(log)}
                  >
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{log.actorFullName}</p>
                      <p className="text-xs text-slate-500">@{log.actorUsername}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {getActionLabel(log.action)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                      {log.reason ? (
                        <p className="mt-1 max-w-[220px] text-xs text-rose-600">{log.reason}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <p className="max-w-[320px] truncate" title={summary}>
                        {summary || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {[log.device, log.browser].filter(Boolean).join(' · ') || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data.items.length > 0 ? (
        <ul className={`divide-y divide-slate-100 sm:hidden ${loading ? 'opacity-60' : ''}`}>
          {data.items.map((log) => {
            const statusMeta = ACTIVITY_STATUS[log.status] || ACTIVITY_STATUS.SUCCESS;
            const summary = describeActivityData(log);

            return (
              <li key={log.id}>
                <button
                  type="button"
                  onClick={() => setSelected(log)}
                  className="focus-ring flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-slate-50"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {getActionLabel(log.action)}
                    </span>
                    <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                  </span>
                  <span className="text-xs text-slate-500">
                    {log.actorFullName} (@{log.actorUsername})
                  </span>
                  {log.reason ? (
                    <span className="text-xs text-rose-600">{log.reason}</span>
                  ) : null}
                  <span className="truncate text-xs text-slate-700">{summary || '—'}</span>
                  <span className="text-[11px] text-slate-400">
                    {formatDateTime(log.createdAt)}
                    {[log.device, log.browser].filter(Boolean).length
                      ? ` · ${[log.device, log.browser].filter(Boolean).join(' · ')}`
                      : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {data.pagination ? (
        <Pagination
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          limit={data.pagination.limit}
          onChange={setPage}
        />
      ) : null}

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? getActionLabel(selected.action) : ''}
        description={selected ? formatDateTime(selected.createdAt) : ''}
        size="md"
      >
        {selected ? (
          <dl className="space-y-1">
            <div className="flex justify-between gap-4 border-b border-slate-100 py-2">
              <dt className="text-xs font-medium text-slate-500">Giáo viên</dt>
              <dd className="text-sm text-slate-800">
                {selected.actorFullName} (@{selected.actorUsername})
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-100 py-2">
              <dt className="text-xs font-medium text-slate-500">Kết quả</dt>
              <dd>
                <Badge variant={selectedStatus.variant}>{selectedStatus.label}</Badge>
                {selected.reason ? (
                  <span className="ml-2 text-xs text-rose-600">{selected.reason}</span>
                ) : null}
              </dd>
            </div>
            {selected.targetLabel ? (
              <div className="flex justify-between gap-4 border-b border-slate-100 py-2">
                <dt className="text-xs font-medium text-slate-500">Đối tượng</dt>
                <dd className="text-sm text-slate-800">{selected.targetLabel}</dd>
              </div>
            ) : null}
            {selected.data
              ? Object.entries(selected.data).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between gap-4 border-b border-slate-100 py-2"
                  >
                    <dt className="text-xs font-medium text-slate-500">
                      {ACTIVITY_DATA_LABELS[key] || key}
                    </dt>
                    <dd className="text-right text-sm text-slate-800">
                      {formatActivityValue(key, value)}
                    </dd>
                  </div>
                ))
              : null}
            <div className="flex justify-between gap-4 border-b border-slate-100 py-2">
              <dt className="text-xs font-medium text-slate-500">Thiết bị</dt>
              <dd className="text-sm text-slate-800">
                {[selected.device, selected.browser].filter(Boolean).join(' · ') || '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-xs font-medium text-slate-500">IP</dt>
              <dd className="text-sm text-slate-800">{selected.ip || '—'}</dd>
            </div>
          </dl>
        ) : null}
      </Modal>
    </section>
  );
}
