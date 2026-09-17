import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Modal from '../../components/ui/Modal.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ICONS from '../../components/icons.jsx';
import { STORAGE_KEYS, READER_STATUS, READER_STATUS_LABELS, READER_STATUS_COLORS, ROLES } from '../../data/constants.js';
import { formatDate } from '../../utils/helpers.js';

export default function ReadersPage() {
  const { currentUser, getCollection, createEntity, updateEntity, deleteEntity, isRole, hasPermission } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ fullName: '', phone: '', address: '', birthYear: 2000, libraryId: '' });

  const allReaders = useMemo(() => getCollection(STORAGE_KEYS.READERS), [getCollection]);
  const libraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES), [getCollection]);

  const scopedLibraries = useMemo(() => {
    if (isRole(ROLES.SUPER_ADMIN, ROLES.VILOYAT_ADMIN)) return libraries;
    if (isRole(ROLES.VILOYAT_ADMIN)) return libraries.filter(l => l.viloyatId === currentUser.viloyatId);
    return libraries.filter(l => l.viloyatId === currentUser.viloyatId && l.tumanId === currentUser.tumanId);
  }, [libraries, currentUser, isRole]);

  const scopedLibIds = scopedLibraries.map(l => l.id);
  const readers = useMemo(() => allReaders.filter(r => scopedLibIds.includes(r.libraryId)), [allReaders, scopedLibIds]);

  const filtered = useMemo(() => {
    return readers.filter(r => {
      const matchSearch = !search || r.fullName.toLowerCase().includes(search.toLowerCase()) || r.cardNumber?.includes(search) || r.phone?.includes(search);
      const matchStatus = !statusFilter || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [readers, search, statusFilter]);

  const canManage = hasPermission('manage_readers');

  const handleSave = () => {
    if (!form.fullName || !form.libraryId) return;
    const saveForm = { ...form, cardNumber: editItem?.cardNumber || `AXTB-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`, status: READER_STATUS.ACTIVE, registeredAt: editItem?.registeredAt || new Date().toISOString().split('T')[0], borrowedCount: editItem?.borrowedCount || 0 };
    if (editItem) {
      updateEntity(STORAGE_KEYS.READERS, editItem.id, saveForm);
    } else {
      createEntity(STORAGE_KEYS.READERS, saveForm);
    }
    setShowModal(false);
    setEditItem(null);
    setForm({ fullName: '', phone: '', address: '', birthYear: 2000, libraryId: scopedLibIds[0] || '' });
  };

  return (
    <div>
      <PageHeader title="Kitobxonlar" subtitle="Kutubxona kitobxonlari ro'yxati" icon={ICONS.readers}
        action={canManage ? <Button onClick={() => { setEditItem(null); setForm({ fullName: '', phone: '', address: '', birthYear: 2000, libraryId: scopedLibIds[0] || '' }); setShowModal(true); }}><ICONS.plus /> Yangi kitobxon</Button> : null} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Card className="text-center"><p className="text-2xl font-bold text-blue-600">{readers.length}</p><p className="text-xs text-gray-500">Jami</p></Card>
        <Card className="text-center"><p className="text-2xl font-bold text-green-600">{readers.filter(r => r.status === READER_STATUS.ACTIVE).length}</p><p className="text-xs text-gray-500">Faol</p></Card>
        <Card className="text-center"><p className="text-2xl font-bold text-amber-600">{readers.filter(r => r.status === READER_STATUS.INACTIVE).length}</p><p className="text-xs text-gray-500">Nofaol</p></Card>
        <Card className="text-center"><p className="text-2xl font-bold text-red-600">{readers.filter(r => r.status === READER_STATUS.BLOCKED).length}</p><p className="text-xs text-gray-500">Bloklangan</p></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <ICONS.search className="absolute left-3 top-3 text-gray-400" />
          <input type="text" placeholder="F.I.O, karta raqami, telefon..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white">
          <option value="">Barcha holatlar</option>
          {Object.entries(READER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ICONS.readers} title="Kitobxonlar topilmadi" />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">F.I.O</th>
                  <th className="text-left px-4 py-3 font-medium">Karta raqami</th>
                  <th className="text-left px-4 py-3 font-medium">Telefon</th>
                  <th className="text-left px-4 py-3 font-medium">Kutubxona</th>
                  <th className="text-center px-4 py-3 font-medium">Kitoblar</th>
                  <th className="text-left px-4 py-3 font-medium">Ro'yxatga olingan</th>
                  <th className="text-left px-4 py-3 font-medium">Holat</th>
                  {canManage && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-semibold text-xs">{r.fullName.charAt(0)}</div><span className="font-medium text-gray-800">{r.fullName}</span></div></td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{r.cardNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{r.phone}</td>
                    <td className="px-4 py-3 text-gray-600">{libraries.find(l => l.id === r.libraryId)?.name || '-'}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{r.borrowedCount}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(r.registeredAt)}</td>
                    <td className="px-4 py-3"><Badge color={READER_STATUS_COLORS[r.status]}>{READER_STATUS_LABELS[r.status]}</Badge></td>
                    {canManage && (
                      <td className="px-4 py-3"><div className="flex items-center gap-1">
                        <button onClick={() => { setEditItem(r); setForm(r); setShowModal(true); }} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><ICONS.edit className="text-sm" /></button>
                        <button onClick={() => { if (confirm('O\'chirilsinmi?')) deleteEntity(STORAGE_KEYS.READERS, r.id); }} className="p-1.5 rounded hover:bg-red-50 text-red-600"><ICONS.trash className="text-sm" /></button>
                      </div></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? "Kitobxonni tahrirlash" : "Yangi kitobxon"} size="md"
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Bekor</Button><Button onClick={handleSave}><ICONS.save /> Saqlash</Button></>}>
        <div className="space-y-4">
          <Input label="F.I.O" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required />
          <Input label="Telefon" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <Input label="Manzil" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          <Input label="Tug'ilgan yil" type="number" value={form.birthYear} onChange={e => setForm({ ...form, birthYear: parseInt(e.target.value) || 2000 })} />
          <Select label="Kutubxona" value={form.libraryId} onChange={e => setForm({ ...form, libraryId: e.target.value })} options={scopedLibraries.map(l => ({ value: l.id, label: l.name }))} required />
        </div>
      </Modal>
    </div>
  );
}
