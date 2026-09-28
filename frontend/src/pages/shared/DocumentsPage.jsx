import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ICONS from '../../components/icons.jsx';
import { STORAGE_KEYS, ROLES } from '../../data/constants.js';
import { formatDate } from '../../utils/helpers.js';

const DOC_TYPE_LABELS = {
  nizom: { label: "Nizom", color: 'blue' },
  reja: { label: "Reja", color: 'amber' },
  hisobot: { label: "Hisobot", color: 'green' },
  tarkib: { label: "Tarkib", color: 'purple' },
  buyruq: { label: "Buyruq", color: 'red' },
  boshqa: { label: "Boshqa", color: 'gray' },
};

export default function DocumentsPage() {
  const { currentUser, getCollection, createEntity, deleteEntity, isRole, hasPermission } = useApp();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'nizom', fileFormat: 'pdf', size: '', description: '', libraryId: '' });

  const allDocs = useMemo(() => getCollection(STORAGE_KEYS.DOCUMENTS), [getCollection]);
  const libraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES), [getCollection]);

  const scopedLibIds = useMemo(() => {
    if (isRole(ROLES.SUPER_ADMIN, ROLES.VILOYAT_ADMIN)) return libraries.map(l => l.id);
    if (isRole(ROLES.VILOYAT_ADMIN)) return libraries.filter(l => l.viloyatId === currentUser.viloyatId).map(l => l.id);
    return libraries.filter(l => l.viloyatId === currentUser.viloyatId && l.tumanId === currentUser.tumanId).map(l => l.id);
  }, [libraries, currentUser, isRole]);

  const documents = useMemo(() => allDocs.filter(d => scopedLibIds.includes(d.libraryId)), [allDocs, scopedLibIds]);

  const filtered = useMemo(() => {
    return documents.filter(d => {
      const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [documents, search]);

  const canManage = hasPermission('manage_documents');

  const handleSave = () => {
    if (!form.title || !form.type) return;
    createEntity(STORAGE_KEYS.DOCUMENTS, { ...form, uploadedBy: currentUser?.id, date: new Date().toISOString().split('T')[0], size: form.size || '1.0 MB' });
    setShowModal(false);
    setForm({ title: '', type: 'nizom', fileFormat: 'pdf', size: '', description: '', libraryId: scopedLibIds[0] || '' });
  };

  return (
    <div>
      <PageHeader title="Hujjatlar" subtitle="Kutubxona hujjatlar va arxiv" icon={ICONS.documents}
        action={canManage ? <Button onClick={() => setShowModal(true)}><ICONS.plus /> Yangi hujjat</Button> : null} />

      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <ICONS.search className="absolute left-3 top-3 text-gray-400" />
          <input type="text" placeholder="Qidirish..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ICONS.documents} title="Hujjatlar topilmadi" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(doc => (
            <Card key={doc.id}>
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600"><ICONS.documents className="text-xl" /></div>
                <div className="flex items-center gap-1">
                  <Badge color={DOC_TYPE_LABELS[doc.type]?.color || 'gray'}>{DOC_TYPE_LABELS[doc.type]?.label || doc.type}</Badge>
                  {canManage && <button onClick={() => { if (confirm('O\'chirilsinmi?')) deleteEntity(STORAGE_KEYS.DOCUMENTS, doc.id); }} className="p-1.5 rounded hover:bg-red-50 text-red-600"><ICONS.trash className="text-sm" /></button>}
                </div>
              </div>
              <h3 className="font-semibold text-gray-800">{doc.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{doc.description}</p>
              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                <span>{formatDate(doc.date)}</span>
                <span className="flex items-center gap-1"><ICONS.download className="text-[10px]" />{doc.fileFormat?.toUpperCase()} • {doc.size}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Yangi hujjat</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><ICONS.close /></button>
            </div>
            <div className="p-6 space-y-4">
              <Input label="Sarlavha" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              <Select label="Turi" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} options={Object.entries(DOC_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v.label }))} />
              <Input label="Fayl formati" value={form.fileFormat} onChange={e => setForm({ ...form, fileFormat: e.target.value })} placeholder="pdf, docx, xlsx..." />
              <Input label="Tavsif" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <Select label="Kutubxona" value={form.libraryId} onChange={e => setForm({ ...form, libraryId: e.target.value })} options={libraries.filter(l => scopedLibIds.includes(l.id)).map(l => ({ value: l.id, label: l.name }))} />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <Button variant="secondary" onClick={() => setShowModal(false)}>Bekor</Button>
              <Button onClick={handleSave}><ICONS.save /> Saqlash</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
