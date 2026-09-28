import { useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ICONS from '../../components/icons.jsx';
import { NOTIFICATION_TYPES } from '../../data/constants.js';
import { formatDate } from '../../utils/helpers.js';

const TYPE_CONFIG = {
  [NOTIFICATION_TYPES.INFO]: { color: 'blue', icon: ICONS.info },
  [NOTIFICATION_TYPES.SUCCESS]: { color: 'green', icon: ICONS.success },
  [NOTIFICATION_TYPES.WARNING]: { color: 'amber', icon: ICONS.warning },
  [NOTIFICATION_TYPES.ERROR]: { color: 'red', icon: ICONS.error },
  [NOTIFICATION_TYPES.TASK]: { color: 'purple', icon: ICONS.tasks },
  [NOTIFICATION_TYPES.REPORT]: { color: 'indigo', icon: ICONS.reports },
  [NOTIFICATION_TYPES.APPEAL]: { color: 'teal', icon: ICONS.appeals },
};

const BG_COLORS = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  teal: 'bg-teal-50 text-teal-600',
};

export default function NotificationsPage() {
  const { getNotifications, markNotificationRead, markAllRead, getUnreadCount } = useApp();
  const notifications = useMemo(() => getNotifications(), [getNotifications]);
  const unreadCount = getUnreadCount();

  return (
    <div>
      <PageHeader title="Bildirishnomalar" subtitle="Tizim bildirishnomalari va xabarnomalar" icon={ICONS.notifications}
        action={unreadCount > 0 ? <button onClick={markAllRead} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"><ICONS.check className="text-sm" /> Hammasini o'qildi</button> : null} />

      {notifications.length === 0 ? (
        <EmptyState icon={ICONS.notifications} title="Bildirishnomalar yo'q" message="Sizda hozircha bildirishnomalar mavjud emas" />
      ) : (
        <Card noPadding>
          <div className="divide-y divide-gray-100">
            {notifications.map(n => {
              const config = TYPE_CONFIG[n.type] || TYPE_CONFIG[NOTIFICATION_TYPES.INFO];
              const Icon = config.icon;
              const bgClass = BG_COLORS[config.color] || BG_COLORS.blue;
              return (
                <button
                  key={n.id}
                  onClick={() => markNotificationRead(n.id)}
                  className={`w-full text-left flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/30' : ''}`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${bgClass}`}>
                    <Icon className="text-sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${!n.read ? 'font-semibold text-gray-800' : 'font-medium text-gray-600'}`}>{n.title}</p>
                      {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(n.date)} {n.time}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
