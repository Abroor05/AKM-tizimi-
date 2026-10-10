// ============================================================
// XODIMLAR BOSHLIGI — Kunlik Faoliyat
// Xodimlardan kelgan hisobotlarni qabul qilish va oylik jami
// ============================================================
import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ICONS from '../../components/icons.jsx';
import { STORAGE_KEYS, ROLES, ACTIVITY_TYPE_LABELS } from '../../data/constants.js';
import { formatDate, formatNumber } from '../../utils/helpers.js';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// ─── Helpers ─────────────────────────────────────────────────
const TYPE_SHORT = {
  kitob_skanerlash: 'Scanner',
  kitob_pdf:        'PDF',
  texnik_xizmat:    'Texnik',
  jihozlash:        'Jihozlash',
  tuzatish:         "Ta'mirlash",
  boshqa:           'Boshqa',
};

const ACT_STATUS_COLORS = {
  submitted: 'blue',
  sent:      'amber',
  accepted:  'green',
};
const ACT_STATUS_LABELS = {
  submitted: 'Saqlangan',
  sent:      'Yuborildi',
  accepted:  'Qabul qilindi',
};

function parseData(a) {
  try { return typeof a.data === 'object' && a.data ? a.data : JSON.parse(a.data || '{}'); }
  catch { return {}; }
}

function getMonthLabel(yyyy_mm) {
  if (!yyyy_mm) return '';
  const [y, m] = yyyy_mm.split('-');
  const months = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
  return `${months[+m - 1]} ${y}`;
}

// ─── Tabs ────────────────────────────────────────────────────
const TABS = [
  { id: 'incoming', label: "Kelgan hisobotlar" },
  { id: 'monthly',  label: 'Oylik jami'         },
  { id: 'yearly',   label: 'Yillik'              },
];

function buildEmptyForm() {
  const counts = {};
  Object.keys(ACTIVITY_TYPE_LABELS).forEach(k => { counts[k] = ''; });
  return {
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    counts,
  };
}

