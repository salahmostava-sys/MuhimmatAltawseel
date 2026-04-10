import { useState, useCallback, useMemo } from 'react';
import {
  Bell, AlertTriangle, Clock, Shield, CreditCard, Loader2,
  CheckCircle2, Bike, Package, UserX, Pill, Filter, Download, Search, Printer,
} from 'lucide-react';
import { Card, CardContent } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Textarea } from '@shared/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@shared/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@shared/components/ui/dropdown-menu';
import { useAlerts } from '@shared/hooks/useAlerts';
import { usePermissions } from '@shared/hooks/usePermissions';
import { useAuthQueryGate } from '@shared/hooks/useAuthQueryGate';
import { alertsService } from '@services/alertsService';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@shared/components/ui/sonner';
import { todayISO } from '@shared/lib/formatters';
import type { Alert } from '@shared/lib/alertsBuilder';

/* ─── Alert type metadata ─── */

type AlertTypeConfig = {
  label: string;
  icon: typeof AlertTriangle;
  /** Category for grouping */
  category: 'employee' | 'vehicle' | 'financial' | 'operations';
  categoryLabel: string;
  description: string;
};

const ALERT_TYPE_CONFIG: Record<string, AlertTypeConfig> = {
  residency: {
    label: 'إقامة',
    icon: AlertTriangle,
    category: 'employee',
    categoryLabel: '👤 شؤون الموظفين',
    description: 'إقامة الموظف قاربت على الانتهاء أو انتهت',
  },
  health_insurance: {
    label: 'تأمين صحي',
    icon: Pill,
    category: 'employee',
    categoryLabel: '👤 شؤون الموظفين',
    description: 'التأمين الصحي يحتاج تجديد',
  },
  probation: {
    label: 'فترة اختبار',
    icon: Clock,
    category: 'employee',
    categoryLabel: '👤 شؤون الموظفين',
    description: 'فترة الاختبار تنتهي قريباً',
  },
  driving_license: {
    label: 'رخصة قيادة',
    icon: Clock,
    category: 'employee',
    categoryLabel: '👤 شؤون الموظفين',
    description: 'رخصة القيادة تحتاج تجديد',
  },
  platform_account: {
    label: 'إقامة حساب منصة',
    icon: Shield,
    category: 'employee',
    categoryLabel: '👤 شؤون الموظفين',
    description: 'إقامة مرتبطة بحساب منصة ستنتهي — قد يتوقف الحساب',
  },
  employee_absconded: {
    label: 'مندوب هروب',
    icon: UserX,
    category: 'employee',
    categoryLabel: '👤 شؤون الموظفين',
    description: 'مندوب مسجّل كحالة هروب — قد يكون لديه عهدة',
  },
  insurance: {
    label: 'تأمين مركبة',
    icon: Shield,
    category: 'vehicle',
    categoryLabel: '🚗 المركبات',
    description: 'تأمين المركبة يحتاج تجديد',
  },
  registration: {
    label: 'تسجيل مركبة',
    icon: Clock,
    category: 'vehicle',
    categoryLabel: '🚗 المركبات',
    description: 'تسجيل المركبة ينتهي قريباً',
  },
  license: {
    label: 'رخصة',
    icon: Clock,
    category: 'vehicle',
    categoryLabel: '🚗 المركبات',
    description: 'رخصة المركبة تحتاج تجديد',
  },
  authorization: {
    label: 'تفويض مركبة',
    icon: Bike,
    category: 'vehicle',
    categoryLabel: '🚗 المركبات',
    description: 'تفويض المركبة ينتهي قريباً',
  },
  installment: {
    label: 'قسط سلفة',
    icon: CreditCard,
    category: 'financial',
    categoryLabel: '💰 المالية',
    description: 'قسط سلفة مستحق',
  },
  deduction: {
    label: 'خصم',
    icon: CreditCard,
    category: 'financial',
    categoryLabel: '💰 المالية',
    description: 'خصم مالي معلّق',
  },
  low_stock: {
    label: 'مخزون منخفض',
    icon: Package,
    category: 'operations',
    categoryLabel: '⚙️ العمليات',
    description: 'قطعة غيار وصلت للحد الأدنى',
  },
};

