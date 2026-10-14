import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import ICONS from "../../components/icons.jsx";
import {
  STORAGE_KEYS,
  ROLES,
  ACTIVITY_TYPE_LABELS,
} from "../../data/constants.js";
import { formatDate, formatNumber } from "../../utils/helpers.js";

const TYPE_SHORT = {
  kitob_skanerlash: "Scanner",
  kitob_pdf: "PDF",
  texnik_xizmat: "Texnik",
  jihozlash: "Jihozlash",
  tuzatish: "Ta'mirlash",
  boshqa: "Boshqa",
};

// Status badge
const STATUS_COLORS = {
  draft: "gray",
  submitted: "blue",
  sent: "green",
  accepted: "emerald",
  completed: "green",
};
const STATUS_LABELS = {
  draft: "Qoralama",
  submitted: "Saqlangan",
  sent: "Yuborilgan",
  accepted: "Qabul qilindi",
  completed: "Yuborilgan",
};

const TASK_ACTIVITY_CONFIG = [
  {
    key: "texnik_xizmat",
    label: "Texnik xizmat ko'rsatish",
    subtitle: "Kompyuterlar, dasturiy ta'minot va qurilmalar profilaktikasi",
    placeholder:
      "Qanday texnik xizmat ko'rsatildi? (Masalan: kompyuterlar profilaktika qilindi, drayverlar yangilandi)...",
  },
  {
    key: "jihozlash",
    label: "Jihozlash va tarmoq sozlash",
    subtitle: "Lokal tarmoq (LAN/Wi-Fi), server, kabel va jihozlarni sozlash",
    placeholder:
      "Tarmoq yoki jihoz sozlash haqida izoh (Masalan: Wi-Fi router sozlandi, kabel ulandi)...",
  },
  {
    key: "tuzatish",
    label: "Ta'mirlash va sozlash",
    subtitle: "Nosoz qurilmalar, printer, skaner va uskunalarni ta'mirlash",
    placeholder:
      "Ta'mirlash haqida izoh (Masalan: Printer kartriji to'ldirildi, rolik almashtirildi)...",
  },
  {
    key: "boshqa",
    label: "Boshqa ish tartibi vazifalari",
    subtitle: "Rejadan tashqari boshqa amaliy va tashkiliy vazifalar",
    placeholder: "Bajarilgan vazifa haqida izoh...",
  },
];

function buildEmptyForm() {
  return {
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
    description: "",
    counts: {
      kitob_skanerlash: "",
      kitob_pdf: "",
    },
    tasks: {
      texnik_xizmat: false,
      jihozlash: false,
      tuzatish: false,
      boshqa: false,
    },
    notes: {
      texnik_xizmat: "",
      jihozlash: "",
      tuzatish: "",
      boshqa: "",
    },
  };
}

const VIEW_TABS = [
  { id: "daily", label: "Kunlik" },
  { id: "monthly", label: "Oylik" },
  { id: "yearly", label: "Yillik" },
];

function getMonthLabel(yyyy_mm) {
  if (!yyyy_mm) return "";
  const [y, m] = yyyy_mm.split("-");
  const months = [
    "Yanvar",
    "Fevral",
    "Mart",
    "Aprel",
    "May",
    "Iyun",
    "Iyul",
    "Avgust",
    "Sentabr",
    "Oktabr",
    "Noyabr",
    "Dekabr",
  ];
  return `${months[+m - 1]} ${y}`;
}

