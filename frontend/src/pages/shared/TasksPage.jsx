import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import TextArea from '../../components/ui/TextArea.jsx';
import Modal from '../../components/ui/Modal.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import ICONS from '../../components/icons.jsx';
import {
  TASK_PRIORITY,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
  TASK_STATUS,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  ROLE_LABELS,
  ROLE_COLORS,
  ROLES,
  avatarClass,
} from '../../data/constants.js';
import { VILOYATLAR, getViloyatName, getTumanName } from '../../data/regions.js';
import { formatDate, isOverdue, daysUntil } from '../../utils/helpers.js';

export default function TasksPage() {
  const { currentUser, getTasks, createTask, updateTaskStatus, getUsers, isRole, hasPermission } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);

  const isSuperAdmin = isRole(ROLES.SUPER_ADMIN);
  const isViloyatAdmin = isRole(ROLES.VILOYAT_ADMIN);
  const isTumanAdmin = isRole(ROLES.TUMAN_ADMIN);

  // Target assignment state: 'all' (Barcha uchun) | 'selected' (Ba'zilar uchun)
  const [targetScope, setTargetScope] = useState('all');
  const [targetRoleFilter, setTargetRoleFilter] = useState('all');
  const [targetTumanFilter, setTargetTumanFilter] = useState('all');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [userFilterText, setUserFilterText] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: TASK_PRIORITY.MEDIUM,
    dueDate: '',
    libraryId: '',
  });

  const allTasks = useMemo(() => getTasks(), [getTasks]);
  const users = useMemo(() => getUsers(), [getUsers]);

  // Scope tasks according to role
  const tasks = useMemo(() => {
    if (isSuperAdmin) return allTasks;
    if (isRole(ROLES.KUTUBXONA_XODIMI)) return allTasks.filter(t => t.assignedTo === currentUser.id);
    if (isTumanAdmin) {
      const districtUserIds = new Set(
        users
          .filter(u => u.viloyatId === currentUser.viloyatId && u.tumanId === currentUser.tumanId)
          .map(u => u.id)
      );
      return allTasks.filter(t =>
        t.assignedBy === currentUser.id ||
        t.assignedTo === currentUser.id ||
        districtUserIds.has(t.assignedTo) ||
        districtUserIds.has(t.assignedBy)
      );
    }
    return allTasks.filter(t => t.assignedTo === currentUser.id || t.assignedBy === currentUser.id);
  }, [allTasks, currentUser, isSuperAdmin, isTumanAdmin, isRole, users]);

  // Eligible pool of assignees depending on role
  const eligibleAssignees = useMemo(() => {
    if (isSuperAdmin) {
      return users.filter(u => u.active !== false && u.id !== currentUser?.id);
    }
    if (isViloyatAdmin) {
      return users.filter(u => u.active !== false && u.viloyatId === currentUser?.viloyatId && u.id !== currentUser?.id);
    }
    if (isTumanAdmin) {
      return users.filter(u =>
        u.active !== false &&
        u.viloyatId === currentUser?.viloyatId &&
        u.tumanId === currentUser?.tumanId &&
        u.id !== currentUser?.id
      );
    }
    if (isRole(ROLES.XODIMLAR_BOSHLIGI)) {
      return users.filter(u =>
        u.active !== false &&
        (u.libraryId === currentUser?.libraryId || (u.viloyatId === currentUser?.viloyatId && u.tumanId === currentUser?.tumanId)) &&
        u.id !== currentUser?.id
      );
    }
    return [];
  }, [users, currentUser, isSuperAdmin, isViloyatAdmin, isTumanAdmin, isRole]);

  // When 'all' is selected: users filtered by targetRoleFilter and targetTumanFilter
  const allTargetUsers = useMemo(() => {
    return eligibleAssignees.filter(u => {
      const matchRole = targetRoleFilter === 'all' || u.role === targetRoleFilter;
      const matchTuman = targetTumanFilter === 'all' || u.tumanId === targetTumanFilter;
      return matchRole && matchTuman;
    });
  }, [eligibleAssignees, targetRoleFilter, targetTumanFilter]);

  // Search filtered assignees for 'selected' mode
  const filteredAssignees = useMemo(() => {
    return eligibleAssignees.filter(u => {
      if (!userFilterText.trim()) return true;
      const q = userFilterText.toLowerCase();
      return (
        u.fullName?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        (ROLE_LABELS[u.role] || '').toLowerCase().includes(q)
      );
    });
  }, [eligibleAssignees, userFilterText]);

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || t.status === statusFilter;
      return matchSearch && matchStatus;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [tasks, search, statusFilter]);

  const canCreate = hasPermission('create_task') || isSuperAdmin || isViloyatAdmin || isTumanAdmin;
  const canComplete = hasPermission('complete_task') || isRole(ROLES.SUPER_ADMIN, ROLES.VILOYAT_ADMIN, ROLES.TUMAN_ADMIN, ROLES.XODIMLAR_BOSHLIGI, ROLES.KUTUBXONA_XODIMI);

  const openCreateModal = () => {
    setForm({
      title: '',
      description: '',
      assignedTo: eligibleAssignees[0]?.id || '',
      priority: TASK_PRIORITY.MEDIUM,
      dueDate: '',
      libraryId: '',
    });
    setTargetScope('all');
    setTargetRoleFilter('all');
    setTargetTumanFilter('all');
    setSelectedUserIds([]);
    setUserFilterText('');
    setShowModal(true);
  };

  const handleToggleUser = (userId) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllUsers = () => {
    setSelectedUserIds(filteredAssignees.map(u => u.id));
  };

  const handleClearAllUsers = () => {
    setSelectedUserIds([]);
  };

  const handleCreate = async () => {
    if (!form.title?.trim() || !form.dueDate) {
      toast.warning("Iltimos, topshiriq sarlavhasi va muddatini to'ldiring!");
      return;
    }

    let recipientIds = [];
    if (targetScope === 'all') {
      recipientIds = allTargetUsers.map(u => u.id);
      if (recipientIds.length === 0) {
        toast.warning("Topshiriq yuboriladigan mos foydalanuvchilar topilmadi!");
        return;
      }
    } else {
      recipientIds = selectedUserIds;
      if (recipientIds.length === 0) {
        toast.warning("Iltimos, topshiriq yuboriladigan kamida bitta xodimni tanlang!");
        return;
      }
    }

    try {
      if (recipientIds.length === 1) {
        const targetUser = users.find(u => u.id === recipientIds[0]);
        await createTask({
          ...form,
          assignedTo: recipientIds[0],
          libraryId: targetUser?.libraryId || currentUser?.libraryId || '',
        });
        toast.success("Topshiriq muvaffaqiyatli saqlandi!");
      } else {
        await createTask({
          ...form,
          assignedToUsers: recipientIds,
        });
        toast.success(`Topshiriq ${recipientIds.length} nafar xodimga muvaffaqiyatli yuborildi!`);
      }

      setShowModal(false);
      setForm({ title: '', description: '', assignedTo: '', priority: TASK_PRIORITY.MEDIUM, dueDate: '', libraryId: '' });
      setSelectedUserIds([]);
    } catch (err) {
      toast.error("Topshiriq yaratishda xatolik yuz berdi");
    }
  };

  const handleStatusChange = (id, status) => {
    updateTaskStatus(id, status);
    toast.info("Topshiriq holati yangilandi!");
  };

  return (
    <div>
      <PageHeader
        title="Topshiriqlar"
        subtitle="Vazifalar, topshiriqlar taqsimoti va ijro intizomi nazorati"
        icon={ICONS.tasks}
        action={canCreate ? <Button onClick={openCreateModal}><ICONS.plus /> Yangi topshiriq</Button> : null}
      />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <Card className="text-center">
          <p className="text-2xl font-bold text-gray-600">{tasks.filter(t => t.status === TASK_STATUS.PENDING).length}</p>
          <p className="text-xs text-gray-500">Kutilmoqda</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-blue-600">{tasks.filter(t => t.status === TASK_STATUS.IN_PROGRESS).length}</p>
          <p className="text-xs text-gray-500">Bajarilmoqda</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-green-600">{tasks.filter(t => t.status === TASK_STATUS.COMPLETED).length}</p>
          <p className="text-xs text-gray-500">Bajarilgan</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-red-600">{tasks.filter(t => t.status === TASK_STATUS.OVERDUE || (t.status !== TASK_STATUS.COMPLETED && isOverdue(t.dueDate))).length}</p>
          <p className="text-xs text-gray-500">Muddati o'tgan</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-amber-600">{tasks.filter(t => t.priority === TASK_PRIORITY.URGENT && t.status !== TASK_STATUS.COMPLETED).length}</p>
          <p className="text-xs text-gray-500">Shoshilinch</p>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <ICONS.search className="absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-400" />
          <input
            type="text"
            placeholder="Topshiriq nomi yoki tavsifi bo'yicha qidirish..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 shadow-xs"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 shadow-xs cursor-pointer"
        >
          <option value="">Barcha holatlar</option>
          {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ICONS.tasks} title="Topshiriqlar topilmadi" />
      ) : (
        <div className="space-y-3">
          {filtered.map(t => {
            const overdue = t.status !== TASK_STATUS.COMPLETED && isOverdue(t.dueDate);
            const days = daysUntil(t.dueDate);
            const assignee = users.find(u => u.id === t.assignedTo);

            return (
              <Card key={t.id} className={overdue ? 'border-red-200' : ''}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-gray-800 text-base">{t.title}</h3>
                      <Badge color={TASK_PRIORITY_COLORS[t.priority]}>{TASK_PRIORITY_LABELS[t.priority]}</Badge>
                      <Badge color={TASK_STATUS_COLORS[t.status]}>{TASK_STATUS_LABELS[t.status]}</Badge>
                    </div>
                    {t.description && <p className="text-sm text-gray-500">{t.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1.5 font-medium text-gray-600">
                        <ICONS.user className="text-[11px] text-blue-600" />
                        <span>{assignee?.fullName || "Noma'lum"}</span>
                        {assignee && (
                          <span className="text-gray-400 font-normal">
                            ({ROLE_LABELS[assignee.role] || assignee.role})
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <ICONS.calendar className="text-[10px]" />
                        Muddat: {formatDate(t.dueDate)}
                      </span>
                      {days !== null && days >= 0 && t.status !== TASK_STATUS.COMPLETED && (
                        <span className="text-amber-600 font-medium">{days} kun qoldi</span>
                      )}
                      {overdue && <span className="text-red-600 font-medium">Muddati o'tgan!</span>}
                    </div>
                  </div>
                  {canComplete && t.assignedTo === currentUser.id && t.status !== TASK_STATUS.COMPLETED && (
                    <div className="flex gap-2">
                      {t.status === TASK_STATUS.PENDING && (
                        <Button size="sm" variant="primary" onClick={() => handleStatusChange(t.id, TASK_STATUS.IN_PROGRESS)}>
                          Boshlash
                        </Button>
                      )}
                      <Button size="sm" variant="success" onClick={() => handleStatusChange(t.id, TASK_STATUS.COMPLETED)}>
                        <ICONS.check className="text-sm" /> Bajarildi
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Yangi topshiriq */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Yangi topshiriq yaratish"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Bekor</Button>
            <Button onClick={handleCreate}><ICONS.save /> Saqlash va Biriktirish</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Topshiriq sarlavhasi"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Masalan: Yillik inventarizatsiyani yakunlash..."
            required
          />

          <TextArea
            label="Topshiriq tavsifi va ko'rsatmalar"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="Bajarilishi kerak bo'lgan ishlar, talablar va aniq ko'rsatmalar..."
          />

          {/* Qamrov tanlash: Barcha uchun yoki Ba'zilar uchun */}
          <div className="p-4 bg-gradient-to-br from-blue-50/80 to-indigo-50/50 dark:from-slate-800/90 dark:to-slate-900/90 rounded-2xl border border-blue-200/70 dark:border-slate-700/80 shadow-xs">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2.5">
              Topshiriq kimga yuborilsin?
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  targetScope === 'all'
                    ? 'border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-800 shadow-sm ring-2 ring-blue-500/20 text-blue-950 dark:text-blue-100'
                    : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/50 hover:border-blue-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="targetScope"
                  checked={targetScope === 'all'}
                  onChange={() => setTargetScope('all')}
                  className="mt-1 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <ICONS.globe className="text-blue-600 shrink-0" />
                    <span>Barcha uchun</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {isSuperAdmin
                      ? "Barcha xodimlarga yoki tanlangan toifadagi xodimlar guruhiga"
                      : "O'z hududingizdagi barcha xodimlarga bir vaqtda yuborish"}
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  targetScope === 'selected'
                    ? 'border-indigo-600 dark:border-indigo-500 bg-white dark:bg-slate-800 shadow-sm ring-2 ring-indigo-500/20 text-indigo-950 dark:text-indigo-100'
                    : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/50 hover:border-indigo-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="targetScope"
                  checked={targetScope === 'selected'}
                  onChange={() => setTargetScope('selected')}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <ICONS.bullseye className="text-indigo-600 shrink-0" />
                    <span>Ba'zilar uchun</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Xodimlar ro'yxatidan kerakli xodimlarni belgilab (bir yoki bir nechta) tanlash
                  </p>
                </div>
              </label>
            </div>

            {/* 1. Barcha uchun tanlanganda */}
            {targetScope === 'all' && (
              <div className="pt-3 border-t border-blue-200/70 dark:border-slate-700/70 space-y-3">
                {isSuperAdmin && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Qaysi toifa (rol) xodimlariga:
                      </label>
                      <select
                        value={targetRoleFilter}
                        onChange={e => setTargetRoleFilter(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200/90 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">Barcha xodimlar va adminlar ({eligibleAssignees.length} nafar)</option>
                        <option value={ROLES.VILOYAT_ADMIN}>Barcha Viloyat adminlari</option>
                        <option value={ROLES.TUMAN_ADMIN}>Barcha Tuman adminlari</option>
                        <option value={ROLES.XODIMLAR_BOSHLIGI}>Barcha Bo'lim boshliqlari</option>
                        <option value={ROLES.KUTUBXONA_XODIMI}>Barcha Kutubxona xodimlari</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Qaysi tuman/hududga:
                      </label>
                      <select
                        value={targetTumanFilter}
                        onChange={e => setTargetTumanFilter(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200/90 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">Barcha hududlar bo'yicha</option>
                        {(VILOYATLAR[0]?.tumanlar || []).map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-blue-100/70 dark:bg-blue-950/60 rounded-xl text-xs text-blue-900 dark:text-blue-200 border border-blue-200/60 dark:border-blue-900/50 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <ICONS.info className="text-blue-600 dark:text-blue-400" />
                    Topshiriq <strong>{allTargetUsers.length}</strong> nafar xodimga alohida topshiriq sifatida biriktiriladi.
                  </span>
                  <Badge color="blue">{allTargetUsers.length} nafar ijrochi</Badge>
                </div>
              </div>
            )}

            {/* 2. Ba'zilar uchun (Tanlanganlar) */}
            {targetScope === 'selected' && (
              <div className="pt-3 border-t border-indigo-200/70 dark:border-slate-700/70 space-y-2.5">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <ICONS.search className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-400 text-xs" />
                    <input
                      type="text"
                      placeholder="Xodimlarni ism, familiya yoki login bo'yicha qidirish..."
                      value={userFilterText}
                      onChange={e => setUserFilterText(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-2 rounded-xl border border-slate-200/90 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={handleSelectAllUsers}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 font-medium transition-colors"
                    >
                      Barchasini tanlash ({filteredAssignees.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllUsers}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      Tozalash
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium px-1">
                  <span>Kerakli xodimlarni belgilang:</span>
                  <span>Tanlanganlar: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{selectedUserIds.length}</strong> nafar</span>
                </div>

                <div className="max-h-56 overflow-y-auto p-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-700 space-y-1">
                  {filteredAssignees.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">
                      Qidiruv bo'yicha mos xodimlar topilmadi
                    </div>
                  ) : (
                    filteredAssignees.map(u => {
                      const isChecked = selectedUserIds.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer select-none transition-all ${
                            isChecked
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-700 shadow-xs'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleUser(u.id)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                            <div className={`w-7 h-7 rounded-full ${avatarClass(ROLE_COLORS[u.role])} flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}>
                              {u.fullName?.charAt(0) || 'U'}
                            </div>
                            <div className="min-w-0 truncate">
                              <span className="font-semibold text-slate-800 dark:text-slate-100">{u.fullName}</span>
                              <span className="text-slate-400 dark:text-slate-400 text-[11px] ml-1.5 font-mono">@{u.username}</span>
                              {(u.viloyatId || u.tumanId) && (
                                <span className="text-slate-500 dark:text-slate-400 text-[10px] ml-1.5 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                  {u.tumanId ? getTumanName(u.viloyatId, u.tumanId) : getViloyatName(u.viloyatId)}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge color={ROLE_COLORS[u.role]} className="shrink-0 text-[10px]">
                            {ROLE_LABELS[u.role] || u.role}
                          </Badge>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Muhimlik darajasi"
              value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value })}
              options={Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => ({ value: k, label: v }))}
            />
            <Input
              label="Bajarish muddati"
              type="date"
              value={form.dueDate}
              onChange={e => setForm({ ...form, dueDate: e.target.value })}
              required
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
