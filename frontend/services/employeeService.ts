/**
 * Employee Service — CRUD operations for the `employees` table.
 *
 * Key responsibilities:
 * - List/get/create/update/delete employees
 * - Manage employee ↔ app assignments (`employee_apps`)
 * - Upload/delete employee documents (private Supabase Storage bucket)
 * - Guard against deleting employees with operational records
 *
 * All queries go through Supabase client with RLS enforced.
 */
import { supabase } from '@services/supabase/client';
import { ServiceError, toServiceError } from '@services/serviceError';
import { createPagedResult } from '@shared/types/pagination';
import { sanitizeStoragePath } from '@shared/lib/storagePath';
import type { TablesInsert } from '@services/supabase/types';

export type EmployeeAppOption = {
  id: string;
  name: string;
  brand_color?: string | null;
  text_color?: string | null;
};

export type SalarySchemeOption = {
  id: string;
  name: string;
};

/** رسالة موحّدة عند محاولة حذف مندوب له سجل طلبات/عمليات (تُعرض في الواجهة). */
export const EMPLOYEE_DELETE_BLOCKED_MESSAGE =
  'لا يمكن حذف المندوب لوجود طلبات أو عمليات مسجلة باسمه. يمكنك فقط تغيير حالته إلى (إنهاء خدمات / هروب).';

const OPERATIONAL_TABLES_FOR_DELETE_GUARD = [
  'daily_orders',
  'advances',
  'attendance',
  'vehicle_assignments',
  'platform_accounts',
  'salary_records',
] as const;

async function employeeHasBlockingOperationalRecords(employeeId: string): Promise<boolean> {
  const checks = await Promise.all(
    OPERATIONAL_TABLES_FOR_DELETE_GUARD.map((table) =>
      supabase.from(table).select('id', { count: 'exact', head: true }).eq('employee_id', employeeId)
    )
  );
  for (let i = 0; i < checks.length; i++) {
    const res = checks[i];
    const table = OPERATIONAL_TABLES_FOR_DELETE_GUARD[i];
    if (res.error) throw toServiceError(res.error, `employeeService.blockingCheck.${table}`);
    if ((res.count ?? 0) > 0) return true;
  }
  return false;
}

