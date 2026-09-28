import { FaInbox } from 'react-icons/fa6';

export default function EmptyState({ icon: Icon = FaInbox, title = 'Ma\'lumot topilmadi', message = 'Hozircha bu yerada ma\'lumotlar yo\'q', action = null }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="p-4 rounded-full bg-gray-100 text-gray-400 mb-4">
        <Icon className="text-4xl" />
      </div>
      <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
      <p className="text-sm text-gray-500 mt-1 text-center max-w-sm">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
