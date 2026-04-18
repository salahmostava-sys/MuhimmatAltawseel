import React, { useMemo } from "react";
import { Eye, Edit, Trash2 } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { EmployeeTablePagination } from "@modules/employees/components/EmployeeTablePagination";
import { Checkbox } from "@shared/components/ui/checkbox";
import { Input } from "@shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";
import { differenceInDays, parseISO, format } from "date-fns";
import { todayISO, normalizeArabicDigits } from "@shared/lib/formatters";
import {
  CityBadges,
  LicenseBadge,
  SponsorBadge,
  StatusBadge,
  EmployeeAvatar,
  SortIcon,
  ColFilterPopover,
  SkeletonRow,
  TextFilterInput,
} from "@modules/employees/components/EmployeesViewParts";
import {
  cityLabel,
  DEFAULT_EMPLOYEE_CITY_OPTIONS,
} from "@modules/employees/model/employeeCity";
import { getEmployeeCities } from "@modules/employees/model/employeeUtils";
import {
  InlineInputEditor,
  InlineMultiSelectEditor,
  InlineSelectEditor,
} from "@modules/employees/components/EmployeeInlineEditors";
import { PlatformAppsEditor } from "@modules/employees/components/PlatformAppsEditor";
import { useActiveApps } from "@modules/employees/hooks/useActiveApps";
import { useCommercialRecords } from "@shared/hooks/useCommercialRecords";
import {
  calcResidency,
  dayColorByThreshold,
  probationColor,
  GRID_SKELETON_IDS,
  EMPTY_DATA_PLACEHOLDER,
  type Employee,
  type SortDir,
  type ColumnDef,
} from "@modules/employees/types/employee.types";

// Module-level constant — not recreated on every render
const DATE_FILTER_KEYS = new Set([
  "join_date",
  "birth_date",
  "probation_end_date",
  "residency_combined",
  "health_insurance_expiry",
  "license_expiry",
]);

const SPONSORSHIP_OPTIONS = [
  { value: "sponsored", label: "على الكفالة" },
  { value: "not_sponsored", label: "ليس على الكفالة" },
  { value: "absconded", label: "هروب" },
  { value: "terminated", label: "انتهاء الخدمة" },
] as const;

const LICENSE_OPTIONS = [
  { value: "has_license", label: "لديه رخصة" },
  { value: "no_license", label: "ليس لديه رخصة" },
  { value: "applied", label: "تم التقديم" },
] as const;

const STATUS_OPTIONS = [
  { value: "active", label: "نشط" },
  { value: "inactive", label: "غير نشط" },
  { value: "ended", label: "منتهي" },
] as const;

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
  saveField: (
    id: string,
    field: string,
    value: string,
    extraFields?: Record<string, unknown>,
  ) => Promise<void>;
  setSelectedEmployee: React.Dispatch<React.SetStateAction<string | null>>;
  setEditEmployee: React.Dispatch<React.SetStateAction<Employee | null>>;
  setShowAddModal: React.Dispatch<React.SetStateAction<boolean>>;
  setDeleteEmployee: React.Dispatch<React.SetStateAction<Employee | null>>;
  setStatusDateDialog: React.Dispatch<
    React.SetStateAction<{
      emp: Employee;
      newStatus: string;
      label: string;
    } | null>
  >;
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
  /** Real-time: map of rowId → user currently editing that row */
  presenceActiveRows?: Map<string, { userId: string; name: string; color: string }>;
  /** Called when user starts inline-editing a row */
  onRowEditStart?: (rowId: string) => void;
  /** Called when user finishes editing */
  onRowEditEnd?: () => void;
};

