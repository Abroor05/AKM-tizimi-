import { useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import ICONS from '../../components/icons.jsx';
import { STORAGE_KEYS, ROLES } from '../../data/constants.js';
import { formatNumber, formatMoney, percentage } from '../../utils/helpers.js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PolarAngleAxis, ComposedChart, Line, Area, Legend,
} from 'recharts';

export default function AnalyticsPage() {
  const { currentUser, getCollection, isRole } = useApp();
  const libraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES), [getCollection]);
  const activities = useMemo(() => getCollection(STORAGE_KEYS.ACTIVITIES), [getCollection]);
  const reports = useMemo(() => getCollection(STORAGE_KEYS.REPORTS), [getCollection]);
  const tasks = useMemo(() => getCollection(STORAGE_KEYS.TASKS), [getCollection]);

  const scopedLibIds = useMemo(() => {
    if (isRole(ROLES.SUPER_ADMIN)) return libraries.map(l => l.id);
    if (isRole(ROLES.VILOYAT_ADMIN)) return libraries.filter(l => l.viloyatId === currentUser.viloyatId).map(l => l.id);
    return libraries.filter(l => l.viloyatId === currentUser.viloyatId && l.tumanId === currentUser.tumanId).map(l => l.id);
  }, [libraries, currentUser, isRole]);

  const scopedActivities = activities.filter(a => scopedLibIds.includes(a.libraryId));
  const scopedReports = reports.filter(r => scopedLibIds.includes(r.libraryId));
  const scopedTasks = tasks.filter(t => scopedLibIds.includes(t.libraryId));

  // BI metrics
  const avgActivitiesPerLibrary = scopedLibIds.length > 0 ? Math.round(scopedActivities.length / scopedLibIds.length) : 0;
  const avgReportsPerLibrary = scopedLibIds.length > 0 ? Math.round(scopedReports.length / scopedLibIds.length) : 0;
  const avgTasksPerLibrary = scopedLibIds.length > 0 ? Math.round(scopedTasks.length / scopedLibIds.length) : 0;
  const reportGrowthRate = 18;
  const taskEfficiencyRate = 24;

  // Performance by library
  const libPerformance = useMemo(() => {
    return libraries.filter(l => scopedLibIds.includes(l.id)).map(l => {
      const libReports = reports.filter(r => r.libraryId === l.id).length;
      const libTasks = tasks.filter(t => t.libraryId === l.id).length;
      const libActivities = activities.filter(a => a.libraryId === l.id).length;
      return {
        name: l.name.length > 12 ? l.name.slice(0, 12) + '...' : l.name,
        hisobotlar: libReports,
        topshiriqlar: libTasks,
        faollik: libActivities,
      };
    });
  }, [libraries, reports, tasks, activities, scopedLibIds]);

  // Growth comparison
  const growthData = useMemo(() => {
    const months = ['May', 'Iyun', 'Iyul', 'Avg', 'Sen'];
    return months.map((m, i) => ({
      name: m,
      hisobot: 15 + i * 5 + Math.floor(Math.random() * 6),
      topshiriq: 20 + i * 6 + Math.floor(Math.random() * 8),
      faollik: 150 + i * 25 + Math.floor(Math.random() * 50),
    }));
  }, []);

  // Efficiency radar-like data
  const efficiencyData = [
    { name: 'Xizmat sifati', value: 87, fill: '#3b82f6' },
    { name: 'Ijro intizomi', value: 82, fill: '#10b981' },
    { name: 'Hisobotlar tezkorligi', value: 92, fill: '#f59e0b' },
    { name: 'Tadbirlar samaradorligi', value: 80, fill: '#8b5cf6' },
    { name: 'Raqamlashtirish', value: 75, fill: '#ef4444' },
  ];

  return (
    <div>
      <PageHeader title="BI Analytics" subtitle="Biznes-tahlil va qiyosiy ko'rsatkichlar" icon={ICONS.analytics} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="O'rtacha faoliyat/Kutubxona" value={formatNumber(avgActivitiesPerLibrary)} icon={ICONS.activity} color="blue" trend={12} />
        <StatCard title="O'rtacha hisobot/Kutubxona" value={formatNumber(avgReportsPerLibrary)} icon={ICONS.reports} color="purple" trend={8} />
        <StatCard title="O'rtacha topshiriq/Kutubxona" value={formatNumber(avgTasksPerLibrary)} icon={ICONS.tasks} color="amber" trend={15} />
        <StatCard title="Faollik indeksi" value={Math.round((avgActivitiesPerLibrary + avgReportsPerLibrary * 5 + avgTasksPerLibrary * 3) / 9)} icon={ICONS.analytics} color="indigo" trend={10} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card title="Kutubxonalar samaradorligi" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={libPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="hisobotlar" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Hisobotlar" />
              <Bar dataKey="topshiriqlar" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Topshiriqlar" />
              <Line type="monotone" dataKey="faollik" stroke="#3b82f6" strokeWidth={2} name="Faollik" />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Samaradorlik radial">
          <ResponsiveContainer width="100%" height={300}>
            <RadialBarChart innerRadius="20%" outerRadius="90%" data={efficiencyData} startAngle={90} endAngle={-270}>
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar background dataKey="value" cornerRadius={6} />
              <Tooltip />
              <Legend iconSize={8} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '10px' }} />
            </RadialBarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="O'sish dinamikasi (ko'p o'lchovli)" className="mb-6">
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={growthData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="hisobot" fill="#8b5cf6" fillOpacity={0.3} stroke="#8b5cf6" name="Hisobotlar" />
            <Bar dataKey="topshiriq" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Topshiriqlar" />
            <Line type="monotone" dataKey="faollik" stroke="#3b82f6" strokeWidth={2} name="Faollik" />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="text-center p-4">
          <p className="text-3xl font-bold text-green-600">+{reportGrowthRate}%</p>
          <p className="text-sm text-gray-500 mt-1">Hisobotlar intizomi</p>
        </Card>
        <Card className="text-center p-4">
          <p className="text-3xl font-bold text-blue-600">+{taskEfficiencyRate}%</p>
          <p className="text-sm text-gray-500 mt-1">Topshiriqlar ijrosi</p>
        </Card>
        <Card className="text-center p-4">
          <p className="text-3xl font-bold text-amber-600">87%</p>
          <p className="text-sm text-gray-500 mt-1">Mamnunlik darajasi</p>
        </Card>
        <Card className="text-center p-4">
          <p className="text-3xl font-bold text-purple-600">96%</p>
          <p className="text-sm text-gray-500 mt-1">Vaqtida bajarilgan topshiriqlar</p>
        </Card>
      </div>
    </div>
  );
}
