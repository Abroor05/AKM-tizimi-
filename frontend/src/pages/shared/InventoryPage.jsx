import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Modal from '../../components/ui/Modal.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ConfirmModal from '../../components/ui/ConfirmModal.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import ICONS from '../../components/icons.jsx';
import {
  STORAGE_KEYS,
  INVENTORY_TYPES,
  INVENTORY_TYPE_LABELS,
  INVENTORY_STATUS,
  INVENTORY_STATUS_LABELS,
  INVENTORY_STATUS_COLORS,
  ROLES,
} from '../../data/constants.js';
import { VILOYATLAR, getTumanName, getAllTumanlar } from '../../data/regions.js';
import { formatMoney, formatDate } from '../../utils/helpers.js';

export default function InventoryPage() {
  const { currentUser, getCollection, createEntity, updateEntity, deleteEntity, isRole, hasPermission } = useApp();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [tumanFilter, setTumanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewItem, setViewItem] = useState(null);

  const [showTotalModal, setShowTotalModal] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isSuperAdmin = currentUser?.role === ROLES.SUPER_ADMIN || currentUser?.role === 'superadmin';
  const isViloyatAdmin = currentUser?.role === ROLES.VILOYAT_ADMIN;
  const isDistrictScopedUser = isRole(ROLES.TUMAN_ADMIN, ROLES.KUTUBXONA_XODIMI, ROLES.XODIMLAR_BOSHLIGI);
  const canManage = hasPermission('manage_inventory') || isSuperAdmin || isViloyatAdmin || currentUser?.role === ROLES.TUMAN_ADMIN;

  const allInv = useMemo(() => getCollection(STORAGE_KEYS.INVENTORY) || [], [getCollection]);
  const libraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES) || [], [getCollection]);

  const currentViloyatId = currentUser?.viloyatId || currentUser?.viloyat_id || 'v01';
  const currentTumanId = currentUser?.tumanId || currentUser?.tuman_id || '';

  // Filtr uchun tumanlar ro'yxati (Super Admin va Viloyat Admin uchun)
  const availableTumanlar = useMemo(() => {
    if (isSuperAdmin || isViloyatAdmin) {
      const v = VILOYATLAR.find((item) => item.id === currentViloyatId) || VILOYATLAR[0];
      return v?.tumanlar || getAllTumanlar();
    }
    return [];
  }, [isSuperAdmin, isViloyatAdmin, currentViloyatId]);

  // Foydalanuvchining ko'rish huquqiga mos kutubxonalar (filiallar bilan birga)
  const scopedLibraries = useMemo(() => {
    if (isSuperAdmin) return libraries;
    if (isViloyatAdmin) return libraries.filter((l) => (l.viloyatId || l.viloyat_id) === currentViloyatId);
    if (isDistrictScopedUser) {
      return libraries.filter(
        (l) =>
          (l.tumanId || l.tuman_id) === currentTumanId ||
          (currentUser?.libraryId && l.id === currentUser.libraryId)
      );
    }
    return libraries;
  }, [libraries, isSuperAdmin, isViloyatAdmin, isDistrictScopedUser, currentViloyatId, currentTumanId, currentUser]);

  const scopedLibIds = useMemo(() => scopedLibraries.map((l) => l.id), [scopedLibraries]);

  // Jihoz qaysi tumanga tegishli ekanligini aniqlash (jihozning o'zida saqlangan tumanId yoki uning kutubxonasi/filiali orqali)
  const resolveTumanId = (item) => {
    if (!item) return '';
    const directTId = item.tumanId || item.tuman_id;
    if (directTId) return directTId;

    const libId = item.libraryId || item.library_id;
    if (libId) {
      const lib = libraries.find((l) => l.id === libId);
      if (lib && (lib.tumanId || lib.tuman_id)) {
        return lib.tumanId || lib.tuman_id;
      }
    }
    return '';
  };

  const resolveTumanName = (item) => {
    if (!item) return '—';
    const tId = resolveTumanId(item);
    const vId = item.viloyatId || item.viloyat_id || currentViloyatId;
    if (vId && tId) {
      const name = getTumanName(vId, tId);
      if (name) return name;
    }
    if (tId) {
      for (const v of VILOYATLAR) {
        const found = v.tumanlar.find((t) => t.id === tId);
        if (found) return found.name;
      }
    }
    const libId = item.libraryId || item.library_id;
    if (libId) {
      const lib = libraries.find((l) => l.id === libId);
      if (lib?.name) return lib.name;
    }
    return '—';
  };

  const resolveLibraryName = (item) => {
    const libId = item?.libraryId || item?.library_id;
    if (!libId) return '—';
    const lib = libraries.find((l) => l.id === libId);
    if (!lib) return '—';
    return lib.type === 'filial' ? `${lib.name} (Filial)` : lib.name;
  };

  // Jihozlar ro'yxati (har bir tuman faqat o'zi kiritgan yoki o'ziga tegishli jihozlarni ko'radi)
  const scopedInventory = useMemo(() => {
    if (isSuperAdmin) return allInv;
    if (isViloyatAdmin) {
      return allInv.filter((i) => {
        const vId = i.viloyatId || i.viloyat_id;
        if (vId === currentViloyatId) return true;
        const libId = i.libraryId || i.library_id;
        return libId && scopedLibIds.includes(libId);
      });
    }
    if (isDistrictScopedUser) {
      return allInv.filter((i) => {
        const itemTumanId = resolveTumanId(i);
        if (itemTumanId && itemTumanId === currentTumanId) return true;
        const libId = i.libraryId || i.library_id;
        return libId && scopedLibIds.includes(libId);
      });
    }
    return allInv;
  }, [allInv, isSuperAdmin, isViloyatAdmin, isDistrictScopedUser, currentViloyatId, currentTumanId, scopedLibIds, libraries]);

  // Qidiruv va filtrlar natijasi
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return scopedInventory.filter((i) => {
      const tumanName = resolveTumanName(i).toLowerCase();
      const libName = resolveLibraryName(i).toLowerCase();

      const matchSearch =
        !q ||
        i.name?.toLowerCase().includes(q) ||
        i.serialNumber?.toLowerCase().includes(q) ||
        tumanName.includes(q) ||
        libName.includes(q);

      const matchType = !typeFilter || i.type === typeFilter;
      const matchStatus = !statusFilter || i.status === statusFilter;

      const itemTumanId = resolveTumanId(i);
      const matchTuman = !tumanFilter || itemTumanId === tumanFilter;

      return matchSearch && matchType && matchStatus && matchTuman;
    });
  }, [scopedInventory, search, typeFilter, statusFilter, tumanFilter, libraries]);

  const totalValue = useMemo(() => {
    return filtered.reduce((sum, i) => sum + ((Number(i.unitPrice) || 0) * (Number(i.quantity) || 1)), 0);
  }, [filtered]);

  // Form State
  const [form, setForm] = useState({
    name: '',
    type: INVENTORY_TYPES.FURNITURE,
    quantity: 1,
    unitPrice: 0,
    status: INVENTORY_STATUS.GOOD,
    purchaseDate: '',
    serialNumber: '',
    tumanId: '',
    libraryId: '',
    notes: '',
  });

  const openCreate = () => {
    setEditItem(null);
    const targetTuman = isDistrictScopedUser
      ? currentTumanId
      : (tumanFilter || availableTumanlar[0]?.id || currentTumanId);
    const matchLib = libraries.find((l) => (l.tumanId || l.tuman_id) === targetTuman);
    const defaultLibId = matchLib?.id || scopedLibraries[0]?.id || currentUser?.libraryId || '';

    setForm({
      name: '',
      type: INVENTORY_TYPES.FURNITURE,
      quantity: 1,
      unitPrice: 0,
      status: INVENTORY_STATUS.GOOD,
      purchaseDate: new Date().toISOString().split('T')[0],
      serialNumber: '',
      tumanId: targetTuman,
      libraryId: defaultLibId,
      notes: '',
    });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    const itemTuman = resolveTumanId(item);
    setForm({
      name: item.name || '',
      type: item.type || INVENTORY_TYPES.FURNITURE,
      quantity: item.quantity != null ? item.quantity : 1,
      unitPrice: item.unitPrice != null ? item.unitPrice : 0,
      status: item.status || INVENTORY_STATUS.GOOD,
      purchaseDate: item.purchaseDate || '',
      serialNumber: item.serialNumber || '',
      tumanId: itemTuman || currentTumanId,
      libraryId: item.libraryId || item.library_id || '',
      notes: item.notes || '',
    });
    setShowModal(true);
  };

  const openView = (item) => {
    setViewItem(item);
    setShowViewModal(true);
  };

  const handleSave = async () => {
    if (!form.name?.trim()) {
      toast.warning("Iltimos, jihoz nomini kiriting!");
      return;
    }

    const tumanId = isDistrictScopedUser ? currentTumanId : (form.tumanId || currentTumanId);
    let libraryId = form.libraryId;

    if (!libraryId) {
      const matchLib = libraries.find((l) => (l.tumanId || l.tuman_id) === tumanId);
      libraryId = matchLib?.id || scopedLibraries[0]?.id || currentUser?.libraryId || '';
    }

    const payload = {
      name: form.name.trim(),
      type: form.type,
      quantity: Number(form.quantity) || 1,
      unitPrice: Number(form.unitPrice) || 0,
      status: form.status,
      purchaseDate: form.purchaseDate || '',
      serialNumber: form.serialNumber?.trim() || '',
      notes: form.notes?.trim() || '',
      tumanId,
      viloyatId: currentViloyatId,
      libraryId,
    };

    try {
      if (editItem) {
        await updateEntity(STORAGE_KEYS.INVENTORY, editItem.id, payload);
        toast.success("Jihoz ma'lumotlari muvaffaqiyatli yangilandi!");
      } else {
        await createEntity(STORAGE_KEYS.INVENTORY, payload);
        toast.success("Yangi inventar muvaffaqiyatli saqlandi!");
      }
      setShowModal(false);
      setEditItem(null);
    } catch (err) {
      toast.error(err.message || "Xatolik yuz berdi");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteEntity(STORAGE_KEYS.INVENTORY, deleteTarget.id);
      toast.success("Inventar muvaffaqiyatli o'chirildi!");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message || "O'chirishda xatolik yuz berdi");
    } finally {
      setIsDeleting(false);
    }
  };

  // Tanlangan tuman bo'yicha mos keluvchi kutubxona va filiallar
  const selectableLibraries = useMemo(() => {
    const activeTumanId = form.tumanId || currentTumanId;
    if (!activeTumanId) return scopedLibraries;
    return libraries.filter((l) => (l.tumanId || l.tuman_id) === activeTumanId);
  }, [libraries, form.tumanId, currentTumanId, scopedLibraries]);

  const hasActiveFilters = Boolean(search || typeFilter || tumanFilter || statusFilter);

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('');
    setTumanFilter('');
    setStatusFilter('');
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventarlar"
        subtitle="Kutubxona moddiy-texnik jihozlari va inventarlar hisobi"
        icon={ICONS.inventory}
        action={
          canManage && (
            <Button onClick={openCreate} className="flex items-center gap-1.5 text-xs py-2 px-3">
              <ICONS.plus className="text-xs" />
              <span>Yangi inventar</span>
            </Button>
          )
        }
      />

      {/* Ixcham statistika kartochkalari */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Jami jihozlar:</span>
          <span className="text-sm font-bold text-blue-600">{filtered.length} ta</span>
        </div>
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Yaxshi holatda:</span>
          <span className="text-sm font-bold text-emerald-600">
            {filtered.filter((i) => i.status === INVENTORY_STATUS.GOOD).length} ta
          </span>
        </div>
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Ta'mirga muhtoj:</span>
          <span className="text-sm font-bold text-amber-600">
            {filtered.filter((i) => i.status === INVENTORY_STATUS.NEEDS_REPAIR).length} ta
          </span>
        </div>
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Umumiy qiymat:</span>
          <button
            type="button"
            onClick={() => setShowTotalModal(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200/80 transition-colors cursor-pointer"
            title="Umumiy summani ko'rish"
          >
            <ICONS.eye className="text-xs" />
            <span>Ko'rish</span>
          </button>
        </div>
      </div>

      {/* Filtrlar va Qidiruv */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Jihoz nomi, seriya raqami yoki tuman..."
        />

        {/* Tuman filtri (faqat Super Admin va Viloyat Admin uchun) */}
        {(isSuperAdmin || isViloyatAdmin) && availableTumanlar.length > 0 && (
          <select
            value={tumanFilter}
            onChange={(e) => setTumanFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none cursor-pointer min-w-[150px]"
          >
            <option value="">Barcha tumanlar</option>
            {availableTumanlar.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}

        {/* Jihoz turi bo'yicha filtr */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none cursor-pointer max-w-[170px]"
        >
          <option value="">Barcha turlar</option>
          {Object.entries(INVENTORY_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {/* Holati bo'yicha filtr */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none cursor-pointer max-w-[170px]"
        >
          <option value="">Barcha holatlar</option>
          {Object.entries(INVENTORY_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs text-rose-600 hover:underline px-1 cursor-pointer whitespace-nowrap ml-auto"
          >
            Tozalash
          </button>
        )}
      </div>

      {/* Inventarlar jadvali */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ICONS.inventory}
          title="Inventarlar topilmadi"
          message={
            hasActiveFilters
              ? "Qidiruv shartlariga mos inventar topilmadi. Filtrlarni tozalab ko'ring."
              : "Hozircha inventarlar mavjud emas. Yangi inventar qo'shishingiz mumkin."
          }
          action={canManage && <Button size="sm" onClick={openCreate}>Yangi inventar qo'shish</Button>}
        />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Jihoz nomi</th>
                  <th className="px-4 py-3">Turi</th>
                  <th className="px-4 py-3">Tegishli tuman</th>
                  <th className="px-4 py-3">Kutubxona / Filial</th>
                  <th className="px-4 py-3 text-center">Miqdori</th>
                  <th className="px-4 py-3 whitespace-nowrap">Narxi</th>
                  <th className="px-4 py-3">Seriya raqami</th>
                  <th className="px-4 py-3">Sotib olingan</th>
                  <th className="px-4 py-3">Holati</th>
                  <th className="px-4 py-3 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Nomi */}
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      <button
                        type="button"
                        onClick={() => openView(item)}
                        className="text-left hover:text-blue-600 cursor-pointer font-bold"
                      >
                        {item.name}
                      </button>
                    </td>

                    {/* Turi */}
                    <td className="px-4 py-3">
                      <Badge color="blue">{INVENTORY_TYPE_LABELS[item.type] || item.type}</Badge>
                    </td>

                    {/* Tegishli Tuman */}
                    <td className="px-4 py-3 font-medium text-slate-700">
                      <span className="inline-flex items-center gap-1.5">
                        <ICONS.location className="text-[11px] text-slate-400 shrink-0" />
                        <span>{resolveTumanName(item)}</span>
                      </span>
                    </td>

                    {/* Kutubxona / Filial */}
                    <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate" title={resolveLibraryName(item)}>
                      {resolveLibraryName(item)}
                    </td>

                    {/* Miqdori */}
                    <td className="px-4 py-3 text-center font-bold text-slate-800">
                      {item.quantity} dona
                    </td>

                    {/* Narxi */}
                    <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                      {formatMoney((Number(item.unitPrice) || 0) * (Number(item.quantity) || 1))} so'm
                    </td>

                    {/* Seriya raqami */}
                    <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                      {item.serialNumber || '—'}
                    </td>

                    {/* Sotib olingan sana */}
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(item.purchaseDate) || '—'}
                    </td>

                    {/* Holati */}
                    <td className="px-4 py-3">
                      <Badge color={INVENTORY_STATUS_COLORS[item.status] || 'gray'}>
                        {INVENTORY_STATUS_LABELS[item.status] || item.status}
                      </Badge>
                    </td>

                    {/* Amallar: Ko'z icon + Tahrirlash/O'chirish */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Ko'z ikonkasi — to'liq ma'lumotlarni ko'rish */}
                        <button
                          type="button"
                          onClick={() => openView(item)}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                          title="To'liq ma'lumotlarni ko'rish"
                        >
                          <ICONS.eye className="text-sm" />
                        </button>

                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(item)}
                              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
                              title="Tahrirlash"
                            >
                              <ICONS.edit className="text-sm" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                              title="O'chirish"
                            >
                              <ICONS.trash className="text-sm" />
                            </button>
                          </>
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

      {/* ================= TO'LIQ MA'LUMOTLAR MODALI (KO'Z ICON) ================= */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewItem(null);
        }}
        title="Jihoz haqida to'liq ma'lumot"
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            {canManage && viewItem ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const target = viewItem;
                  setShowViewModal(false);
                  openEdit(target);
                }}
                className="flex items-center gap-1.5 text-xs"
              >
                <ICONS.edit className="text-xs" />
                <span>Tahrirlash</span>
              </Button>
            ) : <div />}
            <Button variant="secondary" size="sm" onClick={() => setShowViewModal(false)}>
              Yopish
            </Button>
          </div>
        }
      >
        {viewItem && (() => {
          const tumanName = resolveTumanName(viewItem);
          const libName = resolveLibraryName(viewItem);
          const unitPriceNum = Number(viewItem.unitPrice) || 0;
          const quantityNum = Number(viewItem.quantity) || 1;
          const totalItemValue = unitPriceNum * quantityNum;

          return (
            <div className="space-y-3.5 text-xs">
              {/* Header card with name & status */}
              <div className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    {INVENTORY_TYPE_LABELS[viewItem.type] || viewItem.type}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                    {viewItem.name}
                  </h3>
                  <p className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-1">
                    <ICONS.location className="text-[10px] text-slate-400" />
                    <span>{tumanName}</span>
                    {libName !== '—' && <span>• {libName}</span>}
                  </p>
                </div>
                <Badge color={INVENTORY_STATUS_COLORS[viewItem.status] || 'gray'}>
                  {INVENTORY_STATUS_LABELS[viewItem.status] || viewItem.status}
                </Badge>
              </div>

              {/* Data table */}
              <div className="divide-y divide-slate-100 border-t border-b border-slate-100">
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Jihoz nomi:</span>
                  <span className="font-semibold text-slate-800 text-right">{viewItem.name}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Kategoriya / Turi:</span>
                  <span className="font-medium text-slate-700 text-right">
                    {INVENTORY_TYPE_LABELS[viewItem.type] || viewItem.type}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Tegishli tuman:</span>
                  <span className="font-semibold text-blue-700 text-right">{tumanName}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Kutubxona / Filial:</span>
                  <span className="font-medium text-slate-700 text-right">{libName}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Miqdori:</span>
                  <span className="font-bold text-slate-800 text-right">{quantityNum} dona</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Birlik narxi:</span>
                  <span className="font-medium text-slate-700 text-right">{formatMoney(unitPriceNum)} so'm</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Umumiy qiymati:</span>
                  <span className="font-bold text-emerald-700 text-right">{formatMoney(totalItemValue)} so'm</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Seriya / Inventar raqami:</span>
                  <span className="font-mono text-slate-800 text-right">{viewItem.serialNumber || '—'}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Sotib olingan sana:</span>
                  <span className="font-medium text-slate-700 text-right">{formatDate(viewItem.purchaseDate) || '—'}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Holati:</span>
                  <span className="text-right font-medium">
                    {INVENTORY_STATUS_LABELS[viewItem.status] || viewItem.status}
                  </span>
                </div>
                {viewItem.notes && (
                  <div className="py-2">
                    <span className="text-slate-500 block mb-1">Izoh / Qo'shimcha ma'lumot:</span>
                    <p className="p-2 rounded-lg bg-slate-50 text-slate-700 text-[11px] leading-relaxed">
                      {viewItem.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ================= UMUMIY QIYMAT MODALI ================= */}
      <Modal
        isOpen={showTotalModal}
        onClose={() => setShowTotalModal(false)}
        title="Umumiy inventar qiymati"
        size="sm"
        footer={
          <div className="flex justify-end w-full">
            <Button variant="secondary" size="sm" onClick={() => setShowTotalModal(false)}>
              Yopish
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs py-1">
          {/* Asosiy summa bloki */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-50 border border-indigo-100 text-center">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Jami hisoblangan qiymat
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-indigo-700 font-mono tracking-tight break-words">
              {formatMoney(totalValue)} so'm
            </div>
          </div>

          {/* Tafsilotlar */}
          <div className="divide-y divide-slate-100 border-t border-b border-slate-100">
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500">Filtrlangan jihozlar:</span>
              <span className="font-bold text-slate-800">{filtered.length} ta pozitsiya</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500">Jami donalar soni:</span>
              <span className="font-bold text-slate-800">
                {filtered.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0)} dona
              </span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500">Yaxshi holatdagi jihozlar:</span>
              <span className="font-semibold text-emerald-600">
                {filtered.filter((i) => i.status === INVENTORY_STATUS.GOOD).length} ta
              </span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500">Ta'mirga muhtoj jihozlar:</span>
              <span className="font-semibold text-amber-600">
                {filtered.filter((i) => i.status === INVENTORY_STATUS.NEEDS_REPAIR).length} ta
              </span>
            </div>
          </div>
        </div>
      </Modal>

      {/* ================= TAHRIRLASH / YANGI QO'SHISH MODALI ================= */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? "Inventarni tahrirlash" : "Yangi inventar qo'shish"}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setShowModal(false)}>
              Bekor qilish
            </Button>
            <Button size="sm" onClick={handleSave} className="flex items-center gap-1.5">
              <ICONS.save className="text-xs" />
              <span>Saqlash</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-3.5 text-xs">
          <Input
            label="Jihoz nomi"
            placeholder="Masalan: Kompyuter to'plami Core i5, Kitob javoni..."
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <Select
            label="Kategoriya / Turi"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            options={Object.entries(INVENTORY_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
          />

          {/* Tuman (faqat Super Admin va Viloyat Admin uchun tanlanishi mumkin) */}
          {(isSuperAdmin || isViloyatAdmin) ? (
            <Select
              label="Tegishli tuman"
              value={form.tumanId}
              onChange={(e) => {
                const newTumanId = e.target.value;
                const matchLib = libraries.find((l) => (l.tumanId || l.tuman_id) === newTumanId);
                setForm({
                  ...form,
                  tumanId: newTumanId,
                  libraryId: matchLib?.id || '',
                });
              }}
              options={availableTumanlar.map((t) => ({ value: t.id, label: t.name }))}
            />
          ) : (
            <div>
              <label className="block text-slate-500 mb-1 font-medium">Tegishli tuman</label>
              <div className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                {getTumanName(currentViloyatId, currentTumanId) || currentTumanId}
              </div>
            </div>
          )}

          {/* Kutubxona / Filial */}
          <Select
            label="Kutubxona / Filial"
            value={form.libraryId}
            onChange={(e) => setForm({ ...form, libraryId: e.target.value })}
            options={selectableLibraries.map((l) => ({
              value: l.id,
              label: l.type === 'filial' ? `${l.name} (Filial)` : l.name,
            }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Miqdori (dona)"
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => {
                const raw = e.target.value;
                setForm({ ...form, quantity: raw === '' ? '' : Number.isFinite(Number(raw)) ? Number(raw) : 1 });
              }}
            />
            <Input
              label="Birlik narxi (so'm)"
              type="number"
              min="0"
              value={form.unitPrice}
              onChange={(e) => {
                const raw = e.target.value;
                setForm({ ...form, unitPrice: raw === '' ? '' : Number.isFinite(Number(raw)) ? Number(raw) : 0 });
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Holati"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={Object.entries(INVENTORY_STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))}
            />
            <Input
              label="Sotib olingan sana"
              type="date"
              value={form.purchaseDate}
              onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
            />
          </div>

          <Input
            label="Seriya / Inventar raqami"
            placeholder="Masalan: INV-2026-0042"
            value={form.serialNumber}
            onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
          />

          <div>
            <label className="block text-slate-600 mb-1 font-medium">Izoh / Qo'shimcha ma'lumot</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Jihoz haqida qo'shimcha ma'lumotlar..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </Modal>

      {/* ================= O'CHIRISHNI TASDIQLASH MODALI ================= */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Inventarni o'chirish"
        message={`Haqiqatan ham "${deleteTarget?.name || 'ushbu'}" jihozini o'chirib tashlamoqchimisiz? Ushbu amalni ortga qaytarib bo'lmaydi.`}
        confirmText="Ha, o'chirilsin"
        cancelText="Bekor qilish"
      />
    </div>
  );
}
