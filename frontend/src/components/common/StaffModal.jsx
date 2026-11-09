import { useState, useEffect, useRef, useMemo } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import { toast } from '../ui/Toast.jsx';
import ICONS from '../icons.jsx';
import { STORAGE_KEYS, STAFF_POSITIONS, STAFF_DEPARTMENTS } from '../../data/constants.js';
import { formatUzPhone } from '../../utils/helpers.js';

function isXizmatRahbari(pos) {
  if (!pos) return false;
  const p = pos.toString().trim().toLowerCase();
  return p === 'xizmat rahbari' || p === 'xizmat_rahbari' || p === 'xizmat-rahbari';
}

function compressImage(file, maxDimension = 320, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function StaffModal({
  isOpen,
  onClose,
  editItem = null,
  defaultLibraryId = '',
  libraries = [],
  currentUser = null,
  onSaved = null,
  createEntity,
  updateEntity,
}) {
  const fileInputRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState('');

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    position: STAFF_POSITIONS[0],
    department: STAFF_DEPARTMENTS[0],
    specialty: '',
    experience: '',
    education: '',
    birthDate: '',
    phone: '+998',
    libraryId: '',
    photo: '',
  });

  const accessibleLibraries = useMemo(() => {
    if (!currentUser) return libraries;
    const role = currentUser.role;
    if (role === 'super_admin' || role === 'superadmin') return libraries;
    if (role === 'viloyat_admin') {
      return libraries.filter((l) => l.viloyatId === currentUser.viloyatId);
    }
    if (role === 'tuman_admin' || role === 'xodimlar_boshligi' || role === 'kutubxona_xodimi') {
      return libraries.filter(
        (l) =>
          (currentUser.libraryId && l.id === currentUser.libraryId) ||
          (l.viloyatId === currentUser.viloyatId && l.tumanId === currentUser.tumanId)
      );
    }
    return libraries;
  }, [libraries, currentUser]);

  const positionOptions = useMemo(() => {
    const list = STAFF_POSITIONS.map((pos) => ({
      value: pos,
      label: pos,
    }));
    if (form.position && !STAFF_POSITIONS.includes(form.position)) {
      list.unshift({ value: form.position, label: `${form.position} (Joriy)` });
    }
    return list;
  }, [form.position]);

  const departmentOptions = useMemo(() => {
    const list = STAFF_DEPARTMENTS.map((dept) => ({
      value: dept,
      label: dept,
    }));
    if (form.department && !STAFF_DEPARTMENTS.includes(form.department) && form.department !== "Ma'muriyat") {
      list.unshift({ value: form.department, label: `${form.department} (Joriy)` });
    }
    return list;
  }, [form.department]);

  const isDistrictUser = ['tuman_admin', 'xodimlar_boshligi', 'kutubxona_xodimi'].includes(currentUser?.role);

  useEffect(() => {
    if (isOpen) {
      let districtLibId = '';
      if (isDistrictUser) {
        const found =
          libraries.find((l) => (l.viloyatId === currentUser?.viloyatId || l.viloyat_id === currentUser?.viloyatId) && (l.tumanId === currentUser?.tumanId || l.tuman_id === currentUser?.tumanId)) ||
          accessibleLibraries.find((l) => (l.viloyatId === currentUser?.viloyatId || l.viloyat_id === currentUser?.viloyatId) && (l.tumanId === currentUser?.tumanId || l.tuman_id === currentUser?.tumanId));
        districtLibId = found?.id || currentUser?.libraryId || '';
      }

      if (editItem) {
        const itemPos = editItem.position || editItem.lavozim || editItem.role || STAFF_POSITIONS[0];
        const isRahbar = isXizmatRahbari(itemPos);
        setForm({
          firstName: editItem.firstName || editItem.first_name || '',
          lastName: editItem.lastName || editItem.last_name || '',
          middleName: editItem.middleName || editItem.middle_name || '',
          position: itemPos,
          department: isRahbar ? ((editItem.department === "Ma'muriyat" ? '' : editItem.department) || STAFF_DEPARTMENTS[0]) : '',
          specialty: editItem.specialty || '',
          experience: editItem.experience || '',
          education: editItem.education || editItem.malumoti || '',
          birthDate: editItem.birthDate || editItem.birth_date || '',
          phone: editItem.phone || '+998',
          libraryId: editItem.libraryId || editItem.library_id || districtLibId || defaultLibraryId || '',
          photo: editItem.photo || '',
        });
        setPhotoPreview(editItem.photo || '');
      } else {
        const initialLibId = isDistrictUser ? districtLibId : (defaultLibraryId || accessibleLibraries[0]?.id || '');
        const defaultPos = STAFF_POSITIONS[0];
        const isRahbar = isXizmatRahbari(defaultPos);

        setForm({
          firstName: '',
          lastName: '',
          middleName: '',
          position: defaultPos,
          department: isRahbar ? STAFF_DEPARTMENTS[0] : '',
          specialty: '',
          experience: '',
          education: '',
          birthDate: '',
          phone: '+998',
          libraryId: initialLibId,
          photo: '',
        });
        setPhotoPreview('');
      }
    }
  }, [isOpen, editItem, defaultLibraryId, accessibleLibraries, currentUser, libraries, isDistrictUser]);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.warning('Faqat rasm faylini tanlash mumkin (JPG, PNG)');
      return;
    }

    try {
      const compressed = await compressImage(file);
      setForm((prev) => ({ ...prev, photo: compressed }));
      setPhotoPreview(compressed);
    } catch {
      toast.error('Rasmni yuklashda xatolik yuz berdi');
    }
  };

  const handleRemovePhoto = () => {
    setForm((prev) => ({ ...prev, photo: '' }));
    setPhotoPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePositionChange = (e) => {
    const newPos = e.target.value;
    const isRahbar = isXizmatRahbari(newPos);
    setForm((prev) => ({
      ...prev,
      position: newPos,
      department: isRahbar ? (prev.department || STAFF_DEPARTMENTS[0]) : '',
    }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const middleName = form.middleName.trim();
    const position = form.position.trim();
    const department = form.department.trim();
    const specialty = form.specialty.trim();
    const experience = form.experience.trim();
    const education = form.education.trim();

    if (!lastName || !firstName) {
      toast.warning('Familiya va ismni kiriting');
      return;
    }

    if (!position) {
      toast.warning('Lavozimni tanlang');
      return;
    }

    const isRahbar = isXizmatRahbari(position);
    if (isRahbar && !department) {
      toast.warning("Xizmat rahbari uchun bo'lim / xizmatni tanlash majburiy!");
      return;
    }

    // Kutubxona va hududni avtomatik tarzda aniqlash
    let targetLib = null;
    let viloyatId = '';
    let tumanId = '';
    let resolvedLibraryId = '';

    if (isDistrictUser) {
      // Tuman admini (Direktor): Xodim qat'iy ravishda o'sha tumanga tegishli bo'ladi!
      viloyatId = currentUser?.viloyatId || currentUser?.viloyat_id || '';
      tumanId = currentUser?.tumanId || currentUser?.tuman_id || '';

      targetLib =
        libraries.find((l) => (l.viloyatId === viloyatId || l.viloyat_id === viloyatId) && (l.tumanId === tumanId || l.tuman_id === tumanId)) ||
        accessibleLibraries.find((l) => (l.viloyatId === viloyatId || l.viloyat_id === viloyatId) && (l.tumanId === tumanId || l.tuman_id === tumanId)) ||
        (currentUser?.libraryId ? libraries.find((l) => l.id === currentUser.libraryId) : null);

      resolvedLibraryId = targetLib?.id || currentUser?.libraryId || '';
    } else if (currentUser?.role === 'viloyat_admin') {
      viloyatId = currentUser?.viloyatId || currentUser?.viloyat_id || '';
      resolvedLibraryId =
        editItem?.libraryId ||
        editItem?.library_id ||
        defaultLibraryId ||
        accessibleLibraries.find((l) => l.viloyatId === viloyatId)?.id ||
        '';
      targetLib = libraries.find((l) => l.id === resolvedLibraryId);
      tumanId = targetLib?.tumanId || targetLib?.tuman_id || '';
    } else {
      resolvedLibraryId =
        editItem?.libraryId ||
        editItem?.library_id ||
        defaultLibraryId ||
        accessibleLibraries[0]?.id ||
        libraries[0]?.id ||
        '';
      targetLib = libraries.find((l) => l.id === resolvedLibraryId);
      viloyatId = targetLib?.viloyatId || targetLib?.viloyat_id || '';
      tumanId = targetLib?.tumanId || targetLib?.tuman_id || '';
    }

    const fullName = [lastName, firstName, middleName].filter(Boolean).join(' ').trim();

    const payload = {
      ...form,
      firstName,
      lastName,
      middleName,
      fullName,
      position,
      department: isRahbar ? department : null,
      specialty,
      experience,
      education,
      malumoti: education,
      libraryId: resolvedLibraryId,
      viloyatId,
      tumanId,
      phone: form.phone ? formatUzPhone(form.phone) : '',
      birthDate: form.birthDate || '',
      status: editItem?.status || 'active',
    };

    setIsSubmitting(true);
    try {
      if (editItem) {
        await updateEntity(STORAGE_KEYS.STAFF, editItem.id, payload);
        toast.success('Xodim ma\'lumotlari yangilandi');
      } else {
        await createEntity(STORAGE_KEYS.STAFF, payload);
        toast.success('Xodim qo\'shildi');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Xatolik yuz berdi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editItem ? 'Xodim ma\'lumotlarini tahrirlash' : 'Yangi xodim qo\'shish'}
      subtitle="Xodimning shaxsiy va xizmat ma'lumotlarini to'ldiring"
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-xs">
            Bekor qilish
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="px-5 py-2 text-xs">
            {isSubmitting ? 'Saqlanmoqda...' : 'Saqlash'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Surat tanlash (zamonaviy va qulay) */}
        <div className="flex items-center gap-4 p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          {photoPreview ? (
            <img
              src={photoPreview}
              alt="Surat"
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-blue-500/20 shadow-xs shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center text-xl font-bold shadow-xs shrink-0 border border-slate-200/70 dark:border-slate-700">
              {form.lastName?.[0] || form.firstName?.[0] || <ICONS.user className="text-2xl" />}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs py-1.5 px-3 rounded-xl font-medium"
              >
                <ICONS.upload className="mr-1.5 text-xs text-blue-600 dark:text-blue-400" />
                {photoPreview ? 'Suratni almashtirish' : 'Surat yuklash'}
              </Button>
              {photoPreview && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-medium px-2.5 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  O'chirish
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              JPG yoki PNG formatda, tavsiya etilgan o'lcham 1:1
            </p>
          </div>
        </div>

        {/* 1. Familiya va Ism (keng 2 ustun) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Familiya"
            required
            placeholder="Familiyasi"
            value={form.lastName}
            onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
          />
          <Input
            label="Ism"
            required
            placeholder="Ismi"
            value={form.firstName}
            onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
          />
        </div>

        {/* 2. Sharifi va Tug'ilgan sana (qisiltirmay, 2 ustunga pastga tushirildi) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Sharifi (Otasining ismi)"
            placeholder="Masalan: Olimovich / Karimovna"
            value={form.middleName}
            onChange={(e) => setForm((prev) => ({ ...prev, middleName: e.target.value }))}
          />
          <Input
            label="Tug'ilgan sana"
            type="date"
            value={form.birthDate}
            onChange={(e) => setForm((prev) => ({ ...prev, birthDate: e.target.value }))}
          />
        </div>

        {/* 3. Lavozimi */}
        <div>
          <Select
            label="Lavozimi"
            required
            options={positionOptions}
            value={form.position}
            onChange={handlePositionChange}
          />
        </div>

        {/* 4. Faqat 'Xizmat rahbari' tanlangandagina Bo'lim / Xizmat maydoni ko'rinadi */}
        {isXizmatRahbari(form.position) && (
          <div>
            <Select
              label="Bo'lim / Xizmat"
              required
              options={departmentOptions}
              value={form.department}
              onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
            />
          </div>
        )}

        {/* 5. Ma'lumoti va Mutaxassisligi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Ma'lumoti"
            placeholder="Masalan: Oliy, O'rta maxsus..."
            value={form.education}
            onChange={(e) => setForm((prev) => ({ ...prev, education: e.target.value }))}
          />
          <Input
            label="Mutaxassisligi"
            placeholder="Masalan: Axborot tizimlari, Filologiya..."
            value={form.specialty}
            onChange={(e) => setForm((prev) => ({ ...prev, specialty: e.target.value }))}
          />
        </div>

        {/* 6. Kutubxonadagi ish staji va Telefon raqami */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Kutubxonadagi ish staji"
            placeholder="Masalan: 3 yil (yoki 6 oy)"
            value={form.experience}
            onChange={(e) => setForm((prev) => ({ ...prev, experience: e.target.value }))}
          />
          <Input
            label="Telefon raqami"
            type="tel"
            placeholder="+998 (90) 123-45-67"
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: formatUzPhone(e.target.value) }))}
          />
        </div>
      </form>
    </Modal>
  );
}
