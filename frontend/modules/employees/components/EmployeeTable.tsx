import React from 'react';
import { Eye, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Checkbox } from '@shared/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@shared/components/ui/dropdown-menu';
import { differenceInDays, parseISO, format } from 'date-fns';
import {
  CityBadge, LicenseBadge, SponsorBadge, StatusBadge,
  InlineSelect, EmployeeAvatar, SortIcon, ColFilterPopover,
  SkeletonRow, TextFilterInput,
} from '@modules/employees/components/EmployeesViewParts';
import { PlatformAppsEditor } from '@modules/employees/components/PlatformAppsEditor';
import { useActiveApps } from '@modules/employees/hooks/useActiveApps';
import {
  calcResidency, dayColorByThreshold, probationColor,
  GRID_SKELETON_IDS,
  type Employee, type SortDir, type ColumnDef,
} from '@modules/employees/types/employee.types';

type EmployeeDetailedTableProps = {
  activeCols: ColumnDef[];
  colFilters: Record<string, string>;
  sortField: string | null;
  sortDir: SortDir;
  handleSort: (field: string) => void;
  paginated: Employee[];
  filteredCount: number;
  loading: boolean;
  hasNoPaginatedRows: boolean;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  pageSize: number;
  setPageSize: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  saveField: (id: string, field: string, value: string, extraFields?: Record<string, unknown>) => Promise<void>;
  setSelectedEmployee: React.Dispatch<React.SetStateAction<string | null>>;
  setEditEmployee: React.Dispatch<React.SetStateAction<Employee | null>>;
  setShowAddModal: React.Dispatch<React.SetStateAction<boolean>>;
  setDeleteEmployee: React.Dispatch<React.SetStateAction<Employee | null>>;
  setStatusDateDialog: React.Dispatch<React.SetStateAction<{ emp: Employee; newStatus: string; label: string } | null>>;
  setStatusDate: React.Dispatch<React.SetStateAction<string>>;
  permissions: { can_edit: boolean; can_delete: boolean };
  uniqueVals: {
    city: string[];
    nationality: string[];
    sponsorship_status: string[];
    license_status: string[];
    job_title: string[];
    status: string[];
  };
  setColFilter: (key: string, value: string) => void;
  tableRef: React.RefObject<HTMLTableElement | null>;
  refetchEmployees: () => void;
};

