-- ============================================================
-- إزالة أي قيد CHECK على hours_worked في daily_shifts
-- يسمح بقيم سالبة لتمثيل حالات الإجازة:
--   1  = حاضر
--  -1  = إجازة براتب
--  -2  = إجازة مرضى
--   0  = غائب (لا يُحفظ في DB — الغياب يُمثَّل بعدم وجود صف)
-- ============================================================

-- أزل أي constraint اسمه check_hours_worked أو hours_worked_check
ALTER TABLE public.daily_shifts
  DROP CONSTRAINT IF EXISTS daily_shifts_hours_worked_check;

ALTER TABLE public.daily_shifts
  DROP CONSTRAINT IF EXISTS check_hours_worked;

-- أضف constraint جديد يسمح بالقيم الموجبة والسالبة المحددة فقط
ALTER TABLE public.daily_shifts
  ADD CONSTRAINT daily_shifts_hours_worked_valid
  CHECK (
    hours_worked = 1    -- حاضر
    OR hours_worked = -1  -- إجازة براتب
    OR hours_worked = -2  -- إجازة مرضى
    OR hours_worked > 0   -- للتوافق مع البيانات القديمة (ساعات متعددة)
  );

-- تعليق توضيحي على العمود
COMMENT ON COLUMN public.daily_shifts.hours_worked IS
  'قيمة الحضور: 1=حاضر | -1=إجازة براتب | -2=إجازة مرضى | >1=ساعات عمل (للأنظمة القديمة)';
