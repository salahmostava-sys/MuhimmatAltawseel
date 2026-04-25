import { supabase } from '@services/supabase/client';
import { throwIfError } from '@services/serviceError';
import { sanitizeLikeQuery } from '@shared/lib/security';

type EmployeeSearchRow = {
  id: string;
  name: string;
  name_en: string | null;
  phone: string | null;
  status: string;
};

type VehicleSearchRow = {
  id: string;
  plate_number: string;
  brand: string | null;
  model: string | null;
  status: string;
};

export const searchService = {
  searchEmployeesAndVehicles: async (query: string) => {
    const sq = sanitizeLikeQuery(query);
    if (!sq) {
      return { employees: [], vehicles: [], employeeError: null, vehicleError: null };
    }
    const safeTerm = `%${sq}%`;
    const [employeesRes, vehiclesRes] = await Promise.all([
      supabase
        .from('employees')
        .select('id, name, name_en, phone, status')
        .or(`name.ilike.${safeTerm},name_en.ilike.${safeTerm},phone.ilike.${safeTerm},national_id.ilike.${safeTerm}`)
        .eq('status', 'active')
        .limit(5),
      supabase
        .from('vehicles')
        .select('id, plate_number, brand, model, status')
        .ilike('plate_number', safeTerm)
        .limit(3),
    ]);
    throwIfError(employeesRes.error, 'searchService.searchEmployeesAndVehicles.employees');
    throwIfError(vehiclesRes.error, 'searchService.searchEmployeesAndVehicles.vehicles');
    return {
      employees: (employeesRes.data || []) as EmployeeSearchRow[],
      vehicles: (vehiclesRes.data || []) as VehicleSearchRow[],
      employeeError: null,
      vehicleError: null,
    };
  },
};
