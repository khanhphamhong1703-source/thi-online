import { useRef, useState } from 'react';
import { AlertTriangle, Download, FileText, HardDrive, Upload } from 'lucide-react';
import { adminDataApi } from '../../api/adminData';
import {
  downloadBlob,
  getErrorMessage,
  getFilenameFromDisposition,
} from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminSettingsPage() {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importMode, setImportMode] = useState('merge');
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await adminDataApi.exportBackup();
      const filename = getFilenameFromDisposition(
        response.headers['content-disposition'],
        `vieexam-backup-${new Date().toISOString().slice(0, 10)}.json`
      );
      downloadBlob(response.data, filename);
      toast.success('Đã xuất bản sao lưu dữ liệu');
    } catch (apiError) {
      toast.error(getErrorMessage(apiError, 'Không thể xuất bản sao lưu'));
    } finally {
      setExporting(false);
    }
  };

  const handleChooseBackup = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/\.json$/i.test(file.name)) {
      toast.error('Chỉ chấp nhận file sao lưu JSON');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File sao lưu vượt quá dung lượng tối đa 50MB');
      return;
    }
    setImportFile(file);
    setImportMode('merge');
    setReplaceConfirmed(false);
  };

  const closeImport = () => {
    if (importing) return;
    setImportFile(null);
    setReplaceConfirmed(false);
  };

  const handleImport = async () => {
    if (!importFile) return;
    if (importMode === 'replace' && !replaceConfirmed) {
      toast.error('Vui lòng xác nhận thay thế toàn bộ dữ liệu');
      return;
    }

    setImporting(true);
    try {
      const { data: payload } = await adminDataApi.importBackup(importFile, importMode);
      const total = payload.data?.total ?? 0;
      toast.success(`${payload.message}: ${total} bản ghi`);
      setImportFile(null);
      setReplaceConfirmed(false);
      if (payload.data?.requiresLogin) {
        window.location.assign('/admin/login');
      }
    } catch (apiError) {
      toast.error(getErrorMessage(apiError, 'Không thể nhập bản sao lưu'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Hệ thống"
        title="Hệ thống"
        description="Sao lưu, khôi phục và các thao tác quản trị toàn hệ thống."
      />

      <section className="surface max-w-3xl p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Sao lưu &amp; khôi phục</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Xuất toàn bộ giáo viên, lớp, học sinh, đề thi và lượt thi thành một file JSON. File
              có chứa mật khẩu đã mã hoá, chỉ nên lưu ở nơi an toàn.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" icon={Download} loading={exporting} onClick={handleExport}>
            Xuất dữ liệu
          </Button>
          <Button
            variant="secondary"
            icon={Upload}
            onClick={() => importInputRef.current?.click()}
          >
            Nhập dữ liệu
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleChooseBackup}
          />
        </div>

        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
          Nhập dữ liệu ở chế độ thay thế sẽ xoá toàn bộ dữ liệu hiện tại trước khi khôi phục và
          không thể hoàn tác. Chỉ thực hiện khi đã có bản sao lưu an toàn.
        </p>
      </section>

      <Modal
        open={Boolean(importFile)}
        onClose={closeImport}
        title="Nhập bản sao lưu"
        description="Chọn cách áp dụng dữ liệu từ file JSON."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeImport} disabled={importing}>
              Hủy
            </Button>
            <Button
              variant={importMode === 'replace' ? 'danger' : 'primary'}
              onClick={handleImport}
              loading={importing}
              disabled={importMode === 'replace' && !replaceConfirmed}
            >
              Nhập dữ liệu
            </Button>
          </>
        }
      >
        {importFile ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{importFile.name}</p>
                <p className="text-xs text-slate-500">{formatFileSize(importFile.size)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label
                className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${
                  importMode === 'merge'
                    ? 'border-brand-300 bg-brand-50/60'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="backup-mode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={() => {
                    setImportMode('merge');
                    setReplaceConfirmed(false);
                  }}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">Hợp nhất</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                    Thêm hoặc cập nhật bản ghi theo ID. Không xoá dữ liệu đang có.
                  </span>
                </span>
              </label>

              <label
                className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${
                  importMode === 'replace'
                    ? 'border-rose-300 bg-rose-50/60'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="backup-mode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">Thay thế toàn bộ</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                    Xoá toàn bộ dữ liệu hiện tại rồi khôi phục từ file. Không thể hoàn tác.
                  </span>
                </span>
              </label>
            </div>

            {importMode === 'replace' ? (
              <div className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <div>
                  <p className="text-xs leading-5 text-rose-700">
                    Nếu file không chứa tài khoản Admin hiện tại, bạn sẽ bị đăng xuất và phải đăng
                    nhập bằng tài khoản Admin trong file.
                  </p>
                  <label className="mt-2 flex cursor-pointer items-start gap-2 text-xs font-medium text-rose-700">
                    <input
                      type="checkbox"
                      checked={replaceConfirmed}
                      onChange={(event) => setReplaceConfirmed(event.target.checked)}
                      className="mt-0.5"
                    />
                    Tôi hiểu và muốn thay thế toàn bộ dữ liệu
                  </label>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
