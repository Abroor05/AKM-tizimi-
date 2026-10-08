// ============================================================
// XODIMLAR BOSHLIGI — Kunlik Faoliyat (kunlik / oylik / yillik)
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
import { STORAGE_KEYS, ROLES, ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_COLORS } from '../../data/constants.js';
import { formatDate, formatNumber } from '../../utils/helpers.js';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const TYPE_SHORT = {
  kitob_skanerlash: 'Scanner',
  kitob_pdf:        'PDF',
  texnik_xizmat:    'Texnik',
  jihozlash:        'Jihozlash',
  tuzatish:         "Ta'mirlash",
  boshqa:           'Boshqa',
};

function buildEmptyForm() {
  const counts = {};
  Object.keys(ACTIVITY_TYPE_LABELS).forEach(k => { counts[k] = ''; });
  return {
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    description: '',
    counts,
  };
}

const VIEW_TABS = [
  { id: 'daily',   label: 'Kunlik'  },
  { id: 'monthly', label: 'Oylik'   },
  { id: 'yearly',  label: 'Yillik'  },
];

function getMonthLabel(yyyy_mm) {
  if (!yyyy_mm) return '';
  const [y, m] = yyyy_mm.split('-');
  const months = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
  return `${months[+m - 1]} ${y}`;
}

function parseData(a) {
  try { return typeof a.data === 'object' && a.data ? a.data : JSON.parse(a.data || '{}'); }
  catch { return {}; }
}

