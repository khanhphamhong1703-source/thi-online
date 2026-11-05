import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  BookOpen,
  ClipboardList,
  Database,
  Download,
  FileText,
  HardDrive,
  Lock,
  RefreshCcw,
  Trash2,
  Upload,
  Unlock,
  Users,
  UserRound,
} from 'lucide-react';
import { adminApi } from '../../api/admin';
import { adminDataApi } from '../../api/adminData';
import {
  downloadBlob,
  getErrorMessage,
  getFilenameFromDisposition,
} from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import { formatDate } from '../../utils/format';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import SearchInput from '../../components/SearchInput';
import Select from '../../components/Select';
import { useDebounce } from '../../hooks/useDebounce';

const TABS = [
  { key: 'teachers', label: 'Giáo viên', icon: Users },
  { key: 'classes', label: 'Lớp học', icon: BookOpen },
  { key: 'students', label: 'Học sinh', icon: UserRound },
  { key: 'exams', label: 'Đề thi', icon: ClipboardList },
];

const STATUS_OPTIONS = {
  teachers: [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'active', label: 'Đang hoạt động' },
    { value: 'locked', label: 'Đã khóa' },
  ],
  classes: [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'active', label: 'Đang hoạt động' },
    { value: 'archived', label: 'Đã lưu trữ' },
  ],
  students: [],
  exams: [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'DRAFT', label: 'Bản nháp' },
    { value: 'PUBLISHED', label: 'Đã công bố' },
    { value: 'CLOSED', label: 'Đã đóng' },
  ],
};

const EXAM_STATUS = {
  DRAFT: { label: 'Bản nháp', variant: 'warning' },
  PUBLISHED: { label: 'Đã công bố', variant: 'active' },
  CLOSED: { label: 'Đã đóng', variant: 'locked' },
};

function SummaryCard({ icon: Icon, label, value, hint, tone }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  return (
    <div className="surface flex items-center gap-3 p-3.5">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-500">{label}</p>
        <p className="text-xl font-bold leading-tight text-slate-900">{value ?? '—'}</p>
        {hint ? <p className="truncate text-[11px] text-slate-500">{hint}</p> : null}
      </div>
    </div>
  );
}

