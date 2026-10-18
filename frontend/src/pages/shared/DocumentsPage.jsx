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
import { STORAGE_KEYS, ROLES } from '../../data/constants.js';
import { formatDate } from '../../utils/helpers.js';

const DOC_TYPE_LABELS = {
  nizom: { label: "Nizom", color: 'blue' },
  reja: { label: "Reja", color: 'amber' },
  hisobot: { label: "Hisobot", color: 'green' },
  tarkib: { label: "Tarkib", color: 'purple' },
  buyruq: { label: "Buyruq", color: 'red' },
  korsatma: { label: "Ko'rsatma", color: 'indigo' },
  boshqa: { label: "Boshqa", color: 'gray' },
};

export default function DocumentsPage() {
  const { currentUser, getCollection, createEntity, updateEntity, deleteEntity, isRole, hasPermission } = useApp();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const allDocs = useMemo(() => getCollection(STORAGE_KEYS.DOCUMENTS), [getCollection]);
  const libraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES), [getCollection]);

  const scopedLibIds = useMemo(() => {
    if (isRole(ROLES.SUPER_ADMIN)) return libraries.map(l => l.id);
    if (isRole(ROLES.VILOYAT_ADMIN)) return libraries.filter(l => l.viloyatId === currentUser?.viloyatId).map(l => l.id);
    return libraries.filter(l => l.viloyatId === currentUser?.viloyatId && l.tumanId === currentUser?.tumanId).map(l => l.id);
  }, [libraries, currentUser, isRole]);

  const defaultLibraryId = scopedLibIds[0] || currentUser?.libraryId || '';

  const [form, setForm] = useState({
    title: '',
    type: 'nizom',
    fileFormat: 'PDF',
    size: '1.2 MB',
    description: '',
    libraryId: defaultLibraryId,
  });

  const documents = useMemo(() => {
    if (isRole(ROLES.SUPER_ADMIN)) return allDocs;
    return allDocs.filter(d => {
      if (scopedLibIds.includes(d.libraryId)) return true;
      if (currentUser?.libraryId && d.libraryId === currentUser.libraryId) return true;
      if (d.uploadedBy === currentUser?.id) return true;
      return false;
    });
  }, [allDocs, scopedLibIds, currentUser, isRole]);

  const filtered = useMemo(() => {
    return documents.filter(d => {
      const matchSearch = !search || d.title?.toLowerCase().includes(search.toLowerCase()) || d.description?.toLowerCase().includes(search.toLowerCase());
      const matchType = !typeFilter || d.type === typeFilter;
      return matchSearch && matchType;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [documents, search, typeFilter]);

  const canManage = hasPermission('manage_documents') || isRole(ROLES.SUPER_ADMIN, ROLES.VILOYAT_ADMIN, ROLES.TUMAN_ADMIN);

  const openCreate = () => {
    setEditItem(null);
    setForm({
      title: '',
      type: 'nizom',
      fileFormat: 'PDF',
      size: '1.2 MB',
      description: '',
      libraryId: defaultLibraryId,
    });
    setShowModal(true);
  };

  const openEdit = (doc) => {
    setEditItem(doc);
    setForm({
      title: doc.title || '',
      type: doc.type || 'nizom',
      fileFormat: doc.fileFormat || 'PDF',
      size: doc.size || '1.0 MB',
      description: doc.description || '',
      libraryId: doc.libraryId || defaultLibraryId,
    });
    setShowModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Fayl nomidan sarlavha va kengaytma olish
    const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF';
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');

    // Hajmni formatlash
    let formattedSize = '1.0 MB';
    if (file.size < 1024 * 1024) {
      formattedSize = `${Math.max(1, Math.round(file.size / 1024))} KB`;
    } else {
      formattedSize = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    }

    setForm(prev => ({
      ...prev,
      title: prev.title.trim() ? prev.title : nameWithoutExt,
      fileFormat: ext,
      size: formattedSize,
    }));

    toast.info(`Fayl tanlandi: ${file.name} (${formattedSize})`);
  };

  const handleSave = () => {
    if (!form.title?.trim()) {
      toast.warning("Iltimos, hujjat sarlavhasini kiriting!");
      return;
    }

    const payload = {
      ...form,
      libraryId: form.libraryId || defaultLibraryId,
      uploadedBy: currentUser?.id,
      date: editItem?.date || new Date().toISOString().split('T')[0],
      fileFormat: (form.fileFormat || 'PDF').toUpperCase(),
      size: form.size || '1.2 MB',
    };

    if (editItem) {
      updateEntity(STORAGE_KEYS.DOCUMENTS, editItem.id, payload);
      toast.success("Hujjat muvaffaqiyatli yangilandi!");
    } else {
      createEntity(STORAGE_KEYS.DOCUMENTS, payload);
      toast.success("Yangi hujjat muvaffaqiyatli saqlandi!");
    }

    setShowModal(false);
    setEditItem(null);
  };

  const handleDelete = (doc) => {
    if (window.confirm(`"${doc.title}" hujjati o'chirilsinmi?`)) {
      deleteEntity(STORAGE_KEYS.DOCUMENTS, doc.id);
      toast.success("Hujjat muvaffaqiyatli o'chirildi!");
    }
  };

  const handleDownload = (doc) => {
    toast.success(`"${doc.title}.${doc.fileFormat?.toLowerCase() || 'pdf'}" hujjati yuklab olinmoqda...`);
  };

  return (
    <div>
      <PageHeader
        title="Hujjatlar"
        subtitle="Rasmiy hujjatlar, buyruqlar, nizomlar va elektron arxiv"
        icon={ICONS.documents}
        action={canManage ? <Button onClick={openCreate}><ICONS.plus /> Yangi hujjat</Button> : null}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <ICONS.search className="absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-400" />
          <input
            type="text"
            placeholder="Hujjat sarlavhasi yoki tavsifi bo'yicha qidirish..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 shadow-xs"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 shadow-xs cursor-pointer"
        >
          <option value="">Barcha turlar</option>
          {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ICONS.documents} title="Hujjatlar topilmadi" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(doc => {
            const typeConfig = DOC_TYPE_LABELS[doc.type] || { label: doc.type, color: 'gray' };
            const lib = libraries.find(l => l.id === doc.libraryId);

            return (
              <Card key={doc.id}>
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                    <ICONS.documents className="text-xl" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge color={typeConfig.color}>{typeConfig.label}</Badge>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(doc)}
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors"
                          title="Tahrirlash"
                        >
                          <ICONS.edit className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          className="p-1.5 rounded hover:bg-red-50 text-red-600 transition-colors"
                          title="O'chirish"
                        >
                          <ICONS.trash className="text-sm" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="font-semibold text-gray-800 text-base">{doc.title}</h3>
                {doc.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{doc.description}</p>
                )}

                {lib && (
                  <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                    <ICONS.library className="text-[11px] text-gray-400" />
                    <span className="truncate">{lib.name}</span>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                  <span>{formatDate(doc.date)}</span>
                  <button
                    onClick={() => handleDownload(doc)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 font-medium transition-colors"
                    title="Yuklab olish"
                  >
                    <ICONS.download className="text-xs" />
                    <span>{doc.fileFormat?.toUpperCase() || 'PDF'} • {doc.size || '1.0 MB'}</span>
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? "Hujjatni tahrirlash" : "Yangi hujjat yuklash va saqlash"}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Bekor</Button>
            <Button onClick={handleSave}><ICONS.save /> Saqlash</Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* File selector input */}
          <div className="p-3.5 border border-dashed border-gray-300 rounded-xl bg-gray-50/60 hover:bg-blue-50/30 transition-colors">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Faylni tanlang (ixtiyoriy, formani avtomatik to'ldiradi):
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
          </div>

          <Input
            label="Hujjat sarlavhasi"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Masalan: 2026-yil Ish rejasi..."
            required
          />

          <Select
            label="Hujjat turi"
            value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value })}
            options={Object.entries(DOC_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v.label }))}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fayl formati"
              value={form.fileFormat}
              onChange={e => setForm({ ...form, fileFormat: e.target.value.toUpperCase() })}
              placeholder="PDF, DOCX, XLSX..."
            />
            <Input
              label="Fayl hajmi"
              value={form.size}
              onChange={e => setForm({ ...form, size: e.target.value })}
              placeholder="Masalan: 1.5 MB"
            />
          </div>

          <Select
            label="Kutubxona / Bo'lim"
            value={form.libraryId}
            onChange={e => setForm({ ...form, libraryId: e.target.value })}
            options={libraries.filter(l => scopedLibIds.includes(l.id)).map(l => ({ value: l.id, label: l.name }))}
            placeholder="Kutubxonani tanlang..."
          />

          <TextArea
            label="Tavsif (qisqacha mazmuni)"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="Hujjat mazmuni va maqsadi..."
          />
        </div>
      </Modal>
    </div>
  );
}
