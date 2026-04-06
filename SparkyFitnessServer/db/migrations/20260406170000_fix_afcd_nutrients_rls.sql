-- Fix: afcd_nutrients had RLS enabled but no policies, causing default-deny
-- for the fuelrightapp role. Since afcd_nutrients is pure reference data
-- (no user-specific rows), RLS is not needed.
ALTER TABLE afcd_nutrients DISABLE ROW LEVEL SECURITY;
