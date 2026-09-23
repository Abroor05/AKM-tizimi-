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
  const isDistrictScopedUser = isRole(ROLES.TUMAN_ADMIN, ROLES.KUTUBXONA_XODIMI);
  const isViloyatScopedUser = isRole(ROLES.VILOYAT_ADMIN);

  const filtered = useMemo(() => {
    const visibleUsers = (() => {
      if (isRole(ROLES.SUPER_ADMIN)) return allUsers;
      if (isViloyatScopedUser) return allUsers.filter(u => u.viloyatId === currentUser.viloyatId);
      if (isDistrictScopedUser) return allUsers.filter(u => u.viloyatId === currentUser.viloyatId && u.tumanId === currentUser.tumanId);
      return [];
    })();

    return visibleUsers.filter(u => {
      const matchSearch = !search || u.fullName?.toLowerCase().includes(search.toLowerCase()) || u.username?.toLowerCase().includes(search.toLowerCase());
      const matchRole = !roleFilter || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [allUsers, currentUser, isDistrictScopedUser, isRole, isViloyatScopedUser, search, roleFilter]);

  const canManage = isRole(ROLES.SUPER_ADMIN, ROLES.VILOYAT_ADMIN, ROLES.TUMAN_ADMIN);

  const selectedViloyat = VILOYATLAR.find(v => v.id === form.viloyatId);

  const handleSave = () => {
    if (!form.fullName || !form.username || !form.role) return;

    const cleanedEmail = (form.email || '').trim().toLowerCase();
    if (cleanedEmail && allUsers.some(u => u.email && u.email.toLowerCase() === cleanedEmail && u.id !== editItem?.id)) {
      alert('Bu email allaqachon ro\'yxatdan o\'tgan!');
      return;
    }

    const canAssignAdminRole = isRole(ROLES.SUPER_ADMIN);
    const safeForm = (() => {
      const generatedForm = {
        ...form,
        password: (form.password || '').trim(),
      };
      if (isRole(ROLES.TUMAN_ADMIN)) {
        return { ...generatedForm, role: ROLES.KUTUBXONA_XODIMI, viloyatId: currentUser.viloyatId, tumanId: currentUser.tumanId };
      }
      if (isRole(ROLES.VILOYAT_ADMIN)) {
        return { ...generatedForm, role: ROLES.KUTUBXONA_XODIMI, viloyatId: currentUser.viloyatId };
      }
      return generatedForm;
    })();

    if (!canAssignAdminRole && [ROLES.SUPER_ADMIN, ROLES.VILOYAT_ADMIN, ROLES.TUMAN_ADMIN].includes(safeForm.role)) {
      alert('Faqat super admin boshqa admin rolini yaratishi mumkin!');
      return;
    }

    if (isDistrictScopedUser && safeForm.role !== ROLES.KUTUBXONA_XODIMI) {
      alert('Tuman admini faqat xodim yaratishi mumkin!');
      return;
    }

    if ((isDistrictScopedUser || isViloyatScopedUser) && safeForm.viloyatId !== currentUser?.viloyatId) {
      alert('Siz faqat o\'zingizning viloyatidagi foydalanuvchilarni boshqara olasiz!');
      return;
    }

    if (isDistrictScopedUser && safeForm.tumanId !== currentUser?.tumanId) {
      alert('Siz faqat o\'zingizning tumanidagi xodimlarni kiritishingiz mumkin!');
      return;
    }

    if (editItem) {
      const { password, ...updates } = safeForm;
      updateUser(editItem.id, updates);
    } else {
      if (allUsers.some(u => u.username === safeForm.username)) {
        alert('Bu login allaqachon mavjud!');
        return;
      }
      createUser(safeForm);
    }
    setShowModal(false);
    setEditItem(null);
    setForm({ fullName: '', username: '', password: '', role: ROLES.KUTUBXONA_XODIMI, phone: '+998', email: '', viloyatId: currentUser?.viloyatId || '', tumanId: currentUser?.tumanId || '', libraryId: '', active: true });
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ fullName: '', username: '', password: '', role: isRole(ROLES.SUPER_ADMIN) || isRole(ROLES.VILOYAT_ADMIN) || isRole(ROLES.TUMAN_ADMIN) ? ROLES.KUTUBXONA_XODIMI : ROLES.KUTUBXONA_XODIMI, phone: '+998', email: '', viloyatId: currentUser?.viloyatId || '', tumanId: currentUser?.tumanId || '', libraryId: '', active: true });
    setShowModal(true);
  };

  const roleOptions = (() => {
    if (isRole(ROLES.SUPER_ADMIN)) {
      return Object.entries(ROLE_LABELS).map(([k, v]) => ({ value: k, label: v }));
    }
    return [{ value: ROLES.KUTUBXONA_XODIMI, label: ROLE_LABELS[ROLES.KUTUBXONA_XODIMI] }];
  })();

  const scopedLibraries = isDistrictScopedUser
    ? libraries.filter(l => l.viloyatId === currentUser?.viloyatId && l.tumanId === currentUser?.tumanId)
    : libraries.filter(l => (!form.viloyatId || l.viloyatId === form.viloyatId) && (!form.tumanId || l.tumanId === form.tumanId));

  return (
    <div>
      <PageHeader title="Foydalanuvchilar" subtitle="Tizim foydalanuvchilarini boshqarish" icon={ICONS.users}
        action={canManage ? <Button onClick={openCreate}><ICONS.plus /> Yangi foydalanuvchi</Button> : null} />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {Object.entries(ROLE_LABELS).map(([role, label]) => (
          <Card key={role} className="text-center">
            <p className="text-2xl font-bold text-blue-600">{allUsers.filter(u => u.role === role).length}</p>
            <p className="text-xs text-gray-500 truncate">{label}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <ICONS.search className="absolute left-3 top-3 text-gray-400" />
          <input type="text" placeholder="Ism yoki login bo'yicha qidirish..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white">
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
                          <button onClick={() => { setEditItem(u); setForm({ ...u, password: '' }); setShowModal(true); }} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="Tahrirlash"><ICONS.edit className="text-sm" /></button>
                          <button onClick={() => { const np = prompt('Yangi parolni kiriting:'); if (np) resetPassword(u.id, np); }} className="p-1.5 rounded hover:bg-amber-50 text-amber-600" title="Parolni tiklash"><ICONS.key className="text-sm" /></button>
                          {u.id !== currentUser?.id && (
                            <button onClick={() => { if (confirm('Foydalanuvchi o\'chirilsinmi?')) deleteUser(u.id); }} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="O'chirish"><ICONS.trash className="text-sm" /></button>
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? "Foydalanuvchini tahrirlash" : "Yangi foydalanuvchi"} size="lg"
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Bekor</Button><Button onClick={handleSave}><ICONS.save /> Saqlash</Button></>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="F.I.O" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required />
          <Input label="Login" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required disabled={!!editItem} />
          <Input label={editItem ? "Parol (o'zgartirmaslik uchun bo'sh qoldiring)" : "Parol"} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          <Select label="Rol" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} options={roleOptions} required disabled={!isRole(ROLES.SUPER_ADMIN)} />
          <Input label="Telefon" value={form.phone} onChange={e => setForm({ ...form, phone: formatUzPhone(e.target.value) })} />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value.trim().toLowerCase() })} />
          <Select label="Viloyat" value={isDistrictScopedUser ? currentUser?.viloyatId || '' : form.viloyatId} onChange={e => setForm({ ...form, viloyatId: e.target.value, tumanId: '', libraryId: '' })} options={[{ value: '', label: 'Barcha hudud' }, ...VILOYATLAR.map(v => ({ value: v.id, label: v.name }))]} disabled={isDistrictScopedUser} />
          <Select label="Tuman/Shahar" value={isDistrictScopedUser ? currentUser?.tumanId || '' : form.tumanId} onChange={e => setForm({ ...form, tumanId: e.target.value, libraryId: '' })} options={[{ value: '', label: 'Barcha tuman' }, ...(selectedViloyat?.tumanlar || []).map(t => ({ value: t.id, label: t.name }))]} disabled={isDistrictScopedUser} />
          <Select label="Kutubxona" value={form.libraryId} onChange={e => setForm({ ...form, libraryId: e.target.value })} options={[{ value: '', label: "Tanlanmagan" }, ...scopedLibraries.map(l => ({ value: l.id, label: l.name }))]} disabled={isDistrictScopedUser} />
          <Select label="Holat" value={form.active ? 'true' : 'false'} onChange={e => setForm({ ...form, active: e.target.value === 'true' })} options={[{ value: 'true', label: 'Faol' }, { value: 'false', label: 'Nofaol' }]} />
        </div>
      </Modal>
    </div>
  );
}
