import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Check, Trash2, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { useToast } from '@shared/hooks/use-toast';
import { differenceInDays, parseISO } from 'date-fns';
import { employeeService, type EmployeeAppOption } from '@services/employeeService';
import { useSignedUrl, extractStoragePath } from '@shared/hooks/useSignedUrl';
import { validateUploadFile } from '@shared/lib/validation';
import { auditService } from '@services/auditService';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@shared/lib/query';
import { cn } from '@shared/lib/utils';
import { logError } from '@shared/lib/logger';
import {
  DEFAULT_EMPLOYEE_CITY_OPTIONS,
  cityLabel,
  normalizeEmployeeCities,
  normalizeEmployeeCityValue,
} from '@modules/employees/model/employeeCity';
import {
  clampEmployeeNationalIdInput,
  clampEmployeePhoneInput,
  EMPLOYEE_INTL_PHONE_DIGITS,
  EMPLOYEE_NATIONAL_ID_DIGITS,
  isValidEmployeeNationalId,
  isValidEmployeePhone,
} from '@modules/employees/model/employeeFieldValidation';


interface EmployeeData {
  id: string;
  name: string;
  name_en?: string | null;
  job_title?: string | null;
  phone?: string | null;
  email?: string | null;
  national_id?: string | null;
  bank_account_number?: string | null;
  city?: string | null;
  cities?: string[] | null;
  join_date?: string | null;
  birth_date?: string | null;
  residency_expiry?: string | null;
  health_insurance_expiry?: string | null;
  probation_end_date?: string | null;
  license_status?: string | null;
  license_expiry?: string | null;
  sponsorship_status?: string | null;
  id_photo_url?: string | null;
  license_photo_url?: string | null;
  personal_photo_url?: string | null;
  status: string;
  salary_type: string;
  base_salary: number;
  preferred_language?: string | null;
  nationality?: string | null;
}

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
  editEmployee?: EmployeeData | null;
}

const STEPS = ['البيانات الأساسية', 'الإقامة والوثائق', 'نوع الراتب', 'رفع المستندات'];

const SectionTitle = ({ title }: { title: string }) => (
  <div className="flex items-center gap-3 mb-5">
    <span className="text-sm font-bold text-foreground">{title}</span>
    <div className="flex-1 h-px bg-border" />
  </div>
);

