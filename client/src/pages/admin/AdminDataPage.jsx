import { useEffect, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { Archive, ArchiveRestore, Database, RefreshCcw, Trash2 } from 'lucide-react';
import { adminDataApi } from '../../api/adminData';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import { formatDate } from '../../utils/format';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import SearchInput from '../../components/SearchInput';
import Select from '../../components/Select';
import { useDebounce } from '../../hooks/useDebounce';
import DataNav from './DataNav';
import DeleteEntityDialog from '../../components/admin/DeleteEntityDialog';

const STATUS_OPTIONS = {
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

const COLUMN_HINTS = {
  'Học sinh': 'Số học sinh đang theo học',
  'Lượt thi': 'Tổng số lượt làm bài',
  'Lớp': 'Lớp chính được giao đề',
};

const SECTIONS = {
  classes: {
    title: 'Lớp học',
    emptyTitle: 'Chưa có lớp học nào',
    emptyDescription: 'Lớp học do giáo viên tạo sẽ xuất hiện ở đây.',
    placeholder: 'Tìm theo tên lớp, mã lớp...',
    fetcher: adminDataApi.listClasses,
    supportsTeacherFilter: true,
    statusOptions: STATUS_OPTIONS.classes,
    columns: ['Lớp học', 'Giáo viên', 'Học sinh', 'Trạng thái', 'Ngày tạo', ''],
  },
  students: {
    title: 'Học sinh',
    emptyTitle: 'Chưa có học sinh nào',
    emptyDescription: 'Học sinh được thêm vào lớp sẽ xuất hiện ở đây.',
    placeholder: 'Tìm theo tên, mã học sinh...',
    fetcher: adminDataApi.listStudents,
    statusOptions: STATUS_OPTIONS.students,
    columns: ['Học sinh', 'Lớp', 'Lượt thi', 'Ngày tạo', ''],
  },
  exams: {
    title: 'Đề thi',
    emptyTitle: 'Chưa có đề thi nào',
    emptyDescription: 'Đề do giáo viên tạo sẽ xuất hiện ở đây.',
    placeholder: 'Tìm theo tên đề, môn học...',
    fetcher: adminDataApi.listExams,
    statusOptions: STATUS_OPTIONS.exams,
    columns: ['Đề thi', 'Giáo viên', 'Lớp', 'Trạng thái', 'Lượt thi', ''],
  },
};

function IconAction({ label, icon: Icon, onClick, disabled, tone = 'default' }) {
  const tones = {
    default: 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
    danger: 'text-rose-500 hover:bg-rose-50 hover:text-rose-700',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`focus-ring rounded-lg p-2 transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function DetailStat({ label, value }) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}

export default function AdminDataPage() {
  const toast = useToast();
  const { section } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = SECTIONS[section] ? section : 'classes';
  const config = SECTIONS[activeSection];
  const teacherFilterId =
    config.supportsTeacherFilter ? searchParams.get('teacherId') || '' : '';
  const teacherFilterName = teacherFilterId ? searchParams.get('teacherName') || '' : '';

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [data, setData] = useState({ items: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [actionKey, setActionKey] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const statusValue = config.statusOptions.some((option) => option.value === status)
    ? status
    : 'all';

  useEffect(() => {
    setPage(1);
    setStatus('all');
    setSearchTerm('');
    setData({ items: [], pagination: null });
  }, [activeSection]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    config
      .fetcher({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        status: statusValue === 'all' ? undefined : statusValue,
        teacherId: teacherFilterId || undefined,
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
  }, [activeSection, config, page, statusValue, debouncedSearch, teacherFilterId, reloadKey]);

  const refresh = () => setReloadKey((value) => value + 1);

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

  const toggleClassArchive = (classroom) =>
    runAction(
      `class-archive-${classroom.id}`,
      () =>
        classroom.isArchived
          ? adminDataApi.restoreClass(classroom.id)
          : adminDataApi.archiveClass(classroom.id),
      classroom.isArchived ? 'Đã khôi phục lớp học' : 'Đã lưu trữ lớp học'
    );

  const hasFilters = Boolean(debouncedSearch) || statusValue !== 'all' || Boolean(teacherFilterId);

  if (!SECTIONS[section]) {
    return <Navigate to="/admin/data/classes" replace />;
  }

  const renderClassActions = (classroom) => (
    <div className="flex items-center justify-end gap-1">
      <IconAction
        label={classroom.isArchived ? 'Khôi phục lớp học' : 'Lưu trữ lớp học'}
        icon={classroom.isArchived ? ArchiveRestore : Archive}
        disabled={actionKey === `class-archive-${classroom.id}`}
        onClick={() => toggleClassArchive(classroom)}
      />
      <IconAction
        label="Xoá vĩnh viễn"
        icon={Trash2}
        tone="danger"
        onClick={() => setDeleteTarget({ type: 'class', item: classroom })}
      />
    </div>
  );

  const renderDeleteAction = (type, item) => (
    <div className="flex justify-end">
      <IconAction
        label="Xoá vĩnh viễn"
        icon={Trash2}
        tone="danger"
        onClick={() => setDeleteTarget({ type, item })}
      />
    </div>
  );

  const renderTeacherLink = (teacher) => {
    if (!teacher) return null;
    return (
      <Link
        to={`/admin/teachers/${teacher.id}`}
        className="block text-sm font-medium text-slate-700 hover:text-brand-700"
      >
        {teacher.fullName}
        <span className="block text-xs font-normal text-slate-500">@{teacher.username}</span>
      </Link>
    );
  };

  const renderCells = () => {
    if (activeSection === 'classes') {
      return data.items.map((classroom) => (
        <tr key={classroom.id} className="table-row">
          <td className="px-4 py-3">
            <p className="font-semibold text-slate-900">{classroom.name}</p>
            <p className="text-xs text-slate-500">{classroom.classCode}</p>
          </td>
          <td className="px-4 py-3">{renderTeacherLink(classroom.teacher)}</td>
          <td className="px-4 py-3 text-slate-600">{classroom._count?.enrollments ?? 0}</td>
          <td className="px-4 py-3">
            <Badge variant={classroom.isArchived ? 'warning' : 'active'}>
              {classroom.isArchived ? 'Đã lưu trữ' : 'Đang hoạt động'}
            </Badge>
          </td>
          <td className="px-4 py-3 text-xs text-slate-500">{formatDate(classroom.createdAt)}</td>
          <td className="px-4 py-3">{renderClassActions(classroom)}</td>
        </tr>
      ));
    }

    if (activeSection === 'students') {
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
          <td className="px-4 py-3">{renderDeleteAction('student', student)}</td>
        </tr>
      ));
    }

    return data.items.map((exam) => {
      const statusMeta = EXAM_STATUS[exam.status] || EXAM_STATUS.DRAFT;
      return (
        <tr key={exam.id} className="table-row">
          <td className="px-4 py-3">
            <p className="font-semibold text-slate-900">{exam.title}</p>
            <p className="text-xs text-slate-500">
              {exam.subject} · {exam.accessCode}
            </p>
          </td>
          <td className="px-4 py-3">{renderTeacherLink(exam.teacher)}</td>
          <td className="px-4 py-3">
            <p className="text-sm text-slate-700">{exam.class?.name}</p>
            <p className="text-xs text-slate-500">{exam.class?.classCode}</p>
          </td>
          <td className="px-4 py-3">
            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
          </td>
          <td className="px-4 py-3 text-slate-600">{exam._count?.attempts ?? 0}</td>
          <td className="px-4 py-3">{renderDeleteAction('exam', exam)}</td>
        </tr>
      );
    });
  };

  const renderCards = () => {
    if (activeSection === 'classes') {
      return data.items.map((classroom) => (
        <div key={classroom.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{classroom.name}</p>
              <p className="text-xs text-slate-500">{classroom.classCode}</p>
            </div>
            <Badge variant={classroom.isArchived ? 'warning' : 'active'}>
              {classroom.isArchived ? 'Đã lưu trữ' : 'Đang hoạt động'}
            </Badge>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            <DetailStat
              label="Giáo viên"
              value={
                classroom.teacher ? (
                  <Link
                    to={`/admin/teachers/${classroom.teacher.id}`}
                    className="text-brand-600 hover:text-brand-700"
                  >
                    {classroom.teacher.fullName}
                  </Link>
                ) : (
                  '—'
                )
              }
            />
            <DetailStat label="Học sinh" value={classroom._count?.enrollments ?? 0} />
            <DetailStat label="Ngày tạo" value={formatDate(classroom.createdAt)} />
          </dl>
          <div className="mt-2 flex justify-end">{renderClassActions(classroom)}</div>
        </div>
      ));
    }

    if (activeSection === 'students') {
      return data.items.map((student) => (
        <div key={student.id} className="p-4">
          <p className="font-semibold text-slate-900">{student.fullName}</p>
          <p className="text-xs text-slate-500">{student.studentCode}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            <DetailStat
              label="Lớp"
              value={
                student.enrollments?.length
                  ? student.enrollments.map(({ class: classroom }) => classroom.name).join(', ')
                  : 'Chưa vào lớp'
              }
            />
            <DetailStat label="Lượt thi" value={student._count?.examAttempts ?? 0} />
            <DetailStat label="Ngày tạo" value={formatDate(student.createdAt)} />
          </dl>
          <div className="mt-2 flex justify-end">{renderDeleteAction('student', student)}</div>
        </div>
      ));
    }

    return data.items.map((exam) => {
      const statusMeta = EXAM_STATUS[exam.status] || EXAM_STATUS.DRAFT;
      return (
        <div key={exam.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{exam.title}</p>
              <p className="text-xs text-slate-500">
                {exam.subject} · {exam.accessCode}
              </p>
            </div>
            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            <DetailStat
              label="Giáo viên"
              value={
                exam.teacher ? (
                  <Link
                    to={`/admin/teachers/${exam.teacher.id}`}
                    className="text-brand-600 hover:text-brand-700"
                  >
                    {exam.teacher.fullName}
                  </Link>
                ) : (
                  '—'
                )
              }
            />
            <DetailStat label="Lớp" value={exam.class?.name || '—'} />
            <DetailStat label="Lượt thi" value={exam._count?.attempts ?? 0} />
          </dl>
          <div className="mt-2 flex justify-end">{renderDeleteAction('exam', exam)}</div>
        </div>
      );
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title={config.title} fill />

      <div className="shrink-0">
        <DataNav />
      </div>

      <section className="surface flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(1);
            }}
            placeholder={config.placeholder}
            className="sm:max-w-xs"
          />
          <div className="flex flex-wrap items-center gap-2">
            {config.statusOptions.length ? (
              <Select
                value={statusValue}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-44"
                aria-label="Lọc theo trạng thái"
              >
                {config.statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            ) : null}
            <Button variant="secondary" icon={RefreshCcw} onClick={refresh}>
              Làm mới
            </Button>
          </div>
        </div>

        {teacherFilterId ? (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-brand-100 bg-brand-50/60 px-4 py-2.5 text-xs text-brand-800">
            <span>
              Đang lọc lớp của{' '}
              <strong className="font-semibold">{teacherFilterName || 'giáo viên đã chọn'}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchParams({}, { replace: true });
                setPage(1);
              }}
              className="font-semibold underline-offset-2 hover:underline"
            >
              Bỏ lọc
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span>{error}</span>
            <button
              type="button"
              className="inline-flex items-center gap-1 font-semibold"
              onClick={refresh}
            >
              <RefreshCcw className="h-3.5 w-3.5" /> Thử lại
            </button>
          </div>
        ) : null}

        {loading && !data.items.length ? (
          <LoadingState label="Đang tải dữ liệu..." />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={Database}
            title={hasFilters ? 'Không tìm thấy kết quả phù hợp' : config.emptyTitle}
            description={
              hasFilters
                ? 'Hãy thử từ khóa khác hoặc bỏ bộ lọc trạng thái.'
                : config.emptyDescription
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
                  Xoá bộ lọc
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <div className={`hidden min-h-0 flex-1 overflow-auto lg:block ${loading ? 'opacity-60' : ''}`}>
              <table className="w-full min-w-[900px] text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="table-header">
                    {config.columns.map((column, index) => (
                      <th
                        key={`${column}-${index}`}
                        title={COLUMN_HINTS[column]}
                        className={`px-4 py-3 font-semibold ${
                          index === config.columns.length - 1 ? 'text-right' : ''
                        }`}
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{renderCells()}</tbody>
              </table>
            </div>

            <div className={`min-h-0 flex-1 divide-y divide-slate-100 overflow-auto lg:hidden ${loading ? 'opacity-60' : ''}`}>
              {renderCards()}
            </div>
          </>
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

      <DeleteEntityDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={refresh}
      />
    </div>
  );
}
