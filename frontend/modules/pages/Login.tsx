import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@app/providers/AuthContext';
import { useTheme } from '@app/providers/ThemeContext';
import { Input } from '@shared/components/ui/input';
import { Checkbox } from '@shared/components/ui/checkbox';
import { Loader2, Eye, EyeOff, Mail, Lock, Sun, Moon, Truck, Users, Package, TrendingUp } from 'lucide-react';
import { dashboardService } from '@services/dashboardService';
import { loadRememberedEmail, persistRememberedEmail } from '@shared/lib/loginRememberStorage';
import { logError } from '@shared/lib/logger';
import { brandLogoSrc } from '@shared/lib/brandLogo';

interface SystemSettings {
  project_name_ar: string;
  project_name_en: string;
  project_subtitle_ar: string;
  project_subtitle_en: string;
  logo_url: string | null;
  updated_at?: string | null;
}

const FEATURES = [
  { icon: Users, label: 'إدارة المناديب', desc: 'تتبع وإدارة فريق التوصيل بالكامل' },
  { icon: Package, label: 'الطلبات اليومية', desc: 'تسجيل ومتابعة طلبات كل مندوب' },
  { icon: TrendingUp, label: 'تحليلات ذكية', desc: 'تقارير أداء شاملة واقتراحات' },
  { icon: Truck, label: 'إدارة الأسطول', desc: 'مركبات وصيانة واستهلاك' },
];

const Login = () => {
  const { signIn } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [capsLock, setCapsLock] = useState(false);

  useEffect(() => {
    dashboardService.getSystemSettings().then((data) => {
      if (!data) return;
      setSettings({
        project_name_ar: data.project_name_ar ?? '',
        project_name_en: data.project_name_en ?? '',
        project_subtitle_ar: data.project_subtitle_ar ?? '',
        project_subtitle_en: data.project_subtitle_en ?? '',
        logo_url: data.logo_url ?? null,
        updated_at: (data as { updated_at?: string | null }).updated_at ?? null,
      });
    }).catch((err) => logError('[Login] getSystemSettings failed', err));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { email: storedEmail, remember } = await loadRememberedEmail();
        if (cancelled) return;
        setRememberMe(remember);
        if (storedEmail) setEmail(storedEmail);
      } catch (e) {
        logError('[Login] loadRememberedEmail failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const projectName = settings?.project_name_ar || 'مهمات التوصيل';
  const projectSubtitle = settings?.project_subtitle_ar || 'نظام إدارة المناديب';

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError('');
    if (!email || !password) return;
    setLoading(true);
    let error: { message: string } | null;
    try {
      const res = await signIn(email, password);
      error = res.error;
    } catch (err) {
      logError('[Login] signIn threw', err);
      error = { message: 'تعذّر إكمال تسجيل الدخول. حاول مرة أخرى.' };
    } finally {
      setLoading(false);
    }
    if (error) {
      const deactivatedMsg = 'هذا الحساب معطّل. تواصل مع المسؤول.';
      setLoginError(error.message === deactivatedMsg ? deactivatedMsg : 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
    } else {
      try { await persistRememberedEmail(email.trim(), rememberMe); } catch (e) { logError('[Login] persist failed', e); }
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* ── Left: Hero/Branding Panel ── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 50%, hsl(var(--primary) / 0.4) 100%)' }}
      >
        {/* Geometric pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-72 h-72 border border-white/30 rounded-full" />
          <div className="absolute top-40 right-40 w-96 h-96 border border-white/20 rounded-full" />
          <div className="absolute bottom-20 left-10 w-48 h-48 border border-white/20 rounded-full" />
          <div className="absolute top-10 left-1/3 w-32 h-32 border border-white/15 rounded-full" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Top: Logo + Name */}
          <div>
            {settings?.logo_url ? (
              <img
                src={brandLogoSrc(settings.logo_url, settings.updated_at)}
                alt=""
                className="w-20 h-20 rounded-2xl object-contain bg-white/10 backdrop-blur-sm p-2 shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-4xl shadow-lg">
                🚀
              </div>
            )}
            <h1 className="text-4xl font-black mt-6 leading-tight">{projectName}</h1>
            <p className="text-lg text-white/80 mt-2">{projectSubtitle}</p>
          </div>

          {/* Middle: Features */}
          <div className="space-y-5 my-8">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-start gap-4 group">
                <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-colors">
                  <f.icon size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm">{f.label}</p>
                  <p className="text-xs text-white/60 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom: Copyright */}
          <p className="text-xs text-white/40">
            {`© ${new Date().getFullYear()} ${projectName} — جميع الحقوق محفوظة`}
          </p>
        </div>
      </div>

      {/* ── Right: Login Form ── */}
      <div className="flex-1 flex items-center justify-center bg-background px-6 py-10 relative">
        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="absolute top-5 left-5 h-9 w-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-muted-foreground border border-border"
          title={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
        >
          {isDark ? <Sun size={16} className="text-yellow-500" /> : <Moon size={16} />}
        </button>

        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Mobile logo (hidden on lg+) */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            {settings?.logo_url ? (
              <img
                src={brandLogoSrc(settings.logo_url, settings.updated_at)}
                alt=""
                className="w-20 h-20 rounded-2xl object-contain shadow-lg border border-border bg-card p-1 mb-3"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl mb-3 flex items-center justify-center text-4xl shadow-lg"
                style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))' }}>
                🚀
              </div>
            )}
            <h1 className="text-xl font-extrabold text-foreground">{projectName}</h1>
            <p className="text-sm text-muted-foreground">{projectSubtitle}</p>
          </div>

          {/* Form card */}
          <div className="bg-card border border-border rounded-2xl p-7 shadow-xl">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-foreground">مرحباً بك 👋</h2>
              <p className="text-sm text-muted-foreground mt-1">سجّل دخولك للمتابعة</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-muted-foreground mb-1.5">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute top-1/2 -translate-y-1/2 text-muted-foreground right-3 pointer-events-none" />
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="example@company.com"
                    required
                    dir="ltr"
                    autoComplete="email"
                    autoFocus={!email}
                    className="h-11 pr-10 text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-muted-foreground mb-1.5">
                  كلمة المرور
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute top-1/2 -translate-y-1/2 text-muted-foreground right-3 pointer-events-none" />
                  <Input
                    id="login-password"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyUp={e => setCapsLock(e.getModifierState('CapsLock'))}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    autoFocus={!!email}
                    className="h-11 pr-10 pl-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors left-3"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {capsLock && (
                  <p className="text-[11px] text-warning mt-1 flex items-center gap-1">
                    ⚠️ Caps Lock مفعّل
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2.5 pt-0.5">
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={v => setRememberMe(v === true)}
                  className="h-4 w-4"
                />
                <label htmlFor="remember-me" className="text-sm text-muted-foreground cursor-pointer select-none">
                  تذكرني
                </label>
              </div>

              {loginError && (
                <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2.5 animate-in slide-in-from-top-1 fade-in">
                  <span className="text-sm">⚠️</span>
                  <p className="text-destructive text-sm">{loginError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl font-bold text-sm text-primary-foreground transition-all duration-150 hover:opacity-90 active:scale-[0.99] disabled:opacity-70 flex items-center justify-center gap-2 mt-2"
                style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))' }}
              >
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> جاري التحقق...</>
                  : 'تسجيل الدخول'
                }
              </button>
            </form>
          </div>

          {/* Desktop copyright hidden (shown in hero panel) */}
          <p className="text-center text-xs text-muted-foreground mt-6 lg:hidden">
            {`© ${new Date().getFullYear()} ${projectName}`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
