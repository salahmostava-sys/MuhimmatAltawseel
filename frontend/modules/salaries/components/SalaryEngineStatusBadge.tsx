type SalaryEngineStatusBadgeProps = Readonly<{
  loadingData: boolean;
  previewBackendError: string | null;
  /** Phase 2: table is visible, preview RPC still loading in background */
  isRefreshingPreview?: boolean;
}>;

/** حالة اتصال معاينة محرك الرواتب من الخادم. */
export function SalaryEngineStatusBadge({
  loadingData,
  previewBackendError,
  isRefreshingPreview = false,
}: SalaryEngineStatusBadgeProps) {
  // Phase 1: initial load — full spinner
  if (loadingData) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-muted-foreground/30 bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/70 animate-pulse" />
        <span>جارٍ تحميل بيانات الرواتب</span>
      </span>
    );
  }

  // Phase 2: preview RPC loading in background
  if (isRefreshingPreview) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
        <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
        <span>جارٍ تحديث أرقام التفصيل…</span>
      </span>
    );
  }

  // Error state
  if (previewBackendError) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[11px] text-destructive">
        <span className="h-2 w-2 rounded-full bg-destructive" />
        <span>المحرك غير متاح</span>
      </span>
    );
  }

  // All good
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[11px] text-success">
      <span className="h-2 w-2 rounded-full bg-success" />
      <span>المحرك متصل</span>
    </span>
  );
}
