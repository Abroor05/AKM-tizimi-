import { useState, useEffect } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { toast } from '../ui/Toast.jsx';
import ICONS from '../icons.jsx';
import { STORAGE_KEYS, SOCIAL_PLATFORMS, ROLES } from '../../data/constants.js';
import { useApp } from '../../context/AppContext.jsx';

function buildInitialSocialForm() {
  const platformsData = {};
  SOCIAL_PLATFORMS.forEach(p => {
    platformsData[p.key] = {
      active: false,
      count: '0',
      items: [],
    };
  });

  return {
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    description: '',
    platforms: platformsData,
  };
}

export default function SocialMediaReportModal({
  isOpen,
  onClose,
  currentUser,
  libraries,
  createEntity: createEntityProp,
  updateEntity: updateEntityProp,
  editItem = null,
  onSuccess,
}) {
  const appCtx = useApp();
  const createEntity = createEntityProp || appCtx.createEntity;
  const updateEntity = updateEntityProp || appCtx.updateEntity;

  const [form, setForm] = useState(buildInitialSocialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editItem) {
      let parsed = {};
      try {
        parsed = typeof editItem.data === 'object' && editItem.data
          ? editItem.data
          : JSON.parse(editItem.data || '{}');
      } catch {
        parsed = {};
      }
      const existingPlatforms = parsed.platforms || {};
      const platformsData = {};
      SOCIAL_PLATFORMS.forEach(p => {
        const ep = existingPlatforms[p.key];
        const existingItems = Array.isArray(ep?.items)
          ? ep.items.map(it => ({ title: it.title || '', url: it.url || '' }))
          : [];
        const active = Boolean(ep && (Number(ep.count) > 0 || ep.posts || ep.link || existingItems.length > 0));
        let items = existingItems;
        let countNum = 0;

        if (active) {
          if (existingItems.length > 0) {
            countNum = Math.max(Number(ep?.count) || 0, existingItems.length);
            if (countNum > existingItems.length && countNum <= 20) {
              items = [
                ...existingItems,
                ...Array.from({ length: countNum - existingItems.length }, () => ({ title: '', url: '' })),
              ];
            }
          } else {
            countNum = Math.max(1, Math.min(20, Number(ep?.count) || 1));
            items = Array.from({ length: countNum }, (_, idx) =>
              idx === 0 ? { title: ep?.posts || '', url: ep?.link || '' } : { title: '', url: '' }
            );
          }
        }

        platformsData[p.key] = {
          active,
          count: String(countNum),
          items,
        };
      });
      setForm({
        date: editItem.date || new Date().toISOString().split('T')[0],
        time: editItem.time || new Date().toTimeString().slice(0, 5),
        description: parsed.generalNote || '',
        platforms: platformsData,
      });
    } else {
      setForm(buildInitialSocialForm());
    }
  }, [isOpen, editItem]);

  const handlePlatformToggle = (key, active) => {
    setForm(prev => ({
      ...prev,
      platforms: {
        ...prev.platforms,
        [key]: {
          ...prev.platforms[key],
          active,
          count: active ? (prev.platforms[key].count || '0') : '0',
          items: active ? (prev.platforms[key].items || []) : [],
        },
      },
    }));
  };

  const handlePlatformChange = (key, field, value) => {
    setForm(prev => ({
      ...prev,
      platforms: {
        ...prev.platforms,
        [key]: {
          ...prev.platforms[key],
          [field]: value,
        },
      },
    }));
  };

  const handlePlatformCountChange = (key, rawValue) => {
    const cleaned = String(rawValue ?? '').replace(/\D/g, '');
    if (cleaned === '') {
      setForm(prev => ({
        ...prev,
        platforms: {
          ...prev.platforms,
          [key]: {
            ...prev.platforms[key],
            active: true,
            count: '',
            items: [],
          },
        },
      }));
      return;
    }

    const parsed = Math.max(0, Math.min(20, parseInt(cleaned, 10) || 0));
    setForm(prev => {
      const currentItems = Array.isArray(prev.platforms[key]?.items)
        ? [...prev.platforms[key].items]
        : [];
      if (parsed > currentItems.length) {
        while (currentItems.length < parsed) currentItems.push({ title: '', url: '' });
      } else if (parsed < currentItems.length) {
        currentItems.length = parsed;
      }
      return {
        ...prev,
        platforms: {
          ...prev.platforms,
          [key]: {
            ...prev.platforms[key],
            active: true,
            count: String(parsed),
            items: currentItems,
          },
        },
      };
    });
  };

  const handlePlatformItemChange = (key, index, field, value) => {
    setForm(prev => {
      const currentItems = [...(prev.platforms[key]?.items || [])];
      currentItems[index] = {
        ...(currentItems[index] || { title: '', url: '' }),
        [field]: value,
      };
      return {
        ...prev,
        platforms: {
          ...prev.platforms,
          [key]: {
            ...prev.platforms[key],
            items: currentItems,
          },
        },
      };
    });
  };

  const handleRemovePlatformItem = (key, index) => {
    setForm(prev => {
      const nextItems = (prev.platforms[key]?.items || []).filter((_, i) => i !== index);
      return {
        ...prev,
        platforms: {
          ...prev.platforms,
          [key]: {
            ...prev.platforms[key],
            count: String(nextItems.length),
            items: nextItems,
          },
        },
      };
    });
  };

  const handleSave = async () => {
    const activeEntries = Object.entries(form.platforms).filter(
      ([, data]) =>
        data.active &&
        (Number(data.count) > 0 || (data.items || []).some(it => it.title?.trim() || it.url?.trim()))
    );

    if (activeEntries.length === 0) {
      toast.warning("Iltimos, kamida bitta ijtimoiy tarmoqni belgilab, postlar sonini kiriting!");
      return;
    }

    setIsSubmitting(true);
    try {
      let totalPosts = 0;
      const formattedPlatforms = {};
      const descParts = [];

      activeEntries.forEach(([key, val]) => {
        const platformCfg = SOCIAL_PLATFORMS.find(p => p.key === key);
        const cleanedItems = (val.items || [])
          .map(it => ({ title: (it.title || '').trim(), url: (it.url || '').trim() }))
          .filter(it => it.title || it.url);
        const count = Math.max(Number(val.count || 0), cleanedItems.length);
        totalPosts += count;

        const summaryText = cleanedItems
          .map(it => it.title || it.url)
          .filter(Boolean)
          .join(' | ');
        const firstLink = cleanedItems.find(it => it.url)?.url || '';

        formattedPlatforms[key] = {
          label: platformCfg?.label || key,
          count,
          items: cleanedItems,
          posts: summaryText,
          link: firstLink,
        };
        const textSnippet = summaryText ? ` (${summaryText})` : '';
        descParts.push(`${platformCfg?.label || key}: ${count} ta post${textSnippet}`);
      });

      if (form.description?.trim()) {
        descParts.push(`Qo'shimcha: ${form.description.trim()}`);
      }

      const isXodim = currentUser?.role === ROLES.KUTUBXONA_XODIMI;
      const targetLibId =
        editItem?.libraryId ||
        currentUser?.libraryId ||
        (libraries && libraries[0]?.id) ||
        null;

      if (editItem) {
        let existingData = {};
        try {
          existingData = typeof editItem.data === 'object' && editItem.data
            ? editItem.data
            : JSON.parse(editItem.data || '{}');
        } catch {
          existingData = {};
        }

        const updatePayload = {
          data: JSON.stringify({
            ...existingData,
            platforms: formattedPlatforms,
            totalPosts,
            generalNote: form.description?.trim() || '',
          }),
          description: descParts.join(' | ') || `${totalPosts} ta post/e'lon joylandi`,
          date: form.date,
          time: form.time,
          count: totalPosts,
        };
        await updateEntity(STORAGE_KEYS.ACTIVITIES, editItem.id, updatePayload);
        toast.success("Ijtimoiy tarmoqlar hisoboti muvaffaqiyatli yangilandi!");
      } else {
        const payload = {
          type: 'social_report',
          data: JSON.stringify({
            platforms: formattedPlatforms,
            totalPosts,
            generalNote: form.description?.trim() || '',
            authorName: currentUser?.fullName || 'Xodim',
            authorRole: currentUser?.role || 'kutubxona_xodimi',
          }),
          description: descParts.join(' | ') || `${totalPosts} ta post/e'lon joylandi`,
          date: form.date,
          time: form.time,
          count: totalPosts,
          libraryId: targetLibId,
          userId: currentUser?.id,
          status: isXodim ? 'submitted' : 'accepted',
        };

        await createEntity(STORAGE_KEYS.ACTIVITIES, payload);
        toast.success("Ijtimoiy tarmoqlar hisoboti muvaffaqiyatli saqlandi!");
      }

      setForm(buildInitialSocialForm());
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving social report:', err);
      toast.error("Hisobotni saqlashda xatolik yuz berdi: " + (err.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editItem ? "Ijtimoiy tarmoqlar hisobotini tahrirlash" : "Ijtimoiy tarmoqlar hisobotini kiritish"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Bekor qilish
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ICONS.save /> {isSubmitting ? "Saqlanmoqda..." : (editItem ? "Yangilash" : "Hisobotni saqlash")}
          </Button>
        </>
      }
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Banner */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center text-sm shadow-sm">
              <ICONS.share />
            </span>
            <div>
              <h4 className="text-sm font-bold text-slate-900 leading-tight">
                Ijtimoiy tarmoqlardagi faoliyat hisoboti
              </h4>
              <p className="text-[11px] text-slate-500 leading-snug">
                Qaysi tarmoqlarga post, e'lon yoki video joylagan bo'lsangiz, ularni belgilang va tavsifini yozing
              </p>
            </div>
          </div>
        </div>

        {/* Sana va Vaqt */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Sana</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Vaqt</label>
            <input
              type="time"
              value={form.time}
              onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>
        </div>

        {/* 5 ta tarmoq ro'yxati */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
            <span>Ijtimoiy tarmoqlar bo'yicha ko'rsatkichlar:</span>
            <span className="text-[11px] font-normal text-slate-500">
              Kamida bittasini to'ldiring
            </span>
          </p>

          {SOCIAL_PLATFORMS.map(platform => {
            const data = form.platforms[platform.key] || {};
            const isActive = data.active;
            const IconComp = ICONS[platform.icon] || ICONS.globe;

            return (
              <div
                key={platform.key}
                className={`p-3.5 rounded-xl border transition-all ${
                  isActive
                    ? 'border-purple-300 bg-white shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                {/* Header row: Checkbox + Platform nomi + Soni */}
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={e => handlePlatformToggle(platform.key, e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer accent-purple-600 shrink-0"
                    />
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${platform.bgColor || 'bg-slate-50'} ${platform.borderColor || 'border-slate-200'}`}
                    >
                      <IconComp className={`text-base ${platform.textColor || ''}`} style={{ color: platform.color }} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        {platform.label}
                      </p>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        {platform.unit}
                      </p>
                    </div>
                  </label>

                  <div className="flex items-center gap-2">
                    {isActive ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-500">Soni:</span>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="1"
                          value={data.count}
                          onFocus={() => {
                            if (data.count === '0' || data.count === 0) {
                              handlePlatformChange(platform.key, 'count', '');
                            }
                          }}
                          onBlur={() => {
                            if (data.count === '' || data.count === null || data.count === undefined) {
                              handlePlatformChange(platform.key, 'count', String(data.items?.length || 0));
                            }
                          }}
                          onChange={e => handlePlatformCountChange(platform.key, e.target.value)}
                          placeholder="0"
                          className="w-16 px-2.5 py-1 text-center font-bold text-sm rounded-lg border border-purple-300 bg-white text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />
                        <span className="text-xs text-slate-400 font-medium">ta</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium italic">
                        Faol emas
                      </span>
                    )}
                  </div>
                </div>

                {/* Tafsilotlar: kiritilgan songa qarab alohida sarlavha + link maydonlari */}
                {isActive && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5 pl-2 sm:pl-7">
                    {Array.isArray(data.items) && data.items.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {data.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-12 gap-2 items-end"
                          >
                            <div className="sm:col-span-6">
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                {idx + 1}-post / e'lon sarlavhasi (mazmuni):
                              </label>
                              <input
                                type="text"
                                value={item.title}
                                onChange={e => handlePlatformItemChange(platform.key, idx, 'title', e.target.value)}
                                placeholder={platform.placeholder}
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder:text-slate-400"
                              />
                            </div>
                            <div className="sm:col-span-5">
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                {idx + 1}-havola (URL, ixtiyoriy):
                              </label>
                              <input
                                type="url"
                                value={item.url}
                                onChange={e => handlePlatformItemChange(platform.key, idx, 'url', e.target.value)}
                                placeholder="https://..."
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder:text-slate-300"
                              />
                            </div>
                            <div className="sm:col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleRemovePlatformItem(platform.key, idx)}
                                className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                                title="Ushbu qatorni olib tashlash"
                              >
                                <ICONS.trash className="text-xs" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic bg-slate-50 px-3 py-2 rounded-lg border border-dashed border-slate-200">
                        Nechta post yoki material joylagan bo'lsangiz, yuqoridagi <strong>"Soni"</strong> maydoniga kiriting — shuncha alohida sarlavha va link maydoni chiqadi.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Umumiy qo'shimcha izoh */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Qo'shimcha umumiy izoh (ixtiyoriy):
          </label>
          <textarea
            rows={2}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Ijtimoiy tarmoqlar yuritilishi bo'yicha qo'shimcha xulosa yoki izoh..."
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
      </div>
    </Modal>
  );
}
