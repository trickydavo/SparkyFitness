-- Add age and biological_sex to user_preferences for personalised NRV targets.
-- biological_sex is used to select sex-specific RDI values (e.g. iron 8mg male vs 18mg female).
-- age is stored for future age-adjusted NRV targets (e.g. vitamin D, calcium post-60).

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS biological_sex TEXT CHECK (biological_sex IN ('male', 'female'));