export const employeeService = {
  async getAll() {
    const { data, error } = await supabase
      .from('employees')
      .select('*, employee_apps(app_id, apps(id, name, brand_color))')
      .order('name', { ascending: true });
    if (error) throw toServiceError(error, 'employeeService.getAll');
    
    // Transform employee_apps to platform_apps
    const transformed = (data ?? []).map(emp => ({
      ...emp,
      platform_apps: (emp.employee_apps || []).map((ea: { apps: { id: string; name: string; brand_color?: string } }) => ea.apps).filter(Boolean)
    }));
    
    return transformed;
  },

  /**
   * Server-side list for large volumes (pagination + filters).
   * Notes:
   * - Branch filter is derived from employees.city (makkah/jeddah).
   * - Search matches common identifiers (name, national_id, phone).
   */
  async getPaged(params: {
    page: number; // 1-based
    pageSize: number;
    filters?: {
      branch?: 'makkah' | 'jeddah';
      search?: string;
      status?: 'active' | 'inactive' | 'ended';
    };
  }) {
    const { page, pageSize } = params;
    const filters = params.filters ?? {};
    const fromIdx = (page - 1) * pageSize;
    const toIdx = fromIdx + pageSize - 1;

    let query = supabase
      .from('employees')
      .select(
        'id, name, national_id, phone, city, cities, commercial_record, status, sponsorship_status, license_status, residency_expiry, join_date, job_title',
        { count: 'exact' }
      )
      .order('name', { ascending: true })
      .range(fromIdx, toIdx);

    if (filters.branch) query = query.eq('city', filters.branch);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.search?.trim()) {
      const q = filters.search.trim();
      query = query.or(
        [
          `name.ilike.%${q}%`,
          `national_id.ilike.%${q}%`,
          `phone.ilike.%${q}%`,
        ].join(',')
      );
    }

    const { data, error, count } = await query;
    if (error) throw toServiceError(error, 'employeeService.getPaged');
    return createPagedResult({
      rows: data,
      total: count,
      page,
      pageSize,
    });
  },

  /** Export helper for large datasets (chunked). */
  async exportEmployees(params: {
    filters?: {
      branch?: 'makkah' | 'jeddah';
      search?: string;
      status?: 'active' | 'inactive' | 'ended';
    };
    chunkSize?: number;
    maxRows?: number;
  }) {
    const filters = params.filters ?? {};
    const chunkSize = params.chunkSize ?? 1000;
    const maxRows = params.maxRows ?? 50_000;

    const all: unknown[] = [];
    for (let page = 1; page <= Math.ceil(maxRows / chunkSize); page++) {
      const res = await employeeService.getPaged({ page, pageSize: chunkSize, filters });
      all.push(...res.rows);
      if (res.rows.length < chunkSize) break;
    }
    return all;
  },

  async updateCity(employeeId: string, city: string) {
    const { error } = await supabase
      .from('employees')
      .update({ city })
      .eq('id', employeeId);
    if (error) throw toServiceError(error, 'employeeService.updateCity');
  },

  async getById(employeeId: string) {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single();
    if (error) throw toServiceError(error, 'employeeService.getById');
    return data;
  },

  async findByNationalId(nationalId: string) {
    const { data, error } = await supabase
      .from('employees')
      .select('id')
      .eq('national_id', nationalId)
      .maybeSingle();
    if (error) throw toServiceError(error, 'employeeService.findByNationalId');
    return data;
  },

  async deleteById(employeeId: string) {
    if (await employeeHasBlockingOperationalRecords(employeeId)) {
      throw new ServiceError(EMPLOYEE_DELETE_BLOCKED_MESSAGE);
    }
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', employeeId);
    if (error) throw toServiceError(error, 'employeeService.deleteById');
  },

  async getActiveForSalaryContext() {
    // FIX: paginate to bypass Supabase's default 1000-row limit.
    // The salary page needs every employee — companies with 1000+ employees
    // were silently losing employees beyond row 1000.
    const PAGE_SIZE = 1000;
    type EmployeeSalaryContextRow = {
      id: string;
      name: string;
      job_title: string | null;
      national_id: string | null;
      salary_type: string | null;
      base_salary: number | null;
      iban: string | null;
      city: string | null;
      preferred_language: string | null;
      phone: string | null;
      sponsorship_status: string | null;
      probation_end_date: string | null;
      status: string | null;
    };
    const allRows: EmployeeSalaryContextRow[] = [];
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await supabase
        .from('employees')
        .select(
          'id, name, job_title, national_id, salary_type, base_salary, iban, city, preferred_language, phone, sponsorship_status, probation_end_date, status'
        )
        .order('name')
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw toServiceError(error, 'employeeService.getActiveForSalaryContext');
      const rows = (data ?? []) as EmployeeSalaryContextRow[];
      allRows.push(...rows);
      hasMore = rows.length === PAGE_SIZE;
      offset += PAGE_SIZE;
    }
    return allRows;
  },

  async getActiveSalarySchemes() {
    const { data, error } = await supabase
      .from('salary_schemes')
      .select('id, name')
      .eq('status', 'active')
      .order('name');
    if (error) throw toServiceError(error, 'employeeService.getActiveSalarySchemes');
    return (data || []) as SalarySchemeOption[];
  },

  async getActiveApps() {
    const { data, error } = await supabase
      .from('apps')
      .select('id, name, brand_color, text_color')
      .eq('is_active', true)
      .order('name');
    if (error) throw toServiceError(error, 'employeeService.getActiveApps');
    return (data || []) as EmployeeAppOption[];
  },

  async getEmployeeAssignedAppNames(employeeId: string) {
    const { data, error } = await supabase
      .from('employee_apps')
      .select('apps(name)')
      .eq('employee_id', employeeId);
    if (error) throw toServiceError(error, 'employeeService.getEmployeeAssignedAppNames');

    return (data || [])
      .map((row: { apps?: { name?: string | null } | null }) => row.apps?.name)
      .filter((name): name is string => Boolean(name));
  },

  async createEmployee(payload: Record<string, unknown>) {
    // Supabase generated types require exact shape — payload comes from dynamic forms
    // so we validate at the DB level (NOT NULL constraints + RLS) rather than compile-time.
    const { data, error } = await supabase
      .from('employees')
      .insert(payload as TablesInsert<'employees'>)
      .select()
      .single();
    if (error) throw toServiceError(error, 'employeeService.createEmployee');
    return data;
  },

  async updateEmployee(employeeId: string, payload: Record<string, unknown>) {
    const { error } = await supabase
      .from('employees')
      .update(payload as TablesInsert<'employees'>)
      .eq('id', employeeId);
    if (error) throw toServiceError(error, 'employeeService.updateEmployee');
  },

  async uploadEmployeeDocument(storagePath: string, file: File) {
    const safePath = sanitizeStoragePath(storagePath);
    if (!safePath) throw toServiceError(new Error('Invalid storage path'), 'employeeService.uploadEmployeeDocument.path');
    // Extra in-place guard to satisfy SAST checks before sink call.
    if (safePath.includes('..') || safePath.startsWith('/') || !/^[A-Za-z0-9/_\-.]+$/.test(safePath)) {
      throw toServiceError(new Error('Unsafe storage path'), 'employeeService.uploadEmployeeDocument.path');
    }
    const { data, error } = await supabase.storage
      .from('employee-documents')
      .upload(safePath, file, { upsert: true });
    if (error) throw toServiceError(error, 'employeeService.uploadEmployeeDocument');
    return data;
  },

  async updateEmployeeDocumentPaths(employeeId: string, updates: Record<string, string>) {
    const { error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', employeeId);
    if (error) throw toServiceError(error, 'employeeService.updateEmployeeDocumentPaths');
  },

  async deleteEmployeeDocuments(paths: string[]) {
    for (const rawPath of paths) {
      const safePath = sanitizeStoragePath(rawPath);
      if (!safePath) continue;
      if (safePath.includes('..') || safePath.startsWith('/') || !/^[A-Za-z0-9/_\-.]+$/.test(safePath)) {
        continue;
      }
      const { error } = await supabase.storage
        .from('employee-documents')
        .remove([safePath]);
      if (error) throw toServiceError(error, 'employeeService.deleteEmployeeDocuments');
    }
  },

  async replaceEmployeeApps(employeeId: string, appIds: string[]) {
    const { error: deleteError } = await supabase
      .from('employee_apps')
      .delete()
      .eq('employee_id', employeeId);
    if (deleteError) throw toServiceError(deleteError, 'employeeService.replaceEmployeeApps.delete');

    if (appIds.length === 0) return;

    const rows = appIds.map((appId) => ({
      employee_id: employeeId,
      app_id: appId,
      status: 'active',
    }));

    const { error: insertError } = await supabase
      .from('employee_apps')
      .insert(rows);
    if (insertError) throw toServiceError(insertError, 'employeeService.replaceEmployeeApps.insert');
  },

  async upsertEmployeeApp(employeeId: string, appId: string) {
    const { error } = await supabase
      .from('employee_apps')
      .upsert({ employee_id: employeeId, app_id: appId, status: 'active' }, { onConflict: 'employee_id,app_id' });
    if (error) throw toServiceError(error, 'employeeService.upsertEmployeeApp');
  },
};

export default employeeService;
