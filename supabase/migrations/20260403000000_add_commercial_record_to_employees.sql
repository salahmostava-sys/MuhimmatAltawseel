-- Add commercial_record column to employees table
-- This field stores the commercial registration number (السجل التجاري) for each employee

ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS commercial_record TEXT;

COMMENT ON COLUMN public.employees.commercial_record IS 'رقم السجل التجاري للمندوب - يستخدم في التنبيهات والتقارير';
