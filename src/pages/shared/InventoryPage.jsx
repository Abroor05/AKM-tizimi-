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
import { STORAGE_KEYS, INVENTORY_TYPES, INVENTORY_TYPE_LABELS, INVENTORY_STATUS, INVENTORY_STATUS_LABELS, INVENTORY_STATUS_COLORS, ROLES } from '../../data/constants.js';
import { formatMoney, formatDate } from '../../utils/helpers.js';

export default function InventoryPage() {
  const { currentUser, getCollection, createEntity, updateEntity, deleteEntity, isRole, hasPermission } = useApp();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', type: INVENTORY_TYPES.FURNITURE, quantity: 1, unitPrice: 0, status: INVENTORY_STATUS.GOOD, purchaseDate: '', serialNumber: '', libraryId: '' });

  const allInv = useMemo(() => getCollection(STORAGE_KEYS.INVENTORY), [getCollection]);
  const libraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES), [getCollection]);

  const scopedLibIds = useMemo(() => {
    if (isRole(ROLES.SUPER_ADMIN, ROLES.VILOYAT_ADMIN)) return libraries.map(l => l.id);
    if (isRole(ROLES.VILOYAT_ADMIN)) return libraries.filter(l => l.viloyatId === currentUser.viloyatId).map(l => l.id);
    return libraries.filter(l => l.viloyatId === currentUser.viloyatId && l.tumanId === currentUser.tumanId).map(l => l.id);
  }, [libraries, currentUser, isRole]);

  const inventory = useMemo(() => allInv.filter(i => scopedLibIds.includes(i.libraryId)), [allInv, scopedLibIds]);

  const filtered = useMemo(() => {
    return inventory.filter(i => {
      const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.serialNumber?.includes(search);
      const matchType = !typeFilter || i.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [inventory, search, typeFilter]);

  const canManage = hasPermission('manage_inventory');
  const totalValue = useMemo(() => inventory.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0), [inventory]);

  const handleSave = () => {
    if (!form.name || !form.type) return;
    if (editItem) {
      updateEntity(STORAGE_KEYS.INVENTORY, editItem.id, form);
    } else {
      createEntity(STORAGE_KEYS.INVENTORY, form);
    }
    setShowModal(false);
    setEditItem(null);
    setForm({ name: '', type: INVENTORY_TYPES.FURNITURE, quantity: 1, unitPrice: 0, status: INVENTORY_STATUS.GOOD, purchaseDate: '', serialNumber: '', libraryId: scopedLibIds[0] || '' });
  };

  return (
    <div>
      <PageHeader title="Inventarlar" subtitle="Kutubxona jihoz va inventarlari" icon={ICONS.inventory}
        action={canManage ? <Button onClick={() => { setEditItem(null); setForm({ name: '', type: INVENTORY_TYPES.FURNITURE, quantity: 1, unitPrice: 0, status: INVENTORY_STATUS.GOOD, purchaseDate: '', serialNumber: '', libraryId: scopedLibIds[0] || '' }); setShowModal(true); }}><ICONS.plus /> Yangi inventar</Button> : null} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Card className="text-center"><p className="text-2xl font-bold text-blue-600">{inventory.length}</p><p className="text-xs text-gray-500">Jami pozitsiyalar</p></Card>
        <Card className="text-center"><p className="text-2xl font-bold text-green-600">{inventory.filter(i => i.status === INVENTORY_STATUS.GOOD).length}</p><p className="text-xs text-gray-500">Yaxshi holatda</p></Card>
        <Card className="text-center"><p className="text-2xl font-bold text-amber-600">{inventory.filter(i => i.status === INVENTORY_STATUS.NEEDS_REPAIR).length}</p><p className="text-xs text-gray-500">Ta'mirga muhtoj</p></Card>
        <Card className="text-center"><p className="text-2xl font-bold text-indigo-600">{formatMoney(totalValue)}</p><p className="text-xs text-gray-500">Umumiy qiymat</p></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <ICONS.search className="absolute left-3 top-3 text-gray-400" />
          <input type="text" placeholder="Nomi, seriya raqami..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white">
          <option value="">Barcha turlar</option>
          {Object.entries(INVENTORY_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ICONS.inventory} title="Inventarlar topilmadi" />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Nomi</th>
                  <th className="text-left px-4 py-3 font-medium">Turi</th>
                  <th className="text-center px-4 py-3 font-medium">Miqdori</th>
                  <th className="text-left px-4 py-3 font-medium">Narxi</th>
                  <th className="text-left px-4 py-3 font-medium">Ser. raqam</th>
                  <th className="text-left px-4 py-3 font-medium">Sotib olingan</th>
                  <th className="text-left px-4 py-3 font-medium">Holat</th>
                  {canManage && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(i => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{i.name}</td>
                    <td className="px-4 py-3"><Badge color="blue">{INVENTORY_TYPE_LABELS[i.type]}</Badge></td>
                    <td className="px-4 py-3 text-center text-gray-600">{i.quantity}</td>
                    <td className="px-4 py-3 text-gray-600">{formatMoney(i.unitPrice * i.quantity)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{i.serialNumber || '-'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(i.purchaseDate)}</td>
                    <td className="px-4 py-3"><Badge color={INVENTORY_STATUS_COLORS[i.status]}>{INVENTORY_STATUS_LABELS[i.status]}</Badge></td>
                    {canManage && (
                      <td className="px-4 py-3"><div className="flex items-center gap-1">
                        <button onClick={() => { setEditItem(i); setForm(i); setShowModal(true); }} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><ICONS.edit className="text-sm" /></button>
                        <button onClick={() => { if (confirm('O\'chirilsinmi?')) deleteEntity(STORAGE_KEYS.INVENTORY, i.id); }} className="p-1.5 rounded hover:bg-red-50 text-red-600"><ICONS.trash className="text-sm" /></button>
                      </div></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? "Inventarni tahrirlash" : "Yangi inventar"} size="md"
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Bekor</Button><Button onClick={handleSave}><ICONS.save /> Saqlash</Button></>}>
        <div className="space-y-4">
          <Input label="Nomi" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <Select label="Turi" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} options={Object.entries(INVENTORY_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Miqdori" type="number" value={form.quantity} onChange={e => {
              const raw = e.target.value;
              setForm({ ...form, quantity: raw === '' ? '' : Number.isFinite(Number(raw)) ? Number(raw) : 1 });
            }} />
            <Input label="Birlik narxi (so'm)" type="number" value={form.unitPrice} onChange={e => {
              const raw = e.target.value;
              setForm({ ...form, unitPrice: raw === '' ? '' : Number.isFinite(Number(raw)) ? Number(raw) : 0 });
            }} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Holat" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} options={Object.entries(INVENTORY_STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
            <Input label="Sotib olingan sana" type="date" value={form.purchaseDate} onChange={e => setForm({ ...form, purchaseDate: e.target.value })} />
          </div>
          <Input label="Seriya raqami" value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} />
          <Select label="Kutubxona" value={form.libraryId} onChange={e => setForm({ ...form, libraryId: e.target.value })} options={libraries.filter(l => scopedLibIds.includes(l.id)).map(l => ({ value: l.id, label: l.name }))} />
        </div>
      </Modal>
    </div>
  );
}
