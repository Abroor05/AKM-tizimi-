import { useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useNavigate } from 'react-router-dom';
import StatCard from '../../components/ui/StatCard.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import ICONS from '../../components/icons.jsx';
import { ROLES, ROLE_LABELS, STORAGE_KEYS, REPORT_STATUS, REPORT_STATUS_LABELS, REPORT_STATUS_COLORS, TASK_STATUS, TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '../../data/constants.js';
import { getViloyatName, getTumanName, VILOYATLAR } from '../../data/regions.js';
import { formatNumber, formatMoney, getRelativeTime } from '../../utils/helpers.js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Dashboard() {
  const { currentUser, getCollection, getReports, getTasks, getUsers } = useApp();
  const navigate = useNavigate();

  const role = currentUser?.role;
  const isSuperAdmin = role === ROLES.SUPER_ADMIN;
  const isViloyatAdmin = role === ROLES.VILOYAT_ADMIN;
  const isTumanAdmin = role === ROLES.TUMAN_ADMIN;
  const isXodimBoshligi = role === ROLES.XODIMLAR_BOSHLIGI;
  const isXodim = role === ROLES.KUTUBXONA_XODIMI;
  const isAdmin = isSuperAdmin || isViloyatAdmin || isTumanAdmin;

  // Get data
  const libraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES), [getCollection]);
  const books = useMemo(() => getCollection(STORAGE_KEYS.BOOKS), [getCollection]);
  const readers = useMemo(() => getCollection(STORAGE_KEYS.READERS), [getCollection]);
  const activities = useMemo(() => getCollection(STORAGE_KEYS.ACTIVITIES), [getCollection]);
  const reports = useMemo(() => getReports(), [getReports]);
  const tasks = useMemo(() => getTasks(), [getTasks]);
  const events = useMemo(() => getCollection(STORAGE_KEYS.EVENTS), [getCollection]);
  const appeals = useMemo(() => getCollection(STORAGE_KEYS.APPEALS), [getCollection]);

  // Filter data based on user's scope
  const scopedLibraries = useMemo(() => {
    if (isSuperAdmin) return libraries;
    if (isViloyatAdmin) return libraries.filter(l => l.viloyatId === currentUser.viloyatId);
    if (isTumanAdmin) return libraries.filter(l => l.viloyatId === currentUser.viloyatId && l.tumanId === currentUser.tumanId);
    if (isXodimBoshligi || isXodim) return libraries.filter(l => l.id === currentUser.libraryId);
    return libraries;
  }, [libraries, currentUser, isSuperAdmin, isViloyatAdmin, isTumanAdmin, isXodimBoshligi, isXodim]);

  const scopedReaders = useMemo(() => {
    if (isSuperAdmin) return readers;
    if (isViloyatAdmin) return readers.filter(r => {
      const lib = scopedLibraries.find(l => l.id === r.libraryId);
      return !!lib;
    });
    const libIds = scopedLibraries.map(l => l.id);
    return readers.filter(r => libIds.includes(r.libraryId));
  }, [readers, scopedLibraries, isSuperAdmin, isViloyatAdmin]);

  const scopedBooks = useMemo(() => {
    if (isSuperAdmin) return books;
    if (isViloyatAdmin) return books.filter(b => {
      const lib = scopedLibraries.find(l => l.id === b.libraryId);
      return !!lib;
    });
    const libIds = scopedLibraries.map(l => l.id);
    return books.filter(b => libIds.includes(b.libraryId));
  }, [books, scopedLibraries, isSuperAdmin, isViloyatAdmin]);

  const scopedReports = useMemo(() => {
    if (isSuperAdmin) return reports;
    if (isViloyatAdmin) return reports.filter(r => r.viloyatId === currentUser.viloyatId);
    if (isTumanAdmin) return reports.filter(r => r.viloyatId === currentUser.viloyatId && r.tumanId === currentUser.tumanId);
    if (isXodimBoshligi || isXodim) return reports.filter(r => r.libraryId === currentUser.libraryId || r.createdBy === currentUser.id);
    return reports;
  }, [reports, currentUser, isSuperAdmin, isViloyatAdmin, isTumanAdmin, isXodimBoshligi, isXodim]);

  const scopedTasks = useMemo(() => {
    if (isSuperAdmin || isViloyatAdmin) return tasks;
    if (isTumanAdmin) return tasks.filter(t => t.assignedBy === currentUser.id || t.assignedTo === currentUser.id);
    if (isXodimBoshligi) return tasks.filter(t =>
      t.assignedBy === currentUser.id ||
      t.assignedTo === currentUser.id ||
      t.libraryId === currentUser.libraryId
    );
    if (isXodim) return tasks.filter(t => t.assignedTo === currentUser.id);
    return tasks;
  }, [tasks, currentUser, isSuperAdmin, isViloyatAdmin, isXodimBoshligi, isXodim, isTumanAdmin]);

  // Calculate stats
  const pendingReports = scopedReports.filter(r => r.status === REPORT_STATUS.SUBMITTED || r.status === REPORT_STATUS.UNDER_REVIEW);
  const approvedReports = scopedReports.filter(r => r.status === REPORT_STATUS.APPROVED);
  const pendingTasks = scopedTasks.filter(t => t.status === TASK_STATUS.PENDING || t.status === TASK_STATUS.IN_PROGRESS);
  const overdueTasks = scopedTasks.filter(t => t.status === TASK_STATUS.OVERDUE);
  const newAppeals = appeals.filter(a => a.status === 'new');
  const upcomingEvents = events.filter(e => e.status === 'upcoming');

  // Users for admin
  const allUsers = useMemo(() => getUsers(), [getUsers]);
  const scopedUsers = useMemo(() => {
    if (isSuperAdmin) return allUsers;
    if (isViloyatAdmin) return allUsers.filter(u => u.viloyatId === currentUser?.viloyatId);
    if (isTumanAdmin) return allUsers.filter(u => u.viloyatId === currentUser?.viloyatId && u.tumanId === currentUser?.tumanId);
    return allUsers.filter(u => u.libraryId === currentUser?.libraryId);
  }, [allUsers, currentUser, isSuperAdmin, isViloyatAdmin, isTumanAdmin]);

  // Chart data: Monthly visitors trend
  const visitorsTrend = useMemo(() => {
    const months = ['May', 'Iyun', 'Iyul', 'Avg', 'Sen'];
    return months.map((month, i) => ({
      name: month,
      tashrif: 300 + Math.floor(Math.random() * 300) + i * 50,
      kitobxon: 20 + Math.floor(Math.random() * 40) + i * 8,
    }));
  }, []);

  // Chart data: Report status distribution (for admins)
  const reportStatusData = useMemo(() => {
    const counts = {
      [REPORT_STATUS.APPROVED]: { name: 'Tasdiqlangan', value: 0, color: '#10b981' },
      [REPORT_STATUS.SUBMITTED]: { name: 'Yuborilgan', value: 0, color: '#3b82f6' },
      [REPORT_STATUS.UNDER_REVIEW]: { name: 'Ko\'rib chiqilmoqda', value: 0, color: '#f59e0b' },
      [REPORT_STATUS.REJECTED]: { name: 'Rad etilgan', value: 0, color: '#ef4444' },
      [REPORT_STATUS.DRAFT]: { name: 'Qoralama', value: 0, color: '#94a3b8' },
    };
    scopedReports.forEach(r => {
      if (counts[r.status]) counts[r.status].value++;
    });
    const list = Object.values(counts).filter(c => c.value > 0);
    return list.length > 0 ? list : [{ name: 'Hisobotlar yo\'q', value: 1, color: '#cbd5e1' }];
  }, [scopedReports]);

  // Chart data: Book categories distribution
  const bookCategories = useMemo(() => {
    const cats = {};
    scopedBooks.forEach(b => {
      cats[b.category] = (cats[b.category] || 0) + 1;
    });
    return Object.entries(cats).map(([key, val]) => ({
      name: key,
      value: val,
    })).slice(0, 6);
  }, [scopedBooks]);

  // Chart data: Libraries by viloyat
  const librariesByViloyat = useMemo(() => {
    if (!isSuperAdmin && !isViloyatAdmin) return [];
    const counts = {};
    libraries.forEach(l => {
      counts[l.viloyatId] = (counts[l.viloyatId] || 0) + 1;
    });
    return Object.entries(counts).map(([vid, count]) => ({
      name: getViloyatName(vid)?.replace(' viloyati', '').replace(' shahri', '') || vid,
      kutubxona: count,
    }));
  }, [libraries, isSuperAdmin, isViloyatAdmin]);

  // Recent reports
  const recentReports = useMemo(() => [...scopedReports].sort((a, b) =>
    new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt)
  ).slice(0, 5), [scopedReports]);

  // Recent tasks
  const myTasks = useMemo(() => [...scopedTasks].sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  ).slice(0, 5), [scopedTasks]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Xayrli tong";
    if (h < 18) return "Xayrli kun";
    return "Xayrli kech";
  };

  return (
    <div>
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold">{greeting()}, {currentUser?.fullName}!</h2>
            <p className="text-blue-200 mt-1">
              {ROLE_LABELS[role]} • {currentUser?.viloyatId ? getViloyatName(currentUser.viloyatId) : "O'zbekiston Respublikasi"}
              {currentUser?.tumanId ? ' / ' + getTumanName(currentUser.viloyatId, currentUser.tumanId) : ''}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white/10 rounded-lg px-4 py-2 text-center">
              <p className="text-2xl font-bold">{new Date().getDate()}</p>
              <p className="text-xs text-blue-200">{new Date().toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Kutubxonalar"
          value={formatNumber(scopedLibraries.length)}
          icon={ICONS.library}
          color="blue"
          subtitle="Jami filiallar"
        />
        {isAdmin ? (
          <>
            <StatCard
              title="Xodimlar"
              value={formatNumber(scopedUsers.length)}
              icon={ICONS.users}
              color="teal"
              subtitle="Faol xodimlar"
            />
            <StatCard
              title="Hisobotlar"
              value={formatNumber(scopedReports.length)}
              icon={ICONS.reports}
              color="purple"
              subtitle={`${pendingReports.length} kutilmoqda`}
            />
            <StatCard
              title="Topshiriqlar"
              value={formatNumber(scopedTasks.length)}
              icon={ICONS.tasks}
              color="amber"
              subtitle={`${pendingTasks.length} ijroda`}
            />
          </>
        ) : (
          <>
            <StatCard
              title="Kitobxonlar"
              value={formatNumber(scopedReaders.length)}
              icon={ICONS.readers}
              color="green"
              subtitle="Faol kitobxonlar"
            />
            <StatCard
              title="Kitob fondi"
              value={formatNumber(scopedBooks.length)}
              icon={ICONS.books}
              color="amber"
              subtitle="Jami nusxalar"
            />
            <StatCard
              title="Hisobotlar"
              value={formatNumber(scopedReports.length)}
              icon={ICONS.reports}
              color="purple"
              subtitle={`${pendingReports.length} kutilmoqda`}
            />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Visitors trend */}
        <Card title="Tashriflar dinamikasi (oylar bo'yicha)">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={visitorsTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="tashrif" stroke="#3b82f6" strokeWidth={2} name="Tashriflar" />
              <Line type="monotone" dataKey="kitobxon" stroke="#10b981" strokeWidth={2} name="Faolliklar" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Right chart: Admin gets Report Status, Xodim gets Book categories */}
        {isAdmin ? (
          <Card title="Hisobotlar holati taqsimoti">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={reportStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {reportStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        ) : (
          <Card title="Kitob fondi kategoriyalar bo'yicha">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={bookCategories}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {bookCategories.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* Libraries by viloyat (only for super admin / viloyat admin) */}
      {(isSuperAdmin || isViloyatAdmin) && librariesByViloyat.length > 0 && (
        <div className="mb-6">
          <Card title="Kutubxonalar viloyatlar bo'yicha">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={librariesByViloyat}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="kutubxona" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Kutubxonalar" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Quick stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Kutilayotgan topshiriqlar" value={pendingTasks.length} icon={ICONS.tasks} color="amber" />
        <StatCard title="Yangi murojaatlar" value={newAppeals.length} icon={ICONS.appeals} color="red" />
        <StatCard title="Yakunlangan hisobotlar" value={approvedReports.length} icon={ICONS.success} color="green" />
        <StatCard title="Yaqin tadbirlar" value={upcomingEvents.length} icon={ICONS.events} color="indigo" />
      </div>

      {/* Recent reports & tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent reports */}
        <Card
          title="So'nggi hisobotlar"
          action={
            <button onClick={() => navigate('/reports')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Barchasi
            </button>
          }
        >
          <div className="space-y-3">
            {recentReports.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Hisobotlar yo'q</p>
            ) : (
              recentReports.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-700 truncate">{r.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {r.submittedAt || 'Qoralama'} • {r.period}
                    </p>
                  </div>
                  <Badge color={REPORT_STATUS_COLORS[r.status] || 'gray'}>
                    {REPORT_STATUS_LABELS[r.status]}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent tasks */}
        <Card
          title="Topshiriqlar"
          action={
            <button onClick={() => navigate('/tasks')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Barchasi
            </button>
          }
        >
          <div className="space-y-3">
            {myTasks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Topshiriqlar yo'q</p>
            ) : (
              myTasks.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-700 truncate">{t.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Muddat: {t.dueDate} • {getRelativeTime(t.createdAt)}
                    </p>
                  </div>
                  <Badge color={TASK_STATUS_COLORS[t.status] || 'gray'}>
                    {TASK_STATUS_LABELS[t.status]}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
