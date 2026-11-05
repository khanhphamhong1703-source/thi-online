import { cx } from '../utils/format';

const VARIANTS = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  locked: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  info: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  new: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  existing: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  skipped: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  invalid: 'bg-rose-50 text-rose-700 ring-rose-600/20',
};

export default function Badge({ children, variant = 'neutral', className = '' }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        VARIANTS[variant] || VARIANTS.neutral,
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ active }) {
  return (
    <Badge variant={active ? 'active' : 'locked'}>
      <span
        className={cx('h-1.5 w-1.5 rounded-full', active ? 'bg-emerald-500' : 'bg-rose-500')}
      />
      {active ? 'Đang hoạt động' : 'Đã khóa'}
    </Badge>
  );
}