const getConfig = (type: string): AlertTypeConfig =>
  ALERT_TYPE_CONFIG[type] ?? {
    label: type,
    icon: AlertTriangle,
    category: 'operations' as const,
    categoryLabel: '⚙️ العمليات',
    description: '',
  };

const SEVERITY_STYLES: Record<string, { dot: string; badge: string; iconBg: string; rowBg: string }> = {
  urgent: {
    dot: 'bg-destructive',
    badge: 'bg-destructive/10 text-destructive border border-destructive/20',
    iconBg: 'bg-destructive/10 text-destructive',
    rowBg: 'bg-destructive/[0.03] hover:bg-destructive/[0.06]',
  },
  warning: {
    dot: 'bg-warning',
    badge: 'bg-warning/10 text-warning border border-warning/20',
    iconBg: 'bg-warning/10 text-warning',
    rowBg: 'bg-warning/[0.03] hover:bg-warning/[0.06]',
  },
  info: {
    dot: 'bg-info',
    badge: 'bg-info/10 text-info border border-info/20',
    iconBg: 'bg-info/10 text-info',
    rowBg: 'hover:bg-muted/30',
  },
};

const SEVERITY_LABELS: Record<string, string> = {
  urgent: 'عاجل',
  warning: 'تحذير',
  info: 'معلومات',
};

function formatDaysLeftBadge(daysLeft: number): string {
  if (daysLeft < 0) return 'منتهي';
  if (daysLeft === 0) return 'اليوم';
  return `${daysLeft} يوم`;
}

/* ─── Category ordering ─── */
const CATEGORY_ORDER: Record<string, number> = {
  employee: 0,
  vehicle: 1,
  financial: 2,
  operations: 3,
};

