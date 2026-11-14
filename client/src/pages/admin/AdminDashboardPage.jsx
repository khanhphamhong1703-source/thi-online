import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  RefreshCcw,
  UserRound,
  Users,
} from 'lucide-react';
import { adminDataApi } from '../../api/adminData';
import { activityApi } from '../../api/activity';
import { getErrorMessage } from '../../api/client';
import { formatDateTime } from '../../utils/format';
import { ACTIVITY_STATUS, describeActivityData, getActionLabel } from '../../utils/activity';
import PageHeader from '../../components/PageHeader';
import LoadingState from '../../components/LoadingState';
import Badge from '../../components/Badge';

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([adminDataApi.summary(), activityApi.adminList({ page: 1, limit: 5 })])
      .then(([summaryResponse, activityResponse]) => {
        if (!active) return;
        setSummary(summaryResponse.data.data);
        setActivity(activityResponse.data.data || []);
      })
      .catch((apiError) => {
        if (!active) return;
        setError(getErrorMessage(apiError, 'Không tải được tổng quan'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  if (loading && !summary) {
    return <LoadingState label="Đang tải tổng quan quản trị..." />;
  }

  const cards = [
    {
      to: '/admin/teachers',
      icon: Users,
      tone: 'bg-blue-50 text-blue-600',
      label: 'Giáo viên',
      value: summary?.teachers.total,
      hint: `${summary?.teachers.locked ?? 0} tài khoản đã khoá`,
    },
    {
      to: '/admin/data/classes',
      icon: BookOpen,
      tone: 'bg-amber-50 text-amber-600',
      label: 'Lớp học',
      value: summary?.classes.total,
      hint: `${summary?.classes.archived ?? 0} lớp đã lưu trữ`,
    },
    {
      to: '/admin/data/students',
      icon: UserRound,
      tone: 'bg-emerald-50 text-emerald-600',
      label: 'Học sinh',
      value: summary?.students.total,
      hint: `${summary?.attempts.total ?? 0} lượt thi toàn hệ thống`,
    },
    {
      to: '/admin/data/exams',
      icon: ClipboardList,
      tone: 'bg-violet-50 text-violet-600',
      label: 'Đề thi',
      value: summary?.exams.total,
      hint: `${summary?.exams.open ?? 0} đề đang mở`,
    },
  ];

  return (
    <div>
      <PageHeader title="Tổng quan" />

      {error ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>{error}</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 font-semibold"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            <RefreshCcw className="h-3.5 w-3.5" /> Thử lại
          </button>
        </div>
      ) : null}

      <section>
        <div className="mb-2">
          <h2 className="text-sm font-semibold text-slate-900">Toàn hệ thống</h2>
          <p className="text-xs text-slate-500">Chọn một mục để mở khu vực quản lý tương ứng.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.to}
                to={card.to}
                className="surface group flex items-start gap-3 p-4 transition hover:border-brand-200 hover:shadow-md"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.tone}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-slate-500">{card.label}</p>
                  <p className="text-2xl font-bold leading-tight text-slate-900">
                    {card.value ?? '—'}
                  </p>
                  <p className="hidden truncate text-[11px] text-slate-500 sm:block">
                    {card.hint}
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="surface mt-6 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Hoạt động gần đây</h2>
            <p className="mt-0.5 text-xs text-slate-500">5 thao tác mới nhất của giáo viên</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="focus-ring rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              title="Làm mới hoạt động"
              aria-label="Làm mới hoạt động gần đây"
            >
              <RefreshCcw className="h-4 w-4" />
            </button>
            <Link
              to="/admin/activity"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Xem tất cả <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {activity.length ? (
          <ul className="divide-y divide-slate-100">
            {activity.map((log) => {
              const statusMeta = ACTIVITY_STATUS[log.status] || ACTIVITY_STATUS.SUCCESS;
              const description = describeActivityData(log);
              return (
                <li key={log.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800">
                      <span className="font-semibold text-slate-900">{log.actorFullName}</span>
                      {' · '}
                      {getActionLabel(log.action)}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {description || `@${log.actorUsername}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {formatDateTime(log.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            Chưa có hoạt động nào được ghi nhận.
          </div>
        )}
      </section>

    </div>
  );
}
