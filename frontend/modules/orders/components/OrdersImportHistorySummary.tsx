import type { OrderImportBatch } from '@services/performanceService';

function sourceLabel(sourceType: OrderImportBatch['source_type']) {
  switch (sourceType) {
    case 'excel':
      return 'Excel';
    case 'api':
      return 'API';
    default:
      return 'Manual';
  }
}

function statusLabel(status: OrderImportBatch['status']) {
  switch (status) {
    case 'completed':
      return 'مكتمل';
    case 'failed':
      return 'فشل';
    default:
      return 'قيد التنفيذ';
  }
}

export function OrdersImportHistorySummary(props: Readonly<{
  batches: OrderImportBatch[];
}>) {
  const { batches } = props;

  if (batches.length === 0) {
    return null;
  }

  return (
    <div className="bg-card rounded-xl border border-border/50 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">آخر عمليات الاستيراد</h3>
          <p className="text-[11px] text-muted-foreground mt-1">Batch tracking وملخص سريع لآخر المحاولات</p>
        </div>
        <span className="text-xs font-semibold text-muted-foreground">{batches.length} سجل</span>
      </div>

      <div className="space-y-2">
        {batches.map((batch) => (
          <div key={batch.id} className="rounded-lg border border-border/50 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-foreground">{batch.file_name || 'بدون اسم ملف'}</span>
                <span className="text-[11px] text-muted-foreground">{sourceLabel(batch.source_type)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {batch.imported_rows.toLocaleString()} / {batch.total_rows.toLocaleString()} صف
                {batch.error_count > 0 ? ` • ${batch.error_count} أخطاء` : ''}
              </p>
            </div>
            <span
              className={`text-[11px] font-bold ${
                batch.status === 'completed'
                  ? 'text-emerald-600'
                  : batch.status === 'failed'
                    ? 'text-rose-500'
                    : 'text-amber-600'
              }`}
            >
              {statusLabel(batch.status)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
