-- AFCD full nutrient detail table.
-- Stores all 268 AFCD nutrients per food as EAV rows.
-- Separate from food_variants (which holds the common macros used by diary calculations).
-- Used for Sprint 3 micronutrient tracking against Australian NRV targets.

CREATE TABLE IF NOT EXISTS public.afcd_nutrients (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  food_id       UUID        NOT NULL REFERENCES public.foods(id) ON DELETE CASCADE,
  nutrient_key  TEXT        NOT NULL,  -- normalized snake_case, e.g. 'calcium_mg', 'cobalamin_b12_ug'
  nutrient_label TEXT       NOT NULL,  -- human-readable AFCD column label
  value         NUMERIC,               -- NULL means not measured for this food
  unit          TEXT,                  -- 'g', 'mg', 'ug', 'kJ', '%T', etc.
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_afcd_nutrients_food_key
  ON public.afcd_nutrients(food_id, nutrient_key);

CREATE INDEX IF NOT EXISTS idx_afcd_nutrients_food_id
  ON public.afcd_nutrients(food_id);

CREATE INDEX IF NOT EXISTS idx_afcd_nutrients_key
  ON public.afcd_nutrients(nutrient_key);

-- RLS: afcd nutrient data is public (same visibility as the food itself)
ALTER TABLE public.afcd_nutrients ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY afcd_nutrients_select ON public.afcd_nutrients
    FOR SELECT TO PUBLIC USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
