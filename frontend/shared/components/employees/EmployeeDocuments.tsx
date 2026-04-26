import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  FileText,
  CreditCard,
  UserCircle,
  Car,
  Trash2,
  Eye,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@shared/lib/utils';
import { employeeService } from '@services/employeeService';
import { storageService } from '@services/storageService';
import type { Employee } from '@modules/employees/model/employeeUtils';

/**
 * أنواع المستندات المدعومة.
 */
const DOCUMENT_TYPES = [
  {
    key: 'id_photo_url' as const,
    label: 'صورة الهوية',
    icon: CreditCard,
    accept: 'image/*,.pdf',
  },
  {
    key: 'iqama_photo_url' as const,
    label: 'صورة الإقامة',
    icon: FileText,
    accept: 'image/*,.pdf',
  },
  {
    key: 'license_photo_url' as const,
    label: 'صورة الرخصة',
    icon: Car,
    accept: 'image/*,.pdf',
  },
  {
    key: 'personal_photo_url' as const,
    label: 'الصورة الشخصية',
    icon: UserCircle,
    accept: 'image/*',
  },
] as const;

type DocumentKey = (typeof DOCUMENT_TYPES)[number]['key'];

type EmployeeDocumentsProps = {
  employee: Pick<Employee, 'id' | 'name'> & Partial<Pick<Employee, DocumentKey>>;
  /** هل يمكن رفع/حذف المستندات؟ */
  editable?: boolean;
  className?: string;
};

/**
 * EmployeeDocuments — عرض وإدارة مستندات الموظف (هوية، إقامة، رخصة، صورة شخصية).
 *
 * يدعم رفع ملفات جديدة وحذف الملفات الحالية مع تحديث قاعدة البيانات.
 */
export function EmployeeDocuments({
  employee,
  editable = false,
  className,
}: EmployeeDocumentsProps) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<DocumentKey | null>(null);
  const [deleting, setDeleting] = useState<DocumentKey | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = useCallback(
    async (docKey: DocumentKey, file: File) => {
      setError(null);
      setUploading(docKey);
      try {
        const storagePath = `${employee.id}/${docKey.replace('_url', '')}_${Date.now()}`;
        await employeeService.uploadEmployeeDocument(storagePath, file);
        await employeeService.updateEmployeeDocumentPaths(employee.id, {
          [docKey]: storagePath,
        });
        await queryClient.invalidateQueries({ queryKey: ['employees'] });
      } catch {
        setError('فشل رفع المستند. حاول مرة أخرى.');
      } finally {
        setUploading(null);
      }
    },
    [employee.id, queryClient],
  );

  const handleDelete = useCallback(
    async (docKey: DocumentKey) => {
      const currentPath = employee[docKey];
      if (!currentPath) return;

      setError(null);
      setDeleting(docKey);
      try {
        await employeeService.deleteEmployeeDocuments([currentPath]);
        await employeeService.updateEmployeeDocumentPaths(employee.id, {
          [docKey]: null,
        });
        await queryClient.invalidateQueries({ queryKey: ['employees'] });
      } catch {
        setError('فشل حذف المستند. حاول مرة أخرى.');
      } finally {
        setDeleting(null);
      }
    },
    [employee, queryClient],
  );

  const handlePreview = useCallback(async (path: string) => {
    try {
      const url = await storageService.createSignedUrl('employee-documents', path, 300);
      setPreviewUrl(url);
    } catch {
      setError('فشل تحميل المستند للعرض.');
    }
  }, []);

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-semibold text-foreground">مستندات الموظف</h3>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {DOCUMENT_TYPES.map(({ key, label, icon: Icon, accept }) => {
          const hasDoc = !!employee[key];
          const isUploading = uploading === key;
          const isDeleting = deleting === key;
          const busy = isUploading || isDeleting;

          return (
            <div
              key={key}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg border p-3 transition-colors',
                hasDoc
                  ? 'border-primary/20 bg-primary/5'
                  : 'border-border bg-muted/30',
              )}
            >
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                  hasDoc
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <Icon size={18} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">
                  {hasDoc ? 'تم الرفع ✓' : 'لم يتم الرفع'}
                </p>
              </div>

              <div className="flex items-center gap-1">
                {hasDoc && (
                  <button
                    type="button"
                    onClick={() => handlePreview(employee[key]!)}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    title="عرض"
                  >
                    <Eye size={15} />
                  </button>
                )}

                {editable && hasDoc && (
                  <button
                    type="button"
                    onClick={() => handleDelete(key)}
                    disabled={busy}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    title="حذف"
                  >
                    {isDeleting ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                )}

                {editable && (
                  <label
                    className={cn(
                      'cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                      busy && 'pointer-events-none opacity-50',
                    )}
                    title="رفع"
                  >
                    {isUploading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Upload size={15} />
                    )}
                    <input
                      type="file"
                      accept={accept}
                      className="sr-only"
                      disabled={busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(key, file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* معاينة المستند */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative max-h-[90vh] max-w-3xl overflow-auto rounded-xl bg-background p-2 shadow-2xl">
            <button
              type="button"
              onClick={() => setPreviewUrl(null)}
              className="absolute left-2 top-2 z-10 rounded-full bg-background/80 px-2.5 py-1 text-xs font-semibold text-foreground shadow backdrop-blur-sm hover:bg-background"
            >
              ✕ إغلاق
            </button>
            {previewUrl.match(/\.pdf/i) ? (
              <iframe
                src={previewUrl}
                title="معاينة المستند"
                className="h-[80vh] w-full rounded-lg"
              />
            ) : (
              <img
                src={previewUrl}
                alt="معاينة المستند"
                className="max-h-[80vh] rounded-lg object-contain"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
