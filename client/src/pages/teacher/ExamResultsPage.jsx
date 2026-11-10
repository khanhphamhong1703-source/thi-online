import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BarChart3, Download, Eye, RefreshCcw, RotateCcw, Users } from 'lucide-react';
import { examApi } from '../../api/exams';
import { downloadBlob, getErrorMessage } from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDateTime } from '../../utils/format';
import { getAttemptDisplayStatus } from '../../utils/exam';
import PageHeader from '../../components/PageHeader';
import SearchInput from '../../components/SearchInput';
import Select from '../../components/Select';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import ExamAttemptDetailModal from '../../components/ExamAttemptDetailModal';

export default function ExamResultsPage() {
  const { id } = useParams();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [classId, setClassId] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], pagination: null, exam: null, stats: null });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [regrading, setRegrading] = useState(false);
  const [detailAttemptId, setDetailAttemptId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    examApi
      .results(id, {
        page,
        limit: 10,
        search: debouncedSearch,
        status,
        classId: classId === 'all' ? undefined : classId,
      })
      .then(({ data: payload }) => {
        if (!active) return;
        setData({
          items: payload.data,
          pagination: payload.pagination,
          exam: payload.exam,
          stats: payload.stats || null,
        });
      })
      .catch((apiError) => {
        if (!active) return;
        const message = getErrorMessage(apiError, 'Không tải được kết quả thi');
        setError(message);
        toast.error(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, page, debouncedSearch, status, classId, reloadKey, toast]);

  const pagination = data.pagination;
  const showInitialLoading = loading && data.items.length === 0;
  const classOptions = data.exam?.classes?.length
    ? data.exam.classes
    : data.exam?.class
      ? [data.exam.class]
      : [];
  const selectedClass =
    classId === 'all' ? null : classOptions.find((classroom) => classroom.id === classId) || null;
  const hasFilters = Boolean(debouncedSearch) || status !== 'all' || classId !== 'all';
  const stats = data.stats;
  const distributionMax = stats
    ? Math.max(1, ...stats.distribution.map((item) => item.count))
    : 1;

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await examApi.exportResults(
        id,
        classId === 'all' ? undefined : classId
      );
      const safeTitle = String(data.exam?.title || 'de-thi')
        .replace(/Đ/g, 'D')
        .replace(/đ/g, 'd')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
      const safeClass = selectedClass
        ? `-${String(selectedClass.classCode || selectedClass.name)
            .replace(/Đ/g, 'D')
            .replace(/đ/g, 'd')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^A-Za-z0-9._-]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 40)}`
        : '';
      downloadBlob(
        response.data,
        `bang-diem-${safeTitle || 'de-thi'}${safeClass}.xlsx`
      );
      toast.success('Đã xuất bảng điểm Excel');
    } catch (apiError) {
      toast.error(getErrorMessage(apiError, 'Không thể xuất bảng điểm Excel'));
    } finally {
      setExporting(false);
    }
  };

  const handleRegrade = async () => {
    setRegrading(true);
    try {
      const response = await examApi.regrade(id);
      const regraded = response.data?.data?.regraded ?? 0;
      if (regraded > 0) {
        toast.success(`Đã chấm lại ${regraded} bài làm theo đáp án hiện tại`);
      } else {
        toast.info('Chưa có bài nào để chấm lại');
      }
      setReloadKey((value) => value + 1);
    } catch (apiError) {
      toast.error(getErrorMessage(apiError, 'Không thể chấm lại bài làm'));
    } finally {
      setRegrading(false);
    }
  };

  const openAttemptDetail = async (attemptId) => {
    setDetailAttemptId(attemptId);
    setDetailData(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const response = await examApi.attemptDetail(id, attemptId);
      setDetailData(response.data.data);
    } catch (apiError) {
      setDetailError(getErrorMessage(apiError, 'Không tải được chi tiết bài làm'));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeAttemptDetail = () => {
    setDetailAttemptId(null);
    setDetailData(null);
    setDetailError('');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        backTo={`/teacher/exams/${id}`}
        backLabel="Quay lại chi tiết đề thi"
        title={data.exam ? `Kết quả: ${data.exam.title}` : 'Kết quả thi'}
        fill
      />

      {stats ? (
        <div className="mb-5 grid shrink-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Thống kê điểm</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedClass ? selectedClass.name : 'Tất cả lớp'} · các lượt đã nộp
                </p>
              </div>
              <Badge variant="info">{stats.total} bài</Badge>
            </div>

            {stats.total > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-medium text-slate-500">Điểm trung bình</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {stats.averageScore}
                    <span className="ml-1 text-xs font-medium text-slate-500">
                      / {stats.maxScore}
                    </span>
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-medium text-slate-500">Tỷ lệ trung bình</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {stats.averagePercent}%
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-medium text-slate-500">Điểm cao nhất</p>
                  <p className="mt-1 text-xl font-bold text-emerald-700">
                    {stats.highestScore}
                    <span className="ml-1 text-xs font-medium text-slate-500">
                      ({Math.round(stats.highestPercent)}%)
                    </span>
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-medium text-slate-500">Điểm thấp nhất</p>
                  <p className="mt-1 text-xl font-bold text-rose-700">
                    {stats.lowestScore}
                    <span className="ml-1 text-xs font-medium text-slate-500">
                      ({Math.round(stats.lowestPercent)}%)
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Chưa có bài nộp nào để thống kê.
              </div>
            )}
          </div>

          <div className="surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Phân bố điểm</h2>
                <p className="mt-1 text-xs text-slate-500">Theo phần trăm điểm tối đa</p>
              </div>
              <BarChart3 className="h-5 w-5 text-brand-600" />
            </div>

            {stats.total > 0 ? (
              <div className="mt-6 flex h-40 items-end gap-2 sm:gap-3">
                {stats.distribution.map((item) => {
                  const height = (item.count / distributionMax) * 100;
                  return (
                    <div
                      key={item.label}
                      className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                    >
                      <span className="text-xs font-semibold text-slate-700">{item.count}</span>
                      <div
                        className="flex w-full flex-1 items-end rounded-t-lg bg-slate-100"
                        title={`${item.label}: ${item.count} bài`}
                      >
                        <div
                          className="w-full rounded-t-lg bg-brand-500 transition-all"
                          style={{ height: item.count ? `${Math.max(6, height)}%` : '0%' }}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-slate-500">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                Chưa có dữ liệu biểu đồ.
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="surface flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <SearchInput
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo mã hoặc họ tên học sinh..."
            className="w-full sm:max-w-sm"
          />
          <div className="flex flex-wrap items-center gap-3">
            {classOptions.length ? (
              <div className="flex items-center gap-2">
                <label htmlFor="attempt-class" className="whitespace-nowrap text-sm text-slate-500">
                  Lớp
                </label>
                <Select
                  id="attempt-class"
                  value={classId}
                  onChange={(event) => {
                    setClassId(event.target.value);
                    setPage(1);
                  }}
                  className="w-44"
                >
                  <option value="all">Tất cả lớp</option>
                  {classOptions.map((classroom) => (
                    <option key={classroom.id} value={classroom.id}>
                      {classroom.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <label htmlFor="attempt-status" className="whitespace-nowrap text-sm text-slate-500">
                Trạng thái
              </label>
              <Select
                id="attempt-status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="w-40"
              >
                <option value="all">Tất cả</option>
                <option value="SUBMITTED">Đã nộp</option>
                <option value="AUTO_SUBMITTED">Tự nộp</option>
                <option value="IN_PROGRESS">Đang làm</option>
              </Select>
            </div>
            {data.exam ? (
              <>
                <Button
                  variant="secondary"
                  icon={RotateCcw}
                  loading={regrading}
                  onClick={handleRegrade}
                  title="Chấm lại toàn bộ bài đã nộp theo đáp án hiện tại"
                >
                  Chấm lại
                </Button>
                <Button
                  variant="secondary"
                  icon={Download}
                  loading={exporting}
                  onClick={handleExport}
                >
                  Xuất Excel
                </Button>
              </>
            ) : null}
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
          <LoadingState label="Đang tải kết quả thi..." />
        ) : error && data.items.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="Không tải được kết quả"
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
            title={hasFilters ? 'Không có kết quả phù hợp' : 'Chưa có học sinh làm bài'}
            description={
              hasFilters
                ? 'Hãy thử lớp, từ khóa hoặc trạng thái khác.'
                : 'Kết quả sẽ xuất hiện khi học sinh bắt đầu làm bài.'
            }
            action={
              hasFilters ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearchTerm('');
                    setStatus('all');
                    setClassId('all');
                    setPage(1);
                  }}
                >
                  Xóa bộ lọc
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="table-header">
                    <th className="w-14 px-5 py-3.5 font-semibold">STT</th>
                    <th className="px-4 py-3.5 font-semibold">Học sinh</th>
                    <th className="px-4 py-3.5 font-semibold">Lượt</th>
                    <th className="px-4 py-3.5 font-semibold">Thoát</th>
                    <th className="px-4 py-3.5 font-semibold">Bắt đầu</th>
                    <th className="px-4 py-3.5 font-semibold">Nộp bài</th>
                    <th className="px-4 py-3.5 font-semibold">Trạng thái</th>
                    <th className="px-4 py-3.5 font-semibold">Điểm</th>
                    <th className="w-16 px-4 py-3.5 text-right font-semibold">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className={loading ? 'opacity-60' : ''}>
                  {data.items.map((attempt, index) => {
                    const statusMeta = getAttemptDisplayStatus(attempt.status);
                    return (
                      <tr key={attempt.id} className="table-row">
                        <td className="px-5 py-4 text-slate-500">
                          {(pagination.page - 1) * pagination.limit + index + 1}
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-900">{attempt.student.fullName}</p>
                          <p className="text-xs text-slate-500">{attempt.student.studentCode}</p>
                        </td>
                        <td className="px-4 py-4 text-slate-600">#{attempt.attemptNumber}</td>
                        <td className="px-4 py-4">
                          <Badge variant={attempt.exitCount ? 'locked' : 'neutral'}>
                            {attempt.exitCount || 0}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-500">
                          {formatDateTime(attempt.startedAt)}
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-500">
                          {attempt.submittedAt ? formatDateTime(attempt.submittedAt) : '—'}
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                        </td>
                        <td className="px-4 py-4">
                          {attempt.score === null || attempt.score === undefined ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <div>
                              <p className="font-bold text-slate-900">
                                {attempt.score}
                                <span className="text-xs font-medium text-slate-500">
                                  /{attempt.maxScore}
                                </span>
                              </p>
                              <p className="text-xs text-slate-500">{attempt.percent}%</p>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openAttemptDetail(attempt.id)}
                            className="focus-ring rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                            title="Xem chi tiết bài làm"
                            aria-label={`Xem chi tiết bài làm của ${attempt.student.fullName}`}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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

      <ExamAttemptDetailModal
        open={Boolean(detailAttemptId)}
        onClose={closeAttemptDetail}
        loading={detailLoading}
        detail={detailData}
        error={detailError}
        onRetry={() => openAttemptDetail(detailAttemptId)}
      />
    </div>
  );
}
