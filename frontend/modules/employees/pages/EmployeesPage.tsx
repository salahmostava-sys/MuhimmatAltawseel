import { Suspense, lazy, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, CalendarDays } from 'lucide-react';
import { Input } from '@shared/components/ui/input';
import { Button } from '@shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@shared/components/ui/dialog';
import { Label } from '@shared/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@shared/components/ui/alert-dialog';
import { format } from 'date-fns';
import { useToast } from '@shared/hooks/use-toast';
import { usePermissions } from '@shared/hooks/usePermissions';
import { isEmployeeVisibleInMonth } from '@shared/lib/employeeVisibility';
import { createDefaultGlobalFilters } from '@shared/components/table/GlobalTableFilters';
import { useEmployeesData } from '@modules/employees/hooks/useEmployees';
import { applyEmployeeFilters, sortEmployees } from '@modules/employees/model/employeeUtils';
import { EmployeeActionsBar } from '@modules/employees/components/EmployeeActionsBar';
import { EmployeeDetailedTable } from '@modules/employees/components/EmployeeTable';
import { useEmployeeActions } from '@modules/employees/hooks/useEmployeeTable';
import Loading from '@shared/components/Loading';
import {
  ALL_COLUMNS, DEFAULT_HIDDEN_COLS, toCityLabel,
  type Employee, type SortDir, type ColKey,
  type EmployeeProfileProps, type EmployeeStatusFilter,
  type UploadReport, type UploadLiveStats,
} from '@modules/employees/types/employee.types';

const EmployeeProfile = lazy(() => import('@shared/components/employees/EmployeeProfile'));
const EmployeesFastListView = lazy(() =>
  import('@modules/employees/components/EmployeesFastList').then((module) => ({
    default: module.EmployeesFastList,
  })),
);
const EmployeeFormModal = lazy(() =>
  import('@modules/employees/components/EmployeeFormModal').then((module) => ({
    default: module.EmployeeFormModal,
  })),
);

const InlineLoader = ({ minHeightClassName = 'min-h-[260px]' }: Readonly<{ minHeightClassName?: string }>) => (
  <Loading minHeightClassName={minHeightClassName} />
);

