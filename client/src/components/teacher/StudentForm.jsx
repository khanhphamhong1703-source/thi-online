import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CalendarDays,
  Hash,
  Info,
  Mail,
  Phone,
  Save,
  UserRound,
} from 'lucide-react';
import { classApi } from '../../api/classes';
import { studentApi } from '../../api/students';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import { formatDate, toDateInputValue } from '../../utils/format';
import PageHeader from '../PageHeader';
import FormField from '../FormField';
import Input from '../Input';
import Button from '../Button';
import LoadingState from '../LoadingState';

const optionalEmail = z
  .string()
  .trim()
  .max(120, 'Email tối đa 120 ký tự')
  .optional()
  .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
    message: 'Email không hợp lệ',
  });

const optionalPhone = z
  .string()
  .trim()
  .max(20)
  .optional()
  .refine((value) => !value || /^(0|\+84)\d{9,10}$/.test(value), {
    message: 'Số điện thoại phải gồm 10-11 số, bắt đầu bằng 0 hoặc +84',
  });

const schema = z.object({
  fullName: z.string().trim().min(2, 'Họ tên phải có ít nhất 2 ký tự').max(100),
  dateOfBirth: z
    .string()
    .min(1, 'Vui lòng nhập ngày sinh')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Ngày sinh không hợp lệ')
    .refine(
      (value) => new Date(value) <= new Date(),
      'Ngày sinh không được lớn hơn ngày hiện tại'
    ),
  phone: optionalPhone,
  email: optionalEmail,
});

