import { useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import ICONS from '../../components/icons.jsx';
import { getAllTumanlar, getViloyatName, getTumanName } from '../../data/regions.js';
import { STORAGE_KEYS, ROLES } from '../../data/constants.js';
import LibraryModal from '../../components/common/LibraryModal.jsx';

// Custom Pin Icons to prevent Vite image missing bugs
const createPinIcon = (type, isSelected = false) => {
  const isMarkaz = type === 'markaz';
  const bgColor = isMarkaz ? '#2563eb' : '#16a34a';
  const borderColor = isSelected ? '#fbbf24' : '#ffffff';
  const scale = isSelected ? 'scale-110' : '';

  return L.divIcon({
    className: 'custom-lib-marker',
    html: `<div class="relative transition-transform ${scale}" style="
      background: ${bgColor};
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid ${borderColor};
      box-shadow: 0 4px 10px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
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
};

const userLiveIcon = L.divIcon({
  className: 'user-live-gps-pin',
  html: `<div class="relative flex items-center justify-center">
    <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-blue-400 opacity-75"></span>
    <span class="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white shadow-lg"></span>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

const clickPointIcon = L.divIcon({
  className: 'clicked-point-pin',
  html: `<div style="
    background: #dc2626;
    width: 30px;
    height: 30px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 3px solid white;
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <div style="
      width: 8px;
      height: 8px;
      background: white;
      border-radius: 50%;
      transform: rotate(45deg);
    "></div>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

// Map controller to smoothly fly to coordinates and invalidate size
function MapFlyController({ target, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (target && Number.isFinite(target[0]) && Number.isFinite(target[1])) {
      map.flyTo(target, zoom || map.getZoom(), { duration: 1.2 });
      setTimeout(() => map.invalidateSize(), 150);
    }
  }, [target, zoom, map]);
  return null;
}

// Map Click Listener to pick location
function MapEventsListener({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

const openGoogleMaps = (lat, lng) => {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
  window.open(`https://www.google.com/maps?q=${latitude},${longitude}&z=17`, '_blank', 'noopener,noreferrer');
};

export default function MapPage() {
  const { currentUser, getCollection, isRole } = useApp();
  const libraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES), [getCollection]);
  const allDistricts = useMemo(() => getAllTumanlar(), []);

  const isDistrictScopedUser = isRole(ROLES.TUMAN_ADMIN, ROLES.KUTUBXONA_XODIMI);
  const canManage = isRole(ROLES.SUPER_ADMIN, ROLES.VILOYAT_ADMIN, ROLES.TUMAN_ADMIN);

  const accessibleDistricts = useMemo(() => {
    if (isRole(ROLES.SUPER_ADMIN, ROLES.VILOYAT_ADMIN)) return allDistricts;
    if (isDistrictScopedUser && currentUser?.viloyatId && currentUser?.tumanId) {
      return allDistricts.filter(d => d.viloyatId === currentUser.viloyatId && d.id === currentUser.tumanId);
    }
    return allDistricts;
  }, [allDistricts, currentUser, isRole, isDistrictScopedUser]);

  const [selectedTuman, setSelectedTuman] = useState(null);
  const [mapTarget, setMapTarget] = useState(null);
  const [mapZoom, setMapZoom] = useState(12);
  const [userLocation, setUserLocation] = useState(null);
  const [clickedPoint, setClickedPoint] = useState(null);
  const [activeLibrary, setActiveLibrary] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, markaz, filial, unlocated

  // Library modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [modalCoords, setModalCoords] = useState(null);

  // Initialize selected district
  useEffect(() => {
    if (!selectedTuman && accessibleDistricts.length > 0) {
      setSelectedTuman(accessibleDistricts[0]);
    }
  }, [accessibleDistricts, selectedTuman]);

  // Center map on district when selected
  useEffect(() => {
    if (selectedTuman?.lat && selectedTuman?.lng) {
      setMapTarget([Number(selectedTuman.lat), Number(selectedTuman.lng)]);
      setMapZoom(12);
    }
  }, [selectedTuman]);

  // Libraries in the selected district
  const districtLibraries = useMemo(() => {
    if (!selectedTuman) return [];
    return libraries.filter(l => l.viloyatId === selectedTuman.viloyatId && l.tumanId === selectedTuman.id);
  }, [libraries, selectedTuman]);

  // Filtered libraries for search / tabs
  const filteredLibraries = useMemo(() => {
    return districtLibraries.filter(lib => {
      const matchSearch = !searchQuery ||
        lib.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lib.address?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const hasCoords = Number.isFinite(Number(lib.latitude)) && Number.isFinite(Number(lib.longitude));
      let matchType = true;
      if (filterType === 'markaz') matchType = lib.type === 'markaz';
      else if (filterType === 'filial') matchType = lib.type === 'filial';
      else if (filterType === 'unlocated') matchType = !hasCoords;

      return matchSearch && matchType;
    });
  }, [districtLibraries, searchQuery, filterType]);

  // Real-time GPS Location Handler
  const handleFindMyLocation = () => {
    if (!navigator.geolocation) {
      toast.warning("Brauzeringizda geolokatsiya (GPS) xizmati qo'llab-quvvatlanmaydi.");
      return;
    }

    toast.info("GPS orqali hozirgi joylashuvingiz aniqlanmoqda...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const loc = { lat: latitude, lng: longitude, accuracy: Math.round(accuracy) };
        setUserLocation(loc);
        setMapTarget([latitude, longitude]);
        setMapZoom(16);
        toast.success(`Hozirgi joylashuvingiz aniqlandi (aniqlik: ~${Math.round(accuracy)}m)!`);
      },
      (err) => {
        let msg = "Joylashuvni aniqlab bo'lmadi.";
        if (err.code === 1) msg = "Joylashuvga ruxsat berilmadi. Brauzer sozlamalaridan geolokatsiyani yoqing.";
        toast.warning(msg);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const handleMapClick = (latlng) => {
    setClickedPoint({ lat: latlng.lat, lng: latlng.lng });
  };

  const openCreateModal = (coords = null) => {
    setEditItem(null);
    setModalCoords(coords || clickedPoint);
    setIsModalOpen(true);
  };

  const openEditModal = (lib) => {
    setEditItem(lib);
    setModalCoords(null);
    setIsModalOpen(true);
  };

  const focusLibraryOnMap = (lib) => {
    setActiveLibrary(lib);
    if (Number.isFinite(Number(lib.latitude)) && Number.isFinite(Number(lib.longitude))) {
      setMapTarget([Number(lib.latitude), Number(lib.longitude)]);
      setMapZoom(16);
    } else {
      toast.info(`"${lib.name}" uchun koordinatalar belgilanmagan. Tahrirlash orqali belgilashingiz mumkin.`);
      if (canManage) {
        openEditModal(lib);
      }
    }
  };

  const initialCenter = useMemo(() => {
    if (selectedTuman?.lat && selectedTuman?.lng) {
      return [selectedTuman.lat, selectedTuman.lng];
    }
    return [40.3864, 71.7864];
  }, [selectedTuman]);

  // Statistics
  const locatedCount = districtLibraries.filter(l => Number.isFinite(Number(l.latitude)) && Number.isFinite(Number(l.longitude))).length;
  const unlocatedCount = districtLibraries.length - locatedCount;

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        title="Xarita va Geolokatsiya"
        subtitle={isDistrictScopedUser
          ? `${selectedTuman?.name || "Tuman"} kutubxonalari joylashuvi va real-time monitoringi`
          : "Farg'ona viloyati bo'yicha axborot-kutubxona markazlari xaritasi"
        }
        icon={ICONS.map}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleFindMyLocation}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <ICONS.location />
              <span>Joriy joylashuvim (GPS)</span>
            </button>

            {canManage && (
              <Button onClick={() => openCreateModal()} className="flex items-center gap-2 text-xs sm:text-sm">
                <ICONS.plus />
                <span>Yangi kutubxona qo'shish</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{districtLibraries.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Jami kutubxonalar</p>
        </Card>
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{locatedCount}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Xaritada belgilangan</p>
        </Card>
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {districtLibraries.filter(l => l.type === 'markaz').length}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Markaziy AKM</p>
        </Card>
        <Card className="p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
            {districtLibraries.filter(l => l.type === 'filial').length}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Filiallar</p>
        </Card>
      </div>

      {/* Main Map & District Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* District selector if not scoped to single district */}
        {!isDistrictScopedUser && (
          <Card className="lg:col-span-3 p-3.5 space-y-3" title="Tuman / Shaharlar">
            <div className="max-h-[560px] overflow-y-auto space-y-1.5 pr-1">
              {accessibleDistricts.map(district => {
                const count = libraries.filter(l => l.viloyatId === district.viloyatId && l.tumanId === district.id).length;
                const isSelected = selectedTuman?.id === district.id;
                return (
                  <button
                    key={district.id}
                    onClick={() => {
                      setSelectedTuman(district);
                      setClickedPoint(null);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white font-semibold shadow-sm'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <ICONS.location className={isSelected ? 'text-white' : 'text-slate-400'} />
                      <span className="truncate">{district.name}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* Map View */}
        <div className={isDistrictScopedUser ? 'lg:col-span-12' : 'lg:col-span-9'}>
          <Card noPadding className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
            {/* Top Toolbar */}
            <div className="p-3 sm:px-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                  {selectedTuman?.name || "Tuman"} xaritasi
                </span>
                <Badge color="blue">{locatedCount} ta nuqta</Badge>
                {unlocatedCount > 0 && (
                  <Badge color="amber">{unlocatedCount} ta koordinatasiz</Badge>
                )}
              </div>

              {/* Legend & quick buttons */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <span className="w-3 h-3 rounded-full bg-blue-600 inline-block shadow-xs"></span>
                  Markaz (AKM)
                </span>
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block shadow-xs"></span>
                  Filial
                </span>
                {userLocation && (
                  <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping inline-block"></span>
                    Sizning joylashuvingiz
                  </span>
                )}
              </div>
            </div>

            {/* Interactive Leaflet Map Container */}
            <div className="relative h-[480px] sm:h-[540px] w-full z-0">
              <MapContainer
                center={initialCenter}
                zoom={12}
                scrollWheelZoom={true}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapFlyController target={mapTarget} zoom={mapZoom} />
                <MapEventsListener onMapClick={handleMapClick} />

                {/* Libraries with valid coordinates */}
                {districtLibraries
                  .filter(lib => Number.isFinite(Number(lib.latitude)) && Number.isFinite(Number(lib.longitude)))
                  .map(lib => {
                    const isSelected = activeLibrary?.id === lib.id;
                    return (
                      <Marker
                        key={lib.id}
                        position={[Number(lib.latitude), Number(lib.longitude)]}
                        icon={createPinIcon(lib.type, isSelected)}
                      >
                        <Popup>
                          <div className="text-xs p-1 min-w-[200px] text-slate-800">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                lib.type === 'markaz' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {lib.type === 'markaz' ? 'Markaziy AKM' : 'Filial'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {Number(lib.latitude).toFixed(4)}, {Number(lib.longitude).toFixed(4)}
                              </span>
                            </div>

                            <h4 className="font-bold text-sm text-slate-900 mb-1">{lib.name}</h4>
                            <p className="text-slate-600 mb-2 leading-relaxed">{lib.address || 'Manzil kiritilmagan'}</p>

                            <div className="text-[11px] text-slate-500 space-y-1 mb-3 pt-2 border-t border-slate-100">
                              {lib.phone && (
                                <p className="flex items-center gap-1.5">
                                  <ICONS.phone className="text-slate-400 text-xs" /> {lib.phone}
                                </p>
                              )}
                              <p className="flex items-center gap-1.5">
                                <ICONS.users className="text-slate-400 text-xs" /> Xodimlar: {lib.staffCount || 1} kishi
                              </p>
                            </div>

                            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => openGoogleMaps(lib.latitude, lib.longitude)}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold py-1.5 px-2 rounded-lg text-center transition-colors cursor-pointer"
                              >
                                Google Maps
                              </button>
                              {canManage && (
                                <button
                                  type="button"
                                  onClick={() => openEditModal(lib)}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer"
                                  title="Tahrirlash / Joylashuvni o'zgartirish"
                                >
                                  Tahrirlash
                                </button>
                              )}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}

                {/* User's live GPS location */}
                {userLocation && (
                  <>
                    <Marker
                      position={[userLocation.lat, userLocation.lng]}
                      icon={userLiveIcon}
                    >
                      <Popup>
                        <div className="text-xs text-center font-sans">
                          <p className="font-bold text-blue-600">Sizning joriy joylashuvingiz</p>
                          <p className="text-slate-500 font-mono text-[11px]">
                            {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                          </p>
                          {userLocation.accuracy && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Aniqlik: ±{userLocation.accuracy} metr
                            </p>
                          )}
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => openCreateModal(userLocation)}
                              className="mt-2 w-full bg-blue-600 text-white py-1 px-2 rounded text-[11px] font-semibold cursor-pointer"
                            >
                              Shu joyda kutubxona qo'shish
                            </button>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                    <Circle
                      center={[userLocation.lat, userLocation.lng]}
                      radius={userLocation.accuracy || 20}
                      pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 1.5 }}
                    />
                  </>
                )}

                {/* Temporary marker when clicking anywhere on the map */}
                {clickedPoint && (
                  <Marker
                    position={[clickedPoint.lat, clickedPoint.lng]}
                    icon={clickPointIcon}
                  >
                    <Popup>
                      <div className="text-xs p-1 text-center font-sans">
                        <p className="font-bold text-slate-800 mb-1">Xaritada tanlangan nuqta</p>
                        <p className="text-slate-500 font-mono text-[11px] mb-2">
                          {clickedPoint.lat.toFixed(6)}, {clickedPoint.lng.toFixed(6)}
                        </p>
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => openCreateModal(clickedPoint)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-3 rounded-lg text-xs font-semibold shadow-xs cursor-pointer w-full transition-colors"
                          >
                            ➕ Shu joyga kutubxona qo'shish
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openGoogleMaps(clickedPoint.lat, clickedPoint.lng)}
                            className="bg-blue-600 text-white py-1 px-2 rounded text-xs"
                          >
                            Google Mapsda ko'rish
                          </button>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>

              {/* Map Floating Helper */}
              {canManage && (
                <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-3 py-2 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 z-[400] hidden sm:flex items-center gap-2">
                  <ICONS.info className="text-blue-500 shrink-0" />
                  <span>Xaritani istalgan joyini bosib yangi kutubxona joylashuvini belgilashingiz mumkin</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* District Libraries Directory & Search */}
      <Card title={`${selectedTuman?.name || "Tuman"} kutubxonalari ro'yxati`}>
        <div className="space-y-4">
          {/* Filters and search */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <ICONS.search className="absolute left-3.5 top-3.5 text-slate-400 text-sm" />
              <input
                type="text"
                placeholder="Kutubxona nomi yoki manzili bo'yicha qidirish..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Hammasi ({districtLibraries.length})
              </button>
              <button
                onClick={() => setFilterType('markaz')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  filterType === 'markaz'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Markazlar ({districtLibraries.filter(l => l.type === 'markaz').length})
              </button>
              <button
                onClick={() => setFilterType('filial')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  filterType === 'filial'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Filiallar ({districtLibraries.filter(l => l.type === 'filial').length})
              </button>
              {unlocatedCount > 0 && (
                <button
                  onClick={() => setFilterType('unlocated')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    filterType === 'unlocated'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100'
                  }`}
                >
                  GPS belgilanmagan ({unlocatedCount})
                </button>
              )}
            </div>
          </div>

          {/* Cards Grid */}
          {filteredLibraries.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">
              <ICONS.library className="text-4xl mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              Hech qanday kutubxona topilmadi
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredLibraries.map(lib => {
                const hasCoords = Number.isFinite(Number(lib.latitude)) && Number.isFinite(Number(lib.longitude));
                return (
                  <div
                    key={lib.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-500 transition-all flex flex-col justify-between shadow-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge color={lib.type === 'markaz' ? 'blue' : 'gray'}>
                          {lib.type === 'markaz' ? 'Markaziy AKM' : 'Filial'}
                        </Badge>

                        {hasCoords ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                            <ICONS.location className="text-xs" /> GPS bor
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md">
                            ⚠️ GPS yo'q
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1">{lib.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">
                        {lib.address || "Manzil ko'rsatilmagan"}
                      </p>

                      {hasCoords && (
                        <p className="text-[11px] font-mono text-slate-400 mb-2">
                          {Number(lib.latitude).toFixed(5)}, {Number(lib.longitude).toFixed(5)}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => focusLibraryOnMap(lib)}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <ICONS.map className="text-xs" /> Xaritada ko'rish
                      </button>

                      {canManage && (
                        <button
                          onClick={() => openEditModal(lib)}
                          className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="Tahrirlash / Joylashuvni kiritish"
                        >
                          Tahrirlash
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Shared Library Create/Edit Modal with Real-time GPS and Map Picker */}
      <LibraryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editItem={editItem}
        initialCoords={modalCoords}
        initialViloyatId={selectedTuman?.viloyatId}
        initialTumanId={selectedTuman?.id}
        onSuccess={() => {
          setClickedPoint(null);
        }}
      />
    </div>
  );
}
