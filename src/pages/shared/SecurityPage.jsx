import { useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import ICONS from '../../components/icons.jsx';
import { STORAGE_KEYS, ROLES } from '../../data/constants.js';
import { formatDateTime, getRelativeTime } from '../../utils/helpers.js';

export default function SecurityPage() {
  const { getCollection, getUsers, currentUser } = useApp();
  const users = useMemo(() => getUsers(), [getUsers]);
  const logs = useMemo(() => getCollection(STORAGE_KEYS.AUDIT_LOG), [getCollection]);

  const loginLogs = useMemo(() => logs.filter(l => l.action === 'login' || l.action === 'logout').slice(0, 20), [logs]);
  const activeUsers = users.filter(u => u.active !== false);
  const inactiveUsers = users.filter(u => u.active === false);
  const recentLogins = users.filter(u => u.lastLogin).sort((a, b) => new Date(b.lastLogin) - new Date(a.lastLogin)).slice(0, 5);

  return (
    <div>
      <PageHeader title="Xavfsizlik" subtitle="Tizim xavfsizligi va kirish nazorati" icon={ICONS.security} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Faol foydalanuvchilar" value={activeUsers.length} icon={ICONS.users} color="green" />
        <StatCard title="Nofaol foydalanuvchilar" value={inactiveUsers.length} icon={ICONS.users} color="red" />
        <StatCard title="Bugungi kirishlar" value={loginLogs.filter(l => l.action === 'login' && new Date(l.timestamp).toDateString() === new Date().toDateString()).length} icon={ICONS.security} color="blue" />
        <StatCard title="Audit yozuvlari" value={logs.length} icon={ICONS.audit} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Security recommendations */}
        <Card title="Xavfsizlik tavsiyalari">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50">
              <ICONS.success className="text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">Parol siyosati faol</p>
                <p className="text-xs text-green-600 mt-0.5">Minimum 6 belgidan iborat parol talab qilinadi</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50">
              <ICONS.warning className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Ikki omilli autentifikatsiya yoqilmagan</p>
                <p className="text-xs text-amber-600 mt-0.5">Xavfsizlikni oshirish uchun 2FA ni yoqish tavsiya etiladi</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50">
              <ICONS.info className="text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">Audit log yoqilgan</p>
                <p className="text-xs text-blue-600 mt-0.5">Barcha tizim amallari qayd etilmoqda</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50">
              <ICONS.security className="text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">Sessiya muddati: 60 daqiqa</p>
                <p className="text-xs text-blue-600 mt-0.5">Nofaollikdan keyin avtomatik chiqish</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Recent logins */}
        <Card title="So'nggi kirishlar">
          <div className="space-y-3">
            {recentLogins.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-xs">
                    {u.fullName?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{u.fullName}</p>
                    <p className="text-xs text-gray-400">{u.username}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge color="green">{getRelativeTime(u.lastLogin)}</Badge>
                  <p className="text-[10px] text-gray-400 mt-1">{u.lastLogin}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Login history */}
      <Card title="Kirish/chiqish tarixi" noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Sana / Vaqt</th>
                <th className="text-left px-4 py-3 font-medium">Foydalanuvchi</th>
                <th className="text-left px-4 py-3 font-medium">Amal</th>
                <th className="text-left px-4 py-3 font-medium">IP manzil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loginLogs.map(l => {
                const user = users.find(u => u.id === l.userId);
                return (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(l.timestamp)}</td>
                    <td className="px-4 py-3 text-gray-700">{user?.fullName || l.userId}</td>
                    <td className="px-4 py-3">
                      <Badge color={l.action === 'login' ? 'green' : 'gray'}>
                        {l.action === 'login' ? 'Kirildi' : 'Chiqildi'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{l.ipAddress}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
