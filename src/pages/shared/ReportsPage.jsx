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
import { REPORT_TYPES, REPORT_TYPE_LABELS, REPORT_STATUS, REPORT_STATUS_LABELS, REPORT_STATUS_COLORS, ROLES } from '../../data/constants.js';
import { formatDate, formatMoney } from '../../utils/helpers.js';

export default function ReportsPage() {
  const { currentUser, getReports, createReport, submitReport, reviewReport, isRole, hasPermission } = useApp();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [form, setForm] = useState({ title: '', type: REPORT_TYPES.MONTHLY, period: '', description: '', visitors: 0, newReaders: 0, booksGiven: 0, booksReturned: 0, events: 0, revenue: 0, expenses: 0 });

  const allReports = useMemo(() => getReports(), [getReports]);

  // Scope reports based on role
  const reports = useMemo(() => {
    if (isRole(ROLES.SUPER_ADMIN, ROLES.VILOYAT_ADMIN)) return allReports;
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
        action={canCreate ? <Button onClick={() => setShowModal(true)}><ICONS.plus /> Yangi hisobot</Button> : null} />

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
                  <th className="text-left px-4 py-3 font-medium">Turi</th>
                  <th className="text-left px-4 py-3 font-medium">Davr</th>
                  <th className="text-left px-4 py-3 font-medium">Sana</th>
                  <th className="text-left px-4 py-3 font-medium">Holat</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setDetailItem(r); setReviewMode(false); }}>
                    <td className="px-4 py-3 font-medium text-gray-800">{r.title}</td>
                    <td className="px-4 py-3"><Badge color="blue">{REPORT_TYPE_LABELS[r.type]}</Badge></td>
                    <td className="px-4 py-3 text-gray-600">{r.period}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{r.submittedAt || 'Qoralama'}</td>
                    <td className="px-4 py-3"><Badge color={REPORT_STATUS_COLORS[r.status]}>{REPORT_STATUS_LABELS[r.status]}</Badge></td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {canCreate && r.status === REPORT_STATUS.DRAFT && (
                          <button onClick={() => handleSubmit(r.id)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="Yuborish"><ICONS.paperPlane className="text-sm" /></button>
                        )}
                        {canReview && (r.status === REPORT_STATUS.SUBMITTED || r.status === REPORT_STATUS.UNDER_REVIEW) && (
                          <button onClick={() => { setDetailItem(r); setReviewMode(true); }} className="p-1.5 rounded hover:bg-amber-50 text-amber-600" title="Ko'rib chiqish"><ICONS.eye className="text-sm" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
              <Input label="Tashriflar" type="number" value={form.visitors} onChange={e => setForm({ ...form, visitors: parseInt(e.target.value) || 0 })} />
              <Input label="Yangi kitobxonlar" type="number" value={form.newReaders} onChange={e => setForm({ ...form, newReaders: parseInt(e.target.value) || 0 })} />
              <Input label="Berilgan kitoblar" type="number" value={form.booksGiven} onChange={e => setForm({ ...form, booksGiven: parseInt(e.target.value) || 0 })} />
              <Input label="Qaytarilgan kitoblar" type="number" value={form.booksReturned} onChange={e => setForm({ ...form, booksReturned: parseInt(e.target.value) || 0 })} />
              <Input label="Tadbirlar" type="number" value={form.events} onChange={e => setForm({ ...form, events: parseInt(e.target.value) || 0 })} />
              <Input label="Daromad (so'm)" type="number" value={form.revenue} onChange={e => setForm({ ...form, revenue: parseInt(e.target.value) || 0 })} />
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
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{detailItem.title}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge color="blue">{REPORT_TYPE_LABELS[detailItem.type]}</Badge>
                <Badge color={REPORT_STATUS_COLORS[detailItem.status]}>{REPORT_STATUS_LABELS[detailItem.status]}</Badge>
                <span className="text-sm text-gray-500">Davr: {detailItem.period}</span>
              </div>
            </div>
            {detailItem.description && <p className="text-sm text-gray-600">{detailItem.description}</p>}
            {detailItem.data && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {detailItem.data.visitors !== undefined && <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">Tashriflar</p><p className="text-lg font-bold text-gray-800">{detailItem.data.visitors}</p></div>}
                {detailItem.data.newReaders !== undefined && <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">Yangi kitobxonlar</p><p className="text-lg font-bold text-gray-800">{detailItem.data.newReaders}</p></div>}
                {detailItem.data.booksGiven !== undefined && <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">Berilgan kitoblar</p><p className="text-lg font-bold text-gray-800">{detailItem.data.booksGiven}</p></div>}
                {detailItem.data.booksReturned !== undefined && <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">Qaytarilgan</p><p className="text-lg font-bold text-gray-800">{detailItem.data.booksReturned}</p></div>}
                {detailItem.data.events !== undefined && <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">Tadbirlar</p><p className="text-lg font-bold text-gray-800">{detailItem.data.events}</p></div>}
                {detailItem.data.revenue !== undefined && <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">Daromad</p><p className="text-lg font-bold text-gray-800">{formatMoney(detailItem.data.revenue)}</p></div>}
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
