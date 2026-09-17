import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ICONS from '../../components/icons.jsx';
import { STORAGE_KEYS } from '../../data/constants.js';
import { formatDateTime, getRelativeTime } from '../../utils/helpers.js';

const ACTION_COLORS = {
  login: 'blue',
  logout: 'gray',
  create: 'green',
  update: 'amber',
  delete: 'red',
  review: 'purple',
  submit: 'indigo',
  approve: 'green',
  reject: 'red',
  reset_password: 'amber',
  update_status: 'blue',
};

const MODULE_LABELS = {
  auth: 'Autentifikatsiya',
  users: 'Foydalanuvchilar',
  reports: 'Hisobotlar',
  tasks: 'Topshiriqlar',
  activities: 'Faoliyat',
  books: 'Kitoblar',
  readers: 'Kitobxonlar',
  events: 'Tadbirlar',
  inventory: 'Inventarlar',
  documents: 'Hujjatlar',
  appeals: 'Murojaatlar',
  notifications: 'Bildirishnomalar',
  kpi: 'KPI',
  settings: 'Sozlamalar',
  unknown: 'Boshqa',
};

export default function AuditPage() {
  const { getCollection, getUsers } = useApp();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');

  const logs = useMemo(() => getCollection(STORAGE_KEYS.AUDIT_LOG), [getCollection]);
  const users = useMemo(() => getUsers(), [getUsers]);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      const matchSearch = !search || l.details?.toLowerCase().includes(search.toLowerCase());
      const matchAction = !actionFilter || l.action === actionFilter;
      const matchModule = !moduleFilter || l.module === moduleFilter;
      return matchSearch && matchAction && matchModule;
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [logs, search, actionFilter, moduleFilter]);

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user?.fullName || userId || 'Tizim';
  };

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Tizim faoliyati jurnali va amallar tarixi" icon={ICONS.audit} />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <ICONS.search className="absolute left-3 top-3 text-gray-400" />
          <input type="text" placeholder="Tafsilot bo'yicha qidirish..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white">
          <option value="">Barcha amallar</option>
          {[...new Set(logs.map(l => l.action))].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white">
          <option value="">Barcha modullar</option>
          {Object.entries(MODULE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ICONS.audit} title="Audit yozuvlari topilmadi" />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Sana / Vaqt</th>
                  <th className="text-left px-4 py-3 font-medium">Foydalanuvchi</th>
                  <th className="text-left px-4 py-3 font-medium">Modul</th>
                  <th className="text-left px-4 py-3 font-medium">Amal</th>
                  <th className="text-left px-4 py-3 font-medium">Tafsilot</th>
                  <th className="text-left px-4 py-3 font-medium">IP manzil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      <div>{formatDateTime(l.timestamp)}</div>
                      <div className="text-[10px] text-gray-400">{getRelativeTime(l.timestamp)}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{getUserName(l.userId)}</td>
                    <td className="px-4 py-3"><span className="text-gray-600">{MODULE_LABELS[l.module] || l.module}</span></td>
                    <td className="px-4 py-3"><Badge color={ACTION_COLORS[l.action] || 'gray'}>{l.action}</Badge></td>
                    <td className="px-4 py-3 text-gray-600">{l.details}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{l.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
