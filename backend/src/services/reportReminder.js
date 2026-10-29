import { query, insertRow, updateRow } from '../db/database.js';

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Throttle map to prevent multiple heavy checks within 30 seconds for the same user
const userLastChecked = new Map();

/**
 * Check if the user has pending reports (daily, monthly, annual)
 * and generate notifications if deadlines/conditions match.
 */
export async function checkAndGenerateUserReportReminders(user) {
  if (!user || !user.id) return null;

  // Only library staff and department heads are responsible for operational daily/monthly submissions
  const eligibleRoles = ['kutubxona_xodimi', 'xodimlar_boshligi'];
  if (!eligibleRoles.includes(user.role)) {
    return null;
  }

  // Throttle check (max once every 30 seconds per user)
  const nowMs = Date.now();
  const lastCheck = userLastChecked.get(user.id) || 0;
  if (nowMs - lastCheck < 30 * 1000) {
    return null;
  }
  userLastChecked.set(user.id, nowMs);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0]; // 'YYYY-MM-DD'
  const currentDay = now.getDate(); // 1-31
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();
  const currentPeriodMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate(); // 28, 29, 30, 31

  const userLibraryId = user.libraryId || user.library_id || null;

  const result = {
    dailyPending: false,
    monthlyPending: false,
    annualPending: false,
    createdNotifications: [],
  };

  try {
    // ----------------------------------------------------
    // 1. KUNLIK HISOBOT (Daily Report) TEKSHIRUVI
    // ----------------------------------------------------
    // Faoliyatlar (activities) jadvalidan bugungi yuborilgan hisobotni tekshirish
    const actRes = await query(
      `SELECT id FROM activities 
       WHERE user_id = ? AND date = ? 
       AND (type = 'daily_report' OR type = 'daily') 
       AND status IN ('submitted', 'sent', 'accepted', 'completed') LIMIT 1`,
      [user.id, todayStr]
    );

    // Reports jadvalidan ham bugungi kunlik hisobotni tekshirish
    const repRes = await query(
      `SELECT id FROM reports 
       WHERE (user_id = ? OR library_id = ?) 
       AND type = 'daily' 
       AND (period = ? OR submitted_at = ?) 
       AND status IN ('submitted', 'approved', 'under_review') LIMIT 1`,
      [user.id, userLibraryId || '', todayStr, todayStr]
    );

    const hasDailySubmitted =
      (actRes.rows && actRes.rows.length > 0) ||
      (repRes.rows && repRes.rows.length > 0);

    if (!hasDailySubmitted) {
      result.dailyPending = true;

      // Bugun uchun ushbu xodimga kunlik hisobot bildirishnomasi allaqachon yuborilganmi?
      const existingDailyNotif = await query(
        `SELECT id FROM notifications 
         WHERE target_user_id = ? AND date = ? 
         AND title LIKE '%Kunlik hisobot%' LIMIT 1`,
        [user.id, todayStr]
      );

      if (!existingDailyNotif.rows || existingDailyNotif.rows.length === 0) {
        const message =
          user.role === 'xodimlar_boshligi'
            ? "Bugungi kunlik hisobotni hali topshirmadingiz. Iltimos, xodimlarning hisobotlarini tekshirib umumlashtiring va ma'muriyatga yuboring."
            : "Bugungi kunlik hisobotni hali topshirmadingiz. Iltimos, ish kuni yakunlangunga qadar hisobotni to'ldiring va topshiring.";

        const notifObj = {
          id: generateId('notif_rep_daily'),
          type: 'report',
          title: 'Kunlik hisobot topshirish eslatmasi',
          message,
          target_role: user.role,
          target_user_id: user.id,
          date: todayStr,
          time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
          read: 0,
          created_at: now.toISOString(),
        };
        await insertRow('notifications', notifObj);
        result.createdNotifications.push(notifObj);
      }
    } else {
      // Agar bugungi hisobot topshirilgan bo'lsa, eslatma xabarini avtomatik o'qilgan (read=1) deb belgilash
      try {
        await query(
          `UPDATE notifications SET read = 1 
           WHERE target_user_id = ? AND date = ? AND title LIKE '%Kunlik hisobot%' AND read = 0`,
          [user.id, todayStr]
        );
      } catch {
        // e'tiborsiz qoldirish
      }
    }

    // ----------------------------------------------------
    // 2. OYLIK HISOBOT (Monthly Report) TEKSHIRUVI
    // ----------------------------------------------------
    // Joriy oy (YYYY-MM) uchun oylik hisobot topshirilganmi?
    const monthRepRes = await query(
      `SELECT id FROM reports 
       WHERE (user_id = ? OR library_id = ?) 
       AND type = 'monthly' 
       AND period = ? 
       AND status IN ('submitted', 'approved', 'under_review') LIMIT 1`,
      [user.id, userLibraryId || '', currentPeriodMonth]
    );

    const hasMonthlySubmitted = monthRepRes.rows && monthRepRes.rows.length > 0;

    if (!hasMonthlySubmitted) {
      // Oyning 29-sanasi (yoki oxirgi kunidan 1 kun oldin): "Ertaga topshirishingiz kerak"
      const isAdvanceDay = currentDay === 29 || currentDay === (lastDayOfMonth - 1);
      // Oyning 30-sanasi yoki undan keyingi (yoki oxirgi kuni): "Bugun topshirishingiz kerak"
      const isDueDay = currentDay >= 30 || currentDay === lastDayOfMonth;

      if (isAdvanceDay && !isDueDay) {
        result.monthlyPending = true;
        const existingPreNotif = await query(
          `SELECT id FROM notifications 
           WHERE target_user_id = ? AND date = ? 
           AND title LIKE '%Oylik hisobot: Ertaga%' LIMIT 1`,
          [user.id, todayStr]
        );

        if (!existingPreNotif.rows || existingPreNotif.rows.length === 0) {
          const notifObj = {
            id: generateId('notif_rep_month_pre'),
            type: 'report',
            title: 'Oylik hisobot: Ertaga topshirish muddati',
            message: `Ertaga ${currentPeriodMonth} oyi uchun oylik hisobotni topshirishning oxirgi kuni! Iltimos, barcha ko'rsatkichlarni tayyorlab qo'ying.`,
            target_role: user.role,
            target_user_id: user.id,
            date: todayStr,
            time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
            read: 0,
            created_at: now.toISOString(),
          };
          await insertRow('notifications', notifObj);
          result.createdNotifications.push(notifObj);
        }
      } else if (isDueDay) {
        result.monthlyPending = true;
        const existingDueNotif = await query(
          `SELECT id FROM notifications 
           WHERE target_user_id = ? AND date = ? 
           AND title LIKE '%DIQQAT: Bugun oylik hisobot%' LIMIT 1`,
          [user.id, todayStr]
        );

        if (!existingDueNotif.rows || existingDueNotif.rows.length === 0) {
          const notifObj = {
            id: generateId('notif_rep_month_due'),
            type: 'report',
            title: 'DIQQAT: Bugun oylik hisobot topshirish muddati!',
            message: `Bugun ${currentPeriodMonth} oyi uchun oylik hisobot topshirishning oxirgi kuni! Iltimos, hisobotingizni kechiktirmasdan tasdiqlashga yuboring.`,
            target_role: user.role,
            target_user_id: user.id,
            date: todayStr,
            time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
            read: 0,
            created_at: now.toISOString(),
          };
          await insertRow('notifications', notifObj);
          result.createdNotifications.push(notifObj);
        }
      }
    } else {
      // Oylik hisobot topshirilgan bo'lsa, mavjud oylik eslatmalarni read=1 qilish
      try {
        await query(
          `UPDATE notifications SET read = 1 
           WHERE target_user_id = ? AND title LIKE '%oylik hisobot%' AND read = 0`,
          [user.id]
        );
      } catch {
        // e'tiborsiz qoldirish
      }
    }

    // ----------------------------------------------------
    // 3. YILLIK HISOBOT (Annual Report) TEKSHIRUVI
    // ----------------------------------------------------
    // Agar dekabr oyi bo'lsa va sana 25-dan oshgan bo'lsa
    if (currentMonth === 12 && currentDay >= 25) {
      const yearStr = String(currentYear);
      const annRepRes = await query(
        `SELECT id FROM reports 
         WHERE (user_id = ? OR library_id = ?) 
         AND type = 'annual' 
         AND (period = ? OR period LIKE ?) 
         AND status IN ('submitted', 'approved', 'under_review') LIMIT 1`,
        [user.id, userLibraryId || '', yearStr, `%${yearStr}%`]
      );

      const hasAnnualSubmitted = annRepRes.rows && annRepRes.rows.length > 0;
      if (!hasAnnualSubmitted) {
        result.annualPending = true;
        const existingAnnualNotif = await query(
          `SELECT id FROM notifications 
           WHERE target_user_id = ? AND date = ? 
           AND title LIKE '%Yillik hisobot%' LIMIT 1`,
          [user.id, todayStr]
        );

        if (!existingAnnualNotif.rows || existingAnnualNotif.rows.length === 0) {
          const notifObj = {
            id: generateId('notif_rep_annual'),
            type: 'report',
            title: 'Yillik hisobot topshirish eslatmasi',
            message: `${currentYear}-yil yakunlari bo'yicha yillik hisobotni topshirish muddati keldi. Iltimos, yillik hisobotni to'ldirib tasdiqlashga yuboring.`,
            target_role: user.role,
            target_user_id: user.id,
            date: todayStr,
            time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
            read: 0,
            created_at: now.toISOString(),
          };
          await insertRow('notifications', notifObj);
          result.createdNotifications.push(notifObj);
        }
      }
    }

    return result;
  } catch (err) {
    console.error('checkAndGenerateUserReportReminders xatosi:', err.message);
    return null;
  }
}

/**
 * Periodically check report reminders for all staff in background
 */
export async function checkAllStaffReportReminders() {
  try {
    const usersRes = await query(
      `SELECT id, role, library_id, viloyat_id, tuman_id 
       FROM users 
       WHERE role IN ('kutubxona_xodimi', 'xodimlar_boshligi')`
    );
    for (const u of usersRes.rows) {
      await checkAndGenerateUserReportReminders(u);
    }
  } catch (err) {
    console.error('checkAllStaffReportReminders xatosi:', err.message);
  }
}

