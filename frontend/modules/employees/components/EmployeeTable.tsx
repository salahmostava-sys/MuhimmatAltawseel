import React from 'react';
import { Eye, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Checkbox } from '@shared/components/ui/checkbox';
import { Input } from '@shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@shared/components/ui/dropdown-menu';
import { differenceInDays, parseISO, format } from 'date-fns';
import {
  CityBadges, LicenseBadge, SponsorBadge, StatusBadge,
  EmployeeAvatar, SortIcon, ColFilterPopover,
  SkeletonRow, TextFilterInput,
} from '@modules/employees/components/EmployeesViewParts';
import { cityLabel, DEFAULT_EMPLOYEE_CITY_OPTIONS } from '@modules/employees/model/employeeCity';
import { getEmployeeCities } from '@modules/employees/model/employeeUtils';
import {
  InlineInputEditor,
  InlineMultiSelectEditor,
  InlineSelectEditor,
} from '@modules/employees/components/EmployeeInlineEditors';
import { PlatformAppsEditor } from '@modules/employees/components/PlatformAppsEditor';
import { useActiveApps } from '@modules/employees/hooks/useActiveApps';
import {
  calcResidency, dayColorByThreshold, probationColor,
  GRID_SKELETON_IDS,
  EMPTY_DATA_PLACEHOLDER,
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
  const emptyCell = <span className="text-muted-foreground/40">{EMPTY_DATA_PLACEHOLDER}</span>;
  const cellText = (value?: string | null) => value || EMPTY_DATA_PLACEHOLDER;
  const cityOptions = Array.from(new Set([...DEFAULT_EMPLOYEE_CITY_OPTIONS, ...uniqueVals.city]))
    .map((value) => ({ value, label: cityLabel(value, value) }));
  const sponsorshipOptions = [
    { value: 'sponsored', label: 'على الكفالة' },
    { value: 'not_sponsored', label: 'ليس على الكفالة' },
    { value: 'absconded', label: 'هروب' },
    { value: 'terminated', label: 'انتهاء الخدمة' },
  ] as const;
  const licenseOptions = [
    { value: 'has_license', label: 'لديه رخصة' },
    { value: 'no_license', label: 'ليس لديه رخصة' },
    { value: 'applied', label: 'تم التقديم' },
  ] as const;
  const statusOptions = [
    { value: 'active', label: 'نشط' },
    { value: 'inactive', label: 'غير نشط' },
    { value: 'ended', label: 'منتهي' },
  ] as const;
  const buildTextOptions = (values: string[], currentValue?: string | null) =>
    Array.from(new Set([...values, currentValue || ''].filter(Boolean)))
      .map((value) => ({ value, label: value }));
  const dateFilterKeys = new Set([
    'join_date',
    'birth_date',
    'probation_end_date',
    'residency_combined',
    'health_insurance_expiry',
    'license_expiry',
  ]);
  const formatDateCell = (value?: string | null) => (value ? format(parseISO(value), 'yyyy/MM/dd') : EMPTY_DATA_PLACEHOLDER);
  const getDateInputValue = (value?: string | null) => value?.slice(0, 10) || '';
  const renderTextValue = (
    value?: string | null,
    options?: Readonly<{ dir?: 'rtl' | 'ltr' | 'auto'; className?: string }>
  ) => (
    <span
      className={`text-sm text-muted-foreground whitespace-nowrap ${options?.className || ''}`}
      dir={options?.dir}
    >
      {cellText(value)}
    </span>
  );
  const renderEditableTextCell = (
    employeeId: string,
    field: string,
    value?: string | null,
    options?: Readonly<{
      dir?: 'rtl' | 'ltr' | 'auto';
      className?: string;
      placeholder?: string;
      inputType?: 'text' | 'email';
    }>
  ) => {
    const display = renderTextValue(value, options);
    if (!permissions.can_edit) return display;
    return (
      <InlineInputEditor
        value={value || ''}
        inputType={options?.inputType || 'text'}
        dir={options?.dir || 'auto'}
        placeholder={options?.placeholder}
        onSave={(nextValue) => saveField(employeeId, field, nextValue)}
        renderDisplay={() => display}
      />
    );
  };
  const renderEditableDate = (
    employeeId: string,
    field: string,
    value?: string | null,
    display?: React.ReactNode
  ) => {
    const displayNode = display ?? (value ? renderTextValue(formatDateCell(value), { dir: 'ltr' }) : emptyCell);
    if (!permissions.can_edit) return displayNode;
    return (
      <InlineInputEditor
        value={getDateInputValue(value)}
        inputType="date"
        dir="ltr"
        onSave={(nextValue) => saveField(employeeId, field, nextValue)}
        renderDisplay={() => displayNode}
      />
    );
  };

  return (
    <div className="ta-table-wrap">
      <div className="overflow-x-auto">
        <table className="w-full text-center align-middle" ref={tableRef}>
          <thead className="bg-yellow-400">
            <tr className="ta-thead">
              {activeCols.map(col => {
                const isFilterable = !['seq', 'actions'].includes(col.key);
                const isActive = !!colFilters[col.key];

                const filterContent = (() => {
                  if (!isFilterable) return null;
                  if (col.key === 'city') {
                    const selected = colFilters.city ? colFilters.city.split(',').map((s) => s.trim()).filter(Boolean) : [];
                    const toggleCity = (v: string) => {
                      const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
                      setColFilter('city', next.length ? [...next].sort().join(',') : '');
                    };
                    return (
                      <div className="space-y-2">
                        {cityOptions.map(({ value, label }) => (
                          <label key={value} className="flex items-center gap-2 text-xs cursor-pointer">
                            <Checkbox checked={selected.includes(value)} onCheckedChange={() => toggleCity(value)} />
                            {label}
                          </label>
                        ))}
                      </div>
                    );
                  }
                  if (col.key === 'platform_apps') {
                    const selected = colFilters.platform_apps
                      ? colFilters.platform_apps.split(',').map((value) => value.trim()).filter(Boolean)
                      : [];
                    const toggleApp = (appId: string) => {
                      const next = selected.includes(appId)
                        ? selected.filter((value) => value !== appId)
                        : [...selected, appId];
                      const ordered = availableApps
                        .map((app) => app.id)
                        .filter((appIdValue) => next.includes(appIdValue));
                      setColFilter('platform_apps', ordered.join(','));
                    };
                    if (availableApps.length === 0) {
                      return <p className="text-xs text-muted-foreground text-center py-2">لا توجد منصات متاحة</p>;
                    }
                    return (
                      <div className="space-y-2">
                        {availableApps.map((app) => (
                          <label key={app.id} className="flex items-center gap-2 text-xs cursor-pointer">
                            <Checkbox checked={selected.includes(app.id)} onCheckedChange={() => toggleApp(app.id)} />
                            <span
                              className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium text-white"
                              style={{ backgroundColor: app.brand_color || '#6366f1' }}
                            >
                              {app.name}
                            </span>
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
                  if (dateFilterKeys.has(col.key)) return (
                    <Input
                      type="date"
                      className="h-8 text-xs px-2"
                      value={colFilters[col.key] || ''}
                      onChange={(event) => setColFilter(col.key, event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                    />
                  );
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
                  if (col.key === 'status') return (
                    <Select value={colFilters.status || 'all'} onValueChange={v => setColFilter('status', v)}>
                      <SelectTrigger className="h-7 text-xs w-full"><SelectValue placeholder="الكل" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
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
                    className={`ta-th select-none whitespace-nowrap text-center text-black ${col.key === 'seq' ? 'w-10 px-2' : ''} ${col.sortable ? 'cursor-pointer hover:text-gray-800' : ''}`}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  >
                    <div className="flex items-center justify-center gap-1">
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
                          <td key="name" className="px-3 py-2.5 whitespace-nowrap text-center align-middle">
                            <div className="flex items-center justify-center gap-2.5">
                              <EmployeeAvatar path={emp.personal_photo_url} name={emp.name} />
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => setSelectedEmployee(emp.id)} className="text-sm font-semibold text-foreground transition-colors hover:text-primary text-center">
                                  {emp.name}
                                </button>
                                {permissions.can_edit && (
                                  <InlineInputEditor
                                    value={emp.name || ''}
                                    placeholder="اسم الموظف"
                                    onSave={(nextValue) => saveField(emp.id, 'name', nextValue)}
                                    renderDisplay={() => (
                                      <span className="text-[11px] text-muted-foreground hover:text-primary">
                                        تعديل
                                      </span>
                                    )}
                                  />
                                )}
                              </div>
                            </div>
                          </td>
                        );

                      case 'name_en':
                        return (
                          <td key="name_en" className="px-3 py-2.5 text-center whitespace-nowrap" dir="ltr">
                            {renderEditableTextCell(emp.id, 'name_en', emp.name_en, {
                              dir: 'ltr',
                              placeholder: 'الاسم بالإنجليزية',
                            })}
                          </td>
                        );

                      case 'national_id':
                        return (
                          <td key="national_id" className="px-3 py-2.5 text-center whitespace-nowrap" dir="ltr">
                            {renderEditableTextCell(emp.id, 'national_id', emp.national_id, {
                              dir: 'ltr',
                              className: 'tabular-nums',
                              placeholder: 'رقم الهوية',
                            })}
                          </td>
                        );

                      case 'job_title':
                        return (
                          <td key="job_title" className="px-3 py-2.5 text-center whitespace-nowrap">
                            {renderEditableTextCell(emp.id, 'job_title', emp.job_title, {
                              placeholder: 'المسمى الوظيفي',
                            })}
                          </td>
                        );

                      case 'city':
                        return (
                          <td key="city" className="px-3 py-2.5 whitespace-nowrap text-center">
                            {permissions.can_edit ? (
                              <InlineMultiSelectEditor
                                values={getEmployeeCities(emp)}
                                options={cityOptions}
                                onSave={(nextValues) => {
                                  const ordered = cityOptions.map((option) => option.value).filter((value) => nextValues.includes(value));
                                  return saveField(emp.id, 'city', ordered[0] ?? '', { cities: ordered });
                                }}
                                renderDisplay={() => <CityBadges cities={emp.cities} city={emp.city} />}
                              />
                            ) : (
                              <CityBadges cities={emp.cities} city={emp.city} />
                            )}
                          </td>
                        );

                      case 'phone':
                        return (
                          <td key="phone" className="px-3 py-2.5 text-center whitespace-nowrap" dir="ltr">
                            {renderEditableTextCell(emp.id, 'phone', emp.phone, {
                              dir: 'ltr',
                              placeholder: 'رقم الهاتف',
                            })}
                          </td>
                        );

                      case 'nationality': {
                        const nationalityEditorOptions = [
                          { value: '', label: 'بدون تحديد' },
                          ...buildTextOptions(uniqueVals.nationality, emp.nationality),
                        ];
                        return (
                          <td key="nationality" className="px-3 py-2.5 whitespace-nowrap text-center">
                            {permissions.can_edit ? (
                              <InlineSelectEditor
                                value={emp.nationality || ''}
                                options={nationalityEditorOptions}
                                onSave={(nextValue) => saveField(emp.id, 'nationality', nextValue)}
                                renderDisplay={() => renderTextValue(emp.nationality)}
                              />
                            ) : (
                              renderTextValue(emp.nationality)
                            )}
                          </td>
                        );
                      }

                      case 'platform_apps':
                        return (
                          <td key="platform_apps" className="px-3 py-2.5 whitespace-nowrap text-center">
                            {permissions.can_edit ? (
                              <PlatformAppsEditor
                                employeeId={emp.id}
                                employeeName={emp.name}
                                currentApps={emp.platform_apps || []}
                                availableApps={availableApps}
                                onSuccess={refetchEmployees}
                              />
                            ) : (
                              <div className="flex max-w-[200px] flex-wrap justify-center gap-1">
                                {emp.platform_apps?.length ? (
                                  emp.platform_apps.map(app => (
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
                                  emptyCell
                                )}
                              </div>
                            )}
                          </td>
                        );

                      case 'commercial_record':
                        return (
                          <td key="commercial_record" className="px-3 py-2.5 text-center whitespace-nowrap">
                            {renderEditableTextCell(emp.id, 'commercial_record', emp.commercial_record, {
                              placeholder: 'السجل التجاري',
                            })}
                          </td>
                        );

                      case 'residency_combined':
                        return (
                          <td key="residency_combined" className="px-3 py-2.5 whitespace-nowrap text-center">
                            {renderEditableDate(
                              emp.id,
                              'residency_expiry',
                              emp.residency_expiry,
                              emp.residency_expiry ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="text-xs text-muted-foreground">{formatDateCell(emp.residency_expiry)}</span>
                                  {res.days !== null && (
                                    <span className={`text-xs font-medium ${daysColor}`}>
                                      {res.days >= 0 ? `متبقي ${res.days} يوم` : `منتهية منذ ${Math.abs(res.days)} يوم`}
                                    </span>
                                  )}
                                </div>
                              ) : emptyCell
                            )}
                          </td>
                        );

                      case 'sponsorship_status':
                        return (
                          <td key="sponsorship_status" className="px-3 py-2.5 whitespace-nowrap text-center">
                            {permissions.can_edit ? (
                              <InlineSelectEditor
                                value={emp.sponsorship_status || 'not_sponsored'}
                                options={sponsorshipOptions.map((option) => ({ value: option.value, label: option.label }))}
                                onSave={(nextValue) => {
                                  if (nextValue === 'absconded' || nextValue === 'terminated') {
                                    setStatusDate(format(new Date(), 'yyyy-MM-dd'));
                                    setStatusDateDialog({
                                      emp,
                                      newStatus: nextValue,
                                      label: nextValue === 'absconded' ? 'هروب' : 'انتهاء الخدمة',
                                    });
                                    return Promise.resolve();
                                  }
                                  return saveField(emp.id, 'sponsorship_status', nextValue);
                                }}
                                renderDisplay={() => <SponsorBadge status={emp.sponsorship_status} />}
                              />
                            ) : (
                              <SponsorBadge status={emp.sponsorship_status} />
                            )}
                          </td>
                        );

                      case 'status':
                        return (
                          <td key="status" className="px-3 py-2.5 whitespace-nowrap text-center">
                            {permissions.can_edit ? (
                              <InlineSelectEditor
                                value={emp.status || 'active'}
                                options={statusOptions.map((option) => ({ value: option.value, label: option.label }))}
                                onSave={(nextValue) => saveField(emp.id, 'status', nextValue)}
                                renderDisplay={() => <StatusBadge status={emp.status} />}
                              />
                            ) : (
                              <StatusBadge status={emp.status} />
                            )}
                          </td>
                        );

                      case 'join_date':
                        return (
                          <td key="join_date" className="px-3 py-2.5 text-center whitespace-nowrap">
                            {renderEditableDate(
                              emp.id,
                              'join_date',
                              emp.join_date,
                              emp.join_date ? renderTextValue(formatDateCell(emp.join_date), { dir: 'ltr' }) : emptyCell
                            )}
                          </td>
                        );

                      case 'birth_date':
                        return (
                          <td key="birth_date" className="px-3 py-2.5 text-center whitespace-nowrap">
                            {renderEditableDate(
                              emp.id,
                              'birth_date',
                              emp.birth_date,
                              emp.birth_date ? renderTextValue(formatDateCell(emp.birth_date), { dir: 'ltr' }) : emptyCell
                            )}
                          </td>
                        );

                      case 'probation_end_date': {
                        const probDays = emp.probation_end_date ? differenceInDays(parseISO(emp.probation_end_date), new Date()) : null;
                        return (
                          <td key="probation_end_date" className="px-3 py-2.5 whitespace-nowrap text-center">
                            {renderEditableDate(
                              emp.id,
                              'probation_end_date',
                              emp.probation_end_date,
                              emp.probation_end_date ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="text-xs text-muted-foreground">{formatDateCell(emp.probation_end_date)}</span>
                                  {probDays !== null && (
                                    <span className={`text-xs font-medium ${probationColor(probDays)}`}>
                                      {probDays < 0 ? 'انتهت' : `متبقي ${probDays} يوم`}
                                    </span>
                                  )}
                                </div>
                              ) : emptyCell
                            )}
                          </td>
                        );
                      }

                      case 'health_insurance_expiry': {
                        const hiExpiry = emp.health_insurance_expiry;
                        const hiDays   = hiExpiry ? differenceInDays(parseISO(hiExpiry), new Date()) : null;
                        const hiColor = dayColorByThreshold(hiDays);
                        return (
                          <td key="health_insurance_expiry" className="px-3 py-2.5 whitespace-nowrap text-center">
                            {renderEditableDate(
                              emp.id,
                              'health_insurance_expiry',
                              hiExpiry,
                              hiExpiry ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className={`text-xs ${hiColor}`}>{formatDateCell(hiExpiry)}</span>
                                  {hiDays !== null && (
                                    <span className={`text-[10px] ${hiColor}`}>
                                      {hiDays < 0 ? `منتهي منذ ${Math.abs(hiDays)} يوم` : `متبقي ${hiDays} يوم`}
                                    </span>
                                  )}
                                </div>
                              ) : emptyCell
                            )}
                          </td>
                        );
                      }

                      case 'license_status':
                        return (
                          <td key="license_status" className="px-3 py-2.5 whitespace-nowrap text-center">
                            {permissions.can_edit ? (
                              <InlineSelectEditor
                                value={emp.license_status || 'no_license'}
                                options={licenseOptions.map((option) => ({ value: option.value, label: option.label }))}
                                onSave={(nextValue) => saveField(emp.id, 'license_status', nextValue)}
                                renderDisplay={() => <LicenseBadge status={emp.license_status} />}
                              />
                            ) : (
                              <LicenseBadge status={emp.license_status} />
                            )}
                          </td>
                        );

                      case 'license_expiry': {
                        const leExpiry = emp.license_expiry;
                        const leDays   = leExpiry ? differenceInDays(parseISO(leExpiry), new Date()) : null;
                        const leColor = dayColorByThreshold(leDays);
                        return (
                          <td key="license_expiry" className="px-3 py-2.5 whitespace-nowrap text-center">
                            {renderEditableDate(
                              emp.id,
                              'license_expiry',
                              leExpiry,
                              leExpiry ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className={`text-xs ${leColor}`}>{formatDateCell(leExpiry)}</span>
                                  {leDays !== null && (
                                    <span className={`text-[10px] ${leColor}`}>
                                      {leDays < 0 ? `منتهية منذ ${Math.abs(leDays)} يوم` : `متبقي ${leDays} يوم`}
                                    </span>
                                  )}
                                </div>
                              ) : emptyCell
                            )}
                          </td>
                        );
                      }

                      case 'bank_account_number':
                        return (
                          <td key="bank_account_number" className="px-3 py-2.5 text-center whitespace-nowrap" dir="ltr">
                            {renderEditableTextCell(emp.id, 'bank_account_number', emp.bank_account_number, {
                              dir: 'ltr',
                              className: 'tabular-nums',
                              placeholder: 'رقم الحساب البنكي',
                            })}
                          </td>
                        );

                      case 'email':
                        return (
                          <td key="email" className="px-3 py-2.5 text-center whitespace-nowrap" dir="ltr">
                            {permissions.can_edit ? (
                              <InlineInputEditor
                                value={emp.email || ''}
                                inputType="email"
                                dir="ltr"
                                placeholder="البريد الإلكتروني"
                                onSave={(nextValue) => saveField(emp.id, 'email', nextValue)}
                                renderDisplay={() => renderTextValue(emp.email, { dir: 'ltr' })}
                              />
                            ) : emp.email ? (
                              <a href={`mailto:${emp.email}`} className="text-primary hover:underline">{emp.email}</a>
                            ) : (
                              emptyCell
                            )}
                          </td>
                        );

                      case 'actions':
                        return (
                          <td key="actions" className="px-3 py-2.5 whitespace-nowrap text-center">
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
                        return <td key={col.key} className="px-3 py-2.5 text-center">{EMPTY_DATA_PLACEHOLDER}</td>;
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

