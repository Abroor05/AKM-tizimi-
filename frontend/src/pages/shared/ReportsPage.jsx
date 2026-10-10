import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import TextArea from '../../components/ui/TextArea.jsx';
import Modal from '../../components/ui/Modal.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ICONS from '../../components/icons.jsx';
import { REPORT_TYPES, REPORT_TYPE_LABELS, REPORT_STATUS, REPORT_STATUS_LABELS, REPORT_STATUS_COLORS, ROLES, ROLE_LABELS, STORAGE_KEYS } from '../../data/constants.js';
import { formatDate, formatMoney } from '../../utils/helpers.js';
import { getViloyatName, getTumanName } from '../../data/regions.js';

export default function ReportsPage() {
  const { currentUser, getReports, createReport, submitReport, reviewReport, isRole, hasPermission, getCollection } = useApp();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [form, setForm] = useState({ title: '', type: REPORT_TYPES.MONTHLY, period: '', description: '', visitors: 0, newReaders: 0, booksGiven: 0, booksReturned: 0, events: 0, revenue: 0, expenses: 0 });

  const allReports = useMemo(() => getReports(), [getReports]);
  const allUsers   = useMemo(() => getCollection(STORAGE_KEYS.USERS) || [],     [getCollection]);
  const libraries  = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES) || [], [getCollection]);

  // Scope reports based on role
  const reports = useMemo(() => {
    if (isRole(ROLES.SUPER_ADMIN)) return allReports;
    if (isRole(ROLES.VILOYAT_ADMIN)) return allReports.filter(r => r.viloyatId === currentUser.viloyatId);
    return allReports.filter(r => r.viloyatId === currentUser.viloyatId && r.tumanId === currentUser.tumanId);
  }, [allReports, currentUser, isRole]);

  const filtered = useMemo(() => {
    return reports.filter(r => {
      const matchSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase());
      const matchType = !typeFilter || r.type === typeFilter;
      const matchStatus = !statusFilter || r.status === statusFilter;
      return matchSearch && matchType && matchStatus;
    }).sort((a, b) => new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt));
  }, [reports, search, typeFilter, statusFilter]);

  const canCreate = hasPermission('create_report');
  const canReview = hasPermission('review_report');

  const handleCreate = () => {
    if (!form.title || !form.type || !form.period) return;
    createReport(form);
    setShowModal(false);
    setForm({ title: '', type: REPORT_TYPES.MONTHLY, period: '', description: '', visitors: 0, newReaders: 0, booksGiven: 0, booksReturned: 0, events: 0, revenue: 0, expenses: 0 });
  };

  const handleSubmit = (id) => {
    if (confirm('Hisobot yuborilsinmi?')) submitReport(id);
  };

  const handleReview = (action) => {
    reviewReport(detailItem.id, action, reviewComment);
    setDetailItem(null);
    setReviewMode(false);
    setReviewComment('');
  };

  return (
    <div>
      <PageHeader title="Hisobotlar" subtitle="Faoliyat hisobotlari va moliyaviy hisobotlar" icon={ICONS.reports}
        action={canCreate && !isRole(ROLES.KUTUBXONA_XODIMI) ? <Button onClick={() => setShowModal(true)}><ICONS.plus /> Yangi hisobot</Button> : null} />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <Card className="text-center"><p className="text-2xl font-bold text-blue-600">{reports.length}</p><p className="text-xs text-gray-500">Jami</p></Card>
        <Card className="text-center"><p className="text-2xl font-bold text-gray-600">{reports.filter(r => r.status === REPORT_STATUS.DRAFT).length}</p><p className="text-xs text-gray-500">Qoralama</p></Card>
        <Card className="text-center"><p className="text-2xl font-bold text-amber-600">{reports.filter(r => r.status === REPORT_STATUS.SUBMITTED || r.status === REPORT_STATUS.UNDER_REVIEW).length}</p><p className="text-xs text-gray-500">Kutilmoqda</p></Card>
        <Card className="text-center"><p className="text-2xl font-bold text-green-600">{reports.filter(r => r.status === REPORT_STATUS.APPROVED).length}</p><p className="text-xs text-gray-500">Tasdiqlangan</p></Card>
        <Card className="text-center"><p className="text-2xl font-bold text-red-600">{reports.filter(r => r.status === REPORT_STATUS.REJECTED).length}</p><p className="text-xs text-gray-500">Rad etilgan</p></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <ICONS.search className="absolute left-3 top-3 text-gray-400" />
          <input type="text" placeholder="Sarlavha bo'yicha qidirish..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white">
          <option value="">Barcha turlar</option>
          {Object.entries(REPORT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white">
          <option value="">Barcha holatlar</option>
          {Object.entries(REPORT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ICONS.reports} title="Hisobotlar topilmadi" />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Sarlavha</th>
                  <th className="text-left px-4 py-3 font-medium">Yuboruvchi / Tashkilot</th>
                  <th className="text-left px-4 py-3 font-medium">Turi</th>
                  <th className="text-left px-4 py-3 font-medium">Davr</th>
                  <th className="text-left px-4 py-3 font-medium">Sana</th>
                  <th className="text-left px-4 py-3 font-medium">Holat</th>
                  <th className="px-4 py-3 text-center font-medium">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(r => {
                  const author = allUsers.find(u => u.id === r.userId || u.id === r.createdBy);
                  const lib = libraries.find(l => l.id === r.libraryId || l.id === author?.libraryId);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setDetailItem(r); setReviewMode(false); }}>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        <div>
                          <p className="font-semibold text-slate-900">{r.title}</p>
                          {r.description && <p className="text-xs text-slate-400 line-clamp-1">{r.description}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {author?.fullName?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 leading-tight">{author?.fullName || 'Noma\'lum xodim'}</p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <ICONS.library className="text-[10px] shrink-0 text-slate-400" />
                              <span className="truncate max-w-[160px]">{lib?.name || 'Kutubxona'}</span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge color="blue">{REPORT_TYPE_LABELS[r.type]}</Badge></td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{r.period}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{r.submittedAt ? formatDate(r.submittedAt) : (r.createdAt ? formatDate(r.createdAt) : 'Qoralama')}</td>
                      <td className="px-4 py-3"><Badge color={REPORT_STATUS_COLORS[r.status]}>{REPORT_STATUS_LABELS[r.status]}</Badge></td>
                      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {canCreate && r.status === REPORT_STATUS.DRAFT && (
                            <button onClick={() => handleSubmit(r.id)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="Yuborish"><ICONS.paperPlane className="text-sm" /></button>
                          )}
                          {canReview && (r.status === REPORT_STATUS.SUBMITTED || r.status === REPORT_STATUS.UNDER_REVIEW) && (
                            <button onClick={() => { setDetailItem(r); setReviewMode(true); }} className="p-1.5 rounded hover:bg-amber-50 text-amber-600" title="Ko'rib chiqish"><ICONS.eye className="text-sm" /></button>
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

      {/* Create modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Yangi hisobot yaratish" size="lg"
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Bekor</Button><Button onClick={handleCreate}><ICONS.save /> Saqlash</Button></>}>
        <div className="space-y-4">
          <Input label="Sarlavha" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Turi" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} options={Object.entries(REPORT_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))} required />
            <Input label="Davr (YYYY-MM yoki YYYY-Qn)" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} placeholder="2024-09 yoki 2024-Q3" required />
          </div>
          <TextArea label="Tavsif" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Faoliyat ko'rsatkichlari</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Input label="Tashriflar" type="number" value={form.visitors} onChange={e => {
                const raw = e.target.value;
                setForm({ ...form, visitors: raw === '' ? '' : Number.isFinite(Number(raw)) ? Number(raw) : 0 });
              }} />
              <Input label="Berilgan kitoblar" type="number" value={form.booksGiven} onChange={e => {
                const raw = e.target.value;
                setForm({ ...form, booksGiven: raw === '' ? '' : Number.isFinite(Number(raw)) ? Number(raw) : 0 });
              }} />
              <Input label="Qaytarilgan kitoblar" type="number" value={form.booksReturned} onChange={e => {
                const raw = e.target.value;
                setForm({ ...form, booksReturned: raw === '' ? '' : Number.isFinite(Number(raw)) ? Number(raw) : 0 });
              }} />
              <Input label="Tadbirlar" type="number" value={form.events} onChange={e => {
                const raw = e.target.value;
                setForm({ ...form, events: raw === '' ? '' : Number.isFinite(Number(raw)) ? Number(raw) : 0 });
              }} />
              <Input label="Daromad (so'm)" type="number" value={form.revenue} onChange={e => {
                const raw = e.target.value;
                setForm({ ...form, revenue: raw === '' ? '' : Number.isFinite(Number(raw)) ? Number(raw) : 0 });
              }} />
            </div>
          </div>
        </div>
      </Modal>

      {/* Detail / Review modal */}
      {detailItem && (
        <Modal isOpen={!!detailItem} onClose={() => { setDetailItem(null); setReviewMode(false); setReviewComment(''); }}
          title={reviewMode ? "Hisobotni ko'rib chiqish" : "Hisobot tafsilotlari"} size="lg"
          footer={reviewMode ? (
            <>
              <Button variant="danger" onClick={() => handleReview('reject')}><ICONS.error /> Rad etish</Button>
              <Button variant="success" onClick={() => handleReview('approve')}><ICONS.check /> Tasdiqlash</Button>
            </>
          ) : <Button variant="secondary" onClick={() => { setDetailItem(null); }}>Yopish</Button>}>
          <div className="space-y-4">
            {/* Sender / Submitter info banner */}
            {(() => {
              const detailAuthor = allUsers.find(u => u.id === detailItem.userId || u.id === detailItem.createdBy);
              const detailLib = libraries.find(l => l.id === detailItem.libraryId || l.id === detailAuthor?.libraryId);
              return (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/80 border border-blue-100">
                  <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <ICONS.user className="text-xs" /> Yuboruvchi xodim ma'lumotlari
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center shrink-0 shadow-sm shadow-blue-600/30 text-base">
                        {detailAuthor?.fullName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-900 leading-tight text-sm sm:text-base">{detailAuthor?.fullName || 'Noma\'lum xodim'}</p>
                        <p className="text-xs text-blue-600 font-semibold mt-0.5">
                          {ROLE_LABELS[detailAuthor?.role] || detailAuthor?.role || 'Xodim'}
                        </p>
                        {detailAuthor?.phone && (
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">Tel: {detailAuthor.phone}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1 text-xs text-slate-600 sm:border-l sm:border-slate-200/80 sm:pl-3">
                      <p className="flex items-center gap-1.5 font-medium text-slate-800">
                        <ICONS.library className="text-blue-500 shrink-0 text-sm" />
                        <span>{detailLib?.name || "Kutubxona biriktirilmagan"}</span>
                      </p>
                      <p className="flex items-center gap-1.5 text-slate-600">
                        <ICONS.map className="text-slate-400 shrink-0 text-sm" />
                        <span>
                          {detailAuthor?.viloyatId ? getViloyatName(detailAuthor.viloyatId) : ''}
                          {detailAuthor?.tumanId ? ` / ${getTumanName(detailAuthor.viloyatId, detailAuthor.tumanId)}` : ''}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Yuborilgan vaqt: <span className="font-semibold text-slate-700">{detailItem.submittedAt ? formatDate(detailItem.submittedAt) : (detailItem.createdAt ? formatDate(detailItem.createdAt) : 'Qoralama')}</span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
            {detailItem.description && <p className="text-sm text-gray-600">{detailItem.description}</p>}
            {(detailItem.visitors !== undefined || detailItem.newReaders !== undefined || detailItem.booksGiven !== undefined) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {detailItem.visitors !== undefined && <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">Tashriflar</p><p className="text-lg font-bold text-gray-800">{detailItem.visitors}</p></div>}
                {detailItem.newReaders !== undefined && <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">Yangi kitobxonlar</p><p className="text-lg font-bold text-gray-800">{detailItem.newReaders}</p></div>}
                {detailItem.booksGiven !== undefined && <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">Berilgan kitoblar</p><p className="text-lg font-bold text-gray-800">{detailItem.booksGiven}</p></div>}
                {detailItem.booksReturned !== undefined && <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">Qaytarilgan</p><p className="text-lg font-bold text-gray-800">{detailItem.booksReturned}</p></div>}
                {detailItem.events !== undefined && <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">Tadbirlar</p><p className="text-lg font-bold text-gray-800">{detailItem.events}</p></div>}
                {detailItem.revenue !== undefined && <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">Daromad</p><p className="text-lg font-bold text-gray-800">{formatMoney(detailItem.revenue)}</p></div>}
              </div>
            )}
            {reviewMode && (
              <div>
                <TextArea label="Izoh (rad etish uchun sabab yoki tasdiqlash)" value={reviewComment} onChange={e => setReviewComment(e.target.value)} rows={3} />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