const F = ({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) => (
  <div>
    <Label className="text-sm mb-1.5 block text-foreground/80">
      {label} {required && <span className="text-destructive">*</span>}
    </Label>
    {children}
    {error && <p className="text-xs text-destructive mt-1">{error}</p>}
  </div>
);

const CITY_OPTIONS = DEFAULT_EMPLOYEE_CITY_OPTIONS.map((value) => ({
  value,
  label: cityLabel(value, value),
}));

// ─── Secure Upload Area — uses signed URLs for existing private docs ──────────
const UploadArea = ({ label, icon, file, existingStoragePath, onFile, onRemove, status, errorText }: {
  label: string; icon: string; file: File | null; existingStoragePath?: string | null;
  onFile: (f: File) => void; onRemove: () => void;
  status?: 'idle' | 'selected' | 'uploading' | 'uploaded' | 'error';
  errorText?: string | null;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  // Generate a signed URL for existing document (private bucket)
  const storagePath = extractStoragePath(existingStoragePath);
  const signedUrl = useSignedUrl('employee-documents', storagePath);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  const hasContent = file || existingStoragePath;
  let previewNode: React.ReactNode = null;
  if (file) {
    const isImageFile = file.type.startsWith('image/');
    previewNode = isImageFile
      ? <img src={URL.createObjectURL(file)} className="w-16 h-16 object-cover rounded-lg mx-auto" alt="" />
      : <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto text-2xl">📄</div>;
  } else if (signedUrl) {
    previewNode = <img src={signedUrl} className="w-16 h-16 object-cover rounded-lg mx-auto" alt="" />;
  } else if (existingStoragePath) {
    previewNode = <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto text-xl">📄</div>;
  }

  const statusBadge = (() => {
    if (status === 'uploading') return <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">جاري الرفع...</span>;
    if (status === 'uploaded') return <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success">تم الرفع</span>;
    if (status === 'selected') return <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/10 text-warning">جاهز للرفع</span>;
    if (status === 'error') return <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">فشل الرفع</span>;
    return null;
  })();

  return (
    <div className="flex-1 min-w-[130px]">
      <button
        type="button"
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${drag ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
        onClick={() => ref.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            ref.current?.click();
          }
        }}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
      >
        <input ref={ref} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
        {hasContent ? (
          <div className="space-y-1">
            {previewNode}
            <p className="text-xs text-foreground truncate max-w-[120px] mx-auto">{file ? file.name : 'مرفوع مسبقاً 🔒'}</p>
            {statusBadge}
            <button type="button" onClick={e => { e.stopPropagation(); onRemove(); }} className="text-xs text-destructive hover:underline flex items-center gap-1 mx-auto">
              <Trash2 size={10} /> حذف
            </button>
          </div>
        ) : (
          <>
            <div className="text-3xl mb-2">{icon}</div>
            <p className="text-xs font-medium text-foreground/70">{label}</p>
            <p className="text-[10px] text-muted-foreground mt-1">اضغط للرفع أو اسحب هنا</p>
            <p className="text-[10px] text-muted-foreground">JPG, PNG, PDF — 5MB</p>
          </>
        )}
      </button>
      {errorText && <p className="text-[11px] text-destructive mt-1">{errorText}</p>}
    </div>
  );
};

const phoneSchema = z
  .string()
  .trim()
  .min(1, 'رقم الهاتف مطلوب')
  .refine(isValidEmployeePhone, 'رقم هاتف غير صحيح');

const nationalIdSchema = z
  .string()
  .trim()
  .min(1, 'رقم الهوية مطلوب')
  .refine(isValidEmployeeNationalId, 'رقم هوية غير صحيح (10 أرقام)');

const employeeFormSchema = z
  .object({
    name: z.string().trim().min(2, 'الاسم مطلوب'),
    name_en: z.string().trim().optional().or(z.literal('')),
    job_title: z.string().trim().optional().or(z.literal('')),
    phone: phoneSchema,
    email: z.string().trim().email('بريد غير صحيح').optional().or(z.literal('')),
    national_id: nationalIdSchema,
    nationality: z.string().trim().optional().or(z.literal('')),
    bank_account_number: z.string().trim().optional().or(z.literal('')),
    cities: z.array(z.string().trim().min(1)).default([]),
    join_date: z.string().optional().or(z.literal('')),
    birth_date: z.string().optional().or(z.literal('')),
    residency_expiry: z.string().trim().min(1, 'تاريخ انتهاء الإقامة مطلوب'),
    health_insurance_expiry: z.string().optional().or(z.literal('')),
    license_expiry: z.string().optional().or(z.literal('')),
    probation_end_date: z.string().optional().or(z.literal('')),
    probation_days: z.string().optional().or(z.literal('')),
    license_status: z.enum(['has_license', 'no_license', 'applied']),
    sponsorship_status: z.enum(['sponsored', 'not_sponsored', 'absconded', 'terminated']),
    status: z.enum(['active', 'inactive', 'ended']).default('active'),
    salary_type: z.enum(['orders', 'shift']),
    base_salary: z.string().optional().or(z.literal('')),
    selected_apps: z.array(z.string()).default([]),
    app_schemes: z.record(z.string()).default({}),
    preferred_language: z.enum(['ar', 'en']).default('ar'),
  })
  .superRefine((val, ctx) => {
    if (val.salary_type === 'shift') {
      const n = Number(val.base_salary || 0);
      if (!n || n <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['base_salary'], message: 'الراتب مطلوب' });
      }
    }
  });

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

