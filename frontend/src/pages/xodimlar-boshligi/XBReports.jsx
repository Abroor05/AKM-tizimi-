// ============================================================
// BO'LIM BOSHLIGI — HISOBOTLAR MARKAZI
// Oylik va Yillik hisobotlarni shakllantirish, jamlash
// va Super Admin hamda Viloyat Adminiga yuborish
// ============================================================
import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import ICONS from '../../components/icons.jsx';
import {
  STORAGE_KEYS,
  ROLES,
  REPORT_TYPES,
  REPORT_TYPE_LABELS,
  REPORT_STATUS,
  REPORT_STATUS_LABELS,
  REPORT_STATUS_COLORS,
  ACTIVITY_TYPE_LABELS,
} from '../../data/constants.js';
import { formatDate, formatNumber } from '../../utils/helpers.js';
import { getViloyatName, getTumanName } from '../../data/regions.js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import SocialMediaReportModal from '../../components/common/SocialMediaReportModal.jsx';
import SocialMediaReportsView from '../../components/common/SocialMediaReportsView.jsx';

// Qisqa nomlar
const TYPE_SHORT = {
  kitob_skanerlash: 'Skanerlash (kitob)',
  kitob_pdf:        'Elektronlashtirish / PDF (fayl)',
  ijtimoiy_tarmoq:  "Ijtimoiy tarmoqlar (post/e'lon)",
  texnik_xizmat:    'Texnik xizmat',
  jihozlash:        'Jihozlash',
  tuzatish:         "Ta'mirlash",
  boshqa:           'Boshqa vazifalar',
};

const ACT_STATUS_COLORS = {
  submitted: 'blue',
  sent:      'amber',
  accepted:  'green',
};
const ACT_STATUS_LABELS = {
  submitted: 'Saqlangan',
  sent:      'Yuborildi',
  accepted:  'Qabul qilindi',
};

function parseData(item) {
  try {
    if (typeof item?.data === 'object' && item?.data) return item.data;
    return JSON.parse(item?.data || '{}');
  } catch {
    return {};
  }
}

function getMonthName(monthStr) {
  if (!monthStr) return '';
  const parts = monthStr.split('-');
  const y = parts[0];
  const m = parseInt(parts[1], 10);
  const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
  return `${months[m - 1] || ''} ${y}`;
}

