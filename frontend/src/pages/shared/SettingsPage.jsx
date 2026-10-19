import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import ICONS from '../../components/icons.jsx';

export default function SettingsPage() {
  const { getSettings, updateSettings } = useApp();
  const { theme, setTheme } = useTheme();
  const settings = getSettings();
  const [form, setForm] = useState({ ...settings, theme: settings.theme || theme });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateSettings(form);
    if (form.theme) {
      setTheme(form.theme);
    }
    setSaved(true);
    toast.success("Tizim sozlamalari muvaffaqiyatli saqlandi!");
    setTimeout(() => setSaved(false), 3000);
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
            <Select
              label="Mavzu (Theme)"
              value={form.theme || theme}
              onChange={e => {
                const val = e.target.value;
                setForm({ ...form, theme: val });
                setTheme(val);
              }}
              options={[
                { value: 'light', label: '☀️ Yorug‘ rejim (Light)' },
                { value: 'dark', label: '🌙 Qorong‘i rejim (Dark)' },
                { value: 'system', label: '💻 Tizim sozlamasi (Avtomatik)' },
              ]}
            />
            <Select label="Til" value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}
              options={[{ value: 'uz', label: "O'zbekcha" }, { value: 'ru', label: 'Русский' }, { value: 'en', label: 'English' }]} />
            <Input label="Sahifa hajmi" type="number" value={form.itemsPerPage} onChange={e => {
              const raw = e.target.value;
              setForm({ ...form, itemsPerPage: raw === '' ? '' : Number.isFinite(Number(raw)) ? Number(raw) : 20 });
            }} />
          </div>
        </Card>

        {/* Security settings */}
        <Card title="Xavfsizlik sozlamalari">
          <div className="space-y-4">
            <Input label="Sessiya muddati (daqiqa)" type="number" value={form.sessionTimeout} onChange={e => {
              const raw = e.target.value;
              setForm({ ...form, sessionTimeout: raw === '' ? '' : Number.isFinite(Number(raw)) ? Number(raw) : 60 });
            }} />
            <Input label="Min. parol uzunligi" type="number" value={form.passwordMinLength} onChange={e => {
              const raw = e.target.value;
              setForm({ ...form, passwordMinLength: raw === '' ? '' : Number.isFinite(Number(raw)) ? Number(raw) : 6 });
            }} />
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-slate-200">Bildirishnomalar</p>
                <p className="text-xs text-gray-400 dark:text-slate-400">Tizim bildirishnomalarini yoqish</p>
              </div>
              <button onClick={() => setForm({ ...form, enableNotifications: !form.enableNotifications })}
                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${form.enableNotifications ? 'bg-blue-500' : 'bg-gray-300 dark:bg-slate-700'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.enableNotifications ? 'translate-x-6' : ''}`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-slate-200">Audit log</p>
                <p className="text-xs text-gray-400 dark:text-slate-400">Amallar tarixini qayd etish</p>
              </div>
              <button onClick={() => setForm({ ...form, enableAuditLog: !form.enableAuditLog })}
                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${form.enableAuditLog ? 'bg-blue-500' : 'bg-gray-300 dark:bg-slate-700'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.enableAuditLog ? 'translate-x-6' : ''}`} />
              </button>
            </div>
          </div>
        </Card>

        {/* System info */}
        <Card title="Tizim ma'lumotlari">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-slate-800/80">
              <span className="text-sm text-gray-500 dark:text-slate-400">Versiya</span>
              <Badge color="blue">v{form.systemVersion}</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-slate-800/80">
              <span className="text-sm text-gray-500 dark:text-slate-400">Texnologiya</span>
              <span className="text-sm font-medium text-gray-700 dark:text-slate-200">React 19 + Vite</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-slate-800/80">
              <span className="text-sm text-gray-500 dark:text-slate-400">Ma'lumotlar bazasi</span>
              <span className="text-sm font-medium text-gray-700 dark:text-slate-200">SQLite + REST API</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-slate-800/80">
              <span className="text-sm text-gray-500 dark:text-slate-400">Mavjud modullar</span>
              <span className="text-sm font-medium text-gray-700 dark:text-slate-200">21 ta</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-500 dark:text-slate-400">Rollar</span>
              <span className="text-sm font-medium text-gray-700 dark:text-slate-200">6 ta</span>
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
