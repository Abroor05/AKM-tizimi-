// ============================================================
// PROFILE PAGE — Barcha rollar uchun profil va sozlamalar
// ============================================================
import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import ICONS from '../../components/icons.jsx';
import {
  ROLE_LABELS, ROLE_COLORS, ROLE_PERMISSIONS, PERMISSIONS,
  avatarClass, STORAGE_KEYS, ROLES,
} from '../../data/constants.js';
import { getViloyatName, getTumanName } from '../../data/regions.js';
import { formatDate } from '../../utils/helpers.js';

const PERM_LABELS = {
  [PERMISSIONS.VIEW_DASHBOARD]:    'Boshqaruv paneli',
  [PERMISSIONS.VIEW_LIBRARIES]:    'Kutubxonalarni ko\'rish',
  [PERMISSIONS.MANAGE_LIBRARIES]:  'Kutubxonalarni boshqarish',
  [PERMISSIONS.CREATE_ACTIVITY]:   'Faoliyat qo\'shish',
  [PERMISSIONS.VIEW_ACTIVITIES]:   'Faoliyatlarni ko\'rish',
  [PERMISSIONS.APPROVE_ACTIVITY]:  'Faoliyatni tasdiqlash',
  [PERMISSIONS.CREATE_REPORT]:     'Hisobot yaratish',
  [PERMISSIONS.VIEW_REPORTS]:      'Hisobotlarni ko\'rish',
  [PERMISSIONS.REVIEW_REPORT]:     'Hisobotni ko\'rib chiqish',
  [PERMISSIONS.APPROVE_REPORT]:    'Hisobotni tasdiqlash',
  [PERMISSIONS.CREATE_TASK]:       'Topshiriq yaratish',
  [PERMISSIONS.VIEW_TASKS]:        'Topshiriqlarni ko\'rish',
  [PERMISSIONS.ASSIGN_TASK]:       'Topshiriq berish',
  [PERMISSIONS.COMPLETE_TASK]:     'Topshiriqni bajarish',
  [PERMISSIONS.MANAGE_EVENTS]:     'Tadbirlarni boshqarish',
  [PERMISSIONS.VIEW_EVENTS]:       'Tadbirlarni ko\'rish',
  [PERMISSIONS.MANAGE_INVENTORY]:  'Inventarni boshqarish',
  [PERMISSIONS.VIEW_INVENTORY]:    'Inventarni ko\'rish',
  [PERMISSIONS.MANAGE_DOCUMENTS]:  'Hujjatlarni boshqarish',
  [PERMISSIONS.VIEW_DOCUMENTS]:    'Hujjatlarni ko\'rish',
  [PERMISSIONS.VIEW_APPEALS]:      'Murojaatlarni ko\'rish',
  [PERMISSIONS.VIEW_NOTIFICATIONS]:'Bildirishnomalar',
  [PERMISSIONS.VIEW_KPI]:          'KPI va Reyting',
  [PERMISSIONS.VIEW_STATISTICS]:   'Statistika',
  [PERMISSIONS.VIEW_ANALYTICS]:    'BI Analytics',
  [PERMISSIONS.VIEW_MAP]:          'Xarita',
  [PERMISSIONS.VIEW_USERS]:        'Foydalanuvchilarni ko\'rish',
  [PERMISSIONS.MANAGE_USERS]:      'Foydalanuvchilarni boshqarish',
  [PERMISSIONS.MANAGE_ROLES]:      'Rollarni boshqarish',
  [PERMISSIONS.VIEW_AUDIT]:        'Audit log',
  [PERMISSIONS.MANAGE_SECURITY]:   'Xavfsizlik',
  [PERMISSIONS.MANAGE_SETTINGS]:   'Tizim sozlamalari',
  [PERMISSIONS.VIEW_PROFILE]:      'Profil',
};

