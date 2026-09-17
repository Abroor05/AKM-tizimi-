import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Modal from '../../components/ui/Modal.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ICONS from '../../components/icons.jsx';
import { STORAGE_KEYS, BOOK_CATEGORIES, BOOK_CATEGORY_LABELS, BOOK_STATUS, BOOK_STATUS_LABELS, BOOK_STATUS_COLORS, ROLES } from '../../data/constants.js';
import { VILOYATLAR } from '../../data/regions.js';

const CATEGORY_COLORS = {
  fiction: 'blue', science: 'teal', history: 'amber', children: 'green',
  education: 'indigo', religious: 'purple', reference: 'gray', periodical: 'teal', other: 'gray',
};

export default function BooksPage() {
  const { currentUser, getCollection, createEntity, updateEntity, deleteEntity, isRole, hasPermission } = useApp();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ title: '', author: '', category: '', isbn: '', publisher: '', year: new Date().getFullYear(), copiesTotal: 1, copiesAvailable: 1, libraryId: '', language: "O'zbekcha", pages: 100 });

  const allBooks = useMemo(() => getCollection(STORAGE_KEYS.BOOKS), [getCollection]);
  const libraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES), [getCollection]);

  const scopedLibraries = useMemo(() => {
    if (isRole(ROLES.SUPER_ADMIN, ROLES.VILOYAT_ADMIN)) return libraries;
    if (isRole(ROLES.VILOYAT_ADMIN)) return libraries.filter(l => l.viloyatId === currentUser.viloyatId);
    return libraries.filter(l => l.viloyatId === currentUser.viloyatId && l.tumanId === currentUser.tumanId);
  }, [libraries, currentUser, isRole]);

  const scopedLibIds = scopedLibraries.map(l => l.id);
  const books = useMemo(() => allBooks.filter(b => scopedLibIds.includes(b.libraryId)), [allBooks, scopedLibIds]);

  const filtered = useMemo(() => {
    return books.filter(b => {
      const matchSearch = !search || b.title.toLowerCase().includes(search.toLowerCase()) || b.author.toLowerCase().includes(search.toLowerCase()) || b.isbn?.includes(search);
      const matchCat = !catFilter || b.category === catFilter;
      const matchStatus = !statusFilter || b.status === statusFilter;
      return matchSearch && matchCat && matchStatus;
    });
  }, [books, search, catFilter, statusFilter]);

  const canManage = hasPermission('manage_books');

  const handleSave = () => {
    if (!form.title || !form.author || !form.category) return;
    const saveForm = { ...form, status: BOOK_STATUS.AVAILABLE };
    if (editItem) {
      updateEntity(STORAGE_KEYS.BOOKS, editItem.id, saveForm);
    } else {
      createEntity(STORAGE_KEYS.BOOKS, saveForm);
    }
    setShowModal(false);
    setEditItem(null);
    setForm({ title: '', author: '', category: '', isbn: '', publisher: '', year: new Date().getFullYear(), copiesTotal: 1, copiesAvailable: 1, libraryId: '', language: "O'zbekcha", pages: 100 });
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ title: '', author: '', category: '', isbn: '', publisher: '', year: new Date().getFullYear(), copiesTotal: 1, copiesAvailable: 1, libraryId: scopedLibIds[0] || '', language: "O'zbekcha", pages: 100 });
    setShowModal(true);
  };

  return (
    <div>
      <PageHeader title="Kitob fondi" subtitle="Kutubxona kitob fondini boshqarish" icon={ICONS.books}
        action={canManage ? <Button onClick={openCreate}><ICONS.plus /> Yangi kitob</Button> : null} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Card className="text-center"><p className="text-2xl font-bold text-blue-600">{books.length}</p><p className="text-xs text-gray-500">Jami kitoblar</p></Card>
        <Card className="text-center"><p className="text-2xl font-bold text-green-600">{books.filter(b => b.status === BOOK_STATUS.AVAILABLE).length}</p><p className="text-xs text-gray-500">Mavjud</p></Card>
        <Card className="text-center"><p className="text-2xl font-bold text-amber-600">{books.filter(b => b.status === BOOK_STATUS.BORROWED).length}</p><p className="text-xs text-gray-500">Berilgan</p></Card>
        <Card className="text-center"><p className="text-2xl font-bold text-red-600">{books.filter(b => b.status === BOOK_STATUS.LOST).length}</p><p className="text-xs text-gray-500">Yo'qolgan</p></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <ICONS.search className="absolute left-3 top-3 text-gray-400" />
          <input type="text" placeholder="Nomi, muallif, ISBN..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white">
          <option value="">Barcha kategoriyalar</option>
          {Object.entries(BOOK_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white">
          <option value="">Barcha holatlar</option>
          {Object.entries(BOOK_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ICONS.books} title="Kitoblar topilmadi" />
      ) : (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Nomi / Muallif</th>
                  <th className="text-left px-4 py-3 font-medium">Kategoriya</th>
                  <th className="text-left px-4 py-3 font-medium">Kutubxona</th>
                  <th className="text-center px-4 py-3 font-medium">Nusxa</th>
                  <th className="text-left px-4 py-3 font-medium">Holat</th>
                  {canManage && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{b.title}</p>
                      <p className="text-xs text-gray-500">{b.author} • {b.year}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={CATEGORY_COLORS[b.category] || 'gray'}>{BOOK_CATEGORY_LABELS[b.category]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{libraries.find(l => l.id === b.libraryId)?.name || '-'}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{b.copiesAvailable}/{b.copiesTotal}</td>
                    <td className="px-4 py-3"><Badge color={BOOK_STATUS_COLORS[b.status]}>{BOOK_STATUS_LABELS[b.status]}</Badge></td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditItem(b); setForm(b); setShowModal(true); }} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><ICONS.edit className="text-sm" /></button>
                          <button onClick={() => { if (confirm('O\'chirilsinmi?')) deleteEntity(STORAGE_KEYS.BOOKS, b.id); }} className="p-1.5 rounded hover:bg-red-50 text-red-600"><ICONS.trash className="text-sm" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? "Kitobni tahrirlash" : "Yangi kitob qo'shish"} size="lg"
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Bekor</Button><Button onClick={handleSave}><ICONS.save /> Saqlash</Button></>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nomi" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          <Input label="Muallif" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} required />
          <Select label="Kategoriya" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} options={Object.entries(BOOK_CATEGORY_LABELS).map(([k, v]) => ({ value: k, label: v }))} required />
          <Input label="ISBN" value={form.isbn} onChange={e => setForm({ ...form, isbn: e.target.value })} />
          <Input label="Nashriyot" value={form.publisher} onChange={e => setForm({ ...form, publisher: e.target.value })} />
          <Input label="Yil" type="number" value={form.year} onChange={e => setForm({ ...form, year: parseInt(e.target.value) || new Date().getFullYear() })} />
          <Input label="Jami nusxalar" type="number" value={form.copiesTotal} onChange={e => setForm({ ...form, copiesTotal: parseInt(e.target.value) || 1, copiesAvailable: Math.min(form.copiesAvailable, parseInt(e.target.value) || 1) })} />
          <Input label="Mavjud nusxalar" type="number" value={form.copiesAvailable} onChange={e => setForm({ ...form, copiesAvailable: parseInt(e.target.value) || 0 })} />
          <Select label="Kutubxona" value={form.libraryId} onChange={e => setForm({ ...form, libraryId: e.target.value })} options={scopedLibraries.map(l => ({ value: l.id, label: l.name }))} required />
          <Input label="Til" value={form.language} onChange={e => setForm({ ...form, language: e.target.value })} />
          <Input label="Sahifalar" type="number" value={form.pages} onChange={e => setForm({ ...form, pages: parseInt(e.target.value) || 0 })} />
        </div>
      </Modal>
    </div>
  );
}
