import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive,
  BookOpen,
  Edit3,
  Eye,
  Plus,
  RefreshCcw,
  Users,
} from 'lucide-react';
import { classApi } from '../../api/classes';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDate } from '../../utils/format';
import PageHeader from '../../components/PageHeader';
import SearchInput from '../../components/SearchInput';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function ClassListPage() {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    classApi
      .list({ page, limit: 10, search: debouncedSearch })
      .then(({ data: payload }) => {
        if (!active) return;
        setData({ items: payload.data, pagination: payload.pagination });
      })
      .catch((apiError) => {
        if (!active) return;
        const message = getErrorMessage(apiError, 'Không tải được danh sách lớp học');
        setError(message);
        toast.error(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, debouncedSearch, reloadKey, toast]);

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(1);
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      const { data: payload } = await classApi.archive(archiveTarget.id);
      toast.success(payload.message);
      setArchiveTarget(null);
      setReloadKey((value) => value + 1);
    } catch (apiError) {
      toast.error(getErrorMessage(apiError, 'Không thể lưu trữ lớp học'));
    } finally {
      setArchiving(false);
    }
  };

  const pagination = data.pagination;
  const showInitialLoading = loading && data.items.length === 0;

  return (
    <div>
      <PageHeader
        eyebrow="Giảng dạy"
        title="Quản lý lớp học"
        description="Tạo, chỉnh sửa và theo dõi sĩ số các lớp học do bạn phụ trách."
        actions={
          <Link
            to="/teacher/classes/new"
            className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Tạo lớp học
          </Link>
        }
      />

      <div className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <SearchInput
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Tìm theo tên lớp, mã lớp, năm học..."
            className="w-full sm:max-w-sm"
          />
          <p className="text-sm text-slate-500">
            {pagination ? `${pagination.total} lớp học` : 'Đang tải...'}
          </p>
        </div>

        {error && data.items.length > 0 ? (
          <div className="flex items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-5 py-3 text-sm text-amber-800">
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
          <LoadingState label="Đang tải danh sách lớp học..." />
        ) : error && data.items.length === 0 ? (
          <EmptyState
            icon={BookOpen}
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
            icon={BookOpen}
            title={debouncedSearch ? 'Không tìm thấy lớp học phù hợp' : 'Chưa có lớp học nào'}
            description={
              debouncedSearch
                ? 'Hãy thử từ khóa khác hoặc xóa tìm kiếm.'
                : 'Tạo lớp học đầu tiên để bắt đầu quản lý danh sách học sinh.'
            }
            action={
              debouncedSearch ? (
                <Button variant="secondary" onClick={() => setSearchTerm('')}>
                  Xóa tìm kiếm
                </Button>
              ) : (
                <Link
                  to="/teacher/classes/new"
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  <Plus className="h-4 w-4" /> Tạo lớp học
                </Link>
              )
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="w-14 px-5 py-3.5 font-semibold">STT</th>
                    <th className="px-4 py-3.5 font-semibold">Tên lớp</th>
                    <th className="px-4 py-3.5 font-semibold">Mã lớp</th>
                    <th className="px-4 py-3.5 font-semibold">Năm học</th>
                    <th className="px-4 py-3.5 font-semibold">Số học sinh</th>
                    <th className="px-4 py-3.5 font-semibold">Ngày tạo</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className={loading ? 'opacity-60' : ''}>
                  {data.items.map((classroom, index) => (
                    <tr key={classroom.id} className="table-row">
                      <td className="px-5 py-4 text-slate-500">
                        {(pagination.page - 1) * pagination.limit + index + 1}
                      </td>
                      <td className="px-4 py-4">
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
                            <span className="block max-w-[240px] truncate text-xs text-slate-500">
                              {classroom.description || 'Chưa có mô tả'}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="neutral">{classroom.classCode}</Badge>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{classroom.schoolYear}</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 text-slate-700">
                          <Users className="h-4 w-4 text-slate-400" />
                          {classroom._count?.enrollments || 0}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-500">{formatDate(classroom.createdAt)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/teacher/classes/${classroom.id}`}
                            className="focus-ring rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                            title="Xem chi tiết"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            to={`/teacher/classes/${classroom.id}/edit`}
                            className="focus-ring rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                            title="Chỉnh sửa"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setArchiveTarget(classroom)}
                            className="focus-ring rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                            title="Lưu trữ lớp học"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        loading={archiving}
        tone="danger"
        title="Lưu trữ lớp học?"
        description={`Lớp ${archiveTarget?.name || ''} sẽ không còn hiển thị trong danh sách. Hệ thống dùng xóa mềm để bảo toàn dữ liệu học sinh và quan hệ lớp học.`}
        confirmLabel="Lưu trữ lớp học"
      />
    </div>
  );
}