export default function XBDailyActivity() {
  const { currentUser, getCollection, createEntity } = useApp();

  const allActs  = useMemo(() => getCollection(STORAGE_KEYS.ACTIVITIES), [getCollection]);
  const allUsers = useMemo(() => getCollection(STORAGE_KEYS.USERS),      [getCollection]);

  const myStaff = useMemo(() =>
    allUsers.filter(u => u.role === ROLES.KUTUBXONA_XODIMI && u.libraryId === currentUser?.libraryId),
    [allUsers, currentUser]);

  // Faqat bitta kunlik hisobotlar
  const myLibActs = useMemo(() =>
    allActs.filter(a => a.libraryId === currentUser?.libraryId && a.type === 'daily_report'),
    [allActs, currentUser]);

  const today = new Date().toISOString().split('T')[0];
  const [viewTab,     setViewTab]     = useState('daily');
  const [showModal,   setShowModal]   = useState(false);
  const [showDetail,  setShowDetail]  = useState(null);
  const [dateFilter,  setDateFilter]  = useState(today);
  const [monthFilter, setMonthFilter] = useState(today.slice(0, 7));
  const [yearFilter,  setYearFilter]  = useState(today.slice(0, 4));
  const [staffFilter, setStaffFilter] = useState('all');
  const [form,        setForm]        = useState(buildEmptyForm);

  const filtered = useMemo(() => {
    let list = myLibActs;
    if (staffFilter !== 'all') list = list.filter(a => a.userId === staffFilter);
    if (viewTab === 'daily')   list = list.filter(a => a.date === dateFilter);
    if (viewTab === 'monthly') list = list.filter(a => a.date?.startsWith(monthFilter));
    if (viewTab === 'yearly')  list = list.filter(a => a.date?.startsWith(yearFilter));
    return list.sort((a, b) => new Date(b.date + 'T' + (b.time||'00:00')) - new Date(a.date + 'T' + (a.time||'00:00')));
  }, [myLibActs, staffFilter, viewTab, dateFilter, monthFilter, yearFilter]);

  // Jami sonlar (tanlangan period)
  const periodTotals = useMemo(() => {
    const t = {};
    Object.keys(ACTIVITY_TYPE_LABELS).forEach(k => { t[k] = 0; });
    filtered.forEach(a => {
      const d = parseData(a);
      Object.entries(d).forEach(([k, v]) => { t[k] = (t[k] || 0) + Number(v); });
    });
    return t;
  }, [filtered]);

  // Xodim bo'yicha jadval
  const staffSummary = useMemo(() => {
    if (viewTab === 'daily') return [];
    const scope = myLibActs.filter(a =>
      (staffFilter === 'all' || a.userId === staffFilter) &&
      (viewTab === 'monthly' ? a.date?.startsWith(monthFilter) : a.date?.startsWith(yearFilter))
    );
    return [...myStaff, { id: currentUser?.id, fullName: currentUser?.fullName + ' (Men)', role: ROLES.XODIMLAR_BOSHLIGI }].map(s => {
      const acts = scope.filter(a => a.userId === s.id);
      const totals = {};
      Object.keys(ACTIVITY_TYPE_LABELS).forEach(k => { totals[k] = 0; });
      acts.forEach(a => {
        const d = parseData(a);
        Object.entries(d).forEach(([k, v]) => { totals[k] = (totals[k] || 0) + Number(v); });
      });
      const grand = Object.values(totals).reduce((s, v) => s + v, 0);
      return { staff: s, totals, grand, count: acts.length };
    }).filter(s => s.grand > 0).sort((a, b) => b.grand - a.grand);
  }, [viewTab, myLibActs, myStaff, currentUser, staffFilter, monthFilter, yearFilter]);

  // Yillik chart
  const monthlyChart = useMemo(() => {
    if (viewTab !== 'yearly') return [];
    const months = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'];
    return months.map((m, i) => {
      const prefix = `${yearFilter}-${String(i+1).padStart(2,'0')}`;
      const base = myLibActs.filter(a => a.date?.startsWith(prefix) && (staffFilter==='all'||a.userId===staffFilter));
      const scanner = base.reduce((s,a) => s + (parseData(a).kitob_skanerlash || 0), 0);
      const pdf     = base.reduce((s,a) => s + (parseData(a).kitob_pdf || 0), 0);
      return { name: m, scanner, pdf };
    });
  }, [viewTab, yearFilter, myLibActs, staffFilter]);

  const handleSave = () => {
    const hasAny = Object.values(form.counts).some(v => Number(v) > 0);
    if (!hasAny) { alert("Kamida bitta faoliyat uchun son kiriting"); return; }
    const data = {};
    Object.entries(form.counts).forEach(([k, v]) => { if (Number(v) > 0) data[k] = Number(v); });
    createEntity(STORAGE_KEYS.ACTIVITIES, {
      type:        'daily_report',
      data:        JSON.stringify(data),
      description: form.description,
      date:        form.date,
      time:        form.time,
      libraryId:   currentUser?.libraryId,
      userId:      currentUser?.id,
      status:      'submitted',
    });
    setShowModal(false);
    setForm(buildEmptyForm());
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div>
      <PageHeader
        title="Kunlik faoliyat"
        subtitle="Xodimlar hisobotlari — kunlik, oylik, yillik"
        icon={ICONS.activity}
        action={<Button onClick={() => setShowModal(true)}><ICONS.plus /> Bugungi hisobot</Button>}
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
        {VIEW_TABS.map(tab => (
          <button key={tab.id} onClick={() => setViewTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewTab === tab.id ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filtrlar */}
      <div className="flex gap-3 mb-5 flex-wrap">
        {viewTab === 'daily'   && <input type="date"  value={dateFilter}  onChange={e => setDateFilter(e.target.value)}  className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white" />}
        {viewTab === 'monthly' && <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white" />}
        {viewTab === 'yearly'  && (
          <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white">
            {yearOptions.map(y => <option key={y} value={y}>{y}-yil</option>)}
          </select>
        )}
        <select value={staffFilter} onChange={e => setStaffFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white">
          <option value="all">Barcha xodimlar</option>
          <option value={currentUser?.id}>Men ({currentUser?.fullName})</option>
          {myStaff.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
        </select>
      </div>

      {/* Jami kartalar */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          {Object.entries(ACTIVITY_TYPE_LABELS).map(([key, label]) => (
            <Card key={key} className="text-center">
              <p className="text-2xl font-bold text-blue-600">{formatNumber(periodTotals[key] || 0)}</p>
              <p className="text-xs text-gray-500 mt-1 leading-tight">{label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Yillik chart */}
      {viewTab === 'yearly' && (
        <Card title={`${yearFilter}-yil: Scanner va PDF`} className="mb-5">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyChart}>
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
      )}

      {/* Xodimlar bo'yicha jadval */}
      {(viewTab === 'monthly' || viewTab === 'yearly') && staffSummary.length > 0 && (
        <Card
          title={viewTab === 'monthly' ? `Xodimlar — ${getMonthLabel(monthFilter)}` : `Xodimlar — ${yearFilter}-yil`}
          className="mb-5" noPadding
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Xodim</th>
                  {Object.entries(TYPE_SHORT).map(([k, v]) => (
                    <th key={k} className="text-center px-3 py-3 font-medium">{v}</th>
                  ))}
                  <th className="text-center px-3 py-3 font-medium">Jami</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staffSummary.map(({ staff, totals, grand }) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Hisobotlar ro'yxati */}
      {filtered.length === 0 ? (
        <EmptyState icon={ICONS.activity}
          title={
            viewTab === 'daily'   ? `${formatDate(dateFilter)} kuni uchun hisobot yo'q` :
            viewTab === 'monthly' ? `${getMonthLabel(monthFilter)} uchun hisobot yo'q` :
            `${yearFilter}-yil uchun hisobot yo'q`
          }
        />
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
                  <th className="text-center px-4 py-3 font-medium">Ko'rish</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(a => {
                  const data  = parseData(a);
                  const owner = allUsers.find(u => u.id === a.userId);
                  return (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">
                        {formatDate(a.date)}
                        {a.time && <span className="text-xs text-gray-400 ml-1">{a.time}</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{owner?.fullName || '—'}</td>
                      {Object.keys(TYPE_SHORT).map(k => (
                        <td key={k} className="text-center px-3 py-3 font-semibold text-gray-800">
                          {data[k] ? formatNumber(data[k]) : <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                      <td className="text-center px-4 py-3">
                        <button onClick={() => setShowDetail(a)}
                          className="text-blue-600 hover:text-blue-700">
                          <ICONS.eye />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Qo'shish modali */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setForm(buildEmptyForm()); }}
        title="Bugungi faoliyat hisoboti"
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
                <span className={`text-sm flex-1 ${active ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                  {label}
                </span>
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

      {/* Detail modali */}
      {showDetail && (
        <Modal
          isOpen={!!showDetail}
          onClose={() => setShowDetail(null)}
          title={`${formatDate(showDetail.date)} — Kunlik hisobot`}
          size="sm"
          footer={<Button variant="secondary" onClick={() => setShowDetail(null)}>Yopish</Button>}
        >
          <div className="space-y-2">
            {Object.entries(parseData(showDetail)).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-sm text-gray-600">{ACTIVITY_TYPE_LABELS[key] || key}</span>
                <span className="text-lg font-bold text-blue-700">{formatNumber(val)} <span className="text-xs font-normal text-gray-400">ta</span></span>
              </div>
            ))}
            <div className="text-xs text-gray-400 pt-1 text-center">
              {allUsers.find(u => u.id === showDetail.userId)?.fullName || '—'} tomonidan yuborildi
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
