import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '@app/providers/LanguageContext';
import { useTheme } from '@app/providers/ThemeContext';
import { useSystemSettings } from '@app/providers/SystemSettingsContext';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { toast } from '@shared/components/ui/sonner';
import { TOAST_ERROR_GENERIC, TOAST_SUCCESS_ACTION, TOAST_SUCCESS_EDIT } from '@shared/lib/toastMessages';
import { Loader2, Save, Globe, Building2, Upload, X, Download, Database, Bell } from 'lucide-react';
import { cn } from '@shared/lib/utils';
import { format } from 'date-fns';
import { usePermissions } from '@shared/hooks/usePermissions';
import { useAuth } from '@app/providers/AuthContext';
import { validateUploadFile } from '@shared/lib/validation';
import { settingsHubService } from '@services/settingsHubService';
import { brandLogoSrc } from '@shared/lib/brandLogo';
import { getErrorMessage } from '@shared/lib/query';
import { logError } from '@shared/lib/logger';

export default function ProjectSettings() {
  const { isRTL } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { settings, refresh } = useSystemSettings();
  const { isAdmin } = usePermissions('settings');

  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [defaultLang, setDefaultLang] = useState('ar');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [iqamaAlertDays, setIqamaAlertDays] = useState(90);
  const [saving, setSaving] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (settings) {
      setNameAr(settings.project_name_ar);
      setNameEn(settings.project_name_en);
      setDefaultLang(settings.default_language);
      setLogoPreview(brandLogoSrc(settings.logo_url, settings.updated_at) ?? settings.logo_url);
      setRemoveLogo(false);
      setIqamaAlertDays(settings.iqama_alert_days ?? 90);
    }
  }, [settings]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateUploadFile(file, {
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
    });
    if (!validation.valid) {
      toast.error(TOAST_ERROR_GENERIC, { description: validation.error ?? (isRTL ? 'Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ù…Ù„Ù' : 'Invalid file') });
      return;
    }
    if (logoObjectUrlRef.current) {
      URL.revokeObjectURL(logoObjectUrlRef.current);
      logoObjectUrlRef.current = null;
    }
    const nextUrl = URL.createObjectURL(file);
    logoObjectUrlRef.current = nextUrl;
    setLogoFile(file);
    setLogoPreview(nextUrl);
    setRemoveLogo(false);
    e.target.value = '';
  };

  const clearLogoObjectUrl = useCallback(() => {
    if (logoObjectUrlRef.current) {
      URL.revokeObjectURL(logoObjectUrlRef.current);
      logoObjectUrlRef.current = null;
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      let logo_url = settings?.logo_url ?? null;

      if (removeLogo) {
        logo_url = null;
      } else if (logoFile) {
        const sessionUserId = await settingsHubService.getCurrentUserId();
        const uid = user?.id ?? sessionUserId;
        if (!uid) {
          setSaving(false);
          toast.error(TOAST_ERROR_GENERIC, {
            description: isRTL ? 'ØªØ¹Ø°Ø± Ø§Ù„Ø±ÙØ¹ â€” ÙŠØ¬Ø¨ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ù„Ø±ÙØ¹ Ø§Ù„Ø´Ø¹Ø§Ø±.' : 'Cannot upload â€” You must be signed in to upload a logo.',
          });
          return;
        }
        const ext = logoFile.name.split('.').pop() || 'png';
        const version = Date.now();
        const path = `${uid}/project-logo-${version}.${ext}`;
        try {
          await settingsHubService.uploadCompanyLogo(path, logoFile);
        } catch (e: unknown) {
          setSaving(false);
          toast.error(TOAST_ERROR_GENERIC, {
            description: e instanceof Error ? e.message : String(e),
          });
          return;
        }
        const { data: { publicUrl } } = settingsHubService.getCompanyLogoPublicUrl(path);
        logo_url = publicUrl;
      }

      const payload = {
        project_name_ar: nameAr,
        project_name_en: nameEn,
        default_language: defaultLang,
        logo_url,
        iqama_alert_days: iqamaAlertDays,
      };

      await settingsHubService.saveSystemSettings(settings?.id, payload);

      clearLogoObjectUrl();
      setLogoFile(null);
      setRemoveLogo(false);
      await refresh();
      toast.success(TOAST_SUCCESS_EDIT, {
        description: isRTL ? 'ØªÙ… ØªØ­Ø¯ÙŠØ« Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù…Ø´Ø±ÙˆØ¹' : 'Project settings updated',
      });
    } catch (err: unknown) {
      logError('[ProjectSettings] save failed', err);
      toast.error(TOAST_ERROR_GENERIC, { description: getErrorMessage(err) });
    }
    setSaving(false);
  };

  // â”€â”€ Backup Handler â”€â”€
  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');

      const tables = [
        'employees',
        'attendance',
        'advances',
        'advance_installments',
        'daily_orders',
        'employee_apps',
        'apps',
        'salary_schemes',
        'salary_records',
        'external_deductions',
        'vehicles',
        'vehicle_assignments',
        'alerts',
      ] as const;

      const results: Record<string, unknown[]> = {};

      await Promise.all(
        tables.map(async (table) => {
          const rows = await settingsHubService.exportTableRows(table);
          results[table] = rows;
        })
      );

      const exportedCount = Object.keys(results).filter(k => results[k].length >= 0).length;

      // â”€â”€ Export JSON â”€â”€
      const jsonBlob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = `backup_${timestamp}.json`;
      jsonLink.click();
      URL.revokeObjectURL(jsonUrl);

      // â”€â”€ Export Excel â”€â”€
      const wb = XLSX.utils.book_new();
      for (const table of tables) {
        const sheetData = results[table];
        if (sheetData.length > 0) {
          const ws = XLSX.utils.json_to_sheet(sheetData);
          XLSX.utils.book_append_sheet(wb, ws, table.slice(0, 31)); // Excel sheet name max 31 chars
        } else {
          // empty sheet with header
          const ws = XLSX.utils.json_to_sheet([{}]);
          XLSX.utils.book_append_sheet(wb, ws, table.slice(0, 31));
        }
      }
      XLSX.writeFile(wb, `backup_${timestamp}.xlsx`);

      toast.success(TOAST_SUCCESS_ACTION, {
        description: isRTL
          ? `ØªÙ… ØªØµØ¯ÙŠØ± ${exportedCount} Ø¬Ø¯ÙˆÙ„ â€” JSON + Excel`
          : `Exported ${exportedCount} tables â€” JSON + Excel`,
      });
    } catch (err: unknown) {
      logError('[ProjectSettings] backup export failed', err);
      toast.error(TOAST_ERROR_GENERIC, { description: getErrorMessage(err) });
    }
    setBackupLoading(false);
  };

  const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">{icon}</div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      {/* Project Name */}
      <div className="bg-card rounded-xl border border-border/50 p-5 shadow-sm">
        <SectionHeader icon={<Building2 size={14} />} title={isRTL ? 'Ø§Ø³Ù… Ø§Ù„Ù…Ø´Ø±ÙˆØ¹' : 'Project Name'} />
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                {isRTL ? 'Ø§Ø³Ù… Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ (Ø¹Ø±Ø¨ÙŠ)' : 'Project Name (Arabic)'}
              </Label>
              <Input value={nameAr} onChange={e => setNameAr(e.target.value)} placeholder="Ù…Ù‡Ù…Ø© Ø§Ù„ØªÙˆØµÙŠÙ„" dir="rtl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                {isRTL ? 'Ø§Ø³Ù… Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ (Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠ)' : 'Project Name (English)'}
              </Label>
              <Input value={nameEn} onChange={e => setNameEn(e.target.value)} placeholder="Delivery System" dir="ltr" />
            </div>
          </div>
        </div>
      </div>

      {/* Logo */}
      <div className="bg-card rounded-xl border border-border/50 p-5 shadow-sm">
        <SectionHeader icon={<Upload size={14} />} title={isRTL ? 'Ø´Ø¹Ø§Ø± Ø§Ù„Ù…Ø´Ø±ÙˆØ¹' : 'Project Logo'} />
        <div className="flex items-center gap-4">
          {logoPreview ? (
            <div className="relative">
              <img src={logoPreview} alt="logo" className="h-16 w-16 rounded-xl object-cover border border-border" />
              <button
                onClick={() => {
                  clearLogoObjectUrl();
                  setLogoPreview(null);
                  setLogoFile(null);
                  setRemoveLogo(true);
                }}
                className="absolute -top-1.5 -end-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
              >
                <X size={10} />
              </button>
            </div>
          ) : (
            <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center text-2xl border border-border border-dashed">
              ðŸš€
            </div>
          )}
          <div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              className="sr-only"
              aria-label={isRTL ? 'Ø§Ø®ØªÙŠØ§Ø± Ù…Ù„Ù Ø§Ù„Ø´Ø¹Ø§Ø±' : 'Choose logo file'}
              onChange={handleLogoChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => logoInputRef.current?.click()}
            >
              <Upload size={13} /> {isRTL ? 'Ø±ÙØ¹ Ø´Ø¹Ø§Ø±' : 'Upload Logo'}
            </Button>
            <p className="text-xs text-muted-foreground mt-1.5">
              {isRTL ? 'PNGØŒ JPGØŒ SVG â€” Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ù‚ØµÙ‰ 2 Ù…ÙŠØºØ§Ø¨Ø§ÙŠØª' : 'PNG, JPG, SVG â€” Max 2MB'}
            </p>
          </div>
        </div>
      </div>

      {/* Language & Theme */}
      <div className="bg-card rounded-xl border border-border/50 p-5 shadow-sm">
        <SectionHeader icon={<Globe size={14} />} title={isRTL ? 'Ø§Ù„Ù„ØºØ© ÙˆØ§Ù„Ù…Ø¸Ù‡Ø±' : 'Language & Theme'} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              {isRTL ? 'Ø§Ù„Ù„ØºØ© Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠØ©' : 'Default Language'}
            </Label>
            <div className="flex gap-2">
              {['ar', 'en'].map(l => (
                <button
                  key={l}
                  onClick={() => setDefaultLang(l)}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                    defaultLang === l
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                  )}
                >
                  {l === 'ar' ? 'Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©' : 'English'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              {isRTL ? 'Ù…Ø¸Ù‡Ø± Ø§Ù„Ù†Ø¸Ø§Ù…' : 'System Theme'}
            </Label>
            <div className="flex gap-2">
              {[
                { key: 'light', labelAr: 'â˜€ï¸ ÙØ§ØªØ­', labelEn: 'â˜€ï¸ Light' },
                { key: 'dark', labelAr: 'ðŸŒ™ Ø¯Ø§ÙƒÙ†', labelEn: 'ðŸŒ™ Dark' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { if ((isDark ? 'dark' : 'light') !== opt.key) toggleTheme(); }}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                    (isDark ? 'dark' : 'light') === opt.key
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                  )}
                >
                  {isRTL ? opt.labelAr : opt.labelEn}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* â”€â”€ Alert Settings â”€â”€ */}
      <div className="bg-card rounded-xl border border-border/50 p-5 shadow-sm">
        <SectionHeader icon={<Bell size={14} />} title={isRTL ? 'Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„ØªÙ†Ø¨ÙŠÙ‡Ø§Øª' : 'Alert Settings'} />
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label className="text-xs font-medium text-muted-foreground">
              {isRTL ? 'Ø§Ù„ØªÙ†Ø¨ÙŠÙ‡ Ø¨Ø§Ù†ØªÙ‡Ø§Ø¡ Ø§Ù„Ø¥Ù‚Ø§Ù…Ø© (Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„Ù…Ù†ØµØ§Øª) Ù‚Ø¨Ù„' : 'Iqama expiry alert (platform accounts) before'}
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isRTL ? 'Ø³ÙŠØ¸Ù‡Ø± ØªÙ†Ø¨ÙŠÙ‡ ØªÙ„Ù‚Ø§Ø¦ÙŠ Ø¹Ù†Ø¯ Ø§Ù‚ØªØ±Ø§Ø¨ Ø§Ù†ØªÙ‡Ø§Ø¡ Ø¥Ù‚Ø§Ù…Ø© Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…Ù†ØµØ© Ø¨Ù‡Ø°Ø§ Ø§Ù„Ø¹Ø¯Ø¯ Ù…Ù† Ø§Ù„Ø£ÙŠØ§Ù… Ø£Ùˆ Ø£Ù‚Ù„.' : 'An automatic alert shows when a platform account iqama expires within this many days.'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Input
              type="number"
              min={1}
              max={365}
              value={iqamaAlertDays}
              onChange={e => setIqamaAlertDays(Math.max(1, Number.parseInt(e.target.value) || 90))}
              className="w-24 text-center"
            />
            <span className="text-sm text-muted-foreground">{isRTL ? 'ÙŠÙˆÙ…' : 'days'}</span>
          </div>
        </div>
      </div>

      {/* â”€â”€ Backup Section (Admin only) â”€â”€ */}
      {isAdmin && (
        <div className="bg-card rounded-xl border border-border/50 p-5 shadow-sm">
          <SectionHeader icon={<Database size={14} />} title={isRTL ? 'Ø§Ù„Ù†Ø³Ø® Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠ' : 'Backup'} />
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">
                {isRTL
                  ? 'ØªØ­Ù…ÙŠÙ„ Ù†Ø³Ø®Ø© Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© ÙƒØ§Ù…Ù„Ø© Ù…Ù† Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ØªØ´Ù…Ù„: Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ†ØŒ Ø§Ù„Ø­Ø¶ÙˆØ±ØŒ Ø§Ù„Ø³Ù„ÙØŒ Ø§Ù„Ø·Ù„Ø¨Ø§ØªØŒ Ø§Ù„Ø±ÙˆØ§ØªØ¨ØŒ Ø§Ù„Ù…Ø±ÙƒØ¨Ø§ØªØŒ ÙˆØ§Ù„ØªÙ†Ø¨ÙŠÙ‡Ø§Øª.'
                  : 'Download a full database backup including: employees, attendance, advances, orders, salaries, vehicles, and alerts.'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'ÙŠÙØµØ¯Ø± Ù…Ù„ÙÙŠÙ†: JSON + Excel' : 'Exports two files: JSON + Excel'}
              </p>
            </div>
            <Button
              onClick={handleBackup}
              disabled={backupLoading}
              variant="outline"
              className="gap-2 min-w-44 flex-shrink-0"
            >
              {backupLoading ? (
                <><Loader2 size={14} className="animate-spin" /> {isRTL ? 'Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØµØ¯ÙŠØ±...' : 'Exporting...'}</>
              ) : (
                <><Download size={14} /> {isRTL ? 'ØªØ­Ù…ÙŠÙ„ Ù†Ø³Ø®Ø© Ø§Ø­ØªÙŠØ§Ø·ÙŠØ©' : 'Download Backup'}</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2 min-w-32">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {isRTL ? 'Ø­ÙØ¸ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
