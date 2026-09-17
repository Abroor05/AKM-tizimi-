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
import ICONS from '../../components/icons.jsx';
import { TASK_PRIORITY, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS, TASK_STATUS, TASK_STATUS_LABELS, TASK_STATUS_COLORS, ROLE_LABELS, ROLES, STORAGE_KEYS } from '../../data/constants.js';
import { formatDate, isOverdue, daysUntil } from '../../utils/helpers.js';

export default function TasksPage() {
  const { currentUser, getTasks, createTask, updateTaskStatus, getUsers, getCollection, isRole, hasPermission } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', assignedTo: '', priority: TASK_PRIORITY.MEDIUM, dueDate: '', libraryId: '' });

  const allTasks = useMemo(() => getTasks(), [getTasks]);
  const users = useMemo(() => getUsers(), [getUsers]);
  const libraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES), [getCollection]);

  // Scope tasks
  const tasks = useMemo(() => {
    if (isRole(ROLES.SUPER_ADMIN)) return allTasks;
    if (isRole(ROLES.KUTUBXONA_XODIMI)) return allTasks.filter(t => t.assignedTo === currentUser.id);
    if (isRole(ROLES.TUMAN_ADMIN)) return allTasks.filter(t => t.assignedBy === currentUser.id || t.assignedTo === currentUser.id);
    return allTasks.filter(t => t.assignedTo === currentUser.id || t.assignedBy === currentUser.id);
  }, [allTasks, currentUser, isRole]);

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || t.status === statusFilter;
      return matchSearch && matchStatus;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [tasks, search, statusFilter]);

  const canCreate = hasPermission('create_task');
  const canComplete = hasPermission('complete_task');

  const handleCreate = () => {
    if (!form.title || !form.assignedTo || !form.dueDate) return;
    createTask(form);
    setShowModal(false);
    setForm({ title: '', description: '', assignedTo: '', priority: TASK_PRIORITY.MEDIUM, dueDate: '', libraryId: '' });
  };

  const handleStatusChange = (id, status) => {
    updateTaskStatus(id, status);
  };

  return (
    <div>
      <PageHeader title="Topshiriqlar" subtitle="Vazifalar va topshiriqlarni boshqarish" icon={ICONS.tasks}
        action={canCreate ? <Button onClick={() => setShowModal(true)}><ICONS.plus /> Yangi topshiriq</Button> : null} />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <Card className="text-center"><p className="text-2xl font-bold text-gray-600">{tasks.filter(t => t.status === TASK_STATUS.PENDING).length}</p><p className="text-xs text-gray-500">Kutilmoqda</p></Card>
        <Card className="text-center"><p className="text-2xl font-bold text-blue-600">{tasks.filter(t => t.status === TASK_STATUS.IN_PROGRESS).length}</p><p className="text-xs text-gray-500">Bajarilmoqda</p></Card>
        <Card className="text-center"><p className="text-2xl font-bold text-green-600">{tasks.filter(t => t.status === TASK_STATUS.COMPLETED).length}</p><p className="text-xs text-gray-500">Bajarilgan</p></Card>
        <Card className="text-center"><p className="text-2xl font-bold text-red-600">{tasks.filter(t => t.status === TASK_STATUS.OVERDUE || (t.status !== TASK_STATUS.COMPLETED && isOverdue(t.dueDate))).length}</p><p className="text-xs text-gray-500">Muddati o'tgan</p></Card>
        <Card className="text-center"><p className="text-2xl font-bold text-amber-600">{tasks.filter(t => t.priority === TASK_PRIORITY.URGENT && t.status !== TASK_STATUS.COMPLETED).length}</p><p className="text-xs text-gray-500">Shoshilinch</p></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <ICONS.search className="absolute left-3 top-3 text-gray-400" />
          <input type="text" placeholder="Qidirish..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white">
          <option value="">Barcha holatlar</option>
          {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
                      <h3 className="font-semibold text-gray-800">{t.title}</h3>
                      <Badge color={TASK_PRIORITY_COLORS[t.priority]}>{TASK_PRIORITY_LABELS[t.priority]}</Badge>
                      <Badge color={TASK_STATUS_COLORS[t.status]}>{TASK_STATUS_LABELS[t.status]}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">{t.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><ICONS.user className="text-[10px]" /> {assignee?.fullName || 'Noma\'lum'}</span>
                      <span className="flex items-center gap-1"><ICONS.calendar className="text-[10px]" /> Muddat: {formatDate(t.dueDate)}</span>
                      {days !== null && days >= 0 && t.status !== TASK_STATUS.COMPLETED && <span className="text-amber-600">{days} kun qoldi</span>}
                      {overdue && <span className="text-red-600 font-medium">Muddati o'tgan!</span>}
                    </div>
                  </div>
                  {canComplete && t.assignedTo === currentUser.id && t.status !== TASK_STATUS.COMPLETED && (
                    <div className="flex gap-2">
                      {t.status === TASK_STATUS.PENDING && (
                        <Button size="sm" variant="primary" onClick={() => handleStatusChange(t.id, TASK_STATUS.IN_PROGRESS)}>Boshlash</Button>
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Yangi topshiriq yaratish" size="md"
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Bekor</Button><Button onClick={handleCreate}><ICONS.save /> Saqlash</Button></>}>
        <div className="space-y-4">
          <Input label="Sarlavha" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          <TextArea label="Tavsif" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
          <Select label="Kim uchun" value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })}
            options={users.filter(u => u.active !== false).map(u => ({ value: u.id, label: `${u.fullName} (${ROLE_LABELS[u.role]})` }))} required />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Muhimlik darajasi" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
              options={Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
            <Input label="Muddat" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} required />
          </div>
        </div>
      </Modal>
    </div>
  );
}
