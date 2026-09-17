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
import { STORAGE_KEYS, ROLES } from '../../data/constants.js';
import { VILOYATLAR, getViloyatName, getTumanName } from '../../data/regions.js';
import { generateId } from '../../utils/helpers.js';

export default function LibrariesPage() {
  const { currentUser, getCollection, createEntity, updateEntity, deleteEntity, isRole } = useApp();
  const [search, setSearch] = useState('');
  const [viloyatFilter, setViloyatFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'markaz', viloyatId: '', tumanId: '', address: '', phone: '', email: '', staffCount: 1, foundingYear: new Date().getFullYear() });

  const allLibraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES), [getCollection]);

  // Scope libraries based on user role
  const libraries = useMemo(() => {
    if (isRole(ROLES.SUPER_ADMIN)) return allLibraries;
    if (isRole(ROLES.VILOYAT_ADMIN)) return allLibraries.filter(l => l.viloyatId === currentUser.viloyatId);
    return allLibraries.filter(l => l.viloyatId === currentUser.viloyatId && l.tumanId === currentUser.tumanId);
  }, [allLibraries, currentUser, isRole]);

  const filtered = useMemo(() => {
    return libraries.filter(l => {
      const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.address?.toLowerCase().includes(search.toLowerCase());
      const matchViloyat = !viloyatFilter || l.viloyatId === viloyatFilter;
      return matchSearch && matchViloyat;
    });
  }, [libraries, search, viloyatFilter]);

  const canManage = isRole(ROLES.SUPER_ADMIN, ROLES.VILOYAT_ADMIN, ROLES.TUMAN_ADMIN);

  const handleSave = () => {
    if (!form.name || !form.viloyatId) return;
    if (editItem) {
      updateEntity(STORAGE_KEYS.LIBRARIES, editItem.id, form);
    } else {
      createEntity(STORAGE_KEYS.LIBRARIES, { ...form, status: 'active' });
    }
    setShowModal(false);
    setEditItem(null);
    setForm({ name: '', type: 'markaz', viloyatId: '', tumanId: '', address: '', phone: '', email: '', staffCount: 1, foundingYear: new Date().getFullYear() });
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm(item);
    setShowModal(true);
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', type: 'markaz', viloyatId: currentUser?.viloyatId || '', tumanId: currentUser?.tumanId || '', address: '', phone: '', email: '', staffCount: 1, foundingYear: new Date().getFullYear() });
    setShowModal(true);
  };

  const selectedViloyat = VILOYATLAR.find(v => v.id === form.viloyatId);

  return (
    <div>
      <PageHeader
        title="AKM / Kutubxonalar"
        subtitle="Axborot-kutubxona markazlari va filiallari"
        icon={ICONS.library}
        action={canManage ? <Button onClick={openCreate}><ICONS.plus /> Yangi kutubxona</Button> : null}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <ICONS.search className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Qidirish..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        {isRole(ROLES.SUPER_ADMIN) && (
          <select
            value={viloyatFilter}
            onChange={e => setViloyatFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
          >
            <option value="">Barcha viloyatlar</option>
            {VILOYATLAR.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        )}
      </div>

      {/* Libraries grid */}
      {filtered.length === 0 ? (
        <EmptyState icon={ICONS.library} title="Kutubxonalar topilmadi" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(lib => (
            <Card key={lib.id}>
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                  <ICONS.library className="text-xl" />
                </div>
                <div className="flex items-center gap-1">
                  <Badge color={lib.type === 'markaz' ? 'blue' : 'gray'}>
                    {lib.type === 'markaz' ? 'Markaz' : 'Filial'}
                  </Badge>
                  {canManage && (
                    <button onClick={() => openEdit(lib)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                      <ICONS.edit className="text-sm" />
                    </button>
                  )}
                </div>
              </div>
              <h3 className="font-semibold text-gray-800">{lib.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{lib.address}</p>
              <div className="mt-3 pt-3 border-t border-gray-50 space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <ICONS.location className="text-xs text-gray-400" />
                  {getViloyatName(lib.viloyatId)} / {getTumanName(lib.viloyatId, lib.tumanId)}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <ICONS.phone className="text-xs text-gray-400" />
                  {lib.phone}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <ICONS.users className="text-xs text-gray-400" />
                  Xodimlar: {lib.staffCount} kishi
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? "Kutubxonani tahrirlash" : "Yangi kutubxona qo'shish"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Bekor qilish</Button>
            <Button onClick={handleSave}><ICONS.save /> Saqlash</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nomi" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <Select
            label="Turi"
            value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value })}
            options={[{ value: 'markaz', label: 'Markaz (AKM)' }, { value: 'filial', label: 'Filial' }]}
          />
          <Select
            label="Viloyat"
            value={form.viloyatId}
            onChange={e => setForm({ ...form, viloyatId: e.target.value, tumanId: '' })}
            options={VILOYATLAR.map(v => ({ value: v.id, label: v.name }))}
            required
          />
          <Select
            label="Tuman/Shahar"
            value={form.tumanId}
            onChange={e => setForm({ ...form, tumanId: e.target.value })}
            options={(selectedViloyat?.tumanlar || []).map(t => ({ value: t.id, label: t.name }))}
            required
          />
          <Input label="Manzil" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="sm:col-span-2" />
          <Input label="Telefon" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <Input label="Xodimlar soni" type="number" value={form.staffCount} onChange={e => setForm({ ...form, staffCount: parseInt(e.target.value) || 0 })} />
          <Input label="Tashkil etilgan yil" type="number" value={form.foundingYear} onChange={e => setForm({ ...form, foundingYear: parseInt(e.target.value) || new Date().getFullYear() })} />
        </div>
      </Modal>
    </div>
  );
}