export default function XBReports() {
  const {
    currentUser,
    getReports,
    createReport,
    submitReport,
    getCollection,
    createEntity,
    acceptActivity,
    forwardDailyActivityToAdmins,
    forwardMonthlyReportToAdmins,
  } = useApp();

  const allReports = useMemo(() => getReports() || [], [getReports]);
  const allActs    = useMemo(() => getCollection(STORAGE_KEYS.ACTIVITIES) || [], [getCollection]);
  const allUsers   = useMemo(() => getCollection(STORAGE_KEYS.USERS) || [], [getCollection]);
  const libraries  = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES) || [], [getCollection]);

  // Bo'lim boshlig'ining o'z kutubxonasi
  const myLibrary = useMemo(() =>
    libraries.find(l => l.id === currentUser?.libraryId),
    [libraries, currentUser]
  );

  // Kutubxona xodimlari
  const myStaff = useMemo(() =>
    allUsers.filter(u =>
      u.role === ROLES.KUTUBXONA_XODIMI &&
      (u.libraryId === currentUser?.libraryId || (u.tumanId === currentUser?.tumanId && u.viloyatId === currentUser?.viloyatId))
    ),
    [allUsers, currentUser]
  );

  // Kutubxonaga tegishli kunlik hisobotlar
  const myLibActs = useMemo(() =>
    allActs.filter(a =>
      (a.libraryId === currentUser?.libraryId || a.userId === currentUser?.id || myStaff.some(s => s.id === a.userId)) &&
      a.type === 'daily_report'
    ),
    [allActs, currentUser, myStaff]
  );

  // Kutubxonaga tegishli ijtimoiy tarmoq hisobotlari
  const socialActs = useMemo(() =>
    allActs.filter(a =>
      (a.libraryId === currentUser?.libraryId || a.userId === currentUser?.id || myStaff.some(s => s.id === a.userId)) &&
      (a.type === 'social_report' || a.type === 'social')
    ),
    [allActs, currentUser, myStaff]
  );

  // Bo'lim boshlig'i hisobotlari
  const myReports = useMemo(() =>
    allReports.filter(r =>
      (currentUser?.libraryId && (r.libraryId === currentUser?.libraryId || r.library_id === currentUser?.libraryId)) ||
      (currentUser?.id && (r.userId === currentUser?.id || r.user_id === currentUser?.id || r.createdBy === currentUser?.id)) ||
      (currentUser?.viloyatId && currentUser?.tumanId && (r.viloyatId === currentUser?.viloyatId || r.viloyat_id === currentUser?.viloyatId) && (r.tumanId === currentUser?.tumanId || r.tuman_id === currentUser?.tumanId))
    ).sort((a, b) => new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0)),
    [allReports, currentUser]
  );

  const today = new Date().toISOString().split('T')[0];
  const currentMonthStr = today.slice(0, 7);
  const currentYearStr = today.slice(0, 4);

  // ─── TABS ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('monthly_aggregate');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState(currentYearStr);
  const [dailyMonthFilter, setDailyMonthFilter] = useState(currentMonthStr);
  const [staffFilter, setStaffFilter] = useState('all');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [createType, setCreateType] = useState(REPORT_TYPES.MONTHLY);
  const [detailReport, setDetailReport] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDailyAddModal, setShowDailyAddModal] = useState(false);

  // Form state for new report
  const [form, setForm] = useState({
    title: '',
    period: currentMonthStr,
    description: '',
    targetRecipients: ['super_admin', 'viloyat_admin'],
    counts: {
      kitob_skanerlash: 0,
      kitob_pdf: 0,
      ijtimoiy_tarmoq: 0,
      texnik_xizmat: 0,
      jihozlash: 0,
      tuzatish: 0,
      boshqa: 0,
    },
    visitors: 0,
    events: 0,
  });

  // Daily form for head (faqat skanerlash, pdf va texnik xizmatlar, ijtimoiy tarmoqlar alohida)
  const [dailyForm, setDailyForm] = useState({
    date: today,
    time: new Date().toTimeString().slice(0, 5),
    counts: {
      kitob_skanerlash: '',
      kitob_pdf: '',
    },
    tasks: {
      texnik_xizmat: false,
      jihozlash: false,
      tuzatish: false,
      boshqa: false,
    },
    notes: {
      texnik_xizmat: '',
      jihozlash: '',
      tuzatish: '',
      boshqa: '',
    },
    description: '',
  });

  // ─── 1. OYLIK JAMLANMA HISOBI (Har bir oy uchun) ────────────
  // Tizimda mavjud barcha oylar ro'yxati (so'nggi 12 oy)
  const availableMonths = useMemo(() => {
    const set = new Set();
    set.add(currentMonthStr);
    myLibActs.forEach(a => {
      if (a.date && a.date.length >= 7) set.add(a.date.slice(0, 7));
    });
    myReports.forEach(r => {
      if (r.period && r.period.length === 7) set.add(r.period);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [myLibActs, myReports, currentMonthStr]);

  // Har bir oy uchun avtomatik jamlangan ma'lumotlar kartalari
  const monthlyAggregates = useMemo(() => {
    return availableMonths.map(month => {
      // Shu oyga tegishli barcha qabul qilingan va yuborilgan kunliklar
      const acts = myLibActs.filter(a =>
        a.date?.startsWith(month) &&
        (a.status === 'accepted' || a.status === 'sent')
      );

      // Kunlar soni
      const uniqueDays = new Set(acts.map(a => a.date)).size;

      // Faol xodimlar
      const activeStaffIds = new Set(acts.map(a => a.userId));

      // Jami ko'rsatkichlar
      const totals = {
        kitob_skanerlash: 0,
        kitob_pdf: 0,
        ijtimoiy_tarmoq: 0,
        texnik_xizmat: 0,
        jihozlash: 0,
        tuzatish: 0,
        boshqa: 0,
      };

      acts.forEach(a => {
        const d = parseData(a);
        Object.keys(totals).forEach(k => {
          totals[k] += Number(d[k] || 0);
        });
      });

      const grandTotal = Object.values(totals).reduce((sum, v) => sum + v, 0);

      // Shu oy bo'yicha tizimda rasmiy yaratilgan oylik hisobot mavjudmi?
      const officialReport = myReports.find(r =>
        r.type === REPORT_TYPES.MONTHLY && r.period === month
      );

      return {
        month,
        monthName: getMonthName(month),
        actsCount: acts.length,
        uniqueDays,
        activeStaffCount: activeStaffIds.size,
        totals,
        grandTotal,
        officialReport,
      };
    });
  }, [availableMonths, myLibActs, myReports]);

  // ─── 2. YILLIK JAMLANMA HISOBI ─────────────────────────────
  const availableYears = useMemo(() => {
    const set = new Set();
    set.add(currentYearStr);
    myLibActs.forEach(a => {
      if (a.date && a.date.length >= 4) set.add(a.date.slice(0, 4));
    });
    myReports.forEach(r => {
      if (r.period && r.period.length >= 4) set.add(r.period.slice(0, 4));
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [myLibActs, myReports, currentYearStr]);

  // Tanlangan yil bo'yicha 12 oylik ma'lumotlar
  const yearlyChartData = useMemo(() => {
    const monthNames = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
    return monthNames.map((mName, idx) => {
      const monthPrefix = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;
      const acts = myLibActs.filter(a =>
        a.date?.startsWith(monthPrefix) &&
        (a.status === 'accepted' || a.status === 'sent')
      );

      let scanner = 0;
      let pdf = 0;
      let social = 0;
      let texnik = 0;
      let jami = 0;

      acts.forEach(a => {
        const d = parseData(a);
        scanner += Number(d.kitob_skanerlash || 0);
        pdf     += Number(d.kitob_pdf || 0);
        social  += Number(d.ijtimoiy_tarmoq || 0);
        texnik  += Number(d.texnik_xizmat || 0) + Number(d.jihozlash || 0) + Number(d.tuzatish || 0) + Number(d.boshqa || 0);
      });
      jami = scanner + pdf + social + texnik;

      return {
        monthKey: monthPrefix,
        name: mName.slice(0, 3),
        fullName: mName,
        scanner,
        pdf,
        social,
        texnik,
        jami,
        actsCount: acts.length,
      };
    });
  }, [selectedYear, myLibActs]);

  // Tanlangan yil bo'yicha jami umumiy ko'rsatkichlar
  const yearGrandTotals = useMemo(() => {
    const totals = {
      kitob_skanerlash: 0,
      kitob_pdf: 0,
      ijtimoiy_tarmoq: 0,
      texnik_xizmat: 0,
      jihozlash: 0,
      tuzatish: 0,
      boshqa: 0,
    };
    let totalActs = 0;
    const yearActs = myLibActs.filter(a =>
      a.date?.startsWith(selectedYear) &&
      (a.status === 'accepted' || a.status === 'sent')
    );

    yearActs.forEach(a => {
      totalActs++;
      const d = parseData(a);
      Object.keys(totals).forEach(k => {
        totals[k] += Number(d[k] || 0);
      });
    });

    const grand = Object.values(totals).reduce((s, v) => s + v, 0);

    const officialYearReport = myReports.find(r =>
      r.type === REPORT_TYPES.ANNUAL && r.period === selectedYear
    );

    return {
      totals,
      grand,
      totalActs,
      daysCount: new Set(yearActs.map(a => a.date)).size,
      officialReport: officialYearReport,
    };
  }, [selectedYear, myLibActs, myReports]);

  // ─── 3. KUNLIK HISOBOTLAR (Filterlangan) ────────────────────
  const filteredDailyActs = useMemo(() => {
    let list = myLibActs.filter(a => a.date?.startsWith(dailyMonthFilter));
    if (staffFilter !== 'all') {
      list = list.filter(a => a.userId === staffFilter);
    }
    return list.sort((a, b) => new Date(b.date + 'T' + (b.time || '00:00')) - new Date(a.date + 'T' + (a.time || '00:00')));
  }, [myLibActs, dailyMonthFilter, staffFilter]);

  // ─── 4. YUBORILGAN HISOBOTLAR RO'YXATI ─────────────────────
  const sentReports = useMemo(() => {
    return myReports.filter(r => r.status === REPORT_STATUS.SUBMITTED || r.status === REPORT_STATUS.APPROVED || r.status === REPORT_STATUS.REJECTED || r.status === REPORT_STATUS.UNDER_REVIEW);
  }, [myReports]);

  // ─── AUTO-CALCULATE FROM DAILY FOR FORM ─────────────────────
  const autoAggregateForForm = useCallback((periodStr, type) => {
    const isYear = type === REPORT_TYPES.ANNUAL;
    const isDaily = type === REPORT_TYPES.DAILY;
    const acts = myLibActs.filter(a => {
      if (isDaily) return a.date === periodStr && (a.status === 'accepted' || a.status === 'sent');
      return a.date?.startsWith(periodStr) && (a.status === 'accepted' || a.status === 'sent');
    });

    const counts = {
      kitob_skanerlash: 0,
      kitob_pdf: 0,
      ijtimoiy_tarmoq: 0,
      texnik_xizmat: 0,
      jihozlash: 0,
      tuzatish: 0,
      boshqa: 0,
    };

    acts.forEach(a => {
      const d = parseData(a);
      Object.keys(counts).forEach(k => {
        counts[k] += Number(d[k] || 0);
      });
    });

    // Staff breakdown text
    const staffContributions = {};
    acts.forEach(a => {
      const u = allUsers.find(user => user.id === a.userId);
      const name = u?.fullName || 'Noma\'lum xodim';
      const d = parseData(a);
      const itemTotal = Object.values(d).reduce((sum, n) => sum + Number(n || 0), 0);
      staffContributions[name] = (staffContributions[name] || 0) + itemTotal;
    });

    const staffSummaryText = Object.entries(staffContributions)
      .map(([name, sum]) => `${name}: ${sum} ta ish`)
      .join(', ');

    const libName = myLibrary?.name || 'AKM Kutubxonasi';
    const periodLabel = isDaily ? formatDate(periodStr) : isYear ? `${periodStr}-yil` : getMonthName(periodStr);
    const defaultTitle = isDaily
      ? `${periodLabel} kunlik hisoboti — ${libName}`
      : `${periodLabel} ${isYear ? 'yillik' : 'oylik'} yig'ma hisoboti — ${libName}`;
    const desc = isDaily
      ? `${periodLabel} kuni kutubxona xodimlari tomonidan jami ${acts.length} ta faoliyat amalga oshirildi. Xodimlar: ${staffSummaryText || 'mavjud emas'}.`
      : `${periodLabel} davrida kutubxona xodimlari tomonidan jami ${acts.length} ta kunlik hisobot topshirildi. Xodimlar hissasi: ${staffSummaryText || 'mavjud emas'}.`;

    return {
      title: defaultTitle,
      counts,
      description: desc,
      staffContributions,
      actsCount: acts.length,
      daysCount: new Set(acts.map(a => a.date)).size,
    };
  }, [myLibActs, allUsers, myLibrary]);

  // Yangi hisobot yaratish modalini ochish
  const handleOpenCreateModal = (type = REPORT_TYPES.MONTHLY, targetPeriod = null) => {
    const period = targetPeriod || (type === REPORT_TYPES.ANNUAL ? currentYearStr : type === REPORT_TYPES.DAILY ? today : currentMonthStr);
    setCreateType(type);
    const aggregated = autoAggregateForForm(period, type);
    setForm({
      title: aggregated.title,
      period,
      description: aggregated.description,
      targetRecipients: ['super_admin', 'viloyat_admin'],
      counts: aggregated.counts,
      visitors: 0,
      events: 0,
      staffContributions: aggregated.staffContributions,
      actsCount: aggregated.actsCount,
      daysCount: aggregated.daysCount,
    });
    setShowCreateModal(true);
  };

  // Davr o'zgarganda avtomatik qayta jamlash
  const handlePeriodChange = (newPeriod) => {
    const aggregated = autoAggregateForForm(newPeriod, createType);
    setForm(prev => ({
      ...prev,
      period: newPeriod,
      title: aggregated.title,
      counts: aggregated.counts,
      description: aggregated.description,
      staffContributions: aggregated.staffContributions,
      actsCount: aggregated.actsCount,
      daysCount: aggregated.daysCount,
    }));
  };

  // Kunlik hisobotni Super Admin va Viloyat Adminiga jo'natish
  const handleSendDailyToAdmins = async (actOrDate) => {
    const dateStr = typeof actOrDate === 'string' ? actOrDate : actOrDate.date;
    const repTitle = `${formatDate(dateStr)} kunlik hisoboti`;
    if (!confirm(`"${repTitle}"ni Super Admin va Viloyat Adminiga jo'natmoqchimisiz?`)) return;

    setIsSubmitting(true);
    try {
      await forwardDailyActivityToAdmins(actOrDate, ['super_admin', 'viloyat_admin']);
      toast.success(`"${repTitle}" Super Admin va Viloyat Adminiga muvaffaqiyatli jo'natildi!`);
    } catch (err) {
      toast.error("Jo'natishda xatolik yuz berdi: " + (err.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Oylik hisobotni Super Admin va Viloyat Adminiga to'g'ridan-to'g'ri jo'natish
  const handleSendMonthlyToAdmins = async (monthStr) => {
    const targetMonth = monthStr || selectedMonth || currentMonthStr;
    const label = getMonthName(targetMonth);
    if (!confirm(`${label} oylik yig'ma hisobotini Super Admin va Viloyat Adminiga jo'natmoqchimisiz?`)) return;

    setIsSubmitting(true);
    try {
      const res = await forwardMonthlyReportToAdmins(targetMonth, ['super_admin', 'viloyat_admin']);
      if (res?.success || res?.id || res?.report) {
        toast.success(`${label} oylik hisoboti Super Admin va Viloyat Adminiga muvaffaqiyatli jo'natildi!`);
      } else {
        toast.error(res?.error || "Jo'natishda xatolik yuz berdi");
      }
    } catch (err) {
      toast.error("Jo'natishda xatolik yuz berdi: " + (err.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hisobotni saqlash yoki darhol Super & Viloyat Adminga jo'natish
  const handleSaveReport = async (submitNow = false) => {
    if (!form.title.trim()) {
      toast.warning('Iltimos, hisobot sarlavhasini kiriting!');
      return;
    }

    setIsSubmitting(true);
    try {
      const grandTotal = Object.values(form.counts).reduce((s, v) => s + Number(v || 0), 0);
      const recipientText = form.targetRecipients.includes('super_admin') && form.targetRecipients.includes('viloyat_admin')
        ? 'Super Admin va Viloyat Admini'
        : form.targetRecipients.includes('super_admin')
        ? 'Super Admin'
        : 'Viloyat Admini';

      const reportPayload = {
        title: form.title,
        type: createType,
        period: form.period,
        description: form.description,
        status: submitNow ? REPORT_STATUS.SUBMITTED : REPORT_STATUS.DRAFT,
        submittedAt: submitNow ? today : null,
        targetRecipients: form.targetRecipients,
        visitors: Number(form.visitors) || 0,
        events: Number(form.events) || 0,
        data: {
          totals: form.counts,
          grandTotal,
          visitors: Number(form.visitors) || 0,
          events: Number(form.events) || 0,
          targetRecipients: form.targetRecipients,
          staffContributions: form.staffContributions || {},
          actsCount: form.actsCount || 0,
          daysCount: form.daysCount || 0,
          authorName: currentUser?.fullName,
          authorRole: 'xodimlar_boshligi',
          libraryName: myLibrary?.name || '',
          viloyatId: currentUser?.viloyatId,
          tumanId: currentUser?.tumanId,
        },
      };

      await createReport(reportPayload);
      setShowCreateModal(false);
      if (submitNow) {
        toast.success(`Hisobot muvaffaqiyatli saqlandi va ${recipientText}ga jo'natildi!`);
      } else {
        toast.info("Hisobot qoralama sifatida saqlandi.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Hisobotni saqlashda xatolik yuz berdi: " + (err.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mavjud qoralamani jo'natish
  const handleDirectSubmit = async (reportId, targetRecipients = ['super_admin', 'viloyat_admin']) => {
    const rep = myReports.find(r => r.id === reportId);
    const recipientText = targetRecipients.includes('super_admin') && targetRecipients.includes('viloyat_admin')
      ? 'Super Admin va Viloyat Admini'
      : targetRecipients.includes('super_admin')
      ? 'Super Admin'
      : 'Viloyat Admini';

    if (!confirm(`"${rep?.title || 'Hisobot'}"ni ${recipientText}ga jo'natmoqchimisiz?`)) return;

    setIsSubmitting(true);
    try {
      await submitReport(reportId, {
        targetRecipients,
        sentToText: recipientText,
      });
      toast.success(`Hisobot ${recipientText}ga muvaffaqiyatli yuborildi!`);
      if (detailReport?.id === reportId) {
        setDetailReport(prev => ({ ...prev, status: REPORT_STATUS.SUBMITTED, targetRecipients, sentToText: recipientText }));
      }
    } catch (err) {
      toast.error("Jo'natishda xatolik yuz berdi: " + (err.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Kunlik hisobotni qabul qilish
  const handleAcceptDaily = async (act) => {
    const sender = allUsers.find(u => u.id === act.userId);
    if (!confirm(`${sender?.fullName || 'Xodim'}ning ${formatDate(act.date)} kunlik hisobotini qabul qilasizmi?`)) return;
    try {
      await acceptActivity(act.id);
      toast.success("Xodimning kunlik hisoboti muvaffaqiyatli qabul qilindi!");
    } catch (err) {
      toast.error('Qabul qilishda xatolik: ' + err.message);
    }
  };

  // O'z kunlik hisobotini kiritish
  const handleSaveHeadDaily = () => {
    const hasNumeric = (Number(dailyForm.counts.kitob_skanerlash) > 0) || (Number(dailyForm.counts.kitob_pdf) > 0);
    const hasTasks = Object.values(dailyForm.tasks).some(Boolean);
    if (!hasNumeric && !hasTasks) {
      toast.warning("Kamida bitta faoliyat turini belgilang yoki sonini kiriting!");
      return;
    }
    const data = {};
    if (Number(dailyForm.counts.kitob_skanerlash) > 0) {
      data.kitob_skanerlash = Number(dailyForm.counts.kitob_skanerlash);
    }
    if (Number(dailyForm.counts.kitob_pdf) > 0) {
      data.kitob_pdf = Number(dailyForm.counts.kitob_pdf);
    }
    const taskNotes = {};
    ['texnik_xizmat', 'jihozlash', 'tuzatish', 'boshqa'].forEach(key => {
      if (dailyForm.tasks[key]) {
        data[key] = 1;
        if (dailyForm.notes[key]?.trim()) {
          taskNotes[key] = dailyForm.notes[key].trim();
        }
      }
    });
    if (Object.keys(taskNotes).length > 0) {
      data.notes = taskNotes;
    }

    const descParts = [];
    if (dailyForm.description?.trim()) descParts.push(dailyForm.description.trim());
    Object.entries(taskNotes).forEach(([k, note]) => {
      const label = ACTIVITY_TYPE_LABELS[k] || k;
      descParts.push(`${label}: ${note}`);
    });

    try {
      createEntity(STORAGE_KEYS.ACTIVITIES, {
        type: 'daily_report',
        data: JSON.stringify(data),
        description: descParts.join(' | ') || dailyForm.description,
        date: dailyForm.date,
        time: dailyForm.time,
        libraryId: currentUser?.libraryId || myLibrary?.id || (libraries && libraries[0]?.id) || null,
        userId: currentUser?.id,
        status: 'accepted',
      });

      setShowDailyAddModal(false);
      setDailyForm({
        date: today,
        time: new Date().toTimeString().slice(0, 5),
        counts: { kitob_skanerlash: '', kitob_pdf: '' },
        tasks: { texnik_xizmat: false, jihozlash: false, tuzatish: false, boshqa: false },
        notes: { texnik_xizmat: '', jihozlash: '', tuzatish: '', boshqa: '' },
        description: '',
      });
      toast.success("Kunlik hisobot muvaffaqiyatli saqlandi!");
    } catch (err) {
      toast.error("Hisobotni saqlashda xatolik yuz berdi: " + (err.message || ''));
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        title="Bo'lim Boshlig'i — Hisobotlar Markazi"
        subtitle="Kunlik hisobotlar, oylik jamlanmalar va yillik hisobotlarni shakllantirish hamda Super Admin va Viloyat Adminiga yuborish"
        icon={ICONS.reports}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowSocialModal(true)}
              className="bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 shadow-2xs font-semibold"
            >
              <ICONS.share className="text-purple-600 text-sm" /> Ijtimoiy tarmoq
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleOpenCreateModal(REPORT_TYPES.MONTHLY)}
              className="bg-white border-teal-200 text-teal-800 hover:bg-teal-50"
            >
              <ICONS.plus className="text-teal-600" /> Oylik hisobot yaratish
            </Button>
            <Button
              onClick={() => handleOpenCreateModal(REPORT_TYPES.ANNUAL)}
              className="bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white shadow-md shadow-teal-700/20"
            >
              <ICONS.plus /> Yillik hisobot yaratish
            </Button>
          </div>
        }
      />

      {/* ── Summary Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <Card className="text-center bg-gradient-to-br from-teal-50/80 to-white border-teal-100">
          <p className="text-2xl font-black text-teal-700">{myReports.length}</p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Jami hisobotlar</p>
        </Card>
        <Card className="text-center bg-gradient-to-br from-blue-50/80 to-white border-blue-100">
          <p className="text-2xl font-black text-blue-700">
            {myReports.filter(r => r.type === REPORT_TYPES.MONTHLY).length}
          </p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Oylik hisobotlar</p>
        </Card>
        <Card className="text-center bg-gradient-to-br from-indigo-50/80 to-white border-indigo-100">
          <p className="text-2xl font-black text-indigo-700">
            {myReports.filter(r => r.type === REPORT_TYPES.ANNUAL).length}
          </p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Yillik hisobotlar</p>
        </Card>
        <Card className="text-center bg-gradient-to-br from-purple-50/80 to-white border-purple-100">
          <p className="text-2xl font-black text-purple-700">{sentReports.length}</p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Adminga yuborilgan</p>
        </Card>
        <Card className="text-center bg-gradient-to-br from-emerald-50/80 to-white border-emerald-100 col-span-2 sm:col-span-1">
          <p className="text-2xl font-black text-emerald-700">
            {myReports.filter(r => r.status === REPORT_STATUS.APPROVED).length}
          </p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Tasdiqlangan</p>
        </Card>
      </div>

      {/* ── Main Navigation Tabs ── */}
      <div className="flex border-b border-gray-200 overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveTab('monthly_aggregate')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm whitespace-nowrap transition-colors ${
            activeTab === 'monthly_aggregate'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ICONS.calendar className="text-base" />
          <span>Oylik jamlangan hisobotlar (Alohida)</span>
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-teal-100 text-teal-800 font-bold">
            {monthlyAggregates.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('yearly_reports')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm whitespace-nowrap transition-colors ${
            activeTab === 'yearly_reports'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-lg'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ICONS.chart className="text-base" />
          <span>Yillik hisobotlar</span>
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-800 font-bold">
            {availableYears.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('daily_records')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm whitespace-nowrap transition-colors ${
            activeTab === 'daily_records'
              ? 'border-amber-600 text-amber-700 bg-amber-50/40 rounded-t-lg'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ICONS.activity className="text-base" />
          <span>Kunlik hisobotlar (Har kuni)</span>
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 font-bold">
            {myLibActs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('social_media')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm whitespace-nowrap transition-colors ${
            activeTab === 'social_media'
              ? 'border-purple-600 text-purple-700 bg-purple-50/40 rounded-t-lg'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ICONS.share className="text-base" />
          <span>Ijtimoiy tarmoqlar hisoboti</span>
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 font-bold">
            {socialActs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('monitoring')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm whitespace-nowrap transition-colors ${
            activeTab === 'monitoring'
              ? 'border-purple-600 text-purple-700 bg-purple-50/40 rounded-t-lg'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ICONS.paperPlane className="text-base" />
          <span>Super & Viloyat Adminga yuborilganlar</span>
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 font-bold">
            {sentReports.length}
          </span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB 1: OYLIK JAMLANGAN HISOBOTLAR (Alohida bo'lim)
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'monthly_aggregate' && (
        <div className="space-y-6">
          {/* Information box */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-teal-50 via-slate-50 to-blue-50 border border-teal-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse"></span>
                <h3 className="font-bold text-slate-800 text-sm">Oylik jamlangan hisobotlar tartibi</h3>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                Har bir oyning kunlik qabul qilingan faoliyatlari avtomatik jamlanadi. Siz shu jamlanmani ko'rib chiqib,
                <strong> Super Admin va Viloyat Adminiga</strong> rasmiy hisobot sifatida yuborishingiz mumkin.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={() => handleSendMonthlyToAdmins(currentMonthStr)}
                disabled={isSubmitting}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-sm"
              >
                <ICONS.paperPlane /> {getMonthName(currentMonthStr)} hisobotini Adminga jo'natish
              </Button>
              <Button
                onClick={() => handleOpenCreateModal(REPORT_TYPES.MONTHLY)}
                size="sm"
                variant="secondary"
                className="bg-white border-teal-200 text-teal-800 hover:bg-teal-50 shrink-0"
              >
                <ICONS.plus /> Yangi oylik hisobot shakllantirish
              </Button>
            </div>
          </div>

          {/* Oylik kartochkalar ro'yxati */}
          <div className="space-y-4">
            {monthlyAggregates.map(item => {
              const rep = item.officialReport;
              const repData = rep ? parseData(rep) : null;
              const isSent = rep && (rep.status === REPORT_STATUS.SUBMITTED || rep.status === REPORT_STATUS.APPROVED || rep.status === REPORT_STATUS.UNDER_REVIEW);
              const recipients = repData?.targetRecipients || ['super_admin', 'viloyat_admin'];

              return (
                <div
                  key={item.month}
                  className={`rounded-2xl border transition-all ${
                    rep?.status === REPORT_STATUS.APPROVED
                      ? 'bg-emerald-50/30 border-emerald-200'
                      : isSent
                      ? 'bg-blue-50/20 border-blue-200'
                      : 'bg-white border-slate-200 hover:border-teal-300'
                  } p-5 shadow-sm`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md shadow-teal-600/20">
                        {item.month.slice(5, 7)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-extrabold text-slate-900">{item.monthName} oylik jamlanmasi</h4>
                          {rep ? (
                            <Badge color={REPORT_STATUS_COLORS[rep.status] || 'blue'}>
                              {REPORT_STATUS_LABELS[rep.status] || rep.status}
                            </Badge>
                          ) : (
                            <Badge color="amber">Rasmiy hisobot yaratilmagan</Badge>
                          )}
                          {rep && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                              Yuborilgan: {repData?.sentToText || (recipients.includes('super_admin') && recipients.includes('viloyat_admin') ? 'Super & Viloyat Admin' : 'Admin')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Davr: <strong className="font-mono text-slate-700">{item.month}</strong> |
                          Qabul qilingan kunliklar: <strong className="text-teal-700 font-bold">{item.actsCount} ta</strong> ({item.uniqueDays} kun) |
                          Faol xodimlar: <strong className="text-slate-700 font-bold">{item.activeStaffCount} nafar</strong>
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        onClick={() => handleSendMonthlyToAdmins(item.month)}
                        disabled={isSubmitting}
                        className={`text-xs shadow-sm text-white ${
                          isSent ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-teal-600 hover:bg-teal-700'
                        }`}
                      >
                        <ICONS.paperPlane className="text-xs" />
                        {isSent ? "Qayta Adminga jo'natish" : "Super & Viloyat Adminga jo'natish"}
                      </Button>

                      {rep && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setDetailReport(rep)}
                          className="text-xs"
                        >
                          <ICONS.eye className="text-xs" /> Ko'rish
                        </Button>
                      )}

                      {!rep && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenCreateModal(REPORT_TYPES.MONTHLY, item.month)}
                          className="text-xs text-slate-700 border-slate-300 hover:bg-slate-50"
                        >
                          <ICONS.plus className="text-xs" /> Tahrirlash
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Ko'rsatkichlar paneli (Grid) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-4">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[11px] text-slate-500 font-medium">Skanerlash</p>
                      <p className="text-lg font-extrabold text-blue-700 mt-0.5">
                        {formatNumber(item.totals.kitob_skanerlash)} <span className="text-[10px] font-normal text-slate-400">ta kitob</span>
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[11px] text-slate-500 font-medium">Elektronlashtirish / PDF</p>
                      <p className="text-lg font-extrabold text-indigo-700 mt-0.5">
                        {formatNumber(item.totals.kitob_pdf)} <span className="text-[10px] font-normal text-slate-400">fayl</span>
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[11px] text-slate-500 font-medium">Ijtimoiy tarmoqlar</p>
                      <p className="text-lg font-extrabold text-purple-700 mt-0.5">
                        {formatNumber(item.totals.ijtimoiy_tarmoq || 0)} <span className="text-[10px] font-normal text-slate-400">post</span>
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[11px] text-slate-500 font-medium">Texnik xizmat</p>
                      <p className="text-lg font-extrabold text-teal-700 mt-0.5">
                        {formatNumber(item.totals.texnik_xizmat)} <span className="text-[10px] font-normal text-slate-400">ta</span>
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[11px] text-slate-500 font-medium">Jihozlash</p>
                      <p className="text-lg font-extrabold text-amber-700 mt-0.5">
                        {formatNumber(item.totals.jihozlash)} <span className="text-[10px] font-normal text-slate-400">ta</span>
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[11px] text-slate-500 font-medium">Ta'mirlash & boshqa</p>
                      <p className="text-lg font-extrabold text-purple-700 mt-0.5">
                        {formatNumber(item.totals.tuzatish + item.totals.boshqa)} <span className="text-[10px] font-normal text-slate-400">ta</span>
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-teal-50 border border-teal-200">
                      <p className="text-[11px] text-teal-800 font-bold uppercase tracking-wider">Jami bajarildi</p>
                      <p className="text-xl font-black text-teal-900 mt-0.5">
                        {formatNumber(item.grandTotal)} <span className="text-[10px] font-medium text-teal-700">ta ish</span>
                      </p>
                    </div>
                  </div>

                  {/* Agar admin izoh bergan bo'lsa */}
                  {rep?.reviewComment && (
                    <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                      <ICONS.info className="text-sm shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        <strong>Admin mulohazasi:</strong> {rep.reviewComment}
                        {rep.reviewedAt && <span className="text-amber-700 ml-2 font-mono">({formatDate(rep.reviewedAt)})</span>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2: YILLIK HISOBOTLAR
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'yearly_reports' && (
        <div className="space-y-6">
          {/* Year selection bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Yilni tanlang:</span>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 font-bold text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}-yil hisoboti</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {yearGrandTotals.officialReport ? (
                <div className="flex items-center gap-2">
                  <Badge color={REPORT_STATUS_COLORS[yearGrandTotals.officialReport.status] || 'blue'}>
                    {REPORT_STATUS_LABELS[yearGrandTotals.officialReport.status]}
                  </Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setDetailReport(yearGrandTotals.officialReport)}
                  >
                    <ICONS.eye /> Ko'rish
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => handleOpenCreateModal(REPORT_TYPES.ANNUAL, selectedYear)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <ICONS.plus /> {selectedYear}-yil Yillik hisobotini yaratish va jo'natish
                </Button>
              )}
            </div>
          </div>

          {/* Yearly grand totals cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card className="text-center bg-gradient-to-br from-blue-50/70 to-white border-blue-200">
              <p className="text-2xl font-black text-blue-700">{formatNumber(yearGrandTotals.totals.kitob_skanerlash)}</p>
              <p className="text-xs font-semibold text-slate-600 mt-1">Yillik skanerlangan kitoblar</p>
            </Card>
            <Card className="text-center bg-gradient-to-br from-indigo-50/70 to-white border-indigo-200">
              <p className="text-2xl font-black text-indigo-700">{formatNumber(yearGrandTotals.totals.kitob_pdf)}</p>
              <p className="text-xs font-semibold text-slate-600 mt-1">Yillik elektronlashtirilgan (PDF) fayllar</p>
            </Card>
            <Card className="text-center bg-gradient-to-br from-purple-50/70 to-white border-purple-200">
              <p className="text-2xl font-black text-purple-700">{formatNumber(yearGrandTotals.totals.ijtimoiy_tarmoq || 0)}</p>
              <p className="text-xs font-semibold text-slate-600 mt-1">Yillik ijtimoiy tarmoq post/e'lonlari</p>
            </Card>
            <Card className="text-center bg-gradient-to-br from-teal-50/70 to-white border-teal-200">
              <p className="text-2xl font-black text-teal-700">
                {formatNumber(yearGrandTotals.totals.texnik_xizmat + yearGrandTotals.totals.jihozlash + yearGrandTotals.totals.tuzatish + yearGrandTotals.totals.boshqa)}
              </p>
              <p className="text-xs font-semibold text-slate-600 mt-1">Texnik & boshqa xizmatlar</p>
            </Card>
            <Card className="text-center bg-gradient-to-br from-emerald-50/70 to-white border-emerald-200">
              <p className="text-3xl font-black text-emerald-800">{formatNumber(yearGrandTotals.grand)}</p>
              <p className="text-xs font-bold text-emerald-950 mt-1">JAMI YILLIK ISHLAR</p>
            </Card>
          </div>

          {/* Chart */}
          <Card title={`${selectedYear}-yil: Oylar kesimida bajarilgan ishlar dinamikasi`}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={yearlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val, name) => [
                    formatNumber(val),
                    name === 'scanner' ? 'Skanerlash' : name === 'pdf' ? 'PDF qilish' : name === 'social' ? 'Ijtimoiy tarmoq' : 'Texnik xizmatlar'
                  ]}
                />
                <Legend
                  formatter={(value) => value === 'scanner' ? 'Skanerlash (kitob)' : value === 'pdf' ? 'Elektron / PDF (fayl)' : value === 'social' ? 'Ijtimoiy tarmoq (post)' : 'Texnik xizmatlar'}
                />
                <Bar dataKey="scanner" fill="#3b82f6" radius={[4, 4, 0, 0]} name="scanner" />
                <Bar dataKey="pdf" fill="#6366f1" radius={[4, 4, 0, 0]} name="pdf" />
                <Bar dataKey="social" fill="#a855f7" radius={[4, 4, 0, 0]} name="social" />
                <Bar dataKey="texnik" fill="#0d9488" radius={[4, 4, 0, 0]} name="texnik" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* 12 oylik jadval */}
          <Card title={`${selectedYear}-yil 12 oylik jamlanma jadvali`} noPadding>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
                  <tr>
                    <th className="text-left px-4 py-3">Oy</th>
                    <th className="text-center px-3 py-3">Skanerlash</th>
                    <th className="text-center px-3 py-3">PDF / Elektron</th>
                    <th className="text-center px-3 py-3">Texnik xizmat</th>
                    <th className="text-center px-3 py-3 font-bold text-slate-800">Jami</th>
                    <th className="text-center px-3 py-3">Kunliklar</th>
                    <th className="text-center px-4 py-3">Holat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {yearlyChartData.map((row) => {
                    const rep = myReports.find(r => r.type === REPORT_TYPES.MONTHLY && r.period === row.monthKey);
                    return (
                      <tr key={row.monthKey} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-medium text-slate-800">{row.fullName}</td>
                        <td className="text-center px-3 py-3 text-blue-700 font-semibold">{formatNumber(row.scanner)}</td>
                        <td className="text-center px-3 py-3 text-indigo-700 font-semibold">{formatNumber(row.pdf)}</td>
                        <td className="text-center px-3 py-3 text-teal-700 font-semibold">{formatNumber(row.texnik)}</td>
                        <td className="text-center px-3 py-3 font-bold text-slate-900 bg-slate-50/50">{formatNumber(row.jami)}</td>
                        <td className="text-center px-3 py-3 text-slate-500 font-mono text-xs">{row.actsCount} ta</td>
                        <td className="text-center px-4 py-3">
                          {rep ? (
                            <Badge color={REPORT_STATUS_COLORS[rep.status] || 'blue'}>
                              {REPORT_STATUS_LABELS[rep.status] || rep.status}
                            </Badge>
                          ) : row.jami > 0 ? (
                            <span className="text-xs text-amber-600 font-medium">Yuborilmagan</span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 3: KUNLIK HISOBOTLAR ("har kuni bo'lishi shart")
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'daily_records' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white border border-slate-200">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Oy filtri:</label>
                <input
                  type="month"
                  value={dailyMonthFilter}
                  onChange={e => setDailyMonthFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-slate-50 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Xodim filtri:</label>
                <select
                  value={staffFilter}
                  onChange={e => setStaffFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-slate-50 font-medium"
                >
                  <option value="all">Barcha xodimlar</option>
                  {myStaff.map(s => (
                    <option key={s.id} value={s.id}>{s.fullName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={() => handleSendDailyToAdmins(today)}
                disabled={isSubmitting}
                className="bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white shadow-sm text-xs"
              >
                <ICONS.paperPlane /> Bugungi jamlanmani Super & Viloyat Adminga yuborish
              </Button>

              <Button
                onClick={() => setShowDailyAddModal(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
              >
                <ICONS.plus /> O'z kunlik faoliyatimni kiritish
              </Button>
            </div>
          </div>

          {filteredDailyActs.length === 0 ? (
            <EmptyState
              icon={ICONS.activity}
              title="Kunlik hisobotlar topilmadi"
              description={`${getMonthName(dailyMonthFilter)} uchun kunlik faoliyatlar mavjud emas.`}
            />
          ) : (
            <Card noPadding>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
                    <tr>
                      <th className="text-left px-4 py-3">Sana va vaqt</th>
                      <th className="text-left px-4 py-3">Xodim</th>
                      <th className="text-center px-3 py-3">Scanner</th>
                      <th className="text-center px-3 py-3">PDF</th>
                      <th className="text-center px-3 py-3">Post/E'lon</th>
                      <th className="text-center px-3 py-3">Texnik</th>
                      <th className="text-center px-3 py-3">Jihozlash</th>
                      <th className="text-center px-3 py-3">Holat</th>
                      <th className="text-center px-4 py-3">Amal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDailyActs.map(act => {
                      const d = parseData(act);
                      const u = allUsers.find(user => user.id === act.userId);
                      const isHead = act.userId === currentUser?.id;
                      const isSentToAdmin = myReports.some(r =>
                        (r.type === 'daily' || r.type === REPORT_TYPES.DAILY) &&
                        r.period === act.date &&
                        r.status === REPORT_STATUS.SUBMITTED
                      );

                      return (
                        <tr key={act.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-800 font-medium whitespace-nowrap">
                            {formatDate(act.date)}
                            {act.time && <span className="text-xs text-slate-400 ml-1.5 font-mono">{act.time}</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                                isHead ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'
                              }`}>
                                {u?.fullName?.charAt(0) || 'X'}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900 leading-tight">
                                  {u?.fullName || 'Noma\'lum xodim'} {isHead && <span className="text-[10px] text-amber-600 font-normal">(Siz)</span>}
                                </p>
                                <p className="text-[11px] text-slate-500">{u?.phone || myLibrary?.name || 'Kutubxona'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="text-center px-3 py-3 font-semibold text-blue-700">
                            {d.kitob_skanerlash ? formatNumber(d.kitob_skanerlash) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="text-center px-3 py-3 font-semibold text-indigo-700">
                            {d.kitob_pdf ? formatNumber(d.kitob_pdf) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="text-center px-3 py-3 font-semibold text-purple-700">
                            {d.ijtimoiy_tarmoq ? formatNumber(d.ijtimoiy_tarmoq) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="text-center px-3 py-3 font-semibold text-teal-700">
                            {d.texnik_xizmat ? formatNumber(d.texnik_xizmat) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="text-center px-3 py-3 font-semibold text-amber-700">
                            {d.jihozlash ? formatNumber(d.jihozlash) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="text-center px-3 py-3">
                            <Badge color={ACT_STATUS_COLORS[act.status] || 'blue'}>
                              {ACT_STATUS_LABELS[act.status] || act.status}
                            </Badge>
                          </td>
                          <td className="text-center px-4 py-3">
                            {act.status === 'sent' && !isHead ? (
                              <button
                                onClick={() => handleAcceptDaily(act)}
                                className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium"
                              >
                                Qabul qilish
                              </button>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5">
                                {isSentToAdmin ? (
                                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                                    Adminga yuborilgan
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleSendDailyToAdmins(act)}
                                    disabled={isSubmitting}
                                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1"
                                    title="Super Admin va Viloyat Adminiga jo'natish"
                                  >
                                    <ICONS.paperPlane className="text-[10px]" /> Adminga jo'natish
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 4: SUPER & VILOYAT ADMINGA YUBORILGANLAR
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'monitoring' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 text-xs text-purple-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ICONS.shield className="text-base text-purple-600" />
              <span>Ushbu bo'limda siz tomondan Super Admin va Viloyat Adminiga yuborilgan rasmiy hisobotlar monitoring qilinadi.</span>
            </div>
            <span className="font-bold text-purple-800">{sentReports.length} ta yuborilgan</span>
          </div>

          {sentReports.length === 0 ? (
            <EmptyState
              icon={ICONS.paperPlane}
              title="Hali yuborilgan hisobotlar yo'q"
              description="Oylik yoki yillik hisobotni shakllantirib, Super Admin va Viloyat Adminiga jo'natishingiz mumkin."
            />
          ) : (
            <div className="space-y-3">
              {sentReports.map(rep => {
                const repData = parseData(rep);
                const recipients = repData?.targetRecipients || ['super_admin', 'viloyat_admin'];
                return (
                  <div
                    key={rep.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-purple-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-bold text-slate-900">{rep.title}</h4>
                        <Badge color={REPORT_STATUS_COLORS[rep.status] || 'blue'}>
                          {REPORT_STATUS_LABELS[rep.status] || rep.status}
                        </Badge>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                          {rep.type === REPORT_TYPES.ANNUAL ? 'Yillik' : 'Oylik'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Davr: <strong className="text-slate-800 font-mono">{rep.period}</strong> |
                        Yuborilgan sana: <strong className="text-slate-700">{formatDate(rep.submittedAt || rep.createdAt)}</strong>
                      </p>
                      <div className="flex items-center gap-2 text-xs text-purple-700 pt-1">
                        <ICONS.paperPlane className="text-xs" />
                        <span>Qabul qiluvchilar: <strong>{repData?.sentToText || (recipients.includes('super_admin') && recipients.includes('viloyat_admin') ? 'Super Admin va Viloyat Admini' : 'Admin')}</strong></span>
                      </div>

                      {rep.reviewComment && (
                        <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                          <strong>Admin mulohazasi:</strong> {rep.reviewComment}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setDetailReport(rep)}
                      >
                        <ICONS.eye /> Batafsil ko'rish
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 5: IJTIMOIY TARMOQLAR HISOBOTI (Kunlik / Oylik / Yillik)
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'social_media' && (
        <SocialMediaReportsView
          activities={allActs.filter(a =>
            a.libraryId === currentUser?.libraryId ||
            a.userId === currentUser?.id ||
            myStaff.some(s => s.id === a.userId)
          )}
          users={allUsers}
          libraries={libraries}
          currentUser={currentUser}
          onOpenCreateModal={() => setShowSocialModal(true)}
          canCreate={true}
        />
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL: YANGI HISOBOT YARATISH (Oylik / Yillik)
      ══════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title={`Yangi ${createType === REPORT_TYPES.ANNUAL ? 'Yillik' : 'Oylik'} Hisobot shakllantirish`}
          size="xl"
          footer={
            <div className="flex flex-wrap items-center justify-between w-full gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
                disabled={isSubmitting}
              >
                Bekor qilish
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => handleSaveReport(false)}
                  disabled={isSubmitting}
                  className="border-slate-300 text-slate-700"
                >
                  <ICONS.save /> Qoralama sifatida saqlash
                </Button>

                <Button
                  onClick={() => handleSaveReport(true)}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white shadow-md shadow-indigo-600/30"
                >
                  {isSubmitting ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ICONS.paperPlane />
                  )}
                  Super & Viloyat Adminga jo'natish
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Top row: Type & Period */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hisobot turi:</label>
                <select
                  value={createType}
                  onChange={e => {
                    const nextType = e.target.value;
                    setCreateType(nextType);
                    const targetP = nextType === REPORT_TYPES.ANNUAL ? currentYearStr : nextType === REPORT_TYPES.DAILY ? today : currentMonthStr;
                    handlePeriodChange(targetP);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold bg-white"
                >
                  <option value={REPORT_TYPES.DAILY}>Kunlik hisobot</option>
                  <option value={REPORT_TYPES.MONTHLY}>Oylik hisobot</option>
                  <option value={REPORT_TYPES.ANNUAL}>Yillik hisobot</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Davr ({createType === REPORT_TYPES.ANNUAL ? 'Yil' : createType === REPORT_TYPES.DAILY ? 'Sana' : 'Oy'}):
                </label>
                {createType === REPORT_TYPES.ANNUAL ? (
                  <select
                    value={form.period}
                    onChange={e => handlePeriodChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold bg-white"
                  >
                    {availableYears.map(y => (
                      <option key={y} value={y}>{y}-yil</option>
                    ))}
                  </select>
                ) : createType === REPORT_TYPES.DAILY ? (
                  <input
                    type="date"
                    value={form.period}
                    onChange={e => handlePeriodChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold bg-white"
                  />
                ) : (
                  <input
                    type="month"
                    value={form.period}
                    onChange={e => handlePeriodChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold bg-white"
                  />
                )}
              </div>

              <div className="flex items-end">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handlePeriodChange(form.period)}
                  className="w-full border-teal-300 text-teal-700 hover:bg-teal-50"
                  title="Shu davrdagi kunlik hisobotlarni qayta jamlaydi"
                >
                  <ICONS.activity className="text-xs" /> Kunliklardan qayta jamlash
                </Button>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hisobot sarlavhasi:</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 bg-white"
                placeholder="Hisobot sarlavhasi..."
              />
            </div>

            {/* Recipient selection banner */}
            <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200">
              <label className="block text-xs font-bold text-purple-900 uppercase tracking-wider mb-2">
                Kimga yuboriladi (Qabul qiluvchilar):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  form.targetRecipients.includes('super_admin') && form.targetRecipients.includes('viloyat_admin')
                    ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="recipients_choice"
                    checked={form.targetRecipients.includes('super_admin') && form.targetRecipients.includes('viloyat_admin')}
                    onChange={() => setForm({ ...form, targetRecipients: ['super_admin', 'viloyat_admin'] })}
                    className="sr-only"
                  />
                  <span>Super Admin & Viloyat Adminiga (Tavsiya)</span>
                </label>

                <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  form.targetRecipients.length === 1 && form.targetRecipients.includes('super_admin')
                    ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="recipients_choice"
                    checked={form.targetRecipients.length === 1 && form.targetRecipients.includes('super_admin')}
                    onChange={() => setForm({ ...form, targetRecipients: ['super_admin'] })}
                    className="sr-only"
                  />
                  <span>Faqat Super Adminga</span>
                </label>

                <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  form.targetRecipients.length === 1 && form.targetRecipients.includes('viloyat_admin')
                    ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="recipients_choice"
                    checked={form.targetRecipients.length === 1 && form.targetRecipients.includes('viloyat_admin')}
                    onChange={() => setForm({ ...form, targetRecipients: ['viloyat_admin'] })}
                    className="sr-only"
                  />
                  <span>Faqat Viloyat Adminiga</span>
                </label>
              </div>
            </div>

            {/* Numeric Indicators (Inputs) */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Faoliyat ko'rsatkichlari (Kunlik hisobotlardan jamlangan)
                </p>
                <span className="text-xs text-teal-700 font-bold">
                  Jami: {formatNumber(Object.values(form.counts).reduce((s, v) => s + Number(v || 0), 0))} ta ish
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(TYPE_SHORT).map(([k, label]) => (
                  <div key={k} className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">{label}</label>
                    <input
                      type="number"
                      min="0"
                      value={form.counts[k] || ''}
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                        setForm(prev => ({
                          ...prev,
                          counts: { ...prev.counts, [k]: val }
                        }));
                      }}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-bold text-slate-900 text-sm"
                    />
                  </div>
                ))}
              </div>

              {/* Extra optional indicators */}
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tashriflar soni</label>
                  <input
                    type="number"
                    min="0"
                    value={form.visitors || ''}
                    onChange={e => setForm({ ...form, visitors: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-bold text-slate-900 text-sm"
                    placeholder="0"
                  />
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tadbirlar soni</label>
                  <input
                    type="number"
                    min="0"
                    value={form.events || ''}
                    onChange={e => setForm({ ...form, events: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-bold text-slate-900 text-sm"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Description / Summary */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hisobot mazmuni va xodimlar hissasi izohi:</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white"
                placeholder="Hisobot haqida qisqacha ma'lumot..."
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL: HISOBOTNI BATAFSIL KO'RISH VA CHOP ETISH
      ══════════════════════════════════════════════════════════ */}
      {detailReport && (
        <Modal
          isOpen={!!detailReport}
          onClose={() => setDetailReport(null)}
          title="Hisobot tafsilotlari"
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="secondary"
                onClick={() => window.print()}
                className="text-xs"
              >
                <ICONS.download /> Chop etish (Print)
              </Button>

              <div className="flex items-center gap-2">
                {detailReport.status === REPORT_STATUS.DRAFT && (
                  <Button
                    onClick={() => handleDirectSubmit(detailReport.id, ['super_admin', 'viloyat_admin'])}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs"
                  >
                    <ICONS.paperPlane /> Super & Viloyat Adminga jo'natish
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setDetailReport(null)}>
                  Yopish
                </Button>
              </div>
            </div>
          }
        >
          {(() => {
            const data = parseData(detailReport);
            const totals = data.totals || {};
            const grandTotal = data.grandTotal || Object.values(totals).reduce((s, v) => s + Number(v || 0), 0);
            const recipients = data.targetRecipients || ['super_admin', 'viloyat_admin'];

            return (
              <div className="space-y-4 text-slate-800 print:text-black">
                {/* Header banner */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-teal-50 via-slate-50 to-indigo-50 border border-slate-200">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                        {detailReport.type === REPORT_TYPES.ANNUAL ? 'Yillik rasmiy hisobot' : 'Oylik rasmiy hisobot'}
                      </span>
                      <h3 className="text-base font-black text-slate-900 mt-0.5">{detailReport.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Davr: <strong className="font-mono text-slate-800">{detailReport.period}</strong> |
                        Kutubxona: <strong>{myLibrary?.name || 'AKM'}</strong> |
                        Tuzuvchi: <strong>{currentUser?.fullName} (Bo'lim boshlig'i)</strong>
                      </p>
                    </div>
                    <Badge color={REPORT_STATUS_COLORS[detailReport.status] || 'blue'}>
                      {REPORT_STATUS_LABELS[detailReport.status] || detailReport.status}
                    </Badge>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-purple-800 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <ICONS.paperPlane className="text-xs" />
                      Qabul qiluvchi: {data.sentToText || (recipients.includes('super_admin') && recipients.includes('viloyat_admin') ? 'Super Admin va Viloyat Admini' : 'Admin')}
                    </span>
                    <span className="text-slate-500 font-mono">
                      Sana: {formatDate(detailReport.submittedAt || detailReport.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {detailReport.description && (
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                    <strong>Hisobot mazmuni:</strong> {detailReport.description}
                  </div>
                )}

                {/* Numbers grid */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Bajarilgan ishlar hajmi
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {Object.entries(TYPE_SHORT).map(([k, label]) => (
                      <div key={k} className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs">
                        <p className="text-[11px] text-slate-500 font-medium">{label}</p>
                        <p className="text-base font-extrabold text-slate-900 mt-0.5">
                          {formatNumber(totals[k] || 0)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2.5 p-3 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-800 uppercase">Jami bajarilgan ishlar:</span>
                    <span className="text-lg font-black text-teal-900">{formatNumber(grandTotal)} ta ish</span>
                  </div>
                </div>

                {/* Staff contributions breakdown */}
                {data.staffContributions && Object.keys(data.staffContributions).length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Xodimlar hissasi taqsimoti
                    </h4>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-semibold">
                          <tr>
                            <th className="text-left px-3 py-2">Xodim</th>
                            <th className="text-right px-3 py-2">Bajargan ishlari soni</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Object.entries(data.staffContributions).map(([name, sum]) => (
                            <tr key={name} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-medium text-slate-800">{name}</td>
                              <td className="px-3 py-2 text-right font-bold text-teal-700">{formatNumber(sum)} ta</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Admin review comment */}
                {detailReport.reviewComment && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    <strong className="block font-bold mb-0.5">Admin xulosasi / Izohi:</strong>
                    {detailReport.reviewComment}
                    {detailReport.reviewedAt && (
                      <span className="block text-[11px] text-amber-700 mt-1 font-mono">
                        Ko'rib chiqilgan: {formatDate(detailReport.reviewedAt)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL: BO'LIM BOSHLIG'I O'Z KUNLIK HISOBOTI
      ══════════════════════════════════════════════════════════ */}
      {showDailyAddModal && (
        <Modal
          isOpen={showDailyAddModal}
          onClose={() => setShowDailyAddModal(false)}
          title="O'zim bajargan kunlik faoliyatni kiritish"
          size="lg"
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowDailyAddModal(false)}>Bekor qilish</Button>
              <Button onClick={handleSaveHeadDaily}><ICONS.save /> Saqlash</Button>
            </>
          }
        >
          <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
            {/* Section 1: Skanerlash va elektronlashtirish (son kiritish) */}
            <div>
              <div className="flex items-center gap-2 mb-2 pb-1 border-b border-slate-100">
                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800">
                  Skanerlash va Raqamlashtirish (Son kiritish)
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Skanerlash */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  Number(dailyForm.counts.kitob_skanerlash) > 0 ? 'border-teal-400 bg-teal-50/60 shadow-xs' : 'border-slate-200 bg-white'
                }`}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">
                        <ICONS.document className="text-sm" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Skanerlash ishlari</p>
                        <p className="text-[11px] text-slate-400">Kitoblar soni</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-teal-600 bg-teal-100/70 px-2 py-0.5 rounded-md">ta kitob</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={dailyForm.counts.kitob_skanerlash}
                      onChange={e => setDailyForm(f => ({ ...f, counts: { ...f.counts, kitob_skanerlash: e.target.value } }))}
                      placeholder="Masalan: 5"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-teal-300"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 pointer-events-none">ta kitob</span>
                  </div>
                </div>

                {/* Elektronlashtirish / PDF */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  Number(dailyForm.counts.kitob_pdf) > 0 ? 'border-indigo-400 bg-indigo-50/60 shadow-xs' : 'border-slate-200 bg-white'
                }`}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                        <ICONS.upload className="text-sm" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Elektronlashtirish / PDF</p>
                        <p className="text-[11px] text-slate-400">PDF shaklga keltirilgan</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded-md">fayl</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={dailyForm.counts.kitob_pdf}
                      onChange={e => setDailyForm(f => ({ ...f, counts: { ...f.counts, kitob_pdf: e.target.value } }))}
                      placeholder="Masalan: 8"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 pointer-events-none">fayl</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Texnik xizmat, jihoz va tarmoqlar (Checkbox + Faol bo'lsa Izoh) */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2 pb-1 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800">
                    Texnik xizmat, jihoz va ta'mirlash (Belgilash & Izoh)
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400">Bajarilgan ishlarni belgilang</span>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    key: 'texnik_xizmat',
                    label: "Texnik xizmat ko'rsatish",
                    subtitle: "Kompyuterlar, dasturiy ta'minot va qurilmalar profilaktikasi",
                    placeholder: "Qanday texnik xizmat ko'rsatildi? (Masalan: kompyuterlar profilaktika qilindi, drayverlar yangilandi)...",
                  },
                  {
                    key: 'jihozlash',
                    label: "Jihozlash va tarmoq sozlash",
                    subtitle: "Lokal tarmoq (LAN/Wi-Fi), server, kabel va jihozlarni sozlash",
                    placeholder: "Tarmoq yoki jihoz sozlash haqida izoh (Masalan: Wi-Fi router sozlandi, kabel ulandi)...",
                  },
                  {
                    key: 'tuzatish',
                    label: "Ta'mirlash va sozlash",
                    subtitle: "Nosoz qurilmalar, printer, skaner va uskunalarni ta'mirlash",
                    placeholder: "Ta'mirlash haqida izoh (Masalan: Printer kartriji to'ldirildi, rolik almashtirildi)...",
                  },
                  {
                    key: 'boshqa',
                    label: "Boshqa ish tartibi vazifalari",
                    subtitle: "Rejadan tashqari boshqa amaliy va tashkiliy vazifalar",
                    placeholder: "Bajarilgan vazifa haqida izoh...",
                  },
                ].map(item => {
                  const isChecked = Boolean(dailyForm.tasks[item.key]);
                  return (
                    <div
                      key={item.key}
                      className={`p-3 rounded-xl border transition-all ${
                        isChecked
                          ? 'border-teal-300 bg-teal-50/40 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none pt-0.5 flex-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              const checked = e.target.checked;
                              setDailyForm(f => ({
                                ...f,
                                tasks: { ...f.tasks, [item.key]: checked },
                              }));
                            }}
                            className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 cursor-pointer accent-teal-600 shrink-0"
                          />
                          <div>
                            <p className={`text-xs font-bold leading-tight ${isChecked ? 'text-teal-900' : 'text-slate-800'}`}>
                              {item.label}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                              {item.subtitle}
                            </p>
                          </div>
                        </label>
                        <div className="ml-auto shrink-0">
                          {isChecked ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                              <ICONS.check className="text-[10px]" /> Faol
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">Bajarilmagan</span>
                          )}
                        </div>
                      </div>

                      {/* Izoh inputi: Agarda checkbox faol bo'lsa ishlashi kerak */}
                      <div className="mt-2.5 pl-6">
                        <input
                          type="text"
                          disabled={!isChecked}
                          value={dailyForm.notes[item.key] || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setDailyForm(f => ({
                              ...f,
                              notes: { ...f.notes, [item.key]: val },
                            }));
                          }}
                          placeholder={isChecked ? item.placeholder : "Izoh kiritish uchun yuqoridagi katakchani belgilang"}
                          className={`w-full px-3 py-1.5 text-xs rounded-lg border transition-all ${
                            isChecked
                              ? 'border-teal-300 bg-white text-slate-800 focus:ring-2 focus:ring-teal-300 focus:outline-none placeholder-slate-400'
                              : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed placeholder-slate-300'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Sana va Vaqt */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Sana</label>
                <input
                  type="date"
                  value={dailyForm.date}
                  onChange={e => setDailyForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Vaqt</label>
                <input
                  type="time"
                  value={dailyForm.time}
                  onChange={e => setDailyForm(f => ({ ...f, time: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-200"
                />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Ijtimoiy tarmoq hisoboti kiritish ── */}
      {showSocialModal && (
        <SocialMediaReportModal
          isOpen={showSocialModal}
          onClose={() => setShowSocialModal(false)}
          currentUser={currentUser}
          libraries={libraries}
          createEntity={createEntity}
        />
      )}
    </div>
  );
}
