import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Download,
  Edit3,
  Eye,
  Plus,
  RefreshCcw,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { classApi } from '../../api/classes';
import { studentApi } from '../../api/students';
import {
  downloadBlob,
  getErrorMessage,
  getFilenameFromDisposition,
} from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDate } from '../../utils/format';
import PageHeader from '../../components/PageHeader';
import SearchInput from '../../components/SearchInput';
import Button from '../../components/Button';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import ConfirmDialog from '../../components/ConfirmDialog';
import Badge from '../../components/Badge';

export default function StudentListPage() {
  const { id: classId } = useParams();
  const toast = useToast();
  const [classroom, setClassroom] = useState(null);
  const [classLoading, setClassLoading] = useState(true);
  const [classError, setClassError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [page, setPage] = useState(1);
  const [students, setStudents] = useState({ items: [], pagination: null });
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    setClassLoading(true);
    setClassError('');
    classApi
      .get(classId)
      .then(({ data }) => {
        if (active) setClassroom(data.data);
      })
      .catch((error) => {
        if (active) setClassError(getErrorMessage(error, 'Không tải được lớp học'));
      })
      .finally(() => {
        if (active) setClassLoading(false);
      });
    return () => {
      active = false;
    };
  }, [classId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setListError('');
    studentApi
      .listByClass(classId, { page, limit: 10, search: debouncedSearch })
      .then(({ data }) => {
        if (!active) return;
        setStudents({ items: data.data, pagination: data.pagination });
      })
      .catch((error) => {
        if (!active) return;
        const message = getErrorMessage(error, 'Không tải được danh sách học sinh');
        setListError(message);
        toast.error(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [classId, page, debouncedSearch, reloadKey, toast]);

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await studentApi.exportByClass(classId);
      const filename = getFilenameFromDisposition(
        response.headers['content-disposition'],
        `danh-sach-hoc-sinh-${classroom?.classCode || classId}.xlsx`
      );
      downloadBlob(response.data, filename);
      toast.success('Đã xuất danh sách học sinh ra Excel');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể xuất file Excel'));
    } finally {
      setExporting(false);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const { data } = await studentApi.removeFromClass(classId, removeTarget.id);
      toast.success(data.message);
      setRemoveTarget(null);
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể xóa học sinh khỏi lớp'));
    } finally {
      setRemoving(false);
    }
  };

  if (classLoading) return <LoadingState label="Đang tải lớp học..." />;

  if (classError || !classroom) {
    return (
      <div className="surface mx-auto max-w-lg p-8 text-center">
        <p className="font-semibold text-slate-900">Không tìm thấy lớp học</p>
        <p className="mt-1 text-sm text-slate-500">{classError}</p>
        <Link to="/teacher/classes" className="mt-5 inline-flex text-sm font-semibold text-brand-600">
          Quay lại danh sách lớp
        </Link>
      </div>
    );
  }

  const pagination = students.pagination;
  const showInitialLoading = loading && students.items.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        backTo={`/teacher/classes/${classId}`}
        backLabel="Quay lại chi tiết lớp học"
        title={`Học sinh lớp ${classroom.name}`}
        fill
      />

      {classroom.isArchived ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Lớp học đang ở trạng thái lưu trữ. Dữ liệu học sinh vẫn được bảo toàn để tra cứu.
        </div>
      ) : null}

      <div className="surface flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <SearchInput
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Tìm theo mã học sinh hoặc họ tên..."
            className="w-full sm:max-w-sm"
          />
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <p className="mr-auto text-sm text-slate-500 sm:mr-2">
              {pagination ? `${pagination.total} học sinh` : 'Đang tải...'}
            </p>
            <Button
              variant="secondary"
              icon={Download}
              onClick={handleExport}
              loading={exporting}
            >
              Export Excel
            </Button>
            <Link
              to={`/teacher/classes/${classId}/import`}
              className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Upload className="h-4 w-4" />
              Import Excel
            </Link>
            <Link
              to={`/teacher/classes/${classId}/students/new`}
              className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700"
            >
              <Plus className="h-4 w-4" />
              Thêm học sinh
            </Link>
          </div>
        </div>

        {listError && students.items.length > 0 ? (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-5 py-3 text-sm text-amber-800">
            <span>{listError}</span>
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
          <LoadingState label="Đang tải danh sách học sinh..." />
        ) : listError && students.items.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Không tải được dữ liệu"
            description={listError}
            action={
              <Button variant="secondary" icon={RefreshCcw} onClick={() => setReloadKey((v) => v + 1)}>
                Thử lại
              </Button>
            }
          />
        ) : students.items.length === 0 ? (
          <EmptyState
            icon={Users}
            title={debouncedSearch ? 'Không tìm thấy học sinh phù hợp' : 'Lớp học chưa có học sinh'}
            description={
              debouncedSearch
                ? 'Hãy thử tìm theo mã học sinh hoặc họ tên khác.'
                : 'Thêm học sinh thủ công hoặc import danh sách từ file Excel để bắt đầu.'
            }
            action={
              debouncedSearch ? (
                <Button variant="secondary" onClick={() => setSearchTerm('')}>
                  Xóa tìm kiếm
                </Button>
              ) : (
                <div className="flex flex-wrap justify-center gap-2">
                  <Link
                    to={`/teacher/classes/${classId}/students/new`}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    <Plus className="h-4 w-4" /> Thêm học sinh
                  </Link>
                  <Link
                    to={`/teacher/classes/${classId}/import`}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Upload className="h-4 w-4" /> Import Excel
                  </Link>
                </div>
              )
            }
          />
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="table-header">
                    <th className="w-14 px-5 py-3.5 font-semibold">STT</th>
                    <th className="px-4 py-3.5 font-semibold">Mã học sinh</th>
                    <th className="px-4 py-3.5 font-semibold">Họ và tên</th>
                    <th className="px-4 py-3.5 font-semibold">Ngày sinh</th>
                    <th className="px-4 py-3.5 font-semibold">Số điện thoại</th>
                    <th className="px-4 py-3.5 font-semibold">Email</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className={loading ? 'opacity-60' : ''}>
                  {students.items.map((student, index) => (
                    <tr key={student.id} className="table-row">
                      <td className="px-5 py-4 text-slate-500">
                        {(pagination.page - 1) * pagination.limit + index + 1}
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="neutral">{student.studentCode}</Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          to={`/teacher/students/${student.id}?classId=${classId}`}
                          className="font-semibold text-slate-900 hover:text-brand-700"
                        >
                          {student.fullName}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {formatDate(student.dateOfBirth)}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {student.phone || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {student.email || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/teacher/students/${student.id}?classId=${classId}`}
                            className="focus-ring rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                            title="Xem chi tiết"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            to={`/teacher/students/${student.id}/edit?classId=${classId}`}
                            className="focus-ring rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                            title="Chỉnh sửa"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setRemoveTarget(student)}
                            className="focus-ring rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                            title="Xóa khỏi lớp"
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
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        loading={removing}
        tone="danger"
        title="Xóa học sinh khỏi lớp?"
        description={`${removeTarget?.fullName || 'Học sinh'} sẽ không còn trong lớp này. Hồ sơ học sinh vẫn được giữ trên toàn hệ thống và có thể thuộc các lớp khác.`}
        confirmLabel="Xóa khỏi lớp"
      />
    </div>
  );
}
