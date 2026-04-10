import { useState, useCallback } from 'react';
import {
  Bell, AlertTriangle, Clock, Shield, CreditCard, Loader2,
  CheckCircle2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Card, CardContent } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { useAlerts } from '@shared/hooks/useAlerts';
import { usePermissions } from '@shared/hooks/usePermissions';
import { alertsService } from '@services/alertsService';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@shared/components/ui/sonner';
import type { Alert } from '@shared/lib/alertsBuilder';

const typeLabels: Record<string, string> = {
  residency: 'إقامة',
  health_insurance: 'تأمين صحي',
  probation: 'فترة اختبار',
  driving_license: 'رخصة قيادة',
  insurance: 'تأمين مركبة',
  registration: 'تسجيل',
  license: 'رخصة',
  authorization: 'تفويض مركبة',
  installment: 'قسط سلفة',
  deduction: 'خصم',
  platform_account: 'إقامة حساب منصة',
  low_stock: 'مخزون منخفض',
  employee_absconded: 'مندوب هروب',
};

const typeIcons: Record<string, typeof AlertTriangle> = {
  residency: AlertTriangle,
  health_insurance: Shield,
  probation: Clock,
  driving_license: Clock,
  insurance: Shield,
  registration: Clock,
  license: Clock,
  authorization: Clock,
  installment: CreditCard,
  deduction: CreditCard,
  platform_account: Shield,
  low_stock: AlertTriangle,
  employee_absconded: AlertTriangle,
};

const severityColors: Record<string, { dot: string; badge: string; iconBg: string }> = {
  urgent: {
    dot: 'bg-destructive',
    badge: 'bg-destructive/10 text-destructive border border-destructive/20',
    iconBg: 'bg-destructive/10 text-destructive',
  },
  warning: {
    dot: 'bg-warning',
    badge: 'bg-warning/10 text-warning border border-warning/20',
    iconBg: 'bg-warning/10 text-warning',
  },
  info: {
    dot: 'bg-info',
    badge: 'bg-info/10 text-info border border-info/20',
    iconBg: 'bg-info/10 text-info',
  },
};

function formatDaysLeft(daysLeft: number): string {
  if (daysLeft < 0) return 'منتهي';
  if (daysLeft === 0) return 'اليوم';
  return `${daysLeft} يوم`;
}

function formatDaysLeftShort(daysLeft: number): string {
  if (daysLeft < 0) return 'منتهي';
  if (daysLeft === 0) return 'اليوم';
  return `${daysLeft}ي`;
}

