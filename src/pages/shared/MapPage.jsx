import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import ICONS from '../../components/icons.jsx';
import { VILOYATLAR, getViloyatName } from '../../data/regions.js';
import { STORAGE_KEYS } from '../../data/constants.js';

export default function MapPage() {
  const { getCollection } = useApp();
  const [selectedViloyat, setSelectedViloyat] = useState(null);
  const libraries = useMemo(() => getCollection(STORAGE_KEYS.LIBRARIES), [getCollection]);

  return (
    <div>
      <PageHeader title="Xarita" subtitle="O'zbekiston viloyatlari kesimida kutubxonalar" icon={ICONS.map} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map area - visual representation */}
        <Card className="lg:col-span-2" title="O'zbekiston viloyatlari">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-2">
            {VILOYATLAR.map(v => {
              const libCount = libraries.filter(l => l.viloyatId === v.id).length;
              const isSelected = selectedViloyat === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedViloyat(isSelected ? null : v.id)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    isSelected
                      ? 'border-blue-400 bg-blue-50 shadow-md'
                      : libCount > 0
                        ? 'border-green-200 bg-green-50/50 hover:bg-green-50'
                        : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-1 ${
                    libCount > 0 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <ICONS.library className="text-sm" />
                  </div>
                  <p className="text-xs font-medium text-gray-700 truncate">{v.name.replace(' viloyati', '').replace(' shahri', '')}</p>
                  <p className="text-[10px] text-gray-400">{libCount} kutubxona</p>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Details panel */}
        <Card title={selectedViloyat ? getViloyatName(selectedViloyat) : "Tanlang"}>
          {!selectedViloyat ? (
            <div className="text-center py-8 text-sm text-gray-400">
              <ICONS.map className="text-4xl mx-auto mb-2 text-gray-300" />
              Ma'lumot ko'rish uchun viloyatni tanlang
            </div>
          ) : (
            <div className="space-y-3">
              {libraries.filter(l => l.viloyatId === selectedViloyat).map(lib => (
                <div key={lib.id} className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                  <div className="flex items-center gap-2 mb-1">
                    <ICONS.library className="text-blue-500 text-sm" />
                    <p className="font-medium text-gray-800 text-sm">{lib.name}</p>
                  </div>
                  <p className="text-xs text-gray-500">{lib.address}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <Badge color={lib.type === 'markaz' ? 'blue' : 'gray'}>{lib.type === 'markaz' ? 'Markaz' : 'Filial'}</Badge>
                    <span className="text-gray-400">{lib.phone}</span>
                  </div>
                </div>
              ))}
              {libraries.filter(l => l.viloyatId === selectedViloyat).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Bu viloyatda kutubxonalar yo'q</p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Summary statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
        <Card className="text-center">
          <p className="text-2xl font-bold text-blue-600">{VILOYATLAR.length}</p>
          <p className="text-xs text-gray-500">Viloyatlar</p>
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
