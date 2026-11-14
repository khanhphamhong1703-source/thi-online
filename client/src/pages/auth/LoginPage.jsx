import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMessage } from '../../api/client';
import Input from '../../components/Input';
import Button from '../../components/Button';
import FormField from '../../components/FormField';

const schema = z.object({
  username: z.string().trim().min(1, 'Vui lòng nhập username'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

const CONTENT = {
  ADMIN: {
    badge: 'Cổng quản trị',
    title: 'Quản lý đội ngũ giáo viên tập trung.',
    description:
      'Tạo tài khoản, theo dõi trạng thái hoạt động và kiểm soát quyền truy cập của toàn bộ giáo viên trong một nơi duy nhất.',
    icon: ShieldCheck,
    features: [
      'Tạo và quản lý tài khoản giáo viên',
      'Khóa, mở khóa và đặt lại mật khẩu',
      'Dashboard tổng quan theo thời gian thực',
    ],
  },
  TEACHER: {
    badge: 'Không gian giáo viên',
    title: 'Lớp học gọn gàng, đề thi rõ ràng.',
    description:
      'Quản lý lớp học, học sinh và soạn đề trắc nghiệm. Cài đặt ca thi, thời gian mở–đóng và theo dõi kết quả trong một không gian duy nhất.',
    icon: BookOpen,
    features: [
      'Quản lý lớp học theo từng giáo viên',
      'Soạn đề, cài đặt ca thi và theo dõi kết quả',
      'Theo dõi kết quả làm bài của học sinh',
    ],
  },
};

export default function LoginPage({ role }) {
  const content = CONTENT[role];
  const RoleIcon = content.icon;
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  });

  const homePath = role === 'ADMIN' ? '/admin' : '/teacher';

  useEffect(() => {
    if (user) {
      navigate(user.role === 'ADMIN' ? '/admin' : '/teacher', { replace: true });
    }
  }, [user, navigate]);

  const onSubmit = async (values) => {
    setError('');
    setSubmitting(true);
    try {
      const loggedInUser = await login({ ...values, expectedRole: role });
      const redirectTo = location.state?.from?.pathname;
      const safeRedirect =
        redirectTo && redirectTo.startsWith(homePath) ? redirectTo : homePath;
      navigate(
        loggedInUser.role === 'ADMIN' ? '/admin' : safeRedirect,
        { replace: true }
      );
    } catch (apiError) {
      setError(getErrorMessage(apiError, 'Đăng nhập thất bại. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="relative hidden w-[46%] overflow-hidden bg-navy-950 lg:flex lg:flex-col">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand-600/20 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <Link to={`/${role.toLowerCase()}/login`} className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-blue-950/40">
              <GraduationCap className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-lg font-bold tracking-tight text-white">ViExam</span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
                Hệ thống thi trực tuyến
              </span>
            </span>
          </Link>

          <div className="max-w-lg">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
              <RoleIcon className="h-3.5 w-3.5 text-brand-300" />
              {content.badge}
            </div>
            <h1 className="text-4xl font-bold leading-[1.15] tracking-tight text-white xl:text-[44px]">
              {content.title}
            </h1>
            <p className="mt-5 text-base leading-7 text-slate-400">{content.description}</p>

            <ul className="mt-8 space-y-3.5">
              {content.features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="h-3.5 w-3.5" />
            ViExam · Nền tảng thi trực tuyến hiện đại
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-950 text-white">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <p className="text-base font-bold text-slate-900">ViExam</p>
              <p className="text-xs text-slate-500">{content.badge}</p>
            </div>
          </div>

          <div className="mb-7">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
              <RoleIcon className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Đăng nhập {role === 'ADMIN' ? 'quản trị' : 'giáo viên'}
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">
              {role === 'ADMIN'
                ? 'Sử dụng tài khoản quản trị được tạo từ seed script.'
                : 'Sử dụng tài khoản do quản trị viên cấp.'}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {error ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <FormField label="Username" htmlFor="username" required error={errors.username?.message}>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="username"
                  autoComplete="username"
                  placeholder="Nhập username"
                  className="pl-9"
                  invalid={Boolean(errors.username)}
                  {...register('username')}
                />
              </div>
            </FormField>

            <FormField label="Mật khẩu" htmlFor="password" required error={errors.password?.message}>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  className="pl-9 pr-10"
                  invalid={Boolean(errors.password)}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormField>

            <Button
              type="submit"
              size="lg"
              loading={submitting}
              className="mt-2 w-full"
              icon={submitting ? undefined : ArrowRight}
            >
              {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs leading-5 text-slate-400">
            Hệ thống không hỗ trợ tự đăng ký. Vui lòng liên hệ quản trị viên nếu cần cấp tài khoản.
          </p>
        </div>
      </div>
    </div>
  );
}
