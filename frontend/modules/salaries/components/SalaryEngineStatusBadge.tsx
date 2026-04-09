type SalaryEngineStatusBadgeProps = Readonly<{
  loadingData: boolean;
  previewBackendError: string | null;
}>;

/** حالة اتصال معاينة محرك الرواتب من الخادم. */
export function SalaryEngineStatusBadge({ loadingData, previewBackendError }: SalaryEngineStatusBadgeProps) {
  if (loadingData) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-muted-foreground/30 bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/70 animate-pulse" />
        <span>جارٍ فحص محرك الرواتب</span>
      </span>
    );
  }
  if (previewBackendError) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[11px] text-destructive">
        <span className="h-2 w-2 rounded-full bg-destructive" />
        <span>المحرك غير متاح</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[11px] text-success">
      <span className="h-2 w-2 rounded-full bg-success" />
      <span>المحرك متصل</span>
    </span>
  );
}
