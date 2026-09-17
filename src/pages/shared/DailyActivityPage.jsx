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
import { STORAGE_KEYS, ROLES } from '../../data/constants.js';
import { formatDate } from '../../utils/helpers.js';

const ACTIVITY_TYPES = {
  kitob_berish: { label: 'Kitob berish', color: 'blue' },
  kitob_qabul: { label: 'Kitob qabul', color: 'green' },
  yangi_kitobxon: { label: "Yangi kitobxon", color: 'purple' },
  kitob_zaxira: { label: 'Kitob zaxira', color: 'amber' },
  maslahat_berish: { label: 'Maslahat berish', color: 'teal' },
};

export default function DailyActivityPage() {
  const { currentUser, getCollection, createEntity, isRole, hasPermission } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [form, setForm] = useState({ type: 'kitob_berish', description: '', readerId: '', bookId: '', date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().slice(0, 5) });

  const allActivities = useMemo(() => getCollection(STORAGE_KEYS.ACTIVITIES), [getCollection]);
  const books = useMemo(() => getCollection(STORAGE_KEYS.BOOKS), [getCollection]);
  const readers = useMemo(() => getCollection(STORAGE_KEYS.READERS), [getCollection]);
  const libraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES), [getCollection]);

  const scopedLibIds = useMemo(() => {
    if (isRole(ROLES.SUPER_ADMIN, ROLES.VILOYAT_ADMIN)) return libraries.map(l => l.id);
    if (isRole(ROLES.VILOYAT_ADMIN)) return libraries.filter(l => l.viloyatId === currentUser.viloyatId).map(l => l.id);
    return libraries.filter(l => l.viloyatId === currentUser.viloyatId && l.tumanId === currentUser.tumanId).map(l => l.id);
  }, [libraries, currentUser, isRole]);

  const activities = useMemo(() => allActivities.filter(a => scopedLibIds.includes(a.libraryId)), [allActivities, scopedLibIds]);

  const filtered = useMemo(() => {
    return activities.filter(a => {
      const matchDate = !dateFilter || a.date === dateFilter;
      const matchType = !typeFilter || a.type === typeFilter;
      return matchDate && matchType;
    }).sort((a, b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time));
  }, [activities, dateFilter, typeFilter]);

  const canCreate = hasPermission('create_activity');

  const handleSave = () => {
    if (!form.type || !form.date) return;
    createEntity(STORAGE_KEYS.ACTIVITIES, { ...form, libraryId: currentUser?.libraryId || scopedLibIds[0], userId: currentUser?.id, status: 'completed' });
    setShowModal(false);
    setForm({ type: 'kitob_berish', description: '', readerId: '', bookId: '', date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().slice(0, 5) });
  };

  return (
    <div>
      <PageHeader title="Kunlik faoliyat" subtitle="Kutubxona kunlik faoliyat yozuvlari" icon={ICONS.activity}
        action={canCreate ? <Button onClick={() => setShowModal(true)}><ICONS.plus /> Yangi yozuv</Button> : null} />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        {Object.entries(ACTIVITY_TYPES).map(([key, val]) => (
          <Card key={key} className="text-center">
            <p className="text-2xl font-bold text-blue-600">{activities.filter(a => a.type === key).length}</p>
            <p className="text-xs text-gray-500">{val.label}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white" />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white">
          <option value="">Barcha turlar</option>
          {Object.entries(ACTIVITY_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ICONS.activity} title="Faoliyat yozuvlari topilmadi" />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Sana / Vaqt</th>
                  <th className="text-left px-4 py-3 font-medium">Turi</th>
                  <th className="text-left px-4 py-3 font-medium">Tavsif</th>
                  <th className="text-left px-4 py-3 font-medium">Kitobxon</th>
                  <th className="text-left px-4 py-3 font-medium">Kitob</th>
                  <th className="text-left px-4 py-3 font-medium">Holat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{formatDate(a.date)} <span className="text-xs text-gray-400">{a.time}</span></td>
                    <td className="px-4 py-3"><Badge color={ACTIVITY_TYPES[a.type]?.color || 'gray'}>{ACTIVITY_TYPES[a.type]?.label || a.type}</Badge></td>
                    <td className="px-4 py-3 text-gray-600">{a.description}</td>
                    <td className="px-4 py-3 text-gray-600">{readers.find(r => r.id === a.readerId)?.fullName || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{books.find(b => b.id === a.bookId)?.title || '-'}</td>
                    <td className="px-4 py-3"><Badge color="green">Bajarilgan</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Yangi faoliyat yozuvi" size="md"
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Bekor</Button><Button onClick={handleSave}><ICONS.save /> Saqlash</Button></>}>
        <div className="space-y-4">
          <Select label="Turi" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
            options={Object.entries(ACTIVITY_TYPES).map(([k, v]) => ({ value: k, label: v.label }))} required />
          <TextArea label="Tavsif" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Sana" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
            <Input label="Vaqt" type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} required />
          </div>
          <Select label="Kitobxon (ixtiyoriy)" value={form.readerId} onChange={e => setForm({ ...form, readerId: e.target.value })}
            options={readers.filter(r => scopedLibIds.includes(r.libraryId)).map(r => ({ value: r.id, label: r.fullName }))} />
          <Select label="Kitob (ixtiyoriy)" value={form.bookId} onChange={e => setForm({ ...form, bookId: e.target.value })}
            options={books.filter(b => scopedLibIds.includes(b.libraryId)).map(b => ({ value: b.id, label: b.title }))} />
        </div>
      </Modal>
    </div>
  );
}
