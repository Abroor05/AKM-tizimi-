import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { ROLES, STORAGE_KEYS, REPORT_STATUS } from '../../data/constants.js';
import ICONS from '../icons.jsx';
import Button from '../ui/Button.jsx';

export default function ReportReminderBanner() {
  const { currentUser, getCollection, getReports } = useApp();
  const navigate = useNavigate();

  const [dismissedDaily, setDismissedDaily] = useState(false);
  const [dismissedMonthly, setDismissedMonthly] = useState(false);
  const [dismissedAnnual, setDismissedAnnual] = useState(false);

  const role = currentUser?.role;
  const isEligible = role === ROLES.KUTUBXONA_XODIMI || role === ROLES.XODIMLAR_BOSHLIGI;

  const activities = useMemo(() => getCollection(STORAGE_KEYS.ACTIVITIES) || [], [getCollection]);
  const reports = useMemo(() => getReports() || [], [getReports]);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentDay = now.getDate();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentPeriodMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();

  // 1. Kunlik hisobot tekshiruvi
  const hasDaily = useMemo(() => {
    if (!isEligible) return true;
    const hasAct = activities.some(
      (a) =>
        (a.userId === currentUser?.id || (role === ROLES.XODIMLAR_BOSHLIGI && a.libraryId === currentUser?.libraryId)) &&
        a.date === todayStr &&
        (a.type === 'daily_report' || a.type === 'daily') &&
        ['submitted', 'sent', 'accepted', 'completed'].includes(a.status)
    );
    const hasRep = reports.some(
      (r) =>
        (r.userId === currentUser?.id || (role === ROLES.XODIMLAR_BOSHLIGI && r.libraryId === currentUser?.libraryId)) &&
        r.type === 'daily' &&
        (r.period === todayStr || r.submittedAt === todayStr) &&
        ['submitted', 'approved', 'under_review'].includes(r.status)
    );
    return hasAct || hasRep;
  }, [activities, reports, currentUser, role, todayStr, isEligible]);

  // 2. Oylik hisobot tekshiruvi
  const hasMonthly = useMemo(() => {
    if (!isEligible) return true;
    return reports.some(
      (r) =>
        (r.userId === currentUser?.id || (role === ROLES.XODIMLAR_BOSHLIGI && r.libraryId === currentUser?.libraryId)) &&
        r.type === 'monthly' &&
        r.period === currentPeriodMonth &&
        ['submitted', 'approved', 'under_review'].includes(r.status)
    );
  }, [reports, currentUser, role, currentPeriodMonth, isEligible]);

  // 3. Yillik hisobot tekshiruvi
  const hasAnnual = useMemo(() => {
    if (!isEligible) return true;
    return reports.some(
      (r) =>
        (r.userId === currentUser?.id || (role === ROLES.XODIMLAR_BOSHLIGI && r.libraryId === currentUser?.libraryId)) &&
        r.type === 'annual' &&
        (r.period === String(currentYear) || String(r.period).includes(String(currentYear))) &&
        ['submitted', 'approved', 'under_review'].includes(r.status)
    );
  }, [reports, currentUser, role, currentYear, isEligible]);

  if (!isEligible) return null;

  const isMonthlyPreDue = (currentDay === 29 || currentDay === lastDayOfMonth - 1) && !hasMonthly;
  const isMonthlyDueToday = (currentDay >= 30 || currentDay === lastDayOfMonth) && !hasMonthly;
  const isAnnualDue = currentMonth === 12 && currentDay >= 25 && !hasAnnual;

  const monthNames = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
  ];
  const currentMonthName = monthNames[currentMonth - 1];

  const dailyRedirectPath = role === ROLES.XODIMLAR_BOSHLIGI ? '/xb-activity' : '/daily-activity';
  const monthlyRedirectPath = role === ROLES.XODIMLAR_BOSHLIGI ? '/xb-activity' : '/reports';

  return (
    <div className="space-y-3 mb-5">
      {/* 1. OYLIK HISOBOT BUGUN OXIRGI KUN (30-sana yoki oy oxiri) */}
      {isMonthlyDueToday && !dismissedMonthly && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 p-4 sm:p-5 text-white shadow-lg shadow-rose-900/20 border border-rose-500/30 animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 text-white text-lg">
                <ICONS.warning />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-white text-rose-700">
                    Oxirgi muddat
                  </span>
                  <h4 className="font-bold text-sm sm:text-base">
                    DIQQAT: Bugun {currentMonthName} oylik hisobotini topshirish kuni!
                  </h4>
                </div>
                <p className="text-xs sm:text-sm text-rose-100 mt-1">
                  Bugun {currentDay}-sana. Joriy oy yakunlari bo'yicha oylik hisobot hali topshirilmadi. Iltimos, hisobotni kechiktirmasdan topshiring.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="light"
                onClick={() => navigate(monthlyRedirectPath)}
                className="bg-white text-rose-700 hover:bg-rose-50 font-bold border-none shadow-sm"
              >
                Oylik hisobotni topshirish
              </Button>
              <button
                onClick={() => setDismissedMonthly(true)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-rose-200 hover:text-white transition-colors"
                title="Yopish"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. OYLIK HISOBOT ERTAGA TOPSHIRISH KERAK (29-sana) */}
      {isMonthlyPreDue && !isMonthlyDueToday && !dismissedMonthly && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 p-4 sm:p-5 text-white shadow-lg shadow-amber-900/20 border border-amber-500/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 text-white text-lg">
                <ICONS.calendar />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-white text-amber-800">
                    Ertaga topshiriladi
                  </span>
                  <h4 className="font-bold text-sm sm:text-base">
                    Eslatma: Ertaga {currentMonthName} oylik hisobotini topshirishingiz kerak!
                  </h4>
                </div>
                <p className="text-xs sm:text-sm text-amber-100 mt-1">
                  Sana {currentDay}-ga yetdi. Ertaga oylik hisobot topshirish muddati. Barcha ko'rsatkichlarni hozirdan tekshirib tayyorlab qo'ying.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="light"
                onClick={() => navigate(monthlyRedirectPath)}
                className="bg-white text-amber-800 hover:bg-amber-50 font-bold border-none shadow-sm"
              >
                Hisobotni tayyorlash
              </Button>
              <button
                onClick={() => setDismissedMonthly(true)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-amber-200 hover:text-white transition-colors"
                title="Yopish"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. KUNLIK HISOBOT TOPSHIRILMAGAN (Har kungi eslatma) */}
      {!hasDaily && !dismissedDaily && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-700 via-blue-700 to-sky-700 p-4 sm:p-5 text-white shadow-lg shadow-indigo-950/20 border border-indigo-500/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 text-white text-lg">
                <ICONS.reports />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-white text-indigo-800">
                    Kunlik hisobot
                  </span>
                  <h4 className="font-bold text-sm sm:text-base">
                    Bugungi kunlik hisobot hali topshirilmadi!
                  </h4>
                </div>
                <p className="text-xs sm:text-sm text-indigo-100 mt-1">
                  {role === ROLES.XODIMLAR_BOSHLIGI
                    ? "Bugungi kungi xodimlar faoliyatini tekshiring, tasdiqlang va ma'muriyatga taqdim eting."
                    : "Bugungi ish kuni davomida bajarilgan kitob skanerlash, PDF va boshqa ishlarni to'ldiring va topshiring."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="light"
                onClick={() => navigate(dailyRedirectPath)}
                className="bg-white text-indigo-800 hover:bg-indigo-50 font-bold border-none shadow-sm"
              >
                Kunlik hisobotni topshirish
              </Button>
              <button
                onClick={() => setDismissedDaily(true)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-indigo-200 hover:text-white transition-colors"
                title="Yopish"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. YILLIK HISOBOT ESLATMASI (Dekabr oyida) */}
      {isAnnualDue && !dismissedAnnual && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-800 p-4 sm:p-5 text-white shadow-lg shadow-purple-950/20 border border-purple-500/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 text-white text-lg">
                <ICONS.calendar />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-white text-violet-800">
                    Yillik hisobot
                  </span>
                  <h4 className="font-bold text-sm sm:text-base">
                    {currentYear}-yil yakuniy yillik hisoboti topshirilishi kerak!
                  </h4>
                </div>
                <p className="text-xs sm:text-sm text-purple-100 mt-1">
                  Yil yakunlanmoqda. Kutubxonaning {currentYear}-yil bo'yicha yillik sarhisob hisobotini shakllantirib yuboring.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="light"
                onClick={() => navigate('/reports')}
                className="bg-white text-violet-800 hover:bg-purple-50 font-bold border-none shadow-sm"
              >
                Yillik hisobotga o'tish
              </Button>
              <button
                onClick={() => setDismissedAnnual(true)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-purple-200 hover:text-white transition-colors"
                title="Yopish"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

