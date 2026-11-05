import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BookOpen, CalendarDays, Save, Hash } from 'lucide-react';
import { classApi } from '../../api/classes';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import PageHeader from '../PageHeader';
import FormField from '../FormField';
import Input from '../Input';
import Textarea from '../Textarea';
import Button from '../Button';
import LoadingState from '../LoadingState';

const schema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập tên lớp').max(100, 'Tên lớp tối đa 100 ký tự'),
  classCode: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập mã lớp')
    .max(30, 'Mã lớp tối đa 30 ký tự')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Chỉ gồm chữ, số, dấu chấm, gạch dưới, gạch ngang'),
  schoolYear: z
    .string()
    .trim()
    .min(4, 'Vui lòng nhập năm học')
    .max(20, 'Năm học tối đa 20 ký tự'),
  description: z.string().trim().max(500, 'Mô tả tối đa 500 ký tự').optional(),
});

export default function ClassForm({ mode, classId }) {
  const isEdit = mode === 'edit';
  const toast = useToast();
  const navigate = useNavigate();
  const [loadingClass, setLoadingClass] = useState(isEdit);
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
    defaultValues: { name: '', classCode: '', schoolYear: '', description: '' },
  });

  useEffect(() => {
    if (!isEdit) return undefined;
    let active = true;
    setLoadingClass(true);
    classApi
      .get(classId)
      .then(({ data }) => {
        if (!active) return;
        const classroom = data.data;
        reset({
          name: classroom.name,
          classCode: classroom.classCode,
          schoolYear: classroom.schoolYear,
          description: classroom.description || '',
        });
      })
      .catch((error) => {
        if (active) setLoadError(getErrorMessage(error, 'Không tải được thông tin lớp học'));
      })
      .finally(() => {
        if (active) setLoadingClass(false);
      });
    return () => {
      active = false;
    };
  }, [isEdit, classId, reset]);

  const onSubmit = async (values) => {
    setSubmitError('');
    setSubmitting(true);
    try {
      const payload = {
        name: values.name,
        classCode: values.classCode,
        schoolYear: values.schoolYear,
        description: values.description || '',
      };
      const { data } = isEdit
        ? await classApi.update(classId, payload)
        : await classApi.create(payload);
      toast.success(isEdit ? 'Đã cập nhật lớp học' : 'Đã tạo lớp học');
      navigate(`/teacher/classes/${data.data.id}`);
    } catch (error) {
      const message = getErrorMessage(error, 'Không thể lưu lớp học');
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingClass) return <LoadingState label="Đang tải thông tin lớp học..." />;

  if (loadError) {
    return (
      <div className="surface mx-auto max-w-lg p-8 text-center">
        <p className="font-semibold text-slate-900">Không thể mở lớp học</p>
        <p className="mt-1 text-sm text-slate-500">{loadError}</p>
        <Link to="/teacher/classes" className="mt-5 inline-flex text-sm font-semibold text-brand-600">
          Quay lại danh sách lớp
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        backTo={isEdit ? `/teacher/classes/${classId}` : '/teacher/classes'}
        backLabel={isEdit ? 'Quay lại chi tiết lớp học' : 'Quay lại danh sách lớp học'}
        eyebrow="Lớp học"
        title={isEdit ? 'Chỉnh sửa lớp học' : 'Tạo lớp học mới'}
        description={
          isEdit
            ? 'Cập nhật thông tin lớp. Mã lớp cần duy nhất trong tài khoản của bạn.'
            : 'Lớp học mới sẽ thuộc quyền quản lý của tài khoản giáo viên hiện tại.'
        }
      />

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
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Thông tin lớp học</h2>
                <p className="text-xs text-slate-500">Các trường đánh dấu * là bắt buộc</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Tên lớp"
                htmlFor="name"
                required
                error={errors.name?.message}
                className="sm:col-span-2"
              >
                <Input
                  id="name"
                  placeholder="Ví dụ: Lớp 10A1 - Toán"
                  invalid={Boolean(errors.name)}
                  {...register('name')}
                />
              </FormField>

              <FormField
                label="Mã lớp"
                htmlFor="classCode"
                required
                error={errors.classCode?.message}
                hint="Mã lớp duy nhất trong phạm vi tài khoản của bạn."
              >
                <div className="relative">
                  <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="classCode"
                    placeholder="Ví dụ: 10A1"
                    className="pl-9"
                    invalid={Boolean(errors.classCode)}
                    {...register('classCode')}
                  />
                </div>
              </FormField>

              <FormField
                label="Năm học"
                htmlFor="schoolYear"
                required
                error={errors.schoolYear?.message}
                hint="Ví dụ: 2025-2026"
              >
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="schoolYear"
                    placeholder="2025-2026"
                    className="pl-9"
                    invalid={Boolean(errors.schoolYear)}
                    {...register('schoolYear')}
                  />
                </div>
              </FormField>

              <FormField
                label="Mô tả"
                htmlFor="description"
                error={errors.description?.message}
                hint="Không bắt buộc, tối đa 500 ký tự."
                className="sm:col-span-2"
              >
                <Textarea
                  id="description"
                  rows={5}
                  placeholder="Thông tin thêm về lớp học, lịch học, môn phụ trách..."
                  invalid={Boolean(errors.description)}
                  {...register('description')}
                />
              </FormField>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="surface p-5">
              <h3 className="text-sm font-semibold text-slate-900">Lưu ý nghiệp vụ</h3>
              <ul className="mt-3 space-y-2.5 text-sm leading-6 text-slate-500">
                <li>Mỗi lớp chỉ thuộc một giáo viên.</li>
                <li>Bạn không thể xem lớp của giáo viên khác.</li>
                <li>Xóa lớp là lưu trữ mềm, dữ liệu học sinh vẫn được giữ.</li>
              </ul>
            </div>
            <div className="surface flex flex-col gap-2 p-4">
              <Button type="submit" loading={submitting} icon={Save} className="w-full">
                {isEdit ? 'Lưu thay đổi' : 'Tạo lớp học'}
              </Button>
              <Link
                to={isEdit ? `/teacher/classes/${classId}` : '/teacher/classes'}
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
