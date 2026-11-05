import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Flag,
  GraduationCap,
  Loader2,
  Maximize2,
  Save,
  Send,
  ShieldAlert,
  Trophy,
} from 'lucide-react';
import { publicExamApi } from '../../api/publicExams';
import { getErrorMessage } from '../../api/client';
import { getAttemptToken } from '../../utils/attemptStorage';
import {
  enterExamFullscreen,
  exitExamFullscreen,
  getFullscreenElement,
  isExamFullscreenSupported,
} from '../../utils/fullscreen';
import { formatDateTime } from '../../utils/format';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import ConfirmDialog from '../../components/ConfirmDialog';

const SHORT_ANSWER_PATTERNS = [/^[0-9-]$/, /^[0-9,]$/, /^[0-9,]$/, /^[0-9]$/];

function formatRemaining(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function answersToArray(answerMap, questions) {
  const questionMap = new Map((questions || []).map((question) => [question.id, question]));
  return Object.entries(answerMap).flatMap(([questionId, value]) => {
    const question = questionMap.get(questionId);
    if (!question) return [];

    if (question.section === 'II') {
      return Array.isArray(value) && value.some((item) => typeof item === 'boolean')
        ? [{ questionId, statementAnswers: value }]
        : [];
    }

    if (question.section === 'III') {
      const textAnswer = Array.isArray(value) ? value.join('') : String(value || '');
      return textAnswer ? [{ questionId, textAnswer }] : [];
    }

    return Number.isInteger(value) ? [{ questionId, selectedOption: value }] : [];
  });
}

function hasAnswer(question, value) {
  if (question.section === 'II') {
    return Array.isArray(value) && value.every((item) => typeof item === 'boolean');
  }
  if (question.section === 'III') {
    return Array.isArray(value) && value.join('').length > 0;
  }
  return Number.isInteger(value);
}

function splitShortAnswer(value = '') {
  const chars = String(value || '').split('');
  return Array.from({ length: 4 }, (_, index) => chars[index] || '');
}

function QuestionPrompt({
  question,
  index,
  total,
  answer,
  onSelect,
  onAnswerChange,
  sectionTitle,
}) {
  const isChoice = question.section !== 'II' && question.section !== 'III';
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="neutral">
            Phần {question.section || 'I'}
            {sectionTitle ? ` - ${sectionTitle}` : ''}
          </Badge>
          <Badge variant="info">
            Câu {index + 1}/{total}
          </Badge>
        </div>
        <span className="shrink-0 text-sm text-slate-500">{question.points} điểm</span>
      </div>

      <h2 className="mt-5 text-lg font-semibold leading-8 text-slate-900 sm:text-xl">
        {question.content}
      </h2>

      {isChoice ? (
        <div className="mt-6 space-y-3" role="radiogroup" aria-label="Các đáp án">
          {question.options.map((option, optionPosition) => {
            const selected = answer === option.index;
            return (
              <button
                key={option.index}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSelect(option.index)}
                className={
                  selected
                    ? 'flex w-full items-start gap-3 rounded-xl border-2 border-brand-500 bg-brand-50 p-4 text-left transition'
                    : 'flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand-300 hover:bg-brand-50/40'
                }
              >
                <span
                  className={
                    selected
                      ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white'
                      : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500'
                  }
                >
                  {String.fromCharCode(65 + optionPosition)}
                </span>
                <span className="pt-1 text-sm leading-6 text-slate-700">{option.text}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {question.section === 'II' ? (
        <div className="mt-6 space-y-2">
          {(question.statements || []).map((statement) => {
            const selected = Array.isArray(answer) ? answer[statement.index] : null;
            return (
              <div
                key={statement.index}
                className="rounded-xl border border-slate-200 bg-white p-3.5"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                    {statement.index + 1}
                  </span>
                  <p className="flex-1 pt-0.5 text-sm leading-6 text-slate-700">
                    {statement.content}
                  </p>
                </div>
                <div className="mt-2.5 flex gap-2 pl-10">
                  {[
                    [true, 'Đúng'],
                    [false, 'Sai'],
                  ].map(([value, label]) => (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={selected === value}
                      onClick={() => {
                        const next = Array.isArray(answer)
                          ? [...answer]
                          : [null, null, null, null];
                        next[statement.index] = value;
                        onAnswerChange(next);
                      }}
                      className={
                        selected === value
                          ? 'min-w-20 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white'
                          : 'min-w-20 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50'
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {question.section === 'III' ? (
        <div className="mt-6">
          <p className="text-sm font-medium text-slate-700">Điền đáp án vào 4 ô</p>
          <div className="mt-2.5 flex gap-2">
            {Array.from({ length: 4 }, (_, boxIndex) => (
              <input
                key={boxIndex}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={Array.isArray(answer) ? answer[boxIndex] || '' : ''}
                aria-label={`Ô đáp án ${boxIndex + 1}`}
                onChange={(event) => {
                  const char = String(event.target.value || '').slice(-1);
                  if (char && !SHORT_ANSWER_PATTERNS[boxIndex].test(char)) return;
                  const next = Array.isArray(answer)
                    ? [...answer]
                    : ['', '', '', ''];
                  next[boxIndex] = char;
                  onAnswerChange(next);
                }}
                className="h-14 w-14 rounded-xl border-2 border-slate-300 bg-white text-center text-2xl font-bold text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Ô 1: dấu “-” hoặc 0–9; ô 2–3: dấu “,” hoặc 0–9; ô 4: 0–9.
          </p>
        </div>
      ) : null}
    </>
  );
}

export default function ExamRoomPage() {
  const { attemptId } = useParams();
  const token = getAttemptToken(attemptId);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);
  const [saveState, setSaveState] = useState('idle');
  const [submitting, setSubmitting] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const [exitCount, setExitCount] = useState(0);
  const [exitWarning, setExitWarning] = useState(null);
  const [fullscreenRequired, setFullscreenRequired] = useState(false);
  const [fullscreenActive, setFullscreenActive] = useState(() =>
    Boolean(getFullscreenElement())
  );
  const [fullscreenError, setFullscreenError] = useState('');
  const [fullscreenSupported] = useState(() => isExamFullscreenSupported());
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('exam-question-view') === 'all' ? 'all' : 'single';
    } catch {
      return 'single';
    }
  });
  const answersRef = useRef({});
  const dirtyRef = useRef(false);
  const versionRef = useRef(0);
  const offsetRef = useRef(0);
  const submittingRef = useRef(false);
  const autoSubmittedRef = useRef(false);
  const inProgressRef = useRef(false);
  const exitCountRef = useRef(0);
  const exitRecordedRef = useRef(false);
  const fullscreenActiveRef = useRef(Boolean(getFullscreenElement()));
  const hasEnteredFullscreenRef = useRef(Boolean(getFullscreenElement()));
  const historyGuardPushedRef = useRef(false);
  const suppressBlurUntilRef = useRef(0);

  useEffect(() => {
    let active = true;
    if (!token) {
      setLoading(false);
      setLoadError('Không tìm thấy phiên làm bài trong tab này.');
      return () => {
        active = false;
      };
    }

    publicExamApi
      .getAttempt(attemptId, token)
      .then(({ data: payload }) => {
        if (!active) return;
        const attemptData = payload.data;
        setData(attemptData);
        const storedExitCount = attemptData.attempt?.exitCount || 0;
        exitCountRef.current = storedExitCount;
        setExitCount(storedExitCount);
        offsetRef.current = new Date(attemptData.serverTime).getTime() - Date.now();
        if (attemptData.attempt?.status === 'IN_PROGRESS') {
          const questionMap = new Map(
            (attemptData.questions || []).map((question) => [question.id, question])
          );
          const initialAnswers = Object.fromEntries(
            (attemptData.answers || []).flatMap((answer) => {
              const question = questionMap.get(answer.questionId);
              if (!question) return [];
              if (question.section === 'II') {
                return [[answer.questionId, answer.statementAnswers]];
              }
              if (question.section === 'III') {
                return [[answer.questionId, splitShortAnswer(answer.textAnswer)]];
              }
              return [[answer.questionId, answer.selectedOption]];
            })
          );
          answersRef.current = initialAnswers;
          setAnswers(initialAnswers);
        }
      })
      .catch((error) => {
        if (active) setLoadError(getErrorMessage(error, 'Không tải được phiên làm bài'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [attemptId, token]);

  const isInProgress = data?.attempt?.status === 'IN_PROGRESS';
  const questions = data?.questions || [];
  const currentQuestion = questions[currentIndex];
  const answeredCount = questions.filter((question) =>
    hasAnswer(question, answers[question.id])
  ).length;

  useEffect(() => {
    inProgressRef.current = isInProgress;
  }, [isInProgress]);

  const recordExit = useCallback(
    async (reason) => {
      if (!inProgressRef.current || exitRecordedRef.current) return;
      exitRecordedRef.current = true;

      const optimisticCount = exitCountRef.current + 1;
      exitCountRef.current = optimisticCount;
      setExitCount(optimisticCount);
      setExitWarning({ count: optimisticCount, reason });

      if (!token) return;
      try {
        const response = await publicExamApi.recordExit(attemptId, token);
        const serverCount = response.data?.data?.exitCount;
        if (Number.isInteger(serverCount)) {
          exitCountRef.current = serverCount;
          setExitCount(serverCount);
          setExitWarning((current) =>
            current ? { ...current, count: serverCount } : current
          );
        }
      } catch {
        // Giữ số đếm tạm thời nếu mất mạng; lần tải lại sẽ lấy số từ server.
      }
    },
    [attemptId, token]
  );

  useEffect(() => {
    if (!isInProgress || !data) return;
    const active = Boolean(getFullscreenElement());
    fullscreenActiveRef.current = active;
    setFullscreenActive(active);
    if (active) {
      hasEnteredFullscreenRef.current = true;
      exitRecordedRef.current = false;
      setFullscreenRequired(false);
      return;
    }
    if (fullscreenSupported) setFullscreenRequired(true);
  }, [data, fullscreenSupported, isInProgress]);

  useEffect(() => {
    if (!isInProgress) return undefined;

    const handleFullscreenChange = () => {
      const active = Boolean(getFullscreenElement());
      const wasActive = fullscreenActiveRef.current;
      fullscreenActiveRef.current = active;
      setFullscreenActive(active);

      if (active) {
        hasEnteredFullscreenRef.current = true;
        suppressBlurUntilRef.current = Date.now() + 1200;
        exitRecordedRef.current = false;
        setFullscreenRequired(false);
        setExitWarning(null);
        setFullscreenError('');
        return;
      }
      if (wasActive && hasEnteredFullscreenRef.current && fullscreenSupported) {
        setFullscreenRequired(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) recordExit('TAB_HIDDEN');
    };

    const handleWindowBlur = () => {
      if (Date.now() < suppressBlurUntilRef.current) return;
      recordExit('WINDOW_BLUR');
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [fullscreenSupported, isInProgress, recordExit]);

  useEffect(() => {
    if (!isInProgress) return undefined;
    if (!historyGuardPushedRef.current) {
      window.history.pushState({ examGuard: true }, '', window.location.href);
      historyGuardPushedRef.current = true;
    }
    const handlePopState = () => {
      window.history.pushState({ examGuard: true }, '', window.location.href);
      setActionError('Không thể rời phòng thi khi đang làm bài.');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isInProgress, recordExit]);

  useEffect(() => {
    if (data && !isInProgress && getFullscreenElement()) {
      exitExamFullscreen();
    }
  }, [data, isInProgress]);

  useEffect(() => {
    if (loadError && getFullscreenElement()) {
      exitExamFullscreen();
    }
  }, [loadError]);

  const submitAnswers = useCallback(async () => {
    if (submittingRef.current || !token) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitOpen(false);
    setActionError('');
    try {
      const response = await publicExamApi.submit(
        attemptId,
        token,
        answersToArray(answersRef.current, questions)
      );
      inProgressRef.current = false;
      setData(response.data.data);
      dirtyRef.current = false;
    } catch (error) {
      const message = getErrorMessage(error, 'Không thể nộp bài');
      setActionError(message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [attemptId, questions, token]);

  useEffect(() => {
    if (!isInProgress || !data?.attempt?.expiresAt) return undefined;
    const tick = () => {
      const expiresAt = new Date(data.attempt.expiresAt).getTime();
      const remaining = Math.max(0, expiresAt - (Date.now() + offsetRef.current));
      setRemainingMs(remaining);
      if (remaining <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        submitAnswers();
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [data?.attempt?.expiresAt, isInProgress, submitAnswers]);

  useEffect(() => {
    if (!isInProgress || !dirtyRef.current || !token) return undefined;
    const version = versionRef.current;
    const timer = setTimeout(async () => {
      setSaveState('saving');
      try {
        const response = await publicExamApi.saveAnswers(
          attemptId,
          token,
          answersToArray(answersRef.current, questions)
        );
        if (
          response.data.data?.autoSubmitted ||
          response.data.data?.alreadySubmitted ||
          response.data.data?.attempt
        ) {
          inProgressRef.current = false;
          setData(response.data.data);
          dirtyRef.current = false;
          return;
        }
        if (versionRef.current === version) {
          dirtyRef.current = false;
          setSaveState('saved');
        }
      } catch (error) {
        setSaveState('error');
        if (error.response?.status === 401) {
          setActionError('Phiên làm bài đã hết hạn. Vui lòng liên hệ giáo viên.');
        }
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [answers, attemptId, isInProgress, questions, token]);

  useEffect(() => {
    if (!isInProgress) return undefined;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isInProgress]);

  const updateAnswer = (questionId, value) => {
    const next = { ...answersRef.current, [questionId]: value };
    answersRef.current = next;
    versionRef.current += 1;
    dirtyRef.current = true;
    setSaveState('pending');
    setAnswers(next);
  };

  const selectAnswer = (questionId, optionIndex) => {
    updateAnswer(questionId, optionIndex);
  };

  const changeViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('exam-question-view', mode);
    } catch {
      // Không cần chặn nếu trình duyệt không cho lưu tùy chọn hiển thị.
    }
  };

  const jumpToQuestion = (index) => {
    setCurrentIndex(index);
    if (viewMode !== 'all') return;
    const question = questions[index];
    if (!question) return;
    window.requestAnimationFrame(() => {
      document
        .getElementById(`exam-question-${question.id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const saveLabel = useMemo(() => {
    if (saveState === 'saving') return 'Đang lưu...';
    if (saveState === 'saved') return 'Đã lưu tạm';
    if (saveState === 'error') return 'Lưu tạm thất bại';
    if (saveState === 'pending') return 'Chưa lưu';
    return '';
  }, [saveState]);

  const requestExamFullscreen = async () => {
    setFullscreenError('');
    suppressBlurUntilRef.current = Date.now() + 1200;
    const entered = await enterExamFullscreen();
    if (entered) {
      hasEnteredFullscreenRef.current = true;
      fullscreenActiveRef.current = true;
      exitRecordedRef.current = false;
      setFullscreenActive(true);
      setFullscreenRequired(false);
      setExitWarning(null);
      return;
    }
    setFullscreenError(
      fullscreenSupported
        ? 'Trình duyệt chưa cho phép bật toàn màn hình. Hãy thử lại.'
        : 'Thiết bị này không hỗ trợ chế độ toàn màn hình.'
    );
  };

  const dismissExitWarning = () => {
    setExitWarning(null);
    setFullscreenError('');
    exitRecordedRef.current = false;
  };

  const continueWithoutFullscreen = () => {
    setFullscreenRequired(false);
    setExitWarning(null);
    setFullscreenError('');
    exitRecordedRef.current = false;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          <p className="text-sm">Đang mở phòng thi...</p>
        </div>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="surface w-full max-w-lg p-8 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Không thể mở phòng thi</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{loadError}</p>
          <Link
            to="/"
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <ArrowLeft className="h-4 w-4" /> Về bảng thi
          </Link>
        </div>
      </div>
    );
  }

  if (data.attempt?.status !== 'IN_PROGRESS') {
    return (
      <div className="min-h-screen bg-slate-100">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-950 text-white">
                <GraduationCap className="h-5 w-5" />
              </span>
              <span className="text-base font-bold text-slate-900">ViExam</span>
            </Link>
            <Link to="/" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              Về bảng thi
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
          <div className="surface overflow-hidden">
            <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-brand-800 p-6 text-center text-white sm:p-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h1 className="mt-4 text-2xl font-bold">Bài thi đã được nộp</h1>
              <p className="mt-2 text-sm text-slate-300">{data.exam?.title}</p>
              {data.attempt?.status === 'AUTO_SUBMITTED' ? (
                <p className="mt-2 inline-flex rounded-full bg-amber-400/15 px-3 py-1 text-xs font-medium text-amber-200">
                  Hệ thống tự nộp khi hết thời gian
                </p>
              ) : null}
            </div>

            <div className="p-6 sm:p-8">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4 text-center">
                  <FileText className="mx-auto h-5 w-5 text-slate-400" />
                  <p className="mt-2 text-lg font-bold text-slate-900">{data.attempt?.attemptNumber}</p>
                  <p className="text-xs text-slate-500">Lượt làm</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-center">
                  <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-500" />
                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {data.showScore ? data.attempt?.correctCount ?? 0 : '—'}
                  </p>
                  <p className="text-xs text-slate-500">Câu đúng</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-center">
                  <Clock3 className="mx-auto h-5 w-5 text-slate-400" />
                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {formatDateTime(data.attempt?.submittedAt)}
                  </p>
                  <p className="text-xs text-slate-500">Thời điểm nộp</p>
                </div>
              </div>

              {data.showScore ? (
                <div className="mt-5 rounded-2xl border border-brand-100 bg-brand-50 p-5 text-center">
                  <Trophy className="mx-auto h-7 w-7 text-brand-600" />
                  <p className="mt-2 text-sm font-medium text-brand-700">Điểm của bạn</p>
                  <p className="mt-1 text-4xl font-bold tracking-tight text-brand-900">
                    {data.attempt?.score ?? 0}
                    <span className="text-xl font-semibold text-brand-600">
                      /{data.attempt?.maxScore ?? data.exam?.totalPoints ?? 0}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-600">
                  Giáo viên chưa bật công bố điểm. Kết quả sẽ được giáo viên thông báo.
                </div>
              )}

              <div className="mt-6 text-center">
                <Link
                  to="/"
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  <ArrowLeft className="h-4 w-4" /> Quay lại bảng thi
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const timerClass =
    remainingMs <= 5 * 60 * 1000 ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-white text-slate-800 ring-slate-200';
  const exitReasonLabel =
    exitWarning?.reason === 'WINDOW_BLUR'
      ? 'bấm ra ngoài trình duyệt'
      : 'chuyển sang tab khác';

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-950 text-white">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{data.exam.title}</p>
              <p className="truncate text-xs text-slate-500">
                {data.student.fullName} · {data.student.studentCode}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {exitCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                <ShieldAlert className="h-3.5 w-3.5" />
                {exitCount} lần thoát
              </span>
            ) : null}
            <div className={`rounded-xl px-4 py-2 text-center ring-1 ${timerClass}`}>
              <p className="text-[10px] font-medium uppercase tracking-wide opacity-70">Còn lại</p>
              <p className="font-mono text-lg font-bold leading-6">{formatRemaining(remainingMs)}</p>
            </div>
            <div className="hidden min-w-28 text-right sm:block">
              <p className="inline-flex items-center gap-1 text-xs text-slate-500">
                {saveState === 'saving' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {saveLabel || 'Bài làm được lưu tự động'}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {answeredCount}/{questions.length} câu đã trả lời
              </p>
            </div>
          </div>
        </div>
      </header>

      {!fullscreenSupported ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-800">
          Thiết bị không hỗ trợ toàn màn hình. Hệ thống vẫn ghi nhận khi bạn rời tab thi.
        </div>
      ) : null}

      <main className="mx-auto grid max-w-6xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div
              className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
              role="group"
              aria-label="Chế độ hiển thị câu hỏi"
            >
              <button
                type="button"
                aria-pressed={viewMode === 'single'}
                onClick={() => changeViewMode('single')}
                className={
                  viewMode === 'single'
                    ? 'rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white'
                    : 'rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50'
                }
              >
                Từng câu
              </button>
              <button
                type="button"
                aria-pressed={viewMode === 'all'}
                onClick={() => changeViewMode('all')}
                className={
                  viewMode === 'all'
                    ? 'rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white'
                    : 'rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50'
                }
              >
                Toàn bộ câu hỏi
              </button>
            </div>
            <span className="text-xs text-slate-500">
              {questions.length} câu · {answeredCount} đã trả lời
            </span>
          </div>

          {actionError ? (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
              {actionError}
            </div>
          ) : null}

          {viewMode === 'single' ? (
            <section className="surface p-5 sm:p-7">
              <QuestionPrompt
                question={currentQuestion}
                index={currentIndex}
                total={questions.length}
                answer={answers[currentQuestion.id]}
                onSelect={(optionIndex) =>
                  selectAnswer(currentQuestion.id, optionIndex)
                }
                onAnswerChange={(value) =>
                  updateAnswer(currentQuestion.id, value)
                }
                sectionTitle={
                  data.exam.sectionTitles?.[currentQuestion.section || 'I'] || ''
                }
              />

              <div className="mt-7 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
                <Button
                  variant="secondary"
                  icon={ChevronLeft}
                  disabled={currentIndex === 0}
                  onClick={() => jumpToQuestion(Math.max(0, currentIndex - 1))}
                >
                  Câu trước
                </Button>
                {currentIndex === questions.length - 1 ? (
                  <Button icon={Flag} onClick={() => setSubmitOpen(true)} loading={submitting}>
                    Nộp bài
                  </Button>
                ) : (
                  <Button
                    icon={ChevronRight}
                    onClick={() =>
                      jumpToQuestion(Math.min(questions.length - 1, currentIndex + 1))
                    }
                  >
                    Câu tiếp
                  </Button>
                )}
              </div>
            </section>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => (
                <section
                  key={question.id}
                  id={`exam-question-${question.id}`}
                  className="surface scroll-mt-24 p-5 sm:p-7"
                >
                  <QuestionPrompt
                    question={question}
                    index={index}
                    total={questions.length}
                    answer={answers[question.id]}
                    onSelect={(optionIndex) => selectAnswer(question.id, optionIndex)}
                    onAnswerChange={(value) => updateAnswer(question.id, value)}
                    sectionTitle={
                      data.exam.sectionTitles?.[question.section || 'I'] || ''
                    }
                  />
                </section>
              ))}
              <div className="flex justify-end">
                <Button icon={Flag} onClick={() => setSubmitOpen(true)} loading={submitting}>
                  Nộp bài
                </Button>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="surface p-5">
            <h2 className="text-sm font-semibold text-slate-900">Danh sách câu hỏi</h2>
            <p className="mt-1 text-xs text-slate-500">
              Đã trả lời {answeredCount}/{questions.length} câu
            </p>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {questions.map((question, index) => {
                const answered = hasAnswer(question, answers[question.id]);
                const active = currentIndex === index;
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => jumpToQuestion(index)}
                    aria-label={`Câu ${index + 1}${answered ? ', đã trả lời' : ', chưa trả lời'}`}
                    className={`flex h-10 items-center justify-center rounded-lg border text-sm font-bold transition ${
                      answered
                        ? 'border-slate-950 bg-slate-950 text-white'
                        : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-100'
                    } ${active ? 'ring-2 ring-slate-900 ring-offset-2' : ''}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-4 w-4 rounded bg-slate-950" /> Đã trả lời
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-4 w-4 rounded border border-slate-300 bg-white" /> Chưa trả lời
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-4 w-4 rounded border border-slate-300 bg-white ring-2 ring-slate-900" />{' '}
                Đang chọn
              </span>
            </div>
            <Button
              className="mt-5 w-full"
              icon={Send}
              onClick={() => setSubmitOpen(true)}
              loading={submitting}
            >
              Nộp bài
            </Button>
          </div>

          <div className="surface p-4 text-xs leading-5 text-slate-500">
            <p className="font-semibold text-slate-700">Lưu ý</p>
            <p className="mt-1.5">
              Bài làm được lưu tạm tự động. Không đóng tab hoặc tải lại trang khi đang làm bài.
            </p>
          </div>
        </aside>
      </main>

      <ConfirmDialog
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onConfirm={submitAnswers}
        loading={submitting}
        tone="primary"
        title="Nộp bài thi?"
        description={
          answeredCount < questions.length
            ? `Bạn còn ${questions.length - answeredCount} câu chưa trả lời. Sau khi nộp sẽ không thể sửa bài.`
            : 'Bạn đã trả lời đủ các câu hỏi. Sau khi nộp sẽ không thể sửa bài.'
        }
        confirmLabel="Nộp bài"
        cancelLabel="Làm tiếp"
      />

      {exitWarning ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-900">Phát hiện thoát phòng thi</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Bạn đã {exitReasonLabel}. Đây là lần thoát thứ{' '}
              <span className="font-bold text-rose-700">{exitWarning.count}</span>. Hành vi đã
              được ghi nhận và thời gian làm bài vẫn tiếp tục.
            </p>
            {fullscreenError ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {fullscreenError}
              </p>
            ) : null}
            <div className="mt-5 flex flex-col gap-2">
              {!fullscreenActive && fullscreenSupported ? (
                <Button icon={Maximize2} onClick={requestExamFullscreen}>
                  Bật lại toàn màn hình
                </Button>
              ) : (
                <Button onClick={dismissExitWarning}>Tiếp tục làm bài</Button>
              )}
              {!fullscreenActive && fullscreenSupported && fullscreenError ? (
                <button
                  type="button"
                  onClick={dismissExitWarning}
                  className="text-xs font-medium text-slate-500 underline underline-offset-2 hover:text-slate-700"
                >
                  Tiếp tục làm bài (đã ghi nhận lần thoát)
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {!exitWarning && fullscreenRequired ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Maximize2 className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-900">Bài thi yêu cầu toàn màn hình</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Hãy bật toàn màn hình để bắt đầu làm bài. Thời gian làm bài vẫn đang được tính.
            </p>
            {fullscreenError ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {fullscreenError}
              </p>
            ) : null}
            <div className="mt-5 flex flex-col gap-2">
              <Button icon={Maximize2} onClick={requestExamFullscreen}>
                Bật toàn màn hình
              </Button>
              {fullscreenError ? (
                <button
                  type="button"
                  onClick={continueWithoutFullscreen}
                  className="text-xs font-medium text-slate-500 underline underline-offset-2 hover:text-slate-700"
                >
                  Tiếp tục làm bài
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
