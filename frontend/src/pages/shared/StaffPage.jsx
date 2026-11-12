import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import ICONS from '../../components/icons.jsx';
import { STORAGE_KEYS, ROLES, STAFF_POSITIONS, STAFF_DEPARTMENTS } from '../../data/constants.js';
import { VILOYATLAR, getViloyatName, getTumanName, getAllTumanlar } from '../../data/regions.js';
import StaffModal from '../../components/common/StaffModal.jsx';
import ConfirmModal from '../../components/ui/ConfirmModal.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import { formatDate } from '../../utils/helpers.js';

function calculateAge(birthDate) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age > 0 ? age : null;
}

export default function StaffPage() {
  const { currentUser, getCollection, deleteEntity, createEntity, updateEntity, isRole } = useApp();

  const [search, setSearch] = useState('');
  const [viloyatFilter, setViloyatFilter] = useState('');
  const [tumanFilter, setTumanFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewItem, setViewItem] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isSuperAdmin = currentUser?.role === ROLES.SUPER_ADMIN || currentUser?.role === 'superadmin';
  const isViloyatAdmin = currentUser?.role === ROLES.VILOYAT_ADMIN;
  const isTumanAdmin = currentUser?.role === ROLES.TUMAN_ADMIN;
  const isDistrictScopedUser = isRole(ROLES.TUMAN_ADMIN, ROLES.KUTUBXONA_XODIMI, ROLES.XODIMLAR_BOSHLIGI);
  const isXodimlarBoshligi = isRole(ROLES.XODIMLAR_BOSHLIGI);

  // Faqat Super Admin, Viloyat Admini va Tuman direktori (tuman_admin) xodimlarni boshqara oladi
  const canManage = isSuperAdmin || isViloyatAdmin || isTumanAdmin;

  const allLibraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES) || [], [getCollection]);
  const allStaff = useMemo(() => getCollection(STORAGE_KEYS.STAFF) || [], [getCollection]);

  const scopedLibraries = useMemo(() => {
    if (isSuperAdmin) return allLibraries;
    if (isViloyatAdmin) {
      const vId = currentUser?.viloyatId || currentUser?.viloyat_id || 'v01';
      return allLibraries.filter((l) => (l.viloyatId || l.viloyat_id) === vId);
    }
    if (isDistrictScopedUser) {
      const vId = currentUser?.viloyatId || currentUser?.viloyat_id;
      const tId = currentUser?.tumanId || currentUser?.tuman_id;
      return allLibraries.filter(
        (l) =>
          (!vId || (l.viloyatId || l.viloyat_id) === vId) &&
          (l.tumanId || l.tuman_id) === tId
      );
    }
    return allLibraries;
  }, [allLibraries, currentUser, isSuperAdmin, isViloyatAdmin, isDistrictScopedUser]);

  // Xodimning tuman ID sini aniqlash (o'zida saqlangan yoki u ishlaydigan kutubxona / filial orqali)
  const resolveTumanId = (staff) => {
    if (!staff) return '';
    const directTId = staff.tumanId || staff.tuman_id;
    if (directTId) return directTId;

    const staffLibId = staff.libraryId || staff.library_id;
    if (staffLibId) {
      const targetLib = allLibraries.find((l) => l.id === staffLibId);
      if (targetLib && (targetLib.tumanId || targetLib.tuman_id)) {
        return targetLib.tumanId || targetLib.tuman_id;
      }
    }
    return '';
  };

  // Filtr uchun tumanlar ro'yxati
  const availableTumanlar = useMemo(() => {
    if (isSuperAdmin) {
      if (viloyatFilter) {
        const v = VILOYATLAR.find((item) => item.id === viloyatFilter);
        return v?.tumanlar || [];
      }
      return VILOYATLAR[0]?.tumanlar || getAllTumanlar();
    }
    if (isViloyatAdmin) {
      const vId = currentUser?.viloyatId || currentUser?.viloyat_id || 'v01';
      const v = VILOYATLAR.find((item) => item.id === vId) || VILOYATLAR[0];
      return v?.tumanlar || [];
    }
    return [];
  }, [isSuperAdmin, isViloyatAdmin, viloyatFilter, currentUser]);

  // Tanlangan tuman (tumanFilter) ga tegishli barcha kutubxonalar (markaziy AKM va filiallar) ID lari
  const districtLibraryIds = useMemo(() => {
    if (!tumanFilter) return null;
    const ids = new Set();
    allLibraries.forEach((lib) => {
      const libTumanId = lib.tumanId || lib.tuman_id;
      if (libTumanId === tumanFilter) {
        ids.add(lib.id);
      }
    });
    return ids;
  }, [allLibraries, tumanFilter]);

  const scopedStaff = useMemo(() => {
    if (isSuperAdmin) return allStaff;
    if (isViloyatAdmin) {
      const currentViloyatId = currentUser?.viloyatId || currentUser?.viloyat_id || 'v01';
      const validLibIds = new Set(scopedLibraries.map((l) => l.id));
      return allStaff.filter(
        (s) =>
          validLibIds.has(s.libraryId || s.library_id) ||
          (s.viloyatId || s.viloyat_id) === currentViloyatId
      );
    }
    if (isDistrictScopedUser) {
      const currentTumanId = currentUser?.tumanId || currentUser?.tuman_id;
      const validLibIds = new Set(scopedLibraries.map((l) => l.id));
      return allStaff.filter((s) => {
        const staffLibId = s.libraryId || s.library_id;
        if (staffLibId && validLibIds.has(staffLibId)) return true;

        const staffTumanId = s.tumanId || s.tuman_id;
        if (staffTumanId && staffTumanId === currentTumanId) return true;

        if (staffLibId) {
          const lib = allLibraries.find((l) => l.id === staffLibId);
          if (lib && (lib.tumanId || lib.tuman_id) === currentTumanId) return true;
        }

        return false;
      });
    }
    return allStaff;
  }, [allStaff, scopedLibraries, isSuperAdmin, isViloyatAdmin, isDistrictScopedUser, currentUser, allLibraries]);

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();

    return scopedStaff.filter((s) => {
      const matchSearch =
        !q ||
        s.fullName?.toLowerCase().includes(q) ||
        s.firstName?.toLowerCase().includes(q) ||
        s.lastName?.toLowerCase().includes(q) ||
        s.position?.toLowerCase().includes(q) ||
        s.department?.toLowerCase().includes(q) ||
        s.education?.toLowerCase().includes(q) ||
        s.malumoti?.toLowerCase().includes(q) ||
        s.specialty?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q);

      const staffViloyatId = s.viloyatId || s.viloyat_id;
      const matchViloyat = !viloyatFilter || staffViloyatId === viloyatFilter;

      // Tuman filtri:
      // Xodim o'zi to'g'ridan-to'g'ri shu tumanga biriktirilgan bo'lsa,
      // yoki shu tumandagi istalgan kutubxona (markaziy AKM yoki har qanday filial) xodimi bo'lsa chiqadi
      const matchTuman = !tumanFilter || (() => {
        const staffTumanId = resolveTumanId(s);
        if (staffTumanId === tumanFilter) return true;

        const staffLibId = s.libraryId || s.library_id;
        if (staffLibId) {
          if (districtLibraryIds && districtLibraryIds.has(staffLibId)) return true;
          const targetLib = allLibraries.find((l) => l.id === staffLibId);
          if (targetLib && (targetLib.tumanId || targetLib.tuman_id) === tumanFilter) return true;
        }

        return false;
      })();

      const matchDepartment = !departmentFilter || s.department === departmentFilter;
      const matchPosition = !positionFilter || (s.position || s.lavozim || s.role) === positionFilter;

      return matchSearch && matchViloyat && matchTuman && matchDepartment && matchPosition;
    });
  }, [scopedStaff, search, viloyatFilter, tumanFilter, departmentFilter, positionFilter, districtLibraryIds, allLibraries]);

  const metrics = useMemo(() => {
    const uniqueDistricts = new Set(filteredStaff.map((s) => resolveTumanId(s)).filter(Boolean));
    const uniqueLibraries = new Set(filteredStaff.map((s) => s.libraryId || s.library_id).filter(Boolean));

    return {
      totalStaff: filteredStaff.length,
      totalDistricts: uniqueDistricts.size,
      totalLibraries: uniqueLibraries.size,
    };
  }, [filteredStaff, allLibraries]);

  const hasActiveFilters = Boolean(search || viloyatFilter || tumanFilter || departmentFilter || positionFilter);

  const resetFilters = () => {
    setSearch('');
    setViloyatFilter('');
    setTumanFilter('');
    setDepartmentFilter('');
    setPositionFilter('');
  };

  const openDeleteModal = (staff) => {
    setDeleteTarget(staff);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteEntity(STORAGE_KEYS.STAFF, deleteTarget.id);
      toast.success("Xodim muvaffaqiyatli o'chirildi");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message || "Xodimni o'chirishda xatolik yuz berdi");
    } finally {
      setIsDeleting(false);
    }
  };

  const resolveTumanName = (staff) => {
    if (!staff) return '—';
    const targetLib = allLibraries.find((l) => l.id === staff.libraryId || l.id === staff.library_id);
    const vId = staff.viloyatId || staff.viloyat_id || targetLib?.viloyatId || targetLib?.viloyat_id;
    const tId = staff.tumanId || staff.tuman_id || targetLib?.tumanId || targetLib?.tuman_id;
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
    return targetLib?.tuman || staff.tuman || '—';
  };

  const openCreate = () => {
    setEditItem(null);
    setShowModal(true);
  };

  const openEdit = (staff) => {
    setEditItem(staff);
    setShowModal(true);
  };

  const openView = (staff) => {
    setViewItem(staff);
    setShowViewModal(true);
  };

  return (
    <div className="space-y-3.5">
      {/* Sarlavha */}
      <PageHeader
        title="Kutubxona xodimlari (Kadrlar)"
        subtitle="Kutubxona shtatidagi barcha xodimlar va kadrlar hisobi"
        icon={ICONS.staff}
        action={
          canManage && (
            <Button onClick={openCreate} className="flex items-center gap-1.5 text-xs py-2 px-3">
              <ICONS.plus className="text-xs" />
              <span>Yangi xodim qo'shish</span>
            </Button>
          )
        }
      />

      {/* Ixcham statistika qatori */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-2xs">
          <span className="text-slate-500">Jami xodimlar:</span>
          <span className="font-bold text-slate-800 dark:text-slate-100">{metrics.totalStaff}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-2xs">
          <span className="text-slate-500">Tumanlar:</span>
          <span className="font-bold text-slate-800 dark:text-slate-100">{metrics.totalDistricts} ta</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-2xs">
          <span className="text-slate-500">Kutubxonalar:</span>
          <span className="font-bold text-slate-800 dark:text-slate-100">{metrics.totalLibraries} ta</span>
        </div>
      </div>

      {/* Filtrlar va qidiruv */}
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-850 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        {/* Qidiruv (lupa) */}
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Xodimlarni qidirish..."
        />

        {/* Viloyat (faqat Super Admin) */}
        {isSuperAdmin && (
          <select
            value={viloyatFilter}
            onChange={(e) => {
              setViloyatFilter(e.target.value);
              setTumanFilter('');
            }}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="">Barcha viloyatlar</option>
            {VILOYATLAR.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        )}

        {/* Tuman filtri (Super Admin va Viloyat Admin uchun) - Kutubxonalar o'rniga faqat Tumanlar */}
        {(isSuperAdmin || isViloyatAdmin) && availableTumanlar.length > 0 && (
          <select
            value={tumanFilter}
            onChange={(e) => setTumanFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer min-w-[150px]"
          >
            <option value="">Barcha tumanlar</option>
            {availableTumanlar.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}

        {/* Bo'lim / Xizmat filtri */}
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[180px]"
        >
          <option value="">Barcha bo'limlar</option>
          {STAFF_DEPARTMENTS.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>

        {/* Lavozimi filtri */}
        <select
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[160px]"
        >
          <option value="">Barcha lavozimlar</option>
          {STAFF_POSITIONS.map((pos) => (
            <option key={pos} value={pos}>{pos}</option>
          ))}
        </select>

        {/* Ko'rinish almashtirgich */}
        <div className="flex items-center gap-0.5 border border-slate-200 dark:border-slate-700 p-0.5 rounded-lg bg-slate-50 dark:bg-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
              viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-blue-600 font-semibold shadow-2xs' : 'text-slate-500'
            }`}
            title="Jadval"
          >
            <ICONS.table className="text-xs" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
              viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-blue-600 font-semibold shadow-2xs' : 'text-slate-500'
            }`}
            title="Kartochka"
          >
            <ICONS.dashboard className="text-xs" />
          </button>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs text-rose-600 hover:underline px-1 cursor-pointer whitespace-nowrap"
          >
            Tozalash
          </button>
        )}
      </div>

      {/* Asosiy ro'yxat */}
      {filteredStaff.length === 0 ? (
        <EmptyState
          icon={ICONS.users}
          title="Xodimlar topilmadi"
          message={
            hasActiveFilters
              ? "Qidiruv shartlariga mos keluvchi xodim yo'q. Filtrlarni tozalab ko'ring."
              : "Hozircha xodimlar mavjud emas. Yangi xodim qo'shishingiz mumkin."
          }
          action={canManage && <Button size="sm" onClick={openCreate}>Yangi xodim qo'shish</Button>}
        />
      ) : viewMode === 'table' ? (
        /* ================= 1. JADVAL (TABLE) ================= */
        <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Xodim</th>
                  <th className="px-4 py-2.5">Lavozimi</th>
                  <th className="px-4 py-2.5">Ma'lumoti</th>
                  <th className="px-4 py-2.5">Hudud</th>
                  <th className="px-4 py-2.5">Telefon raqami</th>
                  <th className="px-4 py-2.5 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStaff.map((staff) => {
                  const displayName =
                    [staff.lastName, staff.firstName].filter(Boolean).join(' ') ||
                    staff.fullName ||
                    'Nomsiz';
                  const initials = ((staff.lastName?.[0] || staff.firstName?.[0] || '') + (staff.firstName?.[0] || '')).toUpperCase() || 'X';

                  return (
                    <tr
                      key={staff.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Xodim (Ism, Familiya) */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          {staff.photo ? (
                            <img
                              src={staff.photo}
                              alt={displayName}
                              className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0 cursor-pointer"
                              onClick={() => openView(staff)}
                            />
                          ) : (
                            <div
                              onClick={() => openView(staff)}
                              className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px] flex items-center justify-center shrink-0 cursor-pointer"
                            >
                              {initials}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => openView(staff)}
                            className="font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 text-left cursor-pointer truncate max-w-[240px]"
                          >
                            {displayName}
                          </button>
                        </div>
                      </td>

                      {/* Lavozimi */}
                      <td className="px-4 py-2.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] ${
                          (staff.position || staff.lavozim || staff.role) === 'Direktor'
                            ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 font-semibold'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 font-medium'
                        }`}>
                          {staff.position || staff.lavozim || staff.jobTitle || staff.job_title || staff.role || 'Lavozimsiz'}
                        </span>
                        {staff.department && ((staff.position || '').toLowerCase() === 'xizmat rahbari' || (staff.position || '').toLowerCase() === 'xizmat_rahbari') && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]" title={staff.department}>
                            {staff.department}
                          </div>
                        )}
                      </td>

                      {/* Ma'lumoti */}
                      <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 font-medium">
                        {staff.education || staff.malumoti || '—'}
                      </td>

                      {/* Hudud (faqat tuman) */}
                      <td className="px-4 py-2.5">
                        {resolveTumanName(staff) !== '—' ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                            <ICONS.location className="text-[11px] text-slate-400 shrink-0" />
                            <span>{resolveTumanName(staff)}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Telefon raqami */}
                      <td className="px-4 py-2.5 font-mono text-slate-700 dark:text-slate-300">
                        {staff.phone ? (
                          <a
                            href={`tel:${staff.phone}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {staff.phone}
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Amallar */}
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openView(staff)}
                            className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 cursor-pointer transition-colors"
                            title="To'liq ma'lumotlarni ko'rish"
                          >
                            <ICONS.eye className="text-xs" />
                          </button>

                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEdit(staff)}
                                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-600 cursor-pointer transition-colors"
                                title="Tahrirlash"
                              >
                                <ICONS.edit className="text-xs" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openDeleteModal(staff)}
                                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-rose-600 cursor-pointer transition-colors"
                                title="O'chirish"
                              >
                                <ICONS.trash className="text-xs" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ================= 2. KARTOCHKA (GRID) ================= */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredStaff.map((staff) => {
            const displayName =
              [staff.lastName, staff.firstName].filter(Boolean).join(' ') ||
              staff.fullName ||
              'Nomsiz';
            const initials = ((staff.lastName?.[0] || staff.firstName?.[0] || '') + (staff.firstName?.[0] || '')).toUpperCase() || 'X';

            return (
              <div
                key={staff.id}
                className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between text-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {staff.photo ? (
                        <img
                          src={staff.photo}
                          alt={displayName}
                          className="w-10 h-10 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0 cursor-pointer"
                          onClick={() => openView(staff)}
                        />
                      ) : (
                        <div
                          onClick={() => openView(staff)}
                          className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4
                          onClick={() => openView(staff)}
                          className="font-bold text-slate-800 dark:text-slate-200 truncate cursor-pointer hover:text-blue-600"
                        >
                          {displayName}
                        </h4>
                        <div className="mt-0.5">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] ${
                            (staff.position || staff.lavozim || staff.role) === 'Direktor'
                              ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 font-semibold'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 font-medium'
                          }`}>
                            {staff.position || staff.lavozim || staff.jobTitle || staff.job_title || staff.role || 'Lavozimsiz'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openView(staff)}
                        className="p-1 rounded text-slate-400 hover:text-blue-600 cursor-pointer"
                        title="Batafsil"
                      >
                        <ICONS.eye className="text-xs" />
                      </button>
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(staff)}
                            className="p-1 rounded text-slate-400 hover:text-emerald-600 cursor-pointer"
                            title="Tahrirlash"
                          >
                            <ICONS.edit className="text-xs" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(staff)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="O'chirish"
                          >
                            <ICONS.trash className="text-xs" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {(staff.education || staff.malumoti) && (
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Ma'lumoti:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {staff.education || staff.malumoti}
                    </span>
                  </div>
                )}

                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Hudud:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <ICONS.location className="text-[10px] text-slate-400" />
                    <span>{resolveTumanName(staff)}</span>
                  </span>
                </div>

                {staff.phone ? (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-50 dark:border-slate-800/60 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Telefon:</span>
                    <a
                      href={`tel:${staff.phone}`}
                      className="font-mono text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {staff.phone}
                    </a>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Xodim qo'shish / tahrirlash modali */}
      <StaffModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditItem(null);
        }}
        editItem={editItem}
        defaultTumanId={tumanFilter}
        defaultLibraryId={
          isDistrictScopedUser
            ? (scopedLibraries[0]?.id || currentUser?.libraryId || '')
            : (allLibraries.find((l) => (l.tumanId || l.tuman_id) === tumanFilter)?.id || scopedLibraries[0]?.id || '')
        }
        libraries={allLibraries}
        currentUser={currentUser}
        createEntity={createEntity}
        updateEntity={updateEntity}
      />

      {/* Xodim haqida to'liq ma'lumot modali */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewItem(null);
        }}
        title="Xodim ma'lumotlari"
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            {canManage && viewItem ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const item = viewItem;
                  setShowViewModal(false);
                  openEdit(item);
                }}
                className="flex items-center gap-1.5"
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
          const targetLib = allLibraries.find((l) => l.id === viewItem.libraryId);
          const viloyatId = viewItem.viloyatId || targetLib?.viloyatId;
          const tumanId = viewItem.tumanId || targetLib?.tumanId;
          const age = calculateAge(viewItem.birthDate);
          const fullName =
            viewItem.fullName ||
            [viewItem.lastName, viewItem.firstName, viewItem.middleName].filter(Boolean).join(' ') ||
            `${viewItem.firstName || ''} ${viewItem.lastName || ''}`.trim() ||
            'Nomsiz';
          const initials = ((viewItem.lastName?.[0] || viewItem.firstName?.[0] || '') + (viewItem.firstName?.[0] || '')).toUpperCase() || 'X';

          return (
            <div className="space-y-3 text-xs">
              {/* Surat va Ism */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                {viewItem.photo ? (
                  <img
                    src={viewItem.photo}
                    alt={fullName}
                    className="w-14 h-14 rounded-xl object-cover ring-1 ring-slate-300 dark:ring-slate-700 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-base flex items-center justify-center shrink-0">
                    {initials}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {fullName}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">
                      {viewItem.position || 'Lavozim kiritilmagan'}
                    </span>
                    {viewItem.department && (
                      <span className="text-slate-400">• {viewItem.department}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Ma'lumotlar jadvali */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Lavozimi:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                    {viewItem.position || viewItem.lavozim || viewItem.role || '—'}
                  </span>
                </div>
                {viewItem.department && ((viewItem.position || '').toLowerCase() === 'xizmat rahbari' || (viewItem.position || '').toLowerCase() === 'xizmat_rahbari') && (
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-500">Bo'lim / Xizmat:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                      {viewItem.department}
                    </span>
                  </div>
                )}
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Ma'lumoti:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                    {viewItem.education || viewItem.malumoti || '—'}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Mutaxassisligi:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-right">
                    {viewItem.specialty || '—'}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Kutubxonadagi ish staji:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-right">
                    {viewItem.experience || '—'}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Kutubxona:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-right">
                    {targetLib?.name || '—'}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Hudud (Tuman):</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-right">
                    {resolveTumanName(viewItem)}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Tug'ilgan sana:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 text-right">
                    {viewItem.birthDate ? `${formatDate(viewItem.birthDate)} ${age ? `(${age} yosh)` : ''}` : '—'}
                  </span>
                </div>
                {viewItem.phone ? (
                  <div className="py-2 flex justify-between items-center">
                    <span className="text-slate-500">Telefon:</span>
                    <a
                      href={`tel:${viewItem.phone}`}
                      className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {viewItem.phone}
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* O'chirishni tasdiqlash modali */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Xodimni o'chirish"
        message={`Haqiqatan ham "${deleteTarget?.fullName || `${deleteTarget?.firstName || ''} ${deleteTarget?.lastName || ''}`.trim() || 'ushbu'}" xodimini o'chirib tashlamoqchimisiz? Ushbu amalni ortga qaytarib bo'lmaydi.`}
        confirmText="Ha, o'chirilsin"
        cancelText="Bekor qilish"
      />
    </div>
  );
}
