import { forwardRef } from 'react';
import { cx } from '../utils/format';

const Textarea = forwardRef(function Textarea({ className = '', invalid, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cx(
        'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50',
        invalid && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20',
        className
      )}
      {...props}
    />
  );
});

export default Textarea;