const Employees = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { permissions } = usePermissions('employees');
  const [data, setData] = useState<Employee[]>([]);
  const [viewMode, setViewMode] = useState<'detailed' | 'fast'>('detailed');
  const {
    employees: employeesData,
    activeEmployeeIdsInMonth,
    isLoading: loading,
    error: employeesError,
    refetch: refetchEmployees,
  } = useEmployeesData();
  const [sortField, setSortField] = useState<string | null>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(
    new Set(ALL_COLUMNS.map(c => c.key).filter(k => !DEFAULT_HIDDEN_COLS.has(k)))
  );
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [fastPage, setFastPage] = useState(1);
  const [fastPageSize] = useState(50);
  const [fastFilters, setFastFilters] = useState(() => createDefaultGlobalFilters());
  const [fastStatus, setFastStatus] = useState<EmployeeStatusFilter>('active');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [uploadReport, setUploadReport] = useState<UploadReport | null>(null);
  const [uploadLiveStats, setUploadLiveStats] = useState<UploadLiveStats>({
    processedNames: 0, totalNames: 0, currentName: '',
  });
  const [statusDateDialog, setStatusDateDialog] = useState<{
    emp: Employee; newStatus: string; label: string;
  } | null>(null);
  const [statusDate, setStatusDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [statusDateSaving, setStatusDateSaving] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);

  const syncSystemAfterEmployeeImport = useCallback(async () => {
    const shouldRefresh = (value: string) =>
      value.includes('employee') || value.includes('dashboard') || value.includes('order')
      || value.includes('attendance') || value.includes('advance') || value.includes('salary')
      || value.includes('fuel') || value.includes('vehicle') || value.includes('platform')
      || value.includes('alert') || value.includes('tier') || value.includes('app');
    const predicate = (query: { queryKey: readonly unknown[] }) => {
      const keyText = query.queryKey.map((part) => String(part).toLowerCase()).join(' ');
      return shouldRefresh(keyText);
    };
    await queryClient.invalidateQueries({ predicate });
    await queryClient.refetchQueries({ predicate, type: 'active' });
  }, [queryClient]);

  useEffect(() => {
    const rows = (employeesData as Employee[]) ?? [];
    setData(rows);
  }, [employeesData]);

  useEffect(() => {
    if (!employeesError) return;
    const message =
      employeesError instanceof Error
        ? employeesError.message
        : 'حدث خطأ غير متوقع أثناء تحميل الموظفين';
    toast({ title: 'خطأ في تحميل البيانات', description: message, variant: 'destructive' });
  }, [employeesError, toast]);

  useEffect(() => {
    let hiddenAt: number | null = null;
    const minAwayMs = 90_000;
    const onVis = () => {
      if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
      if (document.visibilityState !== 'visible' || hiddenAt === null) return;
      const away = Date.now() - hiddenAt;
      hiddenAt = null;
      if (away >= minAwayMs) void refetchEmployees();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refetchEmployees]);

  useEffect(() => { setPage(1); }, [colFilters, sortField, sortDir]);

  useEffect(() => {
    return () => {
      if (uploadIntervalRef.current) {
        clearInterval(uploadIntervalRef.current);
        uploadIntervalRef.current = null;
      }
    };
  }, []);

  const uniqueVals = useMemo(() => ({
    city:               [...new Set(data.map(e => e.city).filter(Boolean))] as string[],
    nationality:        [...new Set(data.map(e => e.nationality).filter(Boolean))] as string[],
    sponsorship_status: ['sponsored', 'not_sponsored', 'absconded', 'terminated'],
    license_status:     ['has_license', 'no_license', 'applied'],
    job_title:          [...new Set(data.map(e => e.job_title).filter(Boolean))] as string[],
    status:             ['active', 'inactive', 'ended'],
  }), [data]);

  const filtered = useMemo(() => {
    const filteredRows = applyEmployeeFilters(data, colFilters);
    return sortEmployees(filteredRows, sortField, sortDir);
  }, [data, colFilters, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  const {
    handleSort, saveField, handleSaveStatusWithDate, handleDelete,
    setColFilter, runExportDetailed, runTemplateDownload, runPrintDetailed,
    runImportFile, runFastExportWrapped,
  } = useEmployeeActions({
    data, setData, filtered, sortField, setSortField, sortDir, setSortDir,
    toast, permissions, deleteEmployee, setDeleteEmployee, setDeleting,
    setActionLoading, setIsUploading, setUploadProgress, setUploadReport,
    setUploadLiveStats, uploadIntervalRef, refetchEmployees,
    syncSystemAfterEmployeeImport, fastFilters, fastStatus,
    statusDateDialog, statusDate, setStatusDateSaving, setStatusDateDialog,
    tableRef, colFilters, setColFilters,
  });

  const activeCols = ALL_COLUMNS.filter(c => visibleCols.has(c.key));
  const hasActiveFilters = Object.keys(colFilters).length > 0;
  const isTableLoading = loading;
  const hasNoPaginatedRows = paginated.length === 0;

  // ── profile view ──
  if (selectedEmployee) {
    const emp = (employeesData as Employee[]).find(e => e.id === selectedEmployee) ?? data.find(e => e.id === selectedEmployee);
    if (emp) {
      const isVisibleInMonth = isEmployeeVisibleInMonth(emp, activeEmployeeIdsInMonth);
      if (isVisibleInMonth) {
        return (
          <Suspense fallback={<InlineLoader minHeightClassName="min-h-[420px]" />}>
            <EmployeeProfile
              employee={emp as EmployeeProfileProps['employee']}
              onBack={() => setSelectedEmployee(null)}
            />
          </Suspense>
        );
      }
      setSelectedEmployee(null);
    }
  }

  if (viewMode === 'fast') {
    return (
      <Suspense fallback={<InlineLoader minHeightClassName="min-h-[320px]" />}>
        <EmployeesFastListView
          loadingMain={loading}
          onBackToDetailed={() => setViewMode('detailed')}
          branch={fastFilters.branch}
          search={fastFilters.search}
          status={fastStatus}
          onStatusChange={setFastStatus}
          onFiltersChange={(next) => { setFastFilters(next); setFastPage(1); }}
          page={fastPage}
          onPageChange={setFastPage}
          pageSize={fastPageSize}
          onExport={runFastExportWrapped}
          onDownloadTemplate={runTemplateDownload}
          onImportFile={runImportFile}
          actionLoading={actionLoading}
          canEdit={permissions.can_edit}
          toCityLabel={toCityLabel}
        />
      </Suspense>
    );
  }

  return (
    <div className="space-y-4">
      <EmployeeActionsBar
        actionLoading={actionLoading}
        permissions={permissions}
        onExport={runExportDetailed}
        onDownloadTemplate={runTemplateDownload}
        onPrint={runPrintDetailed}
        onImportFile={runImportFile}
        visibleCols={visibleCols}
        setVisibleCols={setVisibleCols}
        onFastView={() => setViewMode('fast')}
        onAddEmployee={() => { setEditEmployee(null); setShowAddModal(true); }}
        isUploading={isUploading}
        uploadReport={uploadReport}
        setUploadReport={setUploadReport}
        uploadProgress={uploadProgress}
        uploadLiveStats={uploadLiveStats}
        hasActiveFilters={hasActiveFilters}
        colFilters={colFilters}
        setColFilter={setColFilter}
        setColFilters={setColFilters}
        filteredCount={filtered.length}
        totalCount={data.length}
      />

      <EmployeeDetailedTable
        activeCols={activeCols}
        colFilters={colFilters}
        sortField={sortField}
        sortDir={sortDir}
        handleSort={handleSort}
        paginated={paginated}
        filteredCount={filtered.length}
        loading={isTableLoading}
        hasNoPaginatedRows={hasNoPaginatedRows}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
        totalPages={totalPages}
        saveField={saveField}
        setSelectedEmployee={setSelectedEmployee}
        setEditEmployee={setEditEmployee}
        setShowAddModal={setShowAddModal}
        setDeleteEmployee={setDeleteEmployee}
        setStatusDateDialog={setStatusDateDialog}
        setStatusDate={setStatusDate}
        permissions={permissions}
        uniqueVals={uniqueVals}
        setColFilter={setColFilter}
        tableRef={tableRef}
        refetchEmployees={refetchEmployees}
      />

      {/* Modals */}
      {showAddModal && (
        <Suspense fallback={<InlineLoader />} >
          <EmployeeFormModal
            open={showAddModal}
            editEmployee={editEmployee}
            onClose={() => { setShowAddModal(false); setEditEmployee(null); }}
            onSuccess={() => { void refetchEmployees(); setShowAddModal(false); setEditEmployee(null); }}
          />
        </Suspense>
      )}

      <AlertDialog open={!!deleteEmployee} onOpenChange={open => !open && setDeleteEmployee(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الموظف <span className="font-semibold text-foreground">{deleteEmployee?.name}</span>؟
              {' '}لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 size={14} className="animate-spin me-1" /> : null}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!statusDateDialog} onOpenChange={open => !open && setStatusDateDialog(null)}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays size={16} className="text-destructive" />
              تحديد تاريخ — {statusDateDialog?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              أدخل تاريخ <strong>{statusDateDialog?.label}</strong> للمندوب{' '}
              <strong className="text-foreground">{statusDateDialog?.emp.name}</strong>
            </p>
            <div>
              <Label className="mb-1.5 block">
                {statusDateDialog?.newStatus === 'absconded' ? 'تاريخ الهروب' : 'تاريخ انتهاء الخدمة'}
              </Label>
              <Input
                type="date"
                value={statusDate}
                onChange={e => setStatusDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setStatusDateDialog(null)}>إلغاء</Button>
            <Button
              variant="destructive"
              onClick={handleSaveStatusWithDate}
              disabled={!statusDate || statusDateSaving}
            >
              {statusDateSaving && <Loader2 size={14} className="animate-spin ml-1" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Employees;
