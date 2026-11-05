import { AlertTriangle, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import Modal from './Modal';
import Badge from './Badge';
import Button from './Button';
import LoadingState from './LoadingState';
import { formatDateTime } from '../utils/format';
import { getAttemptDisplayStatus } from '../utils/exam';

function SummaryCard({ label, value, hint, tone = 'default' }) {
  const toneClass =
    tone === 'success'
      ? 'text-emerald-700'
      : tone === 'danger'
        ? 'text-rose-700'
        : 'text-slate-900';
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default function ExamAttemptDetailModal({
  open,
  onClose,
  loading,
  detail,
  error,
  onRetry,
}) {
  const statusMeta = detail ? getAttemptDisplayStatus(detail.attempt.status) : null;
  const attempt = detail?.attempt;
  const scoreLabel =
    attempt && attempt.score !== null && attempt.score !== undefined
      ? `${attempt.score}/${attempt.maxScore}`
      : 'Chưa chấm';

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="2xl"
      title="Chi tiết bài làm"
      description={
        detail
          ? `${detail.student.fullName} · ${detail.student.studentCode} · Lượt #${detail.attempt.attemptNumber}`
          : 'Xem đáp án đã chọn và đáp án đúng của từng câu.'
      }
      footer={<Button variant="secondary" onClick={onClose}>Đóng</Button>}
    >
      {loading ? <LoadingState label="Đang tải chi tiết bài làm..." /> : null}

      {!loading && error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p>{error}</p>
          <Button variant="secondary" className="mt-3" onClick={onRetry}>
            Thử lại
          </Button>
        </div>
      ) : null}

      {!loading && !error && detail ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {statusMeta ? <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge> : null}
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Clock3 className="h-3.5 w-3.5" />
              Bắt đầu: {formatDateTime(detail.attempt.startedAt)}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Clock3 className="h-3.5 w-3.5" />
              Nộp: {detail.attempt.submittedAt ? formatDateTime(detail.attempt.submittedAt) : '—'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard label="Điểm" value={scoreLabel} hint={attempt.percent !== null ? `${attempt.percent}%` : 'Chưa có điểm'} />
            <SummaryCard
              label="Số câu đúng"
              value={attempt.correctCount ?? '—'}
              hint={`${attempt.questionCount} câu`}
              tone="success"
            />
            <SummaryCard
              label="Đã trả lời"
              value={`${attempt.answeredCount}/${attempt.questionCount}`}
              hint="Câu đã chọn đáp án"
            />
            <SummaryCard
              label="Số lần thoát"
              value={attempt.exitCount}
              hint="Chuyển tab/rời trình duyệt"
              tone={attempt.exitCount ? 'danger' : 'default'}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Đáp án đúng
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Đã chọn đúng
            </span>
            <span className="inline-flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5 text-rose-600" />
              Đã chọn sai
            </span>
          </div>

          <div className="space-y-3">
            {detail.questions.map((question) => {
              const sectionTitle = question.section
                ? detail.exam.sectionTitles?.[question.section]
                : '';
              return (
                <article
                  key={question.id}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      Câu {question.number}
                    </span>
                    {question.section ? (
                      <Badge variant="info">
                        Phần {question.section}
                        {sectionTitle ? ` - ${sectionTitle}` : ''}
                      </Badge>
                    ) : null}
                    <span className="text-xs font-medium text-slate-500">
                      {question.points} điểm
                    </span>
                    {question.missing ? (
                      <Badge variant="warning">Không còn trong đề</Badge>
                    ) : question.answered ? (
                      <Badge variant={question.isCorrect ? 'active' : 'locked'}>
                        {question.earnedPoints > 0
                          ? `+${question.earnedPoints} điểm`
                          : 'Sai'}
                      </Badge>
                    ) : (
                      <Badge variant="neutral">Chưa chọn</Badge>
                    )}
                  </div>

                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-800">
                    {question.content}
                  </p>

                  {question.missing ? (
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      Đề đã được chỉnh sửa sau lượt làm này nên không còn nội dung câu hỏi gốc.
                    </div>
                  ) : (
                    question.section === 'II' ? (
                      <div className="mt-3 space-y-2">
                        {(question.statements || []).map((statement) => (
                          <div
                            key={`${question.id}-${statement.index}`}
                            className={`flex items-start gap-3 rounded-lg border p-3 ${
                              statement.isCorrect
                                ? 'border-emerald-300 bg-emerald-50'
                                : statement.selected !== null
                                  ? 'border-rose-300 bg-rose-50'
                                  : 'border-slate-200 bg-white'
                            }`}
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                              {statement.index + 1}
                            </span>
                            <span className="flex-1 pt-0.5 text-sm leading-6 text-slate-700">
                              {statement.content}
                            </span>
                            <Badge variant={statement.isCorrect ? 'active' : 'locked'}>
                              {statement.selected === null
                                ? 'Chưa chọn'
                                : statement.selected
                                  ? 'Đúng'
                                  : 'Sai'}
                            </Badge>
                            <Badge variant={statement.correct ? 'active' : 'neutral'}>
                              Đáp án: {statement.correct ? 'Đúng' : 'Sai'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : question.section === 'III' ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <p className="text-[11px] font-medium text-slate-500">Đã điền</p>
                          <p className="mt-1 font-mono text-lg font-bold text-slate-800">
                            {question.selectedText || '—'}
                          </p>
                        </div>
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                          <p className="text-[11px] font-medium text-emerald-700">Đáp án đúng</p>
                          <p className="mt-1 font-mono text-lg font-bold text-emerald-800">
                            {question.correctText || '—'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {question.options.map((option) => {
                          const selectedWrong = option.isSelected && !option.isCorrect;
                          return (
                            <div
                              key={`${question.id}-${option.index}`}
                              className={`flex items-start gap-3 rounded-lg border p-3 ${
                                option.isCorrect
                                  ? 'border-emerald-300 bg-emerald-50'
                                  : selectedWrong
                                    ? 'border-rose-300 bg-rose-50'
                                    : 'border-slate-200 bg-white'
                              }`}
                            >
                              <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                  option.isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : selectedWrong
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {option.label}
                              </span>
                              <span className="flex-1 pt-0.5 text-sm leading-6 text-slate-700">
                                {option.text}
                              </span>
                              {option.isSelected ? (
                                <Badge variant={option.isCorrect ? 'active' : 'locked'}>
                                  {option.isCorrect ? 'Đã chọn · Đúng' : 'Đã chọn · Sai'}
                                </Badge>
                              ) : null}
                              {option.isCorrect && !option.isSelected ? (
                                <Badge variant="active">Đáp án đúng</Badge>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}

                  {!question.missing ? (
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-2 text-xs text-slate-500">
                      <span>
                        Đã chọn:{' '}
                        <strong className="text-slate-700">
                          {question.selectedLabel || 'Chưa chọn'}
                        </strong>
                      </span>
                      <span>
                        Đáp án đúng:{' '}
                        <strong className="text-emerald-700">
                          {question.correctLabel || '—'}
                        </strong>
                      </span>
                      <span className="ml-auto font-semibold text-slate-700">
                        {question.isCorrect ? `+${question.earnedPoints}` : '0'} điểm
                      </span>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
