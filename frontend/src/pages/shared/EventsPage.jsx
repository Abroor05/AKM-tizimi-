import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
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

function parseEventLinks(ev) {
  if (!ev?.links) return [];
  if (Array.isArray(ev.links)) return ev.links;
  try {
    const parsed = JSON.parse(ev.links);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeUrl(url) {
  const s = (url || '').trim();
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

export default function EventsPage() {
  const { currentUser, getCollection, createEntity, updateEntity, deleteEntity, createNotification, isRole, hasPermission } = useApp();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [linksCountInput, setLinksCountInput] = useState('0');

  const isSuperAdmin = isRole(ROLES.SUPER_ADMIN);
  const isViloyatAdmin = isRole(ROLES.VILOYAT_ADMIN);
  const isTumanAdmin = isRole(ROLES.TUMAN_ADMIN);
  const isDistrictUser = isRole(ROLES.TUMAN_ADMIN, ROLES.XODIMLAR_BOSHLIGI, ROLES.KUTUBXONA_XODIMI);

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
    targetScope: isDistrictUser ? 'self' : 'all_tumans',
    targetTumans: [],
    links: [],
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

      // Viloyat Admini o'z viloyatidagi barcha tadbirlarni ko'radi (boshqa rolning 'self' i bo'lmasa)
      if (isViloyatAdmin) {
        if (ev.targetScope === 'self') return Boolean(ev.viloyatId === currentUser?.viloyatId);
        return sameViloyat || scopedLibIds.includes(ev.libraryId);
      }

      // Tuman Admini va tuman darajasidagi xodimlar:
      if (ev.targetScope === 'self' || ev.targetScope === 'own_tuman') {
        return Boolean(sameViloyat && (ev.tumanId === currentUser?.tumanId || scopedLibIds.includes(ev.libraryId)));
      }

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

  const handleLinksCountChange = (rawCount) => {
    const cleaned = String(rawCount ?? '').replace(/\D/g, '');
    if (cleaned === '') {
      setLinksCountInput('');
      setForm(prev => ({ ...prev, links: [] }));
      return;
    }
    const parsed = Math.max(0, Math.min(20, parseInt(cleaned, 10) || 0));
    setLinksCountInput(String(parsed));
    setForm(prev => {
      const current = Array.isArray(prev.links) ? [...prev.links] : [];
      if (parsed > current.length) {
        while (current.length < parsed) current.push({ title: '', url: '' });
      } else if (parsed < current.length) {
        current.length = parsed;
      }
      return { ...prev, links: current };
    });
  };

  const handleLinkItemChange = (index, field, value) => {
    setForm(prev => {
      const updated = [...(prev.links || [])];
      updated[index] = { ...(updated[index] || { title: '', url: '' }), [field]: value };
      return { ...prev, links: updated };
    });
  };

  const handleRemoveLinkItem = (index) => {
    setForm(prev => {
      const nextLinks = (prev.links || []).filter((_, i) => i !== index);
      setLinksCountInput(String(nextLinks.length));
      return { ...prev, links: nextLinks };
    });
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

    const cleanedLinks = (form.links || [])
      .map(l => ({ title: (l.title || '').trim(), url: (l.url || '').trim() }))
      .filter(l => l.title || l.url);

    const hasIncompleteLink = cleanedLinks.some(l => !l.url);
    if (hasIncompleteLink) {
      toast.warning("Har bir qo'shilgan havola uchun link (URL) manzilini kiriting!");
      return;
    }

    const isSelfAdmin = form.targetScope === 'self' && (isSuperAdmin || isViloyatAdmin);

    const saveForm = {
      ...form,
      participants: Math.max(0, parseInt(form.participants, 10) || 0),
      links: cleanedLinks,
      viloyatId: form.targetScope === 'self' && isSuperAdmin ? null : (form.viloyatId || currentUser?.viloyatId || defaultViloyatId),
      tumanId: isSelfAdmin ? null : (form.tumanId || currentUser?.tumanId || null),
      libraryId: isSelfAdmin ? null : (form.libraryId || scopedLibIds[0] || currentUser?.libraryId || null),
      organizer: currentUser?.id,
      status: new Date(form.date) > new Date() ? 'upcoming' : 'completed',
    };

    if (editItem) {
      await updateEntity(STORAGE_KEYS.EVENTS, editItem.id, saveForm);
      if (detailItem?.id === editItem.id) {
        setDetailItem(prev => ({ ...prev, ...saveForm }));
      }
      toast.success("Tadbir muvaffaqiyatli yangilandi!");
    } else {
      await createEntity(STORAGE_KEYS.EVENTS, saveForm);
      toast.success(
        form.targetScope === 'self'
          ? "Tadbir o'zingiz uchun muvaffaqiyatli saqlandi!"
          : "Yangi tadbir muvaffaqiyatli yaratildi va yuborildi!"
      );

      // Bildirishnoma yuborish (faqat boshqa tumanlarga yuborilganda)
      if (form.targetScope !== 'self' && form.targetScope !== 'own_tuman') {
        try {
          const scopeText = form.targetScope === 'all_tumans'
            ? "barcha tumanlar"
            : `${form.targetTumans.length} ta tuman`;

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
    }

    setShowModal(false);
    setEditItem(null);
  };

  const openCreate = () => {
    setEditItem(null);
    setLinksCountInput('0');
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
      targetScope: isDistrictUser ? 'self' : 'all_tumans',
      targetTumans: [],
      links: [],
    });
    setShowModal(true);
  };

  const openEdit = (ev) => {
    setEditItem(ev);
    const existingLinks = parseEventLinks(ev).map(l => ({ title: l.title || '', url: l.url || '' }));
    setLinksCountInput(String(existingLinks.length));
    setForm({
      title: ev.title || '',
      type: ev.type || EVENT_TYPES.READING_HOUR,
      date: ev.date || '',
      time: ev.time || '',
      location: ev.location || '',
      participants: Math.max(0, parseInt(ev.participants, 10) || 0),
      description: ev.description || '',
      libraryId: ev.libraryId || scopedLibIds[0] || '',
      viloyatId: ev.viloyatId || defaultViloyatId,
      tumanId: ev.tumanId || currentUser?.tumanId || '',
      targetScope: ev.targetScope || (isDistrictUser ? 'self' : 'all_tumans'),
      targetTumans: Array.isArray(ev.targetTumans) ? ev.targetTumans : [],
      links: existingLinks,
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
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Tadbirlarni qidirish..."
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ICONS.events} title="Tadbirlar topilmadi" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(ev => {
            const isAllTumans = ev.targetScope === 'all_tumans';
            const isSelectedTumans = ev.targetScope === 'selected_tumans';
            const isSelfScope = ev.targetScope === 'self' || ev.targetScope === 'own_tuman';
            const selectedCount = Array.isArray(ev.targetTumans) ? ev.targetTumans.length : 0;
            const evLinks = parseEventLinks(ev);

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
                    <button
                      onClick={() => setDetailItem(ev)}
                      className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600 transition-colors"
                      title="To'liq ko'rish"
                    >
                      <ICONS.eye className="text-sm" />
                    </button>
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

                <h3
                  onClick={() => setDetailItem(ev)}
                  title={ev.title}
                  className="font-semibold text-gray-800 dark:text-slate-100 text-base line-clamp-2 break-words cursor-pointer hover:text-blue-600 transition-colors"
                >
                  {ev.title}
                </h3>

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
                  {isSelfScope && (
                    <Badge color="teal">
                      <span className="flex items-center gap-1">
                        <ICONS.user className="text-[10px]" />
                        {ev.targetScope === 'self' ? "O'zimiz uchun" : (getTumanName(ev.viloyatId, ev.tumanId) || "O'zimiz uchun")}
                      </span>
                    </Badge>
                  )}
                  {evLinks.length > 0 && (
                    <Badge color="green">
                      <span className="flex items-center gap-1"><ICONS.externalLink className="text-[10px]" /> {evLinks.length} ta havola</span>
                    </Badge>
                  )}
                </div>

                {ev.description && (
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2 break-words">{ev.description}</p>
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
                  <div className="flex items-center justify-between gap-2 text-gray-600">
                    <span className="flex items-center gap-2">
                      <ICONS.users className="text-xs text-gray-400" />
                      <span>{ev.participants || 0} ishtirokchi</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setDetailItem(ev)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1"
                    >
                      <ICONS.eye className="text-[11px]" /> Ko'rish
                    </button>
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
            min="0"
            step="1"
            placeholder="0"
            value={form.participants}
            onFocus={() => {
              if (form.participants === 0 || form.participants === '0') {
                setForm(prev => ({ ...prev, participants: '' }));
              }
            }}
            onBlur={() => {
              if (form.participants === '' || form.participants === null || form.participants === undefined) {
                setForm(prev => ({ ...prev, participants: 0 }));
              }
            }}
            onChange={e => {
              const cleaned = e.target.value.replace(/\D/g, '');
              setForm(prev => ({
                ...prev,
                participants: cleaned === '' ? '' : Math.max(0, parseInt(cleaned, 10) || 0),
              }));
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
              <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-medium transition-all ${(form.targetScope === 'self' || form.targetScope === 'own_tuman') ? 'border-blue-500 bg-white dark:bg-slate-800 shadow-xs text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'}`}>
                <input
                  type="radio"
                  name="targetScope"
                  checked={form.targetScope === 'self' || form.targetScope === 'own_tuman'}
                  onChange={() => setForm({ ...form, targetScope: 'self' })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="flex items-center gap-1.5"><ICONS.user className="text-xs text-teal-600" /> O'zimiz uchun</span>
              </label>

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

          {/* Havolalar soniga qarab alohida Sarlavha va Link inputlari */}
          <div className="sm:col-span-2 p-4 bg-slate-50/90 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <ICONS.externalLink className="text-xs text-indigo-600" />
                  Tadbir havolalari (Linklar)
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Nechta link qo'ymoqchi bo'lsangiz sonini kiriting — har biri uchun alohida sarlavha va link maydoni chiqadi
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Havolalar soni:</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="1"
                  placeholder="0"
                  value={linksCountInput}
                  onFocus={() => {
                    if (linksCountInput === '0') setLinksCountInput('');
                  }}
                  onBlur={() => {
                    if (linksCountInput === '') {
                      setLinksCountInput(String(form.links?.length || 0));
                    }
                  }}
                  onChange={(e) => handleLinksCountChange(e.target.value)}
                  className="w-20 px-2.5 py-1.5 text-center text-sm font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>

            {Array.isArray(form.links) && form.links.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-700 max-h-60 overflow-y-auto pr-1">
                {form.links.map((linkItem, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
                  >
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        {idx + 1}-havola sarlavhasi
                      </label>
                      <input
                        type="text"
                        value={linkItem.title}
                        onChange={(e) => handleLinkItemChange(idx, 'title', e.target.value)}
                        placeholder="Masalan: Telegram post, Sayt xabari..."
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </div>
                    <div className="sm:col-span-6">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        {idx + 1}-havola linki (URL)
                      </label>
                      <input
                        type="url"
                        value={linkItem.url}
                        onChange={(e) => handleLinkItemChange(idx, 'url', e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveLinkItem(idx)}
                        className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Ushbu havolani olib tashlash"
                      >
                        <ICONS.trash className="text-xs" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Ko'rish (Tafsilotlar) Modali — uzun sarlavha, tavsif va barcha linklar to'liq ko'rinadi */}
      {detailItem && (() => {
        const detailLinks = parseEventLinks(detailItem);
        const detailLib = libraries.find(l => l.id === detailItem.libraryId);
        const isAllTumans = detailItem.targetScope === 'all_tumans';
        const isSelectedTumans = detailItem.targetScope === 'selected_tumans';
        const isSelfScope = detailItem.targetScope === 'self' || detailItem.targetScope === 'own_tuman';
        const selectedTumanNames = isSelectedTumans && Array.isArray(detailItem.targetTumans)
          ? detailItem.targetTumans.map(tid => getTumanName(detailItem.viloyatId || defaultViloyatId, tid) || tid)
          : [];

        return (
          <Modal
            isOpen={Boolean(detailItem)}
            onClose={() => setDetailItem(null)}
            title="Tadbir tafsilotlari"
            size="lg"
            footer={
              <div className="flex items-center justify-between w-full gap-2">
                {canManage ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const target = detailItem;
                      setDetailItem(null);
                      openEdit(target);
                    }}
                    className="text-blue-700 border-blue-200 hover:bg-blue-50"
                  >
                    <ICONS.edit className="text-xs" /> Tahrirlash
                  </Button>
                ) : <div />}
                <Button variant="secondary" onClick={() => setDetailItem(null)}>
                  Yopish
                </Button>
              </div>
            }
          >
            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge color={detailItem.status === 'completed' ? 'green' : 'amber'}>
                    {detailItem.status === 'completed' ? "O'tkazilgan" : "Yaqinlashmoqda"}
                  </Badge>
                  <Badge color="blue">{EVENT_TYPE_LABELS[detailItem.type] || detailItem.type}</Badge>
                  {isAllTumans && <Badge color="purple">Barcha tumanlarga</Badge>}
                  {isSelectedTumans && <Badge color="indigo">{selectedTumanNames.length} ta tumanga</Badge>}
                  {isSelfScope && <Badge color="teal">O'zimiz uchun</Badge>}
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 break-words leading-snug">
                  {detailItem.title}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-1.5">
                  <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <ICONS.calendar className="text-slate-400" />
                    <span><strong>Sana va vaqt:</strong> {formatDate(detailItem.date)} {detailItem.time ? `• ${detailItem.time}` : ''}</span>
                  </p>
                  <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <ICONS.location className="text-slate-400" />
                    <span><strong>Joyi:</strong> {detailItem.location || 'Belgilanmagan'}</span>
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-1.5">
                  <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <ICONS.users className="text-slate-400" />
                    <span><strong>Ishtirokchilar:</strong> {detailItem.participants || 0} nafar</span>
                  </p>
                  {detailLib && (
                    <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <ICONS.library className="text-slate-400" />
                      <span><strong>Kutubxona:</strong> {detailLib.name}</span>
                    </p>
                  )}
                </div>
              </div>

              {selectedTumanNames.length > 0 && (
                <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/50 text-xs">
                  <p className="font-bold text-indigo-900 mb-1.5">Yuborilgan tumanlar:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTumanNames.map((name, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-800 font-medium">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {detailItem.description && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                  <span className="font-bold text-slate-900 dark:text-white block mb-1">Qo'shimcha tavsif:</span>
                  {detailItem.description}
                </div>
              )}

              {detailLinks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Tadbir havolalari ({detailLinks.length} ta):
                  </h4>
                  <div className="space-y-2">
                    {detailLinks.map((l, idx) => {
                      const href = normalizeUrl(l.url);
                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 break-words">
                              {idx + 1}. {l.title || 'Havola'}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono truncate">{l.url}</p>
                          </div>
                          {href && (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold shrink-0"
                            >
                              <ICONS.externalLink className="text-[11px]" /> Ochish
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
