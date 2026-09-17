import { useMemo, Fragment } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import ICONS from '../../components/icons.jsx';
import { ROLES, ROLE_LABELS, ROLE_COLORS, ROLE_PERMISSIONS, PERMISSIONS, avatarClass, badgeClass } from '../../data/constants.js';

const PERMISSION_GROUPS = {
  'Boshqaruv paneli': [PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.VIEW_ALL_REGIONS, PERMISSIONS.VIEW_OWN_REGION, PERMISSIONS.VIEW_OWN_DISTRICT, PERMISSIONS.VIEW_OWN_LIBRARY],
  'Kutubxonalar': [PERMISSIONS.MANAGE_LIBRARIES, PERMISSIONS.VIEW_LIBRARIES],
  'Kunlik faoliyat': [PERMISSIONS.CREATE_ACTIVITY, PERMISSIONS.VIEW_ACTIVITIES, PERMISSIONS.APPROVE_ACTIVITY],
  'Hisobotlar': [PERMISSIONS.CREATE_REPORT, PERMISSIONS.VIEW_REPORTS, PERMISSIONS.REVIEW_REPORT, PERMISSIONS.APPROVE_REPORT, PERMISSIONS.REJECT_REPORT],
  'Topshiriqlar': [PERMISSIONS.CREATE_TASK, PERMISSIONS.VIEW_TASKS, PERMISSIONS.ASSIGN_TASK, PERMISSIONS.COMPLETE_TASK],
  'Kitoblar': [PERMISSIONS.MANAGE_BOOKS, PERMISSIONS.VIEW_BOOKS],
  'Kitobxonlar': [PERMISSIONS.MANAGE_READERS, PERMISSIONS.VIEW_READERS],
  'Tadbirlar': [PERMISSIONS.MANAGE_EVENTS, PERMISSIONS.VIEW_EVENTS],
  'Inventarlar': [PERMISSIONS.MANAGE_INVENTORY, PERMISSIONS.VIEW_INVENTORY],
  'Hujjatlar': [PERMISSIONS.MANAGE_DOCUMENTS, PERMISSIONS.VIEW_DOCUMENTS],
  'Murojaatlar': [PERMISSIONS.MANAGE_APPEALS, PERMISSIONS.VIEW_APPEALS],
  'Bildirishnomalar': [PERMISSIONS.MANAGE_NOTIFICATIONS, PERMISSIONS.VIEW_NOTIFICATIONS],
  'KPI': [PERMISSIONS.VIEW_KPI, PERMISSIONS.MANAGE_KPI],
  'Statistika': [PERMISSIONS.VIEW_STATISTICS],
  'BI Analytics': [PERMISSIONS.VIEW_ANALYTICS],
  'Xarita': [PERMISSIONS.VIEW_MAP],
  'Foydalanuvchilar': [PERMISSIONS.MANAGE_USERS, PERMISSIONS.VIEW_USERS],
  'Rollar': [PERMISSIONS.MANAGE_ROLES],
  'Audit': [PERMISSIONS.VIEW_AUDIT],
  'Xavfsizlik': [PERMISSIONS.MANAGE_SECURITY],
  'Sozlamalar': [PERMISSIONS.MANAGE_SETTINGS],
};

const PERMISSION_LABELS = Object.fromEntries(
  Object.entries(PERMISSIONS).map(([k, v]) => [v, k.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')])
);

export default function RolesPage() {
  const { getUsers } = useApp();
  const users = useMemo(() => getUsers(), [getUsers]);

  return (
    <div>
      <PageHeader title="Rollar va Permissionlar" subtitle="Tizim rollari va ruxsat matritsasi" icon={ICONS.roles} />

      {/* Role cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {Object.entries(ROLE_LABELS).map(([role, label]) => {
          const perms = ROLE_PERMISSIONS[role] || [];
          const userCount = users.filter(u => u.role === role).length;
          return (
            <Card key={role}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full ${avatarClass(ROLE_COLORS[role])} flex items-center justify-center`}>
                  <ICONS.roles />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{label}</h3>
                  <p className="text-xs text-gray-400">{perms.length} ruxsatlar • {userCount} foydalanuvchi</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {perms.slice(0, 8).map(p => (
                  <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {PERMISSION_LABELS[p]}
                  </span>
                ))}
                {perms.length > 8 && <span className="text-[10px] px-2 py-0.5 text-gray-400">+{perms.length - 8} ta</span>}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Permission matrix */}
      <Card title="Ruxsat matritsasi" noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3 font-medium sticky left-0 bg-gray-50">Ruxsat</th>
                {Object.entries(ROLE_LABELS).map(([role, label]) => (
                  <th key={role} className="text-center px-3 py-3 font-medium">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${badgeClass(ROLE_COLORS[role])}`}>{label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
                <Fragment key={group}>
                  <tr className="bg-gray-50/50">
                    <td colSpan={7} className="px-4 py-2 font-semibold text-gray-700 text-xs uppercase">{group}</td>
                  </tr>
                  {perms.map(p => (
                    <tr key={p} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-600 text-xs">{PERMISSION_LABELS[p] || p}</td>
                      {Object.keys(ROLE_LABELS).map(role => {
                        const has = (ROLE_PERMISSIONS[role] || []).includes(p);
                        return (
                          <td key={role} className="text-center px-3 py-2">
                            {has ? <ICONS.check className="text-green-500 text-sm inline-block" /> : <ICONS.times className="text-gray-300 text-sm inline-block" />}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
