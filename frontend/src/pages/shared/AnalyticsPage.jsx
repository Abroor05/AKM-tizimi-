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
  const books = useMemo(() => getCollection(STORAGE_KEYS.BOOKS), [getCollection]);
  const readers = useMemo(() => getCollection(STORAGE_KEYS.READERS), [getCollection]);
  const activities = useMemo(() => getCollection(STORAGE_KEYS.ACTIVITIES), [getCollection]);
  const reports = useMemo(() => getCollection(STORAGE_KEYS.REPORTS), [getCollection]);

  const scopedLibIds = useMemo(() => {
    if (isRole(ROLES.SUPER_ADMIN, ROLES.VILOYAT_ADMIN)) return libraries.map(l => l.id);
    if (isRole(ROLES.VILOYAT_ADMIN)) return libraries.filter(l => l.viloyatId === currentUser.viloyatId).map(l => l.id);
    return libraries.filter(l => l.viloyatId === currentUser.viloyatId && l.tumanId === currentUser.tumanId).map(l => l.id);
  }, [libraries, currentUser, isRole]);

  const scopedBooks = books.filter(b => scopedLibIds.includes(b.libraryId));
  const scopedReaders = readers.filter(r => scopedLibIds.includes(r.libraryId));
  const scopedActivities = activities.filter(a => scopedLibIds.includes(a.libraryId));

  // BI metrics
  const avgVisitorsPerLibrary = scopedLibIds.length > 0 ? Math.round(scopedActivities.length / scopedLibIds.length) : 0;
  const avgBooksPerLibrary = scopedLibIds.length > 0 ? Math.round(scopedBooks.length / scopedLibIds.length) : 0;
  const avgReadersPerLibrary = scopedLibIds.length > 0 ? Math.round(scopedReaders.length / scopedLibIds.length) : 0;
  const readerGrowthRate = 15; // mock
  const fundGrowthRate = 8; // mock

  // Performance by library
  const libPerformance = useMemo(() => {
    return libraries.filter(l => scopedLibIds.includes(l.id)).map(l => {
      const libBooks = books.filter(b => b.libraryId === l.id).length;
      const libReaders = readers.filter(r => r.libraryId === l.id).length;
      const libActivities = activities.filter(a => a.libraryId === l.id).length;
      return {
        name: l.name.length > 12 ? l.name.slice(0, 12) + '...' : l.name,
        kitoblar: libBooks,
        kitobxonlar: libReaders,
        faollik: libActivities,
      };
    });
  }, [libraries, books, readers, activities, scopedLibIds]);

  // Growth comparison
  const growthData = useMemo(() => {
    const months = ['May', 'Iyun', 'Iyul', 'Avg', 'Sen'];
    return months.map((m, i) => ({
      name: m,
      kitobxon: 100 + i * 20 + Math.floor(Math.random() * 30),
      kitob: 200 + i * 35 + Math.floor(Math.random() * 40),
      faollik: 150 + i * 25 + Math.floor(Math.random() * 50),
    }));
  }, []);

  // Efficiency radar-like data
  const efficiencyData = [
    { name: 'Xizmat sifati', value: 87, fill: '#3b82f6' },
    { name: 'Fond o\'sishi', value: 75, fill: '#10b981' },
    { name: 'Kitobxonlar', value: 92, fill: '#f59e0b' },
    { name: 'Tadbirlar', value: 80, fill: '#8b5cf6' },
    { name: 'Raqamlashtirish', value: 65, fill: '#ef4444' },
  ];

  return (
    <div>
      <PageHeader title="BI Analytics" subtitle="Biznes-tahlil va qiyosiy ko'rsatkichlar" icon={ICONS.analytics} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="O'rtacha tashrif/Kutubxona" value={formatNumber(avgVisitorsPerLibrary)} icon={ICONS.activity} color="blue" trend={12} />
        <StatCard title="O'rtacha kitob/Kutubxona" value={formatNumber(avgBooksPerLibrary)} icon={ICONS.books} color="amber" trend={8} />
        <StatCard title="O'rtacha kitobxon/Kutubxona" value={formatNumber(avgReadersPerLibrary)} icon={ICONS.readers} color="green" trend={15} />
        <StatCard title="Faollik ko'rsatkichi" value={Math.round((avgVisitorsPerLibrary + avgBooksPerLibrary + avgReadersPerLibrary) / 3)} icon={ICONS.analytics} color="purple" trend={10} />
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
              <Bar dataKey="kitoblar" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Kitoblar" />
              <Bar dataKey="kitobxonlar" fill="#10b981" radius={[4, 4, 0, 0]} name="Kitobxonlar" />
              <Line type="monotone" dataKey="faollik" stroke="#f59e0b" strokeWidth={2} name="Faollik" />
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
            <Area type="monotone" dataKey="kitobxon" fill="#10b981" fillOpacity={0.3} stroke="#10b981" name="Kitobxonlar" />
            <Bar dataKey="kitob" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Kitoblar" />
            <Line type="monotone" dataKey="faollik" stroke="#f59e0b" strokeWidth={2} name="Faollik" />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="text-center p-4">
          <p className="text-3xl font-bold text-green-600">+{readerGrowthRate}%</p>
          <p className="text-sm text-gray-500 mt-1">Kitobxonlar o'sishi</p>
        </Card>
        <Card className="text-center p-4">
          <p className="text-3xl font-bold text-blue-600">+{fundGrowthRate}%</p>
          <p className="text-sm text-gray-500 mt-1">Fond o'sishi</p>
        </Card>
        <Card className="text-center p-4">
          <p className="text-3xl font-bold text-amber-600">87%</p>
          <p className="text-sm text-gray-500 mt-1">Mamnunlik darajasi</p>
        </Card>
        <Card className="text-center p-4">
          <p className="text-3xl font-bold text-purple-600">{percentage(scopedReaders.filter(r => r.borrowedCount > 0).length, scopedReaders.length)}%</p>
          <p className="text-sm text-gray-500 mt-1">Faol kitobxonlar</p>
        </Card>
      </div>
    </div>
  );
}
