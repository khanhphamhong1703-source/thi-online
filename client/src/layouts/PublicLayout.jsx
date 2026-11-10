import { Link, Outlet } from 'react-router-dom';
import { ArrowRight, GraduationCap } from 'lucide-react';

export default function PublicLayout() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-50">
      <header className="z-30 shrink-0 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-950 text-white">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-base font-bold tracking-tight text-slate-900">ViExam</span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
                Cổng thi trực tuyến
              </span>
            </span>
          </Link>

          <nav className="flex items-center">
            <Link
              to="/"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Tra cứu ca thi
            </Link>
          </nav>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>ViExam · Hệ thống thi trực tuyến</span>
          <span className="inline-flex items-center gap-1.5">
            <ArrowRight className="h-3.5 w-3.5" /> Học sinh cần mã học sinh và mã ca thi để vào làm bài
          </span>
        </div>
      </footer> */}
    </div>
  );
}