export default function StudentForm({ mode, classId, studentId }) {
  const isEdit = mode === 'edit';
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contextClassId = classId || searchParams.get('classId') || '';
  const [classroom, setClassroom] = useState(null);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      dateOfBirth: '',
      phone: '',
      email: '',
    },
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');

    const requests = [];
    if (contextClassId) requests.push(classApi.get(contextClassId));
    if (isEdit) requests.push(studentApi.get(studentId));

    Promise.all(requests)
      .then((responses) => {
        if (!active) return;
        let index = 0;
        if (contextClassId) {
          setClassroom(responses[index].data.data);
          index += 1;
        }
        if (isEdit) {
          const data = responses[index].data.data;
          setStudent(data);
          reset({
            fullName: data.fullName,
            dateOfBirth: toDateInputValue(data.dateOfBirth),
            phone: data.phone || '',
            email: data.email || '',
          });
        }
      })
      .catch((error) => {
        if (active) setLoadError(getErrorMessage(error, 'Không tải được dữ liệu'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isEdit, contextClassId, studentId, reset]);

  const onSubmit = async (values) => {
    setSubmitError('');
    setSubmitting(true);
    try {
      const payload = {
        fullName: values.fullName,
        dateOfBirth: values.dateOfBirth,
        phone: values.phone || '',
        email: values.email || '',
      };

      if (isEdit) {
        const { data } = await studentApi.update(studentId, payload);
        toast.success(data.message);
        navigate(
          `/teacher/students/${studentId}${contextClassId ? `?classId=${contextClassId}` : ''}`
        );
      } else {
        const { data } = await studentApi.addToClass(contextClassId, payload);
        toast.success(data.message);
        navigate(`/teacher/students/${data.data.id}?classId=${contextClassId}`);
      }
    } catch (error) {
      const message = getErrorMessage(error, 'Không thể lưu học sinh');
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label="Đang tải dữ liệu học sinh..." />;

  if (loadError) {
    return (
      <div className="surface mx-auto max-w-lg p-8 text-center">
        <p className="font-semibold text-slate-900">Không thể mở biểu mẫu</p>
        <p className="mt-1 text-sm text-slate-500">{loadError}</p>
        <Link
          to={contextClassId ? `/teacher/classes/${contextClassId}/students` : '/teacher/classes'}
          className="mt-5 inline-flex text-sm font-semibold text-brand-600"
        >
          Quay lại
        </Link>
      </div>
    );
  }

  const backPath = isEdit
    ? `/teacher/students/${studentId}${contextClassId ? `?classId=${contextClassId}` : ''}`
    : `/teacher/classes/${contextClassId}/students`;

  return (
    <div>
      <PageHeader
        backTo={backPath}
        backLabel={isEdit ? 'Quay lại chi tiết học sinh' : 'Quay lại danh sách học sinh'}
        eyebrow={classroom ? `${classroom.classCode} · ${classroom.schoolYear}` : 'Hồ sơ học sinh'}
        title={isEdit ? 'Chỉnh sửa học sinh' : 'Thêm học sinh vào lớp'}
        description={
          isEdit
            ? 'Thông tin học sinh được đồng bộ trên toàn hệ thống. Mã học sinh được giữ cố định.'
            : 'Mã học sinh được hệ thống tự động sinh theo dạng HSxxxx, giáo viên không cần nhập.'
        }
      />

      {classroom ? (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Info className="h-4 w-4 shrink-0" />
          {isEdit ? (
            <>
              Đang chỉnh sửa hồ sơ học sinh trong ngữ cảnh lớp <strong>{classroom.name}</strong> (
              {classroom.classCode}), năm học {classroom.schoolYear}. Thay đổi sẽ đồng bộ trên toàn hệ
              thống.
            </>
          ) : (
            <>
              Đang thêm vào lớp <strong>{classroom.name}</strong> ({classroom.classCode}), năm học{' '}
              {classroom.schoolYear}.
            </>
          )}
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {submitError ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {submitError}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="surface p-5 sm:p-6 lg:col-span-2">
            <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Thông tin học sinh</h2>
                <p className="text-xs text-slate-500">Các trường đánh dấu * là bắt buộc</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Mã học sinh"
                htmlFor="studentCode"
                hint={
                  isEdit
                    ? 'Mã học sinh không thể thay đổi sau khi tạo.'
                    : 'Mã được tạo tự động khi lưu, ví dụ HS0001.'
                }
              >
                <div className="relative">
                  <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="studentCode"
                    value={isEdit ? student?.studentCode || '' : 'Tự động sinh (HSxxxx)'}
                    readOnly
                    disabled
                    className="pl-9 font-semibold"
                  />
                </div>
              </FormField>

              <FormField
                label="Ngày sinh"
                htmlFor="dateOfBirth"
                required
                error={errors.dateOfBirth?.message}
              >
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="dateOfBirth"
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    className="pl-9"
                    invalid={Boolean(errors.dateOfBirth)}
                    {...register('dateOfBirth')}
                  />
                </div>
              </FormField>

              <FormField
                label="Họ và tên"
                htmlFor="fullName"
                required
                error={errors.fullName?.message}
                className="sm:col-span-2"
              >
                <Input
                  id="fullName"
                  placeholder="Ví dụ: Nguyễn Văn An"
                  invalid={Boolean(errors.fullName)}
                  {...register('fullName')}
                />
              </FormField>

              <FormField label="Số điện thoại" htmlFor="phone" error={errors.phone?.message}>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="phone"
                    placeholder="0912345678"
                    className="pl-9"
                    invalid={Boolean(errors.phone)}
                    {...register('phone')}
                  />
                </div>
              </FormField>

              <FormField label="Email" htmlFor="email" error={errors.email?.message}>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="hoc.sinh@example.com"
                    className="pl-9"
                    invalid={Boolean(errors.email)}
                    {...register('email')}
                  />
                </div>
              </FormField>
            </div>
          </section>

          <aside className="space-y-4">
            {isEdit && student ? (
              <div className="surface p-5">
                <h3 className="text-sm font-semibold text-slate-900">Hồ sơ hiện tại</h3>
                <p className="mt-2 text-lg font-bold text-slate-900">{student.fullName}</p>
                <p className="text-sm text-slate-500">{student.studentCode}</p>
                <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  Tạo ngày {formatDate(student.createdAt)}
                </div>
              </div>
            ) : (
              <div className="surface p-5">
                <h3 className="text-sm font-semibold text-slate-900">Mã học sinh tự động</h3>
                <ul className="mt-3 space-y-2.5 text-sm leading-6 text-slate-500">
                  <li>Mã được sinh theo thứ tự dạng HS0001, HS0002...</li>
                  <li>Mã là duy nhất trên toàn hệ thống và không thể chỉnh sửa.</li>
                  <li>Học sinh có thể thuộc nhiều lớp cùng lúc.</li>
                  <li>Import Excel vẫn sử dụng mã học sinh có sẵn trong file.</li>
                </ul>
              </div>
            )}

            <div className="surface flex flex-col gap-2 p-4">
              <Button type="submit" loading={submitting} icon={Save} className="w-full">
                {isEdit ? 'Lưu thay đổi' : 'Thêm vào lớp'}
              </Button>
              <Link
                to={backPath}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Hủy
              </Link>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}
