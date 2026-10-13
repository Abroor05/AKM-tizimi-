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
import { formatDate, formatMoney, formatNumber } from '../../utils/helpers.js';
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
  const [isReviewing, setIsReviewing] = useState(false);
  const [form, setForm] = useState({ title: '', type: REPORT_TYPES.MONTHLY, period: '', description: '', visitors: 0, events: 0, revenue: 0, expenses: 0 });

  const allReports = useMemo(() => getReports(), [getReports]);
  const allUsers   = useMemo(() => getCollection(STORAGE_KEYS.USERS) || [],     [getCollection]);
  const libraries  = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES) || [], [getCollection]);

  // Scope reports based on role
  const reports = useMemo(() => {
    if (isRole(ROLES.SUPER_ADMIN)) return allReports;
    if (isRole(ROLES.VILOYAT_ADMIN)) {
      return allReports.filter(r =>
        !r.viloyatId ||
        r.viloyatId === currentUser?.viloyatId ||
        (r.targetRole && r.targetRole.includes('viloyat_admin'))
      );
    }
    return allReports.filter(r =>
      (!r.viloyatId || r.viloyatId === currentUser?.viloyatId) &&
      (!r.tumanId || r.tumanId === currentUser?.tumanId)
    );
  }, [allReports, currentUser, isRole]);

  const filtered = useMemo(() => {
    return reports.filter(r => {
      const matchSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase());
      const matchType = !typeFilter || r.type === typeFilter;
      const matchStatus = !statusFilter || r.status === statusFilter;
      return matchSearch && matchType && matchStatus;
    }).sort((a, b) => new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt));
  }, [reports, search, typeFilter, statusFilter]);

  const canCreate = hasPermission('create_report') || isRole(ROLES.SUPER_ADMIN) || isRole(ROLES.XODIMLAR_BOSHLIGI);
  const canReview = hasPermission('review_report') || isRole(ROLES.SUPER_ADMIN) || isRole(ROLES.VILOYAT_ADMIN);

  const handleCreate = async () => {
    if (!form.title || !form.type || !form.period) return;
    try {
      await createReport(form);
      setShowModal(false);
      setForm({ title: '', type: REPORT_TYPES.MONTHLY, period: '', description: '', visitors: 0, events: 0, revenue: 0, expenses: 0 });
    } catch (err) {
      alert("Hisobot yaratishda xatolik: " + (err.message || 'Noma\'lum xatolik'));
    }
  };

  const handleSubmit = async (id) => {
    if (window.confirm('Hisobot adminlarga yuborilsinmi?')) {
      try {
        await submitReport(id);
        alert("Hisobot ko'rib chiqish uchun muvaffaqiyatli yuborildi!");
      } catch (err) {
        alert("Yuborishda xatolik: " + (err.message || 'Xatolik yuz berdi'));
      }
    }
  };

  const handleReview = async (action, reportToReview = null) => {
    const target = reportToReview || detailItem;
    if (!target || !target.id) return;

    let comment = (reportToReview ? '' : reviewComment) || '';
    if (action === 'reject') {
      if (!comment.trim()) {
        const promptComment = window.prompt("Hisobotni rad etish sababini kiriting (izoh):", "");
        if (promptComment === null) {
          // Foydalanuvchi bekor qildi
          return;
        }
        comment = promptComment.trim();
        if (!comment) {
          alert("Iltimos, hisobotni rad etish sababini yozing!");
          return;
        }
      }
    }

    const actionText = action === 'approve' ? 'qabul qilish (tasdiqlash)' : 'rad etish';
    if (!window.confirm(`"${target.title}" hisobotini ${actionText}ni tasdiqlaysizmi?`)) {
      return;
    }

    try {
      setIsReviewing(true);
      await reviewReport(target.id, action, comment);

      // Agar ochiq modal shu hisobot bo'lsa, uni mahalliy yangilaymiz
      if (detailItem && detailItem.id === target.id) {
        setDetailItem(prev => ({
          ...prev,
          status: action === 'approve' ? REPORT_STATUS.APPROVED : REPORT_STATUS.REJECTED,
          reviewedAt: new Date().toISOString().split('T')[0],
          reviewedBy: currentUser?.id,
          reviewComment: comment,
        }));
      }
      setReviewMode(false);
      setReviewComment('');

      const successMsg = action === 'approve'
        ? "Hisobot muvaffaqiyatli qabul qilindi (tasdiqlandi)!"
        : "Hisobot rad etildi!";
      alert(successMsg);
    } catch (err) {
      console.error('Review report error:', err);
      const errMsg = err?.response?.data?.error || err?.message || "Hisobotni ko'rib chiqishda xatolik yuz berdi";
      alert("Xatolik yuz berdi: " + errMsg);
    } finally {
      setIsReviewing(false);
    }
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
                  const isPending = r.status === REPORT_STATUS.SUBMITTED || r.status === REPORT_STATUS.UNDER_REVIEW;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setDetailItem(r); setReviewMode(false); setReviewComment(''); }}>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        <div>
                          <p className="font-semibold text-slate-900">{r.title}</p>
                          {r.description && <p className="text-xs text-slate-400 line-clamp-1">{r.description}</p>}
                          {(() => {
                            let repData = {};
                            try { repData = typeof r.data === 'object' && r.data ? r.data : JSON.parse(r.data || '{}'); } catch {}
                            const targetText = repData.sentToText || (
                              r.targetRole?.includes('super_admin') && r.targetRole?.includes('viloyat_admin')
                                ? 'Super Admin & Viloyat Admini'
                                : r.targetRole === 'super_admin' ? 'Super Admin'
                                : r.targetRole === 'viloyat_admin' ? 'Viloyat Admini'
                                : null
                            );
                            if (targetText) {
                              return (
                                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                  <ICONS.paperPlane className="text-[9px]" /> {targetText}ga
                                </span>
                              );
                            }
                            return null;
                          })()}
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
                      <td className="px-4 py-3"><Badge color="blue">{REPORT_TYPE_LABELS[r.type] || r.type}</Badge></td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{r.period || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{r.submittedAt ? formatDate(r.submittedAt) : (r.createdAt ? formatDate(r.createdAt) : 'Qoralama')}</td>
                      <td className="px-4 py-3"><Badge color={REPORT_STATUS_COLORS[r.status]}>{REPORT_STATUS_LABELS[r.status] || r.status}</Badge></td>
                      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Ko'rish tugmasi - doim ko'rinadi */}
                          <button
                            onClick={() => { setDetailItem(r); setReviewMode(false); setReviewComment(''); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-200 transition-colors"
                            title="Hisobot tafsilotlarini ko'rish"
                          >
                            <ICONS.eye className="text-xs text-blue-600" />
                            <span>Ko'rish</span>
                          </button>

                          {/* Admin uchun Qabul qilish va Rad etish tezkor tugmalari */}
                          {canReview && isPending && (
                            <>
                              <button
                                onClick={() => handleReview('approve', r)}
                                disabled={isReviewing}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50"
                                title="Hisobotni qabul qilish va tasdiqlash"
                              >
                                <ICONS.check className="text-xs text-emerald-600" />
                                <span>Qabul</span>
                              </button>
                              <button
                                onClick={() => handleReview('reject', r)}
                                disabled={isReviewing}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
                                title="Hisobotni rad etish"
                              >
                                <ICONS.error className="text-xs text-rose-600" />
                                <span>Rad</span>
                              </button>
                            </>
                          )}

                          {/* Qoralama bo'lsa yuborish */}
                          {canCreate && r.status === REPORT_STATUS.DRAFT && (
                            <button
                              onClick={() => handleSubmit(r.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                              title="Adminlarga yuborish"
                            >
                              <ICONS.paperPlane className="text-xs text-blue-600" />
                              <span>Yuborish</span>
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
              <Input label="Tadbirlar" type="number" value={form.events} onChange={e => {
                const raw = e.target.value;
                setForm({ ...form, events: raw === '' ? '' : Number.isFinite(Number(raw)) ? Number(raw) : 0 });
              }} />
              <Input label="Daromad (so'm)" type="number" value={form.revenue} onChange={e => {
                const raw = e.target.value;
                setForm({ ...form, revenue: raw === '' ? '' : Number.isFinite(Number(raw)) ? Number(raw) : 0 });
              }} />
              <Input label="Xarajatlar (so'm)" type="number" value={form.expenses} onChange={e => {
                const raw = e.target.value;
                setForm({ ...form, expenses: raw === '' ? '' : Number.isFinite(Number(raw)) ? Number(raw) : 0 });
              }} />
            </div>
          </div>
        </div>
      </Modal>

      {/* Detail & Review modal */}
      {detailItem && (
        <Modal
          isOpen={!!detailItem}
          onClose={() => { setDetailItem(null); setReviewMode(false); setReviewComment(''); }}
          title={detailItem.title || "Hisobot tafsilotlari"}
          size="lg"
          footer={(() => {
            const isPending = detailItem.status === REPORT_STATUS.SUBMITTED || detailItem.status === REPORT_STATUS.UNDER_REVIEW;
            if (canReview && isPending) {
              return (
                <div className="flex items-center justify-between w-full gap-2">
                  <Button variant="secondary" onClick={() => { setDetailItem(null); setReviewComment(''); }}>
                    Yopish
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button variant="danger" disabled={isReviewing} onClick={() => handleReview('reject')}>
                      <ICONS.error /> Rad etish
                    </Button>
                    <Button variant="success" disabled={isReviewing} onClick={() => handleReview('approve')}>
                      <ICONS.check /> Qabul qilish (Tasdiqlash)
                    </Button>
                  </div>
                </div>
              );
            }
            if (canReview && detailItem.status === REPORT_STATUS.REJECTED) {
              return (
                <div className="flex items-center justify-between w-full gap-2">
                  <Button variant="secondary" onClick={() => { setDetailItem(null); setReviewComment(''); }}>
                    Yopish
                  </Button>
                  <Button variant="success" disabled={isReviewing} onClick={() => handleReview('approve')}>
                    <ICONS.check /> Qayta ko'rib chiqish (Tasdiqlash)
                  </Button>
                </div>
              );
            }
            if (canReview && detailItem.status === REPORT_STATUS.APPROVED) {
              return (
                <div className="flex items-center justify-between w-full gap-2">
                  <Button variant="secondary" onClick={() => { setDetailItem(null); setReviewComment(''); }}>
                    Yopish
                  </Button>
                  <Button variant="danger" disabled={isReviewing} onClick={() => handleReview('reject')}>
                    <ICONS.error /> Qayta ko'rib chiqish (Rad etish)
                  </Button>
                </div>
              );
            }
            return (
              <Button variant="secondary" onClick={() => { setDetailItem(null); setReviewComment(''); }}>
                Yopish
              </Button>
            );
          })()}
        >
          <div className="space-y-4">
            {/* Holat va turi bo'yicha sarlavha paneli */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-2">
                <Badge color={REPORT_STATUS_COLORS[detailItem.status]}>
                  {REPORT_STATUS_LABELS[detailItem.status] || detailItem.status}
                </Badge>
                <Badge color="blue">
                  {REPORT_TYPE_LABELS[detailItem.type] || detailItem.type}
                </Badge>
                {detailItem.period && (
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                    Davr: {detailItem.period}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {detailItem.submittedAt ? `Yuborilgan: ${formatDate(detailItem.submittedAt)}` : `Yaratilgan: ${formatDate(detailItem.createdAt)}`}
              </div>
            </div>

            {/* Agar oldin ko'rib chiqilgan bo'lsa (Tasdiqlangan yoki Rad etilgan banner) */}
            {(detailItem.status === REPORT_STATUS.APPROVED || detailItem.status === REPORT_STATUS.REJECTED) && (() => {
              const reviewer = allUsers.find(u => u.id === detailItem.reviewedBy);
              const isApp = detailItem.status === REPORT_STATUS.APPROVED;
              return (
                <div className={`p-3.5 rounded-xl border ${isApp ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-rose-50/80 border-rose-200 text-rose-950'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold flex items-center gap-1.5 text-xs sm:text-sm">
                      {isApp ? <ICONS.check className="text-emerald-600" /> : <ICONS.error className="text-rose-600" />}
                      {isApp ? 'Hisobot ko\'rib chiqildi va TASDIQLANDI' : 'Hisobot ko\'rib chiqildi va RAD ETILDI'}
                    </span>
                    {detailItem.reviewedAt && (
                      <span className="text-xs font-mono opacity-80">{formatDate(detailItem.reviewedAt)}</span>
                    )}
                  </div>
                  <p className="text-xs">
                    <span className="font-semibold">Qaror qabul qilgan admin: </span>
                    <span>{reviewer?.fullName || (detailItem.reviewedBy ? 'Admin' : 'Noma\'lum admin')}</span>
                    {reviewer?.role && <span className="opacity-75"> ({ROLE_LABELS[reviewer.role] || reviewer.role})</span>}
                  </p>
                  {detailItem.reviewComment && (
                    <div className="mt-2 p-2.5 rounded-lg bg-white/90 border border-current/15 text-xs">
                      <span className="font-bold">Admin izohi: </span>
                      <span>{detailItem.reviewComment}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Yuboruvchi xodim va tashkilot ma'lumotlari */}
            {(() => {
              const detailAuthor = allUsers.find(u => u.id === detailItem.userId || u.id === detailItem.createdBy);
              const detailLib = libraries.find(l => l.id === detailItem.libraryId || l.id === detailAuthor?.libraryId);
              return (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/90 via-slate-50 to-indigo-50/90 border border-blue-100">
                  <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <ICONS.user className="text-xs" /> Yuboruvchi mas'ul xodim ma'lumotlari
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center shrink-0 shadow-sm shadow-blue-600/30 text-base">
                        {detailAuthor?.fullName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-900 leading-tight text-sm sm:text-base">{detailAuthor?.fullName || 'Noma\'lum xodim'}</p>
                        <p className="text-xs text-blue-600 font-semibold mt-0.5">
                          {ROLE_LABELS[detailAuthor?.role] || detailAuthor?.role || 'Bo\'lim mas\'uli'}
                        </p>
                        {detailAuthor?.phone && (
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">Tel: {detailAuthor.phone}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1 text-xs text-slate-600 sm:border-l sm:border-slate-200/80 sm:pl-3">
                      <p className="flex items-center gap-1.5 font-medium text-slate-800">
                        <ICONS.library className="text-blue-500 shrink-0 text-sm" />
                        <span>{detailLib?.name || "AKM Kutubxonasi"}</span>
                      </p>
                      <p className="flex items-center gap-1.5 text-slate-600">
                        <ICONS.map className="text-slate-400 shrink-0 text-sm" />
                        <span>
                          {detailAuthor?.viloyatId ? getViloyatName(detailAuthor.viloyatId) : ''}
                          {detailAuthor?.tumanId ? ` / ${getTumanName(detailAuthor.viloyatId, detailAuthor.tumanId)}` : ''}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Tavsif */}
            {detailItem.description && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <span className="font-bold text-slate-900 block mb-1">Hisobot mazmuni:</span>
                <p>{detailItem.description}</p>
              </div>
            )}

            {/* Data & Metrics Breakdown */}
            {(() => {
              let parsedData = {};
              try {
                parsedData = typeof detailItem.data === 'object' && detailItem.data
                  ? detailItem.data
                  : JSON.parse(detailItem.data || '{}');
              } catch { parsedData = {}; }

              const totals = parsedData.totals || {};
              const hasTotals = totals && typeof totals === 'object' && Object.values(totals).some(v => Number(v) > 0);
              const targetText = parsedData.sentToText || (
                detailItem.targetRole?.includes('super_admin') && detailItem.targetRole?.includes('viloyat_admin')
                  ? 'Super Admin va Viloyat Admini'
                  : detailItem.targetRole === 'super_admin' ? 'Super Admin'
                  : detailItem.targetRole === 'viloyat_admin' ? 'Viloyat Admini'
                  : null
              );

              const staffEntries = parsedData.staffContributions && typeof parsedData.staffContributions === 'object'
                ? Object.entries(parsedData.staffContributions)
                : [];

              return (
                <div className="space-y-3">
                  {targetText && (
                    <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-xs text-purple-900 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-bold">
                        <ICONS.paperPlane className="text-xs text-purple-600" />
                        Qabul qiluvchi adminlar:
                      </span>
                      <span className="font-extrabold text-purple-800">{targetText}</span>
                    </div>
                  )}

                  {hasTotals && (
                    <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-2.5">
                        <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Bo'lim faoliyati ko'rsatkichlari (Jamlangan)
                        </p>
                        {parsedData.grandTotal !== undefined && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                            Jami: {formatNumber(parsedData.grandTotal)} ta
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        {totals.kitob_skanerlash !== undefined && (
                          <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-sm">
                            <span className="text-slate-500 block">Skanerlash:</span>
                            <span className="font-extrabold text-blue-700 text-sm">{formatNumber(totals.kitob_skanerlash)} sahifa</span>
                          </div>
                        )}
                        {totals.kitob_pdf !== undefined && (
                          <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-sm">
                            <span className="text-slate-500 block">PDF / Elektron:</span>
                            <span className="font-extrabold text-indigo-700 text-sm">{formatNumber(totals.kitob_pdf)} fayl</span>
                          </div>
                        )}
                        {totals.texnik_xizmat !== undefined && (
                          <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-sm">
                            <span className="text-slate-500 block">Texnik xizmat:</span>
                            <span className="font-extrabold text-teal-700 text-sm">{formatNumber(totals.texnik_xizmat)} ta</span>
                          </div>
                        )}
                        {totals.jihozlash !== undefined && (
                          <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-sm">
                            <span className="text-slate-500 block">Jihozlash:</span>
                            <span className="font-extrabold text-amber-700 text-sm">{formatNumber(totals.jihozlash)} ta</span>
                          </div>
                        )}
                        {totals.tuzatish !== undefined && (
                          <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-sm">
                            <span className="text-slate-500 block">Ta'mirlash:</span>
                            <span className="font-extrabold text-purple-700 text-sm">{formatNumber(totals.tuzatish)} ta</span>
                          </div>
                        )}
                        {totals.boshqa !== undefined && (
                          <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-sm">
                            <span className="text-slate-500 block">Boshqa ishlar:</span>
                            <span className="font-extrabold text-slate-700 text-sm">{formatNumber(totals.boshqa)} ta</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {staffEntries.length > 0 && (
                    <div className="border border-slate-200 rounded-xl p-3 bg-white text-xs">
                      <p className="font-bold text-slate-700 mb-2 uppercase text-[11px] tracking-wide flex items-center gap-1.5">
                        <ICONS.users className="text-xs text-teal-600" /> Xodimlar hissasi:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {staffEntries.map(([name, sum]) => (
                          <span key={name} className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold flex items-center gap-1">
                            <span className="font-medium text-slate-700">{name}:</span>
                            <span className="font-bold text-teal-900">{formatNumber(sum)} ta</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Tashriflar, Tadbirlar, Daromad ko'rsatkichlari */}
            {(detailItem.visitors || detailItem.events || detailItem.revenue || detailItem.expenses) ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {detailItem.visitors !== undefined && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-xs text-gray-500">Tashriflar</p>
                    <p className="text-lg font-bold text-gray-800">{formatNumber(detailItem.visitors)}</p>
                  </div>
                )}
                {detailItem.events !== undefined && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-xs text-gray-500">Tadbirlar</p>
                    <p className="text-lg font-bold text-gray-800">{formatNumber(detailItem.events)}</p>
                  </div>
                )}
                {detailItem.revenue !== undefined && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-xs text-gray-500">Daromad</p>
                    <p className="text-lg font-bold text-emerald-700">{formatMoney(detailItem.revenue)}</p>
                  </div>
                )}
                {detailItem.expenses !== undefined && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-xs text-gray-500">Xarajatlar</p>
                    <p className="text-lg font-bold text-rose-700">{formatMoney(detailItem.expenses)}</p>
                  </div>
                )}
              </div>
            ) : null}

            {/* Admin izohi kiritish qismi (faqat ko'rib chiqish huquqiga ega adminlar uchun) */}
            {canReview && (detailItem.status === REPORT_STATUS.SUBMITTED || detailItem.status === REPORT_STATUS.UNDER_REVIEW) && (
              <div className="pt-2 border-t border-slate-200">
                <TextArea
                  label="Admin xulosasi / Izohi (ixtiyoriy yoki rad etish sababi)"
                  placeholder="Hisobot bo'yicha xulosa, ko'rsatma yoki rad etish sababini yozing..."
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  rows={2}
                />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
