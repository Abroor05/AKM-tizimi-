import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import ICONS from '../../components/icons.jsx';
import { getAllTumanlar } from '../../data/regions.js';
import { STORAGE_KEYS, ROLES } from '../../data/constants.js';

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

export default function MapPage() {
  const { currentUser, getCollection, isRole } = useApp();
  const [selectedTuman, setSelectedTuman] = useState(null);
  const libraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES), [getCollection]);
  const allDistricts = useMemo(() => getAllTumanlar(), []);

  const accessibleDistricts = useMemo(() => {
    if (isRole(ROLES.SUPER_ADMIN, ROLES.VILOYAT_ADMIN)) return allDistricts;
    if (isRole(ROLES.TUMAN_ADMIN, ROLES.KUTUBXONA_XODIMI) && currentUser?.viloyatId && currentUser?.tumanId) {
      return allDistricts.filter(d => d.viloyatId === currentUser.viloyatId && d.id === currentUser.tumanId);
    }
    return [];
  }, [allDistricts, currentUser, isRole]);

  useEffect(() => {
    if (!selectedTuman && accessibleDistricts.length > 0) {
      setSelectedTuman(accessibleDistricts[0]);
    }
  }, [accessibleDistricts, selectedTuman]);

  const selectedLibraries = useMemo(() => {
    if (!selectedTuman) return [];
    return libraries.filter(l => l.viloyatId === selectedTuman.viloyatId && l.tumanId === selectedTuman.id);
  }, [libraries, selectedTuman]);

  const selectedCenter = selectedTuman && selectedTuman.lat && selectedTuman.lng
    ? [selectedTuman.lat, selectedTuman.lng]
    : [40.3864, 71.7864];

  return (
    <div>
      <PageHeader title="Xarita" subtitle="Farg'ona viloyati tumanlari va ularning joylashuvi" icon={ICONS.map} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2" title="Farg'ona tumanlari">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 p-2">
            {accessibleDistricts.map(district => {
              const libCount = libraries.filter(l => l.viloyatId === district.viloyatId && l.tumanId === district.id).length;
              const isSelected = selectedTuman?.id === district.id;
              return (
                <button
                  key={district.id}
                  onClick={() => setSelectedTuman(isSelected ? null : district)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    isSelected
                      ? 'border-blue-400 bg-blue-50 shadow-md'
                      : libCount > 0
                        ? 'border-green-200 bg-green-50/50 hover:bg-green-50'
                        : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-9 h-9 mx-auto rounded-full flex items-center justify-center mb-1 ${
                    libCount > 0 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <ICONS.location className="text-sm" />
                  </div>
                  <p className="text-xs font-medium text-gray-700 truncate">{district.name.replace(' tumani', '').replace(' shahri', '')}</p>
                  <p className="text-[10px] text-gray-400">{libCount} kutubxona</p>
                </button>
              );
            })}
          </div>
        </Card>

        <Card title={selectedTuman ? selectedTuman.name : 'Tuman tanlang'}>
          {!selectedTuman ? (
            <div className="text-center py-8 text-sm text-gray-400">
              <ICONS.map className="text-4xl mx-auto mb-2 text-gray-300" />
              Ma'lumot ko'rish uchun tumanni tanlang
            </div>
          ) : (
            <div className="space-y-3">
              <div className="h-52 overflow-hidden rounded-xl border border-gray-200">
                <MapContainer center={selectedCenter} zoom={11} scrollWheelZoom={false} className="h-full w-full">
                  <MapClickHandler onMapClick={({ lat, lng }) => openGoogleMaps(lat, lng)} />
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <CircleMarker center={selectedCenter} radius={12} pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.8 }} eventHandlers={{ click: () => openGoogleMaps(selectedCenter[0], selectedCenter[1]) }}>
                    <Popup>{selectedTuman.name}</Popup>
                  </CircleMarker>
                  {selectedLibraries.filter(lib => Number.isFinite(Number(lib.latitude)) && Number.isFinite(Number(lib.longitude))).map(lib => (
                    <CircleMarker
                      key={lib.id}
                      center={[Number(lib.latitude), Number(lib.longitude)]}
                      radius={10}
                      pathOptions={{ color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.9 }}
                      eventHandlers={{ click: () => openGoogleMaps(lib.latitude, lib.longitude) }}
                    >
                      <Popup>
                        <div className="text-xs">
                          <strong>{lib.name}</strong><br />
                          {lib.address}<br />
                          <button
                            type="button"
                            onClick={() => openGoogleMaps(lib.latitude, lib.longitude)}
                            className="mt-2 rounded bg-blue-600 px-2 py-1 text-[10px] font-medium text-white"
                          >
                            Google Mapsda ochish
                          </button>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>

              {selectedLibraries.length > 0 ? selectedLibraries.map(lib => (
                <div key={lib.id} className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                  <div className="flex items-center gap-2 mb-1">
                    <ICONS.library className="text-blue-500 text-sm" />
                    <p className="font-medium text-gray-800 text-sm">{lib.name}</p>
                  </div>
                  <p className="text-xs text-gray-500">{lib.address}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <Badge color={lib.type === 'markaz' ? 'blue' : 'gray'}>{lib.type === 'markaz' ? 'Markaz' : 'Filial'}</Badge>
                    <span className="text-gray-400">{lib.phone || 'Telefon yo‘q'}</span>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-gray-400 text-center py-4">Bu tumanda kutubxonalar yo'q</p>
              )}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
        <Card className="text-center">
          <p className="text-2xl font-bold text-blue-600">{accessibleDistricts.length}</p>
          <p className="text-xs text-gray-500">Tumanlar</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-green-600">{libraries.length}</p>
          <p className="text-xs text-gray-500">Kutubxonalar</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-amber-600">{libraries.filter(l => l.type === 'markaz').length}</p>
          <p className="text-xs text-gray-500">Markazlar</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-purple-600">{libraries.filter(l => l.type === 'filial').length}</p>
          <p className="text-xs text-gray-500">Filiallar</p>
        </Card>
      </div>
    </div>
  );
}
