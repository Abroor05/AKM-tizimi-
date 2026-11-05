import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import ICONS from '../../components/icons.jsx';
import { ROLES, ROLE_LABELS, ROLE_COLORS, STORAGE_KEYS, avatarClass } from '../../data/constants.js';
import { VILOYATLAR, getViloyatName, getTumanName } from '../../data/regions.js';
import { formatDate, formatUzPhone } from '../../utils/helpers.js';

export default function UsersPage() {
  const { currentUser, getCollection, createUser, updateUser, deleteUser, resetPassword, isRole } = useApp();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState('table');

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    username: '',
    password: '',
    role: ROLES.KUTUBXONA_XODIMI,
    phone: '+998',
    email: '',
    viloyatId: '',
    tumanId: '',
    libraryId: '',
    active: true,
  });

  const isSuperAdmin = currentUser?.role === ROLES.SUPER_ADMIN || currentUser?.role === 'superadmin';
  const isViloyatAdmin = currentUser?.role === ROLES.VILOYAT_ADMIN;
  const isDistrictScopedUser = isRole(ROLES.TUMAN_ADMIN, ROLES.KUTUBXONA_XODIMI, ROLES.XODIMLAR_BOSHLIGI);
  const isXodimlarBoshligi = isRole(ROLES.XODIMLAR_BOSHLIGI);

  const allUsers = useMemo(() => getCollection(STORAGE_KEYS.USERS) || [], [getCollection]);
  const libraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES) || [], [getCollection]);

  const canManage = isSuperAdmin || isViloyatAdmin || isRole(ROLES.TUMAN_ADMIN, ROLES.XODIMLAR_BOSHLIGI);

  // Hudud bo'yicha cheklangan foydalanuvchilar
  const scopedUsers = useMemo(() => {
    if (isSuperAdmin) return allUsers;
    if (isViloyatAdmin) {
      return allUsers.filter((u) => u.viloyatId === currentUser?.viloyatId || u.viloyat_id === currentUser?.viloyatId);
    }
    if (isDistrictScopedUser) {
      return allUsers.filter(
        (u) =>
          (u.viloyatId === currentUser?.viloyatId || u.viloyat_id === currentUser?.viloyatId) &&
          (u.tumanId === currentUser?.tumanId || u.tuman_id === currentUser?.tumanId)
      );
    }
    if (isXodimlarBoshligi) {
      return allUsers.filter(
        (u) => u.role === ROLES.KUTUBXONA_XODIMI && (u.libraryId === currentUser?.libraryId || u.library_id === currentUser?.libraryId)
      );
    }
    return allUsers;
  }, [allUsers, currentUser, isSuperAdmin, isViloyatAdmin, isDistrictScopedUser, isXodimlarBoshligi]);

  // Qidiruv va filtrlar
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return scopedUsers.filter((u) => {
      const matchSearch =
        !q ||
        u.fullName?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q);

      const matchRole = !roleFilter || u.role === roleFilter;
      const matchStatus =
        !statusFilter ||
        (statusFilter === 'active' && u.active !== false) ||
        (statusFilter === 'inactive' && u.active === false);

      return matchSearch && matchRole && matchStatus;
    });
  }, [scopedUsers, search, roleFilter, statusFilter]);

  // Rol variantlari
  const roleOptions = useMemo(() => {
    if (isSuperAdmin) {
      return Object.entries(ROLE_LABELS).map(([k, v]) => ({ value: k, label: v }));
    }
    if (isViloyatAdmin) {
      return [
        { value: ROLES.TUMAN_ADMIN, label: ROLE_LABELS[ROLES.TUMAN_ADMIN] || 'Direktor' },
        { value: ROLES.XODIMLAR_BOSHLIGI, label: ROLE_LABELS[ROLES.XODIMLAR_BOSHLIGI] || "Bo'lim boshlig'i" },
        { value: ROLES.KUTUBXONA_XODIMI, label: ROLE_LABELS[ROLES.KUTUBXONA_XODIMI] || 'Kutubxona xodimi' },
      ];
    }
    if (isRole(ROLES.TUMAN_ADMIN)) {
      return [
        { value: ROLES.KUTUBXONA_XODIMI, label: ROLE_LABELS[ROLES.KUTUBXONA_XODIMI] || 'Kutubxona xodimi' },
        { value: ROLES.XODIMLAR_BOSHLIGI, label: ROLE_LABELS[ROLES.XODIMLAR_BOSHLIGI] || "Bo'lim boshlig'i" },
      ];
    }
    return [{ value: ROLES.KUTUBXONA_XODIMI, label: ROLE_LABELS[ROLES.KUTUBXONA_XODIMI] }];
  }, [isSuperAdmin, isViloyatAdmin, isRole]);

  // Tuman admini uchun o'z kutubxonasi
  const districtLibrary = useMemo(() => {
    if (!isDistrictScopedUser) return null;
    return (
      libraries.find(
        (l) =>
          (l.viloyatId === currentUser?.viloyatId || l.viloyat_id === currentUser?.viloyatId) &&
          (l.tumanId === currentUser?.tumanId || l.tuman_id === currentUser?.tumanId)
      ) ||
      (currentUser?.libraryId ? libraries.find((l) => l.id === currentUser.libraryId) : null)
    );
  }, [libraries, currentUser, isDistrictScopedUser]);

  // Viloyat tanlovi bo'yicha tumanlar
  const selectedViloyatObj = useMemo(() => {
    const vId = isDistrictScopedUser ? currentUser?.viloyatId : form.viloyatId;
    return VILOYATLAR.find((v) => v.id === vId);
  }, [form.viloyatId, currentUser, isDistrictScopedUser]);

  // Super/Viloyat admin uchun kutubxonalar
  const selectableLibraries = useMemo(() => {
    const vId = isDistrictScopedUser ? currentUser?.viloyatId : form.viloyatId;
    const tId = isDistrictScopedUser ? currentUser?.tumanId : form.tumanId;
    return libraries.filter((l) => (!vId || l.viloyatId === vId) && (!tId || l.tumanId === tId));
  }, [libraries, form.viloyatId, form.tumanId, currentUser, isDistrictScopedUser]);

  // Modalni ochish (Yangi foydalanuvchi)
  const openCreate = () => {
    setEditItem(null);
    setForm({
      fullName: '',
      username: '',
      password: '',
      role: roleOptions[0]?.value || ROLES.KUTUBXONA_XODIMI,
      phone: '+998',
      email: '',
      viloyatId: currentUser?.viloyatId || '',
      tumanId: currentUser?.tumanId || '',
      libraryId: districtLibrary?.id || currentUser?.libraryId || '',
      active: true,
    });
    setShowModal(true);
  };

  // Modalni ochish (Tahrirlash)
  const openEdit = (u) => {
    setEditItem(u);
    setForm({
      fullName: u.fullName || '',
      username: u.username || '',
      password: '',
      role: u.role || ROLES.KUTUBXONA_XODIMI,
      phone: u.phone || '+998',
      email: u.email || '',
      viloyatId: u.viloyatId || currentUser?.viloyatId || '',
      tumanId: u.tumanId || currentUser?.tumanId || '',
      libraryId: u.libraryId || districtLibrary?.id || '',
      active: u.active !== false,
    });
    setShowModal(true);
  };

  // Saqlash (Yaratish / Tahrirlash)
  const handleSave = async (e) => {
    e?.preventDefault();

    const fullName = form.fullName.trim();
    const username = form.username.trim();
    const role = form.role;

    if (!fullName || !username || !role) {
      toast.warning("F.I.O, login va rolni kiriting!");
      return;
    }

    if (!editItem && !form.password.trim()) {
      toast.warning('Yangi foydalanuvchi uchun parol kiritilishi shart!');
      return;
    }

    const cleanedEmail = (form.email || '').trim().toLowerCase();
    if (cleanedEmail && allUsers.some((u) => u.email && u.email.toLowerCase() === cleanedEmail && u.id !== editItem?.id)) {
      toast.warning('Bu email allaqachon ro\'yxatdan o\'tgan!');
      return;
    }

    if (!editItem && allUsers.some((u) => u.username?.toLowerCase() === username.toLowerCase())) {
      toast.warning('Bu login allaqachon mavjud! Boshqa login tanlang.');
      return;
    }

    let viloyatId = form.viloyatId;
    let tumanId = form.tumanId;
    let libraryId = form.libraryId;

    if (isDistrictScopedUser) {
      viloyatId = currentUser?.viloyatId || '';
      tumanId = currentUser?.tumanId || '';
      libraryId = districtLibrary?.id || currentUser?.libraryId || '';
    }

    const payload = {
      ...form,
      fullName,
      username,
      role,
      viloyatId,
      tumanId,
      libraryId,
      phone: form.phone ? formatUzPhone(form.phone) : '',
      email: cleanedEmail,
      active: form.active,
    };

    if (form.password.trim()) {
      payload.password = form.password.trim();
    } else {
      delete payload.password;
    }

    setIsSubmitting(true);
    try {
      if (editItem) {
        await updateUser(editItem.id, payload);
        toast.success("Foydalanuvchi ma'lumotlari muvaffaqiyatli yangilandi!");
      } else {
        await createUser(payload);
        toast.success("Yangi foydalanuvchi muvaffaqiyatli yaratildi!");
      }
      setShowModal(false);
      setEditItem(null);
    } catch (err) {
      toast.error(err.message || 'Xatolik yuz berdi');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Parolni yangilash
  const handleResetPassword = async () => {
    if (!resetTarget) return;
    if (!newPassword || newPassword.trim().length < 6) {
      toast.warning('Parol kamida 6 ta belgidan iborat bo\'lishi kerak!');
      return;
    }

    try {
      await resetPassword(resetTarget.id, newPassword.trim());
      toast.success(`${resetTarget.fullName || resetTarget.username} uchun parol yangilandi!`);
      setResetTarget(null);
      setNewPassword('');
    } catch (err) {
      toast.error(err.message || 'Parolni yangilashda xatolik yuz berdi');
    }
  };

  // O'chirishni tasdiqlash
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser(deleteTarget.id);
      toast.success(`${deleteTarget.fullName || deleteTarget.username} muvaffaqiyatli o'chirildi!`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message || 'O\'chirishda xatolik yuz berdi');
    }
  };

  const hasActiveFilters = search || roleFilter || statusFilter;

  const resetFilters = () => {
    setSearch('');
    setRoleFilter('');
    setStatusFilter('');
  };

  return (
    <div className="space-y-4">
      {/* Sarlavha */}
      <PageHeader
        title="Tizim foydalanuvchilari"
        subtitle="Xodimlarga tizimga kirish huquqlari (login va parol) berish hamda hisob yozuvlarini boshqarish"
        icon={ICONS.key}
        action={
          canManage && (
            <Button size="sm" onClick={openCreate} className="flex items-center gap-1.5 shadow-2xs">
              <ICONS.plus className="text-xs" />
              <span>Yangi hisob yaratish</span>
            </Button>
          )
        }
      />

      {/* Ixcham yuqori ko'rsatkichlar paneli (1 qator) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-xs shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">Jami hisoblar:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{scopedUsers.length}</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">Faol:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {scopedUsers.filter((u) => u.active !== false).length}
            </span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">Nofaol:</span>
            <span className="font-bold text-slate-500 dark:text-slate-400">
              {scopedUsers.filter((u) => u.active === false).length}
            </span>
          </div>
        </div>

        {/* Ko'rinish rejimi */}
        <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Jadval ko'rinishi"
          >
            <ICONS.table className="text-xs" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('card')}
            className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
              viewMode === 'card'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Kartochka ko'rinishi"
          >
            <ICONS.grid className="text-xs" />
          </button>
        </div>
      </div>

      {/* Filtrlar paneli */}
      <div className="flex flex-wrap gap-2.5 items-center">
        {/* Qidiruv (lupa) */}
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Foydalanuvchilarni qidirish..."
        />

        {/* Rol filtri */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs"
        >
          <option value="">Barcha rollar</option>
          {roleOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Holat filtri */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs"
        >
          <option value="">Barcha holatlar</option>
          <option value="active">Faol</option>
          <option value="inactive">Nofaol</option>
        </select>

        {/* Tozalash */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="px-3 py-2 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-medium cursor-pointer rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
          >
            Filtrni tozalash
          </button>
        )}
      </div>

      {/* Asosiy ro'yxat */}
      {filteredUsers.length === 0 ? (
        <EmptyState
          icon={ICONS.key}
          title="Foydalanuvchilar topilmadi"
          message={
            hasActiveFilters
              ? "Qidiruv shartlariga mos keluvchi hisob yo'q. Filtrlarni tozalab ko'ring."
              : "Hozircha tizim foydalanuvchilari mavjud emas. Yangi hisob qo'shishingiz mumkin."
          }
          action={
            canManage && (
              <Button size="sm" onClick={openCreate}>
                Yangi hisob yaratish
              </Button>
            )
          }
        />
      ) : viewMode === 'table' ? (
        /* ================= 1. JADVAL (TABLE) ================= */
        <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Xodim (F.I.O)</th>
                  <th className="px-4 py-2.5">Login</th>
                  <th className="px-4 py-2.5">Tizimdagi roli</th>
                  {!isDistrictScopedUser && <th className="px-4 py-2.5">Hudud</th>}
                  <th className="px-4 py-2.5">Holati</th>
                  <th className="px-4 py-2.5 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((u) => {
                  const initials = (u.fullName || u.username || 'X')
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  const color = ROLE_COLORS[u.role] || 'blue';

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Xodim (F.I.O) */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            onClick={() => setViewItem(u)}
                            className={`w-8 h-8 rounded-lg ${avatarClass(color)} flex items-center justify-center font-bold text-[11px] shrink-0 cursor-pointer`}
                          >
                            {initials}
                          </div>
                          <button
                            type="button"
                            onClick={() => setViewItem(u)}
                            className="font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 text-left cursor-pointer truncate max-w-[220px]"
                          >
                            {u.fullName || 'Nomsiz'}
                          </button>
                        </div>
                      </td>

                      {/* Login */}
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                          {u.username}
                        </span>
                      </td>

                      {/* Rol */}
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap ${
                            u.role === ROLES.SUPER_ADMIN
                              ? 'bg-slate-900 text-white dark:bg-slate-700 dark:text-slate-100 shadow-2xs'
                              : u.role === ROLES.VILOYAT_ADMIN
                              ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                              : u.role === ROLES.TUMAN_ADMIN
                              ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50'
                              : u.role === ROLES.XODIMLAR_BOSHLIGI
                              ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                              : 'bg-slate-50 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700'
                          }`}
                        >
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>

                      {/* Hudud (Super/Viloyat admin uchun) */}
                      {!isDistrictScopedUser && (
                        <td className="px-4 py-2.5 text-slate-500 text-[11px]">
                          <div>{u.viloyatId ? getViloyatName(u.viloyatId) : 'Barcha hudud'}</div>
                          {u.tumanId && (
                            <div className="text-slate-400">{getTumanName(u.viloyatId, u.tumanId)}</div>
                          )}
                        </td>
                      )}

                      {/* Holat */}
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            u.active !== false
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.active !== false ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {u.active !== false ? 'Faol' : 'Nofaol'}
                        </span>
                      </td>

                      {/* Amallar */}
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Ko'zcha icon - batafsil ko'rish */}
                          <button
                            type="button"
                            onClick={() => setViewItem(u)}
                            className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 cursor-pointer transition-colors"
                            title="Barcha ma'lumotlarni ko'rish"
                          >
                            <ICONS.eye className="text-xs" />
                          </button>

                          {canManage && (
                            <>
                              {/* Kalit icon - parolni tiklash */}
                              <button
                                type="button"
                                onClick={() => {
                                  setResetTarget(u);
                                  setNewPassword('');
                                }}
                                className="p-1.5 rounded-md hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 cursor-pointer transition-colors"
                                title="Parolni yangilash"
                              >
                                <ICONS.key className="text-xs" />
                              </button>

                              {/* Tahrirlash */}
                              <button
                                type="button"
                                onClick={() => openEdit(u)}
                                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-600 cursor-pointer transition-colors"
                                title="Tahrirlash"
                              >
                                <ICONS.edit className="text-xs" />
                              </button>

                              {/* O'chirish (o'zini o'zi o'chirishga ruxsat yo'q) */}
                              {u.id !== currentUser?.id && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(u)}
                                  className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 cursor-pointer transition-colors"
                                  title="O'chirish"
                                >
                                  <ICONS.trash className="text-xs" />
                                </button>
                              )}
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
          {filteredUsers.map((u) => {
            const initials = (u.fullName || u.username || 'X')
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();
            const color = ROLE_COLORS[u.role] || 'blue';

            return (
              <div
                key={u.id}
                className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between text-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        onClick={() => setViewItem(u)}
                        className={`w-10 h-10 rounded-lg ${avatarClass(color)} flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer`}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h4
                          onClick={() => setViewItem(u)}
                          className="font-bold text-slate-800 dark:text-slate-200 truncate cursor-pointer hover:text-blue-600"
                        >
                          {u.fullName || 'Nomsiz'}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                            @{u.username}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setViewItem(u)}
                        className="p-1 rounded text-slate-400 hover:text-blue-600 cursor-pointer"
                        title="Batafsil"
                      >
                        <ICONS.eye className="text-xs" />
                      </button>
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setResetTarget(u);
                              setNewPassword('');
                            }}
                            className="p-1 rounded text-slate-400 hover:text-amber-600 cursor-pointer"
                            title="Parol yangilash"
                          >
                            <ICONS.key className="text-xs" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(u)}
                            className="p-1 rounded text-slate-400 hover:text-emerald-600 cursor-pointer"
                            title="Tahrirlash"
                          >
                            <ICONS.edit className="text-xs" />
                          </button>
                          {u.id !== currentUser?.id && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(u)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="O'chirish"
                            >
                              <ICONS.trash className="text-xs" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 font-medium ${
                        u.active !== false ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          u.active !== false ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                      {u.active !== false ? 'Faol' : 'Nofaol'}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Telefon:</span>
                  {u.phone ? (
                    <a
                      href={`tel:${u.phone}`}
                      className="font-mono text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {u.phone}
                    </a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= FOYDALANUVCHI QO'SHISH / TAHRIRLASH MODALI ================= */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? "Foydalanuvchini tahrirlash" : "Yangi foydalanuvchi hisobi"}
        subtitle="Xodimga tizimga kirish huquqini berish uchun ma'lumotlarni to'ldiring"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={isSubmitting}>
              Bekor qilish
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? 'Saqlanmoqda...' : 'Saqlash'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* F.I.O */}
          <div>
            <Input
              label="F.I.O (Ism, Familiya)"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Familiya Ism Sharifi"
              required
            />
          </div>

          {/* Login va Parol */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Login (Username)"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Masalan: aliyev_v"
              required
              disabled={!!editItem}
            />
            <Input
              label={editItem ? "Yangi parol (ixtiyoriy)" : "Parol"}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={editItem ? "O'zgartirmaslik uchun bo'sh qoldiring" : "Kamida 6 ta belgi"}
              required={!editItem}
            />
          </div>

          {/* Rol va Holat */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Tizimdagi roli"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              options={roleOptions}
              required
            />
            <Select
              label="Hisob holati"
              value={form.active ? 'true' : 'false'}
              onChange={(e) => setForm({ ...form, active: e.target.value === 'true' })}
              options={[
                { value: 'true', label: 'Faol (tizimga kira oladi)' },
                { value: 'false', label: 'Nofaol (bloklangan)' },
              ]}
            />
          </div>

          {/* Telefon va Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Telefon raqami"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: formatUzPhone(e.target.value) })}
              placeholder="+998 (90) 123-45-67"
            />
            <Input
              label="Email manzili (ixtiyoriy)"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value.trim().toLowerCase() })}
              placeholder="xodim@akm.uz"
            />
          </div>

          {/* Hudud va Kutubxona: Faqat Super va Viloyat adminlar uchun (Tuman admini uchun avtomatik) */}
          {!isDistrictScopedUser && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isSuperAdmin && (
                  <Select
                    label="Viloyat"
                    value={form.viloyatId}
                    onChange={(e) => setForm({ ...form, viloyatId: e.target.value, tumanId: '', libraryId: '' })}
                    options={[{ value: '', label: 'Barcha hudud' }, ...VILOYATLAR.map((v) => ({ value: v.id, label: v.name }))]}
                  />
                )}
                <Select
                  label="Tuman / Shahar"
                  value={form.tumanId}
                  onChange={(e) => setForm({ ...form, tumanId: e.target.value, libraryId: '' })}
                  options={[
                    { value: '', label: 'Barcha tumanlar' },
                    ...(selectedViloyatObj?.tumans || selectedViloyatObj?.tumanlar || []).map((t) => ({ value: t.id, label: t.name })),
                  ]}
                  disabled={!form.viloyatId && isSuperAdmin}
                />
              </div>

              <div>
                <Select
                  label="Biriktirilgan kutubxona"
                  value={form.libraryId}
                  onChange={(e) => setForm({ ...form, libraryId: e.target.value })}
                  options={[{ value: '', label: 'Kutubxonani tanlang...' }, ...selectableLibraries.map((l) => ({ value: l.id, label: l.name }))]}
                />
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* ================= FOYDALANUVCHI MA'LUMOTLARI (KO'ZCHA ICON) ================= */}
      <Modal
        isOpen={!!viewItem}
        onClose={() => setViewItem(null)}
        title="Foydalanuvchi hisobi ma'lumotlari"
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            {canManage && viewItem ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const target = viewItem;
                  setViewItem(null);
                  openEdit(target);
                }}
                className="flex items-center gap-1.5"
              >
                <ICONS.edit className="text-xs" />
                <span>Tahrirlash</span>
              </Button>
            ) : <div />}
            <Button variant="secondary" size="sm" onClick={() => setViewItem(null)}>
              Yopish
            </Button>
          </div>
        }
      >
        {viewItem && (() => {
          const targetLib = libraries.find((l) => l.id === viewItem.libraryId);
          const color = ROLE_COLORS[viewItem.role] || 'blue';
          const initials = (viewItem.fullName || viewItem.username || 'X')
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

          return (
            <div className="space-y-3 text-xs">
              {/* Surat va Ism */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                <div
                  className={`w-14 h-14 rounded-xl ${avatarClass(color)} flex items-center justify-center font-bold text-base shrink-0`}
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {viewItem.fullName}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      @{viewItem.username}
                    </span>
                    <span
                      className={`inline-block px-2 py-0.2 rounded text-[10px] font-semibold ${
                        viewItem.active !== false
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {viewItem.active !== false ? 'Faol' : 'Nofaol'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ma'lumotlar ro'yxati */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Tizimdagi roli:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                    {ROLE_LABELS[viewItem.role] || viewItem.role}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Login (Username):</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200 text-right">
                    {viewItem.username}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Kutubxona:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-right">
                    {targetLib?.name || '—'}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Hudud:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-right">
                    {viewItem.viloyatId ? getViloyatName(viewItem.viloyatId) : 'Barcha hudud'}
                    {viewItem.tumanId ? ` / ${getTumanName(viewItem.viloyatId, viewItem.tumanId)}` : ''}
                  </span>
                </div>
                <div className="py-2 flex justify-between items-center">
                  <span className="text-slate-500">Telefon:</span>
                  {viewItem.phone ? (
                    <a
                      href={`tel:${viewItem.phone}`}
                      className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {viewItem.phone}
                    </a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-right">
                    {viewItem.email || '—'}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Yaratilgan sana:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 text-right">
                    {viewItem.createdAt ? formatDate(viewItem.createdAt) : '—'}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Oxirgi kirish:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 text-right">
                    {viewItem.lastLogin ? formatDate(viewItem.lastLogin) : 'Kirmagan'}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ================= PAROLNI YANGILASH MODALI ================= */}
      <Modal
        isOpen={!!resetTarget}
        onClose={() => {
          setResetTarget(null);
          setNewPassword('');
        }}
        title="Parolni yangilash"
        subtitle={`${resetTarget?.fullName || resetTarget?.username} uchun yangi parol o'rnating`}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="secondary"
              onClick={() => {
                setResetTarget(null);
                setNewPassword('');
              }}
            >
              Bekor qilish
            </Button>
            <Button onClick={handleResetPassword}>
              Parolni saqlash
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            label="Yangi parol"
            type="password"
            placeholder="Kamida 6 ta belgi kiriting..."
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoFocus
          />
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Foydalanuvchi tizimga keyingi safar mana shu yangi parol bilan kiradi.
          </p>
        </div>
      </Modal>

      {/* ================= O'CHIRISHNI TASDIQLASH ================= */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Foydalanuvchini o'chirish"
        message={`${deleteTarget?.fullName || deleteTarget?.username} foydalanuvchisini o'chirishni tasdiqlaysizmi? Ushbu foydalanuvchi tizimga boshqa kira olmaydi.`}
        confirmText="O'chirish"
        variant="danger"
      />
    </div>
  );
}
