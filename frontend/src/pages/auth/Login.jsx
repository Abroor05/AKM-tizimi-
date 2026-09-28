import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import Logo from '../../components/ui/Logo.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import ICONS from '../../components/icons.jsx';
import { formatUzPhone } from '../../utils/helpers.js';
import { getLastRoute } from '../../utils/api.js';

export default function Login() {
  const { login, initialized, needsBootstrap, bootstrap, resetAllData } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = new URLSearchParams(location.search).get('redirect') || getLastRoute();

  // Login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Bootstrap state
  const [bsName, setBsName] = useState('');
  const [bsUsername, setBsUsername] = useState('');
  const [bsPassword, setBsPassword] = useState('');
  const [bsConfirm, setBsConfirm] = useState('');
  const [bsPhone, setBsPhone] = useState('+998');
  const [bsEmail, setBsEmail] = useState('');
  const [bsShowPassword, setBsShowPassword] = useState(false);

  // --- Login handler ---
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!initialized) return;
    setError('');
    setLoading(true);

    try {
      const result = await login(username, password);
      if (result.success) {
        navigate(redirectPath.startsWith('/') ? redirectPath : '/dashboard', { replace: true });
      } else {
        setError(result.message || 'Login xatosi');
      }
    } catch (err) {
      setError(err.message || 'Login xatosi');
    }
    setLoading(false);
  };

  // --- Bootstrap handler ---
  const handleBootstrap = async (e) => {
    e.preventDefault();
    setError('');

    if (!bsName.trim() || !bsUsername.trim() || !bsPassword) {
      setError('Ism, login va parol majburiy');
      return;
    }
    if (bsPassword.length < 6) {
      setError('Parol kamida 6 ta belgidan iborat bolishi kerak');
      return;
    }
    if (bsPassword !== bsConfirm) {
      setError('Parollar mos kelmadi');
      return;
    }

    setLoading(true);
    try {
      const result = await bootstrap({
        fullName: bsName.trim(),
        username: bsUsername.trim(),
        password: bsPassword,
        phone: bsPhone.trim() || undefined,
        email: bsEmail.trim() || undefined,
      });
      if (result.success) {
        navigate(redirectPath.startsWith('/') ? redirectPath : '/dashboard', { replace: true });
      } else {
        setError(result.message || 'Sozlama xatosi');
      }
    } catch (err) {
      setError(err.message || 'Sozlama xatosi');
    }
    setLoading(false);
  };

  // --- Bootstrap form (first-time setup) ---
  if (needsBootstrap) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="flex justify-center mb-4">
              <Logo size="lg" color="blue" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1 text-center">Tizimni sozlash</h2>
            <p className="text-sm text-gray-500 mb-6 text-center">
              Bu birinchi marta ishga tushirilmoqda. Boshlangich administrator hisobini yarating.
            </p>

            <form onSubmit={handleBootstrap} className="space-y-4">
              <Input
                label="F.I.O *"
                type="text"
                value={bsName}
                onChange={(e) => setBsName(e.target.value)}
                placeholder="Familiya Ism Sharif"
                required
                disabled={loading}
              />
              <Input
                label="Login *"
                type="text"
                value={bsUsername}
                onChange={(e) => setBsUsername(e.target.value)}
                placeholder="Loginni oylab oling"
                required
                disabled={loading}
              />

              <div className="relative">
                <Input
                  label="Parol *"
                  type={bsShowPassword ? 'text' : 'password'}
                  value={bsPassword}
                  onChange={(e) => setBsPassword(e.target.value)}
                  placeholder="Kamida 6 ta belgi"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setBsShowPassword(!bsShowPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                >
                  <ICONS.eye />
                </button>
              </div>

              <Input
                label="Parolni tasdiqlash *"
                type={bsShowPassword ? 'text' : 'password'}
                value={bsConfirm}
                onChange={(e) => setBsConfirm(e.target.value)}
                placeholder="Parolni qaytaring"
                required
                disabled={loading}
              />

              <Input
                label="Telefon"
                type="text"
                value={bsPhone}
                onChange={(e) => setBsPhone(formatUzPhone(e.target.value))}
                placeholder="+998 90 123 45 67"
                disabled={loading}
              />

              <Input
                label="Email"
                type="email"
                value={bsEmail}
                onChange={(e) => setBsEmail(e.target.value)}
                placeholder="admin@example.com"
                disabled={loading}
              />

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-red-600">
                  <ICONS.error className="shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Yaratilmoqda...' : 'Boshlangich adminni yaratish'}
              </Button>
            </form>

            <p className="text-xs text-gray-400 mt-4 text-center">
              Bu hisob Super Admin huquqlariga ega boladi va tizimdagi barcha modullarga kirish mumkin boladi.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- Login form (normal) ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-4">
      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left: branding */}
        <div className="hidden lg:block text-white">
          <Logo size="xl" color="blue" showText={false} />
          <h1 className="text-4xl font-bold mt-6 leading-tight">
            Professional Kutubxona<br />Boshqaruv Tizimi
          </h1>
          <p className="text-blue-200 mt-4 text-lg">
            Farg'ona viloyati Axborot-Kutubxona Markazlari uchun yagona boshqaruv platformasi
          </p>
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="text-center bg-white/10 rounded-xl p-4">
              <p className="text-3xl font-bold">14</p>
              <p className="text-sm text-blue-200">Viloyat</p>
            </div>
            <div className="text-center bg-white/10 rounded-xl p-4">
              <p className="text-3xl font-bold">192+</p>
              <p className="text-sm text-blue-200">Tuman</p>
            </div>
            <div className="text-center bg-white/10 rounded-xl p-4">
              <p className="text-3xl font-bold">21</p>
              <p className="text-sm text-blue-200">Modul</p>
            </div>
          </div>
        </div>

        {/* Right: login form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="lg:hidden flex justify-center mb-6">
            <Logo size="lg" color="blue" />
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-1">Xush kelibsiz</h2>
          <p className="text-sm text-gray-500 mb-6">Tizimga kirish uchun login va parolni kiriting</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Login"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Loginingizni kiriting"
              required
              disabled={!initialized || loading}
            />

            <div className="relative">
              <Input
                label="Parol"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Parolni kiriting"
                required
                disabled={!initialized || loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <ICONS.eye /> : <ICONS.eye />}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-red-600">
                <ICONS.error className="shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={!initialized || loading}
            >
              {loading ? 'Kirilmoqda...' : 'Tizimga kirish'}
            </Button>
          </form>

          {/* Reset data */}
          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <button
              onClick={() => {
                if (confirm('Ma\'lumotlarni reset qilishni xohlaysizmi? Bu barcha ma\'lumotlarni boshlangich holatga qaytaradi.')) {
                  resetAllData();
                }
              }}
              className="text-xs text-gray-400 hover:text-red-500"
            >
              Ma'lumotlarni reset qilish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