const AddEmployeeModal = ({ onClose, onSuccess, editEmployee }: Props) => {
  const isEdit = !!editEmployee;
  const [step, setStep] = useState(0);
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [schemes, setSchemes] = useState<{ id: string; name: string }[]>([]);
  const [availableApps, setAvailableApps] = useState<EmployeeAppOption[]>([]);
  const [cityDraft, setCityDraft] = useState('');

  const APP_COLOR_FALLBACKS: Record<string, { bg: string; fg: string }> = {
    'هنقرستيشن': { bg: '#ea580c', fg: '#ffffff' },
    'هنجر': { bg: '#ea580c', fg: '#ffffff' },
    'كيتا': { bg: '#7c3aed', fg: '#ffffff' },
  };

  const getAppChipColors = (appName: string) => {
    const app = availableApps.find((a) => a.name === appName);
    if (app?.brand_color) {
      return {
        bg: app.brand_color,
        fg: app.text_color || '#ffffff',
      };
    }
    return APP_COLOR_FALLBACKS[appName] || { bg: '#6366f1', fg: '#ffffff' };
  };

  const formApi = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: editEmployee?.name || '',
      name_en: editEmployee?.name_en || '',
      job_title: editEmployee?.job_title || '',
      phone: editEmployee?.phone || '',
      email: editEmployee?.email || '',
      national_id: editEmployee?.national_id || '',
      nationality: editEmployee?.nationality || '',
      bank_account_number: editEmployee?.bank_account_number || '',
      cities: normalizeEmployeeCities(editEmployee?.cities ?? [], editEmployee?.city),
      join_date: editEmployee?.join_date || '',
      birth_date: editEmployee?.birth_date || '',
      residency_expiry: editEmployee?.residency_expiry || '',
      health_insurance_expiry: editEmployee?.health_insurance_expiry || '',
      license_expiry: editEmployee?.license_expiry || '',
      probation_end_date: editEmployee?.probation_end_date || '',
      probation_days: '',
      license_status: (editEmployee?.license_status as EmployeeFormValues['license_status']) || 'no_license',
      sponsorship_status: (editEmployee?.sponsorship_status as EmployeeFormValues['sponsorship_status']) || 'not_sponsored',
      status: (editEmployee?.status as EmployeeFormValues['status']) || 'active',
      salary_type: (editEmployee?.salary_type as EmployeeFormValues['salary_type']) || 'orders',
      base_salary: editEmployee?.base_salary ? String(editEmployee.base_salary) : '',
      selected_apps: [],
      app_schemes: {},
      preferred_language: (editEmployee?.preferred_language as EmployeeFormValues['preferred_language']) || 'ar',
    },
    mode: 'onBlur',
  });

  const { trigger, setValue, getValues, watch, formState } = formApi;
  const errors = formState.errors as Record<string, { message?: string }>;
  const form = watch();
  const selectedCities = form.cities ?? [];

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      employeeService.getActiveSalarySchemes(),
      employeeService.getActiveApps(),
    ]).then(([schemes, apps]) => {
      if (!isMounted) return;
      setSchemes(schemes ?? []);
      setAvailableApps(apps ?? []);
    });

    if (editEmployee) {
      employeeService.getEmployeeAssignedAppNames(editEmployee.id).then((names) => {
        if (!isMounted) return;
        setValue('selected_apps', names ?? [], { shouldDirty: false });
      });
    }

    return () => {
      isMounted = false;
    };
  }, [editEmployee, setValue]);

  const [files, setFiles] = useState<{ personal: File | null; id: File | null; license: File | null }>({
    personal: null, id: null, license: null,
  });
  const [uploadState, setUploadState] = useState<{
    personal: { status: 'idle' | 'selected' | 'uploading' | 'uploaded' | 'error'; error: string | null };
    id: { status: 'idle' | 'selected' | 'uploading' | 'uploaded' | 'error'; error: string | null };
    license: { status: 'idle' | 'selected' | 'uploading' | 'uploaded' | 'error'; error: string | null };
  }>({
    personal: { status: editEmployee?.personal_photo_url ? 'uploaded' : 'idle', error: null },
    id: { status: editEmployee?.id_photo_url ? 'uploaded' : 'idle', error: null },
    license: { status: editEmployee?.license_photo_url ? 'uploaded' : 'idle', error: null },
  });

  useEffect(() => {
    setUploadState({
      personal: { status: editEmployee?.personal_photo_url ? 'uploaded' : 'idle', error: null },
      id: { status: editEmployee?.id_photo_url ? 'uploaded' : 'idle', error: null },
      license: { status: editEmployee?.license_photo_url ? 'uploaded' : 'idle', error: null },
    });
  }, [editEmployee?.personal_photo_url, editEmployee?.id_photo_url, editEmployee?.license_photo_url]);

  const uploadedFilesCount = ['personal', 'id', 'license'].filter((k) => {
    const key = k as 'personal' | 'id' | 'license';
    return uploadState[key].status === 'uploaded';
  }).length;
  const totalUploadSlots = 3;
  const uploadProgressPct = Math.round((uploadedFilesCount / totalUploadSlots) * 100);

  const setField = useCallback(
    <K extends keyof EmployeeFormValues>(k: K, v: EmployeeFormValues[K]) => setValue(k, v, { shouldDirty: true }),
    [setValue]
  );

  const upsertCity = useCallback((value: string) => {
    const normalized = normalizeEmployeeCityValue(value);
    if (!normalized) return;
    const next = normalizeEmployeeCities([...(getValues('cities') || []), normalized]);
    setField('cities', next);
    setCityDraft('');
  }, [getValues, setField]);

  const removeCity = useCallback((value: string) => {
    const normalized = normalizeEmployeeCityValue(value);
    if (!normalized) return;
    const next = normalizeEmployeeCities((getValues('cities') || []).filter((city) => city !== normalized));
    setField('cities', next);
  }, [getValues, setField]);

  const applyProbationDays = useCallback((daysValue: string) => {
    const digits = daysValue.replace(/\D/g, '').slice(0, 3);
    setField('probation_days', digits);
    if (!digits) {
      setField('probation_end_date', '');
      return;
    }
    const base = form.join_date ? new Date(form.join_date) : new Date();
    if (Number.isNaN(base.getTime())) {
      setField('probation_end_date', '');
      return;
    }
    base.setDate(base.getDate() + Number(digits));
    setField('probation_end_date', base.toISOString().split('T')[0]);
  }, [form.join_date, setField]);

  useEffect(() => {
    if (!form.probation_days) return;
    applyProbationDays(form.probation_days);
  }, [applyProbationDays, form.join_date]);

  const resStatus = (() => {
    if (!form.residency_expiry) return null;
    try {
      const days = differenceInDays(parseISO(form.residency_expiry), new Date());
      return { days, valid: days >= 0 };
    } catch (e) {
      logError('[AddEmployeeModal] could not parse residency_expiry', e, { level: 'warn' });
      return null;
    }
  })();

  const toggleApp = (app: string) => {
    const cur = getValues('selected_apps') || [];
    const next = cur.includes(app) ? cur.filter((a) => a !== app) : [...cur, app];
    setValue('selected_apps', next, { shouldDirty: true });
  };

  const validateStep = async (s: number) => {
    if (s === 0) return await trigger(['name', 'phone', 'national_id']);
    if (s === 1) return await trigger(['residency_expiry']);
    if (s === 2) return await trigger(['salary_type', 'base_salary']);
    return true;
  };

  const next = async () => {
    const ok = await validateStep(step);
    if (!ok) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep(s => Math.max(s - 1, 0));

  const buildEmployeePayload = (v: EmployeeFormValues) => ({
    name: v.name,
    name_en: v.name_en || null,
    job_title: v.job_title || null,
    phone: v.phone || null,
    email: v.email || null,
    national_id: v.national_id || null,
    nationality: v.nationality || null,
    bank_account_number: v.bank_account_number || null,
    city: v.cities[0] || null,
    cities: normalizeEmployeeCities(v.cities),
    join_date: v.join_date || null,
    birth_date: v.birth_date || null,
    residency_expiry: v.residency_expiry || null,
    health_insurance_expiry: v.health_insurance_expiry || null,
    license_expiry: v.license_expiry || null,
    probation_end_date: v.probation_end_date || null,
    license_status: v.license_status,
    sponsorship_status: v.sponsorship_status,
    status: v.status,
    salary_type: v.salary_type,
    base_salary: v.salary_type === 'shift' ? Number(v.base_salary || 0) : 0,
    preferred_language: v.preferred_language,
  });

  const upsertEmployeeAndAudit = async (payload: ReturnType<typeof buildEmployeePayload>) => {
    if (isEdit && editEmployee) {
      await employeeService.updateEmployee(editEmployee.id, payload);
      await auditService.logAdminAction({
        action: 'employees.update',
        table_name: 'employees',
        record_id: editEmployee.id,
        meta: { fields: Object.keys(payload) },
      });
      return editEmployee.id;
    }

    const createPayload = payload;
    const emp = await employeeService.createEmployee(createPayload);
    await auditService.logAdminAction({
      action: 'employees.create',
      table_name: 'employees',
      record_id: emp.id,
      meta: { name: createPayload.name, city: createPayload.city ?? null },
    });
    return emp.id;
  };

  const uploadEmployeeFiles = async (empId: string) => {
    const uploads = [
      { key: 'personal' as const, file: files.personal, path: `${empId}/personal_photo`, field: 'personal_photo_url' },
      { key: 'id' as const, file: files.id, path: `${empId}/id_photo`, field: 'id_photo_url' },
      { key: 'license' as const, file: files.license, path: `${empId}/license_photo`, field: 'license_photo_url' },
    ];
    const updates: Record<string, string> = {};
    const uploadedPaths: string[] = [];
    for (const u of uploads) {
      if (!u.file) continue;
      setUploadState((prev) => ({ ...prev, [u.key]: { status: 'uploading', error: null } }));
      const validation = validateUploadFile(u.file, {
        allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
      });
      if (!validation.valid) {
        const msg = 'error' in validation ? validation.error : 'ملف غير صالح';
        setUploadState((prev) => ({ ...prev, [u.key]: { status: 'error', error: msg } }));
        throw new Error(msg);
      }
      const ext = (u.file.name.split('.').pop() || '').toLowerCase();
      if (!ext) {
        const msg = 'امتداد الملف غير واضح، الرجاء اختيار ملف بصيغة JPG/PNG/PDF';
        setUploadState((prev) => ({ ...prev, [u.key]: { status: 'error', error: msg } }));
        throw new Error(msg);
      }
      const storagePath = `${u.path}.${ext}`;
      const upData = await employeeService.uploadEmployeeDocument(storagePath, u.file);
      if (upData) {
        updates[u.field] = upData.path;
        uploadedPaths.push(upData.path);
        setUploadState((prev) => ({ ...prev, [u.key]: { status: 'uploaded', error: null } }));
      }
    }
    if (Object.keys(updates).length > 0) {
      await employeeService.updateEmployeeDocumentPaths(empId, updates);
    }
    return uploadedPaths;
  };

  const syncEmployeeApps = async (empId: string, selectedApps: string[]) => {
    const appIds = selectedApps
      .map((appName) => availableApps.find((a) => a.name === appName)?.id)
      .filter((id): id is string => Boolean(id));
    await employeeService.replaceEmployeeApps(empId, appIds);
  };

  const save = async () => {
    const ok = await validateStep(step);
    if (!ok) return;
    setSaving(true);
    let createdEmployeeId: string | null = null;
    let uploadedDocumentPaths: string[] = [];
    try {
      const v = getValues();
      const payload = buildEmployeePayload(v);
      const empId = await upsertEmployeeAndAudit(payload);
      if (!isEdit) createdEmployeeId = empId;
      uploadedDocumentPaths = await uploadEmployeeFiles(empId);
      await syncEmployeeApps(empId, v.selected_apps || []);

      toast({
        title: isEdit ? 'تم تحديث بيانات المندوب' : 'تم إضافة المندوب بنجاح',
        description: v.name,
      });

      if (onSuccess) onSuccess();
      else onClose();
    } catch (err: unknown) {
      logError('[AddEmployeeModal] save failed', err);
      if (createdEmployeeId) {
        try {
          await employeeService.replaceEmployeeApps(createdEmployeeId, []);
          await employeeService.deleteEmployeeDocuments(uploadedDocumentPaths);
          await employeeService.deleteById(createdEmployeeId);
        } catch (rollbackErr: unknown) {
          logError('[AddEmployeeModal] rollback failed after save failure', rollbackErr, {
            employeeId: createdEmployeeId,
          });
          toast({
            title: 'خطأ في الحفظ',
            description: 'فشل حفظ الموظف وتعذر التراجع التلقائي بالكامل. يرجى مراجعة الدعم الفني.',
            variant: 'destructive',
          });
          return;
        }
      }
      toast({ title: 'خطأ في الحفظ', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };
  const isLastStep = step === STEPS.length - 1;
  let footerActionContent: React.ReactNode = <>التالي <ChevronRight size={15} /></>;
  if (saving) {
    footerActionContent = 'جاري الحفظ...';
  } else if (isLastStep) {
    const submitLabel = isEdit ? 'حفظ التعديلات' : 'حفظ المندوب';
    footerActionContent = <><Check size={15} /> {submitLabel}</>;
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col border border-border/50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-bold text-foreground">
            {isEdit ? 'تعديل بيانات المندوب' : 'إضافة مندوب جديد'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-0 px-6 pt-4 pb-2 shrink-0">
          {STEPS.map((s, i) => {
            const isDone = i < step;
            const isCurrent = i === step;
            let stateClass = 'bg-muted text-muted-foreground';
            if (isDone) stateClass = 'bg-success text-success-foreground';
            else if (isCurrent) stateClass = 'bg-primary text-primary-foreground';

            return (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2">
                  <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors', stateClass)}>
                    {isDone ? <Check size={12} /> : i + 1}
                  </div>
                  <span className={`text-xs hidden sm:block ${isCurrent ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>{s}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-2 ${isDone ? 'bg-success' : 'bg-border'}`} />}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Step 0 */}
          {step === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2"><SectionTitle title="── البيانات الأساسية ──" /></div>
              <F label="الاسم الكامل" required error={errors.name?.message}>
                <Input value={form.name} onChange={e => setField('name', e.target.value)} />
              </F>
              <F label="الاسم (إنجليزي)">
                <Input value={form.name_en} onChange={e => setField('name_en', e.target.value)} dir="ltr" />
              </F>
              <F label="المسمى الوظيفي">
                <Input value={form.job_title} onChange={e => setField('job_title', e.target.value)} />
              </F>
              <F label="رقم الهاتف" required error={errors.phone?.message}>
                <Input
                  value={form.phone}
                  onChange={e => setField('phone', clampEmployeePhoneInput(e.target.value))}
                  dir="ltr"
                  inputMode="numeric"
                  maxLength={EMPLOYEE_INTL_PHONE_DIGITS}
                />
              </F>
              <F label="البريد الإلكتروني">
                <Input type="email" value={form.email} onChange={e => setField('email', e.target.value)} dir="ltr" />
              </F>
              <F label="رقم الهوية الوطنية" required error={errors.national_id?.message}>
                <Input
                  value={form.national_id}
                  onChange={e => setField('national_id', clampEmployeeNationalIdInput(e.target.value))}
                  dir="ltr"
                  inputMode="numeric"
                  maxLength={EMPLOYEE_NATIONAL_ID_DIGITS}
                />
              </F>
              <F label="الجنسية">
                <Select value={form.nationality} onValueChange={v => setField('nationality', v)}>
                  <SelectTrigger><SelectValue placeholder="اختر الجنسية" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="سعودي">سعودي</SelectItem>
                    <SelectItem value="يمني">يمني</SelectItem>
                    <SelectItem value="باكستاني">باكستاني</SelectItem>
                    <SelectItem value="مصري">مصري</SelectItem>
                    <SelectItem value="سوداني">سوداني</SelectItem>
                    <SelectItem value="بنغالي">بنغالي</SelectItem>
                    <SelectItem value="هندي">هندي</SelectItem>
                    <SelectItem value="فلبيني">فلبيني</SelectItem>
                    <SelectItem value="فلسطيني">فلسطيني</SelectItem>
                    <SelectItem value="سوري">سوري</SelectItem>
                    <SelectItem value="أردني">أردني</SelectItem>
                    <SelectItem value="إثيوبي">إثيوبي</SelectItem>
                    <SelectItem value="نيبالي">نيبالي</SelectItem>
                    <SelectItem value="أخرى">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </F>
              <F label="رقم الحساب البنكي">
                <Input value={form.bank_account_number} onChange={e => setField('bank_account_number', e.target.value)} dir="ltr" />
              </F>
              <F label="المدن">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Select onValueChange={upsertCity}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="اختر مدينة" />
                      </SelectTrigger>
                      <SelectContent>
                        {CITY_OPTIONS.map(({ value, label }) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={cityDraft}
                      onChange={e => setCityDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          upsertCity(cityDraft);
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={() => upsertCity(cityDraft)}>
                      إضافة
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedCities.length === 0 && <span className="text-xs text-muted-foreground">لا توجد مدن مضافة</span>}
                    {selectedCities.map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => removeCity(city)}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground"
                      >
                        {cityLabel(city, city)}
                        <X size={12} />
                      </button>
                    ))}
                  </div>
                </div>
              </F>
              <F label="تاريخ الانضمام">
                <Input type="date" value={form.join_date} onChange={e => setField('join_date', e.target.value)} />
              </F>
              <F label="تاريخ الميلاد">
                <Input type="date" value={form.birth_date} onChange={e => setField('birth_date', e.target.value)} />
              </F>
              <F label="الحالة">
                <Select value={form.status} onValueChange={v => setField('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="inactive">غير نشط</SelectItem>
                    <SelectItem value="ended">منتهي</SelectItem>
                  </SelectContent>
                </Select>
              </F>

              <div className="sm:col-span-2">
                <SectionTitle title="── فترة التجربة (اختياري) ──" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <F label="عدد الأيام">
                    <Input
                      type="text"
                      value={form.probation_days}
                      onChange={e => applyProbationDays(e.target.value)}
                      dir="ltr"
                      inputMode="numeric"
                    />
                  </F>
                  <F label="تاريخ انتهاء فترة التجربة">
                    <Input type="date" value={form.probation_end_date} readOnly />
                    {form.probation_end_date && (
                      <button
                        type="button"
                        onClick={() => { setField('probation_end_date', ''); setField('probation_days', ''); }}
                        className="text-xs text-destructive hover:underline mt-1"
                      >
                        × مسح فترة التجربة
                      </button>
                    )}
                  </F>
                </div>
              </div>
              <F label="لغة كشف الراتب">
                <div className="flex gap-2 mt-1">
                  {([
                    { v: 'ar', flag: '🇸🇦', l: 'العربية' },
                    { v: 'en', flag: '🇬🇧', l: 'English' },
                  ] as { v: 'ar' | 'en'; flag: string; l: string }[]).map(({ v, flag, l }) => (
                    <button key={v} type="button" onClick={() => setField('preferred_language', v)}
                      className={`flex-1 py-2 px-2 rounded-lg border text-xs font-medium transition-colors flex items-center justify-center gap-1 ${form.preferred_language === v ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                      {flag} {l}
                    </button>
                  ))}
                </div>
              </F>
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2"><SectionTitle title="── الإقامة والوثائق ──" /></div>
              <div className="sm:col-span-2">
                <F label="تاريخ انتهاء الإقامة" required error={errors.residency_expiry?.message}>
                  <Input type="date" value={form.residency_expiry} onChange={e => setField('residency_expiry', e.target.value)} />
                </F>
                {resStatus && (
                  <div className={`mt-2 flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg ${resStatus.valid ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                    {resStatus.valid ? '✅' : '🔴'}
                    <span>
                      حالة الإقامة: {resStatus.valid ? 'صالحة' : 'منتهية'} —
                      {resStatus.valid ? ` متبقي ${resStatus.days} يوم` : ` منذ ${Math.abs(resStatus.days)} يوم`}
                    </span>
                  </div>
                )}
              </div>
              <F label="تاريخ انتهاء التأمين الصحي">
                <Input type="date" value={form.health_insurance_expiry} onChange={e => setField('health_insurance_expiry', e.target.value)} />
              </F>
              <F label="تاريخ انتهاء الرخصة">
                <Input type="date" value={form.license_expiry} onChange={e => setField('license_expiry', e.target.value)} />
              </F>
              <F label="حالة الرخصة">
                <Select value={form.license_status} onValueChange={v => setField('license_status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="has_license">لديه رخصة</SelectItem>
                    <SelectItem value="no_license">ليس لديه رخصة</SelectItem>
                    <SelectItem value="applied">تم التقديم عليها</SelectItem>
                  </SelectContent>
                </Select>
              </F>
              <F label="حالة الكفالة">
                <Select value={form.sponsorship_status} onValueChange={v => setField('sponsorship_status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sponsored">على الكفالة</SelectItem>
                    <SelectItem value="not_sponsored">ليس على الكفالة</SelectItem>
                    <SelectItem value="absconded">هروب</SelectItem>
                    <SelectItem value="terminated">انتهاء الخدمة</SelectItem>
                  </SelectContent>
                </Select>
              </F>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <SectionTitle title="── نوع الراتب ──" />
              <div className="flex gap-3">
                {[{ v: 'orders', l: '📦 بالطلب' }, { v: 'shift', l: '🕐 ثابت شهري' }].map(({ v, l }) => (
                  <button key={v} type="button" onClick={() => setField('salary_type', v)}
                    className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${form.salary_type === v ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                    {l}
                  </button>
                ))}
              </div>
              {form.salary_type === 'shift' && (
                <F label="الراتب الشهري (ر.س)" required error={errors.base_salary?.message}>
                  <Input type="number" value={form.base_salary} onChange={e => setField('base_salary', e.target.value)} />
                </F>
              )}
              <SectionTitle title="── المنصات المرتبطة ──" />
              <div className="flex flex-wrap gap-2">
                {availableApps.map(app => (
                  <button key={app.id} type="button" onClick={() => toggleApp(app.name)}
                    style={form.selected_apps.includes(app.name) ? {
                      backgroundColor: getAppChipColors(app.name).bg,
                      color: getAppChipColors(app.name).fg,
                      borderColor: getAppChipColors(app.name).bg,
                    } : undefined}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${form.selected_apps.includes(app.name) ? '' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                    {app.name}
                  </button>
                ))}
              </div>
              {form.selected_apps.length > 0 && (
                <div className="space-y-3 bg-muted/30 rounded-xl p-4">
                  {form.selected_apps.map(app => (
                    <div key={app} className="flex items-center gap-3">
                      <span
                        style={{
                          backgroundColor: getAppChipColors(app).bg,
                          color: getAppChipColors(app).fg,
                          borderColor: getAppChipColors(app).bg,
                        }}
                        className="text-xs font-semibold rounded-full border px-2.5 py-1 w-fit shrink-0"
                      >
                        {app}
                      </span>
                      <Select
                        value={form.app_schemes?.[app] || ''}
                        onValueChange={(v) => {
                          const cur = getValues('app_schemes') || {};
                          setValue('app_schemes', { ...cur, [app]: v }, { shouldDirty: true });
                        }}
                      >
                        <SelectTrigger className="flex-1 h-8 text-xs">
                          <SelectValue placeholder="اختر السكيمة" />
                        </SelectTrigger>
                        <SelectContent>
                          {schemes.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-5">
              <SectionTitle title="── رفع المستندات ──" />
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-foreground">تقدم رفع المستندات</span>
                  <span className="text-muted-foreground">{uploadedFilesCount}/{totalUploadSlots}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgressPct}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {uploadedFilesCount === totalUploadSlots
                    ? 'تم رفع كل المستندات بنجاح.'
                    : 'يمكنك رفع المستندات الآن أو لاحقاً.'}
                </p>
              </div>
              <div className="flex gap-4">
                <UploadArea
                  label="الصورة الشخصية" icon="📷"
                  file={files.personal} existingStoragePath={editEmployee?.personal_photo_url}
                  onFile={f => { setFiles(p => ({ ...p, personal: f })); setUploadState((s) => ({ ...s, personal: { status: 'selected', error: null } })); }}
                  onRemove={() => { setFiles(p => ({ ...p, personal: null })); setUploadState((s) => ({ ...s, personal: { status: 'idle', error: null } })); }}
                  status={uploadState.personal.status}
                  errorText={uploadState.personal.error}
                />
                <UploadArea
                  label="صورة الهوية" icon="🪪"
                  file={files.id} existingStoragePath={editEmployee?.id_photo_url}
                  onFile={f => { setFiles(p => ({ ...p, id: f })); setUploadState((s) => ({ ...s, id: { status: 'selected', error: null } })); }}
                  onRemove={() => { setFiles(p => ({ ...p, id: null })); setUploadState((s) => ({ ...s, id: { status: 'idle', error: null } })); }}
                  status={uploadState.id.status}
                  errorText={uploadState.id.error}
                />
                <UploadArea
                  label="صورة الرخصة" icon="🚗"
                  file={files.license} existingStoragePath={editEmployee?.license_photo_url}
                  onFile={f => { setFiles(p => ({ ...p, license: f })); setUploadState((s) => ({ ...s, license: { status: 'selected', error: null } })); }}
                  onRemove={() => { setFiles(p => ({ ...p, license: null })); setUploadState((s) => ({ ...s, license: { status: 'idle', error: null } })); }}
                  status={uploadState.license.status}
                  errorText={uploadState.license.error}
                />
              </div>
              <p className="text-xs text-muted-foreground">الملفات المقبولة: JPG, PNG, PDF — الحجم الأقصى: 5MB لكل ملف</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={step === 0 ? onClose : back} disabled={saving}>
            {step === 0 ? 'إلغاء' : <><ChevronLeft size={15} /> السابق</>}
          </Button>
          <Button onClick={step === STEPS.length - 1 ? save : next} disabled={saving} className="gap-2">
            {footerActionContent}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddEmployeeModal;

