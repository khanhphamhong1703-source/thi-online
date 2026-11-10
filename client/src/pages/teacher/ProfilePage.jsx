import { Link } from 'react-router-dom';
import {
  AtSign,
  CalendarDays,
  KeyRound,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateTime, getInitials } from '../../utils/format';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div>
      <PageHeader title="Thông tin cá nhân" />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="surface overflow-hidden lg:col-span-2">
          <div className="h-28 bg-gradient-to-r from-navy-950 via-navy-900 to-brand-700" />
          <div className="px-5 pb-6 sm:px-6">
            <div className="-mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-brand-50 text-xl font-bold text-brand-700 shadow-sm">
                  {getInitials(user?.fullName)}
                </div>
                <div className="pb-1">
                  <h2 className="text-xl font-bold text-slate-900">{user?.fullName}</h2>
                  <p className="text-sm text-slate-500">@{user?.username}</p>
                </div>
              </div>
              <div className="pb-1">
                <Badge variant="active">Đang hoạt động</Badge>
              </div>
            </div>

            <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Username</p>
                <p className="mt-1.5 flex items-center gap-2 text-sm text-slate-700">
                  <AtSign className="h-4 w-4 text-slate-400" />
                  {user?.username}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Vai trò</p>
                <p className="mt-1.5 flex items-center gap-2 text-sm text-slate-700">
                  <UserRound className="h-4 w-4 text-slate-400" />
                  Giáo viên
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Email</p>
                <p className="mt-1.5 flex items-center gap-2 text-sm text-slate-700">
                  <Mail className="h-4 w-4 text-slate-400" />
                  {user?.email || 'Chưa cập nhật'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Số điện thoại
                </p>
                <p className="mt-1.5 flex items-center gap-2 text-sm text-slate-700">
                  <Phone className="h-4 w-4 text-slate-400" />
                  {user?.phone || 'Chưa cập nhật'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Ngày tạo tài khoản
                </p>
                <p className="mt-1.5 flex items-center gap-2 text-sm text-slate-700">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  {formatDateTime(user?.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="surface p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">Bảo mật tài khoản</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Mật khẩu được mã hóa bằng bcrypt và phiên đăng nhập dùng JWT trong cookie HttpOnly.
            </p>
            <Link
              to="/teacher/change-password"
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <KeyRound className="h-4 w-4" /> Đổi mật khẩu
            </Link>
          </div>

          <div className="surface p-5">
            <h3 className="text-sm font-semibold text-slate-900">Cần hỗ trợ?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Nếu cần thay đổi họ tên, username hoặc cấp lại tài khoản, vui lòng liên hệ quản trị
              viên của trường.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
