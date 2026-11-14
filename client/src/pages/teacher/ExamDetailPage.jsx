import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Copy,
  Edit3,
  FileText,
  Presentation,
  Shuffle,
  Trash2,
  Trophy,
} from 'lucide-react';
import { examApi } from '../../api/exams';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import { formatDateTime } from '../../utils/format';
import { SECTION_TITLES, getExamDisplayStatus } from '../../utils/exam';
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

  const handlePresent = () => {
    const presentation = window.open(
      `/teacher/present/${id}`,
      `viexam-present-${id}`,
      'popup=yes,width=1280,height=800'
    );
    if (!presentation) {
      toast.error('Trình duyệt đã chặn cửa sổ trình chiếu. Hãy cho phép pop-up rồi thử lại.');
      return;
    }
    presentation.focus();
  };

  const handleAction = async () => {
    if (!confirmType) return;
    setActionLoading(true);
    try {
      if (confirmType === 'delete') {
        await examApi.remove(id);
        toast.success('Đã xóa đề thi');
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
  const sectionSummary = ['I', 'II', 'III']
    .map((section) => {
      const questions = (exam.questions || []).filter(
        (question) => (question.section || 'I') === section
      );
      return {
        section,
        title: SECTION_TITLES[section],
        count: questions.length,
        points: questions.reduce((sum, question) => sum + (Number(question.points) || 0), 0),
      };
    })
    .filter((item) => item.count > 0);
  const confirmConfig = {
    delete: {
      title: 'Xóa đề thi?',
      description: 'Đề thi và toàn bộ câu hỏi sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác.',
      confirmLabel: 'Xóa đề thi',
      tone: 'danger',
    },
  }[confirmType] || {};

  return (
    <div>
      <PageHeader
        backTo="/teacher/exams"
        backLabel="Quay lại danh sách đề thi"
        title={exam.title}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          <section className="surface p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <FileText className="h-7 w-7" />
                </div>
                <div className="min-w-0">
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
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Gửi mã này cùng mã học sinh để học sinh vào phòng thi.
                  </p>
                </div>
              </div>
              <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
            </div>

            <dl className="mt-6 grid gap-x-6 gap-y-5 border-t border-slate-100 pt-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Lớp học
                </dt>
                <dd className="mt-2 flex flex-wrap gap-1.5">
                  {examClasses.length ? (
                    examClasses.map((classroom) => (
                      <span
                        key={classroom.id}
                        className={
                          classroom.isArchived
                            ? 'inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20'
                            : 'inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700'
                        }
                      >
                        {classroom.name}
                        <span className="font-normal text-slate-600">{classroom.classCode}</span>
                        {classroom.isArchived ? <span className="font-normal">Đã lưu trữ</span> : null}
                      </span>
                    ))
                  ) : exam.class ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {exam.class.name}
                      <span className="font-normal text-slate-600">{exam.class.classCode}</span>
                    </span>
                  ) : (
                    <span className="text-sm text-slate-500">Chưa gán lớp</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Môn học
                </dt>
                <dd className="mt-1.5 text-sm font-medium text-slate-800">
                  {exam.subject || 'Chưa cập nhật'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Thời lượng
                </dt>
                <dd className="mt-1.5 text-sm font-medium text-slate-800">
                  {exam.durationMinutes} phút
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Số lượt làm tối đa
                </dt>
                <dd className="mt-1.5 text-sm font-medium text-slate-800">
                  {exam.maxAttempts === 0 ? 'Không giới hạn' : exam.maxAttempts}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Thời gian thi
                </dt>
                <dd className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-slate-800">
                  {formatDateTime(exam.openAt)}
                  <span className="text-slate-400">→</span>
                  {exam.closeAt ? formatDateTime(exam.closeAt) : 'Không giới hạn'}
                </dd>
              </div>
              {exam.description ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Mô tả
                  </dt>
                  <dd className="mt-2 text-sm leading-6 text-slate-600">{exam.description}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="surface overflow-hidden">
            <div className="bg-navy-950 p-5 text-white">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Tổng quan
              </p>
              <div className="mt-3 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-400">Câu hỏi</p>
                  <p className="mt-1 text-2xl font-bold">{exam.questionCount}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Điểm tối đa</p>
                  <p className="mt-1 text-2xl font-bold">{exam.totalPoints}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Lượt đã bắt đầu</p>
                  <p className="mt-1 text-2xl font-bold">{exam.attemptCount || 0}</p>
                </div>
              </div>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-3">
              <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Shuffle className="h-4 w-4" /> Trộn câu hỏi
                </span>
                <span className="font-medium text-slate-800">
                  {exam.shuffleQuestions ? 'Bật' : 'Tắt'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Shuffle className="h-4 w-4" /> Trộn đáp án
                </span>
                <span className="font-medium text-slate-800">
                  {exam.shuffleOptions ? 'Bật' : 'Tắt'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Trophy className="h-4 w-4" /> Công bố điểm
                </span>
                <span className="font-medium text-slate-800">
                  {exam.showScore ? 'Có' : 'Không'}
                </span>
              </div>
            </div>
          </section>

          <section className="surface overflow-hidden">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Cấu trúc đề thi</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {exam.questionCount} câu · {exam.totalPoints} điểm
                </p>
              </div>
            </div>
            {sectionSummary.length ? (
              <ul className="divide-y divide-slate-100">
                {sectionSummary.map((item) => (
                  <li
                    key={item.section}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        Phần {item.section}
                        {item.title ? ` - ${item.title}` : ''}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{item.count} câu</p>
                    </div>
                    <Badge variant="neutral">{item.points} điểm</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5 py-8 text-center sm:px-6">
                <p className="text-sm font-medium text-slate-700">Đề chưa có câu hỏi</p>
                <p className="mt-1 text-sm text-slate-500">
                  Bấm “Chỉnh sửa” để thêm câu hỏi cho đề thi.
                </p>
              </div>
            )}
          </section>
        </div>

        <aside className="order-first space-y-4 lg:order-none">
          <div className="surface p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Thao tác
              </p>
              <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
            </div>
            <div className="mt-3 space-y-2">
              <Button
                icon={Edit3}
                className="w-full justify-start"
                onClick={() => navigate(`/teacher/exams/${id}/edit`)}
              >
                Chỉnh sửa
              </Button>
              <Button
                variant="secondary"
                icon={Presentation}
                className="w-full justify-start"
                onClick={handlePresent}
              >
                Chiếu mã
              </Button>
              <Button
                variant="secondary"
                icon={BarChart3}
                className="w-full justify-start"
                onClick={() => navigate(`/teacher/exams/${id}/results`)}
              >
                Kết quả
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Đề tự mở và đóng theo thời gian đã đặt. Học sinh chỉ bắt đầu làm được trong khoảng
                thời gian này; nếu thời gian đóng để trống thì đề không giới hạn thời gian đóng.
              </span>
            </div>
          </div>

          {exam.attemptCount === 0 ? (
            <div className="surface p-3">
              <Button
                variant="ghost-danger"
                icon={Trash2}
                className="w-full justify-start"
                onClick={() => setConfirmType('delete')}
              >
                Xóa đề thi
              </Button>
            </div>
          ) : null}
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
