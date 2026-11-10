import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  ClipboardList,
  Clock3,
  Eye,
  FileText,
  ListChecks,
  Plus,
  RefreshCcw,
  Settings2,
} from 'lucide-react';
import { examApi } from '../../api/exams';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDateTime } from '../../utils/format';
import { getExamDisplayStatus } from '../../utils/exam';
import PageHeader from '../../components/PageHeader';
import SearchInput from '../../components/SearchInput';
import Select from '../../components/Select';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';

export default function ExamListPage() {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    examApi
      .list({ page, limit: 10, search: debouncedSearch, status })
      .then(({ data: payload }) => {
        if (!active) return;
        setData({ items: payload.data, pagination: payload.pagination });
      })
      .catch((apiError) => {
        if (!active) return;
        const message = getErrorMessage(apiError, 'Không tải được danh sách đề thi');
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

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(1);
  };

  const pagination = data.pagination;
  const showInitialLoading = loading && data.items.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="Quản lý đề thi" fill />

      <div className="surface flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <SearchInput
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Tìm theo tên đề, môn, lớp..."
            className="w-full sm:max-w-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="exam-status" className="whitespace-nowrap text-sm text-slate-500">
              Trạng thái
            </label>
            <Select
              id="exam-status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="w-40"
            >
              <option value="all">Tất cả</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="PUBLISHED">Đã công bố</option>
              <option value="CLOSED">Đã đóng</option>
            </Select>
            <Link
              to="/teacher/exams/new"
              className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700"
            >
              <Plus className="h-4 w-4" />
              Tạo đề thi
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
          <LoadingState label="Đang tải danh sách đề thi..." />
        ) : error && data.items.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
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
            icon={ClipboardList}
            title={debouncedSearch || status !== 'all' ? 'Không tìm thấy đề phù hợp' : 'Chưa có đề thi nào'}
            description={
              debouncedSearch || status !== 'all'
                ? 'Hãy thử từ khóa khác hoặc bỏ bộ lọc trạng thái.'
                : 'Tạo đề trắc nghiệm đầu tiên để bắt đầu tổ chức thi cho lớp học.'
            }
            action={
              debouncedSearch || status !== 'all' ? (
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
                  to="/teacher/exams/new"
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  <Plus className="h-4 w-4" /> Tạo đề thi
                </Link>
              )
            }
          />
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="table-header">
                    <th className="w-14 px-5 py-3.5 font-semibold">STT</th>
                    <th className="px-4 py-3.5 font-semibold">Đề thi</th>
                    <th className="px-4 py-3.5 font-semibold">Lớp</th>
                    <th className="px-4 py-3.5 font-semibold">Thời gian</th>
                    <th className="px-4 py-3.5 font-semibold">Cấu trúc</th>
                    <th className="px-4 py-3.5 font-semibold">Trạng thái</th>
                    <th className="px-4 py-3.5 font-semibold">Lượt làm</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className={loading ? 'opacity-60' : ''}>
                  {data.items.map((exam, index) => {
                    const statusMeta = getExamDisplayStatus(exam);
                    const examClasses = exam.classes?.length ? exam.classes : [];
                    const classNames = examClasses.length
                      ? examClasses
                          .map((classroom) =>
                            classroom.isArchived
                              ? `${classroom.name} (đã lưu trữ)`
                              : classroom.name
                          )
                          .join(', ')
                      : exam.class?.name || '—';
                    const classCodes = examClasses.length
                      ? examClasses.map((classroom) => classroom.classCode).join(', ')
                      : exam.class?.classCode || '';
                    return (
                      <tr key={exam.id} className="table-row">
                        <td className="px-5 py-4 text-slate-500">
                          {(pagination.page - 1) * pagination.limit + index + 1}
                        </td>
                        <td className="px-4 py-4">
                          <Link to={`/teacher/exams/${exam.id}`} className="group flex items-start gap-3">
                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                              <FileText className="h-4 w-4" />
                            </span>
                            <span>
                              <span className="block max-w-[260px] truncate font-semibold text-slate-900 group-hover:text-brand-700">
                                {exam.title}
                              </span>
                              <span className="block text-xs text-slate-500">{exam.subject}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-4">
                          <p className="max-w-[220px] truncate font-medium text-slate-700" title={classNames}>
                            {classNames}
                          </p>
                          <p className="max-w-[220px] truncate text-xs text-slate-500" title={classCodes}>
                            {classCodes}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Clock3 className="h-3.5 w-3.5" /> {exam.durationMinutes} phút
                          </p>
                          <p className="mt-1 text-xs text-slate-500">{formatDateTime(exam.openAt)}</p>
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {exam.questionCount} câu · {exam.totalPoints} điểm
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant="neutral">{exam.attemptCount || 0} lượt</Badge>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to={`/teacher/exams/${exam.id}`}
                              className="focus-ring rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                              title="Xem chi tiết"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <Link
                              to={`/teacher/exams/${exam.id}/edit`}
                              className="focus-ring rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                              title="Cấu hình đề thi"
                            >
                              <Settings2 className="h-4 w-4" />
                            </Link>
                            <Link
                              to={`/teacher/exams/${exam.id}/questions`}
                              className="focus-ring rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                              title="Sửa câu hỏi"
                            >
                              <ListChecks className="h-4 w-4" />
                            </Link>
                            <Link
                              to={`/teacher/exams/${exam.id}/results`}
                              className="focus-ring rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                              title="Xem kết quả"
                            >
                              <BarChart3 className="h-4 w-4" />
                            </Link>
                          </div>
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
    </div>
  );
}
