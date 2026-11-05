import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function NotFoundPage() {
  const { user } = useAuth();
  const homePath = user?.role === 'ADMIN' ? '/admin' : user?.role === 'TEACHER' ? '/teacher' : '/';

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-card">
          <Compass className="h-8 w-8" />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Lỗi 404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Trang không tồn tại
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Đường dẫn bạn truy cập không tồn tại hoặc bạn không có quyền xem nội dung này.
        </p>
        <Link
          to={homePath}
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <Home className="h-4 w-4" />
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
