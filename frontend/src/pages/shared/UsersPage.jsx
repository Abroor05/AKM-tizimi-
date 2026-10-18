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
import { toast } from '../../components/ui/Toast.jsx';
import ICONS from '../../components/icons.jsx';
import { ROLES, ROLE_LABELS, ROLE_COLORS, STORAGE_KEYS, avatarClass, badgeClass } from '../../data/constants.js';
import { VILOYATLAR, getViloyatName, getTumanName } from '../../data/regions.js';
import { formatDate, formatUzPhone } from '../../utils/helpers.js';

export default function UsersPage() {
  const { currentUser, getUsers, createUser, updateUser, deleteUser, resetPassword, isRole, getCollection } = useApp();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ fullName: '', username: '', password: '', role: ROLES.KUTUBXONA_XODIMI, phone: '+998', email: '', viloyatId: '', tumanId: '', libraryId: '', active: true });

  const allUsers = useMemo(() => getUsers(), [getUsers]);
  const libraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES) || [], [getCollection]);
  const isXodimlarBoshligi = isRole(ROLES.XODIMLAR_BOSHLIGI);
  const isDistrictScopedUser = isRole(ROLES.TUMAN_ADMIN, ROLES.KUTUBXONA_XODIMI);
  const isViloyatScopedUser = isRole(ROLES.VILOYAT_ADMIN);

  const filtered = useMemo(() => {
    const visibleUsers = (() => {
      if (isRole(ROLES.SUPER_ADMIN)) return allUsers;
      if (isViloyatScopedUser) return allUsers.filter(u => u.viloyatId === currentUser.viloyatId);
      if (isDistrictScopedUser) return allUsers.filter(u => u.viloyatId === currentUser.viloyatId && u.tumanId === currentUser.tumanId);
      // Xodimlar boshligi: faqat o'z kutubxonasidagi kutubxona_xodimi larni ko'radi
      if (isXodimlarBoshligi) return allUsers.filter(u =>
        u.role === ROLES.KUTUBXONA_XODIMI &&
        u.libraryId === currentUser.libraryId
      );
      return [];
    })();

    return visibleUsers.filter(u => {
      const matchSearch = !search || u.fullName?.toLowerCase().includes(search.toLowerCase()) || u.username?.toLowerCase().includes(search.toLowerCase());
      const matchRole = !roleFilter || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [allUsers, currentUser, isDistrictScopedUser, isXodimlarBoshligi, isRole, isViloyatScopedUser, search, roleFilter]);

  const canManage = isRole(ROLES.SUPER_ADMIN, ROLES.VILOYAT_ADMIN, ROLES.TUMAN_ADMIN, ROLES.XODIMLAR_BOSHLIGI);

  const selectedViloyat = VILOYATLAR.find(v => v.id === form.viloyatId);

  const handleSave = () => {
    if (!form.fullName || !form.username || !form.role) {
      toast.warning("Iltimos, barcha majburiy maydonlarni to'ldiring!");
      return;
    }

    const cleanedEmail = (form.email || '').trim().toLowerCase();
    if (cleanedEmail && allUsers.some(u => u.email && u.email.toLowerCase() === cleanedEmail && u.id !== editItem?.id)) {
      toast.warning('Bu email allaqachon ro\'yxatdan o\'tgan!');
      return;
    }

    // Boshligi uchun: faqat kutubxona_xodimi, faqat o'z kutubxonasi
    if (isXodimlarBoshligi) {
      const finalForm = {
        ...form,
        role:      ROLES.KUTUBXONA_XODIMI,
        viloyatId: currentUser.viloyatId,
        tumanId:   currentUser.tumanId,
        libraryId: currentUser.libraryId,
        password:  (form.password || '').trim(),
      };
      if (editItem) {
        const { password, ...updates } = finalForm;
        updateUser(editItem.id, updates);
        toast.success("Xodim ma'lumotlari muvaffaqiyatli yangilandi!");
      } else {
        if (allUsers.some(u => u.username === finalForm.username)) {
          toast.warning('Bu login allaqachon mavjud!');
          return;
        }
        createUser(finalForm);
        toast.success("Yangi xodim muvaffaqiyatli qo'shildi!");
      }
      setShowModal(false);
      setEditItem(null);
      setForm({ fullName: '', username: '', password: '', role: ROLES.KUTUBXONA_XODIMI, phone: '+998', email: '', viloyatId: currentUser?.viloyatId || '', tumanId: currentUser?.tumanId || '', libraryId: currentUser?.libraryId || '', active: true });
      return;
    }

    const canAssignAdminRole = isRole(ROLES.SUPER_ADMIN);
    const allowedStaffRoles = [ROLES.KUTUBXONA_XODIMI, ROLES.XODIMLAR_BOSHLIGI];

    const safeForm = (() => {
      const generatedForm = { ...form, password: (form.password || '').trim() };
      if (isRole(ROLES.TUMAN_ADMIN)) {
        return {
          ...generatedForm,
          role: allowedStaffRoles.includes(form.role) ? form.role : ROLES.KUTUBXONA_XODIMI,
          viloyatId: currentUser.viloyatId,
          tumanId: currentUser.tumanId,
        };
      }
      if (isRole(ROLES.VILOYAT_ADMIN)) {
        return {
          ...generatedForm,
          role: allowedStaffRoles.includes(form.role) ? form.role : ROLES.KUTUBXONA_XODIMI,
          viloyatId: currentUser.viloyatId,
        };
      }
      return generatedForm;
    })();

    if (!canAssignAdminRole && [ROLES.SUPER_ADMIN, ROLES.VILOYAT_ADMIN, ROLES.TUMAN_ADMIN].includes(safeForm.role)) {
      toast.warning('Faqat super admin boshqa admin rolini yaratishi mumkin!');
      return;
    }
    if (isRole(ROLES.TUMAN_ADMIN) && !allowedStaffRoles.includes(safeForm.role)) {
      toast.warning("Tuman admini faqat Bo'lim boshlig'i yoki Kutubxona xodimi rolini bera oladi!");
      return;
    }
    if ((isDistrictScopedUser || isViloyatScopedUser) && safeForm.viloyatId !== currentUser?.viloyatId) {
      toast.warning('Siz faqat o\'zingizning viloyatidagi foydalanuvchilarni boshqara olasiz!');
      return;
    }
    if (isDistrictScopedUser && safeForm.tumanId !== currentUser?.tumanId) {
      toast.warning('Siz faqat o\'zingizning tumanidagi xodimlarni kiritishingiz mumkin!');
      return;
    }

    const libraryAssignment = safeForm.libraryId || (isDistrictScopedUser ? currentUser?.libraryId || scopedLibraries[0]?.id || '' : '');
    const finalForm = { ...safeForm, libraryId: libraryAssignment };

    if (editItem) {
      const { password, ...updates } = finalForm;
      updateUser(editItem.id, updates);
      toast.success("Foydalanuvchi ma'lumotlari muvaffaqiyatli yangilandi!");
    } else {
      if (allUsers.some(u => u.username === finalForm.username)) {
        toast.warning('Bu login allaqachon mavjud!');
        return;
      }
      createUser(finalForm);
      toast.success("Yangi foydalanuvchi muvaffaqiyatli yaratildi!");
    }
    setShowModal(false);
    setEditItem(null);
    setForm({ fullName: '', username: '', password: '', role: ROLES.XODIMLAR_BOSHLIGI, phone: '+998', email: '', viloyatId: currentUser?.viloyatId || '', tumanId: currentUser?.tumanId || '', libraryId: '', active: true });
  };

  const openCreate = () => {
    setEditItem(null);
    const defaultLibraryId = (isDistrictScopedUser || isXodimlarBoshligi)
      ? (currentUser?.libraryId || scopedLibraries[0]?.id || '')
      : (scopedLibraries[0]?.id || '');
    setForm({
      fullName: '', username: '', password: '',
      role: isRole(ROLES.TUMAN_ADMIN, ROLES.VILOYAT_ADMIN) ? ROLES.XODIMLAR_BOSHLIGI : ROLES.KUTUBXONA_XODIMI,
      phone: '+998', email: '',
      viloyatId: currentUser?.viloyatId || '',
      tumanId:   currentUser?.tumanId   || '',
      libraryId: defaultLibraryId,
      active: true,
    });
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditItem(u);
    setForm({
      ...u,
      password: '',
      role: u.role || ROLES.KUTUBXONA_XODIMI,
      libraryId: u.libraryId || '',
      viloyatId: u.viloyatId || currentUser?.viloyatId || '',
      tumanId: u.tumanId || currentUser?.tumanId || '',
    });
    setShowModal(true);
  };

  const roleOptions = (() => {
    if (isRole(ROLES.SUPER_ADMIN)) {
      return Object.entries(ROLE_LABELS).map(([k, v]) => ({ value: k, label: v }));
    }
    if (isRole(ROLES.TUMAN_ADMIN, ROLES.VILOYAT_ADMIN)) {
      return [
        { value: ROLES.XODIMLAR_BOSHLIGI, label: "Xodimlar boshlig'i (Bo'lim boshlig'i)" },
        { value: ROLES.KUTUBXONA_XODIMI, label: "Kutubxona xodimi" },
      ];
    }
    return [{ value: ROLES.KUTUBXONA_XODIMI, label: ROLE_LABELS[ROLES.KUTUBXONA_XODIMI] }];
  })();

  const scopedLibraries = isDistrictScopedUser
    ? libraries.filter(l => l.viloyatId === currentUser?.viloyatId && l.tumanId === currentUser?.tumanId)
    : libraries.filter(l => (!form.viloyatId || l.viloyatId === form.viloyatId) && (!form.tumanId || l.tumanId === form.tumanId));

  return (
    <div>
      <PageHeader title="Xodimlar" subtitle={isXodimlarBoshligi ? "Kutubxona xodimlari ro'yxati" : "Tizim foydalanuvchilarini boshqarish"} icon={ICONS.users}
        action={canManage ? <Button onClick={openCreate}><ICONS.plus /> Yangi xodim</Button> : null} />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {Object.entries(ROLE_LABELS).map(([role, label]) => (
          // Xodimlar boshligi faqat kutubxona_xodimi sonini ko'radi
          isXodimlarBoshligi && role !== ROLES.KUTUBXONA_XODIMI ? null : (
            <Card key={role} className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {isXodimlarBoshligi
                  ? allUsers.filter(u => u.role === role && u.libraryId === currentUser.libraryId).length
                  : allUsers.filter(u => u.role === role).length
                }
              </p>
              <p className="text-xs text-gray-500 truncate">{label}</p>
            </Card>
          )
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <ICONS.search className="absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-400" />
          <input
            type="text"
            placeholder="Ism yoki login bo'yicha qidirish..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 shadow-xs"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 shadow-xs cursor-pointer"
        >
          <option value="">Barcha rollar</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ICONS.users} title="Foydalanuvchilar topilmadi" />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">F.I.O</th>
                  <th className="text-left px-4 py-3 font-medium">Login</th>
                  <th className="text-left px-4 py-3 font-medium">Rol</th>
                  <th className="text-left px-4 py-3 font-medium">Hudud</th>
                  <th className="text-left px-4 py-3 font-medium">Telefon</th>
                  <th className="text-left px-4 py-3 font-medium">Holat</th>
                  {canManage && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full ${avatarClass(ROLE_COLORS[u.role])} flex items-center justify-center font-semibold text-xs`}>{u.fullName?.charAt(0)}</div>
                        <span className="font-medium text-gray-800">{u.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{u.username}</td>
                    <td className="px-4 py-3"><Badge color={ROLE_COLORS[u.role]}>{ROLE_LABELS[u.role]}</Badge></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.viloyatId ? getViloyatName(u.viloyatId) : 'Barcha hudud'}{u.tumanId ? ' / ' + getTumanName(u.viloyatId, u.tumanId) : ''}</td>
                    <td className="px-4 py-3 text-gray-600">{u.phone || '-'}</td>
                    <td className="px-4 py-3"><Badge color={u.active !== false ? 'green' : 'gray'}>{u.active !== false ? 'Faol' : 'Nofaol'}</Badge></td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(u)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="Tahrirlash"><ICONS.edit className="text-sm" /></button>
                          <button
                            onClick={() => {
                              const np = prompt('Yangi parolni kiriting:');
                              if (np) {
                                resetPassword(u.id, np);
                                toast.success("Foydalanuvchi paroli muvaffaqiyatli yangilandi!");
                              }
                            }}
                            className="p-1.5 rounded hover:bg-amber-50 text-amber-600"
                            title="Parolni tiklash"
                          >
                            <ICONS.key className="text-sm" />
                          </button>
                          {u.id !== currentUser?.id && (
                            <button
                              onClick={() => {
                                if (confirm(`${u.fullName} o'chirilsinmi?`)) {
                                  deleteUser(u.id);
                                  toast.success("Foydalanuvchi muvaffaqiyatli o'chirildi!");
                                }
                              }}
                              className="p-1.5 rounded hover:bg-red-50 text-red-600"
                              title="O'chirish"
                            >
                              <ICONS.trash className="text-sm" />
                            </button>
                          )}
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? "Xodimni tahrirlash" : "Yangi xodim qo'shish"} size="lg"
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Bekor</Button><Button onClick={handleSave}><ICONS.save /> Saqlash</Button></>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="F.I.O" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required />
          <Input label="Login" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required disabled={!!editItem} />
          <Input label={editItem ? "Parol (o'zgartirmaslik uchun bo'sh qoldiring)" : "Parol"} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          <Input label="Telefon" value={form.phone} onChange={e => setForm({ ...form, phone: formatUzPhone(e.target.value) })} />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value.trim().toLowerCase() })} />
          <Select label="Holat" value={form.active ? 'true' : 'false'} onChange={e => setForm({ ...form, active: e.target.value === 'true' })} options={[{ value: 'true', label: 'Faol' }, { value: 'false', label: 'Nofaol' }]} placeholder="" />

          {/* Rol va hududiy parametrlar */}
          {!isXodimlarBoshligi && (
            <>
              <Select
                label="Rol"
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                options={roleOptions}
                required
                disabled={roleOptions.length <= 1}
                placeholder=""
              />
              <Select
                label="Viloyat"
                value={isDistrictScopedUser ? currentUser?.viloyatId || '' : form.viloyatId}
                onChange={e => setForm({ ...form, viloyatId: e.target.value, tumanId: '', libraryId: '' })}
                options={[{ value: '', label: 'Barcha hudud' }, ...VILOYATLAR.map(v => ({ value: v.id, label: v.name }))]}
                disabled={isDistrictScopedUser}
              />
              <Select
                label="Tuman/Shahar"
                value={isDistrictScopedUser ? currentUser?.tumanId || '' : form.tumanId}
                onChange={e => setForm({ ...form, tumanId: e.target.value, libraryId: '' })}
                options={[{ value: '', label: 'Barcha tuman' }, ...(selectedViloyat?.tumanlar || []).map(t => ({ value: t.id, label: t.name }))]}
                disabled={isDistrictScopedUser || (!isDistrictScopedUser && !form.viloyatId)}
                placeholder={!form.viloyatId && !isDistrictScopedUser ? "Avval viloyatni tanlang..." : "Tanlang..."}
              />
              <Select
                label="Kutubxona / Bo'lim"
                value={form.libraryId}
                onChange={e => setForm({ ...form, libraryId: e.target.value })}
                options={scopedLibraries.map(l => ({ value: l.id, label: l.name }))}
                disabled={scopedLibraries.length === 0}
                placeholder={scopedLibraries.length === 0 ? "Kutubxona topilmadi" : "Tanlang..."}
              />
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
