import { forwardRef } from 'react';
import { cx } from '../utils/format';

export const inputBaseClass =
  'h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

const widthClassPattern = /(^|\s)(w-|flex-1|grow|basis-)/;

export function hasWidthClass(className = '') {
  return widthClassPattern.test(className);
}

const Input = forwardRef(function Input({ className = '', invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cx(
        inputBaseClass,
        !hasWidthClass(className) && 'w-full',
        invalid && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20',
        className
      )}
      {...props}
    />
  );
});

export default Input;
