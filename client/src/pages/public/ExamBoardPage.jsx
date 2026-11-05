import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertCircle,
  ArrowRight,
  KeyRound,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { publicExamApi } from '../../api/publicExams';
import { getErrorMessage } from '../../api/client';
import Button from '../../components/Button';
import FormField from '../../components/FormField';
import Input from '../../components/Input';

const schema = z.object({
  accessCode: z
    .string()
    .trim()
    .length(6, 'Mã ca thi phải có đúng 6 ký tự')
    .transform((value) => value.toUpperCase()),
  studentCode: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập mã học sinh')
    .max(30, 'Mã học sinh tối đa 30 ký tự')
    .transform((value) => value.toUpperCase()),
});

export default function ExamBoardPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { accessCode: '', studentCode: '' },
  });

  const onSubmit = async (values) => {
    setError('');
    setSubmitting(true);
    try {
      const { data } = await publicExamApi.lookup(values);
      const exam = data.data.exam;
      const params = new URLSearchParams({
        accessCode: values.accessCode,
        studentCode: values.studentCode,
      });
      navigate(`/exam/${exam.id}?${params.toString()}`);
    } catch (apiError) {
      setError(getErrorMessage(apiError, 'Không tìm thấy ca thi hoặc học sinh'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative overflow-hidden bg-navy-950 h-[calc(100vh-65px)]">
      <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-brand-600/20 blur-3xl" />
      <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="relative mx-auto flex max-w-6xl items-center px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <h1 className="max-w-xl text-xl font-bold leading-[1.12] tracking-tight text-white sm:text-4xl uppercase">
              Cổng thi dành cho học sinh
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">
              Nhập đúng hai mã do giáo viên cung cấp để xem thông tin ca thi và xác nhận
              học sinh trước khi bắt đầu làm bài.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <KeyRound className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-900">Tra cứu ca thi</h2>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">
              Nhập thông tin để xem ca thi và học sinh trước khi vào phòng.
            </p>

            {error ? (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4" noValidate>
              <FormField
                label="Mã ca thi"
                htmlFor="accessCode"
                required
                error={errors.accessCode?.message}
              >
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="accessCode"
                    placeholder="ABC123"
                    maxLength={6}
                    autoComplete="off"
                    className="pl-9 uppercase tracking-widest"
                    invalid={Boolean(errors.accessCode)}
                    {...register('accessCode')}
                  />
                </div>
              </FormField>

              <FormField
                label="Mã học sinh"
                htmlFor="studentCode"
                required
                error={errors.studentCode?.message}
              >
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="studentCode"
                    placeholder="HSxxxx"
                    autoComplete="off"
                    className="pl-9 uppercase"
                    invalid={Boolean(errors.studentCode)}
                    {...register('studentCode')}
                  />
                </div>
              </FormField>

              <Button type="submit" loading={submitting} className="w-full" size="lg">
                Tra cứu ca thi
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-center text-[11px] leading-5 text-slate-500">
                Thông tin ca thi và học sinh sẽ hiển thị ở bước tiếp theo. Bạn chỉ vào phòng thi
                sau khi bấm “Bắt đầu thi”.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
