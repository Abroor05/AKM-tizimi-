import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import TextArea from '../../components/ui/TextArea.jsx';
import Modal from '../../components/ui/Modal.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ICONS from '../../components/icons.jsx';
import { STORAGE_KEYS, APPEAL_STATUS, APPEAL_STATUS_LABELS, ROLES } from '../../data/constants.js';
import { formatDate } from '../../utils/helpers.js';

const APPEAL_STATUS_COLORS = {
  [APPEAL_STATUS.NEW]: 'blue',
  [APPEAL_STATUS.IN_PROGRESS]: 'amber',
  [APPEAL_STATUS.RESOLVED]: 'green',
  [APPEAL_STATUS.CLOSED]: 'gray',
};

export default function AppealsPage() {
  const { currentUser, getCollection, createEntity, updateEntity, isRole, hasPermission } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [resolveItem, setResolveItem] = useState(null);
  const [resolution, setResolution] = useState('');
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', subject: '', message: '', libraryId: '' });

  const allAppeals = useMemo(() => getCollection(STORAGE_KEYS.APPEALS), [getCollection]);
  const libraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES), [getCollection]);

  const scopedLibIds = useMemo(() => {
    if (isRole(ROLES.SUPER_ADMIN, ROLES.VILOYAT_ADMIN)) return libraries.map(l => l.id);
    if (isRole(ROLES.VILOYAT_ADMIN)) return libraries.filter(l => l.viloyatId === currentUser.viloyatId).map(l => l.id);
    return libraries.filter(l => l.viloyatId === currentUser.viloyatId && l.tumanId === currentUser.tumanId).map(l => l.id);
  }, [libraries, currentUser, isRole]);

  const appeals = useMemo(() => allAppeals.filter(a => scopedLibIds.includes(a.libraryId)), [allAppeals, scopedLibIds]);

  const filtered = useMemo(() => {
    return appeals.filter(a => {
      const matchSearch = !search || a.fullName?.toLowerCase().includes(search.toLowerCase()) || a.subject?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || a.status === statusFilter;
      return matchSearch && matchStatus;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [appeals, search, statusFilter]);

  const canManage = hasPermission('manage_appeals');

  const handleResolve = () => {
    if (!resolution) return;
    updateEntity(STORAGE_KEYS.APPEALS, resolveItem.id, {
      status: APPEAL_STATUS.RESOLVED,
      resolution,
      resolvedAt: new Date().toISOString().split('T')[0],
      resolvedBy: currentUser?.id,
    });
    setResolveItem(null);
    setResolution('');
  };

  return (
    <div>
      <PageHeader title="Murojaatlar" subtitle="Fuqarolar murojaatlari va shikoyatlar" icon={ICONS.appeals} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Card className="text-center"><p className="text-2xl font-bold text-blue-600">{appeals.filter(a => a.status === APPEAL_STATUS.NEW).length}</p><p className="text-xs text-gray-500">Yangi</p></Card>
        <Card className="text-center"><p className="text-2xl font-bold text-amber-600">{appeals.filter(a => a.status === APPEAL_STATUS.IN_PROGRESS).length}</p><p className="text-xs text-gray-500">Ko'rib chiqilmoqda</p></Card>
        <Card className="text-center"><p className="text-2xl font-bold text-green-600">{appeals.filter(a => a.status === APPEAL_STATUS.RESOLVED).length}</p><p className="text-xs text-gray-500">Hal qilingan</p></Card>
        <Card className="text-center"><p className="text-2xl font-bold text-gray-600">{appeals.length}</p><p className="text-xs text-gray-500">Jami</p></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <ICONS.search className="absolute left-3 top-3 text-gray-400" />
          <input type="text" placeholder="F.I.O yoki mavzu..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white">
          <option value="">Barcha holatlar</option>
          {Object.entries(APPEAL_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ICONS.appeals} title="Murojaatlar topilmadi" />
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-gray-800">{a.subject}</h3>
                    <Badge color={APPEAL_STATUS_COLORS[a.status]}>{APPEAL_STATUS_LABELS[a.status]}</Badge>
                  </div>
                  <p className="text-sm text-gray-500">{a.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><ICONS.user className="text-[10px]" />{a.fullName}</span>
                    <span className="flex items-center gap-1"><ICONS.phone className="text-[10px]" />{a.phone}</span>
                    <span className="flex items-center gap-1"><ICONS.calendar className="text-[10px]" />{formatDate(a.date)}</span>
                  </div>
                  {a.resolution && (
                    <div className="mt-2 p-2 rounded-lg bg-green-50 text-sm text-green-700">
                      <strong>Javob:</strong> {a.resolution}
                    </div>
                  )}
                </div>
                {canManage && a.status !== APPEAL_STATUS.RESOLVED && a.status !== APPEAL_STATUS.CLOSED && (
                  <Button size="sm" onClick={() => { setResolveItem(a); setResolution(a.resolution || ''); }}>
                    <ICONS.edit className="text-sm" /> Javob berish
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={!!resolveItem} onClose={() => { setResolveItem(null); setResolution(''); }} title="Murojaatga javob berish" size="md"
        footer={<><Button variant="secondary" onClick={() => { setResolveItem(null); setResolution(''); }}>Bekor</Button><Button variant="success" onClick={handleResolve}><ICONS.check /> Hal qilish</Button></>}>
        {resolveItem && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700">{resolveItem.subject}</p>
              <p className="text-sm text-gray-500 mt-1">{resolveItem.message}</p>
              <p className="text-xs text-gray-400 mt-1">{resolveItem.fullName} • {resolveItem.phone}</p>
            </div>
            <TextArea label="Javob yechimi" value={resolution} onChange={e => setResolution(e.target.value)} rows={4} required />
          </div>
        )}
      </Modal>
    </div>
  );
}
