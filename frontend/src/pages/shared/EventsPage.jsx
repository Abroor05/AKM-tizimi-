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
import { STORAGE_KEYS, EVENT_TYPES, EVENT_TYPE_LABELS, ROLES } from '../../data/constants.js';
import { VILOYATLAR, getViloyatById, getTumanName } from '../../data/regions.js';
import { formatDate } from '../../utils/helpers.js';

export default function EventsPage() {
  const { currentUser, getCollection, createEntity, updateEntity, deleteEntity, createNotification, isRole, hasPermission } = useApp();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const isSuperAdmin = isRole(ROLES.SUPER_ADMIN);
  const isViloyatAdmin = isRole(ROLES.VILOYAT_ADMIN);
  const isTumanAdmin = isRole(ROLES.TUMAN_ADMIN);

  const defaultViloyatId = currentUser?.viloyatId || 'v01';
  const currentViloyat = useMemo(() => getViloyatById(defaultViloyatId) || VILOYATLAR[0], [defaultViloyatId]);
  const availableTumanlar = useMemo(() => currentViloyat?.tumanlar || [], [currentViloyat]);

  const [form, setForm] = useState({
    title: '',
    type: EVENT_TYPES.READING_HOUR,
    date: '',
    time: '',
    location: '',
    participants: 0,
    description: '',
    libraryId: '',
    viloyatId: defaultViloyatId,
    tumanId: currentUser?.tumanId || '',
    targetScope: isTumanAdmin ? 'own_tuman' : 'all_tumans',
    targetTumans: [],
  });

  const allEvents = useMemo(() => getCollection(STORAGE_KEYS.EVENTS), [getCollection]);
  const libraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES), [getCollection]);

  const scopedLibIds = useMemo(() => {
    if (isSuperAdmin) return libraries.map(l => l.id);
    if (isViloyatAdmin) return libraries.filter(l => l.viloyatId === currentUser.viloyatId).map(l => l.id);
    return libraries.filter(l => l.viloyatId === currentUser.viloyatId && l.tumanId === currentUser.tumanId).map(l => l.id);
  }, [libraries, currentUser, isSuperAdmin, isViloyatAdmin]);

  const events = useMemo(() => {
    return allEvents.filter(ev => {
      if (isSuperAdmin) return true;
      if (ev.organizer === currentUser?.id) return true;

      const sameViloyat = !ev.viloyatId || ev.viloyatId === currentUser?.viloyatId;

      // Viloyat Admini o'z viloyatidagi barcha tadbirlarni ko'radi
      if (isViloyatAdmin) {
        return sameViloyat || scopedLibIds.includes(ev.libraryId);
      }

      // Tuman Admini:
      if (isTumanAdmin) {
        if (!sameViloyat && !scopedLibIds.includes(ev.libraryId)) return false;
        // 1. Agar barcha tumanlarga yuborilgan bo'lsa
        if (ev.targetScope === 'all_tumans') return true;
        // 2. Agar tanlangan tumanlar ro'yxatida o'z tumani bo'lsa
        if (ev.targetScope === 'selected_tumans') {
          const list = Array.isArray(ev.targetTumans) ? ev.targetTumans : [];
          if (list.includes(currentUser?.tumanId)) return true;
        }
        // 3. O'z tumanida tashkil etilgan yoki o'z kutubxonasiga tegishli
        if (ev.tumanId === currentUser?.tumanId) return true;
        if (scopedLibIds.includes(ev.libraryId)) return true;
        return false;
      }

      // Boshqa xodimlar (kutubxona_xodimi, xodimlar_boshligi):
      if (sameViloyat) {
        if (ev.targetScope === 'all_tumans') return true;
        if (ev.targetScope === 'selected_tumans') {
          const list = Array.isArray(ev.targetTumans) ? ev.targetTumans : [];
          if (list.includes(currentUser?.tumanId)) return true;
        }
        if (ev.tumanId === currentUser?.tumanId) return true;
      }
      return scopedLibIds.includes(ev.libraryId);
    });
  }, [allEvents, currentUser, isSuperAdmin, isViloyatAdmin, isTumanAdmin, scopedLibIds]);

  const filtered = useMemo(() => {
    return events.filter(e => {
      const matchSearch = !search || e.title?.toLowerCase().includes(search.toLowerCase()) || e.location?.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [events, search]);

  const canManage = hasPermission('manage_events') || isSuperAdmin || isViloyatAdmin || isTumanAdmin;

  const handleToggleTuman = (tumanId) => {
    setForm(prev => {
      const current = Array.isArray(prev.targetTumans) ? prev.targetTumans : [];
      const updated = current.includes(tumanId)
        ? current.filter(id => id !== tumanId)
        : [...current, tumanId];
      return { ...prev, targetTumans: updated };
    });
  };

  const handleSelectAllTumans = () => {
    setForm(prev => ({
      ...prev,
      targetTumans: availableTumanlar.map(t => t.id),
    }));
  };

  const handleClearAllTumans = () => {
    setForm(prev => ({
      ...prev,
      targetTumans: [],
    }));
  };

  const handleSave = async () => {
    if (!form.title?.trim() || !form.type || !form.date) {
      toast.warning("Iltimos, tadbir nomi, turi va sanasini to'ldiring!");
      return;
    }

    if (form.targetScope === 'selected_tumans' && (!form.targetTumans || form.targetTumans.length === 0)) {
      toast.warning("Iltimos, tadbir yuboriladigan kamida bitta tumanni tanlang!");
      return;
    }

    const saveForm = {
      ...form,
      viloyatId: form.viloyatId || currentUser?.viloyatId || defaultViloyatId,
      tumanId: form.tumanId || currentUser?.tumanId || null,
      libraryId: form.libraryId || scopedLibIds[0] || currentUser?.libraryId || null,
      organizer: currentUser?.id,
      status: new Date(form.date) > new Date() ? 'upcoming' : 'completed',
    };

    if (editItem) {
      updateEntity(STORAGE_KEYS.EVENTS, editItem.id, saveForm);
      toast.success("Tadbir muvaffaqiyatli yangilandi!");
    } else {
      createEntity(STORAGE_KEYS.EVENTS, saveForm);
      toast.success("Yangi tadbir muvaffaqiyatli yaratildi va yuborildi!");

      // Bildirishnoma yuborish
      try {
        const scopeText = form.targetScope === 'all_tumans'
          ? "barcha tumanlar"
          : form.targetScope === 'selected_tumans'
          ? `${form.targetTumans.length} ta tuman`
          : "o'z tumani";

        await createNotification({
          type: 'event',
          title: `Yangi tadbir: ${form.title}`,
          message: `${currentUser?.fullName || 'Admin'} tomonidan yangi tadbir e'lon qilindi (${scopeText}): "${form.title}" - Sana: ${formatDate(form.date)} ${form.time || ''}`,
          targetRole: 'tuman_admin,xodimlar_boshligi,kutubxona_xodimi',
        });
      } catch (e) {
        console.error('Notification send error:', e);
      }
    }

    setShowModal(false);
    setEditItem(null);
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({
      title: '',
      type: EVENT_TYPES.READING_HOUR,
      date: '',
      time: '',
      location: '',
      participants: 0,
      description: '',
      libraryId: scopedLibIds[0] || currentUser?.libraryId || '',
      viloyatId: defaultViloyatId,
      tumanId: currentUser?.tumanId || '',
      targetScope: isTumanAdmin ? 'own_tuman' : 'all_tumans',
      targetTumans: [],
    });
    setShowModal(true);
  };

  const openEdit = (ev) => {
    setEditItem(ev);
    setForm({
      title: ev.title || '',
      type: ev.type || EVENT_TYPES.READING_HOUR,
      date: ev.date || '',
      time: ev.time || '',
      location: ev.location || '',
      participants: ev.participants || 0,
      description: ev.description || '',
      libraryId: ev.libraryId || scopedLibIds[0] || '',
      viloyatId: ev.viloyatId || defaultViloyatId,
      tumanId: ev.tumanId || currentUser?.tumanId || '',
      targetScope: ev.targetScope || (isTumanAdmin ? 'own_tuman' : 'all_tumans'),
      targetTumans: Array.isArray(ev.targetTumans) ? ev.targetTumans : [],
    });
    setShowModal(true);
  };

  return (
    <div>
      <PageHeader
        title="Tadbirlar"
        subtitle="Kutubxona tadbirlari, hududiy e'lonlar va tadbirlar taqvimi"
        icon={ICONS.events}
        action={canManage ? <Button onClick={openCreate}><ICONS.plus /> Yangi tadbir</Button> : null}
      />

      {/* Filter and stats */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <ICONS.search className="absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-400" />
          <input
            type="text"
            placeholder="Tadbir nomi yoki joyi bo'yicha qidirish..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 shadow-xs"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ICONS.events} title="Tadbirlar topilmadi" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(ev => {
            const isAllTumans = ev.targetScope === 'all_tumans';
            const isSelectedTumans = ev.targetScope === 'selected_tumans';
            const selectedCount = Array.isArray(ev.targetTumans) ? ev.targetTumans.length : 0;

            return (
              <Card key={ev.id}>
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
                    <ICONS.events className="text-xl" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge color={ev.status === 'completed' ? 'green' : 'amber'}>
                      {ev.status === 'completed' ? "O'tkazilgan" : "Yaqinlashmoqda"}
                    </Badge>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(ev)}
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors"
                          title="Tahrirlash"
                        >
                          <ICONS.edit className="text-sm" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`"${ev.title}" tadbiri o'chirilsinmi?`)) {
                              deleteEntity(STORAGE_KEYS.EVENTS, ev.id);
                              toast.success("Tadbir muvaffaqiyatli o'chirildi!");
                            }
                          }}
                          className="p-1.5 rounded hover:bg-red-50 text-red-600 transition-colors"
                          title="O'chirish"
                        >
                          <ICONS.trash className="text-sm" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="font-semibold text-gray-800 text-base">{ev.title}</h3>

                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <Badge color="blue">{EVENT_TYPE_LABELS[ev.type] || ev.type}</Badge>
                  {isAllTumans && (
                    <Badge color="purple">
                      <span className="flex items-center gap-1"><ICONS.globe className="text-xs" /> Barcha tumanlarga</span>
                    </Badge>
                  )}
                  {isSelectedTumans && (
                    <Badge color="indigo">
                      <span className="flex items-center gap-1"><ICONS.bullseye className="text-xs" /> {selectedCount} ta tumanga</span>
                    </Badge>
                  )}
                  {ev.targetScope === 'own_tuman' && (
                    <Badge color="teal">
                      <span className="flex items-center gap-1"><ICONS.library className="text-xs" /> {getTumanName(ev.viloyatId, ev.tumanId) || "O'z tumani"}</span>
                    </Badge>
                  )}
                </div>

                {ev.description && (
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">{ev.description}</p>
                )}

                <div className="mt-3 pt-3 border-t border-gray-50 space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <ICONS.calendar className="text-xs text-gray-400" />
                    <span>{formatDate(ev.date)} {ev.time ? `• ${ev.time}` : ''}</span>
                  </div>
                  {ev.location && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <ICONS.location className="text-xs text-gray-400" />
                      <span className="truncate">{ev.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <ICONS.users className="text-xs text-gray-400" />
                    <span>{ev.participants || 0} ishtirokchi</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal create / edit */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? "Tadbirni tahrirlash" : "Yangi tadbir yaratish va yuborish"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Bekor</Button>
            <Button onClick={handleSave}><ICONS.save /> Saqlash va Yuborish</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Tadbir sarlavhasi"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Masalan: Kitobxonlik haftaligi..."
            required
            className="sm:col-span-2"
          />

          <Select
            label="Tadbir turi"
            value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value })}
            options={Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
            required
          />

          <Input
            label="Ishtirokchilar soni"
            type="number"
            value={form.participants}
            onChange={e => {
              const raw = e.target.value;
              setForm({ ...form, participants: raw === '' ? '' : Number.isFinite(Number(raw)) ? Number(raw) : 0 });
            }}
          />

          <Input
            label="O'tkazilish sanasi"
            type="date"
            value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })}
            required
          />

          <Input
            label="Vaqt"
            type="time"
            value={form.time}
            onChange={e => setForm({ ...form, time: e.target.value })}
          />

          <Input
            label="O'tkazilish joyi"
            value={form.location}
            onChange={e => setForm({ ...form, location: e.target.value })}
            placeholder="Kutubxona zali, Madaniyat saroyi..."
            className="sm:col-span-2"
          />

          {/* Qamrov va Yuborish nishoni */}
          <div className="sm:col-span-2 p-4 bg-blue-50/70 dark:bg-slate-800/80 rounded-2xl border border-blue-100 dark:border-slate-700">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2.5">
              Tadbirni yuborish va qamrovi:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {isTumanAdmin && (
                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-medium transition-all ${form.targetScope === 'own_tuman' ? 'border-blue-500 bg-white dark:bg-slate-800 shadow-xs text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'}`}>
                  <input
                    type="radio"
                    name="targetScope"
                    checked={form.targetScope === 'own_tuman'}
                    onChange={() => setForm({ ...form, targetScope: 'own_tuman' })}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex items-center gap-1.5"><ICONS.library className="text-xs text-blue-600" /> Faqat o'z tumanimga</span>
                </label>
              )}

              <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-medium transition-all ${form.targetScope === 'all_tumans' ? 'border-blue-500 bg-white dark:bg-slate-800 shadow-xs text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'}`}>
                <input
                  type="radio"
                  name="targetScope"
                  checked={form.targetScope === 'all_tumans'}
                  onChange={() => setForm({ ...form, targetScope: 'all_tumans' })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="flex items-center gap-1.5"><ICONS.globe className="text-xs text-purple-600" /> Barcha tumanlarga yuborish</span>
              </label>

              <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-medium transition-all ${form.targetScope === 'selected_tumans' ? 'border-blue-500 bg-white dark:bg-slate-800 shadow-xs text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'}`}>
                <input
                  type="radio"
                  name="targetScope"
                  checked={form.targetScope === 'selected_tumans'}
                  onChange={() => setForm({ ...form, targetScope: 'selected_tumans' })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="flex items-center gap-1.5"><ICONS.bullseye className="text-xs text-indigo-600" /> Tanlangan tumanlarga yuborish</span>
              </label>
            </div>

            {/* Tanlangan tumanlar ro'yxati (checkboxes) */}
            {form.targetScope === 'selected_tumans' && (
              <div className="mt-3 pt-3 border-t border-blue-200/60 dark:border-slate-700/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Tumanlarni tanlang ({form.targetTumans?.length || 0} ta tanlandi):
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllTumans}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      Barchasini tanlash
                    </button>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={handleClearAllTumans}
                      className="text-xs text-slate-500 dark:text-slate-400 hover:underline"
                    >
                      Tozalash
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-700">
                  {availableTumanlar.map(t => {
                    const isChecked = Array.isArray(form.targetTumans) && form.targetTumans.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors ${isChecked ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleTuman(t.id)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="truncate">{t.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <Select
            label="Kutubxona / Bo'lim"
            value={form.libraryId}
            onChange={e => setForm({ ...form, libraryId: e.target.value })}
            options={libraries.filter(l => scopedLibIds.includes(l.id)).map(l => ({ value: l.id, label: l.name }))}
            className="sm:col-span-2"
          />

          <TextArea
            label="Qo'shimcha tavsif"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={2}
            placeholder="Tadbir maqsadi, qatnashuvchilar toifalari..."
            className="sm:col-span-2"
          />
        </div>
      </Modal>
    </div>
  );
}
