ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS work_type TEXT DEFAULT 'orders'
CHECK (work_type IN ('orders', 'attendance', 'hybrid'));

UPDATE public.employees
SET work_type = CASE
  WHEN work_type IN ('orders', 'attendance', 'hybrid') THEN work_type
  WHEN salary_type = 'shift' THEN 'attendance'
  ELSE 'orders'
END
WHERE work_type IS NULL
   OR work_type NOT IN ('orders', 'attendance', 'hybrid');

COMMENT ON COLUMN public.employees.work_type IS
'نوع أداء الموظف: orders (طلبات)، attendance (حضور)، hybrid (مختلط)';
