import { Search } from 'lucide-react';
import { inputBaseClass } from './Input';

export default function SearchInput({ value, onChange, placeholder = 'Tìm kiếm...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${inputBaseClass} w-full pl-9`}
        aria-label={placeholder}
      />
    </div>
  );
}
