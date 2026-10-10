import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaShieldHalved, FaBuildingColumns, FaChartLine, FaLock, FaUser } from 'react-icons/fa6';
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
        setError(result.message || 'Login yoki parol noto\'g\'ri');
      }
    } catch (err) {
      setError(err.message || 'Tizimga kirishda xatolik yuz berdi');
    }
    setLoading(false);
  };

  // --- Bootstrap handler ---
  const handleBootstrap = async (e) => {
    e.preventDefault();
    setError('');

    if (!bsName.trim() || !bsUsername.trim() || !bsPassword) {
      setError('Barcha majburiy maydonlarni to\'ldiring');
      return;
    }
    if (bsPassword.length < 6) {
      setError('Parol kamida 6 ta belgidan iborat bo\'lishi shart');
      return;
    }
    if (bsPassword !== bsConfirm) {
      setError('Kiritilgan parollar bir-biriga mos kelmadi');
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
        setError(result.message || 'Sozlash jarayonida xatolik');
      }
    } catch (err) {
      setError(err.message || 'Sozlash jarayonida xatolik yuz berdi');
    }
    setLoading(false);
  };

  // --- Bootstrap setup screen ---
  if (needsBootstrap) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
        {/* Ambient background glows */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-lg relative z-10">
          <div className="bg-white rounded-3xl shadow-executive-xl border border-slate-200/90 p-8 sm:p-10">
            <div className="flex justify-center mb-6">
              <Logo size="lg" theme="dark" subtitle="Birlamchi tizim sozlash" />
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Boshqaruvchini ro'yxatdan o'tkazish
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Tizim birinchi marta ishga tushirilmoqda. Super Administrator akkauntini yarating.
              </p>
            </div>

            <form onSubmit={handleBootstrap} className="space-y-4">
              <Input
                label="F.I.SH (To'liq ism)"
                type="text"
                value={bsName}
                onChange={(e) => setBsName(e.target.value)}
                placeholder="Masalan: Karim Aliyev"
                required
                disabled={loading}
              />
              <Input
                label="Tizim logini"
                type="text"
                value={bsUsername}
                onChange={(e) => setBsUsername(e.target.value)}
                placeholder="admin"
                required
                disabled={loading}
              />

              <div className="relative">
                <Input
                  label="Parol"
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
                  className="absolute right-3.5 top-8 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  {bsShowPassword ? <FaEyeSlash className="text-base" /> : <FaEye className="text-base" />}
                </button>
              </div>

              <Input
                label="Parolni tasdiqlash"
                type={bsShowPassword ? 'text' : 'password'}
                value={bsConfirm}
                onChange={(e) => setBsConfirm(e.target.value)}
                placeholder="Parolni qaytadan kiriting"
                required
                disabled={loading}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  placeholder="admin@akm.uz"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs font-semibold text-rose-700">
                  <ICONS.error className="shrink-0 text-base" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full mt-2"
                disabled={loading}
                loading={loading}
              >
                Administratorni faollashtirish
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // --- Normal Enterprise Login screen ---
  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden font-sans">
      {/* Ambient background glows & micro grid */}
      <div className="absolute top-1/4 -left-40 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-40 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Background subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="w-full max-w-5xl grid lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
        {/* Left column: Institutional branding */}
        <div className="lg:col-span-6 text-white space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 text-xs font-semibold mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Yagona Davlat Axborot Tizimi
            </div>

            <Logo size="lg" theme="light" subtitle="Axborot-kutubxona markazlari" />

            <h1 className="text-3xl sm:text-4xl font-extrabold mt-6 leading-tight tracking-tight">
              Kutubxona faoliyatini <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-400 bg-clip-text text-transparent">
                markazlashgan boshqarish
              </span>
            </h1>

            <p className="text-slate-400 mt-4 text-sm sm:text-base leading-relaxed">
              Farg'ona viloyati va uning barcha shahar, tuman axborot-kutubxona filiallari uchun yagona raqamli boshqaruv, monitoring va tahlil platformasi.
            </p>
          </div>

          {/* Institutional Highlights */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
                <FaBuildingColumns className="text-base" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">19 ta shahar va tuman filiallari</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Yagona elektron baza va umumviloyat tarmoq integratsiyasi</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                <FaChartLine className="text-base" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Real-vaqt monitoringi va hisobotlar</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Xodimlar faoliyati, ijro intizomi va kunlik hisobotlar analitikasi</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
                <FaShieldHalved className="text-base" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Xavfsiz va sertifikatlangan muhit</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Audit logging, rolli ruxsatlar (RBAC) va xavfsiz JWT shifrlash</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Login form card */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <div className="bg-white rounded-3xl shadow-executive-xl border border-slate-200/90 p-8 sm:p-10 relative">
            <div className="mb-6">
              <div className="inline-block lg:hidden mb-4">
                <Logo size="md" theme="dark" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Tizimga kirish
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Shaxsiy xizmat hisobingiz orqali tizimga avtorizatsiyadan o'ting
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                label="Foydalanuvchi logini"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Loginingizni kiriting"
                icon={FaUser}
                required
                disabled={!initialized || loading}
              />

              <div className="relative">
                <Input
                  label="Xavfsizlik paroli"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Parolingizni kiriting"
                  icon={FaLock}
                  required
                  disabled={!initialized || loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-8 text-slate-400 hover:text-slate-700 transition-colors p-1"
                  title={showPassword ? 'Parolni yashirish' : 'Parolni ko\'rsatish'}
                >
                  {showPassword ? <FaEyeSlash className="text-base" /> : <FaEye className="text-base" />}
                </button>
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs font-semibold text-rose-700 animate-in fade-in duration-150">
                  <ICONS.error className="shrink-0 text-base" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full mt-2"
                disabled={!initialized || loading}
                loading={loading}
              >
                Tizimga kirish
              </Button>
            </form>

            {/* Bottom info */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Axborot-kutubxona tizimi v1.0</span>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Haqiqatan ham barcha ma'lumotlarni boshlang'ich test holatiga qaytarmoqchimisiz?")) {
                    resetAllData();
                  }
                }}
                className="hover:text-rose-600 transition-colors"
              >
                Bazani qayta tiklash
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
