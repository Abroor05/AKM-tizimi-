import { useState, useMemo, useEffect } from 'react';
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
import { VILOYATLAR } from '../../data/regions.js';
import { formatDate } from '../../utils/helpers.js';

export default function ReadersPage() {
  const { currentUser, getCollection, createEntity, updateEntity, deleteEntity, hasPermission } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ fullName: '', phone: '+998', address: '', birthDate: '', libraryId: '' });
  const [selectedTuman, setSelectedTuman] = useState(null);

  const allReaders = useMemo(() => getCollection(STORAGE_KEYS.READERS), [getCollection]);
  const libraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES), [getCollection]);

  const isTumanAdmin = currentUser?.role === ROLES.TUMAN_ADMIN;
  const isXodim = currentUser?.role === ROLES.KUTUBXONA_XODIMI;
  const scopedLibraryId = isXodim ? currentUser?.libraryId : null;

  // Auto-select tuman for tuman admin on mount
  useEffect(() => {
    if (isTumanAdmin && currentUser?.tumanId) {
      setSelectedTuman(currentUser.tumanId);
    }
  }, [currentUser]);

  const tumanlar = useMemo(() => VILOYATLAR[0]?.tumanlar || [], []);

  // Map: tumanId -> array of library IDs in that tuman
  const tumanLibraryMap = useMemo(() => {
    const map = {};
    for (const t of tumanlar) {
      map[t.id] = libraries.filter(l => l.tumanId === t.id).map(l => l.id);
    }
    return map;
  }, [tumanlar, libraries]);

  // Map: tumanId -> reader count
  const tumanReaderCounts = useMemo(() => {
    const counts = {};
    for (const t of tumanlar) {
      const libIds = tumanLibraryMap[t.id] || [];
      counts[t.id] = allReaders.filter(r => libIds.includes(r.libraryId)).length;
    }
    return counts;
  }, [tumanlar, tumanLibraryMap, allReaders]);

  const totalReaders = allReaders.length;
  const totalActive = allReaders.filter(r => r.status === READER_STATUS.ACTIVE).length;

  const selectedTumanData = tumanlar.find(t => t.id === selectedTuman);
  const selectedLibIds = selectedTuman ? (tumanLibraryMap[selectedTuman] || []) : [];

  // The readers to display based on role and selection
  const displayReaders = useMemo(() => {
    if (isXodim && scopedLibraryId) {
      return allReaders.filter(r => r.libraryId === scopedLibraryId);
    }
    if (!selectedTuman) return [];
    return allReaders.filter(r => selectedLibIds.includes(r.libraryId));
  }, [isXodim, scopedLibraryId, allReaders, selectedTuman, selectedLibIds]);

  const filteredReaders = useMemo(() => {
    return displayReaders.filter(r => {
      const matchSearch = !search || r.fullName?.toLowerCase().includes(search.toLowerCase()) || r.cardNumber?.includes(search) || r.phone?.includes(search);
      const matchStatus = !statusFilter || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [displayReaders, search, statusFilter]);

  const canManage = hasPermission('manage_readers');

  // Libraries available for the form (scoped by role)
  const formLibraries = useMemo(() => {
    if (isXodim && scopedLibraryId) {
      return libraries.filter(l => l.id === scopedLibraryId);
    }
    if (selectedTuman) {
      return libraries.filter(l => l.tumanId === selectedTuman);
    }
    return libraries;
  }, [isXodim, scopedLibraryId, selectedTuman, libraries]);

  const openCreateModal = () => {
    setEditItem(null);
    setForm({
      fullName: '',
      phone: '+998',
      address: '',
      birthDate: '',
      libraryId: isXodim ? scopedLibraryId : (formLibraries[0]?.id || ''),
    });
    setShowModal(true);
  };

  const handleEdit = (reader) => {
    setEditItem(reader);
    setForm({
      ...reader,
      phone: reader.phone || '+998',
      birthDate: reader.birthDate || (reader.birthYear ? `${reader.birthYear}-01-01` : ''),
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.fullName || !form.libraryId) return;
    const birthYear = form.birthDate ? new Date(form.birthDate).getFullYear() : form.birthYear || 2000;
    const saveForm = {
      ...form,
      birthYear,
      birthDate: form.birthDate || '',
      cardNumber: form.cardNumber || `KBT-${String(Date.now()).slice(-6)}`,
      status: form.status || 'active',
      borrowedCount: form.borrowedCount || 0,
      registeredAt: form.registeredAt || new Date().toISOString().split('T')[0],
    };
    if (editItem) {
      updateEntity(STORAGE_KEYS.READERS, editItem.id, saveForm, currentUser?.id, 'update', 'readers');
    } else {
      createEntity(STORAGE_KEYS.READERS, saveForm, currentUser?.id, 'create', 'readers');
    }
    setShowModal(false);
    setEditItem(null);
  };

  const activeCount = displayReaders.filter(r => r.status === READER_STATUS.ACTIVE).length;
  const inactiveCount = displayReaders.filter(r => r.status === READER_STATUS.INACTIVE).length;
  const blockedCount = displayReaders.filter(r => r.status === READER_STATUS.BLOCKED).length;

  const showGrid = !isXodim && !isTumanAdmin && !selectedTuman;
  const showBackButton = !isXodim && !isTumanAdmin && selectedTuman;

  // ===========================================================
  // GRID VIEW (super admin / viloyat admin - no tuman selected)
  // ===========================================================
  if (showGrid) {
    return (
      <div>
        <PageHeader
          title="Kitobxonlar"
          subtitle="Farg'ona viloyati tumanlari bo'yicha kitobxonlar"
          icon={ICONS.readers}
        />

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card className="text-center">
            <p className="text-3xl font-bold text-blue-600">{totalReaders}</p>
            <p className="text-xs text-gray-500 mt-1">Jami kitobxonlar</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-green-600">{totalActive}</p>
            <p className="text-xs text-gray-500 mt-1">Faol</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-purple-600">{tumanlar.length}</p>
            <p className="text-xs text-gray-500 mt-1">Tumanlar</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-amber-600">{libraries.length}</p>
            <p className="text-xs text-gray-500 mt-1">Kutubxonalar</p>
          </Card>
        </div>

        {/* Tuman cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tumanlar.map(tuman => {
            const count = tumanReaderCounts[tuman.id] || 0;
            return (
              <div
                key={tuman.id}
                onClick={() => { setSearch(''); setStatusFilter(''); setSelectedTuman(tuman.id); }}
                className="group cursor-pointer bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-blue-400 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <ICONS.location className="text-xl" />
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${count > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {count} kitobxon
                  </span>
                </div>
                <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">{tuman.name}</h3>
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-400 group-hover:text-blue-500 transition-colors">
                  <span>Batafsil</span>
                  <ICONS.chevronRight className="text-xs" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ===========================================================
  // READER LIST VIEW (xodim, tuman admin, or admin in a tuman)
  // ===========================================================
  return (
    <div>
      <PageHeader
        title={isXodim ? "Kitobxonlar" : (selectedTumanData?.name || 'Tuman')}
        subtitle={isXodim
          ? (libraries.find(l => l.id === scopedLibraryId)?.name || 'Kutubxona kitobxonlari')
          : "Tuman kitobxonlari ro'yxati"}
        icon={ICONS.readers}
        action={
          <div className="flex gap-2">
            {showBackButton && (
              <Button variant="outline" onClick={() => setSelectedTuman(null)}>
                <ICONS.chevronLeft /> Tumanlarga qaytish
              </Button>
            )}
            {canManage && (
              <Button onClick={openCreateModal}>
                <ICONS.plus /> Yangi kitobxon
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Card className="text-center"><p className="text-2xl font-bold text-blue-600">{displayReaders.length}</p><p className="text-xs text-gray-500 mt-1">Jami</p></Card>
        <Card className="text-center"><p className="text-2xl font-bold text-green-600">{activeCount}</p><p className="text-xs text-gray-500 mt-1">Faol</p></Card>
        <Card className="text-center"><p className="text-2xl font-bold text-amber-600">{inactiveCount}</p><p className="text-xs text-gray-500 mt-1">Nofaol</p></Card>
        <Card className="text-center"><p className="text-2xl font-bold text-red-600">{blockedCount}</p><p className="text-xs text-gray-500 mt-1">Bloklangan</p></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <ICONS.search className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="F.I.O, karta raqami, telefon..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white">
          <option value="">Barcha holatlar</option>
          {Object.entries(READER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {filteredReaders.length === 0 ? (
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
                {filteredReaders.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-semibold text-xs">{r.fullName?.charAt(0)}</div>
                        <span className="font-medium text-gray-800">{r.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{r.cardNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{r.phone}</td>
                    <td className="px-4 py-3 text-gray-600">{libraries.find(l => l.id === r.libraryId)?.name || '-'}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{r.borrowedCount}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(r.registeredAt)}</td>
                    <td className="px-4 py-3"><Badge color={READER_STATUS_COLORS[r.status]}>{READER_STATUS_LABELS[r.status]}</Badge></td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleEdit(r)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><ICONS.edit className="text-sm" /></button>
                          <button onClick={() => { if (confirm('O\'chirilsinmi?')) deleteEntity(STORAGE_KEYS.READERS, r.id); }} className="p-1.5 rounded hover:bg-red-50 text-red-600"><ICONS.trash className="text-sm" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create / Edit modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? "Kitobxonni tahrirlash" : "Yangi kitobxon qo'shish"}
        size="md"
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Bekor</Button><Button onClick={handleSave}><ICONS.save /> Saqlash</Button></>}
      >
        <div className="space-y-4">
          <Input label="F.I.O" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required />
          <Input label="Telefon" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <Input label="Manzil" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          <Input label="Tug'ilgan sana" type="date" value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} />
          <Select
            label="Kutubxona"
            value={form.libraryId}
            onChange={e => setForm({ ...form, libraryId: e.target.value })}
            options={formLibraries.map(l => ({ value: l.id, label: l.name }))}
            required
            disabled={isXodim}
          />
        </div>
      </Modal>
    </div>
  );
}