export default function XBDailyActivity() {
  const { currentUser, getCollection, createEntity, acceptActivity } = useApp();

  const allActs   = useMemo(() => getCollection(STORAGE_KEYS.ACTIVITIES), [getCollection]);
  const allUsers  = useMemo(() => getCollection(STORAGE_KEYS.USERS),      [getCollection]);
  const libraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES) || [], [getCollection]);

  // Faqat o'z kutubxonasidagi daily_report lar
  const myLibActs = useMemo(() =>
    allActs.filter(a => a.libraryId === currentUser?.libraryId && a.type === 'daily_report'),
    [allActs, currentUser]);

  // Xodimlar
  const myStaff = useMemo(() =>
    allUsers.filter(u => u.role === ROLES.KUTUBXONA_XODIMI && u.tumanId === currentUser?.tumanId && u.viloyatId === currentUser?.viloyatId),
    [allUsers, currentUser]);

  const today = new Date().toISOString().split('T')[0];
  const [activeTab,   setActiveTab]   = useState('incoming');
  const [showModal,   setShowModal]   = useState(false);
  const [showDetail,  setShowDetail]  = useState(null);
  const [accepting,   setAccepting]   = useState(null);
  const [monthFilter, setMonthFilter] = useState(today.slice(0, 7));
  const [yearFilter,  setYearFilter]  = useState(today.slice(0, 4));
  const [staffFilter, setStaffFilter] = useState('all');
  const [form,        setForm]        = useState(buildEmptyForm);

  // ─── Kelgan hisobotlar (faqat 'sent' statuslilar) ─────────
  const incomingActs = useMemo(() => {
    let list = myLibActs.filter(a => a.status === 'sent');
    if (staffFilter !== 'all') list = list.filter(a => a.userId === staffFilter);
    return list.sort((a, b) =>
      new Date(b.date + 'T' + (b.time||'00:00')) -
      new Date(a.date + 'T' + (a.time||'00:00'))
    );
  }, [myLibActs, staffFilter]);

  // ─── Oylik qabul qilinganlar ──────────────────────────────
  const monthActs = useMemo(() => {
    let list = myLibActs.filter(a =>
      a.date?.startsWith(monthFilter) &&
      (a.status === 'accepted' || a.status === 'sent')
    );
    if (staffFilter !== 'all') list = list.filter(a => a.userId === staffFilter);
    return list.sort((a, b) =>
      new Date(b.date + 'T' + (b.time||'00:00')) -
      new Date(a.date + 'T' + (a.time||'00:00'))
    );
  }, [myLibActs, monthFilter, staffFilter]);

  // Oylik jami sonlar
  const monthTotals = useMemo(() => {
    const t = {};
    Object.keys(ACTIVITY_TYPE_LABELS).forEach(k => { t[k] = 0; });
    monthActs.forEach(a => {
      const d = parseData(a);
      Object.entries(d).forEach(([k, v]) => { t[k] = (t[k] || 0) + Number(v); });
    });
    return t;
  }, [monthActs]);

  // Oylik xodim bo'yicha jadval
  const monthStaffSummary = useMemo(() => {
    return myStaff.map(s => {
      const acts = monthActs.filter(a => a.userId === s.id);
      const totals = {};
      Object.keys(ACTIVITY_TYPE_LABELS).forEach(k => { totals[k] = 0; });
      acts.forEach(a => {
        const d = parseData(a);
        Object.entries(d).forEach(([k, v]) => { totals[k] = (totals[k] || 0) + Number(v); });
      });
      const grand = Object.values(totals).reduce((s, v) => s + v, 0);
      return { staff: s, totals, grand, count: acts.length };
    }).filter(s => s.grand > 0 || s.count > 0).sort((a, b) => b.grand - a.grand);
  }, [monthActs, myStaff]);

  // ─── Yillik chart ─────────────────────────────────────────
  const yearlyChart = useMemo(() => {
    const months = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'];
    return months.map((m, i) => {
      const prefix = `${yearFilter}-${String(i+1).padStart(2,'0')}`;
      const base = myLibActs.filter(a =>
        a.date?.startsWith(prefix) &&
        (a.status === 'accepted' || a.status === 'sent') &&
        (staffFilter === 'all' || a.userId === staffFilter)
      );
      return {
        name: m,
        scanner: base.reduce((s,a) => s + (parseData(a).kitob_skanerlash || 0), 0),
        pdf:     base.reduce((s,a) => s + (parseData(a).kitob_pdf || 0), 0),
        jami:    base.length,
      };
    });
  }, [yearFilter, myLibActs, staffFilter]);

  // ─── Handlers ─────────────────────────────────────────────
  const handleAccept = async (a) => {
    const sender = allUsers.find(u => u.id === a.userId);
    const lib = libraries.find(l => l.id === a.libraryId || l.id === sender?.libraryId);
    const libName = lib?.name ? ` (${lib.name})` : '';
    if (!confirm(`${sender?.fullName || 'Xodim'}${libName} ning ${formatDate(a.date)} kunlik hisobotini qabul qilasizmi?`)) return;
    setAccepting(a.id);
    try {
      await acceptActivity(a.id);
      setShowDetail(null);
    } catch {
      alert('Qabul qilishda xato yuz berdi');
    } finally {
      setAccepting(null);
    }
  };

  // O'zi ham hisobot qo'sha oladi
  const handleSave = () => {
    const hasAny = Object.values(form.counts).some(v => Number(v) > 0);
    if (!hasAny) { alert('Kamida bitta faoliyat uchun son kiriting'); return; }
    const data = {};
    Object.entries(form.counts).forEach(([k, v]) => { if (Number(v) > 0) data[k] = Number(v); });
    createEntity(STORAGE_KEYS.ACTIVITIES, {
      type:      'daily_report',
      data:      JSON.stringify(data),
      date:      form.date,
      time:      form.time,
      libraryId: currentUser?.libraryId,
      userId:    currentUser?.id,
      status:    'accepted', // Boshliq o'zi qo'shsa — to'g'ridan qabul qilingan
    });
    setShowModal(false);
    setForm(buildEmptyForm());
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  // Pending (kelgan, qabul qilinmagan) soni
  const pendingCount = myLibActs.filter(a => a.status === 'sent').length;

  return (
    <div>
      <PageHeader
        title="Kunlik faoliyat"
        subtitle="Xodimlar hisobotlari va oylik jamlangan natijalar"
        icon={ICONS.activity}
        action={
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-lg">
                {pendingCount} ta kutilmoqda
              </span>
            )}
            <Button onClick={() => setShowModal(true)}>
              <ICONS.plus /> O'z hisobotim
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.id === 'incoming' && pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: Kelgan hisobotlar ── */}
      {activeTab === 'incoming' && (
        <>
          {/* Filtr */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <select value={staffFilter} onChange={e => setStaffFilter(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white">
              <option value="all">Barcha xodimlar</option>
              {myStaff.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
            </select>
          </div>

          {incomingActs.length === 0 ? (
            <EmptyState icon={ICONS.activity} title="Yangi hisobotlar yo'q" description="Xodimlar hisobot yuborishsa shu yerda ko'rinadi" />
          ) : (
            <Card noPadding>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Sana</th>
                      <th className="text-left px-4 py-3 font-medium">Xodim</th>
                      {Object.entries(TYPE_SHORT).map(([k, v]) => (
                        <th key={k} className="text-center px-3 py-3 font-medium">{v}</th>
                      ))}
                      <th className="text-center px-4 py-3 font-medium">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {incomingActs.map(a => {
                      const data  = parseData(a);
                      const owner = allUsers.find(u => u.id === a.userId);
                      return (
                        <tr key={a.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">
                            {formatDate(a.date)}
                            {a.time && <span className="text-xs text-gray-400 ml-1">{a.time}</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold shrink-0">
                                {owner?.fullName?.charAt(0) || 'X'}
                              </div>
                              <div>
                                <span className="text-xs font-bold text-gray-800 leading-tight block">{owner?.fullName || '—'}</span>
                                <span className="text-[11px] text-teal-600 font-medium flex items-center gap-1 mt-0.5">
                                  <ICONS.library className="text-[10px] text-teal-500 shrink-0" />
                                  <span>{libraries.find(l => l.id === a.libraryId || l.id === owner?.libraryId)?.name || 'Kutubxona xodimi'}</span>
                                </span>
                              </div>
                            </div>
                          </td>
                          {Object.keys(TYPE_SHORT).map(k => (
                            <td key={k} className="text-center px-3 py-3 font-semibold text-gray-800">
                              {data[k] ? formatNumber(data[k]) : <span className="text-gray-300">—</span>}
                            </td>
                          ))}
                          <td className="text-center px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => setShowDetail(a)}
                                className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="Ko'rish">
                                <ICONS.eye className="text-sm" />
                              </button>
                              <button
                                onClick={() => handleAccept(a)}
                                disabled={accepting === a.id}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium disabled:opacity-50"
                              >
                                {accepting === a.id
                                  ? <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  : <ICONS.check className="text-xs" />
                                }
                                Qabul
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── TAB: Oylik jami ── */}
      {activeTab === 'monthly' && (
        <>
          <div className="flex gap-3 mb-5 flex-wrap">
            <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white" />
            <select value={staffFilter} onChange={e => setStaffFilter(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white">
              <option value="all">Barcha xodimlar</option>
              {myStaff.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
            </select>
          </div>

          {/* Oylik jami kartalar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
            {Object.entries(ACTIVITY_TYPE_LABELS).map(([key, label]) => (
              <Card key={key} className="text-center">
                <p className="text-2xl font-bold text-teal-600">{formatNumber(monthTotals[key] || 0)}</p>
                <p className="text-xs text-gray-500 mt-1 leading-tight">{label}</p>
              </Card>
            ))}
          </div>

          {/* Xodim bo'yicha jadval */}
          {monthStaffSummary.length > 0 && (
            <Card title={`Xodimlar — ${getMonthLabel(monthFilter)}`} className="mb-5" noPadding>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Xodim</th>
                      {Object.entries(TYPE_SHORT).map(([k, v]) => (
                        <th key={k} className="text-center px-3 py-3 font-medium">{v}</th>
                      ))}
                      <th className="text-center px-3 py-3 font-medium">Jami</th>
                      <th className="text-center px-3 py-3 font-medium">Kunlar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {monthStaffSummary.map(({ staff, totals, grand, count }) => (
                      <tr key={staff.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-semibold shrink-0">
                              {staff.fullName?.charAt(0)}
                            </div>
                            <span className="text-gray-700 font-medium text-sm">{staff.fullName}</span>
                          </div>
                        </td>
                        {Object.keys(TYPE_SHORT).map(k => (
                          <td key={k} className="text-center px-3 py-3 font-semibold text-gray-700">
                            {totals[k] ? formatNumber(totals[k]) : <span className="text-gray-300">—</span>}
                          </td>
                        ))}
                        <td className="text-center px-3 py-3 font-bold text-teal-700">{formatNumber(grand)}</td>
                        <td className="text-center px-3 py-3 text-gray-500">{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Oylik yozuvlar ro'yxati */}
          {monthActs.length === 0 ? (
            <EmptyState icon={ICONS.activity} title={`${getMonthLabel(monthFilter)} uchun qabul qilingan hisobotlar yo'q`} />
          ) : (
            <Card noPadding>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Sana</th>
                      <th className="text-left px-4 py-3 font-medium">Xodim</th>
                      {Object.entries(TYPE_SHORT).map(([k, v]) => (
                        <th key={k} className="text-center px-3 py-3 font-medium">{v}</th>
                      ))}
                      <th className="text-left px-4 py-3 font-medium">Holat</th>
                      <th className="text-center px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {monthActs.map(a => {
                      const data  = parseData(a);
                      const owner = allUsers.find(u => u.id === a.userId);
                      return (
                        <tr key={a.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">{formatDate(a.date)}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{owner?.fullName || '—'}</td>
                          {Object.keys(TYPE_SHORT).map(k => (
                            <td key={k} className="text-center px-3 py-3 font-semibold text-gray-800">
                              {data[k] ? formatNumber(data[k]) : <span className="text-gray-300">—</span>}
                            </td>
                          ))}
                          <td className="px-4 py-3">
                            <Badge color={ACT_STATUS_COLORS[a.status] || 'gray'}>
                              {ACT_STATUS_LABELS[a.status] || a.status}
                            </Badge>
                          </td>
                          <td className="text-center px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => setShowDetail(a)}
                                className="p-1.5 rounded hover:bg-blue-50 text-blue-600">
                                <ICONS.eye className="text-sm" />
                              </button>
                              {a.status === 'sent' && (
                                <button onClick={() => handleAccept(a)}
                                  disabled={accepting === a.id}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium disabled:opacity-50">
                                  <ICONS.check className="text-xs" /> Qabul
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── TAB: Yillik ── */}
      {activeTab === 'yearly' && (
        <>
          <div className="flex gap-3 mb-5 flex-wrap">
            <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white">
              {yearOptions.map(y => <option key={y} value={y}>{y}-yil</option>)}
            </select>
            <select value={staffFilter} onChange={e => setStaffFilter(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white">
              <option value="all">Barcha xodimlar</option>
              {myStaff.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
            </select>
          </div>

          <Card title={`${yearFilter}-yil: Scanner va PDF oylar bo'yicha`} className="mb-5">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={yearlyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="scanner" fill="#3b82f6" name="Skanerlangan" radius={[2,2,0,0]} />
                <Bar dataKey="pdf"     fill="#6366f1" name="PDF qilingan"  radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Yillik oylar bo'yicha jadval */}
          <Card title={`${yearFilter}-yil oylik ko'rsatkichlar`} noPadding>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Oy</th>
                    <th className="text-center px-3 py-3 font-medium">Scanner</th>
                    <th className="text-center px-3 py-3 font-medium">PDF</th>
                    <th className="text-center px-3 py-3 font-medium">Kunlar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {yearlyChart.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 font-medium">{row.name}</td>
                      <td className="text-center px-3 py-3 font-semibold text-blue-700">{row.scanner || <span className="text-gray-300">—</span>}</td>
                      <td className="text-center px-3 py-3 font-semibold text-indigo-700">{row.pdf || <span className="text-gray-300">—</span>}</td>
                      <td className="text-center px-3 py-3 text-gray-500">{row.jami || <span className="text-gray-300">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* ── O'z hisobotini qo'shish modali ── */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setForm(buildEmptyForm()); }}
        title="O'zim bajargan ishlar hisoboti"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowModal(false); setForm(buildEmptyForm()); }}>Bekor</Button>
            <Button onClick={handleSave}><ICONS.save /> Saqlash</Button>
          </>
        }
      >
        <div className="space-y-2 mb-4">
          {Object.entries(ACTIVITY_TYPE_LABELS).map(([key, label]) => {
            const val = form.counts[key];
            const active = Number(val) > 0;
            return (
              <div key={key}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                  active ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  active ? 'border-green-500 bg-green-500' : 'border-gray-300'
                }`}>
                  {active && <ICONS.check className="text-white text-[9px]" />}
                </div>
                <span className={`text-sm flex-1 ${active ? 'text-green-700 font-medium' : 'text-gray-600'}`}>{label}</span>
                <input
                  type="number" min="0" value={val}
                  onChange={e => setForm(f => ({ ...f, counts: { ...f.counts, [key]: e.target.value } }))}
                  placeholder="0"
                  className="w-20 text-center px-2 py-1.5 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-200"
                />
                <span className="text-xs text-gray-400 w-4 shrink-0">ta</span>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Sana</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-200" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Vaqt</label>
            <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-200" />
          </div>
        </div>
      </Modal>

      {/* ── Detail modali ── */}
      {showDetail && (
        <Modal
          isOpen={!!showDetail}
          onClose={() => setShowDetail(null)}
          title={`${formatDate(showDetail.date)} — Kunlik hisobot`}
          size="sm"
          footer={
            <div className="flex gap-2 w-full justify-end">
              {showDetail.status === 'sent' && (
                <Button onClick={() => handleAccept(showDetail)} disabled={accepting === showDetail.id}>
                  {accepting === showDetail.id
                    ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <ICONS.check />
                  }
                  Qabul qilish
                </Button>
              )}
              <Button variant="secondary" onClick={() => setShowDetail(null)}>Yopish</Button>
            </div>
          }
        >
          <div className="space-y-2">
            {/* Sender profile card */}
            {(() => {
              const staffUser = allUsers.find(u => u.id === showDetail.userId);
              const staffLib = libraries.find(l => l.id === showDetail.libraryId || l.id === staffUser?.libraryId);
              return (
                <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200/80 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1">
                      <ICONS.user className="text-xs" /> Hisobot yuborgan xodim
                    </span>
                    <Badge color={ACT_STATUS_COLORS[showDetail.status] || 'gray'}>
                      {ACT_STATUS_LABELS[showDetail.status] || showDetail.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white font-bold flex items-center justify-center shrink-0 text-base shadow-sm">
                      {staffUser?.fullName?.charAt(0) || 'X'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-slate-900 text-sm leading-tight">{staffUser?.fullName || '—'}</p>
                      <p className="text-xs text-teal-700 font-semibold mt-0.5">Kutubxona xodimi</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                        {staffLib && (
                          <span className="flex items-center gap-1">
                            <ICONS.library className="text-[10px] text-teal-600 shrink-0" />
                            <span>{staffLib.name}</span>
                          </span>
                        )}
                        {staffUser?.phone && (
                          <span>Tel: <strong className="text-slate-700 font-mono">{staffUser.phone}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
            {Object.entries(parseData(showDetail)).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-sm text-gray-600">{ACTIVITY_TYPE_LABELS[key] || key}</span>
                <span className="text-lg font-bold text-teal-700">
                  {formatNumber(val)} <span className="text-xs font-normal text-gray-400">ta</span>
                </span>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