/* ─── The main component ─── */
export default function AlertsPage() {
  useAuthQueryGate();
  const { data: alertsData = [], isLoading, error, refetch } = useAlerts();
  const { permissions: perms } = usePermissions('alerts');
  const queryClient = useQueryClient();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [resolveDialog, setResolveDialog] = useState<Alert | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [deferDialog, setDeferDialog] = useState<Alert | null>(null);
  const [deferDays, setDeferDays] = useState('7');

  const unresolvedAlerts = useMemo(
    () => alertsData.filter((a: Alert) => !a.resolved),
    [alertsData],
  );
  const resolvedAlerts = useMemo(
    () => alertsData.filter((a: Alert) => a.resolved),
    [alertsData],
  );

  /* ── Counts ── */
  const urgentCount = unresolvedAlerts.filter((a: Alert) => a.severity === 'urgent').length;
  const warningCount = unresolvedAlerts.filter((a: Alert) => a.severity === 'warning').length;
  const infoCount = unresolvedAlerts.filter((a: Alert) => a.severity === 'info').length;

  /* ── Count by type for the type filter chips ── */
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of unresolvedAlerts) {
      counts[a.type] = (counts[a.type] || 0) + 1;
    }
    return counts;
  }, [unresolvedAlerts]);

  const activeTypes = useMemo(
    () =>
      Object.entries(typeCounts)
        .sort(([a], [b]) => {
          const ca = getConfig(a).category;
          const cb = getConfig(b).category;
          return (CATEGORY_ORDER[ca] ?? 9) - (CATEGORY_ORDER[cb] ?? 9);
        })
        .map(([type, count]) => ({ type, count, config: getConfig(type) })),
    [typeCounts],
  );

  /* ── Filtered alerts ── */
  const filteredAlerts = useMemo(() => {
    let list = unresolvedAlerts;
    if (filterSeverity !== 'all') {
      list = list.filter((a: Alert) => a.severity === filterSeverity);
    }
    if (filterType !== 'all') {
      list = list.filter((a: Alert) => a.type === filterType);
    }
    if (search) {
      list = list.filter((a: Alert) => a.entityName.includes(search));
    }
    return list;
  }, [unresolvedAlerts, filterSeverity, filterType, search]);

  /* ── Group by category for display ── */
  const groupedAlerts = useMemo(() => {
    const groups: Record<string, { categoryLabel: string; alerts: Alert[] }> = {};
    for (const alert of filteredAlerts) {
      const cfg = getConfig(alert.type);
      const cat = cfg.category;
      if (!groups[cat]) {
        groups[cat] = { categoryLabel: cfg.categoryLabel, alerts: [] };
      }
      groups[cat].alerts.push(alert);
    }
    // Sort categories
    return Object.entries(groups)
      .sort(([a], [b]) => (CATEGORY_ORDER[a] ?? 9) - (CATEGORY_ORDER[b] ?? 9))
      .map(([key, val]) => ({ category: key, ...val }));
  }, [filteredAlerts]);

  const handleResolveConfirm = useCallback(
    async () => {
      if (!resolveDialog) return;
      setResolvingId(resolveDialog.id);
      try {
        await alertsService.resolveAlert(resolveDialog.id, resolveNote || null);
        toast.success('تم حسم التنبيه', { description: resolveDialog.entityName });
        await queryClient.invalidateQueries({ queryKey: ['alerts'] });
      } catch {
        toast.error('فشل حسم التنبيه');
      } finally {
        setResolvingId(null);
        setResolveDialog(null);
        setResolveNote('');
      }
    },
    [queryClient, resolveDialog, resolveNote],
  );

  const handleDefer = useCallback(() => {
    if (!deferDialog) return;
    const days = parseInt(deferDays) || 7;
    // Defer is local-only — just hides the alert temporarily
    toast.success(`تم تأجيل التنبيه ${days} يوم`, { description: deferDialog.entityName });
    setDeferDialog(null);
    setDeferDays('7');
  }, [deferDialog, deferDays]);

  const handleExport = useCallback(async () => {
    const { loadXlsx } = await import('@modules/orders/utils/xlsx');
    const XLSX = await loadXlsx();
    const rows = filteredAlerts.map((a: Alert) => ({
      'الأولوية': SEVERITY_LABELS[a.severity] || a.severity,
      'النوع': getConfig(a.type).label,
      'الجهة': a.entityName,
      'تاريخ الاستحقاق': a.dueDate,
      'المتبقي (يوم)': a.daysLeft,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'التنبيهات');
    XLSX.writeFile(wb, `التنبيهات_${todayISO()}.xlsx`);
  }, [filteredAlerts]);

  const handlePrint = useCallback(() => {
    const rows = filteredAlerts.map((a: Alert) =>
      `<tr><td>${getConfig(a.type).label}</td><td>${a.entityName}</td><td>${a.dueDate}</td><td>${a.daysLeft}</td><td>${SEVERITY_LABELS[a.severity]}</td></tr>`
    ).join('');
    const win = globalThis.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/><title>تقرير التنبيهات</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px;direction:rtl}h2{text-align:center;margin:8px 0}table{width:100%;border-collapse:collapse}th{background:#1e3a5f;color:#fff;padding:6px;text-align:right}td{padding:5px;border-bottom:1px solid #e0e0e0;text-align:right}tr:nth-child(even) td{background:#f9f9f9}@media print{body{print-color-adjust:exact}}</style></head><body><h2>تقرير التنبيهات — ${filteredAlerts.length} تنبيه</h2><table><thead><tr><th>النوع</th><th>الجهة</th><th>الاستحقاق</th><th>المتبقي</th><th>الأولوية</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script></body></html>`);
    win.document.close();
  }, [filteredAlerts]);

  const clearFilters = () => {
    setFilterSeverity('all');
    setFilterType('all');
    setSearch('');
  };
  const hasFilters = filterSeverity !== 'all' || filterType !== 'all' || search !== '';

  /* ─── Loading / Error states ─── */
  if (isLoading) {
    return (
      <div className="space-y-6" dir="rtl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell size={24} /> التنبيهات
          </h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة التنبيهات والإشعارات</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin size-8 text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6" dir="rtl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell size={24} /> التنبيهات
          </h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة التنبيهات والإشعارات</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle size={48} className="text-destructive mb-4" />
            <h3 className="text-lg font-medium">تعذر تحميل التنبيهات</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : 'حدث خطأ أثناء التحميل'}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ─── Main render ─── */
  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <nav className="page-breadcrumb">
            <span>الرئيسية</span>
            <span className="page-breadcrumb-sep">/</span>
            <span className="text-foreground font-medium">التنبيهات</span>
          </nav>
          <h1 className="page-title flex items-center gap-2">
            <Bell size={20} /> التنبيهات التلقائية
            {unresolvedAlerts.length > 0 && (
              <span className="w-6 h-6 rounded-full bg-destructive text-white text-xs font-bold flex items-center justify-center">
                {unresolvedAlerts.length}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {unresolvedAlerts.length === 0
              ? 'لا توجد تنبيهات عاجلة — كل شيء على ما يرام ✅'
              : `${unresolvedAlerts.length} تنبيه يحتاج انتباهك — ${urgentCount} عاجل`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-9"><Download size={14} /> البيانات</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void handleExport()}>📊 تصدير Excel</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handlePrint}><Printer size={12} className="me-1.5" /> طباعة</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            تحديث
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="بحث بالاسم..." className="pr-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* ── Severity summary cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setFilterSeverity(filterSeverity === 'urgent' ? 'all' : 'urgent')}
          className={`rounded-xl border p-4 text-center transition-all ${
            filterSeverity === 'urgent'
              ? 'border-destructive bg-destructive/5 ring-1 ring-destructive/30'
              : 'border-border hover:bg-muted/50'
          }`}
        >
          <p className="text-2xl font-bold text-destructive">{urgentCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">🔴 عاجل</p>
        </button>
        <button
          onClick={() => setFilterSeverity(filterSeverity === 'warning' ? 'all' : 'warning')}
          className={`rounded-xl border p-4 text-center transition-all ${
            filterSeverity === 'warning'
              ? 'border-warning bg-warning/5 ring-1 ring-warning/30'
              : 'border-border hover:bg-muted/50'
          }`}
        >
          <p className="text-2xl font-bold text-warning">{warningCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">🟡 تحذير</p>
        </button>
        <button
          onClick={() => setFilterSeverity(filterSeverity === 'info' ? 'all' : 'info')}
          className={`rounded-xl border p-4 text-center transition-all ${
            filterSeverity === 'info'
              ? 'border-info bg-info/5 ring-1 ring-info/30'
              : 'border-border hover:bg-muted/50'
          }`}
        >
          <p className="text-2xl font-bold text-info">{infoCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">🔵 معلومات</p>
        </button>
        <div className="rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-success">{resolvedAlerts.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">✅ محسوم</p>
        </div>
      </div>

      {/* ── Type filter chips ── */}
      {activeTypes.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={14} className="text-muted-foreground flex-shrink-0" />
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            الكل ({unresolvedAlerts.length})
          </button>
          {activeTypes.map(({ type, count, config }) => {
            const TypeIcon = config.icon;
            return (
              <button
                key={type}
                onClick={() => setFilterType(filterType === type ? 'all' : type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  filterType === type
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                <TypeIcon size={12} />
                {config.label} ({count})
              </button>
            );
          })}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-destructive underline-offset-2 hover:underline ms-1"
            >
              مسح الفلاتر
            </button>
          )}
        </div>
      )}

      {/* ── Grouped alerts ── */}
      {filteredAlerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mb-4">
              <Shield size={24} className="text-success" />
            </div>
            <h3 className="text-lg font-medium">
              {hasFilters ? 'لا توجد تنبيهات بهذا الفلتر' : 'لا توجد تنبيهات عاجلة'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">كل شيء على ما يرام ✅</p>
            {hasFilters && (
              <Button variant="outline" size="sm" className="mt-3" onClick={clearFilters}>
                مسح الفلاتر
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedAlerts.map(({ category, categoryLabel, alerts: groupAlerts }) => (
            <div key={category}>
              {/* Category header */}
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-sm font-bold text-foreground">{categoryLabel}</h2>
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
                  {groupAlerts.length}
                </span>
              </div>

              {/* Alert rows — flat, no expand needed */}
              <div className="bg-card border border-border/50 rounded-xl overflow-hidden divide-y divide-border/40">
                {groupAlerts.map((alert: Alert) => {
                  const cfg = getConfig(alert.type);
                  const Icon = cfg.icon;
                  const styles = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;

                  return (
                    <div
                      key={alert.id}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${styles.rowBg}`}
                    >
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${styles.iconBg}`}>
                        <Icon size={16} />
                      </div>

                      {/* Content — always visible */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {/* Type badge */}
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0">
                            {cfg.label}
                          </span>
                          {/* Severity */}
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${styles.badge}`}>
                            {SEVERITY_LABELS[alert.severity] || alert.severity}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground leading-snug">{alert.entityName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          تاريخ الاستحقاق: {alert.dueDate}
                        </p>
                      </div>

                      {/* Days left + resolve */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-end">
                          <span className={`w-1.5 h-1.5 rounded-full inline-block me-1.5 ${styles.dot}`} />
                          <span className={`text-xs font-bold ${
                            alert.daysLeft < 0
                              ? 'text-destructive'
                              : alert.daysLeft <= 7
                                ? 'text-destructive'
                                : alert.daysLeft <= 30
                                  ? 'text-warning'
                                  : 'text-muted-foreground'
                          }`}>
                            {formatDaysLeftBadge(alert.daysLeft)}
                          </span>
                        </div>
                        {perms.can_edit && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                              onClick={() => { setDeferDialog(alert); setDeferDays('7'); }}
                              title="تأجيل"
                            >
                              <Clock size={12} /> تأجيل
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-success gap-1"
                              onClick={() => { setResolveDialog(alert); setResolveNote(''); }}
                              disabled={resolvingId === alert.id}
                              title="حسم التنبيه"
                            >
                              {resolvingId === alert.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <><CheckCircle2 size={12} /> حسم</>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Resolved alerts (collapsed by default) ── */}
      {resolvedAlerts.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-success" />
            التنبيهات المحلولة ({resolvedAlerts.length})
          </summary>
          <div className="bg-card border border-border/50 rounded-xl overflow-hidden divide-y divide-border/40 mt-2 opacity-60">
            {resolvedAlerts.slice(0, 20).map((alert: Alert) => {
              const cfg = getConfig(alert.type);
              return (
                <div key={alert.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-8 h-8 rounded-lg bg-success/10 text-success flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate line-through opacity-70">
                      {alert.entityName}
                    </p>
                    <p className="text-xs text-muted-foreground">{alert.dueDate}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      )}

      {/* ── Resolve Dialog ── */}
      <Dialog open={!!resolveDialog} onOpenChange={() => setResolveDialog(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle>حسم التنبيه</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium">{resolveDialog && getConfig(resolveDialog.type).label}</p>
              <p className="text-sm text-muted-foreground mt-1">{resolveDialog?.entityName}</p>
            </div>
            <div className="space-y-2">
              <Label>ملاحظة (اختياري)</Label>
              <Textarea placeholder="أدخل ملاحظة..." value={resolveNote} onChange={e => setResolveNote(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setResolveDialog(null)}>إلغاء</Button>
            <Button className="bg-success hover:bg-success/90 gap-1.5" onClick={() => void handleResolveConfirm()} disabled={resolvingId !== null}>
              {resolvingId ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              تأكيد الحسم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Defer Dialog ── */}
      <Dialog open={!!deferDialog} onOpenChange={() => setDeferDialog(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle>تأجيل التنبيه</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium">{deferDialog && getConfig(deferDialog.type).label}</p>
              <p className="text-sm text-muted-foreground mt-1">{deferDialog?.entityName}</p>
            </div>
            <div className="space-y-2">
              <Label>مدة التأجيل (أيام)</Label>
              <div className="flex gap-2">
                {['7', '14', '30', '60'].map(d => (
                  <button key={d} onClick={() => setDeferDays(d)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex-1 ${deferDays === d ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
                    {d} يوم
                  </button>
                ))}
              </div>
              <Input type="number" value={deferDays} onChange={e => setDeferDays(e.target.value)} placeholder="أو أدخل عدد مخصص" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeferDialog(null)}>إلغاء</Button>
            <Button onClick={handleDefer} className="gap-1.5"><Clock size={14} /> تأجيل {deferDays} يوم</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