export default function DailyActivityPage() {
  const {
    currentUser,
    getCollection,
    createEntity,
    isRole,
    hasPermission,
    submitActivity,
  } = useApp();

  const [viewTab, setViewTab] = useState("daily");
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [sending, setSending] = useState(null); // activity id being sent
  const [dateFilter, setDateFilter] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [monthFilter, setMonthFilter] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [yearFilter, setYearFilter] = useState(
    new Date().getFullYear().toString(),
  );
  const [form, setForm] = useState(buildEmptyForm);

  const allActivities = useMemo(
    () => getCollection(STORAGE_KEYS.ACTIVITIES),
    [getCollection],
  );
  const libraries = useMemo(
    () => getCollection(STORAGE_KEYS.LIBRARIES),
    [getCollection],
  );
  const allUsers = useMemo(
    () => getCollection(STORAGE_KEYS.USERS),
    [getCollection],
  );

  const isXodim = isRole(ROLES.KUTUBXONA_XODIMI);

  const scopedLibIds = useMemo(() => {
    if (isRole(ROLES.SUPER_ADMIN)) return libraries.map((l) => l.id);
    if (isRole(ROLES.VILOYAT_ADMIN))
      return libraries
        .filter((l) => l.viloyatId === currentUser.viloyatId)
        .map((l) => l.id);
    if (isRole(ROLES.KUTUBXONA_XODIMI))
      return libraries
        .filter((l) => l.id === currentUser.libraryId)
        .map((l) => l.id);
    return libraries
      .filter(
        (l) =>
          l.viloyatId === currentUser.viloyatId &&
          l.tumanId === currentUser.tumanId,
      )
      .map((l) => l.id);
  }, [libraries, currentUser, isRole]);

  const activities = useMemo(() => {
    return allActivities.filter((a) => {
      if (a.type !== "daily_report") return false;
      if (isRole(ROLES.SUPER_ADMIN)) return true;
      if (a.userId === currentUser?.id) return true;
      if (currentUser?.libraryId && a.libraryId === currentUser.libraryId) return true;
      return scopedLibIds.includes(a.libraryId);
    });
  }, [allActivities, scopedLibIds, currentUser, isRole]);

  const filtered = useMemo(() => {
    let list = activities;
    if (viewTab === "daily") list = list.filter((a) => a.date === dateFilter);
    if (viewTab === "monthly")
      list = list.filter((a) => a.date?.startsWith(monthFilter));
    if (viewTab === "yearly")
      list = list.filter((a) => a.date?.startsWith(yearFilter));
    return list.sort(
      (a, b) =>
        new Date(b.date + "T" + (b.time || "00:00")) -
        new Date(a.date + "T" + (a.time || "00:00")),
    );
  }, [activities, viewTab, dateFilter, monthFilter, yearFilter]);

  const canCreate = hasPermission("create_activity");

  const handleSave = () => {
    const hasNumeric =
      Number(form.counts.kitob_skanerlash) > 0 ||
      Number(form.counts.kitob_pdf) > 0;
    const hasTasks = Object.values(form.tasks).some(Boolean);
    const hasDesc = Boolean(form.description?.trim());

    if (!hasNumeric && !hasTasks && !hasDesc) {
      alert("Kamida bitta faoliyat turini belgilang yoki sonini kiriting");
      return;
    }
    const data = {};
    if (Number(form.counts.kitob_skanerlash) > 0) {
      data.kitob_skanerlash = Number(form.counts.kitob_skanerlash);
    }
    if (Number(form.counts.kitob_pdf) > 0) {
      data.kitob_pdf = Number(form.counts.kitob_pdf);
    }
    const taskNotes = {};
    TASK_ACTIVITY_CONFIG.forEach((item) => {
      if (form.tasks[item.key]) {
        data[item.key] = 1;
        if (form.notes[item.key]?.trim()) {
          taskNotes[item.key] = form.notes[item.key].trim();
        }
      }
    });
    if (Object.keys(taskNotes).length > 0) {
      data.notes = taskNotes;
    }

    const descParts = [];
    if (form.description?.trim()) descParts.push(form.description.trim());
    Object.entries(taskNotes).forEach(([k, note]) => {
      const label = ACTIVITY_TYPE_LABELS[k] || k;
      descParts.push(`${label}: ${note}`);
    });

    const targetLibId =
      currentUser?.libraryId ||
      scopedLibIds[0] ||
      (libraries && libraries[0]?.id) ||
      null;

    try {
      createEntity(STORAGE_KEYS.ACTIVITIES, {
        type: "daily_report",
        data: JSON.stringify(data),
        description: descParts.join(" | ") || form.description || "",
        date: form.date,
        time: form.time,
        libraryId: targetLibId,
        userId: currentUser?.id,
        status: isRole(ROLES.KUTUBXONA_XODIMI) ? "submitted" : "accepted",
      });

      setDateFilter(form.date);
      setViewTab("daily");
      setShowModal(false);
      setForm(buildEmptyForm());
      alert("Kunlik hisobot muvaffaqiyatli saqlandi!");
    } catch (err) {
      alert("Hisobotni saqlashda xatolik yuz berdi: " + (err.message || "Noma'lum xatolik"));
    }
  };

  const handleSend = async (a) => {
    if (
      !confirm(
        `${formatDate(a.date)} kunlik hisobotni bolim boshligiga yuborasizmi?`,
      )
    )
      return;
    setSending(a.id);
    try {
      await submitActivity(a.id);
    } catch {
      alert("Yuborishda xato yuz berdi");
    } finally {
      setSending(null);
    }
  };

  const parseData = (a) => {
    try {
      return typeof a.data === "object" && a.data
        ? a.data
        : JSON.parse(a.data || "{}");
    } catch {
      return {};
    }
  };

  const monthTotals = useMemo(() => {
    const totals = {};
    Object.keys(ACTIVITY_TYPE_LABELS).forEach((k) => {
      totals[k] = 0;
    });
    filtered.forEach((a) => {
      const d = parseData(a);
      Object.entries(d).forEach(([k, v]) => {
        if (k !== "notes") {
          totals[k] = (totals[k] || 0) + Number(v || 0);
        }
      });
    });
    return totals;
  }, [filtered]);

  const yearOptions = Array.from({ length: 5 }, (_, i) =>
    String(new Date().getFullYear() - i),
  );

  return (
    <div>
      <PageHeader
        title="Kunlik faoliyat"
        subtitle="Kunlik bajarilgan ishlar hisoboti"
        icon={ICONS.activity}
        action={
          canCreate ? (
            <Button onClick={() => setShowModal(true)}>
              <ICONS.plus /> Bugungi hisobot
            </Button>
          ) : null
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setViewTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewTab === tab.id
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filtr */}
      <div className="mb-5">
        {viewTab === "daily" && (
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white"
          />
        )}
        {viewTab === "monthly" && (
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white"
          />
        )}
        {viewTab === "yearly" && (
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}-yil
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Oylik/yillik jami */}
      {(viewTab === "monthly" || viewTab === "yearly") &&
        filtered.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
            {Object.entries(ACTIVITY_TYPE_LABELS).map(([key, label]) => {
              const isNumeric =
                key === "kitob_skanerlash" || key === "kitob_pdf";
              const unit =
                key === "kitob_skanerlash"
                  ? "sahifa"
                  : key === "kitob_pdf"
                    ? "fayl"
                    : "marta";
              return (
                <Card key={key} className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {formatNumber(monthTotals[key] || 0)}
                    <span className="text-xs font-normal text-gray-400 ml-1">
                      {unit}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1 leading-tight">
                    {label}
                  </p>
                </Card>
              );
            })}
          </div>
        )}

      {/* Jadval */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ICONS.activity}
          title={
            viewTab === "daily"
              ? `${formatDate(dateFilter)} kuni uchun hisobot yo'q`
              : viewTab === "monthly"
                ? `${getMonthLabel(monthFilter)} uchun hisobot yo'q`
                : `${yearFilter}-yil uchun hisobot yo'q`
          }
          description={canCreate ? "Yangi hisobot qo'shing" : ""}
        />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Sana</th>
                  <th className="text-left px-4 py-3 font-medium">Kim</th>
                  {Object.entries(TYPE_SHORT).map(([k, v]) => (
                    <th
                      key={k}
                      className="text-center px-3 py-3 font-medium whitespace-nowrap"
                    >
                      {v}
                    </th>
                  ))}
                  <th className="text-left px-4 py-3 font-medium">Holat</th>
                  <th className="text-center px-4 py-3 font-medium">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((a) => {
                  const data = parseData(a);
                  const owner = allUsers.find((u) => u.id === a.userId);
                  const isMine = a.userId === currentUser?.id;
                  const todayStr = new Date().toISOString().split("T")[0];
                  const isAlreadySent =
                    a.status === "sent" ||
                    a.status === "accepted" ||
                    a.status === "completed" ||
                    (a.date && a.date < todayStr);
                  const canSend = isXodim && isMine && !isAlreadySent;
                  const badgeStatus =
                    isAlreadySent && a.status !== "accepted"
                      ? "sent"
                      : a.status;

                  return (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">
                        {formatDate(a.date)}
                        {a.time && (
                          <span className="text-xs text-gray-400 ml-1">
                            {a.time}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {owner?.fullName?.charAt(0) || "X"}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 leading-tight">
                              {owner?.fullName || "—"}
                            </p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <ICONS.library className="text-[10px] text-slate-400 shrink-0" />
                              <span className="truncate max-w-[150px]">
                                {libraries.find(
                                  (l) =>
                                    l.id === a.libraryId ||
                                    l.id === owner?.libraryId,
                                )?.name || "Kutubxona"}
                              </span>
                            </p>
                          </div>
                        </div>
                      </td>
                      {Object.keys(TYPE_SHORT).map((k) => {
                        const val = data[k];
                        const isNumeric =
                          k === "kitob_skanerlash" || k === "kitob_pdf";
                        if (isNumeric) {
                          return (
                            <td
                              key={k}
                              className="text-center px-3 py-3 font-semibold text-gray-800"
                            >
                              {val ? (
                                formatNumber(val)
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          );
                        }
                        const isDone = Boolean(val && Number(val) > 0);
                        const note = data?.notes?.[k];
                        return (
                          <td key={k} className="text-center px-3 py-3">
                            {isDone ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                title={note ? `Izoh: ${note}` : "Bajarildi"}
                              >
                                <ICONS.check className="text-[10px]" />{" "}
                                Bajarildi
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3">
                        <Badge color={STATUS_COLORS[badgeStatus] || "green"}>
                          {STATUS_LABELS[badgeStatus] || "Yuborilgan"}
                        </Badge>
                      </td>
                      <td className="text-center px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {/* Ko'rish */}
                          <button
                            onClick={() => setShowDetail(a)}
                            className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                            title="Ko'rish"
                          >
                            <ICONS.eye className="text-sm" />
                          </button>
                          {/* Yuborish — faqat bugungi, o'z hisoboti va hali yuborilmagan bo'lsa */}
                          {canSend && (
                            <button
                              onClick={() => handleSend(a)}
                              disabled={sending === a.id}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium disabled:opacity-50"
                              title="Bo'lim boshlig'iga yuborish"
                            >
                              {sending === a.id ? (
                                <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <ICONS.paperPlane className="text-xs" />
                              )}
                              Yuborish
                            </button>
                          )}
                          {/* Yuborilgan / Qabul qilingan holat belgisi */}
                          {isAlreadySent && (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium whitespace-nowrap">
                              <ICONS.check className="text-xs" />{" "}
                              {a.status === "accepted"
                                ? "Qabul qilindi"
                                : "Yuborilgan"}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Hisobot qo'shish modali */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setForm(buildEmptyForm());
        }}
        title="Bugungi faoliyat hisoboti"
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                setForm(buildEmptyForm());
              }}
            >
              Bekor
            </Button>
            <Button onClick={handleSave}>
              <ICONS.save /> Saqlash
            </Button>
          </>
        }
      >
        <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
          {/* Section 1: Skanerlash va elektronlashtirish (son kiritish) */}
          <div>
            <div className="flex items-center gap-2 mb-2 pb-1 border-b border-gray-100">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Skanerlash va Raqamlashtirish (Son kiritish)
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Skanerlash */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  Number(form.counts.kitob_skanerlash) > 0
                    ? "border-blue-400 bg-blue-50/60 shadow-xs"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                      <ICONS.document className="text-sm" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">
                        Skanerlash ishlari
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Kitob va materiallar
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded-md">
                    sahifa
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={form.counts.kitob_skanerlash}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        counts: {
                          ...f.counts,
                          kitob_skanerlash: e.target.value,
                        },
                      }))
                    }
                    placeholder="Masalan: 45"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-gray-400 pointer-events-none">
                    sahifa
                  </span>
                </div>
              </div>

              {/* Elektronlashtirish / PDF */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  Number(form.counts.kitob_pdf) > 0
                    ? "border-indigo-400 bg-indigo-50/60 shadow-xs"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                      <ICONS.upload className="text-sm" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">
                        Elektronlashtirish / PDF
                      </p>
                      <p className="text-[11px] text-gray-400">
                        PDF shaklga keltirilgan
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded-md">
                    fayl
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={form.counts.kitob_pdf}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        counts: { ...f.counts, kitob_pdf: e.target.value },
                      }))
                    }
                    placeholder="Masalan: 8"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-gray-400 pointer-events-none">
                    fayl
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Texnik xizmat, jihoz va tarmoqlar (Checkbox + Faol bo'lsa Izoh) */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2 pb-1 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Texnik xizmat, jihoz va ta'mirlash (Belgilash & Izoh)
                </h4>
              </div>
              <span className="text-[11px] text-gray-400">
                Bajarilgan ishlarni belgilang
              </span>
            </div>

            <div className="space-y-2.5">
              {TASK_ACTIVITY_CONFIG.map((item) => {
                const isChecked = Boolean(form.tasks[item.key]);
                return (
                  <div
                    key={item.key}
                    className={`p-3 rounded-xl border transition-all ${
                      isChecked
                        ? "border-emerald-300 bg-emerald-50/40 shadow-xs"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none pt-0.5 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setForm((f) => ({
                              ...f,
                              tasks: { ...f.tasks, [item.key]: checked },
                            }));
                          }}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 cursor-pointer accent-emerald-600 shrink-0"
                        />
                        <div>
                          <p
                            className={`text-xs font-bold leading-tight ${isChecked ? "text-emerald-900" : "text-gray-800"}`}
                          >
                            {item.label}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                            {item.subtitle}
                          </p>
                        </div>
                      </label>
                      <div className="ml-auto shrink-0">
                        {isChecked ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <ICONS.check className="text-[10px]" /> Faol
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400 font-medium">
                            Bajarilmagan
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Izoh inputi: Agarda checkbox/radio faol bo'lsa ishlashi kerak */}
                    <div className="mt-2.5 pl-6">
                      <input
                        type="text"
                        disabled={!isChecked}
                        value={form.notes[item.key] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm((f) => ({
                            ...f,
                            notes: { ...f.notes, [item.key]: val },
                          }));
                        }}
                        placeholder={
                          isChecked
                            ? item.placeholder
                            : "Izoh kiritish uchun yuqoridagi katakchani belgilang"
                        }
                        className={`w-full px-3 py-1.5 text-xs rounded-lg border transition-all ${
                          isChecked
                            ? "border-emerald-300 bg-white text-gray-800 focus:ring-2 focus:ring-emerald-300 focus:outline-none placeholder-gray-400"
                            : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed placeholder-gray-300"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Sana va Vaqt */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Sana
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Vaqt
              </label>
              <input
                type="time"
                value={form.time}
                onChange={(e) =>
                  setForm((f) => ({ ...f, time: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          {/* Umumiy izoh (ixtiyoriy) */}
          <div className="pt-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Qo'shimcha izoh (ixtiyoriy)
            </label>
            <textarea
              rows={2}
              value={form.description || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Kunlik faoliyat bo'yicha qo'shimcha ma'lumotlar yoki izoh..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>
      </Modal>

      {/* Detail modali */}
      {showDetail && (
        <Modal
          isOpen={!!showDetail}
          onClose={() => setShowDetail(null)}
          title={`${formatDate(showDetail.date)} — Kunlik hisobot`}
          size="sm"
          footer={(() => {
            const todayStr = new Date().toISOString().split("T")[0];
            const isDetailSent =
              showDetail.status === "sent" ||
              showDetail.status === "accepted" ||
              showDetail.status === "completed" ||
              (showDetail.date && showDetail.date < todayStr);
            return (
              <div className="flex items-center justify-between gap-2 w-full">
                {/* Modaldan turib ham yuborish — faqat yuborilmagan bo'lsa */}
                {isRole(ROLES.KUTUBXONA_XODIMI) &&
                showDetail.userId === currentUser?.id &&
                !isDetailSent ? (
                  <Button
                    onClick={() => {
                      handleSend(showDetail);
                      setShowDetail(null);
                    }}
                    disabled={sending === showDetail.id}
                  >
                    <ICONS.paperPlane /> Bo'lim boshlig'iga yuborish
                  </Button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-green-700 font-semibold bg-green-50 px-2.5 py-1.5 rounded-lg border border-green-200">
                    <ICONS.check className="text-xs text-green-600" />{" "}
                    {showDetail.status === "accepted"
                      ? "Qabul qilingan"
                      : "Yuborilgan"}
                  </span>
                )}
                <Button variant="secondary" onClick={() => setShowDetail(null)}>
                  Yopish
                </Button>
              </div>
            );
          })()}
        >
          <div className="space-y-3">
            {/* Sender card */}
            {(() => {
              const sender = allUsers.find((u) => u.id === showDetail.userId);
              const lib = libraries.find(
                (l) =>
                  l.id === showDetail.libraryId || l.id === sender?.libraryId,
              );
              const todayStr = new Date().toISOString().split("T")[0];
              const isDetailSent =
                showDetail.status === "sent" ||
                showDetail.status === "accepted" ||
                showDetail.status === "completed" ||
                (showDetail.date && showDetail.date < todayStr);
              const badgeStatus =
                isDetailSent && showDetail.status !== "accepted"
                  ? "sent"
                  : showDetail.status;

              return (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <ICONS.user className="text-xs" /> Yuboruvchi xodim
                    </span>
                    <Badge color={STATUS_COLORS[badgeStatus] || "green"}>
                      {STATUS_LABELS[badgeStatus] || "Yuborilgan"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-base">
                      {sender?.fullName?.charAt(0) || "X"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-slate-900 text-sm leading-tight">
                        {sender?.fullName || "—"}
                      </p>
                      <p className="text-xs text-blue-600 font-medium mt-0.5">
                        {sender?.role === ROLES.KUTUBXONA_XODIMI
                          ? "Kutubxona xodimi"
                          : sender?.role || "Xodim"}
                      </p>
                      {lib && (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <ICONS.library className="text-[10px] text-slate-400 shrink-0" />
                          <span className="truncate">{lib.name}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-1">
              Bajarilgan ishlar
            </p>
            {(() => {
              const d = parseData(showDetail);
              const notes = d.notes || {};
              const entries = Object.entries(d).filter(
                ([k]) =>
                  k !== "notes" && ACTIVITY_TYPE_LABELS[k] && Number(d[k]) > 0,
              );
              if (entries.length === 0) {
                return (
                  <p className="text-xs text-gray-400 italic py-2">
                    Hech qanday faoliyat qayd etilmagan
                  </p>
                );
              }
              return (
                <div className="space-y-2">
                  {entries.map(([key, val]) => {
                    const isNumeric =
                      key === "kitob_skanerlash" || key === "kitob_pdf";
                    const unit = key === "kitob_skanerlash" ? "sahifa" : "fayl";
                    const note = notes[key];
                    return (
                      <div
                        key={key}
                        className="p-3 rounded-xl bg-gray-50 border border-gray-100"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-700">
                            {ACTIVITY_TYPE_LABELS[key] || key}
                          </span>
                          {isNumeric ? (
                            <span className="text-base font-bold text-blue-700">
                              {formatNumber(val)}{" "}
                              <span className="text-xs font-normal text-gray-400">
                                {unit}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <ICONS.check className="text-[10px]" /> Bajarildi
                            </span>
                          )}
                        </div>
                        {note && (
                          <div className="mt-2 pt-2 border-t border-gray-200/60 text-xs text-gray-600">
                            <span className="font-semibold text-gray-700">
                              Izoh:{" "}
                            </span>
                            {note}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {showDetail.description && (
              <div className="px-4 py-3 rounded-lg bg-amber-50 border border-amber-100 text-sm text-gray-600">
                <span className="font-medium text-amber-700">Izoh: </span>
                {showDetail.description}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
