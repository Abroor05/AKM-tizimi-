import { useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ICONS from '../../components/icons.jsx';
import { STORAGE_KEYS, KPI_CATEGORIES, KPI_CATEGORY_LABELS, ROLES } from '../../data/constants.js';
import { percentage } from '../../utils/helpers.js';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function KpiPage() {
  const { currentUser, getCollection, isRole } = useApp();
  const allKpi = useMemo(() => getCollection(STORAGE_KEYS.KPI_DATA), [getCollection]);
  const libraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES), [getCollection]);

  const scopedLibIds = useMemo(() => {
    if (isRole(ROLES.SUPER_ADMIN, ROLES.VILOYAT_ADMIN)) return libraries.map(l => l.id);
    if (isRole(ROLES.VILOYAT_ADMIN)) return libraries.filter(l => l.viloyatId === currentUser.viloyatId).map(l => l.id);
    return libraries.filter(l => l.viloyatId === currentUser.viloyatId && l.tumanId === currentUser.tumanId).map(l => l.id);
  }, [libraries, currentUser, isRole]);

  const kpiData = useMemo(() => allKpi.filter(k => scopedLibIds.includes(k.libraryId)), [allKpi, scopedLibIds]);

  // Group by category
  const byCategory = useMemo(() => {
    const groups = {};
    Object.values(KPI_CATEGORIES).forEach(cat => { groups[cat] = []; });
    kpiData.forEach(k => {
      if (!groups[k.category]) groups[k.category] = [];
      groups[k.category].push(k);
    });
    return groups;
  }, [kpiData]);

  // Overall score
  const overallScore = useMemo(() => {
    if (kpiData.length === 0) return 0;
    const total = kpiData.reduce((sum, k) => sum + percentage(k.actual, k.target), 0);
    return Math.round(total / kpiData.length);
  }, [kpiData]);

  // Chart data
  const chartData = useMemo(() => {
    return Object.entries(byCategory).filter(([_, items]) => items.length > 0).map(([cat, items]) => {
      const avg = items.length > 0 ? Math.round(items.reduce((s, k) => s + percentage(k.actual, k.target), 0) / items.length) : 0;
      return { name: KPI_CATEGORY_LABELS[cat]?.replace(/ .*/, '') || cat, score: avg };
    });
  }, [byCategory]);

  return (
    <div>
      <PageHeader title="KPI va Reyting" subtitle="Kalit ko'rsatkichlar va kutubxonalar reytingi" icon={ICONS.kpi} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="text-center">
          <p className="text-4xl font-bold text-blue-600">{overallScore}%</p>
          <p className="text-sm text-gray-500 mt-1">Umumiy ko'rsatkich</p>
        </Card>
        <Card className="text-center">
          <p className="text-4xl font-bold text-green-600">{kpiData.filter(k => percentage(k.actual, k.target) >= 100).length}</p>
          <p className="text-sm text-gray-500 mt-1">Mo'ljalga erishilgan</p>
        </Card>
        <Card className="text-center">
          <p className="text-4xl font-bold text-amber-600">{kpiData.filter(k => percentage(k.actual, k.target) < 100).length}</p>
          <p className="text-sm text-gray-500 mt-1">Mo'ljalga erishilmagan</p>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card title="Kategoriyalar bo'yicha ko'rsatkichlar" className="mb-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 120]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} name="Bajarish (%)">
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.score >= 100 ? '#10b981' : entry.score >= 70 ? '#f59e0b' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {Object.entries(byCategory).filter(([_, items]) => items.length > 0).map(([cat, items]) => (
        <div key={cat} className="mb-6">
          <h3 className="font-semibold text-gray-700 mb-3">{KPI_CATEGORY_LABELS[cat]}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(k => {
              const pct = percentage(k.actual, k.target);
              return (
                <Card key={k.id}>
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">{k.metric}</p>
                    <Badge color={pct >= 100 ? 'green' : pct >= 70 ? 'amber' : 'red'}>{pct}%</Badge>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">{libraries.find(l => l.id === k.libraryId)?.name} • {k.period}</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Mo'ljal:</span><span className="font-medium text-gray-700">{k.target} {k.unit}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Amalda:</span><span className={`font-medium ${pct >= 100 ? 'text-green-600' : 'text-gray-700'}`}>{k.actual} {k.unit}</span></div>
                  </div>
                  <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct >= 100 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {kpiData.length === 0 && <EmptyState icon={ICONS.kpi} title="KPI ma'lumotlari topilmadi" />}
    </div>
  );
}
