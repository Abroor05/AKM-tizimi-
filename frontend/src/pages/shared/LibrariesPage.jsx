import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import ICONS from '../../components/icons.jsx';
import { STORAGE_KEYS, ROLES } from '../../data/constants.js';
import { VILOYATLAR, getViloyatName, getTumanName } from '../../data/regions.js';
import LibraryModal from '../../components/common/LibraryModal.jsx';

export default function LibrariesPage() {
  const { currentUser, getCollection, deleteEntity, isRole } = useApp();
  const [search, setSearch] = useState('');
  const [viloyatFilter, setViloyatFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const allLibraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES), [getCollection]);
  const isDistrictScopedUser = isRole(ROLES.TUMAN_ADMIN, ROLES.KUTUBXONA_XODIMI);

  // Scope libraries based on user role
  const libraries = useMemo(() => {
    if (isRole(ROLES.SUPER_ADMIN)) return allLibraries;
    if (isRole(ROLES.VILOYAT_ADMIN)) return allLibraries.filter(l => l.viloyatId === currentUser?.viloyatId);
    if (isDistrictScopedUser) return allLibraries.filter(l => l.viloyatId === currentUser?.viloyatId && l.tumanId === currentUser?.tumanId);
    return [];
  }, [allLibraries, currentUser, isRole, isDistrictScopedUser]);

  const filtered = useMemo(() => {
    return libraries.filter(l => {
      const matchSearch = !search ||
        l.name?.toLowerCase().includes(search.toLowerCase()) ||
        l.address?.toLowerCase().includes(search.toLowerCase());
      const matchViloyat = !viloyatFilter || l.viloyatId === viloyatFilter;
      return matchSearch && matchViloyat;
    });
  }, [libraries, search, viloyatFilter]);

  const canManage = isRole(ROLES.SUPER_ADMIN, ROLES.VILOYAT_ADMIN, ROLES.TUMAN_ADMIN);

  const handleDelete = (lib) => {
    if (window.confirm(`"${lib.name}" kutubxonasi / bo'limini o'chirishni tasdiqlaysizmi?`)) {
      deleteEntity(STORAGE_KEYS.LIBRARIES, lib.id);
      toast.success("Kutubxona muvaffaqiyatli o'chirildi!");
    }
  };

  const openEdit = (item) => {
    setEditItem(item);
    setShowModal(true);
  };

  const openCreate = () => {
    setEditItem(null);
    setShowModal(true);
  };

  const openGoogleMaps = (lat, lng) => {
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    window.open(`https://www.google.com/maps?q=${latitude},${longitude}&z=16`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="AKM / Kutubxonalar"
        subtitle="Axborot-kutubxona markazlari va filiallari"
        icon={ICONS.library}
        action={canManage ? (
          <Button onClick={openCreate} className="flex items-center gap-2">
            <ICONS.plus />
            <span>Yangi kutubxona</span>
          </Button>
        ) : null}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <ICONS.search className="absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-400 text-sm" />
          <input
            type="text"
            placeholder="Kutubxona nomi yoki manzili bo'yicha qidirish..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 shadow-xs"
          />
        </div>
        {isRole(ROLES.SUPER_ADMIN) && (
          <select
            value={viloyatFilter}
            onChange={e => setViloyatFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 shadow-xs cursor-pointer"
          >
            <option value="">Barcha viloyatlar</option>
            {VILOYATLAR.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        )}
      </div>

      {/* Libraries grid */}
      {filtered.length === 0 ? (
        <EmptyState icon={ICONS.library} title="Kutubxonalar topilmadi" message="Qidiruv shartlariga mos keluvchi kutubxona mavjud emas" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(lib => {
            const hasCoords = Number.isFinite(Number(lib.latitude)) && Number.isFinite(Number(lib.longitude));
            return (
              <Card key={lib.id}>
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                    <ICONS.library className="text-xl" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge color={lib.type === 'markaz' ? 'blue' : 'gray'}>
                      {lib.type === 'markaz' ? 'Markaz (AKM)' : 'Filial'}
                    </Badge>
                    {canManage && (
                      <div className="flex items-center gap-1 ml-1">
                        <button
                          onClick={() => openEdit(lib)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                          title="Tahrirlash / Joylashuvni o'zgartirish"
                        >
                          <ICONS.edit className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleDelete(lib)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                          title="O'chirish"
                        >
                          <ICONS.trash className="text-sm" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base">{lib.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {lib.address || "Manzil ko'rsatilmagan"}
                </p>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <ICONS.location className="text-slate-400" />
                      <span>{getViloyatName(lib.viloyatId)} / {getTumanName(lib.viloyatId, lib.tumanId)}</span>
                    </div>
                    {hasCoords ? (
                      <button
                        type="button"
                        onClick={() => openGoogleMaps(lib.latitude, lib.longitude)}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <ICONS.globe className="text-[10px]" /> Xarita
                      </button>
                    ) : (
                      <span className="text-amber-500 font-medium">GPS yo'q</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <ICONS.phone className="text-slate-400" />
                    <span>{lib.phone || 'Telefon kiritilmagan'}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <ICONS.users className="text-slate-400" />
                      <span>Xodimlar: {lib.staffCount || 1} kishi</span>
                    </div>
                    {lib.foundingYear && (
                      <span className="text-slate-400">{lib.foundingYear}-yil</span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reusable LibraryModal with Real-Time Geolocation & Interactive Map */}
      <LibraryModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditItem(null);
        }}
        editItem={editItem}
      />
    </div>
  );
}
