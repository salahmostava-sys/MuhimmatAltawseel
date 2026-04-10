// Regenerate from DB (authoritative): from repo root, with Supabase CLI + Docker:
//   npx supabase gen types typescript --local -s public > frontend/services/supabase/types.ts
// Or linked project (requires access): npx supabase gen types typescript --project-id <ref> -s public > ...
// Last aligned manually to single-org migrations (no public.company_id columns).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_assignments: {
        Row: {
          account_id: string
          created_at: string
          created_by: string | null
          employee_id: string
          end_date: string | null
          id: string
          month_year: string
          notes: string | null
          start_date: string
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by?: string | null
          employee_id: string
          end_date?: string | null
          id?: string
          month_year: string
          notes?: string | null
          start_date?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string
          end_date?: string | null
          id?: string
          month_year?: string
          notes?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_assignments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "platform_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      advance_installments: {
        Row: {
          advance_id: string
          amount: number
          deducted_at: string | null
          id: string
          month_year: string
          notes: string | null
          status: Database["public"]["Enums"]["installment_status"]
        }
        Insert: {
          advance_id: string
          amount: number
          deducted_at?: string | null
          id?: string
          month_year: string
          notes?: string | null
          status?: Database["public"]["Enums"]["installment_status"]
        }
        Update: {
          advance_id?: string
          amount?: number
          deducted_at?: string | null
          id?: string
          month_year?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["installment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "advance_installments_advance_id_fkey"
            columns: ["advance_id"]
            isOneToOne: false
            referencedRelation: "advances"
            referencedColumns: ["id"]
          },
        ]
      }
      advances: {
        Row: {
          amount: number
          approved_by: string | null
          created_at: string
          disbursement_date: string
          employee_id: string
          first_deduction_month: string
          id: string
          is_written_off: boolean
          monthly_amount: number
          note: string | null
          remaining_amount: number | null
          status: Database["public"]["Enums"]["advance_status"]
          total_installments: number
          updated_at: string
          written_off_at: string | null
          written_off_reason: string | null
        }
        Insert: {
          amount: number
          approved_by?: string | null
          created_at?: string
          disbursement_date?: string
          employee_id: string
          first_deduction_month: string
          id?: string
          is_written_off?: boolean
          monthly_amount: number
          note?: string | null
          remaining_amount?: number | null
          status?: Database["public"]["Enums"]["advance_status"]
          total_installments?: number
          updated_at?: string
          written_off_at?: string | null
          written_off_reason?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          created_at?: string
          disbursement_date?: string
          employee_id?: string
          first_deduction_month?: string
          id?: string
          is_written_off?: boolean
          monthly_amount?: number
          note?: string | null
          remaining_amount?: number | null
          status?: Database["public"]["Enums"]["advance_status"]
          total_installments?: number
          updated_at?: string
          written_off_at?: string | null
          written_off_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          created_at: string
          due_date: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_resolved: boolean
          message: string | null
          resolved_by: string | null
          severity: string | null
          type: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_resolved?: boolean
          message?: string | null
          resolved_by?: string | null
          severity?: string | null
          type: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_resolved?: boolean
          message?: string | null
          resolved_by?: string | null
          severity?: string | null
          type?: string
        }
        Relationships: []
      }
      app_targets: {
        Row: {
          app_id: string
          created_at: string
          id: string
          month_year: string
          target_orders: number
          updated_at: string
        }
        Insert: {
          app_id: string
          created_at?: string
          id?: string
          month_year: string
          target_orders?: number
          updated_at?: string
        }
        Update: {
          app_id?: string
          created_at?: string
          id?: string
          month_year?: string
          target_orders?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_targets_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      apps: {
        Row: {
          brand_color: string
          created_at: string
          custom_columns: Json | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          name_en: string | null
          scheme_id: string | null
          text_color: string
          work_type: string | null
        }
        Insert: {
          brand_color?: string
          created_at?: string
          custom_columns?: Json | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          name_en?: string | null
          scheme_id?: string | null
          text_color?: string
          work_type?: string | null
        }
        Update: {
          brand_color?: string
          created_at?: string
          custom_columns?: Json | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          name_en?: string | null
          scheme_id?: string | null
          text_color?: string
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apps_scheme_id_fkey"
            columns: ["scheme_id"]
            isOneToOne: false
            referencedRelation: "salary_schemes"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          created_by: string | null
          date: string
          employee_id: string
          id: string
          note: string | null
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          employee_id: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          employee_id?: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          new_value: Json | null
          old_value: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      daily_orders: {
        Row: {
          app_id: string
          created_at: string
          created_by: string | null
          date: string
          employee_id: string
          id: string
          orders_count: number
          updated_at: string
        }
        Insert: {
          app_id: string
          created_at?: string
          created_by?: string | null
          date: string
          employee_id: string
          id?: string
          orders_count?: number
          updated_at?: string
        }
        Update: {
          app_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          employee_id?: string
          id?: string
          orders_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_orders_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          manager_id: string | null
          name: string
          name_en: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name: string
          name_en?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          name_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      employee_apps: {
        Row: {
          app_id: string
          employee_id: string
          id: string
          joined_date: string | null
          status: string
          username: string | null
        }
        Insert: {
          app_id: string
          employee_id: string
          id?: string
          joined_date?: string | null
          status?: string
          username?: string | null
        }
        Update: {
          app_id?: string
          employee_id?: string
          id?: string
          joined_date?: string | null
          status?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_apps_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_apps_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_scheme: {
        Row: {
          assigned_by: string | null
          assigned_date: string
          employee_id: string
          id: string
          scheme_id: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_date?: string
          employee_id: string
          id?: string
          scheme_id: string
        }
        Update: {
          assigned_by?: string | null
          assigned_date?: string
          employee_id?: string
          id?: string
          scheme_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_scheme_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_scheme_scheme_id_fkey"
            columns: ["scheme_id"]
            isOneToOne: false
            referencedRelation: "salary_schemes"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_tiers: {
        Row: {
          app_ids: Json
          created_at: string
          delivery_status: string
          employee_id: string
          id: string
          notes: string | null
          package_type: string
          renewal_date: string
          sim_number: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          app_ids?: Json
          created_at?: string
          delivery_status?: string
          employee_id: string
          id?: string
          notes?: string | null
          package_type?: string
          renewal_date: string
          sim_number?: string | null
          start_date?: string
          updated_at?: string
        }
        Update: {
          app_ids?: Json
          created_at?: string
          delivery_status?: string
          employee_id?: string
          id?: string
          notes?: string | null
          package_type?: string
          renewal_date?: string
          sim_number?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_tiers_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_records: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          allowances: Json | null
          bank_account_number: string | null
          base_salary: number
          birth_date: string | null
          cities: string[] | null
          city: string | null
          commercial_record: string | null
          created_at: string
          department_id: string | null
          dob: string | null
          email: string | null
          health_insurance_expiry: string | null
          iban: string | null
          id: string
          id_photo_url: string | null
          iqama_photo_url: string | null
          is_sponsored: boolean
          job_title: string | null
          join_date: string | null
          license_expiry: string | null
          license_has: boolean
          license_photo_url: string | null
          license_status:
            | Database["public"]["Enums"]["license_status_enum"]
            | null
          name: string
          name_en: string | null
          national_id: string | null
          nationality: string | null
          personal_photo_url: string | null
          phone: string | null
          position_id: string | null
          preferred_language: string
          probation_end_date: string | null
          residency_expiry: string | null
          salary_type: Database["public"]["Enums"]["salary_type"]
          sponsorship_status:
            | Database["public"]["Enums"]["sponsorship_status_enum"]
            | null
          status: Database["public"]["Enums"]["employee_status"]
          tier_id: string | null
          updated_at: string
        }
        Insert: {
          allowances?: Json | null
          bank_account_number?: string | null
          base_salary?: number
          birth_date?: string | null
          cities?: string[] | null
          city?: string | null
          commercial_record?: string | null
          created_at?: string
          department_id?: string | null
          dob?: string | null
          email?: string | null
          health_insurance_expiry?: string | null
          iban?: string | null
          id?: string
          id_photo_url?: string | null
          iqama_photo_url?: string | null
          is_sponsored?: boolean
          job_title?: string | null
          join_date?: string | null
          license_expiry?: string | null
          license_has?: boolean
          license_photo_url?: string | null
          license_status?:
            | Database["public"]["Enums"]["license_status_enum"]
            | null
          name: string
          name_en?: string | null
          national_id?: string | null
          nationality?: string | null
          personal_photo_url?: string | null
          phone?: string | null
          position_id?: string | null
          preferred_language?: string
          probation_end_date?: string | null
          residency_expiry?: string | null
          salary_type?: Database["public"]["Enums"]["salary_type"]
          sponsorship_status?:
            | Database["public"]["Enums"]["sponsorship_status_enum"]
            | null
          status?: Database["public"]["Enums"]["employee_status"]
          tier_id?: string | null
          updated_at?: string
        }
        Update: {
          allowances?: Json | null
          bank_account_number?: string | null
          base_salary?: number
          birth_date?: string | null
          cities?: string[] | null
          city?: string | null
          commercial_record?: string | null
          created_at?: string
          department_id?: string | null
          dob?: string | null
          email?: string | null
          health_insurance_expiry?: string | null
          iban?: string | null
          id?: string
          id_photo_url?: string | null
          iqama_photo_url?: string | null
          is_sponsored?: boolean
          job_title?: string | null
          join_date?: string | null
          license_expiry?: string | null
          license_has?: boolean
          license_photo_url?: string | null
          license_status?:
            | Database["public"]["Enums"]["license_status_enum"]
            | null
          name?: string
          name_en?: string | null
          national_id?: string | null
          nationality?: string | null
          personal_photo_url?: string | null
          phone?: string | null
          position_id?: string | null
          preferred_language?: string
          probation_end_date?: string | null
          residency_expiry?: string | null
          salary_type?: Database["public"]["Enums"]["salary_type"]
          sponsorship_status?:
            | Database["public"]["Enums"]["sponsorship_status_enum"]
            | null
          status?: Database["public"]["Enums"]["employee_status"]
          tier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      external_deductions: {
        Row: {
          amount: number
          apply_month: string
          approval_status: Database["public"]["Enums"]["approval_status"]
          approved_by: string | null
          created_at: string
          employee_id: string
          id: string
          incident_date: string | null
          linked_advance_id: string | null
          note: string | null
          source_app_id: string | null
          type: Database["public"]["Enums"]["deduction_type"]
        }
        Insert: {
          amount: number
          apply_month: string
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_by?: string | null
          created_at?: string
          employee_id: string
          id?: string
          incident_date?: string | null
          linked_advance_id?: string | null
          note?: string | null
          source_app_id?: string | null
          type?: Database["public"]["Enums"]["deduction_type"]
        }
        Update: {
          amount?: number
          apply_month?: string
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_by?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          incident_date?: string | null
          linked_advance_id?: string | null
          note?: string | null
          source_app_id?: string | null
          type?: Database["public"]["Enums"]["deduction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "external_deductions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_deductions_linked_advance_id_fkey"
            columns: ["linked_advance_id"]
            isOneToOne: false
            referencedRelation: "advances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_deductions_source_app_id_fkey"
            columns: ["source_app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      locked_months: {
        Row: {
          id: string
          locked_at: string
          locked_by: string | null
          month_year: string
        }
        Insert: {
          id?: string
          locked_at?: string
          locked_by?: string | null
          month_year: string
        }
        Update: {
          id?: string
          locked_at?: string
          locked_by?: string | null
          month_year?: string
        }
        Relationships: [
          {
            foreignKeyName: "locked_months_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_logs: {
        Row: {
          cost: number | null
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          id: string
          paid_by: string | null
          status: string | null
          type: Database["public"]["Enums"]["maintenance_type"]
          vehicle_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          paid_by?: string | null
          status?: string | null
          type?: Database["public"]["Enums"]["maintenance_type"]
          vehicle_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          paid_by?: string | null
          status?: string | null
          type?: Database["public"]["Enums"]["maintenance_type"]
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      pl_records: {
        Row: {
          cost_deductions: number
          cost_other: number
          cost_salaries: number
          cost_vehicles: number
          created_at: string
          created_by: string | null
          id: string
          month_year: string
          notes: string | null
          revenue_other: number
          revenue_riders: number
        }
        Insert: {
          cost_deductions?: number
          cost_other?: number
          cost_salaries?: number
          cost_vehicles?: number
          created_at?: string
          created_by?: string | null
          id?: string
          month_year: string
          notes?: string | null
          revenue_other?: number
          revenue_riders?: number
        }
        Update: {
          cost_deductions?: number
          cost_other?: number
          cost_salaries?: number
          cost_vehicles?: number
          created_at?: string
          created_by?: string | null
          id?: string
          month_year?: string
          notes?: string | null
          revenue_other?: number
          revenue_riders?: number
        }
        Relationships: []
      }
      platform_accounts: {
        Row: {
          account_id_on_platform: string | null
          account_username: string
          app_id: string
          created_at: string
          employee_id: string | null
          id: string
          iqama_expiry_date: string | null
          iqama_number: string | null
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id_on_platform?: string | null
          account_username: string
          app_id: string
          created_at?: string
          employee_id?: string | null
          id?: string
          iqama_expiry_date?: string | null
          iqama_number?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_id_on_platform?: string | null
          account_username?: string
          app_id?: string
          created_at?: string
          employee_id?: string | null
          id?: string
          iqama_expiry_date?: string | null
          iqama_number?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_accounts_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_accounts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          created_at: string
          department_id: string | null
          description: string | null
          id: string
          name: string
          name_en: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          name: string
          name_en?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          name?: string
          name_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string | null
          name_en: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          is_active?: boolean
          name?: string | null
          name_en?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          name_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      salary_records: {
        Row: {
          advance_deduction: number
          allowances: number
          approved_at: string | null
          approved_by: string | null
          attendance_deduction: number
          base_salary: number
          created_at: string
          employee_id: string
          external_deduction: number
          id: string
          is_approved: boolean
          manual_deduction: number
          manual_deduction_note: string | null
          month_year: string
          net_salary: number
          payment_method: string
          sheet_snapshot: Json | null
          updated_at: string
        }
        Insert: {
          advance_deduction?: number
          allowances?: number
          approved_at?: string | null
          approved_by?: string | null
          attendance_deduction?: number
          base_salary?: number
          created_at?: string
          employee_id: string
          external_deduction?: number
          id?: string
          is_approved?: boolean
          manual_deduction?: number
          manual_deduction_note?: string | null
          month_year: string
          net_salary?: number
          payment_method?: string
          sheet_snapshot?: Json | null
          updated_at?: string
        }
        Update: {
          advance_deduction?: number
          allowances?: number
          approved_at?: string | null
          approved_by?: string | null
          attendance_deduction?: number
          base_salary?: number
          created_at?: string
          employee_id?: string
          external_deduction?: number
          id?: string
          is_approved?: boolean
          manual_deduction?: number
          manual_deduction_note?: string | null
          month_year?: string
          net_salary?: number
          payment_method?: string
          sheet_snapshot?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_scheme_tiers: {
        Row: {
          created_at: string
          from_orders: number
          id: string
          incremental_price: number | null
          incremental_threshold: number | null
          price_per_order: number
          scheme_id: string
          tier_order: number
          tier_type: string
          to_orders: number | null
        }
        Insert: {
          created_at?: string
          from_orders?: number
          id?: string
          incremental_price?: number | null
          incremental_threshold?: number | null
          price_per_order: number
          scheme_id: string
          tier_order?: number
          tier_type?: string
          to_orders?: number | null
        }
        Update: {
          created_at?: string
          from_orders?: number
          id?: string
          incremental_price?: number | null
          incremental_threshold?: number | null
          price_per_order?: number
          scheme_id?: string
          tier_order?: number
          tier_type?: string
          to_orders?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_scheme_tiers_scheme_id_fkey"
            columns: ["scheme_id"]
            isOneToOne: false
            referencedRelation: "salary_schemes"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_schemes: {
        Row: {
          created_at: string
          id: string
          monthly_amount: number | null
          name: string
          name_en: string | null
          scheme_type: string
          status: Database["public"]["Enums"]["scheme_status"]
          target_bonus: number | null
          target_orders: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          monthly_amount?: number | null
          name: string
          name_en?: string | null
          scheme_type?: string
          status?: Database["public"]["Enums"]["scheme_status"]
          target_bonus?: number | null
          target_orders?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          monthly_amount?: number | null
          name?: string
          name_en?: string | null
          scheme_type?: string
          status?: Database["public"]["Enums"]["scheme_status"]
          target_bonus?: number | null
          target_orders?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      scheme_month_snapshots: {
        Row: {
          created_at: string
          id: string
          month_year: string
          scheme_id: string
          snapshot: Json
        }
        Insert: {
          created_at?: string
          id?: string
          month_year: string
          scheme_id: string
          snapshot?: Json
        }
        Update: {
          created_at?: string
          id?: string
          month_year?: string
          scheme_id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "scheme_month_snapshots_scheme_id_fkey"
            columns: ["scheme_id"]
            isOneToOne: false
            referencedRelation: "salary_schemes"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          default_language: string
          id: string
          logo_url: string | null
          project_name_ar: string
          project_name_en: string
          project_subtitle_ar: string
          project_subtitle_en: string
          theme: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_language?: string
          id?: string
          logo_url?: string | null
          project_name_ar?: string
          project_name_en?: string
          project_subtitle_ar?: string
          project_subtitle_en?: string
          theme?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_language?: string
          id?: string
          logo_url?: string | null
          project_name_ar?: string
          project_name_en?: string
          project_subtitle_ar?: string
          project_subtitle_en?: string
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      trade_registers: {
        Row: {
          cr_number: string | null
          created_at: string
          id: string
          name: string
          name_en: string | null
          notes: string | null
        }
        Insert: {
          cr_number?: string | null
          created_at?: string
          id?: string
          name: string
          name_en?: string | null
          notes?: string | null
        }
        Update: {
          cr_number?: string | null
          created_at?: string
          id?: string
          name?: string
          name_en?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          id: string
          permission_key: string
          user_id: string
        }
        Insert: {
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          id?: string
          permission_key: string
          user_id: string
        }
        Update: {
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          id?: string
          permission_key?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_assignments: {
        Row: {
          created_at: string
          created_by: string | null
          employee_id: string
          end_date: string | null
          id: string
          notes: string | null
          reason: string | null
          returned_at: string | null
          start_at: string | null
          start_date: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employee_id: string
          end_date?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          returned_at?: string | null
          start_at?: string | null
          start_date?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employee_id?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          returned_at?: string | null
          start_at?: string | null
          start_date?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_mileage: {
        Row: {
          cost_per_km: number | null
          created_at: string
          employee_id: string
          fuel_cost: number
          id: string
          km_total: number
          month_year: string
          notes: string | null
        }
        Insert: {
          cost_per_km?: number | null
          created_at?: string
          employee_id: string
          fuel_cost?: number
          id?: string
          km_total?: number
          month_year: string
          notes?: string | null
        }
        Update: {
          cost_per_km?: number | null
          created_at?: string
          employee_id?: string
          fuel_cost?: number
          id?: string
          km_total?: number
          month_year?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_mileage_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_mileage_daily: {
        Row: {
          created_at: string
          date: string
          employee_id: string
          fuel_cost: number
          id: string
          km_total: number
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          employee_id: string
          fuel_cost?: number
          id?: string
          km_total?: number
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          employee_id?: string
          fuel_cost?: number
          id?: string
          km_total?: number
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_mileage_daily_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          app_id: string
          created_at: string
          id: string
          max_orders: number | null
          min_orders: number | null
          rate: number
          type: string
          updated_at: string
        }
        Insert: {
          app_id: string
          created_at?: string
          id?: string
          max_orders?: number | null
          min_orders?: number | null
          rate: number
          type: string
          updated_at?: string
        }
        Update: {
          app_id?: string
          created_at?: string
          id?: string
          max_orders?: number | null
          min_orders?: number | null
          rate?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rules_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_shifts: {
        Row: {
          app_id: string
          created_at: string
          employee_id: string
          hours_worked: number
          id: string
          notes: string | null
          shift_date: string
          updated_at: string
        }
        Insert: {
          app_id: string
          created_at?: string
          employee_id: string
          hours_worked: number
          id?: string
          notes?: string | null
          shift_date: string
          updated_at?: string
        }
        Update: {
          app_id?: string
          created_at?: string
          employee_id?: string
          hours_worked?: number
          id?: string
          notes?: string | null
          shift_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_shifts_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      app_hybrid_rules: {
        Row: {
          app_id: string
          created_at: string
          fixed_amount: number | null
          id: string
          max_orders: number | null
          min_orders: number | null
          rate_per_order: number | null
          rule_type: string
          updated_at: string
        }
        Insert: {
          app_id: string
          created_at?: string
          fixed_amount?: number | null
          id?: string
          max_orders?: number | null
          min_orders?: number | null
          rate_per_order?: number | null
          rule_type: string
          updated_at?: string
        }
        Update: {
          app_id?: string
          created_at?: string
          fixed_amount?: number | null
          id?: string
          max_orders?: number | null
          min_orders?: number | null
          rate_per_order?: number | null
          rule_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_hybrid_rules_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_records: {
        Row: {
          cost: number
          created_at: string
          date: string
          driver_id: string | null
          id: string
          liters: number
          notes: string | null
          odometer_reading: number | null
          vehicle_id: string
        }
        Insert: {
          cost: number
          created_at?: string
          date: string
          driver_id?: string | null
          id?: string
          liters: number
          notes?: string | null
          odometer_reading?: number | null
          vehicle_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          date?: string
          driver_id?: string | null
          id?: string
          liters?: number
          notes?: string | null
          odometer_reading?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          cost: number | null
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          id: string
          paid_by: string | null
          status: string | null
          type: Database["public"]["Enums"]["maintenance_type"]
          vehicle_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          paid_by?: string | null
          status?: string | null
          type?: Database["public"]["Enums"]["maintenance_type"]
          vehicle_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          paid_by?: string | null
          status?: string | null
          type?: Database["public"]["Enums"]["maintenance_type"]
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      violations: {
        Row: {
          amount: number
          apply_month: string
          approval_status: Database["public"]["Enums"]["approval_status"]
          approved_by: string | null
          created_at: string
          employee_id: string
          id: string
          incident_date: string | null
          linked_advance_id: string | null
          note: string | null
          source_app_id: string | null
          type: Database["public"]["Enums"]["deduction_type"]
        }
        Insert: {
          amount: number
          apply_month: string
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_by?: string | null
          created_at?: string
          employee_id: string
          id?: string
          incident_date?: string | null
          linked_advance_id?: string | null
          note?: string | null
          source_app_id?: string | null
          type?: Database["public"]["Enums"]["deduction_type"]
        }
        Update: {
          amount?: number
          apply_month?: string
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_by?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          incident_date?: string | null
          linked_advance_id?: string | null
          note?: string | null
          source_app_id?: string | null
          type?: Database["public"]["Enums"]["deduction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "violations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      tiers: {
        Row: {
          bonus: number | null
          created_at: string
          id: string
          max_orders: number | null
          min_orders: number | null
          name: string
        }
        Insert: {
          bonus?: number | null
          created_at?: string
          id?: string
          max_orders?: number | null
          min_orders?: number | null
          name: string
        }
        Update: {
          bonus?: number | null
          created_at?: string
          id?: string
          max_orders?: number | null
          min_orders?: number | null
          name?: string
        }
        Relationships: []
      }
      spare_parts_inventory: {
        Row: {
          created_at: string
          id: string
          min_quantity: number | null
          name_ar: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          min_quantity?: number | null
          name_ar: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          min_quantity?: number | null
          name_ar?: string
          quantity?: number
        }
        Relationships: []
      }
      spare_parts: {
        Row: {
          created_at: string
          id: string
          min_stock_alert: number | null
          name_ar: string
          stock_quantity: number
          unit: string | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          min_stock_alert?: number | null
          name_ar: string
          stock_quantity?: number
          unit?: string | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          min_stock_alert?: number | null
          name_ar?: string
          stock_quantity?: number
          unit?: string | null
          unit_cost?: number | null
        }
        Relationships: []
      }
      maintenance_parts: {
        Row: {
          cost_at_time: number | null
          created_at: string
          id: string
          maintenance_log_id: string
          part_id: string
          quantity_used: number
        }
        Insert: {
          cost_at_time?: number | null
          created_at?: string
          id?: string
          maintenance_log_id: string
          part_id: string
          quantity_used?: number
        }
        Update: {
          cost_at_time?: number | null
          created_at?: string
          id?: string
          maintenance_log_id?: string
          part_id?: string
          quantity_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_parts_maintenance_log_id_fkey"
            columns: ["maintenance_log_id"]
            isOneToOne: false
            referencedRelation: "maintenance_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "spare_parts"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_drafts: {
        Row: {
          created_at: string
          draft_data: Json | null
          employee_id: string
          id: string
          month_year: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          draft_data?: Json | null
          employee_id: string
          id?: string
          month_year: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          draft_data?: Json | null
          employee_id?: string
          id?: string
          month_year?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_drafts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_slip_templates: {
        Row: {
          created_at: string
          footer_html: string | null
          header_html: string | null
          id: string
          is_default: boolean
          name: string
          selected_columns: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          footer_html?: string | null
          header_html?: string | null
          id?: string
          is_default?: boolean
          name: string
          selected_columns?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          footer_html?: string | null
          header_html?: string | null
          id?: string
          is_default?: boolean
          name?: string
          selected_columns?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_action_log: {
        Row: {
          action: string
          created_at: string
          id: string
          new_value: Json | null
          old_value: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          authorization_expiry: string | null
          brand: string | null
          chassis_number: string | null
          created_at: string
          has_fuel_chip: boolean
          id: string
          insurance_expiry: string | null
          model: string | null
          notes: string | null
          plate_number: string
          plate_number_en: string | null
          registration_expiry: string | null
          serial_number: string | null
          status: Database["public"]["Enums"]["vehicle_status"]
          type: Database["public"]["Enums"]["vehicle_type"]
          updated_at: string
          year: number | null
        }
        Insert: {
          authorization_expiry?: string | null
          brand?: string | null
          chassis_number?: string | null
          created_at?: string
          has_fuel_chip?: boolean
          id?: string
          insurance_expiry?: string | null
          model?: string | null
          notes?: string | null
          plate_number: string
          plate_number_en?: string | null
          registration_expiry?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          type?: Database["public"]["Enums"]["vehicle_type"]
          updated_at?: string
          year?: number | null
        }
        Update: {
          authorization_expiry?: string | null
          brand?: string | null
          chassis_number?: string | null
          created_at?: string
          has_fuel_chip?: boolean
          id?: string
          insurance_expiry?: string | null
          model?: string | null
          notes?: string | null
          plate_number?: string
          plate_number_en?: string | null
          registration_expiry?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          type?: Database["public"]["Enums"]["vehicle_type"]
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_user: { Args: { _user_id: string }; Returns: boolean }
      replace_daily_orders_month_rpc: {
        Args: { p_month: string; p_rows: Json }
        Returns: void
      }
      performance_dashboard_rpc: {
        Args: { p_month: string }
        Returns: Json
      }
      rider_profile_performance_rpc: {
        Args: { p_employee_id: string; p_month: string }
        Returns: Json
      }
      capture_salary_month_snapshot: {
        Args: { p_month: string }
        Returns: Json
      }
      get_employee_count_by_city: {
        Args: Record<string, never>
        Returns: Json
      }
    }
    Enums: {
      advance_status: "active" | "completed" | "paused"
      app_role: "admin" | "hr" | "finance" | "operations" | "viewer"
      approval_status: "pending" | "approved" | "rejected"
      attendance_status: "present" | "absent" | "leave" | "sick" | "late"
      city_enum: "makkah" | "jeddah"
      deduction_type: "fine" | "return" | "delay" | "accident" | "other"
      employee_status: "active" | "inactive" | "ended"
      installment_status: "pending" | "deducted" | "deferred"
      license_status_enum: "has_license" | "no_license" | "applied"
      maintenance_type: "routine" | "breakdown" | "accident"
      salary_type: "shift" | "orders"
      scheme_status: "active" | "archived"
      sponsorship_status_enum:
        | "sponsored"
        | "not_sponsored"
        | "absconded"
        | "terminated"
      vehicle_status:
        | "active"
        | "maintenance"
        | "inactive"
        | "breakdown"
        | "rental"
        | "ended"
      vehicle_type: "motorcycle" | "car"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      advance_status: ["active", "completed", "paused"],
      app_role: ["admin", "hr", "finance", "operations", "viewer"],
      approval_status: ["pending", "approved", "rejected"],
      attendance_status: ["present", "absent", "leave", "sick", "late"],
      city_enum: ["makkah", "jeddah"],
      deduction_type: ["fine", "return", "delay", "accident", "other"],
      employee_status: ["active", "inactive", "ended"],
      installment_status: ["pending", "deducted", "deferred"],
      license_status_enum: ["has_license", "no_license", "applied"],
      maintenance_type: ["routine", "breakdown", "accident"],
      salary_type: ["shift", "orders"],
      scheme_status: ["active", "archived"],
      sponsorship_status_enum: [
        "sponsored",
        "not_sponsored",
        "absconded",
        "terminated",
      ],
      vehicle_status: [
        "active",
        "maintenance",
        "inactive",
        "breakdown",
        "rental",
        "ended",
      ],
      vehicle_type: ["motorcycle", "car"],
    },
  },
} as const
