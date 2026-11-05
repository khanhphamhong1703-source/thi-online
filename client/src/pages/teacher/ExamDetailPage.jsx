import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  Edit3,
  Eye,
  FileText,
  LockKeyhole,
  Send,
  Shuffle,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react';
import { examApi } from '../../api/exams';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import { formatDateTime } from '../../utils/format';
import { getExamDisplayStatus } from '../../utils/exam';
import PageHeader from '../../components/PageHeader';
import LoadingState from '../../components/LoadingState';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function ExamDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmType, setConfirmType] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    examApi
      .get(id)
      .then(({ data }) => {
        if (active) setExam(data.data);
      })
      .catch((apiError) => {
        if (active) setError(getErrorMessage(apiError, 'Không tải được đề thi'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(exam.accessCode);
      toast.success('Đã sao chép mã ca thi');
    } catch {
      toast.info(`Mã ca thi: ${exam.accessCode}`);
    }
  };

  const handleAction = async () => {
    if (!confirmType) return;
    setActionLoading(true);
    try {
      if (confirmType === 'publish') {
        const { data } = await examApi.publish(id);
        setExam(data.data);
        toast.success(data.message);
      } else if (confirmType === 'close') {
        const { data } = await examApi.close(id);
        setExam(data.data);
        toast.success(data.message);
      } else if (confirmType === 'delete') {
        await examApi.remove(id);
        toast.success('Đã xóa đề thi nháp');
        navigate('/teacher/exams');
        return;
      }
      setConfirmType(null);
    } catch (actionError) {
      toast.error(getErrorMessage(actionError, 'Không thể thực hiện thao tác'));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingState label="Đang tải đề thi..." />;

  if (error || !exam) {
    return (
      <div className="surface mx-auto max-w-lg p-8 text-center">
        <p className="font-semibold text-slate-900">Không tìm thấy đề thi</p>
        <p className="mt-1 text-sm text-slate-500">{error}</p>
        <Link to="/teacher/exams" className="mt-5 inline-flex text-sm font-semibold text-brand-600">
          Quay lại danh sách đề
        </Link>
      </div>
    );
  }

  const statusMeta = getExamDisplayStatus(exam);
  const examClasses = exam.classes?.length ? exam.classes : [];
  const examClassLabel = examClasses.length
    ? examClasses.map((classroom) => classroom.name).join(', ')
    : exam.class?.name || 'Chưa gán lớp';
  const confirmConfig = {
    publish: {
      title: 'Công bố đề thi?',
      description:
        'Sau khi công bố, đề sẽ xuất hiện trên bảng thi. Bạn vẫn có thể chỉnh sửa khi không có học sinh đang làm bài; hãy kiểm tra kỹ câu hỏi, đáp án và thời gian.',
      confirmLabel: 'Công bố đề',
      tone: 'primary',
    },
    close: {
      title: 'Đóng ca thi?',
      description:
        'Học sinh sẽ không thể bắt đầu lượt làm mới. Các bài đang làm sẽ được hệ thống tự nộp khi hết thời gian hoặc khi truy cập lại.',
      confirmLabel: 'Đóng ca thi',
      tone: 'danger',
    },
    delete: {
      title: 'Xóa đề thi nháp?',
      description: 'Đề nháp và toàn bộ câu hỏi sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác.',
      confirmLabel: 'Xóa đề thi',
      tone: 'danger',
    },
  }[confirmType] || {};

  return (
    <div>
      <PageHeader
        backTo="/teacher/exams"
        backLabel="Quay lại danh sách đề thi"
        eyebrow="Chi tiết đề thi"
        title={exam.title}
        description={`${exam.subject} · ${examClassLabel}`}
        actions={
          <>
            <Button variant="secondary" icon={BarChart3} onClick={() => navigate(`/teacher/exams/${id}/results`)}>
              Kết quả
            </Button>
            <Button variant="secondary" icon={Edit3} onClick={() => navigate(`/teacher/exams/${id}/edit`)}>
              Chỉnh sửa
            </Button>
            {exam.status === 'DRAFT' ? (
              <Button
                icon={Send}
                onClick={() => setConfirmType('publish')}
                disabled={examClasses.length === 0}
                title={
                  examClasses.length === 0
                    ? 'Gán ít nhất một lớp trước khi công bố'
                    : undefined
                }
              >
                Công bố
              </Button>
            ) : null}
            {exam.status === 'PUBLISHED' ? (
              <Button variant="danger" icon={LockKeyhole} onClick={() => setConfirmType('close')}>
                Đóng ca thi
              </Button>
            ) : null}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
        {exam.status === 'PUBLISHED' && exam.phase === 'OPEN' ? (
          <Link to={`/exam/${exam.id}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
            <Eye className="h-3.5 w-3.5" /> Xem như học sinh
          </Link>
        ) : null}
        {exam.status === 'DRAFT' ? (
          <span className="text-xs text-slate-500">
            Đề nháp chỉ hiển thị với giáo viên.
          </span>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="surface p-5 sm:p-6">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <FileText className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Mã ca thi
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-2xl font-bold tracking-[0.2em] text-slate-900">
                      {exam.accessCode}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="focus-ring rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      title="Sao chép mã ca thi"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              <p className="max-w-xs text-xs leading-5 text-slate-500">
                Gửi mã này cho học sinh cùng với mã học sinh để các em vào phòng thi.
              </p>
            </div>

            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Lớp học</dt>
                <dd className="mt-1.5 space-y-1 text-sm font-medium text-slate-800">
                  {examClasses.length ? (
                    examClasses.map((classroom) => (
                      <p key={classroom.id} className="flex items-center gap-2">
                        <Users className="h-4 w-4 shrink-0 text-slate-400" />
                        {classroom.name} ({classroom.classCode})
                      </p>
                    ))
                  ) : (
                    <p className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400" />
                      {exam.class
                        ? `${exam.class.name} (${exam.class.classCode})`
                        : 'Chưa gán lớp'}
                    </p>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Thời lượng
                </dt>
                <dd className="mt-1.5 flex items-center gap-2 text-sm font-medium text-slate-800">
                  <Clock3 className="h-4 w-4 text-slate-400" /> {exam.durationMinutes} phút
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Thời gian mở
                </dt>
                <dd className="mt-1.5 flex items-center gap-2 text-sm font-medium text-slate-800">
                  <CalendarDays className="h-4 w-4 text-slate-400" /> {formatDateTime(exam.openAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Thời gian đóng
                </dt>
                <dd className="mt-1.5 flex items-center gap-2 text-sm font-medium text-slate-800">
                  <CalendarDays className="h-4 w-4 text-slate-400" /> {formatDateTime(exam.closeAt)}
                </dd>
              </div>
            </dl>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Mô tả</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {exam.description || 'Đề thi chưa có mô tả.'}
              </p>
            </div>
          </section>

          <section className="surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Câu hỏi</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {exam.questionCount} câu · {exam.totalPoints} điểm
                </p>
              </div>
              <Badge variant="info">{exam.questions?.length || 0} câu</Badge>
            </div>

            <div className="divide-y divide-slate-100">
              {exam.questions?.map((question, index) => (
                <article key={question.id} className="p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-950 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-medium leading-6 text-slate-900">{question.content}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="neutral">
                            Phần {question.section || 'I'}
                            {exam.sectionTitles?.[question.section || 'I']
                              ? ` - ${exam.sectionTitles[question.section || 'I']}`
                              : ''}
                          </Badge>
                          <Badge variant="neutral">{question.points} điểm</Badge>
                        </div>
                      </div>
                      {question.section === 'II' ? (
                        <div className="mt-3 space-y-2">
                          {(question.statements || []).map((statement, statementIndex) => (
                            <div
                              key={statementIndex}
                              className={
                                statement.correct
                                  ? 'flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800'
                                  : 'flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600'
                              }
                            >
                              <span className="font-bold">{statementIndex + 1}.</span>
                              <span className="flex-1">{statement.content}</span>
                              <Badge variant={statement.correct ? 'active' : 'neutral'}>
                                {statement.correct ? 'Đúng' : 'Sai'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : question.section === 'III' ? (
                        <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                          <span className="font-semibold">Đáp án đúng:</span>
                          <span className="font-mono text-base font-bold">
                            {question.correctText || '—'}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {question.options.map((option, optionIndex) => (
                            <div
                              key={optionIndex}
                              className={
                                optionIndex === question.correctOption
                                  ? 'flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800'
                                  : 'flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600'
                              }
                            >
                              <span className="font-bold">{String.fromCharCode(65 + optionIndex)}.</span>
                              <span className="flex-1">{option}</span>
                              {optionIndex === question.correctOption ? (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="surface overflow-hidden">
            <div className="bg-navy-950 p-5 text-white">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Tổng quan</p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold">{exam.questionCount}</p>
                  <p className="text-xs text-slate-400">Câu hỏi</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{exam.totalPoints}</p>
                  <p className="text-xs text-slate-400">Điểm tối đa</p>
                </div>
                <div>
                  <p className={`font-bold ${exam.maxAttempts === 0 ? 'text-lg' : 'text-2xl'}`}>
                    {exam.maxAttempts === 0 ? 'Không giới hạn' : exam.maxAttempts}
                  </p>
                  <p className="text-xs text-slate-400">Lượt làm</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{exam.attemptCount || 0}</p>
                  <p className="text-xs text-slate-400">Lượt đã bắt đầu</p>
                </div>
              </div>
            </div>
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Shuffle className="h-4 w-4" /> Trộn câu hỏi
                </span>
                <span className="font-medium text-slate-800">
                  {exam.shuffleQuestions ? 'Bật' : 'Tắt'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Shuffle className="h-4 w-4" /> Trộn đáp án
                </span>
                <span className="font-medium text-slate-800">
                  {exam.shuffleOptions ? 'Bật' : 'Tắt'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Trophy className="h-4 w-4" /> Công bố điểm
                </span>
                <span className="font-medium text-slate-800">
                  {exam.showScore ? 'Có' : 'Không'}
                </span>
              </div>
            </div>
          </div>

          <div className="surface p-5">
            <h3 className="text-sm font-semibold text-slate-900">Thao tác</h3>
            <div className="mt-3 space-y-2">
              <Button
                variant="secondary"
                icon={BarChart3}
                className="w-full justify-start"
                onClick={() => navigate(`/teacher/exams/${id}/results`)}
              >
                Xem kết quả ({exam.attemptCount || 0})
              </Button>
              {exam.status === 'DRAFT' ? (
                <Button
                  variant="ghost-danger"
                  icon={Trash2}
                  className="w-full justify-start"
                  onClick={() => setConfirmType('delete')}
                >
                  Xóa đề nháp
                </Button>
              ) : null}
            </div>
          </div>

          {exam.status !== 'DRAFT' ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Đề đã công bố có thể được chỉnh sửa. Thay đổi chỉ áp dụng cho các lượt làm mới và
                không thể sửa khi đang có học sinh làm bài.
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Học sinh chỉ thấy đề sau khi bạn bấm Công bố. Hãy kiểm tra kỹ nội dung trước khi
                công bố.
              </div>
            </div>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(confirmType)}
        onClose={() => setConfirmType(null)}
        onConfirm={handleAction}
        loading={actionLoading}
        tone={confirmConfig.tone}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmLabel={confirmConfig.confirmLabel}
      />
    </div>
  );
}
