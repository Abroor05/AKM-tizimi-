import { useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import ICONS from '../../components/icons.jsx';
import { STORAGE_KEYS, ROLES } from '../../data/constants.js';
import { formatNumber, formatMoney } from '../../utils/helpers.js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area,
} from 'recharts';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function StatisticsPage() {
  const { currentUser, getCollection, isRole } = useApp();
  const libraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES), [getCollection]);
  const books = useMemo(() => getCollection(STORAGE_KEYS.BOOKS), [getCollection]);
  const readers = useMemo(() => getCollection(STORAGE_KEYS.READERS), [getCollection]);
  const activities = useMemo(() => getCollection(STORAGE_KEYS.ACTIVITIES), [getCollection]);
  const events = useMemo(() => getCollection(STORAGE_KEYS.EVENTS), [getCollection]);
  const reports = useMemo(() => getCollection(STORAGE_KEYS.REPORTS), [getCollection]);

  const scopedLibIds = useMemo(() => {
    if (isRole(ROLES.SUPER_ADMIN, ROLES.VILOYAT_ADMIN)) return libraries.map(l => l.id);
    if (isRole(ROLES.VILOYAT_ADMIN)) return libraries.filter(l => l.viloyatId === currentUser.viloyatId).map(l => l.id);
    return libraries.filter(l => l.viloyatId === currentUser.viloyatId && l.tumanId === currentUser.tumanId).map(l => l.id);
  }, [libraries, currentUser, isRole]);

  const scopedBooks = books.filter(b => scopedLibIds.includes(b.libraryId));
  const scopedReaders = readers.filter(r => scopedLibIds.includes(r.libraryId));
  const scopedActivities = activities.filter(a => scopedLibIds.includes(a.libraryId));
  const scopedEvents = events.filter(e => scopedLibIds.includes(e.libraryId));

  // Monthly activity trend
  const monthlyTrend = useMemo(() => {
    const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen'];
    return months.map((m, i) => ({
      name: m,
      tashrif: 200 + Math.floor(Math.random() * 400) + i * 30,
      kitobxon: 15 + Math.floor(Math.random() * 40) + i * 5,
      tadbir: Math.floor(Math.random() * 8) + 1,
    }));
  }, []);

  // Activity type distribution
  const activityTypes = useMemo(() => {
    const types = {};
    scopedActivities.forEach(a => { types[a.type] = (types[a.type] || 0) + 1; });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [scopedActivities]);

  // Library comparison
  const libComparison = useMemo(() => {
    return libraries.filter(l => scopedLibIds.includes(l.id)).map(l => ({
      name: l.name.length > 15 ? l.name.slice(0, 15) + '...' : l.name,
      kitoblar: books.filter(b => b.libraryId === l.id).length,
      kitobxonlar: readers.filter(r => r.libraryId === l.id).length,
    }));
  }, [libraries, books, readers, scopedLibIds]);

  return (
    <div>
      <PageHeader title="Statistika" subtitle="Kutubxona faoliyati statistik ko'rsatkichlari" icon={ICONS.statistics} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Jami tashriflar" value={formatNumber(scopedActivities.length)} icon={ICONS.activity} color="blue" trend={12} />
        <StatCard title="Faol kitobxonlar" value={formatNumber(scopedReaders.length)} icon={ICONS.readers} color="green" trend={8} />
        <StatCard title="Kitob fondi" value={formatNumber(scopedBooks.length)} icon={ICONS.books} color="amber" trend={5} />
        <StatCard title="Tadbirlar" value={formatNumber(scopedEvents.length)} icon={ICONS.events} color="indigo" trend={3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card title="Oylik faoliyat dinamikasi">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="tashrif" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Tashriflar" />
              <Area type="monotone" dataKey="kitobxon" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="Yangi kitobxonlar" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Faoliyat turlari bo'yicha taqsimot">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={activityTypes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                {activityTypes.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {libComparison.length > 0 && (
        <Card title="Kutubxonalar solishtirma" className="mb-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={libComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="kitoblar" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Kitoblar" />
              <Bar dataKey="kitobxonlar" fill="#10b981" radius={[4, 4, 0, 0]} name="Kitobxonlar" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Hisobotlar holati">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Tasdiqlangan', value: reports.filter(r => r.status === 'approved').length },
                  { name: 'Kutilmoqda', value: reports.filter(r => r.status === 'submitted' || r.status === 'under_review').length },
                  { name: 'Qoralama', value: reports.filter(r => r.status === 'draft').length },
                  { name: 'Rad etilgan', value: reports.filter(r => r.status === 'rejected').length },
                ]}
                dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                {[0,1,2,3].map(i => <Cell key={i} fill={['#10b981', '#f59e0b', '#9ca3af', '#ef4444'][i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Tadbirlar o'sishi">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="tadbir" stroke="#8b5cf6" strokeWidth={2} name="Tadbirlar" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
