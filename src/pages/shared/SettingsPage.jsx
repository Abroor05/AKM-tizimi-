import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Badge from '../../components/ui/Badge.jsx';
import ICONS from '../../components/icons.jsx';

export default function SettingsPage() {
  const { getSettings, updateSettings, resetAllData } = useApp();
  const settings = getSettings();
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    if (confirm('DIQQAT: Barcha ma\'lumotlar boshlang\'ich holatga qaytariladi va o\'chiriladi. Davom etasizmi?')) {
      if (confirm('Yana bir bor tasdiqlang: Haqiqatan ham barcha ma\'lumotlarni reset qilmoqchimisiz?')) {
        resetAllData();
      }
    }
  };

  return (
    <div>
      <PageHeader title="Tizim sozlamalari" subtitle="Tizim konfiguratsiyasi va parametrlar" icon={ICONS.settings} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* General settings */}
        <Card title="Umumiy sozlamalar">
          <div className="space-y-4">
            <Input label="Tizim nomi" value={form.systemName} onChange={e => setForm({ ...form, systemName: e.target.value })} />
            <Input label="Tashkilot" value={form.organization} onChange={e => setForm({ ...form, organization: e.target.value })} />
            <Select label="Til" value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}
              options={[{ value: 'uz', label: "O'zbekcha" }, { value: 'ru', label: 'Русский' }, { value: 'en', label: 'English' }]} />
            <Input label="Sahifa hajmi" type="number" value={form.itemsPerPage} onChange={e => setForm({ ...form, itemsPerPage: parseInt(e.target.value) || 20 })} />
          </div>
        </Card>

        {/* Security settings */}
        <Card title="Xavfsizlik sozlamalari">
          <div className="space-y-4">
            <Input label="Sessiya muddati (daqiqa)" type="number" value={form.sessionTimeout} onChange={e => setForm({ ...form, sessionTimeout: parseInt(e.target.value) || 60 })} />
            <Input label="Min. parol uzunligi" type="number" value={form.passwordMinLength} onChange={e => setForm({ ...form, passwordMinLength: parseInt(e.target.value) || 6 })} />
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-700">Bildirishnomalar</p>
                <p className="text-xs text-gray-400">Tizim bildirishnomalarini yoqish</p>
              </div>
              <button onClick={() => setForm({ ...form, enableNotifications: !form.enableNotifications })}
                className={`relative w-12 h-6 rounded-full transition-colors ${form.enableNotifications ? 'bg-blue-500' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.enableNotifications ? 'translate-x-6' : ''}`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-700">Audit log</p>
                <p className="text-xs text-gray-400">Amallar tarixini qayd etish</p>
              </div>
              <button onClick={() => setForm({ ...form, enableAuditLog: !form.enableAuditLog })}
                className={`relative w-12 h-6 rounded-full transition-colors ${form.enableAuditLog ? 'bg-blue-500' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.enableAuditLog ? 'translate-x-6' : ''}`} />
              </button>
            </div>
          </div>
        </Card>

        {/* System info */}
        <Card title="Tizim ma'lumotlari">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">Versiya</span>
              <Badge color="blue">v{form.systemVersion}</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">Texnologiya</span>
              <span className="text-sm font-medium text-gray-700">React 19 + Vite</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">Ma'lumotlar bazasi</span>
              <span className="text-sm font-medium text-gray-700">localStorage</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">Mavjud modullar</span>
              <span className="text-sm font-medium text-gray-700">21 ta</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-500">Rollar</span>
              <span className="text-sm font-medium text-gray-700">6 ta</span>
            </div>
          </div>
        </Card>

        {/* Danger zone */}
        <Card title="Xavfli hudud">
          <div className="space-y-4">
            <div className="p-4 rounded-lg border-2 border-red-200 bg-red-50">
              <div className="flex items-start gap-3">
                <ICONS.warning className="text-red-600 text-xl mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-red-800">Ma'lumotlarni reset qilish</h4>
                  <p className="text-xs text-red-600 mt-1">Barcha ma'lumotlar o'chiriladi va boshlang'ich holatga qaytariladi. Bu amalni bekor qilib bo'lmaydi!</p>
                  <button onClick={handleReset} className="mt-3 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors">
                    Reset qilish
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Save button */}
      <div className="flex justify-end mt-6">
        {saved && <Badge color="green" className="mr-3"><ICONS.check className="text-xs" /> Saqlandi</Badge>}
        <Button onClick={handleSave} size="lg"><ICONS.save /> Sozlamalarni saqlash</Button>
      </div>
    </div>
  );
}
