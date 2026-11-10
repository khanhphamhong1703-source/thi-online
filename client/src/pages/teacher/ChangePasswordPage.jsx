import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { authApi } from '../../api/auth';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import PageHeader from '../../components/PageHeader';
import FormField from '../../components/FormField';
import Input from '../../components/Input';
import Button from '../../components/Button';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .max(72, 'Mật khẩu tối đa 72 ký tự')
      .regex(/[A-Za-z]/, 'Mật khẩu phải có ít nhất một chữ cái')
      .regex(/[0-9]/, 'Mật khẩu phải có ít nhất một chữ số'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
    path: ['newPassword'],
  });

const REQUIREMENTS = [
  'Tối thiểu 8 ký tự',
  'Có ít nhất một chữ cái',
  'Có ít nhất một chữ số',
  'Khác mật khẩu hiện tại',
];

export default function ChangePasswordPage() {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (values) => {
    setSubmitting(true);
    setServerError('');
    setSuccess(false);
    try {
      await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      toast.success('Đổi mật khẩu thành công');
      setSuccess(true);
      reset();
    } catch (error) {
      const message = getErrorMessage(error, 'Không thể đổi mật khẩu');
      setServerError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        backTo="/teacher/profile"
        backLabel="Quay lại thông tin cá nhân"
        title="Đổi mật khẩu"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="surface p-5 sm:p-6 lg:col-span-2">
          {success ? (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              Mật khẩu đã được cập nhật. Hãy dùng mật khẩu mới ở lần đăng nhập tiếp theo.
            </div>
          ) : null}
          {serverError ? (
            <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {serverError}
            </div>
          ) : null}

          <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Mật khẩu đăng nhập</h2>
              <p className="text-xs text-slate-500">Xác nhận mật khẩu hiện tại trước khi thay đổi</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-4" noValidate>
            <FormField
              label="Mật khẩu hiện tại"
              htmlFor="currentPassword"
              required
              error={errors.currentPassword?.message}
            >
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu hiện tại"
                  className="pl-9"
                  invalid={Boolean(errors.currentPassword)}
                  {...register('currentPassword')}
                />
              </div>
            </FormField>

            <FormField
              label="Mật khẩu mới"
              htmlFor="newPassword"
              required
              error={errors.newPassword?.message}
            >
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Nhập mật khẩu mới"
                  className="pl-9"
                  invalid={Boolean(errors.newPassword)}
                  {...register('newPassword')}
                />
              </div>
            </FormField>

            <FormField
              label="Xác nhận mật khẩu mới"
              htmlFor="confirmPassword"
              required
              error={errors.confirmPassword?.message}
            >
              <div className="relative">
                <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Nhập lại mật khẩu mới"
                  className="pl-9"
                  invalid={Boolean(errors.confirmPassword)}
                  {...register('confirmPassword')}
                />
              </div>
            </FormField>

            <Button type="submit" loading={submitting} className="mt-2">
              Lưu mật khẩu mới
            </Button>
          </form>
        </section>

        <aside className="surface h-fit p-5">
          <h3 className="text-sm font-semibold text-slate-900">Yêu cầu mật khẩu</h3>
          <ul className="mt-3 space-y-2.5">
            {REQUIREMENTS.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-400">
            Không chia sẻ mật khẩu. Nếu quên mật khẩu, vui lòng liên hệ quản trị viên để được đặt lại.
          </p>
        </aside>
      </div>
    </div>
  );
}
