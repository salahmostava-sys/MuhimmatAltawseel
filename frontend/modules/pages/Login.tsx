import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@app/providers/AuthContext';
import { useTheme } from '@app/providers/ThemeContext';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { dashboardService } from '@services/dashboardService';
import { loadRememberedEmail, persistRememberedEmail } from '@shared/lib/loginRememberStorage';
import { logError } from '@shared/lib/logger';
import { brandLogoSrc } from '@shared/lib/brandLogo';
import { Checkbox } from '@shared/components/ui/checkbox';
import { Label } from '@shared/components/ui/label';

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
        style={{ background: 'linear-gradient(225deg, #00288e 0%, #1e40af 60%, #1d4ed8 100%)' }}
      >
        {/* Animated floating circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10 animate-float-slow"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, transparent 70%)' }} />
          <div className="absolute top-1/3 -left-16 w-64 h-64 rounded-full opacity-[0.07] animate-float-medium"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)', animationDelay: '2s' }} />
          <div className="absolute bottom-16 right-1/3 w-48 h-48 rounded-full opacity-[0.06] animate-float-slow"
            style={{ background: 'radial-gradient(circle, rgba(99,179,237,0.8) 0%, transparent 70%)', animationDelay: '3.5s' }} />
          <div className="absolute top-1/2 right-1/4 w-32 h-32 rounded-full border border-white/10 animate-float-medium"
            style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/3 left-1/4 w-20 h-20 rounded-full border border-white/8 animate-float-slow"
            style={{ animationDelay: '4s' }} />
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        {/* Logo watermark */}
        {settings?.logo_url && (
          <img
            src={brandLogoSrc(settings.logo_url, settings.updated_at)}
            alt=""
            className="absolute inset-0 w-full h-full opacity-[0.04] object-contain pointer-events-none select-none p-20"
          />
        )}

        {/* Header */}
        <div className={`relative z-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="flex items-center gap-4 mb-8">
            {settings?.logo_url ? (
              <img
                src={brandLogoSrc(settings.logo_url, settings.updated_at)}
                alt=""
                className="w-16 h-16 rounded-2xl object-contain bg-white/10 backdrop-blur-sm p-2.5 ring-1 ring-white/20 shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20 shadow-lg relative">
                <span className="material-symbols-outlined text-4xl text-white" style={{ fontVariationSettings: "'FILL' 1" }}>local_shipping</span>
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full ring-2 ring-white/30" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">{projectName}</h1>
              <p className="text-blue-200/80 text-sm mt-1">{projectSubtitle}</p>
            </div>
          </div>
          <p className="text-blue-100/70 text-lg max-w-md leading-relaxed">
            نظام متكامل لإدارة الخدمات اللوجستية، مصمم لرفع كفاءة التوصيل وضمان الدقة في كل خطوة.
          </p>
        </div>

        {/* Features Grid */}
        <div className="relative z-10 grid grid-cols-2 gap-4 mt-12">
          {FEATURES.map((f, i) => (
            <div
              key={f.icon}
              className="group bg-white/[0.07] hover:bg-white/[0.12] backdrop-blur-sm border border-white/10 hover:border-white/20 p-5 rounded-2xl flex flex-col gap-2.5 transition-all duration-300 cursor-default card-lift"
              style={{
                animationDelay: `${i * 80 + 200}ms`,
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'none' : 'translateY(16px)',
                transition: `opacity 500ms ${i * 80 + 200}ms, transform 500ms ${i * 80 + 200}ms cubic-bezier(0.22,1,0.36,1), box-shadow 200ms`,
              }}
            >
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/15 transition-colors">
                <span className="material-symbols-outlined text-blue-200 text-xl">{f.icon}</span>
              </div>
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
      <section className="w-full lg:w-[45%] flex flex-col justify-center items-center p-8 sm:p-12 lg:p-20 bg-background relative min-h-screen lg:min-h-0">

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="absolute top-5 left-5 w-10 h-10 rounded-full flex items-center justify-center bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted border border-border/50 transition-all duration-200 hover:scale-105 active:scale-95"
          title={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
        >
          {isDark
            ? <span className="material-symbols-outlined text-xl text-yellow-400">light_mode</span>
            : <span className="material-symbols-outlined text-xl">dark_mode</span>}
        </button>

        {/* Mobile logo */}
        <div
          className="lg:hidden flex flex-col items-center mb-12"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(-12px)', transition: 'opacity 500ms, transform 500ms cubic-bezier(0.22,1,0.36,1)' }}
        >
          {settings?.logo_url ? (
            <img
              src={brandLogoSrc(settings.logo_url, settings.updated_at)}
              alt=""
              className="w-16 h-16 rounded-2xl object-contain shadow-lg border border-border bg-card p-1 mb-3"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl mb-3 flex items-center justify-center shadow-brand" style={{ background: 'linear-gradient(225deg, #00288e, #1e40af)' }}>
              <span className="material-symbols-outlined text-3xl text-white" style={{ fontVariationSettings: "'FILL' 1" }}>local_shipping</span>
            </div>
          )}
          <h1 className="text-2xl font-extrabold text-foreground">{projectName}</h1>
          <p className="text-sm text-muted-foreground">{projectSubtitle}</p>
        </div>

        <div className="w-full max-w-md">

          {/* Title */}
          <div
            className="mb-10"
            style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(12px)', transition: 'opacity 450ms 50ms, transform 450ms 50ms cubic-bezier(0.22,1,0.36,1)' }}
          >
            <h2 className="text-3xl font-extrabold text-foreground mb-2">تسجيل الدخول</h2>
            <p className="text-muted-foreground">مرحباً بك مجدداً، يرجى إدخال بياناتك للمتابعة</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">

            {/* Email */}
            <div
              className="space-y-2"
              style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(14px)', transition: 'opacity 450ms 120ms, transform 450ms 120ms cubic-bezier(0.22,1,0.36,1)' }}
            >
              <label htmlFor="login-email" className="block text-sm font-medium text-muted-foreground">البريد الإلكتروني</label>
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors duration-200">
                  <span className="material-symbols-outlined text-xl">mail</span>
                </div>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  dir="ltr"
                  autoComplete="email"
                  autoFocus={!email}
                  aria-invalid={!!loginError}
                  className="block w-full pr-12 pl-4 py-4 bg-muted/40 border border-border/60 rounded-xl focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary hover:border-border transition-all duration-200 outline-none text-foreground placeholder:text-muted-foreground/50 dark:bg-muted/20 dark:hover:border-border/80"
                />
              </div>
            </div>

            {/* Password */}
            <div
              className="space-y-2"
              style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(14px)', transition: 'opacity 450ms 180ms, transform 450ms 180ms cubic-bezier(0.22,1,0.36,1)' }}
            >
              <label htmlFor="login-password" className="block text-sm font-medium text-muted-foreground">كلمة المرور</label>
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors duration-200">
                  <span className="material-symbols-outlined text-xl">lock</span>
                </div>
                <input
                  id="login-password"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyUp={e => setCapsLock(e.getModifierState('CapsLock'))}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  autoFocus={!!email}
                  aria-invalid={!!loginError}
                  className="block w-full pr-12 pl-12 py-4 bg-muted/40 border border-border/60 rounded-xl focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary hover:border-border transition-all duration-200 outline-none text-foreground placeholder:text-muted-foreground/50 dark:bg-muted/20 dark:hover:border-border/80"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute inset-y-0 left-0 pl-4 flex items-center text-muted-foreground hover:text-foreground transition-colors duration-200"
                  aria-label={showPw ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {capsLock && (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 px-1 animate-slide-up">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  <span className="text-xs">تنبيه: زر Caps Lock مفعّل</span>
                </div>
              )}
            </div>

            {/* Remember Me */}
            <div
              className="flex items-center gap-3 px-1"
              style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(14px)', transition: 'opacity 450ms 240ms, transform 450ms 240ms cubic-bezier(0.22,1,0.36,1)' }}
            >
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(v) => setRememberMe(v === true)}
                className="h-5 w-5"
              />
              <Label htmlFor="remember-me" className="text-sm text-muted-foreground font-normal cursor-pointer select-none leading-none">
                تذكرني في المرة القادمة
              </Label>
            </div>

            {/* Error */}
            {loginError && (
              <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/25 rounded-xl px-4 py-3 animate-slide-up">
                <span className="material-symbols-outlined text-destructive text-lg flex-shrink-0">error</span>
                <p className="text-destructive text-sm">{loginError}</p>
              </div>
            )}

            {/* Submit */}
            <div
              style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(14px)', transition: 'opacity 450ms 300ms, transform 450ms 300ms cubic-bezier(0.22,1,0.36,1)' }}
            >
              <button
                type="submit"
                disabled={loading}
                className="relative w-full py-4 px-6 text-white font-bold rounded-xl overflow-hidden shadow-brand hover:shadow-brand active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
                style={{ background: 'linear-gradient(135deg, #00288e 0%, #1e40af 50%, #2563eb 100%)' }}
              >
                {/* Shimmer effect on hover */}
                <span
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.8s linear infinite',
                  }}
                />
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /><span>جاري التحقق…</span></>
                ) : (
                  <><span>تسجيل الدخول</span><span className="material-symbols-outlined text-xl">login</span></>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Mobile copyright */}
        <p className="text-center text-xs text-muted-foreground mt-8 lg:hidden">
          {`© ${new Date().getFullYear()} ${projectName}`}
        </p>
      </section>

      {/* Security badge */}
      <div className="fixed bottom-6 left-6 hidden lg:flex items-center gap-2 bg-card/90 backdrop-blur-sm py-2 px-4 rounded-full shadow-md border border-border/40">
        <span className="material-symbols-outlined text-emerald-500 text-lg">verified_user</span>
        <span className="text-xs font-semibold text-muted-foreground">اتصال آمن ومحمي</span>
      </div>
    </div>
  );
};

export default Login;