export default function AlertsPage() {
  const { data: alertsData = [], isLoading, error, refetch } = useAlerts();
  const { permissions: perms } = usePermissions('alerts');
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const unresolvedAlerts = alertsData.filter((a: Alert) => !a.resolved);
  const resolvedAlerts = alertsData.filter((a: Alert) => a.resolved);

  const filteredAlerts = filterSeverity === 'all'
    ? unresolvedAlerts
    : unresolvedAlerts.filter((a: Alert) => a.severity === filterSeverity);

  const urgentCount = unresolvedAlerts.filter((a: Alert) => a.severity === 'urgent').length;
  const warningCount = unresolvedAlerts.filter((a: Alert) => a.severity === 'warning').length;
  const infoCount = unresolvedAlerts.filter((a: Alert) => a.severity === 'info').length;

  const handleResolve = useCallback(async (alertId: string) => {
    setResolvingId(alertId);
    try {
      await alertsService.resolveAlert(alertId, null);
      toast.success('تم حل التنبيه');
      await queryClient.invalidateQueries({ queryKey: ['alerts'] });
    } catch (e) {
      toast.error('فشل حل التنبيه');
    } finally {
      setResolvingId(null);
    }
  }, [queryClient]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  if (isLoading) {
    return (
      <div className="space-y-6" dir="rtl">
        <div>
          <h1 className="text-2xl font-bold">التنبيهات</h1>
          <p className="text-muted-foreground">إدارة التنبيهات والإشعارات</p>
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
          <h1 className="text-2xl font-bold">التنبيهات</h1>
          <p className="text-muted-foreground">إدارة التنبيهات والإشعارات</p>
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

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell size={24} /> التنبيهات
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {unresolvedAlerts.length === 0
              ? 'لا توجد تنبيهات عاجلة'
              : `${unresolvedAlerts.length} تنبيه غير محلول`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          تحديث
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setFilterSeverity(filterSeverity === 'urgent' ? 'all' : 'urgent')}
          className={`rounded-xl border p-4 text-center transition-colors ${filterSeverity === 'urgent' ? 'border-destructive bg-destructive/5' : 'border-border hover:bg-muted/50'}`}
        >
          <p className="text-2xl font-bold text-destructive">{urgentCount}</p>
          <p className="text-xs text-muted-foreground">عاجل</p>
        </button>
        <button
          onClick={() => setFilterSeverity(filterSeverity === 'warning' ? 'all' : 'warning')}
          className={`rounded-xl border p-4 text-center transition-colors ${filterSeverity === 'warning' ? 'border-warning bg-warning/5' : 'border-border hover:bg-muted/50'}`}
        >
          <p className="text-2xl font-bold text-warning">{warningCount}</p>
          <p className="text-xs text-muted-foreground">تحذير</p>
        </button>
        <button
          onClick={() => setFilterSeverity(filterSeverity === 'info' ? 'all' : 'info')}
          className={`rounded-xl border p-4 text-center transition-colors ${filterSeverity === 'info' ? 'border-info bg-info/5' : 'border-border hover:bg-muted/50'}`}
        >
          <p className="text-2xl font-bold text-info">{infoCount}</p>
          <p className="text-xs text-muted-foreground">معلومات</p>
        </button>
      </div>

      {/* Alert cards */}
      {filteredAlerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mb-4">
              <Shield size={24} className="text-success" />
            </div>
            <h3 className="text-lg font-medium">
              {filterSeverity !== 'all' ? 'لا توجد تنبيهات بهذه الأولوية' : 'لا توجد تنبيهات عاجلة'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">كل شيء على ما يرام ✅</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert: Alert) => {
            const Icon = typeIcons[alert.type] || AlertTriangle;
            const colors = severityColors[alert.severity] || severityColors.info;
            const isExpanded = expandedId === alert.id;

            return (
              <Card key={alert.id} className="overflow-hidden">
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleExpand(alert.id)}
                >
                  <div className={`icon-box-sm flex-shrink-0 ${colors.iconBg}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{alert.entityName}</p>
                    <p className="text-xs text-muted-foreground">
                      {typeLabels[alert.type] || alert.type} — {alert.dueDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${colors.badge}`}>
                      {formatDaysLeftShort(alert.daysLeft)}
                    </span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-3 pt-1 border-t border-border/40 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        الأولوية: <span className="font-medium">
                          {alert.severity === 'urgent' ? 'عاجل' : alert.severity === 'warning' ? 'تحذير' : 'معلومات'}
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        المتبقي: <span className="font-medium">{formatDaysLeft(alert.daysLeft)}</span>
                      </span>
                    </div>
                    {perms.can_edit && (
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs h-7"
                          onClick={(e) => { e.stopPropagation(); handleResolve(alert.id); }}
                          disabled={resolvingId === alert.id}
                        >
                          {resolvingId === alert.id
                            ? <Loader2 size={12} className="animate-spin" />
                            : <CheckCircle2 size={12} />}
                          حل التنبيه
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Resolved alerts */}
      {resolvedAlerts.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
            التنبيهات المحلولة ({resolvedAlerts.length})
          </summary>
          <div className="space-y-2 mt-2 opacity-60">
            {resolvedAlerts.slice(0, 20).map((alert: Alert) => {
              const Icon = typeIcons[alert.type] || AlertTriangle;
              return (
                <div key={alert.id} className="flex items-center gap-3 px-4 py-2 rounded-lg bg-muted/30">
                  <div className="icon-box-sm flex-shrink-0 bg-success/10 text-success">
                    <CheckCircle2 size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate line-through opacity-70">{alert.entityName}</p>
                    <p className="text-xs text-muted-foreground">
                      {typeLabels[alert.type] || alert.type} — {alert.dueDate}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}