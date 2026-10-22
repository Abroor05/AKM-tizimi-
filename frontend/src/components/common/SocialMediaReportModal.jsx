import { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { toast } from '../ui/Toast.jsx';
import ICONS from '../icons.jsx';
import { STORAGE_KEYS, SOCIAL_PLATFORMS, ROLES } from '../../data/constants.js';

function buildInitialSocialForm() {
  const platformsData = {};
  SOCIAL_PLATFORMS.forEach(p => {
    platformsData[p.key] = {
      active: false,
      count: '',
      posts: '',
      link: '',
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
  createEntity,
  onSuccess,
}) {
  const [form, setForm] = useState(buildInitialSocialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePlatformToggle = (key, active) => {
    setForm(prev => ({
      ...prev,
      platforms: {
        ...prev.platforms,
        [key]: {
          ...prev.platforms[key],
          active,
          count: active && !prev.platforms[key].count ? '1' : prev.platforms[key].count,
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

  const handleSave = async () => {
    const activeEntries = Object.entries(form.platforms).filter(
      ([, data]) => data.active && (Number(data.count) > 0 || data.posts?.trim())
    );

    if (activeEntries.length === 0) {
      toast.warning("Iltimos, kamida bitta ijtimoiy tarmoqni belgilab, postlar soni yoki mazmunini kiriting!");
      return;
    }

    setIsSubmitting(true);
    try {
      let totalPosts = 0;
      const formattedPlatforms = {};
      const descParts = [];

      activeEntries.forEach(([key, val]) => {
        const platformCfg = SOCIAL_PLATFORMS.find(p => p.key === key);
        const count = Number(val.count || 0);
        totalPosts += count;
        formattedPlatforms[key] = {
          label: platformCfg?.label || key,
          count,
          posts: val.posts?.trim() || '',
          link: val.link?.trim() || '',
        };
        const textSnippet = val.posts?.trim() ? ` (${val.posts.trim()})` : '';
        descParts.push(`${platformCfg?.label || key}: ${count} ta post${textSnippet}`);
      });

      if (form.description?.trim()) {
        descParts.push(`Qo'shimcha: ${form.description.trim()}`);
      }

      const isXodim = currentUser?.role === ROLES.KUTUBXONA_XODIMI;
      const targetLibId =
        currentUser?.libraryId ||
        (libraries && libraries[0]?.id) ||
        null;

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
      title="Ijtimoiy tarmoqlar hisobotini kiritish"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Bekor qilish
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white hover:opacity-90"
          >
            <ICONS.save /> {isSubmitting ? "Saqlanmoqda..." : "Hisobotni saqlash"}
          </Button>
        </>
      }
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Banner */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 border border-purple-200/80">
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
                          min="1"
                          value={data.count}
                          onChange={e => handlePlatformChange(platform.key, 'count', e.target.value)}
                          placeholder="1"
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

                {/* Tafsilotlar (agar faol bo'lsa) */}
                {isActive && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5 pl-7">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Bajarilgan ish / Post yoki e'lon mazmuni:
                      </label>
                      <textarea
                        rows={2}
                        value={data.posts}
                        onChange={e => handlePlatformChange(platform.key, 'posts', e.target.value)}
                        placeholder={platform.placeholder}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder:text-slate-400 leading-relaxed"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Havola yoki post havolasi (ixtiyoriy):
                      </label>
                      <input
                        type="url"
                        value={data.link}
                        onChange={e => handlePlatformChange(platform.key, 'link', e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder:text-slate-300"
                      />
                    </div>
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
