import { forwardRef } from 'react';
import { cx } from '../utils/format';
import { inputBaseClass, hasWidthClass } from './Input';

const Select = forwardRef(function Select({ className = '', invalid, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cx(
        inputBaseClass,
        !hasWidthClass(className) && 'w-full',
        'cursor-pointer pr-9',
        invalid && 'border-rose-400',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export default Select;
