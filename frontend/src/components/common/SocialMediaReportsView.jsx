import { useState, useMemo } from 'react';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Modal from '../ui/Modal.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import ICONS from '../icons.jsx';
import { STORAGE_KEYS, SOCIAL_PLATFORMS, ROLES, ROLE_LABELS } from '../../data/constants.js';
import { formatDate, formatNumber } from '../../utils/helpers.js';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function parseSocialData(act) {
  try {
    const d = typeof act.data === 'object' && act.data ? act.data : JSON.parse(act.data || '{}');
    return d || {};
  } catch {
    return {};
  }
}

export default function SocialMediaReportsView({
  activities = [],
  users = [],
  libraries = [],
  currentUser,
  onOpenCreateModal,
  canCreate = true,
}) {
  const [viewTab, setViewTab] = useState('daily'); // 'daily' | 'monthly' | 'yearly'
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [platformFilter, setPlatformFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [detailItem, setDetailItem] = useState(null);

  // Faqat ijtimoiy tarmoq hisobotlarini filtrlash
  const socialActs = useMemo(() => {
    return (activities || []).filter(a => {
      if (a.type === 'social_report' || a.type === 'social_media') return true;
      // Eski formatda ham tekshirish (agar data.platforms bo'lsa)
      const d = parseSocialData(a);
      return Boolean(d.platforms);
    });
  }, [activities]);

  // Tanlangan tab (kunlik, oylik, yillik) va filtrlar bo'yicha saralash
  const filtered = useMemo(() => {
    let list = socialActs;

    if (viewTab === 'daily') {
      list = list.filter(a => a.date === dateFilter);
    } else if (viewTab === 'monthly') {
      list = list.filter(a => a.date?.startsWith(monthFilter));
    } else if (viewTab === 'yearly') {
      list = list.filter(a => a.date?.startsWith(yearFilter));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a => {
        const u = users.find(user => user.id === a.userId);
        const nameMatch = u?.fullName?.toLowerCase().includes(q);
        const descMatch = a.description?.toLowerCase().includes(q);
        const d = parseSocialData(a);
        const postsMatch = Object.values(d.platforms || {}).some(p => p.posts?.toLowerCase().includes(q));
        return nameMatch || descMatch || postsMatch;
      });
    }

    if (platformFilter !== 'all') {
      list = list.filter(a => {
        const d = parseSocialData(a);
        const p = d.platforms?.[platformFilter];
        return Boolean(p && (Number(p.count) > 0 || p.posts));
      });
    }

    return list.sort((a, b) => new Date(b.date + 'T' + (b.time || '00:00')) - new Date(a.date + 'T' + (a.time || '00:00')));
  }, [socialActs, viewTab, dateFilter, monthFilter, yearFilter, search, platformFilter, users]);

  // Umumiy statistika hisobi (jami postlar, platformalar kesimida)
  const stats = useMemo(() => {
    const res = {
      telegram: 0,
      instagram: 0,
      facebook: 0,
      twitter: 0,
      youtube: 0,
      total: 0,
      recordsCount: filtered.length,
    };

    filtered.forEach(a => {
      const d = parseSocialData(a);
      const platforms = d.platforms || {};
      SOCIAL_PLATFORMS.forEach(p => {
        const count = Number(platforms[p.key]?.count || 0);
        res[p.key] += count;
        res.total += count;
      });
    });

    return res;
  }, [filtered]);

  // Diagramma ma'lumotlari (Oylar yoki Kunlar kesimida)
  const chartData = useMemo(() => {
    if (viewTab === 'yearly') {
      const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
      return months.map((mName, idx) => {
        const prefix = `${yearFilter}-${String(idx + 1).padStart(2, '0')}`;
        const items = socialActs.filter(a => a.date?.startsWith(prefix));
        const itemStats = { name: mName, telegram: 0, instagram: 0, facebook: 0, twitter: 0, youtube: 0, jami: 0 };
        items.forEach(a => {
          const d = parseSocialData(a);
          const platforms = d.platforms || {};
          SOCIAL_PLATFORMS.forEach(p => {
            const c = Number(platforms[p.key]?.count || 0);
            itemStats[p.key] += c;
            itemStats.jami += c;
          });
        });
        return itemStats;
      });
    }

    if (viewTab === 'monthly') {
      // Shu oyning kunlari kesimida (har 5 kunda bir guruh yoki oxirgi kunlar)
      const daysInMonth = 31;
      const days = [];
      for (let i = 1; i <= daysInMonth; i++) {
        const dStr = `${monthFilter}-${String(i).padStart(2, '0')}`;
        const items = socialActs.filter(a => a.date === dStr);
        if (items.length > 0 || i % 5 === 0) {
          const itemStats = { name: `${i}-kun`, telegram: 0, instagram: 0, facebook: 0, twitter: 0, youtube: 0, jami: 0 };
          items.forEach(a => {
            const d = parseSocialData(a);
            const platforms = d.platforms || {};
            SOCIAL_PLATFORMS.forEach(p => {
              const c = Number(platforms[p.key]?.count || 0);
              itemStats[p.key] += c;
              itemStats.jami += c;
            });
          });
          days.push(itemStats);
        }
      }
      return days;
    }

    return [];
  }, [viewTab, yearFilter, monthFilter, socialActs]);

  const yearOptions = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div className="space-y-5">
      {/* Yuqori boshqaruv va filtrlar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tablar: Kunlik, Oylik, Yillik */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-700/60 rounded-xl">
            <button
              onClick={() => setViewTab('daily')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewTab === 'daily'
                  ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Kunlik
            </button>
            <button
              onClick={() => setViewTab('monthly')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewTab === 'monthly'
                  ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Oylik
            </button>
            <button
              onClick={() => setViewTab('yearly')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewTab === 'yearly'
                  ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Yillik
            </button>
          </div>

          {/* Sana / Oy / Yil tanlagich */}
          {viewTab === 'daily' && (
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          )}
          {viewTab === 'monthly' && (
            <input
              type="month"
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          )}
          {viewTab === 'yearly' && (
            <select
              value={yearFilter}
              onChange={e => setYearFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-300"
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}-yil</option>
              ))}
            </select>
          )}

          {/* Platforma filtri */}
          <select
            value={platformFilter}
            onChange={e => setPlatformFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            <option value="all">Barcha tarmoqlar</option>
            {SOCIAL_PLATFORMS.map(p => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Qo'shish tugmasi */}
        {canCreate && (
          <Button
            onClick={onOpenCreateModal}
            className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white hover:opacity-90 shadow-sm shrink-0"
          >
            <ICONS.plus /> Ijtimoiy tarmoq hisobotini qo'shish
          </Button>
        )}
      </div>

      {/* 5 ta tarmoq + JAMI umumiy statistika kartalari */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {SOCIAL_PLATFORMS.map(p => {
          const IconComp = ICONS[p.icon] || ICONS.globe;
          const count = stats[p.key] || 0;
          return (
            <Card key={p.key} className="relative overflow-hidden border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center border shadow-2xs ${p.bgColor || 'bg-slate-50'} ${p.borderColor || 'border-slate-200'}`}
                >
                  <IconComp className={`text-base ${p.textColor || ''}`} style={{ color: p.color }} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {p.label}
                </span>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {formatNumber(count)}
                <span className="text-xs font-normal text-slate-400 ml-1.5">post</span>
              </p>
            </Card>
          );
        })}

        {/* JAMI KARTA */}
        <Card className="relative overflow-hidden border border-purple-200 bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/50 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="w-8 h-8 rounded-lg bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
              <ICONS.share className="text-base text-purple-600" />
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700">
              JAMI POSTLAR
            </span>
          </div>
          <p className="text-2xl font-black text-purple-900">
            {formatNumber(stats.total)}
            <span className="text-xs font-normal text-purple-500 ml-1.5">post</span>
          </p>
        </Card>
      </div>

      {/* Grafik (Oylik yoki Yillik tanlanganda) */}
      {(viewTab === 'yearly' || viewTab === 'monthly') && chartData.length > 0 && (
        <Card title={`${viewTab === 'yearly' ? `${yearFilter}-yil` : monthFilter}: Ijtimoiy tarmoqlar dinamikasi`}>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val, name) => [
                    `${formatNumber(val)} ta post`,
                    name === 'telegram' ? 'Telegram' : name === 'instagram' ? 'Instagram' : name === 'facebook' ? 'Facebook' : name === 'twitter' ? 'Twitter' : 'YouTube'
                  ]}
                />
                <Legend
                  formatter={(val) => val === 'telegram' ? 'Telegram' : val === 'instagram' ? 'Instagram' : val === 'facebook' ? 'Facebook' : val === 'twitter' ? 'Twitter' : 'YouTube'}
                />
                <Bar dataKey="telegram" fill="#229ED9" radius={[3, 3, 0, 0]} name="telegram" />
                <Bar dataKey="instagram" fill="#E1306C" radius={[3, 3, 0, 0]} name="instagram" />
                <Bar dataKey="facebook" fill="#1877F2" radius={[3, 3, 0, 0]} name="facebook" />
                <Bar dataKey="twitter" fill="#0f172a" radius={[3, 3, 0, 0]} name="twitter" />
                <Bar dataKey="youtube" fill="#FF0000" radius={[3, 3, 0, 0]} name="youtube" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Hisobotlar jadvali */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ICONS.share}
          title={
            viewTab === 'daily'
              ? `${formatDate(dateFilter)} sanasida ijtimoiy tarmoqlar hisoboti yo'q`
              : viewTab === 'monthly'
              ? `${monthFilter} oyi uchun ijtimoiy tarmoqlar hisoboti yo'q`
              : `${yearFilter}-yil uchun ijtimoiy tarmoqlar hisoboti yo'q`
          }
          description={canCreate ? "Yuqoridagi tugma orqali yangi hisobot qo'shing" : ""}
          action={
            canCreate ? (
              <Button onClick={onOpenCreateModal}>
                <ICONS.plus /> Hisobot qo'shish
              </Button>
            ) : null
          }
        />
      ) : (
        <Card noPadding className="overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-800">
              Ijtimoiy tarmoqlar hisobotlari ro'yxati ({filtered.length} ta yozuv)
            </h3>
            <div className="w-64 relative">
              <ICONS.search className="absolute left-3 top-2.5 text-slate-400 text-xs" />
              <input
                type="text"
                placeholder="Xodim yoki mavzu bo'yicha qidiruv..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
                <tr>
                  <th className="text-left px-4 py-3">Sana va vaqt</th>
                  <th className="text-left px-4 py-3">Mas'ul xodim</th>
                  <th className="text-center px-3 py-3">
                    <span className="inline-flex items-center gap-1.5 justify-center">
                      <ICONS.telegram className="text-sky-500 text-sm" /> Telegram
                    </span>
                  </th>
                  <th className="text-center px-3 py-3">
                    <span className="inline-flex items-center gap-1.5 justify-center">
                      <ICONS.instagram className="text-pink-600 text-sm" /> Instagram
                    </span>
                  </th>
                  <th className="text-center px-3 py-3">
                    <span className="inline-flex items-center gap-1.5 justify-center">
                      <ICONS.facebook className="text-blue-600 text-sm" /> Facebook
                    </span>
                  </th>
                  <th className="text-center px-3 py-3">
                    <span className="inline-flex items-center gap-1.5 justify-center">
                      <ICONS.twitter className="text-slate-800 text-sm" /> Twitter
                    </span>
                  </th>
                  <th className="text-center px-3 py-3">
                    <span className="inline-flex items-center gap-1.5 justify-center">
                      <ICONS.youtube className="text-red-600 text-sm" /> YouTube
                    </span>
                  </th>
                  <th className="text-center px-3 py-3">Jami post</th>
                  <th className="text-left px-4 py-3">Mazmuni va ishlar</th>
                  <th className="text-center px-4 py-3">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map(act => {
                  const d = parseSocialData(act);
                  const p = d.platforms || {};
                  const author = users.find(u => u.id === act.userId);
                  const lib = libraries.find(l => l.id === act.libraryId || l.id === author?.libraryId);
                  const total = Number(d.totalPosts || act.count || 0);

                  return (
                    <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">
                        {formatDate(act.date)}
                        {act.time && <span className="text-[11px] text-slate-400 ml-1.5 font-mono">{act.time}</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {author?.fullName?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">
                              {author?.fullName || d.authorName || 'Xodim'}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {lib?.name || 'Kutubxona'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="text-center px-3 py-3 font-semibold text-sky-600">
                        {p.telegram?.count ? formatNumber(p.telegram.count) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="text-center px-3 py-3 font-semibold text-pink-600">
                        {p.instagram?.count ? formatNumber(p.instagram.count) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="text-center px-3 py-3 font-semibold text-blue-600">
                        {p.facebook?.count ? formatNumber(p.facebook.count) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="text-center px-3 py-3 font-semibold text-slate-700">
                        {p.twitter?.count ? formatNumber(p.twitter.count) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="text-center px-3 py-3 font-semibold text-red-600">
                        {p.youtube?.count ? formatNumber(p.youtube.count) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="text-center px-3 py-3 font-extrabold text-purple-700 text-sm">
                        {formatNumber(total)} ta
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-slate-600" title={act.description}>
                        {act.description || "Tafsilotlar mavjud"}
                      </td>
                      <td className="text-center px-4 py-3">
                        <button
                          onClick={() => setDetailItem(act)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors inline-flex items-center gap-1"
                        >
                          <ICONS.eye className="text-xs" /> Ko'rish
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Batafsil ko'rish modali */}
      {detailItem && (() => {
        const d = parseSocialData(detailItem);
        const p = d.platforms || {};
        const author = users.find(u => u.id === detailItem.userId);
        const lib = libraries.find(l => l.id === detailItem.libraryId || l.id === author?.libraryId);
        const total = Number(d.totalPosts || detailItem.count || 0);

        return (
          <Modal
            isOpen={!!detailItem}
            onClose={() => setDetailItem(null)}
            title="Ijtimoiy tarmoqlar hisoboti tafsilotlari"
            size="lg"
            footer={
              <Button variant="secondary" onClick={() => setDetailItem(null)}>
                Yopish
              </Button>
            }
          >
            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              {/* Header card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 via-slate-50 to-indigo-50 border border-purple-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-700">
                    Sana: {formatDate(detailItem.date)} {detailItem.time && `| ${detailItem.time}`}
                  </p>
                  <p className="text-base font-extrabold text-slate-900 mt-0.5">
                    {author?.fullName || d.authorName || 'Kutubxona xodimi'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {lib?.name || 'AKM Kutubxonasi'} ({ROLE_LABELS[author?.role] || author?.role || 'Mas\'ul'})
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-medium">Jami postlar soni:</span>
                  <span className="text-2xl font-black text-purple-700">{formatNumber(total)} ta</span>
                </div>
              </div>

              {/* Tarmoqlar tafsilotlari */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Tarmoqlar kesimida joylangan post va e'lonlar:
                </h4>

                {SOCIAL_PLATFORMS.map(platform => {
                  const item = p[platform.key];
                  if (!item || (!Number(item.count) && !item.posts)) return null;

                  const IconComp = ICONS[platform.icon] || ICONS.globe;

                  return (
                    <div
                      key={platform.key}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs border ${platform.bgColor || 'bg-slate-50'} ${platform.borderColor || 'border-slate-200'}`}
                          >
                            <IconComp className={platform.textColor || ''} style={{ color: platform.color }} />
                          </div>
                          <span className="text-sm font-bold text-slate-900">
                            {platform.label}
                          </span>
                        </div>
                        <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                          {formatNumber(item.count || 0)} ta post/e'lon
                        </span>
                      </div>

                      {item.posts && (
                        <div className="p-2.5 rounded-lg bg-slate-50 text-xs text-slate-800 leading-relaxed">
                          <span className="font-bold block text-slate-600 mb-0.5">Bajarilgan ish mazmuni:</span>
                          <p>{item.posts}</p>
                        </div>
                      )}

                      {item.link && (
                        <div className="pt-1">
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 font-semibold"
                          >
                            <ICONS.externalLink className="text-[11px]" /> Havolani ochish: {item.link}
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Umumiy izoh */}
              {d.generalNote && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  <span className="font-bold text-slate-900 block mb-1">Umumiy izoh:</span>
                  <p>{d.generalNote}</p>
                </div>
              )}
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
