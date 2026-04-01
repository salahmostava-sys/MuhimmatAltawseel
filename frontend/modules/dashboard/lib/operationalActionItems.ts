/**
 * عناصر «يحتاج متابعة» على لوحة التحكم — روابط تشغيلية بناءً على مؤشرات حية.
 * لا تغني عن RLS؛ للعرض وتوجيه المستخدم فقط.
 */
export type OperationalActionVariant = 'urgent' | 'warning' | 'info';

export type OperationalAction = {
  id: string;
  labelAr: string;
  href: string;
  variant: OperationalActionVariant;
};

export type OperationalKpisInput = {
  absentToday: number;
  activeAlerts: number;
  lateToday: number;
};

/** يبنى قائمة مرتبة: عاجل ثم تحذير ثم اختصارات معلوماتية. */
export function buildOperationalActions(kpis: OperationalKpisInput): OperationalAction[] {
  const out: OperationalAction[] = [];

  if (kpis.absentToday > 0) {
    out.push({
      id: 'absence',
      labelAr: `متابعة الغياب اليوم (${kpis.absentToday})`,
      href: '/attendance',
      variant: 'warning',
    });
  }

  if (kpis.lateToday > 0) {
    out.push({
      id: 'late',
      labelAr: `تأخر اليوم (${kpis.lateToday})`,
      href: '/attendance',
      variant: 'warning',
    });
  }

  if (kpis.activeAlerts > 0) {
    out.push({
      id: 'alerts',
      labelAr: `تنبيهات تحتاج مراجعة (${kpis.activeAlerts})`,
      href: '/alerts',
      variant: 'urgent',
    });
  }

  out.push(
    { id: 'orders', labelAr: 'الطلبات اليومية', href: '/orders', variant: 'info' },
    { id: 'fuel', labelAr: 'استهلاك المناديب', href: '/fuel', variant: 'info' },
    { id: 'employees', labelAr: 'الموظفون', href: '/employees', variant: 'info' },
  );

  return out;
}
