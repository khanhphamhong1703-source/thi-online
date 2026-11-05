import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Archive,
  ArrowRight,
  CalendarDays,
  Edit3,
  GraduationCap,
  Hash,
  Users,
} from 'lucide-react';
import { classApi } from '../../api/classes';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import { formatDate, formatDateTime } from '../../utils/format';
import PageHeader from '../../components/PageHeader';
import LoadingState from '../../components/LoadingState';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function ClassDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [classroom, setClassroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    classApi
      .get(id)
      .then(({ data }) => {
        if (active) setClassroom(data.data);
      })
      .catch((apiError) => {
        if (active) setError(getErrorMessage(apiError, 'Không tải được thông tin lớp học'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const handleArchive = async () => {
    setArchiving(true);
    try {
      const { data } = await classApi.archive(id);
      toast.success(data.message);
      navigate('/teacher/classes');
    } catch (apiError) {
      toast.error(getErrorMessage(apiError, 'Không thể lưu trữ lớp học'));
    } finally {
      setArchiving(false);
    }
  };

  if (loading) return <LoadingState label="Đang tải thông tin lớp học..." />;

  if (error || !classroom) {
    return (
      <div className="surface mx-auto max-w-lg p-8 text-center">
        <p className="font-semibold text-slate-900">Không tìm thấy lớp học</p>
        <p className="mt-1 text-sm text-slate-500">{error}</p>
        <Link to="/teacher/classes" className="mt-5 inline-flex text-sm font-semibold text-brand-600">
          Quay lại danh sách lớp
        </Link>
      </div>
    );
  }

  const studentCount = classroom._count?.enrollments || 0;

  return (
    <div>
      <PageHeader
        backTo="/teacher/classes"
        backLabel="Quay lại danh sách lớp học"
        eyebrow="Chi tiết lớp học"
        title={classroom.name}
        description={`${classroom.classCode} · Năm học ${classroom.schoolYear}`}
        actions={
          <>
            <Button
              variant="secondary"
              icon={Edit3}
              onClick={() => navigate(`/teacher/classes/${id}/edit`)}
            >
              Chỉnh sửa
            </Button>
            <Button
              variant="danger"
              icon={Archive}
              onClick={() => setArchiveOpen(true)}
              disabled={classroom.isArchived}
            >
              Lưu trữ
            </Button>
          </>
        }
      />

      {classroom.isArchived ? (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Lớp học này đã được lưu trữ và không còn hiển thị trong danh sách.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="surface p-5 sm:p-6 lg:col-span-2">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <GraduationCap className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{classroom.name}</h2>
                <p className="text-sm text-slate-500">
                  {classroom.classCode} · {classroom.schoolYear}
                </p>
              </div>
            </div>
            <Badge variant={classroom.isArchived ? 'warning' : 'active'}>
              {classroom.isArchived ? 'Đã lưu trữ' : 'Đang quản lý'}
            </Badge>
          </div>

          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Mã lớp</dt>
              <dd className="mt-1.5 flex items-center gap-2 text-sm font-medium text-slate-800">
                <Hash className="h-4 w-4 text-slate-400" /> {classroom.classCode}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Năm học</dt>
              <dd className="mt-1.5 flex items-center gap-2 text-sm font-medium text-slate-800">
                <CalendarDays className="h-4 w-4 text-slate-400" /> {classroom.schoolYear}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Số lượng học sinh
              </dt>
              <dd className="mt-1.5 flex items-center gap-2 text-sm font-medium text-slate-800">
                <Users className="h-4 w-4 text-slate-400" /> {studentCount} học sinh
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Ngày tạo
              </dt>
              <dd className="mt-1.5 text-sm font-medium text-slate-800">
                {formatDateTime(classroom.createdAt)}
              </dd>
            </div>
          </dl>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Mô tả</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {classroom.description || 'Lớp học chưa có mô tả.'}
            </p>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="surface p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Users className="h-5 w-5" />
            </div>
            <p className="mt-4 text-3xl font-bold text-slate-900">{studentCount}</p>
            <p className="text-sm text-slate-500">học sinh trong lớp</p>
            <Link
              to={`/teacher/classes/${id}/students`}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Quản lý học sinh
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to={`/teacher/classes/${id}/import`}
              className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Import Excel
            </Link>
          </div>

          <div className="surface p-5">
            <h3 className="text-sm font-semibold text-slate-900">Thông tin hệ thống</h3>
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Trạng thái</span>
                <Badge variant={classroom.isArchived ? 'warning' : 'active'}>
                  {classroom.isArchived ? 'Lưu trữ' : 'Hoạt động'}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Cập nhật</span>
                <span className="text-slate-700">{formatDate(classroom.updatedAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Quyền sở hữu</span>
                <span className="text-slate-700">Tài khoản của bạn</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={handleArchive}
        loading={archiving}
        tone="danger"
        title="Lưu trữ lớp học?"
        description={`Lớp ${classroom.name} sẽ bị ẩn khỏi danh sách. Dữ liệu ${studentCount} học sinh và quan hệ lớp học vẫn được bảo toàn, không bị xóa khỏi hệ thống.`}
        confirmLabel="Lưu trữ lớp học"
      />
    </div>
  );
}
