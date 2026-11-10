import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  Info,
  RefreshCcw,
  Upload,
  X,
} from 'lucide-react';
import { classApi } from '../../api/classes';
import { studentApi } from '../../api/students';
import {
  downloadBlob,
  getErrorMessage,
  getFilenameFromDisposition,
} from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import { formatDate } from '../../utils/format';
import PageHeader from '../../components/PageHeader';
import LoadingState from '../../components/LoadingState';
import Button from '../../components/Button';
import Badge from '../../components/Badge';

const STATUS_LABEL = {
  new: { label: 'Học sinh mới', variant: 'new' },
  existing: { label: 'Dùng hồ sơ có sẵn', variant: 'existing' },
  skipped: { label: 'Bỏ qua', variant: 'skipped' },
  invalid: { label: 'Không hợp lệ', variant: 'invalid' },
};

const STEPS = [
  { key: 'select', label: 'Chọn file' },
  { key: 'preview', label: 'Xem trước' },
  { key: 'done', label: 'Hoàn tất' },
];

export default function ImportExcelPage() {
  const { id: classId } = useParams();
  const toast = useToast();
  const inputRef = useRef(null);
  const [classroom, setClassroom] = useState(null);
  const [classLoading, setClassLoading] = useState(true);
  const [classError, setClassError] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [reportErrors, setReportErrors] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    let active = true;
    classApi
      .get(classId)
      .then(({ data }) => {
        if (active) setClassroom(data.data);
      })
      .catch((apiError) => {
        if (active) setClassError(getErrorMessage(apiError, 'Không tải được lớp học'));
      })
      .finally(() => {
        if (active) setClassLoading(false);
      });
    return () => {
      active = false;
    };
  }, [classId]);

  const resetFlow = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setReportErrors([]);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const processFile = async (selectedFile) => {
    setError('');
    setResult(null);
    setReportErrors([]);

    if (!selectedFile) return;
    if (!/\.xlsx$/i.test(selectedFile.name)) {
      setError('Chỉ chấp nhận file Excel định dạng .xlsx');
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File vượt quá dung lượng tối đa 5MB');
      return;
    }

    setFile(selectedFile);
    setPreview(null);
    setPreviewLoading(true);
    try {
      const { data } = await studentApi.previewImport(classId, selectedFile);
      setPreview(data.data);
      setReportErrors(
        data.data.rows
          .filter((row) => row.status === 'invalid')
          .map((row) => ({
            rowNumber: row.rowNumber,
            studentCode: row.studentCode,
            fullName: row.fullName,
            errors: row.errors,
          }))
      );
    } catch (apiError) {
      const message = getErrorMessage(apiError, 'Không thể đọc file Excel');
      setError(message);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      toast.error(message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleFileChange = (event) => {
    processFile(event.target.files?.[0]);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    processFile(event.dataTransfer.files?.[0]);
  };

  const handleCommit = async () => {
    if (!file || !preview) return;
    setCommitLoading(true);
    setError('');
    try {
      const { data } = await studentApi.commitImport(classId, file);
      setResult(data.data);
      setReportErrors(data.data.errors || []);
      toast.success(
        `Đã import ${data.data.summary.imported} học sinh vào lớp ${classroom?.name || ''}`
      );
    } catch (apiError) {
      const message = getErrorMessage(apiError, 'Import thất bại');
      setError(message);
      toast.error(message);
    } finally {
      setCommitLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!reportErrors.length) {
      toast.info('Không có dòng lỗi để xuất báo cáo');
      return;
    }
    setReportLoading(true);
    try {
      const response = await studentApi.downloadErrorReport(classId, reportErrors);
      const filename = getFilenameFromDisposition(
        response.headers['content-disposition'],
        'bao-cao-loi-import.xlsx'
      );
      downloadBlob(response.data, filename);
      toast.success('Đã tải báo cáo lỗi import');
    } catch (apiError) {
      toast.error(getErrorMessage(apiError, 'Không thể tải báo cáo lỗi'));
    } finally {
      setReportLoading(false);
    }
  };

  if (classLoading) return <LoadingState label="Đang tải lớp học..." />;

  if (classError || !classroom) {
    return (
      <div className="surface mx-auto max-w-lg p-8 text-center">
        <p className="font-semibold text-slate-900">Không tìm thấy lớp học</p>
        <p className="mt-1 text-sm text-slate-500">{classError}</p>
        <Link to="/teacher/classes" className="mt-5 inline-flex text-sm font-semibold text-brand-600">
          Quay lại danh sách lớp
        </Link>
      </div>
    );
  }

  const currentStep = result ? 'done' : preview ? 'preview' : 'select';

  return (
    <div>
      <PageHeader
        backTo={`/teacher/classes/${classId}/students`}
        backLabel="Quay lại danh sách học sinh"
        eyebrow={`${classroom.classCode} · ${classroom.schoolYear}`}
        title="Import danh sách học sinh"
        description={`Thêm hàng loạt học sinh vào lớp ${classroom.name} từ file Excel, có kiểm tra dữ liệu trước khi lưu.`}
      />

      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((step, index) => {
          const stepIndex = STEPS.findIndex((item) => item.key === currentStep);
          const isActive = step.key === currentStep;
          const isComplete = index < stepIndex;
          return (
            <div key={step.key} className="flex flex-1 items-center gap-2">
              <div
                className={
                  isActive
                    ? 'flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white'
                    : isComplete
                      ? 'flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700'
                      : 'flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-400'
                }
              >
                {isComplete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
              </div>
              <span
                className={
                  isActive
                    ? 'text-sm font-semibold text-slate-900'
                    : 'text-sm font-medium text-slate-400'
                }
              >
                {step.label}
              </span>
              {index < STEPS.length - 1 ? (
                <div className={`h-px flex-1 ${isComplete ? 'bg-emerald-200' : 'bg-slate-200'}`} />
              ) : null}
            </div>
          );
        })}
      </div>

      {error ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {result ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="surface p-6 lg:col-span-2">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Import hoàn tất</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Hệ thống đã xử lý file {file?.name} cho lớp {classroom.name}.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-2xl font-bold text-slate-900">{result.summary.imported}</p>
                <p className="mt-0.5 text-xs text-slate-500">Đã thêm vào lớp</p>
              </div>
              <div className="rounded-xl bg-blue-50 p-4">
                <p className="text-2xl font-bold text-blue-700">{result.summary.created}</p>
                <p className="mt-0.5 text-xs text-blue-600">Học sinh mới</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="text-2xl font-bold text-emerald-700">{result.summary.reused}</p>
                <p className="mt-0.5 text-xs text-emerald-600">Dùng hồ sơ cũ</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-4">
                <p className="text-2xl font-bold text-amber-700">
                  {result.summary.skipped + result.summary.invalid}
                </p>
                <p className="mt-0.5 text-xs text-amber-600">Bỏ qua / lỗi</p>
              </div>
            </div>

            {result.students?.length ? (
              <div className="mt-6">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Mã học sinh đã cấp
                  </h3>
                  <span className="text-xs text-slate-500">{result.students.length} học sinh</span>
                </div>
                <div className="mt-3 max-h-80 overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Họ và tên</th>
                        <th className="px-3 py-2 font-semibold">Mã học sinh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.students.map((item) => (
                        <tr
                          key={`${item.rowNumber}-${item.studentCode}`}
                          className="border-t border-slate-100"
                        >
                          <td className="px-3 py-2 text-slate-700">{item.fullName}</td>
                          <td className="px-3 py-2 font-mono text-base font-semibold tracking-wide text-slate-900">
                            {item.studentCode}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Tải danh sách lớp để in phiếu mã phát cho học sinh.
                </p>
              </div>
            ) : null}

            {result.errors?.length ? (
              <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                    <div>
                      <p className="text-sm font-semibold text-rose-800">
                        {result.errors.length} dòng không được import
                      </p>
                      <p className="mt-0.5 text-xs text-rose-600">
                        Tải báo cáo để xem chi tiết và sửa lại file.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Download}
                    onClick={handleDownloadReport}
                    loading={reportLoading}
                  >
                    Báo cáo lỗi
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link
                to={`/teacher/classes/${classId}/students`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Về danh sách học sinh
              </Link>
              <Button variant="secondary" icon={Upload} onClick={resetFlow}>
                Import file khác
              </Button>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="surface p-5">
              <h3 className="text-sm font-semibold text-slate-900">Xử lý dữ liệu trùng</h3>
              <ul className="mt-3 space-y-2.5 text-sm leading-6 text-slate-500">
                <li>Không có mã: hệ thống cấp mã ngẫu nhiên cho học sinh mới.</li>
                <li>Mã chưa tồn tại: hệ thống cấp mã mới, không dùng mã trong file.</li>
                <li>Mã đã tồn tại ngoài lớp: dùng hồ sơ cũ, thêm vào lớp.</li>
                <li>Mã đã thuộc lớp: bỏ qua.</li>
                <li>Mã trùng trong file: báo lỗi để xử lý.</li>
              </ul>
            </div>
          </aside>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="surface p-5 sm:p-6 lg:col-span-2">
            {!file ? (
              <>
                <h2 className="text-sm font-semibold text-slate-900">Chọn file Excel</h2>
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  className={
                    dragActive
                      ? 'mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand-400 bg-brand-50 px-6 py-12 text-center'
                      : 'mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-6 py-12 text-center transition hover:border-brand-300 hover:bg-brand-50/40'
                  }
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-sm">
                    <FileUp className="h-7 w-7" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-900">
                    Kéo thả file vào đây hoặc chọn từ máy tính
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Chỉ hỗ trợ .xlsx, dung lượng tối đa 5MB</p>
                  <Button
                    className="mt-5"
                    icon={Upload}
                    onClick={() => inputRef.current?.click()}
                  >
                    Chọn file Excel
                  </Button>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </>
            ) : previewLoading ? (
              <LoadingState label="Đang kiểm tra dữ liệu file Excel..." />
            ) : preview ? (
              <>
                <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{file.name}</p>
                      <p className="text-xs text-slate-500">
                        {(file.size / 1024).toFixed(1)} KB · {preview.summary.total} dòng dữ liệu
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={resetFlow}
                    className="inline-flex items-center gap-1 self-start rounded-lg px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100"
                  >
                    <X className="h-4 w-4" /> Chọn file khác
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-lg font-bold text-slate-900">{preview.summary.total}</p>
                    <p className="text-[11px] text-slate-500">Tổng dòng</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-3">
                    <p className="text-lg font-bold text-blue-700">{preview.summary.new}</p>
                    <p className="text-[11px] text-blue-600">Học sinh mới</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-3">
                    <p className="text-lg font-bold text-emerald-700">{preview.summary.existing}</p>
                    <p className="text-[11px] text-emerald-600">Hồ sơ có sẵn</p>
                  </div>
                  <div className="rounded-lg bg-rose-50 p-3">
                    <p className="text-lg font-bold text-rose-700">{preview.summary.invalid}</p>
                    <p className="text-[11px] text-rose-600">Không hợp lệ</p>
                  </div>
                </div>

                {preview.summary.skipped > 0 ? (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {preview.summary.skipped} dòng đã thuộc lớp hiện tại sẽ được bỏ qua khi import.
                  </div>
                ) : null}

                <div className="mt-4 max-h-[480px] overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="table-header">
                        <th className="px-3 py-3 font-semibold">Dòng</th>
                        <th className="px-3 py-3 font-semibold">Mã HS</th>
                        <th className="px-3 py-3 font-semibold">Họ và tên</th>
                        <th className="px-3 py-3 font-semibold">Ngày sinh</th>
                        <th className="px-3 py-3 font-semibold">Trạng thái</th>
                        <th className="px-3 py-3 font-semibold">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row) => {
                        const status = STATUS_LABEL[row.status] || STATUS_LABEL.invalid;
                        return (
                          <tr key={row.rowNumber} className="table-row">
                            <td className="px-3 py-3 text-slate-500">{row.rowNumber}</td>
                            <td className="px-3 py-3 font-medium text-slate-700">
                              {row.studentCode || (row.status === 'new' ? 'Sẽ cấp' : '—')}
                            </td>
                            <td className="px-3 py-3 text-slate-700">{row.fullName || '—'}</td>
                            <td className="px-3 py-3 text-slate-600">
                              {row.dateOfBirth
                                ? formatDate(row.dateOfBirth)
                                : '—'}
                            </td>
                            <td className="px-3 py-3">
                              <Badge variant={status.variant}>{status.label}</Badge>
                            </td>
                            <td className="max-w-[300px] px-3 py-3 text-xs leading-5 text-slate-500">
                              {row.message || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-500">
                    {preview.summary.valid} học sinh hợp lệ sẽ được thêm vào lớp.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {reportErrors.length ? (
                      <Button
                        variant="secondary"
                        icon={Download}
                        onClick={handleDownloadReport}
                        loading={reportLoading}
                      >
                        Tải dòng lỗi
                      </Button>
                    ) : null}
                    <Button
                      icon={Upload}
                      onClick={handleCommit}
                      loading={commitLoading}
                      disabled={preview.summary.valid === 0}
                    >
                      Xác nhận import
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-10 text-center">
                <p className="text-sm font-semibold text-slate-900">Chưa đọc được file</p>
                <Button
                  variant="secondary"
                  className="mt-4"
                  icon={RefreshCcw}
                  onClick={() => inputRef.current?.click()}
                >
                  Chọn lại file
                </Button>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="surface p-5">
              <h3 className="text-sm font-semibold text-slate-900">Cấu trúc file mẫu</h3>
              <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[430px] text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 text-left text-slate-500">
                      <th className="px-2 py-2 font-semibold">Mã học sinh</th>
                      <th className="px-2 py-2 font-semibold">Họ và tên</th>
                      <th className="px-2 py-2 font-semibold">Ngày sinh</th>
                      <th className="px-2 py-2 font-semibold">SĐT</th>
                      <th className="px-2 py-2 font-semibold">Email</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600">
                    <tr className="border-t border-slate-100">
                      <td className="px-2 py-2">(để trống)</td>
                      <td className="px-2 py-2">Nguyễn Văn An</td>
                      <td className="px-2 py-2">15/03/2008</td>
                      <td className="px-2 py-2">0912345678</td>
                      <td className="px-2 py-2">an@gmail.com</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs leading-5 text-slate-500">
                <li>Header nằm ở dòng đầu tiên.</li>
                <li>Bắt buộc: Họ và tên, Ngày sinh.</li>
                <li>
                  Mã học sinh là tuỳ chọn: để trống để hệ thống cấp mã ngẫu nhiên; nếu điền mã đã
                  tồn tại thì dùng lại hồ sơ học sinh đó.
                </li>
                <li>Ngày sinh hỗ trợ dd/mm/yyyy hoặc định dạng ngày của Excel.</li>
                <li>SĐT và Email có thể để trống nhưng phải đúng định dạng nếu có.</li>
              </ul>
            </div>

            <div className="surface p-5">
              <h3 className="text-sm font-semibold text-slate-900">An toàn dữ liệu</h3>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Backend kiểm tra lại toàn bộ file khi xác nhận import. File tối đa 5MB và chỉ chấp
                nhận định dạng .xlsx.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
