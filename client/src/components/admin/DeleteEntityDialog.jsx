import { useEffect, useState } from 'react';
import { adminDataApi } from '../../api/adminData';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import ConfirmDialog from '../ConfirmDialog';

const IMPACT_FIELDS = {
  teacher: [
    ['classes', 'Lớp sẽ xoá'],
    ['students', 'Học sinh sẽ xoá'],
    ['exams', 'Đề sẽ xoá'],
    ['questions', 'Câu hỏi sẽ xoá'],
    ['attempts', 'Lượt thi sẽ xoá'],
  ],
  class: [
    ['students', 'Học sinh sẽ xoá'],
    ['attempts', 'Lượt thi sẽ xoá'],
    ['exams', 'Đề giữ lại'],
  ],
  student: [
    ['enrollments', 'Ghi danh'],
    ['classes', 'Lớp'],
    ['exams', 'Đề đã làm'],
    ['attempts', 'Lượt thi'],
  ],
  exam: [
    ['questions', 'Câu hỏi'],
    ['attempts', 'Lượt thi'],
    ['students', 'Học sinh đã làm'],
    ['classes', 'Lớp được giao'],
  ],
};

const COPY = {
  teacher: {
    title: 'Xoá vĩnh viễn giáo viên?',
    description: (item) =>
      `Tài khoản "${item.fullName}" sẽ bị xoá vĩnh viễn. Thao tác không thể hoàn tác.`,
  },
  class: {
    title: 'Xoá vĩnh viễn lớp học?',
    description: (item) =>
      `Lớp "${item.name}" sẽ bị xoá vĩnh viễn. Thao tác không thể hoàn tác.`,
  },
  student: {
    title: 'Xoá vĩnh viễn học sinh?',
    description: (item) =>
      `Hồ sơ "${item.fullName}" sẽ bị xoá vĩnh viễn. Thao tác không thể hoàn tác.`,
  },
  exam: {
    title: 'Xoá vĩnh viễn đề thi?',
    description: (item) =>
      `Đề "${item.title}" sẽ bị xoá vĩnh viễn. Thao tác không thể hoàn tác.`,
  },
};

const ACTIONS = {
  teacher: adminDataApi.deleteTeacher,
  class: adminDataApi.deleteClass,
  student: adminDataApi.deleteStudent,
  exam: adminDataApi.deleteExam,
};

export default function DeleteEntityDialog({ target, onClose, onDeleted }) {
  const toast = useToast();
  const [impact, setImpact] = useState(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!target) return undefined;
    let active = true;
    setImpact(null);
    setImpactLoading(true);
    adminDataApi
      .deleteImpact(target.type, target.item.id)
      .then(({ data }) => {
        if (active) setImpact(data.data);
      })
      .catch(() => {
        if (active) setImpact(null);
      })
      .finally(() => {
        if (active) setImpactLoading(false);
      });
    return () => {
      active = false;
    };
  }, [target]);

  const handleDelete = async () => {
    if (!target) return;
    setDeleting(true);
    try {
      await ACTIONS[target.type](target.item.id);
      toast.success('Đã xoá vĩnh viễn dữ liệu');
      onDeleted?.();
      onClose?.();
    } catch (apiError) {
      toast.error(getErrorMessage(apiError, 'Không thể xoá dữ liệu'));
    } finally {
      setDeleting(false);
    }
  };

  const copy = target ? COPY[target.type] : null;

  const renderImpact = () => {
    if (!target) return null;
    if (impactLoading) {
      return <p className="text-xs text-slate-500">Đang tổng hợp dữ liệu liên quan…</p>;
    }
    if (!impact) {
      return (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          Không tải được thông tin tác động. Hãy kiểm tra kỹ trước khi xoá.
        </p>
      );
    }

    const fields = IMPACT_FIELDS[impact.type] || [];
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {fields.map(([key, label]) => (
            <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {label}
              </p>
              <p className="text-base font-bold text-slate-900">{impact.counts?.[key] ?? 0}</p>
            </div>
          ))}
        </div>

        {impact.counts?.inProgress > 0 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            Đang có {impact.counts.inProgress} lượt làm bài dở.
          </p>
        ) : null}

        {impact.warnings?.length ? (
          <ul className="space-y-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
            {impact.warnings.map((warning) => (
              <li key={warning}>• {warning}</li>
            ))}
          </ul>
        ) : null}

        {impact.blocked ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            {impact.blockedReason}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <ConfirmDialog
      open={Boolean(target)}
      onClose={() => {
        if (!deleting) onClose?.();
      }}
      onConfirm={handleDelete}
      title={copy?.title}
      description={copy?.description(target?.item)}
      confirmLabel="Xoá vĩnh viễn"
      loading={deleting}
      confirmDisabled={impactLoading || Boolean(impact?.blocked)}
    >
      {renderImpact()}
    </ConfirmDialog>
  );
}
