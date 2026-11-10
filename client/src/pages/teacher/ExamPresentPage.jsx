import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock3,
  Copy,
  GraduationCap,
  Maximize2,
  Minimize2,
  Users,
} from 'lucide-react';
import { examApi } from '../../api/exams';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import { formatDateTime } from '../../utils/format';
import LoadingState from '../../components/LoadingState';
import {
  enterExamFullscreen,
  exitExamFullscreen,
  getFullscreenElement,
  isExamFullscreenSupported,
} from '../../utils/fullscreen';

function pad2(value) {
  return String(value).padStart(2, '0');
}

function formatCountdown(milliseconds) {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0
    ? `${hours}:${pad2(minutes)}:${pad2(seconds)}`
    : `${pad2(minutes)}:${pad2(seconds)}`;
}

function formatClock(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

const PHASE_META = {
  DRAFT: { label: 'Đề nháp — chưa công bố', tone: 'border-amber-400/40 bg-amber-400/10 text-amber-200' },
  UPCOMING: { label: 'Sắp mở', tone: 'border-sky-400/40 bg-sky-400/10 text-sky-200' },
  OPEN: { label: 'Đang mở', tone: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200' },
  CLOSED: { label: 'Đã kết thúc', tone: 'border-slate-500/40 bg-slate-500/10 text-slate-300' },
};

export default function ExamPresentPage() {
  const { id } = useParams();
  const toast = useToast();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(getFullscreenElement()));
  const fullscreenSupported = isExamFullscreenSupported();

  useEffect(() => {
    let active = true;

    const load = () => {
      examApi
        .get(id)
        .then(({ data }) => {
          if (!active) return;
          setExam(data.data);
          setError('');
        })
        .catch((apiError) => {
          if (active) setError(getErrorMessage(apiError, 'Không tải được ca thi'));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };

    load();
    const refresh = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(refresh);
    };
  }, [id]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(getFullscreenElement()));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = async () => {
    if (isFullscreen) {
      await exitExamFullscreen();
    } else {
      await enterExamFullscreen();
    }
    setIsFullscreen(Boolean(getFullscreenElement()));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exam.accessCode);
      toast.success('Đã sao chép mã ca thi');
    } catch {
      toast.info(`Mã ca thi: ${exam.accessCode}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <LoadingState fullPage label="Đang tải ca thi..." />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 px-6 text-center text-slate-200">
        <p className="text-lg font-semibold">Không tải được ca thi</p>
        <p className="max-w-md text-sm text-slate-400">{error}</p>
        <Link
          to="/teacher/exams"
          className="mt-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Quay lại danh sách đề thi
        </Link>
      </div>
    );
  }

  const openAt = exam.openAt ? new Date(exam.openAt).getTime() : null;
  const closeAt = exam.closeAt ? new Date(exam.closeAt).getTime() : null;
  const phase =
    exam.status === 'DRAFT'
      ? 'DRAFT'
      : openAt && now < openAt
        ? 'UPCOMING'
        : closeAt && now < closeAt
          ? 'OPEN'
          : 'CLOSED';
  const phaseMeta = PHASE_META[phase];
  const countdownTarget = phase === 'UPCOMING' ? openAt : phase === 'OPEN' ? closeAt : null;
  const countdownLabel = phase === 'UPCOMING' ? 'Bắt đầu sau' : phase === 'OPEN' ? 'Còn lại' : null;
  const activeClasses = (exam.classes || []).filter((classroom) => !classroom.isArchived);
  const classLabel = activeClasses.length
    ? activeClasses.map((classroom) => classroom.name).join(', ')
    : exam.className || 'Chưa gán lớp';

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-4 py-4 sm:px-10 sm:py-7">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to={`/teacher/exams/${exam.id}`}
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Chi tiết đề thi
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${phaseMeta.tone}`}>
              {phaseMeta.label}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <Copy className="h-3.5 w-3.5" />
              Sao chép mã
            </button>
            {fullscreenSupported ? (
              <button
                type="button"
                onClick={toggleFullscreen}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
                {isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
              </button>
            ) : null}
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.45em] text-slate-400 sm:text-sm">
            Mã ca thi
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5 sm:mt-7 sm:gap-4">
            {String(exam.accessCode || '')
              .split('')
              .map((character, index) => (
                <span
                  key={`${character}-${index}`}
                  className="flex h-[clamp(3.6rem,13vw,10rem)] w-[clamp(3rem,9.5vw,7.4rem)] items-center justify-center rounded-2xl border border-white/15 bg-white/5 font-black text-[clamp(2rem,7.5vw,6.4rem)] leading-none tracking-tight shadow-[0_10px_40px_-20px_rgba(255,255,255,0.4)]"
                >
                  {character}
                </span>
              ))}
          </div>

          <h1 className="mt-8 max-w-4xl text-2xl font-bold leading-tight sm:text-4xl">
            {exam.title}
          </h1>
          <p className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-slate-400 sm:text-base">
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4" />
              {exam.subject}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {classLabel}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-4 w-4" />
              {exam.durationMinutes} phút
            </span>
          </p>

          <div className="mt-7 flex flex-wrap items-stretch justify-center gap-3 sm:mt-9 sm:gap-5">
            <div className="min-w-[9rem] rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                Bây giờ
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums sm:text-3xl">
                {formatClock(new Date(now))}
              </p>
            </div>
            {countdownTarget && countdownLabel ? (
              <div
                className={`min-w-[9rem] rounded-2xl border px-5 py-3 ${
                  phase === 'OPEN'
                    ? 'border-emerald-400/30 bg-emerald-400/10'
                    : 'border-sky-400/30 bg-sky-400/10'
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-300">
                  {countdownLabel}
                </p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums sm:text-3xl">
                  {formatCountdown(countdownTarget - now)}
                </p>
              </div>
            ) : null}
            <div className="min-w-[12rem] rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                Thời gian ca thi
              </p>
              <p className="mt-1.5 text-sm font-semibold text-slate-200">
                {formatDateTime(exam.openAt)} — {formatDateTime(exam.closeAt)}
              </p>
            </div>
          </div>

          <div className="mt-8 w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 px-5 py-4 sm:mt-10 sm:px-6 sm:py-5">
            <p className="text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
              Học sinh mở <span className="font-bold text-white">viexam.io.vn</span>, nhập{' '}
              <span className="font-bold text-white">mã ca thi</span> ở trên và{' '}
              <span className="font-bold text-white">mã học sinh</span> của mình để vào thi.
            </p>
          </div>
        </main>

        <footer className="pb-1 text-center text-[11px] text-slate-500">
          Trang tự cập nhật mỗi 30 giây · Giữ trang này mở trên màn hình chung
        </footer>
      </div>
    </div>
  );
}
