import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, Mail, Phone, Save, UserRound } from 'lucide-react';
import { adminApi } from '../../api/admin';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import PageHeader from '../PageHeader';
import FormField from '../FormField';
import Input from '../Input';
import Button from '../Button';
import LoadingState from '../LoadingState';

const emailField = z
  .string()
  .trim()
  .max(120, 'Email tối đa 120 ký tự')
  .optional()
  .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
    message: 'Email không hợp lệ',
  });

const phoneField = z
  .string()
  .trim()
  .max(20)
  .optional()
  .refine((value) => !value || /^(0|\+84)\d{9,10}$/.test(value), {
    message: 'Số điện thoại phải gồm 10-11 số, bắt đầu bằng 0 hoặc +84',
  });

const baseSchema = {
  fullName: z.string().trim().min(2, 'Họ tên phải có ít nhất 2 ký tự').max(100),
  username: z
    .string()
    .trim()
    .min(3, 'Username phải có ít nhất 3 ký tự')
    .max(30, 'Username tối đa 30 ký tự')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Chỉ gồm chữ, số, dấu chấm, gạch dưới, gạch ngang'),
  email: emailField,
  phone: phoneField,
};

const createSchema = z.object({
  ...baseSchema,
  password: z
    .string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .max(72)
    .regex(/[A-Za-z]/, 'Mật khẩu phải có ít nhất một chữ cái')
    .regex(/[0-9]/, 'Mật khẩu phải có ít nhất một chữ số'),
});

const editSchema = z.object(baseSchema);

export default function TeacherForm({ mode, teacherId }) {
  const isEdit = mode === 'edit';
  const toast = useToast();
  const navigate = useNavigate();
  const [loadingTeacher, setLoadingTeacher] = useState(isEdit);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const schema = isEdit ? editSchema : createSchema;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: isEdit
      ? { fullName: '', username: '', email: '', phone: '' }
      : { fullName: '', username: '', password: '', email: '', phone: '' },
  });

  useEffect(() => {
    if (!isEdit) return undefined;
    let active = true;
    setLoadingTeacher(true);
    adminApi
      .getTeacher(teacherId)
      .then(({ data }) => {
        if (!active) return;
        const teacher = data.data;
        reset({
          fullName: teacher.fullName,
          username: teacher.username,
          email: teacher.email || '',
          phone: teacher.phone || '',
        });
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(getErrorMessage(error, 'Không tải được thông tin giáo viên'));
      })
      .finally(() => {
        if (active) setLoadingTeacher(false);
      });
    return () => {
      active = false;
    };
  }, [isEdit, teacherId, reset]);

  const onSubmit = async (values) => {
    setSubmitError('');
    setSubmitting(true);
    try {
      const payload = {
        fullName: values.fullName,
        username: values.username,
        email: values.email || '',
        phone: values.phone || '',
      };
      if (!isEdit) payload.password = values.password;

      const { data } = isEdit
        ? await adminApi.updateTeacher(teacherId, payload)
        : await adminApi.createTeacher(payload);

      toast.success(isEdit ? 'Đã cập nhật thông tin giáo viên' : 'Đã tạo tài khoản giáo viên');
      navigate(`/admin/teachers/${data.data.id}`);
    } catch (error) {
      const message = getErrorMessage(error, 'Không thể lưu thông tin giáo viên');
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingTeacher) {
    return <LoadingState label="Đang tải thông tin giáo viên..." />;
  }

  if (loadError) {
    return (
      <div className="surface mx-auto max-w-lg p-8 text-center">
        <p className="font-semibold text-slate-900">Không thể mở biểu mẫu</p>
        <p className="mt-1 text-sm text-slate-500">{loadError}</p>
        <Link to="/admin/teachers" className="mt-5 inline-flex text-sm font-semibold text-brand-600">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        backTo={isEdit ? `/admin/teachers/${teacherId}` : '/admin/teachers'}
        backLabel={isEdit ? 'Quay lại chi tiết giáo viên' : 'Quay lại danh sách giáo viên'}
        title={isEdit ? 'Chỉnh sửa giáo viên' : 'Tạo tài khoản giáo viên'}
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {submitError ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {submitError}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="surface p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Thông tin tài khoản</h2>
                  <p className="text-xs text-slate-500">Tên hiển thị và thông tin đăng nhập</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Họ và tên"
                  htmlFor="fullName"
                  required
                  error={errors.fullName?.message}
                  className="sm:col-span-2"
                >
                  <Input
                    id="fullName"
                    placeholder="Ví dụ: Nguyễn Thị Minh Anh"
                    invalid={Boolean(errors.fullName)}
                    {...register('fullName')}
                  />
                </FormField>

                <FormField
                  label="Username"
                  htmlFor="username"
                  required
                  error={errors.username?.message}
                  hint="Duy nhất trên hệ thống, không dấu, không khoảng trắng."
                >
                  <Input
                    id="username"
                    autoComplete="off"
                    placeholder="Ví dụ: minhanh"
                    invalid={Boolean(errors.username)}
                    {...register('username')}
                  />
                </FormField>

                {isEdit ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <KeyRound className="h-4 w-4" /> Mật khẩu
                    </div>
                    <p className="mt-1.5 text-xs leading-5 text-slate-500">
                      Dùng chức năng “Đặt lại mật khẩu” để cấp mật khẩu mới cho giáo viên.
                    </p>
                  </div>
                ) : (
                  <FormField
                    label="Mật khẩu"
                    htmlFor="password"
                    required
                    error={errors.password?.message}
                    hint="Tối thiểu 8 ký tự, gồm chữ cái và chữ số."
                  >
                    <Input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Nhập mật khẩu ban đầu"
                      invalid={Boolean(errors.password)}
                      {...register('password')}
                    />
                  </FormField>
                )}
              </div>
            </section>

            <section className="surface p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Thông tin liên hệ</h2>
                  <p className="text-xs text-slate-500">Không bắt buộc, dùng để liên lạc nội bộ</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Email" htmlFor="email" error={errors.email?.message}>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="giao.vien@school.edu.vn"
                      className="pl-9"
                      invalid={Boolean(errors.email)}
                      {...register('email')}
                    />
                  </div>
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
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <div className="surface p-5">
              <h3 className="text-sm font-semibold text-slate-900">Lưu ý</h3>
              <ul className="mt-3 space-y-2.5 text-sm leading-6 text-slate-500">
                <li>Username phải duy nhất và không thể trùng giáo viên khác.</li>
                <li>Giáo viên bị khóa sẽ không thể đăng nhập.</li>
                <li>Tài khoản không có chức năng tự đăng ký.</li>
              </ul>
            </div>
            <div className="surface flex flex-col gap-2 p-4">
              <Button type="submit" loading={submitting} icon={Save} className="w-full">
                {isEdit ? 'Lưu thay đổi' : 'Tạo tài khoản'}
              </Button>
              <Link
                to={isEdit ? `/admin/teachers/${teacherId}` : '/admin/teachers'}
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
