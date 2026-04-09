import { useCallback, useMemo, useRef, useState } from 'react';
import { X, Upload, Loader2, CheckCircle, AlertTriangle, Download } from 'lucide-react';
import * as XLSX from '@e965/xlsx';
import { Button } from '@shared/components/ui/button';
import { Progress } from '@shared/components/ui/progress';
import { useToast } from '@shared/hooks/use-toast';
import {
  processBulkImportRows,
  type UploadLiveStats,
  type UploadReport,
} from '@modules/employees/types/employee.types';

type Props = {
  onClose: () => void;
  onSuccess: () => void;
};

const EMPTY_LIVE_STATS: UploadLiveStats = {
  processedNames: 0,
  totalNames: 0,
  currentName: '',
};

function downloadErrorReport(errors: UploadReport['errors']) {
  const ws = XLSX.utils.json_to_sheet(errors);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Errors');
  XLSX.writeFile(wb, 'employee_import_errors.xlsx');
}

export default function ImportEmployeesModal(props: Readonly<Props>) {
  const { onClose, onSuccess } = props;
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [headerWarnings, setHeaderWarnings] = useState(0);
  const [liveStats, setLiveStats] = useState<UploadLiveStats>(EMPTY_LIVE_STATS);
  const [report, setReport] = useState<UploadReport | null>(null);

  const hasFailures = (report?.failedRows ?? 0) > 0;
  const hasSuccess = (report?.successfulRows ?? 0) > 0;
  const topErrors = useMemo(() => report?.errors.slice(0, 8) ?? [], [report]);

  const resetState = useCallback(() => {
    setFile(null);
    setProcessing(false);
    setProgress(0);
    setHeaderWarnings(0);
    setLiveStats(EMPTY_LIVE_STATS);
    setReport(null);
  }, []);

  const handleFileChange = useCallback((nextFile: File | null | undefined) => {
    if (!nextFile) return;
    setFile(nextFile);
    setReport(null);
    setProgress(0);
    setHeaderWarnings(0);
    setLiveStats(EMPTY_LIVE_STATS);
  }, []);

  const handleImport = useCallback(async () => {
    if (!file) {
      toast({
        title: 'اختر ملفًا أولًا',
        description: 'الرجاء اختيار ملف Excel لاستيراد بيانات الموظفين.',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    setProgress(0);
    setHeaderWarnings(0);
    setLiveStats(EMPTY_LIVE_STATS);
    setReport(null);

    try {
      const buffer = await file.arrayBuffer();
      const result = await processBulkImportRows(buffer, setProgress, setLiveStats);
      setHeaderWarnings(result.headerWarnings);
      setReport(result.report);

      if (result.report.successfulRows > 0) {
        onSuccess();
      }

      if (result.report.successfulRows === 0) {
        toast({
          title: 'فشل الاستيراد',
          description: result.report.errors[0]?.issue || 'لم يتم استيراد أي صف من الملف.',
          variant: 'destructive',
        });
      } else if (result.report.failedRows > 0) {
        toast({
          title: 'اكتمل الاستيراد مع ملاحظات',
          description: `نجح ${result.report.successfulRows} وفشل ${result.report.failedRows}.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'تم الاستيراد بنجاح',
          description: `تمت معالجة ${result.report.successfulRows} صف بنجاح.`,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'حدث خطأ أثناء استيراد الملف.';
      toast({
        title: 'تعذر استيراد الملف',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  }, [file, onSuccess, toast]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">استيراد بيانات الموظفين</h2>
            <p className="mt-1 text-xs text-muted-foreground">الاستيراد يستخدم نفس المسار الموحد المعتمد داخل النظام.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              handleFileChange(event.dataTransfer.files?.[0]);
            }}
            className="cursor-pointer rounded-2xl border-2 border-dashed border-border px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-muted/20"
          >
            <Upload size={32} className="mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium text-foreground">اضغط لاختيار ملف أو اسحبه هنا</p>
            <p className="mt-1 text-xs text-muted-foreground">الصيغ المدعومة: xlsx, xls</p>
            {file && <p className="mt-3 text-sm font-medium text-primary">{file.name}</p>}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(event) => handleFileChange(event.target.files?.[0])}
          />

          {processing && (
            <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Loader2 size={16} className="animate-spin text-primary" />
                جارٍ تنفيذ الاستيراد
              </div>
              <Progress value={progress} className="h-3" />
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{progress}%</span>
                <span>
                  {liveStats.processedNames} / {liveStats.totalNames}
                </span>
              </div>
              {liveStats.currentName && (
                <p className="text-xs text-muted-foreground">
                  الحالي: <span className="font-medium text-foreground">{liveStats.currentName}</span>
                </p>
              )}
            </div>
          )}

          {report && !processing && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-border bg-muted/20 p-4 text-center">
                  <p className="text-xs text-muted-foreground">إجمالي الصفوف</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{report.totalProcessed}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                  <p className="text-xs text-emerald-700">الصفوف الناجحة</p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-700">{report.successfulRows}</p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
                  <p className="text-xs text-rose-700">الصفوف الفاشلة</p>
                  <p className="mt-1 text-2xl font-semibold text-rose-700">{report.failedRows}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4 text-center">
                  <p className="text-xs text-muted-foreground">تحذيرات الرأس</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{headerWarnings}</p>
                </div>
              </div>

              <div className={`rounded-xl border px-4 py-3 ${hasFailures ? 'border-warning/40 bg-warning/10' : 'border-emerald-200 bg-emerald-50'}`}>
                <div className="flex items-start gap-2">
                  {hasFailures ? (
                    <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-warning" />
                  ) : (
                    <CheckCircle size={18} className="mt-0.5 flex-shrink-0 text-emerald-600" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {hasFailures ? 'تم الاستيراد مع بعض الملاحظات' : 'تم الاستيراد بالكامل بنجاح'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {hasSuccess
                        ? `تم حفظ ${report.successfulRows} صف في النظام.`
                        : 'لم يتم حفظ أي صف في النظام.'}
                    </p>
                  </div>
                </div>
              </div>

              {topErrors.length > 0 && (
                <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">أهم الأخطاء والملاحظات</p>
                    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => downloadErrorReport(report.errors)}>
                      <Download size={14} /> تنزيل التقرير
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {topErrors.map((item, index) => (
                      <div key={`${item.rowIndex}-${index}`} className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">السطر {item.rowIndex}:</span> {item.issue}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={report ? resetState : onClose}>
            {report ? 'استيراد ملف آخر' : 'إلغاء'}
          </Button>
          <div className="flex items-center gap-3">
            {report && (
              <Button type="button" variant="outline" onClick={onClose}>
                إغلاق
              </Button>
            )}
            <Button type="button" onClick={handleImport} disabled={!file || processing} className="gap-2">
              {processing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              بدء الاستيراد
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
