import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@app/providers/AuthContext';
import { useTheme } from '@app/providers/ThemeContext';
import { Loader2, Eye, EyeOff } from 'lucide-react';
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
  { icon: 'dashboard_customize', title: 'لوحة تحكم ذكية', desc: 'متابعة فورية لجميع العمليات والمؤشرات الحيوية بلمحة واحدة.' },
  { icon: 'local_shipping', title: 'إدارة المناديب', desc: 'تتبع وإدارة فريق التوصيل بالكامل مع تحليل الأداء.' },
  { icon: 'analytics', title: 'تقارير مفصلة', desc: 'تحليل البيانات لتحسين الأداء وتقليل التكاليف التشغيلية.' },
  { icon: 'security', title: 'أمان البيانات', desc: 'حماية كاملة لبيانات العملاء والشحنات بأحدث معايير التشفير.' },
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
  const projectSubtitle = settings?.project_subtitle_ar || 'دقة في الإدارة';

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
      {/* ── Left: Branding Panel (55%) ── */}
      <section
        className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-16 overflow-hidden"
        style={{ background: 'linear-gradient(225deg, #00288e 0%, #1e40af 100%)' }}
      >
        {/* Background watermark */}
        {settings?.logo_url && (
          <img
            src={brandLogoSrc(settings.logo_url, settings.updated_at)}
            alt=""
            className="absolute inset-0 w-full h-full opacity-[0.05] object-contain pointer-events-none select-none p-20"
          />
        )}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-gradient-to-br from-white/5 to-transparent" />

        {/* Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            {settings?.logo_url ? (
              <img
                src={brandLogoSrc(settings.logo_url, settings.updated_at)}
                alt=""
                className="w-14 h-14 rounded-2xl object-contain bg-white/10 backdrop-blur-sm p-2"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-white" style={{ fontVariationSettings: "'FILL' 1" }}>local_shipping</span>
              </div>
            )}
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">{projectName}</h1>
              <p className="text-blue-200/80 text-sm mt-0.5">{projectSubtitle}</p>
            </div>
          </div>
          <p className="text-blue-100/70 text-lg max-w-md leading-relaxed">
            نظام متكامل لإدارة الخدمات اللوجستية، مصمم لرفع كفاءة التوصيل وضمان الدقة في كل خطوة.
          </p>
        </div>

        {/* Features Grid */}
        <div className="relative z-10 grid grid-cols-2 gap-5 mt-12">
          {FEATURES.map((f) => (
            <div key={f.icon} className="bg-white/5 backdrop-blur-sm border border-white/10 p-5 rounded-xl flex flex-col gap-2.5">
              <span className="material-symbols-outlined text-blue-200 text-2xl">{f.icon}</span>
              <h3 className="text-white font-bold text-sm">{f.title}</h3>
              <p className="text-blue-100/60 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="relative z-10 text-blue-200/40 text-xs tracking-widest uppercase mt-8">
          {`© ${new Date().getFullYear()} ${projectName}`}
        </p>
      </section>

      {/* ── Right: Login Form (45%) ── */}
      <section className="w-full lg:w-[45%] flex flex-col justify-center items-center p-8 sm:p-12 lg:p-20 bg-background relative">
        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="absolute top-5 left-5 w-10 h-10 rounded-full flex items-center justify-center bg-muted/50 text-muted-foreground hover:text-foreground border border-border/50 transition-all"
          title={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
        >
          {isDark ? <span className="material-symbols-outlined text-xl text-yellow-500">light_mode</span> : <span className="material-symbols-outlined text-xl">dark_mode</span>}
        </button>

        {/* Mobile logo */}
        <div className="lg:hidden flex flex-col items-center mb-12">
          {settings?.logo_url ? (
            <img
              src={brandLogoSrc(settings.logo_url, settings.updated_at)}
              alt=""
              className="w-16 h-16 rounded-2xl object-contain shadow-lg border border-border bg-card p-1 mb-3"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl mb-3 flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(225deg, #00288e, #1e40af)' }}>
              <span className="material-symbols-outlined text-3xl text-white" style={{ fontVariationSettings: "'FILL' 1" }}>local_shipping</span>
            </div>
          )}
          <h1 className="text-2xl font-extrabold text-foreground">{projectName}</h1>
          <p className="text-sm text-muted-foreground">{projectSubtitle}</p>
        </div>

        <div className="w-full max-w-md">
          {/* Title */}
          <div className="mb-10">
            <h2 className="text-3xl font-extrabold text-foreground mb-2">تسجيل الدخول</h2>
            <p className="text-muted-foreground">مرحباً بك مجدداً، يرجى إدخال بياناتك للمتابعة</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="login-email" className="block text-sm font-medium text-muted-foreground">البريد الإلكتروني</label>
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                  <span className="material-symbols-outlined text-xl">mail</span>
                </div>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  dir="ltr"
                  autoComplete="email"
                  autoFocus={!email}
                  className="block w-full pr-12 pl-4 py-4 bg-muted/30 border border-border/50 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="login-password" className="block text-sm font-medium text-muted-foreground">كلمة المرور</label>
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                  <span className="material-symbols-outlined text-xl">lock</span>
                </div>
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyUp={e => setCapsLock(e.getModifierState('CapsLock'))}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  autoFocus={!!email}
                  className="block w-full pr-12 pl-12 py-4 bg-muted/30 border border-border/50 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none text-foreground placeholder:text-muted-foreground/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute inset-y-0 left-0 pl-4 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {capsLock && (
                <div className="flex items-center gap-2 text-amber-600 px-1">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  <span className="text-xs">تنبيه: زر Caps Lock مفعّل</span>
                </div>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-3 px-1">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-5 h-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="remember-me" className="text-sm text-muted-foreground cursor-pointer select-none">
                تذكرني في المرة القادمة
              </label>
            </div>

            {/* Error */}
            {loginError && (
              <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 animate-in slide-in-from-top-1 fade-in">
                <span className="material-symbols-outlined text-destructive text-lg">error</span>
                <p className="text-destructive text-sm">{loginError}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 text-white font-bold rounded-xl shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              style={{ background: 'linear-gradient(225deg, #00288e 0%, #1e40af 100%)' }}
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> جاري التحقق...</>
              ) : (
                <><span>تسجيل الدخول</span><span className="material-symbols-outlined text-xl">login</span></>
              )}
            </button>
          </form>
        </div>

        {/* Mobile copyright */}
        <p className="text-center text-xs text-muted-foreground mt-8 lg:hidden">
          {`© ${new Date().getFullYear()} ${projectName}`}
        </p>
      </section>

      {/* Security badge */}
      <div className="fixed bottom-6 left-6 hidden lg:flex items-center gap-2 bg-card py-2 px-4 rounded-full shadow-sm border border-border/30">
        <span className="material-symbols-outlined text-emerald-600 text-lg">verified_user</span>
        <span className="text-xs font-semibold text-muted-foreground">اتصال آمن ومحمي</span>
      </div>
    </div>
  );
};

export default Login;
