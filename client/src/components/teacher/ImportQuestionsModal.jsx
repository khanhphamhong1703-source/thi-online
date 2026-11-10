import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react';
import Modal from '../Modal';
import Button from '../Button';
import Badge from '../Badge';
import { examApi } from '../../api/exams';
import { getErrorMessage } from '../../api/client';
import { parseQuestionText, QUESTION_IMPORT_TEMPLATE } from '../../utils/questionImport';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export default function ImportQuestionsModal({
  open,
  onClose,
  onImport,
  existingCount = 0,
}) {
  const inputRef = useRef(null);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setText('');
    setFileName('');
    setWarnings([]);
    setUploadError('');
    setUploading(false);
    setDragActive(false);
    setReplaceExisting(false);
    if (inputRef.current) inputRef.current.value = '';
  }, [open]);

  const parsed = useMemo(() => parseQuestionText(text), [text]);
  const validQuestions = parsed.questions.filter((question) => question.errors.length === 0);
  const lineCount = text ? text.split('\n').length : 0;

  const handleFile = async (file) => {
    if (!file) return;
    if (!/\.(docx|txt)$/i.test(file.name)) {
      setUploadError('Chỉ chấp nhận file Word .docx hoặc văn bản .txt');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File vượt quá dung lượng tối đa 5MB');
      return;
    }

    setUploading(true);
    setUploadError('');
    setWarnings([]);
    try {
      const { data } = await examApi.extractImportText(file);
      setText(data.data.text || '');
      setFileName(data.data.filename || file.name);
      setWarnings(data.data.warnings || []);
    } catch (error) {
      setUploadError(getErrorMessage(error, 'Không đọc được file'));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const insertTemplate = () => {
    setText((current) =>
      current.trim() ? `${current.trim()}\n\n${QUESTION_IMPORT_TEMPLATE}` : QUESTION_IMPORT_TEMPLATE
    );
  };

  const handleImport = () => {
    if (!validQuestions.length) return;
    onImport(validQuestions, { replace: replaceExisting });
  };

  return (
    <Modal
      open={open}
      onClose={uploading ? undefined : onClose}
      title="Nhập câu hỏi từ Word/Text"
      description="Tải file hoặc dán văn bản, chỉnh sửa ở cột trái và kiểm tra câu hỏi ở cột phải trước khi thêm."
      size="2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={uploading}>
            Hủy
          </Button>
          <Button
            onClick={handleImport}
            icon={Plus}
            disabled={validQuestions.length === 0 || uploading}
          >
            {validQuestions.length > 0
              ? `${replaceExisting ? 'Thay thế bằng' : 'Thêm'} ${validQuestions.length} câu hỏi`
              : 'Thêm câu hỏi'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Văn bản nguồn</h3>
              <p className="text-xs text-slate-500">Hỗ trợ Word .docx và .txt, tối đa 5MB.</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={insertTemplate}
                className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-brand-600 transition hover:bg-brand-50"
              >
                <Wand2 className="h-3.5 w-3.5" /> Mẫu
              </button>
              <button
                type="button"
                onClick={() => {
                  setText('');
                  setFileName('');
                  setWarnings([]);
                  setUploadError('');
                }}
                className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" /> Xóa
              </button>
            </div>
          </div>

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              handleFile(event.dataTransfer.files?.[0]);
            }}
            className={
              dragActive
                ? 'overflow-hidden rounded-xl border-2 border-dashed border-brand-400 bg-brand-50/60'
                : 'overflow-hidden rounded-xl border border-slate-200 bg-white'
            }
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2 text-xs text-slate-600">
                {uploading ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-600" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                )}
                <span className="truncate">
                  {uploading ? 'Đang đọc file...' : fileName || 'Dán văn bản hoặc chọn file'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="focus-ring inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" /> Chọn file
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".docx,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="hidden"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
            </div>

            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={12}
              spellCheck={false}
              placeholder={`Dán nội dung câu hỏi tại đây...\n\n${QUESTION_IMPORT_TEMPLATE}`}
              className="block h-[320px] w-full resize-y border-0 bg-white px-3 py-3 font-mono text-[13px] leading-6 text-slate-800 placeholder:text-slate-400 focus:outline-none sm:h-[400px]"
            />
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-3 py-1.5 text-[11px] text-slate-400">
              <span>{lineCount} dòng</span>
              <span>Kéo thả file vào khung này</span>
            </div>
          </div>

          {uploadError ? (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {uploadError}
            </div>
          ) : null}

          {warnings.length ? (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              File có {warnings.length} cảnh báo định dạng. Hãy kiểm tra lại nội dung.
            </div>
          ) : null}
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Xem trước câu hỏi</h3>
              <p className="text-xs text-slate-500">
                {parsed.summary.total} câu · {parsed.summary.valid} hợp lệ ·{' '}
                {parsed.summary.invalid} cần sửa
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="active">{parsed.summary.valid} hợp lệ</Badge>
              {parsed.summary.invalid ? (
                <Badge variant="invalid">{parsed.summary.invalid} lỗi</Badge>
              ) : null}
            </div>
          </div>

          <div className="h-[320px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 sm:h-[400px]">
            {!text.trim() ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
                  <FileText className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  Chưa có nội dung để xem trước
                </p>
                <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
                  Tải file Word/Text hoặc bấm “Mẫu” để lấy cấu trúc câu hỏi mẫu.
                </p>
              </div>
            ) : parsed.globalError ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
                <p className="mt-2 text-sm font-semibold text-slate-800">{parsed.globalError}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Mỗi câu cần dòng “Câu N:”, 4 đáp án A–D và “Đáp án đúng: A/B/C/D”.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {parsed.questions.map((question, index) => {
                  const valid = question.errors.length === 0;
                  return (
                    <article
                      key={question.id}
                      className={
                        valid
                          ? 'rounded-lg border border-emerald-200 bg-white p-3'
                          : 'rounded-lg border border-rose-200 bg-white p-3'
                      }
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-start gap-2">
                          <span
                            className={
                              valid
                                ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700'
                                : 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[11px] font-bold text-rose-700'
                            }
                          >
                            {index + 1}
                          </span>
                          <p className="min-w-0 text-sm font-medium leading-5 text-slate-800">
                            {question.content || '(Thiếu nội dung câu hỏi)'}
                          </p>
                        </div>
                        {valid ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                        )}
                      </div>

                      {question.section === 'II' ? (
                        <div className="mt-2 space-y-1.5 pl-8">
                          {(question.statements || []).map((statement, statementIndex) => (
                            <div
                              key={statementIndex}
                              className={
                                statement.correct
                                  ? 'flex items-start gap-2 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-800'
                                  : 'flex items-start gap-2 rounded border border-slate-100 bg-slate-50 px-2 py-1 text-xs text-slate-600'
                              }
                            >
                              <span className="font-bold">{statementIndex + 1}.</span>
                              <span className="flex-1">{statement.content || '—'}</span>
                              <Badge variant={statement.correct ? 'active' : 'neutral'}>
                                {statement.correct ? 'Đúng' : 'Sai'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : question.section === 'III' ? (
                        <div className="mt-2 rounded border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs text-emerald-800">
                          <span className="font-semibold">Đáp án:</span>{' '}
                          <span className="font-mono font-bold">
                            {question.correctText || '—'}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-2 grid gap-1.5 pl-8 sm:grid-cols-2">
                          {question.options.map((option, optionIndex) => (
                            <div
                              key={optionIndex}
                              className={
                                optionIndex === question.correctOption
                                  ? 'rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-800'
                                  : 'rounded border border-slate-100 bg-slate-50 px-2 py-1 text-xs text-slate-600'
                              }
                            >
                              <span className="font-bold">{OPTION_LETTERS[optionIndex]}.</span>{' '}
                              {option || '—'}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pl-8 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Badge variant="neutral">
                            Phần {question.section}
                          </Badge>
                          <span>Dòng {question.lineNumber}</span>
                        </span>
                        <span>{question.points} điểm</span>
                      </div>

                      {question.errors.length ? (
                        <ul className="mt-2 space-y-0.5 pl-8 text-[11px] leading-5 text-rose-600">
                          {question.errors.map((error) => (
                            <li key={error}>• {error}</li>
                          ))}
                        </ul>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {existingCount > 0 && validQuestions.length > 0 ? (
            <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(event) => setReplaceExisting(event.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span>
                Thay thế {existingCount} câu hỏi hiện có
                <span className="mt-0.5 block text-[11px] text-slate-400">
                  Bỏ trống để giữ câu hỏi cũ và thêm các câu mới vào sau.
                </span>
              </span>
            </label>
          ) : null}

          {parsed.summary.invalid > 0 ? (
            <p className="mt-2 text-[11px] leading-5 text-amber-700">
              {parsed.summary.invalid} câu lỗi sẽ không được thêm. Sửa trực tiếp trong văn bản để
              chuyển thành hợp lệ.
            </p>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