export function EmployeeDetailedTable({
  activeCols, colFilters, sortField, sortDir, handleSort,
  paginated, filteredCount, loading, hasNoPaginatedRows,
  page, setPage, pageSize, setPageSize, totalPages,
  saveField, setSelectedEmployee, setEditEmployee, setShowAddModal,
  setDeleteEmployee, setStatusDateDialog, setStatusDate,
  permissions, uniqueVals, setColFilter, tableRef, refetchEmployees,
}: EmployeeDetailedTableProps) {
  const { data: availableApps = [] } = useActiveApps();

  return (
    <div className="ta-table-wrap">
      <div className="overflow-x-auto">
        <table className="w-full" ref={tableRef}>
          <thead>
            <tr className="ta-thead">
              {activeCols.map(col => {
                const isFilterable = !['seq', 'actions', 'platform_apps', 'residency_combined',
                  'join_date', 'birth_date', 'bank_account_number', 'probation_end_date', 'iban', 'license_expiry',
                  'name_en', 'health_insurance_expiry'].includes(col.key);
                const isActive = !!colFilters[col.key];

                const filterContent = (() => {
                  if (!isFilterable) return null;
                  if (col.key === 'city') {
                    const cityOptions = [
                      { v: 'makkah', l: 'مكة' },
                      { v: 'jeddah', l: 'جدة' },
                    ] as const;
                    const selected = colFilters.city ? colFilters.city.split(',').map((s) => s.trim()).filter(Boolean) : [];
                    const toggleCity = (v: string) => {
                      const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
                      setColFilter('city', next.length ? [...next].sort().join(',') : '');
                    };
                    return (
                      <div className="space-y-2">
                        {cityOptions.map(({ v, l }) => (
                          <label key={v} className="flex items-center gap-2 text-xs cursor-pointer">
                            <Checkbox checked={selected.includes(v)} onCheckedChange={() => toggleCity(v)} />
                            {l}
                          </label>
                        ))}
                      </div>
                    );
                  }
                  if (col.key === 'sponsorship_status') {
                    const kafalaOptions = [
                      { v: 'sponsored', l: 'على الكفالة' },
                      { v: 'not_sponsored', l: 'ليس على الكفالة' },
                      { v: 'absconded', l: 'هروب' },
                      { v: 'terminated', l: 'انتهاء الخدمة' },
                    ] as const;
                    const selected = colFilters.sponsorship_status
                      ? colFilters.sponsorship_status.split(',').map((s) => s.trim()).filter(Boolean)
                      : [];
                    const order = ['sponsored', 'not_sponsored', 'absconded', 'terminated'] as const;
                    const toggleKafala = (v: string) => {
                      const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
                      const sorted = order.filter((k) => next.includes(k));
                      setColFilter('sponsorship_status', sorted.length ? sorted.join(',') : '');
                    };
                    return (
                      <div className="space-y-2">
                        {kafalaOptions.map(({ v, l }) => (
                          <label key={v} className="flex items-center gap-2 text-xs cursor-pointer">
                            <Checkbox checked={selected.includes(v)} onCheckedChange={() => toggleKafala(v)} />
                            {l}
                          </label>
                        ))}
                      </div>
                    );
                  }
                  if (col.key === 'license_status') return (
                    <Select value={colFilters.license_status || 'all'} onValueChange={v => setColFilter('license_status', v)}>
                      <SelectTrigger className="h-7 text-xs w-full"><SelectValue placeholder="الكل" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        <SelectItem value="has_license">لديه رخصة</SelectItem>
                        <SelectItem value="no_license">ليس لديه رخصة</SelectItem>
                        <SelectItem value="applied">تم التقديم</SelectItem>
                      </SelectContent>
                    </Select>
                  );
                  if (col.key === 'nationality') return (
                    <Select value={colFilters.nationality || 'all'} onValueChange={v => setColFilter('nationality', v)}>
                      <SelectTrigger className="h-7 text-xs w-full"><SelectValue placeholder="الكل" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        {uniqueVals.nationality.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  );
                  if (col.key === 'job_title') return (
                    <Select value={colFilters.job_title || 'all'} onValueChange={v => setColFilter('job_title', v)}>
                      <SelectTrigger className="h-7 text-xs w-full"><SelectValue placeholder="الكل" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        {uniqueVals.job_title.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  );
                  return (
                    <TextFilterInput
                      value={colFilters[col.key] || ''}
                      onChange={(v) => setColFilter(col.key, v)}
                    />
                  );
                })();

                return (
                  <th
                    key={col.key}
                    className={`ta-th select-none whitespace-nowrap ${col.key === 'seq' ? 'w-10 px-2 text-center' : ''} ${col.sortable ? 'cursor-pointer hover:text-foreground' : ''}`}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  >
                    <div className="flex items-center gap-1">
                      <span>{col.label}</span>
                      {col.sortable && <SortIcon field={col.key} sortField={sortField} sortDir={sortDir} />}
                      {isFilterable && filterContent && (
                        <ColFilterPopover
                          colKey={col.key}
                          label={col.label}
                          active={isActive}
                          onClear={() => setColFilter(col.key, '')}
                        >
                          {filterContent}
                        </ColFilterPopover>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {loading && (
              GRID_SKELETON_IDS.map((id) => <SkeletonRow key={`employees-grid-skeleton-${id}`} cols={activeCols.length} />)
            )}
            {!loading && hasNoPaginatedRows && (
              <tr>
                <td colSpan={activeCols.length} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <span className="text-4xl">👥</span>
                    <p className="font-medium">لا توجد نتائج</p>
                    <p className="text-xs">جرّب تغيير الفلاتر أو إضافة موظف جديد</p>
                  </div>
                </td>
              </tr>
            )}
            {!loading && !hasNoPaginatedRows && paginated.map((emp, idx) => {
              const res     = calcResidency(emp.residency_expiry);
              const daysColor = dayColorByThreshold(res.days);
              const globalIdx = (page - 1) * pageSize + idx + 1;
              return (
                <tr key={emp.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  {activeCols.map(col => { // NOSONAR
                    switch (col.key) {
                      case 'seq':
                        return <td key="seq" className="px-2 py-2 text-[11px] text-muted-foreground text-center tabular-nums">{globalIdx}</td>;

                      case 'name':
                        return (
                          <td key="name" className="px-3 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <EmployeeAvatar path={emp.personal_photo_url} name={emp.name} />
                              <button onClick={() => setSelectedEmployee(emp.id)} className="text-sm font-semibold text-foreground hover:text-primary transition-colors text-start">
                                {emp.name}
                              </button>
                            </div>
                          </td>
                        );

                      case 'name_en':
                        return <td key="name_en" className="px-3 py-2.5 text-sm text-muted-foreground whitespace-nowrap" dir="ltr">{emp.name_en || '—'}</td>;

                      case 'employee_code':
                        return <td key="employee_code" className="px-3 py-2.5 text-sm text-muted-foreground tabular-nums whitespace-nowrap">{emp.employee_code || '—'}</td>;

                      case 'national_id':
                        return <td key="national_id" className="px-3 py-2.5 text-sm text-muted-foreground tabular-nums whitespace-nowrap" dir="ltr">{emp.national_id || '—'}</td>;

                      case 'job_title':
                        return <td key="job_title" className="px-3 py-2.5 text-sm text-muted-foreground whitespace-nowrap">{emp.job_title || '—'}</td>;

                      case 'city':
                        return (
                          <td key="city" className="px-3 py-2.5 whitespace-nowrap">
                            <InlineSelect
                              value={emp.city || ''}
                              options={[{ value: 'makkah', label: 'مكة' }, { value: 'jeddah', label: 'جدة' }]}
                              onSave={v => saveField(emp.id, 'city', v)}
                              renderDisplay={() => <CityBadge city={emp.city} />}
                            />
                          </td>
                        );

                      case 'phone':
                        return <td key="phone" className="px-3 py-2.5 text-sm text-muted-foreground whitespace-nowrap" dir="ltr">{emp.phone || '—'}</td>;

                      case 'nationality':
                        return <td key="nationality" className="px-3 py-2.5 text-sm text-muted-foreground whitespace-nowrap">{emp.nationality || '—'}</td>;

                      case 'platform_apps':
                        return (
                          <td key="platform_apps" className="px-3 py-2.5 whitespace-nowrap">
                            {permissions.can_edit ? (
                              <PlatformAppsEditor
                                employeeId={emp.id}
                                employeeName={emp.name}
                                currentApps={(emp as { platform_apps?: Array<{ id: string; name: string; brand_color?: string }> }).platform_apps || []}
                                availableApps={availableApps}
                                onSuccess={refetchEmployees}
                              />
                            ) : (
                              <div className="flex gap-1 flex-wrap max-w-[200px]">
                                {(emp as { platform_apps?: Array<{ id: string; name: string; brand_color?: string }> }).platform_apps?.length ? (
                                  (emp as { platform_apps: Array<{ id: string; name: string; brand_color?: string }> }).platform_apps.map(app => (
                                    <span
                                      key={app.id}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium"
                                      style={{
                                        backgroundColor: app.brand_color || '#6366f1',
                                        color: '#ffffff'
                                      }}
                                    >
                                      {app.name}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground/40 text-xs">—</span>
                                )}
                              </div>
                            )}
                          </td>
                        );

                      case 'commercial_record':
                        return <td key="commercial_record" className="px-3 py-2.5 text-sm text-muted-foreground whitespace-nowrap">{emp.commercial_record || '—'}</td>;

                      case 'residency_combined':
                        return (
                          <td key="residency_combined" className="px-3 py-2.5 whitespace-nowrap">
                            {emp.residency_expiry ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-muted-foreground">{format(parseISO(emp.residency_expiry), 'yyyy/MM/dd')}</span>
                                {res.days !== null && (
                                  <span className={`text-xs font-medium ${daysColor}`}>
                                    {res.days >= 0 ? `متبقي ${res.days} يوم` : `منتهية منذ ${Math.abs(res.days)} يوم`}
                                  </span>
                                )}
                              </div>
                            ) : <span className="text-muted-foreground/40">—</span>}
                          </td>
                        );

                      case 'sponsorship_status':
                        return (
                          <td key="sponsorship_status" className="px-3 py-2.5 whitespace-nowrap">
                            <InlineSelect
                              value={emp.sponsorship_status || 'not_sponsored'}
                              options={[
                                { value: 'sponsored',     label: 'على الكفالة'      },
                                { value: 'not_sponsored', label: 'ليس على الكفالة'  },
                                { value: 'absconded',     label: 'هروب'             },
                                { value: 'terminated',    label: 'انتهاء الخدمة'    },
                              ]}
                              onSave={v => {
                                if (v === 'absconded' || v === 'terminated') {
                                  setStatusDate(format(new Date(), 'yyyy-MM-dd'));
                                  setStatusDateDialog({
                                    emp,
                                    newStatus: v,
                                    label: v === 'absconded' ? 'هروب' : 'انتهاء الخدمة',
                                  });
                                  return Promise.resolve();
                                }
                                return saveField(emp.id, 'sponsorship_status', v);
                              }}
                              renderDisplay={() => <SponsorBadge status={emp.sponsorship_status} />}
                            />
                          </td>
                        );

                      case 'join_date':
                        return <td key="join_date" className="px-3 py-2.5 text-sm text-muted-foreground whitespace-nowrap">{emp.join_date ? format(parseISO(emp.join_date), 'yyyy/MM/dd') : '—'}</td>;

                      case 'birth_date':
                        return <td key="birth_date" className="px-3 py-2.5 text-sm text-muted-foreground whitespace-nowrap">{emp.birth_date ? format(parseISO(emp.birth_date), 'yyyy/MM/dd') : '—'}</td>;

                      case 'probation_end_date': {
                        const probDays = emp.probation_end_date ? differenceInDays(parseISO(emp.probation_end_date), new Date()) : null;
                        return (
                          <td key="probation_end_date" className="px-3 py-2.5 whitespace-nowrap">
                            {emp.probation_end_date ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-muted-foreground">{format(parseISO(emp.probation_end_date), 'yyyy/MM/dd')}</span>
                                {probDays !== null && (
                                  <span className={`text-xs font-medium ${probationColor(probDays)}`}>
                                    {probDays < 0 ? 'انتهت' : `${probDays}ي متبقي`}
                                  </span>
                                )}
                              </div>
                            ) : <span className="text-muted-foreground/40">—</span>}
                          </td>
                        );
                      }

                      case 'health_insurance_expiry': {
                        const hiExpiry = emp.health_insurance_expiry;
                        const hiDays   = hiExpiry ? differenceInDays(parseISO(hiExpiry), new Date()) : null;
                        const hiColor = dayColorByThreshold(hiDays);
                        return (
                          <td key="health_insurance_expiry" className="px-3 py-2.5 whitespace-nowrap">
                            {hiExpiry ? (
                              <div className="flex flex-col gap-0.5">
                                <span className={`text-xs ${hiColor}`}>{format(parseISO(hiExpiry), 'yyyy/MM/dd')}</span>
                                {hiDays !== null && (
                                  <span className={`text-[10px] ${hiColor}`}>
                                    {hiDays < 0 ? `منتهي منذ ${Math.abs(hiDays)} يوم` : `متبقي ${hiDays} يوم`}
                                  </span>
                                )}
                              </div>
                            ) : <span className="text-muted-foreground/40">—</span>}
                          </td>
                        );
                      }

                      case 'license_status':
                        return (
                          <td key="license_status" className="px-3 py-2.5 whitespace-nowrap">
                            <InlineSelect
                              value={emp.license_status || 'no_license'}
                              options={[
                                { value: 'has_license', label: 'لديه رخصة'     },
                                { value: 'no_license',  label: 'ليس لديه رخصة' },
                                { value: 'applied',     label: 'تم التقديم'    },
                              ]}
                              onSave={v => saveField(emp.id, 'license_status', v)}
                              renderDisplay={() => <LicenseBadge status={emp.license_status} />}
                            />
                          </td>
                        );

                      case 'license_expiry': {
                        const leExpiry = emp.license_expiry;
                        const leDays   = leExpiry ? differenceInDays(parseISO(leExpiry), new Date()) : null;
                        const leColor = dayColorByThreshold(leDays);
                        return (
                          <td key="license_expiry" className="px-3 py-2.5 whitespace-nowrap">
                            {leExpiry ? (
                              <div className="flex flex-col gap-0.5">
                                <span className={`text-xs ${leColor}`}>{format(parseISO(leExpiry), 'yyyy/MM/dd')}</span>
                                {leDays !== null && (
                                  <span className={`text-[10px] ${leColor}`}>
                                    {leDays < 0 ? `منتهية منذ ${Math.abs(leDays)} يوم` : `متبقي ${leDays} يوم`}
                                  </span>
                                )}
                              </div>
                            ) : <span className="text-muted-foreground/40">—</span>}
                          </td>
                        );
                      }

                      case 'bank_account_number':
                        return <td key="bank_account_number" className="px-3 py-2.5 text-sm text-muted-foreground tabular-nums whitespace-nowrap" dir="ltr">{emp.bank_account_number || '—'}</td>;

                      case 'iban':
                        return <td key="iban" className="px-3 py-2.5 text-sm text-muted-foreground tabular-nums whitespace-nowrap" dir="ltr">{emp.iban || '—'}</td>;

                      case 'email':
                        return (
                          <td key="email" className="px-3 py-2.5 text-sm whitespace-nowrap" dir="ltr">
                            {emp.email
                              ? <a href={`mailto:${emp.email}`} className="text-primary hover:underline">{emp.email}</a>
                              : <span className="text-muted-foreground/40">—</span>
                            }
                          </td>
                        );

                      case 'actions':
                        return (
                          <td key="actions" className="px-3 py-2.5 whitespace-nowrap">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground">
                                  ⋮
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedEmployee(emp.id)}>
                                  <Eye size={14} className="me-2" /> عرض الملف
                                </DropdownMenuItem>
                                {permissions.can_edit && (
                                  <DropdownMenuItem onClick={() => { setEditEmployee(emp); setShowAddModal(true); }}>
                                    <Edit size={14} className="me-2" /> تعديل البيانات
                                  </DropdownMenuItem>
                                )}
                                {permissions.can_delete && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setDeleteEmployee(emp)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 size={14} className="me-2" /> حذف الموظف
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        );

                      default:
                        return <td key={col.key} className="px-3 py-2.5">—</td>;
                    }
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!loading && filteredCount > 0 && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-border/30 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">عرض:</span>
            <Select
              value={String(pageSize)}
              onValueChange={v => { setPageSize(Number(v)); setPage(1); }}
            >
              <SelectTrigger className="h-7 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">لكل صفحة</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {Math.min((page - 1) * pageSize + 1, filteredCount)}–{Math.min(page * pageSize, filteredCount)} من {filteredCount}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(1)} disabled={page === 1}>
                «
              </Button>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                <ChevronRight size={12} />
              </Button>
              <span className="text-xs text-muted-foreground px-2 min-w-[70px] text-center">
                {page} / {totalPages}
              </span>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                <ChevronLeft size={12} />
              </Button>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>
                »
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
