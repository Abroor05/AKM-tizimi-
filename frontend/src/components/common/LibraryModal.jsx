import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '../../context/AppContext.jsx';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import { toast } from '../ui/Toast.jsx';
import ICONS from '../icons.jsx';
import { STORAGE_KEYS, ROLES } from '../../data/constants.js';
import { VILOYATLAR, getViloyatName, getTumanName, getTumanCoordinates } from '../../data/regions.js';
import { formatUzPhone } from '../../utils/helpers.js';

// Custom Map Pin Icons using SVG to guarantee zero 404 image errors in Vite
const pickerPinIcon = L.divIcon({
  className: 'library-picker-pin',
  html: `<div style="
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    width: 32px;
    height: 32px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 3px solid white;
    box-shadow: 0 6px 14px rgba(37, 99, 235, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <div style="
      width: 10px;
      height: 10px;
      background: white;
      border-radius: 50%;
      transform: rotate(45deg);
    "></div>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Helper component to center and refresh Leaflet inside Modal
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
      map.setView(center, zoom || map.getZoom());
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [center, zoom, map]);
  return null;
}

// Map click listener
function MapClickListener({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LibraryModal({
  isOpen,
  onClose,
  editItem = null,
  initialCoords = null,
  initialTumanId = '',
  initialViloyatId = '',
  onSuccess = null,
}) {
  const { currentUser, isRole, createEntity, updateEntity } = useApp();
  const isDistrictScopedUser = isRole(ROLES.TUMAN_ADMIN, ROLES.KUTUBXONA_XODIMI);

  const [form, setForm] = useState({
    name: '',
    type: 'markaz',
    viloyatId: 'v01',
    tumanId: '',
    address: '',
    latitude: '',
    longitude: '',
    phone: '+998',
    email: '',
    staffCount: 1,
    foundingYear: new Date().getFullYear(),
  });

  const [isLocating, setIsLocating] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);

  // Sync state when modal opens or editItem/initialCoords change
  useEffect(() => {
    if (!isOpen) return;

    if (editItem) {
      setForm({
        ...editItem,
        latitude: editItem.latitude != null ? String(editItem.latitude) : '',
        longitude: editItem.longitude != null ? String(editItem.longitude) : '',
        phone: editItem.phone || '+998',
      });
      setGpsAccuracy(null);
    } else {
      const defaultViloyat = isDistrictScopedUser ? (currentUser?.viloyatId || 'v01') : (initialViloyatId || 'v01');
      const defaultTuman = isDistrictScopedUser ? (currentUser?.tumanId || '') : (initialTumanId || '');
      
      let lat = '';
      let lng = '';
      if (initialCoords?.lat && initialCoords?.lng) {
        lat = String(Number(initialCoords.lat).toFixed(6));
        lng = String(Number(initialCoords.lng).toFixed(6));
      } else if (defaultViloyat && defaultTuman) {
        const coords = getTumanCoordinates(defaultViloyat, defaultTuman);
        if (coords) {
          lat = String(coords.lat);
          lng = String(coords.lng);
        }
      }

      setForm({
        name: '',
        type: 'markaz',
        viloyatId: defaultViloyat,
        tumanId: defaultTuman,
        address: '',
        latitude: lat,
        longitude: lng,
        phone: '+998',
        email: '',
        staffCount: 1,
        foundingYear: new Date().getFullYear(),
      });
      setGpsAccuracy(null);
    }
  }, [isOpen, editItem, initialCoords, initialTumanId, initialViloyatId, isDistrictScopedUser, currentUser]);

  const selectedViloyat = useMemo(() => {
    return VILOYATLAR.find(v => v.id === form.viloyatId) || VILOYATLAR[0];
  }, [form.viloyatId]);

  const selectedTuman = useMemo(() => {
    return selectedViloyat?.tumanlar.find(t => t.id === form.tumanId) || null;
  }, [selectedViloyat, form.tumanId]);

  // Real-time GPS Location Handler
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.warning("Brauzeringizda geolokatsiya (GPS) xizmati qo'llab-quvvatlanmaydi.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const latStr = latitude.toFixed(6);
        const lngStr = longitude.toFixed(6);

        setForm(prev => ({
          ...prev,
          latitude: latStr,
          longitude: lngStr,
        }));
        setGpsAccuracy(Math.round(accuracy));
        setIsLocating(false);
        toast.success(`Hozirgi real-time joylashuv aniqlandi (aniqlik: ~${Math.round(accuracy)}m)!`);
      },
      (error) => {
        setIsLocating(false);
        let errorMsg = "Joylashuvni aniqlab bo'lmadi.";
        if (error.code === 1) {
          errorMsg = "Joylashuvni aniqlashga ruxsat berilmadi. Iltimos, brauzer sozlamalaridan geolokatsiyani yoqing.";
        } else if (error.code === 2) {
          errorMsg = "Joylashuv ma'lumoti mavjud emas. GPS va internet aloqasini tekshiring.";
        } else if (error.code === 3) {
          errorMsg = "Joylashuvni aniqlash vaqti tugadi (timeout). Qaytadan urinib ko'ring.";
        }
        toast.warning(errorMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  };

  const handleLocationSelect = (lat, lng) => {
    setForm(prev => ({
      ...prev,
      latitude: Number(lat).toFixed(6),
      longitude: Number(lng).toFixed(6),
    }));
    setGpsAccuracy(null);
  };

  const openInGoogleMaps = () => {
    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    window.open(`https://www.google.com/maps?q=${lat},${lng}&z=17`, '_blank', 'noopener,noreferrer');
  };

  const handleSave = () => {
    if (!form.name?.trim()) {
      toast.warning("Iltimos, kutubxona nomini kiriting!");
      return;
    }
    if (!form.viloyatId || !form.tumanId) {
      toast.warning("Iltimos, viloyat va tuman/shaharni tanlang!");
      return;
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      phone: form.phone || '+998',
      viloyatId: isDistrictScopedUser ? currentUser?.viloyatId : form.viloyatId,
      tumanId: isDistrictScopedUser ? currentUser?.tumanId : form.tumanId,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      staffCount: Number(form.staffCount) || 1,
      foundingYear: Number(form.foundingYear) || new Date().getFullYear(),
    };

    if (editItem) {
      updateEntity(STORAGE_KEYS.LIBRARIES, editItem.id, payload);
      toast.success("Kutubxona ma'lumotlari muvaffaqiyatli yangilandi!");
    } else {
      createEntity(STORAGE_KEYS.LIBRARIES, { ...payload, status: 'active' });
      toast.success("Yangi kutubxona muvaffaqiyatli saqlandi!");
    }

    onSuccess?.();
    onClose();
  };

  // Center calculation for the map inside modal
  const mapCenter = useMemo(() => {
    if (form.latitude && form.longitude && !isNaN(Number(form.latitude)) && !isNaN(Number(form.longitude))) {
      return [Number(form.latitude), Number(form.longitude)];
    }
    if (selectedTuman?.lat && selectedTuman?.lng) {
      return [selectedTuman.lat, selectedTuman.lng];
    }
    return [40.3864, 71.7864];
  }, [form.latitude, form.longitude, selectedTuman]);

  const hasCoordinates = form.latitude && form.longitude && !isNaN(Number(form.latitude)) && !isNaN(Number(form.longitude));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editItem ? "Kutubxonani tahrirlash" : "Yangi kutubxona qo'shish"}
      subtitle={isDistrictScopedUser ? `${getTumanName(currentUser?.viloyatId, currentUser?.tumanId)} bo'yicha` : null}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Bekor qilish</Button>
          <Button onClick={handleSave} className="flex items-center gap-2">
            <ICONS.save /> Saqlash
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Basic fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Kutubxona / Filial nomi"
            placeholder="Masalan: 12-sonli AKM filiali"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
          />
          <Select
            label="Turi"
            value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value })}
            options={[
              { value: 'markaz', label: 'Markaziy AKM' },
              { value: 'filial', label: 'Tuman / Shahar filiali' },
            ]}
          />
          <Select
            label="Viloyat"
            value={isDistrictScopedUser ? (currentUser?.viloyatId || '') : form.viloyatId}
            onChange={e => {
              const nextViloyat = e.target.value;
              setForm({ ...form, viloyatId: nextViloyat, tumanId: '', latitude: '', longitude: '' });
            }}
            options={VILOYATLAR.map(v => ({ value: v.id, label: v.name }))}
            required
            disabled={isDistrictScopedUser}
          />
          <Select
            label="Tuman / Shahar"
            value={isDistrictScopedUser ? (currentUser?.tumanId || '') : form.tumanId}
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
            placeholder={!form.viloyatId ? "Avval viloyatni tanlang..." : "Tanlang..."}
          />
          <Input
            label="Aniq manzil yoki mo'ljal"
            placeholder="Masalan: Mustaqillik ko'chasi, 24-uy (Hokimiyat yonida)"
            value={form.address}
            onChange={e => setForm({ ...form, address: e.target.value })}
            className="sm:col-span-2"
          />
        </div>

        {/* Real-time Location and Interactive Map Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <div className="flex items-center gap-2">
                <ICONS.location className="text-blue-600 dark:text-blue-400 text-base" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Xaritadagi joylashuv (Geolokatsiya)
                </h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Xaritani bosib nuqtani belgilang yoki telefon/qurilma GPS orqali real-time oling
              </p>
            </div>

            {/* Real-time Location Button */}
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={isLocating}
              className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                isLocating
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 animate-pulse'
                  : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
              }`}
            >
              <ICONS.location className={isLocating ? 'animate-spin' : ''} />
              {isLocating ? "GPS orqali aniqlanmoqda..." : "📍 Hozirgi joylashuvimni aniqlash (GPS)"}
            </button>
          </div>

          {/* Interactive Leaflet Map Picker */}
          <div className="relative h-60 sm:h-72 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner z-0">
            <MapContainer
              center={mapCenter}
              zoom={hasCoordinates ? 16 : 12}
              scrollWheelZoom={true}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapController center={mapCenter} zoom={hasCoordinates ? 16 : 12} />
              <MapClickListener onSelect={handleLocationSelect} />

              {hasCoordinates && (
                <>
                  <Marker
                    position={[Number(form.latitude), Number(form.longitude)]}
                    icon={pickerPinIcon}
                    draggable={true}
                    eventHandlers={{
                      dragend: (e) => {
                        const marker = e.target;
                        if (marker) {
                          const { lat, lng } = marker.getLatLng();
                          handleLocationSelect(lat, lng);
                        }
                      },
                    }}
                  >
                    <Popup>
                      <div className="text-xs font-sans text-slate-800">
                        <p className="font-bold text-blue-600 mb-0.5">{form.name || "Kutubxona joylashuvi"}</p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {Number(form.latitude).toFixed(6)}, {Number(form.longitude).toFixed(6)}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 italic">
                          Belgilangan nuqtani surib (drag) aniqlashtirishingiz mumkin
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                  {gpsAccuracy && (
                    <Circle
                      center={[Number(form.latitude), Number(form.longitude)]}
                      radius={gpsAccuracy}
                      pathOptions={{ color: '#3b82f6', fillColor: '#60a5fa', fillOpacity: 0.15, weight: 1.5 }}
                    />
                  )}
                </>
              )}
            </MapContainer>

            {/* Overlay hint */}
            {!hasCoordinates && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md border border-slate-200/80 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 pointer-events-none z-[400] flex items-center gap-1.5">
                <ICONS.location className="text-blue-500" />
                Xaritani istalgan joyini bosib nuqta qo'ying
              </div>
            )}
          </div>

          {/* Coordinates readout and actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <Input
              label="Kenglik (Latitude)"
              type="number"
              step="0.000001"
              placeholder="Masalan: 40.386400"
              value={form.latitude}
              onChange={e => setForm({ ...form, latitude: e.target.value })}
            />
            <Input
              label="Uzunlik (Longitude)"
              type="number"
              step="0.000001"
              placeholder="Masalan: 71.786400"
              value={form.longitude}
              onChange={e => setForm({ ...form, longitude: e.target.value })}
            />
          </div>

          {hasCoordinates && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-slate-200/60 dark:border-slate-800">
              <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                <ICONS.check className="text-emerald-600 dark:text-emerald-400" />
                Koordinatalar belgilangan: <strong>{Number(form.latitude).toFixed(6)}, {Number(form.longitude).toFixed(6)}</strong>
                {gpsAccuracy && ` (GPS aniqligi: ~${gpsAccuracy}m)`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openInGoogleMaps}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <ICONS.globe className="text-xs" /> Google Maps'da tekshirish
                </button>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, latitude: '', longitude: '' }))}
                  className="text-rose-600 dark:text-rose-400 hover:underline font-medium cursor-pointer ml-2"
                >
                  Tozalash
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Additional information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <Input
            label="Aloqa telefoni"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: formatUzPhone(e.target.value) })}
          />
          <Input
            label="Elektron pochta"
            type="email"
            placeholder="kutubxona@akm.uz"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Xodimlar soni"
            type="number"
            min="1"
            value={form.staffCount}
            onChange={e => setForm({ ...form, staffCount: e.target.value === '' ? '' : Number(e.target.value) })}
          />
          <Input
            label="Tashkil etilgan yil"
            type="number"
            value={form.foundingYear}
            onChange={e => setForm({ ...form, foundingYear: e.target.value === '' ? '' : Number(e.target.value) })}
          />
        </div>
      </div>
    </Modal>
  );
}
