-- 1) Allow per_order_band tier type (عدد الطلبات الكلي × سعر الشريحة — بدون تراكم شرائح).
-- 2) Align calc_tier_salary with band model: 1–300×3, 301–400×4, 401–449×5, 450–470 = 2500, >470 = 2500+(n-470)×5

BEGIN;

ALTER TABLE public.salary_scheme_tiers
  DROP CONSTRAINT IF EXISTS salary_scheme_tiers_tier_type_check;

ALTER TABLE public.salary_scheme_tiers
  ADD CONSTRAINT salary_scheme_tiers_tier_type_check
  CHECK (tier_type IN (
    'total_multiplier',
    'fixed_amount',
    'base_plus_incremental',
    'per_order_band'
  ));

CREATE OR REPLACE FUNCTION public.calc_tier_salary(total_orders INTEGER)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  o INTEGER := GREATEST(COALESCE(total_orders, 0), 0);
BEGIN
  IF o = 0 THEN
    RETURN 0;
  ELSIF o <= 300 THEN
    RETURN o * 3;
  ELSIF o <= 400 THEN
    RETURN o * 4;
  ELSIF o <= 449 THEN
    RETURN o * 5;
  ELSIF o <= 470 THEN
    RETURN 2500;
  END IF;

  RETURN 2500 + ((o - 470) * 5);
END;
$$;

COMMENT ON FUNCTION public.calc_tier_salary(INTEGER) IS
  'Default tier curve (single-band): 1–300×3، 301–400×4، 401–449×5، 450–470 ثابت 2500، فوق 470: 2500+(n-470)×5. Schemes UI may use per_order_band tiers for the same logic per app.';

COMMIT;
