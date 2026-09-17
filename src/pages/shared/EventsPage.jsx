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
import { STORAGE_KEYS, EVENT_TYPES, EVENT_TYPE_LABELS, ROLES } from '../../data/constants.js';
import { formatDate } from '../../utils/helpers.js';

export default function EventsPage() {
  const { currentUser, getCollection, createEntity, updateEntity, deleteEntity, isRole, hasPermission } = useApp();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ title: '', type: EVENT_TYPES.READING_HOUR, date: '', time: '', location: '', participants: 0, description: '', libraryId: '', viloyatId: '', tumanId: '' });

  const allEvents = useMemo(() => getCollection(STORAGE_KEYS.EVENTS), [getCollection]);
  const libraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES), [getCollection]);

  const scopedLibIds = useMemo(() => {
    if (isRole(ROLES.SUPER_ADMIN, ROLES.VILOYAT_ADMIN)) return libraries.map(l => l.id);
    if (isRole(ROLES.VILOYAT_ADMIN)) return libraries.filter(l => l.viloyatId === currentUser.viloyatId).map(l => l.id);
    return libraries.filter(l => l.viloyatId === currentUser.viloyatId && l.tumanId === currentUser.tumanId).map(l => l.id);
  }, [libraries, currentUser, isRole]);

  const events = useMemo(() => allEvents.filter(e => scopedLibIds.includes(e.libraryId)), [allEvents, scopedLibIds]);

  const filtered = useMemo(() => {
    return events.filter(e => {
      const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [events, search]);

  const canManage = hasPermission('manage_events');

  const handleSave = () => {
    if (!form.title || !form.type || !form.date) return;
    const saveForm = { ...form, organizer: currentUser?.id, status: new Date(form.date) > new Date() ? 'upcoming' : 'completed' };
    if (editItem) {
      updateEntity(STORAGE_KEYS.EVENTS, editItem.id, saveForm);
    } else {
      createEntity(STORAGE_KEYS.EVENTS, saveForm);
    }
    setShowModal(false);
    setEditItem(null);
    setForm({ title: '', type: EVENT_TYPES.READING_HOUR, date: '', time: '', location: '', participants: 0, description: '', libraryId: '', viloyatId: '', tumanId: '' });
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ title: '', type: EVENT_TYPES.READING_HOUR, date: '', time: '', location: '', participants: 0, description: '', libraryId: scopedLibIds[0] || '', viloyatId: currentUser?.viloyatId || '', tumanId: currentUser?.tumanId || '' });
    setShowModal(true);
  };

  return (
    <div>
      <PageHeader title="Tadbirlar" subtitle="Kutubxona tadbirlari va tadbirlar kalendarini boshqarish" icon={ICONS.events}
        action={canManage ? <Button onClick={openCreate}><ICONS.plus /> Yangi tadbir</Button> : null} />

      {filtered.length === 0 ? (
        <EmptyState icon={ICONS.events} title="Tadbirlar topilmadi" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(ev => (
            <Card key={ev.id}>
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600"><ICONS.events className="text-xl" /></div>
                <div className="flex items-center gap-1">
                  <Badge color={ev.status === 'completed' ? 'green' : 'amber'}>{ev.status === 'completed' ? "O'tkazilgan" : "Yaqinlashmoqda"}</Badge>
                  {canManage && (
                    <button onClick={() => { setEditItem(ev); setForm(ev); setShowModal(true); }} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><ICONS.edit className="text-sm" /></button>
                  )}
                </div>
              </div>
              <h3 className="font-semibold text-gray-800">{ev.title}</h3>
              <Badge color="blue" className="mt-1">{EVENT_TYPE_LABELS[ev.type]}</Badge>
              <p className="text-sm text-gray-500 mt-2">{ev.description}</p>
              <div className="mt-3 pt-3 border-t border-gray-50 space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-gray-600"><ICONS.calendar className="text-xs text-gray-400" />{formatDate(ev.date)} {ev.time}</div>
                <div className="flex items-center gap-2 text-gray-600"><ICONS.location className="text-xs text-gray-400" />{ev.location}</div>
                <div className="flex items-center gap-2 text-gray-600"><ICONS.users className="text-xs text-gray-400" />{ev.participants} ishtirokchi</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? "Tadbirni tahrirlash" : "Yangi tadbir"} size="lg"
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Bekor</Button><Button onClick={handleSave}><ICONS.save /> Saqlash</Button></>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Sarlavha" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className="sm:col-span-2" />
          <Select label="Turi" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} options={Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))} required />
          <Input label="Ishtirokchilar soni" type="number" value={form.participants} onChange={e => setForm({ ...form, participants: parseInt(e.target.value) || 0 })} />
          <Input label="Sana" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
          <Input label="Vaqt" type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
          <Input label="Joy" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="sm:col-span-2" />
          <Select label="Kutubxona" value={form.libraryId} onChange={e => setForm({ ...form, libraryId: e.target.value })} options={libraries.filter(l => scopedLibIds.includes(l.id)).map(l => ({ value: l.id, label: l.name }))} className="sm:col-span-2" />
          <TextArea label="Tavsif" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="sm:col-span-2" />
        </div>
      </Modal>
    </div>
  );
}
