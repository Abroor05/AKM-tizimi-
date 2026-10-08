// ============================================================
// XODIMLAR BOSHLIGI — Boshqaruv paneli
// ============================================================
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import TextArea from '../../components/ui/TextArea.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import ICONS from '../../components/icons.jsx';
import {
  STORAGE_KEYS, ROLES,
  REPORT_STATUS, REPORT_STATUS_LABELS, REPORT_STATUS_COLORS,
  REPORT_TYPES, REPORT_TYPE_LABELS,
  TASK_STATUS, TASK_STATUS_LABELS, TASK_STATUS_COLORS,
  ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_COLORS,
} from '../../data/constants.js';
import { formatNumber, formatDate, getRelativeTime } from '../../utils/helpers.js';
import { getTumanName, getViloyatName } from '../../data/regions.js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';

const PIE_COLORS = ['#0d9488', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function XBDashboard() {
  const { currentUser, getCollection, createEntity, hasPermission } = useApp();
  const navigate = useNavigate();

  // --- Data ---
  const libraries   = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES), [getCollection]);
  const allActs     = useMemo(() => getCollection(STORAGE_KEYS.ACTIVITIES), [getCollection]);
  const allReports  = useMemo(() => getCollection(STORAGE_KEYS.REPORTS), [getCollection]);
  const allTasks    = useMemo(() => getCollection(STORAGE_KEYS.TASKS), [getCollection]);
  const allUsers    = useMemo(() => getCollection(STORAGE_KEYS.USERS), [getCollection]);
  const events      = useMemo(() => getCollection(STORAGE_KEYS.EVENTS), [getCollection]);

  // My library
  const myLibrary = useMemo(() =>
    libraries.find(l => l.id === currentUser?.libraryId), [libraries, currentUser]);

  // Staff of my library (kutubxona_xodimi)
  const myStaff = useMemo(() =>
    allUsers.filter(u =>
      u.role === ROLES.KUTUBXONA_XODIMI &&
      u.libraryId === currentUser?.libraryId
    ), [allUsers, currentUser]);

  // Activities in my library
  const myActs = useMemo(() =>
    allActs.filter(a => a.libraryId === currentUser?.libraryId),
    [allActs, currentUser]);

  // Today's activities
  const today = new Date().toISOString().split('T')[0];
  const todayActs = useMemo(() =>
    myActs.filter(a => a.date === today), [myActs, today]);

  // My books & readers — removed (not needed for this role's dashboard)

  // Reports from my library
  const myReports = useMemo(() =>
    allReports.filter(r =>
      r.libraryId === currentUser?.libraryId ||
      r.createdBy === currentUser?.id ||
      myStaff.some(s => s.id === r.createdBy)
    ), [allReports, currentUser, myStaff]);

  // Tasks for my library
  const myTasks = useMemo(() =>
    allTasks.filter(t =>
      t.libraryId === currentUser?.libraryId ||
      t.assignedTo === currentUser?.id ||
      t.assignedBy === currentUser?.id
    ), [allTasks, currentUser]);

  // Upcoming events
  const upcomingEvents = useMemo(() =>
    events.filter(e =>
      e.libraryId === currentUser?.libraryId && e.status === 'upcoming'
    ), [events, currentUser]);

  // Chart: last 7 days activity count
  const last7Days = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      days.push({
        name: d.toLocaleDateString('uz-UZ', { weekday: 'short' }),
        son: myActs.filter(a => a.date === ds).length,
      });
    }
    return days;
  }, [myActs]);

  // Chart: activity type breakdown
  const actTypeChart = useMemo(() => {
    const counts = {};
    myActs.forEach(a => { counts[a.type] = (counts[a.type] || 0) + 1; });
    return Object.entries(counts).map(([type, val]) => ({
      name: ACTIVITY_TYPE_LABELS[type] || type,
      value: val,
      color: ACTIVITY_TYPE_COLORS[type] || 'blue',
    }));
  }, [myActs]);

  // Recent reports sorted
  const recentReports = useMemo(() =>
    [...myReports].sort((a, b) =>
      new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt)
    ).slice(0, 5), [myReports]);

  const pendingTasks = myTasks.filter(t =>
    t.status === TASK_STATUS.PENDING || t.status === TASK_STATUS.IN_PROGRESS);
  const overdueTasks = myTasks.filter(t => t.status === TASK_STATUS.OVERDUE);
  const pendingReports = myReports.filter(r =>
    r.status === REPORT_STATUS.SUBMITTED || r.status === REPORT_STATUS.UNDER_REVIEW);

  // --- Quick activity modal ---
  const [showActModal, setShowActModal] = useState(false);
  const [actForm, setActForm] = useState({
    type: 'kitob_skanerlash',
    description: '',
    count: '',
    date: today,
    time: new Date().toTimeString().slice(0, 5),
  });

  const handleSaveAct = () => {
    if (!actForm.type || !actForm.date) return;
    createEntity(STORAGE_KEYS.ACTIVITIES, {
      ...actForm,
      count: actForm.count ? Number(actForm.count) : null,
      libraryId: currentUser?.libraryId,
      userId: currentUser?.id,
      status: 'completed',
    });
    setShowActModal(false);
    setActForm({ type: 'kitob_skanerlash', description: '', count: '', date: today, time: new Date().toTimeString().slice(0, 5) });
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Xayrli tong';
    if (h < 18) return 'Xayrli kun';
    return 'Xayrli kech';
  };

  return (
    <div>
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-700 rounded-xl p-6 mb-6 text-white">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold">{greeting()}, {currentUser?.fullName}!</h2>
            <p className="text-teal-100 mt-1">
              Xodimlar Boshligi
              {currentUser?.viloyatId ? ` • ${getViloyatName(currentUser.viloyatId)}` : ''}
              {currentUser?.tumanId ? ` / ${getTumanName(currentUser.viloyatId, currentUser.tumanId)}` : ''}
            </p>
            {myLibrary && (
              <p className="text-teal-200 text-sm mt-1">
                <ICONS.library className="inline mr-1" />
                {myLibrary.name}
              </p>
            )}
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="bg-white/15 rounded-lg px-4 py-2 text-center">
              <p className="text-xl font-bold">{myStaff.length}</p>
              <p className="text-xs text-teal-100">Xodimlar</p>
            </div>
            <div className="bg-white/15 rounded-lg px-4 py-2 text-center">
              <p className="text-xl font-bold">{todayActs.length}</p>
              <p className="text-xs text-teal-100">Bugungi yozuvlar</p>
            </div>
            <div className="bg-white/15 rounded-lg px-4 py-2 text-center">
              <p className="text-xl font-bold">{new Date().getDate()}</p>
              <p className="text-xs text-teal-100">
                {new Date().toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex gap-3 mt-5 flex-wrap">
          <button
            onClick={() => setShowActModal(true)}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <ICONS.plus /> Kunlik yozuv qo'shish
          </button>
          <button
            onClick={() => navigate('/daily-activity')}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <ICONS.activity /> Barcha faoliyatlar
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <ICONS.reports /> Hisobotlar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Xodimlar"
          value={formatNumber(myStaff.length)}
          icon={ICONS.users}
          color="teal"
          subtitle="Kutubxona xodimlari"
        />
        <StatCard
          title="Bu oy faoliyat"
          value={formatNumber(myActs.filter(a => a.date?.startsWith(today.slice(0, 7))).length)}
          icon={ICONS.activity}
          color="amber"
          subtitle="Oy davomida"
        />
        <StatCard
          title="Hisobotlar"
          value={formatNumber(myReports.length)}
          icon={ICONS.reports}
          color="purple"
          subtitle={`${pendingReports.length} kutilmoqda`}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* 7-day activity trend */}
        <Card title="So'nggi 7 kunlik faoliyat">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={last7Days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="son" fill="#0d9488" radius={[4, 4, 0, 0]} name="Faoliyatlar" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Activity types pie */}
        <Card title="Faoliyat turlari bo'yicha">
          {actTypeChart.length === 0 ? (
            <div className="flex items-center justify-center h-60 text-gray-400 text-sm">
              Hali faoliyat yozuvlari yo'q
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={actTypeChart}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {actTypeChart.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Staff & tasks row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Staff list */}
        <Card
          title={`Xodimlar (${myStaff.length})`}
          action={
            <button
              onClick={() => navigate('/users')}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              Barchasi
            </button>
          }
        >
          <div className="space-y-2">
            {myStaff.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Xodimlar topilmadi</p>
            ) : (
              myStaff.slice(0, 5).map(s => {
                const staffActs = myActs.filter(a => a.userId === s.id && a.date === today);
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-semibold">
                        {s.fullName?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">{s.fullName}</p>
                        <p className="text-xs text-gray-400">{s.phone || s.email || '—'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-teal-600">{staffActs.length}</p>
                      <p className="text-[10px] text-gray-400">bugun</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Pending tasks */}
        <Card
          title={`Topshiriqlar (${pendingTasks.length} kutilmoqda)`}
          action={
            <button
              onClick={() => navigate('/tasks')}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              Barchasi
            </button>
          }
        >
          <div className="space-y-2">
            {myTasks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Topshiriqlar yo'q</p>
            ) : (
              myTasks.slice(0, 5).map(t => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-700 truncate">{t.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Muddat: {formatDate(t.dueDate)} • {getRelativeTime(t.createdAt)}
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

      {/* Recent reports */}
      <Card
        title="So'nggi hisobotlar (barcha xodimlar)"
        action={
          <button
            onClick={() => navigate('/reports')}
            className="text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            Barchasi
          </button>
        }
      >
        {recentReports.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Hisobotlar yo'q</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <th className="text-left px-4 py-3 font-medium">Nomi</th>
                  <th className="text-left px-4 py-3 font-medium">Turi</th>
                  <th className="text-left px-4 py-3 font-medium">Topshiruvchi</th>
                  <th className="text-left px-4 py-3 font-medium">Sana</th>
                  <th className="text-left px-4 py-3 font-medium">Holat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentReports.map(r => {
                  const submitter = allUsers.find(u => u.id === r.createdBy);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 font-medium truncate max-w-[200px]">{r.title}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{REPORT_TYPE_LABELS[r.type] || r.type}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{submitter?.fullName || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(r.submittedAt || r.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Badge color={REPORT_STATUS_COLORS[r.status] || 'gray'}>
                          {REPORT_STATUS_LABELS[r.status]}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Quick activity modal */}
      <Modal
        isOpen={showActModal}
        onClose={() => setShowActModal(false)}
        title="Kunlik faoliyat yozuvi qo'shish"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowActModal(false)}>Bekor</Button>
            <Button onClick={handleSaveAct}><ICONS.save /> Saqlash</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Faoliyat turi"
            value={actForm.type}
            onChange={e => setActForm({ ...actForm, type: e.target.value })}
            options={Object.entries(ACTIVITY_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
            required
          />
          <Input
            label="Soni (ixtiyoriy)"
            type="number"
            min="0"
            value={actForm.count}
            onChange={e => setActForm({ ...actForm, count: e.target.value })}
            placeholder="Masalan: 25"
          />
          <TextArea
            label="Izoh"
            value={actForm.description}
            onChange={e => setActForm({ ...actForm, description: e.target.value })}
            rows={3}
            placeholder="Bajarilgan ish haqida qisqacha ma'lumot..."
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Sana"
              type="date"
              value={actForm.date}
              onChange={e => setActForm({ ...actForm, date: e.target.value })}
              required
            />
            <Input
              label="Vaqt"
              type="time"
              value={actForm.time}
              onChange={e => setActForm({ ...actForm, time: e.target.value })}
              required
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
