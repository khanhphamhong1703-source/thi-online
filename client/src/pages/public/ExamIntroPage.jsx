import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Play,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { publicExamApi } from '../../api/publicExams';
import { getErrorMessage } from '../../api/client';
import { saveAttemptToken } from '../../utils/attemptStorage';
import { enterExamFullscreen, exitExamFullscreen } from '../../utils/fullscreen';
import { formatDateTime } from '../../utils/format';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import LoadingState from '../../components/LoadingState';

const PHASE_META = {
  OPEN: { label: 'Đang mở', variant: 'active' },
  UPCOMING: { label: 'Sắp mở', variant: 'warning' },
  ENDED: { label: 'Đã kết thúc', variant: 'neutral' },
};

export default function ExamIntroPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const studentCode = (searchParams.get('studentCode') || '').trim();
  const accessCode = (searchParams.get('accessCode') || '').trim().toUpperCase();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [startError, setStartError] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let active = true;
    if (!studentCode || accessCode.length !== 6) {
      setLoadError('Thiếu mã ca thi hoặc mã học sinh. Vui lòng quay lại và nhập đầy đủ.');
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setLoadError('');
    publicExamApi
      .lookup({ studentCode, accessCode })
      .then(({ data: payload }) => {
        if (!active) return;
        if (payload.data.exam.id !== id) {
          navigate(
            `/exam/${payload.data.exam.id}?accessCode=${encodeURIComponent(
              accessCode
            )}&studentCode=${encodeURIComponent(studentCode)}`,
            { replace: true }
          );
          return;
        }
        setData(payload.data);
      })
      .catch((error) => {
        if (active) setLoadError(getErrorMessage(error, 'Không tìm thấy ca thi'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accessCode, id, navigate, studentCode]);

  const onStart = async () => {
    if (!data) return;
    setStartError('');
    setStarting(true);
    const fullscreenRequest = enterExamFullscreen();
    try {
      const { data: payload } = await publicExamApi.start(data.exam.id, {
        studentCode,
        accessCode,
      });
      await fullscreenRequest;
      saveAttemptToken(payload.data.attempt.id, payload.data.token);
      navigate(`/thi/${payload.data.attempt.id}`, { replace: true });
    } catch (error) {
      await fullscreenRequest;
      await exitExamFullscreen();
      setStartError(getErrorMessage(error, 'Không thể bắt đầu làm bài'));
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <LoadingState label="Đang tra cứu ca thi..." />;

  if (loadError || !data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="surface p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <p className="mt-4 font-semibold text-slate-900">Không thể xác nhận ca thi</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {loadError || 'Thông tin ca thi hoặc học sinh không hợp lệ.'}
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại tra cứu
          </Link>
        </div>
      </div>
    );
  }

  const { exam, student, attempt } = data;
  const phase = PHASE_META[exam.phase] || PHASE_META.ENDED;
  const examClasses = exam.classes?.length ? exam.classes : [];
  const classLabel = examClasses.length
    ? examClasses.map((classroom) => `${classroom.name}`).join(', ')
    : exam.className
      ? `${exam.className}`
      : '—';
  const attemptsExhausted =
    !attempt.hasInProgress &&
    attempt.maxAttempts > 0 &&
    attempt.attemptsUsed >= attempt.maxAttempts;
  const canStart = exam.phase === 'OPEN' && !attemptsExhausted;
  const startLabel = attempt.hasInProgress ? 'Tiếp tục thi' : 'Bắt đầu thi';
  const studentClass = student.className
    ? `${student.className}`
    : classLabel;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-6">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại tra cứu ca thi
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="surface overflow-hidden">
          <div className="relative bg-navy-950 p-6 sm:p-8">
            <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={phase.variant}>{phase.label}</Badge>
                <Badge variant="neutral">{exam.subject}</Badge>
              </div>
              <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
                {exam.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                {exam.description || 'Đề thi trắc nghiệm trực tuyến.'}
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-7">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Thông tin ca thi
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                  <Clock3 className="h-4 w-4" /> Thời lượng
                </p>
                <p className="mt-2 text-lg font-bold text-slate-900">{exam.durationMinutes} phút</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                  <FileText className="h-4 w-4" /> Đề thi
                </p>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {exam.questionCount} câu · {exam.totalPoints} điểm
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 rounded-xl border border-slate-200 p-4 text-sm text-slate-600 sm:grid-cols-2">
              <p>
                <span className="font-semibold text-slate-800">Lớp:</span> {classLabel}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Giáo viên:</span> {exam.teacherName}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Số lượt làm:</span>{' '}
                {attempt.maxAttempts > 0 ? attempt.maxAttempts : 'Không giới hạn'}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Công bố điểm:</span>{' '}
                {exam.showScore ? 'Có' : 'Không'}
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                <AlertTriangle className="h-4 w-4" /> Trước khi bắt đầu
              </p>
              <ul className="mt-2 space-y-1.5 text-sm leading-6 text-amber-700">
                <li>Bài làm được lưu tạm trong quá trình thi.</li>
                <li>Hệ thống tự nộp bài khi hết thời gian.</li>
                <li>Không tải lại hoặc đóng trình duyệt khi đang làm bài.</li>
              </ul>
            </div>
          </div>
        </section>

        <aside className="h-fit space-y-5 lg:sticky lg:top-24">
          <section className="surface p-5 sm:p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <UserRound className="h-4 w-4 text-brand-600" />
              Thông tin học sinh
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-xl p-4 border">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg font-bold text-brand-700">
                {student.fullName?.trim().charAt(0).toUpperCase() || '?'}
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-900">{student.fullName}</p>
              </div>
            </div>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Mã học sinh</dt>
                <dd className="text-right font-semibold tracking-wide text-slate-800">
                  {student.studentCode}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Lớp</dt>
                <dd className="text-right font-semibold text-slate-800">{studentClass}</dd>
              </div>

              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Lượt đã dùng</dt>
                <dd className="text-right font-semibold text-slate-800">
                  {attempt.attemptsUsed} /{' '}
                  {attempt.maxAttempts > 0 ? attempt.maxAttempts : 'Không giới hạn'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="surface p-5 sm:p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-brand-600" />
              Sẵn sàng làm bài
            </div>

            {startError ? (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
                {startError}
              </div>
            ) : null}

            {exam.phase !== 'OPEN' ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  {exam.phase === 'UPCOMING' ? (
                    <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  )}
                  <p>
                    {exam.phase === 'UPCOMING'
                      ? 'Ca thi chưa mở. Vui lòng quay lại khi đến thời gian bắt đầu.'
                      : 'Ca thi đã kết thúc và không thể bắt đầu làm bài.'}
                  </p>
                </div>
              </div>
            ) : attemptsExhausted ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Bạn đã sử dụng hết {attempt.maxAttempts} lượt làm bài.
              </div>
            ) : (
              <>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {attempt.hasInProgress
                    ? 'Bạn có một lượt làm bài đang dở. Bấm tiếp tục để vào lại phòng thi.'
                    : 'Thông tin đã chính xác. Bấm nút bên dưới để bắt đầu tính giờ làm bài.'}
                </p>
                <Button
                  type="button"
                  icon={Play}
                  loading={starting}
                  onClick={onStart}
                  className="mt-5 w-full"
                  size="lg"
                >
                  {startLabel}
                </Button>
              </>
            )}

            <p className="mt-4 text-center text-[11px] leading-5 text-slate-500">
              Bài thi sẽ chuyển sang chế độ toàn màn hình. Hệ thống ghi nhận số lần chuyển tab
              hoặc rời khỏi trình duyệt.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
