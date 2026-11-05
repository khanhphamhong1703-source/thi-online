import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound } from 'lucide-react';
import Modal from '../Modal';
import Button from '../Button';
import FormField from '../FormField';
import Input from '../Input';
import { adminApi } from '../../api/admin';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../contexts/ToastContext';

const schema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .max(72, 'Mật khẩu tối đa 72 ký tự')
      .regex(/[A-Za-z]/, 'Mật khẩu phải có ít nhất một chữ cái')
      .regex(/[0-9]/, 'Mật khẩu phải có ít nhất một chữ số'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

export default function ResetPasswordModal({ teacher, open, onClose, onSuccess }) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { newPassword: '', confirmPassword: '' } });

  useEffect(() => {
    if (open) {
      reset({ newPassword: '', confirmPassword: '' });
      setServerError('');
    }
  }, [open, reset]);

  const onSubmit = async (values) => {
    setSubmitting(true);
    setServerError('');
    try {
      await adminApi.resetPassword(teacher.id, values.newPassword);
      toast.success(`Đã đặt lại mật khẩu cho ${teacher.fullName}`);
      onSuccess?.();
      onClose();
    } catch (error) {
      const message = getErrorMessage(error, 'Không thể đặt lại mật khẩu');
      setServerError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title="Đặt lại mật khẩu"
      description={`Tạo mật khẩu mới cho tài khoản ${teacher?.fullName || ''}. Giáo viên cần dùng mật khẩu này ở lần đăng nhập tiếp theo.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Hủy
          </Button>
          <Button type="submit" form="reset-password-form" loading={submitting}>
            Đặt lại mật khẩu
          </Button>
        </>
      }
    >
      <form id="reset-password-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-3.5 py-3 text-sm text-blue-700">
          <KeyRound className="h-4 w-4 shrink-0" />
          Mật khẩu phải có tối thiểu 8 ký tự, gồm chữ cái và chữ số.
        </div>
        {serverError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
            {serverError}
          </div>
        ) : null}
        <FormField
          label="Mật khẩu mới"
          htmlFor="newPassword"
          required
          error={errors.newPassword?.message}
        >
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Nhập mật khẩu mới"
            invalid={Boolean(errors.newPassword)}
            {...register('newPassword')}
          />
        </FormField>
        <FormField
          label="Xác nhận mật khẩu"
          htmlFor="confirmPassword"
          required
          error={errors.confirmPassword?.message}
        >
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Nhập lại mật khẩu mới"
            invalid={Boolean(errors.confirmPassword)}
            {...register('confirmPassword')}
          />
        </FormField>
      </form>
    </Modal>
  );
}
