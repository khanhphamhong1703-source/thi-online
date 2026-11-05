import { Loader2 } from 'lucide-react';

export default function LoadingState({ label = 'Đang tải dữ liệu...', fullPage = false }) {
  return (
    <div
      className={
        fullPage
          ? 'flex min-h-screen items-center justify-center bg-slate-50'
          : 'flex min-h-56 items-center justify-center'
      }
    >
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-card">
          <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
        </div>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}
