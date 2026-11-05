import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
  Edit3,
  GraduationCap,
  Mail,
  Phone,
  Trash2,
  UserRound,
} from 'lucide-react';
import { studentApi } from '../../api/students';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import { formatDate, formatDateTime, getInitials } from '../../utils/format';
import PageHeader from '../../components/PageHeader';
import LoadingState from '../../components/LoadingState';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';

export default function StudentDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const classId = searchParams.get('classId');
  const navigate = useNavigate();
  const toast = useToast();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    studentApi
      .get(id)
      .then(({ data }) => {
        if (active) setStudent(data.data);
      })
      .catch((apiError) => {
        if (active) setError(getErrorMessage(apiError, 'Không tải được thông tin học sinh'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const { data } = await studentApi.removeFromClass(classId, id);
      toast.success(data.message);
      navigate(`/teacher/classes/${classId}/students`);
    } catch (apiError) {
      toast.error(getErrorMessage(apiError, 'Không thể xóa học sinh khỏi lớp'));
    } finally {
      setRemoving(false);
    }
  };

  if (loading) return <LoadingState label="Đang tải hồ sơ học sinh..." />;

  if (error || !student) {
    return (
      <div className="surface mx-auto max-w-lg p-8 text-center">
        <p className="font-semibold text-slate-900">Không tìm thấy học sinh</p>
        <p className="mt-1 text-sm text-slate-500">{error}</p>
        <Link to="/teacher/classes" className="mt-5 inline-flex text-sm font-semibold text-brand-600">
          Quay lại danh sách lớp
        </Link>
      </div>
    );
  }

  const backPath = classId
    ? `/teacher/classes/${classId}/students`
    : '/teacher/classes';
  const currentClass = student.classes?.find((item) => item.id === classId);

  return (
    <div>
      <PageHeader
        backTo={backPath}
        backLabel={classId ? 'Quay lại danh sách học sinh' : 'Quay lại danh sách lớp'}
        eyebrow={currentClass ? `${currentClass.classCode} · ${currentClass.schoolYear}` : 'Hồ sơ học sinh'}
        title={student.fullName}
        description={`Mã học sinh ${student.studentCode} · Hồ sơ dùng chung toàn hệ thống`}
        actions={
          <>
            {classId ? (
              <Button
                variant="danger"
                icon={Trash2}
                onClick={() => setRemoveOpen(true)}
              >
                Xóa khỏi lớp
              </Button>
            ) : null}
            <Button
              variant="secondary"
              icon={Edit3}
              onClick={() =>
                navigate(
                  `/teacher/students/${id}/edit${classId ? `?classId=${classId}` : ''}`
                )
              }
            >
              Chỉnh sửa
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="surface overflow-hidden">
            <div className="h-20 bg-gradient-to-r from-brand-800 via-brand-700 to-blue-600" />
            <div className="px-5 pb-6 sm:px-6">
              <div className="-mt-5 flex items-end gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-brand-50 text-xl font-bold text-brand-700 shadow-sm">
                  {getInitials(student.fullName)}
                </div>
                <div className="pb-1">
                  <h2 className="text-xl font-bold text-slate-900">{student.fullName}</h2>
                  <p className="text-sm text-slate-500">{student.studentCode}</p>
                </div>
              </div>

              <dl className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Ngày sinh
                  </dt>
                  <dd className="mt-1.5 flex items-center gap-2 text-sm text-slate-700">
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                    {formatDate(student.dateOfBirth)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Số điện thoại
                  </dt>
                  <dd className="mt-1.5 flex items-center gap-2 text-sm text-slate-700">
                    <Phone className="h-4 w-4 text-slate-400" />
                    {student.phone || 'Chưa cập nhật'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Email
                  </dt>
                  <dd className="mt-1.5 flex items-center gap-2 text-sm text-slate-700">
                    <Mail className="h-4 w-4 text-slate-400" />
                    {student.email ? (
                      <a href={`mailto:${student.email}`} className="hover:text-brand-600">
                        {student.email}
                      </a>
                    ) : (
                      'Chưa cập nhật'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Ngày tạo hồ sơ
                  </dt>
                  <dd className="mt-1.5 text-sm text-slate-700">
                    {formatDateTime(student.createdAt)}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Lớp học đang tham gia</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Chỉ hiển thị các lớp thuộc quyền quản lý của bạn
                </p>
              </div>
              <BookOpen className="h-5 w-5 text-slate-300" />
            </div>

            {student.classes?.length ? (
              <ul className="divide-y divide-slate-100">
                {student.classes.map((classroom) => (
                  <li
                    key={classroom.id}
                    className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
                  >
                    <Link
                      to={`/teacher/classes/${classroom.id}`}
                      className="flex items-center gap-3 group"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <GraduationCap className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 group-hover:text-brand-700">
                          {classroom.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {classroom.classCode} · {classroom.schoolYear}
                        </p>
                      </div>
                    </Link>
                    <Badge variant={classroom.isArchived ? 'warning' : 'active'}>
                      {classroom.isArchived ? 'Lưu trữ' : 'Đang học'}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                icon={BookOpen}
                title="Chưa thuộc lớp nào"
                description="Học sinh hiện không thuộc lớp học nào do bạn quản lý."
              />
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="surface p-5">
            <h3 className="text-sm font-semibold text-slate-900">Đồng bộ hồ sơ</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Học sinh có thể thuộc nhiều lớp. Khi chỉnh sửa thông tin tại đây, dữ liệu được cập nhật
              trên toàn hệ thống cho mọi lớp mà học sinh tham gia.
            </p>
          </div>

          {classId ? (
            <div className="surface p-5">
              <h3 className="text-sm font-semibold text-slate-900">Quan hệ lớp học</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Xóa khỏi lớp chỉ gỡ quan hệ học sinh – lớp. Hồ sơ học sinh không bị xóa khỏi hệ thống.
              </p>
              <Button
                variant="ghost-danger"
                icon={Trash2}
                className="mt-3 w-full justify-start"
                onClick={() => setRemoveOpen(true)}
              >
                Xóa khỏi lớp hiện tại
              </Button>
            </div>
          ) : null}

          <div className="surface p-5">
            <h3 className="text-sm font-semibold text-slate-900">Mã định danh</h3>
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700">
              <UserRound className="h-4 w-4 text-slate-400" />
              {student.studentCode}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Mã học sinh là duy nhất và không thể trùng giữa các hồ sơ.
            </p>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        onConfirm={handleRemove}
        loading={removing}
        tone="danger"
        title="Xóa học sinh khỏi lớp?"
        description={`${student.fullName} sẽ bị gỡ khỏi lớp hiện tại. Hồ sơ học sinh vẫn tồn tại trên hệ thống và các lớp khác không bị ảnh hưởng.`}
        confirmLabel="Xóa khỏi lớp"
      />
    </div>
  );
}
