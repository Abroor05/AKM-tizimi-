import { FaInbox } from 'react-icons/fa6';

export default function EmptyState({
  icon: Icon = FaInbox,
  title = "Ma'lumot topilmadi",
  message = "Hozircha bu bo'limda ma'lumotlar mavjud emas",
  action = null,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <div className="p-4 rounded-2xl bg-slate-100/80 border border-slate-200/60 text-slate-400 mb-4 shadow-xs">
        <Icon className="text-3xl" />
      </div>
      <h3 className="text-base font-bold text-slate-800 tracking-tight">{title}</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
