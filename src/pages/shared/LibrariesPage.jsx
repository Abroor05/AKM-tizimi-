import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
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
import { STORAGE_KEYS, ROLES } from '../../data/constants.js';
import { VILOYATLAR, getViloyatName, getTumanName, getTumanCoordinates } from '../../data/regions.js';
import { generateId, formatUzPhone } from '../../utils/helpers.js';

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (event) => {
      if (onMapClick) onMapClick(event.latlng);
    },
  });
  return null;
}

const openGoogleMaps = (lat, lng) => {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
  const url = `https://www.google.com/maps?q=${latitude},${longitude}&z=16`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

export default function LibrariesPage() {
  const { currentUser, getCollection, createEntity, updateEntity, deleteEntity, isRole } = useApp();
  const [search, setSearch] = useState('');
  const [viloyatFilter, setViloyatFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'markaz', viloyatId: '', tumanId: '', address: '', latitude: '', longitude: '', phone: '+998', email: '', staffCount: 1, foundingYear: new Date().getFullYear() });

  const allLibraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES), [getCollection]);
  const isDistrictScopedUser = isRole(ROLES.TUMAN_ADMIN, ROLES.KUTUBXONA_XODIMI);

  // Scope libraries based on user role
  const libraries = useMemo(() => {
    if (isRole(ROLES.SUPER_ADMIN)) return allLibraries;
    if (isRole(ROLES.VILOYAT_ADMIN)) return allLibraries.filter(l => l.viloyatId === currentUser.viloyatId);
    if (isDistrictScopedUser) return allLibraries.filter(l => l.viloyatId === currentUser.viloyatId && l.tumanId === currentUser.tumanId);
    return [];
  }, [allLibraries, currentUser, isRole, isDistrictScopedUser]);

  const filtered = useMemo(() => {
    return libraries.filter(l => {
      const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.address?.toLowerCase().includes(search.toLowerCase());
      const matchViloyat = !viloyatFilter || l.viloyatId === viloyatFilter;
      return matchSearch && matchViloyat;
    });
  }, [libraries, search, viloyatFilter]);

  const canManage = isRole(ROLES.SUPER_ADMIN, ROLES.VILOYAT_ADMIN, ROLES.TUMAN_ADMIN);

  const handleSave = () => {
    if (!form.name || !form.viloyatId) return;
    const safeForm = isDistrictScopedUser
      ? { ...form, phone: form.phone || '+998', viloyatId: currentUser.viloyatId, tumanId: currentUser.tumanId }
      : { ...form, phone: form.phone || '+998' };
    if (editItem) {
      updateEntity(STORAGE_KEYS.LIBRARIES, editItem.id, safeForm);
    } else {
      createEntity(STORAGE_KEYS.LIBRARIES, { ...safeForm, status: 'active' });
    }
    setShowModal(false);
    setEditItem(null);
    setForm({ name: '', type: 'markaz', viloyatId: currentUser?.viloyatId || '', tumanId: currentUser?.tumanId || '', address: '', latitude: '', longitude: '', phone: '+998', email: '', staffCount: 1, foundingYear: new Date().getFullYear() });
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm(item);
    setShowModal(true);
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', type: 'markaz', viloyatId: currentUser?.viloyatId || '', tumanId: currentUser?.tumanId || '', address: '', latitude: '', longitude: '', phone: '+998', email: '', staffCount: 1, foundingYear: new Date().getFullYear() });
    setShowModal(true);
  };

  const selectedViloyat = VILOYATLAR.find(v => v.id === (isDistrictScopedUser ? currentUser?.viloyatId : form.viloyatId));
  const selectedTuman = selectedViloyat?.tumanlar.find(t => t.id === (isDistrictScopedUser ? currentUser?.tumanId : form.tumanId)) || null;
  const currentMapCenter = form.latitude && form.longitude
    ? [Number(form.latitude), Number(form.longitude)]
    : selectedTuman
      ? [selectedTuman.lat, selectedTuman.lng]
      : [40.3864, 71.7864];

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Brauzer geolocation xizmatini qo\'llab-quvvatlamaydi');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm((prev) => ({
          ...prev,
          latitude: String(coords.latitude),
          longitude: String(coords.longitude),
        }));
      },
      () => {
        alert('Joylashuvni aniqlab bo\'lmadi. Iltimos, brauzerga ruxsat bering.');
      },
      { enableHighAccuracy: true, timeout: 20000 }
    );
  };

  return (
    <div>
      <PageHeader
        title="AKM / Kutubxonalar"
        subtitle="Axborot-kutubxona markazlari va filiallari"
        icon={ICONS.library}
        action={canManage ? <Button onClick={openCreate}><ICONS.plus /> Yangi kutubxona</Button> : null}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <ICONS.search className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Qidirish..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        {isRole(ROLES.SUPER_ADMIN) && (
          <select
            value={viloyatFilter}
            onChange={e => setViloyatFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
          >
            <option value="">Barcha viloyatlar</option>
            {VILOYATLAR.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        )}
      </div>

      {/* Libraries grid */}
      {filtered.length === 0 ? (
        <EmptyState icon={ICONS.library} title="Kutubxonalar topilmadi" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(lib => (
            <Card key={lib.id}>
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                  <ICONS.library className="text-xl" />
                </div>
                <div className="flex items-center gap-1">
                  <Badge color={lib.type === 'markaz' ? 'blue' : 'gray'}>
                    {lib.type === 'markaz' ? 'Markaz' : 'Filial'}
                  </Badge>
                  {canManage && (
                    <button onClick={() => openEdit(lib)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                      <ICONS.edit className="text-sm" />
                    </button>
                  )}
                </div>
              </div>
              <h3 className="font-semibold text-gray-800">{lib.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{lib.address}</p>
              <div className="mt-3 pt-3 border-t border-gray-50 space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <ICONS.location className="text-xs text-gray-400" />
                  {getViloyatName(lib.viloyatId)} / {getTumanName(lib.viloyatId, lib.tumanId)}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <ICONS.phone className="text-xs text-gray-400" />
                  {lib.phone}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <ICONS.users className="text-xs text-gray-400" />
                  Xodimlar: {lib.staffCount} kishi
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? "Kutubxonani tahrirlash" : "Yangi kutubxona qo'shish"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Bekor qilish</Button>
            <Button onClick={handleSave}><ICONS.save /> Saqlash</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nomi" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <Select
            label="Turi"
            value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value })}
            options={[{ value: 'markaz', label: 'Markaz (AKM)' }, { value: 'filial', label: 'Filial' }]}
          />
          <Select
            label="Viloyat"
            value={isDistrictScopedUser ? currentUser?.viloyatId || '' : form.viloyatId}
            onChange={e => setForm({ ...form, viloyatId: e.target.value, tumanId: '' })}
            options={VILOYATLAR.map(v => ({ value: v.id, label: v.name }))}
            required
            disabled={isDistrictScopedUser}
          />
          <Select
            label="Tuman/Shahar"
            value={isDistrictScopedUser ? currentUser?.tumanId || '' : form.tumanId}
            onChange={e => {
              const nextTumanId = e.target.value;
              const coords = getTumanCoordinates(form.viloyatId, nextTumanId);
              setForm({
                ...form,
                tumanId: nextTumanId,
                latitude: coords ? String(coords.lat) : form.latitude,
                longitude: coords ? String(coords.lng) : form.longitude,
              });
            }}
            options={(selectedViloyat?.tumanlar || []).map(t => ({ value: t.id, label: t.name }))}
            required
            disabled={isDistrictScopedUser}
          />
          <Input label="Manzil" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="sm:col-span-2" />
          <Input label="Kenglik (lat)" type="number" step="0.000001" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} />
          <Input label="Uzunlik (lng)" type="number" step="0.000001" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} />
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between gap-3 mb-2">
              <label className="text-sm font-medium text-gray-700">Joylashuv</label>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
              >
                Joylashuvni yuborish
              </button>
            </div>
            <div
              className="h-52 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 cursor-pointer"
              onClick={() => openGoogleMaps(form.latitude, form.longitude)}
            >
              {form.latitude && form.longitude ? (
                <MapContainer center={currentMapCenter} zoom={14} scrollWheelZoom={false} className="h-full w-full">
                  <MapClickHandler onMapClick={({ lat, lng }) => openGoogleMaps(lat, lng)} />
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <CircleMarker center={[Number(form.latitude), Number(form.longitude)]} radius={12} pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.8 }} eventHandlers={{ click: () => openGoogleMaps(form.latitude, form.longitude) }}>
                    <Popup>{form.name || 'Kutubxona'} joylashuvi</Popup>
                  </CircleMarker>
                </MapContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  Joylashuvni yuborish tugmachasi bilan hozirgi koordinatalar olinadi
                </div>
              )}
            </div>
          </div>
          <Input label="Telefon" value={form.phone} onChange={e => setForm({ ...form, phone: formatUzPhone(e.target.value) })} />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <Input label="Xodimlar soni" type="number" value={form.staffCount} onChange={e => {
            const raw = e.target.value;
            setForm({ ...form, staffCount: raw === '' ? '' : Number.isFinite(Number(raw)) ? Number(raw) : 0 });
          }} />
          <Input label="Tashkil etilgan yil" type="number" value={form.foundingYear} onChange={e => {
            const raw = e.target.value;
            setForm({ ...form, foundingYear: raw === '' ? '' : Number.isFinite(Number(raw)) ? Number(raw) : new Date().getFullYear() });
          }} />
          {selectedTuman && (
            <div className="sm:col-span-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
              Tanlangan tuman: <strong>{selectedTuman.name}</strong> • koordinatalar avtomatik to‘ldirildi.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