function EmployeeDetailedTableInner({
  activeCols,
  colFilters,
  sortField,
  sortDir,
  handleSort,
  paginated,
  filteredCount,
  loading,
  hasNoPaginatedRows,
  page,
  setPage,
  pageSize,
  setPageSize,
  totalPages,
  saveField,
  setSelectedEmployee,
  setEditEmployee,
  setShowAddModal,
  setDeleteEmployee,
  setStatusDateDialog,
  setStatusDate,
  permissions,
  uniqueVals,
  setColFilter,
  tableRef,
  refetchEmployees,
  presenceActiveRows,
  onRowEditStart,
  onRowEditEnd,
}: EmployeeDetailedTableProps) {
  const { data: availableApps = [] } = useActiveApps();
  const { recordNames: commercialRecordNames = [] } = useCommercialRecords();
  const emptyCell = (
    <span className="text-muted-foreground/40">{EMPTY_DATA_PLACEHOLDER}</span>
  );
  const cellText = (value?: string | null) => value || EMPTY_DATA_PLACEHOLDER;
  const cityOptions = useMemo(
    () =>
      Array.from(new Set([...DEFAULT_EMPLOYEE_CITY_OPTIONS, ...uniqueVals.city]))
        .map((value) => ({ value, label: cityLabel(value, value) })),
    [uniqueVals.city],
  );
  const buildTextOptions = (values: string[], currentValue?: string | null) =>
    Array.from(new Set([...values, currentValue || ""].filter(Boolean))).map(
      (value) => ({ value, label: value }),
    );
  const formatDateCell = (value?: string | null) =>
    value ? format(parseISO(value), "yyyy/MM/dd") : EMPTY_DATA_PLACEHOLDER;
  const getDateInputValue = (value?: string | null) =>
    value?.slice(0, 10) || "";
  const renderTextValue = (
    value?: string | null,
    options?: Readonly<{ dir?: "rtl" | "ltr" | "auto"; className?: string }>,
  ) => (
    <span
      className={`text-sm text-muted-foreground whitespace-nowrap ${options?.className || ""}`}
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
      dir?: "rtl" | "ltr" | "auto";
      className?: string;
      placeholder?: string;
      inputType?: "text" | "email";
    }>,
  ) => {
    const display = renderTextValue(value, options);
    if (!permissions.can_edit) return display;
    return (
      <InlineInputEditor
        value={value || ""}
        inputType={options?.inputType || "text"}
        dir={options?.dir || "auto"}
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
    display?: React.ReactNode,
  ) => {
    const displayNode =
      display ??
      (value
        ? renderTextValue(formatDateCell(value), { dir: "ltr" })
        : emptyCell);
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
              {activeCols.map((col) => {
                const isFilterable = !["seq", "actions"].includes(col.key);
                const isActive = !!colFilters[col.key];

                const filterContent = (() => {
                  if (!isFilterable) return null;
                  if (col.key === "city") {
                    const selected = colFilters.city
                      ? colFilters.city
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                      : [];
                    const toggleCity = (v: string) => {
                      const next = selected.includes(v)
                        ? selected.filter((x) => x !== v)
                        : [...selected, v];
                      setColFilter(
                        "city",
                        next.length ? [...next].sort().join(",") : "",
                      );
                    };
                    return (
                      <div className="space-y-2">
                        {cityOptions.map(({ value, label }) => (
                          <label
                            key={value}
                            className="flex items-center gap-2 text-xs cursor-pointer"
                          >
                            <Checkbox
                              checked={selected.includes(value)}
                              onCheckedChange={() => toggleCity(value)}
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    );
                  }
                  if (col.key === "platform_apps") {
                    const selected = colFilters.platform_apps
                      ? colFilters.platform_apps
                          .split(",")
                          .map((value) => value.trim())
                          .filter(Boolean)
                      : [];
                    const toggleApp = (appId: string) => {
                      const next = selected.includes(appId)
                        ? selected.filter((value) => value !== appId)
                        : [...selected, appId];
                      const ordered = availableApps
                        .map((app) => app.id)
                        .filter((appIdValue) => next.includes(appIdValue));
                      setColFilter("platform_apps", ordered.join(","));
                    };
                    if (availableApps.length === 0) {
                      return (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          لا توجد منصات متاحة
                        </p>
                      );
                    }
                    return (
                      <div className="space-y-2">
                        {availableApps.map((app) => (
                          <label
                            key={app.id}
                            className="flex items-center gap-2 text-xs cursor-pointer"
                          >
                            <Checkbox
                              checked={selected.includes(app.id)}
                              onCheckedChange={() => toggleApp(app.id)}
                            />
                            <span
                              className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium"
                              style={{
                                backgroundColor: app.brand_color || "#6366f1",
                                color: (() => {
                                  const hex = (app.brand_color || "#6366f1").replace('#', '');
                                  const r = parseInt(hex.substring(0, 2), 16);
                                  const g = parseInt(hex.substring(2, 4), 16);
                                  const b = parseInt(hex.substring(4, 6), 16);
                                  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#000000' : '#ffffff';
                                })(),
                              }}
                            >
                              {app.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    );
                  }
                  if (col.key === "sponsorship_status") {
                    const kafalaOptions = [
                      { v: "sponsored", l: "على الكفالة" },
                      { v: "not_sponsored", l: "ليس على الكفالة" },
                      { v: "absconded", l: "هروب" },
                      { v: "terminated", l: "انتهاء الخدمة" },
                    ] as const;
                    const selected = colFilters.sponsorship_status
                      ? colFilters.sponsorship_status
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                      : [];
                    const order = [
                      "sponsored",
                      "not_sponsored",
                      "absconded",
                      "terminated",
                    ] as const;
                    const toggleKafala = (v: string) => {
                      const next = selected.includes(v)
                        ? selected.filter((x) => x !== v)
                        : [...selected, v];
                      const sorted = order.filter((k) => next.includes(k));
                      setColFilter(
                        "sponsorship_status",
                        sorted.length ? sorted.join(",") : "",
                      );
                    };
                    return (
                      <div className="space-y-2">
                        {kafalaOptions.map(({ v, l }) => (
                          <label
                            key={v}
                            className="flex items-center gap-2 text-xs cursor-pointer"
                          >
                            <Checkbox
                              checked={selected.includes(v)}
                              onCheckedChange={() => toggleKafala(v)}
                            />
                            {l}
                          </label>
                        ))}
                      </div>
                    );
                  }
                  if (DATE_FILTER_KEYS.has(col.key)) {
                    // Range filter: "from..to" stored as single string
                    const rangeVal = colFilters[col.key] || "";
                    const [rangeFrom = "", rangeTo = ""] = rangeVal.includes("..") ? rangeVal.split("..") : [rangeVal, ""];
                    const updateRange = (from: string, to: string) => {
                      if (!from && !to) setColFilter(col.key, "");
                      else if (!to) setColFilter(col.key, from);
                      else setColFilter(col.key, `${from}..${to}`);
                    };
                    return (
                      <div className="space-y-1.5" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground w-6">من</span>
                          <Input
                            type="date"
                            className="h-7 text-xs px-1.5 flex-1"
                            value={rangeFrom}
                            onChange={(event) => updateRange(normalizeArabicDigits(event.target.value), rangeTo)}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground w-6">إلى</span>
                          <Input
                            type="date"
                            className="h-7 text-xs px-1.5 flex-1"
                            value={rangeTo}
                            onChange={(event) => updateRange(rangeFrom, normalizeArabicDigits(event.target.value))}
                          />
                        </div>
                      </div>
                    );
                  }
                  if (col.key === "license_status")
                    return (
                      <Select
                        value={colFilters.license_status || "all"}
                        onValueChange={(v) => setColFilter("license_status", v)}
                      >
                        <SelectTrigger className="h-7 text-xs w-full">
                          <SelectValue placeholder="الكل" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          <SelectItem value="has_license">لديه رخصة</SelectItem>
                          <SelectItem value="no_license">
                            ليس لديه رخصة
                          </SelectItem>
                          <SelectItem value="applied">تم التقديم</SelectItem>
                        </SelectContent>
                      </Select>
                    );
                  if (col.key === "status")
                    return (
                      <Select
                        value={colFilters.status || "all"}
                        onValueChange={(v) => setColFilter("status", v)}
                      >
                        <SelectTrigger className="h-7 text-xs w-full">
                          <SelectValue placeholder="الكل" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          {STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  if (col.key === "nationality")
                    return (
                      <Select
                        value={colFilters.nationality || "all"}
                        onValueChange={(v) => setColFilter("nationality", v)}
                      >
                        <SelectTrigger className="h-7 text-xs w-full">
                          <SelectValue placeholder="الكل" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          {uniqueVals.nationality.map((n) => (
                            <SelectItem key={n} value={n}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  if (col.key === "job_title")
                    return (
                      <Select
                        value={colFilters.job_title || "all"}
                        onValueChange={(v) => setColFilter("job_title", v)}
                      >
                        <SelectTrigger className="h-7 text-xs w-full">
                          <SelectValue placeholder="الكل" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          {uniqueVals.job_title.map((j) => (
                            <SelectItem key={j} value={j}>
                              {j}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  if (col.key === "commercial_record")
                    return (
                      <Select
                        value={colFilters.commercial_record || "all"}
                        onValueChange={(v) => setColFilter("commercial_record", v)}
                      >
                        <SelectTrigger className="h-7 text-xs w-full">
                          <SelectValue placeholder="الكل" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          {commercialRecordNames.map((cr) => (
                            <SelectItem key={cr} value={cr}>
                              {cr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  return (
                    <TextFilterInput
                      value={colFilters[col.key] || ""}
                      onChange={(v) => setColFilter(col.key, v)}
                    />
                  );
                })();

                return (
                  <th
                    key={col.key}
                    className={`ta-th select-none whitespace-nowrap text-center text-black ${col.key === "seq" ? "w-10 px-2" : ""} ${col.sortable ? "cursor-pointer hover:text-gray-800" : ""}`}
                    onClick={
                      col.sortable ? () => handleSort(col.key) : undefined
                    }
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>{col.label}</span>
                      {col.sortable && (
                        <SortIcon
                          field={col.key}
                          sortField={sortField}
                          sortDir={sortDir}
                        />
                      )}
                      {isFilterable && filterContent && (
                        <ColFilterPopover
                          colKey={col.key}
                          label={col.label}
                          active={isActive}
                          onClear={() => setColFilter(col.key, "")}
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
            {loading &&
              GRID_SKELETON_IDS.map((id) => (
                <SkeletonRow
                  key={`employees-grid-skeleton-${id}`}
                  cols={activeCols.length}
                />
              ))}
            {!loading && hasNoPaginatedRows && (
              <tr>
                <td colSpan={activeCols.length} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <span className="text-4xl">👥</span>
                    <p className="font-medium">لا توجد نتائج</p>
                    <p className="text-xs">
                      جرّب تغيير الفلاتر أو إضافة موظف جديد
                    </p>
                  </div>
                </td>
              </tr>
            )}
            {!loading &&
              !hasNoPaginatedRows &&
              paginated.map((emp, idx) => {
                const res = calcResidency(emp.residency_expiry);
                const daysColor = dayColorByThreshold(res.days);
                const globalIdx = (page - 1) * pageSize + idx + 1;
                const presenceUser = presenceActiveRows?.get(emp.id);
                return (
                  <tr
                    key={emp.id}
                    className={`border-b border-border/30 hover:bg-muted/20 transition-colors relative ${presenceUser ? 'ring-1 ring-inset' : ''}`}
                    style={presenceUser ? { '--ring-color': presenceUser.color, ringColor: presenceUser.color } as React.CSSProperties : undefined}
                    onFocusCapture={() => onRowEditStart?.(emp.id)}
                    onBlurCapture={(e) => {
                      // Only fire onRowEditEnd if focus left the row entirely
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        onRowEditEnd?.();
                      }
                    }}
                  >
                    {activeCols.map((col, colIdx) => {
                      // NOSONAR
                      switch (col.key) {
                        case "seq":
                          return (
                            <td
                              key="seq"
                              className="relative px-2 py-2 text-sm font-semibold text-muted-foreground text-center tabular-nums"
                            >
                              {globalIdx}
                              {colIdx === 0 && presenceUser && (
                                <span
                                  className="absolute -top-2.5 start-1 z-10 rounded px-1.5 py-0 text-[8px] font-medium text-white whitespace-nowrap shadow-sm"
                                  style={{ backgroundColor: presenceUser.color }}
                                >
                                  {presenceUser.name}
                                </span>
                              )}
                            </td>
                          );

                        case "name":
                          return (
                            <td
                              key="name"
                              className="px-3 py-2.5 whitespace-nowrap text-center align-middle"
                            >
                              <div className="flex items-center justify-center gap-2.5">
                                <EmployeeAvatar
                                  path={emp.personal_photo_url}
                                  name={emp.name}
                                />
                                <button
                                  onClick={() => setSelectedEmployee(emp.id)}
                                  className="text-sm font-semibold text-foreground transition-colors hover:text-primary text-center"
                                >
                                  {emp.name}
                                </button>
                              </div>
                            </td>
                          );

                        case "name_en":
                          return (
                            <td
                              key="name_en"
                              className="px-3 py-2.5 text-center whitespace-nowrap"
                              dir="ltr"
                            >
                              {renderEditableTextCell(
                                emp.id,
                                "name_en",
                                emp.name_en,
                                {
                                  dir: "ltr",
                                  placeholder: "الاسم بالإنجليزية",
                                },
                              )}
                            </td>
                          );

                        case "national_id":
                          return (
                            <td
                              key="national_id"
                              className="px-3 py-2.5 text-center whitespace-nowrap"
                              dir="ltr"
                            >
                              {renderTextValue(emp.national_id, { dir: "ltr", className: "tabular-nums" })}
                            </td>
                          );

                        case "job_title": {
                          const jobTitleOptions = [
                            { value: "", label: "بدون تحديد" },
                            ...buildTextOptions(
                              uniqueVals.job_title,
                              emp.job_title,
                            ),
                          ];
                          return (
                            <td
                              key="job_title"
                              className="px-3 py-2.5 whitespace-nowrap text-center"
                            >
                              {permissions.can_edit ? (
                                <InlineSelectEditor
                                  value={emp.job_title || ""}
                                  options={jobTitleOptions}
                                  onSave={(nextValue) =>
                                    saveField(emp.id, "job_title", nextValue)
                                  }
                                  renderDisplay={() =>
                                    renderTextValue(emp.job_title)
                                  }
                                />
                              ) : (
                                renderTextValue(emp.job_title)
                              )}
                            </td>
                          );
                        }

                        case "city":
                          return (
                            <td
                              key="city"
                              className="px-3 py-2.5 whitespace-nowrap text-center"
                            >
                              {permissions.can_edit ? (
                                <InlineMultiSelectEditor
                                  values={getEmployeeCities(emp)}
                                  options={cityOptions}
                                  onSave={(nextValues) => {
                                    const ordered = cityOptions
                                      .map((option) => option.value)
                                      .filter((value) =>
                                        nextValues.includes(value),
                                      );
                                    return saveField(
                                      emp.id,
                                      "city",
                                      ordered[0] ?? "",
                                      { cities: ordered },
                                    );
                                  }}
                                  renderDisplay={() => (
                                    <CityBadges
                                      cities={emp.cities}
                                      city={emp.city}
                                    />
                                  )}
                                />
                              ) : (
                                <CityBadges
                                  cities={emp.cities}
                                  city={emp.city}
                                />
                              )}
                            </td>
                          );

                        case "phone":
                          return (
                            <td
                              key="phone"
                              className="px-3 py-2.5 text-center whitespace-nowrap"
                              dir="ltr"
                            >
                              {renderEditableTextCell(
                                emp.id,
                                "phone",
                                emp.phone,
                                {
                                  dir: "ltr",
                                  placeholder: "رقم الهاتف",
                                },
                              )}
                            </td>
                          );

                        case "nationality": {
                          const nationalityEditorOptions = [
                            { value: "", label: "بدون تحديد" },
                            ...buildTextOptions(
                              uniqueVals.nationality,
                              emp.nationality,
                            ),
                          ];
                          return (
                            <td
                              key="nationality"
                              className="px-3 py-2.5 whitespace-nowrap text-center"
                            >
                              {permissions.can_edit ? (
                                <InlineSelectEditor
                                  value={emp.nationality || ""}
                                  options={nationalityEditorOptions}
                                  onSave={(nextValue) =>
                                    saveField(emp.id, "nationality", nextValue)
                                  }
                                  renderDisplay={() =>
                                    renderTextValue(emp.nationality)
                                  }
                                />
                              ) : (
                                renderTextValue(emp.nationality)
                              )}
                            </td>
                          );
                        }

                        case "platform_apps":
                          return (
                            <td
                              key="platform_apps"
                              className="px-3 py-2.5 whitespace-nowrap text-center"
                            >
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
                                  {emp.platform_apps?.length
                                    ? emp.platform_apps.map((app) => (
                                        <span
                                          key={app.id}
                                          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium"
                                          style={{
                                            backgroundColor:
                                              app.brand_color || "#6366f1",
                                            color: (() => {
                                              const hex = (app.brand_color || "#6366f1").replace('#', '');
                                              const r = parseInt(hex.substring(0, 2), 16);
                                              const g = parseInt(hex.substring(2, 4), 16);
                                              const b = parseInt(hex.substring(4, 6), 16);
                                              return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#000000' : '#ffffff';
                                            })(),
                                          }}
                                        >
                                          {app.name}
                                        </span>
                                      ))
                                    : emptyCell}
                                </div>
                              )}
                            </td>
                          );

                        case "commercial_record": {
                          const crOptions = [
                            { value: "", label: "بدون تحديد" },
                            ...buildTextOptions(
                              commercialRecordNames,
                              emp.commercial_record,
                            ),
                          ];
                          return (
                            <td
                              key="commercial_record"
                              className="px-3 py-2.5 whitespace-nowrap text-center"
                            >
                              {permissions.can_edit ? (
                                <InlineSelectEditor
                                  value={emp.commercial_record || ""}
                                  options={crOptions}
                                  onSave={(nextValue) =>
                                    saveField(
                                      emp.id,
                                      "commercial_record",
                                      nextValue,
                                    )
                                  }
                                  renderDisplay={() =>
                                    renderTextValue(emp.commercial_record)
                                  }
                                />
                              ) : (
                                renderTextValue(emp.commercial_record)
                              )}
                            </td>
                          );
                        }

                        case "residency_combined":
                          return (
                            <td
                              key="residency_combined"
                              className="px-3 py-2.5 whitespace-nowrap text-center"
                            >
                              {renderEditableDate(
                                emp.id,
                                "residency_expiry",
                                emp.residency_expiry,
                                emp.residency_expiry ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-xs text-muted-foreground">
                                      {formatDateCell(emp.residency_expiry)}
                                    </span>
                                    {res.days !== null && (
                                      <span
                                        className={`text-xs font-medium ${daysColor}`}
                                      >
                                        {res.days >= 0
                                          ? `متبقي ${res.days} يوم`
                                          : `منتهية منذ ${Math.abs(res.days)} يوم`}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  emptyCell
                                ),
                              )}
                            </td>
                          );

                        case "sponsorship_status":
                          return (
                            <td
                              key="sponsorship_status"
                              className="px-3 py-2.5 whitespace-nowrap text-center"
                            >
                              {permissions.can_edit ? (
                                <InlineSelectEditor
                                  value={
                                    emp.sponsorship_status || "not_sponsored"
                                  }
                                  options={SPONSORSHIP_OPTIONS.map((option) => ({
                                    value: option.value,
                                    label: option.label,
                                  }))}
                                  onSave={(nextValue) => {
                                    if (
                                      nextValue === "absconded" ||
                                      nextValue === "terminated"
                                    ) {
                                      setStatusDate(
                                        todayISO(),
                                      );
                                      setStatusDateDialog({
                                        emp,
                                        newStatus: nextValue,
                                        label:
                                          nextValue === "absconded"
                                            ? "هروب"
                                            : "انتهاء الخدمة",
                                      });
                                      return Promise.resolve();
                                    }
                                    return saveField(
                                      emp.id,
                                      "sponsorship_status",
                                      nextValue,
                                    );
                                  }}
                                  renderDisplay={() => (
                                    <SponsorBadge
                                      status={emp.sponsorship_status}
                                    />
                                  )}
                                />
                              ) : (
                                <SponsorBadge status={emp.sponsorship_status} />
                              )}
                            </td>
                          );

                        case "status":
                          return (
                            <td
                              key="status"
                              className="px-3 py-2.5 whitespace-nowrap text-center"
                            >
                              {permissions.can_edit ? (
                                <InlineSelectEditor
                                  value={emp.status || "active"}
                                  options={STATUS_OPTIONS.map((option) => ({
                                    value: option.value,
                                    label: option.label,
                                  }))}
                                  onSave={(nextValue) =>
                                    saveField(emp.id, "status", nextValue)
                                  }
                                  renderDisplay={() => (
                                    <StatusBadge status={emp.status} />
                                  )}
                                />
                              ) : (
                                <StatusBadge status={emp.status} />
                              )}
                            </td>
                          );

                        case "join_date":
                          return (
                            <td
                              key="join_date"
                              className="px-3 py-2.5 text-center whitespace-nowrap"
                            >
                              {renderEditableDate(
                                emp.id,
                                "join_date",
                                emp.join_date,
                                emp.join_date
                                  ? renderTextValue(
                                      formatDateCell(emp.join_date),
                                      { dir: "ltr" },
                                    )
                                  : emptyCell,
                              )}
                            </td>
                          );

                        case "birth_date":
                          return (
                            <td
                              key="birth_date"
                              className="px-3 py-2.5 text-center whitespace-nowrap"
                            >
                              {renderEditableDate(
                                emp.id,
                                "birth_date",
                                emp.birth_date,
                                emp.birth_date
                                  ? renderTextValue(
                                      formatDateCell(emp.birth_date),
                                      { dir: "ltr" },
                                    )
                                  : emptyCell,
                              )}
                            </td>
                          );

                        case "probation_end_date": {
                          const probDays = emp.probation_end_date
                            ? differenceInDays(
                                parseISO(emp.probation_end_date),
                                new Date(),
                              )
                            : null;
                          return (
                            <td
                              key="probation_end_date"
                              className="px-3 py-2.5 whitespace-nowrap text-center"
                            >
                              {renderEditableDate(
                                emp.id,
                                "probation_end_date",
                                emp.probation_end_date,
                                emp.probation_end_date ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-xs text-muted-foreground">
                                      {formatDateCell(emp.probation_end_date)}
                                    </span>
                                    {probDays !== null && (
                                      <span
                                        className={`text-xs font-medium ${probationColor(probDays)}`}
                                      >
                                        {probDays < 0
                                          ? "انتهت"
                                          : `متبقي ${probDays} يوم`}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  emptyCell
                                ),
                              )}
                            </td>
                          );
                        }

                        case "health_insurance_expiry": {
                          const hiExpiry = emp.health_insurance_expiry;
                          const hiDays = hiExpiry
                            ? differenceInDays(parseISO(hiExpiry), new Date())
                            : null;
                          const hiColor = dayColorByThreshold(hiDays);
                          return (
                            <td
                              key="health_insurance_expiry"
                              className="px-3 py-2.5 whitespace-nowrap text-center"
                            >
                              {renderEditableDate(
                                emp.id,
                                "health_insurance_expiry",
                                hiExpiry,
                                hiExpiry ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className={`text-xs ${hiColor}`}>
                                      {formatDateCell(hiExpiry)}
                                    </span>
                                    {hiDays !== null && (
                                      <span
                                        className={`text-[10px] ${hiColor}`}
                                      >
                                        {hiDays < 0
                                          ? `منتهي منذ ${Math.abs(hiDays)} يوم`
                                          : `متبقي ${hiDays} يوم`}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  emptyCell
                                ),
                              )}
                            </td>
                          );
                        }

                        case "license_status":
                          return (
                            <td
                              key="license_status"
                              className="px-3 py-2.5 whitespace-nowrap text-center"
                            >
                              {permissions.can_edit ? (
                                <InlineSelectEditor
                                  value={emp.license_status || "no_license"}
                                  options={LICENSE_OPTIONS.map((option) => ({
                                    value: option.value,
                                    label: option.label,
                                  }))}
                                  onSave={(nextValue) =>
                                    saveField(
                                      emp.id,
                                      "license_status",
                                      nextValue,
                                    )
                                  }
                                  renderDisplay={() => (
                                    <LicenseBadge status={emp.license_status} />
                                  )}
                                />
                              ) : (
                                <LicenseBadge status={emp.license_status} />
                              )}
                            </td>
                          );

                        case "license_expiry": {
                          const leExpiry = emp.license_expiry;
                          const leDays = leExpiry
                            ? differenceInDays(parseISO(leExpiry), new Date())
                            : null;
                          const leColor = dayColorByThreshold(leDays);
                          return (
                            <td
                              key="license_expiry"
                              className="px-3 py-2.5 whitespace-nowrap text-center"
                            >
                              {renderEditableDate(
                                emp.id,
                                "license_expiry",
                                leExpiry,
                                leExpiry ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className={`text-xs ${leColor}`}>
                                      {formatDateCell(leExpiry)}
                                    </span>
                                    {leDays !== null && (
                                      <span
                                        className={`text-[10px] ${leColor}`}
                                      >
                                        {leDays < 0
                                          ? `منتهية منذ ${Math.abs(leDays)} يوم`
                                          : `متبقي ${leDays} يوم`}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  emptyCell
                                ),
                              )}
                            </td>
                          );
                        }

                        case "bank_account_number":
                          return (
                            <td
                              key="bank_account_number"
                              className="px-3 py-2.5 text-center whitespace-nowrap"
                              dir="ltr"
                            >
                              {renderTextValue(emp.bank_account_number, { dir: "ltr", className: "tabular-nums" })}
                            </td>
                          );

                        case "email":
                          return (
                            <td
                              key="email"
                              className="px-3 py-2.5 text-center whitespace-nowrap"
                              dir="ltr"
                            >
                              {emp.email ? (
                                <a
                                  href={`mailto:${emp.email}`}
                                  className="text-primary hover:underline text-sm"
                                >
                                  {emp.email}
                                </a>
                              ) : (
                                emptyCell
                              )}
                            </td>
                          );

                        case "actions":
                          return (
                            <td
                              key="actions"
                              className="px-3 py-2.5 whitespace-nowrap text-center"
                            >
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-muted-foreground"
                                  >
                                    ⋮
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => setSelectedEmployee(emp.id)}
                                  >
                                    <Eye size={14} className="me-2" /> عرض الملف
                                  </DropdownMenuItem>
                                  {permissions.can_edit && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setEditEmployee(emp);
                                        setShowAddModal(true);
                                      }}
                                    >
                                      <Edit size={14} className="me-2" /> تعديل
                                      البيانات
                                    </DropdownMenuItem>
                                  )}
                                  {permissions.can_delete && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => setDeleteEmployee(emp)}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 size={14} className="me-2" />{" "}
                                        حذف الموظف
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          );

                        default:
                          return (
                            <td
                              key={(col as { key: string }).key}
                              className="px-3 py-2.5 text-center"
                            >
                              {EMPTY_DATA_PLACEHOLDER}
                            </td>
                          );
                      }
                    })}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {!loading && (
        <EmployeeTablePagination
          page={page}
          setPage={setPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
          totalPages={totalPages}
          filteredCount={filteredCount}
        />
      )}
    </div>
  );
}

export const EmployeeDetailedTable = React.memo(EmployeeDetailedTableInner);
