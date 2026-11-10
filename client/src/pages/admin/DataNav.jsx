import { NavLink } from 'react-router-dom';
import { BookOpen, ClipboardList, UserRound } from 'lucide-react';

const ITEMS = [
  { to: '/admin/data/classes', label: 'Lớp học', icon: BookOpen },
  { to: '/admin/data/students', label: 'Học sinh', icon: UserRound },
  { to: '/admin/data/exams', label: 'Đề thi', icon: ClipboardList },
];

export default function DataNav() {
  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        );
      })}
    </div>
  );
}
