import { useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useNavigate } from 'react-router-dom';
import StatCard from '../../components/ui/StatCard.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import ICONS from '../../components/icons.jsx';
import {
  ROLES, ROLE_LABELS, STORAGE_KEYS, REPORT_STATUS, REPORT_STATUS_LABELS,
  REPORT_STATUS_COLORS, TASK_STATUS, TASK_STATUS_LABELS, TASK_STATUS_COLORS
} from '../../data/constants.js';
import { getViloyatName, getTumanName } from '../../data/regions.js';
import { formatNumber, getRelativeTime } from '../../utils/helpers.js';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { FaPlus, FaArrowRight, FaChartLine, FaShieldHalved } from 'react-icons/fa6';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];

// Sleek Custom Tooltip
function CustomChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-3 rounded-xl shadow-executive-xl text-xs text-white">
        <p className="font-bold text-slate-300 mb-1.5">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                {entry.name}:
              </span>
              <span className="font-bold font-mono text-white tabular-nums">
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export default function Dashboard() {
  const { currentUser, getCollection, getReports, getTasks, getUsers, hasPermission } = useApp();
  const navigate = useNavigate();

  const role = currentUser?.role;
  const isSuperAdmin = role === ROLES.SUPER_ADMIN;
  const isViloyatAdmin = role === ROLES.VILOYAT_ADMIN;
  const isTumanAdmin = role === ROLES.TUMAN_ADMIN;
  const isXodimBoshligi = role === ROLES.XODIMLAR_BOSHLIGI;
  const isXodim = role === ROLES.KUTUBXONA_XODIMI;
  const isAdmin = isSuperAdmin || isViloyatAdmin || isTumanAdmin;

  // Collections
  const libraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES), [getCollection]);
  const activities = useMemo(() => getCollection(STORAGE_KEYS.ACTIVITIES), [getCollection]);
  const reports = useMemo(() => getReports(), [getReports]);
  const tasks = useMemo(() => getTasks(), [getTasks]);
  const events = useMemo(() => getCollection(STORAGE_KEYS.EVENTS), [getCollection]);
  const appeals = useMemo(() => getCollection(STORAGE_KEYS.APPEALS), [getCollection]);

  // Scoped data by role
  const scopedLibraries = useMemo(() => {
    if (isSuperAdmin) return libraries;
    if (isViloyatAdmin) return libraries.filter(l => l.viloyatId === currentUser?.viloyatId);
    if (isTumanAdmin) return libraries.filter(l => l.viloyatId === currentUser?.viloyatId && l.tumanId === currentUser?.tumanId);
    if (isXodimBoshligi || isXodim) return libraries.filter(l => l.id === currentUser?.libraryId);
    return libraries;
  }, [libraries, currentUser, isSuperAdmin, isViloyatAdmin, isTumanAdmin, isXodimBoshligi, isXodim]);

  const scopedReports = useMemo(() => {
    if (isSuperAdmin) return reports;
    if (isViloyatAdmin) return reports.filter(r => r.viloyatId === currentUser?.viloyatId);
    if (isTumanAdmin) return reports.filter(r => r.viloyatId === currentUser?.viloyatId && r.tumanId === currentUser?.tumanId);
    if (isXodimBoshligi || isXodim) return reports.filter(r => r.libraryId === currentUser?.libraryId || r.createdBy === currentUser?.id);
    return reports;
  }, [reports, currentUser, isSuperAdmin, isViloyatAdmin, isTumanAdmin, isXodimBoshligi, isXodim]);

  const scopedTasks = useMemo(() => {
    if (isSuperAdmin || isViloyatAdmin) return tasks;
    if (isTumanAdmin) return tasks.filter(t => t.assignedBy === currentUser?.id || t.assignedTo === currentUser?.id);
    if (isXodimBoshligi) return tasks.filter(t =>
      t.assignedBy === currentUser?.id || t.assignedTo === currentUser?.id || t.libraryId === currentUser?.libraryId
    );
    if (isXodim) return tasks.filter(t => t.assignedTo === currentUser?.id);
    return tasks;
  }, [tasks, currentUser, isSuperAdmin, isViloyatAdmin, isXodimBoshligi, isXodim, isTumanAdmin]);

  // Derived stats
  const pendingReports = scopedReports.filter(r => r.status === REPORT_STATUS.SUBMITTED || r.status === REPORT_STATUS.UNDER_REVIEW);
  const pendingTasks = scopedTasks.filter(t => t.status === TASK_STATUS.PENDING || t.status === TASK_STATUS.IN_PROGRESS);
  const newAppeals = appeals.filter(a => a.status === 'new');
  const upcomingEvents = events.filter(e => e.status === 'upcoming');

  const allUsers = useMemo(() => getUsers(), [getUsers]);
  const scopedUsers = useMemo(() => {
    if (isSuperAdmin) return allUsers;
    if (isViloyatAdmin) return allUsers.filter(u => u.viloyatId === currentUser?.viloyatId);
    if (isTumanAdmin) return allUsers.filter(u => u.viloyatId === currentUser?.viloyatId && u.tumanId === currentUser?.tumanId);
    return allUsers.filter(u => u.libraryId === currentUser?.libraryId);
  }, [allUsers, currentUser, isSuperAdmin, isViloyatAdmin, isTumanAdmin]);

  // Pure Visitors trend (deterministic, without Math.random)
  const visitorsTrend = useMemo(() => {
    const months = ['May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr'];
    const baseCounts = [380, 420, 390, 480, 560, 620];
    const baseActivities = [35, 42, 38, 51, 58, 64];

    // Factor in actual activity count
    const activityWeight = Math.min(activities.length * 2, 50);

    return months.map((month, i) => ({
      name: month,
      tashrif: baseCounts[i] + activityWeight,
      faollik: baseActivities[i] + Math.floor(activityWeight / 2),
    }));
  }, [activities.length]);

  // Report status chart
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

  // Libraries by viloyat
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
    <div className="space-y-7">
      {/* Executive Hero Banner (Deep Obsidian / Royal Slate) */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#0b1120] via-[#111827] to-[#0f172a] border border-slate-800 p-6 sm:p-8 text-white shadow-executive-lg overflow-hidden">
        {/* Ambient subtle glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                {ROLE_LABELS[role]}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {currentUser?.viloyatId ? getViloyatName(currentUser.viloyatId) : "O'zbekiston Respublikasi"}
                {currentUser?.tumanId ? ` / ${getTumanName(currentUser.viloyatId, currentUser.tumanId)}` : ''}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {greeting()}, {currentUser?.fullName}!
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Kutubxona faoliyati monitoringi, hisobotlar topshirilishi va ijro intizomi bo'yicha markaziy boshqaruv paneli.
            </p>
          </div>

          {/* Quick Action Buttons on Hero */}
          <div className="flex items-center gap-3 flex-wrap shrink-0">
            {hasPermission('create_activity') && (
              <Button
                variant="primary"
                size="md"
                icon={FaPlus}
                onClick={() => navigate('/daily-activity')}
                className="bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/40"
              >
                Kunlik faoliyat
              </Button>
            )}
            {hasPermission('create_report') && (
              <Button
                variant="dark"
                size="md"
                onClick={() => navigate('/reports')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80"
              >
                Hisobot topshirish
              </Button>
            )}
            <Button
              variant="dark"
              size="md"
              onClick={() => navigate('/tasks')}
              className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80"
            >
              Topshiriqlar ({pendingTasks.length})
            </Button>
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Kutubxonalar"
          value={formatNumber(scopedLibraries.length)}
          icon={ICONS.library}
          color="blue"
          subtitle="Faol filiallar soni"
          trend={+4.2}
          onClick={() => navigate('/libraries')}
        />
        {isAdmin ? (
          <>
            <StatCard
              title="Xodimlar"
              value={formatNumber(scopedUsers.length)}
              icon={ICONS.users}
              color="teal"
              subtitle="Tizimdagi mas'ul xodimlar"
              trend={+2.8}
              onClick={() => navigate('/users')}
            />
            <StatCard
              title="Hisobotlar"
              value={formatNumber(scopedReports.length)}
              icon={ICONS.reports}
              color="purple"
              subtitle={`${pendingReports.length} ta tekshirishda`}
              badge={pendingReports.length > 0 ? "Ijroda" : "Barchasi joyida"}
              onClick={() => navigate('/reports')}
            />
            <StatCard
              title="Topshiriqlar"
              value={formatNumber(scopedTasks.length)}
              icon={ICONS.tasks}
              color="amber"
              subtitle={`${pendingTasks.length} ta faol ijroda`}
              badge={pendingTasks.length > 0 ? `${pendingTasks.length} ta kutilmoqda` : null}
              onClick={() => navigate('/tasks')}
            />
          </>
        ) : (
          <>
            <StatCard
              title="Kunlik faoliyatlar"
              value={formatNumber(activities.length)}
              icon={ICONS.activity}
              color="emerald"
              subtitle="Ro'yxatga olingan faoliyatlar"
              onClick={() => navigate('/daily-activity')}
            />
            <StatCard
              title="Topshiriqlar"
              value={formatNumber(scopedTasks.length)}
              icon={ICONS.tasks}
              color="amber"
              subtitle={`${pendingTasks.length} ta faol ijroda`}
              badge={pendingTasks.length > 0 ? `${pendingTasks.length} ta kutilmoqda` : null}
              onClick={() => navigate('/tasks')}
            />
            <StatCard
              title="Hisobotlar"
              value={formatNumber(scopedReports.length)}
              icon={ICONS.reports}
              color="purple"
              subtitle={`${pendingReports.length} ta yuborilgan`}
              onClick={() => navigate('/reports')}
            />
          </>
        )}
      </div>

      {/* Analytics & Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Trend Chart (AreaChart) */}
        <div className="lg:col-span-8">
          <Card
            title="Tashriflar va xizmatlar dinamikasi"
            subtitle="Oylik qatnovlar va tizim xizmatlaridan foydalanish ko'rsatkichlari"
            icon={FaChartLine}
          >
            <div className="h-[300px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={visitorsTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTashrif" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorFaollik" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="tashrif"
                    name="Tashriflar"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorTashrif)"
                  />
                  <Area
                    type="monotone"
                    dataKey="faollik"
                    name="Faolliklar"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorFaollik)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Right Distribution Chart (PieChart) */}
        <div className="lg:col-span-4">
          <Card
            title="Hisobotlar holati"
            subtitle="Tasdiqlangan va tekshiruvdagi ijrolar"
          >
            <div className="h-[300px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reportStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {reportStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* Regional Libraries breakdown (Admins) */}
      {(isSuperAdmin || isViloyatAdmin) && librariesByViloyat.length > 0 && (
        <Card
          title="Hududlar bo'yicha filiallar taqsimoti"
          subtitle="Shahar va tuman axborot-kutubxona tarmoqlari"
        >
          <div className="h-[220px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={librariesByViloyat} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar dataKey="kutubxona" name="Kutubxonalar" fill="#2563eb" radius={[8, 8, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Secondary Operational Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Kutilayotgan topshiriqlar"
          value={pendingTasks.length}
          icon={ICONS.tasks}
          color="amber"
          subtitle="Ijro muddati kelgan"
          onClick={() => navigate('/tasks')}
        />
        <StatCard
          title="Yangi murojaatlar"
          value={newAppeals.length}
          icon={ICONS.appeals}
          color="rose"
          subtitle="Fuqarolardan kelgan"
          onClick={() => navigate('/appeals')}
        />
        <StatCard
          title="Yaqin tadbirlar"
          value={upcomingEvents.length}
          icon={ICONS.events}
          color="indigo"
          subtitle="Rejalashtirilgan seminarlar"
          onClick={() => navigate('/events')}
        />
        <StatCard
          title="Audit xavfsizlik"
          value="Himoyalangan"
          icon={FaShieldHalved}
          color="emerald"
          subtitle="Barcha amallar jurnalda"
          onClick={() => navigate('/audit')}
        />
      </div>

      {/* Tables Row: Recent Reports & Active Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Reports Table */}
        <Card
          title="So'nggi hisobotlar"
          subtitle="Kutubxonalar tomonidan taqdim etilgan hisobotlar"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/reports')}
            >
              Barchasi <FaArrowRight className="text-[10px]" />
            </Button>
          }
        >
          <div className="divide-y divide-slate-100">
            {recentReports.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs font-medium">
                Hisobotlar mavjud emas
              </div>
            ) : (
              recentReports.map(r => {
                const author = scopedUsers.find(u => u.id === r.userId || u.id === r.createdBy);
                const lib = libraries.find(l => l.id === r.libraryId || l.id === author?.libraryId);
                return (
                  <div
                    key={r.id}
                    onClick={() => navigate('/reports')}
                    className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2 -mx-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800 truncate leading-snug">
                        {r.title || 'Nomsiz hisobot'}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className="text-blue-600 font-semibold">{author?.fullName || 'Xodim'}</span>
                        {lib && <span className="text-slate-400">• {lib.name}</span>}
                        <span className="text-slate-400">• Davr: {r.period || 'Joriy'}</span>
                      </p>
                    </div>
                    <Badge color={REPORT_STATUS_COLORS[r.status] || 'gray'} withDot>
                      {REPORT_STATUS_LABELS[r.status] || r.status}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Active Tasks Table */}
        <Card
          title="Topshiriqlar ijrosi"
          subtitle="Belgilangan muddatli vazifalar monitoringi"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/tasks')}
            >
              Barchasi <FaArrowRight className="text-[10px]" />
            </Button>
          }
        >
          <div className="divide-y divide-slate-100">
            {myTasks.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs font-medium">
                Topshiriqlar mavjud emas
              </div>
            ) : (
              myTasks.map(t => (
                <div
                  key={t.id}
                  onClick={() => navigate('/tasks')}
                  className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2 -mx-2 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate leading-snug">
                      {t.title}
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Muddat: {t.dueDate || 'Belgilanmagan'} • {getRelativeTime(t.createdAt)}
                    </p>
                  </div>
                  <Badge color={TASK_STATUS_COLORS[t.status] || 'gray'} withDot>
                    {TASK_STATUS_LABELS[t.status] || t.status}
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
