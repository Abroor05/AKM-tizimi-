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

// Har bir tur uchun qisqacha label
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

export default function DailyActivityPage() {
  const { currentUser, getCollection, createEntity, isRole, hasPermission } = useApp();

  const [viewTab,     setViewTab]     = useState('daily');
  const [showModal,   setShowModal]   = useState(false);
  const [showDetail,  setShowDetail]  = useState(null); // selected activity
  const [dateFilter,  setDateFilter]  = useState(new Date().toISOString().split('T')[0]);
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [yearFilter,  setYearFilter]  = useState(new Date().getFullYear().toString());
  const [form,        setForm]        = useState(buildEmptyForm);

  const allActivities = useMemo(() => getCollection(STORAGE_KEYS.ACTIVITIES), [getCollection]);
  const libraries     = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES),  [getCollection]);
  const allUsers      = useMemo(() => getCollection(STORAGE_KEYS.USERS),      [getCollection]);

  const scopedLibIds = useMemo(() => {
    if (isRole(ROLES.SUPER_ADMIN))         return libraries.map(l => l.id);
    if (isRole(ROLES.VILOYAT_ADMIN))       return libraries.filter(l => l.viloyatId === currentUser.viloyatId).map(l => l.id);
    return libraries.filter(l => l.viloyatId === currentUser.viloyatId && l.tumanId === currentUser.tumanId).map(l => l.id);
  }, [libraries, currentUser, isRole]);

  // Faqat "report" tipidagi (bitta kunlik) yozuvlar
  const activities = useMemo(() =>
    allActivities.filter(a => scopedLibIds.includes(a.libraryId) && a.type === 'daily_report'),
    [allActivities, scopedLibIds]);

  // Ko'rish uchun filtrlash
  const filtered = useMemo(() => {
    let list = activities;
    if (viewTab === 'daily')   list = list.filter(a => a.date === dateFilter);
    if (viewTab === 'monthly') list = list.filter(a => a.date?.startsWith(monthFilter));
    if (viewTab === 'yearly')  list = list.filter(a => a.date?.startsWith(yearFilter));
    return list.sort((a, b) => new Date(b.date + 'T' + (b.time||'00:00')) - new Date(a.date + 'T' + (a.time||'00:00')));
  }, [activities, viewTab, dateFilter, monthFilter, yearFilter]);

  const canCreate = hasPermission('create_activity');

  // Bitta yozuv sifatida saqlash
  const handleSave = () => {
    const hasAny = Object.values(form.counts).some(v => Number(v) > 0);
    if (!hasAny) { alert("Kamida bitta faoliyat uchun son kiriting"); return; }

    const data = {};
    Object.entries(form.counts).forEach(([k, v]) => {
      if (Number(v) > 0) data[k] = Number(v);
    });

    createEntity(STORAGE_KEYS.ACTIVITIES, {
      type:        'daily_report',
      data:        JSON.stringify(data),
      description: form.description,
      date:        form.date,
      time:        form.time,
      libraryId:   currentUser?.libraryId || scopedLibIds[0],
      userId:      currentUser?.id,
      status:      'submitted',
    });

    setShowModal(false);
    setForm(buildEmptyForm());
  };

  // data ni parse qilish
  const parseData = (a) => {
    try { return typeof a.data === 'object' ? a.data : JSON.parse(a.data || '{}'); }
    catch { return {}; }
  };

  // Oylik jami
  const monthTotals = useMemo(() => {
    const totals = {};
    Object.keys(ACTIVITY_TYPE_LABELS).forEach(k => { totals[k] = 0; });
    filtered.forEach(a => {
      const d = parseData(a);
      Object.entries(d).forEach(([k, v]) => { totals[k] = (totals[k] || 0) + v; });
    });
    return totals;
  }, [filtered]);

  const yearOptions = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div>
      <PageHeader
        title="Kunlik faoliyat"
        subtitle="Kunlik bajarilgan ishlar hisoboti"
        icon={ICONS.activity}
        action={canCreate
          ? <Button onClick={() => setShowModal(true)}><ICONS.plus /> Bugungi hisobot</Button>
          : null
        }
      />

      {/* Ko'rish tablari */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
        {VIEW_TABS.map(tab => (
          <button key={tab.id} onClick={() => setViewTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewTab === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filtr */}
      <div className="mb-5">
        {viewTab === 'daily'   && (
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white" />
        )}
        {viewTab === 'monthly' && (
          <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white" />
        )}
        {viewTab === 'yearly'  && (
          <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white">
            {yearOptions.map(y => <option key={y} value={y}>{y}-yil</option>)}
          </select>
        )}
      </div>

      {/* Oylik/yillik jami kartalar */}
      {(viewTab === 'monthly' || viewTab === 'yearly') && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          {Object.entries(ACTIVITY_TYPE_LABELS).map(([key, label]) => (
            <Card key={key} className="text-center">
              <p className="text-2xl font-bold text-blue-600">{formatNumber(monthTotals[key] || 0)}</p>
              <p className="text-xs text-gray-500 mt-1 leading-tight">{label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Hisobotlar ro'yxati */}
      {filtered.length === 0 ? (
        <EmptyState icon={ICONS.activity}
          title={
            viewTab === 'daily'   ? `${formatDate(dateFilter)} kuni uchun hisobot yo'q` :
            viewTab === 'monthly' ? `${getMonthLabel(monthFilter)} uchun hisobot yo'q` :
            `${yearFilter}-yil uchun hisobot yo'q`
          }
          description={canCreate ? "Yangi hisobot qo'shing" : ''}
        />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Sana</th>
                  <th className="text-left px-4 py-3 font-medium">Kim tomonidan</th>
                  {Object.entries(TYPE_SHORT).map(([k, v]) => (
                    <th key={k} className="text-center px-3 py-3 font-medium whitespace-nowrap">{v}</th>
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
                      <td className="px-4 py-3 text-gray-600">{owner?.fullName || '—'}</td>
                      {Object.keys(TYPE_SHORT).map(k => (
                        <td key={k} className="text-center px-3 py-3 font-semibold text-gray-800">
                          {data[k] ? formatNumber(data[k]) : <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                      <td className="text-center px-4 py-3">
                        <button
                          onClick={() => setShowDetail(a)}
                          className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                        >
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

      {/* Hisobot qo'shish modali */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setForm(buildEmptyForm()); }}
        title="Kunlik faoliyat hisoboti"
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
                  type="number"
                  min="0"
                  value={val}
                  onChange={e => setForm(f => ({ ...f, counts: { ...f.counts, [key]: e.target.value } }))}
                  placeholder="0"
                  className="w-20 text-center px-2 py-1.5 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
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
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Vaqt</label>
            <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
        </div>
      </Modal>

      {/* Hisobot detail modali */}
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
            {showDetail.description && (
              <div className="px-4 py-3 rounded-lg bg-amber-50 border border-amber-100 text-sm text-gray-600">
                <span className="font-medium text-amber-700">Izoh: </span>{showDetail.description}
              </div>
            )}
            <div className="text-xs text-gray-400 pt-1 text-center">
              {allUsers.find(u => u.id === showDetail.userId)?.fullName || '—'} tomonidan yuborildi
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