function DeleteButton({ onClick, loading }) {
  return (
    <Button
      variant="ghost-danger"
      size="sm"
      icon={Trash2}
      loading={loading}
      onClick={onClick}
      title="Xoá vĩnh viễn"
    >
      Xoá
    </Button>
  );
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminDataPage() {
  const toast = useToast();
  const [summary, setSummary] = useState(null);
  const [tab, setTab] = useState('teachers');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [data, setData] = useState({ items: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [actionKey, setActionKey] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importMode, setImportMode] = useState('merge');
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    adminDataApi
      .summary()
      .then(({ data: payload }) => {
        if (active) setSummary(payload.data);
      })
      .catch(() => {
        if (active) toast.error('Không tải được thống kê dữ liệu');
      });
    return () => {
      active = false;
    };
  }, [reloadKey, toast]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const fetcher = {
      teachers: adminDataApi.listTeachers,
      classes: adminDataApi.listClasses,
      students: adminDataApi.listStudents,
      exams: adminDataApi.listExams,
    }[tab];
    fetcher({
      page,
      limit: 10,
      search: debouncedSearch || undefined,
      status: tab === 'students' || status === 'all' ? undefined : status,
    })
      .then(({ data: payload }) => {
        if (!active) return;
        setData({ items: payload.data, pagination: payload.pagination });
      })
      .catch((apiError) => {
        if (!active) return;
        setError(getErrorMessage(apiError, 'Không tải được dữ liệu'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tab, page, status, debouncedSearch, reloadKey]);

  const changeTab = (nextTab) => {
    setTab(nextTab);
    setStatus('all');
    setPage(1);
    setData({ items: [], pagination: null });
  };

  const refresh = () => setReloadKey((value) => value + 1);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await adminDataApi.exportBackup();
      const filename = getFilenameFromDisposition(
        response.headers['content-disposition'],
        `vieexam-backup-${new Date().toISOString().slice(0, 10)}.json`
      );
      downloadBlob(response.data, filename);
      toast.success('Đã xuất bản sao lưu dữ liệu');
    } catch (apiError) {
      toast.error(getErrorMessage(apiError, 'Không thể xuất bản sao lưu'));
    } finally {
      setExporting(false);
    }
  };

  const handleChooseBackup = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/\.json$/i.test(file.name)) {
      toast.error('Chỉ chấp nhận file sao lưu JSON');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File sao lưu vượt quá dung lượng tối đa 50MB');
      return;
    }
    setImportFile(file);
    setImportMode('merge');
    setReplaceConfirmed(false);
  };

  const closeImport = () => {
    if (importing) return;
    setImportFile(null);
    setReplaceConfirmed(false);
  };

  const handleImport = async () => {
    if (!importFile) return;
    if (importMode === 'replace' && !replaceConfirmed) {
      toast.error('Vui lòng xác nhận thay thế toàn bộ dữ liệu');
      return;
    }

    setImporting(true);
    try {
      const { data: payload } = await adminDataApi.importBackup(importFile, importMode);
      const total = payload.data?.total ?? 0;
      toast.success(`${payload.message}: ${total} bản ghi`);
      setImportFile(null);
      setReplaceConfirmed(false);
      if (payload.data?.requiresLogin) {
        window.location.assign('/admin/login');
        return;
      }
      refresh();
    } catch (apiError) {
      toast.error(getErrorMessage(apiError, 'Không thể nhập bản sao lưu'));
    } finally {
      setImporting(false);
    }
  };

  const runAction = async (key, action, successMessage) => {
    setActionKey(key);
    try {
      await action();
      toast.success(successMessage);
      refresh();
    } catch (apiError) {
      toast.error(getErrorMessage(apiError, 'Không thể thực hiện thao tác'));
    } finally {
      setActionKey('');
    }
  };

  const toggleTeacher = (teacher) =>
    runAction(
      `teacher-status-${teacher.id}`,
      () => adminApi.setTeacherStatus(teacher.id, !teacher.isActive),
      teacher.isActive ? 'Đã khóa tài khoản giáo viên' : 'Đã mở khóa tài khoản giáo viên'
    );

  const toggleClassArchive = (classroom) =>
    runAction(
      `class-archive-${classroom.id}`,
      () =>
        classroom.isArchived
          ? adminDataApi.restoreClass(classroom.id)
          : adminDataApi.archiveClass(classroom.id),
      classroom.isArchived ? 'Đã khôi phục lớp học' : 'Đã lưu trữ lớp học'
    );

  const openDelete = (type, item) => setConfirm({ type, item });

  const handleDelete = async () => {
    if (!confirm) return;
    setDeleting(true);
    try {
      const action = {
        teacher: adminDataApi.deleteTeacher,
        class: adminDataApi.deleteClass,
        student: adminDataApi.deleteStudent,
        exam: adminDataApi.deleteExam,
      }[confirm.type];
      await action(confirm.item.id);
      toast.success('Đã xoá vĩnh viễn dữ liệu');
      setConfirm(null);
      refresh();
    } catch (apiError) {
      toast.error(getErrorMessage(apiError, 'Không thể xoá dữ liệu'));
    } finally {
      setDeleting(false);
    }
  };

  const deleteConfig = (() => {
    if (!confirm) return null;
    const { type, item } = confirm;
    if (type === 'teacher') {
      return {
        title: 'Xoá vĩnh viễn giáo viên?',
        description: `Tài khoản "${item.fullName}" sẽ bị xoá vĩnh viễn. Chỉ có thể xoá khi giáo viên không còn lớp học hoặc đề thi.`,
      };
    }
    if (type === 'class') {
      return {
        title: 'Xoá vĩnh viễn lớp học?',
        description: `Lớp "${item.name}" và ${item._count?.enrollments || 0} lượt ghi danh sẽ bị xoá vĩnh viễn. Chỉ có thể xoá khi không còn đề thi tham chiếu.`,
      };
    }
    if (type === 'student') {
      return {
        title: 'Xoá vĩnh viễn học sinh?',
        description: `Học sinh "${item.fullName}" sẽ bị xoá vĩnh viễn cùng ${item._count?.enrollments || 0} lớp và ${item._count?.examAttempts || 0} lượt thi. Thao tác không thể hoàn tác.`,
      };
    }
    return {
      title: 'Xoá vĩnh viễn đề thi?',
      description: `Đề "${item.title}" sẽ bị xoá cùng ${item._count?.questions || 0} câu hỏi và ${item._count?.attempts || 0} lượt làm bài. Thao tác không thể hoàn tác.`,
    };
  })();

  const renderCells = () => {
    if (tab === 'teachers') {
      return data.items.map((teacher) => (
        <tr key={teacher.id} className="table-row">
          <td className="px-4 py-3">
            <p className="font-semibold text-slate-900">{teacher.fullName}</p>
            <p className="text-xs text-slate-500">@{teacher.username}</p>
          </td>
          <td className="px-4 py-3 text-slate-600">{teacher._count?.classes ?? 0}</td>
          <td className="px-4 py-3 text-slate-600">{teacher._count?.exams ?? 0}</td>
          <td className="px-4 py-3">
            <Badge variant={teacher.isActive ? 'active' : 'locked'}>
              {teacher.isActive ? 'Đang hoạt động' : 'Đã khóa'}
            </Badge>
          </td>
          <td className="px-4 py-3 text-xs text-slate-500">{formatDate(teacher.createdAt)}</td>
          <td className="px-4 py-3">
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="secondary"
                size="sm"
                icon={teacher.isActive ? Lock : Unlock}
                loading={actionKey === `teacher-status-${teacher.id}`}
                onClick={() => toggleTeacher(teacher)}
              >
                {teacher.isActive ? 'Khóa' : 'Mở khóa'}
              </Button>
              <DeleteButton
                loading={deleting && confirm?.item.id === teacher.id}
                onClick={() => openDelete('teacher', teacher)}
              />
            </div>
          </td>
        </tr>
      ));
    }

    if (tab === 'classes') {
      return data.items.map((classroom) => (
        <tr key={classroom.id} className="table-row">
          <td className="px-4 py-3">
            <p className="font-semibold text-slate-900">{classroom.name}</p>
            <p className="text-xs text-slate-500">{classroom.classCode}</p>
          </td>
          <td className="px-4 py-3">
            <p className="text-sm text-slate-700">{classroom.teacher?.fullName}</p>
            <p className="text-xs text-slate-500">@{classroom.teacher?.username}</p>
          </td>
          <td className="px-4 py-3 text-slate-600">{classroom._count?.enrollments ?? 0}</td>
          <td className="px-4 py-3">
            <Badge variant={classroom.isArchived ? 'warning' : 'active'}>
              {classroom.isArchived ? 'Đã lưu trữ' : 'Đang hoạt động'}
            </Badge>
          </td>
          <td className="px-4 py-3 text-xs text-slate-500">{formatDate(classroom.createdAt)}</td>
          <td className="px-4 py-3">
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="secondary"
                size="sm"
                icon={classroom.isArchived ? ArchiveRestore : Archive}
                loading={actionKey === `class-archive-${classroom.id}`}
                onClick={() => toggleClassArchive(classroom)}
              >
                {classroom.isArchived ? 'Khôi phục' : 'Lưu trữ'}
              </Button>
              <DeleteButton
                loading={deleting && confirm?.item.id === classroom.id}
                onClick={() => openDelete('class', classroom)}
              />
            </div>
          </td>
        </tr>
      ));
    }

    if (tab === 'students') {
      return data.items.map((student) => (
        <tr key={student.id} className="table-row">
          <td className="px-4 py-3">
            <p className="font-semibold text-slate-900">{student.fullName}</p>
            <p className="text-xs text-slate-500">{student.studentCode}</p>
          </td>
          <td className="px-4 py-3">
            {student.enrollments?.length ? (
              <div className="flex flex-wrap gap-1">
                {student.enrollments.map(({ class: classroom }) => (
                  <Badge key={classroom.id} variant={classroom.isArchived ? 'warning' : 'neutral'}>
                    {classroom.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-400">Chưa vào lớp</span>
            )}
          </td>
          <td className="px-4 py-3 text-slate-600">{student._count?.examAttempts ?? 0}</td>
          <td className="px-4 py-3 text-xs text-slate-500">{formatDate(student.createdAt)}</td>
          <td className="px-4 py-3">
            <div className="flex justify-end">
              <DeleteButton
                loading={deleting && confirm?.item.id === student.id}
                onClick={() => openDelete('student', student)}
              />
            </div>
          </td>
        </tr>
      ));
    }

    return data.items.map((exam) => {
      const statusMeta = EXAM_STATUS[exam.status] || EXAM_STATUS.DRAFT;
      return (
        <tr key={exam.id} className="table-row">
          <td className="px-4 py-3">
            <p className="font-semibold text-slate-900">{exam.title}</p>
            <p className="text-xs text-slate-500">{exam.subject} · {exam.accessCode}</p>
          </td>
          <td className="px-4 py-3 text-sm text-slate-700">{exam.teacher?.fullName}</td>
          <td className="px-4 py-3">
            <p className="text-sm text-slate-700">{exam.class?.name}</p>
            <p className="text-xs text-slate-500">{exam.class?.classCode}</p>
          </td>
          <td className="px-4 py-3">
            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
          </td>
          <td className="px-4 py-3 text-slate-600">{exam._count?.attempts ?? 0}</td>
          <td className="px-4 py-3">
            <div className="flex justify-end">
              <DeleteButton
                loading={deleting && confirm?.item.id === exam.id}
                onClick={() => openDelete('exam', exam)}
              />
            </div>
          </td>
        </tr>
      );
    });
  };

  const columns = {
    teachers: ['Giáo viên', 'Lớp', 'Đề thi', 'Trạng thái', 'Ngày tạo', ''],
    classes: ['Lớp học', 'Giáo viên', 'Học sinh', 'Trạng thái', 'Ngày tạo', ''],
    students: ['Học sinh', 'Lớp', 'Lượt thi', 'Ngày tạo', ''],
    exams: ['Đề thi', 'Giáo viên', 'Lớp', 'Trạng thái', 'Lượt thi', ''],
  }[tab];

  return (
    <div>
      <PageHeader
        eyebrow="Quản trị hệ thống"
        title="Quản lý dữ liệu"
        description="Quản lý toàn bộ giáo viên, lớp học, học sinh và đề thi, bao gồm dữ liệu đã khóa hoặc lưu trữ."
        actions={
          <Button variant="secondary" icon={RefreshCcw} onClick={refresh}>
            Làm mới
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard
          icon={Users}
          label="Giáo viên"
          value={summary?.teachers.total}
          hint={`${summary?.teachers.locked ?? 0} đã khóa`}
          tone="blue"
        />
        <SummaryCard
          icon={BookOpen}
          label="Lớp học"
          value={summary?.classes.total}
          hint={`${summary?.classes.archived ?? 0} đã lưu trữ`}
          tone="amber"
        />
        <SummaryCard
          icon={UserRound}
          label="Học sinh"
          value={summary?.students.total}
          hint={`${summary?.attempts.total ?? 0} lượt thi`}
          tone="emerald"
        />
        <SummaryCard
          icon={ClipboardList}
          label="Đề thi"
          value={summary?.exams.total}
          hint={`${summary?.exams.published ?? 0} đã công bố`}
          tone="violet"
        />
      </div>

      <section className="surface mb-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Sao lưu &amp; khôi phục</h2>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">
                Xuất toàn bộ giáo viên, lớp, học sinh, đề thi và lượt thi thành một file JSON.
                File có chứa mật khẩu đã mã hoá, chỉ nên lưu ở nơi an toàn.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              icon={Download}
              loading={exporting}
              onClick={handleExport}
            >
              Xuất dữ liệu
            </Button>
            <Button
              variant="secondary"
              icon={Upload}
              onClick={() => importInputRef.current?.click()}
            >
              Nhập dữ liệu
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleChooseBackup}
            />
          </div>
        </div>
      </section>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map((item) => {
          const Icon = item.icon;
          const count = summary?.[item.key]?.total;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => changeTab(item.key)}
              className={`focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                tab === item.key
                  ? 'bg-brand-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
              {count !== undefined ? (
                <span className={`text-xs ${tab === item.key ? 'text-brand-100' : 'text-slate-400'}`}>
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <section className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo tên, mã, username..."
            className="sm:max-w-xs"
          />
          {STATUS_OPTIONS[tab].length ? (
            <Select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="w-full sm:w-44"
            >
              {STATUS_OPTIONS[tab].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          ) : null}
        </div>

        {error ? (
          <div className="border-b border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading && !data.items.length ? (
          <LoadingState label="Đang tải dữ liệu..." />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={Database}
            title="Không có dữ liệu"
            description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
          />
        ) : (
          <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="table-header">
                  {columns.map((column, index) => (
                    <th
                      key={`${column}-${index}`}
                      className={`px-4 py-3 font-semibold ${index === columns.length - 1 ? 'text-right' : ''}`}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>{renderCells()}</tbody>
            </table>
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
        open={Boolean(importFile)}
        onClose={closeImport}
        title="Nhập bản sao lưu"
        description="Chọn cách áp dụng dữ liệu từ file JSON."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeImport} disabled={importing}>
              Hủy
            </Button>
            <Button
              variant={importMode === 'replace' ? 'danger' : 'primary'}
              onClick={handleImport}
              loading={importing}
              disabled={importMode === 'replace' && !replaceConfirmed}
            >
              Nhập dữ liệu
            </Button>
          </>
        }
      >
        {importFile ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{importFile.name}</p>
                <p className="text-xs text-slate-500">{formatFileSize(importFile.size)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label
                className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${
                  importMode === 'merge'
                    ? 'border-brand-300 bg-brand-50/60'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="backup-mode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={() => {
                    setImportMode('merge');
                    setReplaceConfirmed(false);
                  }}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">Hợp nhất</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                    Thêm hoặc cập nhật bản ghi theo ID. Không xoá dữ liệu đang có.
                  </span>
                </span>
              </label>

              <label
                className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${
                  importMode === 'replace'
                    ? 'border-rose-300 bg-rose-50/60'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="backup-mode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">Thay thế toàn bộ</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                    Xoá toàn bộ dữ liệu hiện tại rồi khôi phục từ file. Không thể hoàn tác.
                  </span>
                </span>
              </label>
            </div>

            {importMode === 'replace' ? (
              <div className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <div>
                  <p className="text-xs leading-5 text-rose-700">
                    Nếu file không chứa tài khoản Admin hiện tại, bạn sẽ bị đăng xuất và phải đăng
                    nhập bằng tài khoản Admin trong file.
                  </p>
                  <label className="mt-2 flex cursor-pointer items-start gap-2 text-xs font-medium text-rose-700">
                    <input
                      type="checkbox"
                      checked={replaceConfirmed}
                      onChange={(event) => setReplaceConfirmed(event.target.checked)}
                      className="mt-0.5"
                    />
                    Tôi hiểu và muốn thay thế toàn bộ dữ liệu
                  </label>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={handleDelete}
        title={deleteConfig?.title}
        description={deleteConfig?.description}
        confirmLabel="Xoá vĩnh viễn"
        loading={deleting}
      />
    </div>
  );
}