export default function ProfilePage() {
  const { currentUser, updateUser, resetPassword, getCollection, resetAllData } = useApp();

  const isSuperAdmin = currentUser?.role === ROLES.SUPER_ADMIN || currentUser?.role === 'super_admin';

  const [activeTab, setActiveTab] = useState('info');
  const [editMode,  setEditMode]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [pwMode,    setPwMode]    = useState(false);
  const [pwSaving,  setPwSaving]  = useState(false);
  const [success,   setSuccess]   = useState('');
  const [error,     setError]     = useState('');

  // Super Admin reset database state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetAgreed, setResetAgreed] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');

  // Edit form state
  const [form, setForm] = useState({
    fullName: currentUser?.fullName || '',
    phone:    currentUser?.phone    || '',
    email:    currentUser?.email    || '',
  });

  // Password form state
  const [pwForm, setPwForm] = useState({
    newPassword:    '',
    confirmPassword: '',
  });

  const libraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES), [getCollection]);
  const myLibrary = useMemo(() =>
    libraries.find(l => l.id === currentUser?.libraryId), [libraries, currentUser]);

  const roleColor  = ROLE_COLORS[currentUser?.role]  || 'blue';
  const roleLabel  = ROLE_LABELS[currentUser?.role]  || currentUser?.role;
  const myPerms    = ROLE_PERMISSIONS[currentUser?.role] || [];

  // ─── Handlers ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.fullName.trim()) {
      setError('Ism-familya talab qilinadi');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateUser(currentUser.id, {
        fullName: form.fullName.trim(),
        phone:    form.phone.trim() || null,
        email:    form.email.trim().toLowerCase() || null,
      });
      setSuccess('Ma\'lumotlar muvaffaqiyatli yangilandi');
      setEditMode(false);
    } catch (err) {
      setError(err.message || 'Yangilashda xato yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setForm({
      fullName: currentUser?.fullName || '',
      phone:    currentUser?.phone    || '',
      email:    currentUser?.email    || '',
    });
    setEditMode(false);
    setError('');
  };

  const handlePasswordReset = async () => {
    if (!pwForm.newPassword) {
      setError('Yangi parol talab qilinadi');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setError('Parol kamida 6 ta belgidan iborat bo\'lishi kerak');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setError('Parollar mos kelmadi');
      return;
    }
    setPwSaving(true);
    setError('');
    setSuccess('');
    try {
      await resetPassword(currentUser.id, pwForm.newPassword);
      setSuccess('Parol muvaffaqiyatli o\'zgartirildi');
      setPwMode(false);
      setPwForm({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.message || 'Parol o\'zgartirishda xato');
    } finally {
      setPwSaving(false);
    }
  };

  const handleDatabaseReset = async () => {
    if (!isSuperAdmin) {
      toast.error("Faqat Super Admin bazani qayta tiklashi mumkin!");
      return;
    }
    if (!resetAgreed || resetConfirmText.trim().toUpperCase() !== 'CONFIRM') {
      setResetError("Tasdiqlash uchun katakchani belgilang va 'CONFIRM' so'zini kiriting.");
      return;
    }

    setResetting(true);
    setResetError('');
    try {
      toast.info("Ma'lumotlar bazasi qayta tiklanmoqda...");
      await resetAllData('CONFIRM_DELETE_ALL');
      toast.success("Baza muvaffaqiyatli tozalandi!");
      setResetModalOpen(false);
    } catch (err) {
      setResetError(err.message || 'Bazani qayta tiklashda xato yuz berdi');
      toast.error(err.message || 'Xato yuz berdi');
    } finally {
      setResetting(false);
    }
  };

  const TABS = useMemo(() => {
    const list = [
      { id: 'info',  label: 'Shaxsiy ma\'lumotlar' },
      { id: 'perms', label: 'Ruxsatlarim' },
    ];
    if (isSuperAdmin) {
      list.push({ id: 'database', label: 'Baza sozlamalari (Super Admin)' });
    }
    return list;
  }, [isSuperAdmin]);

  return (
    <div>
      <PageHeader
        title="Profil va Sozlamalar"
        subtitle="Shaxsiy ma'lumotlar va tizimga kirish sozlamalari"
        icon={ICONS.user}
      />

      {/* Profile header card */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className={`w-20 h-20 rounded-full ${avatarClass(roleColor)} flex items-center justify-center text-3xl font-bold shrink-0`}>
            {currentUser?.fullName?.charAt(0)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">{currentUser?.fullName}</h2>
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">@{currentUser?.username}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge color={roleColor}>{roleLabel}</Badge>
              {currentUser?.active
                ? <Badge color="green">Faol</Badge>
                : <Badge color="red">Nofaol</Badge>
              }
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500 dark:text-slate-400">
              {currentUser?.phone && (
                <span className="flex items-center gap-1">
                  <ICONS.phone className="text-xs" /> {currentUser.phone}
                </span>
              )}
              {currentUser?.email && (
                <span className="flex items-center gap-1">
                  <ICONS.email className="text-xs" /> {currentUser.email}
                </span>
              )}
              {currentUser?.viloyatId && (
                <span className="flex items-center gap-1">
                  <ICONS.location className="text-xs" />
                  {getViloyatName(currentUser.viloyatId)}
                  {currentUser.tumanId ? ` / ${getTumanName(currentUser.viloyatId, currentUser.tumanId)}` : ''}
                </span>
              )}
              {myLibrary && (
                <span className="flex items-center gap-1">
                  <ICONS.library className="text-xs" /> {myLibrary.name}
                </span>
              )}
              {currentUser?.createdAt && (
                <span className="flex items-center gap-1">
                  <ICONS.calendar className="text-xs" /> {formatDate(currentUser.createdAt)} dan beri
                </span>
              )}
            </div>
          </div>

          {/* Edit button */}
          {!editMode && (
            <Button
              variant="secondary"
              onClick={() => { setEditMode(true); setSuccess(''); setError(''); }}
            >
              <ICONS.edit /> Tahrirlash
            </Button>
          )}
        </div>
      </Card>

      {/* Alert messages */}
      {success && (
        <div className="mb-4 flex items-center gap-2 bg-green-50 dark:bg-emerald-950/30 border border-green-200 dark:border-emerald-900/50 text-green-700 dark:text-emerald-300 px-4 py-3 rounded-xl text-sm">
          <ICONS.success className="shrink-0" /> {success}
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 dark:bg-rose-950/30 border border-red-200 dark:border-rose-900/50 text-red-700 dark:text-rose-300 px-4 py-3 rounded-xl text-sm">
          <ICONS.error className="shrink-0" /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 border border-transparent dark:border-slate-700/80 rounded-xl p-1 mb-5 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setError(''); setSuccess(''); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Personal Info ── */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Edit / view form */}
          <Card title={editMode ? 'Ma\'lumotlarni tahrirlash' : 'Shaxsiy ma\'lumotlar'}>
            {editMode ? (
              <div className="space-y-4">
                <Input
                  label="Ism-familya"
                  value={form.fullName}
                  onChange={e => setForm({ ...form, fullName: e.target.value })}
                  required
                />
                <Input
                  label="Telefon"
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="+998901234567"
                />
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="example@mail.com"
                />
                <div className="flex gap-3 pt-1">
                  <Button onClick={handleSave} disabled={saving}>
                    <ICONS.save /> {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                  </Button>
                  <Button variant="secondary" onClick={handleCancelEdit}>
                    Bekor
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { label: 'Ism-familya',  value: currentUser?.fullName, icon: ICONS.user      },
                  { label: 'Login',        value: currentUser?.username,  icon: ICONS.key       },
                  { label: 'Telefon',      value: currentUser?.phone || '—', icon: ICONS.phone  },
                  { label: 'Email',        value: currentUser?.email || '—', icon: ICONS.email  },
                  { label: 'Viloyat',      value: currentUser?.viloyatId ? getViloyatName(currentUser.viloyatId) : '—', icon: ICONS.location },
                  { label: 'Tuman',        value: currentUser?.tumanId ? getTumanName(currentUser.viloyatId, currentUser.tumanId) : '—', icon: ICONS.location },
                  { label: 'Kutubxona',    value: myLibrary?.name || '—', icon: ICONS.library   },
                  { label: 'Ro\'yxatdan o\'tgan', value: formatDate(currentUser?.createdAt), icon: ICONS.calendar },
                  { label: 'Oxirgi kirish', value: formatDate(currentUser?.lastLogin) || '—', icon: ICONS.pending },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center shrink-0 text-xs mt-0.5">
                      <Icon />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="text-sm font-medium text-gray-700">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Password change */}
          <Card title="Parolni o'zgartirish">
            {!pwMode ? (
              <div className="flex flex-col items-start gap-4">
                <p className="text-sm text-gray-500">
                  Xavfsizligingiz uchun parolni muntazam ravishda yangilab turing.
                  Parol kamida 6 ta belgidan iborat bo'lishi kerak.
                </p>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100 w-full">
                  <ICONS.warning className="text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700">
                    Parolni boshqalar bilan ulashmang va uni xavfsiz joyda saqlang.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => { setPwMode(true); setError(''); setSuccess(''); }}
                >
                  <ICONS.key /> Parolni o'zgartirish
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Input
                  label="Yangi parol"
                  type="password"
                  value={pwForm.newPassword}
                  onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  placeholder="Kamida 6 ta belgi"
                  required
                />
                <Input
                  label="Parolni tasdiqlang"
                  type="password"
                  value={pwForm.confirmPassword}
                  onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  placeholder="Parolni qaytaring"
                  required
                />
                {pwForm.newPassword && pwForm.confirmPassword && (
                  <p className={`text-xs font-medium ${
                    pwForm.newPassword === pwForm.confirmPassword
                      ? 'text-green-600'
                      : 'text-red-500'
                  }`}>
                    {pwForm.newPassword === pwForm.confirmPassword
                      ? '✓ Parollar mos keldi'
                      : '✗ Parollar mos kelmadi'
                    }
                  </p>
                )}
                <div className="flex gap-3">
                  <Button onClick={handlePasswordReset} disabled={pwSaving}>
                    <ICONS.save /> {pwSaving ? 'Saqlanmoqda...' : 'Saqlash'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setPwMode(false);
                      setPwForm({ newPassword: '', confirmPassword: '' });
                      setError('');
                    }}
                  >
                    Bekor
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Super Admin Database Reset Card */}
          {isSuperAdmin && (
            <div className="lg:col-span-2">
              <Card className="border-rose-200/90 dark:border-rose-900/50 bg-gradient-to-r from-rose-50/60 via-white to-amber-50/40 dark:from-rose-950/30 dark:via-slate-900 dark:to-amber-950/20">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <ICONS.warning className="text-xl" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                          Ma'lumotlar bazasini qayta tiklash
                        </h3>
                        <Badge color="red">Faqat Super Admin</Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                        Tizimdagi barcha ma'lumotlarni (foydalanuvchilar, kitoblar, hisobotlar, faoliyatlar) boshlang'ich holatga qaytarish va tozalash. Bu huquq faqat Super Adminga tegishli bo'lib, oddiy admin yoki boshqa xodimlarda mavjud emas.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setResetConfirmText('');
                      setResetAgreed(false);
                      setResetError('');
                      setResetModalOpen(true);
                    }}
                    className="shrink-0 cursor-pointer"
                  >
                    <ICONS.warning className="text-sm" /> Bazani qayta tiklash
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Permissions ── */}
      {activeTab === 'perms' && (
        <Card title={`Mening ruxsatlarim — ${roleLabel} (${myPerms.length} ta)`}>
          <p className="text-sm text-gray-500 mb-4">
            Sizning rolingizga berilgan tizim ruxsatlari. Bu ruxsatlar qaysi sahifalar va
            funksiyalarga kirishingizni belgilaydi.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {myPerms.map(perm => (
              <div
                key={perm}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-gray-100 bg-gray-50"
              >
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <ICONS.check className="text-green-600 text-[10px]" />
                </div>
                <span className="text-sm text-gray-700">
                  {PERM_LABELS[perm] || perm}
                </span>
              </div>
            ))}
          </div>
          {myPerms.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              Hech qanday ruxsat topilmadi
            </p>
          )}
        </Card>
      )}

      {/* ── Tab: Database Settings (Super Admin Only) ── */}
      {isSuperAdmin && activeTab === 'database' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg">
                  <ICONS.library />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Baza formati</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">SQLite (kbt.db)</p>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg">
                  <ICONS.check />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Baza holati</p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Faol & Himoyalangan</p>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center text-lg">
                  <ICONS.security />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Boshqaruv huquqi</p>
                  <p className="text-sm font-bold text-purple-600 dark:text-purple-400">Super Admin (Root)</p>
                </div>
              </div>
            </Card>
          </div>

          <Card title="Ma'lumotlar bazasini qayta tiklash (Tozalash)">
            <div className="p-5 rounded-2xl border-2 border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
                  <ICONS.warning className="text-xl" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-rose-900 dark:text-rose-200">
                    Barcha ma'lumotlarni tozalash va qayta tiklash
                  </h4>
                  <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed max-w-2xl">
                    Ushbu amal tizimdagi barcha jadvallarni (foydalanuvchilar, kutubxonalar, kitoblar, kitobxonlar, topshiriqlar, tadbirlar, inventar, hujjatlar, arizalar, bildirishnomalar, kpi, audit) to'liq tozalaydi va tizimni boshlang'ich sozlash (bootstrap) holatiga qaytaradi.
                  </p>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-2">
                    Xavfsizlik qoidasi: Ushbu amal faqat Super Admin sahifasida profil sozlamalarida mavjud bo'lib, login oynasida yoki boshqa foydalanuvchilarda ko'rinmaydi.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-rose-200/80 dark:border-rose-900/50 flex justify-end">
                <Button
                  variant="danger"
                  size="md"
                  onClick={() => {
                    setResetConfirmText('');
                    setResetAgreed(false);
                    setResetError('');
                    setResetModalOpen(true);
                  }}
                  className="cursor-pointer"
                >
                  <ICONS.warning className="text-sm" /> Bazani qayta tiklash
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Super Admin Database Reset Confirmation Modal */}
      {isSuperAdmin && (
        <Modal
          isOpen={resetModalOpen}
          onClose={() => {
            if (!resetting) {
              setResetModalOpen(false);
              setResetConfirmText('');
              setResetAgreed(false);
              setResetError('');
            }
          }}
          title="Bazani qayta tiklashni tasdiqlang"
          subtitle="Xavfsizlik tekshiruvi — Faqat Super Admin uchun"
          size="md"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setResetModalOpen(false)}
                disabled={resetting}
              >
                Bekor qilish
              </Button>
              <Button
                variant="danger"
                onClick={handleDatabaseReset}
                disabled={resetting || !resetAgreed || resetConfirmText.trim().toUpperCase() !== 'CONFIRM'}
                loading={resetting}
              >
                {resetting ? 'Qayta tiklanmoqda...' : 'Tasdiqlash va Bazani tozalash'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3.5 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200">
              <ICONS.warning className="text-2xl text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed space-y-1">
                <p className="font-bold text-sm text-rose-900 dark:text-rose-100">
                  DIQQAT: Qaytarib bo'lmas amal!
                </p>
                <p>
                  Ushbu amalni tasdiqlasangiz, barcha ma'lumotlar bazasi (foydalanuvchilar, kitoblar, kitobxonlar, faoliyatlar, hisobotlar, arizalar, arxivlar) to'liq tozalanadi.
                </p>
                <p className="font-semibold text-rose-700 dark:text-rose-300">
                  Tizim yangi boshlang'ich sozlash (bootstrap) holatiga o'tadi.
                </p>
              </div>
            </div>

            {resetError && (
              <div className="p-3 rounded-lg bg-rose-100 dark:bg-rose-950/70 border border-rose-300 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                {resetError}
              </div>
            )}

            <div className="space-y-3 pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 dark:text-slate-300 font-medium">
                <input
                  type="checkbox"
                  checked={resetAgreed}
                  onChange={(e) => setResetAgreed(e.target.checked)}
                  className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                />
                <span>
                  Barcha ma'lumotlar butunlay o'chirilishini tushunaman va tasdiqlayman.
                </span>
              </label>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tasdiqlash uchun quyidagi maydonga <span className="font-mono text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/50 px-1 py-0.5 rounded">CONFIRM</span> so'zini kiriting:
                </label>
                <Input
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="CONFIRM"
                  className="font-mono"
                  disabled={resetting}
                />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
